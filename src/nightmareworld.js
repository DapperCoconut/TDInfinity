// Halloween Night 3's decorations: the Nightmare Realm portal, the corrupted supercomputer (the
// base), the hexagonal hill, ring craters, gravel, boulders, planks, burned houses, broken tracks,
// a truss, bones, a wrecked gate, small lamps and the sandstone crater wall. The map data is
// nmFixed() in src/sim/maps.js; world.js calls these through NM_PROPS[kind].
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { canvasTex, lambert, placed } from './worldkit.js';

const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const frameMat = lambert(0xc8402a);
const frameDark = lambert(0x8a2a1c);
const plateMat = lambert(0x3a3a3a);
const treadMat = lambert(0x262626);
const lampPod = basic(0xff9a2a);
const spikeMat = lambert(0x4a4a4a);
const bodyMat = lambert(0x8a7a66);
const bodyDark = lambert(0x5e5446);
const brassMat = lambert(0xb08850);
const slatMat = basic(0xe43ce8);
const slatDim = basic(0x9a2aa0);
const beamMat = new THREE.MeshBasicMaterial({ color: 0xe070e0, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const hillTop = lambert(0xc0703f);
const hillSide = lambert(0xa85a32);
const rockMats = [lambert(0xb8643a), lambert(0xa85a34), lambert(0xc4744a)];
const burnt = lambert(0x3a2a20);
const burntBlack = lambert(0x1e1612);
const plankMats = [lambert(0x7a5a3a), lambert(0x5e4430), lambert(0x8a6a48)];
const steelMat = lambert(0x4a4a4a);
const boneMat = lambert(0xe8dcc0);
const deadWood = lambert(0x3a2a20);
const glowMat = basic(0xffa040);
const cliffMats = [lambert(0xb87848), lambert(0xa86a3e), lambert(0xc8885a), lambert(0x9a5e36)];

/** A point light (kept to a few per map: lights are slow). */
/** Set by the game client: the portal glows bright from Halloween Night 3's wave 34 on. */
export const NM_STATE = { glow: 0 };

function light(g, color, intensity, dist, x, y, z) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.position.set(x, y, z);
  g.add(l);
  return l;
}

/** The portal's swirl: orange-yellow spiral arms on a glowing disc. */
function swirlTex() {
  return canvasTex(128, (g, s) => {
    const c = s / 2;
    const grad = g.createRadialGradient(c, c, 2, c, c, c);
    grad.addColorStop(0, '#fff4c0');
    grad.addColorStop(0.35, '#ffcf4a');
    grad.addColorStop(0.8, '#ffb52e');
    grad.addColorStop(1, '#e06a1a');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(200, 70, 20, 0.55)';
    g.lineWidth = 5;
    for (let arm = 0; arm < 4; arm++) {
      g.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const a = arm * (Math.PI / 2) + t * 5;
        const r = t * c;
        g[t ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, c + Math.sin(a) * r);
      }
      g.stroke();
    }
  });
}

/** A rock: a squashed, turned dodecahedron. */
function rock(g, r, x, y, z, mat, seed = 0) {
  const m = part(g, new THREE.DodecahedronGeometry(r, 0), mat, x, y, z);
  m.scale.set(1 + (seed % 3) * 0.15, 0.6 + (seed % 2) * 0.2, 0.9);
  m.rotation.set(seed * 0.7, seed * 1.3, seed * 0.4);
  return m;
}

