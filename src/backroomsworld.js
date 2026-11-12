// The Backrooms' decorations (Liminal contract): yellow wallpaper walls with a dark baseboard,
// square pillars and buzzing ceiling lights. The layout comes from sim/backrooms.js; world.js
// draws the carpet floor and path, and calls these through BR_PROPS[kind].
import * as THREE from 'three';
import { BR_WALL_H } from './sim/backrooms.js';
import { canvasTex, lambert, placed } from './worldkit.js';

let mats = null;
function brMats() {
  if (mats) return mats;
  // Old yellow wallpaper: faint stripes and little chevrons, a bit stained.
  const paper = canvasTex(128, (g, s) => {
    g.fillStyle = '#d6c47a';
    g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 16) {
      g.fillStyle = 'rgba(150,130,60,0.18)';
      g.fillRect(x, 0, 3, s);
      for (let y = 8; y < s; y += 16) {
        g.strokeStyle = 'rgba(140,120,55,0.25)';
        g.beginPath();
        g.moveTo(x + 5, y);
        g.lineTo(x + 9, y - 3);
        g.lineTo(x + 13, y);
        g.stroke();
      }
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(120,100,40,0.08)';
      g.beginPath();
      g.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 18, 0, Math.PI * 2);
      g.fill();
    }
  });
  paper.repeat.set(2, 1);
  mats = {
    paper: lambert(0xffffff, { map: paper }),
    base: lambert(0x6e5a2e),
    trim: lambert(0xb8a35e),
    panel: new THREE.MeshBasicMaterial({ color: 0xfff6d0 }),
    panelOff: lambert(0x8a8466),
    frame: lambert(0xd0ccb8),
  };
  return mats;
}

export const BR_PROPS = {
  brWall(scene, p) {
    const m = brMats();
    const g = placed(scene, { x: p.x, z: p.z, rot: p.rot ? Math.PI / 2 : 0 });
    const w = new THREE.Mesh(new THREE.BoxGeometry(p.len, BR_WALL_H, 0.8), m.paper);
    w.position.y = BR_WALL_H / 2;
    w.castShadow = w.receiveShadow = true;
    g.add(w);
    const b = new THREE.Mesh(new THREE.BoxGeometry(p.len + 0.04, 0.5, 0.9), m.base);
    b.position.y = 0.25;
    g.add(b);
    const t = new THREE.Mesh(new THREE.BoxGeometry(p.len + 0.04, 0.25, 0.95), m.trim);
    t.position.y = BR_WALL_H - 0.12;
    g.add(t);
  },
  brPillar(scene, p) {
    const m = brMats();
    const g = placed(scene, { x: p.x, z: p.z });
    const c = new THREE.Mesh(new THREE.BoxGeometry(2.2, BR_WALL_H, 2.2), m.paper);
    c.position.y = BR_WALL_H / 2;
    c.castShadow = c.receiveShadow = true;
    g.add(c);
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.5, 2.32), m.base);
    b.position.y = 0.25;
    g.add(b);
  },
  brLight(scene, p, _m, animated) {
    // A ceiling panel floating at wall-top height. Broken ones flicker.
    const m = brMats();
    const g = placed(scene, { x: p.x, z: p.z });
    const f = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 2.2), m.frame);
    f.position.y = BR_WALL_H + 0.6;
    g.add(f);
    const mat = p.on ? m.panel : new THREE.MeshBasicMaterial({ color: 0xfff6d0 });
    const l = new THREE.Mesh(new THREE.BoxGeometry(4, 0.22, 1.8), mat);
    l.position.y = BR_WALL_H + 0.5;
    g.add(l);
    if (!p.on) {
      let next = 0;
      animated.push((t) => {
        if (t < next) return;
        const lit = Math.random() < 0.5;
        mat.color.setHex(lit ? 0xfff6d0 : 0x5a5640);
        next = t + (lit ? 0.05 + Math.random() * 0.4 : 0.05 + Math.random() * 0.15);
      });
    }
  },
};
