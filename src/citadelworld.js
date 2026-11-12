// Frostgate Citadel's decorations (Christmas Night 2): blue snow, the fog bank in the west, two long
// panelled walls with wall towers, a steel truss across the map, the dark raised strip, the lit
// courtyard with hazard pads and floodlights, the striped apron, the big sliding gate and the
// citadel behind it (with a cannon and a radar on its roof), a bunker, rubble, cranes and a fire.
// The map data is cgFixed() in src/sim/maps.js; world.js calls these through CG_PROPS[kind].
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { canvasTex, lambert, placed, tileTexture } from './worldkit.js';

const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const snowTex = tileTexture('#b8c6e6', ['#b2c0e0', '#c0cdea', '#aab8d8'], null, 128, 8);
snowTex.repeat.set(220 / 14, 110 / 14);
const snowMat = lambert(0xffffff, { map: snowTex });
const snowCap = lambert(0xdfe6f6);
const wallMat = lambert(0x5a6690);
const wallDark = lambert(0x48537a);
const curbMat = lambert(0x2e3450);
const stripMat = lambert(0x2b3560);
const black = lambert(0x15161e);
const rubbleMat = lambert(0x3a4058, { flatShading: true });
const rubbleLight = lambert(0x4a5170, { flatShading: true });
const slabMat = lambert(0x7a8094);
const gateMat = lambert(0x2a2848);
const gateDark = lambert(0x1e1c36);
const pillarMat = lambert(0x8e7a9c);
const citadelMat = lambert(0x5b3f63);
const citadelDark = lambert(0x4a3252);
const studMat = lambert(0x6e5078);
const pinkLight = basic(0xff6f8f);
const white = basic(0xf4f6ff);
const lampBulb = basic(0xf0f4ff);
const barrelMat = lambert(0xc8642a);
const tankMat = lambert(0x5a7a80);
const gunMat = lambert(0x2e2c3a);
const redLight = basic(0xff3a2a);

/** A point light (few per map: lights are slow). */
function light(g, color, intensity, dist, x, y, z) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.position.set(x, y, z);
  g.add(l);
  return l;
}

/** A flat floor piece just over the ground. */
function floor(scene, x, z, w, d, mat, y = 0.06) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/** Yellow and black stripes (hazard pads) or dark diagonal stripes (the apron). */
function stripeTex(a, b, n) {
  return canvasTex(128, (g, s) => {
    g.fillStyle = a;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = b;
    g.lineWidth = s / n / 2;
    for (let i = -n; i <= n * 2; i++) {
      g.beginPath();
      g.moveTo((i * s) / n, 0);
      g.lineTo((i * s) / n - s, s);
      g.stroke();
    }
  });
}

/** A white star emblem (the citadel's sign) for the wall towers. */
const starTex = canvasTex(64, (g, s) => {
  g.fillStyle = '#5a6690';
  g.fillRect(0, 0, s, s);
  g.fillStyle = '#ffffff';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? s * 0.18 : s * 0.42;
    g[i ? 'lineTo' : 'moveTo'](s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
  }
  g.fill();
});

/** One side of a lattice (a black frame with cross braces) from (0,0) up to (len, h), in x-y. */
function lattice(g, len, h, bar = 0.4) {
  part(g, boxGeo(len, bar, bar), black, len / 2, 0, 0);
  part(g, boxGeo(len, bar, bar), black, len / 2, h, 0);
  const n = Math.max(1, Math.round(len / h));
  const step = len / n;
  for (let i = 0; i <= n; i++) part(g, boxGeo(bar, h, bar), black, i * step, h / 2, 0);
  for (let i = 0; i < n; i++) {
    const d = part(g, boxGeo(Math.hypot(step, h), bar * 0.7, bar * 0.7), black, i * step + step / 2, h / 2, 0);
    d.rotation.z = (i % 2 ? 1 : -1) * Math.atan2(h, step);
  }
}

