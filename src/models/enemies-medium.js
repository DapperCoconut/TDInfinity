// Enemy looks for Medium (zombies and molten) and Hard (fallen): the extra parts each one wears.

import { boxGeo, part } from './kit.js';
import { glow } from './bits.js';
import { hazmatSuit } from './enemies-creatures.js';

/** Medium mode outfits (def.mlook): implants, plates, revived bosses, Multipliers, Grenadiers, the Predator, the Eradicator... */
export function mediumParts(h, def) {
  const { M } = h;
  const metal = M(0x8a8f94);
  const dark = M(0x2b2b2b);
  const black = M(0x111111);
  const plate = M(def.plate ?? 0x8a8f94);
  // Lumpy boils on a limb.
  const boils = (limb, color) => {
    const bm = M(color);
    for (const [x, y, z, s] of [[0.5, -0.6, 0.3, 0.3], [0.45, -1.2, -0.2, 0.22], [0.2, -1.6, 0.5, 0.26]]) part(limb, boxGeo(s, s, s), bm, x, y, z);
  };
  // Stitches across a body part.
  const stitches = (p, x, y, z, w, n = 4) => {
    const sm = M(0x1a1a1a);
    part(p, boxGeo(w, 0.06, 0.06), sm, x, y, z);
    for (let i = 0; i < n; i++) part(p, boxGeo(0.06, 0.24, 0.07), sm, x - w / 2 + (w / (n - 1)) * i, y, z);
  };
  const wire = (p, color, x, y, z, len) => part(p, boxGeo(0.08, len, 0.08), glow(h, color), x, y, z);
  switch (def.mlook) {
    case 'implants': {
      // Zombie+: metal implants in its arm and leg, angry, drooling green.
      part(h.rightArm, boxGeo(1.06, 0.5, 1.06), metal, 0, -0.9, 0);
      part(h.leftLeg, boxGeo(1.06, 0.4, 1.06), metal, 0, -0.7, 0);
      part(h.head, boxGeo(0.35, 0.25, 0.06), metal, -0.35, 1.0, 0.62);
      for (const side of [-1, 1]) {
        const brow = part(h.head, boxGeo(0.4, 0.1, 0.06), black, side * 0.28, 0.92, 0.63);
        brow.rotation.z = side * 0.35; // angry brows
      }
      part(h.head, boxGeo(0.12, 0.4, 0.06), glow(h, 0x76ff03), 0.15, 0.15, 0.62); // drool
      break;
    }
    case 'fast': {
      // Fast Zombie+: implants down every limb and a confused, crooked face.
      for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) part(limb, boxGeo(1.06, 0.3, 1.06), metal, 0, -1.1, 0);
      part(h.head, boxGeo(0.4, 0.1, 0.06), black, -0.28, 0.98, 0.63);
      const b = part(h.head, boxGeo(0.4, 0.1, 0.06), black, 0.28, 1.05, 0.63);
      b.rotation.z = -0.4; // one raised brow
      break;
    }
    case 'heavy': {
      // Heavy Zombie+ / Armored Heavy Zombie+: a gray metal chest plate (armored ones get shoulder pads too).
      part(h.torso, boxGeo(2.2, 1.6, 1.22), plate, 0, 0.1, 0);
      for (const x of [-0.7, 0.7]) part(h.torso, boxGeo(0.14, 0.14, 0.06), dark, x, 0.75, 0.63);
      if (def.bulletResist) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 0.6, 1.25), plate, 0, -0.1, 0);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.4, 0.1, 0.06), black, side * 0.28, 0.95, 0.63); // annoyed
      break;
    }
    case 'revived': {
      // Revived Boss 1: black diamond-plated arm braces, a wire and boils on its arm.
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.12, 0.9, 1.12), black, 0, -1.3, 0);
        const d = part(arm, boxGeo(0.4, 0.4, 0.06), M(0x3a3a3a), 0, -1.3, 0.6);
        d.rotation.z = Math.PI / 4; // diamond plate
      }
      wire(h.leftArm, 0xff5252, 0.55, -0.6, 0.2, 1.2);
      boils(h.leftArm, 0x9e9d24);
      break;
    }
    case 'mult': {
      // Multipliers: see-through, with a big glowing X on the chest.
      const x = glow(h, def.xColor);
      for (const s of [-1, 1]) {
        const bar = part(h.torso, boxGeo(0.28, 1.6, 0.08), x, 0, 0.1, 0.56);
        bar.rotation.z = s * 0.7;
      }
      for (const side of [-1, 1]) part(h.head, boxGeo(0.25, 0.2, 0.06), x, side * 0.28, 0.75, 0.63);
      break;
    }
    case 'grenadier':
    case 'eliteGrenadier':
    case 'shocker': {
      const elite = def.mlook === 'eliteGrenadier';
      if (def.mlook !== 'grenadier') {
        // A helmet (the Elite's is cracked).
        part(h.head, boxGeo(1.4, 0.6, 1.4), M(0x212121), 0, 1.25, 0);
        if (elite) part(h.head, boxGeo(0.08, 0.5, 0.08), M(0x9e9e9e), 0.3, 1.3, 0.71);
      }
      if (elite) for (const limb of [h.rightArm, h.leftArm]) part(limb, boxGeo(1.08, 0.25, 1.08), M(0xff6d00), 0, -1.8, 0); // orange cuffs
      if (def.mlook === 'shocker') {
        // A blue canister of lightning on its back.
        part(h.torso, boxGeo(1.0, 1.8, 0.9), M(0x1565c0), 0, 0.1, -1.0);
        part(h.torso, boxGeo(0.7, 1.4, 0.95), glow(h, 0x40c4ff), 0, 0.1, -1.0);
        for (const y of [0.6, -0.2]) part(h.torso, boxGeo(1.05, 0.1, 1.0), M(0x0d47a1), 0, y, -1.0);
        break;
      }
      // Bandolier across the chest with grenades.
      const band = part(h.torso, boxGeo(0.3, 2.5, 0.08), M(0x3e2723), 0, 0, 0.55);
      band.rotation.z = 0.7;
      const nade = glow(h, elite ? 0xff9100 : 0x40c4ff);
      const at = elite ? [[-0.35, 0.35], [0.35, -0.3]] : [[-0.5, 0.45], [0, 0], [0.5, -0.45]];
      for (const [x, y] of at) part(h.torso, boxGeo(0.32, 0.4, 0.3), nade, x, y, 0.65);
      break;
    }
    case 'superHeavy': {
      // Super Heavy Zombie: a metal brace, a shoulder guard and a gauntlet.
      part(h.torso, boxGeo(2.2, 0.5, 1.22), metal, 0, -0.4, 0);
      part(h.rightArm, boxGeo(1.4, 0.8, 1.4), metal, 0, 0, 0);
      part(h.leftArm, boxGeo(1.25, 1.0, 1.25), metal, 0, -1.6, 0);
      for (const side of [-1, 1]) {
        const b = part(h.head, boxGeo(0.4, 0.1, 0.06), black, side * 0.28, 0.95, 0.63);
        b.rotation.z = -side * 0.35; // pained
      }
      break;
    }
    case 'nuclear': {
      // Nuclear Zombie: glowing green skin, two red cores wired to a tank on its back.
      const g = glow(h, 0x76ff03);
      g.emissiveIntensity = 0.25;
      part(h.head, boxGeo(1.24, 1.24, 1.24), g, 0, 0.6, 0);
      part(h.torso, boxGeo(1.3, 1.7, 0.8), M(0x546e7a), 0, 0.1, -0.95);
      for (const x of [-0.45, 0.45]) {
        part(h.torso, boxGeo(0.4, 0.4, 0.2), glow(h, 0xff1744), x, 0.3, 0.6);
        wire(h.torso, 0xffd600, x, 0.95, 0, 0.9).rotation.x = Math.PI / 2;
      }
      break;
    }
    case 'titan': {
      // Revived Titan: a metal shoulder guard, braces and one armored boot.
      part(h.rightArm, boxGeo(1.45, 0.9, 1.45), metal, 0, 0, 0);
      part(h.leftArm, boxGeo(1.12, 0.8, 1.12), metal, 0, -1.4, 0);
      part(h.rightArm, boxGeo(1.12, 0.6, 1.12), metal, 0, -1.6, 0);
      part(h.leftLeg, boxGeo(1.2, 0.9, 1.3), metal, 0, -1.6, 0.05);
      break;
    }
    case 'monster':
    case 'abomination': {
      // Monster / Revived Abomination: stitched together, swollen arms, junk stuck in it.
      stitches(h.torso, 0, 0.3, 0.53, 1.6);
      stitches(h.head, 0, 0.95, 0.62, 0.9, 3);
      const swollen = M(0x9e9e9e);
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.6, 1.6, 1.6), swollen, 0, -1.1, 0);
      const junk = M(0x6d4c41);
      for (const [p, x, y, z] of [[h.torso, 0.6, -0.4, 0.6], [h.torso, -0.7, 0.6, -0.6], [h.rightArm, 0.8, -1.2, 0.2]]) {
        const s = part(p, boxGeo(0.12, 0.12, 0.6), M(0xbdbdbd), x, y, z); // screw
        s.rotation.y = 0.6;
        part(p, boxGeo(0.4, 0.3, 0.3), junk, x - 0.2, y - 0.3, z);
      }
      if (def.mlook === 'abomination') {
        // Gray patches, rusty pipes, spikes and a red core wired to a green vial.
        for (const [x, y] of [[-0.5, -0.5], [0.6, 0.6]]) part(h.torso, boxGeo(0.6, 0.5, 0.06), M(0x616161), x, y, 0.55);
        const rust = M(0x8d4f2a);
        for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.25, 2.2, 0.25), rust, x, 0.4, -0.65);
        for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.18, 0.6, 0.18), M(0xbdbdbd), x, 1.2, -0.3);
        part(h.torso, boxGeo(0.5, 0.5, 0.2), glow(h, 0xff1744), 0, 0.2, 0.6);
        part(h.torso, boxGeo(0.3, 0.6, 0.3), glow(h, 0x76ff03), 0.9, -0.6, 0.6);
        wire(h.torso, 0xffd600, 0.45, -0.2, 0.62, 0.8).rotation.z = 1.1;
      }
      break;
    }
    case 'infiltrator': {
      // Infiltrator: a soldier in body armor and a helmet.
      part(h.torso, boxGeo(2.2, 1.7, 1.22), black, 0, 0.1, 0);
      for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.4, 0.4, 0.15), M(0x212121), x, -0.3, 0.65); // pouches
      part(h.head, boxGeo(1.4, 0.6, 1.4), M(0x757575), 0, 1.25, 0);
      part(h.head, boxGeo(1.5, 0.12, 1.5), M(0x616161), 0, 0.98, 0);
      break;
    }
    case 'charger': {
      // Charger Boss: boils and a blue wire on its arms.
      boils(h.rightArm, 0x5c6bc0);
      boils(h.leftArm, 0x5c6bc0);
      wire(h.rightArm, 0x40c4ff, -0.55, -1.0, 0, 1.6);
      wire(h.leftArm, 0x40c4ff, 0.55, -1.0, 0, 1.6);
      break;
    }
    case 'smasher': {
      // Smasher: stitched black body, dark red armor, one red eye and a huge metal fist.
      const armor = M(0x5d0f0f);
      part(h.torso, boxGeo(2.25, 1.7, 1.25), armor, 0, 0.1, 0);
      part(h.leftArm, boxGeo(1.3, 0.7, 1.3), armor, 0, -0.15, 0);
      stitches(h.head, 0, 1.0, 0.62, 0.9, 3);
      part(h.head, boxGeo(0.35, 0.3, 0.06), glow(h, 0xff1744), 0.25, 0.75, 0.63);
      part(h.rightArm, boxGeo(1.9, 1.6, 1.9), metal, 0, -2.0, 0);
      for (const x of [-0.6, 0, 0.6]) part(h.rightArm, boxGeo(0.4, 0.2, 0.4), dark, x, -2.85, 0.6);
      break;
    }
    case 'predator': {
      // Predator: black plating on his right side, a red helmet with a jagged jaw and one orange
      // eye, an orange core held by three yellow wires, and a red cyborg arm with a revolver.
      const red = M(0xc62828);
      part(h.torso, boxGeo(1.12, 2.05, 1.12), black, -0.55, 0, 0);
      part(h.rightLeg, boxGeo(1.06, 0.6, 1.1), black, 0, -1.75, 0.03); // boot
      part(h.leftLeg, boxGeo(1.06, 0.6, 1.1), black, 0, -1.75, 0.03);
      part(h.head, boxGeo(1.4, 0.9, 1.4), red, 0, 0.9, 0);
      for (const x of [-0.45, -0.15, 0.15, 0.45]) part(h.head, boxGeo(0.18, 0.3, 0.1), red, x, 0.1, 0.66); // jagged jaw
      part(h.head, boxGeo(0.35, 0.3, 0.06), glow(h, 0xff9100), 0.2, 0.75, 0.72);
      part(h.torso, boxGeo(0.5, 0.5, 0.15), glow(h, 0xff9100), 0.3, 0.4, 0.55);
      for (const [x, r] of [[0.0, 0.5], [0.3, 0], [0.6, -0.5]]) wire(h.torso, 0xffd600, x, 0.9, 0.56, 0.6).rotation.z = r;
      part(h.rightArm, boxGeo(1.15, 2.05, 1.15), red, 0, -1.0, 0);
      part(h.rightArm, boxGeo(0.9, 0.9, 0.9), M(0x424242), 0, -2.2, 0.2); // cylinder
      for (const x of [-0.2, 0.2]) part(h.rightArm, boxGeo(0.25, 0.25, 1.6), black, x, -2.2, 1.2); // two barrels
      break;
    }
    case 'eradicator': {
      // Eradicator: black armor with white markings, a pointed helmet and visor, red teeth,
      // a jetpack with a yellow tank, an orange-edged sword and a rocket launcher on his back.
      const white = M(0xeceff1);
      const orange = glow(h, 0xff6d00);
      part(h.torso, boxGeo(2.25, 1.8, 1.25), black, 0, 0.1, 0);
      for (const [x, y] of [[-0.6, 0.6], [0.6, 0.6], [0, -0.4]]) part(h.torso, boxGeo(0.5, 0.1, 0.06), white, x, y, 0.64);
      part(h.head, boxGeo(1.45, 1.4, 1.45), black, 0, 0.65, 0);
      part(h.head, boxGeo(0.9, 0.5, 0.9), black, 0, 1.5, 0);
      part(h.head, boxGeo(0.4, 0.4, 0.4), black, 0, 1.9, 0); // pointed top
      part(h.head, boxGeo(1.2, 0.35, 0.06), M(0x0a0a0a), 0, 0.85, 0.74); // visor
      for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) part(h.head, boxGeo(0.12, 0.2, 0.06), M(0xd50000), x, 0.3, 0.74); // teeth
      part(h.head, boxGeo(1.46, 0.08, 1.46), orange, 0, 0.55, 0);
      // Shoulder plate with tally marks.
      part(h.rightArm, boxGeo(1.35, 0.7, 1.35), black, 0, -0.1, 0);
      for (const z of [-0.3, -0.1, 0.1, 0.3]) part(h.rightArm, boxGeo(0.06, 0.08, 0.1), white, -0.69, 0.05, z);
      // Jetpack and rocket launcher.
      part(h.torso, boxGeo(1.6, 1.6, 0.6), black, 0, 0.1, -0.85);
      part(h.torso, boxGeo(0.5, 1.2, 0.5), M(0xfdd835), 0.5, 0.0, -1.3);
      for (const x of [-0.45, 0, 0.45]) part(h.torso, boxGeo(0.35, 0.35, 2.4), M(0x212121), x - 0.4, 1.3, -0.9);
      // Sword: gray blade, glowing serrated orange edge.
      part(h.leftArm, boxGeo(0.3, 0.3, 1), dark, 0, -2.1, 0.3);
      part(h.leftArm, boxGeo(0.2, 0.5, 4), M(0x9e9e9e), 0, -2.1, 2.7);
      part(h.leftArm, boxGeo(0.22, 0.15, 4), orange, 0, -2.4, 2.7);
      // Electronic Rage: the visor breaks to show a red eye.
      const eye = part(h.head, boxGeo(0.35, 0.3, 0.08), glow(h, 0xff1744), -0.3, 0.85, 0.76);
      eye.visible = false;
      h.setEnraged = (on) => (eye.visible = on);
      break;
    }
  }
}

