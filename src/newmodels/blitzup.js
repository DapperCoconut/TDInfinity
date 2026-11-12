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
  // Wizard, Chef and Yasuke: their outfits per level are built in models/people21.js; only the
  // effects are added here.
  // Wizard: orbiting orbs from Lv 3, a rune halo over the hat and a bit bigger at max level.
  scoutWizard(h, lv) {
    if (lv >= 3) orbit(h, 3.6, 2.6, 3, 0.45, [0x80d8ff, 0xea80fc, 0xffeb3b], 1.1);
    if (lv >= 4) {
      const { top } = anchors(h);
      halo(h, top + 0.4, 1.3, 8, 0xe040fb, 0.25);
      grow(h, 1.1);
    }
  },

  // Chef: a ring of fire and orbiting embers at max level.
  enforcerChef(h, lv) {
    if (lv >= 4) {
      groundRing(h, 2.6, 12, 0xff6d00, 0.6, 0.8, 0.85);
      orbit(h, 0.9, 2.5, 6, 0.3, [0xffab00, 0xff3d00], 1.4);
      grow(h, 1.1);
    }
  },

  // Yasuke: a ring of embers at her feet from Lv 3, orbiting flames at max level.
  kniferYasuke(h, lv) {
    if (lv >= 3) groundRing(h, 2.3, 10, 0xff6d00, 0.8, 0.6, 0.8);
    if (lv >= 4) {
      orbit(h, 2.6, 2.4, 5, 0.32, [0xff9100, 0xffd600, 0xff3d00], 1.6);
      grow(h, 1.12);
    }
  },

  // Maitake, Scientist, Stella, Wafer and Sparks: their level looks are built into models/people22.js.

  // Keith: his overalls colours, back rack and golden boomerangs are in his model (people23.js);
  // here he only grows a bit at max level.
  boomerangKeith(h, lv) {
    if (lv >= 4) grow(h, 1.1);
  },

  // El Goblino and Hayes: their level looks are built into models/heroes3.js.

  // Chaos Jester: his level colours and circling cards are in his model (people23.js).

  // Nuki Launcher: orbiting leaves and a bigger crew at max (the sandbags and gold bands are in
  // its model, machines8.js).
  nukiLauncher(h, lv) {
    if (lv >= 4) {
      orbit(h, 3.4, 2.6, 6, 0.4, [0x43a047, 0x76ff03], 0.8);
      grow(h, 1.1);
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
