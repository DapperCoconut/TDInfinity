import * as THREE from 'three';

// Blocky humanoid proportions (in world units, ~5.2 tall):
// legs 1x2x1, torso 2x2x1, arms 1x2x1, head 1.2 cube. Characters face +Z.

const geoCache = new Map();
export function boxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  let g = geoCache.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(k, g);
  }
  return g;
}

export function part(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const faceCache = new Map();
function faceTexture(skin, style) {
  const key = `${skin}|${style}`;
  if (faceCache.has(key)) return faceCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(skin).getHexString();
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#111';
  switch (style) {
    case 'zombie':
      g.fillStyle = '#f4f4dc';
      g.fillRect(13, 20, 13, 11);
      g.fillRect(38, 22, 12, 9);
      g.fillStyle = '#c62828';
      g.fillRect(17, 23, 5, 5);
      g.fillRect(42, 24, 5, 4);
      g.fillStyle = '#2a1a1a';
      g.fillRect(17, 41, 30, 9);
      g.fillStyle = '#eee';
      g.fillRect(20, 41, 4, 4);
      g.fillRect(29, 41, 4, 3);
      g.fillRect(39, 41, 4, 4);
      break;
    case 'goblin':
      // Yellow eyes with slit pupils and a toothy grin.
      g.fillStyle = '#fff176';
      g.fillRect(12, 20, 14, 10);
      g.fillRect(38, 20, 14, 10);
      g.fillStyle = '#111';
      g.fillRect(18, 21, 3, 8);
      g.fillRect(44, 21, 3, 8);
      g.fillStyle = '#3e2723';
      g.fillRect(14, 40, 36, 10);
      g.fillStyle = '#fafafa';
      for (const x of [16, 24, 32, 40]) g.fillRect(x, 40, 5, 4);
      g.fillRect(20, 46, 4, 4);
      g.fillRect(38, 46, 4, 4);
      break;
    case 'agent':
      g.fillRect(9, 21, 46, 4);
      g.fillRect(11, 23, 18, 11);
      g.fillRect(35, 23, 18, 11);
      g.fillStyle = '#5a6a7a';
      g.fillRect(14, 25, 6, 3);
      g.fillRect(38, 25, 6, 3);
      g.fillStyle = '#111';
      g.fillRect(24, 46, 16, 3);
      break;
    case 'skull':
      // Skeleton: dark eye sockets, a nose hole and a row of teeth.
      g.fillStyle = '#1a1a1a';
      g.fillRect(12, 18, 15, 14);
      g.fillRect(37, 18, 15, 14);
      g.fillRect(29, 34, 6, 6);
      g.fillRect(16, 44, 32, 8);
      g.fillStyle = '#e8e4d0';
      for (const x of [18, 25, 32, 39]) g.fillRect(x, 45, 4, 6);
      break;
    case 'soldier':
      g.fillRect(18, 25, 7, 9);
      g.fillRect(39, 25, 7, 9);
      g.fillRect(15, 21, 12, 3);
      g.fillRect(37, 21, 12, 3);
      g.fillRect(22, 45, 20, 3);
      break;
    default: // classic smile
      g.fillRect(19, 21, 7, 11);
      g.fillRect(38, 21, 7, 11);
      g.lineWidth = 4;
      g.strokeStyle = '#111';
      g.beginPath();
      g.arc(32, 34, 13, 0.2 * Math.PI, 0.8 * Math.PI);
      g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  faceCache.set(key, t);
  return t;
}

/**
 * Builds a blocky humanoid. Limbs are pivot groups at shoulder/hip so rotating
 * `rotation.x` swings them. Returns handles to every part plus the list of
 * materials (for tinting, transparency and disposal).
 */
export function makeHumanoid({ skin = 0xf5cd30, shirt = 0x1e88e5, pants = 0x43a047, arms = null, face = 'smile' } = {}) {
  const mats = [];
  const M = (color, map = null) => {
    const m = new THREE.MeshLambertMaterial({ color, map });
    mats.push(m);
    return m;
  };
  const skinM = M(skin);
  const shirtM = M(shirt);
  const pantsM = M(pants);
  const armM = arms == null ? skinM : M(arms);
  const faceM = M(0xffffff, faceTexture(skin, face));

  const root = new THREE.Group();
  const body = new THREE.Group(); // pivot at the feet; used for bobbing / falling over
  root.add(body);

  const torso = part(body, boxGeo(2, 2, 1), shirtM, 0, 3, 0);
  const head = new THREE.Group();
  head.position.y = 4;
  body.add(head);
  // BoxGeometry face order: +x, -x, +y, -y, +z (front), -z
  part(head, boxGeo(1.2, 1.2, 1.2), [skinM, skinM, skinM, skinM, faceM, skinM], 0, 0.6, 0);

  const limb = (x, y, m) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    body.add(p);
    part(p, boxGeo(1, 2, 1), m, 0, -1, 0);
    return p;
  };
  // Facing +Z, the character's right side is -X.
  const rightArm = limb(-1.5, 4, armM);
  const leftArm = limb(1.5, 4, armM);
  const rightLeg = limb(-0.5, 2, pantsM);
  const leftLeg = limb(0.5, 2, pantsM);

  return { root, body, torso, head, rightArm, leftArm, rightLeg, leftLeg, mats, M };
}

export function setOpacity(h, opacity) {
  for (const m of h.mats) {
    m.transparent = opacity < 1;
    m.opacity = opacity;
    m.depthWrite = opacity >= 1;
  }
}

/** Tints every material (0 = back to normal: glowing parts keep their glow). */
export function setEmissive(h, hex) {
  for (const m of h.mats) m.emissive.setHex(hex || m.userData.glow || 0);
}

/** Scout tower model; the look changes with each upgrade level (0-4). */
export function makeScout(level) {
  const agent = level >= 4;
  const h = makeHumanoid(
    agent
      ? { skin: 0xe0ac69, shirt: 0x1c1c22, pants: 0x141418, arms: 0x1c1c22, face: 'agent' }
      : { skin: 0xe0ac69, shirt: level >= 2 ? 0x5a6b34 : 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' },
  );
  const { M } = h;
  const dark = M(0x2b2b2b);

  if (agent) {
    part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x1a1209), 0, 1.25, -0.02); // slick hair
    part(h.torso, boxGeo(0.6, 1.7, 0.05), M(0xffffff), 0, 0.15, 0.51); // white shirt
    part(h.torso, boxGeo(0.2, 1.4, 0.07), M(0x8b0000), 0, 0.1, 0.53); // tie
    part(h.head, boxGeo(0.12, 0.35, 0.12), dark, -0.66, 0.55, 0); // earpiece
  } else {
    const helmM = M(level >= 2 ? 0x3e4a2a : 0x556b2f);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helmM, 0, 1.3, 0);
    part(h.head, boxGeo(1.5, 0.12, 0.45), helmM, 0, 1.05, 0.62); // brim
    if (level >= 1) {
      // Visibility: a radio backpack with a tall antenna
      part(h.torso, boxGeo(1.3, 1.4, 0.6), M(0x4b5320), 0, 0.1, -0.8);
      part(h.torso, boxGeo(0.08, 1.8, 0.08), M(0x212121), 0.45, 1.6, -0.9);
    }
    if (level >= 1) {
      // Visibility: goggles strapped to the helmet
      part(h.head, boxGeo(1.1, 0.32, 0.2), M(0x263238), 0, 1.35, 0.78);
      part(h.head, boxGeo(0.35, 0.22, 0.05), M(0x4fc3f7), -0.27, 1.35, 0.89);
      part(h.head, boxGeo(0.35, 0.22, 0.05), M(0x4fc3f7), 0.27, 1.35, 0.89);
    }
    if (level >= 3) {
      // Highest Cal: armored vest + bigger pack
      part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x2f3326), 0, 0.05, 0);
      part(h.torso, boxGeo(1.6, 1.7, 0.7), M(0x4a3b24), 0, 0, -0.95);
    }
  }

  // Gun hangs off the right arm pivot pointing along the arm (-Y local).
  const gunLen = agent ? 1.2 : level >= 2 ? 1.9 : 1.1;
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.32, gunLen, 0.42), dark, 0, -gunLen / 2, 0);
  let muzzleY = -gunLen;
  if (agent) {
    part(gun, boxGeo(0.22, 0.8, 0.22), M(0x111111), 0, -gunLen - 0.4, 0); // silencer
    muzzleY -= 0.8;
  } else if (level >= 2) {
    part(gun, boxGeo(0.25, 0.4, 0.5), dark, 0, -0.55, -0.42); // magazine
    part(gun, boxGeo(0.25, 0.5, 0.35), M(0x5d4037), 0, 0.15, -0.05); // stock
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, muzzleY, 0);
  gun.add(muzzle);

  // Aiming pose: both arms forward, left arm angled in to support the gun.
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.muzzles = [muzzle];
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  h.tracer = agent ? 0xb3e5fc : 0xffe066;
  return h;
}

/** Handgun on an arm pivot, pointing along the arm. Optional laser sight. Returns its muzzle. */
function addHandgun(h, arm, { body = 0x2b2b2b, laser = false, trim = null } = {}) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.3, 1.0, 0.38), h.M(body), 0, -0.5, 0); // slide
  part(gun, boxGeo(0.26, 0.32, 0.6), h.M(0x1f1f1f), 0, -0.05, -0.32); // grip
  if (trim) part(gun, boxGeo(0.34, 0.12, 0.42), glow(h, trim), 0, -0.75, 0);
  if (laser) {
    part(gun, boxGeo(0.2, 0.35, 0.2), h.M(0x212121), 0, -0.7, 0.3);
    part(gun, boxGeo(0.08, 0.06, 0.08), glow(h, 0xff1744), 0, -0.9, 0.3);
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -1.0, 0);
  gun.add(muzzle);
  return muzzle;
}

/**
 * Classic Scout (alternate Scout form): a ranger with a handgun. Every level adds gear:
 * Lv 2 ammo belt, Lv 3 shades + laser sight, Lv 4 helmet + plate carrier, Lv 5 akimbo handguns
 * and a long coat. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeScoutClassic(level) {
  const akimbo = level >= 4;
  const geared = level >= 3;
  const shirt = akimbo ? 0x2a1f3d : geared ? 0x5d5040 : level >= 2 ? 0x6d4c41 : 0xc8a165; // Lv 3: leather jacket
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: akimbo ? 0x1c1726 : 0x5d4037, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);

  if (geared) {
    // Stronger Equipment: tactical helmet with purple goggles, plate carrier, knee pads, gloves
    const helm = M(akimbo ? 0x1c1726 : 0x4a4436);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helm, 0, 1.3, 0);
    part(h.head, boxGeo(1.2, 0.3, 0.2), M(0x212121), 0, 1.3, 0.76);
    part(h.head, boxGeo(0.36, 0.22, 0.05), shard, -0.27, 1.3, 0.87);
    part(h.head, boxGeo(0.36, 0.22, 0.05), shard, 0.27, 1.3, 0.87);
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(akimbo ? 0x14101c : 0x3b3a2c), 0, 0.1, 0);
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.45, 0.45, 0.2), M(0x2b2b2b), x, -0.3, 0.65);
    const pad = M(0x212121);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), pad, 0, -1.2, 0.45);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.45, 1.05), pad, 0, -1.75, 0);
    part(h.torso, boxGeo(0.35, 0.35, 0.08), shard, 0.55, 0.45, 0.6); // shard emblem on the vest
  } else {
    // Red ball cap with the shard emblem
    const cap = M(0xd84315);
    part(h.head, boxGeo(1.32, 0.45, 1.32), cap, 0, 1.3, 0);
    part(h.head, boxGeo(1.1, 0.12, 0.7), cap, 0, 1.1, 0.85);
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.67);
    part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  }
  if (level >= 1) {
    // Faster Reloading: belt full of spare magazines
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0);
    for (const x of [-0.7, -0.35, 0.35, 0.7]) part(h.torso, boxGeo(0.25, 0.45, 0.25), M(0x212121), x, -0.75, 0.6);
  }
  if (level >= 2) {
    // Precise Aiming: aviator shades
    part(h.head, boxGeo(1.25, 0.1, 0.08), M(0xd4af37), 0, 0.8, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), M(0x111111), -0.27, 0.66, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), M(0x111111), 0.27, 0.66, 0.63);
  }
  if (akimbo) {
    // Akimbo Handguns: long dark coat tails and a red scarf
    part(h.torso, boxGeo(2.05, 1.6, 0.2), M(0x2a1f3d), 0, -1.5, -0.45);
    part(h.torso, boxGeo(1.7, 0.4, 1.2), M(0xc62828), 0, 0.85, 0.05);
    part(h.torso, boxGeo(0.4, 0.9, 0.1), M(0xc62828), -0.5, 0.3, 0.56);
  }

  const gunOpts = { laser: level >= 2, trim: akimbo ? 0xb388ff : null, body: akimbo ? 0x37474f : 0x2b2b2b };
  const muzzles = [addHandgun(h, h.rightArm, gunOpts)];
  if (akimbo) {
    muzzles.push(addHandgun(h, h.leftArm, gunOpts));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    // One-handed, the left hand steadying the wrist
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  }
  h.muzzles = muzzles;
  h.tracer = akimbo ? 0xb388ff : 0xffe066;
  return h;
}

/** Small pistol on an arm pivot, pointing along the arm. Returns its muzzle. */
function addPistol(h, arm, gold) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.28, 0.9, 0.36), h.M(gold ? 0xc9a227 : 0x2b2b2b), 0, -0.45, 0);
  part(gun, boxGeo(0.24, 0.3, 0.55), h.M(0x1f1f1f), 0, -0.05, -0.3); // grip
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -0.9, 0);
  gun.add(muzzle);
  return muzzle;
}

/** Tweeter tower model: pistol + blue bird. Look changes per level (0-4). */
export function makeTweeter(level) {
  const chit = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: chit ? 0xe3f2fd : 0x29b6f6, pants: 0x37474f, arms: chit ? 0xe3f2fd : 0x29b6f6 });
  const { M } = h;

  // Blue bird perched on the left shoulder (right hand holds the pistol).
  const bird = new THREE.Group();
  bird.position.set(1.5, 4.25, 0);
  h.body.add(bird);
  const blue = M(0x1e88e5);
  part(bird, boxGeo(0.5, 0.45, 0.7), blue, 0, 0, 0);
  part(bird, boxGeo(0.4, 0.4, 0.4), blue, 0, 0.35, 0.25);
  part(bird, boxGeo(0.14, 0.12, 0.25), M(0xffa000), 0, 0.33, 0.55); // beak
  part(bird, boxGeo(0.08, 0.1, 0.05), M(0x111111), 0.15, 0.42, 0.44); // eyes
  part(bird, boxGeo(0.08, 0.1, 0.05), M(0x111111), -0.15, 0.42, 0.44);
  part(bird, boxGeo(0.62, 0.25, 0.45), M(0x1565c0), 0, 0.02, -0.05); // wings
  part(bird, boxGeo(0.3, 0.1, 0.35), M(0x1565c0), 0, 0.05, -0.5); // tail
  h.bird = bird;

  if (level >= 1) {
    // Hater Shades: white lenses in a gold frame
    const gold = M(0xd4af37);
    part(h.head, boxGeo(1.25, 0.1, 0.08), gold, 0, 0.82, 0.63);
    part(h.head, boxGeo(0.45, 0.32, 0.06), gold, -0.28, 0.66, 0.62);
    part(h.head, boxGeo(0.45, 0.32, 0.06), gold, 0.28, 0.66, 0.62);
    part(h.head, boxGeo(0.37, 0.24, 0.07), M(0xfafafa), -0.28, 0.66, 0.63);
    part(h.head, boxGeo(0.37, 0.24, 0.07), M(0xfafafa), 0.28, 0.66, 0.63);
    // ...and a chunky gold chain
    part(h.torso, boxGeo(1.4, 0.18, 1.15), gold, 0, 0.9, 0);
    part(h.torso, boxGeo(0.4, 0.45, 0.1), gold, 0, 0.45, 0.56);
  }
  if (level >= 2) {
    // Stonk: top hat
    const black = M(0x161616);
    part(h.head, boxGeo(1.7, 0.1, 1.7), black, 0, 1.25, 0);
    part(h.head, boxGeo(1.1, 1.0, 1.1), black, 0, 1.8, 0);
    part(h.head, boxGeo(1.12, 0.18, 1.12), M(0x2e7d32), 0, 1.38, 0); // money-green band
  }

  const muzzles = [addPistol(h, h.rightArm, chit)];
  let pose;
  if (level >= 3) {
    // Dual Wield: second pistol in the left hand, both arms forward
    muzzles.push(addPistol(h, h.leftArm, chit));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    // One pistol; the left hand is free (and holds a phone at Stonk)
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.9, 0, -0.25);
    pose = { right: -Math.PI / 2, left: -0.9, leftRecoil: 0 };
    if (level >= 2) {
      part(h.leftArm, boxGeo(0.12, 0.85, 0.5), M(0x212121), 0, -2.15, 0.45);
      part(h.leftArm, boxGeo(0.05, 0.7, 0.4), M(0x66ff99), -0.07, -2.15, 0.45); // screen: stonks
    }
  }

  if (chit) {
    // ChitChat: white wings on the back, standing on a cloud
    const wing = M(0xffffff);
    const lw = part(h.torso, boxGeo(0.2, 1.6, 1.6), wing, 0.6, 0.3, -1.1);
    const rw = part(h.torso, boxGeo(0.2, 1.6, 1.6), wing, -0.6, 0.3, -1.1);
    lw.rotation.set(0.2, 0.5, 0.3);
    rw.rotation.set(0.2, -0.5, -0.3);
    const cloud = M(0xf5f5f5);
    part(h.root, boxGeo(3.0, 0.7, 2.2), cloud, 0, 0.35, 0);
    part(h.root, boxGeo(1.6, 0.6, 1.6), cloud, -1.1, 0.55, 0.3);
    part(h.root, boxGeo(1.6, 0.6, 1.6), cloud, 1.1, 0.5, -0.3);
    h.lift = 0.7;
    h.body.position.y = h.lift;
  }

  h.muzzles = muzzles;
  h.pose = pose;
  h.tracer = chit ? 0x4fc3f7 : 0xffd54f;
  return h;
}

/** Glowing (emissive) material for sci-fi parts. */
function glow(h, color) {
  const m = h.M(color);
  m.userData.glow = color;
  m.emissive.setHex(color);
  m.emissiveIntensity = 0.8;
  return m;
}

/** Two-handed long gun on the right arm, with the standard aiming pose. Returns the gun group. */
function holdLongGun(h, len, mat) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.32, len, 0.42), mat, 0, -len / 2, 0);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -len, 0);
  gun.add(muzzle);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.muzzles = [muzzle];
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  return gun;
}

/** Soldier tower: assault rifle, bursts. Look changes per level (0-4). */
export function makeSoldier(level) {
  const sup = level >= 4;
  const h = makeHumanoid(
    sup
      ? { skin: 0xc68642, shirt: 0x1a237e, pants: 0x0d1440, arms: 0x283593, face: 'soldier' }
      : { skin: 0xc68642, shirt: 0x7a6a45, pants: 0x4e4630, arms: 0x7a6a45, face: 'soldier' },
  );
  const { M } = h;
  const dark = M(0x262626);

  if (sup) {
    // Super Soldier: armored suit with a glowing chest core and visor helmet
    const armor = M(0x3949ab);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), armor, 0, 0.05, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.1), glow(h, 0x00e5ff), 0, 0.3, 0.62);
    part(h.head, boxGeo(1.4, 1.35, 1.4), armor, 0, 0.62, -0.03);
    part(h.head, boxGeo(1.2, 0.35, 0.08), glow(h, 0x00e5ff), 0, 0.7, 0.68);
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, -1.4, 1.0, 0); // shoulder pads
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, 1.4, 1.0, 0);
  } else {
    // Buzz cut
    part(h.head, boxGeo(1.25, 0.2, 1.25), M(0x2b1d0e), 0, 1.25, 0);
    if (level >= 1) {
      // Shades: black sunglasses and chest webbing
      part(h.head, boxGeo(1.25, 0.32, 0.08), M(0x0a0a0a), 0, 0.68, 0.63);
      const web = M(0x3e2723);
      for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 2.5, 1.12), web, 0, 0, 0).rotation.z = side * 0.6;
    }
    if (level >= 2) {
      // Radio: headset band, ear cups and mic
      const band = M(0x333333);
      part(h.head, boxGeo(1.35, 0.15, 0.25), band, 0, 1.38, 0);
      part(h.head, boxGeo(0.15, 0.5, 0.45), band, -0.68, 0.65, 0);
      part(h.head, boxGeo(0.15, 0.5, 0.45), band, 0.68, 0.65, 0);
      part(h.head, boxGeo(0.08, 0.08, 0.55), band, -0.68, 0.4, 0.35);
      part(h.torso, boxGeo(1.4, 1.5, 0.65), M(0x4b5320), 0, 0, -0.85); // radio pack
      part(h.torso, boxGeo(0.08, 2.0, 0.08), band, -0.45, 1.6, -0.95); // antenna
    }
    if (level >= 3) {
      // Severe Training: tactical vest, red headband, ammo pouches
      part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x3b3f2a), 0, 0.05, 0);
      part(h.torso, boxGeo(0.45, 0.4, 0.2), M(0x5d4037), -0.5, -0.35, 0.65);
      part(h.torso, boxGeo(0.45, 0.4, 0.2), M(0x5d4037), 0.5, -0.35, 0.65);
      part(h.head, boxGeo(1.28, 0.18, 1.28), M(0xc62828), 0, 1.05, 0);
    }
  }

  const gun = holdLongGun(h, sup ? 1.7 : 1.6, sup ? M(0xeceff1) : dark);
  if (sup) {
    // Laser gun: glowing barrel rails and emitter
    part(gun, boxGeo(0.12, 1.4, 0.12), glow(h, 0x00e5ff), 0.18, -0.85, 0.12);
    part(gun, boxGeo(0.12, 1.4, 0.12), glow(h, 0x00e5ff), -0.18, -0.85, 0.12);
    part(gun, boxGeo(0.4, 0.2, 0.5), glow(h, 0x00e5ff), 0, -1.7, 0);
    h.tracer = 0x00e5ff;
  } else {
    part(gun, boxGeo(0.25, 0.45, 0.55), dark, 0, -0.55, -0.42); // curved mag
    part(gun, boxGeo(0.25, 0.5, 0.35), M(0x4e342e), 0, 0.15, -0.05); // stock
    part(gun, boxGeo(0.2, 0.35, 0.2), dark, 0, -0.9, 0.3); // sight
    h.tracer = 0xffc107;
  }
  return h;
}

/** Marksman tower: long-range rifle. Look changes per level (0-4). */
export function makeMarksman(level) {
  const cyber = level >= 4;
  const h = makeHumanoid(
    cyber
      ? { skin: 0x8d5524, shirt: 0x212121, pants: 0x151515, arms: 0x2c2c2c, face: 'soldier' }
      : { skin: 0x8d5524, shirt: 0x8d7b55, pants: 0x5a4d35, arms: 0x8d7b55, face: 'soldier' },
  );
  const { M } = h;

  if (cyber) {
    // Cyber Hunter: bounty-hunter helmet with a red T-visor, armor, cape
    const steel = M(0x546e7a);
    part(h.head, boxGeo(1.45, 1.45, 1.45), steel, 0, 0.62, 0);
    part(h.head, boxGeo(1.1, 0.22, 0.08), glow(h, 0xff1744), 0, 0.82, 0.74);
    part(h.head, boxGeo(0.22, 0.6, 0.08), glow(h, 0xff1744), 0, 0.5, 0.74);
    part(h.torso, boxGeo(2.2, 1.6, 1.2), steel, 0, 0.15, 0);
    part(h.torso, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff1744), 0.55, 0.5, 0.62);
    part(h.torso, boxGeo(2.0, 2.4, 0.12), M(0x4a1010), 0, -0.4, -0.62); // cape
  } else {
    // Boonie hat
    const hat = M(0x6b5d3f);
    part(h.head, boxGeo(1.9, 0.12, 1.9), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.4, 1.3), hat, 0, 1.45, 0);
    if (level >= 1) {
      // Specs: round glasses
      const frame = M(0x3e2723);
      part(h.head, boxGeo(0.4, 0.34, 0.06), frame, -0.28, 0.66, 0.62);
      part(h.head, boxGeo(0.4, 0.34, 0.06), frame, 0.28, 0.66, 0.62);
      part(h.head, boxGeo(0.3, 0.24, 0.07), M(0xb3e5fc), -0.28, 0.66, 0.63);
      part(h.head, boxGeo(0.3, 0.24, 0.07), M(0xb3e5fc), 0.28, 0.66, 0.63);
      // ...and a spotter pack with a rangefinder
      part(h.torso, boxGeo(1.3, 1.5, 0.6), M(0x6b5d3f), 0, 0, -0.8);
      part(h.torso, boxGeo(0.5, 0.35, 0.7), M(0x263238), 0.4, 1.0, -0.8);
    }
    if (level >= 2) {
      // Headshot Practice: ghillie shawl and bandolier
      part(h.torso, boxGeo(2.3, 0.8, 1.3), M(0x556b2f), 0, 0.7, 0);
      const strap = part(h.torso, boxGeo(0.25, 2.4, 1.12), M(0x4e342e), 0, 0, 0);
      strap.rotation.z = 0.7;
    }
  }

  const len = cyber ? 2.6 : level >= 3 ? 2.8 : 2.4;
  const gun = holdLongGun(h, len, cyber ? M(0x37474f) : level >= 3 ? M(0x212121) : M(0x5d4037));
  const dark = M(0x1a1a1a);
  if (cyber) {
    // Pulse rifle: glowing coils along the barrel
    for (let i = 0; i < 3; i++) part(gun, boxGeo(0.45, 0.15, 0.55), glow(h, 0xff1744), 0, -0.9 - i * 0.5, 0);
    part(gun, boxGeo(0.25, 0.7, 0.3), dark, 0, -0.9, 0.35); // scope
    h.tracer = 0xff1744;
  } else {
    part(gun, boxGeo(0.22, 0.9, 0.3), dark, 0, -0.8, 0.35); // scope
    part(gun, boxGeo(0.14, 0.6, 0.14), dark, 0, -len - 0.3, 0); // barrel tip
    h.muzzles[0].position.y = -len - 0.6;
    if (level >= 3) {
      // The Right Tools: bigger scope, bipod, suppressor
      part(gun, boxGeo(0.3, 0.3, 0.35), dark, 0, -0.35, 0.38);
      part(gun, boxGeo(0.3, 0.3, 0.35), dark, 0, -1.25, 0.38);
      part(gun, boxGeo(0.08, 0.08, 0.7), dark, 0.15, -len + 0.4, -0.45);
      part(gun, boxGeo(0.08, 0.08, 0.7), dark, -0.15, -len + 0.4, -0.45);
    }
    h.tracer = 0xffffff;
  }
  return h;
}

/** Minigun on an arm pivot: body + spinning barrel cluster. Returns { muzzle, barrels }. */
function addMinigun(h, arm, bodyMat, barrelMat) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.6, 1.0, 0.65), bodyMat, 0, -0.45, 0);
  part(gun, boxGeo(0.3, 0.45, 0.7), h.M(0x3a3a3a), 0, -0.2, -0.55); // ammo feed
  const barrels = new THREE.Group();
  barrels.position.set(0, -1.0, 0);
  gun.add(barrels);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(barrels, boxGeo(0.12, 1.5, 0.12), barrelMat, Math.cos(a) * 0.2, -0.75, Math.sin(a) * 0.2);
  }
  part(barrels, boxGeo(0.5, 0.1, 0.5), bodyMat, 0, -1.3, 0); // barrel clamp
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -2.5, 0);
  gun.add(muzzle);
  return { muzzle, barrels };
}

/** Commando tower: minigun (two at Lv 4). Look changes per level (0-4). */
export function makeCommando(level) {
  const laser = level >= 4;
  const h = makeHumanoid(
    laser
      ? { skin: 0xa0522d, shirt: 0x1b1b1b, pants: 0x111111, arms: 0xa0522d, face: 'soldier' }
      : { skin: 0xa0522d, shirt: 0x556b2f, pants: 0x3e3a2a, arms: 0xa0522d, face: 'soldier' },
  );
  const { M } = h;
  // Muscle tank top with a bandolier, red bandana
  const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
  strap.rotation.z = -0.7;
  part(h.head, boxGeo(1.28, 0.25, 1.28), M(laser ? 0xff1744 : 0xc62828), 0, 1.05, 0);
  part(h.head, boxGeo(0.3, 0.6, 0.15), M(laser ? 0xff1744 : 0xc62828), 0.3, 0.75, -0.66); // bandana tails
  if (level >= 1) {
    // Handling: fingerless gloves + knee pads
    const glove = M(0x212121);
    part(h.rightArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.leftArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.rightLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
    part(h.leftLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
  }
  if (level >= 2) {
    // Goggles: tactical night-vision goggles
    part(h.head, boxGeo(1.3, 0.12, 1.3), M(0x263238), 0, 0.72, 0);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x263238), -0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x263238), 0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, laser ? 0xff1744 : 0x76ff03), -0.28, 0.7, 0.9);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, laser ? 0xff1744 : 0x76ff03), 0.28, 0.7, 0.9);
    part(h.torso, boxGeo(1.6, 1.8, 0.8), M(0x3a3a3a), 0, 0, -0.9); // ammo backpack
    part(h.torso, boxGeo(0.3, 0.3, 1.2), M(0xc9a227), -0.85, -0.6, -0.4); // feed belt
  }
  if (laser) {
    // Laser Wield: armored chest plate with a glowing core
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x2b2b2b), 0, 0.1, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.1), glow(h, 0xff1744), 0, 0.3, 0.6);
  }

  const bodyMat = M(laser ? 0x37474f : 0x424242);
  const barrelMat = laser ? glow(h, 0xff1744) : M(0x1f1f1f);
  const right = addMinigun(h, h.rightArm, bodyMat, barrelMat);
  h.muzzles = [right.muzzle];
  h.spin = [right.barrels];
  if (level >= 3) {
    const left = addMinigun(h, h.leftArm, bodyMat, barrelMat);
    h.muzzles.push(left.muzzle);
    h.spin.push(left.barrels);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.12);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.12);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.15 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.55);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.1 };
  }
  h.recoilScale = 0.25; // miniguns barely kick
  h.tracer = laser ? 0xff1744 : 0xffd740;
  return h;
}