/** Medium mode zombie extras: lava cracks, horns, hazmat suits, armor, robes, mechs and axes. */
export function moltenParts(h, def) {
  const { M } = h;
  const lava = glow(h, def.lava);
  // Glowing cracks over the body and burning eyes.
  for (const [x, y, w, hh] of [[-0.5, 0.4, 0.12, 0.9], [0.3, -0.3, 0.7, 0.12], [0.55, 0.5, 0.12, 0.6], [-0.2, -0.6, 0.12, 0.5]]) {
    part(h.torso, boxGeo(w, hh, 0.06), lava, x, y, 0.53);
    part(h.torso, boxGeo(w, hh, 0.06), lava, -x, y, -0.53);
  }
  for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) {
    part(limb, boxGeo(0.1, 0.8, 1.04), lava, 0.48, -1.1, 0);
    part(limb, boxGeo(1.04, 0.1, 0.6), lava, 0, -1.5, 0.1);
  }
  if (!def.knight && !def.mech) {
    for (const side of [-1, 1]) part(h.head, boxGeo(0.26, 0.18, 0.06), lava, side * 0.28, 0.7, 0.62);
    part(h.head, boxGeo(0.1, 0.5, 0.06), lava, 0.4, 0.9, 0.62);
  }
  if (def.horns) {
    const hm = M(def.horns);
    for (const side of [-1, 1]) {
      const a = part(h.head, boxGeo(0.25, 0.5, 0.25), hm, side * 0.5, 1.35, 0);
      a.rotation.z = -side * 0.4;
      const b = part(h.head, boxGeo(0.18, 0.4, 0.18), hm, side * 0.72, 1.7, 0);
      b.rotation.z = -side * 0.8;
    }
  }
  if (def.plate) {
    const plate = M(def.plate);
    const dark = M(0x263238);
    part(h.torso, boxGeo(2.25, 1.7, 1.25), plate, 0, 0.1, 0); // breastplate
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.3, 0.7, 1.3), plate, 0, -0.15, 0); // pauldrons
    if (def.knight || def.axes) {
      // Full helm with a glowing visor slit, greaves and a shield.
      part(h.head, boxGeo(1.4, 1.4, 1.4), plate, 0, 0.6, 0);
      part(h.head, boxGeo(1.0, 0.16, 0.06), lava, 0, 0.72, 0.72);
      part(h.head, boxGeo(0.2, 0.5, 1.2), dark, 0, 1.5, 0); // crest
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.15, 1.0, 1.15), plate, 0, -1.4, 0);
    } else part(h.head, boxGeo(1.35, 0.6, 1.35), plate, 0, 1.2, 0); // squire's open helmet
    if (def.knight) {
      part(h.leftArm, boxGeo(0.25, 1.8, 2.4), plate, 0.65, -1.5, 0.1); // shield
      part(h.leftArm, boxGeo(0.08, 0.9, 0.9), lava, 0.8, -1.5, 0.1);
      // Sword
      part(h.rightArm, boxGeo(0.3, 0.3, 1), dark, 0, -2.1, 0.3);
      part(h.rightArm, boxGeo(0.25, 0.25, 3.4), lava, 0, -2.1, 2.4);
    }
  }
  if (def.robe) {
    // Necromancer: a long robe and hood, and a staff topped with a glowing orb.
    const robe = M(def.robe);
    part(h.body, boxGeo(2.3, 2.1, 1.4), robe, 0, 1.0, 0);
    part(h.head, boxGeo(1.4, 1.35, 1.25), M(0x1a0f3a), 0, 0.68, -0.12);
    part(h.rightArm, boxGeo(0.25, 0.25, 6), M(0x3e2723), 0, -2.1, 0.6);
    part(h.rightArm, boxGeo(0.7, 0.7, 0.7), lava, 0, -2.1, 3.8);
    part(h.rightArm, boxGeo(0.12, 0.12, 0.8), lava, 0.4, -2.1, 3.2);
  }
  if (def.mech) {
    // Bulwark: a boxy lava-powered mech suit with arm cannons.
    const metal = M(def.shirt);
    const dark = M(def.pants);
    part(h.torso, boxGeo(2.9, 2.4, 1.8), metal, 0, 0.1, 0);
    part(h.torso, boxGeo(1, 1, 0.1), lava, 0, 0.2, 0.92); // reactor core
    for (const x of [-1.1, 1.1]) part(h.torso, boxGeo(0.4, 0.8, 0.4), dark, x, 1.5, -0.5); // exhaust stacks
    part(h.head, boxGeo(1.6, 1.1, 1.6), metal, 0, 0.55, 0);
    part(h.head, boxGeo(1.2, 0.25, 0.06), lava, 0, 0.65, 0.82);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.4, 2.1, 1.4), dark, 0, -1.0, 0);
    for (const arm of [h.rightArm, h.leftArm]) {
      part(arm, boxGeo(1.35, 2.2, 1.35), metal, 0, -1.0, 0);
      part(arm, boxGeo(0.6, 1.4, 0.6), dark, 0, -2.6, 0); // cannon barrel
      part(arm, boxGeo(0.4, 0.06, 0.4), lava, 0, -3.32, 0);
    }
  }
  if (def.hazmat) hazmatSuit(h, def);
  if (def.axes) {
    // Molten Warlord: a giant battleaxe in each hand (handles point up along the arms' local z).
    const wood = M(0x3e2723);
    const steel = M(0x37474f);
    for (const [arm, side] of [[h.rightArm, -1], [h.leftArm, 1]]) {
      part(arm, boxGeo(0.35, 0.35, 5.5), wood, 0, -2.1, 1.2);
      part(arm, boxGeo(0.25, 1.8, 2.2), steel, side * 0.05, -3.0, 3.4); // axe head, blade forward
      part(arm, boxGeo(0.3, 0.16, 2.3), lava, side * 0.05, -3.95, 3.4); // red-hot edge
      part(arm, boxGeo(0.4, 0.4, 0.4), steel, 0, -2.1, 4.1);
    }
  }
}

