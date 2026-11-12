// Goldcloud Spires' decorations (Christmas Night 3): cream platforms floating over a sea of golden
// cloud, two-lane bridges across the gaps, glowing kerbs along the lanes, skyscrapers with light
// bands round the edges, the striped tower in the middle with its glowing doorway, an airship
// above it, a fin tower, lit pads, a glowing tree, gold arches at the spawn and the exit, and
// little hover cars. The map data is skyFixed() in src/sim/maps.js; world.js calls these
// through SKY_PROPS[kind].
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { lambert, placed } from './worldkit.js';
import { SKY_CELL, SKY_GRID, SKY_LANE, skyCell, skyCh, skyDeck } from './sim/maps.js';

const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const platMat = lambert(0xcdb48a);
const platUnder = lambert(0xa88f66);
const laneMat = lambert(0xe8d9b8);
const kerbMat = lambert(0xd2bf98);
const deckMat = lambert(0xd8c7a2);
const beamMat = lambert(0x8a7556);
const glow = basic(0xffe9a8);
const bandGlow = basic(0xfff1c8);
const gold = basic(0xffd27a);
const towerMat = lambert(0xc9a675);
const brown = lambert(0x4a3522);
const scraperMat = lambert(0xe3d3b4);
const scraperDark = lambert(0xcdbb98);
const cloudMat = lambert(0xe9d4a6, { flatShading: true });
const cloudLight = lambert(0xf3e2bc, { flatShading: true });
const shipMat = lambert(0xd8d4cc, { flatShading: true });
const shipDark = lambert(0x9a968e, { flatShading: true });
const engine = basic(0xbfe4ff);
const carTan = lambert(0xc9a675);
const carDark = lambert(0x3e3a36);
const treeGlow = basic(0xfff0a0);
const darkDisc = lambert(0x2e2620);