/** The Aviator's plane (faces +Z). Its `bank` child is rolled by the view while turning. */
function makePlane(h, level) {
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

  if (level <= 2) {
    // Propeller plane (red, or spy grey at Lv 3)
    const spy = level >= 2;
    const body = M(spy ? 0x78909c : 0xd32f2f);
    const trim = M(spy ? 0x37474f : 0xfafafa);
    part(bank, boxGeo(1.2, 1.2, 5), body, 0, 0, 0);
    part(bank, boxGeo(7, 0.2, 1.5), body, 0, -0.2, 0.4); // wings
    part(bank, boxGeo(7.05, 0.22, 0.4), trim, 0, -0.2, 0.2); // wing stripe
    part(bank, boxGeo(2.6, 0.15, 0.9), body, 0, 0.1, -2.2); // tail wings
    part(bank, boxGeo(0.15, 1.1, 1.0), body, 0, 0.7, -2.2); // tail fin
    part(bank, boxGeo(0.9, 0.5, 1.1), M(0x90caf9), 0, 0.75, 0.6); // cockpit glass
    part(bank, boxGeo(0.7, 0.7, 0.4), trim, 0, 0, 2.6); // nose cone
    prop = new THREE.Group();
    prop.position.set(0, 0, 2.85);
    bank.add(prop);
    part(prop, boxGeo(0.3, 2.6, 0.1), M(0x3e2723), 0, 0, 0);
    if (level >= 1) {
      // Bombs Away: bombs under the wings
      const bombM = M(0x263238);
      part(bank, boxGeo(0.4, 0.4, 1.0), bombM, -2, -0.6, 0.4);
      part(bank, boxGeo(0.4, 0.4, 1.0), bombM, 2, -0.6, 0.4);
    }
    if (spy) {
      // Spy Plane: camera pod and radar dish
      part(bank, boxGeo(0.6, 0.5, 0.6), M(0x212121), 0, -0.8, 1.3);
      part(bank, boxGeo(0.35, 0.3, 0.1), glow(h, 0x00e5ff), 0, -0.85, 1.62);
      part(bank, boxGeo(1.6, 0.12, 1.6), M(0xeceff1), 0, 1.15, -0.6);
    }
    muzzle(-0.9, -0.2, 1.2);
    muzzle(0.9, -0.2, 1.2);
  } else if (level === 3) {
    // Rapid Fire: grey fighter jet with swept wings and an afterburner
    const body = M(0x90a4ae);
    const dark = M(0x455a64);
    part(bank, boxGeo(1.1, 1.0, 6), body, 0, 0, 0);
    part(bank, boxGeo(0.6, 0.6, 1.2), dark, 0, -0.05, 3.5); // nose
    part(bank, boxGeo(0.8, 0.5, 1.4), M(0x4fc3f7), 0, 0.6, 1.3); // canopy
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(3.4, 0.15, 2.0), body, side * 2.0, -0.1, -0.4);
      w.rotation.y = side * 0.45;
      const fin = part(bank, boxGeo(0.12, 1.2, 1.1), dark, side * 0.5, 0.8, -2.5);
      fin.rotation.z = side * -0.3;
      part(bank, boxGeo(1.4, 0.12, 0.8), body, side * 1.0, 0, -2.7); // tail wing
    }
    part(bank, boxGeo(0.8, 0.8, 0.3), glow(h, 0xff9100), 0, 0, -3.1); // afterburner
    muzzle(-0.6, -0.2, 2.6);
    muzzle(0.6, -0.2, 2.6);
  } else {
    // Space Craft: black stealth gunship (flying wing) with glowing trim and missile pods
    const black = M(0x1c1c24);
    const trim = glow(h, 0xb388ff);
    part(bank, boxGeo(2.2, 0.8, 5), black, 0, 0, 0);
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(4.4, 0.3, 3.0), black, side * 2.6, -0.1, -0.7);
      w.rotation.y = side * 0.55;
      const edge = part(bank, boxGeo(4.4, 0.1, 0.15), trim, side * 2.95, 0, 0.6);
      edge.rotation.y = side * 0.55;
      part(bank, boxGeo(0.5, 0.5, 1.6), M(0x37474f), side * 2.2, -0.55, 0.2); // missile pod
      part(bank, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff3d00), side * 2.2, -0.55, 1.02);
      muzzle(side * 2.2, -0.55, 1.1, missiles);
    }
    part(bank, boxGeo(1.4, 0.35, 1.5), glow(h, 0x7c4dff), 0, 0.5, 1.2); // canopy
    part(bank, boxGeo(1.6, 0.4, 0.2), trim, 0, 0, -2.55); // engine glow
    muzzle(-0.7, -0.3, 2.5);
    muzzle(0.7, -0.3, 2.5);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles };
  return { plane, muzzles };
}

/** Aviator tower: a pilot on the runway pad, plus a plane the view flies in circles. */
export function makeAviator(level) {
  const jet = level >= 3;
  const space = level >= 4;
  const h = makeHumanoid(
    space
      ? { skin: 0xf1c27d, shirt: 0x1c1c24, pants: 0x1c1c24, arms: 0x1c1c24 }
      : jet
        ? { skin: 0xf1c27d, shirt: 0x5b6b3a, pants: 0x4b5a30, arms: 0x5b6b3a }
        : { skin: 0xf1c27d, shirt: 0x6d4c41, pants: 0x5d4e37, arms: 0x6d4c41 },
  );
  const { M } = h;
  if (jet) {
    // Flight helmet with a visor
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(space ? 0x263238 : 0xeceff1), 0, 0.65, -0.03);
    part(h.head, boxGeo(1.2, 0.45, 0.08), space ? glow(h, 0xb388ff) : M(0xffb300), 0, 0.7, 0.7);
  } else {
    // Leather aviator cap with goggles, white scarf
    const cap = M(0x5d4037);
    part(h.head, boxGeo(1.35, 0.6, 1.35), cap, 0, 1.0, -0.02);
    part(h.head, boxGeo(0.3, 0.6, 0.6), cap, -0.66, 0.5, 0);
    part(h.head, boxGeo(0.3, 0.6, 0.6), cap, 0.66, 0.5, 0);
    part(h.head, boxGeo(1.3, 0.12, 0.1), M(0x3e2723), 0, 1.05, 0.66);
    part(h.head, boxGeo(0.4, 0.3, 0.08), M(0x80deea), -0.28, 1.05, 0.7);
    part(h.head, boxGeo(0.4, 0.3, 0.08), M(0x80deea), 0.28, 1.05, 0.7);
    part(h.torso, boxGeo(1.6, 0.4, 1.2), M(0xfafafa), 0, 0.85, 0.05); // scarf
    part(h.torso, boxGeo(0.4, 1.0, 0.1), M(0xfafafa), 0.5, 0.2, 0.55);
  }
  if (level >= 1) {
    // Bombs Away: a cart of spare bombs on the runway
    part(h.root, boxGeo(1.6, 0.5, 1.0), M(0x5d4037), 1.9, 0.25, 0.8);
    for (const z of [0.55, 1.05]) part(h.root, boxGeo(1.2, 0.45, 0.45), M(0x263238), 1.9, 0.7, z);
  }
  if (level >= 2) {
    // Spy Plane: radio headset (antenna)
    part(h.head, boxGeo(0.08, 0.9, 0.08), M(0x212121), -0.7, 1.6, -0.2);
  }
  // Waving the plane in: right arm raised high, left at the side.
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makePlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 14;
  h.tracer = space ? 0xb388ff : 0xffe082;
  return h;
}

/** Phaser tower: sci-fi trooper with a beam gun. Look changes per level (0-4). */
export function makePhaser(level) {
  const ray = level >= 3;
  const anni = level >= 4;
  const beam = anni ? 0xd500f9 : ray ? 0xff1744 : 0x40c4ff;
  const h = makeHumanoid(
    anni
      ? { skin: 0xe0ac69, shirt: 0x4a148c, pants: 0x311b92, arms: 0x4a148c, face: 'soldier' }
      : ray
        ? { skin: 0xe0ac69, shirt: 0x212121, pants: 0x1a1a1a, arms: 0x212121, face: 'soldier' }
        : { skin: 0xe0ac69, shirt: 0xeceff1, pants: 0x90a4ae, arms: 0xeceff1, face: 'soldier' },
  );
  const { M } = h;
  const armor = M(anni ? 0xffc400 : ray ? 0x424242 : 0xb0bec5);
  // Visor helmet
  part(h.head, boxGeo(1.4, 1.35, 1.4), armor, 0, 0.65, -0.03);
  part(h.head, boxGeo(1.2, 0.35, 0.08), glow(h, beam), 0, 0.72, 0.68);
  if (level >= 1) {
    // Handling: shoulder pads
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, -1.4, 1.0, 0);
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, 1.4, 1.0, 0);
  }
  if (level >= 2) {
    // Extra Juice: power pack with glowing cells
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x37474f), 0, 0, -0.85);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.3, 1.2, 0.1), glow(h, beam), -0.45 + i * 0.45, 0, -1.22);
  }
  if (ray) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), armor, 0, 0.05, 0);
    part(h.torso, boxGeo(0.55, 0.55, 0.1), glow(h, beam), 0, 0.3, 0.62);
  }
  if (anni) {
    // Annihilation: crown-like crest on the helmet
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.2, 0.6, 0.2), M(0xffc400), x, 1.55, 0);
  }

  const len = anni ? 2.4 : ray ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, M(anni ? 0x311b92 : ray ? 0x263238 : 0xeceff1));
  part(gun, boxGeo(0.5, 0.7, 0.55), M(0x546e7a), 0, -0.3, 0); // receiver
  const rings = anni ? 4 : 2;
  for (let i = 0; i < rings; i++) part(gun, boxGeo(0.55, 0.12, 0.6), glow(h, beam), 0, -0.9 - i * 0.35, 0);
  part(gun, boxGeo(0.45, 0.25, 0.5), glow(h, beam), 0, -len, 0); // emitter
  if (level >= 1) part(gun, boxGeo(0.22, 0.6, 0.3), M(0x212121), 0, -0.8, 0.35); // scope
  h.muzzles[0].position.y = -len - 0.15;
  h.beam = beam;
  h.tracer = beam;
  return h;
}

/** Railgunner tower: rail rifle, then a mounted Sentry, then a heavy cannon (levels 0-4). */
export function makeRailgunner(level) {
  const sentry = level >= 3;
  const ngw = level >= 4;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x37474f, pants: 0x263238, arms: 0x37474f, face: 'soldier' });
  const { M } = h;
  const coil = 0x29b6f6;
  // Cap with a glowing targeting monocle
  part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x263238), 0, 1.2, 0);
  part(h.head, boxGeo(1.4, 0.1, 0.5), M(0x263238), 0, 1.05, 0.6);
  part(h.head, boxGeo(0.35, 0.3, 0.1), glow(h, coil), -0.28, 0.7, 0.62);
  if (level >= 1) {
    // Faster Reloading: battery pouches on a belt
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.4, 0.45, 0.25), M(0x455a64), x, -0.75, 0.6);
  }
  if (level >= 2) {
    // Extra Juice: capacitor backpack
    part(h.torso, boxGeo(1.5, 1.8, 0.7), M(0x263238), 0, 0, -0.85);
    part(h.torso, boxGeo(0.35, 1.4, 0.1), glow(h, coil), 0, 0, -1.22);
  }

  if (!sentry) {
    const len = 3.0;
    const gun = holdLongGun(h, len, M(0x263238));
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.45, 0.1, 0.55), glow(h, coil), 0, -0.8 - i * 0.5, 0);
    part(gun, boxGeo(0.22, 0.8, 0.3), M(0x111111), 0, -0.7, 0.35); // scope
    if (level >= 2) part(gun, boxGeo(0.5, 0.7, 0.5), M(0x455a64), 0, -0.2, -0.3); // power cell
    h.muzzles[0].position.y = -len - 0.1;
    h.tracer = coil;
    h.tracerWidth = 0.35;
    return h;
  }

  // Sentry / Next Generation Warfare: a mounted gun on the root (turns with the tower).
  const mount = new THREE.Group();
  h.root.add(mount);
  const steel = M(ngw ? 0x37474f : 0x546e7a);
  const barrelLen = ngw ? 7 : 5;
  const bw = ngw ? 1.2 : 0.6;
  const gy = ngw ? 3.0 : 2.7;
  const gz = ngw ? 1.8 : 1.2;
  if (ngw) {
    part(mount, boxGeo(3.4, 1.6, 3.4), steel, 0, 0.8, gz); // heavy base
    part(mount, boxGeo(2.4, 1.2, 2.6), M(0x263238), 0, 2.2, gz);
  } else {
    part(mount, boxGeo(0.4, 2.2, 0.4), steel, 0, 1.1, gz); // tripod post
    for (const a of [0, 2.1, 4.2]) {
      const leg = part(mount, boxGeo(0.25, 1.6, 0.25), steel, Math.sin(a) * 0.6, 0.6, gz + Math.cos(a) * 0.6);
      leg.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    }
  }
  part(mount, boxGeo(bw + 0.5, bw + 0.4, 1.6), steel, 0, gy, gz); // breech
  part(mount, boxGeo(bw, bw, barrelLen), M(0x212121), 0, gy, gz + barrelLen / 2 + 0.5);
  const coils = ngw ? 6 : 4;
  for (let i = 0; i < coils; i++) part(mount, boxGeo(bw + 0.25, bw + 0.25, 0.25), glow(h, coil), 0, gy, gz + 1.3 + i * ((barrelLen - 1) / coils));
  if (ngw) {
    part(mount, boxGeo(0.5, 0.5, 4), M(0x212121), bw * 0.7, gy + 0.6, gz + 2.5); // side rails
    part(mount, boxGeo(0.5, 0.5, 4), M(0x212121), -bw * 0.7, gy + 0.6, gz + 2.5);
  } else {
    part(mount, boxGeo(1.6, 1.0, 0.15), steel, 0, gy + 0.2, gz - 0.2); // gun shield
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, gy, gz + barrelLen + 0.6);
  mount.add(muzzle);
  h.muzzles = [muzzle];

  if (!ngw) {
    // Seated behind the turret: lower the body, legs forward, on a little seat.
    part(h.root, boxGeo(1.6, 1.0, 1.4), steel, 0, 0.5, -0.3);
    h.lift = -0.9;
    h.bob = 0.02;
    h.body.position.y = h.lift;
    h.rightLeg.rotation.x = -Math.PI / 2;
    h.leftLeg.rotation.x = -Math.PI / 2;
  }
  h.rightArm.rotation.set(-Math.PI / 2 + 0.2, 0, 0.2);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.2, 0, -0.2);
  h.pose = { right: -Math.PI / 2 + 0.2, left: -Math.PI / 2 + 0.2, leftRecoil: 0.35 };
  h.tracer = ngw ? 0x00e5ff : coil;
  h.tracerWidth = ngw ? 0.9 : 0.55;
  return h;
}

/** A muzzle point on `parent` (local coords), registered as the model's only muzzle. */
function setMuzzle(h, parent, x, y, z) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  h.muzzles = [m];
  return m;
}

/** Simple helmet: dome + brim. */
function helmet(h, color, brim = true) {
  const m = h.M(color);
  part(h.head, boxGeo(1.45, 0.55, 1.45), m, 0, 1.3, 0);
  if (brim) part(h.head, boxGeo(1.5, 0.12, 0.45), m, 0, 1.05, 0.62);
  return m;
}

/** Sniper tower (cliff): very long rifle. Ghillie suit at Lv 5. */
export function makeSniper(level) {
  const ghillie = level >= 4;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: 0x4e5b3a, pants: 0x3b4530, arms: 0x4e5b3a, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  part(h.head, boxGeo(1.35, 0.4, 1.35), M(0x33402a), 0, 1.2, 0); // knit cap
  if (level >= 2) {
    // Spotter Scope: radio headset with a tall antenna
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.08, 1.2, 0.08), dark, -0.72, 1.4, -0.25);
    // ...a tactical vest, and a spotting scope on a tripod beside them
    if (!ghillie) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(0x2f3a24), 0, -0.1, 0);
    part(h.root, boxGeo(0.15, 2.4, 0.15), dark, 1.9, 1.2, 0.6);
    part(h.root, boxGeo(0.45, 0.45, 1.4), M(0x37474f), 1.9, 2.5, 0.8);
    part(h.root, boxGeo(0.35, 0.35, 0.06), M(0x4fc3f7), 1.9, 2.5, 1.52);
  }
  if (level >= 3) part(h.root, boxGeo(1.1, 0.6, 0.7), M(0x33402a), -1.9, 0.3, 0.6); // .50 ammo can
  if (ghillie) {
    // Ghillie suit: shaggy leafy chunks all over
    const leaves = [M(0x556b2f), M(0x6b8e23), M(0x3d5229), M(0x7a8b45)];
    let n = 0;
    const tuft = (parent, x, y, z, sz = 0.55) => part(parent, boxGeo(sz, sz * 0.8, sz), leaves[n++ % leaves.length], x, y, z);
    for (const x of [-0.75, 0, 0.75]) for (const y of [-0.6, 0.2, 0.9]) {
      tuft(h.torso, x, y, 0.52);
      tuft(h.torso, x, y, -0.52);
    }
    for (const x of [-0.5, 0.2, 0.6]) tuft(h.head, x, 1.45, (x * 7) % 0.6 - 0.2, 0.6);
    for (const arm of [h.rightArm, h.leftArm]) for (const y of [-0.5, -1.3]) tuft(arm, 0.45, y, 0, 0.45);
    for (const leg of [h.rightLeg, h.leftLeg]) tuft(leg, 0, -0.8, 0.45, 0.5);
  }
  const len = 3.4;
  const gun = holdLongGun(h, len, M(level >= 3 ? 0x263238 : 0x5d4037));
  const scope = level >= 1 ? 1.3 : 0.9;
  part(gun, boxGeo(0.26, scope, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(0x3e2723), 0, 0.2, -0.05); // stock
  if (level >= 1) {
    // Steady Aim: a bipod under the barrel and a camo scarf
    for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5);
    part(h.head, boxGeo(1.26, 0.45, 0.1), M(0x6b7d3a), 0, 0.25, 0.62);
    if (!ghillie) part(h.torso, boxGeo(2.3, 1.0, 1.3), M(0x6b7d3a), 0, 0.6, 0); // camo poncho
  }
  if (level >= 3) part(gun, boxGeo(0.42, 0.45, 0.5), dark, 0, -len, 0); // muzzle brake on the .50
  if (ghillie) for (const y of [-0.6, -1.6, -2.5]) part(gun, boxGeo(0.45, 0.4, 0.5), M(0x556b2f), 0, y, -0.1);
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = 0xffffff;
  h.tracerWidth = level >= 3 ? 0.25 : undefined;
  return h;
}

/**
 * Tactical Sniper (alternate Sniper form): a modern operator in grey-blue gear with a shard
 * patch. Top path: Lv 2 headset + scope, Lv 3 Intervention heavy rifle, Lv 4 AP Bullets dark
 * hooded cloak (stealthy), Lv 5 Pathfinder armor plates. Bottom path (`bottom`): Lv 2-3 ammo
 * pouches, Lv 4 Marksman vest, Lv 5 red Laser Eye visor, Lv 6 glowing red Laser Barrett.
 */
export function makeSniperTactical(level, bottom = false) {
  const top = !bottom;
  const cloak = top && level >= 4;
  const laser = bottom && level >= 5;
  const shirt = cloak ? 0x1b1f24 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: cloak ? 0x15181c : 0x37474f, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  const shard = glow(h, 0xb388ff);
  const red = glow(h, 0xff1744);

  // Ball cap (a hood once it's stealthy)
  const cap = M(cloak ? 0x111417 : 0x263238);
  part(h.head, boxGeo(1.4, 0.45, 1.4), cap, 0, 1.28, 0);
  if (cloak) {
    part(h.head, boxGeo(1.6, 1.4, 0.3), cap, 0, 0.8, -0.72);
    for (const x of [-0.78, 0.78]) part(h.head, boxGeo(0.12, 1.3, 1.5), cap, x, 0.75, 0);
    // Long dark cloak over the back
    part(h.torso, boxGeo(2.3, 2.4, 0.2), M(0x111417), 0, -0.4, -0.62);
  } else part(h.head, boxGeo(1.4, 0.1, 0.6), cap, 0, 1.08, 0.75);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52); // shoulder-patch emblem

  if (top && level >= 2) {
    // Enhanced Sight: headset with a little purple monocle
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.3, 0.3, 0.12), shard, 0.28, 0.72, 0.72);
  }
  if (top && level >= 5) {
    // Pathfinder: heavy armor plates on chest and shoulders
    const plate = M(0x2b3238);
    part(h.torso, boxGeo(2.2, 1.6, 1.25), plate, 0, -0.05, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), plate, 0, -0.2, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.06), shard, 0, 0.1, 0.64);
  }
  if (bottom && level >= 1) {
    // High Velocity / 160 GR Bullet: ammo pouches on the belt
    const n = level >= 2 ? 3 : 2;
    for (let k = 0; k < n; k++) part(h.torso, boxGeo(0.4, 0.45, 0.3), M(0x4e5b3a), -0.6 + k * 0.6, -0.85, 0.6);
  }
  if (bottom && level >= 3) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(0x3a4750), 0, -0.1, 0); // Marksman vest
  if (bottom && level >= 4) {
    // Laser Eye: a red glowing eyepiece and a flare gun on the hip
    part(h.head, boxGeo(1.2, 0.25, 0.15), dark, 0, 0.72, 0.7);
    part(h.head, boxGeo(0.4, 0.25, 0.08), red, 0.27, 0.72, 0.79);
    part(h.root, boxGeo(0.3, 0.5, 0.7), M(0xff6f00), 1.4, 1.8, 0.3);
  }

  // Rifle: longer and heavier on the Top path, a glowing laser rifle at Laser Barrett
  const len = laser ? 4.2 : top && level >= 3 ? 4 : 3.4;
  const gun = holdLongGun(h, len, M(laser ? 0x212121 : cloak ? 0x15181c : 0x37474f));
  part(gun, boxGeo(0.26, level >= 1 ? 1.4 : 1.0, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(0x263238), 0, 0.2, -0.05); // stock
  if (level >= 1) for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5); // bipod
  if (top && level >= 3) part(gun, boxGeo(0.42, 0.5, 0.5), dark, 0, -len, 0); // muzzle brake
  if (cloak) part(gun, boxGeo(0.08, len * 0.6, 0.08), shard, 0.2, -len * 0.45, 0.2);
  if (laser) {
    part(gun, boxGeo(0.12, len * 0.8, 0.12), red, 0.2, -len * 0.5, 0.15);
    part(gun, boxGeo(0.35, 0.35, 0.35), red, 0, -len, 0);
  }
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = laser ? 0xff1744 : 0xffffff;
  h.tracerWidth = laser || (top && level >= 3) ? 0.25 : undefined;
  return h;
}
const makeSniperTacticalBottom = (level) => makeSniperTactical(level, true);

/**
 * Classic Sniper (alternate Sniper form): a desert marksman with a bolt-action rifle.
 * Lv 2 bandolier, Lv 3 vest + headset + shard goggles, Lv 4 helmet + ammo crate,
 * Lv 5 black Spec Ops kit with quad night-vision goggles and a purple-trimmed rifle.
 */
export function makeSniperClassic(level) {
  const spec = level >= 4;
  const geared = level >= 2;
  const shirt = spec ? 0x1c1726 : 0xb89a6a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: spec ? 0x14101c : 0x8d7a55, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  const shard = glow(h, 0xb388ff);

  if (level >= 3) {
    // Frontlines Sniping: combat helmet (black at Spec Ops) and an ammo crate beside them
    const helm = M(spec ? 0x14101c : 0x6d6047);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helm, 0, 1.3, 0);
    part(h.head, boxGeo(1.5, 0.12, 0.4), helm, 0, 1.05, 0.62);
    part(h.root, boxGeo(1.2, 0.7, 0.8), M(spec ? 0x263238 : 0x5d4c2e), -1.9, 0.35, 0.6);
    part(h.root, boxGeo(0.3, 0.3, 0.05), shard, -1.9, 0.4, 1.02);
  } else {
    // Wide-brim boonie hat with the shard emblem
    const hat = M(0xa1885a);
    part(h.head, boxGeo(1.38, 0.45, 1.38), hat, 0, 1.3, 0);
    part(h.head, boxGeo(1.9, 0.1, 1.9), hat, 0, 1.08, 0);
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.7);
  }
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52); // shoulder-patch emblem
  if (level >= 1) {
    // Faster Reloading: a bandolier of rifle rounds across the chest
    const belt = part(h.torso, boxGeo(0.35, 2.2, 1.15), M(0x4e342e), 0, 0, 0);
    belt.rotation.z = 0.7;
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.12, 0.3, 0.12), M(0xd4af37), y * 0.8, y, 0.62);
  }
  if (geared) {
    // Geared Up: plate vest, radio headset and purple-lensed goggles
    part(h.torso, boxGeo(2.15, 1.5, 1.15), M(spec ? 0x0f0c14 : 0x6b5a3a), 0, -0.1, 0);
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.08, 1.0, 0.08), dark, -0.72, 1.3, -0.25);
    if (!spec) {
      part(h.head, boxGeo(1.2, 0.3, 0.2), dark, 0, 0.72, 0.68);
      for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.36, 0.22, 0.05), shard, x, 0.72, 0.79);
    }
  }
  if (spec) {
    // Spec Ops: quad night-vision goggles glowing purple, knee pads and gloves
    part(h.head, boxGeo(1.0, 0.3, 0.3), dark, 0, 0.75, 0.72);
    for (const x of [-0.36, -0.12, 0.12, 0.36]) part(h.head, boxGeo(0.18, 0.18, 0.25), shard, x, 0.75, 0.95);
    const pad = M(0x212121);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), pad, 0, -1.2, 0.45);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.45, 1.05), pad, 0, -1.75, 0);
  }

  // Bolt-action rifle: wooden at first, black with purple trim at Spec Ops
  const len = level >= 3 ? 3.8 : 3.3;
  const gun = holdLongGun(h, len, M(spec ? 0x263238 : level >= 3 ? 0x37474f : 0x6d4c41));
  part(gun, boxGeo(0.26, level >= 2 ? 1.4 : 1.0, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(spec ? 0x1c1726 : 0x4e342e), 0, 0.2, -0.05); // stock
  part(gun, boxGeo(0.35, 0.1, 0.1), M(0x9e9e9e), 0.2, -0.3, 0.2); // bolt handle
  if (level >= 2) for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5); // bipod
  if (level >= 3) part(gun, boxGeo(0.4, 0.5, 0.48), dark, 0, -len, 0); // suppressor
  if (spec) part(gun, boxGeo(0.08, len * 0.7, 0.08), shard, 0.2, -len * 0.45, 0.2);
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = spec ? 0xb388ff : 0xffe082;
  h.tracerWidth = level >= 3 ? 0.25 : undefined;
  return h;
}

/** Enforcer tower: a prison guard with a nightstick. Steel from Lv 2, flashlight from Lv 3, shock baton from Lv 4, riot gear at Lv 5. */
export function makeEnforcer(level) {
  const riot = level >= 4;
  const zap = level >= 3;
  const navy = 0x263859;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: riot ? 0x1c1f26 : 0x5b7289, pants: riot ? 0x111318 : navy, arms: riot ? 0x1c1f26 : 0x5b7289, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.12); // a big guy
  part(h.torso, boxGeo(2.3, 1.9, 1.2), M(riot ? 0x23272f : 0x5b7289), 0, 0.1, 0); // bulky chest
  part(h.torso, boxGeo(0.35, 0.4, 0.06), M(0xffd54f), -0.55, 0.55, 0.62); // badge
  part(h.torso, boxGeo(1.0, 0.2, 0.05), M(0xfafafa), 0.45, 0.6, 0.62); // name tag
  part(h.torso, boxGeo(2.35, 0.3, 1.25), M(0x212121), 0, -0.85, 0); // duty belt
  // Ring of cell keys on the belt
  part(h.torso, boxGeo(0.4, 0.4, 0.1), M(0xbdbdbd), 0.8, -1.1, 0.64);
  for (const x of [0.7, 0.9]) part(h.torso, boxGeo(0.08, 0.4, 0.06), M(0xffd54f), x, -1.4, 0.66);
  if (!riot) {
    // Peaked guard cap
    part(h.head, boxGeo(1.4, 0.45, 1.4), M(navy), 0, 1.4, 0);
    part(h.head, boxGeo(1.4, 0.1, 0.55), M(0x111111), 0, 1.15, 0.72);
    part(h.head, boxGeo(0.35, 0.3, 0.06), M(0xffd54f), 0, 1.45, 0.72);
  }
  if (level >= 2) {
    // Cell Block Patrol: flashlight on the shoulder strap and a radio
    part(h.torso, boxGeo(0.3, 0.3, 0.7), M(0x212121), -0.85, 0.85, 0.5);
    part(h.torso, boxGeo(0.28, 0.28, 0.06), glow(h, 0xfff59d), -0.85, 0.85, 0.86);
    part(h.torso, boxGeo(0.35, 0.6, 0.25), M(0x212121), -0.95, -0.6, 0.55);
  }
  if (riot) {
    const black = M(0x1c1f26);
    part(h.head, boxGeo(1.5, 1.4, 1.5), black, 0, 0.7, -0.03); // riot helmet
    const visor = part(h.head, boxGeo(1.3, 0.8, 0.08), M(0x90caf9), 0, 0.55, 0.78);
    visor.material.transparent = true;
    visor.material.opacity = 0.6;
    part(h.torso, boxGeo(1.6, 0.35, 0.06), M(0xfdd835), 0, 0.15, 0.63); // "CORRECTIONS" stripe
    // Riot shield on the left arm, held in front
    const shield = part(h.leftArm, boxGeo(2.0, 0.15, 3.0), M(0x78909c), 0, -1.8, 0.6);
    shield.rotation.x = 0.1;
    part(shield, boxGeo(1.4, 0.05, 0.25), M(0xfafafa), 0, -0.1, 0.6);
  }

  // Nightstick held in the right hand, pointing along the arm.
  const stick = new THREE.Group();
  stick.position.set(0, -1.9, 0);
  h.rightArm.add(stick);
  part(stick, boxGeo(0.3, 0.6, 0.3), M(0x212121), 0, -0.2, 0); // grip
  part(stick, boxGeo(0.7, 0.12, 0.12), M(0x212121), 0.35, -0.45, 0); // side handle
  const len = level >= 1 ? 2.6 : 2.2; // the steel nightstick is longer
  part(stick, boxGeo(0.35, len, 0.35), zap ? M(0x263238) : level >= 1 ? M(0x9e9e9e) : M(0x6d4c41), 0, -0.5 - len / 2, 0);
  if (zap) {
    for (let i = 0; i < 3; i++) part(stick, boxGeo(0.42, 0.12, 0.42), glow(h, 0x40c4ff), 0, -0.9 - i * 0.6, 0);
    part(stick, boxGeo(0.45, 0.25, 0.45), glow(h, 0x40c4ff), 0, -0.5 - len, 0); // shock tip
  }
  setMuzzle(h, stick, 0, -0.5 - len, 0);

  // Nightstick raised overhead; a swing brings it down in front.
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(riot ? -1.3 : -0.25, 0, riot ? -0.2 : -0.1);
  h.pose = { right: -2.6, left: riot ? -1.3 : -0.25, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = zap ? 0x80d8ff : 0xffffff;
  return h;
}

