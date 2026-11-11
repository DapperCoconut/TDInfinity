// Renders the static map (ground, path, portal, castle, decorations) from shared map data.
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { BOUNDS } from './sim/path.js';
import { BRIDGE_WIDTH, BRIDGE_X, CASTLE, CLIFFS, LANE_SPACING, MAP, POOLS, laneOz, mapInfo } from './sim/map.js';
import { CROSS_CELL, CROSS_GRID, CROSS_ROAD, NEXUS_CELL, NEXUS_DECK, NEXUS_GRID, NEXUS_PLATFORM, crossCh, crossGround, crossH } from './sim/maps.js';
import { COURT_CARDS, COURT_CELL, COURT_CRYSTALS, COURT_GRID, courtCell, courtLight, courtTile } from './sim/maps.js';
import { EMBER_CELL, EMBER_GRID, EMBER_VOLCANO, emberCell, emberCh } from './sim/maps.js';
import { buildRampart } from './rampartworld.js';
import { buildBrook } from './brookworld.js';
import { buildRig } from './rigworld.js';
import { GRAVE_PROPS } from './graveworld.js';

function tileTexture(base, variants, lines, size = 128, cells = 8) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rand = mulberry32(base.length * 977 + cells);
  const cs = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      g.fillStyle = rand() < 0.65 ? base : variants[Math.floor(rand() * variants.length)];
      g.fillRect(x * cs, y * cs, cs, cs);
    }
  }
  if (lines) {
    g.strokeStyle = lines;
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, size - 1, size - 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.anisotropy = 8;
  return t;
}

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const trunkMat = lambert(0x6d4c2f);
// Per-map materials (leaves, rocks, cliffs, water), made once per map by themeMats().
let mats = null;
let matsFor = null;
function themeMats() {
  if (matsFor === mapInfo) return mats;
  matsFor = mapInfo;
  const t = mapInfo.theme;
  const crystal = mapInfo.tree === 'crystal';
  mats = {
    leaves: t.leaves.map((c) => lambert(c, crystal ? { emissive: c, emissiveIntensity: 0.35, flatShading: true } : {})),
    rock: lambert(t.rock),
    cliff: lambert(t.cliff[0], { flatShading: true }),
    cliffDark: lambert(t.cliff[1], { flatShading: true }),
    cliffTop: lambert(t.cliff[2], { flatShading: true }),
    pool: lambert(t.water[0], { emissive: 0x0b2f55 }),
    poolDeep: lambert(t.water[1], { emissive: 0x08223f }),
  };
  return mats;
}

/**
 * Builds one copy of the map into a new group (added to `scene`) and returns it.
 * opts.oz: z offset (Versus lanes). opts.versus: leave gaps in the border trees for the
 * bridges and give the ground a dirt bank so it reads as an island above the water.
 */
export function buildWorld(parent, { oz = 0, versus = false } = {}) {
  if (mapInfo.nexus) return buildNexus(parent, { oz, versus });
  if (mapInfo.grid) return buildCrossing(parent, { oz, versus });
  if (mapInfo.court) return buildCourt(parent, { oz, versus });
  if (mapInfo.ember) return buildEmber(parent, { oz, versus });
  if (mapInfo.rampart) return buildRampart(parent, { oz, versus });
  if (mapInfo.brook) return buildBrook(parent, { oz, versus });
  if (mapInfo.rig) return buildRig(parent, { oz, versus });
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  // --- Ground ---
  const theme = mapInfo.theme;
  const m = themeMats();
  const grassTex = tileTexture(theme.ground[0], theme.ground.slice(1), 'rgba(0,0,0,0.08)');
  // Craters and pits are real holes in the ground (not in Versus, where water lies underneath).
  const holes = versus ? [] : MAP.props.filter((p) => p.kind === 'crater' || p.kind === 'pit');
  holesCut = holes.length > 0;
  let groundGeo;
  if (holes.length) {
    const shape = new THREE.Shape();
    shape.moveTo(-130, -90).lineTo(130, -90).lineTo(130, 90).lineTo(-130, 90).lineTo(-130, -90);
    for (const h of holes) {
      const hole = new THREE.Path();
      hole.absellipse(h.x, -h.z, h.rx, h.rz, 0, Math.PI * 2, true); // shape y = -world z after the rotation
      shape.holes.push(hole);
    }
    groundGeo = new THREE.ShapeGeometry(shape, 48);
    grassTex.repeat.set(1 / 16, 1 / 16); // shape UVs are in world units
  } else {
    groundGeo = new THREE.PlaneGeometry(260, 180);
    grassTex.repeat.set(260 / 16, 180 / 16);
  }
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ map: grassTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  if (versus) {
    const bank = new THREE.Mesh(boxGeo(260, 4, 180), bankMat);
    bank.position.y = -2.02;
    bank.receiveShadow = true;
    scene.add(bank);
  }

  // --- Path (one box per segment, extended to cover the corners) ---
  const dirtTex = tileTexture(theme.path[0], theme.path.slice(1), null, 64, 4);
  path.segs.forEach((s, i) => {
    const len = s.len + PATH_WIDTH;
    const tex = dirtTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, len / PATH_WIDTH);
    const mesh = new THREE.Mesh(boxGeo(PATH_WIDTH, 0.2, len), new THREE.MeshLambertMaterial({ map: tex }));
    // Stagger heights slightly so overlapping corner pieces don't z-fight.
    mesh.position.set((s.a.x + s.b.x) / 2, 0.1 + i * 0.004, (s.a.z + s.b.z) / 2);
    mesh.rotation.y = Math.atan2(s.dx, s.dz);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  buildPortal(scene, path.start);
  buildCastle(scene, CASTLE);
  const tree = TREES[mapInfo.tree] ?? TREES.round;
  for (const t of MAP.trees) tree(scene, t, m);
  const borderKind = mapInfo.border ?? mapInfo.tree;
  for (const t of MAP.border) {
    if (versus && Math.abs(t.x - BRIDGE_X) < BRIDGE_WIDTH + 3 && Math.abs(t.z) > BOUNDS.maxZ - 2) continue; // bridge landing
    if (borderKind === 'building') PROPS.building(scene, { ...t, s: t.s * 1.3, v: t.leaf / 3 }, m);
    else (TREES[borderKind] ?? tree)(scene, t, m);
  }
  for (const c of CLIFFS) buildCliff(scene, c, m);
  for (const p of POOLS) buildPool(scene, p, m);
  for (const r of MAP.rocks) {
    const rock = part(scene, boxGeo(2 * r.s, 1.4 * r.s, 1.7 * r.s), m.rock, r.x, 0.6 * r.s, r.z);
    rock.rotation.set(r.rx, r.ry, r.rz);
  }
  const animated = [];
  for (const p of MAP.props) (PROPS[p.kind] ?? GRAVE_PROPS[p.kind])?.(scene, p, m, animated);
  if (animated.length) scene.userData.tick = (t) => animated.forEach((f) => f(t));
  return scene;
}

const bankMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
const waterMat = new THREE.MeshLambertMaterial({ color: 0x2f8fd8 });
const plankMat = new THREE.MeshLambertMaterial({ color: 0x9c6b3c });
const plankDarkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
const ropeMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 });

/**
 * Versus extras for `lanes` maps: water under everything and a wooden bridge across each gap.
 * Returns the group (added to `parent`).
 */
export function buildVersusLinks(parent, lanes) {
  const g = new THREE.Group();
  parent.add(g);
  const span = laneOz(lanes - 1);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, span + 700), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.6, span / 2);
  water.receiveShadow = true;
  g.add(water);
  for (let i = 0; i < lanes - 1; i++) {
    const z0 = laneOz(i) + BOUNDS.maxZ + 8;
    const z1 = laneOz(i + 1) - BOUNDS.maxZ - 8;
    const len = z1 - z0;
    const mid = (z0 + z1) / 2;
    const w = BRIDGE_WIDTH;
    // Beams underneath, then planks across.
    for (const side of [-1, 1]) part(g, boxGeo(0.6, 0.8, len), plankDarkMat, BRIDGE_X + side * (w / 2 - 0.6), -0.3, mid);
    for (let z = z0 + 0.6; z < z1; z += 1.25) {
      const p = part(g, boxGeo(w, 0.25, 1.05), z % 2.5 < 1.25 ? plankMat : plankDarkMat, BRIDGE_X, 0.02, z);
      p.rotation.y = ((z * 7.3) % 1 - 0.5) * 0.04;
    }
    // Posts and rope rails.
    for (const side of [-1, 1]) {
      const x = BRIDGE_X + side * (w / 2 + 0.2);
      for (let z = z0; z <= z1 + 0.01; z += len / 6) part(g, boxGeo(0.45, 2.6, 0.45), plankDarkMat, x, 0.9, z);
      part(g, boxGeo(0.15, 0.15, len), ropeMat, x, 1.9, mid);
      part(g, boxGeo(0.12, 0.12, len), ropeMat, x, 1.1, mid);
    }
    // Support pillars standing in the water.
    for (const z of [z0 + len * 0.3, z0 + len * 0.7]) {
      for (const side of [-1, 1]) part(g, boxGeo(0.9, 3, 0.9), plankDarkMat, BRIDGE_X + side * (w / 2 - 0.6), -1.8, z);
    }
  }
  return g;
}

/** Can a player stand at world (x, z) in a Versus game with `lanes` maps? (land or a bridge) */
export function versusWalkable(x, z, lanes) {
  if (x < BOUNDS.minX || x > BOUNDS.maxX) return false;
  const lane = Math.round(z / LANE_SPACING);
  if (lane < 0 || lane >= lanes) return false;
  const local = z - laneOz(lane);
  if (local >= BOUNDS.minZ && local <= BOUNDS.maxZ) return true;
  // Between maps: only on the bridge (not past the first or last map).
  if (Math.abs(x - BRIDGE_X) > BRIDGE_WIDTH / 2 - 0.9) return false;
  return local > 0 ? lane < lanes - 1 : lane > 0;
}


const sandMat = new THREE.MeshLambertMaterial({ color: 0xd8c38e });
const reedMat = new THREE.MeshLambertMaterial({ color: 0x4f8f3a });
const lilyMat = new THREE.MeshLambertMaterial({ color: 0x6fbf4a });

/** A round pond with a sandy shore. Water towers (Patrol Boat) float in it. */
function buildPool(scene, { x, z, r }, { pool: poolMat, poolDeep: poolDeepMat }) {
  const rand = mulberry32(Math.round(x * 13 + z * 29 + 4242));
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const disc = (radius, y, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.04, 28), mat);
    m.position.y = y;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  disc(r + 1, 0.03, sandMat); // shore
  disc(r, 0.06, poolMat); // water
  disc(r * 0.55, 0.07, poolDeepMat); // deeper middle
  // Reeds around the shore and a few lily pads near the edge.
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2;
    const d = r + 0.3 + rand() * 0.5;
    const tall = 0.8 + rand() * 0.9;
    part(g, boxGeo(0.12, tall, 0.12), reedMat, Math.cos(a) * d, tall / 2, Math.sin(a) * d).rotation.z = (rand() - 0.5) * 0.4;
  }
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const d = r - 0.8 - rand() * 0.6;
    const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.03, 8), lilyMat);
    lily.position.set(Math.cos(a) * d, 0.09, Math.sin(a) * d);
    g.add(lily);
  }
  scene.add(g);
}

/** A blocky rock plateau; cliff towers stand on its grassy top. */
function buildCliff(scene, { x, z, r, h }, { cliff: cliffMat, cliffDark: cliffDarkMat, cliffTop: cliffTopMat }) {
  const rand = mulberry32(Math.round(x * 31 + z * 17 + 999));
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.8, h, 10), cliffMat);
  rock.position.y = h / 2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.3, 10), cliffTopMat);
  top.position.y = h + 0.05;
  for (const m of [rock, top]) {
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  // Boulders and ledges around the base so it reads as rock, not a pillar.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
    const s = 1 + rand() * 1.4;
    const b = part(g, boxGeo(2 * s, 1.4 * s, 1.8 * s), rand() < 0.5 ? cliffMat : cliffDarkMat, Math.cos(a) * (r + 0.6), 0.5 * s, Math.sin(a) * (r + 0.6));
    b.rotation.set(rand() * 0.3, -a, rand() * 0.3);
  }
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const ledge = part(g, boxGeo(2.5, 0.8, 1.5), cliffDarkMat, Math.cos(a) * (r + 0.3), h * (0.35 + rand() * 0.4), Math.sin(a) * (r + 0.3));
    ledge.rotation.y = -a;
  }
  scene.add(g);
}

/** A group at (x, z) turned by `rot` and scaled by `s`, added to `scene`. */
function placed(scene, { x, z, s = 1, rot = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}

const darkTrunkMat = lambert(0x3e2a1c);
const palmTrunkMat = lambert(0x9c7a4f);
const cactusMat = lambert(0x4f8f3a);
const cactusDarkMat = lambert(0x3f7a2e);
const snowMat = lambert(0xf5f9fc);

// Trees by kind: (scene, { x, z, s, rot, leaf }, mats).
const TREES = {
  round(scene, t, m) {
    const g = placed(scene, t);
    part(g, boxGeo(1.2, 4, 1.2), trunkMat, 0, 2, 0);
    part(g, boxGeo(4.6, 3.4, 4.6), m.leaves[t.leaf], 0, 5.2, 0);
    part(g, boxGeo(3, 2, 3), m.leaves[t.leaf], 0, 7.6, 0);
  },
  pine(scene, t, m) {
    const g = placed(scene, t);
    part(g, boxGeo(1, 3, 1), trunkMat, 0, 1.5, 0);
    [[4.8, 2.5], [3.6, 4.6], [2.4, 6.6], [1.2, 8.3]].forEach(([w, y], i) => {
      part(g, boxGeo(w, 2, w), m.leaves[t.leaf], 0, y, 0);
      if (!mapInfo.theme.snow) return;
      part(g, boxGeo(w * 0.8, 0.35, w * 0.8), snowMat, 0, y + 1.1, 0).castShadow = i === 3; // snowy tops
    });
  },
  dead(scene, t, m) {
    const g = placed(scene, t);
    part(g, boxGeo(0.9, 6, 0.9), darkTrunkMat, 0, 3, 0);
    for (const [y, a, len] of [[3.8, 0.6, 2.6], [4.8, -0.7, 2.2], [5.6, 0.5, 1.6]]) {
      const b = part(g, boxGeo(0.45, len, 0.45), darkTrunkMat, Math.sin(a) * len * 0.45, y, 0);
      b.rotation.z = -a;
    }
  },
  cactus(scene, t) {
    const g = placed(scene, t);
    part(g, boxGeo(1.3, 5, 1.3), cactusMat, 0, 2.5, 0);
    for (const side of [-1, 1]) {
      const y = side < 0 ? 2.2 : 3.1;
      part(g, boxGeo(1.4, 0.8, 0.8), cactusDarkMat, side * 1.1, y, 0);
      part(g, boxGeo(0.8, 1.8, 0.8), cactusMat, side * 1.6, y + 1.1, 0);
    }
  },
  palm(scene, t, m) {
    const g = placed(scene, t);
    for (let i = 0; i < 6; i++) part(g, boxGeo(0.8, 1.3, 0.8), palmTrunkMat, i * 0.18, 0.65 + i * 1.2, 0).rotation.z = -0.08;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = part(g, boxGeo(3.4, 0.25, 1), m.leaves[t.leaf], 1 + Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
      leaf.rotation.set(0, -a, -0.35);
    }
  },
  crystal(scene, t, m) {
    const g = placed(scene, t);
    const mat = m.leaves[t.leaf];
    part(g, new THREE.OctahedronGeometry(1.6, 0), mat, 0, 3.4, 0).scale.set(1, 2.4, 1);
    for (const [dx, dz, k] of [[1.6, 0.6, 0.6], [-1.3, 1, 0.5], [0.2, -1.5, 0.45]]) {
      const c = part(g, new THREE.OctahedronGeometry(1.6 * k, 0), mat, dx, 1.8 * k, dz);
      c.scale.set(1, 2, 1);
      c.rotation.z = dx * 0.15;
    }
  },
};

const flowerMats = [0xffeb3b, 0xff7043, 0xf06292, 0xffffff, 0xba68c8].map((c) => lambert(c));
const stemMat = lambert(0x3f8f2f);
const bushMat = lambert(0x6b8f3a);
const metalMat = lambert(0x37474f);
const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
const crateMat = lambert(0xa1774a);
const crateDarkMat = lambert(0x7a5531);
const barrelMats = [0xc62828, 0x1565c0, 0xf9a825].map((c) => lambert(c));
const buildingMats = [0x8d8a85, 0x9e8c7a, 0x7b8088, 0x6f6a66].map((c) => lambert(c, { flatShading: true }));
const windowMat = lambert(0x263238);
const containerMats = [0xc0392b, 0x2e86c1, 0x27ae60, 0xe67e22, 0x8e44ad].map((c) => lambert(c));
const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff6d00 });
const lavaHotMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
const crustMat = lambert(0x2a211e);
const smokeMat = new THREE.MeshLambertMaterial({ color: 0x6d6d6d, transparent: true, opacity: 0.55 });
const iceMat = lambert(0xb3e5fc, { transparent: true, opacity: 0.85, flatShading: true });
const coalMat = lambert(0x212121);
const carrotMat = lambert(0xff7043);
const ruinMat = lambert(0x6e6680, { flatShading: true });
const ruinDarkMat = lambert(0x524a63, { flatShading: true });
const plankWallMat = lambert(0x8d6236);
const plazaMat = lambert(0x8f8a80);
let holesCut = false; // whether the current ground has its craters cut out (not in Versus)
const voidMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide });
const railMat = lambert(0xb4b4b8);
const trussMat = lambert(0x3c3c40);
const ditchMat = lambert(0xc4ad82);
const signMat = lambert(0x2f7a3a);
const signTextMat = lambert(0xf2f2f2);
const lineMat = lambert(0xe8c537);
const edgeLineMat = lambert(0xb4b4b8);

