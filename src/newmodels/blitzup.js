import * as THREE from 'three';
import { boxGeo, part } from '../models.js';

// Upgrade looks for the wave 9 hero towers (newmodels/f.js, g.js, h.js). Their base models only
// added a small prop per level, so from the normal camera distance every level looked the same.
// Each tower here gets its own progression on top of its model:
//   - outfit colours that change at set levels (a new "rank" you can spot from far away),
//   - signature pieces for its theme (a Chef's apron and knife rack, a Wizard's orbiting orbs...),
//   - a final form at max level: its strongest colours, an effect around it, and it grows a bit.
// Pieces are placed from the model's own measured box (anchors()), so they fit each model.
// Helpers from models.js are only used inside functions (models.js imports this file).

/* ------------------------------------------------------------------ kit */

/** Material for `hex` registered on the model (so it fades / gets disposed with it). */
function mat(h, hex, glowing = false, opacity = 1) {
  const m = h.M(hex);
  if (glowing) {
    m.userData.glow = hex;
    m.emissive.setHex(hex);
    m.emissiveIntensity = 0.8;
  }
  if (opacity < 1) {
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.userData.keepOpacity = opacity;
  }
  return m;
}

/**
 * Recolours parts: every mesh under `h.root` (minus anything under `skip`) whose colour is a key of
 * `map` gets the mapped colour. Parts with a face texture (material arrays) keep their look.
 * minY: only parts whose middle is higher than that (model space), e.g. clothes but not props.
 */
function paint(h, map, skip = [], minY = -Infinity) {
  const made = new Map();
  const skipSet = new Set(skip.filter(Boolean));
  h.root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const walk = (o) => {
    if (skipSet.has(o)) return;
    if (o.isMesh && !Array.isArray(o.material) && o.material.color && (minY === -Infinity || box.setFromObject(o).getCenter(new THREE.Vector3()).y > minY)) {
      const hex = o.material.color.getHex();
      const to = map[hex];
      if (to != null) {
        const glowing = !!o.material.userData.glow;
        const key = `${to}|${glowing}|${o.material.opacity}`;
        if (!made.has(key)) made.set(key, mat(h, to, glowing, o.material.userData.keepOpacity ?? 1));
        o.material = made.get(key);
      }
    }
    for (const c of o.children) walk(c);
  };
  walk(h.root);
}

/** Model-space box of the whole model, and the head's box in the head's own space. */
function anchors(h) {
  h.root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(h.root.matrixWorld).invert();
  const box = new THREE.Box3().setFromObject(h.root).applyMatrix4(inv);
  let head = null;
  if (h.head?.children.length) {
    const hb = new THREE.Box3().setFromObject(h.head);
    const toHead = new THREE.Matrix4().copy(h.head.matrixWorld).invert();
    head = hb.applyMatrix4(toHead);
  }
  return { box, head, top: box.max.y };
}

/** A group that keeps turning (and can bob): animated by the views through `h.drift`. */
function drifter(h, parent, y, speed = 0.8, bob = 0) {
  const g = new THREE.Group();
  g.position.y = y;
  g.userData.speed = speed;
  g.userData.bob = bob;
  g.userData.y = y;
  parent.add(g);
  (h.drift ??= []).push(g);
  return g;
}

/** `n` pieces evenly around a circle in `g` (each made by `make(i, angle)` at the right spot). */
function around(g, n, r, make, y = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const o = make(i, a);
    o.position.set(Math.cos(a) * r, y + o.position.y, Math.sin(a) * r);
  }
}

/** Glowing cubes circling the model. colors: one per cube (cycled). */
function orbit(h, y, r, n, size, colors, speed = 0.9, opacity = 1) {
  const g = drifter(h, h.root, y, speed, 0.25);
  const mats = colors.map((c) => mat(h, c, true, opacity));
  around(g, n, r, (i, a) => {
    const s = part(g, boxGeo(size, size, size), mats[i % mats.length], 0, (i % 2) * size * 0.8, 0);
    s.rotation.set(0.6, a, 0.6);
    return s;
  });
  return g;
}

/** A flat ring of glowing tiles on the ground around the tower (slowly turning). */
function groundRing(h, r, n, color, speed = 0.4, w = 0.9, opacity = 0.8, y = 0.06) {
  const g = drifter(h, h.root, y, speed);
  const m = mat(h, color, true, opacity);
  around(g, n, r, (i, a) => {
    const s = part(g, boxGeo(w, 0.06, 0.22), m, 0, 0, 0);
    s.rotation.y = -a + Math.PI / 2;
    return s;
  });
  return g;
}