/** Warden (alternate Enforcer): the prison warden in a khaki uniform and campaign hat. Night-vision at Lv 2, riot shield at Lv 5. */
export function makeWarden(level) {
  const riot = level >= 4;
  const khaki = 0xb59b6a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: khaki, pants: 0x4e3b27, arms: khaki, face: 'soldier' });
  const { M } = h;
  part(h.torso, boxGeo(0.4, 0.45, 0.06), M(0xffd54f), -0.55, 0.55, 0.52); // star badge
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // leather belt
  part(h.torso, boxGeo(0.35, 0.25, 0.06), M(0xffd54f), 0, -0.85, 0.56); // buckle
  for (const x of [-0.75, 0.75]) part(h.torso, boxGeo(0.5, 0.15, 1.1), M(0x6d5a3a), x, 0.95, 0); // shoulder straps
  if (!riot) {
    // Wide-brimmed campaign hat
    const hat = M(0x6d5a3a);
    part(h.head, boxGeo(2.0, 0.12, 2.0), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.55, 1.3), hat, 0, 1.55, 0);
    part(h.head, boxGeo(1.32, 0.12, 1.32), M(0x3e2723), 0, 1.33, 0);
  }
  if (level >= 1) {
    // Night Shift: night-vision monocle
    part(h.head, boxGeo(0.35, 0.35, 0.4), M(0x212121), 0.3, 0.7, 0.75);
    part(h.head, boxGeo(0.25, 0.25, 0.06), glow(h, 0x76ff03), 0.3, 0.7, 0.96);
  }
  if (level >= 3) part(h.torso, boxGeo(1.9, 1.5, 1.15), M(0x5d6b45), 0, 0.15, 0); // Stunning Blows: armored vest
  if (riot) {
    const dark = M(0x3e2723);
    part(h.head, boxGeo(1.45, 1.35, 1.45), dark, 0, 0.7, -0.03); // riot helmet
    const visor = part(h.head, boxGeo(1.3, 0.8, 0.08), M(0xffe0b2), 0, 0.55, 0.76);
    visor.material.transparent = true;
    visor.material.opacity = 0.55;
    const shield = part(h.leftArm, boxGeo(2.0, 0.15, 3.0), M(0x8d6e63), 0, -1.8, 0.6);
    shield.rotation.x = 0.1;
    part(shield, boxGeo(0.4, 0.06, 0.4), M(0xffd54f), 0, -0.1, 0.4); // gold star on the shield
  }

  // Baton: longer from Heavier Stick, glowing from Stunning Blows.
  const stick = new THREE.Group();
  stick.position.set(0, -1.9, 0);
  h.rightArm.add(stick);
  part(stick, boxGeo(0.3, 0.55, 0.3), M(0x3e2723), 0, -0.2, 0);
  const len = level >= 2 ? 2.7 : 2.1;
  const wide = level >= 2 ? 0.42 : 0.32;
  part(stick, boxGeo(wide, len, wide), M(level >= 2 ? 0x37474f : 0x5d4037), 0, -0.45 - len / 2, 0);
  if (level >= 3) for (let i = 0; i < 2; i++) part(stick, boxGeo(wide + 0.08, 0.14, wide + 0.08), glow(h, 0xffab00), 0, -1.2 - i * 0.8, 0);
  setMuzzle(h, stick, 0, -0.45 - len, 0);

  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(riot ? -1.3 : -0.25, 0, riot ? -0.2 : -0.1);
  h.pose = { right: -2.6, left: riot ? -1.3 : -0.25, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = level >= 3 ? 0xffab00 : 0xffffff;
  return h;
}

/** Rifleman tower: fast-firing rifle, machine gun at Lv 5. */
export function makeRifleman(level) {
  const heavy = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: heavy ? 0x3e2723 : 0x5d6d4e, pants: 0x3e4a33, arms: heavy ? 0x3e2723 : 0x5d6d4e, face: 'soldier' });
  const { M } = h;
  const dark = M(0x232323);
  helmet(h, heavy ? 0x4e342e : 0x556b2f);
  if (level >= 1) {
    // Red Dot: a pack with a rolled-up bedroll
    part(h.torso, boxGeo(1.4, 1.4, 0.6), M(0x4b5320), 0, -0.1, -0.8);
    part(h.torso, boxGeo(1.7, 0.45, 0.45), M(0x8d6e63), 0, 0.85, -0.85);
  }
  if (level >= 2) {
    // Night Vision: goggles with green lenses and a camo net over the helmet
    part(h.head, boxGeo(1.6, 0.4, 1.6), M(0x33691e), 0, 1.45, 0);
    part(h.head, boxGeo(0.9, 0.35, 0.4), M(0x263238), 0, 1.0, 0.75);
    part(h.head, boxGeo(0.25, 0.22, 0.06), glow(h, 0x76ff03), -0.22, 1.0, 0.96);
    part(h.head, boxGeo(0.25, 0.22, 0.06), glow(h, 0x76ff03), 0.22, 1.0, 0.96);
  }
  if (level >= 3) {
    // Veteran: plate carrier with pouches
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x8d7b55), 0, 0.05, 0);
    for (const x of [-0.55, 0, 0.55]) part(h.torso, boxGeo(0.4, 0.45, 0.2), M(0x6b5d3f), x, -0.35, 0.65);
  }
  const len = heavy ? 2.5 : 2.0;
  const gun = holdLongGun(h, len, dark);
  part(gun, boxGeo(0.25, 0.5, 0.35), M(0x4e342e), 0, 0.2, -0.05); // stock
  if (heavy) {
    part(gun, boxGeo(0.55, 0.6, 0.6), M(0x3a3a3a), 0, -0.5, -0.45); // ammo box
    part(gun, boxGeo(0.45, 0.8, 0.5), dark, 0, -0.5, 0); // receiver
    part(gun, boxGeo(0.08, 0.08, 0.8), dark, 0.15, -len + 0.4, -0.45); // bipod
    part(gun, boxGeo(0.08, 0.08, 0.8), dark, -0.15, -len + 0.4, -0.45);
  } else {
    part(gun, boxGeo(0.25, 0.5, 0.5), dark, 0, -0.6, -0.4); // mag
  }
  if (level >= 1) {
    // Red Dot sight
    part(gun, boxGeo(0.25, 0.35, 0.3), dark, 0, -0.75, 0.36);
    part(gun, boxGeo(0.12, 0.05, 0.12), glow(h, 0xff1744), 0, -0.93, 0.4);
  }
  h.tracer = heavy ? 0xffab40 : 0xffd54f;
  return h;
}

/** Grenadier tower: throws grenades, dynamite at Lv 5. */
export function makeGrenadier(level) {
  const demo = level >= 4;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: demo ? 0x5d4037 : 0x6d7b4a, pants: 0x4b5530, arms: demo ? 0x5d4037 : 0x6d7b4a, face: 'soldier' });
  const { M } = h;
  helmet(h, demo ? 0xfbc02d : 0x556b2f, !demo);
  if (level >= 2) {
    // Keen Eye: goggles on the helmet
    part(h.head, boxGeo(1.3, 0.3, 0.2), M(0x263238), 0, 1.3, 0.75);
    part(h.head, boxGeo(0.35, 0.22, 0.05), M(0xffb74d), -0.27, 1.3, 0.86);
    part(h.head, boxGeo(0.35, 0.22, 0.05), M(0xffb74d), 0.27, 1.3, 0.86);
    part(h.torso, boxGeo(0.7, 0.8, 0.9), M(0x6d4c41), 1.15, -0.8, 0); // satchel
    part(h.torso, boxGeo(0.2, 2.3, 1.12), M(0x4e342e), 0, 0.1, 0).rotation.z = -0.6; // satchel strap
  }
  const nade = M(0x33691e);
  const tnt = M(0xc62828);
  if (level >= 1) {
    // Belt of grenades
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 0.4, 0.35), demo ? tnt : nade, x, -0.7, 0.62);
  }
  if (level >= 3) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 0.35, 0.3), demo ? tnt : nade, t * 0.75, t * -0.8, 0.65);
    // Double Pin: a second grenade ready in the left hand
    part(h.leftArm, demo ? boxGeo(0.3, 0.9, 0.3) : boxGeo(0.5, 0.6, 0.5), demo ? tnt : nade, 0, -2.3, 0);
  }
  // Grenade (or dynamite) held in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  if (demo) {
    part(hand, boxGeo(0.3, 0.9, 0.3), tnt, 0, -0.3, 0);
    part(hand, boxGeo(0.06, 0.4, 0.06), glow(h, 0xffeb3b), 0, -0.9, 0); // lit fuse
  } else {
    part(hand, boxGeo(0.5, 0.6, 0.5), nade, 0, -0.2, 0);
    part(hand, boxGeo(0.2, 0.2, 0.2), M(0x9e9e9e), 0, -0.6, 0); // pin
  }
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = demo ? { color: 0xc62828, size: 0.4, arc: 4.5 } : { color: 0x33691e, size: 0.5, arc: 3.5 };
  return h;
}

/**
 * Demo Expert (alternate Grenadier form): a demolitions expert in a dark coat with a stubby
 * grenade launcher. Lv 2 adds a bandolier, Lv 3 goggles and a sticky-bomb pack, Lv 4 a drum
 * magazine, Lv 5 a heavy armored vest and a bigger barrel.
 */
export function makeGrenadierDemo(level) {
  const heavy = level >= 4;
  const coat = heavy ? 0x212121 : 0x263850;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: coat, pants: 0x1c1c22, arms: coat, face: 'soldier' });
  const { M } = h;
  const dark = M(0x37474f);
  const brown = M(0x4e342e);
  const shell = M(0x1b1b1b);
  // Beanie
  part(h.head, boxGeo(1.32, 0.45, 1.32), M(heavy ? 0x111111 : 0x1a237e), 0, 1.3, 0);
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), brown, 0, 0, 0);
    strap.rotation.z = -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.32, 0.32, 0.3), shell, t * 0.75, t * 0.8, 0.65);
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.3, 0.3, 0.2), M(0x263238), 0, 1.0, 0.72);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0x4fc3f7), -0.27, 1.0, 0.83);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0x4fc3f7), 0.27, 1.0, 0.83);
    // Pack of sticky charges on the back, with glowing lights.
    part(h.torso, boxGeo(1.4, 1.4, 0.6), dark, 0, 0.1, -0.85);
    for (const x of [-0.4, 0.4]) part(h.torso, boxGeo(0.2, 0.2, 0.1), glow(h, 0xff5252), x, 0.4, -1.18);
  }
  if (heavy) {
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x455a64), 0, 0.2, 0); // armored vest
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x455a64), -1.25, 0.85, 0); // shoulder pads
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x455a64), 1.25, 0.85, 0);
  }
  // Grenade launcher held forward in the right hand. In arm space the barrel runs along -y
  // (toward the target once the arm is raised) and +z is the top of the gun.
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  const bore = heavy ? 0.6 : 0.48;
  part(gun, boxGeo(bore, 1.6, bore), dark, 0, -0.6, 0); // barrel
  part(gun, boxGeo(0.22, 0.3, 0.6), brown, 0, 0.1, -0.4); // grip
  part(gun, boxGeo(0.3, 0.8, 0.3), brown, 0, 0.6, -0.05); // stock
  if (level >= 3) part(gun, boxGeo(0.8, 0.5, 0.8), M(0x5d4037), 0, -0.2, -0.1); // drum magazine
  if (heavy) part(gun, boxGeo(0.75, 0.2, 0.75), M(0xfbc02d), 0, -1.4, 0); // yellow muzzle ring
  setMuzzle(h, gun, 0, -1.5, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  h.projectile = { color: 0x1b1b1b, size: heavy ? 0.55 : 0.45, arc: 3 };
  return h;
}

/** Frost Trooper tower: ice gun with a coolant tank. */
export function makeFrost(level) {
  const ice = 0x80d8ff;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xe3f2fd, pants: 0x90caf9, arms: 0xe3f2fd, face: 'soldier' });
  const { M } = h;
  const white = M(0xfafafa);
  part(h.head, boxGeo(1.45, 1.4, 1.45), white, 0, 0.65, -0.03); // hood
  part(h.head, boxGeo(1.2, 0.4, 0.08), glow(h, ice), 0, 0.7, 0.7); // visor
  const big = level >= 3;
  part(h.torso, boxGeo(big ? 1.5 : 1.1, big ? 2.0 : 1.7, 0.8), M(0x90a4ae), 0, 0, -0.9); // coolant tank
  part(h.torso, boxGeo(0.3, big ? 1.6 : 1.3, 0.1), glow(h, ice), 0, 0, big ? -1.32 : -1.32);
  if (level >= 1) {
    // Deep Freeze: frosty shoulder pads with icicles
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.8, 0.45, 1.3), white, side * 1.4, 1.0, 0);
      part(h.torso, boxGeo(0.15, 0.5, 0.15), M(0xb3e5fc), side * 1.6, 0.6, 0.4);
    }
  }
  if (level >= 2) {
    // Frostbite: spiky ice gauntlets
    const iceM = glow(h, 0x4fc3f7);
    for (const arm of [h.rightArm, h.leftArm]) {
      part(arm, boxGeo(1.1, 0.6, 1.1), iceM, 0, -1.6, 0);
      part(arm, boxGeo(0.2, 0.6, 0.2), M(0xe1f5fe), 0.55, -1.3, 0);
    }
  }
  if (level >= 4) {
    // Blizzard: crown of ice crystals
    const crystal = glow(h, 0xb3e5fc);
    for (const [x, hgt] of [[-0.45, 0.5], [0, 0.8], [0.45, 0.5]]) part(h.head, boxGeo(0.25, hgt, 0.25), crystal, x, 1.4 + hgt / 2, 0);
    part(h.torso, boxGeo(2.2, 2.6, 0.15), M(0xe1f5fe), 0, -0.5, -1.35); // snowy cape
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(h.root, boxGeo(0.5, 0.8 + (i % 2) * 0.6, 0.5), crystal, Math.cos(a) * 1.7, 0.5, Math.sin(a) * 1.7).rotation.y = a;
    }
  }
  const len = level >= 3 ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, M(0xeceff1));
  part(gun, boxGeo(0.5, 0.6, 0.55), M(0x78909c), 0, -0.3, 0);
  for (let i = 0; i < (level >= 2 ? 3 : 2); i++) part(gun, boxGeo(0.5, 0.12, 0.55), glow(h, ice), 0, -0.9 - i * 0.35, 0);
  part(gun, boxGeo(0.45, 0.25, 0.5), glow(h, ice), 0, -len, 0); // nozzle
  h.muzzles[0].position.y = -len - 0.15;
  h.tracer = ice;
  h.tracerWidth = 0.3;
  return h;
}

/** Rocketeer tower: rocket launcher, bazooka at Lv 4, plasma launcher at Lv 5. */
export function makeRocketeer(level) {
  const plasma = level >= 4;
  const bazooka = level >= 3;
  const h = makeHumanoid({ skin: 0xc68642, shirt: plasma ? 0x311b92 : 0x795548, pants: plasma ? 0x1a1a40 : 0x4e342e, arms: plasma ? 0x311b92 : 0x795548, face: 'soldier' });
  const { M } = h;
  helmet(h, plasma ? 0x212121 : 0x6d4c41);
  if (level >= 2) {
    // Scope: one-eyed targeting monocle
    part(h.head, boxGeo(0.4, 0.35, 0.3), M(0x212121), 0.28, 0.7, 0.68);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, plasma ? 0xe040fb : 0xff5252), 0.28, 0.7, 0.84);
  }
  if (level >= 1) {
    // Backpack full of spare rockets
    part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x5d4037), 0, 0, -0.85);
    for (const x of [-0.35, 0.35]) part(h.torso, boxGeo(0.3, 0.5, 0.3), plasma ? glow(h, 0xd500f9) : M(0xe65100), x, 1.0, -0.85);
  }
  const w = bazooka ? 0.9 : 0.7;
  const len = bazooka ? 3.0 : 2.5;
  const tubeMat = M(plasma ? 0x4a148c : bazooka ? 0x556b2f : 0x616161);
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(w, len, w), tubeMat, 0, -len / 2 + 0.6, 0); // tube sticks out behind the hand too
  part(gun, boxGeo(w + 0.15, 0.3, w + 0.15), M(0x212121), 0, -len + 0.6, 0); // front ring
  part(gun, boxGeo(0.3, 0.5, 0.3), M(0x212121), 0, -0.3, -0.4); // grip
  if (plasma) for (let i = 0; i < 3; i++) part(gun, boxGeo(w + 0.1, 0.15, w + 0.1), glow(h, 0xd500f9), 0, -0.4 - i * 0.6, 0);
  if (level >= 2) {
    // Scope: a big targeting sight on top of the tube, and a padded flak vest
    if (!plasma) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x5d4037), 0, 0.05, 0);
    part(gun, boxGeo(0.4, 1.1, 0.45), M(0x212121), 0, -0.9, w / 2 + 0.25);
    part(gun, boxGeo(0.3, 0.06, 0.3), glow(h, plasma ? 0xe040fb : 0xff5252), 0, -1.47, w / 2 + 0.25);
  }
  setMuzzle(h, gun, 0, -len + 0.4, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.2 };
  h.projectile = plasma ? { color: 0xe040fb, size: 1.4 } : bazooka ? { color: 0xff6d00, size: 1.2 } : { color: 0xff6d00, size: 1 };
  return h;
}

/** Mortar tower (cliff): a soldier loading a mortar tube. */
export function makeMortar(level) {
  const doom = level >= 4;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' });
  const { M } = h;
  helmet(h, 0x556b2f);
  if (level >= 1) {
    // Fast Loader: ear protectors and an open crate of ready shells beside the tube
    for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0xff8f00), x, 0.6, 0);
    part(h.root, boxGeo(1.3, 0.7, 0.9), M(0x6d4c41), -2.0, 0.35, 1.0);
    for (const x of [-2.35, -2.0, -1.65]) part(h.root, boxGeo(0.25, 0.5, 0.25), M(doom ? 0x76ff03 : 0x37474f), x, 0.85, 1.0);
  }
  // Mortar tube in front of the soldier, tilted up toward the target.
  const mount = new THREE.Group();
  mount.position.set(0, 0, 2.2);
  h.root.add(mount);
  const steel = M(doom ? 0x37474f : 0x4a5a3a);
  part(mount, boxGeo(1.8, 0.2, 1.8), M(0x424242), 0, 0.1, 0); // base plate
  const w = level >= 2 ? 0.85 : 0.65;
  const len = level >= 2 ? 3.6 : 3.0;
  const tube = new THREE.Group();
  tube.position.set(0, 0.3, 0);
  tube.rotation.x = 0.5; // leans forward
  mount.add(tube);
  part(tube, boxGeo(w, len, w), steel, 0, len / 2, 0);
  part(tube, boxGeo(w + 0.2, 0.25, w + 0.2), M(0x212121), 0, len, 0);
  if (doom) for (let i = 0; i < 3; i++) part(tube, boxGeo(w + 0.12, 0.15, w + 0.12), glow(h, 0x76ff03), 0, 0.8 + i * 0.9, 0);
  for (const side of [-1, 1]) {
    const leg = part(mount, boxGeo(0.15, 2.2, 0.15), M(0x212121), side * 0.6, 1.0, 1.0); // bipod
    leg.rotation.set(-0.5, 0, side * 0.3);
  }
  setMuzzle(h, tube, 0, len + 0.3, 0);
  if (level >= 2) {
    // Sandbag wall
    const bag = M(0xa1887f);
    for (let i = 0; i < 5; i++) {
      const a = -1.2 + i * 0.6;
      part(h.root, boxGeo(1.3, 0.6, 0.7), bag, Math.sin(a) * 3.3, 0.3, 2.2 + Math.cos(a) * 1.6).rotation.y = a;
    }
  }
  if (level >= 3) {
    // Heavy Ordnance: stack of shells by the soldier's feet
    const shellM = doom ? glow(h, 0x76ff03) : M(0x37474f);
    part(h.root, boxGeo(1.4, 0.2, 1.0), M(0x5d4037), 1.9, 0.1, 0.2); // shell rack
    for (const x of [1.4, 1.75, 2.1, 2.45]) for (const z of [-0.05, 0.45]) part(h.root, boxGeo(0.3, 1.1, 0.3), shellM, x, 0.75, z);
    part(h.head, boxGeo(1.55, 0.35, 1.55), M(0x37474f), 0, 1.55, 0); // heavier helmet
  }
  // Holding a shell, ready to drop it in.
  const shell = part(h.rightArm, boxGeo(0.4, 0.8, 0.4), doom ? glow(h, 0x76ff03) : M(0x37474f), 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = doom ? { color: 0x76ff03, size: 0.9, arc: 20, glowing: true } : { color: 0x37474f, size: 0.6, arc: 18 };
  return h;
}

/** Flamethrower tower: fuel tanks and a nozzle; two nozzles at Lv 5. */
export function makeFlamethrower(level) {
  const twin = level >= 4;
  const suit = level >= 2;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit ? 0x9e9e9e : 0x5d4037, pants: suit ? 0x757575 : 0x3e2723, arms: suit ? 0x9e9e9e : 0x5d4037 });
  const { M } = h;
  // Gas mask with round lenses
  part(h.head, boxGeo(1.3, 1.3, 1.3), M(suit ? 0xbdbdbd : 0x424242), 0, 0.62, 0);
  part(h.head, boxGeo(0.4, 0.35, 0.08), M(0xffa000), -0.28, 0.75, 0.68);
  part(h.head, boxGeo(0.4, 0.35, 0.08), M(0xffa000), 0.28, 0.75, 0.68);
  part(h.head, boxGeo(0.5, 0.5, 0.4), M(0x212121), 0, 0.3, 0.75); // filter
  // Fuel tanks on the back
  const tank = M(level >= 3 ? 0xffa000 : 0xc62828);
  const tanks = twin ? [-0.6, -0.2, 0.2, 0.6] : level >= 1 ? [-0.6, 0, 0.6] : [-0.4, 0.4];
  const tankW = twin ? 0.38 : level >= 1 ? 0.5 : 0.6;
  const tankH = level >= 1 ? 2.4 : 1.9;
  for (const x of tanks) part(h.torso, boxGeo(tankW, tankH, 0.6), tank, x, level >= 1 ? 0.25 : 0, -0.85);
  if (level >= 1) part(h.torso, boxGeo(0.25, 0.25, 1.4), M(0x212121), -0.8, -0.6, -0.3); // hose
  const nozzle = (arm) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    arm.add(g);
    part(g, boxGeo(0.4, 1.8, 0.45), M(0x37474f), 0, -0.9, 0);
    part(g, boxGeo(0.6, 0.3, 0.6), M(0x212121), 0, -1.8, 0);
    part(g, boxGeo(0.15, 0.15, 0.15), glow(h, 0xff9100), 0, -2.0, 0.2); // pilot light
    const m = new THREE.Object3D();
    m.position.set(0, -2.1, 0);
    g.add(m);
    return m;
  };
  h.muzzles = [nozzle(h.rightArm)];
  if (twin) {
    h.muzzles.push(nozzle(h.leftArm));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.12);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.12);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.05 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.05 };
  }
  h.recoilScale = 0.1;
  return h;
}

// ------------------------------------------------------------------ spread / multi-target towers

/** Shotgunner: pump shotgun. Dark hunter coat from Lv 2, shell bandolier from Lv 4, riot armor at Lv 5. */
export function makeShotgunner(level) {
  const night = level >= 1;
  const riot = level >= 4;
  const h = makeHumanoid({
    skin: 0xd2a679,
    shirt: riot ? 0x263238 : night ? 0x283044 : 0x8d6e63,
    pants: riot ? 0x1c2429 : night ? 0x1e2333 : 0x4e342e,
    arms: riot ? 0x263238 : night ? 0x283044 : 0x8d6e63,
    face: 'soldier',
  });
  const { M } = h;
  if (riot) {
    // Crowd Control: riot helmet with a visor and chest plate
    part(h.head, boxGeo(1.45, 1.35, 1.45), M(0x37474f), 0, 0.68, -0.03);
    const visor = part(h.head, boxGeo(1.25, 0.6, 0.08), M(0x90caf9), 0, 0.65, 0.74);
    visor.material.transparent = true;
    visor.material.opacity = 0.6;
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x455a64), 0, 0.05, 0);
  } else {
    // Wide-brim hunter hat (dark from Lv 2)
    const hat = M(night ? 0x1a1a1a : 0x6d4c41);
    part(h.head, boxGeo(2.0, 0.12, 2.0), hat, 0, 1.22, 0);
    part(h.head, boxGeo(1.3, 0.5, 1.3), hat, 0, 1.5, 0);
    if (night) part(h.head, boxGeo(1.32, 0.12, 1.32), M(0xc62828), 0, 1.3, 0); // hat band
  }
  if (level >= 2) {
    // Bolt Action: long coat tails
    part(h.torso, boxGeo(2.05, 2.0, 0.2), M(night ? 0x1e2333 : 0x5d4037), 0, -1.7, -0.45);
    part(h.torso, boxGeo(2.3, 0.5, 1.3), M(0x4e342e), 0, 0.85, 0); // coat collar / shoulder cape
  }
  if (level >= 3) {
    // Bandolier: a strap of red shells across the chest
    const strap = part(h.torso, boxGeo(0.35, 2.6, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = 0.75;
    for (const t of [-0.75, -0.25, 0.25, 0.75]) part(h.torso, boxGeo(0.18, 0.32, 0.15), M(0xd32f2f), t * 0.75, t * -0.8, 0.62);
  }
  const len = riot ? 1.9 : 1.6;
  const gun = holdLongGun(h, len, M(riot ? 0x212121 : 0x3e2723));
  part(gun, boxGeo(0.4, 0.5, 0.5), M(0x5d4037), 0, -0.9, 0.1); // pump grip
  part(gun, boxGeo(0.3, 0.5, 0.4), M(0x4e342e), 0, 0.2, -0.05); // stock
  if (riot) part(gun, boxGeo(0.45, 0.6, 0.6), M(0x424242), 0, -0.5, -0.45); // drum mag
  h.tracer = 0xffab40;
  return h;
}

/** Plasma Trooper: holds a crackling plasma globe. Bigger globe each level, a giant bulb at Lv 5. */
export function makePlasma(level) {
  const doom = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: level >= 3 ? 0x4a148c : 0xeceff1, pants: level >= 3 ? 0x311b92 : 0x78909c, arms: level >= 3 ? 0x4a148c : 0xeceff1, face: 'soldier' });
  const { M } = h;
  const zap = level >= 2 ? 0xe040fb : 0x7c4dff;
  part(h.head, boxGeo(1.3, 0.4, 1.3), M(0x8e24aa), 0, 1.25, 0); // wild purple hair
  if (level >= 1) {
    // Safety Goggles
    part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x212121), 0, 0.72, 0.64);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x80deea), -0.28, 0.72, 0.71);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x80deea), 0.28, 0.72, 0.71);
    // ...and thick yellow rubber gloves
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.1, 0.9, 1.1), M(0xfdd835), 0, -1.55, 0);
  }
  if (level >= 3) {
    // Plasma Tower: a Tesla coil backpack
    part(h.torso, boxGeo(1.2, 1.6, 0.6), M(0x37474f), 0, 0, -0.85);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.7 - i * 0.15, 0.25, 0.7 - i * 0.15), M(0xb87333), 0, 1.0 + i * 0.35, -0.85);
    part(h.torso, boxGeo(0.45, 0.45, 0.45), glow(h, zap), 0, 2.2, -0.85);
  }
  // Globe held in front with both hands, on a little base.
  const holder = new THREE.Group();
  holder.position.set(0, 3.2, 1.6);
  h.body.add(holder);
  part(holder, boxGeo(0.7, 0.4, 0.7), M(0x263238), 0, -0.4, 0);
  const size = [0.9, 0.9, 1.1, 1.3, 1.5][level];
  const globe = part(holder, boxGeo(size, size, size), glow(h, zap), 0, size / 2 - 0.2, 0);
  globe.material.transparent = true;
  globe.material.opacity = 0.85;
  globe.rotation.y = 0.8;
  if (doom) {
    // Lightbulb of Doom: a giant glowing bulb floating overhead
    const bulb = part(h.body, boxGeo(1.6, 1.8, 1.6), glow(h, 0xfff59d), 0, 8.0, 0);
    bulb.rotation.y = 0.8;
    part(h.body, boxGeo(0.9, 0.6, 0.9), M(0x9e9e9e), 0, 6.9, 0);
  }
  setMuzzle(h, holder, 0, size / 2, 0);
  h.rightArm.rotation.set(-1.2, 0, 0.35);
  h.leftArm.rotation.set(-1.2, 0, -0.35);
  h.pose = { right: -1.2, left: -1.2, leftRecoil: 0.05 };
  h.recoilScale = 0.15;
  h.tracer = zap;
  h.tracerWidth = 0.18;
  return h;
}

/**
 * Pulse Trooper (alternate Plasma Trooper form): a technician in a cyan suit holding a pulse
 * emitter disc out in front. Lv 2 capacitor packs, Lv 3 a visor and amplifier dish, Lv 4 a
 * filament coil backpack, Lv 5 twin Sweeper laser pods, Lv 6 a glowing Arc Reactor and halo.
 */
export function makePlasmaPulse(level) {
  const arc = level >= 5;
  const suit = level >= 4 ? 0x0d2b45 : 0x00838f;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suit, pants: level >= 4 ? 0x0a1a2a : 0x006064, arms: suit, face: 'soldier' });
  const { M } = h;
  const zap = arc ? 0x84ffff : 0x40c4ff;
  const shard = glow(h, 0xb388ff);
  part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x263238), 0, 1.22, 0); // cap
  part(h.torso, boxGeo(0.35, 0.35, 0.08), shard, -0.55, 0.45, 0.52); // Dimension Shard emblem
  if (level >= 1) {
    // Capacitor Boost: glowing capacitor cells on the belt
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x37474f), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.3, 0.45, 0.3), glow(h, zap), x, -0.75, 0.62);
  }
  if (level >= 2) {
    // Pulse Amplifier: a visor and a little dish on the shoulder
    part(h.head, boxGeo(1.25, 0.32, 0.12), glow(h, zap), 0, 0.72, 0.64);
    part(h.torso, boxGeo(0.2, 0.6, 0.2), M(0x90a4ae), 0.8, 1.3, 0);
    part(h.torso, boxGeo(0.8, 0.12, 0.8), M(0xb0bec5), 0.8, 1.65, 0);
  }
  if (level >= 3) {
    // Charged Filament: a coil backpack with glowing filament rods
    part(h.torso, boxGeo(1.3, 1.6, 0.6), M(0x263238), 0, 0, -0.85);
    for (const x of [-0.4, 0.4]) {
      part(h.torso, boxGeo(0.15, 1.4, 0.15), glow(h, zap), x, 1.4, -0.85);
      part(h.torso, boxGeo(0.35, 0.2, 0.35), M(0xb87333), x, 0.8, -0.85);
    }
  }
  if (level >= 4) {
    // Sweeper: twin laser pods on the shoulders
    for (const x of [-1.25, 1.25]) {
      part(h.torso, boxGeo(0.6, 0.5, 1.0), M(0x37474f), x, 1.25, 0);
      part(h.torso, boxGeo(0.25, 0.25, 0.1), glow(h, 0xff1744), x, 1.25, 0.52);
    }
  }
  if (arc) {
    // Arc Reactor: a bright chest core and a halo ring floating overhead
    part(h.torso, boxGeo(0.7, 0.7, 0.12), glow(h, 0xffffff), 0, 0.35, 0.52);
    part(h.torso, boxGeo(1.0, 1.0, 0.06), glow(h, zap), 0, 0.35, 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(h.body, boxGeo(0.4, 0.15, 0.4), glow(h, zap), Math.cos(a) * 1.4, 6.6, Math.sin(a) * 1.4);
    }
  }
  // Pulse emitter: a flat disc held out in front with both hands, glowing core in the middle.
  const holder = new THREE.Group();
  holder.position.set(0, 3.0, 1.6);
  h.body.add(holder);
  const size = [1.0, 1.1, 1.2, 1.3, 1.4, 1.6][level];
  part(holder, boxGeo(size, 0.25, size), M(0x455a64), 0, 0, 0);
  const core = part(holder, boxGeo(size * 0.55, 0.35, size * 0.55), glow(h, zap), 0, 0.08, 0);
  core.rotation.y = 0.8;
  setMuzzle(h, holder, 0, 0.3, 0);
  h.rightArm.rotation.set(-1.1, 0, 0.3);
  h.leftArm.rotation.set(-1.1, 0, -0.3);
  h.pose = { right: -1.1, left: -1.1, leftRecoil: 0.05 };
  h.recoilScale = 0.12;
  h.tracer = zap;
  return h;
}