// Decorations by kind: (scene, prop, mats, animated). Push a (t) => {} into `animated` to move it.
const PROPS = {
  flower(scene, p) {
    const g = placed(scene, p);
    for (let i = 0; i < 3; i++) {
      const dx = Math.cos(i * 2.1 + p.v * 6) * 0.7;
      const dz = Math.sin(i * 2.1 + p.v * 6) * 0.7;
      part(g, boxGeo(0.12, 0.6, 0.12), stemMat, dx, 0.3, dz).castShadow = false;
      part(g, boxGeo(0.45, 0.3, 0.45), flowerMats[Math.floor(p.v * 5 + i) % 5], dx, 0.7, dz).castShadow = false;
    }
  },
  bush(scene, p) {
    const g = placed(scene, p);
    part(g, boxGeo(2.4, 1.3, 2), bushMat, 0, 0.65, 0);
    part(g, boxGeo(1.4, 0.8, 1.4), bushMat, 0.5, 1.5, 0.2);
  },
  lamp(scene, p) {
    const g = placed(scene, p);
    part(g, boxGeo(0.35, 5, 0.35), metalMat, 0, 2.5, 0);
    part(g, boxGeo(1, 0.3, 1), metalMat, 0, 5.1, 0);
    part(g, boxGeo(0.7, 0.7, 0.7), lampGlowMat, 0, 4.6, 0).castShadow = false;
  },
  crate(scene, p) {
    const g = placed(scene, p);
    part(g, boxGeo(1.8, 1.6, 1.8), crateMat, 0, 0.8, 0);
    part(g, boxGeo(1.9, 0.25, 1.9), crateDarkMat, 0, 1.45, 0);
    if (p.v > 0.5) part(g, boxGeo(1.2, 1.1, 1.2), crateMat, 0.2, 2.15, -0.1).rotation.y = 0.5;
  },
  barrel(scene, p) {
    const g = placed(scene, p);
    part(g, new THREE.CylinderGeometry(0.8, 0.8, 1.7, 10), barrelMats[Math.floor(p.v * 3)], 0, 0.85, 0);
  },
  building(scene, p) {
    const g = placed(scene, p);
    const w = 7 + p.v * 3;
    const h = 7 + p.v * 9;
    const mat = buildingMats[Math.floor(p.v * 4)];
    part(g, boxGeo(w, h, w), mat, 0, h / 2, 0);
    part(g, boxGeo(w + 0.6, 0.6, w + 0.6), windowMat, 0, h + 0.3, 0);
    // Rows of dark windows on two sides.
    for (let y = 2.5; y < h - 1; y += 3) {
      for (let k = -1; k <= 1; k++) {
        part(g, boxGeo(1.2, 1.4, 0.1), windowMat, k * (w / 3.2), y, w / 2 + 0.05).castShadow = false;
        part(g, boxGeo(0.1, 1.4, 1.2), windowMat, w / 2 + 0.05, y, k * (w / 3.2)).castShadow = false;
      }
    }
  },
  container(scene, p) {
    const g = placed(scene, p);
    const mat = containerMats[Math.floor(p.v * 5)];
    part(g, boxGeo(6, 2.6, 2.5), mat, 0, 1.3, 0);
    for (let x = -2.6; x <= 2.6; x += 0.65) part(g, boxGeo(0.12, 2.4, 2.6), metalMat, x, 1.3, 0).castShadow = false;
    if (p.v > 0.6) part(g, boxGeo(6, 2.6, 2.5), containerMats[Math.floor(p.v * 13) % 5], 0, 3.9, 0);
  },
  lava(scene, p, m, animated) {
    const g = placed(scene, p);
    const disc = (r, y, mat) => {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 18), mat);
      d.position.y = y;
      g.add(d);
      return d;
    };
    disc(4, 0.03, crustMat);
    disc(3.4, 0.06, lavaMat);
    const hot = disc(1.6, 0.08, lavaHotMat);
    animated.push((t) => hot.scale.setScalar(1 + Math.sin(t * 2 + p.v * 9) * 0.25));
  },
  vent(scene, p, m, animated) {
    const g = placed(scene, p);
    part(g, new THREE.CylinderGeometry(0.8, 1.6, 1.2, 8), crustMat, 0, 0.6, 0);
    part(g, new THREE.CylinderGeometry(0.6, 0.6, 0.1, 8), lavaMat, 0, 1.22, 0);
    const puffs = [0, 1, 2].map(() => part(g, boxGeo(1, 1, 1), smokeMat, 0, 2, 0));
    for (const q of puffs) q.castShadow = false;
    animated.push((t) => {
      puffs.forEach((q, i) => {
        const k = (t * 0.5 + i / 3 + p.v) % 1;
        q.position.set(Math.sin(k * 5 + i) * 0.6, 1.5 + k * 6, 0);
        q.scale.setScalar(0.6 + k * 1.6);
      });
    });
  },
  snowman(scene, p) {
    const g = placed(scene, p);
    part(g, new THREE.SphereGeometry(1.3, 10, 8), snowMat, 0, 1.2, 0);
    part(g, new THREE.SphereGeometry(0.95, 10, 8), snowMat, 0, 2.9, 0);
    part(g, new THREE.SphereGeometry(0.65, 10, 8), snowMat, 0, 4.2, 0);
    part(g, boxGeo(0.15, 0.15, 0.6), carrotMat, 0, 4.2, 0.8);
    for (const dx of [-0.25, 0.25]) part(g, boxGeo(0.14, 0.14, 0.1), coalMat, dx, 4.4, 0.6);
    part(g, boxGeo(1, 0.15, 1), coalMat, 0, 4.8, 0);
    part(g, boxGeo(0.7, 0.7, 0.7), coalMat, 0, 5.2, 0);
  },
  ice(scene, p) {
    const g = placed(scene, p);
    part(g, new THREE.OctahedronGeometry(1.2, 0), iceMat, 0, 1.8, 0).scale.set(1, 2, 1);
    part(g, new THREE.OctahedronGeometry(0.7, 0), iceMat, 1, 1, 0.3).scale.set(1, 1.8, 1);
  },
  pillar(scene, p) {
    const g = placed(scene, p);
    const h = 3 + p.v * 6; // some standing tall, some snapped off
    part(g, boxGeo(2.4, 0.6, 2.4), ruinDarkMat, 0, 0.3, 0);
    part(g, new THREE.CylinderGeometry(0.85, 0.95, h, 8), ruinMat, 0, 0.6 + h / 2, 0);
    if (p.v > 0.6) part(g, boxGeo(2.2, 0.6, 2.2), ruinDarkMat, 0, 0.9 + h, 0);
    else part(g, new THREE.CylinderGeometry(0.85, 0.85, 2.4, 8), ruinMat, 1.6, 0.85, 0.6).rotation.z = Math.PI / 2; // fallen piece
  },
  rubble(scene, p) {
    const g = placed(scene, p);
    for (let i = 0; i < 4; i++) {
      const b = part(g, boxGeo(1.4 - i * 0.2, 0.9, 1.1), i % 2 ? ruinMat : ruinDarkMat, Math.cos(i * 1.7) * 0.9, 0.4 + (i === 3 ? 0.7 : 0), Math.sin(i * 1.7) * 0.9);
      b.rotation.set(0.2 * i, i, 0.1);
    }
  },
  wall(scene, p) {
    for (const w of p.sections) {
      const g = placed(scene, { x: w.x, z: w.z });
      part(g, boxGeo(3, 3.4, 0.9), plankWallMat, 0, 1.7, 0);
      for (const dx of [-1, 0, 1]) part(g, boxGeo(0.7, 0.8, 0.7), plankWallMat, dx, 3.8, 0).rotation.y = Math.PI / 4; // pointed tops
      part(g, boxGeo(3.1, 0.3, 1), crateDarkMat, 0, 2.6, 0);
    }
  },
  volcano(scene, p, m, animated) {
    const g = placed(scene, p);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 15, 16, 12, 1, true), m.cliff);
    cone.position.y = 8;
    cone.castShadow = cone.receiveShadow = true;
    g.add(cone);
    const crater = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.3, 12), lavaMat);
    crater.position.y = 15.4;
    g.add(crater);
    // Lava streams running down the sides.
    for (const a of [0.4, 2.3, 4.4]) {
      const side = new THREE.Group();
      side.rotation.y = -a;
      g.add(side);
      // Lies along the cone's slope (10.5 in, 16 up), just above its surface.
      part(side, boxGeo(1.4, 19, 0.3), lavaMat, 10, 8, 0).rotation.z = Math.atan2(10.5, 16);
    }
    const puffs = [0, 1, 2, 3, 4].map(() => part(g, boxGeo(2.4, 2.4, 2.4), smokeMat, 0, 17, 0));
    for (const q of puffs) q.castShadow = false;
    animated.push((t) => {
      puffs.forEach((q, i) => {
        const k = (t * 0.12 + i / 5) % 1;
        q.position.set(Math.sin(k * 4 + i) * 2 + k * 6, 16 + k * 20, Math.cos(k * 3 + i) * 2);
        q.scale.setScalar(0.8 + k * 2.5);
        q.rotation.y = k * 3;
      });
    });
  },
  mesa(scene, p, m) {
    // A flat-topped octagonal rock mesa in layered steps (the walls of Sunken Canyon).
    const g = placed(scene, { x: p.x, z: p.z, rot: (p.x * 0.37 + p.z * 0.11) % Math.PI });
    const steps = 3;
    for (let i = 0; i < steps; i++) {
      const h = p.h / steps;
      const r = p.r * (1 - i * 0.09);
      const layer = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.4, r + 0.4, h, 8), i % 2 ? m.cliffDark : m.cliff);
      layer.position.y = h * i + h / 2;
      layer.castShadow = layer.receiveShadow = true;
      g.add(layer);
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.8 - 0.4, p.r * 0.8 - 0.4, 0.3, 8), m.cliffTop);
    top.position.y = p.h + 0.1;
    top.receiveShadow = true;
    g.add(top);
  },
  crater(scene, p, m) {
    // A bottomless pit: black walls going down, a red-rock lip around the edge, and a steel truss
    // bridge carrying the road across.
    const g = placed(scene, { x: p.x, z: p.z });
    if (!holesCut) {
      const flat = new THREE.Mesh(new THREE.CircleGeometry(1, 40), voidMat);
      flat.rotation.x = -Math.PI / 2;
      flat.scale.set(p.rx, p.rz, 1);
      flat.position.y = 0.03;
      g.add(flat);
    }
    const depth = 14;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, depth, 40, 1, true), voidMat);
    wall.scale.set(p.rx, 1, p.rz);
    wall.position.y = -depth / 2;
    g.add(wall);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 40), voidMat);
    floor.rotation.x = -Math.PI / 2;
    floor.scale.set(p.rx, p.rz, 1);
    floor.position.y = -depth;
    g.add(floor);
    const rand = mulberry32(Math.round(p.x * 7 + p.z * 13 + 31));
    const n = Math.round((p.rx + p.rz) * 0.9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = 0.6 + rand() * 0.5;
      const lip = part(g, boxGeo(3.2 * s, 0.9 * s, 1.6 * s), rand() < 0.5 ? m.cliff : m.cliffTop, Math.cos(a) * (p.rx + 0.4), 0.3 * s, Math.sin(a) * (p.rz + 0.4));
      lip.rotation.y = -Math.atan2(Math.sin(a) * p.rx, Math.cos(a) * p.rz) + Math.PI / 2;
    }
    if (p.rx < 8) return; // the small pit has no bridge
    // Bridge: rails along both sides of the road where it is over the hole, truss underneath.
    for (const seg of path.segs) {
      const len = Math.hypot(seg.b.x - seg.a.x, seg.b.z - seg.a.z);
      const ux = (seg.b.x - seg.a.x) / len;
      const uz = (seg.b.z - seg.a.z) / len;
      // Where this segment enters and leaves the ellipse (sampled; the road here is straight).
      let t0 = null;
      let t1 = null;
      for (let t = 0; t <= len; t += 0.5) {
        const dx = seg.a.x + ux * t - p.x;
        const dz = seg.a.z + uz * t - p.z;
        if ((dx / (p.rx + 1)) ** 2 + (dz / (p.rz + 1)) ** 2 <= 1) {
          t0 ??= t;
          t1 = t;
        }
      }
      if (t0 === null) continue;
      const span = t1 - t0;
      const b = new THREE.Group();
      b.position.set(seg.a.x + ux * (t0 + span / 2) - p.x, 0, seg.a.z + uz * (t0 + span / 2) - p.z);
      b.rotation.y = Math.atan2(ux, uz);
      g.add(b);
      const half = PATH_WIDTH / 2;
      for (const side of [-1, 1]) {
        part(b, boxGeo(0.3, 0.3, span), railMat, side * (half + 0.15), 0.85, 0);
        for (let k = -span / 2; k <= span / 2; k += 3) part(b, boxGeo(0.25, 0.7, 0.25), railMat, side * (half + 0.15), 0.45, k);
        // Truss sides: top and bottom chords with diagonals, hanging below the deck.
        part(b, boxGeo(0.4, 0.4, span), trussMat, side * (half - 0.2), -0.1, 0);
        part(b, boxGeo(0.4, 0.4, span - 6), trussMat, side * (half - 0.2), -4.5, 0);
        for (let k = -span / 2 + 3; k < span / 2 - 3; k += 3) {
          part(b, boxGeo(0.3, 4.4, 0.3), trussMat, side * (half - 0.2), -2.3, k);
          const d = part(b, boxGeo(0.25, 5.4, 0.25), trussMat, side * (half - 0.2), -2.3, k + 1.5);
          d.rotation.x = (k / 3) % 2 ? 0.6 : -0.6;
        }
      }
      for (let k = -span / 2 + 3; k < span / 2 - 3; k += 3) part(b, boxGeo(PATH_WIDTH - 0.4, 0.3, 0.3), trussMat, 0, -4.5, k);
      // Legs down into the dark at both ends of the span.
      for (const e of [-1, 1]) for (const side of [-1, 1]) part(b, boxGeo(0.5, 12, 0.5), trussMat, side * (half - 0.2), -6, e * (span / 2 - 3));
    }
  },
  pit(scene, p, m) {
    PROPS.crater(scene, p, m);
  },
  ditch(scene, p, m) {
    // A shallow hexagonal trench with red-rock walls (decor; it's only a few studs deep).
    const g = placed(scene, { x: p.x, z: p.z, rot: p.rot ?? 0 });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, 0.06, 6), ditchMat);
    floor.position.y = 0.04;
    floor.receiveShadow = true;
    g.add(floor);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const edge = 2 * p.r * Math.sin(Math.PI / 6);
      const w = part(g, boxGeo(edge + 0.4, 0.5, 0.7), m.cliff, Math.cos(a) * p.r * 0.87, 0.25, Math.sin(a) * p.r * 0.87);
      w.rotation.y = -a + Math.PI / 2;
    }
  },
  sign(scene, p) {
    // A small green roadside sign on two posts.
    const g = placed(scene, { x: p.x, z: p.z, rot: p.rot ?? 0 });
    for (const dx of [-1.1, 1.1]) part(g, boxGeo(0.2, 3, 0.2), railMat, dx, 1.5, 0);
    part(g, boxGeo(3.2, 1.6, 0.15), signMat, 0, 3, 0);
    for (const [y, w] of [[3.35, 2.2], [2.75, 1.6]]) part(g, boxGeo(w, 0.22, 0.17), signTextMat, 0, y, 0).castShadow = false;
  },
  roadlines(scene) {
    // Yellow dashed centre line and light-grey edge strips along the whole road.
    path.segs.forEach((seg, i) => {
      const y = 0.205 + i * 0.004;
      const g = new THREE.Group();
      g.position.set(seg.a.x, 0, seg.a.z);
      g.rotation.y = Math.atan2(seg.dx, seg.dz);
      scene.add(g);
      const len = Math.hypot(seg.b.x - seg.a.x, seg.b.z - seg.a.z);
      for (let t = 1; t < len - 1; t += 4) part(g, boxGeo(0.25, 0.02, 2), lineMat, 0, y, t + 1).castShadow = false;
      for (const side of [-1, 1]) part(g, boxGeo(0.25, 0.02, len), edgeLineMat, side * (PATH_WIDTH / 2 - 0.3), y, len / 2).castShadow = false;
    });
  },
  plaza(scene, p) {
    // A round cobblestone square where the roads cross.
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.12, 28), plazaMat);
    disc.position.set(p.x, 0.06, p.z);
    disc.receiveShadow = true;
    scene.add(disc);
  },
};

