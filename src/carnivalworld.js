// Halloween Night 2's decorations: the circus tents, the rides, game stalls, lamp posts, pennant
// strings, hay bales and pumpkins, trees, mountains, the blue car (the base) and the dirt rims
// along the path. The map data is carnFixed() in src/sim/maps.js; world.js calls these through
// CARN_PROPS[kind].
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { CARN_CROSS } from './sim/maps.js';
import { canvasTex, lambert, placed } from './worldkit.js';

const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const ironMat = lambert(0x18161c);
const woodMat = lambert(0x6a4a2e);
const woodDarkMat = lambert(0x4a3220);
const rimMat = lambert(0x3a2a24);
const lampGlass = basic(0xffc870);
const doorGlow = basic(0xf4b39a);
const darkInside = lambert(0x1a1014);
const moundMat = lambert(0x3e4a2e);
const balloonRed = lambert(0xd0202a, { emissive: 0x400008 });
const stringMat = basic(0xd8d0c8);
const ghostMat = lambert(0xf2f0f6, { emissive: 0x4a4a5a });
const ghostEye = basic(0x101014);
const hayMat = lambert(0xc8a050);
const hayEndMat = lambert(0xa88038);
const pumpkinMat = lambert(0xd8742a, { emissive: 0x3a1400 });
const whitePumpkinMat = lambert(0xe6e0d8);
const stemMat = lambert(0x3e5a22);
const pineMat = lambert(0x2f3e2a);
const pineDarkMat = lambert(0x26331f);
const autumnMats = [lambert(0x8a3a22), lambert(0xa8501e), lambert(0x6e2a1a)];
const trunkMat = lambert(0x3a2618);
const mountainMat = basic(0x40354f, { fog: false });
const carBlue = lambert(0x2a6ad0);
const carDark = lambert(0x1a3a80);
const glassMat = lambert(0x9ac8e8, { emissive: 0x1a2a3a });
const tyreMat = lambert(0x161616);
const hubMat = lambert(0xb8b8c0);
const headMat = basic(0xfff0c0);
const tailMat = basic(0xff3030);
const bulbMats = [0x4ae04a, 0xff8a30, 0xa040ff, 0xffffff].map((c) => basic(c));
const balloonMats = [0x4ac04a, 0xff8a30, 0xa040ff].map((c) => lambert(c, { emissive: new THREE.Color(c).multiplyScalar(0.25) }));
const pennantMats = [0xff8a30, 0xf06aa8, 0xa040ff].map((c) => basic(c, { side: THREE.DoubleSide }));
const awningCols = [['#e8c020', '#f4f0e0'], ['#c8202a', '#f4f0e0'], ['#f07820', '#f4f0e0']];

/** A texture of vertical stripes in `a` and `b`, `n` pairs across. */
function stripes(a, b, n) {
  const t = canvasTex(64, (g, s) => {
    g.fillStyle = a;
    g.fillRect(0, 0, s, s);
    g.fillStyle = b;
    g.fillRect(s / 2, 0, s / 2, s);
  });
  t.repeat.set(n, 1);
  return t;
}
const stripeMat = (a, b, n) => lambert(0xffffff, { map: stripes(a, b, n), side: THREE.DoubleSide });

/** A point light (kept to a few per map: lights are slow). */
function light(g, color, intensity, dist, x, y, z) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.position.set(x, y, z);
  g.add(l);
  return l;
}

/**
 * A round big-top wall of radius r and height h with a doorway gap (`gap` radians) facing +x,
 * and a dark floor inside. Returns the wall mesh.
 */