// ------------------------------------------------------------------ units (spawned vehicles & squads)

/** Model holder for non-humanoid things (buildings, vehicles). Same shape as a humanoid's handles. */
function makeThing() {
  const mats = [];
  const M = (color) => {
    const m = new THREE.MeshLambertMaterial({ color });
    mats.push(m);
    return m;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  return { root, body, mats, M, muzzles: [], static: true };
}

function wheels(u, mat, xs, zs, y = 0.55, size = 1.1) {
  for (const x of xs) for (const z of zs) u.wheels.push(part(u.body, boxGeo(0.6, size, size), mat, x, y, z));
}

/** A turret group on `u.body` at height y; units turn it toward their target. */
function turret(u, y, z = 0) {
  const t = new THREE.Group();
  t.position.set(0, y, z);
  u.body.add(t);
  u.turret = t;
  return t;
}

function gunMuzzle(u, parent, x, y, z) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  u.muzzles.push(m);
  return m;
}

/** A small soldier for squads. Look depends on the Barracks level. */
function makeTrooper(model) {
  const look = {
    squad: { shirt: 0x6b7d3a, pants: 0x4b5320, helm: 0x556b2f },
    specops: { shirt: 0x263238, pants: 0x1c2429, helm: 0x212121, goggles: 0x76ff03 },
    legion: { shirt: 0x5d4037, pants: 0x3e2723, helm: 0x8d6e63, goggles: 0xffab40 },
    fortress: { shirt: 0x1a237e, pants: 0x0d1440, helm: 0x3949ab, goggles: 0x00e5ff, armor: true },
  }[model];
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: look.shirt, pants: look.pants, arms: look.shirt, face: 'soldier' });
  helmet(h, look.helm);
  if (look.goggles) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, look.goggles), 0, 1.0, 0.68);
  if (look.armor) part(h.torso, boxGeo(2.2, 1.8, 1.2), h.M(0x3949ab), 0, 0.05, 0);
  holdLongGun(h, 1.5, h.M(0x262626));
  return h;
}

const GOONS = ['pistolgoon', 'tommygoon', 'dongoon'];

/**
 * Unit models, facing +Z. Returns { root, body, mats, turret?, muzzles, wheels, legs?, soldiers?, height }.
 * model: jeep, gunjeep, tank, humvee, humvee2, humvee3, railtank, m1, m2, m11, stryker, apc, missileapc, a squad (squad, specops, legion,
 * fortress) with `count` soldiers, or a Crook Boss goon (pistolgoon, tommygoon, dongoon).
 */
export function makeUnit(model, count = 1) {
  const u = makeThing();
  u.wheels = [];
  const { M } = u;
  const goon = GOONS.includes(model);
  const merc = /^m(rifle|gren|riot|medic)\d*$/.test(model);
  const skel = model.startsWith('skel');
  if (goon || merc || skel || ['squad', 'specops', 'legion', 'fortress'].includes(model)) {
    u.soldiers = [];
    for (let i = 0; i < count; i++) {
      const h = goon ? makeGoon(model) : merc ? makeMerc(model) : skel ? makeSkeleton(model) : makeTrooper(model);
      h.root.scale.setScalar(0.6 * (h.size ?? 1));
      h.root.position.set((i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
      u.body.add(h.root);
      u.mats.push(...h.mats);
      u.soldiers.push(h);
      u.muzzles.push(h.muzzles[0]);
    }
    u.height = 3.5 * (u.soldiers[0].size ?? 1);
    if (skel) {
      u.tracer = u.soldiers[0].tracer;
      return u;
    }
    u.tracer = model === 'fortress' || model === 'mrifle3' ? 0x00e5ff : model.startsWith('mriot') ? 0xb0bec5 : 0xffc107;
    if (merc) u.projectile = u.soldiers[0].projectile;
    return u;
  }
  const tire = M(0x1b1b1b);
  if (model === 'jeep' || model === 'gunjeep') {
    const paint = M(0x6b8e23);
    part(u.body, boxGeo(2.6, 1.0, 4.4), paint, 0, 1.2, 0);
    part(u.body, boxGeo(2.4, 0.9, 1.6), paint, 0, 2.1, -0.6); // cabin
    part(u.body, boxGeo(2.3, 0.7, 0.1), M(0x90caf9), 0, 2.1, 0.25); // windshield
    part(u.body, boxGeo(2.8, 0.4, 0.4), M(0x9e9e9e), 0, 1.0, 2.3); // spiked bumper
    for (const x of [-1, -0.33, 0.33, 1]) part(u.body, boxGeo(0.15, 0.15, 0.5), M(0xbdbdbd), x, 1.0, 2.7);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), -0.8, 1.4, 2.21);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), 0.8, 1.4, 2.21);
    wheels(u, tire, [-1.35, 1.35], [-1.4, 1.4]);
    if (model === 'gunjeep') {
      const t = turret(u, 2.6, -0.8);
      part(t, boxGeo(0.9, 0.6, 0.9), M(0x37474f), 0, 0.3, 0);
      part(t, boxGeo(0.25, 0.25, 1.8), M(0x212121), 0, 0.45, 0.9);
      gunMuzzle(u, t, 0, 0.45, 1.8);
    } else gunMuzzle(u, u.body, 0, 1.2, 2.4);
    u.height = 3.2;
    u.tracer = 0xffd54f;
  } else if (model === 'tank') {
    const paint = M(0x556b2f);
    part(u.body, boxGeo(3.4, 1.3, 5.2), paint, 0, 1.2, 0);
    for (const x of [-1.8, 1.8]) part(u.body, boxGeo(0.8, 1.2, 5.4), tire, x, 0.7, 0); // tracks
    const t = turret(u, 2.3);
    part(t, boxGeo(2.4, 1.0, 2.6), M(0x4b5a2a), 0, 0.5, -0.2);
    part(t, boxGeo(0.45, 0.45, 3.2), M(0x3a4520), 0, 0.55, 2.4); // cannon
    part(t, boxGeo(0.2, 0.2, 1.2), M(0x212121), 0.8, 1.2, 0.6); // machine gun
    u.cannon = gunMuzzle(u, t, 0, 0.55, 4.0);
    u.muzzles.pop(); // the cannon muzzle is separate from the gun muzzle
    gunMuzzle(u, t, 0.8, 1.2, 1.2);
    u.height = 3.8;
    u.tracer = 0xffab40;
  } else if (model === 'humvee' || model === 'humvee2' || model === 'humvee3') {
    // Military Base Humvees: wide, boxy, desert tan. Humvee 2+ gets armor plates, Humvee 3 a gun turret.
    const paint = M(0xc2a878);
    const armored = model !== 'humvee';
    part(u.body, boxGeo(3.0, 1.1, 4.8), paint, 0, 1.25, 0);
    part(u.body, boxGeo(2.8, 1.0, 2.2), paint, 0, 2.3, -0.5); // cabin
    part(u.body, boxGeo(2.6, 0.6, 0.1), M(0x90caf9), 0, 2.4, 0.62); // windshield
    part(u.body, boxGeo(3.1, 0.5, 0.5), M(0x5d4037), 0, 1.05, 2.5); // push bar
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), -0.9, 1.5, 2.41);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), 0.9, 1.5, 2.41);
    if (armored) {
      const plate = M(0x8d7b5a);
      for (const x of [-1.55, 1.55]) part(u.body, boxGeo(0.12, 0.9, 3.6), plate, x, 1.5, -0.2);
      part(u.body, boxGeo(2.8, 0.15, 1.2), plate, 0, 1.85, 1.6); // hood plate
    }
    wheels(u, tire, [-1.5, 1.5], [-1.6, 1.6], 0.6, 1.2);
    if (model === 'humvee3') {
      const t = turret(u, 2.8, -0.6);
      part(t, boxGeo(1.4, 0.5, 1.4), M(0x6d5f45), 0, 0.25, 0); // ring
      part(t, boxGeo(1.2, 0.8, 0.12), M(0x6d5f45), 0, 0.7, 0.6); // gun shield
      part(t, boxGeo(0.25, 0.25, 1.9), M(0x212121), 0, 0.75, 1.1);
      gunMuzzle(u, t, 0, 0.75, 2.05);
    } else gunMuzzle(u, u.body, 0, 1.2, 2.8);
    u.height = 3.4;
    u.tracer = 0xffd54f;
  } else if (model === 'railtank') {
    // Railgun Tank: a dark heavy tank with a long glowing rail cannon and a coaxial gun.
    const paint = M(0x37474f);
    const rail = glow(u, 0x40c4ff);
    part(u.body, boxGeo(3.8, 1.4, 5.8), paint, 0, 1.3, 0);
    for (const x of [-2.0, 2.0]) part(u.body, boxGeo(0.9, 1.3, 6.0), tire, x, 0.7, 0); // tracks
    part(u.body, boxGeo(3.4, 0.4, 0.6), rail, 0, 1.4, 2.95); // glowing front strip
    const t = turret(u, 2.5);
    part(t, boxGeo(2.8, 1.1, 3.0), M(0x263238), 0, 0.55, -0.3);
    for (const x of [-0.35, 0.35]) part(t, boxGeo(0.22, 0.5, 4.4), M(0x455a64), x, 0.6, 2.8); // twin rails
    part(t, boxGeo(0.3, 0.3, 4.2), rail, 0, 0.6, 2.8); // charge between the rails
    u.cannon = gunMuzzle(u, t, 0, 0.6, 5.0);
    u.muzzles.pop();
    part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), 1.0, 1.3, 0.7);
    gunMuzzle(u, t, 1.0, 1.3, 1.4);
    part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), -1.0, 1.3, 0.7);
    gunMuzzle(u, t, -1.0, 1.3, 1.4);
    u.height = 4.2;
    u.tracer = 0x40c4ff;
  } else if (model === 'apc' || model === 'missileapc') {
    // Support Caravan APCs: eight-wheeled, sand colored. The Missile APC carries a launcher box.
    const paint = M(0xa1886b);
    part(u.body, boxGeo(3.0, 1.5, 5.8), paint, 0, 1.6, 0);
    part(u.body, boxGeo(3.0, 0.6, 1.2), paint, 0, 1.2, 3.1); // sloped nose
    part(u.body, boxGeo(2.4, 0.4, 0.1), M(0x90caf9), 0, 2.0, 2.95); // vision slit
    wheels(u, tire, [-1.55, 1.55], [-2.1, -0.7, 0.7, 2.1], 0.6, 1.2);
    const t = turret(u, 2.4, -0.4);
    part(t, boxGeo(1.3, 0.6, 1.3), M(0x7d6a52), 0, 0.3, 0);
    part(t, boxGeo(0.25, 0.25, 1.9), M(0x212121), 0, 0.45, 1.0);
    gunMuzzle(u, t, 0, 0.45, 2.0);
    if (model === 'missileapc') {
      const pod = part(t, boxGeo(1.6, 1.0, 2.0), M(0x5d4f3c), 0, 1.2, -0.4);
      for (const x of [-0.4, 0.4]) for (const y of [-0.2, 0.2]) part(pod, boxGeo(0.3, 0.3, 0.06), M(0xd84315), x, y, 1.02);
      u.cannon = gunMuzzle(u, t, 0, 1.2, 0.7);
      u.muzzles.pop(); // the missile pod fires separately from the gun
    }
    u.height = model === 'missileapc' ? 4.6 : 4;
    u.tracer = 0xffd54f;
  } else if (model === 'stryker') {
    const paint = M(0x8d8f6a);
    part(u.body, boxGeo(3.0, 1.6, 5.6), paint, 0, 1.6, 0);
    part(u.body, boxGeo(3.0, 0.6, 1.4), paint, 0, 1.3, 3.0); // sloped nose
    wheels(u, tire, [-1.55, 1.55], [-2.1, -0.7, 0.7, 2.1], 0.6, 1.2);
    const t = turret(u, 2.4, -0.5);
    part(t, boxGeo(1.2, 0.7, 1.2), M(0x6b6d4a), 0, 0.35, 0);
    part(t, boxGeo(0.25, 0.25, 1.8), M(0x212121), 0, 0.45, 1.0);
    gunMuzzle(u, t, 0, 0.45, 1.9);
    u.height = 4;
    u.tracer = 0xffd54f;
  } else {
    // Zed vehicles: m1 is a tracked tank-bot, m2 and m11 are walking mechs.
    const mech = model !== 'm1';
    const big = model === 'm11';
    const paint = M(big ? 0x212121 : mech ? 0x546e7a : 0x6d4c41);
    const trim = big ? glow(u, 0xff1744) : glow(u, 0xffc400);
    let hipY = 1.3;
    if (mech) {
      u.legs = [];
      hipY = big ? 4.2 : 3.4;
      for (const x of [-1.3, 1.3]) {
        const leg = new THREE.Group();
        leg.position.set(x * (big ? 1.25 : 1), hipY, 0);
        u.body.add(leg);
        part(leg, boxGeo(big ? 1.3 : 1.0, hipY, big ? 1.4 : 1.1), paint, 0, -hipY / 2, 0);
        part(leg, boxGeo(big ? 1.8 : 1.4, 0.5, big ? 2.4 : 1.9), M(0x263238), 0, -hipY + 0.25, 0.3); // foot
        u.legs.push(leg);
      }
    } else {
      for (const x of [-1.7, 1.7]) part(u.body, boxGeo(0.9, 1.4, 5), tire, x, 0.7, 0);
    }
    const s = big ? 1.35 : 1;
    part(u.body, boxGeo(3.2 * s, 1.8 * s, 3.4 * s), paint, 0, hipY + 0.9 * s, 0); // hull / torso
    part(u.body, boxGeo(1.6 * s, 0.5 * s, 0.1), trim, 0, hipY + 1.3 * s, 1.71 * s); // eye slit
    const t = turret(u, hipY + 1.8 * s);
    part(t, boxGeo(1.8 * s, 0.9 * s, 2 * s), M(big ? 0x37474f : 0x795548), 0, 0.45 * s, 0);
    for (const x of [-0.5, 0.5]) {
      part(t, boxGeo(0.25, 0.25, 2.4 * s), M(0x212121), x * s, 0.45 * s, 1.6 * s);
      gunMuzzle(u, t, x * s, 0.45 * s, 2.8 * s);
    }
    // Arm cannon on the side (all Zed vehicles from Lv 3 have one; the M1 model shows it too).
    part(u.body, boxGeo(0.8 * s, 0.8 * s, 3 * s), M(0x424242), 2.1 * s, hipY + 0.9 * s, 0.6);
    part(u.body, boxGeo(0.5 * s, 0.5 * s, 0.1), trim, 2.1 * s, hipY + 0.9 * s, 2.15 * s);
    u.cannon = gunMuzzle(u, u.body, 2.1 * s, hipY + 0.9 * s, 2.2 * s);
    u.muzzles.pop(); // the cannon muzzle is separate from the gun muzzles
    u.height = hipY + 3.4 * s;
    u.tracer = big ? 0xff5252 : 0xffd54f;
  }
  return u;
}

// ------------------------------------------------------------------ spawner, income and support towers

/** Patrol: a garage with a flag and its current vehicle parked out front. */
export function makePatrol(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4, 0.3, 4), M(0x9e9e9e), 0, 0.15, 0); // concrete
  part(u.body, boxGeo(3.6, 3.0, 2.0), M(0x8d6e63), 0, 1.8, -1.0); // garage
  part(u.body, boxGeo(3.9, 0.3, 2.3), M(0x5d4037), 0, 3.4, -1.0); // roof
  part(u.body, boxGeo(2.6, 2.2, 0.1), M(0x616161), 0, 1.4, 0.02); // door
  for (let i = 0; i < 4; i++) part(u.body, boxGeo(2.6, 0.08, 0.12), M(0x424242), 0, 0.6 + i * 0.5, 0.05);
  part(u.body, boxGeo(0.15, 3.5, 0.15), M(0xbdbdbd), 1.7, 4.8, -1.8); // flag pole
  part(u.body, boxGeo(0.05, 0.9, 1.4), M(0x1e88e5), 1.7, 6.0, -1.1);
  const car = makeUnit(level >= 4 ? 'tank' : level >= 3 ? 'gunjeep' : 'jeep');
  car.root.scale.setScalar(0.42);
  car.root.position.set(0, 0.3, 1.2);
  car.root.rotation.y = Math.PI / 2;
  u.body.add(car.root);
  u.mats.push(...car.mats);
  if (level >= 1) {
    // Spiked Bumper: a spiked barrier and a big bumper bolted above the door
    const spikeM = M(0xbdbdbd);
    part(u.body, boxGeo(3.6, 0.35, 0.3), M(0x424242), 0, 2.75, 0.2);
    for (const x of [-1.4, -0.7, 0, 0.7, 1.4]) part(u.body, boxGeo(0.18, 0.18, 0.6), spikeM, x, 2.75, 0.55);
    part(u.body, boxGeo(0.3, 0.3, 0.9), spikeM, 1.7, 0.45, 1.6).rotation.y = 0.6;
    part(u.body, boxGeo(0.3, 0.3, 0.9), spikeM, 1.7, 0.45, 1.6).rotation.y = -0.6;
  }
  if (level >= 2) {
    // Suicide Mission: explosive drums and hazard stripes on the door
    for (const [x, z] of [[-1.6, 1.4], [-1.6, 0.7], [-1.0, 1.6]]) part(u.body, boxGeo(0.6, 0.9, 0.6), M(0xc62828), x, 0.75, z);
    for (let i = 0; i < 4; i++) part(u.body, boxGeo(0.5, 2.2, 0.05), M(0xfdd835), -0.95 + i * 0.65, 1.4, 0.1);
  }
  if (level >= 3) {
    // Mounted Gunner: a sandbagged machine-gun nest on the roof
    const bag = M(0xa1887f);
    for (const x of [-1.2, 0, 1.2]) part(u.body, boxGeo(1.1, 0.5, 0.6), bag, x, 3.8, -0.3);
    part(u.body, boxGeo(0.35, 0.35, 1.6), M(0x212121), 0, 4.2, 0.2);
  }
  return u;
}

/**
 * Military Base (alternate Patrol form): a concrete compound with a hangar and its current
 * vehicle parked out front. Lv 2 adds barbed-wire fencing, Lv 3 a sandbag gun nest, Lv 4 a
 * radar dish for the Airstrike, Lv 5 a glowing railgun charging station.
 */
export function makeMilitaryBase(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.6, 0.3, 4.6), M(0x8d8d8d), 0, 0.15, 0); // concrete pad
  part(u.body, boxGeo(4.0, 2.8, 2.0), M(0x6b6b4e), 0, 1.7, -1.2); // hangar
  part(u.body, boxGeo(4.3, 0.35, 2.3), M(0x4a4a36), 0, 3.25, -1.2); // roof
  part(u.body, boxGeo(2.8, 2.2, 0.1), M(0x3e3e30), 0, 1.4, -0.18); // door
  part(u.body, boxGeo(1.6, 0.5, 0.06), M(0xfafafa), 0, 2.85, -0.14); // sign
  part(u.body, boxGeo(0.6, 0.3, 0.07), M(0x2e7d32), 0, 2.85, -0.12);
  part(u.body, boxGeo(0.15, 3.8, 0.15), M(0xbdbdbd), -2.0, 2.0, -2.0); // flag pole
  part(u.body, boxGeo(0.05, 0.9, 1.4), M(0x2e7d32), -2.0, 3.4, -1.3);
  const car = makeUnit(['humvee', 'humvee', 'humvee2', 'humvee3', 'tank', 'railtank'][level] ?? 'humvee');
  car.root.scale.setScalar(0.4);
  car.root.position.set(0, 0.3, 1.3);
  car.root.rotation.y = Math.PI / 2;
  u.body.add(car.root);
  u.mats.push(...car.mats);
  if (level >= 1) {
    // Barbed Wire: fence posts along the front corners with wire strands
    const post = M(0x5d4037);
    const wire = M(0x9e9e9e);
    for (const x of [-2.15, 2.15]) {
      for (const z of [-0.3, 0.9, 2.1]) part(u.body, boxGeo(0.15, 1.2, 0.15), post, x, 0.9, z);
      for (const y of [0.7, 1.1, 1.45]) part(u.body, boxGeo(0.05, 0.05, 2.5), wire, x, y, 0.9);
    }
  }
  if (level >= 2) {
    // Armor Plating: spare armor plates leaning on the hangar
    for (const x of [1.4, 1.75]) part(u.body, boxGeo(0.12, 1.4, 0.9), M(0x8d7b5a), x, 1.0, 0.2).rotation.z = 0.15;
  }
  if (level >= 3) {
    // Mounted Gunner: a sandbagged gun nest on the roof
    const bag = M(0xa1887f);
    for (const x of [-1.3, 0, 1.3]) part(u.body, boxGeo(1.2, 0.5, 0.6), bag, x, 3.65, -0.5);
    part(u.body, boxGeo(0.3, 0.3, 1.5), M(0x212121), 0, 4.05, -0.1);
  }
  if (level >= 4) {
    // Tank / Airstrike: a radar mast with a dish
    part(u.body, boxGeo(0.2, 1.8, 0.2), M(0x757575), 1.5, 4.3, -1.8);
    const dish = part(u.body, boxGeo(1.4, 1.0, 0.15), M(0xe0e0e0), 1.5, 5.3, -1.6);
    dish.rotation.x = -0.5;
    part(u.body, boxGeo(0.2, 0.2, 0.2), glow(u, 0xff1744), 1.5, 5.9, -1.8);
  }
  if (level >= 5) {
    // Railgun Tank: a charging pylon with glowing coils
    const coil = glow(u, 0x40c4ff);
    part(u.body, boxGeo(0.6, 2.4, 0.6), M(0x37474f), -1.7, 1.5, 1.8);
    for (const y of [0.9, 1.6, 2.3]) part(u.body, boxGeo(0.8, 0.15, 0.8), coil, -1.7, y, 1.8);
  }
  return u;
}

/** Barracks: a tent with sandbags; becomes a stone fort at Lv 5. */
export function makeBarracks(level) {
  const u = makeThing();
  const { M } = u;
  const fort = level >= 4;
  if (fort) {
    const stone = M(0x78909c);
    part(u.body, boxGeo(3.8, 3.2, 3.4), stone, 0, 1.6, -0.2);
    for (const x of [-1.6, -0.55, 0.55, 1.6]) part(u.body, boxGeo(0.6, 0.6, 3.4), stone, x, 3.5, -0.2); // battlements
    part(u.body, boxGeo(1.4, 2.0, 0.1), M(0x3e2723), 0, 1.0, 1.52);
  } else {
    const canvas = M([0x6b7d3a, 0xc2a878, 0x37474f, 0x7b1f1f][level]); // olive, desert tan, spec-ops grey, legion red
    const l = part(u.body, boxGeo(0.2, 3.4, 3.6), canvas, -1.0, 1.4, -0.2);
    l.rotation.z = -0.6;
    const r = part(u.body, boxGeo(0.2, 3.4, 3.6), canvas, 1.0, 1.4, -0.2);
    r.rotation.z = 0.6;
    part(u.body, boxGeo(1.2, 2.2, 0.1), M(0x212121), 0, 1.1, 1.5); // dark entrance
  }
  const bag = M(0xc2a878);
  for (const x of [-1.6, -0.8, 0.8, 1.6]) part(u.body, boxGeo(0.75, 0.45, 0.6), bag, x, 0.25, 1.8);
  if (level >= 1) for (const x of [-1.2, 1.2]) part(u.body, boxGeo(0.75, 0.45, 0.6), bag, x, 0.7, 1.8);
  if (level >= 3) {
    // Legion: a weapons rack and a crate of gear out front
    part(u.body, boxGeo(0.9, 0.7, 0.7), M(0x5d4037), 1.6, 0.35, 0.8);
    part(u.body, boxGeo(1.6, 0.15, 0.2), M(0x3e2723), -0.2, 1.3, 2.3);
    for (const x of [-0.7, -0.2, 0.3]) part(u.body, boxGeo(0.15, 1.4, 0.15), M(0x212121), x, 0.95, 2.4);
  }
  part(u.body, boxGeo(0.15, 3.0, 0.15), M(0xbdbdbd), -1.7, fort ? 5.2 : 3.0, -1.5);
  part(u.body, boxGeo(0.05, 0.8, 1.2), M(level >= 3 ? 0xffb300 : level >= 2 ? 0x212121 : 0xc62828), -1.7, fort ? 6.2 : 4.0, -0.9);
  return u;
}

/** Zed: a hangar with its vehicle (M1, then mechs) standing guard. */
export function makeZed(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.2, 0.3, 4.2), M(0x616161), 0, 0.15, 0);
  for (const x of [-1.95, 1.95]) part(u.body, boxGeo(0.3, 3.6, 3.6), M(0x455a64), x, 1.8, -0.2);
  part(u.body, boxGeo(4.2, 0.4, 3.6), M(0x37474f), 0, 3.7, -0.2);
  part(u.body, boxGeo(3.0, 0.3, 0.1), glow(u, 0xffc400), 0, 3.5, 1.6);
  if (level >= 1) {
    // Spiked Tracks: spiked rails along the hangar floor
    const spikeM = M(0xbdbdbd);
    for (const x of [-1.5, 1.5]) {
      part(u.body, boxGeo(0.3, 0.3, 3.4), M(0x424242), x, 0.45, 0.1);
      for (const z of [-1.2, -0.4, 0.4, 1.2]) part(u.body, boxGeo(0.3, 0.8, 0.3), spikeM, x, 1.0, z);
    }
  }
  if (level >= 2) {
    // Arm Cannon: a cannon turret mounted on the hangar roof
    part(u.body, boxGeo(1.4, 0.8, 1.4), M(0x546e7a), 0, 4.3, -0.4);
    part(u.body, boxGeo(0.4, 0.4, 2.2), M(0x263238), 0, 4.4, 0.9);
    part(u.body, boxGeo(0.5, 0.5, 0.15), glow(u, 0xff6d00), 0, 4.4, 2.0);
  }
  const v = makeUnit(['m1', 'm1', 'm1', 'm2', 'm11'][level]);
  v.root.scale.setScalar(level >= 4 ? 0.42 : level >= 3 ? 0.5 : 0.6);
  v.root.position.set(0, 0.3, 0.2);
  u.body.add(v.root);
  u.mats.push(...v.mats);
  return u;
}

/** Farm: crop rows and a barn; more crops, a silo, an orchard, then glowing fruit. */
export function makeFarm(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.2, 0.3, 4.2), M(0x6d4c41), 0, 0.15, 0); // soil
  const barnM = M(0xc62828);
  part(u.body, boxGeo(2.2, 2.0, 1.8), barnM, -0.9, 1.3, -1.1);
  const roof = M(0x4e342e);
  const r1 = part(u.body, boxGeo(1.4, 0.2, 2.0), roof, -1.45, 2.6, -1.1);
  r1.rotation.z = 0.6;
  const r2 = part(u.body, boxGeo(1.4, 0.2, 2.0), roof, -0.35, 2.6, -1.1);
  r2.rotation.z = -0.6;
  part(u.body, boxGeo(0.9, 1.2, 0.1), M(0xfafafa), -0.9, 0.9, -0.18);
  const crop = M(level >= 4 ? 0xffeb3b : level >= 2 ? 0x8bc34a : 0x689f38);
  const rows = Math.min(4, 2 + level);
  for (let i = 0; i < rows; i++) for (let j = 0; j < 3; j++) part(u.body, boxGeo(0.45, 0.6 + level * 0.1, 0.45), crop, -1.6 + j * 0.8, 0.6, 0.3 + i * 0.5);
  if (level >= 2) {
    // Plantation: a silo
    part(u.body, boxGeo(1.1, 3.6, 1.1), M(0xb0bec5), 1.4, 2.1, -1.3);
    part(u.body, boxGeo(1.2, 0.5, 1.2), M(0x78909c), 1.4, 4.1, -1.3);
  }
  if (level >= 3) {
    // Orchard: little fruit trees
    for (const z of [0.4, 1.5]) {
      part(u.body, boxGeo(0.25, 1.0, 0.25), M(0x5d4037), 1.5, 0.8, z);
      part(u.body, boxGeo(0.9, 0.9, 0.9), M(0x388e3c), 1.5, 1.7, z);
      part(u.body, boxGeo(0.2, 0.2, 0.2), level >= 4 ? glow(u, 0x00e5ff) : M(0xff5252), 1.5, 1.6, z + 0.5);
    }
  }
  return u;
}

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
function addRevolver(h, arm, gold) {
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

/**
 * Cowboy: hat, neckerchief and a revolver. Lv 2 a lucky horseshoe on the belt, Lv 3 a long duster
 * and a gold star, Lv 4 a second revolver and a bandolier, Lv 5 dressed all in black as an outlaw
 * with a red mask and gold six-shooters.
 */
export function makeCowboy(level) {
  const outlaw = level >= 5;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: outlaw ? 0x212121 : 0xc0703a, pants: outlaw ? 0x263238 : 0x3f6aa8, arms: outlaw ? 0x212121 : 0xc0703a });
  const { M } = h;
  // Cowboy hat: wide brim, tall crown and a band.
  const hat = M(outlaw ? 0x111111 : 0x8d5a2b);
  part(h.head, boxGeo(2.2, 0.12, 2.0), hat, 0, 1.25, 0);
  part(h.head, boxGeo(1.25, 0.65, 1.15), hat, 0, 1.6, 0);
  part(h.head, boxGeo(1.28, 0.16, 1.18), M(outlaw ? 0xc62828 : 0x3e2723), 0, 1.35, 0);
  // Boots and belt.
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.7, 1.15), M(0x4e342e), 0, -1.7, 0.05);
  part(h.torso, boxGeo(2.05, 0.3, 1.05), M(0x3e2723), 0, -0.85, 0);
  part(h.torso, boxGeo(0.45, 0.35, 0.1), M(0xffd54f), 0, -0.85, 0.53); // buckle
  // Neckerchief (a mask over the face when outlawed).
  const red = M(0xd32f2f);
  if (outlaw) part(h.head, boxGeo(1.24, 0.5, 1.24), red, 0, 0.3, 0.01);
  else if (level >= 1) part(h.torso, boxGeo(1.1, 0.4, 0.15), red, 0, 0.85, 0.55);
  if (level >= 2) {
    // Lucky Shot: a horseshoe hanging from the belt
    const shoe = M(0xb0bec5);
    part(h.torso, boxGeo(0.12, 0.45, 0.08), shoe, 0.55, -1.15, 0.55);
    part(h.torso, boxGeo(0.12, 0.45, 0.08), shoe, 0.85, -1.15, 0.55);
    part(h.torso, boxGeo(0.42, 0.12, 0.08), shoe, 0.7, -1.35, 0.55);
  }
  if (level >= 3) {
    // Deadly Precision: a long duster and a gold star
    const coat = M(outlaw ? 0x1b1b1b : 0x795548);
    part(h.torso, boxGeo(2.15, 2.6, 0.2), coat, 0, -0.35, -0.6);
    for (const x of [-0.95, 0.95]) part(h.torso, boxGeo(0.25, 2.6, 1.1), coat, x, -0.35, 0);
    part(h.torso, boxGeo(0.3, 0.3, 0.06), glow(h, 0xffd54f), -0.55, 0.45, 0.53);
  }
  if (level >= 4) {
    // Double Tap: a bandolier across the chest
    const band = part(h.torso, boxGeo(0.3, 2.6, 1.08), M(0x5d4037), 0, 0, 0);
    band.rotation.z = 0.7;
    for (let i = -2; i <= 2; i++) part(band, boxGeo(0.34, 0.14, 0.1), M(0xffc107), 0, i * 0.4, 0.55);
  }
  const guns = [addRevolver(h, h.rightArm, outlaw)];
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  if (level >= 4) {
    guns.push(addRevolver(h, h.leftArm, outlaw));
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    h.leftArm.rotation.set(-0.15, 0, -0.15); // thumb in the belt
    h.pose = { right: -Math.PI / 2, left: -0.15, leftRecoil: 0 };
  }
  h.muzzles = guns.map((g) => g.userData.muzzle);
  h.twirl = guns;
  h.tracer = outlaw ? 0xffc107 : 0xffe066;
  return h;
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