function buildPortal(scene, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  const first = path.segs[0];
  g.rotation.y = Math.atan2(first.dx, first.dz) - Math.PI / 2; // face down the path
  const stone = new THREE.MeshLambertMaterial({ color: 0x3a3a46 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x9c27b0, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  part(g, boxGeo(2, 12, 2), stone, 0, 6, -5);
  part(g, boxGeo(2, 12, 2), stone, 0, 6, 5);
  part(g, boxGeo(2.4, 2, 12.4), stone, 0, 12.5, 0);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(8, 11.5), glow);
  portal.rotation.y = Math.PI / 2;
  portal.position.y = 5.8;
  g.add(portal);
  scene.add(g);
}

function buildCastle(scene, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  const wall = new THREE.MeshLambertMaterial({ color: 0xbdbdbd });
  const darkWall = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
  const roof = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
  part(g, boxGeo(10, 10, 14), wall, 0, 5, 0);
  for (let i = -3; i <= 3; i++) {
    if (i % 2 === 0) continue;
    part(g, boxGeo(1.2, 1.4, 1.6), darkWall, -4.4, 10.7, i * 2);
    part(g, boxGeo(1.2, 1.4, 1.6), darkWall, 4.4, 10.7, i * 2);
  }
  for (const [tx, tz] of [[-5, -7], [-5, 7], [5, -7], [5, 7]]) {
    part(g, boxGeo(3.4, 14, 3.4), darkWall, tx, 7, tz);
    part(g, boxGeo(4, 2.4, 4), roof, tx, 15.2, tz);
  }
  part(g, boxGeo(0.4, 5.5, 5), new THREE.MeshLambertMaterial({ color: 0x4e342e }), -5.1, 2.75, 0); // gate
  part(g, boxGeo(0.3, 8, 0.3), darkWall, 0, 14, 0); // flag pole
  part(g, boxGeo(0.1, 2, 3), new THREE.MeshLambertMaterial({ color: 0xe53935 }), 0, 17, 1.6);
  scene.add(g);
}

/**
 * Insane mode: the Beholder's time dimension. A dark violet plain with one long straight path of
 * glowing stone, huge clock faces and floating gears all around. Built on first use (the shared
 * `path` must already be the time dimension's). Returns the group (added to `parent`); call
 * `group.userData.tick(t)` every frame to turn the clock hands and gears.
 */
export function buildTimeWorld(parent) {
  const scene = new THREE.Group();
  parent.add(scene);
  const floorTex = tileTexture('#241640', ['#2a1a4a', '#1e1236', '#2f1d55'], 'rgba(179,136,255,0.18)');
  floorTex.repeat.set(260 / 16, 180 / 16);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 180), new THREE.MeshLambertMaterial({ map: floorTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // The path: pale stone with glowing gold edges and clock-tick marks along it.
  const stone = new THREE.MeshLambertMaterial({ color: 0x9e8fc4 });
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd740 });
  const violet = new THREE.MeshBasicMaterial({ color: 0xb388ff });
  for (const s of path.segs) {
    const len = s.len + PATH_WIDTH;
    const yaw = Math.atan2(s.dx, s.dz);
    const g = new THREE.Group();
    g.position.set((s.a.x + s.b.x) / 2, 0, (s.a.z + s.b.z) / 2);
    g.rotation.y = yaw;
    scene.add(g);
    part(g, boxGeo(PATH_WIDTH, 0.2, len), stone, 0, 0.1, 0).receiveShadow = true;
    for (const side of [-1, 1]) part(g, boxGeo(0.25, 0.3, len), gold, side * (PATH_WIDTH / 2 + 0.1), 0.15, 0);
    for (let z = -len / 2 + 3; z < len / 2; z += 6) part(g, boxGeo(PATH_WIDTH * 0.6, 0.06, 0.3), violet, 0, 0.23, z);
  }
  buildPortal(scene, path.start);
  buildCastle(scene, CASTLE);

  // Giant clock faces standing on both sides of the path, and gears floating overhead.
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xffc400, emissive: 0x3a2a00 });
  const faceMat = new THREE.MeshLambertMaterial({ color: 0xede7f6, emissive: 0x2a1f40 });
  const handMat = new THREE.MeshBasicMaterial({ color: 0x1a1033 });
  const gearMat = new THREE.MeshLambertMaterial({ color: 0x7e57c2, emissive: 0x1a0f33 });
  const hands = [];
  const gears = [];
  const rand = mulberry32(4242);
  const clock = (x, z, size, yaw) => {
    const g = new THREE.Group();
    g.position.set(x, size + 1, z);
    g.rotation.y = yaw;
    scene.add(g);
    part(g, new THREE.CylinderGeometry(size, size, 0.6, 32).rotateX(Math.PI / 2), faceMat, 0, 0, 0);
    part(g, new THREE.TorusGeometry(size, size * 0.08, 6, 32), rimMat, 0, 0, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(g, boxGeo(size * 0.06, size * (i % 3 ? 0.1 : 0.18), 0.2), handMat, Math.sin(a) * size * 0.85, Math.cos(a) * size * 0.85, 0.35).rotation.z = -a;
    }
    const hour = new THREE.Group();
    const minute = new THREE.Group();
    hour.position.z = minute.position.z = 0.45;
    part(hour, boxGeo(size * 0.08, size * 0.5, 0.1), handMat, 0, size * 0.25, 0);
    part(minute, boxGeo(size * 0.05, size * 0.8, 0.1), handMat, 0, size * 0.4, 0);
    g.add(hour, minute);
    part(g, boxGeo(size * 0.2, size + 1, size * 0.2), rimMat, 0, -size / 2 - 0.5, -0.4); // stand
    hands.push({ hour, minute, speed: (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 1.5) });
  };
  // Placed relative to the path's row (it runs along the current map's end z).
  const pz = path.end.z;
  for (const [x, dz, size] of [[-80, 40, 7], [-35, 55, 9], [10, 42, 6], [55, 58, 10], [-60, -35, 8], [-5, -38, 7], [40, -32, 9], [80, 35, 6]]) {
    const z = Math.abs(pz + dz) <= 60 ? pz + dz : pz - dz; // keep it on the plain
    clock(x, z, size, z > pz ? Math.PI : 0);
  }
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const r = 3 + rand() * 6;
    g.position.set(-110 + rand() * 220, 18 + rand() * 25, -70 + rand() * 140);
    g.rotation.x = Math.PI / 2 + (rand() - 0.5) * 0.8;
    part(g, new THREE.CylinderGeometry(r, r, 0.8, 20), gearMat, 0, 0, 0);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      part(g, boxGeo(r * 0.3, 0.8, r * 0.3), gearMat, Math.cos(a) * r, 0, Math.sin(a) * r).rotation.y = -a;
    }
    scene.add(g);
    gears.push({ g, speed: (rand() - 0.5) * 1.2 });
  }
  scene.userData.tick = (t) => {
    for (const h of hands) {
      h.minute.rotation.z = -t * h.speed;
      h.hour.rotation.z = (-t * h.speed) / 12;
    }
    for (const { g, speed } of gears) g.rotation.y = t * speed;
  };
  return scene;
}

// ------------------------------------------------------------------ Twilight Nexus

/** A canvas texture `size` px square, drawn by `draw(g, size)`, repeating. */
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