/** Hard mode (Fallen) outfits (def.flook): skeletons, knights, Breakers, Necromancers, the Fallen King... */
export function fallenParts(h, def) {
  const { M } = h;
  const blue = glow(h, 0x29b6f6);
  const cyan = glow(h, 0x18ffff);
  const steel = M(0x90a4ae);
  const dark = M(0x263238);
  const black = M(0x111111);
  const grey = M(0x9e9e9e);
  const chain = M(0x757575);
  // Glowing blue cracks across the chest and limbs.
  const cracks = (c = blue) => {
    for (const [x, y, w, hh] of [[-0.5, 0.2, 0.12, 1.2], [0.3, -0.3, 0.8, 0.12], [0.6, 0.5, 0.12, 0.7]]) part(h.torso, boxGeo(w, hh, 0.06), c, x, y, 0.53);
    for (const limb of [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg]) part(limb, boxGeo(0.1, 0.9, 1.04), c, 0.2, -1.1, 0);
  };
  const horns = (y = 1.2, m = steel, s = 1) => {
    for (const side of [-1, 1]) {
      const hn = part(h.head, boxGeo(0.2 * s, 0.7 * s, 0.2 * s), m, side * 0.55, y + 0.25 * s, 0);
      hn.rotation.z = -side * 0.5;
    }
  };
  const helmet = (m, spikes = 0) => {
    part(h.head, boxGeo(1.36, 0.55, 1.36), m, 0, 1.2, 0);
    for (let i = 0; i < spikes; i++) part(h.head, boxGeo(0.16, 0.5, 0.16), m, -0.45 + (0.9 / Math.max(1, spikes - 1)) * i, 1.65, 0);
  };
  const cape = (m, len = 2.6) => part(h.torso, boxGeo(1.9, len, 0.12), m, 0, 1 - len / 2, -0.6);
  const crown = (m, gem) => {
    for (const x of [-0.5, -0.17, 0.17, 0.5]) part(h.head, boxGeo(0.2, 0.45, 0.2), m, x, 1.45, 0.45);
    part(h.head, boxGeo(1.25, 0.2, 1.25), m, 0, 1.25, 0);
    if (gem) part(h.head, boxGeo(0.25, 0.25, 0.08), gem, 0, 1.3, 0.66);
  };
  const shoulders = (m, s = 1) => { for (const x of [-1.25, 1.25]) part(h.torso, boxGeo(0.9 * s, 0.5 * s, 1.2 * s), m, x, 1.05, 0); };
  const armorUp = (m) => {
    part(h.torso, boxGeo(2.15, 1.7, 1.15), m, 0, 0.1, 0);
    for (const limb of [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg]) part(limb, boxGeo(1.1, 0.8, 1.1), m, 0, -1.4, 0);
  };
  const legless = (robe) => {
    h.leftLeg.visible = h.rightLeg.visible = false;
    if (robe) part(h.torso, boxGeo(1.9, 2.2, 1.0), robe, 0, -1.9, 0);
  };
  const sword = (arm, blade, len = 2.6) => {
    part(arm, boxGeo(0.25, 0.25, 0.7), dark, 0, -2.1, 0.3); // hilt
    part(arm, boxGeo(0.12, 0.3, len), blade, 0, -2.1, 0.35 + len / 2);
  };
  const shield = (arm, m, w = 1.8, hh = 2.2, gem = null) => {
    part(arm, boxGeo(0.2, hh, w), m, 0.65, -1.4, 0);
    if (gem) part(arm, boxGeo(0.06, 0.45, 0.45), gem, 0.77, -1.4, 0);
  };
  switch (def.flook) {
    case 'veins': {
      // Abnormal / Quick: pale skin with dark veins, dirty clothes.
      const v = M(def.vein);
      for (const limb of [h.leftArm, h.rightArm]) {
        part(limb, boxGeo(0.08, 1.2, 1.03), v, 0.25, -1.2, 0);
        part(limb, boxGeo(1.03, 0.08, 0.5), v, 0, -1.6, 0.2);
      }
      part(h.head, boxGeo(0.06, 0.5, 0.06), v, -0.4, 0.3, 0.61);
      part(h.torso, boxGeo(0.5, 0.4, 0.06), M(0x3e2723), 0.5, -0.5, 0.52); // dirt stain
      break;
    }
    case 'skeleton':
    case 'necrotic': {
      // Fallen Skeleton: a rib cage. Necrotic Skeleton: horns, big glowing eyes and a chestplate.
      const bone = M(0xe0cfa0);
      for (let i = 0; i < 4; i++) part(h.torso, boxGeo(1.8, 0.14, 0.08), M(0x5d4f37), 0, 0.6 - i * 0.35, 0.52);
      part(h.torso, boxGeo(0.25, 1.6, 0.1), bone, 0, 0.05, 0.53);
      if (def.flook === 'necrotic') {
        part(h.torso, boxGeo(2.15, 1.0, 1.15), M(0x78909c), 0, 0.5, 0);
        horns(1.1, bone, 1.3);
        for (const side of [-1, 1]) part(h.head, boxGeo(0.35, 0.3, 0.06), cyan, side * 0.3, 0.8, 0.63);
      }
      break;
    }
    case 'dreg': {
      // Fallen Dreg: a headless blue body in armour and a grey cape, blue fire where the skull sits.
      h.head.visible = false;
      armorUp(M(0x78909c));
      cape(M(0x9e9e9e));
      const fire = part(h.body, boxGeo(0.7, 0.9, 0.7), blue, 0, 4.5, 0);
      fire.rotation.y = 0.6;
      part(h.body, boxGeo(0.4, 0.5, 0.4), cyan, 0, 5.0, 0);
      break;
    }
    case 'squire': {
      // Fallen Squire: a big black knight in rusty light-blue armour, spiked helmet, sword and shield.
      const rust = M(0x6d9aa8);
      armorUp(rust);
      helmet(rust, 3);
      cape(M(0x3e4a4f), 3);
      sword(h.rightArm, M(0xb0bec5));
      shield(h.leftArm, rust);
      break;
    }
    case 'paper': {
      // Breakers: flat paper dolls held together with tape, a little figure stuck on the chest.
      const tape = M(0xfff8e1);
      part(h.torso, boxGeo(2.05, 0.25, 1.05), tape, 0, 0.6, 0);
      part(h.torso, boxGeo(0.25, 2.05, 1.05), tape, -0.6, 0, 0);
      const fig = M(def.figure);
      const n = def.name === 'Breaker3' || def.name === 'Breaker2' ? 1 : def.name === 'Breaker4' ? 3 : 0;
      if (def.name === 'Breaker') {
        // Triangle pattern.
        for (const [x, y] of [[-0.5, -0.4], [0.4, 0.3], [0.5, -0.5]]) part(h.torso, boxGeo(0.4, 0.4, 0.06), fig, x, y, 0.53).rotation.z = Math.PI / 4;
      }
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0.2 : -0.5 + i * 0.5;
        part(h.torso, boxGeo(0.3, 0.3, 0.06), fig, x, -0.05, 0.53);
        part(h.torso, boxGeo(0.35, 0.5, 0.06), fig, x, -0.45, 0.53);
      }
      if (def.name === 'Breaker4') for (const [x, y] of [[-0.6, 0.6], [0.6, 0.6]]) part(h.torso, boxGeo(0.3, 0.3, 0.06), M(0xffeb3b), x, y, 0.53).rotation.z = Math.PI / 4; // stars
      break;
    }
    case 'soul': {
      // Fallen Soul: dark blue, a rib cage, a spiked grey helmet and chains on its arms.
      for (let i = 0; i < 4; i++) part(h.torso, boxGeo(1.8, 0.14, 0.08), M(0x0d1440), 0, 0.6 - i * 0.35, 0.52);
      helmet(grey, 3);
      for (const arm of [h.leftArm, h.rightArm]) for (const y of [-0.6, -1.1, -1.6]) part(arm, boxGeo(1.1, 0.14, 1.1), chain, 0, y, 0);
      break;
    }
    case 'fallen': {
      // The Fallen: a white bandana.
      part(h.head, boxGeo(1.3, 0.3, 1.3), M(0xffffff), 0, 0.95, 0);
      part(h.head, boxGeo(0.3, 0.5, 0.2), M(0xffffff), 0.3, 0.7, -0.7);
      break;
    }
    case 'giant': {
      // Fallen Giant: a huge cracked body, a torn white coat, tubes on its head and a knife on its back.
      cracks();
      part(h.torso, boxGeo(2.15, 2.0, 1.15), M(0xeceff1), 0, 0, -0.05); // coat
      part(h.torso, boxGeo(0.5, 2.05, 0.06), M(0x161616), 0, 0, 0.55); // open front
      for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.18, 0.18, 1.0), dark, x, 1.25, -0.2);
      part(h.torso, boxGeo(0.25, 2.2, 0.5), M(0xb0bec5), 0.6, 0.3, -0.65).rotation.z = 0.5; // knife
      break;
    }
    case 'hazmat': {
      // Fallen Hazmat: blue-grey armour with a lock on the chest and a horned helmet.
      armorUp(M(0x78909c));
      helmet(M(0x546e7a));
      horns(1.3, M(0x37474f));
      part(h.torso, boxGeo(0.5, 0.55, 0.1), M(0xffca28), 0, 0.3, 0.62);
      part(h.torso, boxGeo(0.3, 0.25, 0.1), dark, 0, 0.65, 0.62);
      break;
    }
    case 'possessed':
    case 'ghost': {
      // Possessed Armor: floating light-blue armour with blue gems and horns, a see-through ghost inside.
      legless(null);
      const haze = M(0x0d0d0d);
      haze.transparent = true;
      haze.opacity = 0.6;
      haze.userData.keepOpacity = 0.6;
      part(h.torso, boxGeo(1.6, 1.8, 0.8), haze, 0, -1.6, 0);
      cracks();
      if (def.flook === 'possessed') {
        const pl = M(0xb0bec5);
        armorUp(pl);
        helmet(pl);
        horns(1.3, pl);
        for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.3, 0.3, 0.08), cyan, x, 0.4, 0.62);
      }
      break;
    }
    case 'necro': {
      // Fallen Necromancer: legless, a silver horned crown, tiger-skull shoulder pads and a skull staff.
      legless(M(0x424242));
      crown(M(0xcfd8dc), blue);
      horns(1.4, M(0xcfd8dc));
      shoulders(M(0xe0cfa0));
      part(h.rightArm, boxGeo(0.2, 0.2, 4), M(0x5d4037), 0, -2.0, 0.6);
      part(h.rightArm, boxGeo(0.6, 0.6, 0.6), M(0xe0cfa0), 0, -2.0, 2.7);
      part(h.rightArm, boxGeo(0.2, 0.15, 0.1), cyan, 0, -1.9, 3.0);
      break;
    }
    case 'corrupted': {
      // Corrupted Fallen: a white blindfold, blue spikes and chained arm-bands.
      part(h.head, boxGeo(1.28, 0.3, 1.28), M(0xffffff), 0, 0.75, 0);
      for (const [x, y] of [[-0.7, 0.9], [0, 1.0], [0.7, 0.9]]) part(h.torso, boxGeo(0.2, 0.6, 0.2), blue, x, y, -0.4);
      for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.1, 0.25, 1.1), chain, 0, -1.4, 0);
      cracks();
      break;
    }
    case 'seraph':
    case 'angel': {
      // Fallen Seraph: a halo and chains. Fallen Angel: blue armour, a black halo and a hole in its chest.
      const halo = def.flook === 'angel' ? M(0x111111) : glow(h, 0xfff59d);
      for (const [x, z, w, d] of [[0, 0.55, 1.2, 0.15], [0, -0.55, 1.2, 0.15], [0.55, 0, 0.15, 1.2], [-0.55, 0, 0.15, 1.2]]) part(h.head, boxGeo(w, 0.12, d), halo, x, 1.7, z);
      if (def.flook === 'angel') {
        armorUp(M(0x1565c0));
        part(h.torso, boxGeo(0.6, 0.6, 1.2), black, 0, 0.2, 0); // the hole
        part(h.torso, boxGeo(0.4, 0.4, 1.22), M(0x000000), 0, 0.2, 0);
        cracks();
      } else for (const y of [0.4, -0.2]) part(h.torso, boxGeo(2.1, 0.14, 1.1), chain, 0, y, 0);
      break;
    }
    case 'jester': {
      // Fallen Jester: a black-and-blue jester suit, a comedy mask, horns on its shoulders, a present.
      part(h.torso, boxGeo(1.02, 2.02, 1.02), black, -0.5, 0, 0);
      part(h.head, boxGeo(1.0, 1.0, 0.1), M(0xffffff), 0, 0.6, 0.65);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.25, 0.15, 0.05), black, side * 0.25, 0.75, 0.71);
      part(h.head, boxGeo(0.5, 0.12, 0.05), black, 0, 0.35, 0.71);
      for (const side of [-1, 1]) {
        const hat = part(h.head, boxGeo(0.35, 1.0, 0.35), side < 0 ? M(0x0d47a1) : black, side * 0.45, 1.5, 0);
        hat.rotation.z = -side * 0.6;
        part(h.torso, boxGeo(0.2, 0.7, 0.2), steel, side * 1.3, 1.5, 0).rotation.z = -side * 0.4;
      }
      part(h.leftArm, boxGeo(1.0, 1.0, 1.0), M(0x2979ff), 0, -2.2, 0.4); // present
      part(h.leftArm, boxGeo(1.05, 0.2, 1.05), M(0xffffff), 0, -2.2, 0.4);
      break;
    }
    case 'rusher':
    case 'rusherBroken': {
      // Fallen Rusher: spiked metal gloves and boots, a big shield with a blue gem.
      cracks();
      for (const limb of [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg]) {
        part(limb, boxGeo(1.12, 0.6, 1.12), steel, 0, -1.7, 0);
        part(limb, boxGeo(0.15, 0.15, 0.4), steel, 0, -1.7, 0.7);
      }
      if (def.flook === 'rusher') shield(h.leftArm, M(0x546e7a), 2.2, 2.8, cyan);
      break;
    }
    case 'hero': {
      // Fallen Hero: blue-grey armour, a blue crystal crown and a grey cape.
      armorUp(M(0x78909c));
      cape(M(0x9e9e9e));
      for (const x of [-0.4, 0, 0.4]) part(h.head, boxGeo(0.22, x ? 0.5 : 0.75, 0.22), cyan, x, 1.45, 0.3);
      sword(h.rightArm, M(0xb0bec5), 2.2);
      break;
    }
    case 'shieldKnight':
    case 'shieldBroken': {
      // Fallen Shield: a huge knight in dark-teal and silver armour, a giant shield and a mace.
      const teal = M(0x26535a);
      armorUp(teal);
      shoulders(steel, 1.2);
      helmet(steel, 0);
      part(h.head, boxGeo(1.38, 0.15, 0.1), cyan, 0, 0.8, 0.68);
      part(h.rightArm, boxGeo(0.25, 0.25, 1.6), dark, 0, -2.1, 0.8);
      part(h.rightArm, boxGeo(0.8, 0.8, 0.8), steel, 0, -2.1, 1.8); // mace
      if (def.flook === 'shieldKnight') shield(h.leftArm, teal, 2.8, 3.4, cyan);
      break;
    }
    case 'summoner': {
      // Fallen Summoner: a black hooded robe with blue gems and horns, skull shoulder pads and a staff.
      legless(M(0x111111));
      part(h.head, boxGeo(1.45, 1.4, 1.35), M(0x1a1a1a), 0, 0.68, -0.1);
      horns(1.3, M(0x37474f), 1.2);
      shoulders(M(0xe0cfa0));
      for (const y of [0.4, -0.3, -1.2]) part(h.torso, boxGeo(0.3, 0.3, 0.08), cyan, 0, y, 0.56);
      part(h.rightArm, boxGeo(0.2, 0.2, 4.5), M(0x37474f), 0, -2.0, 0.6);
      part(h.rightArm, boxGeo(0.5, 0.5, 0.5), cyan, 0, -2.0, 2.9);
      break;
    }
    case 'honorGuard': {
      // Fallen Honor Guard: hulking, black with blue veins, teal/silver armour, a frog-mouth helmet and two spiked flails.
      cracks();
      const teal = M(0x26535a);
      part(h.torso, boxGeo(2.2, 1.4, 1.2), teal, 0, 0.3, 0);
      shoulders(steel, 1.4);
      part(h.head, boxGeo(1.5, 0.9, 1.5), steel, 0, 0.9, 0);
      part(h.head, boxGeo(1.3, 0.2, 0.1), black, 0, 0.55, 0.76); // frog mouth slit
      for (const arm of [h.leftArm, h.rightArm]) {
        part(arm, boxGeo(0.12, 0.12, 1.2), chain, 0, -2.1, 0.7);
        const ball = part(arm, boxGeo(0.9, 0.9, 0.9), dark, 0, -2.1, 1.6);
        for (const [x, y] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) part(ball, boxGeo(0.25, 0.25, 0.25), steel, x, y, 0);
      }
      break;
    }
    case 'tank': {
      // Fallen Tank: a knight fully covered in grey-blue armour with gems and chains.
      armorUp(M(0x78909c));
      shoulders(M(0x607d8b), 1.2);
      part(h.head, boxGeo(1.35, 1.35, 1.35), M(0x78909c), 0, 0.6, 0);
      part(h.head, boxGeo(1.0, 0.12, 0.1), black, 0, 0.75, 0.69);
      for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.3, 0.3, 0.08), cyan, x, 0.5, 0.62);
      part(h.torso, boxGeo(2.2, 0.15, 1.2), chain, 0, -0.4, 0);
      break;
    }
    case 'guardian': {
      // Fallen Guardian: blue armour, a yellow belt, a grey cape, blue crystals on its head and a purple sword.
      cracks();
      armorUp(M(0x1565c0));
      part(h.torso, boxGeo(2.2, 0.3, 1.2), M(0xfdd835), 0, -0.8, 0);
      cape(M(0x9e9e9e), 3);
      for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.25, 0.6, 0.25), cyan, x, 1.4, 0).rotation.z = x;
      sword(h.rightArm, glow(h, 0xb388ff), 3.2);
      break;
    }
    case 'king': {
      // The Fallen King: silver and dark-grey armour with cyan spikes and gems, a crowned helmet,
      // a cyan sword and a spiked shield.
      armorUp(M(0x9e9e9e));
      shoulders(M(0x616161), 1.3);
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(0.2, 0.7, 0.2), cyan, x, 1.6, 0);
      part(h.head, boxGeo(1.38, 1.0, 1.38), M(0xbdbdbd), 0, 0.7, 0);
      crown(M(0xe0e0e0), cyan);
      part(h.torso, boxGeo(0.45, 0.45, 0.08), cyan, 0, -0.3, 0.62); // gem in its belly
      cape(M(0x37474f), 3.2);
      sword(h.rightArm, glow(h, 0x18ffff), 3.6);
      shield(h.leftArm, M(0x616161), 2.4, 2.8, cyan);
      for (const y of [-0.6, -2.2]) part(h.leftArm, boxGeo(0.4, 0.2, 0.2), steel, 0.85, y, 0);
      break;
    }
  }
}

