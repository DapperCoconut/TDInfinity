// Visuals 2.0 weapons: what a tower holds is made bigger, lifted onto the hand so it can be seen,
// and guns get the parts their builder left out: a receiver and stock behind the grip, a magazine,
// sights or an optic, a muzzle device and things under the barrel. Which parts a gun gets depends
// on the tower, so no two towers carry the same gun, and higher levels bolt more onto it.
//
// Runs once per built model, after rigify (rig.js) has sorted the held parts onto the hand bone.
// Hand space: the wrist is the origin, the gun points along -Y, and +Z is up while aiming.
import * as THREE from 'three';
import { TOWERS } from './config.js';
import { localBox } from './rig.js';

const GRIP_Y = -0.2; // the middle of the fist

const geos = new Map();
const r3 = (v) => Math.round(v * 1000) / 1000;
function box(w, h, d) {
  const k = `b|${r3(w)}|${r3(h)}|${r3(d)}`;
  let g = geos.get(k);
  if (!g) geos.set(k, (g = new THREE.BoxGeometry(r3(w), r3(h), r3(d))));
  return g;
}
/** A cylinder along the gun (Y), or across it (axis 'x'). */
function cyl(r, len, axis = 'y', seg = 10) {
  const k = `c|${r3(r)}|${r3(len)}|${axis}|${seg}`;
  let g = geos.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(r3(r), r3(r), r3(len), seg);
    if (axis === 'x') g.rotateZ(Math.PI / 2);
    geos.set(k, g);
  }
  return g;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Not firearms: these keep their own shape and are only made easier to see.
const NO_KIT = /bow|archer|sling|wizard|mage|witch|wand|staff|elf|magic|necro|druid|flame|pyro|fire|freez|frost|cryo|ice|snow|paint|tweet|water|bubble|harpoon|dart|blow|spear|javelin|trident|toy|candy|egg|chef|cook|pizza|cat|dog|bee|plant|seed|slime|ghost|idol|music|dj|guitar|medic|heal|farm|bank|spray|hose|glue|net|trap|bomb|grenad|dynamite|firework|rocket|missile|mortar|launcher|bazooka|cannon|minigun|gatling|turret|golf|ball|bat|card|dice|coin|book|potion|crystal|rock|boomerang|ornament|soda|lemon|ice ?cream|hotdog|sausage/;
// Energy guns: a stock and an optic, but nothing that feeds bullets.
const ENERGY = /laser|plasma|ray|beam|tesla|electr|shock|volt|rail|phaser|pulse|ion|cyber|futur|photon|quantum|neon|void|star|cosmic|alien|robot|mech|drone|hack|byte|accel|energ|light/;

const _b = new THREE.Box3();
const _c = new THREE.Box3();
const _v = new THREE.Vector3();
const _hsl = { h: 0, s: 0, l: 0 };

/** Bigger, better-held, more detailed weapons for a finished, rigged tower model. */
export function armWeapons(m, type, level) {
  const rig = m.rig;
  if (!rig || m.static || m.plane || rig.armsMoved) return;
  const base = type.replace(/_\d\d$/, '');
  const def = TOWERS[type] ?? TOWERS[base];
  const words = `${base} ${def?.name ?? ''}`.toLowerCase();
  const seed = hash(base);
  const max = Math.max(1, (def?.levels.length ?? 5) - 1);
  const tier = Math.min(4, Math.round((level / max) * 4)); // 0..4, whatever the level count
  m.root.updateMatrixWorld(true);
  let any = false;
  for (const s of ['r', 'l']) {
    const items = rig[`${s}Items`];
    if (!items?.length || rig[`${s}Stiff`]) continue;
    any = armHand(m, rig, s, items, words, s === 'r' ? seed : seed ^ 0x5bd1e995, tier) || any;
  }
  if (!any) return;
  // How far each weapon now reaches past its hand (the off hand's grip is placed along that).
  m.root.updateMatrixWorld(true);
  for (const s of ['r', 'l']) {
    if (!rig[`${s}Held`]) continue;
    const hand = rig[`${s}Hand`];
    localBox(hand, hand, _b);
    rig[`${s}Reach`] = Math.max(0, -_b.min.y - 0.34);
  }
}