function tentWall(g, r, h, mat, gap, zScale = 1) {
  const geo = new THREE.CylinderGeometry(r, r, h, 24, 1, true, Math.PI / 2 + gap / 2, Math.PI * 2 - gap);
  const wall = part(g, geo, mat, 0, h / 2, 0);
  wall.scale.z = zScale;
  const floor = part(g, new THREE.CircleGeometry(r - 0.1, 24), darkInside, 0, 0.25, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.scale.y = zScale;
  return wall;
}

/** The glowing arched doorway on the +x side at radius r: two posts, a round top, a glow inside. */
function doorway(g, r, w, h) {
  part(g, boxGeo(0.4, h, 0.4), doorGlow, r, h / 2, -w / 2);
  part(g, boxGeo(0.4, h, 0.4), doorGlow, r, h / 2, w / 2);
  const arch = part(g, new THREE.TorusGeometry(w / 2, 0.22, 6, 16, Math.PI), doorGlow, r, h, 0);
  arch.rotation.y = Math.PI / 2;
  // A soft glow filling the opening, see-through so the inside shows.
  const fill = part(g, new THREE.PlaneGeometry(w, h + w / 2), basic(0xf4b39a, { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), r - 0.1, (h + w / 2) / 2, 0);
  fill.rotation.y = Math.PI / 2;
  fill.castShadow = false;
}

/** A pole with a small flag on top, at (x, y, z). */
function flag(g, x, y, z, mat, len = 3) {
  part(g, boxGeo(0.15, len, 0.15), ironMat, x, y + len / 2, z);
  const f = part(g, new THREE.PlaneGeometry(1.4, 0.8), mat, x + 0.75, y + len - 0.45, z);
  f.castShadow = false;
}

/** A sagging string of triangle flags from a to b ([x, y, z] in g's space). */
function pennantString(g, a, b, sag = 0.8) {
  const n = Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 1.1));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t));
  }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2228 })));
  const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.35, 0, 0, 0.35, 0, 0, 0, -0.8, 0], 3));
  tri.computeVertexNormals();
  for (let i = 0; i < n; i++) {
    const p = pts[i].clone().lerp(pts[i + 1], 0.5);
    const m = new THREE.Mesh(tri, pennantMats[i % 3]);
    m.position.copy(p);
    m.rotation.y = yaw + Math.PI / 2;
    g.add(m);
  }
}

/** A pumpkin of radius r at (x, y, z). */
function pumpkin(g, x, y, z, r, white = false) {
  const p = part(g, new THREE.SphereGeometry(r, 10, 6), white ? whitePumpkinMat : pumpkinMat, x, y + r * 0.8, z);
  p.scale.y = 0.78;
  part(g, boxGeo(r * 0.25, r * 0.5, r * 0.25), stemMat, x, y + r * 1.5, z);
}