/** Hard mode outfits (def.look): spores, skeletons, mages, knights, berserkers and the rest. */
export function hardParts(h, def) {
  const { M } = h;
  // Golden armor shines a little.
  const gold = (color) => {
    if (!def.gold) return M(color);
    const m = glow(h, color);
    m.emissiveIntensity = 0.3;
    return m;
  };
  const plate = def.plate != null ? gold(def.plate) : null;
  const dark = M(0x263238);
  const mushroom = (parent, x, y, z, size, cap) => {
    part(parent, boxGeo(size * 0.35, size * 0.6, size * 0.35), M(0xf5f0e1), x, y + size * 0.3, z);
    part(parent, boxGeo(size, size * 0.4, size), M(cap), x, y + size * 0.7, z);
    part(parent, boxGeo(size * 0.2, size * 0.06, size * 0.2), M(0xffffff), x + size * 0.2, y + size * 0.92, z + size * 0.15); // spot
  };
  switch (def.look) {
    case 'spores': {
      // Infected: lumpy spore clusters growing all over it.
      const spores = [glow(h, 0x9c27b0), M(0xc0ca33), M(0x7cb342)];
      spores[0].emissiveIntensity = 0.35;
      const at = [[h.torso, 0.5, 0.5, 0.55], [h.torso, -0.6, -0.3, 0.55], [h.torso, 0.1, 0.8, -0.55], [h.torso, -0.4, 0.1, -0.55],
        [h.head, 0.4, 1.25, 0.2], [h.head, -0.35, 1.2, -0.3], [h.rightArm, 0, -0.6, 0.55], [h.leftArm, 0.4, -1.3, 0.3], [h.rightLeg, 0.4, -0.8, 0.5]];
      at.forEach(([p, x, y, z], i) => {
        const s = 0.3 + (i % 3) * 0.12;
        part(p, boxGeo(s, s, s), spores[i % 3], x, y, z);
        part(p, boxGeo(s * 0.6, s * 0.6, s * 0.6), spores[(i + 1) % 3], x + s * 0.4, y + s * 0.3, z);
      });
      break;
    }
    case 'skeleton': {
      // Skeleton: ribs showing under a rusty chest plate, an iron helmet and shoulder guards.
      const bone = M(def.skin);
      for (const y of [-0.15, -0.45, -0.75]) part(h.torso, boxGeo(1.5, 0.14, 0.06), bone, 0, y, 0.53);
      part(h.torso, boxGeo(0.2, 1.0, 0.07), bone, 0, -0.45, 0.54); // breastbone
      part(h.torso, boxGeo(2.15, 0.9, 1.15), plate, 0, 0.55, 0);
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 0.6, 1.25), plate, 0, -0.1, 0);
      part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x4e342e), 0, -0.9, 0); // belt
      part(h.head, boxGeo(1.35, 0.55, 1.35), plate, 0, 1.2, 0);
      part(h.head, boxGeo(0.18, 0.5, 0.1), plate, 0, 0.75, 0.66); // nose guard
      if (def.club) {
        // Giant Skeleton: horns on the helmet and a huge bone club.
        for (const side of [-1, 1]) {
          const horn = part(h.head, boxGeo(0.3, 0.9, 0.3), bone, side * 0.75, 1.65, 0);
          horn.rotation.z = -side * 0.5;
        }
        part(h.rightArm, boxGeo(0.45, 0.45, 4), bone, 0, -2.1, 1.4);
        part(h.rightArm, boxGeo(1.1, 1.1, 1.5), bone, 0, -2.1, 3.7);
      }
      break;
    }
    case 'multiplier': {
      // Multiplier: a glowing seam splits it down the middle, with two copies of its core floating above.
      const cyan = glow(h, 0x18ffff);
      part(h.torso, boxGeo(0.12, 2.02, 1.04), cyan, 0, 0, 0);
      part(h.torso, boxGeo(0.7, 0.7, 0.1), cyan, 0, 0.3, 0.53);
      part(h.head, boxGeo(0.12, 1.24, 1.24), cyan, 0, 0.6, 0);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.4, 0.4, 0.4), cyan, side * 0.5, 1.8, 0);
      break;
    }
    case 'mage': {
      // Mage: a long robe, a tall pointed hat and a staff with a fireball on top.
      const robe = M(def.robe);
      const trim = M(0xffd54f);
      part(h.body, boxGeo(2.3, 2.1, 1.4), robe, 0, 1.0, 0);
      part(h.body, boxGeo(2.35, 0.2, 1.45), trim, 0, 0.1, 0);
      part(h.head, boxGeo(1.9, 0.15, 1.9), robe, 0, 1.25, 0);
      part(h.head, boxGeo(1.2, 0.55, 1.2), robe, 0, 1.6, 0);
      part(h.head, boxGeo(0.85, 0.5, 0.85), robe, 0.05, 2.1, -0.05);
      part(h.head, boxGeo(0.5, 0.5, 0.5), robe, 0.12, 2.55, -0.12);
      part(h.head, boxGeo(0.25, 0.4, 0.25), robe, 0.22, 2.95, -0.2);
      part(h.head, boxGeo(0.25, 0.25, 0.06), trim, 0.3, 1.7, 0.61); // star
      part(h.rightArm, boxGeo(0.25, 0.25, 5.5), M(0x5d4037), 0, -2.1, 0.8);
      part(h.rightArm, boxGeo(0.8, 0.8, 0.8), glow(h, 0xff6d00), 0, -2.1, 3.8);
      part(h.rightArm, boxGeo(0.5, 0.5, 0.5), glow(h, 0xffea00), 0, -2.1, 4.3);
      break;
    }
    case 'knight': {
      // Knight: full plate, a visored helm, a sword and a shield. Golden Knights get a red plume.
      part(h.torso, boxGeo(2.25, 2.1, 1.25), plate, 0, 0, 0);
      part(h.torso, boxGeo(0.3, 1.4, 0.06), dark, 0, 0.1, 0.64);
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.35, 0.75, 1.35), plate, 0, -0.15, 0);
        part(arm, boxGeo(1.1, 0.7, 1.1), plate, 0, -1.6, 0); // gauntlet
      }
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.12, 1.4, 1.12), plate, 0, -1.2, 0);
      part(h.head, boxGeo(1.45, 1.45, 1.45), plate, 0, 0.62, 0);
      part(h.head, boxGeo(1.05, 0.14, 0.06), dark, 0, 0.75, 0.74); // visor slit
      for (const x of [-0.3, 0, 0.3]) part(h.head, boxGeo(0.1, 0.1, 0.06), dark, x, 0.4, 0.74);
      if (def.gold) for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.3, 0.5, 0.4), M(0xc62828), 0, 1.45 + i * 0.15, -0.4 + i * 0.3);
      else part(h.head, boxGeo(0.2, 0.45, 1.3), dark, 0, 1.5, 0);
      part(h.leftArm, boxGeo(0.25, 2.0, 2.4), plate, 0.65, -1.5, 0.1); // shield
      part(h.leftArm, boxGeo(0.08, 1.2, 0.4), def.gold ? M(0xc62828) : dark, 0.8, -1.5, 0.1);
      part(h.leftArm, boxGeo(0.08, 0.4, 1.2), def.gold ? M(0xc62828) : dark, 0.8, -1.5, 0.1);
      part(h.rightArm, boxGeo(0.28, 0.28, 0.9), M(0x4e342e), 0, -2.1, 0.1); // grip
      part(h.rightArm, boxGeo(1.1, 0.28, 0.28), def.gold ? plate : dark, 0, -2.1, 0.65); // guard
      part(h.rightArm, boxGeo(0.14, 0.5, 3.4), def.gold ? plate : M(0xcfd8dc), 0, -2.1, 2.45); // blade
      break;
    }
    case 'berserker': {
      // Berserker: a hulking brute in heavy armor, its face hidden behind an iron mask.
      const wrap = M(0x3e2723);
      const red = glow(h, 0xff1744);
      part(h.head, boxGeo(1.36, 1.36, 1.36), wrap, 0, 0.62, 0);
      part(h.head, boxGeo(1.2, 1.0, 0.1), plate, 0, 0.6, 0.7);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.3, 0.1, 0.06), red, side * 0.28, 0.8, 0.76);
      for (const y of [0.2, 0.4]) part(h.head, boxGeo(0.9, 0.06, 0.06), dark, 0, y, 0.76);
      part(h.torso, boxGeo(2.3, 2.1, 1.3), plate, 0, 0, 0);
      part(h.torso, boxGeo(2.35, 0.3, 1.35), wrap, 0, -0.85, 0); // belt
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.5, 0.9, 1.5), plate, 0, -0.1, 0);
        for (const z of [-0.4, 0.4]) part(arm, boxGeo(0.25, 0.5, 0.25), dark, 0, 0.5, z); // pauldron spikes
        part(arm, boxGeo(1.2, 0.9, 1.2), plate, 0, -1.7, 0);
      }
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.12, 1.2, 1.12), plate, 0, -1.3, 0);
      // Chains across the chest.
      for (let i = 0; i < 5; i++) part(h.torso, boxGeo(0.3, 0.2, 0.08), dark, -0.8 + i * 0.4, 0.7 - i * 0.35, 0.67);
      break;
    }
    case 'archer': {
      // Archer: a green hood, a quiver of bolts and a crossbow held out in front.
      const hood = M(def.shirt);
      const wood = M(0x5d4037);
      part(h.head, boxGeo(1.4, 1.35, 1.3), hood, 0, 0.7, -0.08);
      part(h.torso, boxGeo(0.6, 1.6, 0.5), wood, 0.4, 0.2, -0.75); // quiver
      for (const x of [0.25, 0.45, 0.6]) part(h.torso, boxGeo(0.08, 0.5, 0.08), M(0xeeeeee), x, 1.2, -0.75);
      part(h.rightArm, boxGeo(0.3, 2.0, 0.3), wood, 0.7, -2.6, 0); // stock
      part(h.rightArm, boxGeo(2.4, 0.2, 0.25), wood, 0.7, -3.4, 0); // bow
      part(h.rightArm, boxGeo(2.3, 0.05, 0.05), M(0xeeeeee), 0.7, -3.1, 0); // string
      break;
    }
    case 'plague': {
      // Pestilence: a plague doctor's coat, wide hat and beaked mask, sprouting mushrooms everywhere.
      const coat = M(def.robe);
      part(h.body, boxGeo(2.3, 2.3, 1.4), coat, 0, 1.1, 0);
      part(h.torso, boxGeo(2.2, 2.1, 1.2), coat, 0, 0, 0);
      part(h.head, boxGeo(1.3, 1.3, 1.3), M(0x3e2723), 0, 0.62, 0);
      part(h.head, boxGeo(0.5, 0.5, 1.0), M(0xd7ccc8), 0, 0.42, 1.1); // beak
      part(h.head, boxGeo(0.3, 0.3, 0.6), M(0xd7ccc8), 0, 0.32, 1.85);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.35, 0.35, 0.08), glow(h, 0x76ff03), side * 0.3, 0.85, 0.68); // goggles
      part(h.head, boxGeo(2.1, 0.15, 2.1), coat, 0, 1.3, 0); // hat brim
      part(h.head, boxGeo(1.25, 0.65, 1.25), coat, 0, 1.68, 0);
      part(h.rightArm, boxGeo(0.2, 0.2, 5.5), M(0x4e342e), 0, -2.1, 0.6); // cane
      for (const [p, x, y, z, s, c] of [[h.head, 0.5, 2.0, 0.1, 0.6, 0xc62828], [h.head, -0.4, 2.0, -0.2, 0.45, 0x8d6e63], [h.torso, 1.0, 1.0, 0, 0.7, 0x8e24aa],
        [h.torso, -1.0, 1.0, 0.1, 0.55, 0xc62828], [h.torso, 0.4, 0.3, -0.7, 0.6, 0x8d6e63], [h.body, 0.9, 0.3, 0.6, 0.5, 0x8e24aa], [h.body, -0.8, 0.6, -0.5, 0.6, 0xc62828]]) {
        mushroom(p, x, y, z, s, c);
      }
      break;
    }
    case 'predator': {
      // Predator: a huge red mechanical claw arm, a black-and-white body with yellow tubes and a glowing eye.
      const red = M(0xd32f2f);
      const white = M(0xd7d7cf);
      const yellow = glow(h, 0xffc400);
      part(h.torso, boxGeo(1.02, 2.02, 1.02), white, 0.5, 0, 0);
      part(h.torso, boxGeo(0.4, 0.4, 0.1), yellow, 0.4, 0.3, 0.55); // chest eye
      part(h.torso, boxGeo(0.2, 0.2, 0.1), dark, 0.4, 0.3, 0.6);
      for (const [x, y] of [[0.1, 0.8], [-0.2, 0.5], [-0.4, 0.1], [-0.3, -0.3]]) part(h.torso, boxGeo(0.25, 0.45, 0.3), yellow, x, y, 0.6); // tubes
      part(h.torso, boxGeo(0.3, 1.1, 0.06), red, -0.6, 0.2, 0.52);
      part(h.leftArm, boxGeo(1.05, 2.05, 1.05), white, 0, -1, 0);
      part(h.leftArm, boxGeo(1.1, 0.25, 1.1), red, 0, -1.3, 0);
      part(h.rightArm, boxGeo(1.9, 1.9, 1.9), red, 0, -0.6, 0); // giant arm
      part(h.rightArm, boxGeo(1.6, 1.4, 1.6), red, 0, -2.1, 0);
      part(h.rightArm, boxGeo(0.9, 0.4, 0.9), yellow, 0, -2.9, 0); // palm
      for (const [x, z] of [[-0.55, 0.5], [0.55, 0.5], [0, -0.55]]) part(h.rightArm, boxGeo(0.3, 1.3, 0.3), red, x, -3.5, z); // claws
      part(h.head, boxGeo(1.32, 1.32, 1.32), red, 0, 0.62, 0);
      part(h.head, boxGeo(0.5, 0.5, 0.08), yellow, 0, 0.62, 0.7); // eye
      part(h.head, boxGeo(0.6, 0.08, 0.06), dark, 0, 0.62, 0.75);
      for (const y of [0.3, 0.95]) part(h.head, boxGeo(1.0, 0.07, 0.06), dark, 0, y, 0.68);
      // Molten seams on the legs.
      const lava = glow(h, 0xff6d00);
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.04, 0.12, 1.04), lava, 0, -1.2, 0);
      break;
    }
    case 'eradicator': {
      // Eradicator: black power armor, an orange-rimmed visor, shoulder turrets, a jet pack and a
      // huge glowing sword.
      const metal = M(0x37474f);
      const black = M(0x1c1c1c);
      const orange = glow(h, 0xff6d00);
      const yellow = glow(h, 0xffd600);
      const white = M(0xeeeeee);
      part(h.head, boxGeo(1.5, 1.5, 1.5), metal, 0, 0.65, 0);
      part(h.head, boxGeo(1.2, 1.05, 0.06), orange, 0, 0.6, 0.76);
      part(h.head, boxGeo(1.0, 0.85, 0.08), black, 0, 0.6, 0.78);
      part(h.torso, boxGeo(2.6, 2.3, 1.5), metal, 0, 0.05, 0);
      part(h.torso, boxGeo(1.2, 1.2, 0.1), black, 0, -0.1, 0.76);
      for (const x of [-0.15, 0, 0.15]) part(h.torso, boxGeo(0.06, 0.8, 0.06), white, x, -0.1, 0.82);
      for (const [x, y] of [[0.75, 0.55], [0.85, 0.3]]) part(h.torso, boxGeo(0.18, 0.18, 0.08), orange, x, y, 0.78);
      part(h.torso, boxGeo(0.35, 0.12, 0.06), white, -0.75, 0.6, 0.78);
      // Shoulder turrets.
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(1.1, 0.9, 1.3), metal, side * 1.75, 1.5, 0);
        part(h.torso, boxGeo(0.25, 0.25, 1.2), black, side * 1.6, 1.55, 0.9);
        part(h.torso, boxGeo(0.25, 0.25, 1.2), black, side * 1.9, 1.55, 0.9);
      }
      // Jet pack.
      part(h.torso, boxGeo(1.5, 1.8, 0.8), black, 0, 0.2, -1.1);
      part(h.torso, boxGeo(1.5, 0.2, 0.82), yellow, 0, 0.9, -1.1);
      for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.4, 0.3, 0.4), orange, x, -0.8, -1.1);
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.4, 1.0, 1.4), metal, 0, -0.2, 0);
        part(arm, boxGeo(1.25, 1.0, 1.25), black, 0, -1.6, 0);
      }
      for (const leg of [h.rightLeg, h.leftLeg]) {
        part(leg, boxGeo(1.15, 1.6, 1.15), metal, 0, -1.1, 0);
        part(leg, boxGeo(0.5, 0.08, 0.06), white, 0, -1.0, 0.6);
      }
      // The sword.
      part(h.rightArm, boxGeo(0.35, 0.35, 1.2), black, 0, -2.1, 0.2);
      part(h.rightArm, boxGeo(1.6, 0.4, 0.4), metal, 0, -2.1, 0.9);
      part(h.rightArm, boxGeo(0.3, 1.1, 6.5), yellow, 0, -2.1, 4.3);
      break;
    }
  }
}