/**
 * Classic Soldier (alternate Soldier form): a rifleman in a beret. Lv 2 adds webbing, Lv 3 a
 * helmet and goggles, Lv 4 a tactical vest, Lv 5 dark gear with a red-dot rifle.
 */
export function makeSoldierClassic(level) {
  const elite = level >= 4;
  const shirt = elite ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: elite ? 0x1c1c22 : 0x4b5320, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x262626);
  if (level >= 2) {
    helmet(h, elite ? 0x37474f : 0x556b2f);
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.68, 0.63); // goggles
  } else part(h.head, boxGeo(1.35, 0.3, 1.35), M(0x8e1b1b), 0.1, 1.3, 0); // beret
  if (level >= 1) {
    const web = M(0x3e2723);
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 2.5, 1.12), web, 0, 0, 0).rotation.z = side * 0.6;
  }
  if (level >= 3) {
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(elite ? 0x37474f : 0x4a5232), 0, 0.05, 0);
    for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.4, 0.2), M(0x5d4037), x, -0.35, 0.65);
  }
  const gun = holdLongGun(h, 1.6, dark);
  part(gun, boxGeo(0.25, 0.45, 0.5), dark, 0, -0.55, -0.4); // mag
  part(gun, boxGeo(0.25, 0.5, 0.35), M(0x6d4c41), 0, 0.15, -0.05); // stock
  if (elite) part(gun, boxGeo(0.22, 0.3, 0.3), glow(h, 0xff1744), 0, -0.8, 0.32); // red dot
  h.tracer = elite ? 0xff8a65 : 0xffd54f;
  return h;
}

/**
 * Freezer (alternate Frost Trooper form): a polar explorer with a Frost Ray gun. Lv 2 adds a
 * fur-trimmed hood, Lv 3 a scarf and backpack tank, Lv 4 armor plates, Lv 5 a glowing ice bow-gun.
 */
export function makeFrostFreezer(level) {
  const coat = level >= 3 ? 0x1565c0 : 0x29b6f6;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x37474f, arms: coat, face: 'soldier' });
  const { M } = h;
  const ice = 0x80d8ff;
  part(h.head, boxGeo(1.32, 0.45, 1.32), M(0xeceff1), 0, 1.3, 0); // wool cap
  if (level >= 1) {
    part(h.head, boxGeo(1.55, 1.5, 0.3), M(0xf5f5f5), 0, 0.65, -0.6); // fur hood back
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.8, 0.63); // snow goggles
    part(h.head, boxGeo(1.0, 0.2, 0.06), glow(h, 0x4fc3f7), 0, 0.8, 0.69);
  }
  if (level >= 2) {
    part(h.torso, boxGeo(2.1, 0.45, 1.15), M(0xc62828), 0, 0.85, 0); // scarf
    part(h.torso, boxGeo(1.2, 1.6, 0.7), M(0x90a4ae), 0, 0.1, -0.85); // coolant tank
    part(h.torso, boxGeo(0.8, 0.8, 0.1), glow(h, ice), 0, 0.2, -1.22);
  }
  if (level >= 3) {
    const plate = M(0xb0bec5);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
  }
  const bow = level >= 4;
  const gun = holdLongGun(h, bow ? 1.9 : 1.5, M(bow ? 0xe1f5fe : 0x546e7a));
  part(gun, boxGeo(0.3, 0.5, 0.35), M(0x37474f), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.42, 0.42, 0.42), glow(h, ice), 0, -0.4, 0.25); // ice crystal core
  if (bow) {
    // Ice bow arms across the front of the gun.
    const arm = glow(h, ice);
    part(gun, boxGeo(2.2, 0.15, 0.15), arm, 0, -1.4, 0).rotation.y = 0;
    part(gun, boxGeo(0.15, 0.15, 0.9), arm, -1.05, -1.4, -0.35);
    part(gun, boxGeo(0.15, 0.15, 0.9), arm, 1.05, -1.4, -0.35);
  }
  h.tracer = ice;
  h.tracerWidth = 0.22;
  return h;
}

/**
 * Boomerang tower: an outback thrower in a wide-brim hat. The boomerang gets a steel edge at
 * Lv 2, wraps at Lv 3, a second one on the back at Lv 4, and turns gold at Lv 5.
 */
export function makeBoomerang(level) {
  const master = level >= 4;
  const h = makeHumanoid({ skin: 0xc68642, shirt: master ? 0x4e342e : 0xa1887f, pants: 0x5d4037, arms: 0xc68642, face: 'smile' });
  const { M } = h;
  const hat = M(master ? 0x3e2723 : 0x8d6e63);
  part(h.head, boxGeo(2.2, 0.15, 2.2), hat, 0, 1.25, 0); // brim
  part(h.head, boxGeo(1.3, 0.5, 1.3), hat, 0, 1.55, 0);
  if (master) part(h.head, boxGeo(1.35, 0.15, 1.35), M(0xffd54f), 0, 1.37, 0); // gold hat band
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // belt
  const color = master ? 0xffc107 : level >= 1 ? 0x90a4ae : 0x8d6e63;
  const wood = M(color);
  // A V-shaped boomerang held up and back in the throwing hand.
  const makeRang = (parent, y) => {
    const g = new THREE.Group();
    g.position.set(0, y, 0);
    parent.add(g);
    for (const a of [0.6, -0.6]) {
      const arm = part(g, boxGeo(0.25, 1.2, 0.4), wood, Math.sin(a) * 0.4, -Math.cos(a) * 0.4, 0);
      arm.rotation.z = a;
    }
    if (level >= 2) part(g, boxGeo(0.35, 0.35, 0.45), M(0xc62828), 0, 0, 0); // grip wrap
    return g;
  };
  const rang = makeRang(h.rightArm, -2.2);
  if (level >= 3) makeRang(h.torso, 0).position.set(0, 0.2, -0.6); // spare on the back
  setMuzzle(h, rang, 0, -0.4, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.3);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.6, left: -0.8, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color, size: master ? 1.25 : 1 };
  return h;
}

/**
 * Slime Trooper: a hazmat suit and a goo blaster with a slime tank. Lv 2 adds a bigger tank,
 * Lv 3 a gas mask, Lv 4 a second tank, Lv 5 a glowing explosive-goo cannon.
 */
export function makeSlime(level) {
  const suit = level >= 4 ? 0x33691e : 0xfdd835;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const { M } = h;
  const goo = 0x76ff03;
  part(h.head, boxGeo(1.45, 1.45, 1.45), M(suit), 0, 0.68, -0.05); // hood
  const visor = part(h.head, boxGeo(1.1, 0.7, 0.08), M(0x90caf9), 0, 0.7, 0.72);
  visor.material.transparent = true;
  visor.material.opacity = 0.7;
  if (level >= 2) {
    part(h.head, boxGeo(0.6, 0.5, 0.4), M(0x263238), 0, 0.3, 0.85); // gas mask filter
  }
  const tank = (x, tall) => {
    part(h.torso, boxGeo(0.7, tall, 0.7), M(0x607d8b), x, 0.1, -0.85);
    part(h.torso, boxGeo(0.5, tall * 0.7, 0.1), glow(h, goo), x, 0.1, -1.22);
  };
  tank(level >= 3 ? -0.45 : 0, level >= 1 ? 1.8 : 1.3);
  if (level >= 3) tank(0.45, 1.8);
  const cannon = level >= 4;
  const gun = holdLongGun(h, cannon ? 1.6 : 1.3, M(0x455a64));
  part(gun, boxGeo(cannon ? 0.7 : 0.5, 0.3, cannon ? 0.7 : 0.5), glow(h, goo), 0, -(cannon ? 1.5 : 1.2), 0); // goo nozzle
  part(gun, boxGeo(0.5, 0.6, 0.5), glow(h, goo), 0, -0.3, -0.35); // canister
  h.tracer = goo;
  h.tracerWidth = 0.32;
  return h;
}

/**
 * Assassin: a hooded ninja with a knife. Lv 2 adds a sash, Lv 3 a mask and second blade on the
 * back, Lv 4 glowing purple trim, Lv 5 a belt of throwing knives and a long glowing blade.
 */
export function makeAssassin(level) {
  const h = makeHumanoid({ skin: 0xd9a066, shirt: 0x1a1a24, pants: 0x14141c, arms: 0x1a1a24, face: 'agent' });
  const { M } = h;
  const cloth = M(0x22222e);
  part(h.head, boxGeo(1.45, 1.4, 1.4), cloth, 0, 0.7, -0.08); // hood
  part(h.head, boxGeo(1.25, 0.35, 0.1), M(0x111111), 0, 0.3, 0.62); // face mask
  const trim = level >= 3 ? glow(h, 0xb388ff) : M(0x8e1b1b);
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.35, 1.1), trim, 0, -0.6, 0); // sash
  if (level >= 2) {
    const back = part(h.torso, boxGeo(0.2, 2.2, 0.2), M(0xb0bec5), 0, 0.3, -0.62); // spare blade
    back.rotation.z = 0.6;
  }
  if (level >= 4) for (const x of [-0.7, -0.35, 0.35, 0.7]) part(h.torso, boxGeo(0.12, 0.5, 0.12), M(0xcfd8dc), x, -0.3, 0.6);
  const knife = new THREE.Group();
  knife.position.set(0, -1.9, 0);
  h.rightArm.add(knife);
  part(knife, boxGeo(0.25, 0.5, 0.25), M(0x3e2723), 0, -0.15, 0); // handle
  const len = level >= 4 ? 1.9 : level >= 2 ? 1.4 : 1.0;
  part(knife, boxGeo(0.1, len, 0.35), level >= 4 ? glow(h, 0xb388ff) : M(0xcfd8dc), 0, -0.4 - len / 2, 0);
  setMuzzle(h, knife, 0, -0.4 - len, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.swing = 1.7;
  h.melee = true;
  h.tracer = level >= 3 ? 0xb388ff : 0xffffff;
  return h;
}

// ------------------------------------------------------------------ alternate forms & new towers (set 2)

/**
 * Militant (alternate Rifleman form): a guerrilla fighter in a bandana with a long rifle.
 * Lv 2 adds a radio pack, Lv 3 a chest rig, Lv 4 a boonie hat and bigger rifle, Lv 5 black
 * stealth gear with a suppressor and glowing sight.
 */
export function makeMilitant(level) {
  const stealth = level >= 4;
  const shirt = stealth ? 0x1b1f24 : 0x6d6a3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: stealth ? 0x15181c : 0x4e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  if (level >= 3 && !stealth) {
    const hat = M(0x5d5a32);
    part(h.head, boxGeo(1.9, 0.12, 1.9), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.4, 1.3), hat, 0, 1.45, 0);
  } else part(h.head, boxGeo(1.32, 0.35, 1.32), M(stealth ? 0x263238 : 0xb71c1c), 0, 1.15, 0); // bandana
  if (stealth) part(h.head, boxGeo(1.25, 0.45, 0.1), M(0x111111), 0, 0.3, 0.62); // face wrap
  if (level >= 1) {
    part(h.torso, boxGeo(1.2, 1.4, 0.6), M(0x4b5320), 0, 0.1, -0.8); // radio pack
    part(h.torso, boxGeo(0.08, 1.6, 0.08), M(0x212121), -0.4, 1.5, -0.9); // antenna
  }
  if (level >= 2) {
    part(h.torso, boxGeo(2.1, 1.0, 1.15), M(stealth ? 0x263238 : 0x4a4628), 0, -0.2, 0); // chest rig
    for (const x of [-0.55, 0, 0.55]) part(h.torso, boxGeo(0.4, 0.45, 0.2), M(0x3e2723), x, -0.3, 0.62);
  }
  const dark = M(0x262626);
  const len = level >= 3 ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, dark);
  part(gun, boxGeo(0.25, 0.5, 0.45), dark, 0, -0.6, -0.4); // mag
  part(gun, boxGeo(0.25, 0.5, 0.35), M(stealth ? 0x37474f : 0x6d4c41), 0, 0.15, -0.05); // stock
  if (stealth) {
    part(gun, boxGeo(0.22, 0.8, 0.22), M(0x111111), 0, -len - 0.4, 0); // suppressor
    h.muzzles[0].position.y = -len - 0.8;
    part(gun, boxGeo(0.22, 0.4, 0.28), glow(h, 0x76ff03), 0, -0.9, 0.34); // night sight
  }
  h.tracer = stealth ? 0xb2ff59 : 0xffd54f;
  return h;
}

/**
 * Hunter (alternate Marksman form): a woodsman in an orange cap with a hunting rifle.
 * Lv 2 a scope, Lv 3 a survival pack, Lv 4 a camo poncho and longer rifle, Lv 5 a dark
 * night-hunter outfit with glowing night-vision goggles.
 */
export function makeHunter(level) {
  const night = level >= 4;
  const shirt = night ? 0x212121 : level >= 3 ? 0x5a6b34 : 0x8b5a2b;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: night ? 0x1a1a1a : 0x4e3b26, arms: shirt, face: 'soldier' });
  const { M } = h;
  const cap = M(night ? 0x263238 : 0xff6f00);
  part(h.head, boxGeo(1.35, 0.4, 1.35), cap, 0, 1.25, 0);
  part(h.head, boxGeo(1.3, 0.12, 0.5), cap, 0, 1.08, 0.75); // peak
  if (night) {
    part(h.head, boxGeo(1.0, 0.35, 0.3), M(0x212121), 0, 0.75, 0.7);
    for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.25, 0.25, 0.1), glow(h, 0x76ff03), x, 0.75, 0.87);
  }
  if (level >= 2) {
    part(h.torso, boxGeo(1.4, 1.7, 0.7), M(0x6d4c41), 0, 0, -0.85); // survival pack
    part(h.torso, boxGeo(1.5, 0.4, 0.5), M(0x33691e), 0, 1.0, -0.85); // bedroll
  }
  if (level >= 3) {
    part(h.torso, boxGeo(2.3, 1.0, 1.3), M(night ? 0x2e3b2e : 0x556b2f), 0, 0.55, 0); // poncho
  }
  const len = level >= 3 ? 2.8 : 2.4;
  const wood = M(night ? 0x263238 : 0x6d4c41);
  const gun = holdLongGun(h, len, wood);
  const dark = M(0x1a1a1a);
  part(gun, boxGeo(0.14, 0.7, 0.14), dark, 0, -len - 0.3, 0); // barrel tip
  h.muzzles[0].position.y = -len - 0.6;
  if (level >= 1) part(gun, boxGeo(0.24, 1.0, 0.3), dark, 0, -0.9, 0.35); // scope
  h.tracer = night ? 0xb2ff59 : 0xfff59d;
  h.tracerWidth = level >= 2 ? 0.24 : undefined;
  return h;
}

/**
 * Pump Shotgunner (alternate Shotgunner form): an enforcer in a cap with a pump shotgun.
 * Lv 2 shell belt, Lv 3 a vest, Lv 4 a helmet and heavier gun, Lv 5 a tactical drum shotgun.
 */
export function makeShotgunnerPump(level) {
  const tac = level >= 4;
  const shirt = tac ? 0x1c2833 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: tac ? 0x111a22 : 0x263238, arms: shirt, face: 'agent' });
  const { M } = h;
  if (level >= 3) helmet(h, tac ? 0x0d1b2a : 0x263238);
  else {
    const cap = M(0x0d47a1);
    part(h.head, boxGeo(1.35, 0.4, 1.35), cap, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.12, 0.5), cap, 0, 1.08, 0.75);
  }
  if (level >= 1) {
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0);
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) part(h.torso, boxGeo(0.15, 0.3, 0.15), M(0xd32f2f), x, -0.7, 0.6);
  }
  if (level >= 2) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(tac ? 0x263238 : 0x455a64), 0, 0.05, 0); // vest
  const len = tac ? 2.0 : level >= 3 ? 1.8 : 1.6;
  const gun = holdLongGun(h, len, M(0x212121));
  part(gun, boxGeo(0.42, 0.5, 0.52), M(0x5d4037), 0, -0.9, 0.05); // pump
  part(gun, boxGeo(0.3, 0.5, 0.4), M(tac ? 0x37474f : 0x4e342e), 0, 0.2, -0.05); // stock
  if (tac) {
    part(gun, boxGeo(0.6, 0.6, 0.6), M(0x424242), 0, -0.45, -0.5); // drum
    part(gun, boxGeo(0.2, 0.25, 0.25), glow(h, 0xff1744), 0, -1.2, 0.34);
  }
  h.tracer = 0xffab40;
  return h;
}

/**
 * Pyromancer (alternate Flamethrower form): a firefighter-turned-arsonist in a red coat.
 * Lv 2 a respirator and fuel tank, Lv 3 hazard stripes and a second tank, Lv 4 a heavy suit,
 * Lv 5 a blazing horned helmet and glowing napalm tanks.
 */
export function makePyromancer(level) {
  const maniac = level >= 4;
  const coat = maniac ? 0x3e2723 : 0xb71c1c;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x212121, arms: coat, face: 'soldier' });
  const { M } = h;
  const fire = 0xff6d00;
  part(h.head, boxGeo(1.45, 0.55, 1.45), M(maniac ? 0x212121 : 0xfdd835), 0, 1.3, 0); // fire helmet
  part(h.head, boxGeo(1.6, 0.12, 1.7), M(maniac ? 0x212121 : 0xfdd835), 0, 1.05, -0.1); // brim
  if (maniac) for (const x of [-0.6, 0.6]) part(h.head, boxGeo(0.2, 0.7, 0.2), glow(h, fire), x, 1.8, 0); // horns
  if (level >= 1) {
    part(h.head, boxGeo(0.6, 0.55, 0.4), M(0x37474f), 0, 0.35, 0.75); // respirator
    part(h.head, boxGeo(1.2, 0.35, 0.08), M(0xffa000), 0, 0.8, 0.66); // visor
  }
  if (level >= 2) for (const y of [-0.5, 0.3]) part(h.torso, boxGeo(2.08, 0.18, 1.08), M(0xffeb3b), 0, y, 0); // hazard stripes
  const tank = maniac ? glow(h, fire) : M(0xc62828);
  const tanks = level >= 2 ? [-0.45, 0.45] : [0];
  for (const x of tanks) part(h.torso, boxGeo(0.7, 2.0, 0.7), tank, x, 0.2, -0.85);
  if (level >= 3) part(h.torso, boxGeo(2.2, 1.0, 1.2), M(0x5d4037), 0, 0.6, 0); // heavy suit shoulders
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  h.rightArm.add(g);
  part(g, boxGeo(0.4, 1.5, 0.45), M(0x424242), 0, -0.75, 0);
  part(g, boxGeo(0.55, 0.3, 0.55), M(0x212121), 0, -1.55, 0);
  part(g, boxGeo(0.15, 0.15, 0.15), glow(h, fire), 0, -1.75, 0.2); // pilot light
  setMuzzle(h, g, 0, -1.85, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.05 };
  h.recoilScale = 0.1;
  return h;
}

/** The Ace Pilot's plane (faces +Z): a yellow racer, a blue warbird, a grey jet from Lv 4, a gold jet at Lv 5. */
function makeAcePlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const muzzle = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    muzzles.push(m);
  };
  let prop = null;
  if (level <= 2) {
    const body = M(level >= 2 ? 0x1565c0 : 0xfbc02d);
    const trim = M(level >= 2 ? 0xfafafa : 0x212121);
    part(bank, boxGeo(1.1, 1.1, 4.4), body, 0, 0, 0);
    part(bank, boxGeo(6, 0.2, 1.3), body, 0, -0.2, 0.5); // wings
    for (const x of [-2.2, 2.2]) part(bank, boxGeo(0.6, 0.22, 1.32), trim, x, -0.2, 0.5); // wing tips
    part(bank, boxGeo(2.2, 0.15, 0.8), body, 0, 0.1, -1.9);
    part(bank, boxGeo(0.15, 1.0, 0.9), trim, 0, 0.65, -1.9);
    part(bank, boxGeo(0.8, 0.45, 1.0), M(0x90caf9), 0, 0.7, 0.4);
    part(bank, boxGeo(0.7, 0.7, 0.4), M(0xc62828), 0, 0, 2.3); // red nose
    prop = new THREE.Group();
    prop.position.set(0, 0, 2.55);
    bank.add(prop);
    part(prop, boxGeo(0.3, 2.4, 0.1), M(0x3e2723), 0, 0, 0);
    if (level >= 1) for (const x of [-1.8, 1.8]) part(bank, boxGeo(0.4, 0.4, 0.9), M(0x263238), x, -0.55, 0.5); // bombs
    muzzle(-0.8, -0.2, 1.4);
    muzzle(0.8, -0.2, 1.4);
  } else {
    const gold = level >= 4;
    const body = M(gold ? 0xffc107 : 0x78909c);
    const dark = M(gold ? 0x5d4037 : 0x37474f);
    part(bank, boxGeo(1.0, 0.9, 5.4), body, 0, 0, 0);
    part(bank, boxGeo(0.55, 0.55, 1.0), dark, 0, -0.05, 3.1);
    part(bank, boxGeo(0.75, 0.45, 1.3), M(0x4fc3f7), 0, 0.55, 1.1);
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(3.0, 0.15, 1.8), body, side * 1.8, -0.1, -0.3);
      w.rotation.y = side * 0.5;
      part(bank, boxGeo(0.12, 1.1, 1.0), dark, side * 0.45, 0.75, -2.3).rotation.z = side * -0.3;
      part(bank, boxGeo(0.35, 0.35, 1.1), M(0x263238), side * 1.6, -0.45, 0.1); // bomb rack
    }
    part(bank, boxGeo(0.7, 0.7, 0.3), glow(h, gold ? 0xff3d00 : 0xff9100), 0, 0, -2.8);
    if (level >= 3) part(bank, boxGeo(0.5, 0.4, 0.5), glow(h, 0x00e5ff), 0, -0.6, 1.4); // spy camera
    muzzle(-0.55, -0.2, 2.4);
    muzzle(0.55, -0.2, 2.4);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles: [] };
  return { plane, muzzles };
}

/** Ace Pilot (alternate Aviator form): a flying ace in a bomber jacket, flight helmet from Lv 3. */
export function makeAviatorAce(level) {
  const jet = level >= 2;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x8d5524, pants: 0x3e4a5a, arms: 0x8d5524 });
  const { M } = h;
  if (jet) {
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(level >= 4 ? 0xffc107 : 0x546e7a), 0, 0.65, -0.03);
    part(h.head, boxGeo(1.2, 0.45, 0.08), M(0xff7043), 0, 0.7, 0.7);
  } else {
    const cap = M(0x4e342e);
    part(h.head, boxGeo(1.35, 0.6, 1.35), cap, 0, 1.0, -0.02);
    part(h.head, boxGeo(1.3, 0.12, 0.1), M(0x3e2723), 0, 1.05, 0.66);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.4, 0.3, 0.08), M(0xffe082), x, 1.05, 0.7);
  }
  part(h.torso, boxGeo(2.15, 0.45, 1.15), M(0xefebe9), 0, 0.85, 0); // fur collar
  if (level >= 1) part(h.torso, boxGeo(0.5, 0.5, 0.1), M(0xffd54f), -0.5, 0.2, 0.52); // ace badge
  if (level >= 3) part(h.head, boxGeo(0.08, 0.9, 0.08), M(0x212121), -0.7, 1.6, -0.2); // radio antenna
  // A small runway pad with stripes.
  part(h.root, boxGeo(3.6, 0.08, 1.0), M(0x424242), 0, 0.04, -1.6);
  for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.6, 0.1, 0.2), M(0xfafafa), x, 0.06, -1.6);
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makeAcePlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 12;
  h.tracer = level >= 4 ? 0xffab40 : 0xffe082;
  return h;
}

/**
 * Medic: a field medic in a white coat with a medi gun. Lv 2 a med bag, Lv 3 a big-brain
 * headset, Lv 4 a backpack tank, Lv 5 a gold-trimmed coat. Draws beams to shielded towers.
 */
export function makeMedic(level) {
  const doc = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xfafafa, pants: doc ? 0x1a237e : 0x546e7a, arms: 0xfafafa, face: 'smile' });
  const { M } = h;
  const red = M(0xd32f2f);
  // Red cross on the chest and the cap.
  part(h.torso, boxGeo(0.7, 0.22, 0.06), red, 0.4, 0.4, 0.52);
  part(h.torso, boxGeo(0.22, 0.7, 0.06), red, 0.4, 0.4, 0.52);
  part(h.head, boxGeo(1.32, 0.4, 1.32), M(0xfafafa), 0, 1.25, 0);
  part(h.head, boxGeo(0.4, 0.12, 0.06), red, 0, 1.3, 0.67);
  part(h.head, boxGeo(0.12, 0.4, 0.06), red, 0, 1.3, 0.67);
  if (level >= 1) {
    part(h.torso, boxGeo(0.8, 0.8, 0.9), M(0xc62828), -1.2, -0.8, 0); // med bag
    part(h.torso, boxGeo(0.2, 2.3, 1.12), M(0x5d4037), 0, 0.1, 0).rotation.z = 0.6;
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.5, 0.15, 0.15), M(0x212121), 0, 1.0, 0); // headset band
    part(h.head, boxGeo(0.45, 0.45, 0.2), glow(h, 0xff4081), 0, 1.65, 0); // brain light
  }
  if (level >= 3) {
    part(h.torso, boxGeo(1.2, 1.8, 0.7), M(0xb0bec5), 0, 0.1, -0.85); // medi tank
    part(h.torso, boxGeo(0.8, 1.2, 0.1), glow(h, 0xff5252), 0, 0.1, -1.22);
  }
  if (doc) for (const x of [-1.03, 1.03]) part(h.torso, boxGeo(0.1, 2, 1.05), M(0xffd54f), x, 0, 0); // gold trim
  const gun = holdLongGun(h, 1.3, M(0xeceff1));
  part(gun, boxGeo(0.45, 0.45, 0.5), red, 0, -0.5, 0.05);
  part(gun, boxGeo(0.3, 0.3, 0.3), glow(h, 0xff8a80), 0, -1.35, 0);
  h.muzzles[0].position.y = -1.45;
  h.medi = 0xff8a80;
  h.tracer = 0xff8a80;
  return h;
}

/** Fruit Farm (alternate Farm form): a new crop each level: carrots, wheat, trees, apples, glowing space fruit. */
export function makeFarmFruit(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.2, 0.3, 4.2), M(0x795548), 0, 0.15, 0); // soil
  // A little farmhouse with a blue roof.
  part(u.body, boxGeo(1.8, 1.6, 1.6), M(0xfff8e1), -1.1, 1.1, -1.2);
  const roof = M(0x1565c0);
  part(u.body, boxGeo(1.2, 0.2, 1.8), roof, -1.55, 2.2, -1.2).rotation.z = 0.6;
  part(u.body, boxGeo(1.2, 0.2, 1.8), roof, -0.65, 2.2, -1.2).rotation.z = -0.6;
  part(u.body, boxGeo(0.5, 0.8, 0.1), M(0x6d4c41), -1.1, 0.7, -0.38);
  // Fence posts.
  for (const x of [-1.9, -0.6, 0.7, 1.9]) part(u.body, boxGeo(0.15, 0.6, 0.15), M(0xa1887f), x, 0.55, 1.95);
  part(u.body, boxGeo(4.0, 0.12, 0.08), M(0xa1887f), 0, 0.7, 1.95);
  if (level <= 1) {
    // Carrots (Lv 1) or wheat (Lv 2) in rows
    const leaf = M(level ? 0xfbc02d : 0x43a047);
    const root = M(0xff7043);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const x = -1.5 + j * 0.8;
      const z = 0.1 + i * 0.6;
      part(u.body, boxGeo(0.25, level ? 0.9 : 0.4, 0.25), leaf, x, level ? 0.75 : 0.5, z);
      if (!level) part(u.body, boxGeo(0.2, 0.15, 0.2), root, x, 0.32, z);
    }
  } else {
    // Trees (Lv 3), apple trees (Lv 4) or space fruit trees (Lv 5).
    const fruit = level >= 4 ? glow(u, 0xd500f9) : M(0xe53935);
    const leaves = M(level >= 4 ? 0x1de9b6 : 0x2e7d32);
    for (const [x, z] of [[-1.2, 0.6], [0.2, 1.2], [1.4, 0.4], [1.3, -1.2]]) {
      part(u.body, boxGeo(0.3, 1.2, 0.3), M(0x5d4037), x, 0.9, z);
      part(u.body, boxGeo(1.0, 1.0, 1.0), leaves, x, 1.9, z);
      if (level >= 3) for (const [ox, oz] of [[0.5, 0], [-0.3, 0.5], [0, -0.5]]) part(u.body, boxGeo(0.25, 0.25, 0.25), fruit, x + ox, 1.8, z + oz);
    }
  }
  return u;
}

/**
 * Electroshocker: a lineman with a shock gun and coil pack. Lv 2 rubber gloves and goggles,
 * Lv 3 a Faraday vest, Lv 4 a big Tesla coil pack, Lv 5 a crackling Zeus cannon.
 */
export function makeElectro(level) {
  const zeus = level >= 4;
  const shirt = zeus ? 0x1a237e : 0xf9a825;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x37474f, arms: level >= 1 ? 0x212121 : shirt, face: 'soldier' });
  const { M } = h;
  const bolt = zeus ? 0xe1f5fe : 0x80d8ff;
  helmet(h, zeus ? 0x283593 : 0xfdd835);
  if (level >= 1) {
    part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x263238), 0, 0.8, 0.63);
    part(h.head, boxGeo(1.0, 0.18, 0.06), glow(h, bolt), 0, 0.8, 0.7);
  }
  if (level >= 2) {
    // Faraday's Vest: a metal mesh vest
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x90a4ae), 0, 0.05, 0);
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(2.18, 0.06, 1.18), M(0x546e7a), 0, y, 0);
  }
  // Coil pack on the back, taller each level.
  const coil = level >= 3 ? 2.6 : 1.6;
  part(h.torso, boxGeo(1.0, coil, 0.7), M(0x455a64), 0, 0.2 + (coil - 1.6) / 2, -0.85);
  for (let i = 0; i < (level >= 3 ? 4 : 2); i++) part(h.torso, boxGeo(1.2, 0.15, 0.85), M(0xb87333), 0, -0.3 + i * 0.6, -0.85);
  part(h.torso, boxGeo(0.4, 0.4, 0.4), glow(h, bolt), 0, 0.4 + coil, -0.85);
  const gun = holdLongGun(h, zeus ? 1.9 : 1.4, M(zeus ? 0x283593 : 0x424242));
  part(gun, boxGeo(0.5, 0.5, 0.5), M(0xb87333), 0, -0.5, 0); // copper coil
  part(gun, boxGeo(zeus ? 0.6 : 0.4, 0.3, zeus ? 0.6 : 0.4), glow(h, bolt), 0, zeus ? -1.9 : -1.4, 0);
  if (zeus) for (const s of [-1, 1]) part(gun, boxGeo(0.12, 0.8, 0.12), glow(h, bolt), s * 0.35, -1.6, 0);
  h.tracer = bolt;
  return h;
}