function armHand(m, rig, s, items, words, seed, tier) {
  const hand = rig[`${s}Hand`];
  // What is worn (gloves, cuffs, bracers) stays on the hand; the rest is the weapon.
  const gear = [];
  const all = new THREE.Box3();
  for (const it of items) {
    if (it.parent !== hand) continue;
    localBox(it, hand, _b);
    const worn = _b.max.x - _b.min.x >= 0.9 && _b.max.z - _b.min.z >= 0.9 && _b.min.y > -0.62;
    if (worn) continue;
    gear.push(it);
    all.union(_b);
  }
  if (!gear.length || all.isEmpty()) return false;
  const len = -all.min.y - 0.34; // how far it sticks out past the fist
  const wide = all.max.x - all.min.x;
  const tall = all.max.z - all.min.z;
  if (len > 4.2 || wide > 2.4 || tall > 3) return false; // huge props keep their size

  const gunArm = rig[`${s}Fwd`] && rig[`${s}Muz`] && !m.swing && !m.punch;
  const bulky = wide > 1.15 || tall > 1.5;
  const G = new THREE.Group();
  G.position.set(0, GRIP_Y, 0);
  hand.add(G);
  for (const it of gear) {
    it.position.y -= GRIP_Y;
    G.add(it);
  }
  if (!gunArm) {
    // Melee weapons, tools and props: just easier to read from the game camera.
    G.scale.setScalar(bulky ? 1.08 : 1.18);
    return true;
  }
  const pistol = len < 1.05;
  const k = bulky ? 1.1 : pistol ? 1.4 : len < 1.9 ? 1.28 : len < 2.7 ? 1.18 : 1.1;
  const up = bulky ? 0 : pistol ? 0.3 : 0.32; // the gun rides on top of the fist, not inside it
  G.scale.setScalar(k);
  G.position.z = up;
  if (s === 'r') rig.rUp = up;
  if (bulky || NO_KIT.test(words)) return true;

  // --- measure the gun the builder made (G space: grip at the origin, muzzle towards -Y)
  G.updateMatrixWorld(true);
  let main = null;
  let mainLen = 0;
  const boxes = [];
  G.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.visible) return;
    const bb = localBox(o, G, new THREE.Box3());
    boxes.push([o, bb]);
    const l = bb.max.y - bb.min.y;
    const thick = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    if (l > mainLen && thick < 0.9) {
      mainLen = l;
      main = [o, bb];
    }
  });
  if (!main || mainLen < 0.5) return true;
  const mb = main[1];
  const gb = new THREE.Box3();
  for (const [, bb] of boxes) gb.union(bb);
  const bw = THREE.MathUtils.clamp(mb.max.x - mb.min.x, 0.2, 0.46);
  const bh = THREE.MathUtils.clamp(mb.max.z - mb.min.z, 0.22, 0.5);
  const bx = (mb.min.x + mb.max.x) / 2;
  const bz = (mb.min.z + mb.max.z) / 2;
  const rear = mb.max.y;
  const front = mb.min.y;
  const top = bz + bh / 2;
  const bot = bz - bh / 2;
  // What the builder already put on it: don't add a second one.
  const hasTop = gb.max.z > mb.max.z + 0.09;
  const hasUnder = gb.min.z < mb.min.z - 0.12;
  const hasFront = gb.min.y < mb.min.y - 0.12;
  const hasRear = gb.max.y > mb.max.y + 0.2;

  // --- materials: the gun's own, plus steel, wood or polymer picked per tower
  const mats = new Map();
  const M = (color) => {
    let mat = mats.get(color);
    if (!mat) {
      mat = m.M ? m.M(color) : new THREE.MeshLambertMaterial({ color });
      if (!m.M && Array.isArray(m.mats)) m.mats.push(mat);
      mats.set(color, mat);
    }
    return mat;
  };
  const bodyMat = main[0].material;
  bodyMat.color?.getHSL(_hsl);
  const loud = _hsl.s > 0.55 && _hsl.l > 0.22 && _hsl.l < 0.8; // a bright toy / sci-fi gun
  const woody = _hsl.s > 0.2 && _hsl.h > 0.03 && _hsl.h < 0.12 && _hsl.l < 0.45;
  const energy = loud || ENERGY.test(words);
  const pick = (n, shift) => (seed >>> shift) % n;
  const steel = M([0x23262b, 0x2f3338, 0x1b1d21, 0x3a3d42][pick(4, 2)]);
  const furn = woody || pick(3, 5) === 0 ? M([0x6b4a2f, 0x8d5a34, 0x5a3a22][pick(3, 7)]) : pick(3, 5) === 1 ? M([0x8a7a55, 0x4b5320, 0x55606b][pick(3, 7)]) : steel;
  const accent = m.torso?.material?.color ? M(m.torso.material.color.getHex()) : steel;
  const glow = (color) => {
    const mat = M(color);
    mat.emissive?.setHex(color);
    mat.emissiveIntensity = 0.9;
    mat.userData.glow = color;
    return mat;
  };

  const add = (geo, mat, x, y, z, rx = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(bx + x, y, z);
    mesh.rotation.x = rx;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    G.add(mesh);
    return mesh;
  };

  if (pistol) {
    // --- handguns: a slide over the fist, sights, and attachments as it levels up
    if (!hasRear) {
      add(box(bw * 1.04, 0.42, bh * 0.62), bodyMat, 0, rear + 0.19, top - bh * 0.31);
      add(box(bw * 0.5, 0.1, 0.12), steel, 0, rear + 0.42, top - 0.02); // hammer
    }
    if (!hasTop) {
      add(box(0.06, 0.07, 0.09), steel, 0, front + 0.08, top + 0.04);
      add(box(bw * 0.7, 0.07, 0.08), steel, 0, rear + 0.3, top + 0.04);
    }
    if (!hasUnder && tier >= 2) {
      // light / laser under the barrel
      const kind = pick(3, 9);
      add(box(bw * 0.8, Math.min(0.34, mainLen * 0.5), 0.16), steel, 0, front + 0.24, bot - 0.08);
      if (kind) add(box(0.09, 0.04, 0.09), glow(kind === 1 ? 0xff3d3d : 0x7fe8ff), 0, front + 0.06, bot - 0.08);
    }
    if (!hasFront && tier >= 3) {
      if (pick(2, 12)) add(cyl(Math.min(bw, bh) * 0.42, 0.5), steel, 0, front - 0.25, bz + bh * 0.12);
      else add(box(bw * 1.15, 0.2, bh * 0.9), steel, 0, front - 0.1, bz);
    }
    if (tier >= 4 && !hasUnder) add(box(bw * 0.7, 0.2, 0.3), steel, 0, rear + 0.02, bot - 0.42, 0.1); // extended magazine
    return true;
  }

  // --- long guns
  const style = pick(5, 14); // stock shape
  const bullpup = style === 4 && !energy;
  if (!hasRear) {
    add(box(bw * 1.08, 0.6, bh * 1.1), bodyMat, 0, rear + 0.27, bz); // receiver
    add(box(0.05, 0.22, bh * 0.4), steel, (s === 'r' ? -1 : 1) * (bw * 0.54 + 0.02), rear + 0.2, bz + bh * 0.12); // ejection port
    const ry = rear + 0.55;
    const short = len < 1.5; // carbines and SMGs get the smaller stocks
    if (style === 0 && !short) {
      add(box(bw * 0.82, 0.84, bh * 0.78), furn, 0, ry + 0.42, bz - 0.07, -0.07);
      add(box(bw * 0.95, 0.13, bh * 1.3), steel, 0, ry + 0.88, bz - 0.12);
    } else if (style === 1 || (style === 0 && short)) {
      add(box(0.1, 0.86, 0.1), steel, 0, ry + 0.43, top - 0.07);
      add(box(0.08, 0.8, 0.08), steel, 0, ry + 0.42, bot - 0.02, -0.2);
      add(box(bw * 0.8, 0.1, bh * 1.45), furn, 0, ry + 0.88, bz - 0.1);
    } else if (style === 2) {
      add(cyl(0.09, 0.62), steel, 0, ry + 0.3, bz + 0.04);
      add(box(bw * 0.9, 0.5, bh * 1.12), furn, 0, ry + 0.62, bz - 0.05);
      add(box(bw * 0.95, 0.1, bh * 1.3), steel, 0, ry + 0.9, bz - 0.09);
    } else if (style === 3) {
      add(box(0.07, 0.56, 0.07), steel, -bw * 0.38, ry + 0.28, bz);
      add(box(0.07, 0.56, 0.07), steel, bw * 0.38, ry + 0.28, bz);
      add(box(bw * 1.1, 0.1, bh * 1.2), furn, 0, ry + 0.58, bz - 0.04);
    } else {
      add(box(bw * 1.02, 0.5, bh * 1.2), furn, 0, ry + 0.25, bz - 0.03); // bullpup body
      add(box(bw * 1.08, 0.12, bh * 1.32), steel, 0, ry + 0.54, bz - 0.05);
    }
  }
  if (!hasUnder && !energy) {
    // magazine: in front of the fist, or behind the grip on a bullpup
    const kind = pick(5, 18);
    const my = bullpup && !hasRear ? rear + 0.5 : Math.max(front + 0.25, -0.66);
    const mm = pick(3, 21) === 0 ? furn : steel;
    if (kind === 0) add(box(bw * 0.72, 0.27, 0.52), mm, 0, my, bot - 0.22, 0.12);
    else if (kind === 1) {
      add(box(bw * 0.72, 0.27, 0.36), mm, 0, my, bot - 0.15, 0.1);
      add(box(bw * 0.72, 0.27, 0.36), mm, 0, my - 0.1, bot - 0.44, 0.5);
    } else if (kind === 2) add(cyl(0.3, bw * 1.25, 'x', 12), mm, 0, my, bot - 0.26);
    else if (kind === 3) add(box(bw * 0.6, 0.2, 0.74), mm, 0, my, bot - 0.33, 0.04);
    else {
      add(box(bw * 1.7, 0.5, 0.4), mm, 0, my, bot - 0.2);
      add(box(bw * 1.2, 0.2, 0.08), steel, 0, my, bot - 0.02);
    }
  } else if (!hasUnder && energy) {
    // a power cell instead of a magazine
    const cell = glow(loud ? bodyMat.color.getHex() : [0x4dd0ff, 0xb388ff, 0x76ff7a, 0xffb74d][pick(4, 18)]);
    add(box(bw * 0.8, 0.34, 0.2), steel, 0, Math.max(front + 0.3, -0.7), bot - 0.1);
    add(box(bw * 0.5, 0.22, 0.1), cell, 0, Math.max(front + 0.3, -0.7), bot - 0.2);
  }
  if (!hasTop) {
    // sights at first; an optic once it has a few upgrades
    const kind = tier >= 2 ? 2 + pick(3, 24) : pick(2, 24);
    if (kind === 0) {
      add(box(0.06, 0.06, 0.15), steel, 0, front + 0.1, top + 0.07);
      add(box(bw * 0.6, 0.08, 0.1), steel, 0, rear + 0.3, top + 0.05);
    } else if (kind === 1) {
      add(box(0.09, 0.66, 0.06), steel, 0, rear - 0.2, top + 0.2);
      add(box(0.09, 0.07, 0.2), steel, 0, rear + 0.1, top + 0.1);
      add(box(0.09, 0.07, 0.2), steel, 0, rear - 0.5, top + 0.1);
      add(box(0.06, 0.06, 0.15), steel, 0, front + 0.1, top + 0.07);
    } else if (kind === 2) {
      add(box(bw * 0.85, 0.5, 0.05), steel, 0, rear - 0.1, top + 0.025); // rail
      add(box(0.2, 0.26, 0.2), steel, 0, rear - 0.1, top + 0.15);
      add(box(0.12, 0.03, 0.12), glow(0xff5252), 0, rear - 0.235, top + 0.15);
    } else if (kind === 3) {
      const l = Math.min(0.95, mainLen * 0.55);
      add(box(0.08, 0.08, 0.1), steel, 0, rear + 0.05, top + 0.05);
      add(box(0.08, 0.08, 0.1), steel, 0, rear + 0.05 - l * 0.6, top + 0.05);
      add(cyl(0.1, l), steel, 0, rear + 0.1 - l / 2, top + 0.19);
      add(cyl(0.13, 0.14), steel, 0, rear + 0.1 - l + 0.04, top + 0.19);
      add(cyl(0.11, 0.03), glow(tier >= 4 ? 0x7fe8ff : 0x9ad0ff), 0, rear + 0.1 - l - 0.03, top + 0.19);
    } else {
      add(box(bw * 0.85, 0.44, 0.05), steel, 0, rear - 0.1, top + 0.025);
      add(box(0.05, 0.2, 0.26), steel, -0.11, rear - 0.1, top + 0.17);
      add(box(0.05, 0.2, 0.26), steel, 0.11, rear - 0.1, top + 0.17);
      add(box(0.27, 0.2, 0.05), steel, 0, rear - 0.1, top + 0.3);
      add(box(0.15, 0.02, 0.15), glow(0x69f0ae), 0, rear - 0.1, top + 0.17);
    }
  }
  let tip = front;
  if (!hasFront) {
    // barrel end: a bare barrel, then a flash hider, brake or suppressor
    const kind = tier >= 1 ? pick(4, 27) : 0;
    const r = Math.min(bw, bh) * 0.24;
    if (kind === 0) {
      add(cyl(r, 0.36), steel, 0, front - 0.18, bz + bh * 0.1);
      tip = front - 0.36;
    } else if (kind === 1) {
      add(cyl(r, 0.3), steel, 0, front - 0.15, bz + bh * 0.1);
      add(cyl(r * 1.7, 0.2, 'y', 6), steel, 0, front - 0.38, bz + bh * 0.1);
      tip = front - 0.48;
    } else if (kind === 2) {
      add(cyl(r, 0.24), steel, 0, front - 0.12, bz + bh * 0.1);
      add(box(bw * 1.25, 0.16, bh * 0.6), steel, 0, front - 0.3, bz + bh * 0.1);
      tip = front - 0.38;
    } else {
      const l = tier >= 3 ? 0.7 : 0.4;
      add(cyl(r * 2, l), tier >= 3 ? steel : furn, 0, front - l / 2, bz + bh * 0.1);
      tip = front - l;
    }
  }
  if (!hasUnder && tier >= 2 && mainLen > 1.1) {
    const kind = pick(4, 11);
    const uy = front + Math.min(0.5, mainLen * 0.3);
    if (kind === 1) add(box(0.15, 0.15, 0.42), steel, 0, uy, bot - 0.2, 0.15); // foregrip
    else if (kind === 2) {
      add(box(0.05, 0.6, 0.05), steel, -bw * 0.4, uy + 0.1, bot - 0.05, 0.1); // folded bipod
      add(box(0.05, 0.6, 0.05), steel, bw * 0.4, uy + 0.1, bot - 0.05, 0.1);
    } else if (kind === 3) {
      const side = (s === 'r' ? 1 : -1) * (bw / 2 + 0.08);
      add(cyl(0.07, 0.34), steel, side, uy, bz); // laser / light on the side
      add(cyl(0.05, 0.03), glow(pick(2, 30) ? 0xff3d3d : 0xfff59d), side, uy - 0.18, bz);
    }
  }
  if (tier >= 3) add(box(bw * 1.12, 0.12, bh * 1.1), accent, 0, front + Math.min(0.8, mainLen * 0.45), bz); // the tower's colour on the handguard
  if (tier >= 4 && !hasRear) add(box(bw * 1.14, 0.07, bh * 1.12), accent, 0, rear + 0.5, bz);

  // Shots leave from the new barrel end.
  if (tip < front - 0.01) {
    G.updateMatrixWorld(true);
    for (const mz of m.muzzles ?? []) {
      let under = false;
      for (let p = mz.parent; p; p = p.parent) if (p === G) under = true;
      if (!under) continue;
      mz.getWorldPosition(_v);
      G.worldToLocal(_v);
      if (Math.abs(_v.y - front) > 0.45) continue; // a second barrel somewhere else
      _v.y = tip;
      G.localToWorld(_v);
      mz.parent.worldToLocal(_v);
      mz.position.copy(_v);
    }
  }
  return true;
}