export const CG_PROPS = {
  cgGround(scene) {
    floor(scene, -16, 3, 220, 110, snowMat, 0.02);
  },

  cgFog(scene, p, m, animated) {
    // The fog bank where enemies appear: pale blue see-through layers that drift slowly.
    const g = placed(scene, p);
    const mats = [];
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x9ab0d8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
      mats.push(mat);
      const b = new THREE.Mesh(boxGeo(10 + (i % 3) * 4, 6 + (i % 4) * 2.5, 20 + (i % 2) * 14), mat);
      b.position.set(-6 + (i % 3) * 5, 3 + (i % 4) * 1.6, ((i * 37) % 60) - 30);
      g.add(b);
    }
    animated.push((t) => mats.forEach((mt, i) => (mt.opacity = 0.18 + Math.sin(t * 0.6 + i) * 0.06)));
  },

  cgBlock() {}, // invisible: keeps towers and players off (the walls, the truss feet, the gate)

  cgWall(scene, p) {
    // A tall grey-blue wall of concrete panels, 6 thick, with a snowy top. The north wall carries
    // two pipes along its top.
    const g = placed(scene, p);
    const n = Math.round(p.len / 6);
    const w = p.len / n;
    for (let i = 0; i < n; i++) {
      const x = -p.len / 2 + w / 2 + i * w;
      part(g, boxGeo(w - 0.3, 12, 6), i % 2 ? wallMat : wallDark, x, 6, 0);
      part(g, boxGeo(w, 0.5, 6.2), snowCap, x, 12.2, 0);
      part(g, boxGeo(w - 1.4, 0.4, 0.3), curbMat, x, 4, -p.side * 3.05); // a panel line on the corridor side
    }
    if (p.side < 0) {
      for (const dz of [-1.4, 0.2]) {
        const pipe = part(g, new THREE.CylinderGeometry(0.6, 0.6, p.len, 10), slabMat, 0, 13.2, dz);
        pipe.rotation.z = Math.PI / 2;
      }
    }
  },

  cgWallTower(scene, p) {
    // A square concrete tower on the north wall with a white star on each face.
    const g = placed(scene, p);
    part(g, boxGeo(10, 18, 10), wallDark, 0, 9, 0);
    part(g, boxGeo(11, 1, 11), wallMat, 0, 18.5, 0);
    part(g, boxGeo(11.2, 0.4, 11.2), snowCap, 0, 19.2, 0);
    const sign = new THREE.MeshLambertMaterial({ map: starTex });
    for (const z of [-5.05, 5.05]) part(g, boxGeo(5, 5, 0.1), sign, 0, 13, z);
    part(g, boxGeo(0.6, 0.6, 0.6), redLight, 4.5, 19.8, 4.5);
  },

  cgTruss(scene, p) {
    // A tall black steel truss across the whole map: two lattice rails 16 up, on four legs that
    // stand on concrete feet outside the walls.
    const g = placed(scene, p);
    const L = 76;
    for (const x of [-3, 3]) {
      const side = new THREE.Group();
      side.position.set(x, 14, -L / 2);
      side.rotation.y = -Math.PI / 2;
      lattice(side, L, 4);
      g.add(side);
    }
    for (let z = -L / 2; z <= L / 2; z += 6.33) part(g, boxGeo(6, 0.4, 0.4), black, 0, 18, z);
    for (const z of [-37, 34]) {
      part(g, boxGeo(10, 2, 4), slabMat, 0, 1, z);
      for (const x of [-3, 3]) part(g, boxGeo(1, 16, 1), black, x, 8, z);
      part(g, boxGeo(6, 0.5, 0.5), black, 0, 7, z);
    }
  },

  cgStrip(scene, p) {
    // A dark navy raised strip with a black rim, low enough to walk over.
    const g = placed(scene, p);
    part(g, boxGeo(p.w, 0.4, p.d), black, 0, 0.2, 0);
    part(g, boxGeo(p.w - 1, 0.45, p.d - 1), stripMat, 0, 0.22, 0);
  },

  cgCourt(scene, p) {
    // The lit courtyard: smooth light grey concrete with low dark curbs on the north and south.
    const tex = tileTexture('#8a93b0', ['#868fac', '#8e97b4', '#9099b6'], 'rgba(0,0,0,0.18)', 64, 2);
    tex.repeat.set(p.w / 6, p.d / 6);
    floor(scene, p.x, p.z, p.w, p.d, new THREE.MeshLambertMaterial({ map: tex }), 0.3);
    const g = placed(scene, p);
    for (const z of [-p.d / 2 + 0.5, p.d / 2 - 0.5]) part(g, boxGeo(p.w, 1, 1), curbMat, 0, 0.5, z);
    for (const x of [-p.w / 2, p.w / 2]) for (const z of [-20, 20]) part(g, boxGeo(1, 1.6, 8), curbMat, x, 0.8, z);
  },

  cgPad(scene, p) {
    // A yellow and black hazard pad.
    const tex = stripeTex('#d9b53a', '#1a1a1a', 6);
    tex.repeat.set(p.w / 6, p.d / 6);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    floor(scene, p.x, p.z, p.w, p.d, new THREE.MeshLambertMaterial({ map: tex }), 0.34);
  },

  cgApron(scene, p) {
    // Dark grey-purple plate with broad diagonal stripes in front of the gate.
    const tex = stripeTex('#4e4766', '#3a3450', 4);
    tex.repeat.set(1, p.d / p.w);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    floor(scene, p.x, p.z, p.w, p.d, new THREE.MeshLambertMaterial({ map: tex }), 0.32);
  },

  cgGate(scene, p) {
    // The citadel gate: two huge dark steel leaves (48 wide, 24 tall) with a thin gap, a band of
    // vents with pink lights on top, and light mauve plated pillars on each side.
    const g = placed(scene, p);
    for (const z of [-12.2, 12.2]) {
      part(g, boxGeo(3, 24, 24), gateMat, 0, 12, z);
      for (let y = 4; y < 22; y += 6) part(g, boxGeo(3.2, 0.5, 23), gateDark, 0, y, z); // panel lines
    }
    part(g, boxGeo(2.6, 24, 0.4), black, 0, 12, 0); // the gap between the leaves
    part(g, boxGeo(4, 4, 50), gateDark, 0.5, 26, 0);
    for (let i = 0; i < 12; i++) part(g, boxGeo(0.2, 2.6, 2.6), black, -1.6, 26, -22 + i * 4);
    for (let i = 0; i < 5; i++) part(g, boxGeo(0.3, 1, 2.4), pinkLight, -1.7, 29, -16 + i * 8).castShadow = false;
    for (const z of [-26.5, 26.5]) {
      part(g, boxGeo(5, 30, 5), pillarMat, 0, 15, z);
      for (let y = 2; y < 30; y += 2) part(g, boxGeo(5.1, 0.3, 5.1), studMat, 0, y, z); // diamond-plate lines
    }
    light(g, 0xff6f8f, 30, 40, -6, 22, 0);
  },

  cgCitadel(scene, p) {
    // The citadel: a huge maroon-purple studded block running off the east edge, with a long gun
    // on its roof pointing north-west and a dark radar dome on a mast.
    const g = placed(scene, p);
    part(g, boxGeo(28, 44, 84), citadelMat, 0, 22, 0);
    part(g, boxGeo(29, 2, 85), citadelDark, 0, 44, 0);
    for (let y = 6; y < 44; y += 6) for (let z = -38; z <= 38; z += 6) part(g, boxGeo(0.6, 1, 1), studMat, -14.2, y, z);
    for (const y of [12, 26, 38]) for (const z of [-30, -6, 30]) part(g, boxGeo(0.4, 1, 3), pinkLight, -14.3, y, z).castShadow = false;
    // The roof gun.
    const gun = new THREE.Group();
    gun.position.set(2, 45, -6);
    gun.rotation.y = Math.PI * 0.75;
    part(gun, boxGeo(10, 5, 10), gunMat, 0, 2.5, 0);
    const barrel = part(gun, new THREE.CylinderGeometry(0.9, 1.2, 26, 10), gunMat, 0, 5, 16);
    barrel.rotation.x = Math.PI / 2 - 0.15;
    g.add(gun);
    // The radar: a mast, a dark dome and thin antennas.
    part(g, boxGeo(1.2, 8, 1.2), black, 4, 49, 22);
    part(g, new THREE.SphereGeometry(4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), gunMat, 4, 53, 22);
    for (const [x, z] of [[-6, 30], [8, 34], [-4, 12]]) part(g, boxGeo(0.3, 10, 0.3), black, x, 50, z);
    part(g, boxGeo(0.6, 0.6, 0.6), redLight, -6, 55, 30);
  },

  cgBunker(scene, p) {
    // A big dark blue bunker on the south wall with a short turret.
    const g = placed(scene, p);
    part(g, boxGeo(18, 10, 12), stripMat, 0, 5, 0);
    part(g, boxGeo(18.6, 0.6, 12.6), snowCap, 0, 10.3, 0);
    for (const x of [-5, 0, 5]) part(g, boxGeo(3, 0.6, 0.3), black, x, 7, -6.05); // window slits
    part(g, new THREE.CylinderGeometry(2.6, 3, 2.4, 10), gunMat, 3, 11.8, 0);
    const b = part(g, new THREE.CylinderGeometry(0.4, 0.5, 6, 8), gunMat, 3, 12.4, -3.4);
    b.rotation.x = Math.PI / 2;
  },

  cgFlood(scene, p, m, animated) {
    // A black lattice lamp post (15 tall) with a white lamp and a see-through cone of light
    // pointing into the courtyard.
    const g = placed(scene, p);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) part(g, boxGeo(0.3, 15, 0.3), black, x, 7.5, z);
    for (let y = 2; y < 15; y += 3) part(g, boxGeo(1.5, 0.25, 1.5), black, 0, y, 0);
    part(g, boxGeo(2.4, 1.4, 1.4), black, 0, 15.4, p.face * 0.6);
    part(g, boxGeo(2, 1, 0.2), lampBulb, 0, 15.3, p.face * 1.35).castShadow = false;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(6, 15, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xe8eeff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
    );
    cone.position.set(0, 8, p.face * 6);
    cone.rotation.x = p.face * -0.75;
    g.add(cone);
    if (p.lit) light(g, 0xe8eeff, 26, 34, 0, 13, p.face * 6);
  },

  cgRubble(scene, p) {
    // A dark heap of broken rock and debris.
    const g = placed(scene, p);
    const s = p.s;
    [[0, 0, 1], [0.5, 0.3, 0.7], [-0.4, -0.4, 0.6], [0.2, -0.5, 0.5], [-0.5, 0.4, 0.55]].forEach(([dx, dz, k], i) => {
      const r = part(g, new THREE.DodecahedronGeometry(s * k * 0.7, 0), i % 2 ? rubbleLight : rubbleMat, dx * s, s * k * 0.3, dz * s);
      r.rotation.set(i, i * 2, 0);
      r.scale.y = 0.6;
    });
    part(g, boxGeo(s * 0.9, 0.2, 0.3), black, 0, s * 0.5, 0).rotation.z = 0.4; // a bent bar
  },

  cgSlab(scene, p) {
    // A fallen grey concrete slab with a bent railing.
    const g = placed(scene, p);
    const slab = part(g, boxGeo(5, 0.8, 3), slabMat, 0, 0.5, 0);
    slab.rotation.z = 0.15;
    for (const x of [-2, 0, 2]) part(g, boxGeo(0.2, 1.4, 0.2), black, x, 1.4, 1.2);
    part(g, boxGeo(4.6, 0.2, 0.2), black, 0, 2.1, 1.2);
  },

  cgDrift(scene, p) {
    // A snow drift with a broken crate sticking out.
    const g = placed(scene, p);
    const d = part(g, new THREE.SphereGeometry(3 * p.s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), snowCap, 0, 0, 0);
    d.scale.set(1.3, 0.4, 0.9);
    const crate = part(g, boxGeo(1.6, 1.6, 1.6), lambert(0x6a5038), 1, 0.8, 0.4);
    crate.rotation.set(0.3, 0.6, 0.2);
  },

  cgBarrel(scene, p) {
    // An orange and black striped barrel, standing or lying down.
    const g = placed(scene, p);
    const b = new THREE.Group();
    part(b, new THREE.CylinderGeometry(0.7, 0.7, 1.8, 12), barrelMat, 0, 0, 0);
    for (const y of [-0.5, 0.5]) part(b, new THREE.CylinderGeometry(0.72, 0.72, 0.25, 12), black, 0, y, 0);
    if (p.lie) {
      b.rotation.z = Math.PI / 2;
      b.position.y = 0.7;
    } else b.position.y = 0.9;
    g.add(b);
  },

  cgGenerator(scene, p) {
    // A teal-grey generator tank on a skid.
    const g = placed(scene, p);
    part(g, boxGeo(4, 0.4, 2.4), black, 0, 0.2, 0);
    const tank = part(g, new THREE.CylinderGeometry(1, 1, 3.6, 12), tankMat, 0, 1.4, 0);
    tank.rotation.z = Math.PI / 2;
    part(g, boxGeo(1, 1.2, 1), tankMat, 1.4, 2.4, 0);
    part(g, boxGeo(0.3, 0.3, 0.3), redLight, 1.4, 3.1, 0);
  },

  cgCage(scene, p) {
    // A grey wire cage crate.
    const g = placed(scene, p);
    const wire = lambert(0x8a93a8);
    for (const x of [-1, 1]) for (const z of [-1, 1]) part(g, boxGeo(0.15, 2.4, 0.15), wire, x, 1.2, z);
    for (const y of [0.1, 1.2, 2.4]) {
      for (const z of [-1, 1]) part(g, boxGeo(2.1, 0.12, 0.12), wire, 0, y, z);
      for (const x of [-1, 1]) part(g, boxGeo(0.12, 0.12, 2.1), wire, x, y, 0);
    }
  },

  cgCrane(scene, p, m, animated) {
    // A small lattice crane with a red light on a dark square base.
    const g = placed(scene, p);
    part(g, boxGeo(4, 1, 4), black, 0, 0.5, 0);
    const mast = new THREE.Group();
    mast.position.set(0, 1, 0);
    for (const x of [-0.7, 0.7]) {
      const side = new THREE.Group();
      side.position.set(x, 0, 0);
      side.rotation.z = Math.PI / 2;
      lattice(side, 14, 1.4, 0.2);
      mast.add(side);
    }
    g.add(mast);
    const jib = new THREE.Group();
    jib.position.set(0, 15, 0);
    part(jib, boxGeo(14, 0.6, 0.6), black, 4, 0, 0);
    part(jib, boxGeo(0.1, 6, 0.1), black, 9, -3, 0);
    part(jib, boxGeo(1, 1, 1), gunMat, 9, -6, 0);
    part(jib, boxGeo(0.6, 0.6, 0.6), redLight, 11, 0.6, 0);
    g.add(jib);
    const k = p.x * 0.1;
    animated.push((t) => (jib.rotation.y = Math.sin(t * 0.15 + k) * 0.8));
  },

  cgFire(scene, p, m, animated) {
    // A red fire glow in the far corner: flickering orange blocks and a red light.
    const g = placed(scene, p);
    const flames = [];
    for (let i = 0; i < 6; i++) {
      const f = part(g, boxGeo(1.4, 2.4, 1.4), basic(i % 2 ? 0xff5a2a : 0xffa03a), (i % 3) * 1.4 - 1.4, 1.2, Math.floor(i / 3) * 1.6 - 0.8);
      f.castShadow = false;
      flames.push(f);
    }
    const l = light(g, 0xff4a2a, 30, 30, 0, 4, 0);
    animated.push((t) => {
      flames.forEach((f, i) => (f.scale.y = 0.7 + Math.abs(Math.sin(t * 5 + i * 1.7)) * 0.7));
      l.intensity = 26 + Math.sin(t * 9) * 6;
    });
  },
};
