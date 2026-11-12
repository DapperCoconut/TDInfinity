// Tower model pieces, file 3. What is left here:
// goldShine (the golden mist, stars and level tints laid over golden towers by ../models.js).

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { GOLD_SHEEN, glow, holdLongGun, hsl, makeThing, setMuzzle } from './bits.js';

const STAR_GEO = new THREE.OctahedronGeometry(0.22, 0);
const MIST_GEO = new THREE.IcosahedronGeometry(1, 1);
const tint = new THREE.Color();
const hsl2 = { h: 0, s: 0, l: 0 };
/**
 * Golden perk looks (goldtowers.js `goldFx`): recolours the model at levels listed in `fx.tints`
 * (ruby, diamond...; two colours alternate between parts), then adds a golden mist around its
 * feet and star particles floating around it (`m.goldFx`, animated by the view).
 */
export function goldShine(m, fx, level) {
  const colors = fx.tints?.[level];
  if (colors) {
    let i = 0;
    for (const mat of m.mats) {
      if (mat.map || !mat.color) continue;
      if (mat.userData.glow && mat.userData.glow !== GOLD_SHEEN) continue; // its own glowing parts stay
      tint.setHex(colors[i++ % colors.length]).getHSL(hsl2);
      mat.color.getHSL(hsl);
      mat.color.setHSL(hsl2.h, Math.max(0.65, hsl2.s * 0.95), 0.2 + hsl.l * 0.55);
      const sheen = tint.multiplyScalar(0.16).getHex();
      mat.userData.glow = sheen;
      mat.emissive?.setHex(sheen);
    }
  }
  m.root.updateMatrixWorld(true);
  const top = Math.min(10, Math.max(3, new THREE.Box3().setFromObject(m.root).max.y)); // (Orbit: not up to its satellite)
  const fxg = new THREE.Group();
  const mistColor = colors ? colors[0] : 0xffe082;
  const mistMat = new THREE.MeshBasicMaterial({ color: mistColor, transparent: true, opacity: 0.16, depthWrite: false });
  mistMat.userData.keepOpacity = 0.16;
  mistMat.userData.glow = mistColor;
  m.mats.push(mistMat);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const puff = new THREE.Mesh(MIST_GEO, mistMat);
    puff.scale.set(1.3, 0.45, 1.3);
    puff.position.set(Math.cos(a) * 1.6, 0.5, Math.sin(a) * 1.6);
    puff.castShadow = false;
    fxg.add(puff);
  }
  const starMats = [0xfff59d, 0xffffff, colors ? colors[colors.length - 1] : 0xffd740].map((c) => {
    const sm = new THREE.MeshBasicMaterial({ color: c });
    sm.userData.glow = c;
    m.mats.push(sm);
    return sm;
  });
  const stars = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const st = new THREE.Mesh(STAR_GEO, starMats[i % 3]);
    const r = 1.8 + ((i * 0.37) % 0.6);
    st.userData.y = 1 + ((i * 0.618) % 1) * (top - 0.5);
    st.userData.p = i * 1.7;
    st.position.set(Math.cos(a) * r, st.userData.y, Math.sin(a) * r);
    st.scale.set(1, 1.8, 1);
    st.castShadow = false;
    stars.push(st);
    fxg.add(st);
  }
  fxg.userData.stars = stars;
  m.root.add(fxg);
  m.goldFx = fxg;
  return m;
}