/**
 * Missile Rocketeer (alternate Rocketeer form): a heavy weapons trooper with a big tube.
 * Lv 2 a rocket pack, Lv 3 a helmet visor and vest, Lv 4 a heavier launcher, Lv 5 a quad
 * missile pod.
 */
export function makeRocketeerMissile(level) {
  const quad = level >= 4;
  const shirt = quad ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: quad ? 0x1c2429 : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, quad ? 0x37474f : 0x4b5320);
  if (level >= 2) {
    part(h.head, boxGeo(1.2, 0.4, 0.08), M(0xff8f00), 0, 0.75, 0.7); // visor
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(quad ? 0x37474f : 0x4a5232), 0, 0.05, 0);
  }
  if (level >= 1) {
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x4e342e), 0, 0, -0.85);
    for (const x of [-0.4, 0, 0.4]) part(h.torso, boxGeo(0.3, 0.6, 0.3), M(0xeceff1), x, 1.1, -0.85);
  }
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  if (quad) {
    // Quad launcher: four tubes in a box.
    part(gun, boxGeo(1.4, 2.6, 1.4), M(0x37474f), 0, -0.8, 0);
    for (const x of [-0.35, 0.35]) for (const z of [-0.35, 0.35]) part(gun, boxGeo(0.5, 0.1, 0.5), glow(h, 0xff3d00), x, -2.12, z);
    setMuzzle(h, gun, 0, -2.2, 0);
  } else {
    const w = level >= 3 ? 1.0 : 0.8;
    const len = level >= 3 ? 3.2 : 2.7;
    part(gun, boxGeo(w, len, w), M(level >= 3 ? 0x33691e : 0x616161), 0, -len / 2 + 0.6, 0);
    part(gun, boxGeo(w + 0.2, 0.35, w + 0.2), M(0x212121), 0, -len + 0.6, 0);
    if (level >= 2) part(gun, boxGeo(0.4, 1.0, 0.4), M(0x212121), 0, -0.8, w / 2 + 0.25);
    setMuzzle(h, gun, 0, -len + 0.4, 0);
  }
  part(gun, boxGeo(0.3, 0.5, 0.3), M(0x212121), 0, -0.3, -0.5); // grip
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.2 };
  h.projectile = quad ? { color: 0xeceff1, size: 0.9 } : { color: 0xff6d00, size: level >= 3 ? 1.3 : 1.1 };
  return h;
}

/**
 * Trapper: a backwoods trapper in a fur hat with a sack of traps. Lv 2 a spike bandolier,
 * Lv 3 a landmine satchel, Lv 4 a bigger pack, Lv 5 a bear trap on the back.
 */
export function makeTrapper(level) {
  const h = makeHumanoid({ skin: 0xd2a679, shirt: level >= 3 ? 0x4e342e : 0x6d4c41, pants: 0x3e2723, arms: 0x8d6e63, face: 'smile' });
  const { M } = h;
  const fur = M(0x8d6e63);
  part(h.head, boxGeo(1.45, 0.75, 1.45), fur, 0, 1.4, 0); // fur hat
  part(h.head, boxGeo(0.35, 0.35, 1.0), M(0x5d4037), 0, 1.3, -1.0); // tail
  const metal = M(0x90a4ae);
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x3e2723), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.25, 0.25, 0.3), metal, t * 0.75, t * -0.8, 0.65);
  }
  // Sack on the back, bigger at Lv 4.
  const sack = level >= 3 ? 1.9 : 1.4;
  part(h.torso, boxGeo(sack, sack, 0.8), M(0xa1887f), 0, 0.1, -0.9);
  if (level >= 2) part(h.torso, boxGeo(0.9, 0.7, 0.8), M(0x33402a), 1.25, -0.8, 0); // landmine satchel
  if (level >= 4) {
    // Bear trap strapped to the sack
    part(h.torso, boxGeo(1.5, 0.2, 0.2), metal, 0, 0.6, -1.4);
    part(h.torso, boxGeo(1.5, 0.2, 0.2), metal, 0, -0.4, -1.4);
    for (const x of [-0.6, -0.2, 0.2, 0.6]) part(h.torso, boxGeo(0.12, 0.3, 0.12), metal, x, 0.4, -1.45);
  }
  // A spike trap held in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  part(hand, boxGeo(0.9, 0.15, 0.9), M(0x5d4037), 0, -0.2, 0);
  for (const x of [-0.25, 0.25]) part(hand, boxGeo(0.12, 0.35, 0.12), metal, x, -0.4, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.6, left: -0.8, leftRecoil: 0 };
  h.swing = 1.8;
  h.projectile = { color: 0x8d6e63, size: 0.7, arc: 3 };
  return h;
}


// ------------------------------------------------------------------ Crook Boss and his goons

/** A tommy gun with a round drum magazine on `arm`. Returns its muzzle. */
function addTommyGun(h, arm, gold = false) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  const wood = h.M(0x6d4c41);
  const metal = h.M(gold ? 0xd4af37 : 0x2b2b2b);
  part(gun, boxGeo(0.34, 1.7, 0.42), metal, 0, -0.75, 0); // receiver + barrel
  part(gun, boxGeo(0.4, 0.5, 0.4), metal, 0, -1.55, 0); // finned barrel shroud
  part(gun, boxGeo(0.3, 0.6, 0.5), wood, 0, 0.25, -0.15); // stock
  part(gun, boxGeo(0.24, 0.3, 0.45), wood, 0, -1.15, 0.3); // front grip
  part(gun, boxGeo(0.24, 0.3, 0.45), wood, 0, -0.35, -0.32); // pistol grip
  part(gun, boxGeo(0.25, 0.75, 0.75), metal, 0, -0.65, -0.55); // drum magazine
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -1.85, 0);
  gun.add(muzzle);
  return muzzle;
}

/** Fedora: crown + brim + band. */
function fedora(h, color, band) {
  const m = h.M(color);
  part(h.head, boxGeo(1.9, 0.12, 1.9), m, 0, 1.22, 0); // brim
  part(h.head, boxGeo(1.3, 0.6, 1.25), m, 0, 1.55, 0); // crown
  part(h.head, boxGeo(1.32, 0.16, 1.27), h.M(band), 0, 1.33, 0); // band
}

/** Suit jacket lapels, shirt front and tie on the torso. */
function suit(h, shirt, tie) {
  part(h.torso, boxGeo(0.7, 1.6, 0.08), h.M(shirt), 0, 0.15, 0.52); // shirt front
  part(h.torso, boxGeo(0.25, 1.3, 0.1), h.M(tie), 0, 0.2, 0.56); // tie
}

/**
 * Crook Boss: a gangster in a pinstripe suit and fedora. Lv 2 adds shades and a gold watch,
 * Lv 3 a second pistol, Lv 4 a tommy gun, Lv 5 (The Godfather) a white suit, a cigar, a red
 * rose and a gold tommy gun.
 */
export function makeCrookBoss(level) {
  const don = level >= 4;
  const cloth = don ? 0xeeeeee : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: cloth, pants: don ? 0xe0e0e0 : 0x1c2429, arms: cloth, face: 'soldier' });
  const { M } = h;
  suit(h, don ? 0x212121 : 0xfafafa, don ? 0xb71c1c : 0x8e0000);
  if (!don) {
    // pinstripes
    for (const x of [-0.75, -0.45, 0.45, 0.75]) part(h.torso, boxGeo(0.05, 1.95, 1.02), M(0x546e7a), x, 0, 0);
  }
  fedora(h, don ? 0xfafafa : 0x212121, don ? 0x212121 : 0x8e0000);
  if (level >= 1) {
    // Quick Getaway: dark shades and a gold watch
    part(h.head, boxGeo(1.2, 0.25, 0.08), M(0x111111), 0, 0.68, 0.62);
    part(h.leftArm, boxGeo(1.05, 0.25, 1.05), M(0xd4af37), 0, -1.5, 0);
  }
  if (don) {
    part(h.head, boxGeo(0.12, 0.12, 0.5), M(0x5d4037), 0.25, 0.25, 0.75); // cigar
    part(h.head, boxGeo(0.13, 0.13, 0.08), glow(h, 0xff6d00), 0.25, 0.25, 1.0);
    part(h.torso, boxGeo(0.3, 0.3, 0.12), M(0xd50000), 0.65, 0.6, 0.55); // rose
    part(h.torso, boxGeo(2.1, 0.2, 1.1), M(0xd4af37), 0, -0.85, 0); // gold belt
  }
  let muzzles;
  if (level >= 3) {
    // Tommy Goons: the boss himself carries a tommy gun (gold at The Godfather)
    muzzles = [addTommyGun(h, h.rightArm, don)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
    h.recoilScale = 0.4;
  } else if (level >= 2) {
    // Double Trouble: a pistol in each hand
    muzzles = [addPistol(h, h.rightArm, false), addPistol(h, h.leftArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    muzzles = [addPistol(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.3, 0, -0.15);
    h.pose = { right: -Math.PI / 2, left: -0.3, leftRecoil: 0 };
  }
  h.muzzles = muzzles;
  h.tracer = don ? 0xffd740 : 0xffca28;
  return h;
}

/** A goon on foot: pistolgoon (flat cap, pistol), tommygoon (fedora, tommy gun), dongoon (bigger, red tie, armored vest). */
function makeGoon(model) {
  const tommy = model !== 'pistolgoon';
  const made = model === 'dongoon';
  const coat = made ? 0x1a1a1a : tommy ? 0x37474f : 0x5d4037;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: coat, pants: 0x212121, arms: coat, face: 'soldier' });
  suit(h, 0xeeeeee, made ? 0xd50000 : tommy ? 0x1a237e : 0x3e2723);
  if (tommy) fedora(h, made ? 0x111111 : 0x455a64, made ? 0xd50000 : 0x212121);
  else {
    const cap = h.M(0x795548);
    part(h.head, boxGeo(1.35, 0.35, 1.35), cap, 0, 1.3, 0); // flat cap
    part(h.head, boxGeo(1.2, 0.12, 0.5), cap, 0, 1.15, 0.75);
  }
  if (made) part(h.torso, boxGeo(2.15, 1.5, 1.12), h.M(0x424242), 0, 0.1, 0); // armored vest
  if (tommy) {
    h.muzzles = [addTommyGun(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  } else {
    h.muzzles = [addPistol(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  }
  return h;
}

/**
 * Minigunner (alternate Commando form): a heavy gunner with one huge minigun held in both hands.
 * Lv 2 gloves and knee pads, Lv 3 a tech visor and ammo pack, Lv 4 armor and a bigger gun,
 * Lv 5 a futuristic suit with a glowing purple minigun.
 */
export function makeMinigunner(level) {
  const future = level >= 4;
  const shirt = future ? 0x1c1726 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: future ? 0x14101c : 0x3e3a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.1); // a big guy for a big gun
  const shard = glow(h, 0xb388ff);
  const dark = M(0x212121);
  // Beanie with the shard emblem (a helmet once geared up)
  const hat = M(future ? 0x263238 : level >= 3 ? 0x4b5320 : 0x37474f);
  part(h.head, boxGeo(1.4, level >= 3 ? 0.55 : 0.45, 1.4), hat, 0, 1.25, 0);
  part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.25, 0.72);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52); // chest emblem
  if (level >= 1) {
    // Improved Handling: gloves and knee pads
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), dark, 0, -1.75, 0);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), dark, 0, -1.2, 0.45);
  }
  if (level >= 2) {
    // Specialized Tech: a visor and an ammo backpack with a feed belt
    part(h.head, boxGeo(1.2, 0.3, 0.2), dark, 0, 0.72, 0.68);
    part(h.head, boxGeo(1.0, 0.18, 0.05), future ? shard : glow(h, 0x40c4ff), 0, 0.72, 0.79);
    part(h.torso, boxGeo(1.7, 1.9, 0.9), M(future ? 0x263238 : 0x4e4a3a), 0, 0, -0.95);
    part(h.torso, boxGeo(0.3, 0.3, 1.3), M(0xc9a227), 0.85, -0.6, -0.4);
  }
  if (level >= 3) {
    // Geared Up: armored vest and shoulder plates
    part(h.torso, boxGeo(2.2, 1.6, 1.2), M(future ? 0x2a2235 : 0x556b2f), 0, 0.1, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(future ? 0x2a2235 : 0x4b5320), 0, -0.2, 0);
  }
  if (future) part(h.torso, boxGeo(0.5, 0.5, 0.1), shard, 0, 0.3, 0.62); // glowing core

  // One huge minigun on the right arm, the left hand on its carry handle.
  const big = level >= 3 ? 1.25 : 1.1;
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  gun.scale.setScalar(big);
  h.rightArm.add(gun);
  const body = M(future ? 0x37474f : 0x424242);
  part(gun, boxGeo(0.8, 1.2, 0.85), body, 0, -0.5, 0);
  part(gun, boxGeo(0.25, 0.8, 0.25), dark, 0, -0.5, 0.55); // carry handle
  part(gun, boxGeo(0.45, 0.5, 0.9), M(0x3a3a3a), 0, -0.2, -0.7); // ammo feed
  const barrels = new THREE.Group();
  barrels.position.set(0, -1.1, 0);
  gun.add(barrels);
  const barrelMat = future ? shard : M(0x1f1f1f);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(barrels, boxGeo(0.15, 1.9, 0.15), barrelMat, Math.cos(a) * 0.27, -0.95, Math.sin(a) * 0.27);
  }
  for (const y of [-0.4, -1.7]) part(barrels, boxGeo(0.7, 0.12, 0.7), body, 0, y, 0); // barrel clamps
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -3.1, 0);
  gun.add(muzzle);
  h.muzzles = [muzzle];
  h.spin = [barrels];
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.1 };
  h.recoilScale = 0.2;
  h.tracer = future ? 0xb388ff : 0xffd740;
  return h;
}

/**
 * Ranger (alternate Railgunner form): a long-range marksman in a wide hat and duster coat.
 * Lv 2 a bandolier, Lv 3 a radio pack, Lv 4 an outlaw bandana and darker coat,
 * Lv 5 the Experimental Weapon of Destruction: a huge glowing purple cannon rifle.
 */
export function makeRanger(level) {
  const ewd = level >= 4;
  const outlaw = level >= 3;
  const coat = outlaw ? 0x3e2723 : 0x8d6e63;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: outlaw ? 0x212121 : 0x5d4037, arms: coat, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  const dark = M(0x1a1a1a);
  // Wide-brim ranger hat with the shard band
  const hat = M(outlaw ? 0x212121 : 0x6d4c41);
  part(h.head, boxGeo(1.4, 0.55, 1.4), hat, 0, 1.35, 0);
  part(h.head, boxGeo(2.1, 0.1, 2.1), hat, 0, 1.08, 0);
  part(h.head, boxGeo(1.45, 0.15, 1.45), shard, 0, 1.15, 0);
  part(h.torso, boxGeo(2.15, 1.0, 1.2), M(outlaw ? 0x2b1d18 : 0x795548), 0, -0.6, 0); // duster coat tails
  if (level >= 1) {
    // Faster Reloading: a bandolier of big rounds
    const belt = part(h.torso, boxGeo(0.35, 2.2, 1.15), M(0x4e342e), 0, 0, 0);
    belt.rotation.z = -0.7;
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.14, 0.32, 0.14), M(0xd4af37), -y * 0.8, y, 0.62);
  }
  if (level >= 2) {
    // Intelligence Radio: a radio backpack with a tall antenna and a blinking light
    part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x455a64), 0, 0, -0.85);
    part(h.torso, boxGeo(0.1, 2.2, 0.1), dark, 0.5, 1.8, -0.9);
    part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff5252), 0.5, 2.9, -0.9);
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0); // headset
  }
  if (outlaw) part(h.head, boxGeo(1.3, 0.45, 0.15), M(0x7f0000), 0, 0.4, 0.66); // bandana

  const len = ewd ? 4.2 : 3.6;
  const gun = holdLongGun(h, len, M(ewd ? 0x263238 : 0x5d4037));
  part(gun, boxGeo(0.26, 1.3, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.35, 0.6, 0.45), M(ewd ? 0x1c1726 : 0x4e342e), 0, 0.2, -0.05); // stock
  if (ewd) {
    // Experimental Weapon of Destruction: a fat cannon barrel wrapped in glowing coils
    part(gun, boxGeo(0.75, 2.4, 0.75), M(0x37474f), 0, -len + 1.1, 0);
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.85, 0.12, 0.85), shard, 0, -len + 0.2 + i * 0.55, 0);
    part(gun, boxGeo(0.6, 0.8, 0.6), M(0x455a64), 0, -0.4, -0.45); // power cell
    part(gun, boxGeo(0.3, 0.5, 0.1), shard, 0, -0.4, -0.76);
  } else {
    part(gun, boxGeo(0.18, 0.6, 0.18), dark, 0, -len - 0.2, 0); // muzzle brake
  }
  h.muzzles[0].position.y = -len - 0.4;
  h.tracer = ewd ? 0xb388ff : 0xffe082;
  h.tracerWidth = ewd ? 0.4 : 0.28;
  return h;
}

// ------------------------------------------------------------------ Pursuit & Gatling Gun

/**
 * The Pursuit's helicopter (faces +Z). `bank` tilts, `prop` (main rotor) and `tail` (tail
 * rotor) spin. Lv 2 AP ammo, Lv 3 a radar dome, Lv 4 missile pods. Top path: a grey gunship
 * with a chin minigun (Lv 5) and a huge black-and-red Leviathan (Lv 6). Bottom path: a desert
 * gunship with a sensor ball and big pods (Lv 5), and a dark Demolition Gunship (Lv 6).
 */
function makeHeli(h, level, bottom) {
  const { M } = h;
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  const top = level >= 4 && !bottom;
  const bot = level >= 4 && bottom;
  const big = level >= 5;
  const color = top ? (big ? 0x1c1c1c : 0x607d8b) : bot ? (big ? 0x263238 : 0xc2a46b) : 0x556b2f;
  const trimC = top && big ? 0xd50000 : bot && big ? 0xff6d00 : 0x37474f;
  const body = M(color);
  const trim = big ? glow(h, trimC) : M(trimC);
  const dark = M(0x212121);
  if (big) bank.scale.setScalar(1.25);

  part(bank, boxGeo(2.2, 2.0, 4.2), body, 0, 0, 0.3); // cabin
  part(bank, boxGeo(1.8, 1.3, 1.2), body, 0, -0.2, 2.8); // nose
  part(bank, boxGeo(1.7, 0.9, 1.0), M(0x81d4fa), 0, 0.45, 2.4); // windscreen
  part(bank, boxGeo(0.7, 0.7, 4.5), body, 0, 0.4, -3.8); // tail boom
  part(bank, boxGeo(0.15, 1.6, 1.0), body, 0, 1.1, -5.9); // tail fin
  part(bank, boxGeo(1.8, 0.12, 0.6), body, 0, 0.4, -5.4); // tail wings
  part(bank, boxGeo(2.3, 0.15, 0.5), trim, 0, -0.4, 0.3); // stripe
  for (const x of [-0.9, 0.9]) part(bank, boxGeo(0.15, 0.15, 3.6), dark, x, -1.35, 0.4); // skids
  for (const x of [-0.9, 0.9]) for (const z of [-0.6, 1.4]) part(bank, boxGeo(0.12, 0.4, 0.12), dark, x, -1.1, z);

  // Main rotor on a mast, tail rotor on the fin.
  part(bank, boxGeo(0.4, 0.6, 0.4), dark, 0, 1.3, 0.3);
  const prop = new THREE.Group();
  prop.position.set(0, 1.65, 0.3);
  bank.add(prop);
  const bladeM = M(0x2b2b2b);
  for (let i = 0; i < (big ? 4 : 2); i++) part(prop, boxGeo(0.35, 0.08, 9), bladeM, 0, 0, 0).rotation.y = (i * Math.PI) / (big ? 4 : 2);
  const tail = new THREE.Group();
  tail.position.set(0.15, 1.1, -5.9);
  bank.add(tail);
  part(tail, boxGeo(0.08, 2.0, 0.25), bladeM, 0, 0, 0);
  part(tail, boxGeo(0.08, 0.25, 2.0), bladeM, 0, 0, 0);

  // Nose gun(s)
  const guns = top ? 2 : 1;
  const spin = [];
  for (let g = 0; g < guns; g++) {
    const x = guns > 1 ? (g ? 1.25 : -1.25) : 0;
    const y = guns > 1 ? -0.7 : -1.0;
    const gun = new THREE.Group();
    gun.position.set(x, y, 2.6);
    bank.add(gun);
    part(gun, boxGeo(0.5, 0.5, 0.7), dark, 0, 0, 0);
    if (top) {
      // Sky Shredder: spinning minigun barrels
      const barrels = new THREE.Group();
      barrels.position.set(0, 0, 0.4);
      barrels.rotation.x = Math.PI / 2;
      gun.add(barrels);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(barrels, boxGeo(0.09, 1.6, 0.09), big ? trim : dark, Math.cos(a) * 0.17, 0.8, Math.sin(a) * 0.17);
      }
      spin.push(barrels);
    } else part(gun, boxGeo(0.18, 0.18, 1.4), dark, 0, 0, 0.9);
    point(x, y, 3.9, muzzles);
  }
  h.spin = spin.length ? spin : null;

  if (level >= 1) {
    // AP Rounds: an ammo box and a belt feeding the gun
    part(bank, boxGeo(0.8, 0.6, 0.8), M(0x4e5b31), 1.2, -0.7, 1.6);
    part(bank, boxGeo(0.4, 0.15, 0.6), M(0xc9a227), 0.75, -0.9, 2.1);
  }
  if (level >= 2) {
    // Enhanced Radar: a radar dome over the cockpit and an antenna
    part(bank, boxGeo(1.0, 0.5, 1.0), M(0xeceff1), 0, 1.3, 1.6);
    part(bank, boxGeo(0.08, 1.2, 0.08), dark, -0.8, 1.5, -0.8);
    part(bank, boxGeo(0.25, 0.15, 0.08), glow(h, 0x76ff03), -0.8, 2.1, -0.8);
  }
  if (level >= 3) {
    // Air to Ground Missiles: stub wings with missile pods (more pods on the Bottom path)
    const pods = bot ? (big ? 3 : 2) : 1;
    for (const side of [-1, 1]) {
      part(bank, boxGeo(1.6 + pods * 0.4, 0.15, 0.9), body, side * (1.7 + pods * 0.2), -0.2, 0.2);
      for (let k = 0; k < pods; k++) {
        const x = side * (1.9 + k * 0.6);
        part(bank, boxGeo(0.45, 0.45, 1.6), M(bot ? 0x5d4037 : 0x37474f), x, -0.55, 0.3);
        part(bank, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff3d00), x, -0.55, 1.12);
        point(x, -0.55, 1.2, missiles);
      }
    }
  }
  if (bot) {
    // Modified Payload: a sensor ball under the nose (hidden detection)
    part(bank, boxGeo(0.8, 0.8, 0.8), dark, 0, -1.1, 3.1);
    part(bank, boxGeo(0.4, 0.4, 0.1), glow(h, 0x00e5ff), 0, -1.1, 3.52);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -1.2, 0.3);
  bank.add(bay);
  heli.userData = { bank, prop, tail, bay, missiles };
  return { heli, muzzles };
}

/** Pursuit tower: a helipad with a little control hut, plus the helicopter the view flies around. */
function makePursuitModel(level, bottom) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4, 0.3, 4), M(0x757575), 0, 0.15, 0); // concrete pad
  const yellow = M(0xfdd835);
  part(u.body, boxGeo(0.35, 0.05, 2.0), yellow, -0.6, 0.32, 0); // the "H"
  part(u.body, boxGeo(0.35, 0.05, 2.0), yellow, 0.6, 0.32, 0);
  part(u.body, boxGeo(0.9, 0.05, 0.35), yellow, 0, 0.32, 0);
  for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, 0xff9100), x, 0.45, z);
  part(u.body, boxGeo(0.12, 2.6, 0.12), M(0xbdbdbd), 1.7, 1.6, -1.7); // windsock pole
  part(u.body, boxGeo(0.4, 0.4, 1.0), M(0xff6d00), 1.7, 2.7, -1.25);
  if (level >= 2) {
    // Radar: a dish beside the pad
    part(u.body, boxGeo(0.2, 1.2, 0.2), M(0x616161), -1.7, 0.9, -1.7);
    part(u.body, boxGeo(1.1, 0.8, 0.12), M(0xeceff1), -1.7, 1.7, -1.7).rotation.y = 0.7;
  }
  if (level >= 3) {
    // Missile rack
    for (const z of [1.2, 1.6]) part(u.body, boxGeo(1.2, 0.25, 0.25), M(0x37474f), -1.4, 0.5, z);
  }
  if (level >= 4) part(u.body, boxGeo(0.06, 0.8, 1.2), M(bottom ? 0xff6d00 : 0xd50000), 1.7, 2.2, -1.1); // path flag
  const { heli, muzzles } = makeHeli(u, level, bottom);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = level >= 5 && !bottom ? 0xff5252 : 0xffd740;
  return u;
}
export const makePursuit = (level) => makePursuitModel(level, false);
export const makePursuitBottom = (level) => makePursuitModel(level, true);

/**
 * Gatling Gun: a gun on a turret mount. Lv 2 an ammo belt, Lv 3 a drum magazine, Lv 4 a second
 * barrel and a scope, Lv 5 a real six-barrel Gatling, Lv 6 a sandbagged concrete fortress,
 * Lv 7 DOOM: black steel with glowing red vents and a huge barrel cluster.
 */
export function makeGatling(level) {
  const u = makeThing();
  const { M } = u;
  const doom = level >= 6;
  const metal = M(doom ? 0x1a1a1a : level >= 4 ? 0x455a64 : 0x5d6b3a);
  const dark = M(0x212121);
  const red = doom ? glowThing(u, 0xff1744) : null;
  if (level >= 5) {
    // Impenetrable Fortress: concrete walls with sandbags on top, open at the front
    const wall = M(doom ? 0x37373f : 0x9e9e9e);
    const bag = M(0xa1887f);
    part(u.body, boxGeo(4.2, 1.6, 0.6), wall, 0, 0.8, -1.8);
    for (const side of [-1, 1]) part(u.body, boxGeo(0.6, 1.6, 3.6), wall, side * 1.8, 0.8, 0);
    for (const x of [-1.4, -0.45, 0.45, 1.4]) part(u.body, boxGeo(0.9, 0.45, 0.7), bag, x, 1.8, -1.8);
    for (const side of [-1, 1]) for (const z of [-0.9, 0, 0.9]) part(u.body, boxGeo(0.7, 0.45, 0.85), bag, side * 1.8, 1.8, z);
    if (doom) for (const side of [-1, 1]) part(u.body, boxGeo(0.1, 0.3, 2.8), red, side * 1.5, 1.2, 0); // glowing vents
  }
  // Mount: a heavy tripod with a swivel post
  part(u.body, boxGeo(1.6, 0.3, 1.6), dark, 0, 0.15, 0);
  part(u.body, boxGeo(0.5, 1.8, 0.5), metal, 0, 1.1, 0);
  const gun = new THREE.Group();
  gun.position.set(0, 2.3, 0);
  u.body.add(gun);
  const size = level >= 6 ? 1.5 : level >= 4 ? 1.25 : 1;
  gun.scale.setScalar(size);
  part(gun, boxGeo(1.0, 0.9, 1.8), metal, 0, 0, -0.2); // receiver
  part(gun, boxGeo(0.25, 0.6, 0.3), dark, 0, -0.4, -1.0); // grip
  part(gun, boxGeo(1.6, 1.2, 0.12), M(doom ? 0x263238 : 0x6b7a4a), 0, 0.35, 0.75); // gun shield
  u.muzzles = [];
  const muzzle = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    gun.add(m);
    u.muzzles.push(m);
  };
  if (level >= 4) {
    // Minigun Barrel: six spinning barrels (a big cluster of nine at DOOM)
    const barrels = new THREE.Group();
    barrels.position.set(0, 0, 0.7);
    barrels.rotation.x = Math.PI / 2;
    gun.add(barrels);
    const n = doom ? 9 : 6;
    const r = doom ? 0.4 : 0.3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      part(barrels, boxGeo(0.15, 2.8, 0.15), doom && i % 3 === 0 ? red : dark, Math.cos(a) * r, 1.4, Math.sin(a) * r);
    }
    for (const y of [0.4, 2.4]) part(barrels, boxGeo(r * 2 + 0.25, 0.15, r * 2 + 0.25), metal, 0, y, 0); // clamps
    u.spin = [barrels];
    muzzle(0, 0, 3.6);
  } else if (level >= 3) {
    // Extra Barrel: two barrels side by side
    for (const x of [-0.22, 0.22]) {
      part(gun, boxGeo(0.2, 0.2, 2.6), dark, x, 0.05, 1.9);
      muzzle(x, 0.05, 3.2);
    }
  } else {
    part(gun, boxGeo(0.25, 0.25, level >= 1 ? 2.8 : 2.2), dark, 0, 0.05, level >= 1 ? 2.0 : 1.7);
    part(gun, boxGeo(0.4, 0.4, 0.3), dark, 0, 0.05, level >= 1 ? 3.3 : 2.75); // muzzle brake
    muzzle(0, 0.05, level >= 1 ? 3.4 : 2.9);
  }
  if (level >= 1) {
    // Heavier Bullets: a brass ammo belt hanging off the side
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.12, 0.3, 0.12), M(0xc9a227), 0.6, -0.3 - i * 0.18, -0.1 + i * 0.12);
  }
  if (level >= 2) {
    // Bigger Magazine: a drum magazine
    part(gun, boxGeo(0.5, 1.1, 1.1), M(doom ? 0x37373f : 0x4e5b31), -0.75, -0.2, -0.2);
  }
  if (level >= 3) {
    // Scope (hidden detection)
    part(gun, boxGeo(0.25, 0.25, 0.9), dark, 0, 0.65, -0.2);
    part(gun, boxGeo(0.2, 0.2, 0.05), glowThing(u, doom ? 0xff1744 : 0x00e5ff), 0, 0.65, 0.26);
  }
  if (doom) part(gun, boxGeo(0.7, 0.2, 0.05), red, 0, 0.75, 0.82); // DOOM visor slit on the shield
  u.static = true;
  u.tracer = doom ? 0xff1744 : level >= 4 ? 0xffab40 : 0xffe066;
  u.tracerWidth = level >= 5 ? 0.2 : undefined;
  u.fpsHeight = 2.3 + 0.4 + (level >= 5 ? 0.8 : 0);
  return u;
}

/**
 * Turret: a heavy gun on a concrete pad. Lv 2 ammo crate and belt, Lv 3 a radar dish, Lv 4 a
 * second gun, Lv 5 armor plates and thicker barrels, Lv 6 the sleek XR-200 with glowing strips.
 */
