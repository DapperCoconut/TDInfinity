// Frostwatch Basin's decorations (Christmas Night 1): snow ground, the blue portal, two tunnels,
// the compound gate, the stone yard, the pond with no floor, boulder mounds, a watchtower, a
// shelter, pipes, low lit walls, lampposts, beacons, snowy pines and the rock rim of the canyon.
// The map data is frFixed() in src/sim/maps.js; world.js calls these through FR_PROPS[kind].
// When wave 21 starts (events.js sets FR_STATE.spring) the season turns: snow -> grass, white
// pines -> green, humps -> flowers, the portal stops glowing.
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { canvasTex, lambert, placed, tileTexture } from './worldkit.js';

/** Set by the game client: 1 once the season is restored (spring). */
export const FR_STATE = { spring: 0 };

const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
// Materials that change with the season: [material, winter color, spring color].
const seasonal = [];
const season = (winter, spring, extra) => {
  const m = lambert(winter, extra);
  seasonal.push([m, new THREE.Color(winter), new THREE.Color(spring)]);
  return m;
};
const groundTex = tileTexture('#ffffff', ['#f2f4f7', '#e8ebef', '#fafbfc'], null, 128, 8);
groundTex.repeat.set(360 / 16, 280 / 16);
const groundMat = season(0xc9cbd0, 0x4e9a3e, { map: groundTex });
const pineMat = season(0xe6e8ea, 0x3f8a3a);
const pineDark = season(0xd4d8dc, 0x347a30);
const humpMat = season(0xeef0f2, 0x5aa648);
const rimMat = season(0x2a2c32, 0x55585e, { flatShading: true });
const rimDark = season(0x202228, 0x484b52, { flatShading: true });
const cliffMat = season(0x2e3036, 0x5a5d62, { flatShading: true });
const cliffCap = season(0xe8eaee, 0x5a9a48, { flatShading: true }); // snow (then grass) on the canyon walls
const waterMat = season(0x1f4c50, 0x2a5a55);
const trunkMat = lambert(0x3a2c22);
const concrete = lambert(0x30333a);
const concreteDark = lambert(0x24262c);
const black = basic(0x050506);
const metal = lambert(0x3a3c44);
const boulderMat = lambert(0x6e7078, { flatShading: true });
const boulderTop = lambert(0x82848c, { flatShading: true });
const stoneMat = lambert(0x5a5848);
const wood = lambert(0x6a4e34);
const woodDark = lambert(0x4a3624);
const roofMat = lambert(0x2a2a2e);
const pipeBlack = lambert(0x18181a);
const ductMat = lambert(0xe8eaec);
const poleMat = lambert(0x8a8c92);
const bulb = basic(0xf0e6b0);
const redBulb = basic(0xff4a3a);
const flowers = []; // the humps' flower bunches (this map's build)
const flowerMats = [basic(0xffa02a), basic(0xffd84a), basic(0xff7a2a)];

/** A point light (few per map: lights are slow). */
function light(g, color, intensity, dist, x, y, z) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.position.set(x, y, z);
  g.add(l);
  return l;
}

/** The portal's swirl: blue-violet arms round a pink centre. */
function swirlTex() {
  return canvasTex(128, (g, s) => {
    const c = s / 2;
    const grad = g.createRadialGradient(c, c, 2, c, c, c);
    grad.addColorStop(0, '#ffd0f4');
    grad.addColorStop(0.18, '#e060c0');
    grad.addColorStop(0.5, '#7a6af0');
    grad.addColorStop(1, '#3a3ac0');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(190, 200, 255, 0.6)';
    g.lineWidth = 5;
    for (let arm = 0; arm < 5; arm++) {
      g.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const a = arm * ((Math.PI * 2) / 5) + t * 5;
        g[t ? 'lineTo' : 'moveTo'](c + Math.cos(a) * t * c, c + Math.sin(a) * t * c);
      }
      g.stroke();
    }
  });
}