export const CARN_PROPS = {
  carnBigTent(scene, p, m, animated) {
    // About 12 wide and 20 long (A8-C12), two red/white peaks about 17 high, flag poles above.
    // The doorway faces east (+x) onto the path and glows peach.
    const g = placed(scene, p);
    const R = 6.2;
    const ZS = 1.6;
    const H = 7;
    tentWall(g, R, H, stripeMat('#b3262e', '#e8e0dc', 12), 0.75, ZS);
    // The lower roof: a wide low cone (cut off) stretched along z.
    const low = part(g, new THREE.CylinderGeometry(3.6, R + 0.6, 4, 24, 1, true), stripeMat('#b3262e', '#e8e0dc', 12), 0, H + 2, 0);
    low.scale.z = ZS;
    const cap = part(g, new THREE.CylinderGeometry(3.6, 3.6, 0.2, 24), lambert(0xb3262e), 0, H + 4, 0);
    cap.scale.z = ZS;
    // Two peaks.
    for (const z of [-3.6, 3.6]) {
      part(g, new THREE.ConeGeometry(3.4, 7, 16, 1, true), stripeMat('#b3262e', '#e8e0dc', 8), 0, H + 3.5 + 3.5, z);
      flag(g, 0, H + 10.4, z, pennantMats[z < 0 ? 0 : 2], 3.4);
    }
    // Scalloped red/white valance round the roof edge.
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const s = part(g, new THREE.CircleGeometry(0.75, 8, 0, Math.PI), i % 2 ? lambert(0xe8e0dc, { side: THREE.DoubleSide }) : lambert(0xb3262e, { side: THREE.DoubleSide }), Math.sin(a) * (R + 0.55), H + 0.05, Math.cos(a) * (R + 0.55) * ZS);
      s.rotation.set(Math.PI, a, 0);
      s.castShadow = false;
    }
    // A pennant string between the two peaks.
    pennantString(g, [0, H + 12.5, -3.6], [0, H + 12.5, 3.6], 1.2);
    doorway(g, R - 0.05, 3.4, 4.2);
    light(g, 0xf4b39a, 18, 16, R + 2, 3, 0);
    // Easter egg inside: a red balloon floating over a small grassy mound.
    const mound = part(g, new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), moundMat, -2.4, 0.2, 4);
    mound.scale.y = 0.6;
    part(g, boxGeo(0.04, 2.4, 0.04), stringMat, -2.4, 2.3, 4);
    const balloon = part(g, new THREE.SphereGeometry(0.7, 12, 8), balloonRed, -2.4, 4, 4);
    balloon.scale.y = 1.2;
    animated.push((t) => (balloon.position.y = 4 + Math.sin(t * 1.3) * 0.15));
  },

  carnPurpleTent(scene, p) {
    // A smaller round big top (A3-D6) in purple and near-black stripes, an orange flag on top.
    const g = placed(scene, p);
    const R = 6.6;
    const H = 5.5;
    tentWall(g, R, H, stripeMat('#5b2a8a', '#1a1420', 14), 0.7);
    part(g, new THREE.ConeGeometry(R + 0.5, 6.5, 24, 1, true), stripeMat('#5b2a8a', '#1a1420', 14), 0, H + 3.25, 0);
    flag(g, 0, H + 6.3, 0, basic(0xff8a30, { side: THREE.DoubleSide }), 2.8);
    doorway(g, R - 0.05, 3, 3.6);
    // Easter egg inside: a family of sheet ghosts (two big, two small).
    [[-1.5, -1.4, 1.2], [-2.5, 0.6, 1.05], [-0.6, 1.4, 0.7], [-1.2, 2.6, 0.6]].forEach(([x, z, s]) => {
      const gh = new THREE.Group();
      gh.position.set(x, 0.25, z);
      gh.scale.setScalar(s);
      gh.rotation.y = Math.PI / 2;
      g.add(gh);
      part(gh, new THREE.ConeGeometry(0.9, 2, 12, 1, true), ghostMat, 0, 1, 0);
      part(gh, new THREE.SphereGeometry(0.62, 12, 8), ghostMat, 0, 2.05, 0);
      for (const ex of [-0.22, 0.22]) part(gh, boxGeo(0.14, 0.22, 0.05), ghostEye, ex, 2.1, 0.58);
    });
  },

  carnFerris(scene, p, m, animated) {
    // About 20 across: dark spokes and rim with coloured bulbs, eight cars, on an A-frame.
    const g = placed(scene, p);
    const R = 9.2;
    const AX = 11;
    for (const z of [-1.4, 1.4]) {
      for (const sx of [-1, 1]) {
        const leg = part(g, boxGeo(0.45, 12, 0.45), ironMat, sx * 2.8, AX / 2 - 0.2, z);
        leg.rotation.z = sx * 0.25;
      }
      part(g, boxGeo(6.4, 0.35, 0.35), ironMat, 0, 2.5, z);
    }
    part(g, boxGeo(8, 0.5, 4), lambert(0x3a3036), 0, 0.25, 0);
    const wheel = new THREE.Group();
    wheel.position.y = AX;
    g.add(wheel);
    part(wheel, new THREE.CylinderGeometry(0.6, 0.6, 3.4, 10), ironMat, 0, 0, 0).rotation.x = Math.PI / 2;
    for (const z of [-1.1, 1.1]) {
      part(wheel, new THREE.TorusGeometry(R, 0.18, 6, 40), ironMat, 0, 0, z);
      part(wheel, new THREE.TorusGeometry(R * 0.55, 0.12, 6, 28), ironMat, 0, 0, z);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const s = part(wheel, boxGeo(0.16, R, 0.16), ironMat, (Math.sin(a) * R) / 2, (Math.cos(a) * R) / 2, z);
        s.rotation.z = -a;
      }
      // Bulbs round the rim (green, orange, purple, white).
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const b = part(wheel, boxGeo(0.32, 0.32, 0.32), bulbMats[i % 4], Math.sin(a) * (R + 0.25), Math.cos(a) * (R + 0.25), z * 1.15);
        b.castShadow = false;
      }
    }
    const cars = [];
    const carMats = [lambert(0xa040ff), lambert(0xff8a30), lambert(0x4ac04a), lambert(0xd0202a)];
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Group();
      wheel.add(c);
      part(c, boxGeo(0.12, 1.2, 0.12), ironMat, 0, -0.6, 0);
      part(c, boxGeo(1.6, 1, 1.4), carMats[i % 4], 0, -1.5, 0);
      part(c, boxGeo(1.8, 0.15, 1.6), ironMat, 0, -0.95, 0);
      cars.push({ c, a: (i / 8) * Math.PI * 2 });
    }
    light(g, 0xc080ff, 10, 18, 0, AX, 3);
    animated.push((t) => {
      const r = t * 0.12;
      wheel.rotation.z = r;
      for (const { c, a } of cars) {
        c.position.set(Math.sin(a) * R, Math.cos(a) * R, 0);
        c.rotation.z = -r; // cars stay level
      }
    });
  },

  carnSwing(scene, p, m, animated) {
    // Chair swing ride: a central pole, a purple/orange striped canopy that turns, seats swinging out.
    const g = placed(scene, p);
    part(g, new THREE.CylinderGeometry(1.4, 1.8, 0.6, 12), lambert(0x3a3036), 0, 0.3, 0);
    part(g, new THREE.CylinderGeometry(0.35, 0.45, 9, 10), ironMat, 0, 4.5, 0);
    const top = new THREE.Group();
    top.position.y = 9;
    g.add(top);
    part(top, new THREE.ConeGeometry(4, 2.2, 16, 1, true), stripeMat('#a040ff', '#ff8a30', 8), 0, 1.1, 0);
    part(top, new THREE.CylinderGeometry(4, 4, 0.6, 16, 1, true), stripeMat('#ff8a30', '#a040ff', 8), 0, -0.2, 0);
    const seatMats = [lambert(0xff8a30), lambert(0x4ac04a)];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const arm = new THREE.Group();
      arm.position.set(Math.sin(a) * 3.6, -0.4, Math.cos(a) * 3.6);
      arm.rotation.y = a;
      top.add(arm);
      const swing = new THREE.Group();
      swing.rotation.x = 0.45; // thrown outward
      arm.add(swing);
      part(swing, boxGeo(0.06, 3.6, 0.06), ironMat, 0, -1.8, 0);
      part(swing, boxGeo(0.8, 0.2, 0.7), seatMats[i % 2], 0, -3.7, 0);
      part(swing, boxGeo(0.8, 0.6, 0.12), seatMats[i % 2], 0, -3.4, -0.3);
    }
    animated.push((t) => (top.rotation.y = t * 0.7));
  },

  carnDrop(scene, p, m, animated) {
    // About 30 tall: a dark red-brown lattice tower, a ring of orange seats that rides up and down,
    // purple and orange LED rings at the top and base.
    const g = placed(scene, p);
    const H = 30;
    const W = 1.4;
    const lattice = lambert(0x5a2a24);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, boxGeo(0.3, H, 0.3), lattice, sx * W, H / 2, sz * W);
    for (let y = 1.5; y < H; y += 2.5) {
      for (const [x, z, ry] of [[0, -W, 0], [0, W, 0], [-W, 0, Math.PI / 2], [W, 0, Math.PI / 2]]) {
        const b = part(g, boxGeo(2 * W, 0.15, 0.15), lattice, x, y, z);
        b.rotation.y = ry;
        const d = part(g, boxGeo(Math.hypot(2 * W, 2.5), 0.12, 0.12), lattice, x, y + 1.25, z);
        d.rotation.set(0, ry, 0.9);
      }
    }
    part(g, boxGeo(4, 1.2, 4), lambert(0x3a2622), 0, H + 0.6, 0);
    const purple = basic(0xa040ff);
    const orange = basic(0xff8a30);
    for (const [y, mat, r] of [[H + 1.4, purple, 2.6], [H - 0.4, orange, 2.4], [0.4, purple, 3.4], [1.1, orange, 3.2]]) {
      const ring = part(g, new THREE.TorusGeometry(r, 0.14, 6, 24), mat, 0, y, 0);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = false;
    }
    part(g, new THREE.CylinderGeometry(3.6, 3.8, 0.4, 16), lambert(0x2a2228), 0, 0.2, 0);
    // The seat ring.
    const ride = new THREE.Group();
    g.add(ride);
    part(ride, new THREE.CylinderGeometry(2.6, 2.6, 0.5, 16, 1, true), lattice, 0, 0, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const s = part(ride, boxGeo(0.8, 1.1, 0.5), lambert(0xff8a30), Math.sin(a) * 2.9, -0.2, Math.cos(a) * 2.9);
      s.rotation.y = a;
    }
    light(g, 0xa040ff, 10, 22, 0, H + 2, 0);
    animated.push((t) => {
      // Slowly up, a pause, then a quick drop, over and over (24 s).
      const k = (t % 24) / 24;
      const y = k < 0.6 ? 3 + (k / 0.6) * 20 : k < 0.8 ? 23 : 23 - ((k - 0.8) / 0.2) ** 2 * 20;
      ride.position.y = y;
    });
  },

  carnStall(scene, p, m, animated) {
    // A small wooden booth: counter, corner posts, a striped awning, and a bunch of balloons.
    const g = placed(scene, p);
    const [a, b] = awningCols[(p.v ?? 0) % 3];
    part(g, boxGeo(3, 1.2, 2.4), woodMat, 0, 0.6, 0);
    part(g, boxGeo(3.2, 0.15, 2.6), woodDarkMat, 0, 1.25, 0);
    part(g, boxGeo(3, 2.6, 0.15), woodDarkMat, 0, 1.3, -1.15);
    for (const [x, z] of [[-1.45, -1.15], [1.45, -1.15], [-1.45, 1.15], [1.45, 1.15]]) part(g, boxGeo(0.18, 3, 0.18), woodDarkMat, x, 1.5, z);
    const awning = part(g, boxGeo(3.4, 0.2, 2.9), lambert(0xffffff, { map: stripes(a, b, 3) }), 0, 3.15, 0.15);
    awning.rotation.x = 0.12;
    part(g, boxGeo(3.4, 0.45, 0.08), lambert(a === '#e8c020' ? 0xe8c020 : a === '#c8202a' ? 0xc8202a : 0xf07820), 0, 2.85, 1.6);
    // Prizes on the counter.
    part(g, boxGeo(0.4, 0.5, 0.4), balloonMats[0], -0.8, 1.55, 0.3);
    part(g, boxGeo(0.4, 0.4, 0.4), balloonMats[2], 0.6, 1.5, 0.2);
    const bunch = new THREE.Group();
    bunch.position.set(1.45, 3, 1.15);
    g.add(bunch);
    for (let i = 0; i < 5; i++) {
      const bx = Math.sin(i * 2.4) * 0.5;
      const bz = Math.cos(i * 2.4) * 0.5;
      const by = 2 + (i % 3) * 0.45;
      part(bunch, boxGeo(0.03, by, 0.03), stringMat, bx / 2, by / 2, bz / 2).rotation.set(bz * 0.3, 0, -bx * 0.3);
      const bl = part(bunch, new THREE.SphereGeometry(0.42, 10, 8), balloonMats[i % 3], bx, by, bz);
      bl.scale.y = 1.2;
    }
    animated.push((t) => (bunch.rotation.z = Math.sin(t * 1.1 + (p.v ?? 0)) * 0.05));
  },

  carnLamp(scene, p) {
    // A black Victorian lamp post with a warm lantern (lit ones light the ground round them).
    const g = placed(scene, p);
    part(g, new THREE.CylinderGeometry(0.35, 0.45, 0.5, 8), ironMat, 0, 0.25, 0);
    part(g, new THREE.CylinderGeometry(0.12, 0.16, 4.4, 8), ironMat, 0, 2.4, 0);
    part(g, new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8), ironMat, 0, 4.6, 0);
    part(g, new THREE.CylinderGeometry(0.28, 0.18, 0.8, 6), lampGlass, 0, 5.1, 0).castShadow = false;
    part(g, new THREE.ConeGeometry(0.42, 0.45, 6), ironMat, 0, 5.72, 0);
    part(g, boxGeo(0.08, 0.35, 0.08), ironMat, 0, 6.05, 0);
    if (p.lit) light(g, 0xffc870, 14, 15, 0, 5, 0);
  },

  carnPennants(scene, p) {
    // Two short posts with a string of orange, pink and purple triangle flags between them.
    const g = new THREE.Group();
    scene.add(g);
    const h = 5;
    for (const [x, z] of [[p.x, p.z], [p.x2, p.z2]]) {
      part(g, boxGeo(0.22, h, 0.22), woodDarkMat, x, h / 2, z);
      part(g, boxGeo(0.4, 0.2, 0.4), woodDarkMat, x, h + 0.1, z);
    }
    pennantString(g, [p.x, h - 0.2, p.z], [p.x2, h - 0.2, p.z2], 0.6);
  },

  carnHay(scene, p) {
    // Two or three round hay bales with orange (and the odd white) pumpkins on and round them.
    const g = placed(scene, p);
    const bale = (x, y, z, ry) => {
      const b = new THREE.Group();
      b.position.set(x, y, z);
      b.rotation.y = ry;
      g.add(b);
      part(b, new THREE.CylinderGeometry(0.8, 0.8, 1.3, 12), hayMat, 0, 0.8, 0).rotation.z = Math.PI / 2;
      for (const sx of [-0.66, 0.66]) part(b, new THREE.CylinderGeometry(0.6, 0.6, 0.02, 12), hayEndMat, sx, 0.8, 0).rotation.z = Math.PI / 2;
    };
    bale(-0.7, 0, 0, 0);
    bale(0.8, 0, 0.3, 0.3);
    if ((p.v ?? 0) % 2 === 0) bale(0, 1.4, 0.1, 0.1);
    pumpkin(g, 0.2, (p.v ?? 0) % 2 === 0 ? 2.9 : 1.55, 0.1, 0.45, (p.v ?? 0) === 1);
    pumpkin(g, -1.3, 0, 1.1, 0.5);
    pumpkin(g, 1.4, 0, -0.9, 0.38, (p.v ?? 0) === 3);
    pumpkin(g, 0.5, 0, 1.3, 0.32);
  },

  carnFence(scene, p) {
    // A low fence along the path edge: posts and two rails, wooden or black metal.
    const g = placed(scene, p);
    const mat = p.metal ? ironMat : woodMat;
    const n = Math.round(p.len / 2);
    for (let i = 0; i <= n; i++) part(g, boxGeo(0.2, 1.2, 0.2), mat, -p.len / 2 + (i * p.len) / n, 0.6, 0);
    for (const y of [0.45, 0.95]) part(g, boxGeo(p.len, p.metal ? 0.08 : 0.16, 0.1), mat, 0, y, 0);
  },

  carnTree(scene, p) {
    // A dark pine (stacked cones) or a round autumn tree in dark red and orange.
    const g = placed(scene, p);
    if (p.pine) {
      part(g, new THREE.CylinderGeometry(0.3, 0.4, 2, 6), trunkMat, 0, 1, 0);
      for (let i = 0; i < 3; i++) part(g, new THREE.ConeGeometry(2.4 - i * 0.6, 3, 7), i % 2 ? pineDarkMat : pineMat, 0, 2.6 + i * 1.7, 0);
    } else {
      part(g, new THREE.CylinderGeometry(0.3, 0.45, 3.4, 6), trunkMat, 0, 1.7, 0);
      const v = Math.round(p.rot ?? 0);
      part(g, new THREE.IcosahedronGeometry(2.2, 0), autumnMats[v % 3], 0, 4.4, 0);
      part(g, new THREE.IcosahedronGeometry(1.5, 0), autumnMats[(v + 1) % 3], 1.1, 5.2, 0.4);
      part(g, new THREE.IcosahedronGeometry(1.4, 0), autumnMats[(v + 2) % 3], -1, 4.9, -0.6);
    }
  },

  carnMountain(scene, p) {
    // A purple-grey mountain on the horizon (no fog, so it shows as a dark shape).
    const mt = new THREE.Mesh(new THREE.ConeGeometry(p.r, p.h, 6), mountainMat);
    mt.position.set(p.x, p.h / 2 - 2, p.z);
    mt.rotation.y = p.x * 0.1;
    scene.add(mt);
  },

  carnCar(scene, p) {
    // The base: a blue car parked at the path end, nose east. Round wheels with hubs, glass all
    // round, headlights and tail lights.
    const g = placed(scene, p);
    part(g, boxGeo(7, 1.4, 3.4), carBlue, 0, 1.3, 0);
    part(g, boxGeo(7.1, 0.3, 3.5), carDark, 0, 0.65, 0);
    part(g, boxGeo(3.6, 1.3, 3), carBlue, -0.4, 2.65, 0);
    part(g, boxGeo(3.4, 0.15, 2.9), carDark, -0.4, 3.35, 0);
    // Windows: windscreen, back window, side windows.
    const ws = part(g, boxGeo(0.1, 1.1, 2.7), glassMat, 1.45, 2.6, 0);
    ws.rotation.z = -0.35;
    const bw = part(g, boxGeo(0.1, 1.1, 2.7), glassMat, -2.25, 2.6, 0);
    bw.rotation.z = 0.35;
    for (const z of [-1.52, 1.52]) {
      part(g, boxGeo(1.5, 0.9, 0.05), glassMat, 0.3, 2.65, z);
      part(g, boxGeo(1.4, 0.9, 0.05), glassMat, -1.4, 2.65, z);
    }
    for (const z of [-1.1, 1.1]) {
      part(g, boxGeo(0.1, 0.4, 0.7), headMat, 3.52, 1.45, z);
      part(g, boxGeo(0.1, 0.35, 0.6), tailMat, -3.52, 1.45, z);
    }
    part(g, boxGeo(0.2, 0.35, 3.3), hubMat, 3.6, 0.85, 0);
    part(g, boxGeo(0.2, 0.35, 3.3), hubMat, -3.6, 0.85, 0);
    for (const x of [-2.3, 2.3]) {
      for (const z of [-1.65, 1.65]) {
        const w = part(g, new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16), tyreMat, x, 0.75, z);
        w.rotation.x = Math.PI / 2;
        const h = part(g, new THREE.CylinderGeometry(0.4, 0.4, 0.52, 10), hubMat, x, 0.75, z);
        h.rotation.x = Math.PI / 2;
      }
    }
  },

  carnRims(scene) {
    // The path sits a little below the grass beds: dark dirt rims along both edges, open where
    // the path crosses itself.
    const [cx, cz] = CARN_CROSS;
    for (const s of path.segs) {
      const mx = (s.a.x + s.b.x) / 2;
      const mz = (s.a.z + s.b.z) / 2;
      if (Math.hypot(mx - cx, mz - cz) < 6) continue;
      for (const side of [-1, 1]) {
        const ox = s.dz * side * (PATH_WIDTH / 2 + 0.3);
        const oz = -s.dx * side * (PATH_WIDTH / 2 + 0.3);
        const r = part(scene, boxGeo(0.6, 0.5, s.len + 0.5), rimMat, mx + ox, 0.25, mz + oz);
        r.rotation.y = Math.atan2(s.dx, s.dz);
        r.castShadow = false;
      }
    }
  },
};