/** A halo of glowing pieces floating above `y` (turning). */
function halo(h, y, r, n, color, size = 0.3) {
  const g = drifter(h, h.root, y, 0.7, 0.12);
  const m = mat(h, color, true);
  around(g, n, r, (i, a) => {
    const s = part(g, boxGeo(size * 2, size * 0.5, size), m, 0, 0, 0);
    s.rotation.y = -a + Math.PI / 2;
    return s;
  });
  return g;
}

/** A blocky crown on top of the head (head-space box `hb`). */
function crown(h, hb, color, gem, scale = 1) {
  if (!hb) return null;
  const g = new THREE.Group();
  const w = Math.min(hb.max.x - hb.min.x, 1.4) * scale;
  g.position.set((hb.min.x + hb.max.x) / 2, hb.max.y, (hb.min.z + hb.max.z) / 2);
  h.head.add(g);
  const m = mat(h, color);
  part(g, boxGeo(w, 0.3 * scale, w), m, 0, 0.15 * scale, 0);
  const k = w / 2 - 0.1 * scale;
  for (const [x, z] of [[-k, -k], [k, -k], [-k, k], [k, k], [0, k], [0, -k], [k, 0], [-k, 0]]) part(g, boxGeo(0.2 * scale, 0.35 * scale, 0.2 * scale), m, x, 0.45 * scale, z);
  part(g, boxGeo(0.25 * scale, 0.25 * scale, 0.08), mat(h, gem, true), 0, 0.18 * scale, w / 2 + 0.02);
  return g;
}

/** Shoulder pads on both arms. */
function shoulderPads(h, color, trim, size = 1.25) {
  for (const arm of [h.rightArm, h.leftArm]) {
    part(arm, boxGeo(size, 0.5, size), mat(h, color), 0, -0.05, 0);
    part(arm, boxGeo(size + 0.06, 0.12, size + 0.06), mat(h, trim), 0, -0.3, 0);
  }
}

/** A cape hanging down the back of the torso. */
function cape(h, color, trim, len = 3.2) {
  const g = new THREE.Group();
  g.position.set(0, 0.95, -0.62);
  g.rotation.x = 0.08;
  h.torso.add(g);
  part(g, boxGeo(2.1, len, 0.1), mat(h, color), 0, -len / 2, 0);
  part(g, boxGeo(2.16, 0.22, 0.14), mat(h, trim), 0, -len + 0.1, 0);
  part(g, boxGeo(2.3, 0.3, 0.3), mat(h, trim), 0, 0, 0.08);
  return g;
}

/** Makes the model a bit bigger. */
function grow(h, k) {
  h.body.scale.multiplyScalar(k);
}

/* ------------------------------------------------------------------ towers */