let nexusMats = null;
/** Twilight Nexus materials (one texture repeat = one grid cell), made once. */
function nexusMaterials() {
  if (nexusMats) return nexusMats;
  // Deck floor plates: dark blue-grey metal panels with fine seams.
  const plate = canvasTex(128, (g, s) => {
    g.fillStyle = '#2c3a55';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#212c43';
    g.lineWidth = 2;
    g.strokeRect(1, 1, s - 2, s - 2);
    g.beginPath();
    g.moveTo(s / 2, 0);
    g.lineTo(s / 2, s);
    g.stroke();
    g.fillStyle = '#3a4868';
    for (const [x, y] of [[6, 6], [s - 6, 6], [6, s - 6], [s - 6, s - 6]]) g.fillRect(x - 1.5, y - 1.5, 3, 3);
  });
  // Placement slabs: lighter grey-blue with a raised stud / rivet pattern.
  const stud = canvasTex(128, (g, s) => {
    g.fillStyle = '#4a5a78';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#3c4a66';
    g.lineWidth = 2;
    g.strokeRect(1, 1, s - 2, s - 2);
    const n = 4;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (i + 0.5) * (s / n);
        const y = (j + 0.5) * (s / n);
        g.fillStyle = '#36435d';
        g.beginPath();
        g.arc(x + 1.5, y + 1.5, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#62739a';
        g.beginPath();
        g.arc(x, y, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#7686ab';
        g.beginPath();
        g.arc(x - 1.5, y - 1.5, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  // Path ring and spine: smooth dark navy.
  const road = canvasTex(64, (g, s) => {
    g.fillStyle = '#1c2740';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#202c48';
    g.fillRect(0, 0, s, 2);
  });
  // Central platform: near-black blue tiles in a grid with small glowing dots at the corners.
  const tiles = canvasTex(128, (g, s) => {
    g.fillStyle = '#121a2e';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#1e2a46';
    g.lineWidth = 2;
    for (let k = 0; k <= 2; k++) {
      g.beginPath();
      g.moveTo((k * s) / 2, 0);
      g.lineTo((k * s) / 2, s);
      g.moveTo(0, (k * s) / 2);
      g.lineTo(s, (k * s) / 2);
      g.stroke();
    }
    g.fillStyle = '#8fb4ff';
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
      g.beginPath();
      g.arc((i * s) / 2, (j * s) / 2, 3, 0, Math.PI * 2);
      g.fill();
    }
  });
  // Lower floor: darker plates with cross-braced metal truss panels.
  const truss = canvasTex(128, (g, s) => {
    g.fillStyle = '#262d3d';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#3a4152';
    g.lineWidth = 7;
    g.strokeRect(6, 6, s - 12, s - 12);
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(10, 10);
    g.lineTo(s - 10, s - 10);
    g.moveTo(s - 10, 10);
    g.lineTo(10, s - 10);
    g.stroke();
    g.fillStyle = '#4b5468';
    for (const [x, y] of [[8, 8], [s - 8, 8], [8, s - 8], [s - 8, s - 8], [s / 2, s / 2]]) g.fillRect(x - 3, y - 3, 6, 6);
  });
  const lambertMap = (map, extra) => new THREE.MeshLambertMaterial({ map, ...extra });
  const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
  nexusMats = {
    plate: lambertMap(plate),
    stud: lambertMap(stud),
    road: lambertMap(road),
    tiles: lambertMap(tiles, { emissive: 0x070b16 }),
    truss: lambertMap(truss),
    side: lambert(0x222c42),
    under: lambert(0x161d2e),
    lowerSide: lambert(0x2a3040),
    bridge: new THREE.MeshLambertMaterial({ color: 0x6a86ff, emissive: 0x4a64e0, transparent: true, opacity: 0.55, depthWrite: false }),
    neon: basic(0x6a86ff),
    cyan: basic(0x5fe6ff),
    blade: basic(0xbfefff, { side: THREE.DoubleSide }),
    pillar: lambert(0x2a2d38),
    pillarBand: lambert(0x1c1e27),
    stripW: basic(0xf0f4ff),
    stripB: basic(0x5a6cff),
    violet: basic(0x9a6cff),
    lamp: basic(0xffffff),
    beam: basic(0xa8c8ff, { transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    dot: basic(0x8fb4ff),
    box: lambert(0x5a6070),
    boxDark: lambert(0x3c414e),
    water: new THREE.MeshLambertMaterial({ color: 0x050a1e, emissive: 0x02040c }),
    exit: basic(0x5fe6ff, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  };
  return nexusMats;
}

/** A flat textured rectangle (w x d) lying at height y, its texture repeating once per grid cell. */
function floorPlane(parent, w, d, mat, x, y, z) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / NEXUS_CELL, (uv.getY(i) * d) / NEXUS_CELL);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Instanced copies of one small mesh at `spots` ([x, y, z] or [x, y, z, rotY]). */
function instanced(parent, geo, mat, spots) {
  if (!spots.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  const o = new THREE.Object3D();
  spots.forEach(([x, y, z, ry = 0], i) => {
    o.position.set(x, y, z);
    o.rotation.set(0, ry, 0);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
  });
  parent.add(im);
  return im;
}

/** Night sky: deep purple-navy with stars and purple clouds, brightest towards the west horizon. */
function nexusSky() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#07061a');
  grad.addColorStop(0.3, '#121032');
  grad.addColorStop(0.47, '#2a2650');
  grad.addColorStop(0.5, '#4b5378');
  grad.addColorStop(0.56, '#1a1838');
  grad.addColorStop(1, '#050a1e');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // A pale blue-grey glow along one stretch of the horizon.
  const glow = g.createRadialGradient(W * 0.75, H * 0.5, 10, W * 0.75, H * 0.5, W * 0.3);
  glow.addColorStop(0, 'rgba(142,157,184,0.85)');
  glow.addColorStop(1, 'rgba(142,157,184,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  const rand = mulberry32(9090);
  // Purple clouds.
  for (let i = 0; i < 70; i++) {
    const x = rand() * W;
    const y = H * (0.18 + rand() * 0.28);
    const r = 30 + rand() * 90;
    const cg = g.createRadialGradient(x, y, 0, x, y, r);
    cg.addColorStop(0, `rgba(${110 + rand() * 50},${60 + rand() * 30},${170 + rand() * 50},${0.12 + rand() * 0.14})`);
    cg.addColorStop(1, 'rgba(90,50,150,0)');
    g.fillStyle = cg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Stars.
  for (let i = 0; i < 700; i++) {
    const y = rand() * H * 0.47;
    g.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.65})`;
    const s = rand() < 0.08 ? 2 : 1;
    g.fillRect(rand() * W, y, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 48, 24),
    new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.renderOrder = -10;
  return dome;
}

/** The swirling portal: a glowing cyan core in a ring of curved white-blue spiral blades. Faces +x. */
function nexusPortal(parent, m, x, y, z, animated) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = Math.PI / 2; // the disc stands across the bridge
  parent.add(g);
  const core = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), m.cyan);
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 8, 40), m.blade);
  g.add(ring);
  const blades = new THREE.Group();
  g.add(blades);
  for (let i = 0; i < 10; i++) {
    // A curved blade: a thin arc of torus, swept from the core out to the ring.
    const b = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.18, 4, 12, Math.PI * 0.8), m.blade);
    const a = (i / 10) * Math.PI * 2;
    b.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0.05);
    b.rotation.z = a + Math.PI * 0.6;
    blades.add(b);
  }
  const light = new THREE.PointLight(0x5fe6ff, 60, 30, 1.2);
  g.add(light);
  animated.push((t) => {
    blades.rotation.z = t * 1.4;
    core.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
  });
}

/** A corner pillar: a tall dark square tower in stacked segments with columns of light strips and a violet-ringed cap. */
function nexusPillar(parent, m, x, z, toward) {
  const base = -36;
  const top = 44;
  const seg = 8;
  const white = [];
  const blue = [];
  for (let y = base; y < top; y += seg) {
    part(parent, boxGeo(4, seg - 0.5, 4), m.pillar, x, y + seg / 2, z);
    part(parent, boxGeo(4.3, 0.5, 4.3), m.pillarBand, x, y + seg - 0.25, z);
    for (let k = 0; k < 6; k++) {
      const sy = y + 1 + k * 1.15;
      for (const [dx, dz, ry] of [[2.02, 0, Math.PI / 2], [-2.02, 0, Math.PI / 2], [0, 2.02, 0], [0, -2.02, 0]]) {
        for (const side of [-0.9, 0.9]) {
          const ox = dz ? side : 0;
          const oz = dx ? side : 0;
          ((k + (side > 0 ? 1 : 0)) % 2 ? blue : white).push([x + dx + ox, sy, z + dz + oz, ry]);
        }
      }
    }
  }
  const stripGeo = boxGeo(1.1, 0.22, 0.08);
  instanced(parent, stripGeo, m.stripW, white);
  instanced(parent, stripGeo, m.stripB, blue);
  // Flared cap with a violet neon ring, and the octagonal ring outline on top.
  const cap = part(parent, new THREE.CylinderGeometry(4.4, 2.9, 3, 4, 1), m.pillar, x, top + 1.5, z);
  cap.rotation.y = Math.PI / 4;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.22, 4, 4), m.violet);
  ring.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  ring.position.set(x, top + 0.4, z);
  parent.add(ring);
  const oct = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.2, 4, 8), m.violet);
  oct.rotation.x = Math.PI / 2;
  oct.position.set(x, top + 3.1, z);
  parent.add(oct);
  // A thin strut from the pillar to the deck corner.
  const [tx, tz] = toward;
  const dx = tx - x;
  const dz = tz - z;
  const dy = NEXUS_DECK - (top - 4);
  const len = Math.hypot(dx, dy, dz);
  const strut = new THREE.Mesh(boxGeo(0.35, 0.35, len), m.pillarBand);
  strut.position.set(x + dx / 2, top - 4 + dy / 2, z + dz / 2);
  strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx, dy, dz).normalize());
  parent.add(strut);
  const light = new THREE.PointLight(0x9a6cff, 40, 26, 1.2);
  light.position.set(x, top + 2, z);
  parent.add(light);
}

/** One lane piece off the deck: a strip of floor under the lane (sloped for ramps) with neon edges. */
function nexusLaneStrip(parent, m, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const dy = b.y - a.y;
  const flat = Math.hypot(dx, dz);
  const sloped = Math.abs(dy) > 0.01;
  const len = Math.hypot(flat, dy) + (sloped ? 0 : PATH_WIDTH);
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  g.rotation.y = Math.atan2(dx, dz);
  g.rotation.x = Math.atan2(-dy, flat);
  g.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  parent.add(g);
  const w = PATH_WIDTH + 0.8;
  if (a.y > 0.5 || b.y > 0.5) {
    // A ramp or landing: a solid deck under the lane.
    part(g, boxGeo(w + 0.6, 0.8, len), m.side, 0, -0.42, 0);
  }
  part(g, boxGeo(w, 0.1, len), m.road, 0, 0.03, 0).castShadow = false;
  for (const side of [-1, 1]) part(g, boxGeo(0.18, 0.16, len), m.neon, side * (w / 2), 0.08, 0).castShadow = false;
  if (sloped) {
    // Legs down to the lower floor along its low half.
    for (const f of [-0.3, 0, 0.3]) {
      const h = (a.y + b.y) / 2 + f * dy;
      if (h < 1.5) continue;
      for (const side of [-1, 1]) {
        part(parent, boxGeo(0.6, h - 0.8, 0.6), m.pillarBand, (a.x + b.x) / 2 + (dx / flat) * f * flat + side * (-dz / flat) * (w / 2 - 0.4), (h - 0.8) / 2, (a.z + b.z) / 2 + (dz / flat) * f * flat + side * (dx / flat) * (w / 2 - 0.4));
      }
    }
  }
}

/**
 * Twilight Nexus, built from the spec grid (NEXUS_GRID): a two-floor deck over a dark sea at night.
 * The upper deck (o slabs, # path) stands 10 high, the central platform 12, the lower floor 0.
 */
function buildNexus(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = nexusMaterials();
  const animated = [];
  const C = NEXUS_CELL;
  const D = NEXUS_DECK;
  const P = NEXUS_PLATFORM;
  const G = NEXUS_GRID;
  const cx0 = (c) => (c - 15) * C; // west edge of column c (0 = A)
  const rz0 = (i) => (i - 10) * C; // north edge of row index i (0 = row 1)
  const ch = (c, i) => G[i]?.[c] ?? '~';
  const isUpper = (k) => 'o#=SPE'.includes(k);
  const isPlat = (k) => k === 'P' || k === 'E';

  if (!versus) scene.add(nexusSky());
  // Very dark water far below, fading into the fog.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), m.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -40;
  scene.add(water);

  // --- Lower floor: the deck's whole footprint (H-W, rows 3-18), cross-braced truss panels.
  const lx0 = cx0(7);
  const lx1 = cx0(23);
  const lz0 = rz0(2);
  const lz1 = rz0(18);
  floorPlane(scene, lx1 - lx0, lz1 - lz0, m.truss, (lx0 + lx1) / 2, 0, (lz0 + lz1) / 2);
  part(scene, boxGeo(lx1 - lx0, 3, lz1 - lz0), m.lowerSide, (lx0 + lx1) / 2, -1.52, (lz0 + lz1) / 2);

  // --- Upper deck, one box per run of same-kind cells in a row.
  const supports = [];
  const rimDots = [];
  G.forEach((line, i) => {
    let c = 0;
    while (c < line.length) {
      const k = line[c];
      const kind = isPlat(k) ? 'P' : k;
      let e = c;
      while (e + 1 < line.length && (isPlat(line[e + 1]) ? 'P' : line[e + 1]) === kind) e++;
      const x0 = cx0(c);
      const x1 = cx0(e + 1);
      const w = x1 - x0;
      const x = (x0 + x1) / 2;
      const z = rz0(i) + C / 2;
      if (kind === 'o') {
        part(scene, boxGeo(w, 1, C), m.side, x, D - 0.5, z);
        floorPlane(scene, w, C, m.plate, x, D + 0.005, z);
        floorPlane(scene, w - 0.8, C - 0.8, m.stud, x, D + 0.12, z); // the raised stud slab
      } else if (kind === '#') {
        part(scene, boxGeo(w, 1, C), m.side, x, D - 0.6, z);
        floorPlane(scene, w, C, m.road, x, D - 0.1, z); // slightly sunken
      } else if (kind === 'P') {
        part(scene, boxGeo(w, P - D + 1.2, C), m.under, x, (P + D - 1.2) / 2, z);
        floorPlane(scene, w, C, m.tiles, x, P + 0.005, z);
      } else if (kind === '=' || kind === 'S') {
        // Glowing see-through bridge (and the pad under each portal).
        const mesh = part(scene, boxGeo(w, 0.6, C), m.bridge, x, D - 0.3, z);
        mesh.castShadow = false;
        mesh.renderOrder = 2;
      }
      // Supports under the upper deck where the lower floor is (not under the bridges).
      if (kind === 'o' || kind === '#') for (let cc = c; cc <= e + 1; cc++) {
        const sx = cx0(cc);
        if (sx > lx0 && sx < lx1 && rz0(i) > lz0 && (cc === c || cc === e + 1 || (cc - c) % 2 === 0)) supports.push([sx, (D - 1) / 2, rz0(i)]);
      }
      c = e + 1;
    }
  });
  instanced(scene, boxGeo(0.7, D - 1, 0.7), m.pillarBand, supports);

  // Neon rims and marker lights along every upper-deck edge that drops away (to the void or the
  // open lower floor), and the glowing bridge rails.
  const rimMat = m.neon;
  G.forEach((line, i) => {
    for (let c = 0; c < line.length; c++) {
      const k = line[c];
      if (!isUpper(k)) continue;
      const top = isPlat(k) ? P : D;
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = ch(c + dc, i + di);
        if (isUpper(n)) continue;
        const ex = cx0(c) + C / 2 + (dc * C) / 2;
        const ez = rz0(i) + C / 2 + (di * C) / 2;
        if (path.distanceTo(ex, ez) < 2.5) continue; // a lane runs off the deck here (onto a ramp)
        const along = di !== 0; // the edge runs along x
        const bridge = k === '=' || k === 'S';
        const rail = part(scene, boxGeo(along ? C : 0.2, bridge ? 0.5 : 0.18, along ? 0.2 : C), rimMat, ex, top + (bridge ? 0.25 : 0.02), ez);
        rail.castShadow = false;
        if (!bridge) for (const f of [-0.5, 0]) rimDots.push([ex + (along ? f * C : 0), top + 0.2, ez + (along ? 0 : f * C)]);
      }
    }
  });
  instanced(scene, new THREE.SphereGeometry(0.22, 8, 6), m.dot, rimDots);

  // --- Lanes off the upper deck: the lower floor, the open deck edges and the ramps down.
  const upperAt = (x, z) => isUpper(ch(Math.floor(x / C + 15), Math.floor(z / C + 10)));
  for (const r of path.routes) {
    for (const s of r.segs) {
      const onDeck = s.a.y >= D - 0.01 && s.b.y >= D - 0.01 && [0, 0.25, 0.5, 0.75, 1].every((f) => upperAt(s.a.x + (s.b.x - s.a.x) * f, s.a.z + (s.b.z - s.a.z) * f));
      if (!onDeck) nexusLaneStrip(scene, m, s.a, s.b);
    }
  }

  // --- Exits: glowing gates on the lower floor under the central platform, and their hatches on top.
  const exits = new Map();
  for (const r of path.routes) {
    const e = r.points[r.points.length - 1];
    const prev = r.points[r.points.length - 2];
    const dir = Math.sign(e.x - prev.x);
    const key = `${e.x}`;
    if (!exits.has(key)) exits.set(key, { x: e.x + dir * 2.6, zs: [], dir });
    exits.get(key).zs.push(e.z);
  }
  for (const ex of exits.values()) {
    const z = ex.zs.reduce((a, b) => a + b, 0) / ex.zs.length;
    const span = Math.max(...ex.zs) - Math.min(...ex.zs) + C;
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(span, D - 1.5), m.exit);
    gate.rotation.y = Math.PI / 2;
    gate.position.set(ex.x, (D - 1.5) / 2, z);
    scene.add(gate);
    for (const side of [-1, 1]) part(scene, boxGeo(0.5, D - 1, 0.5), m.cyan, ex.x, (D - 1) / 2, z + (side * span) / 2).castShadow = false;
    part(scene, boxGeo(0.5, 0.5, span), m.cyan, ex.x, D - 1.25, z).castShadow = false;
    for (const ez of ex.zs) {
      // The exit cell's hatch on the platform top.
      const hatch = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 4), m.cyan);
      hatch.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
      hatch.position.set(ex.x - ex.dir * 2.6, P + 0.03, ez);
      scene.add(hatch);
    }
    const light = new THREE.PointLight(0x5fe6ff, 50, 24, 1.2);
    light.position.set(ex.x, 4, z);
    scene.add(light);
  }

  // --- Portals at the outer end of each bridge.
  G.forEach((line, i) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== 'S' || G[i - 1]?.[c] === 'S') continue;
      let n = 1;
      while (G[i + n]?.[c] === 'S') n++;
      nexusPortal(scene, m, cx0(c) + C / 2, D + 5.6, rz0(i) + (n * C) / 2, animated);
    }
  });

  // --- Corner pillars, each linked by a strut to its nearest deck corner.
  G.forEach((line, i) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== 'O') continue;
      const x = cx0(c) + C / 2;
      const z = rz0(i) + C / 2;
      nexusPillar(scene, m, x, z, [x < 0 ? lx0 : lx1, z < 0 ? lz0 : lz1]);
    }
  });

  // --- Floor lamps: small round white lamps where slabs meet the path or the deck edge, each
  // throwing a short upward cone of pale blue light.
  const lamps = [];
  G.forEach((line, i) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== 'o') continue;
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = ch(c + dc, i + di);
        if (n !== '#' && n !== '_') continue;
        if ((c + i) % 2) continue; // every other cell along the edge
        lamps.push([cx0(c) + C / 2 + dc * (C / 2 - 0.7) + di * (C / 2 - 0.7), D + 0.12, rz0(i) + C / 2 + di * (C / 2 - 0.7) + dc * (C / 2 - 0.7)]);
        break;
      }
    }
  });
  instanced(scene, new THREE.CylinderGeometry(0.35, 0.4, 0.2, 12), m.lamp, lamps.map(([x, y, z]) => [x, y + 0.1, z]));
  instanced(scene, new THREE.CylinderGeometry(0.9, 0.3, 3, 14, 1, true), m.beam, lamps.map(([x, y, z]) => [x, y + 1.7, z]));

  // --- Small machinery on the deck, and cyan light posts on the lower floor near the centre.
  for (const p of MAP.props) {
    if (p.kind === 'nxBox') {
      part(scene, boxGeo(2, 2, 2), m.box, p.x, D + 1.12, p.z);
      part(scene, boxGeo(2.1, 0.3, 2.1), m.boxDark, p.x, D + 1.6, p.z);
      part(scene, boxGeo(0.6, 0.2, 0.08), m.cyan, p.x, D + 1.3, p.z + 1.02).castShadow = false;
    } else if (p.kind === 'nxPost') {
      part(scene, boxGeo(1, 6, 1), m.cyan, p.x, 3, p.z).castShadow = false;
    }
  }

  // Soft blue glow over each bridge.
  for (const sx of [-1, 1]) {
    const l = new THREE.PointLight(0x6a86ff, 40, 30, 1.2);
    l.position.set(sx * 54, D + 4, 0);
    scene.add(l);
  }
  if (animated.length) scene.userData.tick = (t) => animated.forEach((f) => f(t));
  return scene;
}

// ------------------------------------------------------------------ Sunset Crossing

const CX0 = (c) => (c - 20) * CROSS_CELL; // west edge of column c (0 = A)
const RZ0 = (i) => (i - 11.5) * CROSS_CELL; // north edge of row index i (0 = row 1)
const cellXZ = (c, i) => [CX0(c) + CROSS_CELL / 2, RZ0(i) + CROSS_CELL / 2];

/** A flat rectangle (w x d) at height y, its texture repeating every half cell. */
function crossPlane(parent, w, d, mat, x, y, z) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / (CROSS_CELL / 2), (uv.getY(i) * d) / (CROSS_CELL / 2));
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

let crossMats = null;
/** Sunset Crossing materials, made once. */
function crossMaterials() {
  if (crossMats) return crossMats;
  const tex = (base, vars, lines) => new THREE.MeshLambertMaterial({ map: tileTexture(base, vars, lines, 64, 4) });
  const col = (c, extra) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  crossMats = {
    // Terrain tops (by terrain key) and sides.
    top: {
      grass: tex('#5c9a3e', ['#58943b', '#619f42', '#549038']),
      b: tex('#6e4a3c', ['#684538', '#744f40', '#634234']),
      f: tex('#a88e78', ['#9e8470', '#b09680', '#a08872'], 'rgba(60,40,30,0.35)'),
      y: tex('#e6d45a', ['#dccb52', '#ecda66', '#d8c64e']),
      r: tex('#b98068', ['#b07860', '#c08870', '#a87260']),
      d: tex('#d08a3c', ['#c88236', '#d69244', '#c47e34']),
      east: tex('#b5aca4', ['#aca39b', '#bcb3ab', '#a69d95']),
      north: tex('#9a8a7a', ['#928272', '#a29282', '#8a7a6a']),
      nw: tex('#8a6a4a', ['#826244', '#927250', '#7a5c40']),
      crater: tex('#3a2a22', ['#33251e', '#40302a', '#2e211b']),
      court: tex('#7a3a2e', ['#723629', '#823f33', '#6c3328']),
      road: tex('#9e9a96', ['#99958f', '#a39f9b', '#96928e'], 'rgba(0,0,0,0.06)'),
    },
    side: {
      grass: col(0x6e5236), b: col(0x5a3c30), f: col(0x8a735f), y: col(0xc9b84a), r: col(0xa06c56),
      d: col(0x6e4428), east: col(0xa39a92, { flatShading: true }), north: col(0x857565), nw: col(0x6e4428),
      crater: col(0x2a1e18), court: col(0x4a3a34), road: col(0x7e7a76),
    },
    plateau: col(0x6e4428, { flatShading: true }),
    lowland: col(0xa8765a),
    roadEdge: col(0x7e7a76),
    chevron: { green: col(0x7ed88a), orange: col(0xf08a30), yellow: col(0xf0e07a), red: col(0xf08070) },
    chevronLine: col(0x4a4644),
    bridge: col(0xe8601c),
    bridgeDark: col(0xc44e14),
    yellow: col(0xf2c030),
    slab: col(0xd2d2d0),
    brick: { red: col(0xd02a2a), blue: col(0x2a4ac8), green: col(0x3e9a3a) },
    deadTrunk: col(0x4a3626),
    boulder: col(0xdadad6, { flatShading: true }),
    candle: col(0x9a9a9e),
    candleRing: col(0x7a7a80),
    salmon: col(0xf08a7a),
    white: col(0xf6f2ec),
    wick: col(0x222222),
    flame: new THREE.MeshBasicMaterial({ color: 0xffb040 }),
    metal: col(0x8a8a9a),
    pedestal: col(0x9a9a9a),
    pad: null, // set below (sunburst texture)
    crate: col(0x9c6b3c),
    crateDark: col(0x6d4a2a),
    barrel: col(0xe07a20),
    glass: new THREE.MeshLambertMaterial({ color: 0xa8d4e6, transparent: true, opacity: 0.45, depthWrite: false }),
    black: col(0x222222),
    trim: col(0xf2d040),
    castle: col(0x4a3a34),
    castleStep: col(0x8a4636),
    grate: col(0x55585c),
    bone: col(0xe8d9a0),
    roof: col(0x3a2c28),
    wood: col(0x8a5a32),
    woodDark: col(0x6a4426),
    cave: new THREE.MeshBasicMaterial({ color: 0x0a0806 }),
    caveGlow: new THREE.MeshBasicMaterial({ color: 0x5a2a6a, transparent: true, opacity: 0.35 }),
    halo: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  };
  // Grey spawn-point pad: light grey square with a dark sunburst.
  crossMats.pad = new THREE.MeshLambertMaterial({
    map: canvasTex(64, (g, s) => {
      g.fillStyle = '#c8c8c6';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = '#8a8a88';
      g.lineWidth = 3;
      g.strokeRect(2, 2, s - 4, s - 4);
      g.fillStyle = '#3a3a3a';
      g.beginPath();
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const r = k % 2 ? s * 0.16 : s * 0.36;
        g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
      }
      g.fill();
    }),
  });
  // Central crossing slab: light grey with a dark emblem.
  crossMats.cross = new THREE.MeshLambertMaterial({
    map: canvasTex(64, (g, s) => {
      g.fillStyle = '#cfcfcc';
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#2e2e30';
      g.beginPath();
      g.arc(s / 2, s / 2, s * 0.26, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#cfcfcc';
      g.fillRect(s * 0.46, s * 0.2, s * 0.08, s * 0.6);
      g.fillRect(s * 0.2, s * 0.46, s * 0.6, s * 0.08);
    }),
  });
  return crossMats;
}

/** Warm sunset sky: dusty pink overhead fading to peach at the horizon, with thin streaky clouds. */
function sunsetSky() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#b97a7c');
  grad.addColorStop(0.25, '#c9877f');
  grad.addColorStop(0.46, '#e9a577');
  grad.addColorStop(0.52, '#d9a08a');
  grad.addColorStop(1, '#b8846e');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // The low sun's glow (the sun sits low in the west).
  const glow = g.createRadialGradient(W * 0.5, H * 0.47, 6, W * 0.5, H * 0.47, W * 0.28);
  glow.addColorStop(0, 'rgba(255,214,150,0.9)');
  glow.addColorStop(0.15, 'rgba(255,190,120,0.45)');
  glow.addColorStop(1, 'rgba(255,170,110,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  const rand = mulberry32(5150);
  // Thin streaky clouds.
  for (let i = 0; i < 90; i++) {
    const x = rand() * W;
    const y = H * (0.08 + rand() * 0.36);
    const w = 60 + rand() * 220;
    const h = 1.5 + rand() * 4;
    g.fillStyle = `rgba(${245 + rand() * 10},${200 + rand() * 40},${190 + rand() * 40},${0.12 + rand() * 0.25})`;
    g.beginPath();
    g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 48, 24),
    new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.rotation.y = Math.PI; // the bright patch faces west (-x), where the sun is
  dome.renderOrder = -10;
  return dome;
}

/** Terrain key of a ground character (decides the top texture and side color). */
function crossTerrainKey(k, c) {
  if (k === ',' || k === 'o' || k === 'G') return 'grass';
  if (k === 'H') return 'b';
  if (k === '^') return c < 5 ? 'nw' : c < 25 ? 'north' : 'east';
  if (k === '*' || k === '=') return 'crater';
  if (k === 'C') return 'court';
  if (CROSS_ROAD.includes(k)) return 'road';
  return k; // b f y r d
}

/** A chunky Lego-style brick wall filling one cell along `axis`, bricks colored from `colors`. */
function brickWall(parent, m, x, y, z, axis, colors) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (axis === 'z') g.rotation.y = Math.PI / 2;
  parent.add(g);
  const H = 1.15;
  const courses = [[[-1.25, 2.4], [1.25, 2.4]], [[-2, 0.9], [0, 2.4], [2, 0.9]]];
  let n = 0;
  courses.forEach((bricks, k) => {
    for (const [bx, len] of bricks) {
      const mat = m.brick[colors[n++ % colors.length]];
      part(g, boxGeo(len - 0.06, H - 0.04, 1), mat, bx, H / 2 + k * H, 0);
      if (k === 1) for (let sx = bx - len / 2 + 0.4; sx < bx + len / 2; sx += 0.8) part(g, new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10), mat, sx, 2 * H + 0.1, 0);
    }
  });
}

/** A grey-violet metal statue on a pedestal. pose: ball | dab | stand | shuriken. */
function crossStatue(parent, m, x, y, z, pose) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = Math.atan2(-x, -z); // face the middle of the map
  parent.add(g);
  part(g, boxGeo(2.6, 1.6, 2.6), m.pedestal, 0, 0.8, 0);
  const s = m.metal;
  for (const side of [-1, 1]) part(g, boxGeo(0.6, 2, 0.7), s, side * 0.4, 2.6, 0);
  part(g, boxGeo(1.6, 2, 0.9), s, 0, 4.6, 0);
  part(g, boxGeo(1, 1, 1), s, 0, 6.1, 0);
  const arm = (side, rx, rz) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.05, 5.4, 0);
    pivot.rotation.set(rx, 0, rz);
    g.add(pivot);
    part(pivot, boxGeo(0.5, 1.8, 0.5), s, 0, -0.8, 0);
    return pivot;
  };
  if (pose === 'ball') {
    arm(-1, 0, 0);
    const a = arm(1, -1.4, 0);
    part(a, new THREE.SphereGeometry(0.6, 12, 8), s, 0, -1.9, 0);
  } else if (pose === 'dab') {
    part(g, boxGeo(1, 1, 1), s, 0, 6.1, 0).rotation.z = 0.4;
    arm(-1, 0, -2.3);
    arm(1, -0.9, 2.2);
  } else if (pose === 'shuriken') {
    for (const side of [-1, 1]) {
      const a = arm(side, -0.6, side * 0.9);
      const star = part(a, boxGeo(0.9, 0.1, 0.25), s, 0, -1.9, 0);
      part(star, boxGeo(0.25, 0.1, 0.9), s, 0, 0, 0);
      star.rotation.y = 0.4;
    }
  } else {
    arm(-1, 0, 0.1);
    arm(1, 0, -0.1);
  }
}

/** A tall grey segmented candle tower with salmon-pink and white caps and a small wick. */
function candleTower(parent, m, x, y, z, height) {
  const segs = Math.round(height / 2.6);
  const sh = height / segs;
  for (let k = 0; k < segs; k++) {
    const r = 1.15 - k * 0.02;
    part(parent, new THREE.CylinderGeometry(r, r + 0.04, sh - 0.25, 16), m.candle, x, y + k * sh + sh / 2, z);
    part(parent, new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.25, 16), m.candleRing, x, y + (k + 1) * sh - 0.12, z);
  }
  const top = y + height;
  part(parent, new THREE.CylinderGeometry(1.35, 1.35, 1.1, 16), m.salmon, x, top + 0.55, z);
  part(parent, new THREE.CylinderGeometry(1.0, 1.15, 0.7, 16), m.white, x, top + 1.45, z);
  part(parent, boxGeo(0.15, 0.8, 0.15), m.wick, x, top + 2.2, z);
  part(parent, new THREE.SphereGeometry(0.22, 8, 6), m.flame, x, top + 2.75, z).scale.y = 1.6;
}

/**
 * Sunset Crossing, built from the spec grid (CROSS_GRID): a plateau of four quadrants with their
 * own ground, a self-crossing grey road with colored chevrons, the bridge over the crater, the
 * castle, the glass tower, the candle towers and both caves.
 */
function buildCrossing(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = crossMaterials();
  const tm = themeMats();
  const C = CROSS_CELL;
  const G = CROSS_GRID;
  const rows = G.length;
  const cols = G[0].length;
  const ch = (c, i) => crossCh(c, i);
  const isRoad = (c, i) => {
    const k = ch(c, i);
    return CROSS_ROAD.includes(k) && k !== '=' ? true : k === 'W' && crossGround(c, i) === '#';
  };
  const rand = mulberry32(8813);
  const BASE = -3; // bottom of the terrain boxes (the plateau slab is below)

  if (!versus) {
    scene.add(sunsetSky());
    // Lowland far below the plateau, lost in the haze.
    const low = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), m.lowland);
    low.rotation.x = -Math.PI / 2;
    low.position.y = -30;
    scene.add(low);
  }
  // --- The plateau: cliff drops on all four sides, with jagged rock along the edges.
  const PW = cols * C;
  const PD = rows * C;
  part(scene, boxGeo(PW, 27, PD), m.plateau, 0, BASE - 13.5, 0).castShadow = false;
  for (let k = 0; k < 60; k++) {
    const side = k % 4;
    const t = rand();
    const w = 4 + rand() * 6;
    const h = 8 + rand() * 14;
    const x = side < 2 ? -PW / 2 + t * PW : (side === 2 ? -1 : 1) * (PW / 2 + 0.6);
    const z = side >= 2 ? -PD / 2 + t * PD : (side === 0 ? -1 : 1) * (PD / 2 + 0.6);
    part(scene, boxGeo(side < 2 ? w : 2.5, h, side < 2 ? 2.5 : w), m.plateau, x, BASE - 2 - h / 2 - rand() * 8, z).castShadow = false;
  }

  // --- Terrain: one box per run of same-terrain, same-height cells in a row.
  for (let i = 0; i < rows; i++) {
    let c = 0;
    while (c < cols) {
      const key = crossTerrainKey(crossGround(c, i), c);
      const h = crossH(c, i);
      let e = c;
      while (e + 1 < cols && crossTerrainKey(crossGround(e + 1, i), e + 1) === key && crossH(e + 1, i) === h) e++;
      const x0 = CX0(c);
      const x1 = CX0(e + 1);
      const z = RZ0(i) + C / 2;
      const top = key === 'road' ? 0.12 : h;
      const box = part(scene, boxGeo(x1 - x0, top - BASE, C), m.side[key], (x0 + x1) / 2, (top + BASE) / 2, z);
      box.castShadow = top > 1;
      crossPlane(scene, x1 - x0, C, m.top[key], (x0 + x1) / 2, top + 0.01, z);
      c = e + 1;
    }
  }

  // Rounded blocks along the yellow hills' and rock domes' edges (stacked-sponge look).
  const bumpGeo = new THREE.SphereGeometry(1, 10, 7);
  for (let i = 0; i < rows; i++) {
    for (let c = 0; c < cols; c++) {
      const k = crossGround(c, i);
      if (k !== 'y' && k !== 'r') continue;
      const h = crossH(c, i);
      const [x, z] = cellXZ(c, i);
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (crossH(c + dc, i + di) >= h) continue;
        for (const f of [-0.28, 0.28]) {
          const b = part(scene, bumpGeo, k === 'y' ? m.side.y : m.side.r, x + dc * C * 0.42 + (di ? f * C : 0), h - 1.3 - rand() * 1.2, z + di * C * 0.42 + (dc ? f * C : 0));
          b.scale.set(1.7 + rand() * 0.6, 1.3 + rand() * 0.5, 1.7 + rand() * 0.6);
        }
      }
    }
  }

  // --- Road edges (darker grey) wherever the road meets something else.
  for (let i = 0; i < rows; i++) {
    for (let c = 0; c < cols; c++) {
      if (!isRoad(c, i)) continue;
      const [x, z] = cellXZ(c, i);
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = ch(c + dc, i + di);
        if (isRoad(c + dc, i + di) || n === '=' || n === ' ') continue;
        const strip = part(scene, boxGeo(di ? C : 0.5, 0.06, di ? 0.5 : C), m.roadEdge, x + dc * (C / 2 - 0.25), 0.15, z + di * (C / 2 - 0.25));
        strip.castShadow = false;
      }
    }
  }
  // The central crossing slab (T13).
  {
    const i = G.findIndex((l) => l.includes('+'));
    const [x, z] = cellXZ(G[i].indexOf('+'), i);
    part(scene, boxGeo(3.6, 0.14, 3.6), m.cross, x, 0.19, z).castShadow = false;
  }

  // --- The bridge over the crater: orange-red planks, slightly arched, with yellow rails.
  const bridgeCells = [];
  G.forEach((l, i) => [...l].forEach((k, c) => k === '=' && bridgeCells.push([c, i])));
  const bx0 = Math.min(...bridgeCells.map(([c]) => CX0(c)));
  const bx1 = Math.max(...bridgeCells.map(([c]) => CX0(c + 1)));
  const bz = cellXZ(0, bridgeCells[0][1])[1];
  const arch = (x) => 0.12 + 0.35 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - bx0) / (bx1 - bx0))));
  for (let x = bx0 + 0.45; x < bx1; x += 0.9) {
    const p = part(scene, boxGeo(0.84, 0.25, C - 0.4), Math.round(x / 0.9) % 2 ? m.bridge : m.bridgeDark, x, arch(x), bz);
    p.rotation.y = (rand() - 0.5) * 0.03;
  }
  for (const side of [-1, 1]) {
    const rz = bz + side * (C / 2 - 0.2);
    for (let x = bx0; x <= bx1 + 0.01; x += (bx1 - bx0) / 6) part(scene, boxGeo(0.3, 1.4, 0.3), m.yellow, x, arch(x) + 0.7, rz);
    for (let x = bx0; x < bx1 - 0.01; x += (bx1 - bx0) / 6) {
      const x2 = x + (bx1 - bx0) / 6;
      const rail = part(scene, boxGeo(Math.hypot(x2 - x, arch(x2) - arch(x)), 0.22, 0.22), m.yellow, (x + x2) / 2, (arch(x) + arch(x2)) / 2 + 1.35, rz);
      rail.rotation.z = Math.atan2(arch(x2) - arch(x), x2 - x);
    }
    for (const x of [bx0 + 0.6, bx1 - 0.6]) part(scene, boxGeo(0.6, 1.4, 0.6), m.bridgeDark, x, -0.6, rz);
  }
  // The scorched halo round the crater.
  {
    const cells = [];
    G.forEach((l, i) => [...l].forEach((k, c) => (k === '*' || k === '=') && cells.push(cellXZ(c, i))));
    const cx = cells.reduce((a, p) => a + p[0], 0) / cells.length;
    const cz = cells.reduce((a, p) => a + p[1], 0) / cells.length;
    const halo = new THREE.Mesh(new THREE.RingGeometry(10, 15, 40), m.halo);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(cx, 0.05, cz);
    scene.add(halo);
  }

  // --- Chevrons along the road, every ~30 studs, colored by section, pointing the way.
  const route = path.routes[0];
  const cross = cellXZ(19, 12);
  const sectionOf = (segIdx, p) => {
    if (segIdx === 0) return p.x > cross[0] - C / 2 ? 'green' : 'orange';
    if (segIdx < route.segs.length - 1) return 'yellow';
    return p.z > cross[1] ? 'yellow' : 'red';
  };
  const vGeo = boxGeo(0.38, 0.05, 1.7);
  const vLine = boxGeo(0.62, 0.04, 1.95);
  const tmp = {};
  for (let d = 7; d < path.length - 4; d += 17) {
    path.at(d, tmp, 0);
    if (Math.hypot(tmp.x - cross[0], tmp.z - cross[1]) < 4) continue; // not on the crossing slab
    const segIdx = route.segs.findIndex((s) => d <= s.start + s.len);
    const g = new THREE.Group();
    const onBridge = Math.abs(tmp.z - bz) < 1 && tmp.x > bx0 && tmp.x < bx1;
    g.position.set(tmp.x, (onBridge ? arch(tmp.x) + 0.13 : 0.2), tmp.z);
    g.rotation.y = Math.atan2(tmp.dx, tmp.dz);
    scene.add(g);
    const mat = m.chevron[sectionOf(segIdx, tmp)];
    for (let k = 0; k < 3; k++) {
      for (const side of [-1, 1]) {
        const zOff = (k - 1) * 0.95;
        const outline = part(g, vLine, m.chevronLine, side * 0.55, 0, zOff);
        outline.rotation.y = side * 0.8;
        outline.castShadow = false;
        const arm = part(g, vGeo, mat, side * 0.55, 0.02, zOff);
        arm.rotation.y = side * 0.8;
        arm.castShadow = false;
      }
    }
  }

  // --- Cell decorations.
  const WALL_COLORS = { '18,4': ['red', 'blue'], '13,3': ['red'], '12,6': ['blue'], '19,19': ['red'] };
  const STATUE_POSES = { '8,0': 'ball', '28,2': 'dab' };
  const boulders = [];
  for (let i = 0; i < rows; i++) {
    for (let c = 0; c < cols; c++) {
      const k = ch(c, i);
      const [x, z] = cellXZ(c, i);
      const y = Math.max(0, crossH(c, i));
      const hold = new THREE.Group(); // stands decorations on their cell's ground
      hold.position.y = y;
      if (k === 'T') {
        scene.add(hold);
        TREES.round(hold, { x, z, s: 0.75 + rand() * 0.2, rot: rand() * Math.PI, leaf: 0 }, tm);
      } else if (k === 't') {
        scene.add(hold);
        TREES.dead(hold, { x, z, s: 0.8 + rand() * 0.3, rot: rand() * Math.PI }, tm);
      } else if (k === 'o') {
        for (let n = 0; n < 3; n++) boulders.push([x + (rand() - 0.5) * 2.6, 0.7, z + (rand() - 0.5) * 2.6, rand() * Math.PI, 1.1 + rand() * 0.9]);
      } else if (k === 'L') {
        candleTower(scene, m, x, y, z, c >= 30 ? 26 : 20);
      } else if (k === 'M') {
        crossStatue(scene, m, x, y, z, STATUE_POSES[`${c},${i}`] ?? 'stand');
        if (c > 20) { // a crate and orange barrels by the NE statue
          part(scene, boxGeo(1.8, 1.8, 1.8), m.crate, x + 2.6, y + 0.9, z + 0.6);
          part(scene, new THREE.CylinderGeometry(0.6, 0.6, 1.5, 12), m.barrel, x + 2.4, y + 0.75, z - 1.6);
          part(scene, new THREE.CylinderGeometry(0.6, 0.6, 1.5, 12), m.barrel, x + 1.2, y + 0.75, z - 2.1);
        }
      } else if (k === 'P') {
        part(scene, boxGeo(4, 0.12, 4), m.pad, x, crossH(c, i) + 0.06, z).castShadow = false;
      } else if (k === 'X') {
        const crate = part(scene, boxGeo(2.4, 2.4, 2.4), m.crate, x, y + 1.2, z);
        crate.rotation.y = rand() * 0.6;
        for (const dy of [0.15, 2.25]) part(crate, boxGeo(2.5, 0.25, 2.5), m.crateDark, 0, dy - 1.2, 0);
        part(scene, new THREE.CylinderGeometry(0.6, 0.6, 1.5, 12), m.barrel, x + 1.9, y + 0.75, z + 1.2);
      } else if (k === 'W') {
        const horiz = ch(c - 1, i) === 'W' || ch(c + 1, i) === 'W';
        const byRoad = isRoad(c - 1, i) || isRoad(c + 1, i);
        brickWall(scene, m, x, y, z, !horiz && byRoad ? 'z' : 'x', WALL_COLORS[`${c},${i}`] ?? ['green']);
      } else if (k === '|') {
        // Short yellow post-and-rail barrier closing the west stub.
        for (const dz of [-1.9, 0, 1.9]) part(scene, boxGeo(0.4, 1.6, 0.4), m.yellow, x, 0.8, z + dz);
        for (const dy of [0.7, 1.4]) part(scene, boxGeo(0.25, 0.25, 4.4), m.yellow, x, dy, z);
      }
    }
  }
  for (const [x, z, pose] of [[...cellXZ(1, 19), 'stand'], [...cellXZ(20, 15), 'shuriken']]) crossStatue(scene, m, x, 0, z, pose);
  // White boulder clusters.
  for (const [x, y, z, ry, s] of boulders) {
    const b = part(scene, new THREE.DodecahedronGeometry(s, 0), m.boulder, x, y * s, z);
    b.rotation.set(rand(), ry, rand());
    b.scale.y = 0.8;
  }

  // --- Blue glass tower (K-O, rows 18-22): three floors of glass slabs, black corner columns,
  // yellow stairs and trims.
  {
    const gc = [];
    G.forEach((l, i) => [...l].forEach((k, c) => k === 'G' && gc.push([c, i])));
    const x0 = CX0(Math.min(...gc.map(([c]) => c))) + 0.5;
    const x1 = CX0(Math.max(...gc.map(([c]) => c)) + 1) - 0.5;
    const z0 = RZ0(Math.min(...gc.map(([, i]) => i))) + 0.5;
    const z1 = RZ0(Math.max(...gc.map(([, i]) => i)) + 1) - 0.5;
    const w = x1 - x0;
    const d = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const FH = 5.7;
    for (let f = 0; f <= 3; f++) {
      const y = f * FH + 0.2;
      const slab = part(scene, boxGeo(w, 0.35, d), m.glass, cx, y, cz);
      slab.castShadow = false;
      slab.renderOrder = 2;
      for (const side of [-1, 1]) {
        part(scene, boxGeo(w, 0.3, 0.3), m.trim, cx, y + 0.2, cz + (side * d) / 2);
        part(scene, boxGeo(0.3, 0.3, d), m.trim, cx + (side * w) / 2, y + 0.2, cz);
      }
      if (f > 0 && f < 3) {
        // Low glass railings round the open floors.
        for (const side of [-1, 1]) {
          const r1 = part(scene, boxGeo(w, 1.1, 0.12), m.glass, cx, y + 0.75, cz + (side * d) / 2);
          const r2 = part(scene, boxGeo(0.12, 1.1, d), m.glass, cx + (side * w) / 2, y + 0.75, cz);
          r1.castShadow = r2.castShadow = false;
        }
      }
    }
    for (const x of [x0, x1]) for (const z of [z0, z1]) part(scene, boxGeo(1, 3 * FH + 0.6, 1), m.black, x, (3 * FH + 0.6) / 2, z);
    // Stair flights, alternating sides, from each floor up to the next.
    for (let f = 0; f < 3; f++) {
      const steps = 9;
      const sz = f % 2 ? z1 - 2.2 : z0 + 2.2;
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const sx = f % 2 ? x1 - 3 - t * (w * 0.55) : x0 + 3 + t * (w * 0.55);
        part(scene, boxGeo(w * 0.55 / steps, 0.3, 2.6), m.trim, sx, f * FH + 0.2 + t * FH, sz);
      }
    }
  }

  // --- The sunken castle (SE): crenellated outer walls round a stepped red-brown courtyard.
  {
    const isC = (c, i) => ch(c, i) === 'C' || (ch(c, i) === 'P' && crossGround(c, i) === 'C');
    const merlons = [];
    for (let i = 0; i < rows; i++) {
      for (let c = 0; c < cols; c++) {
        if (!isC(c, i)) continue;
        const [x, z] = cellXZ(c, i);
        const out = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, di]) => !isC(c + dc, i + di));
        if (out.length) {
          part(scene, boxGeo(C, 4.5, C), m.castle, x, -1 + 2.25, z);
          for (const [dc, di] of out) {
            for (const f of [-0.3, 0.3]) merlons.push([x + dc * (C / 2 - 0.5) + (di ? f * C : 0), 3.95, z + di * (C / 2 - 0.5) + (dc ? f * C : 0)]);
          }
        } else {
          // Inner ring: a step down from the walls into the courtyard.
          const ring1 = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, di]) => {
            const [c2, i2] = [c + dc, i + di];
            return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !isC(c2 + a, i2 + b));
          });
          if (ring1) part(scene, boxGeo(C, 0.6, C), m.castleStep, x, -0.7, z).castShadow = false;
        }
      }
    }
    instanced(scene, boxGeo(1.1, 1.1, 1.1), m.castle, merlons);
    // Metal floor grate (Z19).
    const [gx, gz] = cellXZ(25, 18);
    part(scene, boxGeo(3.2, 0.1, 3.2), m.grate, gx, -0.95, gz).castShadow = false;
    for (let k = -1.2; k <= 1.21; k += 0.6) part(scene, boxGeo(0.15, 0.12, 3.2), m.black, gx + k, -0.88, gz).castShadow = false;
    // Round turret with a cone roof at the castle's east corner (near AF18).
    const [tx, tz] = cellXZ(29, 17);
    part(scene, new THREE.CylinderGeometry(2.3, 2.5, 8, 16), m.castle, tx, 3, tz);
    part(scene, new THREE.ConeGeometry(3, 4, 16), m.roof, tx, 9, tz);
    // Ivory bone spikes jutting from the ground all round the castle's rim.
    const spikeGeo = new THREE.ConeGeometry(0.35, 1, 6);
    for (let i = 0; i < rows; i++) {
      for (let c = 0; c < cols; c++) {
        if (ch(c, i) !== 'b') continue;
        for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!isC(c + dc, i + di)) continue;
          const [x, z] = cellXZ(c, i);
          for (const f of [-0.25, 0.2]) {
            const len = 1.2 + rand() * 2.4;
            const sp = part(scene, spikeGeo, m.bone, x + dc * (C / 2 - 0.8) + (di ? f * C : 0), len * 0.4, z + di * (C / 2 - 0.8) + (dc ? f * C : 0));
            sp.scale.set(1, len, 1);
            sp.rotation.set(-di * 0.5, 0, dc * 0.5); // lean away from the castle
          }
        }
      }
    }
    // A stack of cylindrical bones near Y15.
    const [sx, sz] = cellXZ(24, 13);
    [[0, 0.5, -0.6], [0, 0.5, 0.6], [0, 1.4, 0]].forEach(([dx, y, dz]) => {
      const b = part(scene, new THREE.CylinderGeometry(0.5, 0.5, 3.2, 10), m.bone, sx + dx, y, sz + dz);
      b.rotation.z = Math.PI / 2;
    });
  }

  // --- Wooden trestle: in the SE corner (H cells) and on along the outer south and west cliffs.
  {
    const TY = 6;
    const pts = [[90, 38], [90, PD / 2 + 4], [-PW / 2 - 4, PD / 2 + 4], [-PW / 2 - 4, -45]];
    const posts = [];
    const braces = [];
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, az] = pts[s];
      const [bx, bz2] = pts[s + 1];
      const len = Math.hypot(bx - ax, bz2 - az);
      const dx = (bx - ax) / len;
      const dz = (bz2 - az) / len;
      const yaw = Math.atan2(dx, dz);
      // Rails and ties along the top.
      for (const side of [-1, 1]) {
        const rail = part(scene, boxGeo(0.3, 0.3, len), m.woodDark, (ax + bx) / 2 + dz * side * 1.1, TY + 0.45, (az + bz2) / 2 - dx * side * 1.1);
        rail.rotation.y = yaw;
      }
      for (let t = 0; t < len; t += 5) {
        const x = ax + dx * t;
        const z = az + dz * t;
        const onPlateau = Math.abs(x) < PW / 2 && Math.abs(z) < PD / 2;
        const foot = onPlateau ? 0 : -26;
        for (const side of [-1, 1]) posts.push([x + dz * side * 1.5, foot, z - dx * side * 1.5, TY - foot]);
        braces.push([x, z, yaw, foot]);
      }
    }
    for (const [x, y0, z, h] of posts) part(scene, boxGeo(0.4, h, 0.4), m.wood, x, y0 + h / 2, z).castShadow = h < 10;
    for (const [x, z, yaw, foot] of braces) {
      for (let y = foot + 2; y < TY; y += 4) {
        const b = part(scene, boxGeo(3.4, 0.25, 0.25), m.woodDark, x, y, z);
        b.rotation.y = yaw + Math.PI / 2;
        b.castShadow = false;
      }
      const tie = part(scene, boxGeo(3.4, 0.3, 0.6), m.wood, x, TY + 0.15, z);
      tie.rotation.y = yaw + Math.PI / 2;
    }
  }

  // --- Spawn cave (AE13) in the grey east cliff, and the base cave (T2) in the north cliff.
  const caveAt = (k) => {
    const i = G.findIndex((l) => l.includes(k));
    return [G[i].indexOf(k), i];
  };
  {
    const [c, i] = caveAt('S');
    const [x, z] = cellXZ(c, i);
    const h = crossH(c + 1, i);
    part(scene, boxGeo(C, h - 7, C), m.side.east, x, 7 + (h - 7) / 2, z); // the rock over the mouth
    crossPlane(scene, C, C, m.top.east, x, h + 0.01, z);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(C, 7), m.cave);
    mouth.rotation.y = -Math.PI / 2;
    mouth.position.set(CX0(c + 1) - 0.02, 3.5, z);
    scene.add(mouth);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(C * 0.7, 5), m.caveGlow);
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(CX0(c + 1) - 0.05, 2.6, z);
    scene.add(glow);
    for (const side of [-1, 1]) part(scene, boxGeo(1.2, 7, 0.8), m.side.east, x + 1.5, 3.5, z + side * (C / 2 - 0.4));
  }
  {
    const [c, i] = caveAt('B');
    const [x, z] = cellXZ(c, i);
    const h = crossH(c, i - 1);
    part(scene, boxGeo(C, h - 6.5, C), m.side.north, x, 6.5 + (h - 6.5) / 2, z);
    crossPlane(scene, C, C, m.top.north, x, h + 0.01, z);
    for (const side of [-1, 1]) part(scene, boxGeo(0.9, 6.5, C), m.side.north, x + side * (C / 2 - 0.45), 3.25, z);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(C - 1.8, 6.5), m.cave);
    mouth.position.set(x, 3.25, RZ0(i) + 0.02);
    scene.add(mouth);
    // The north cliff the cave is cut into, rising beyond the plateau's edge.
    for (let k = -6; k <= 6; k++) {
      const hh = 12 + rand() * 6 - Math.abs(k) * 0.6;
      part(scene, boxGeo(5.5, hh + 30, 6 + rand() * 4), m.side.north, x + k * 5, (hh - 30) / 2, -PD / 2 - 3.5 - rand() * 2).castShadow = false;
    }
  }
  // Blocky grey facets of the east cliff beyond the plateau's edge.
  for (let k = 0; k < 14; k++) {
    const z = RZ0(5) + k * 5 + rand() * 2;
    const hh = 15 + rand() * 9;
    part(scene, boxGeo(6 + rand() * 4, hh + 30, 5.5), m.side.east, PW / 2 + 3 + rand() * 3, (hh - 30) / 2, z).castShadow = false;
  }
  return scene;
}

// ------------------------------------------------------------------ Shattered Court

/** Black starfield with faint red-magenta nebula clouds, mostly upper left and right. */
function courtSky() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#050508';
  g.fillRect(0, 0, W, H);
  const rand = mulberry32(4141);
  for (const cx of [W * 0.18, W * 0.68]) {
    for (let i = 0; i < 26; i++) {
      const x = cx + (rand() - 0.5) * W * 0.3;
      const y = H * (0.12 + rand() * 0.3);
      const r = 30 + rand() * 90;
      const cg = g.createRadialGradient(x, y, 0, x, y, r);
      cg.addColorStop(0, `rgba(90,16,48,${0.18 + rand() * 0.2})`);
      cg.addColorStop(1, 'rgba(90,16,48,0)');
      g.fillStyle = cg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`;
    const sz = rand() < 0.06 ? 2 : 1;
    g.fillRect(rand() * W, rand() * H, sz, sz);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 48, 24),
    new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.renderOrder = -10;
  return dome;
}

/** A face-up playing card's texture: white with a few red or black pips. */
function cardFace(red) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 90;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2f2';
  g.fillRect(0, 0, 64, 90);
  g.fillStyle = red ? '#c83c3c' : '#1a1a1a';
  for (const [x, y] of [[16, 18], [48, 72], [32, 45]]) {
    g.beginPath();
    g.moveTo(x, y - 8);
    g.lineTo(x + 7, y);
    g.lineTo(x, y + 8);
    g.lineTo(x - 7, y);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let courtMats = null;
function courtMaterials() {
  if (courtMats) return courtMats;
  courtMats = {
    top: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    slab: lambert(0x3a3a3a),
    violet: new THREE.MeshLambertMaterial({ color: 0xb040ff, emissive: 0xb040ff, emissiveIntensity: 0.8, flatShading: true }),
    ring: new THREE.MeshBasicMaterial({ color: 0xf0e8ff }),
    ringGlow: new THREE.MeshBasicMaterial({ color: 0xf0e8ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    wall: lambert(0xd8d4d0),
    red: lambert(0x8c1c1c),
    grass: lambert(0x3c4a30, { flatShading: true }),
    rock: lambert(0x5a3e2a, { flatShading: true }),
    stone: lambert(0x8a8a8a, { flatShading: true }),
    cardBack: lambert(0xc83c3c),
    cardEdge: lambert(0xf2f2f2),
    faceRed: new THREE.MeshLambertMaterial({ map: cardFace(true) }),
    faceBlack: new THREE.MeshLambertMaterial({ map: cardFace(false) }),
    chip: lambert(0xb02a2a),
    arrow: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }),
  };
  return courtMats;
}

/** A grass-topped rock island floating with its top at height y. */
function courtIsland(parent, m, x, y, z, r) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const top = part(g, new THREE.CylinderGeometry(r, r * 0.92, 1, 9), m.grass, 0, -0.5, 0);
  top.rotation.y = x * 0.1;
  const rock = part(g, new THREE.ConeGeometry(r * 0.92, r * 1.4, 9), m.rock, 0, -1 - r * 0.7, 0);
  rock.rotation.set(Math.PI, z * 0.1, 0);
  return g;
}

/** A round white tower with a red cone roof (cone) or red crenellations. */
function courtTower(parent, m, x, y, z, r, h, cone = true) {
  part(parent, new THREE.CylinderGeometry(r, r * 1.05, h, 12), m.wall, x, y + h / 2, z);
  // Arched red-framed windows.
  for (let k = 0; k < 2; k++) {
    const a = k * Math.PI + 0.6;
    const w = part(parent, boxGeo(0.5, 1.1, 0.2), m.red, x + Math.sin(a) * r, y + h * 0.65, z + Math.cos(a) * r);
    w.rotation.y = a;
  }
  if (cone) part(parent, new THREE.ConeGeometry(r * 1.3, r * 2.4, 12), m.red, x, y + h + r * 1.2, z);
  else {
    part(parent, new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.6, 12), m.red, x, y + h + 0.3, z);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      part(parent, boxGeo(0.5, 0.7, 0.5), m.red, x + Math.sin(a) * r, y + h + 0.95, z + Math.cos(a) * r);
    }
  }
}

/** A few dead trees on an island group. */
function courtTrees(g, m, spots) {
  for (const [x, z, s] of spots) TREES.dead(g, { x, z, s, rot: x * 1.7 + z }, m);
}

/**
 * Shattered Court, built from the spec grid (COURT_GRID): 550 checker tiles floating in a starry
 * void, this game's random route painted gold over them, the crystal portal in the north, the
 * castle on its own island in the south, a floating island in the big central hole, crystals and
 * card stacks on the tiles, outer islands and crumbling debris drifting around the edges.
 * When it is built the gold sweeps along the route from the portal to the castle (one tile every
 * 0.04 s), pulses twice, and the portal flashes: 3 seconds in all.
 */
function buildCourt(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = courtMaterials();
  const animated = [];
  const C = COURT_CELL;
  const G = COURT_GRID;
  if (!versus) scene.add(courtSky());

  // --- Tiles: a dark 1-unit slab under every tile and a coloured top face per tile.
  const tiles = [];
  G.forEach((line, i) => [...line].forEach((_, c) => courtTile(c, i) && tiles.push([c, i])));
  const slabs = new THREE.InstancedMesh(boxGeo(C, 0.9, C), m.slab, tiles.length);
  const tops = new THREE.InstancedMesh(boxGeo(C, 0.1, C), m.top, tiles.length);
  tops.receiveShadow = true;
  slabs.receiveShadow = true;
  const o = new THREE.Object3D();
  const LIGHT = new THREE.Color(0x9c9c9c);
  const DARK = new THREE.Color(0x4a4a4a);
  const GOLD = new THREE.Color(0xe8b04a);
  const BRIGHT = new THREE.Color(0xffd27a);
  const slot = new Map();
  tiles.forEach(([c, i], k) => {
    const [x, z] = courtCell(c, i + 1);
    o.position.set(x, -0.55, z);
    o.updateMatrix();
    slabs.setMatrixAt(k, o.matrix);
    o.position.set(x, -0.05, z);
    o.updateMatrix();
    tops.setMatrixAt(k, o.matrix);
    tops.setColorAt(k, courtLight(c, i) ? LIGHT : DARK);
    slot.set(`${c},${i}`, k);
  });
  scene.add(slabs, tops);
  // The neck cells beyond the grid's ends (the portal's T1 and the castle's T41): stone steps.
  for (const row of [1, 41]) {
    const [x, z] = courtCell(19, row);
    part(scene, boxGeo(C, 1, C), m.stone, x, -0.5, z).receiveShadow = true;
  }

  // --- This game's route: gold tops, a white arrow on every 4th tile.
  const route = mapInfo.tiles ?? [];
  const routeSlots = route.map(([c, i]) => slot.get(`${c},${i}`));
  const checker = route.map(([c, i]) => (courtLight(c, i) ? LIGHT : DARK));
  const arrows = [];
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 1.3).lineTo(1, 0.1).lineTo(0.4, 0.1).lineTo(0.4, -1.1).lineTo(-0.4, -1.1).lineTo(-0.4, 0.1).lineTo(-1, 0.1).lineTo(0, 1.3);
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  route.forEach(([c, i], k) => {
    if (k % 4 !== 3 || k + 1 >= route.length) return;
    const [nc, ni] = route[k + 1];
    const [x, z] = courtCell(c, i + 1);
    const a = new THREE.Mesh(arrowGeo, m.arrow);
    a.rotation.x = -Math.PI / 2;
    a.rotation.z = Math.atan2(-(nc - c), -(ni - i)); // shape +y points along the walk
    a.position.set(x, 0.03, z);
    a.visible = false;
    scene.add(a);
    arrows.push({ k, mesh: a });
  });

  // --- Spawn portal (north of T1): a white-glowing ring among magenta-violet crystals.
  const [px, pz] = courtCell(19, 1);
  const portal = new THREE.Group();
  portal.position.set(px, 0, pz - 2.5);
  scene.add(portal);
  courtIsland(portal, m, 0, -1, -1.5, 5);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 10, 40), m.ring);
  ring.position.y = 4;
  portal.add(ring);
  const veil = new THREE.Mesh(new THREE.CircleGeometry(3, 32), m.ringGlow);
  veil.position.y = 4;
  portal.add(veil);
  const rand = mulberry32(777);
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2;
    const r = 3.6 + rand() * 1.6;
    const h = 1.5 + rand() * 3.5;
    const cr = part(portal, new THREE.OctahedronGeometry(0.7, 0), m.violet, Math.cos(a) * r, h / 2 - 0.4, Math.sin(a) * r * 0.6 - 1);
    cr.scale.set(1, h / 1.4, 1);
    cr.rotation.set(rand() * 0.5 - 0.25, rand() * 3, rand() * 0.5 - 0.25);
  }
  const portalLight = new THREE.PointLight(0xb040ff, 40, 30, 1.6);
  portalLight.position.set(0, 4, 1);
  portal.add(portalLight);

  // --- Castle (south of T41) on its own grass island: white walls with red trim, a gated front
  // with steps facing the path, and 8 round towers with red cone roofs.
  const castle = courtIsland(scene, m, CASTLE.x, 0, CASTLE.z, 15);
  const [, gz] = courtCell(19, 41);
  for (let k = 0; k < 3; k++) part(castle, boxGeo(5, 0.4, 1.2), m.wall, 0, 0.2 + k * 0.4, gz + 2.4 + k * 1.2 - CASTLE.z); // steps up from T41
  const WX = 9;
  const WZ = 8;
  part(castle, boxGeo(WX * 2, 6, 1), m.wall, 0, 3, -WZ).castShadow = true; // front wall
  part(castle, boxGeo(WX * 2, 6, 1), m.wall, 0, 3, WZ);
  part(castle, boxGeo(1, 6, WZ * 2), m.wall, -WX, 3, 0);
  part(castle, boxGeo(1, 6, WZ * 2), m.wall, WX, 3, 0);
  part(castle, boxGeo(WX * 2 + 0.2, 0.5, 1.2), m.red, 0, 6.2, -WZ); // red trim
  part(castle, boxGeo(4, 4.5, 0.4), m.red, 0, 2.25, -WZ - 0.6); // the gate
  part(castle, boxGeo(3.2, 3.8, 0.3), lambert(0x3e2a1c), 0, 1.9, -WZ - 0.8);
  part(castle, boxGeo(10, 9, 8), m.wall, 0, 4.5, 1); // the keep
  part(castle, boxGeo(10.2, 0.5, 8.2), m.red, 0, 9.2, 1);
  for (const [tx, tz, r, h] of [[-WX, -WZ, 1.6, 11], [WX, -WZ, 1.6, 11], [-WX, WZ, 1.6, 10], [WX, WZ, 1.6, 10], [-3.5, -WZ, 1.2, 8.5], [3.5, -WZ, 1.2, 8.5], [-2.5, 2, 1.8, 17], [3, 3, 1.4, 14]]) {
    courtTower(castle, m, tx, 0, tz, r, h, true);
  }

  // --- Central island in the big hole (R13-X19), a little below the tiles.
  const [hx] = courtCell(20, 16);
  const [, hz] = courtCell(20, 16);
  const mid = courtIsland(scene, m, hx, -2.5, hz, 9.5);
  courtTower(mid, m, 0, 0, 0, 2, 5, false);
  courtTrees(mid, m, [[-5, -4, 0.8], [5, 3, 0.7], [-3, 5, 0.6]]);

  // --- Violet crystal clusters standing on tiles.
  for (const [c, i] of COURT_CRYSTALS) {
    const [x, z] = courtCell(c, i + 1);
    for (let k = 0; k < 4; k++) {
      const h = (k === 0 ? 4.5 : 2 + rand() * 1.8);
      const cr = part(scene, new THREE.OctahedronGeometry(0.6, 0), m.violet, x + (k ? (rand() - 0.5) * 2.2 : 0), h / 2, z + (k ? (rand() - 0.5) * 2.2 : 0));
      cr.scale.set(1, h / 1.2, 1);
      cr.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5);
    }
  }

  // --- Card stacks: leaning towers of red-backed cards, with loose face-up cards around them.
  const cardGeo = boxGeo(1.3, 0.06, 1.85);
  for (const [c, i] of COURT_CARDS) {
    const [x, z] = courtCell(c, i + 1);
    const stack = new THREE.Group();
    stack.position.set(x, 0, z);
    stack.rotation.y = rand() * Math.PI;
    scene.add(stack);
    const levels = 3 + Math.floor(rand() * 3); // up to ~6 units tall
    for (let l = 0; l < levels; l++) {
      const y = l * 1.25;
      const lean = l * 0.12;
      for (const side of [-1, 1]) {
        const card = part(stack, cardGeo, m.cardBack, side * 0.42 + lean, y + 0.85, 0);
        card.rotation.set(Math.PI / 2, 0, side * 0.32);
      }
      part(stack, cardGeo, m.cardEdge, lean, y + 1.75, 0); // the flat card on top of each floor
    }
  }
  // Loose cards lying flat: around the east stacks and the north-west one.
  for (const [cx, ci, n] of [[30, 18, 9], [13, 5, 4]]) {
    for (let k = 0; k < n; k++) {
      const c = cx + Math.round((rand() - 0.5) * 4);
      const i = ci + Math.round((rand() - 0.5) * 4);
      if (!courtTile(c, i)) continue;
      const [x, z] = courtCell(c, i + 1);
      const card = part(scene, new THREE.PlaneGeometry(1.3, 1.85), rand() < 0.5 ? m.faceRed : m.faceBlack, x + (rand() - 0.5) * 2, 0.02 + k * 0.002, z + (rand() - 0.5) * 2);
      card.rotation.set(-Math.PI / 2, 0, rand() * Math.PI);
      card.castShadow = false;
    }
  }

  // --- Outer floating islands, each with a small white tower and dead trees.
  [[-92, -52, 8, true], [-98, 22, 9, false], [-64, 78, 7, true], [70, 66, 8, false], [100, -6, 9, true], [76, -64, 7, true]].forEach(([x, z, r, cone], k) => {
    const isl = courtIsland(scene, m, x, -3 - (k % 3) * 2.5, z, r);
    courtTower(isl, m, 0, 0, 0, 1.4, 5 + (k % 2) * 2, cone);
    courtTrees(isl, m, [[r * 0.5, r * 0.3, 0.6], [-r * 0.45, -r * 0.4, 0.5]]);
    animated.push((t) => (isl.position.y = -3 - (k % 3) * 2.5 + Math.sin(t * 0.4 + k) * 0.5));
  });

  // --- Floating debris along the floor edge: loose grey cubes, as if the floor were crumbling.
  const debris = [];
  G.forEach((line, i) => [...line].forEach((_, c) => {
    if (courtTile(c, i)) return;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, di]) => courtTile(c + dc, i + di));
    if (!edge || rand() > 0.13 || i === 0 || i === 40) return;
    const [x, z] = courtCell(c, i + 1);
    const sz = 0.8 + rand() * 2.6;
    const cube = part(scene, boxGeo(sz, sz, sz), m.stone, x + (rand() - 0.5) * 2, -1 - rand() * 4, z + (rand() - 0.5) * 2);
    cube.rotation.set(rand(), rand(), rand());
    debris.push({ cube, y: cube.position.y, p: rand() * 6 });
  }));
  // A white pillar piece to the north-west; red poker chips and cones drifting west and north-east.
  const pillar = part(scene, new THREE.CylinderGeometry(1.6, 1.6, 9, 14), m.wall, -70, -2, -66);
  pillar.rotation.set(0.5, 0, 0.35);
  debris.push({ cube: pillar, y: -2, p: 1 });
  for (const [bx, bz] of [[-92, -10], [-90, 40], [84, -52], [94, -32]]) {
    for (let k = 0; k < 4; k++) {
      const chip = rand() < 0.6;
      const mesh = part(scene, chip ? new THREE.CylinderGeometry(1.1, 1.1, 0.3, 18) : new THREE.ConeGeometry(0.9, 2, 12), chip ? m.chip : m.red, bx + (rand() - 0.5) * 14, -1 - rand() * 5, bz + (rand() - 0.5) * 14);
      mesh.rotation.set(rand() * 2, rand() * 3, rand() * 2);
      debris.push({ cube: mesh, y: mesh.position.y, p: rand() * 6 });
    }
  }
  animated.push((t) => {
    for (const d of debris) {
      d.cube.position.y = d.y + Math.sin(t * 0.6 + d.p) * 0.35;
      d.cube.rotation.y += 0.002;
    }
  });

  // --- Telegraph: the gold sweeps from T2 to T40, the whole route pulses twice, the portal flashes.
  let t0 = null;
  const STEP = 0.04;
  const TOTAL = 3;
  const sweepEnd = route.length * STEP;
  const tmp = new THREE.Color();
  let done = false;
  animated.push((t) => {
    t0 ??= t;
    const e = t - t0;
    veil.material.opacity = 0.3 + Math.sin(t * 2) * 0.08;
    ring.rotation.z = t * 0.3;
    if (done) return;
    const lit = Math.min(route.length, Math.floor(e / STEP) + 1);
    const pulseT = Math.max(0, e - sweepEnd);
    const pulseLen = Math.max(0.01, TOTAL - sweepEnd - 0.05);
    const pulse = e > sweepEnd ? Math.abs(Math.sin(Math.min(1, pulseT / pulseLen) * Math.PI * 2)) : 0; // two bright humps
    tmp.copy(GOLD).lerp(BRIGHT, pulse);
    routeSlots.forEach((k, n) => k != null && tops.setColorAt(k, n < lit ? tmp : checker[n]));
    tops.instanceColor.needsUpdate = true;
    for (const a of arrows) a.mesh.visible = a.k < lit;
    const flash = e > TOTAL - 0.5 && e < TOTAL;
    portalLight.intensity = flash ? 140 : 40;
    m.ring.color.set(flash ? 0xffffff : 0xf0e8ff);
    veil.material.opacity = flash ? 0.85 : veil.material.opacity;
    if (e >= TOTAL) {
      done = true;
      portalLight.intensity = 40;
      routeSlots.forEach((k) => k != null && tops.setColorAt(k, GOLD));
      tops.instanceColor.needsUpdate = true;
    }
  });
  scene.userData.tick = (t) => animated.forEach((f) => f(t));
  return scene;
}