export const NM_PROPS = {
  nmPortal(scene, p, m, animated) {
    // About 20 wide and 15 tall: a red-orange machine arch on a crawler-tread base, its mouth
    // facing east (+x) at F16, filled with a turning lava-orange vortex.
    const g = placed(scene, p);
    const R = 8.5;
    const Y = 3; // the arch stands on the tread base
    // Crawler treads (one under each foot) and the deck between them.
    for (const z of [-R, R]) {
      part(g, boxGeo(9, 2.2, 3.4), treadMat, 0, 1.1, z);
      for (const x of [-4.5, 4.5]) part(g, new THREE.CylinderGeometry(1.1, 1.1, 3.5, 12), treadMat, x, 1.1, z).rotation.x = Math.PI / 2;
      for (let x = -3.6; x <= 3.6; x += 1.2) part(g, boxGeo(0.5, 0.25, 3.5), plateMat, x, 2.3, z);
    }
    part(g, boxGeo(7, 1, 2 * R + 3), plateMat, -0.5, 2.5, 0);
    // The arch: heavy red blocks round a half circle, grey plates on the back.
    const n = 15;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI;
      const y = Y + Math.sin(a) * R;
      const z = Math.cos(a) * R;
      const b = part(g, boxGeo(3.4, 2.6, 2.4), i % 2 ? frameMat : frameDark, 0, y, z);
      b.rotation.x = -a + Math.PI / 2;
      const back = part(g, boxGeo(1.2, 2.2, 2.6), plateMat, -2.2, y, z);
      back.rotation.x = b.rotation.x;
      // Round orange lamp pods on every other block, spikes on top.
      if (i % 2 === 0) part(g, new THREE.SphereGeometry(0.5, 10, 8), lampPod, 1.8, y, z).castShadow = false;
      if (i > 2 && i < n - 2 && i % 2 === 1) {
        const sp = part(g, new THREE.ConeGeometry(0.45, 2, 6), spikeMat, 0, Y + Math.sin(a) * (R + 2.2), Math.cos(a) * (R + 2.2));
        sp.rotation.x = -a + Math.PI / 2;
      }
    }
    // Side towers of machinery at the feet.
    for (const z of [-R - 1.5, R + 1.5]) {
      part(g, boxGeo(4, 6, 2.4), frameMat, -0.5, Y + 3, z);
      part(g, boxGeo(4.4, 0.6, 2.8), plateMat, -0.5, Y + 6.2, z);
      part(g, new THREE.CylinderGeometry(0.4, 0.4, 3, 8), plateMat, -2.5, Y + 4, z);
    }
    // The vortex: a half disc filling the arch, with a second one turning the other way.
    const tex = swirlTex();
    tex.center.set(0.5, 0.5);
    const tex2 = swirlTex();
    tex2.center.set(0.5, 0.5);
    const disc = (t, x, op) => {
      const d = new THREE.Mesh(
        new THREE.CircleGeometry(R - 0.9, 40, 0, Math.PI),
        new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, transparent: op < 1, opacity: op, depthWrite: op >= 1 }),
      );
      d.position.set(x, Y, 0);
      d.rotation.y = Math.PI / 2;
      g.add(d);
    };
    disc(tex, -0.3, 1);
    disc(tex2, 0.2, 0.5);
    // The floor in front glows orange.
    const glow = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.25, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(5, 0.06, 0);
    g.add(glow);
    const lamp = light(g, 0xffa040, 30, 34, 4, 7, 0);
    NM_STATE.glow = 0;
    let on = 0; // fades up to 1 once the portal starts to glow
    animated.push((t) => {
      on += ((NM_STATE.glow ? 1 : 0) - on) * 0.02;
      tex.rotation = t * (0.8 + on * 1.5);
      tex2.rotation = -t * (1.3 + on * 2);
      glow.material.opacity = 0.22 + Math.sin(t * 2.3) * 0.06 + on * (0.35 + Math.sin(t * 6) * 0.15);
      glow.scale.setScalar(1 + on * 0.6);
      lamp.intensity = 30 + on * (60 + Math.sin(t * 6) * 25);
    });
  },

  nmComputer(scene, p, m, animated) {
    // The base: a tall boxy machine of grey and brass, about 8 deep, 14 wide and 14 tall, its
    // magenta slat panel facing west onto the path, pipes on top and its south side, and a thin
    // pink light beam rising into the sky.
    const g = placed(scene, p);
    part(g, boxGeo(8, 1, 15), bodyDark, 0, 0.5, 0);
    part(g, boxGeo(7.4, 12, 14), bodyMat, 0, 7, 0);
    part(g, boxGeo(7.8, 0.6, 14.4), brassMat, 0, 13.3, 0);
    part(g, boxGeo(7.8, 0.4, 14.4), brassMat, 0, 1.2, 0);
    for (const z of [-7.05, 7.05]) for (const x of [-3.5, 3.5]) part(g, boxGeo(0.6, 12, 0.6), brassMat, x, 7, z);
    // The front panel: a stack of glowing magenta slats in a dark frame.
    part(g, boxGeo(0.3, 9.6, 10.4), bodyDark, -3.8, 7, 0);
    const slats = [];
    for (let i = 0; i < 9; i++) {
      const s = part(g, boxGeo(0.2, 0.7, 9.4), slatMat, -4, 3 + i * 1.05, 0);
      s.castShadow = false;
      slats.push(s);
    }
    // Pipes on top and down the south side.
    for (const [z, h] of [[-4, 3], [-1.5, 4.5], [2, 2.5], [4.5, 3.6]]) {
      part(g, new THREE.CylinderGeometry(0.45, 0.45, h, 10), brassMat, 1, 13.6 + h / 2, z);
      part(g, new THREE.CylinderGeometry(0.55, 0.55, 0.3, 10), bodyDark, 1, 13.6 + h, z);
    }
    const bend = part(g, new THREE.CylinderGeometry(0.4, 0.4, 6, 10), brassMat, -1, 15.5, 0.25);
    bend.rotation.x = Math.PI / 2;
    for (const x of [-2, 0.5, 2.5]) {
      part(g, new THREE.CylinderGeometry(0.5, 0.5, 11, 10), brassMat, x, 6.5, 7.6);
      for (const y of [2.5, 6.5, 10.5]) part(g, boxGeo(1.4, 0.3, 0.6), bodyDark, x, y, 7.5);
    }
    // Vents on the back and a small grille up top.
    for (let i = 0; i < 5; i++) part(g, boxGeo(0.2, 0.3, 8), bodyDark, 3.75, 4 + i * 1.2, 0);
    // The beam.
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 220, 10, 1, true), beamMat);
    beam.position.set(0, 14 + 110, 0);
    g.add(beam);
    light(g, 0xe43ce8, 24, 30, -6, 8, 0);
    animated.push((t) => {
      slats.forEach((s, i) => (s.material = Math.sin(t * 4 + i * 0.9) > -0.6 ? slatMat : slatDim));
      beam.material.opacity = 0.38 + Math.sin(t * 3) * 0.08;
    });
  },

  nmHill(scene, p) {
    // The hexagonal hill: a flat-topped rock plateau about 28 x 22 and 3 high, with broken,
    // bevelled sides in a darker orange and a few loose rocks round its foot.
    const g = placed(scene, p);
    const base = part(g, new THREE.CylinderGeometry(13.4, 14.4, 2.2, 6), hillSide, 0, 1.1, 0);
    base.scale.z = 0.78;
    const top = part(g, new THREE.CylinderGeometry(12.6, 13.4, 0.8, 6), hillTop, 0, 2.6, 0);
    top.scale.z = 0.78;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.2;
      rock(g, 0.9 + (i % 4) * 0.35, Math.cos(a) * 13.6, 0.6 + (i % 3) * 0.5, Math.sin(a) * 10.6, rockMats[i % 3], i);
    }
  },

  nmRing(scene, p) {
    // A shallow ring crater: a low rim of rocks 1-2 high round a sandy middle at floor level.
    const g = placed(scene, p);
    const n = Math.round(p.r * 2.6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = 1.1 + ((i * 7 + p.v) % 5) * 0.18;
      rock(g, s, Math.cos(a) * p.r, s * 0.35, Math.sin(a) * p.r, rockMats[(i + p.v) % 3], i + p.v);
    }
    const bank = part(g, new THREE.TorusGeometry(p.r, 1.3, 4, 48), rockMats[1], 0, 0, 0);
    bank.rotation.x = Math.PI / 2;
    bank.scale.z = 0.5;
  },

  nmGravel(scene, p) {
    // A flat patch of pale tan pebbles.
    const tex = canvasTex(64, (g, s) => {
      g.fillStyle = '#c8915e';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 140; i++) {
        const k = Math.abs((Math.sin((i + p.v * 200) * 12.9898) * 43758.5453) % 1);
        const k2 = Math.abs((Math.sin((i + p.v * 200) * 78.233) * 43758.5453) % 1);
        g.fillStyle = ['#d8a676', '#b07c4c', '#e0b48a', '#a87040'][i % 4];
        g.fillRect(k * s, k2 * s, 2 + (i % 3), 2 + ((i + 1) % 3));
      }
    });
    tex.repeat.set(p.w / 8, p.d / 8);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), new THREE.MeshLambertMaterial({ map: tex }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(p.x, 0.03, p.z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  },

  nmRock(scene, p) {
    // An angular orange boulder.
    const g = placed(scene, { ...p, s: 1 });
    rock(g, p.s, 0, p.s * 0.4, 0, rockMats[p.v % 3], p.v);
    rock(g, p.s * 0.45, p.s * 0.9, p.s * 0.2, p.s * 0.5, rockMats[(p.v + 1) % 3], p.v + 1);
  },

  nmTree(scene, p) {
    // A dead, forked tree: a bare trunk splitting into crooked branches.
    const g = placed(scene, p);
    part(g, new THREE.CylinderGeometry(0.35, 0.55, 4, 6), deadWood, 0, 2, 0);
    for (const [rz, rx, len, y] of [[0.5, 0.1, 3.4, 4.6], [-0.6, -0.2, 3, 4.4], [0.2, 0.7, 2.4, 5]]) {
      const b = part(g, new THREE.CylinderGeometry(0.12, 0.25, len, 5), deadWood, Math.sin(-rz) * len * 0.4, y, Math.sin(rx) * len * 0.4);
      b.rotation.set(rx, 0, rz);
    }
    const twig = part(g, new THREE.CylinderGeometry(0.06, 0.1, 1.4, 4), deadWood, -1.9, 6.3, 0);
    twig.rotation.z = 1.1;
  },

  nmPlanks(scene, p) {
    // A few loose boards lying on the sand, one propped up.
    const g = placed(scene, p);
    for (let i = 0; i < 3 + (p.v % 2); i++) {
      const b = part(g, boxGeo(3 + (i % 2) * 0.8, 0.12, 0.45), plankMats[(i + p.v) % 3], (i - 1) * 0.5, 0.08 + i * 0.05, (i - 1) * 0.6);
      b.rotation.y = i * 0.5 - 0.4;
    }
    const up = part(g, boxGeo(2.4, 0.12, 0.45), plankMats[p.v % 3], 0.6, 0.5, -1);
    up.rotation.set(0, 0.3, 0.35);
  },

  nmLamp(scene, p) {
    // A small orange lamp sitting on a heap of debris.
    const g = placed(scene, p);
    part(g, boxGeo(1.8, 0.4, 1.2), plankMats[1], 0, 0.2, 0).rotation.y = 0.3;
    part(g, boxGeo(1.4, 0.3, 0.4), burnt, 0.2, 0.5, 0.3).rotation.y = -0.5;
    part(g, boxGeo(0.12, 1.2, 0.12), steelMat, 0, 1.1, 0);
    part(g, boxGeo(0.45, 0.5, 0.45), glowMat, 0, 1.9, 0).castShadow = false;
    part(g, new THREE.ConeGeometry(0.4, 0.3, 4), steelMat, 0, 2.3, 0).rotation.y = Math.PI / 4;
    if (p.lit) light(g, 0xffa040, 8, 12, 0, 2.2, 0);
  },

  nmHouse(scene, p) {
    // A burned-down house: charred posts and beams, half a wall, and a collapsed roof.
    const g = placed(scene, p);
    const W = 10;
    const D = 8;
    for (const [x, z, h] of [[-W / 2, -D / 2, 6], [W / 2, -D / 2, 4.2], [-W / 2, D / 2, 3.4], [W / 2, D / 2, 6], [0, -D / 2, 5]]) part(g, boxGeo(0.5, h, 0.5), burnt, x, h / 2, z);
    part(g, boxGeo(W, 0.45, 0.45), burntBlack, 0, 5.8, -D / 2).rotation.z = 0.06;
    part(g, boxGeo(0.45, 0.45, D), burnt, W / 2, 5.6, 0);
    for (let i = 0; i < 5; i++) part(g, boxGeo(0.35, 2.6 - (i % 3) * 0.6, 0.15), burnt, -W / 2 + 0.8 + i * 1.1, 1.3 - (i % 3) * 0.3, -D / 2);
    const roof = part(g, boxGeo(W * 0.8, 0.3, D * 0.75), burntBlack, -0.6, 2.6, 0.8);
    roof.rotation.set(0.35, 0, -0.25);
    const roof2 = part(g, boxGeo(W * 0.5, 0.3, D * 0.5), burnt, 2, 1.2, -1);
    roof2.rotation.set(-0.3, 0.4, 0.5);
    for (let i = 0; i < 4; i++) part(g, boxGeo(2.5, 0.2, 0.3), burntBlack, -3 + i * 2, 0.15, 3.2 - i).rotation.y = i * 0.9;
  },

  nmTrack(scene, p) {
    // A wooden ladder-like rail track lying broken: two pieces, the second knocked askew.
    const g = placed(scene, p);
    const piece = (x, z, ry, len) => {
      const s = new THREE.Group();
      s.position.set(x, 0, z);
      s.rotation.y = ry;
      g.add(s);
      for (const sz of [-0.8, 0.8]) part(s, boxGeo(len, 0.3, 0.3), plankMats[1], 0, 0.3, sz);
      for (let d = -len / 2 + 0.5; d < len / 2; d += 1.4) part(s, boxGeo(0.4, 0.2, 2.4), plankMats[(Math.round(d) + 3) % 3], d, 0.1, 0);
      return s;
    };
    piece(0, 0, 0, 14);
    const b = piece(10, 2.5, 0.5, 8);
    b.rotation.z = 0.08;
  },

  nmTruss(scene, p) {
    // A piece of steel truss bridge: two chords with posts and cross braces.
    const g = placed(scene, p);
    const L = 18;
    const H = 4;
    for (const z of [-1.5, 1.5]) {
      part(g, boxGeo(L, 0.4, 0.4), steelMat, 0, 4 + 0.2, z);
      part(g, boxGeo(L, 0.4, 0.4), steelMat, 0, 4 + H, z);
      for (let x = -L / 2; x <= L / 2; x += 3) {
        part(g, boxGeo(0.35, H, 0.35), steelMat, x, 4 + H / 2, z);
        if (x < L / 2) part(g, boxGeo(Math.hypot(3, H), 0.25, 0.25), steelMat, x + 1.5, 4 + H / 2, z).rotation.z = Math.atan2(H, 3);
      }
    }
    for (const x of [-L / 2, L / 2]) part(g, boxGeo(0.6, 4, 0.6), steelMat, x, 2, 0);
  },

  nmBones(scene, p) {
    // A few small bone pieces (and the odd skull) on the sand.
    const g = placed(scene, p);
    for (let i = 0; i < 3; i++) {
      const b = part(g, new THREE.CylinderGeometry(0.1, 0.1, 1.2, 5), boneMat, i * 0.6 - 0.6, 0.1, (i % 2) * 0.5);
      b.rotation.set(Math.PI / 2, 0, i * 1.1);
      part(g, new THREE.SphereGeometry(0.17, 6, 4), boneMat, i * 0.6 - 0.6 + Math.sin(i * 1.1) * 0.6, 0.12, (i % 2) * 0.5 + Math.cos(i * 1.1) * 0.6);
    }
    if (p.v % 3 === 0) {
      part(g, new THREE.SphereGeometry(0.42, 8, 6), boneMat, 0.8, 0.35, -0.6);
      for (const ex of [-0.14, 0.14]) part(g, boxGeo(0.12, 0.12, 0.05), burntBlack, 0.8 + ex, 0.4, -0.2);
    }
  },

  nmGate(scene, p) {
    // A broken spiked metal gate lying on the floor, a small orange lamp beside it.
    const g = placed(scene, p);
    const gate = new THREE.Group();
    gate.rotation.z = Math.PI / 2 - 0.15;
    gate.position.y = 0.3;
    g.add(gate);
    for (const y of [0.4, 2.4]) part(gate, boxGeo(0.15, 0.15, 6), steelMat, 0, y, 0);
    for (let z = -2.7; z <= 2.7; z += 0.6) {
      part(gate, boxGeo(0.1, 3.2, 0.1), steelMat, 0, 1.6, z);
      part(gate, new THREE.ConeGeometry(0.12, 0.4, 4), steelMat, 0, 3.4, z);
    }
    part(g, boxGeo(0.4, 2.6, 0.4), steelMat, 0, 1.3, 3.6);
    part(g, boxGeo(0.4, 0.4, 0.4), glowMat, 0, 2.8, 3.6).castShadow = false;
  },

  nmCliff(scene, p) {
    // A piece of the crater wall: stacked, layered sandstone slabs, narrower towards the top.
    const g = placed(scene, { x: p.x, z: p.z, rot: p.rot });
    let y = 0;
    let w = p.w;
    let i = 0;
    while (y < p.h) {
      const h = Math.min(p.h - y, 3 + ((p.v + i) % 3) * 1.5);
      const s = part(g, boxGeo(w, h, w * 0.6), cliffMats[(p.v + i) % 4], ((p.v + i) % 3) - 1, y + h / 2, ((p.v * 3 + i) % 3) - 1);
      s.rotation.y = ((p.v + i) % 5) * 0.08 - 0.16;
      s.castShadow = false;
      y += h;
      w *= 0.86;
      i++;
    }
  },

  nmSpire(scene, p) {
    // A tall rock spire on the north-east rim with a dead tree on its top.
    const g = placed(scene, p);
    const sp = part(g, new THREE.CylinderGeometry(3, 7, 44, 6), cliffMats[0], 0, 22, 0);
    sp.castShadow = false;
    part(g, new THREE.CylinderGeometry(3.4, 3, 2, 6), cliffMats[2], 0, 45, 0);
    const tree = new THREE.Group();
    tree.position.y = 46;
    tree.scale.setScalar(1.6);
    g.add(tree);
    NM_PROPS.nmTree(tree, { x: 0, z: 0 });
  },
};