const hash = (a, b) => Math.abs((Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1);

/** Many copies of one box: `list` holds [x, y, z, sx, sy, sz] (sizes scale a unit box). */
function boxes(scene, mat, list, shadow = true) {
  if (!list.length) return null;
  const m = new THREE.InstancedMesh(boxGeo(1, 1, 1), mat, list.length);
  const o = new THREE.Object3D();
  list.forEach(([x, y, z, sx, sy, sz], i) => {
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/** A tall building with glowing light bands (and a narrower top part if `tier`). */
function scraper(scene, x, z, w, d, h, k, tier = true) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const base = -40; // its feet are down in the clouds
  part(g, boxGeo(w, h - base, d), k > 0.5 ? scraperMat : scraperDark, 0, (h + base) / 2, 0);
  for (let y = 8; y < h - 2; y += 9 + Math.round(k * 4)) part(g, boxGeo(w + 0.2, 0.8, d + 0.2), bandGlow, 0, y, 0).castShadow = false;
  if (tier) {
    const t = 10 + k * 18;
    part(g, boxGeo(w * 0.62, t, d * 0.62), scraperMat, 0, h + t / 2, 0);
    part(g, boxGeo(w * 0.62 + 0.2, 0.7, d * 0.62 + 0.2), bandGlow, 0, h + t * 0.6, 0).castShadow = false;
    part(g, boxGeo(0.4, 6, 0.4), brown, 0, h + t + 3, 0);
  }
  return g;
}

export const SKY_PROPS = {
  skyGround(scene, p, m, animated) {
    // The cloud sea far below: a flat floor and lumpy blocky puffs that drift slowly.
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), cloudMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -32;
    scene.add(sea);
    const puffs = new THREE.Group();
    scene.add(puffs);
    for (let i = 0; i < 70; i++) {
      const a = hash(i, 1) * Math.PI * 2;
      const r = 10 + hash(i, 2) * 220;
      const s = 6 + hash(i, 3) * 14;
      const b = part(puffs, new THREE.IcosahedronGeometry(1, 0), i % 3 ? cloudMat : cloudLight, Math.cos(a) * r, -30 + hash(i, 4) * 6, Math.sin(a) * r);
      b.scale.set(s * 1.6, s * 0.45, s);
      b.castShadow = false;
    }
    animated.push((t) => (puffs.rotation.y = t * 0.004));

    // Platforms, bridge decks, lanes' kerbs and the glowing trims, one cell at a time.
    const plat = [];
    const under = [];
    const deck = [];
    const beams = [];
    const kerbs = [];
    const studs = [];
    const trims = [];
    const C = SKY_CELL;
    const isLane = (c, r) => SKY_LANE.includes(skyCh(c, r));
    const isBridge = (c, r) => skyCh(c, r) === '=' || skyDeck(c, r);
    const isPlat = (c, r) => '.#SBHYL'.includes(skyCh(c, r));
    const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let r = 1; r <= 30; r++) {
      for (let c = 0; c < 30; c++) {
        const [x, z] = skyCell(c, r);
        if (isPlat(c, r)) {
          plat.push([x, -1, z, C, 2, C]);
          under.push([x, -3.5, z, C * 0.8, 3, C * 0.8]);
          // A glowing trim on every edge that drops off into the clouds.
          for (const [dc, dr] of sides) {
            if (isPlat(c + dc, r + dr) || isBridge(c + dc, r + dr) || skyCh(c + dc, r + dr) === '^') continue;
            trims.push([x + (dc * C) / 2, -0.1, z + (dr * C) / 2, dc ? 0.3 : C, 0.35, dr ? 0.3 : C]);
          }
        } else if (isBridge(c, r)) {
          deck.push([x, -0.45, z, C, 0.9, C]);
          if (skyDeck(c, r)) beams.push([x, -1.6, z, C * 2.6, 1.2, 1.2]); // a cross beam under each pair
        }
        // Low kerbs with light studs on both sides of a lane, where it meets something else.
        if (isLane(c, r)) {
          for (const [dc, dr] of sides) {
            if (isLane(c + dc, r + dr) || (r + dr < 1 || r + dr > 30)) continue;
            const ex = x + (dc * C) / 2;
            const ez = z + (dr * C) / 2;
            kerbs.push([ex, 0.18, ez, dc ? 0.5 : C, 0.36, dr ? 0.5 : C]);
            studs.push([ex, 0.55, ez, 0.3, 0.45, 0.3]);
          }
        }
      }
    }
    boxes(scene, platMat, plat);
    boxes(scene, platUnder, under);
    boxes(scene, deckMat, deck);
    boxes(scene, beamMat, beams);
    boxes(scene, kerbMat, kerbs);
    boxes(scene, glow, studs, false);
    boxes(scene, glow, trims, false);

    // Skyscrapers: one building per block of '^' cells in the grid.
    const seen = new Set();
    for (let r = 1; r <= 30; r++) {
      for (let c = 0; c < 30; c++) {
        if (skyCh(c, r) !== '^' || seen.has(`${c},${r}`)) continue;
        let c2 = c;
        while (skyCh(c2 + 1, r) === '^') c2++;
        let r2 = r;
        while ([...Array(c2 - c + 1)].every((_, i) => skyCh(c + i, r2 + 1) === '^')) r2++;
        for (let i = c; i <= c2; i++) for (let j = r; j <= r2; j++) seen.add(`${i},${j}`);
        const [x, z] = skyCell((c + c2) / 2, (r + r2) / 2);
        const k = hash(c, r);
        scraper(scene, x, z, (c2 - c + 1) * C - 0.6, (r2 - r + 1) * C - 0.6, 30 + k * 40, k);
      }
    }
    // More towers round the edge, fading into the haze.
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + hash(i, 5) * 0.12;
      const rr = 150 + hash(i, 6) * 70;
      const k = hash(i, 7);
      scraper(scene, Math.cos(a) * rr, Math.sin(a) * rr, 10 + k * 10, 10 + hash(i, 8) * 10, 40 + k * 70, k, i % 3 !== 0);
    }
  },

  skyBlock() {}, // invisible: keeps towers (and players) off the cloud gaps, bridge middles and skyscrapers

  skyTower(scene, p) {
    // The striped tower: a tan drum with glowing and dark brown bands near the top, a dark base
    // ring and a tall arched doorway on the south side with a glowing pointed gate inside.
    const g = placed(scene, p);
    const R = 9.4;
    const H = 52;
    part(g, new THREE.CylinderGeometry(R, R, H, 28), towerMat, 0, H / 2, 0);
    part(g, new THREE.CylinderGeometry(R + 0.6, R + 0.9, 2.4, 28), brown, 0, 1.2, 0);
    // The raised cream ring round its foot, with a glowing edge.
    part(g, new THREE.CylinderGeometry(R + 2.6, R + 2.8, 0.6, 28), lambert(0xe8d9b8), 0, 0.3, 0);
    part(g, new THREE.CylinderGeometry(R + 2.85, R + 2.85, 0.18, 28), glow, 0, 0.5, 0).castShadow = false;
    for (let i = 0; i < 6; i++) {
      const y = 30 + i * 3.6;
      part(g, new THREE.CylinderGeometry(R + 0.15, R + 0.15, 1.6, 28), i % 2 ? brown : bandGlow, 0, y, 0).castShadow = false;
    }
    part(g, new THREE.CylinderGeometry(R - 0.8, R, 1.2, 28), brown, 0, H + 0.6, 0);
    // The doorway: a dark arch cut into the south face, outlined in gold.
    const door = new THREE.Group();
    door.position.set(0, 0, R - 0.3);
    g.add(door);
    part(door, boxGeo(6, 13, 1), brown, 0, 6.5, 0);
    part(door, new THREE.CylinderGeometry(3, 3, 1, 16, 1, false, -Math.PI / 2, Math.PI), brown, 0, 13, 0).rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) part(door, boxGeo(0.4, 13, 0.4), gold, sx * 3.2, 6.5, 0.6).castShadow = false;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.2, 6, 16, Math.PI), gold);
    arc.position.set(0, 13, 0.6);
    door.add(arc);
    // The pointed glowing gate inside, two upright fins and a short flight of dark stairs.
    const gate = new THREE.Shape();
    gate.moveTo(-1.8, 0).lineTo(1.8, 0).lineTo(1.8, 7).lineTo(0, 10).lineTo(-1.8, 7).lineTo(-1.8, 0);
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(gate), gold);
    gm.position.set(0, 1.5, 0.55);
    door.add(gm);
    for (const sx of [-1, 1]) part(door, boxGeo(0.5, 9, 1.4), brown, sx * 2.4, 6, 0.9);
    for (let i = 0; i < 3; i++) part(door, boxGeo(5, 0.5, 0.8), lambert(0x3a2a1c), 0, 0.25 + i * 0.5, 2.6 - i * 0.8);
    // The mast up to the airship.
    part(g, new THREE.CylinderGeometry(0.25, 0.35, 20, 6), brown, 0, H + 10, 0);
    part(g, boxGeo(0.6, 0.6, 0.6), glow, 0, H + 20, 0).castShadow = false;
  },

  skyShip(scene, p, m, animated) {
    // A big grey-white airship hanging over the tower: a long angular hull, a bridge on top,
    // side wings and blue-white engines at the back. It bobs and turns slowly.
    const g = placed(scene, p);
    const ship = new THREE.Group();
    ship.position.y = 78;
    g.add(ship);
    part(ship, boxGeo(10, 4, 34), shipMat, 0, 0, 0);
    const nose = part(ship, new THREE.ConeGeometry(5.6, 12, 4), shipMat, 0, 0, -23);
    nose.rotation.set(-Math.PI / 2, Math.PI / 4, 0);
    nose.scale.set(1.25, 1, 0.55);
    part(ship, boxGeo(7, 2.4, 22), shipDark, 0, -2.6, 2);
    part(ship, boxGeo(5, 3, 8), shipMat, 0, 3.4, 6);
    part(ship, boxGeo(5.2, 0.6, 1), engine, 0, 4.2, 2).castShadow = false;
    for (const sx of [-1, 1]) {
      part(ship, boxGeo(9, 0.8, 10), shipMat, sx * 9, -0.5, 6);
      part(ship, boxGeo(3, 3, 5), shipDark, sx * 12, -0.5, 9);
      part(ship, boxGeo(2.4, 2.4, 0.4), engine, sx * 12, -0.5, 11.6).castShadow = false;
    }
    for (const sx of [-2.6, 0, 2.6]) part(ship, boxGeo(2, 2, 0.4), engine, sx, 0, 17.1).castShadow = false;
    animated.push((t) => {
      ship.position.y = 78 + Math.sin(t * 0.4) * 1.2;
      ship.rotation.y = Math.sin(t * 0.05) * 0.5;
    });
  },

  skyFin(scene, p) {
    // A tall cream tower with four flat fins on its face and dark bands partway up, on a rounded
    // pedestal with a glowing round pad and two small dark disc lights.
    const g = placed(scene, p);
    part(g, new THREE.CylinderGeometry(3.8, 4, 1, 20), lambert(0xe3d3b4), 0, 0.5, 0);
    part(g, new THREE.CylinderGeometry(3.85, 3.85, 0.15, 20), glow, 0, 1, 0).castShadow = false;
    part(g, boxGeo(4, 46, 4), scraperMat, 0, 24, 0);
    for (let i = 0; i < 4; i++) {
      const h = 40 - i * 6;
      part(g, boxGeo(0.4, h, 2.4), scraperMat, -1.5 + i, 1 + h / 2, 3);
    }
    for (const y of [20, 23]) part(g, boxGeo(4.2, 1.2, 4.2), brown, 0, y, 0);
    for (const sx of [-1, 1]) part(g, new THREE.CylinderGeometry(0.6, 0.6, 0.3, 12), darkDisc, sx * 2.2, 1.1, 2.6);
  },

  skyPad(scene, p) {
    // A lit pedestal: a low round cream step with a glowing ring on top.
    const g = placed(scene, p);
    part(g, new THREE.CylinderGeometry(2, 2.2, 0.5, 18), lambert(0xe3d3b4), 0, 0.25, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.16, 6, 20), glow);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.55;
    g.add(ring);
  },

  skyTree(scene, p) {
    // A thin cream trunk with a flat, wide, glowing pale-yellow canopy.
    const g = placed(scene, p);
    part(g, new THREE.CylinderGeometry(0.25, 0.4, 8.6, 6), lambert(0xe8d9b8), 0, 4.3, 0);
    part(g, new THREE.CylinderGeometry(4, 3.2, 1.2, 10), treeGlow, 0, 9, 0);
    part(g, new THREE.CylinderGeometry(2.4, 2, 0.8, 10), treeGlow, 0, 10, 0);
  },

  skyArch(scene, p, m, animated) {
    // A gold gateway over the lanes: two pillars, a pointed top and a glowing panel. The exit's
    // panel pulses gently.
    const g = placed(scene, p);
    for (const sx of [-1, 1]) {
      part(g, boxGeo(1.4, 10, 1.4), towerMat, sx * 6, 5, 0);
      part(g, boxGeo(1.6, 0.6, 1.6), brown, sx * 6, 0.3, 0);
      part(g, boxGeo(0.3, 10, 0.3), gold, sx * 5.2, 5, 0).castShadow = false;
    }
    for (const sx of [-1, 1]) {
      const top = part(g, boxGeo(7.6, 1.2, 1.4), towerMat, sx * 3.1, 11.6, 0);
      top.rotation.z = -sx * 0.32;
      const tg = part(g, boxGeo(7.2, 0.3, 0.3), gold, sx * 3, 11, 0.8);
      tg.rotation.z = -sx * 0.32;
      tg.castShadow = false;
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    const panel = new THREE.Shape();
    panel.moveTo(-5, 0).lineTo(5, 0).lineTo(5, 10).lineTo(0, 12.6).lineTo(-5, 10).lineTo(-5, 0);
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(panel), mat));
    if (p.exit) animated.push((t) => (mat.opacity = 0.3 + Math.sin(t * 1.5) * 0.12));
  },

  skyCars(scene, p, m, animated) {
    // Little hover cars and drones drifting in rings round the city.
    const cars = [];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      scene.add(g);
      part(g, boxGeo(2, 0.9, 3.6), i % 2 ? carTan : carDark, 0, 0, 0);
      part(g, boxGeo(1.6, 0.7, 1.6), i % 2 ? carDark : carTan, 0, 0.7, -0.2);
      part(g, boxGeo(1.8, 0.2, 0.2), engine, 0, -0.2, 1.85).castShadow = false;
      cars.push({ g, r: 85 + hash(i, 9) * 70, y: 12 + hash(i, 10) * 30, sp: (0.03 + hash(i, 11) * 0.04) * (i % 2 ? 1 : -1), a0: i * 0.7 });
    }
    animated.push((t) => {
      for (const c of cars) {
        const a = c.a0 + t * c.sp;
        c.g.position.set(Math.cos(a) * c.r, c.y + Math.sin(t * 0.5 + c.a0) * 1.5, Math.sin(a) * c.r);
        c.g.rotation.y = -a + (c.sp > 0 ? Math.PI : 0);
      }
    });
  },
};