export function makeTurret(level) {
  const u = makeThing();
  const { M } = u;
  const xr = level >= 5;
  const dual = level >= 3;
  const heavy = level >= 4;
  const metal = M(xr ? 0x263238 : heavy ? 0x4e5a3a : 0x5d6b3a);
  const dark = M(0x1c1c1c);
  const cyan = xr ? glowThing(u, 0x18ffff) : null;
  // Concrete pad and swivel ring
  part(u.body, boxGeo(4.4, 0.5, 4.4), M(xr ? 0x455a64 : 0x9e9e9e), 0, 0.25, 0);
  part(u.body, boxGeo(2.6, 0.5, 2.6), dark, 0, 0.75, 0);
  // Housing
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0);
  u.body.add(head);
  const hw = xr ? 3.0 : 2.6;
  part(head, boxGeo(hw, 1.6, 2.8), metal, 0, 0.8, -0.1);
  part(head, boxGeo(hw - 0.4, 0.4, 1.8), M(xr ? 0x37474f : 0x6b7a4a), 0, 1.8, -0.3); // roof hatch
  if (xr) {
    part(head, boxGeo(hw + 0.05, 0.12, 2.4), cyan, 0, 1.1, -0.1); // glowing side strips
    part(head, boxGeo(1.6, 0.25, 0.08), cyan, 0, 1.3, 1.31); // visor slit
  }
  if (heavy) {
    // Even Heavier Ammo: armor plates on the sides
    for (const x of [-1, 1]) part(head, boxGeo(0.25, 1.4, 2.4), M(xr ? 0x1c262b : 0x3e4a2a), x * (hw / 2 + 0.12), 0.8, 0);
  }
  // Barrels
  const bw = heavy ? 0.42 : 0.32;
  const len = xr ? 4.2 : heavy ? 3.8 : 3.2;
  const xs = dual ? [-0.65, 0.65] : [0];
  for (const x of xs) {
    part(head, boxGeo(0.7, 0.7, 0.6), dark, x, 0.85, 1.5); // mantlet
    part(head, boxGeo(bw, bw, len), xr ? M(0x37474f) : dark, x, 0.85, 1.5 + len / 2);
    part(head, boxGeo(bw + 0.2, bw + 0.2, 0.4), xr ? cyan : dark, x, 0.85, 1.5 + len); // muzzle brake
    gunMuzzle(u, head, x, 0.85, 1.8 + len);
  }
  if (level >= 1) {
    // Stronger Ammunition: an ammo crate with a brass belt feeding the gun
    part(head, boxGeo(0.9, 0.8, 1.0), M(xr ? 0x212121 : 0x4e5b31), -hw / 2 - 0.5, 0.4, -0.4);
    for (let i = 0; i < 4; i++) part(head, boxGeo(0.14, 0.3, 0.14), M(0xc9a227), -hw / 2 - 0.2 + i * 0.12, 0.9 + i * 0.1, -0.4);
  }
  if (level >= 2) {
    // Radar: a dish on a mast at the back
    part(head, boxGeo(0.15, 1.4, 0.15), dark, 0.8, 2.4, -1.2);
    const dish = part(head, boxGeo(1.4, 1.0, 0.15), xr ? M(0x546e7a) : M(0xbdbdbd), 0.8, 3.2, -1.2);
    dish.rotation.x = -0.4;
    part(head, boxGeo(0.2, 0.2, 0.2), xr ? cyan : glowThing(u, 0xff1744), 0.8, 3.2, -1.05);
  }
  u.static = true;
  u.tracer = xr ? 0x18ffff : heavy ? 0xffab40 : 0xffe066;
  u.tracerWidth = xr ? 0.22 : heavy ? 0.18 : undefined;
  return u;
}

/**
 * Classic Mortar (alternate Mortar form): a gunner with a big mortar cannon behind sandbags.
 * Lv 2 ear protection, Lv 3 a wider tube, Lv 4 a bigger cannon, Lv 5 cluster warheads, Lv 6 the
 * City Buster with radioactive yellow shells. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeMortarClassic(level) {
  const nuke = level >= 5;
  const coat = nuke ? 0x2b2b2b : 0x7a6a45;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: nuke ? 0x1a1a1a : 0x4e4630, arms: coat, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  helmet(h, nuke ? 0x212121 : 0x5d5040);
  part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.74); // shard emblem on the helmet
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52);
  if (level >= 1) for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0x6a1b9a), x, 0.6, 0); // ear protectors
  if (nuke) part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0xfbc02d), 0, 0.1, 0); // hazard vest
  // Cannon on a base plate in front of the gunner
  const mount = new THREE.Group();
  mount.position.set(0, 0, 2.3);
  h.root.add(mount);
  part(mount, boxGeo(2.0, 0.25, 2.0), M(0x424242), 0, 0.12, 0);
  const w = level >= 3 ? 1.15 : level >= 2 ? 0.95 : 0.75;
  const len = level >= 3 ? 4.0 : level >= 2 ? 3.4 : 3.0;
  const tube = new THREE.Group();
  tube.position.set(0, 0.35, 0);
  tube.rotation.x = 0.45;
  mount.add(tube);
  part(tube, boxGeo(w, len, w), M(nuke ? 0x37474f : 0x5d6b3a), 0, len / 2, 0);
  part(tube, boxGeo(w + 0.25, 0.3, w + 0.25), M(0x212121), 0, len, 0);
  if (level >= 3) for (const y of [0.9, 2.0]) part(tube, boxGeo(w + 0.15, 0.2, w + 0.15), M(0x212121), 0, y, 0); // reinforcing bands
  if (nuke) part(tube, boxGeo(w + 0.1, 0.5, w + 0.1), glow(h, 0xffd600), 0, len * 0.6, 0); // hazard stripe
  for (const side of [-1, 1]) {
    const leg = part(mount, boxGeo(0.18, 2.4, 0.18), M(0x212121), side * 0.7, 1.1, 1.1);
    leg.rotation.set(-0.5, 0, side * 0.3);
  }
  setMuzzle(h, tube, 0, len + 0.3, 0);
  // Sandbags in a half ring
  const bag = M(0xa1887f);
  for (let i = 0; i < 5; i++) {
    const a = -1.2 + i * 0.6;
    part(h.root, boxGeo(1.3, 0.6, 0.7), bag, Math.sin(a) * 3.4, 0.3, 2.3 + Math.cos(a) * 1.7).rotation.y = a;
  }
  if (level >= 4) {
    // Loaded Warhead: a rack of fat cluster shells
    const shellM = nuke ? glow(h, 0xffd600) : M(0x8d6e63);
    part(h.root, boxGeo(1.5, 0.2, 1.0), M(0x5d4037), 2.0, 0.1, 0.2);
    for (const x of [1.5, 2.0, 2.5]) for (const z of [-0.05, 0.45]) part(h.root, boxGeo(0.4, 1.0, 0.4), shellM, x, 0.7, z);
  }
  const shell = part(h.rightArm, boxGeo(0.45, 0.85, 0.45), nuke ? glow(h, 0xffd600) : M(0x5d4037), 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = nuke ? { color: 0xffd600, size: 1.0, arc: 18, glowing: true } : { color: 0x5d4037, size: 0.7, arc: 16 };
  return h;
}

/**
 * Mercenary Base: a fenced compound with a tent and a flag. Lv 2 crates of grenades, Lv 3 a
 * second tent, Lv 4 a watchtower, Lv 5 riot shields on a rack, Lv 6 a helipad, Lv 7 armored walls.
 */
export function makeMercBase(level) {
  const u = makeThing();
  const { M } = u;
  const armored = level >= 6;
  part(u.body, boxGeo(4.6, 0.25, 4.6), M(0x8d7b5a), 0, 0.12, 0); // dirt yard
  // Fence posts (concrete walls at max level)
  const post = M(armored ? 0x607d8b : 0x5d4037);
  if (armored) {
    for (const side of [-1, 1]) part(u.body, boxGeo(0.4, 1.4, 4.4), post, side * 2.1, 0.8, 0);
    part(u.body, boxGeo(4.4, 1.4, 0.4), post, 0, 0.8, -2.1);
  } else {
    for (const x of [-2.1, 2.1]) for (const z of [-2.1, -0.7, 0.7, 2.1]) part(u.body, boxGeo(0.2, 1.0, 0.2), post, x, 0.6, z);
    for (const x of [-2.1, 2.1]) part(u.body, boxGeo(0.08, 0.1, 4.2), post, x, 0.9, 0);
  }
  // Tent
  const canvas = M(level >= 3 ? 0x3e4a2a : 0x6b7d3a);
  const tent = (x, z, s) => {
    const l = part(u.body, boxGeo(0.2, 2.6 * s, 2.6 * s), canvas, x - 0.75 * s, 1.1 * s, z);
    l.rotation.z = -0.6;
    const r = part(u.body, boxGeo(0.2, 2.6 * s, 2.6 * s), canvas, x + 0.75 * s, 1.1 * s, z);
    r.rotation.z = 0.6;
    part(u.body, boxGeo(0.9 * s, 1.6 * s, 0.1), M(0x212121), x, 0.8 * s, z + 1.25 * s);
  };
  tent(-0.6, -0.7, 1);
  if (level >= 2) tent(1.2, -0.9, 0.7);
  if (level >= 1) {
    // Explosive Experts: a crate of grenades
    part(u.body, boxGeo(0.9, 0.6, 0.7), M(0x4e5b31), 1.4, 0.55, 1.3);
    for (const x of [1.15, 1.4, 1.65]) part(u.body, boxGeo(0.2, 0.2, 0.2), M(0x33691e), x, 0.95, 1.3);
  }
  if (level >= 3) {
    // Improved Training: a watchtower with a gold star banner (the damage boost)
    for (const x of [-1.9, -1.1]) for (const z of [1.1, 1.9]) part(u.body, boxGeo(0.15, 3.2, 0.15), M(0x6d4c41), x, 1.6, z);
    part(u.body, boxGeo(1.2, 0.2, 1.2), M(0x795548), -1.5, 3.2, 1.5);
    part(u.body, boxGeo(0.6, 0.6, 0.05), glowThing(u, 0xffc400), -1.5, 3.8, 2.1);
  }
  if (level >= 4) {
    // Riot Control: riot shields leaning on a rack
    part(u.body, boxGeo(1.6, 0.12, 0.15), M(0x3e2723), 0.4, 1.2, 1.9);
    for (const x of [-0.1, 0.4, 0.9]) part(u.body, boxGeo(0.45, 1.0, 0.08), M(0x90a4ae), x, 0.75, 2.0).rotation.x = -0.15;
  }
  if (level >= 5) {
    // Air Transport: a helipad marking
    part(u.body, boxGeo(1.8, 0.05, 1.8), M(0x424242), 1.2, 0.28, 0.2);
    part(u.body, boxGeo(0.2, 0.06, 1.0), M(0xfafafa), 0.9, 0.3, 0.2);
    part(u.body, boxGeo(0.2, 0.06, 1.0), M(0xfafafa), 1.5, 0.3, 0.2);
    part(u.body, boxGeo(0.6, 0.06, 0.2), M(0xfafafa), 1.2, 0.3, 0.2);
  }
  // Flag
  part(u.body, boxGeo(0.15, 3.2, 0.15), M(0xbdbdbd), 1.9, 1.7, -1.9);
  part(u.body, boxGeo(0.05, 0.8, 1.2), M(armored ? 0xffc400 : 0xc62828), 1.9, 2.9, -1.3);
  return u;
}

/**
 * A Mercenary Base unit on foot: mrifle / mgren / mriot / mmedic, with a number for the
 * upgraded look (mrifle2, mrifle3, mgren2, mriot2, mmedic2).
 */
function makeMerc(model) {
  const kind = model.replace(/\d+$/, '');
  const tier = Number(model.match(/\d+$/)?.[0] ?? 1);
  const look = {
    mrifle: { shirt: [0x8d7b5a, 0x5d4037, 0x263238][tier - 1], pants: 0x3e2723 },
    mgren: { shirt: tier > 1 ? 0x3e2723 : 0x6d4c41, pants: 0x3e2723 },
    mriot: { shirt: tier > 1 ? 0x1a237e : 0x263238, pants: 0x1c2429 },
    mmedic: { shirt: 0xeceff1, pants: 0x546e7a },
  }[kind];
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: look.shirt, pants: look.pants, arms: look.shirt, face: 'soldier' });
  const { M } = h;
  if (kind === 'mriot') {
    // Riot Guard: full helmet with visor, body armor, a big shield and a baton
    helmet(h, 0x212121, false);
    part(h.head, boxGeo(1.25, 0.5, 0.1), M(0x80deea), 0, 0.7, 0.65);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(tier > 1 ? 0x283593 : 0x37474f), 0, 0.05, 0);
    const shield = part(h.leftArm, boxGeo(0.15, 2.4, 1.8), M(0x90a4ae), 0.3, -1.6, 0.2);
    shield.rotation.z = 0.1;
    part(h.rightArm, boxGeo(0.2, 1.2, 0.2), M(0x111111), 0, -2.3, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -2.9, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.2, 0, 0.1);
    h.leftArm.rotation.set(-0.8, 0, 0);
    return h;
  }
  if (kind === 'mmedic') {
    // Field Medic: a white cap and armband with red crosses, and a medical bag
    const cap = M(0xfafafa);
    part(h.head, boxGeo(1.35, 0.35, 1.35), cap, 0, 1.3, 0);
    part(h.head, boxGeo(0.4, 0.12, 0.05), M(0xd50000), 0, 1.35, 0.69);
    part(h.head, boxGeo(0.12, 0.4, 0.05), M(0xd50000), 0, 1.35, 0.69);
    part(h.torso, boxGeo(0.5, 0.15, 0.05), M(0xd50000), 0, 0.4, 0.52);
    part(h.torso, boxGeo(0.15, 0.5, 0.05), M(0xd50000), 0, 0.4, 0.52);
    part(h.torso, boxGeo(1.2, 1.0, 0.6), M(0x1b5e20), 0, -0.2, -0.8); // bag
    if (tier > 1) part(h.head, boxGeo(1.1, 0.25, 0.1), glow(h, 0x69f0ae), 0, 0.7, 0.65);
    const m = new THREE.Object3D();
    m.position.set(0, -2, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    return h;
  }
  helmet(h, kind === 'mgren' ? 0x4e342e : [0x6b5d3f, 0x3e2723, 0x212121][tier - 1]);
  if (kind === 'mrifle' && tier > 1) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, tier > 2 ? 0x00e5ff : 0x76ff03), 0, 1.0, 0.68); // goggles
  if (kind === 'mgren') {
    // Grenadier: a bandolier of grenades and a short launcher
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, 0.3, 0).rotation.z = 0.6;
    for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.25, 0.25, 0.25), M(tier > 1 ? 0xff6d00 : 0x33691e), x, 0.3 + x * 0.6, 0.56);
    holdLongGun(h, 1.0, M(0x37474f));
    h.projectile = { color: tier > 1 ? 0xff6d00 : 0x33691e, size: 0.4, arc: 4 };
  } else holdLongGun(h, tier > 2 ? 1.8 : 1.5, M(tier > 2 ? 0x263238 : 0x262626));
  return h;
}

// ------------------------------------------------------------------ Necromancer, Engineer, Accelerator

/**
 * Necromancer: a hooded sorcerer with a skull staff. Lv 2 Soul Forge: green soul flames on the
 * staff, Lv 3 Skull Centrifuge: skulls spinning around it, Lv 4 Graveward: bone armor,
 * Lv 5 Apostle of Hades: a black-and-gold robe, a crown and a red glow.
 */
export function makeNecromancer(level) {
  const hades = level >= 4;
  const robe = hades ? 0x1a1a1a : level >= 3 ? 0x311b4a : 0x4a148c;
  const soul = hades ? 0xff1744 : level >= 1 ? 0x76ff03 : 0xb388ff;
  const h = makeHumanoid({ skin: 0xc8c3b4, shirt: robe, pants: robe, arms: robe, face: 'skull' });
  const { M } = h;
  // Hood and long robe
  const hood = M(hades ? 0x111111 : 0x2a0d4f);
  part(h.head, boxGeo(1.45, 1.4, 1.45), hood, 0, 0.68, -0.08);
  part(h.head, boxGeo(1.0, 0.25, 0.08), glow(h, soul), 0, 0.85, 0.7); // glowing eyes under the hood
  part(h.torso, boxGeo(2.3, 2.6, 1.3), M(robe), 0, -1.6, 0); // robe skirt
  if (hades) {
    part(h.torso, boxGeo(0.3, 2.6, 0.08), M(0xffc400), 0, -0.6, 0.66); // gold trim
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.22, 0.55, 0.22), M(0xffc400), x, 1.6, 0); // crown
  }
  if (level >= 3) {
    // Graveward: bone shoulder guards and a rib-cage chest plate
    const bone = M(0xe8e4d0);
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.9, 0.5, 1.3), bone, x, 1.0, 0);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(1.6, 0.14, 0.08), bone, 0, 0.6 - i * 0.4, 0.55);
  }
  // Skull staff
  const len = hades ? 3.2 : 2.6;
  const staff = holdLongGun(h, len, M(hades ? 0x3e2723 : 0x4e342e));
  const skull = M(0xe8e4d0);
  part(staff, boxGeo(0.6, 0.6, 0.6), skull, 0, -len - 0.2, 0);
  part(staff, boxGeo(0.4, 0.15, 0.1), glow(h, soul), 0, -len - 0.2, 0.31);
  if (level >= 1) {
    // Soul Forge: soul flames around the skull
    for (const [x, z] of [[-0.35, 0], [0.35, 0], [0, -0.35]]) part(staff, boxGeo(0.18, 0.5, 0.18), glow(h, soul), x, -len - 0.5, z);
  }
  h.muzzles[0].position.y = -len - 0.5;
  if (level >= 2) {
    // Skull Centrifuge: skulls orbiting the necromancer
    const ring = new THREE.Group();
    ring.position.y = 3.2;
    h.body.add(ring);
    const n = hades ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      part(ring, boxGeo(0.5, 0.5, 0.5), skull, Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
      part(ring, boxGeo(0.3, 0.12, 0.1), glow(h, soul), Math.cos(a) * 2.2, 0.05, Math.sin(a) * 2.2 + 0.26);
    }
    h.spin = [ring];
    h.idleSpin = 2;
  }
  h.tracer = soul;
  h.tracerWidth = hades ? 0.35 : 0.25;
  return h;
}

/** A skeleton raised by the Necromancer: skel, skelsword, skelsword2, skelgiant, skelknight, skelhallow, skelexec. */
function makeSkeleton(model) {
  const bone = model === 'skelhallow' ? 0xb3e5fc : 0xe8e4d0;
  const h = makeHumanoid({ skin: bone, shirt: bone, pants: bone, arms: bone, face: 'skull' });
  const { M } = h;
  const dark = M(0x3e3a30);
  for (let i = 0; i < 3; i++) part(h.torso, boxGeo(1.6, 0.14, 0.06), dark, 0, 0.6 - i * 0.45, 0.52); // ribs
  const blade = (len, w, color) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.25, 0.5, 0.25), M(0x4e342e), 0, -0.2, 0); // grip
    part(g, boxGeo(0.8, 0.12, 0.25), M(0x757575), 0, -0.45, 0); // crossguard
    part(g, boxGeo(w, len, 0.15), color, 0, -0.5 - len / 2, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -0.5 - len, 0);
    g.add(m);
    h.muzzles = [m];
  };
  h.rightArm.rotation.set(-1.2, 0, 0.1);
  h.leftArm.rotation.set(-0.5, 0, 0);
  h.tracer = 0xe0e0e0;
  if (model === 'skel') {
    // Plain skeleton: a bone club
    part(h.rightArm, boxGeo(0.3, 1.4, 0.3), M(0xd7ccc8), 0, -2.4, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -3.1, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
  } else if (model === 'skelsword' || model === 'skelsword2') {
    blade(1.6, 0.3, M(model === 'skelsword2' ? 0x90a4ae : 0x9e9e9e));
    if (model === 'skelsword2') part(h.head, boxGeo(1.3, 0.4, 1.3), M(0x546e7a), 0, 1.25, 0); // iron cap
  } else if (model === 'skelknight') {
    helmet(h, 0x607d8b, false);
    part(h.head, boxGeo(1.0, 0.15, 0.1), M(0x111111), 0, 0.8, 0.66); // visor slit
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(0x78909c), 0, 0.05, 0); // breastplate
    part(h.leftArm, boxGeo(0.2, 1.8, 1.4), M(0x37474f), 0.6, -1.4, 0.2); // shield
    blade(1.9, 0.35, M(0xb0bec5));
    h.tracer = 0xcfd8dc;
  } else if (model === 'skelhallow') {
    // Hallow Guard: ghostly blue bones in glowing armor with a halberd
    const ghost = glow(h, 0x40c4ff);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(0x263238), 0, 0.05, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.08), ghost, 0, 0.4, 0.62);
    helmet(h, 0x263238, false);
    part(h.head, boxGeo(1.0, 0.2, 0.1), ghost, 0, 0.85, 0.67);
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.2, 3.6, 0.2), M(0x3e2723), 0, -0.8, 0);
    part(g, boxGeo(0.15, 0.8, 0.9), ghost, 0, -2.4, 0.3); // axe head
    const m = new THREE.Object3D();
    m.position.set(0, -2.6, 0);
    g.add(m);
    h.muzzles = [m];
    h.size = 1.2;
    h.tracer = 0x40c4ff;
  } else if (model === 'skelgiant') {
    part(h.torso, boxGeo(2.4, 0.5, 1.3), M(0x5d4037), 0, -0.8, 0); // belt
    part(h.rightArm, boxGeo(0.7, 2.2, 0.7), M(0x8d6e63), 0, -2.8, 0); // big bone club
    const m = new THREE.Object3D();
    m.position.set(0, -3.9, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.size = 1.9;
  } else {
    // Executioner: a black hood and a huge red-glowing axe
    part(h.head, boxGeo(1.4, 1.4, 1.4), M(0x111111), 0, 0.68, -0.1);
    part(h.head, boxGeo(0.9, 0.2, 0.08), glow(h, 0xff1744), 0, 0.85, 0.66);
    part(h.torso, boxGeo(2.2, 1.6, 1.15), M(0x212121), 0, 0, 0);
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.25, 3.2, 0.25), M(0x3e2723), 0, -0.8, 0);
    part(g, boxGeo(0.2, 1.4, 1.6), M(0x424242), 0, -2.2, 0.6);
    part(g, boxGeo(0.22, 1.2, 0.15), glow(h, 0xff1744), 0, -2.2, 1.4);
    const m = new THREE.Object3D();
    m.position.set(0, -2.4, 0.8);
    g.add(m);
    h.muzzles = [m];
    h.size = 1.5;
    h.tracer = 0xff5252;
  }
  return h;
}

/**
 * Engineer: hard hat, hi-vis vest and a rebar launcher. Lv 2 goggles, Lv 3 a radar dish on its
 * back, Lv 4 a converter backpack, Lv 5 heavy armor, Lv 6 a blueprint tablet and a glowing
 * visor, Lv 7 a red rocket launcher.
 */
export function makeEngineer(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: level >= 4 ? 0x455a64 : 0x5d6d7e, pants: 0x37474f, arms: level >= 4 ? 0x455a64 : 0x5d6d7e, face: 'soldier' });
  const { M } = h;
  helmet(h, level >= 6 ? 0xd32f2f : 0xfbc02d);
  part(h.torso, boxGeo(2.1, 1.9, 1.1), M(0xff6f00), 0, 0.05, 0); // hi-vis vest
  part(h.torso, boxGeo(2.15, 0.18, 1.15), M(0xe0e0e0), 0, 0.3, 0); // reflective strip
  if (level >= 1) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, level >= 5 ? 0x00e5ff : 0xffab40), 0, 1.0, 0.68); // goggles
  part(h.torso, boxGeo(2.2, 0.3, 1.2), M(0x5d4037), 0, -0.85, 0); // tool belt
  part(h.torso, boxGeo(0.3, 0.5, 0.3), M(0x9e9e9e), 0.8, -1.1, 0.5); // wrench
  if (level >= 2) {
    // Makeshift Radar: a dish on a pole behind it
    part(h.torso, boxGeo(0.15, 2.2, 0.15), M(0x9e9e9e), -0.6, 1.6, -0.7);
    const dish = part(h.torso, boxGeo(1.2, 1.2, 0.15), M(0xbdbdbd), -0.6, 2.8, -0.7);
    dish.rotation.x = -0.5;
    part(h.torso, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff1744), -0.6, 2.85, -0.55);
  }
  if (level >= 3) {
    // Auto Converter: a backpack full of scrap
    part(h.torso, boxGeo(1.5, 1.6, 0.8), M(0x795548), 0.2, -0.1, -0.9);
    part(h.torso, boxGeo(0.4, 0.4, 0.1), glow(h, 0x76ff03), 0.2, 0.2, -1.32);
  }
  if (level >= 4) {
    // Heavy Construction: armor plates
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.8, 0.5, 1.3), M(0x607d8b), x, 1.0, 0);
  }
  if (level >= 5) part(h.leftArm, boxGeo(0.15, 0.9, 1.1), glow(h, 0x40c4ff), 0.55, -1.4, 0.3); // blueprint tablet
  const rocket = level >= 6;
  const len = rocket ? 2.0 : 1.8;
  const gun = holdLongGun(h, len, M(rocket ? 0xb71c1c : 0x616161));
  part(gun, boxGeo(0.55, 0.8, 0.6), M(rocket ? 0x7f0000 : 0x424242), 0, -0.4, 0); // receiver
  part(gun, boxGeo(rocket ? 0.6 : 0.2, 0.3, rocket ? 0.6 : 0.2), M(rocket ? 0x212121 : 0x8d6e63), 0, -len, 0); // muzzle / rebar tip
  h.muzzles[0].position.y = -len - 0.2;
  h.tracer = rocket ? 0xff7043 : 0xa1887f;
  return h;
}

/**
 * Accelerator (alternate Phaser): a heavy suit with a plasma cannon. Lv 3 a second energy
 * canister, Lv 4 armor, Lv 5 a supercharger coil, Lv 6 a glowing gold-and-violet suit.
 */
export function makeAccelerator(level) {
  const vessel = level >= 5;
  const plasma = vessel ? 0xd500f9 : level >= 4 ? 0xff6d00 : 0x18ffff;
  const suitC = vessel ? 0x1a0033 : level >= 3 ? 0x263238 : 0xcfd8dc;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suitC, pants: suitC, arms: suitC, face: 'soldier' });
  const { M } = h;
  const armor = M(vessel ? 0xffc400 : level >= 3 ? 0x455a64 : 0x90a4ae);
  part(h.head, boxGeo(1.45, 1.4, 1.45), armor, 0, 0.66, -0.03);
  part(h.head, boxGeo(1.25, 0.3, 0.08), glow(h, plasma), 0, 0.75, 0.7);
  part(h.torso, boxGeo(1.4, 1.8, 0.8), M(0x37474f), 0, 0, -0.9); // energy pack
  part(h.torso, boxGeo(0.35, 1.3, 0.1), glow(h, plasma), -0.35, 0, -1.32); // canister
  if (level >= 2) part(h.torso, boxGeo(0.35, 1.3, 0.1), glow(h, plasma), 0.35, 0, -1.32); // second canister
  if (level >= 3) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), armor, 0, 0.05, 0);
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.85, 0.5, 1.35), armor, x, 1.0, 0);
  }
  if (vessel) for (const x of [-0.5, 0, 0.5]) part(h.head, boxGeo(0.2, 0.6, 0.2), M(0xffc400), x, 1.55, 0); // crest
  const len = level >= 4 ? 2.6 : 2.2;
  const gun = holdLongGun(h, len, M(vessel ? 0x311b92 : 0x37474f));
  part(gun, boxGeo(0.8, 1.0, 0.8), M(0x263238), 0, -0.5, 0); // breech
  const coils = level >= 4 ? 4 : 2;
  for (let i = 0; i < coils; i++) part(gun, boxGeo(0.7, 0.14, 0.7), glow(h, plasma), 0, -1.1 - i * 0.35, 0);
  part(gun, boxGeo(0.55, 0.3, 0.55), glow(h, plasma), 0, -len, 0);
  h.muzzles[0].position.y = -len - 0.2;
  h.tracer = plasma;
  h.tracerWidth = vessel ? 0.6 : level >= 3 ? 0.5 : 0.4;
  return h;
}

/**
 * Engineer sentry turret on a tripod. tier: 0-1 Sentry, 2-3 Rifle Sentry, 4-5 Minigun Sentry
 * (5 adds a shield), 6 War Machine Sentry with a rocket pod. `turret` turns, `muzzles[0]` fires.
 */
export function makeSentry(tier) {
  const u = makeThing();
  const { M } = u;
  const metal = M(tier >= 6 ? 0x5d4037 : tier >= 4 ? 0x455a64 : tier >= 2 ? 0x556b2f : 0x757575);
  for (const a of [0, 2.1, 4.2]) {
    const leg = part(u.body, boxGeo(0.2, 1.6, 0.2), M(0x424242), Math.sin(a) * 0.6, 0.7, Math.cos(a) * 0.6);
    leg.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
  }
  const t = turret(u, 1.5);
  const big = tier >= 4 ? 1.3 : 1;
  part(t, boxGeo(1.1 * big, 0.8 * big, 1.3 * big), metal, 0, 0.3, 0);
  part(t, boxGeo(0.5, 0.2, 0.1), glow(u, tier >= 6 ? 0xff1744 : 0x76ff03), 0, 0.5 * big, 0.66 * big); // sensor
  const barrel = tier >= 2 ? 1.6 : 1.0;
  if (tier >= 4) {
    for (const x of [-0.18, 0.18]) for (const y of [0.15, 0.45]) part(t, boxGeo(0.14, 0.14, barrel), M(0x212121), x, y, 0.65 * big + barrel / 2);
  } else part(t, boxGeo(0.2, 0.2, barrel), M(0x212121), 0, 0.3, 0.65 + barrel / 2);
  gunMuzzle(u, t, 0, 0.3, 0.65 * big + barrel);
  if (tier >= 5) {
    // Improved Blueprints: a shield plate in front
    const sh = part(t, boxGeo(1.8, 1.2, 0.1), glowThing(u, 0x40c4ff), 0, 0.4, 0.9 * big);
    sh.material.transparent = true;
    sh.material.opacity = 0.45;
  }
  if (tier >= 6) {
    const pod = part(t, boxGeo(0.8, 0.8, 1.2), M(0x3e2723), 0.95, 0.6, 0);
    for (const y of [-0.2, 0.2]) part(pod, boxGeo(0.25, 0.25, 0.06), M(0xff6d00), 0, y, 0.61);
    u.cannon = gunMuzzle(u, t, 0.95, 0.6, 0.7);
    u.muzzles.pop();
  }
  u.tracer = tier >= 6 ? 0xffab40 : tier >= 4 ? 0xffd54f : 0xffe082;
  u.height = 2.8;
  return u;
}

/** Necromancer gravestone. Level 2 is taller with green runes, level 3 dark stone with red ones. */
export function makeGrave(lvl) {
  const u = makeThing();
  const { M } = u;
  const stone = M(lvl >= 3 ? 0x37474f : lvl >= 2 ? 0x78909c : 0x9e9e9e);
  const hgt = lvl >= 2 ? 2.6 : 2;
  part(u.body, boxGeo(2.0, 0.3, 1.4), M(0x5d4037), 0, 0.12, 0.3); // dirt mound
  part(u.body, boxGeo(1.3, hgt, 0.4), stone, 0, hgt / 2, 0);
  part(u.body, boxGeo(0.9, 0.3, 0.42), stone, 0, hgt + 0.1, 0); // rounded top
  const rune = lvl >= 3 ? glowThing(u, 0xff1744) : lvl >= 2 ? glowThing(u, 0x76ff03) : M(0x616161);
  part(u.body, boxGeo(0.15, 0.9, 0.05), rune, 0, hgt * 0.6, 0.22); // cross
  part(u.body, boxGeo(0.6, 0.15, 0.05), rune, 0, hgt * 0.7, 0.22);
  return u;
}