// ------------------------------------------------------------------ Ember Keep

/** Underworld sky: deep red overhead to crimson at the horizon, with a faint glow low down. */
function emberSky() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#3a0303');
  grad.addColorStop(0.25, '#5a0505');
  grad.addColorStop(0.48, '#c01a0a');
  grad.addColorStop(0.52, '#d8300c');
  grad.addColorStop(1, '#5a0505');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 32, 16),
    new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.renderOrder = -10;
  return dome;
}

/** Orange lava with yellow-orange swirls (tiles seamlessly; scrolled every frame). */
function lavaTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#ff8a10';
  g.fillRect(0, 0, S, S);
  const rand = mulberry32(8080);
  for (let k = 0; k < 60; k++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 6 + rand() * 26;
    // Draw each blob in all 9 tile copies so the edges wrap.
    for (const dx of [-S, 0, S]) {
      for (const dy of [-S, 0, S]) {
        g.strokeStyle = rand() < 0.5 ? 'rgba(255,184,48,0.8)' : 'rgba(255,214,90,0.55)';
        g.lineWidth = 2 + rand() * 4;
        g.beginPath();
        g.arc(x + dx, y + dy, r, rand() * 6, rand() * 6 + 2.5);
        g.stroke();
      }
    }
  }
  for (let k = 0; k < 40; k++) {
    g.fillStyle = 'rgba(200,60,0,0.35)';
    const x = rand() * S;
    const y = rand() * S;
    g.beginPath();
    g.arc(x, y, 3 + rand() * 10, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let emberMats = null;
function emberMaterials() {
  if (emberMats) return emberMats;
  const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
  const lava = lavaTexture();
  lava.repeat.set(24, 24);
  emberMats = {
    lavaTex: lava,
    lava: new THREE.MeshBasicMaterial({ map: lava }),
    lavaGlow: basic(0xff8a10),
    lavaHot: basic(0xffb830),
    crater: basic(0xfd8114),
    stone: lambert(0xffffff), // tinted per cell (instance colors)
    side: lambert(0x5a1e1e, { flatShading: true }),
    rock: lambert(0x5a1e1e, { flatShading: true }),
    rockDark: lambert(0x3a1414, { flatShading: true }),
    channel: lambert(0x6a2a2e),
    rim: lambert(0x9a5a60),
    post: lambert(0x8a4a50, { flatShading: true }),
    cone: lambert(0x6a2e28, { flatShading: true }),
    brick: lambert(0x4a2a30, { flatShading: true }),
    brickDark: lambert(0x38202a, { flatShading: true }),
    window: basic(0xffb020),
    windowDim: basic(0xd88a18),
    plank: lambert(0x6d4a2e),
    plankDark: lambert(0x4e3420),
    iron: lambert(0x2a2a2e),
    wood: lambert(0x3a2618),
    flame: basic(0xffa030, { transparent: true, opacity: 0.9 }),
    bone: lambert(0xe8e0d0),
    eye: basic(0x1a0a0a),
    rail: lambert(0xf0f0f0),
    smoke: new THREE.MeshLambertMaterial({ color: 0x3a3030, transparent: true, opacity: 0.5, depthWrite: false }),
    cat: basic(0x101010),
  };
  return emberMats;
}

/** A rough flat-shaded boulder. */
const boulderGeo = new THREE.DodecahedronGeometry(1.3, 0);
function emberBoulder(parent, m, x, y, z, s, rot, dark) {
  const b = part(parent, boulderGeo, dark ? m.rockDark : m.rock, x, y + 0.6 * s, z);
  b.scale.set(s * 1.2, s * 0.9, s);
  b.rotation.set(rot * 0.3, rot, rot * 0.2);
  return b;
}

/** A little bone skull facing +z (rotated by `rot`). */
function emberSkull(parent, m, x, y, z, rot) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;
  parent.add(g);
  part(g, new THREE.SphereGeometry(0.45, 10, 8), m.bone, 0, 0.45, 0);
  part(g, boxGeo(0.5, 0.25, 0.4), m.bone, 0, 0.15, 0.12);
  for (const s of [-1, 1]) part(g, new THREE.SphereGeometry(0.11, 6, 5), m.eye, s * 0.17, 0.5, 0.38);
  return g;
}

/** A round window of crossed lattice bars glowing orange, facing +x. */
function latticeWindow(parent, m, x, y, z, r) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = Math.PI / 2;
  parent.add(g);
  g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 28), m.window));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 6, 28), m.brickDark);
  g.add(ring);
  for (let k = -2; k <= 2; k++) {
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const len = 2 * Math.sqrt(Math.max(0, r * r - (k * r * 0.38) ** 2));
      const bar = part(g, boxGeo(0.22, len, 0.15), m.brickDark, 0, 0, 0.05);
      bar.rotation.z = a;
      bar.position.set(Math.cos(a) * k * r * 0.38, Math.sin(a) * k * r * 0.38, 0.05);
      bar.castShadow = false;
    }
  }
  return g;
}