/** A hexagonal boulder: a squat six-sided column. */
function hexRock(g, r, h, x, y, z, rot = 0) {
  const m = part(g, new THREE.CylinderGeometry(r * 0.9, r, h, 6), boulderMat, x, y + h / 2, z);
  m.rotation.y = rot;
  const top = part(g, new THREE.CylinderGeometry(r * 0.75, r * 0.9, 0.3, 6), boulderTop, x, y + h + 0.15, z);
  top.rotation.y = rot;
  return m;
}

export const FR_PROPS = {
  frGround(scene, p, m, animated) {
    // The basin floor: a big plane over the plain ground, so its color can turn green in spring.
    const g = new THREE.Mesh(new THREE.PlaneGeometry(360, 280), groundMat);
    g.rotation.x = -Math.PI / 2;
    g.position.y = 0.02;
    g.receiveShadow = true;
    scene.add(g);
    // The season: every seasonal material slides from winter to spring.
    FR_STATE.spring = 0;
    flowers.length = 0;
    let s = 0;
    const tint = (k) => {
      for (const [mt, w, sp] of seasonal) mt.color.copy(w).lerp(sp, k);
    };
    tint(0);
    let last = null;
    animated.push((t) => {
      const dt = last == null ? 0 : Math.min(0.25, t - last);
      last = t;
      const want = FR_STATE.spring ? 1 : 0;
      if (want === s) return;
      s = want > s ? Math.min(want, s + dt / 3) : Math.max(want, s - dt / 3); // about 3 seconds
      tint(s);
      for (const f of flowers) f.visible = s > 0.5;
    });
  },

  frPortal(scene, p, m, animated) {
    // A ring about 16 across of dark segmented clamps, standing up and facing east (+x), with a
    // turning blue-violet swirl and a pink centre. In spring it goes dark.
    const g = placed(scene, p);
    const R = 7.6;
    const Y = R + 0.8;
    part(g, boxGeo(5, 0.8, 2 * R + 2), concreteDark, 0, 0.4, 0);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const b = part(g, boxGeo(2.2, 2.6, 1.6), i % 2 ? metal : concreteDark, 0, Y + Math.sin(a) * R, Math.cos(a) * R);
      b.rotation.x = -a;
      if (i % 2 === 0) {
        const clamp = part(g, boxGeo(2.8, 0.6, 2.2), concrete, 0, Y + Math.sin(a) * (R + 1.1), Math.cos(a) * (R + 1.1));
        clamp.rotation.x = -a;
      }
    }
    for (const z of [-R + 1.5, R - 1.5]) part(g, boxGeo(2.4, 1.6, 2.4), metal, 0, 1.6, z);
    const tex = swirlTex();
    tex.center.set(0.5, 0.5);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R - 0.9, 40), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true }));
    disc.position.set(0, Y, 0);
    disc.rotation.y = Math.PI / 2;
    g.add(disc);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(10, 28), new THREE.MeshBasicMaterial({ color: 0x5a6af0, transparent: true, opacity: 0.25, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(6, 0.08, 0);
    g.add(glow);
    const lamp = light(g, 0x6a7aff, 40, 40, 5, 7, 0);
    animated.push((t) => {
      const on = FR_STATE.spring ? 0 : 1;
      disc.material.opacity += (on - disc.material.opacity) * 0.02;
      disc.visible = disc.material.opacity > 0.02;
      tex.rotation = t * 1.1;
      glow.material.opacity = on * (0.22 + Math.sin(t * 2.1) * 0.06);
      lamp.intensity = disc.material.opacity * (40 + Math.sin(t * 3) * 8);
    });
  },

  frTunnel(scene, p) {
    // A square concrete tunnel mouth about 14 wide set into the north rim, black inside.
    const g = placed(scene, p);
    part(g, boxGeo(3, 11, 6), concrete, -7.5, 5.5, 0);
    part(g, boxGeo(3, 11, 6), concrete, 7.5, 5.5, 0);
    part(g, boxGeo(18, 3, 6), concrete, 0, 12.5, 0);
    part(g, boxGeo(18.6, 0.6, 6.4), concreteDark, 0, 14.2, 0);
    part(g, boxGeo(12, 10, 0.4), black, 0, 5, -2);
    // Rock piled round and above it.
    part(g, boxGeo(26, 8, 10), rimMat, 0, 18, -3).rotation.z = 0.04;
    for (const x of [-12, 12]) part(g, boxGeo(6, 16, 9), rimDark, x, 8, -2);
    part(g, boxGeo(16, 0.4, 4), stoneMat, 0, 0.2, 3);
  },

  frBlock() {}, // invisible: keeps towers and players off (the portal feet, the pond)

  frGateHouse(scene, p) {
    // A blocky dark grey gate house with slotted doors facing north onto the yard.
    const g = placed(scene, p);
    part(g, boxGeo(9, 9, 7), concrete, 0, 4.5, 0);
    part(g, boxGeo(9.6, 0.8, 7.6), concreteDark, 0, 9.2, 0);
    part(g, boxGeo(6, 2, 5), concreteDark, 0, 10.4, 0.4);
    for (let i = -2; i <= 2; i++) part(g, boxGeo(0.4, 5, 0.3), concreteDark, i * 1.1, 3, -3.6);
    part(g, boxGeo(0.6, 0.6, 0.6), redBulb, 3.6, 7.6, -3.6);
  },

  frGateDoor(scene, p) {
    // The black gap between the gate houses: the compound's entrance.
    const g = placed(scene, p);
    part(g, boxGeo(6, 7, 0.4), black, 0, 3.5, 2);
    part(g, boxGeo(7, 1, 7), concreteDark, 0, 7.5, 0);
  },

  frYard(scene, p) {
    // The stone yard where the pairs cross (flat slabs just over the ground).
    const tex = tileTexture('#5a5848', ['#555344', '#5f5d4d', '#626050'], 'rgba(0,0,0,0.25)', 64, 4);
    tex.repeat.set(p.w / 6, p.d / 6);
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), new THREE.MeshLambertMaterial({ map: tex }));
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(p.x, 0.05, p.z);
    yard.receiveShadow = true;
    scene.add(yard);
  },

  frBeacon(scene, p, m, animated) {
    // A tall grey "listening beacon" pole with small blinking lights.
    const g = placed(scene, p);
    if (p.island) part(g, new THREE.CylinderGeometry(2.4, 2.6, 0.5, 10), humpMat, 0, 0.25, 0);
    part(g, new THREE.CylinderGeometry(0.25, 0.35, 12, 8), poleMat, 0, 6, 0);
    part(g, boxGeo(1.6, 0.3, 0.3), poleMat, 0, 10.5, 0);
    const lights = [part(g, boxGeo(0.4, 0.4, 0.4), redBulb, 0, 12.2, 0), part(g, boxGeo(0.3, 0.3, 0.3), bulb, -0.8, 10.8, 0), part(g, boxGeo(0.3, 0.3, 0.3), bulb, 0.8, 10.8, 0)];
    animated.push((t) => {
      lights[0].visible = Math.sin(t * 3 + p.x) > -0.2;
    });
  },

  frPond(scene, p) {
    // Dark teal water with no floor: a black hole under a see-through surface.
    const hole = new THREE.Mesh(new THREE.CircleGeometry(p.r, 32), basic(0x020406));
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(p.x, 0.04, p.z);
    scene.add(hole);
    const water = new THREE.Mesh(new THREE.CircleGeometry(p.r, 32), waterMat);
    waterMat.transparent = true;
    waterMat.opacity = 0.55;
    water.rotation.x = -Math.PI / 2;
    water.position.set(p.x, 0.07, p.z);
    scene.add(water);
  },

  frBoulder(scene, p) {
    hexRock(placed(scene, p), p.s * 1.6, p.s * 1.2, 0, 0, 0, p.rot);
  },

  frMound(scene, p) {
    // A raised mound of hexagon boulders, about 3.6 high with a flat top (a cliff spot).
    const g = placed(scene, p);
    hexRock(g, 4.6, 3.3, 0, 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      hexRock(g, 1.6, 1.4 + (i % 3) * 0.5, Math.cos(a) * 4.8, 0, Math.sin(a) * 4.8, i);
    }
  },

  frWatch(scene, p) {
    // A wooden lookout on stilts with a dark pyramid roof and a ladder.
    const g = placed(scene, p);
    for (const x of [-2, 2]) for (const z of [-2, 2]) part(g, boxGeo(0.5, 9, 0.5), wood, x, 4.5, z);
    part(g, boxGeo(5.4, 0.5, 5.4), woodDark, 0, 9, 0);
    for (const [x, z, w, d] of [[0, -2.6, 5.4, 0.3], [0, 2.6, 5.4, 0.3], [-2.6, 0, 0.3, 5.4], [2.6, 0, 0.3, 5.4]]) part(g, boxGeo(w, 1.4, d), wood, x, 9.9, z);
    for (const x of [-2.4, 2.4]) for (const z of [-2.4, 2.4]) part(g, boxGeo(0.3, 3, 0.3), wood, x, 10.9, z);
    const roof = part(g, new THREE.ConeGeometry(4.6, 3, 4), roofMat, 0, 13.8, 0);
    roof.rotation.y = Math.PI / 4;
    part(g, new THREE.ConeGeometry(4.4, 0.6, 4), pineMat, 0, 14.6, 0).rotation.y = Math.PI / 4; // snow on the roof
    for (const x of [-0.7, 0.7]) part(g, boxGeo(0.2, 9, 0.2), woodDark, x, 4.5, 2.8);
    for (let y = 1; y < 9; y += 1) part(g, boxGeo(1.4, 0.15, 0.15), woodDark, 0, y, 2.8);
    // Cross braces.
    for (const z of [-2, 2]) part(g, boxGeo(0.25, 6, 0.25), wood, 0, 4, z).rotation.z = 0.8;
  },

  frShelter(scene, p) {
    // A dark triangular lean-to with a ladder against it.
    const g = placed(scene, p);
    const side = part(g, boxGeo(0.4, 7, 7), roofMat, -1.2, 3, 0);
    side.rotation.z = 0.5;
    part(g, boxGeo(0.4, 6.4, 7), concreteDark, 1.6, 3.2, 0);
    part(g, boxGeo(3.6, 0.3, 7), woodDark, 0, 0.15, 0);
    part(g, boxGeo(0.4, 1.4, 7.2), pineMat, -2.6, 6.4, 0).rotation.z = 0.5;
    for (const z of [-0.6, 0.6]) part(g, boxGeo(0.2, 6, 0.2), wood, -3, 3, z + 4.2).rotation.z = -0.25;
    for (let y = 0.8; y < 6; y += 1) part(g, boxGeo(0.15, 0.15, 1.3), wood, -3 + y * 0.25 - 0.75, y, 4.2);
  },

  frPipes(scene, p) {
    // Black corrugated pipes curving out of the ground and back in.
    const g = placed(scene, p);
    for (const [x, r, rot] of [[-1.6, 2.6, 0.2], [1.4, 2, -0.3]]) {
      const pipe = part(g, new THREE.TorusGeometry(r, 0.55, 8, 16, Math.PI), pipeBlack, x, 0, 0);
      pipe.rotation.y = rot;
    }
  },

  frDuct(scene, p) {
    // A big white duct pipe from the north rim, arching over the south pair's band.
    const g = placed(scene, p);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-14, 16, -14), new THREE.Vector3(-8, 11, -7), new THREE.Vector3(0, 9, 0), new THREE.Vector3(8, 9, 4), new THREE.Vector3(12, 0, 6),
    ]);
    part(g, new THREE.TubeGeometry(curve, 24, 1.2, 10), ductMat, 0, 0, 0);
    for (const t of [0.2, 0.45, 0.7]) {
      const q = curve.getPoint(t);
      const ring = part(g, new THREE.TorusGeometry(1.35, 0.2, 6, 14), metal, q.x, q.y, q.z);
      ring.lookAt(g.position.clone().add(curve.getPoint(t + 0.02)));
    }
    // Two legs where it crosses the path's sides.
    for (const [x, z] of [[-6, -6.4], [5, 3.4]]) part(g, boxGeo(0.6, 10, 0.6), metal, x, 5, z);
  },

  frWall(scene, p) {
    // A low dark segmented wall with small white-yellow lights along its top.
    const g = placed(scene, p);
    const n = Math.round(p.len / 3);
    for (let i = 0; i < n; i++) {
      const x = -p.len / 2 + 1.5 + i * 3;
      part(g, boxGeo(2.8, 1.8, 1), concreteDark, x, 0.9, 0);
      part(g, boxGeo(2.9, 0.3, 1.1), pineMat, x, 1.95, 0); // snow on top
      part(g, boxGeo(0.3, 0.3, 0.3), bulb, x, 1.4, -0.55);
    }
  },

  frLamp(scene, p) {
    // A short dark lamppost with an angled head.
    const g = placed(scene, p);
    part(g, boxGeo(0.4, 6, 0.4), metal, 0, 3, 0);
    const arm = part(g, boxGeo(0.3, 0.3, 1.8), metal, 0, 6.1, 0.7);
    arm.rotation.x = -0.4;
    const head = part(g, boxGeo(0.8, 0.4, 1.2), concreteDark, 0, 6.3, 1.5);
    head.rotation.x = 0.3;
    part(g, boxGeo(0.6, 0.12, 0.9), bulb, 0, 6.05, 1.5).castShadow = false;
    if (p.lit) light(g, 0xf0e6b0, 14, 18, 0, 5.5, 1.6);
  },

  frPine(scene, p) {
    // A snow-covered pine (white with a dark trunk); green in spring.
    const g = placed(scene, p);
    part(g, boxGeo(0.8, 2.4, 0.8), trunkMat, 0, 1.2, 0);
    [[5, 2.6], [3.8, 4.6], [2.6, 6.5], [1.4, 8.2]].forEach(([w, y], i) => part(g, boxGeo(w, 2, w), i % 2 ? pineDark : pineMat, 0, y, 0));
  },

  frHump(scene, p) {
    // A low snow hump; in spring it is grass with orange and yellow flowers.
    const g = placed(scene, p);
    const hump = part(g, new THREE.SphereGeometry(2.4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), humpMat, 0, 0, 0);
    hump.scale.set(1, 0.35, 0.8);
    const bunch = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const d = 0.4 + (i % 3) * 0.6;
      part(bunch, boxGeo(0.35, 0.35, 0.35), flowerMats[i % 3], Math.cos(a) * d, 0.8 - d * 0.15, Math.sin(a) * d * 0.8).castShadow = false;
    }
    bunch.visible = false;
    g.add(bunch);
    flowers.push(bunch); // shown by frGround's season tick
  },

  frRim(scene, p) {
    // A chunk of the dark rock ridge round the basin, snow on top.
    const g = placed(scene, p);
    const b = part(g, boxGeo(p.w, p.h, 6), p.v % 2 ? rimMat : rimDark, 0, p.h / 2, 0);
    b.rotation.z = ((p.v % 5) - 2) * 0.03;
    part(g, boxGeo(p.w * 0.9, 0.5, 5.4), cliffCap, 0, p.h + 0.2, 0);
    part(g, boxGeo(p.w * 0.7, p.h * 0.5, 4), rimDark, (p.v % 3) - 1, p.h * 0.25, 4);
  },

  frCliff(scene, p) {
    // The tall canyon walls outside the rim: stacked dark blocks, snow-capped.
    const g = placed(scene, p);
    part(g, boxGeo(p.w, p.h, 12), cliffMat, 0, p.h / 2, 0);
    part(g, boxGeo(p.w * 0.7, p.h * 0.35, 9), rimDark, (p.v % 4) - 1.5, p.h + p.h * 0.17, 1);
    part(g, boxGeo(p.w * 0.72, 0.8, 9.2), cliffCap, (p.v % 4) - 1.5, p.h * 1.35 + 0.4, 1);
  },
};