const TIERS = {
  // Wizard: apprentice lavender -> royal blue -> indigo with orbiting orbs -> a midnight archmage
  // with a white-gold cape, star specks and a rune halo over the hat.
  scoutWizard(h, lv) {
    if (lv >= 1) paint(h, { 0x7e57c2: 0xffb300 });
    if (lv === 2) paint(h, { 0xb39ddb: 0x5c6bc0 });
    if (lv === 3) paint(h, { 0xb39ddb: 0x3949ab });
    if (lv >= 4) paint(h, { 0xb39ddb: 0x1a237e, 0x4527a0: 0xfff8e1 });
    const { top } = anchors(h);
    if (lv >= 3) orbit(h, 3.6, 2.6, 3, 0.45, [0x80d8ff, 0xea80fc, 0xffeb3b], 1.1);
    if (lv >= 4) {
      const star = mat(h, 0xfff59d, true);
      for (const [x, y, z] of [[-0.6, 0.6, 0.73], [0.5, 1.3, 0.73], [-0.2, 1.9, 0.73], [0.7, 2.3, 0.73]]) part(h.body, boxGeo(0.18, 0.18, 0.05), star, x, y, z).rotation.z = Math.PI / 4;
      halo(h, top + 0.4, 1.3, 8, 0xe040fb, 0.25);
      grow(h, 1.1);
    }
  },

  // Chef: line cook -> blue striped apron -> charcoal head-chef jacket -> gold epaulettes and a knife
  // rack on the back -> a black-and-gold master chef with a gold toque and a ring of fire.
  enforcerChef(h, lv) {
    if (lv >= 1) {
      const blue = mat(h, lv >= 4 ? 0xb71c1c : 0x1565c0);
      const white = mat(h, 0xfafafa);
      const ap = new THREE.Group();
      ap.position.set(0, -0.35, 0.56);
      h.torso.add(ap);
      part(ap, boxGeo(1.7, 1.5, 0.06), blue, 0, 0, 0);
      for (const x of [-0.45, 0, 0.45]) part(ap, boxGeo(0.1, 1.5, 0.07), white, x, 0, 0);
    }
    if (lv === 2 || lv === 3) paint(h, { 0xfafafa: 0x37474f }, [h.head]);
    if (lv >= 4) paint(h, { 0xfafafa: 0x1a1a1a }, [h.head]);
    if (lv >= 4) paint(h, { 0xfafafa: 0xffd54f });
    if (lv >= 3) {
      shoulderPads(h, 0xffc107, 0xff8f00, 1.15);
      const rack = new THREE.Group();
      rack.position.set(0, 0.2, -0.6);
      h.torso.add(rack);
      part(rack, boxGeo(1.6, 0.9, 0.2), mat(h, 0x5d4037), 0, 0, 0);
      const steel = mat(h, 0xcfd8dc);
      for (const x of [-0.5, 0, 0.5]) {
        part(rack, boxGeo(0.22, 1.4, 0.06), steel, x, 0.9, -0.05);
        part(rack, boxGeo(0.16, 0.4, 0.16), mat(h, 0x212121), x, 0.05, -0.05);
      }
    }
    if (lv >= 4) {
      groundRing(h, 2.6, 12, 0xff6d00, 0.6, 0.8, 0.85);
      orbit(h, 0.9, 2.5, 6, 0.3, [0xffab00, 0xff3d00], 1.4);
      grow(h, 1.1);
    }
  },

  // Yasuke: crimson headband -> dark-rose dragon leggings -> a ring of embers at her feet -> a
  // crimson dragon warrior wreathed in orbiting flames.
  kniferYasuke(h, lv) {
    const { head } = anchors(h);
    if (lv >= 1 && head) {
      const red = mat(h, 0xd50000);
      part(h.head, boxGeo(head.max.x - head.min.x + 0.08, 0.22, head.max.z - head.min.z + 0.08), red, (head.min.x + head.max.x) / 2, head.min.y + (head.max.y - head.min.y) * 0.62, (head.min.z + head.max.z) / 2);
      const tail = part(h.head, boxGeo(0.12, 0.8, 0.12), red, 0.3, head.min.y + 0.7, head.min.z - 0.15);
      tail.rotation.x = -0.5;
    }
    if (lv >= 2) paint(h, { 0xf48fb1: 0xad1457 });
    if (lv >= 4) paint(h, { 0x1a1a1a: 0x7f0000, 0x212121: 0x3e0000 });
    if (lv >= 3) groundRing(h, 2.3, 10, 0xff6d00, 0.8, 0.6, 0.8);
    if (lv >= 4) {
      orbit(h, 2.6, 2.4, 5, 0.32, [0xff9100, 0xffd600, 0xff3d00], 1.6);
      grow(h, 1.12);
    }
  },

  // Maitake: plum witch -> moss-green dress -> glowing toadstools sprouting around her -> a night
  // purple witch with a toxic glowing hem standing in a bubbling green puddle.
  toxicnatorMaitake(h, lv) {
    if (lv === 2 || lv === 3) paint(h, { 0x4a1942: 0x33691e, 0x38102f: 0x1b5e20 });
    if (lv >= 4) paint(h, { 0x4a1942: 0x311b92, 0x38102f: 0x76ff03 });
    if (lv >= 3) {
      const caps = [0x76ff03, 0xd500f9, 0x00e5ff];
      const stem = mat(h, 0xf1f8e9);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const r = 2.2 + (i % 2) * 0.4;
        const s = 0.7 + (i % 3) * 0.2;
        part(h.root, boxGeo(0.18 * s, 0.6 * s, 0.18 * s), stem, Math.cos(a) * r, 0.3 * s, Math.sin(a) * r);
        part(h.root, boxGeo(0.6 * s, 0.25 * s, 0.6 * s), mat(h, caps[i % 3], true), Math.cos(a) * r, 0.65 * s, Math.sin(a) * r);
      }
    }
    if (lv >= 4) {
      part(h.root, boxGeo(3.6, 0.05, 3.6), mat(h, 0x64dd17, true, 0.55), 0, 0.04, 0);
      orbit(h, 1.2, 1.9, 6, 0.28, [0x76ff03, 0xb2ff59], 0.9, 0.85);
      grow(h, 1.1);
    }
  },

  // Branch: thorny sprout -> roots spreading over the ground -> bark-brown head with a crown of
  // leaves -> an ancient glowing tree spirit with leaves circling it.
  sparkBranch(h, lv) {
    const { top } = anchors(h);
    if (lv >= 2) {
      const root = mat(h, 0x5d4037);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        const r = part(h.root, boxGeo(1.6, 0.22, 0.32), root, Math.cos(a) * 1.9, 0.11, Math.sin(a) * 1.9);
        r.rotation.y = -a;
      }
    }
    if (lv >= 3) {
      paint(h, { 0x7b4a52: 0x6d4c41 });
      const leaf = mat(h, lv >= 4 ? 0x00e676 : 0x2e7d32, lv >= 4);
      const g = new THREE.Group();
      g.position.y = top + 0.1;
      h.body.add(g);
      around(g, 7, 0.9, (i, a) => {
        const s = part(g, boxGeo(0.35, 0.9, 0.12), leaf, 0, 0.3, 0);
        s.rotation.set(0, -a + Math.PI / 2, 0);
        s.rotateX(-0.5);
        return s;
      });
    }
    if (lv >= 4) {
      paint(h, { 0x2e7d32: 0x1b5e20, 0x43a047: 0x00c853, 0x388e3c: 0x00a152 });
      orbit(h, 2.8, 2.5, 8, 0.35, [0x69f0ae, 0xb9f6ca, 0xc6ff00], 0.7);
      grow(h, 1.15);
    }
  },

  // Scientist: lab coat -> goggles (base model) -> a yellow hazmat coat -> a dark mad-scientist
  // coat with glowing circuit lines -> glowing hair, orbiting plasma balls and a lightning halo.
  railgunnerScientist(h, lv) {
    if (lv === 2) paint(h, { 0xfafafa: 0xfdd835 }, [h.head]);
    if (lv >= 3) {
      paint(h, { 0xfafafa: 0x263238 }, [h.head]);
      const line = mat(h, 0xb388ff, true);
      for (const x of [-0.75, 0.75]) part(h.torso, boxGeo(0.08, 1.6, 0.05), line, x, -0.2, 0.55);
      part(h.torso, boxGeo(1.6, 0.08, 0.05), line, 0, -0.95, 0.55);
    }
    if (lv >= 4) {
      paint(h, { 0xf48fb1: 0xea80fc }, [h.torso, h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]);
      const { top } = anchors(h);
      orbit(h, 3.4, 2.5, 4, 0.5, [0xb388ff, 0x40c4ff], 1.3, 0.9);
      halo(h, top + 0.35, 1.1, 6, 0x40c4ff, 0.3);
      grow(h, 1.1);
    }
  },

  // Specter (ghost guitarist): white ghost -> music notes floating around -> purple scarf and glowing
  // notes -> on stage (base model) with a spotlight ring.
  commanderSpecter(h, lv) {
    if (lv >= 1) {
      const black = mat(h, lv >= 2 ? 0x18ffff : 0x212121, lv >= 2);
      const g = drifter(h, h.root, 4.2, 0.6, 0.3);
      around(g, 4, 2.2, (i) => {
        const n = new THREE.Group();
        g.add(n);
        part(n, boxGeo(0.35, 0.28, 0.2), black, 0, 0, 0);
        part(n, boxGeo(0.08, 0.7, 0.08), black, 0.14, 0.4, 0);
        if (i % 2) part(n, boxGeo(0.3, 0.1, 0.08), black, 0.28, 0.72, 0);
        return n;
      });
    }
    if (lv >= 2) paint(h, { 0xd32f2f: 0x7b1fa2 });
    if (lv >= 3) paint(h, { 0xf7f7f7: 0xe0f7fa });
    if (lv >= 4) groundRing(h, 2.9, 14, 0xe040fb, 0.5, 0.9, 0.85);
  },

  // Stella: painter -> palette (base) -> paint splats on her smock -> a pink beret and paint blobs
  // floating around her -> a rainbow arch behind her.
  engineerStella(h, lv) {
    const splat = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa];
    if (lv >= 2) {
      for (let i = 0; i < 5; i++) part(h.torso, boxGeo(0.32 + (i % 2) * 0.15, 0.28, 0.05), mat(h, splat[i]), -0.7 + i * 0.35, -0.8 + ((i * 0.53) % 1) * 1.4, 0.55);
    }
    if (lv >= 3) {
      paint(h, { 0x111111: 0xd81b60 }, [h.torso, h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]);
      orbit(h, 3.2, 2.4, 5, 0.38, splat, 0.8);
    }
    if (lv >= 4) {
      // A rainbow arch over her back, from shoulder height on one side to the other.
      const arch = new THREE.Group();
      arch.position.set(0, 2.4, -1.3);
      h.root.add(arch);
      const bands = [0xe53935, 0xff9800, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa];
      bands.forEach((c, k) => {
        const m = mat(h, c, true);
        const r = 3.0 - k * 0.22;
        const n = 12;
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI;
          const s = part(arch, boxGeo(0.24, (Math.PI * r) / n + 0.06, 0.12), m, Math.cos(a) * r, Math.sin(a) * r, (i % 2) * 0.03); // staggered so joints don't z-fight
          s.rotation.z = a;
        }
      });
      grow(h, 1.08);
    }
  },

  // Byte: cream computer -> silver case -> sparks circling it -> a dark chrome case with purple
  // glowing trim and an electric ring on the ground.
  electroByte(h, lv) {
    if (lv === 2 || lv === 3) paint(h, { 0xf5ecd0: 0xcfd8dc, 0xe0d4b0: 0x90a4ae });
    if (lv >= 4) paint(h, { 0xf5ecd0: 0x37474f, 0xe0d4b0: 0x263238 });
    if (lv >= 3) orbit(h, 3.0, 2.2, 5, 0.25, [0xffff00, 0x40c4ff], 1.8);
    if (lv >= 4) {
      const { box } = anchors(h);
      const trim = mat(h, 0xd500f9, true);
      part(h.body, boxGeo(box.max.x - box.min.x > 3 ? 2.6 : 2.2, 0.12, 0.12), trim, 0, 0.9, 1.25);
      groundRing(h, 2.6, 12, 0x7c4dff, 1.0, 0.8, 0.85);
      grow(h, 1.1);
    }
  },

  // Wafer (gingerbread): plain cookie -> white icing cap -> candy-cane shoulder pads -> darker bake
  // and a gumdrop crown -> a chocolate-dipped cookie with sprinkles circling it.
  warlockWafer(h, lv) {
    const { head } = anchors(h);
    if (lv >= 1 && head) {
      const icing = mat(h, 0xfffaf0);
      const w = head.max.x - head.min.x + 0.1;
      part(h.head, boxGeo(w, 0.25, head.max.z - head.min.z + 0.1), icing, (head.min.x + head.max.x) / 2, head.max.y - 0.1, (head.min.z + head.max.z) / 2);
      for (const x of [-0.4, 0, 0.4]) part(h.head, boxGeo(0.2, 0.35, 0.1), icing, x, head.max.y - 0.35, head.max.z + 0.02);
    }
    if (lv >= 2) {
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.2, 0.5, 1.2), mat(h, 0xfafafa), 0, -0.05, 0);
        for (const y of [0.1, -0.2]) part(arm, boxGeo(1.24, 0.12, 1.24), mat(h, 0xe53935), 0, y, 0);
      }
    }
    if (lv === 3) paint(h, { 0xe8a46a: 0xc8783c });
    if (lv >= 4) paint(h, { 0xe8a46a: 0x6d3b1f });
    if (lv >= 3 && head) {
      const g = new THREE.Group();
      g.position.set((head.min.x + head.max.x) / 2, head.max.y + 0.15, (head.min.z + head.max.z) / 2);
      h.head.add(g);
      const gum = [0xe53935, 0x43a047, 0xfdd835, 0x8e24aa, 0x1e88e5];
      around(g, 5, 0.45, (i) => part(g, boxGeo(0.32, 0.38, 0.32), mat(h, gum[i]), 0, 0.12, 0));
    }
    if (lv >= 4) {
      orbit(h, 2.4, 2.3, 10, 0.18, [0xff4081, 0x40c4ff, 0xffeb3b, 0x69f0ae], 1.0);
      grow(h, 1.12);
    }
  },

  // Lure (ghost cat on a shrine): teal ghost -> glowing runes on the shrine -> a violet ghost ->
  // a crowned spirit with soul flames circling it.
  ghostbusterLure(h, lv) {
    const { box } = anchors(h);
    if (lv >= 2) {
      const rune = mat(h, lv >= 3 ? 0xd500f9 : 0x1de9b6, true);
      for (const [x, z] of [[0, 1.25], [0, -1.25], [1.25, 0], [-1.25, 0]]) part(h.root, boxGeo(x ? 0.06 : 0.5, 0.5, x ? 0.5 : 0.06), rune, x * 1.03, 1.0, z * 1.03);
    }
    if (lv >= 3) paint(h, { 0xa7ffeb: 0xd1c4e9, 0x1de9b6: 0xb388ff, 0x64ffda: 0xb388ff, 0xb9f6ca: 0xe1bee7 });
    if (lv >= 4) {
      const c = new THREE.Group();
      c.position.set(0, box.max.y - 0.1, 0);
      h.body.add(c);
      const gold = mat(h, 0xffd54f, true);
      part(c, boxGeo(1.1, 0.25, 1.1), gold, 0, 0.12, 0);
      for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) part(c, boxGeo(0.18, 0.35, 0.18), gold, x, 0.4, z);
      orbit(h, 3.0, 2.3, 4, 0.45, [0xb388ff, 0x18ffff], 0.9, 0.8);
      grow(h, 1.1);
    }
  },

  // Sparks: pink outfit -> violet stage outfit -> a star hair clip and sparkles -> a gold idol
  // outfit with a halo of stars.
  soldierSparks(h, lv) {
    if (lv === 2 || lv === 3) paint(h, { 0xec407a: 0x7c4dff, 0x880e4f: 0x311b92, 0xc2185b: 0x651fff, 0xad1457: 0x4527a0 });
    if (lv >= 4) paint(h, { 0xec407a: 0xffc400, 0x880e4f: 0xc51162, 0xc2185b: 0xffab00, 0xad1457: 0xff6d00 });
    const { head, top } = anchors(h);
    if (lv >= 3 && head) {
      const star = mat(h, 0xffeb3b, true);
      const s = part(h.head, boxGeo(0.45, 0.45, 0.1), star, head.max.x - 0.1, head.max.y - 0.4, 0.3);
      s.rotation.z = Math.PI / 4;
      orbit(h, 3.0, 2.3, 6, 0.22, [0xffeb3b, 0xff80ab, 0x80d8ff], 1.2);
    }
    if (lv >= 4) {
      halo(h, top + 0.4, 1.2, 5, 0xffeb3b, 0.32);
      grow(h, 1.1);
    }
  },

  // Soda (mouse grenadier): -> a bandolier of soda cans -> a red cap -> a crate of soda at her feet
  // and fizz bubbles floating around her.
  grenadierSoda(h, lv) {
    const cans = [0xe53935, 0x43a047, 0x1e88e5, 0xff9800, 0x8e24aa];
    if (lv >= 1) {
      const strap = new THREE.Group();
      strap.position.set(0, 0, 0.56);
      strap.rotation.z = 0.7;
      h.torso.add(strap);
      part(strap, boxGeo(0.3, 2.5, 0.08), mat(h, 0x5d4037), 0, 0, 0);
      for (let i = 0; i < 4; i++) part(strap, boxGeo(0.28, 0.4, 0.22), mat(h, cans[i]), 0, -0.9 + i * 0.6, 0.1);
    }
    const { head } = anchors(h);
    if (lv >= 2 && head) {
      const cap = mat(h, lv >= 4 ? 0xffc400 : 0xd32f2f);
      const cx = (head.min.x + head.max.x) / 2;
      part(h.head, boxGeo(1.3, 0.35, 1.3), cap, cx, head.max.y - 0.35, 0);
      part(h.head, boxGeo(1.0, 0.1, 0.6), cap, cx, head.max.y - 0.5, 0.85);
    }
    if (lv >= 3) {
      const crate = new THREE.Group();
      crate.position.set(-1.9, 0, 1.0);
      crate.rotation.y = 0.4;
      h.root.add(crate);
      part(crate, boxGeo(1.3, 0.7, 1.0), mat(h, 0x8d6e63), 0, 0.35, 0);
      for (let i = 0; i < 6; i++) part(crate, boxGeo(0.3, 0.45, 0.3), mat(h, cans[i % 5]), -0.4 + (i % 3) * 0.4, 0.85, -0.2 + Math.floor(i / 3) * 0.4);
    }
    if (lv >= 4) {
      orbit(h, 2.0, 2.2, 9, 0.3, [0x80deea, 0xe0f7fa], 0.7, 0.6);
      grow(h, 1.1);
    }
  },

  // Frank (hotdog): mustard holster bottles at Lv 3+, and a ring of grill fire at max level.
  assassinFrank(h, lv) {
    if (lv >= 2) {
      for (const [x, c] of [[-0.9, 0xffd600], [0.9, 0xd50000]]) {
        part(h.root, boxGeo(0.35, 0.8, 0.35), mat(h, c), x * 1.6, 0.4, -1.2);
        part(h.root, boxGeo(0.14, 0.3, 0.14), mat(h, c), x * 1.6, 0.95, -1.2);
      }
    }
    if (lv >= 4) {
      groundRing(h, 2.5, 12, 0xff6d00, 0.7, 0.8, 0.85);
      orbit(h, 1.0, 2.4, 6, 0.3, [0xffab00, 0xff3d00], 1.4);
      grow(h, 1.1);
    }
  },

  // Keith (boomerang farmer): blue overalls -> green overalls -> a rack of boomerangs on his back ->
  // purple overalls with golden boomerangs circling him.
  boomerangKeith(h, lv) {
    if (lv === 2 || lv === 3) paint(h, { 0x1e88e5: 0x2e7d32 });
    if (lv >= 4) paint(h, { 0x1e88e5: 0x6a1b9a });
    const boomer = (parent, m, x, y, z, rz) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.z = rz;
      parent.add(g);
      const a = part(g, boxGeo(0.9, 0.22, 0.1), m, 0.35, 0, 0);
      a.rotation.z = 0.5;
      const b = part(g, boxGeo(0.9, 0.22, 0.1), m, -0.35, 0, 0);
      b.rotation.z = -0.5;
      return g;
    };
    if (lv >= 3) {
      const wood = mat(h, 0xa1887f);
      for (let i = 0; i < 3; i++) boomer(h.torso, wood, -0.4 + i * 0.4, 0.3 - i * 0.15, -0.62, 0.3 * (i - 1));
    }
    if (lv >= 4) {
      const g = drifter(h, h.root, 2.6, 2.0, 0.2);
      const gold = mat(h, 0xffc107, true);
      around(g, 3, 2.4, (i, a) => {
        const b = boomer(g, gold, 0, 0, 0, 0);
        b.rotation.set(Math.PI / 2, 0, a);
        return b;
      });
      grow(h, 1.1);
    }
  },

  // Bunny: white bunny -> a pink vest -> pastel egg shoulder pads -> a gold vest with painted eggs
  // circling her.
  rocketeerBunny(h, lv) {
    if (lv >= 2) {
      const vest = mat(h, lv >= 4 ? 0xffc400 : 0xf06292);
      part(h.torso, boxGeo(2.08, 1.5, 1.08), vest, 0, 0.2, 0);
      part(h.torso, boxGeo(0.12, 1.5, 0.05), mat(h, 0xfafafa), 0, 0.2, 0.56);
    }
    if (lv >= 3) shoulderPads(h, 0xb2ebf2, 0xf8bbd0, 1.2);
    if (lv >= 4) {
      const g = drifter(h, h.root, 2.8, 0.8, 0.3);
      const eggs = [0xf48fb1, 0x80deea, 0xfff59d, 0xce93d8, 0xa5d6a7];
      around(g, 5, 2.4, (i) => part(g, boxGeo(0.4, 0.55, 0.4), mat(h, eggs[i]), 0, 0, 0));
      grow(h, 1.1);
    }
  },

  // El Goblino: -> skull stakes beside him -> bear traps scattered around -> a dark bog with
  // glowing green mushrooms and will-o'-wisps.
  trapperGoblino(h, lv) {
    if (lv >= 1) {
      const wood = mat(h, 0x6d4c41);
      const bone = mat(h, 0xeeeeee);
      for (const [x, z] of [[-1.9, -1.3], [1.9, -1.3]]) {
        part(h.root, boxGeo(0.18, 1.8, 0.18), wood, x, 0.9, z);
        part(h.root, boxGeo(0.5, 0.45, 0.45), bone, x, 1.95, z);
      }
    }
    if (lv >= 3) {
      const steel = mat(h, 0x9e9e9e);
      for (const [x, z] of [[-1.6, 1.6], [1.7, 1.4], [0, 2.0]]) {
        const t = new THREE.Group();
        t.position.set(x, 0.05, z);
        h.root.add(t);
        part(t, boxGeo(0.9, 0.08, 0.9), steel, 0, 0, 0);
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) part(t, boxGeo(0.1, 0.2, 0.1), steel, -0.3 + i * 0.3, 0.12, s * 0.42);
      }
    }
    if (lv >= 4) {
      paint(h, { 0x5d4f3a: 0x2e2416 });
      const glow = [0x76ff03, 0x00e676];
      for (const [x, z, s] of [[-1.3, 1.9, 1], [1.4, -1.9, 0.8], [-2.0, 0.2, 0.7]]) {
        part(h.root, boxGeo(0.15 * s, 0.5 * s, 0.15 * s), mat(h, 0xf1f8e9), x, 0.3 * s, z);
        part(h.root, boxGeo(0.55 * s, 0.22 * s, 0.55 * s), mat(h, glow[0], true), x, 0.6 * s, z);
      }
      orbit(h, 2.6, 2.4, 3, 0.4, glow, 0.6, 0.75);
      grow(h, 1.08);
    }
  },

  // Chaos Jester: pink motley -> purple motley -> red and black motley with playing cards circling
  // him -> the jack-in-the-box stage (base model) in royal purple.
  jesterChaos(h, lv) {
    if (lv === 2) paint(h, { 0xec407a: 0x8e24aa });
    if (lv === 3) paint(h, { 0xec407a: 0xc62828, 0xf8bbd0: 0x424242 });
    if (lv >= 4) paint(h, { 0xec407a: 0x6a1b9a, 0xf8bbd0: 0xffd54f });
    if (lv >= 3) {
      const g = drifter(h, h.root, 3.6, 0.9, 0.25);
      const card = mat(h, 0xfafafa);
      const suit = [mat(h, 0xd50000), mat(h, 0x212121)];
      around(g, lv >= 4 ? 8 : 5, lv >= 4 ? 3.0 : 2.5, (i, a) => {
        const c = new THREE.Group();
        g.add(c);
        c.rotation.y = -a;
        part(c, boxGeo(0.06, 0.8, 0.56), card, 0, 0, 0);
        part(c, boxGeo(0.08, 0.22, 0.22), suit[i % 2], 0, 0, 0).rotation.x = Math.PI / 4;
        return c;
      });
    }
  },

  // Nuki Launcher: -> sandbag wall around the launcher -> orbiting leaves and a bigger crew at max.
  nukiLauncher(h, lv) {
    if (lv >= 2) {
      const bag = mat(h, 0xbcaaa4);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.9;
        const s = part(h.root, boxGeo(0.9, 0.45, 0.5), bag, Math.cos(a) * 2.6, 0.22 + (i % 2) * 0.02, Math.sin(a) * 2.6);
        s.rotation.y = -a + Math.PI / 2;
      }
    }
    if (lv >= 3) paint(h, { 0x455a64: 0x37474f, 0x263238: 0xffb300 });
    if (lv >= 4) {
      orbit(h, 3.4, 2.6, 6, 0.4, [0x43a047, 0x76ff03], 0.8);
      grow(h, 1.1);
    }
  },

  // Hayes (scarecrow): -> a patched purple vest -> a ghostly green fog ring and floating jack-o'-
  // lantern lights at max level.
  hayes(h, lv) {
    if (lv >= 3) paint(h, { 0xef6c00: 0x6a1b9a }, [], 2.5); // the vest, not the pumpkins
    if (lv >= 4) {
      groundRing(h, 3.7, 18, 0x76ff03, 0.3, 1.1, 0.7, 0.3);
      const g = drifter(h, h.root, 4.6, 0.5, 0.35);
      const pump = mat(h, 0xff9100, true);
      const eye = mat(h, 0x212121);
      around(g, 3, 2.8, () => {
        const p = new THREE.Group();
        g.add(p);
        part(p, boxGeo(0.6, 0.5, 0.6), pump, 0, 0, 0);
        part(p, boxGeo(0.12, 0.12, 0.1), eye, 0, 0.1, 0.3);
        return p;
      });
      grow(h, 1.08);
    }
  },
};

/** Wraps the hero tower makers in `models` so each level gets its look from TIERS. */
export function blitzUpgrades(models) {
  for (const [type, dress] of Object.entries(TIERS)) {
    const make = models[type];
    if (!make) continue;
    models[type] = (level) => {
      const h = make(level);
      dress(h, level);
      return h;
    };
  }
}