/**
 * Hacker: a dark hoodie with the hood up, hacking from a smartphone (Lv 1-3), green visor from
 * Lv 3, a wrist gadget from Lv 4, a botnet antenna pack at Lv 5. Top path: a glowing violet
 * overclocked gadget. Bottom path: an open laptop held in both hands.
 */
export function makeHacker(level, bottom = false) {
  const top = level >= 5 && !bottom;
  const laptop = level >= 5 && bottom;
  const code = top ? 0xd500f9 : 0x00e676;
  const hoodie = top ? 0x1a0033 : laptop ? 0x102027 : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: hoodie, pants: 0x212121, arms: hoodie, face: 'soldier' });
  const { M } = h;
  const dark = M(0x111111);
  part(h.head, boxGeo(1.45, 1.4, 1.3), M(hoodie), 0, 0.68, -0.12); // hood
  part(h.head, boxGeo(1.25, 0.25, 0.1), M(hoodie), 0, 1.28, 0.6); // hood brim
  part(h.torso, boxGeo(1.2, 0.5, 0.1), M(0x37474f), 0, -0.55, 0.52); // hoodie pocket
  part(h.torso, boxGeo(0.12, 0.7, 0.08), M(0xbdbdbd), -0.35, 0.55, 0.52); // drawstrings
  part(h.torso, boxGeo(0.12, 0.7, 0.08), M(0xbdbdbd), 0.35, 0.55, 0.52);
  if (level >= 1) {
    // Signal Booster: headphones
    part(h.head, boxGeo(1.6, 0.2, 0.25), dark, 0, 1.38, 0);
    for (const x of [-0.78, 0.78]) part(h.head, boxGeo(0.25, 0.55, 0.5), dark, x, 0.65, 0);
  }
  if (level >= 2) part(h.head, boxGeo(1.15, 0.28, 0.1), glow(h, code), 0, 0.82, 0.65); // 1337 visor
  if (level >= 4) {
    // Botnet: a server pack with an antenna and blinking lights
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x37474f), 0, 0, -0.85);
    for (const y of [-0.4, 0, 0.4]) part(h.torso, boxGeo(0.9, 0.1, 0.05), glow(h, code), 0, y, -1.22);
    part(h.torso, boxGeo(0.12, 1.8, 0.12), M(0x9e9e9e), 0.5, 1.6, -0.85);
    part(h.torso, boxGeo(0.28, 0.28, 0.28), glow(h, 0xff1744), 0.5, 2.55, -0.85);
  }
  const muzzle = new THREE.Object3D();
  if (laptop) {
    // Mainframe: an open laptop held out in front with both hands.
    h.rightArm.rotation.set(-1.2, 0, 0.35);
    h.leftArm.rotation.set(-1.2, 0, -0.35);
    h.pose = { right: -1.2, left: -1.2, leftRecoil: 0.05 };
    const lap = new THREE.Group();
    lap.position.set(0, 2.7, 1.9);
    h.body.add(lap);
    part(lap, boxGeo(2.2, 0.12, 1.5), M(0x455a64), 0, 0, 0); // base
    part(lap, boxGeo(2.0, 0.04, 0.9), dark, 0, 0.08, 0.2); // keyboard
    const lid = part(lap, boxGeo(2.2, 1.4, 0.1), M(0x455a64), 0, 0.68, -0.72);
    lid.rotation.x = -0.25;
    part(lid, boxGeo(2.0, 1.2, 0.04), glow(h, code), 0, 0, 0.06); // screen
    part(lid, boxGeo(0.35, 0.35, 0.05), M(0xeceff1), 0, 0, -0.07); // logo
    muzzle.position.set(0, 0.9, -0.5);
    lap.add(muzzle);
  } else {
    // Smartphone in the right hand (Lv 1-3), then a wrist gadget that shoots synapses.
    h.rightArm.rotation.set(-1.25, 0, 0.15);
    h.leftArm.rotation.set(-0.9, 0, -0.45);
    h.pose = { right: -1.25, left: -0.9, leftRecoil: 0.05 };
    if (level < 3) {
      const phone = part(h.rightArm, boxGeo(0.55, 0.12, 0.95), dark, 0, -2.05, 0.35);
      part(phone, boxGeo(0.45, 0.04, 0.8), glow(h, code), 0, 0.07, 0);
      muzzle.position.set(0, -2.1, 0.9);
    } else {
      const big = top ? 1.25 : 1;
      part(h.rightArm, boxGeo(1.15 * big, 0.7, 1.15 * big), M(top ? 0x311b92 : 0x37474f), 0, -1.35, 0); // gadget band
      part(h.rightArm, boxGeo(0.7, 0.12, 0.7), glow(h, code), 0, -1.35, 0.6 * big); // screen
      part(h.rightArm, boxGeo(0.3, 0.3, 0.3), glow(h, code), 0, -2.1, 0.45); // emitter
      if (top) for (const y of [-0.9, -1.8]) part(h.rightArm, boxGeo(1.2, 0.1, 1.2), glow(h, code), 0, y, 0); // overclock rings
      // The left hand holds a phone too.
      const phone = part(h.leftArm, boxGeo(0.55, 0.12, 0.95), dark, 0, -2.05, 0.35);
      part(phone, boxGeo(0.45, 0.04, 0.8), glow(h, code), 0, 0.07, 0);
      muzzle.position.set(0, -2.2, 0.45);
    }
    h.rightArm.add(muzzle);
  }
  h.muzzles = [muzzle];
  h.tracer = code;
  return h;
}
export const makeHackerBottom = (level) => makeHacker(level, true);

/**
 * Hacker hologram: a converted zombie rebuilt in see-through glowing cyan. It walks like a unit
 * (`walk` legs are swung by the view).
 */
export function makeHologram(def) {
  const h = makeEnemy(def);
  for (const m of h.mats) {
    m.color?.setHex(0x00bcd4);
    if (m.map) m.map = null;
    m.userData.glow = 0x00838f;
    m.emissive?.setHex(0x00838f);
    m.needsUpdate = true;
  }
  setOpacity(h, 0.55);
  h.root.scale.setScalar(def.scale ?? 1);
  if (h.leftLeg && h.rightLeg) h.walk = [h.leftLeg, h.rightLeg];
  if (h.leftArm && h.rightArm) h.leftArm.rotation.x = h.rightArm.rotation.x = -Math.PI / 2; // zombie arms out
  h.muzzles = [];
  h.wheels = [];
  h.height = (def.h ?? 5.2) * (def.scale ?? 1);
  h.holo = true;
  return h;
}

/** A glowing material for makeThing() models. */
function glowThing(u, color) {
  const m = u.M(color);
  m.userData.glow = color;
  m.emissive.setHex(color);
  m.emissiveIntensity = 0.8;
  return m;
}

export const TOWER_MODELS = {
  scout: makeScout,
  scoutClassic: makeScoutClassic,
  tweeter: makeTweeter,
  cowboy: makeCowboy,
  soldier: makeSoldier,
  soldierClassic: makeSoldierClassic,
  marksman: makeMarksman,
  commando: makeCommando,
  commandoMinigunner: makeMinigunner,
  aviator: makeAviator,
  phaser: makePhaser,
  railgunner: makeRailgunner,
  railgunnerRanger: makeRanger,
  sniper: makeSniper,
  sniperClassic: makeSniperClassic,
  sniperTactical: makeSniperTactical,
  sniperTacticalBottom: makeSniperTacticalBottom,
  enforcer: makeEnforcer,
  enforcerWarden: makeWarden,
  rifleman: makeRifleman,
  grenadier: makeGrenadier,
  grenadierDemo: makeGrenadierDemo,
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
  patrol: makePatrol,
  patrolMilitary: makeMilitaryBase,
  barracks: makeBarracks,
  zed: makeZed,
  farm: makeFarm,
  commander: makeCommander,
  commanderClassic: makeCommanderClassic,
  dj: makeDJ,
  djBooth: makeDJBooth,
  anarchist: makeAnarchist,
  riflemanMilitant: makeMilitant,
  marksmanHunter: makeHunter,
  shotgunnerPump: makeShotgunnerPump,
  flamethrowerPyro: makePyromancer,
  aviatorAce: makeAviatorAce,
  rocketeerMissile: makeRocketeerMissile,
  farmFruit: makeFarmFruit,
  medic: makeMedic,
  electro: makeElectro,
  trapper: makeTrapper,
  crookBoss: makeCrookBoss,
  pursuit: makePursuit,
  pursuitBottom: makePursuitBottom,
  gatling: makeGatling,
  turret: makeTurret,
  mortarClassic: makeMortarClassic,
  mercenary: makeMercBase,
  necromancer: makeNecromancer,
  engineer: makeEngineer,
  hacker: makeHacker,
  hackerBottom: makeHackerBottom,
  phaserAccel: makeAccelerator,
};

export function makeZombie(def) {
  const h = makeHumanoid({ skin: def.skin, shirt: def.shirt, pants: def.pants, face: 'zombie' });
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
  if (def.boss) {
    const spikeM = M(0xb0bec5);
    part(h.torso, boxGeo(0.7, 0.5, 0.9), spikeM, -1.5, 1.2, 0);
    part(h.torso, boxGeo(0.7, 0.5, 0.9), spikeM, 1.5, 1.2, 0);
    part(h.head, boxGeo(0.25, 0.6, 0.25), spikeM, -0.45, 1.45, 0);
    part(h.head, boxGeo(0.25, 0.6, 0.25), spikeM, 0.45, 1.45, 0);
  }
  if (def.lava) moltenParts(h, def);
  h.rightArm.rotation.x = -Math.PI / 2;
  h.leftArm.rotation.x = -Math.PI / 2;
  if (def.hidden) setOpacity(h, 0.35);
  return h;
}

/** Medium mode zombie extras: lava cracks, horns, hazmat suits, armor, robes, mechs and axes. */
function moltenParts(h, def) {
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

function hazmatSuit(h, def) {
  const { M } = h;
  const suit = M(def.shirt);
  const rubber = M(0x212121);
  const glass = M(0x80deea);
  glass.userData.glow = 0x0b3b40; // keeps its tint after hit flashes
  glass.emissive.setHex(0x0b3b40);
  part(h.head, boxGeo(1.4, 1.4, 1.36), suit, 0, 0.62, 0); // hood
  part(h.head, boxGeo(1.0, 0.55, 0.06), glass, 0, 0.82, 0.7); // visor
  part(h.head, boxGeo(0.7, 0.4, 0.25), rubber, 0, 0.3, 0.75); // respirator
  part(h.head, cylGeo(0.22, 0.22, 0.3, 8), rubber, 0, 0.2, 0.95).rotation.x = Math.PI / 2;
  part(h.torso, boxGeo(0.9, 1.0, 0.5), M(0x9e9e9e), 0, 0.2, -0.75); // air tank
  part(h.torso, boxGeo(0.5, 0.5, 0.06), M(0x212121), 0.45, 0.45, 0.53); // ☢ badge
  part(h.torso, boxGeo(0.3, 0.3, 0.07), M(0xfdd835), 0.45, 0.45, 0.54);
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), rubber, 0, -1.8, 0); // gloves
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.6, 1.1), rubber, 0, -1.75, 0.03); // boots
}

// ------------------------------------------------------------------ Easy mode creatures
// Each builder returns { root, body, mats, M, anim(phase, t) }: `anim` poses the model every
// frame (phase advances with walking speed, t is seconds). Creatures face +Z.

function creature() {
  const mats = [];
  const M = (color, extra = null) => {
    const m = new THREE.MeshLambertMaterial({ color, ...extra });
    mats.push(m);
    return m;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  return { root, body, mats, M };
}

const cylCache = new Map();
function cylGeo(rt, rb, h, seg = 10) {
  const k = `${rt}|${rb}|${h}|${seg}`;
  let g = cylCache.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(rt, rb, h, seg);
    cylCache.set(k, g);
  }
  return g;
}

/** Two cartoon eyes on a front face at height y, depth z. */
function eyes(h, parent, y, z, { spread = 0.4, size = 0.4, white = 0xffffff, pupil = 0x111111, glowing = false } = {}) {
  const wm = glowing ? glow(h, white) : h.M(white);
  const pm = h.M(pupil);
  for (const side of [-1, 1]) {
    part(parent, boxGeo(size, size, 0.1), wm, side * spread, y, z);
    if (!glowing) part(parent, boxGeo(size * 0.5, size * 0.5, 0.06), pm, side * spread, y - size * 0.1, z + 0.07);
  }
}

/** A gold crown sitting at height y, `w` wide. */
function crown(h, parent, y, w) {
  const gold = glow(h, 0xffc400);
  gold.emissiveIntensity = 0.35;
  part(parent, boxGeo(w, w * 0.25, w), gold, 0, y, 0);
  const pt = w * 0.18;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    part(parent, boxGeo(pt, pt * 2, pt), gold, x * (w / 2 - pt / 2), y + w * 0.2, z * (w / 2 - pt / 2));
  }
  part(parent, boxGeo(pt * 1.2, pt * 1.2, 0.08), glow(h, 0xe53935), 0, y, w / 2 + 0.03);
}

/** Flickering flame cubes on top of a model; returns an anim step. */
function flames(h, parent, y, w, n, colors = [0xff3d00, 0xff9100, 0xffea00]) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = glow(h, colors[i % colors.length]);
    const sz = w * (0.22 + Math.random() * 0.14);
    const f = part(parent, boxGeo(sz, sz * 1.6, sz), m, (Math.random() - 0.5) * w * 0.8, y, (Math.random() - 0.5) * w * 0.8);
    f.castShadow = false;
    list.push({ f, y, off: Math.random() * 10 });
  }
  return (t) => {
    for (const { f, y: y0, off } of list) {
      const k = (t * 2.2 + off) % 1;
      f.position.y = y0 + k * w * 0.7;
      f.scale.setScalar(1 - k * 0.8);
      f.rotation.y = off + t * 3;
    }
  };
}

function makeSlimeModel(def) {
  const h = creature();
  const { M } = h;
  const col = def.color ?? 0x66bb6a;
  const m = def.fire ? glow(h, col) : M(col);
  if (def.fire) m.emissiveIntensity = def.inferno ? 0.55 : 0.4;
  const blob = new THREE.Group();
  h.body.add(blob);
  part(blob, boxGeo(2.2, 1.4, 2.2), m, 0, 0.7, 0);
  part(blob, boxGeo(1.7, 0.6, 1.7), m, 0, 1.7, 0);
  part(blob, boxGeo(0.9, 0.3, 0.9), m, 0, 2.1, 0);
  const shade = M(new THREE.Color(col).multiplyScalar(0.6).getHex());
  part(blob, boxGeo(2.3, 0.25, 2.3), shade, 0, 0.12, 0); // darker goo at the bottom
  eyes(h, blob, 1.25, 1.12, { spread: 0.5, size: 0.42, white: def.inferno ? 0xffea00 : 0xffffff, glowing: !!def.inferno });
  if (def.inferno || (def.fire && def.boss)) {
    // Angry brows.
    for (const side of [-1, 1]) {
      const b = part(blob, boxGeo(0.6, 0.14, 0.1), M(0x111111), side * 0.5, 1.62, 1.14);
      b.rotation.z = side * -0.35;
    }
  }
  if (def.crown) crown(h, blob, 2.45, 1.0);
  const fire = def.fire ? flames(h, blob, 2.2, 1.6, def.inferno || def.boss ? 9 : 5) : null;
  h.anim = (phase, t) => {
    // Hop: squash on landing, stretch in the air.
    const s = Math.sin(phase * 1.3);
    blob.position.y = Math.max(0, s) * 0.6;
    blob.scale.set(1 - s * 0.08, 1 + s * 0.12, 1 - s * 0.08);
    fire?.(t);
  };
  return h;
}

function makeGoblinModel(def) {
  const king = !!def.crown;
  const h = makeHumanoid({ skin: def.skin, shirt: king ? 0x6a1b9a : 0x6d4c41, pants: king ? 0x4a148c : 0x4e342e, face: 'goblin' });
  const { M } = h;
  const skin = M(def.skin);
  // Pointy ears and a big nose.
  for (const side of [-1, 1]) {
    const ear = part(h.head, boxGeo(0.9, 0.35, 0.2), skin, side * 0.95, 0.75, 0);
    ear.rotation.z = side * 0.35;
  }
  part(h.head, boxGeo(0.3, 0.3, 0.35), skin, 0, 0.6, 0.75);
  if (king) {
    crown(h, h.head, 1.35, 1.1);
    // Red cape and a golden club.
    part(h.torso, boxGeo(2.1, 2.6, 0.15), M(0xc62828), 0, -0.3, -0.6);
    part(h.rightArm, boxGeo(0.4, 2.2, 0.4), glow(h, 0xffb300), 0, -2.2, 0.6).rotation.x = Math.PI / 2;
  } else {
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.7, 0); // belt
    part(h.rightArm, boxGeo(0.35, 1.8, 0.35), M(0x8d6e63), 0, -2.0, 0.5).rotation.x = Math.PI / 2; // stick
  }
  h.anim = (phase) => {
    const sw = Math.sin(phase) * 0.7;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    h.leftArm.rotation.x = -sw * 0.8;
    h.rightArm.rotation.x = -0.6 + sw * 0.3;
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.2;
    h.body.rotation.x = 0.15; // hunched over
  };
  return h;
}

function makeSpiderModel(def) {
  const h = creature();
  const { M } = h;
  const queen = !!def.queen;
  const bodyM = M(def.skin);
  const dark = M(new THREE.Color(def.skin).multiplyScalar(0.55).getHex());
  part(h.body, boxGeo(1.7, 1.3, 2.0), bodyM, 0, 1.3, -1.0); // abdomen
  part(h.body, boxGeo(1.0, 0.8, 1.0), dark, 0, 1.1, 0.35); // thorax
  part(h.body, boxGeo(0.8, 0.7, 0.6), bodyM, 0, 1.05, 1.0); // head
  const eye = glow(h, queen ? 0xffd600 : 0xff1744);
  for (const [x, y] of [[-0.2, 1.2], [0.2, 1.2], [-0.32, 1.0], [0.32, 1.0]]) part(h.body, boxGeo(0.14, 0.14, 0.06), eye, x, y, 1.31);
  for (const side of [-1, 1]) part(h.body, boxGeo(0.12, 0.35, 0.12), dark, side * 0.18, 0.75, 1.32); // fangs
  if (queen) {
    part(h.body, boxGeo(0.6, 0.06, 0.9), glow(h, 0xff1744), 0, 1.97, -1.0); // red marking
    crown(h, h.body, 1.55, 0.55);
  }
  h.legs = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.45, 1.2, 0.75 - i * 0.4);
      pivot.rotation.y = side * (0.5 - i * 0.33) * -1;
      h.body.add(pivot);
      const upper = new THREE.Group();
      upper.rotation.z = side * 0.6;
      pivot.add(upper);
      part(upper, boxGeo(1.3, 0.16, 0.16), dark, side * 0.65, 0, 0);
      const knee = new THREE.Group();
      knee.position.x = side * 1.3;
      knee.rotation.z = side * -1.6;
      upper.add(knee);
      part(knee, boxGeo(2.0, 0.14, 0.14), dark, side * 1.0, 0, 0);
      h.legs.push({ pivot, base: pivot.rotation.y, i, side });
    }
  }
  h.anim = (phase) => {
    for (const l of h.legs) l.pivot.rotation.y = l.base + Math.sin(phase * 2 + (l.i + (l.side > 0 ? 1 : 0)) * Math.PI) * 0.3;
    h.body.position.y = Math.abs(Math.sin(phase * 2)) * 0.08;
  };
  return h;
}

function makeGhostModel(def) {
  const h = creature();
  const { M } = h;
  const spirit = !!def.spirit;
  const sheet = spirit ? glow(h, 0x80deea) : M(0xeceff1);
  if (spirit) sheet.emissiveIntensity = 0.5;
  const float = new THREE.Group();
  h.body.add(float);
  part(float, boxGeo(1.8, 1.6, 1.6), sheet, 0, 3.0, 0); // head
  part(float, boxGeo(2.1, 1.4, 1.8), sheet, 0, 1.9, 0); // body
  const tails = [];
  for (const x of [-0.7, 0, 0.7]) tails.push(part(float, boxGeo(0.6, 0.7, 1.6), sheet, x, 0.9, 0));
  for (const side of [-1, 1]) part(float, boxGeo(0.5, 0.9, 0.5), sheet, side * 1.25, 2.1, 0.4).rotation.x = -0.8;
  // Hollow black eyes and an "oooo" mouth (spirits get glowing eyes).
  const hole = spirit ? glow(h, 0x1de9b6) : M(0x111111);
  for (const side of [-1, 1]) part(float, boxGeo(0.4, 0.55, 0.08), hole, side * 0.42, 3.15, 0.82);
  part(float, boxGeo(0.35, 0.4, 0.08), M(0x111111), 0, 2.5, 0.82);
  h.anim = (phase, t) => {
    float.position.y = 0.4 + Math.sin(t * 2.5 + phase * 0.1) * 0.3;
    float.rotation.z = Math.sin(t * 1.7) * 0.08;
    tails.forEach((tl, i) => (tl.position.y = 0.9 + Math.sin(t * 6 + i * 2) * 0.12));
  };
  return h;
}

function makeStumpModel() {
  const h = creature();
  const { M } = h;
  const bark = M(0x6d4c41);
  const wood = M(0xd7b98e);
  const trunk = new THREE.Group();
  h.body.add(trunk);
  part(trunk, cylGeo(1.2, 1.4, 2.2), bark, 0, 1.6, 0);
  part(trunk, cylGeo(1.15, 1.15, 0.08), wood, 0, 2.73, 0);
  part(trunk, cylGeo(0.6, 0.6, 0.09), M(0xbc9a6c), 0, 2.74, 0); // growth ring
  // Little sprout on top.
  part(trunk, boxGeo(0.12, 0.6, 0.12), M(0x558b2f), 0.4, 3.05, -0.2);
  part(trunk, boxGeo(0.45, 0.12, 0.3), M(0x7cb342), 0.6, 3.3, -0.2);
  eyes(h, trunk, 1.9, 1.3, { spread: 0.42, size: 0.36 });
  for (const side of [-1, 1]) {
    const b = part(trunk, boxGeo(0.55, 0.14, 0.1), M(0x3e2723), side * 0.42, 2.22, 1.3);
    b.rotation.z = side * -0.35;
  }
  part(trunk, boxGeo(0.7, 0.15, 0.1), M(0x3e2723), 0, 1.35, 1.36);
  // Root legs.
  h.roots = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.6, 0.6, 0);
    h.body.add(leg);
    part(leg, boxGeo(0.55, 0.9, 0.55), bark, 0, -0.2, 0);
    part(leg, boxGeo(0.4, 0.25, 0.9), bark, 0, -0.55, 0.25);
    h.roots.push(leg);
  }
  for (const a of [0.8, 2.4, 3.9, 5.4]) {
    const r = part(trunk, boxGeo(0.35, 0.3, 0.8), bark, Math.sin(a) * 1.3, 0.65, Math.cos(a) * 1.3);
    r.rotation.y = a;
  }
  h.anim = (phase) => {
    const sw = Math.sin(phase);
    h.roots[0].rotation.x = sw * 0.6;
    h.roots[1].rotation.x = -sw * 0.6;
    trunk.rotation.z = sw * 0.08;
    trunk.position.y = Math.abs(Math.cos(phase)) * 0.15;
  };
  return h;
}

function makeUfoModel() {
  const h = creature();
  const { M } = h;
  const craft = new THREE.Group();
  craft.position.y = 0.6;
  h.body.add(craft);
  const metal = M(0x90a4ae);
  part(craft, cylGeo(2.1, 1.3, 0.5, 16), metal, 0, 0.5, 0);
  part(craft, cylGeo(1.2, 2.1, 0.35, 16), M(0xb0bec5), 0, 0.92, 0);
  part(craft, cylGeo(0.8, 0.5, 0.3, 12), glow(h, 0x76ff03), 0, 0.12, 0); // tractor beam light
  // The alien pilot under a glass dome.
  part(craft, boxGeo(0.8, 0.8, 0.8), M(0x8bc34a), 0, 1.5, 0);
  const eye = M(0x111111);
  for (const side of [-1, 1]) part(craft, boxGeo(0.25, 0.32, 0.06), eye, side * 0.2, 1.58, 0.42);
  part(craft, boxGeo(0.08, 0.4, 0.08), M(0x8bc34a), 0, 2.05, 0);
  part(craft, boxGeo(0.18, 0.18, 0.18), glow(h, 0xff4081), 0, 2.3, 0);
  const dome = M(0x80d8ff, { transparent: true, opacity: 0.35, depthWrite: false });
  const d = part(craft, new THREE.SphereGeometry(0.95, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), dome, 0, 1.08, 0);
  d.castShadow = false;
  const lights = new THREE.Group();
  craft.add(lights);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(lights, boxGeo(0.25, 0.2, 0.25), glow(h, i % 2 ? 0xffea00 : 0xff1744), Math.sin(a) * 1.9, 0.6, Math.cos(a) * 1.9);
  }
  h.anim = (phase, t) => {
    lights.rotation.y = t * 3;
    craft.rotation.z = Math.sin(t * 1.5) * 0.12;
    craft.rotation.x = 0.1 + Math.sin(t * 1.1) * 0.06;
    craft.position.y = 0.6 + Math.sin(t * 2.2) * 0.3;
  };
  return h;
}

function makeGolemModel() {
  const h = creature();
  const { M } = h;
  const rock = M(0x9e9e9e);
  const dark = M(0x757575);
  const moss = M(0x689f38);
  const torso = part(h.body, boxGeo(2.9, 2.5, 1.9), rock, 0, 3.6, 0);
  part(torso, boxGeo(1.2, 0.8, 0.3), dark, -0.5, 0.5, 0.9);
  part(torso, boxGeo(1.4, 0.4, 2.0), moss, 0.3, 1.2, 0);
  const head = part(h.body, boxGeo(1.4, 1.2, 1.3), dark, 0, 5.4, 0.2);
  eyes(h, head, 0.1, 0.66, { spread: 0.33, size: 0.28, white: 0xff9100, glowing: true });
  part(head, boxGeo(1.5, 0.25, 0.4), rock, 0, 0.45, 0.5); // heavy brow
  const limb = (x, y, w, len, mat) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    h.body.add(p);
    part(p, boxGeo(w, len, w), mat, 0, -len / 2, 0);
    part(p, boxGeo(w * 1.15, w * 0.7, w * 1.15), dark, 0, -len + w * 0.3, 0);
    return p;
  };
  h.leftArm = limb(2.0, 4.6, 1.2, 3.2, rock);
  h.rightArm = limb(-2.0, 4.6, 1.2, 3.2, rock);
  h.leftLeg = limb(0.75, 2.35, 1.2, 2.2, dark);
  h.rightLeg = limb(-0.75, 2.35, 1.2, 2.2, dark);
  h.anim = (phase) => {
    const sw = Math.sin(phase * 0.8);
    h.leftLeg.rotation.x = sw * 0.45;
    h.rightLeg.rotation.x = -sw * 0.45;
    h.leftArm.rotation.x = -sw * 0.35;
    h.rightArm.rotation.x = sw * 0.35;
    h.body.rotation.z = sw * 0.05;
    h.body.position.y = -Math.abs(sw) * 0.15;
  };
  return h;
}

function makeCageModel() {
  const h = creature();
  const { M } = h;
  const iron = M(0x546e7a);
  const box = new THREE.Group();
  h.body.add(box);
  part(box, boxGeo(2.6, 0.3, 2.6), iron, 0, 0.45, 0);
  part(box, boxGeo(2.6, 0.3, 2.6), iron, 0, 3.0, 0);
  part(box, boxGeo(0.6, 0.4, 0.6), iron, 0, 3.3, 0); // handle
  for (let i = 0; i < 4; i++) {
    const k = -1.15 + i * (2.3 / 3);
    for (const [x, z] of [[k, 1.15], [k, -1.15], [1.15, k], [-1.15, k]]) part(box, boxGeo(0.14, 2.3, 0.14), iron, x, 1.75, z);
  }
  // Something shadowy (and grumpy) inside.
  part(box, boxGeo(1.4, 1.6, 1.4), M(0x212121), 0, 1.4, 0);
  eyes(h, box, 1.75, 0.71, { spread: 0.3, size: 0.24, white: 0xff1744, glowing: true });
  // Wheels.
  h.wheels = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = part(h.body, cylGeo(0.35, 0.35, 0.2, 10), M(0x3e2723), x * 1.15, 0.35, z * 0.9);
    w.rotation.z = Math.PI / 2;
    h.wheels.push(w);
  }
  h.anim = (phase, t) => {
    for (const w of h.wheels) w.rotation.x = phase * 2;
    // Whatever is in there keeps rattling the bars.
    box.rotation.z = Math.sin(t * 17) * 0.04 * (Math.sin(t * 1.3) > 0.3 ? 1 : 0.2);
    box.position.y = Math.abs(Math.sin(t * 9)) * 0.08;
  };
  return h;
}

/** What a Molten (or a Bulwark) leaves behind: a smoldering heap that has to be broken. */
function makeCorpseModel(def) {
  const h = creature();
  const { M } = h;
  const lava = glow(h, def.lava ?? 0xff6d00);
  const heap = new THREE.Group();
  h.body.add(heap);
  if (def.metal) {
    // Bulwark wreck: twisted armor plates around a still-glowing reactor.
    const metal = M(0x546e7a);
    const dark = M(0x37474f);
    part(heap, boxGeo(2.6, 1.0, 2), metal, 0, 0.5, 0).rotation.y = 0.3;
    part(heap, boxGeo(1.2, 0.8, 1.2), dark, 1.3, 0.4, 1.0).rotation.z = 0.5;
    part(heap, boxGeo(0.6, 0.6, 1.8), dark, -1.4, 0.3, -0.6).rotation.y = 0.8;
    part(heap, boxGeo(0.9, 0.9, 0.9), lava, 0, 1.1, 0);
  } else {
    const rock = M(0x3e2723);
    part(heap, boxGeo(2, 0.8, 1.2), rock, 0, 0.4, 0); // body, lying down
    part(heap, boxGeo(1, 0.8, 1), rock, 1.5, 0.4, 0.1); // head
    part(heap, boxGeo(0.8, 0.5, 1.6), rock, -0.3, 0.25, 1.2).rotation.y = 0.4; // arm
    part(heap, boxGeo(1.4, 0.5, 0.7), rock, -1.6, 0.25, -0.3); // leg
    for (const [x, z, w, d] of [[0, 0, 1.6, 0.12], [0.3, 0.2, 0.12, 0.9], [1.5, 0.1, 0.5, 0.12]]) part(heap, boxGeo(w, 0.08, d), lava, x, 0.82, z);
  }
  const fire = flames(h, heap, 1, def.metal ? 1.6 : 1.2, 4);
  h.anim = (phase, t) => {
    fire(t);
    lava.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.25;
  };
  return h;
}

const CREATURES = {
  corpse: makeCorpseModel,
  slime: makeSlimeModel,
  goblin: makeGoblinModel,
  spider: makeSpiderModel,
  ghost: makeGhostModel,
  stump: makeStumpModel,
  ufo: makeUfoModel,
  golem: makeGolemModel,
  cage: makeCageModel,
};

/** Builds the model for an enemy definition (Easy mode creatures, or a zombie). */
export function makeEnemy(def) {
  const build = CREATURES[def.model];
  if (!build) return makeZombie(def);
  const h = build(def);
  if (def.hidden) setOpacity(h, 0.35);
  return h;
}
