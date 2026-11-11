// Ember Keep: the map renderer (shared pieces come from worldkit.js).

import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { LANE_SPACING, MAP } from './sim/map.js';
import { EMBER_CELL, EMBER_GRID, EMBER_VOLCANO, emberCell, emberCh } from './sim/maps.js';
import { lambert } from './worldkit.js';

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
export function buildEmber(parent, { oz = 0, versus = false } = {}) {
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