/**
 * Ember Keep, built from the spec grid (EMBER_GRID): a raised rock island in a glowing lava sea
 * under a red sky. The dark keep stands on its rock mass in the west, its gate opening onto a
 * chained drawbridge; the path is a sunken maroon channel with lighter rims that splits round the
 * volcano cone in the octagon plaza (it erupts at random), loops north-east, winds through the
 * south loop and S-bend and runs down to the base gate at the south tip. Boulders line the shore,
 * lava pits sit on the platforms and rock masses, islets and a watchtower stand in the lava.
 */
function buildEmber(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = emberMaterials();
  const animated = [];
  const C = EMBER_CELL;
  const G = EMBER_GRID;
  const rand = mulberry32(5150);
  if (!versus) scene.add(emberSky());

  // --- The lava sea, lit from below.
  const sea = new THREE.Mesh(versus ? new THREE.PlaneGeometry(260, LANE_SPACING) : new THREE.PlaneGeometry(600, 600), m.lava); // Versus: one strip per lane, so they don't overlap
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -2.2;
  scene.add(sea);
  animated.push((t) => {
    m.lavaTex.offset.set((t * 0.004) % 1, (t * 0.0025) % 1);
  });

  // --- The island: one raised block per ground cell, stone inland and darker rock on the shore.
  const cells = [];
  G.forEach((line, i) => [...line].forEach((ch, c) => '.#VSB'.includes(ch) && cells.push([c, i])));
  const blocks = new THREE.InstancedMesh(boxGeo(C, 2.6, C), m.stone, cells.length);
  blocks.receiveShadow = true;
  const o = new THREE.Object3D();
  const STONE = new THREE.Color(0x8a4a50);
  const ROCK = new THREE.Color(0x5a1e1e);
  const tmp = new THREE.Color();
  cells.forEach(([c, i], k) => {
    const [x, z] = emberCell(c, i + 1);
    o.position.set(x, -1.3, z);
    o.updateMatrix();
    blocks.setMatrixAt(k, o.matrix);
    const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, di]) => emberCh(c + dc, i + di) === '~');
    tmp.copy(shore ? ROCK : STONE).offsetHSL(0, 0, (rand() - 0.5) * 0.04);
    blocks.setColorAt(k, tmp);
  });
  scene.add(blocks);

  // --- The path: a dark sunken channel between lighter rims (each segment once; not the bridge).
  const done = new Set();
  const bridgeEnd = emberCell(8.5, 8)[0]; // the east edge of column I
  for (const r of path.routes) {
    for (const sg of r.segs) {
      const key = [sg.a.x, sg.a.z, sg.b.x, sg.b.z].map((v) => v.toFixed(2)).join();
      if (done.has(key)) continue;
      done.add(key);
      if (Math.max(sg.a.x, sg.b.x) <= bridgeEnd) continue;
      const len = sg.len + PATH_WIDTH;
      const rot = Math.atan2(sg.dx, sg.dz);
      const mx = (sg.a.x + sg.b.x) / 2;
      const mz = (sg.a.z + sg.b.z) / 2;
      const rim = new THREE.Mesh(boxGeo(PATH_WIDTH + 1.6, 0.06, len + 1.6), m.rim);
      rim.position.set(mx, 0.03 + done.size * 0.0005, mz);
      rim.rotation.y = rot;
      rim.receiveShadow = true;
      scene.add(rim);
      const ch = new THREE.Mesh(boxGeo(PATH_WIDTH, 0.06, len), m.channel);
      ch.position.set(mx, 0.08 + done.size * 0.0005, mz);
      ch.rotation.y = rot;
      ch.receiveShadow = true;
      scene.add(ch);
    }
  }

  // --- Drawbridge (F8-I8) over the lava channel, with iron chains to the gate posts.
  const [gx, gz] = emberCell(4, 8);
  const x0 = gx + C / 2;
  const x1 = bridgeEnd;
  for (let x = x0 + 0.5; x < x1; x += 1.1) {
    part(scene, boxGeo(1, 0.35, PATH_WIDTH + 1.4), rand() < 0.5 ? m.plank : m.plankDark, x, -0.15, gz).receiveShadow = true;
  }
  for (const s of [-1, 1]) {
    part(scene, boxGeo(x1 - x0, 0.5, 0.4), m.plankDark, (x0 + x1) / 2, -0.5, gz + s * (PATH_WIDTH / 2 + 0.9)); // side beams
    part(scene, boxGeo(0.8, 6, 0.8), m.brickDark, x0, 3, gz + s * 3.4); // gate posts
    // A sagging chain of links from the post top down to the bridge's far end.
    for (let k = 0; k <= 22; k++) {
      const f = k / 22;
      const link = part(scene, new THREE.TorusGeometry(0.28, 0.09, 4, 8), m.iron, x0 + (x1 - x0) * f, 5.6 * (1 - f) + 0.2 - Math.sin(f * Math.PI) * 1.2, gz + s * (3.4 - f * 0.6));
      link.rotation.set(0, k % 2 ? Math.PI / 2 : 0, 0);
      link.castShadow = false;
    }
  }

  // --- The dark keep on its rock mass (columns A-D, rows 6-11, and on past the grid's west edge).
  const [, kz] = emberCell(0, 8.5);
  const keepX = emberCell(3, 8)[0] + C / 2; // its east face (columns D/E), the gate side
  const mass = part(scene, boxGeo(48, 4.5, 36), m.rockDark, keepX - 24, -0.5, kz);
  mass.receiveShadow = true;
  for (let k = 0; k < 10; k++) emberBoulder(scene, m, keepX - 4 - rand() * 44, 1, kz + (rand() < 0.5 ? -1 : 1) * (16 + rand() * 4), 2 + rand() * 2.5, rand() * 6, true);
  const keep = new THREE.Group();
  keep.position.set(keepX, 1.75, kz);
  scene.add(keep);
  part(keep, boxGeo(16, 22, 26), m.brick, -8, 11, 0); // main keep
  for (const [tx, tz, w, h] of [[-4, -13, 6, 30], [-4, 13, 6, 30], [-14, -8, 7, 36], [-14, 8, 7, 36], [-10, 0, 8, 42]]) {
    part(keep, boxGeo(w, h, w), m.brickDark, tx, h / 2, tz);
    part(keep, new THREE.ConeGeometry(w * 0.75, w * 1.8, 4), m.brickDark, tx, h + w * 0.9, tz).rotation.y = Math.PI / 4;
    // Tall narrow lit windows up every tower.
    for (let wy = 6; wy < h - 3; wy += 5) part(keep, boxGeo(0.2, 2.4, 0.8), m.window, tx + w / 2 + 0.05, wy, tz).castShadow = false;
  }
  for (let wy = 10; wy < 21; wy += 4.5) {
    for (const wz of [-9.5, 9.5]) part(keep, boxGeo(0.2, 2.6, 0.9), m.windowDim, 0.05, wy, wz).castShadow = false;
  }
  // The gate, opening east onto the drawbridge, and the two big round windows either side.
  part(keep, boxGeo(0.4, 7, 5.2), m.eye, 0.1, 3.5, gz - kz);
  part(keep, new THREE.CylinderGeometry(2.6, 2.6, 0.4, 16), m.eye, 0.1, 7, gz - kz).rotation.set(0, 0, Math.PI / 2); // the arched top
  for (const s of [-1, 1]) latticeWindow(keep, m, 0.15, 12, gz - kz + s * 7.5, 4);
  // Biff the cat, sitting in the south (left) window.
  const cat = new THREE.Group();
  cat.position.set(0.3, 9.4, gz - kz + 7.5);
  keep.add(cat);
  part(cat, new THREE.SphereGeometry(0.7, 8, 6), m.cat, 0, 0.6, 0).scale.set(0.6, 1, 1);
  part(cat, new THREE.SphereGeometry(0.45, 8, 6), m.cat, 0, 1.55, 0);
  for (const s of [-1, 1]) part(cat, new THREE.ConeGeometry(0.15, 0.4, 4), m.cat, 0, 2, s * 0.25);
  part(cat, boxGeo(0.12, 0.12, 1.2), m.cat, 0, 0.3, -0.8).rotation.x = 0.6;
  const keepLight = new THREE.PointLight(0xffa030, 60, 40, 1.6);
  keepLight.position.set(keepX + 6, 10, gz);
  scene.add(keepLight);

  // --- The volcano cone in the octagon plaza: rough rock with a glowing crater.
  const [vx, vz] = EMBER_VOLCANO;
  const cone = part(scene, new THREE.CylinderGeometry(1.8, 5, 13, 9, 3), m.cone, vx, 6.5, vz);
  const pos = cone.geometry.attributes.position;
  for (let k = 0; k < pos.count; k++) {
    if (Math.abs(pos.getY(k)) > 6.4) continue;
    const j = 1 + (Math.sin(k * 12.9898) * 43758.5453 % 1) * 0.18;
    pos.setXYZ(k, pos.getX(k) * j, pos.getY(k), pos.getZ(k) * j);
  }
  cone.geometry.computeVertexNormals();
  const crater = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), m.crater);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(vx, 13.05, vz);
  scene.add(crater);
  const craterLight = new THREE.PointLight(0xff7a20, 50, 36, 1.5);
  craterLight.position.set(vx, 15, vz);
  scene.add(craterLight);

  // Eruptions at random times: a burst of lava blobs and a column of smoke (decor only).
  const blobGeo = new THREE.SphereGeometry(0.45, 6, 5);
  const blobs = Array.from({ length: 28 }, () => {
    const b = new THREE.Mesh(blobGeo, rand() < 0.5 ? m.lavaGlow : m.lavaHot);
    b.visible = false;
    scene.add(b);
    return { b, vx: 0, vy: 0, vz: 0, t: -1 };
  });
  const smokeGeo = new THREE.SphereGeometry(1.4, 7, 5);
  const puffs = Array.from({ length: 14 }, (_, k) => {
    const p = new THREE.Mesh(smokeGeo, m.smoke);
    p.castShadow = false;
    scene.add(p);
    return { p, age: k / 14 };
  });
  let next = null;
  let last = null;
  let erupting = 0;
  animated.push((t) => {
    const dt = last == null ? 0 : Math.min(0.1, t - last);
    last = t;
    next ??= t + 6 + Math.random() * 10;
    if (t >= next) {
      next = t + 14 + Math.random() * 22;
      erupting = 3;
      for (const bl of blobs) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 7;
        Object.assign(bl, { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 14 + Math.random() * 10, t: Math.random() * 0.6 });
        bl.b.position.set(vx, 13, vz);
      }
    }
    erupting = Math.max(0, erupting - dt);
    craterLight.intensity = 50 + (erupting > 0 ? 120 * Math.min(1, erupting) : Math.sin(t * 3) * 8);
    for (const bl of blobs) {
      if (bl.t < 0) continue;
      if (bl.t > 0) {
        bl.t = Math.max(0, bl.t - dt); // staggered launch
        if (bl.t === 0) bl.b.visible = true;
        continue;
      }
      bl.vy -= 30 * dt;
      bl.b.position.x += bl.vx * dt;
      bl.b.position.y += bl.vy * dt;
      bl.b.position.z += bl.vz * dt;
      if (bl.b.position.y < -1) {
        bl.t = -1;
        bl.b.visible = false;
      }
    }
    // Smoke: a thin wisp always, a thick dark column while erupting.
    const thick = erupting > 0 ? 1 : 0.35;
    for (const pf of puffs) {
      pf.age += dt * (erupting > 0 ? 0.5 : 0.15);
      if (pf.age > 1) pf.age -= 1;
      const s = (0.6 + pf.age * 3) * thick;
      pf.p.scale.setScalar(s);
      pf.p.position.set(vx + Math.sin(pf.age * 7 + t * 0.2) * pf.age * 3, 14 + pf.age * 22, vz + pf.age * 4);
      pf.p.visible = s > 0.25;
    }
    m.smoke.opacity = erupting > 0 ? 0.6 : 0.4;
  });

  // --- Decor from the shared map data: plaza posts, lava pits and shore boulders.
  for (const p of MAP.props) {
    if (p.kind === 'post') part(scene, boxGeo(2, 4, 2), m.post, p.x, 2, p.z);
    else if (p.kind === 'boulder') emberBoulder(scene, m, p.x, 0, p.z, p.s, p.rot, p.v < 0.4);
    else if (p.kind === 'pit') {
      const rimRing = part(scene, new THREE.TorusGeometry(p.r, 0.4, 6, 20), m.post, p.x, 0.1, p.z);
      rimRing.rotation.x = Math.PI / 2;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(p.r, 20), m.lavaGlow);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(p.x, 0.06, p.z);
      scene.add(pool);
    }
  }

  // --- The base gate at K21: a low brick wall with two dark posts topped by flames, and steps down off the island.
  const [bx, bz] = emberCell(10, 21);
  const flames = [];
  for (const s of [-1, 1]) {
    part(scene, boxGeo(3.2, 2.2, 1.2), m.brick, bx + s * 4, 1.1, bz);
    part(scene, boxGeo(0.9, 4.5, 0.9), m.wood, bx + s * 2.6, 2.25, bz);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 7), m.flame);
    f.position.set(bx + s * 2.6, 5.2, bz);
    scene.add(f);
    flames.push(f);
  }
  const baseLight = new THREE.PointLight(0xffa030, 30, 20, 1.6);
  baseLight.position.set(bx, 5, bz);
  scene.add(baseLight);
  animated.push((t) => flames.forEach((f, k) => f.scale.set(1, 0.85 + Math.sin(t * 9 + k * 2) * 0.15 + Math.sin(t * 23 + k) * 0.06, 1)));
  for (let k = 0; k < 4; k++) part(scene, boxGeo(3, 0.4, 1), m.wood, bx, -0.3 - k * 0.6, bz + 3 + k); // the steps down
  for (const s of [-1, 1]) {
    const rail = part(scene, boxGeo(0.25, 0.25, 5), m.wood, bx + s * 1.6, -0.6, bz + 4.5);
    rail.rotation.x = 0.55;
  }

  // --- Skulls by the base gate and on the north-east loop.
  for (const [c, r, rot] of [[8.6, 21.4, 0.4], [11.5, 21.6, -0.5], [12, 20.3, -1], [21.2, 4.3, 2.4], [22.2, 5.6, 3.6], [24.6, 6.4, -2]]) {
    const [x, z] = emberCell(c, r);
    if (path.distanceTo(x, z) > PATH_WIDTH / 2 + 0.5) emberSkull(scene, m, x, 0, z, rot);
  }

  // --- The watchtower on its rock off the south-west edge (A13-B14).
  const [wx, wz] = emberCell(0.5, 13.5);
  part(scene, new THREE.CylinderGeometry(5, 6.5, 4, 8), m.rockDark, wx, -0.5, wz);
  part(scene, boxGeo(5, 14, 5), m.brick, wx, 8, wz);
  part(scene, boxGeo(6, 1, 6), m.brickDark, wx, 15.5, wz);
  for (const [dx, dz] of [[2.55, 0], [0, -2.55], [0, 2.55]]) {
    for (const s of [-0.6, 0.6]) {
      part(scene, boxGeo(dx ? 0.15 : 0.9, 2, dz ? 0.15 : 0.9), m.window, wx + dx + (dz ? s : 0), 11, wz + dz + (dx ? s : 0)).castShadow = false;
    }
  }

  if (!versus) {
    // --- Big dark rock masses beyond the grid, half hidden in the red fog.
    for (const [x, z, r, h] of [[-110, -80, 40, 22], [-60, -95, 30, 16], [100, -85, 42, 26], [130, -30, 30, 18], [-130, 40, 34, 14], [40, -110, 34, 20]]) {
      const mass2 = part(scene, new THREE.CylinderGeometry(r * 0.55, r, h, 9), m.rockDark, x, h / 2 - 2.2, z);
      mass2.rotation.y = x * 0.03;
    }
    // --- The south-east islet with a white-railed spiral walkway.
    const ix = 78;
    const iz = 48;
    part(scene, new THREE.CylinderGeometry(7, 9, 6, 10), m.rock, ix, 0.8, iz);
    part(scene, new THREE.CylinderGeometry(2.2, 2.6, 12, 10), m.rock, ix, 9, iz);
    for (let k = 0; k < 26; k++) {
      const a = k * 0.42;
      const y = 3.9 + k * 0.42;
      const step = part(scene, boxGeo(2.4, 0.3, 1.1), m.post, ix + Math.cos(a) * 3.6, y, iz + Math.sin(a) * 3.6);
      step.rotation.y = -a;
      const post = part(scene, boxGeo(0.12, 1.1, 0.12), m.rail, ix + Math.cos(a) * 4.8, y + 0.6, iz + Math.sin(a) * 4.8);
      post.castShadow = false;
    }
    // --- Small rock islets dotting the lava, mostly north of the island.
    for (let k = 0; k < 40; k++) {
      const north = k < 28;
      const x = -70 + rand() * 150;
      const z = north ? -60 + rand() * 50 : -10 + rand() * 70;
      const [c, i] = [Math.floor(x / C + 15), Math.floor(z / C + 11)];
      let near = false;
      for (let dc = -1; dc <= 1; dc++) for (let di = -1; di <= 1; di++) if (emberCh(c + dc, i + di) !== '~') near = true;
      if (near && c >= 0 && c < 30 && i >= 0 && i < 22) continue;
      emberBoulder(scene, m, x, -2.4, z, 0.8 + rand() * 1.8, rand() * 6, rand() < 0.5);
    }
  }
  scene.userData.tick = (t) => animated.forEach((f) => f(t));
  return scene;
}
