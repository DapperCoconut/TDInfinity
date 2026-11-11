// Renders the static map (ground, path, portal, castle, decorations) from shared map data.
// buildWorld picks the renderer. The plain maps (Sunny Meadow, Sunken Canyon...) are drawn here.
// Each special map has its own file: nexusworld.js, crossingworld.js, courtworld.js, emberworld.js,
// rampartworld.js, brookworld.js, rigworld.js, graveworld.js. Shared pieces are in worldkit.js.
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { BOUNDS } from './sim/path.js';
import { BRIDGE_WIDTH, BRIDGE_X, CASTLE, CLIFFS, LANE_SPACING, MAP, POOLS, laneOz, mapInfo } from './sim/map.js';
import { buildRampart } from './rampartworld.js';
import { buildBrook } from './brookworld.js';
import { buildRig } from './rigworld.js';
import { GRAVE_PROPS } from './graveworld.js';
import { CARN_PROPS } from './carnivalworld.js';
import { TREES, lambert, placed, snowMat, themeMats, tileTexture } from './worldkit.js';
import { buildNexus } from './nexusworld.js';
import { buildCrossing } from './crossingworld.js';
import { buildCourt } from './courtworld.js';
import { buildEmber } from './emberworld.js';

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

  if (mapInfo.portal !== false) buildPortal(scene, path.start);
  if (mapInfo.base !== 'car') buildCastle(scene, CASTLE);
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
  for (const p of MAP.props) (PROPS[p.kind] ?? GRAVE_PROPS[p.kind] ?? CARN_PROPS[p.kind])?.(scene, p, m, animated);
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
