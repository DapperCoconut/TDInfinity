import { creature, part } from '../models.js';
import { B, C, K, S, carvedFace, grp, mats, pumpkin, torus } from './halloween2.js';

// Halloween Night 2 creatures (def.model 'h2...'): candy, monkeys, crows, shrooms, balloon animals,
// goodie bags, popcorn, the clown car, reapers, walking pumpkins and bats. Each builder returns
// a creature (root / body) with its own `anim(phase, t)`. Characters face +Z, feet at y 0.
// Helpers are only called inside functions (models.js imports these files).

/** Cartoon eyes (white with a pupil, or glowing) and an angry brow. */
function eyes(p, X, x, y, z, s = 1, { glow = null, brows = true, white = 0xffffff } = {}) {
  const { P, G } = X;
  for (const k of [-1, 1]) {
    if (glow) B(p, 0.24 * s, 0.2 * s, 0.06, G(glow, 1), x + k * 0.28 * s, y, z);
    else {
      B(p, 0.3 * s, 0.32 * s, 0.06, P(white), x + k * 0.28 * s, y, z);
      B(p, 0.14 * s, 0.16 * s, 0.06, P(0x111111), x + k * 0.26 * s, y - 0.04 * s, z + 0.03);
    }
    if (brows) B(p, 0.34 * s, 0.07 * s, 0.06, P(0x111111), x + k * 0.28 * s, y + 0.24 * s, z + 0.02).rotation.z = k * -0.35;
  }
}

/** A wide grin with two fangs. */
function grin(p, X, y, z, s = 1, color = 0x3a0d0d) {
  const { P } = X;
  B(p, 0.6 * s, 0.14 * s, 0.06, P(color), 0, y, z);
  for (const k of [-1, 1]) {
    B(p, 0.16 * s, 0.1 * s, 0.06, P(color), k * 0.34 * s, y + 0.06 * s, z).rotation.z = k * 0.5;
    B(p, 0.07 * s, 0.12 * s, 0.07, P(0xffffff), k * 0.14 * s, y + 0.0, z + 0.02);
  }
}

/** Two little legs under a body, pivoting at y. Returns them for the walk. */
function stubLegs(p, m, shoe, x, y, len = 0.7, w = 0.3) {
  return [-1, 1].map((s) => {
    const g = grp(p, s * x, y, 0);
    B(g, w, len, w, m, 0, -len / 2, 0);
    B(g, w * 1.4, 0.18, w * 1.8, shoe, 0, -len + 0.06, 0.08);
    return g;
  });
}

const swing = (legs, phase, a = 0.7) => legs.forEach((l, i) => (l.rotation.x = Math.sin(phase * 1.6 + i * Math.PI) * a));

// ---------------------------------------------------------------- candy

/** Candy that walks: gumdrop, wrapped sweet, cotton candy, candy corn, twist, crackle, chocolate, lollipop. */
export function makeH2CandyModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, T } = X;
  const kind = def.candy ?? 'wrapped';
  const col = P(def.skin);
  const white = P(0xffffff);
  const bod = grp(h.body);
  const legM = P(0x3e2723);
  const shoe = P(0x212121);
  let legs = [];
  let lift = 0.55; // height of the body's bottom (legs below)
  const top = grp(bod, 0, lift, 0);

  if (kind === 'gumdrop') {
    S(top, 1.15, T(def.skin, 0.85), 0, 0.9, 0).scale.set(1, 0.95, 1);
    C(top, 1.12, 1.18, 0.4, col, 0, 0.2, 0, 14);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4;
      const yy = 0.4 + ((i * 0.37) % 1) * 1.2;
      const r = Math.sqrt(Math.max(0.05, 1.3 - (yy - 0.9) ** 2)) * 1.0;
      B(top, 0.12, 0.12, 0.12, white, Math.sin(a) * r, yy, Math.cos(a) * r).rotation.set(a, a, 0);
    }
    eyes(top, X, 0, 1.15, 1.06, 0.95);
    grin(top, X, 0.65, 1.1, 0.9);
    legs = stubLegs(bod, legM, shoe, 0.45, lift, 0.6);
  }

  if (kind === 'wrapped') {
    lift = 0.65;
    top.position.y = lift;
    S(top, 0.95, col, 0, 1.0, 0);
    for (const y of [0.55, 1.45]) C(top, y > 1 ? 0.78 : 0.78, 0.78, 0.18, white, 0, y, 0, 14);
    for (const s of [-1, 1]) {
      const end = K(top, 0.55, 0.8, col, s * 1.25, 1.0, 0, 8);
      end.rotation.z = s * Math.PI / 2;
      for (const r of [-0.4, 0, 0.4]) B(top, 0.5, 0.12, 0.3, white, s * 1.75, 1.0 + r, 0).rotation.z = s * r * 1.5;
    }
    eyes(top, X, 0, 1.15, 0.9, 0.8);
    grin(top, X, 0.75, 0.86, 0.75);
    legs = stubLegs(bod, legM, shoe, 0.4, lift, 0.7);
  }

  if (kind === 'cotton') {
    lift = 0.6;
    top.position.y = lift;
    C(top, 0.45, 0.12, 1.6, white, 0, 0.5, 0, 10);
    for (const y of [0.1, 0.6]) C(top, 0.4 - y * 0.3 + 0.02, 0.4 - y * 0.3 + 0.08, 0.18, P(0x4fc3f7), 0, y + 0.2, 0, 10);
    const fluff = [[0, 2.3, 0, 1.0], [-0.7, 2.0, 0.1, 0.7], [0.7, 2.05, 0, 0.72], [0, 2.9, -0.1, 0.75], [-0.45, 2.7, 0.4, 0.55], [0.5, 2.75, 0.3, 0.55], [0, 1.8, 0.4, 0.6]];
    for (const [x, y, z, r] of fluff) S(top, r, col, x, y, z);
    S(top, 0.5, P(0xce93d8), 0.4, 2.2, -0.6);
    eyes(top, X, 0, 2.45, 1.0, 0.85);
    grin(top, X, 2.0, 0.98, 0.8);
    legs = stubLegs(bod, legM, shoe, 0.35, lift, 0.6, 0.26);
  }

  if (kind === 'corn') {
    lift = 0.6;
    top.position.y = lift;
    const kern = grp(top);
    kern.scale.z = 0.7;
    C(kern, 0.82, 1.05, 1.0, P(0xffd600), 0, 0.5, 0, 12);
    C(kern, 0.5, 0.82, 1.0, col, 0, 1.5, 0, 12);
    C(kern, 0.08, 0.5, 0.9, white, 0, 2.45, 0, 12);
    eyes(top, X, 0, 1.6, 0.53, 0.75);
    grin(top, X, 1.12, 0.65, 0.75);
    legs = stubLegs(bod, legM, shoe, 0.4, lift, 0.6);
  }

  if (kind === 'twist') {
    lift = 0.7;
    top.position.y = lift;
    const red = P(0xe53935);
    for (let i = 0; i < 10; i++) {
      const b = B(top, 0.95, 0.4, 0.95, i % 2 ? red : col, 0, 0.2 + i * 0.37, 0);
      b.rotation.y = i * 0.32;
    }
    S(top, 0.5, col, 0, 3.75, 0).scale.set(1, 0.5, 1);
    eyes(top, X, 0, 2.6, 0.72, 0.7);
    grin(top, X, 2.2, 0.72, 0.65);
    for (const s of [-1, 1]) B(top, 0.7, 0.18, 0.18, red, s * 0.75, 1.8, 0).rotation.z = s * -0.5; // little arms
    legs = stubLegs(bod, legM, shoe, 0.3, lift, 0.7, 0.26);
  }

  if (kind === 'crackle') {
    lift = 0.6;
    top.position.y = lift;
    B(top, 2.0, 2.0, 0.9, col, 0, 1.6, 0);
    const rice = P(0xefebe9);
    for (let i = 0; i < 22; i++) {
      const x = -0.85 + ((i * 0.618) % 1) * 1.7;
      const y = 0.75 + ((i * 0.381) % 1) * 1.7;
      if (Math.abs(x) < 0.6 && y > 1.2 && y < 2.2) continue; // keep the face clear
      S(top, 0.1, rice, x, y, 0.46).scale.set(1.4, 0.8, 0.6);
    }
    B(top, 2.1, 0.9, 1.0, P(0xc62828), 0, 0.5, 0); // red wrapper
    B(top, 2.12, 0.15, 1.02, P(0xeeeeee), 0, 0.95, 0);
    B(top, 0.8, 0.3, 0.06, P(0xffeb3b), 0, 0.5, 0.52);
    eyes(top, X, 0, 1.95, 0.48, 0.8);
    grin(top, X, 1.45, 0.48, 0.75);
    legs = stubLegs(bod, legM, shoe, 0.55, lift, 0.6);
  }

  if (kind === 'chocolate') {
    lift = 0.6;
    top.position.y = lift;
    const dark = P(0x3e2723);
    B(top, 1.9, 3.2, 0.55, col, 0, 1.6, 0);
    for (const y of [2.3, 2.95]) B(top, 1.92, 0.07, 0.57, dark, 0, y, 0);
    B(top, 0.07, 1.4, 0.57, dark, 0, 2.5, 0);
    B(top, 2.0, 1.7, 0.66, P(0x6a1b9a), 0, 0.85, 0); // paper wrapper
    B(top, 2.02, 0.2, 0.68, P(0xbdbdbd), 0, 1.75, 0); // torn foil edge
    for (const x of [-0.7, -0.2, 0.35, 0.8]) B(top, 0.3, 0.2, 0.68, P(0xbdbdbd), x, 1.85 + (x > 0 ? 0.06 : 0), 0).rotation.z = x;
    B(top, 1.2, 0.35, 0.06, P(0xffc107), 0, 0.85, 0.34);
    eyes(top, X, 0, 2.6, 0.3, 0.8);
    grin(top, X, 2.12, 0.3, 0.75);
    for (const s of [-1, 1]) B(top, 0.7, 0.2, 0.2, col, s * 1.25, 1.9, 0).rotation.z = s * -0.6;
    legs = stubLegs(bod, legM, shoe, 0.5, lift, 0.6);
  }

  if (kind === 'lollipop') {
    // Hops along on its stick.
    lift = 0;
    C(top, 0.14, 0.14, 2.8, white, 0, 1.4, 0, 8);
    const disc = grp(top, 0, 3.7, 0);
    C(disc, 1.3, 1.3, 0.4, col, 0, 0, 0, 20).rotation.x = Math.PI / 2;
    for (const [r, t] of [[0.95, 0.1], [0.55, 0.1]]) part(disc, torus(r, t, 24), white, 0, 0, 0.18);
    S(disc, 0.15, white, 0, 0, 0.2);
    eyes(disc, X, 0, 0.3, 0.3, 0.8);
    grin(disc, X, -0.35, 0.3, 0.7);
  }

  const lolli = kind === 'lollipop';
  h.anim = (phase, t) => {
    if (lolli) {
      const hop = Math.abs(Math.sin(phase * 1.4));
      bod.position.y = hop * 0.9;
      bod.rotation.x = Math.cos(phase * 1.4) * 0.12;
      bod.rotation.z = Math.sin(t * 2) * 0.08;
      return;
    }
    swing(legs, phase);
    top.position.y = lift + Math.abs(Math.cos(phase * 1.6)) * 0.18;
    top.rotation.z = Math.sin(phase * 1.6) * 0.08;
    const sq = Math.sin(phase * 3.2) * 0.04;
    top.scale.set(1 + sq, 1 - sq, 1 + sq);
  };
  return h;
}

// ---------------------------------------------------------------- monkeys

/** A monkey (Big Monkey: a heavier, angrier one; Monkey Ball: rolling inside a clear ball). */
export function makeH2MonkeyModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, T } = X;
  const fur = P(def.skin);
  const tan = P(0xd7b48a);
  const big = !!def.big;
  const ball = !!def.ball;
  const holder = grp(h.body);
  const m = grp(holder);
  if (ball) {
    m.scale.setScalar(0.6);
    m.position.y = 0.55;
  }
  const chest = big ? 1.35 : 1;
  S(m, 0.95, fur, 0, 2.1, 0).scale.set(chest, 1.15, 0.9);
  S(m, 0.6, tan, 0, 2.0, 0.42).scale.set(chest, 1.1, 0.6);
  const head = grp(m, 0, 3.4, 0.1);
  S(head, 0.75, fur, 0, 0, 0);
  S(head, 0.5, tan, 0, -0.15, 0.45).scale.set(1.15, 0.9, 0.7);
  for (const s of [-1, 1]) {
    S(head, 0.28, fur, s * 0.78, 0.1, -0.05);
    S(head, 0.17, tan, s * 0.82, 0.1, 0.05);
  }
  eyes(head, X, 0, 0.18, 0.66, 0.75, { brows: big });
  B(head, 0.4, 0.08, 0.06, P(0x3e2723), 0, -0.35, 0.8);
  if (big) {
    B(head, 1.0, 0.18, 0.2, P(0x3e2723), 0, 0.42, 0.62); // heavy brow
    for (const s of [-1, 1]) B(head, 0.08, 0.16, 0.06, P(0xffffff), s * 0.12, -0.28, 0.82);
  }
  // Long arms and short legs.
  const limb = (x, y, len, w) => {
    const g = grp(m, x, y, 0);
    B(g, w, len, w, fur, 0, -len / 2, 0);
    S(g, w * 0.7, tan, 0, -len, 0);
    return g;
  };
  const armL = limb(0.95 * chest, 2.7, big ? 2.0 : 1.7, big ? 0.55 : 0.4);
  const armR = limb(-0.95 * chest, 2.7, big ? 2.0 : 1.7, big ? 0.55 : 0.4);
  const legL = limb(0.45, 1.25, 1.1, 0.45);
  const legR = limb(-0.45, 1.25, 1.1, 0.45);
  // Curly tail.
  const tail = grp(m, 0, 1.4, -0.7);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.55;
    B(tail, 0.18, 0.18, 0.45, fur, 0, Math.sin(a) * 0.7 + i * 0.12, -Math.cos(a) * 0.4 - i * 0.12).rotation.x = -a;
  }
  let sphere = null;
  if (ball) {
    sphere = grp(holder, 0, 2.2, 0);
    S(sphere, 2.2, T(0xb3e5fc, 0.3), 0, 0, 0);
    for (const r of [0, Math.PI / 2]) {
      const ring = part(sphere, torus(2.2, 0.06, 28), P(0x81d4fa), 0, 0, 0);
      ring.rotation.y = r;
    }
  }
  h.anim = (phase, t) => {
    const k = ball ? 2.4 : 1.4;
    const sw = Math.sin(phase * k);
    legL.rotation.x = sw * 0.8;
    legR.rotation.x = -sw * 0.8;
    armL.rotation.x = -sw * 0.7 - (big ? 0.2 : 0);
    armR.rotation.x = sw * 0.7 - (big ? 0.2 : 0);
    m.position.y = (ball ? 0.55 : 0) + Math.abs(Math.cos(phase * k)) * 0.15;
    tail.rotation.y = Math.sin(t * 3) * 0.3;
    head.rotation.z = Math.sin(t * 2.3) * 0.1;
    if (big) {
      armL.rotation.z = 0.25;
      armR.rotation.z = -0.25;
    }
    if (sphere) sphere.rotation.x = phase * 0.9;
  };
  return h;
}

// ---------------------------------------------------------------- crow

/** A black crow with a glowing red eye that hops along. */
export function makeH2CrowModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, G } = X;
  const black = P(def.skin);
  const sheen = P(0x263238);
  const beakM = P(0xffa000);
  const bird = grp(h.body);
  S(bird, 0.85, black, 0, 1.5, 0).scale.set(1, 0.9, 1.4);
  S(bird, 0.5, sheen, 0, 1.35, 0.55).scale.set(1, 1, 0.8);
  const head = grp(bird, 0, 2.25, 0.85);
  S(head, 0.52, black, 0, 0, 0);
  K(head, 0.18, 0.7, beakM, 0, -0.05, 0.75, 6).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    B(head, 0.16, 0.16, 0.06, G(0xff1744, 1), s * 0.38, 0.1, 0.25).rotation.y = s * 1.1;
    B(head, 0.25, 0.06, 0.06, P(0x000000), s * 0.33, 0.25, 0.3).rotation.set(0, s * 1.1, s * -0.4);
  }
  for (let i = 0; i < 3; i++) B(head, 0.08, 0.3, 0.2, black, 0, 0.5, -0.1 - i * 0.15).rotation.x = -0.5; // head feathers
  const wings = [-1, 1].map((s) => {
    const w = grp(bird, s * 0.75, 1.75, 0.1);
    B(w, 0.15, 0.9, 1.6, black, 0, -0.3, -0.2);
    for (let i = 0; i < 3; i++) B(w, 0.12, 0.25, 0.6, sheen, 0, -0.75, -0.85 - i * 0.18);
    return w;
  });
  for (const r of [-0.35, 0, 0.35]) {
    const f = B(bird, 0.3, 0.08, 1.2, black, r * 0.6, 1.5, -1.4);
    f.rotation.set(0.25, r, 0);
  }
  const legs = [-1, 1].map((s) => {
    const g = grp(bird, s * 0.3, 0.9, 0.1);
    B(g, 0.1, 0.9, 0.1, beakM, 0, -0.45, 0);
    for (const r of [-0.5, 0, 0.5]) B(g, 0.08, 0.06, 0.4, beakM, Math.sin(r) * 0.15, -0.88, 0.15).rotation.y = r;
    return g;
  });
  h.anim = (phase, t) => {
    const hop = Math.abs(Math.sin(phase * 1.8));
    bird.position.y = hop * 0.6;
    legs.forEach((l) => (l.rotation.x = -hop * 0.5));
    bird.rotation.x = -0.1 + Math.cos(phase * 1.8) * 0.08;
    wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * hop * 0.5));
    head.rotation.x = Math.sin(t * 6) * 0.1;
    head.rotation.y = Math.sin(t * 1.3) * 0.4;
  };
  return h;
}

// ---------------------------------------------------------------- shroom

/** A walking poison mushroom: spotted cap, a face on the stem, glowing drips. */
export function makeH2ShroomModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, G } = X;
  const cap = P(def.skin);
  const stem = P(0xf3e5f5);
  const bod = grp(h.body);
  C(bod, 0.75, 0.95, 2.0, stem, 0, 1.6, 0, 12);
  const capG = grp(bod, 0, 2.85, 0);
  S(capG, 1.75, cap, 0, 0, 0).scale.set(1, 0.6, 1);
  C(capG, 1.6, 1.6, 0.15, P(0x6a1b9a), 0, -0.12, 0, 16);
  const spot = P(0xfff59d);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    const r = i === 0 ? 0 : 0.6 + (i % 3) * 0.3;
    const y = Math.sqrt(Math.max(0, 1 - (r / 1.75) ** 2)) * 1.05;
    S(capG, 0.22, spot, Math.sin(a) * r, y - 0.02, Math.cos(a) * r).scale.set(1, 0.35, 1);
  }
  const drip = G(0x76ff03, 0.8);
  const drips = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.3;
    drips.push(S(capG, 0.12, drip, Math.sin(a) * 1.55, -0.3, Math.cos(a) * 1.55));
  }
  eyes(bod, X, 0, 2.0, 0.85, 0.8);
  grin(bod, X, 1.5, 0.92, 0.75, 0x4a148c);
  const legs = stubLegs(bod, stem, P(0x4a148c), 0.4, 0.75, 0.7, 0.35);
  h.anim = (phase, t) => {
    swing(legs, phase, 0.6);
    bod.position.y = Math.abs(Math.cos(phase * 1.6)) * 0.12;
    bod.rotation.z = Math.sin(phase * 1.6) * 0.07;
    capG.rotation.z = Math.sin(phase * 1.6 + 0.5) * 0.05;
    drips.forEach((d, i) => {
      const f = (t * 0.8 + i * 0.37) % 1;
      d.position.y = -0.3 - f * 1.2;
      d.scale.setScalar(1 - f * 0.6);
    });
  };
  return h;
}

// ---------------------------------------------------------------- balloon animal

/** A balloon dog made of shiny sausage balloons. */
export function makeH2BalloonModel(def) {
  const h = creature();
  const X = mats(h);
  const { P } = X;
  const m = P(def.skin);
  m.emissive.setHex(def.skin);
  m.emissiveIntensity = 0.12;
  const dog = grp(h.body);
  const sausage = (p, x, y, z, len, rx = 0, rz = 0) => {
    const s = S(p, 0.42, m, x, y, z);
    s.scale.set(1, len, 1);
    s.rotation.set(rx, 0, rz);
    return s;
  };
  sausage(dog, 0, 2.2, 0, 2.6, Math.PI / 2); // body
  sausage(dog, 0, 2.95, 1.05, 1.7, -0.3); // neck
  const head = grp(dog, 0, 3.7, 1.3);
  sausage(head, 0, 0, 0.45, 2.0, Math.PI / 2); // snout
  for (const s of [-1, 1]) sausage(head, s * 0.35, 0.55, -0.1, 1.9, -0.3, s * -0.35); // ears
  for (const s of [-1, 1]) {
    B(head, 0.14, 0.18, 0.06, P(0x111111), s * 0.22, 0.2, 0.75);
  }
  S(head, 0.14, P(0x111111), 0, 0.05, 1.3);
  const legs = [];
  for (const [x, z] of [[-0.45, 0.75], [0.45, 0.75], [-0.45, -0.75], [0.45, -0.75]]) {
    const g = grp(dog, x, 2.0, z);
    sausage(g, 0, -0.95, 0, 2.3);
    legs.push(g);
  }
  const tail = grp(dog, 0, 2.3, -1.1);
  sausage(tail, 0, 0.45, -0.25, 1.6, -0.6);
  S(tail, 0.12, m, 0, 1.05, -0.6);
  h.anim = (phase, t) => {
    const sw = Math.sin(phase * 1.5);
    legs.forEach((l, i) => (l.rotation.x = (i === 0 || i === 3 ? sw : -sw) * 0.4));
    dog.position.y = Math.abs(Math.cos(phase * 1.5)) * 0.25;
    const sq = Math.sin(phase * 3) * 0.04;
    dog.scale.set(1 + sq, 1 - sq, 1);
    head.rotation.z = Math.sin(t * 3) * 0.12;
    tail.rotation.z = Math.sin(t * 6) * 0.35;
  };
  return h;
}

// ---------------------------------------------------------------- goodie bag

/** A trick-or-treat bag with a printed pumpkin face, tied with a ribbon, candy poking out. */
export function makeH2BagModel(def) {
  const h = creature();
  const X = mats(h);
  const { P } = X;
  const bag = P(def.skin);
  const ink = P(0x111111);
  const bod = grp(h.body);
  const top = grp(bod, 0, 0.6, 0);
  B(top, 2.0, 2.2, 1.5, bag, 0, 1.1, 0);
  S(top, 1.05, bag, 0, 1.0, 0).scale.set(1, 1, 0.75);
  C(top, 0.45, 0.95, 0.6, bag, 0, 2.45, 0, 10);
  C(top, 0.42, 0.42, 0.2, P(0x7b1fa2), 0, 2.6, 0, 10);
  for (const s of [-1, 1]) {
    B(top, 0.5, 0.3, 0.12, P(0x9c27b0), s * 0.35, 2.7, 0.35).rotation.z = s * 0.5;
    B(top, 0.12, 0.6, 0.1, P(0x9c27b0), s * 0.15, 2.4, 0.45).rotation.z = s * 0.3;
  }
  C(top, 0.55, 0.42, 0.45, bag, 0, 2.95, 0, 10);
  const sweets = [[0xe53935, -0.2, 0.15], [0x43a047, 0.25, -0.1], [0xffeb3b, 0, -0.3], [0x29b6f6, 0.3, 0.25]];
  for (const [c, x, z] of sweets) S(top, 0.22, P(c), x, 3.3, z);
  B(top, 0.12, 0.7, 0.12, P(0xffffff), -0.3, 3.45, 0.1).rotation.z = 0.3; // a lollipop stick
  S(top, 0.25, P(0xec407a), -0.42, 3.85, 0.1);
  // The printed face.
  for (const s of [-1, 1]) {
    const e = B(top, 0.42, 0.42, 0.05, ink, s * 0.45, 1.5, 0.78);
    e.rotation.z = Math.PI / 4;
    e.scale.set(1, 0.7, 1);
  }
  B(top, 1.2, 0.25, 0.05, ink, 0, 0.75, 0.78);
  for (const x of [-0.3, 0.3]) B(top, 0.2, 0.18, 0.06, bag, x, 0.84, 0.8);
  B(top, 2.02, 0.1, 1.52, P(shadeHex(def.skin)), 0, 0.15, 0);
  const legs = stubLegs(bod, P(0x212121), P(0x111111), 0.5, 0.65, 0.6, 0.3);
  h.anim = (phase, t) => {
    swing(legs, phase, 0.6);
    top.rotation.z = Math.sin(phase * 1.6) * 0.12;
    top.position.y = 0.6 + Math.abs(Math.cos(phase * 1.6)) * 0.15;
  };
  return h;
}

const shadeHex = (c) => ((((c >> 16) & 255) * 0.7) << 16) | ((((c >> 8) & 255) * 0.7) << 8) | ((c & 255) * 0.7);

// ---------------------------------------------------------------- popcorn

/** A striped popcorn bucket overflowing with popcorn (`burnt`: charred, smoking, embers). */
export function makeH2PopcornModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, G, T } = X;
  const burnt = !!def.burnt;
  const bucketM = P(burnt ? 0x4e342e : 0xffffff);
  const stripe = P(burnt ? 0x212121 : 0xe53935);
  const corn = [P(def.skin), P(burnt ? 0x1b1b1b : 0xffecb3), P(burnt ? 0x5d4037 : 0xfff59d)];
  const bod = grp(h.body);
  const top = grp(bod, 0, 0.6, 0);
  C(top, 1.35, 1.0, 2.4, bucketM, 0, 1.2, 0, 16);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const piv = grp(top, 0, 1.2, 0);
    piv.rotation.y = a;
    B(piv, 0.42, 2.42, 0.05, stripe, 0, 0, 1.18).rotation.x = 0.145;
  }
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const r = (i % 4) * 0.33;
    const y = 2.55 + (1 - r) * 0.5 + (i % 3) * 0.1;
    S(top, 0.3 + (i % 3) * 0.06, corn[i % 3], Math.sin(a) * r, y, Math.cos(a) * r).scale.set(1, 0.85, 1);
  }
  const embers = [];
  if (burnt) for (const [x, z] of [[0.4, 0.3], [-0.3, -0.2], [0, 0.6]]) embers.push(S(top, 0.12, G(0xff6d00, 1), x, 3.25, z));
  const smoke = burnt ? [0, 1, 2].map((i) => S(top, 0.4, T(0x616161, 0.4), 0, 3.8 + i, 0)) : [];
  const pop = S(top, 0.25, corn[1], 0.2, 3.3, 0.2);
  // Face on the bucket (on a white or dark band).
  const band = P(burnt ? 0x3e2723 : 0xfff8e1);
  C(top, 1.25, 1.2, 0.95, band, 0, 1.35, 0, 16);
  eyes(top, X, 0, 1.55, 1.25, 0.8, burnt ? { glow: 0xff6d00 } : {});
  grin(top, X, 1.05, 1.2, 0.75);
  const legs = stubLegs(bod, P(0x3e2723), P(0x212121), 0.45, 0.65, 0.65, 0.32);
  h.anim = (phase, t) => {
    swing(legs, phase, 0.6);
    top.position.y = 0.6 + Math.abs(Math.cos(phase * 1.6)) * 0.15;
    top.rotation.z = Math.sin(phase * 1.6) * 0.07;
    const f = (t * 1.3) % 1;
    pop.position.y = 3.3 + Math.sin(f * Math.PI) * 1.2;
    pop.rotation.x = f * 6;
    smoke.forEach((s, i) => {
      const k = (t * 0.5 + i / 3) % 1;
      s.position.y = 3.4 + k * 2.2;
      s.position.x = Math.sin(t + i) * 0.3;
      s.scale.setScalar(0.6 + k);
    });
    embers.forEach((e, i) => e.scale.setScalar(0.8 + Math.sin(t * 7 + i * 2) * 0.3));
  };
  return h;
}

// ---------------------------------------------------------------- clown car

/** A tiny open clown car packed with clowns: headlight eyes, a grille grin, a horn and a flower. */
export function makeH2ClownCarModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, G } = X;
  const red = P(def.skin);
  const yel = P(0xffeb3b);
  const black = P(0x1a1a1a);
  const car = grp(h.body);
  B(car, 2.8, 1.1, 4.8, red, 0, 1.3, 0);
  B(car, 2.6, 0.7, 1.6, red, 0, 2.05, 1.4); // hood
  B(car, 2.6, 0.5, 1.0, red, 0, 1.95, -2.0); // trunk
  B(car, 2.9, 0.25, 4.9, yel, 0, 1.85, 0); // trim
  B(car, 2.3, 0.08, 0.7, P(0xb3e5fc), 0, 2.6, 0.55).rotation.x = -0.4; // windscreen
  for (const [x, z, c] of [[-0.9, 1.4, 0x29b6f6], [0.9, -0.9, 0x43a047], [-0.8, -1.5, 0xff9800], [1.0, 1.6, 0xffeb3b]]) S(car, 0.28, P(c), x, 1.88, z); // polka dots
  // Headlight eyes, a grille grin, bumpers.
  for (const s of [-1, 1]) {
    C(car, 0.38, 0.38, 0.2, P(0xffffff), s * 0.85, 1.55, 2.42, 14).rotation.x = Math.PI / 2;
    C(car, 0.18, 0.18, 0.22, G(0xffea00, 0.6), s * 0.82, 1.5, 2.45, 10).rotation.x = Math.PI / 2;
    B(car, 0.45, 0.1, 0.06, black, s * 0.85, 2.0, 2.42).rotation.z = s * -0.4;
  }
  B(car, 1.3, 0.35, 0.06, black, 0, 1.0, 2.42);
  for (const x of [-0.4, 0, 0.4]) B(car, 0.18, 0.2, 0.07, P(0xffffff), x, 1.08, 2.44);
  for (const z of [2.5, -2.45]) B(car, 3.0, 0.3, 0.3, P(0xb0bec5), 0, 0.85, z);
  // Horn and a daisy on the hood.
  K(car, 0.3, 0.6, yel, 1.55, 2.0, 1.2, 10).rotation.z = Math.PI / 2;
  S(car, 0.22, P(0xe53935), 1.25, 2.0, 1.2);
  const flower = grp(car, -0.8, 2.45, 1.6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    S(flower, 0.16, P(0xffffff), Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0);
  }
  S(flower, 0.12, yel, 0, 0, 0.06);
  B(car, 0.06, 0.5, 0.06, P(0x388e3c), -0.8, 2.25, 1.6);
  // Clowns packed inside.
  const heads = [];
  for (const [x, z, hair, hat] of [[-0.6, 0.0, 0xff5722, 0xe53935], [0.6, -0.2, 0x1e88e5, 0x43a047], [0, -1.2, 0x00e676, 0xffeb3b], [0.7, -1.5, 0xd500f9, 0x29b6f6]]) {
    const g = grp(car, x, 2.6, z);
    S(g, 0.45, P(0xf5f5f5), 0, 0, 0);
    S(g, 0.12, P(0xe53935), 0, -0.02, 0.46);
    for (const s of [-1, 1]) {
      S(g, 0.22, P(hair), s * 0.42, 0.1, -0.1);
      B(g, 0.08, 0.1, 0.05, black, s * 0.15, 0.15, 0.42);
    }
    B(g, 0.3, 0.06, 0.05, P(0xe53935), 0, -0.2, 0.42);
    K(g, 0.25, 0.6, P(hat), 0, 0.65, 0, 8);
    heads.push(g);
  }
  // Wheels.
  const wheels = [];
  for (const [x, z] of [[-1.45, 1.55], [1.45, 1.55], [-1.45, -1.55], [1.45, -1.55]]) {
    const w = grp(car, x, 0.7, z);
    C(w, 0.7, 0.7, 0.5, black, 0, 0, 0, 16).rotation.z = Math.PI / 2;
    C(w, 0.32, 0.32, 0.54, yel, 0, 0, 0, 10).rotation.z = Math.PI / 2;
    B(w, 0.56, 0.12, 0.6, P(0xe53935), 0, 0, 0);
    wheels.push(w);
  }
  h.anim = (phase, t) => {
    wheels.forEach((w) => (w.rotation.x = phase * 2.2));
    car.position.y = Math.abs(Math.sin(phase * 2.3)) * 0.15;
    car.rotation.z = Math.sin(phase * 1.1) * 0.05;
    car.rotation.x = Math.sin(phase * 2.3) * 0.03;
    heads.forEach((g, i) => {
      g.position.y = 2.6 + Math.abs(Math.sin(t * 4 + i * 1.7)) * 0.3;
      g.rotation.z = Math.sin(t * 3 + i) * 0.25;
    });
  };
  return h;
}

// ---------------------------------------------------------------- reapers

/** A floating hooded reaper. `reaper`: strong (spiked armor), winged, skull, big (horns, chains, two scythes), summoner (lantern staff, rune ring). */
export function makeH2ReaperModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, G } = X;
  const kind = def.reaper ?? 'strong';
  const robeC = kind === 'skull' ? 0x1c1a17 : def.skin;
  const cloak = P(robeC);
  const dark = P(0x050505);
  const bone = P(0xe8e0c8);
  const eyeC = { strong: 0x40c4ff, winged: 0xea80fc, skull: 0xff1744, big: 0xff3d00, summoner: 0x76ff03 }[kind] ?? 0xffffff;
  const float = grp(h.body);
  C(float, 0.75, 1.35, 2.8, cloak, 0, 1.7, 0, 12);
  const rags = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = B(float, 0.5, 0.7 + (i % 3) * 0.2, 0.15, cloak, Math.sin(a) * 1.25, 0.3, Math.cos(a) * 1.25);
    r.rotation.y = a;
    rags.push(r);
  }
  // Hood and face.
  S(float, 0.85, cloak, 0, 3.55, -0.05).scale.set(1, 1.05, 1);
  K(float, 0.5, 0.8, cloak, 0, 4.2, -0.4, 8).rotation.x = -0.7;
  if (kind === 'skull') {
    S(float, 0.55, bone, 0, 3.55, 0.35).scale.set(1, 1.05, 0.9);
    for (const s of [-1, 1]) {
      B(float, 0.24, 0.24, 0.06, dark, s * 0.2, 3.65, 0.83);
      B(float, 0.1, 0.1, 0.06, G(eyeC, 1), s * 0.2, 3.65, 0.86);
    }
    B(float, 0.12, 0.14, 0.06, dark, 0, 3.45, 0.85);
    for (let i = 0; i < 4; i++) B(float, 0.08, 0.14, 0.06, i % 2 ? dark : bone, -0.15 + i * 0.1, 3.25, 0.8);
  } else {
    B(float, 1.0, 0.95, 0.3, dark, 0, 3.55, 0.6);
    for (const s of [-1, 1]) B(float, 0.18, 0.14, 0.06, G(eyeC, 1), s * 0.22, 3.62, 0.77);
  }
  // Sleeves and bony hands.
  const arms = [-1, 1].map((s) => {
    const g = grp(float, s * 0.95, 2.9, 0.1);
    B(g, 0.5, 1.5, 0.55, cloak, 0, -0.6, 0.1).rotation.x = -0.5;
    for (const x of [-0.12, 0.12]) B(g, 0.08, 0.4, 0.08, bone, x, -1.25, 0.75);
    return g;
  });
  const scythe = (arm, s) => {
    const g = grp(arm, 0, -1.2, 0.8);
    B(g, 0.12, 4.0, 0.12, P(0x3e2723), 0, 0.6, 0);
    const blade = grp(g, 0, 2.6, 0);
    B(blade, 0.08, 0.35, 1.3, bone, 0, 0, 0.55 * s).rotation.x = 0.2 * s;
    B(blade, 0.08, 0.25, 0.8, bone, 0, -0.35, 1.3 * s).rotation.x = 0.8 * s;
    B(blade, 0.06, 0.12, 1.3, P(0xffffff), 0, -0.12, 0.55 * s).rotation.x = 0.2 * s;
    return g;
  };
  if (kind !== 'summoner') scythe(arms[1], 1);
  if (kind === 'big') {
    scythe(arms[0], 1);
    for (const s of [-1, 1]) {
      B(float, 0.25, 0.8, 0.25, P(0x111111), s * 0.55, 4.25, 0).rotation.z = -s * 0.6;
      B(float, 0.18, 0.6, 0.18, P(0x111111), s * 0.95, 4.7, 0.05).rotation.z = -s * 1.1;
    }
    const chain = P(0x757575);
    for (let i = 0; i < 9; i++) B(float, 0.2, 0.12, 0.2, chain, -0.8 + i * 0.2, 2.6 - Math.sin((i / 8) * Math.PI) * 0.5, 0.95).rotation.y = i % 2 ? 0 : Math.PI / 2;
    for (const x of [-0.5, 0, 0.5]) S(float, 0.18, bone, x, 2.95, 0.85); // a collar of little skulls
  }
  if (kind === 'strong') {
    const armor = P(0x37474f);
    for (const s of [-1, 1]) {
      B(float, 0.9, 0.5, 1.0, armor, s * 0.85, 3.05, 0);
      for (const z of [-0.25, 0.25]) K(float, 0.12, 0.6, P(0xb0bec5), s * 0.95, 3.5, z, 4);
    }
    B(float, 1.3, 0.9, 0.2, armor, 0, 2.4, 0.95);
    float.scale.set(1.15, 1, 1.1);
  }
  const wings = [];
  if (kind === 'winged') for (const s of [-1, 1]) {
    const w = grp(float, s * 0.4, 3.0, -0.6);
    B(w, 0.12, 0.12, 0.12, P(0x111111), 0, 0, 0);
    B(w, 2.2, 0.15, 0.15, P(0x1a1a1a), s * 1.1, 0.4, 0).rotation.z = s * 0.3;
    B(w, 2.0, 1.4, 0.06, P(0x311b92), s * 1.1, -0.3, 0);
    B(w, 0.8, 0.8, 0.06, P(0x311b92), s * 1.9, -1.2, 0);
    wings.push([w, s]);
  }
  let ring = null;
  let lamp = null;
  if (kind === 'summoner') {
    const g = grp(arms[1], 0, -1.2, 0.8);
    B(g, 0.12, 4.2, 0.12, P(0x3e2723), 0, 0.6, 0);
    B(g, 0.5, 0.12, 0.12, P(0x3e2723), 0, 2.7, 0);
    lamp = grp(g, 0.25, 2.4, 0);
    B(lamp, 0.4, 0.5, 0.4, P(0x263238), 0, 0, 0);
    B(lamp, 0.3, 0.35, 0.42, G(0x76ff03, 1), 0, 0, 0);
    ring = grp(h.body, 0, 0.1, 0);
    part(ring, torus(2.0, 0.07, 32), G(0x76ff03, 0.8), 0, 0, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      B(ring, 0.35, 0.05, 0.35, G(0x76ff03, 0.8), Math.cos(a) * 2.0, 0, Math.sin(a) * 2.0).rotation.y = a + Math.PI / 4;
    }
  }
  h.anim = (phase, t) => {
    float.position.y = 0.3 + Math.sin(t * 2.2 + phase * 0.05) * 0.18;
    float.rotation.x = 0.08;
    rags.forEach((r, i) => (r.rotation.x = Math.sin(t * 5 + i) * 0.3));
    arms[0].rotation.x = Math.sin(t * 1.8) * 0.12;
    arms[1].rotation.x = -Math.sin(t * 1.8) * 0.12;
    for (const [w, s] of wings) w.rotation.y = s * Math.sin(t * 7) * 0.55;
    if (ring) ring.rotation.y = t * 0.8;
    if (lamp) lamp.rotation.z = Math.sin(t * 2) * 0.25;
  };
  return h;
}

// ---------------------------------------------------------------- pumpkin

/** A walking jack-o'-lantern with vine legs (`evil`: purple, horned, purple fire). */
export function makeH2PumpkinModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, G } = X;
  const evil = !!def.evil;
  const skin = P(def.skin);
  const rib = P(evil ? 0x4a148c : 0xe65100);
  const vine = P(0x33691e);
  const bod = grp(h.body);
  const top = grp(bod, 0, 2.2, 0);
  pumpkin(top, skin, 1.35, 0, rib);
  carvedFace(top, G(evil ? 0xe040fb : 0xffea00, 1), 1.35, 0, evil);
  C(top, 0.15, 0.22, 0.6, P(0x4e342e), 0, 1.3, 0, 8);
  for (const s of [-1, 1]) {
    const leaf = B(top, 0.6, 0.06, 0.4, vine, s * 0.45, 1.15, 0.1);
    leaf.rotation.z = s * -0.3;
  }
  for (let i = 0; i < 4; i++) B(top, 0.08, 0.08, 0.35, vine, 0.25 + Math.cos(i * 1.4) * 0.2, 1.3 + i * 0.1, Math.sin(i * 1.4) * 0.2).rotation.y = i * 1.4; // curly vine
  const flames = [];
  if (evil) {
    for (const s of [-1, 1]) {
      B(top, 0.22, 0.6, 0.22, P(0x1a1a1a), s * 0.7, 1.2, 0.1).rotation.z = -s * 0.5;
      B(top, 0.15, 0.4, 0.15, P(0x1a1a1a), s * 0.95, 1.55, 0.1).rotation.z = -s * 0.1;
    }
    for (const [x, z, s] of [[-0.3, 0, 0.4], [0.3, 0.1, 0.35], [0, -0.3, 0.5]]) flames.push(B(top, s, s * 1.6, s, G(0xd500f9, 0.9), x, 1.6, z));
  }
  const legs = [-1, 1].map((s) => {
    const g = grp(bod, s * 0.55, 1.05, 0);
    C(g, 0.16, 0.2, 1.0, vine, 0, -0.5, 0, 6);
    B(g, 0.35, 0.16, 0.6, vine, 0, -1.0, 0.15);
    return g;
  });
  const arms = [-1, 1].map((s) => {
    const g = grp(top, s * 1.3, 0.1, 0);
    C(g, 0.1, 0.12, 1.1, vine, s * 0.3, -0.45, 0, 6).rotation.z = s * 0.5;
    for (const r of [-0.4, 0.4]) B(g, 0.06, 0.3, 0.06, vine, s * 0.65, -0.95, r * 0.3).rotation.x = r;
    return g;
  });
  h.anim = (phase, t) => {
    swing(legs, phase, 0.6);
    arms.forEach((a, i) => (a.rotation.x = Math.sin(phase * 1.6 + i * Math.PI) * 0.5));
    top.position.y = 2.2 + Math.abs(Math.cos(phase * 1.6)) * 0.15;
    top.rotation.z = Math.sin(phase * 1.6) * 0.08;
    flames.forEach((f, i) => (f.scale.y = 1 + Math.sin(t * 9 + i * 2) * 0.3));
  };
  return h;
}

// ---------------------------------------------------------------- bat

/** A bat with big flapping wings, pointy ears and red eyes. */
export function makeH2BatModel(def) {
  const h = creature();
  const X = mats(h);
  const { P, G } = X;
  const fur = P(def.skin);
  const skinM = P(0x3e2723);
  const bat = grp(h.body, 0, 1.0, 0);
  S(bat, 0.55, fur, 0, 0, 0).scale.set(1, 1.15, 0.9);
  const head = grp(bat, 0, 0.75, 0.15);
  S(head, 0.42, fur, 0, 0, 0);
  for (const s of [-1, 1]) {
    K(head, 0.16, 0.55, skinM, s * 0.25, 0.5, 0, 4).rotation.z = -s * 0.25;
    B(head, 0.12, 0.1, 0.06, G(0xff1744, 1), s * 0.15, 0.08, 0.4);
    K(head, 0.04, 0.14, P(0xffffff), s * 0.08, -0.18, 0.38, 4).rotation.x = Math.PI;
  }
  const wings = [-1, 1].map((s) => {
    const w = grp(bat, s * 0.35, 0.2, 0);
    B(w, 1.6, 0.1, 0.1, skinM, s * 0.8, 0.15, 0);
    B(w, 1.6, 0.8, 0.05, skinM, s * 0.8, -0.25, 0);
    B(w, 1.0, 0.5, 0.05, skinM, s * 1.9, -0.05, 0).rotation.z = s * 0.3;
    for (const x of [0.6, 1.2, 1.8]) B(w, 0.06, 0.8, 0.07, fur, s * x, -0.3, 0).rotation.z = s * 0.25;
    return [w, s];
  });
  for (const s of [-1, 1]) B(bat, 0.1, 0.35, 0.1, skinM, s * 0.2, -0.7, 0);
  h.anim = (phase, t) => {
    const f = Math.sin(t * 14 + phase * 0.2);
    for (const [w, s] of wings) w.rotation.z = s * f * 0.7;
    bat.position.y = 1.0 + f * 0.15;
    bat.rotation.x = 0.25;
    head.rotation.y = Math.sin(t * 2) * 0.3;
  };
  return h;
}

export const H2_CREATURES = {
  h2Candy: makeH2CandyModel,
  h2Monkey: makeH2MonkeyModel,
  h2Crow: makeH2CrowModel,
  h2Shroom: makeH2ShroomModel,
  h2Balloon: makeH2BalloonModel,
  h2Bag: makeH2BagModel,
  h2Popcorn: makeH2PopcornModel,
  h2ClownCar: makeH2ClownCarModel,
  h2Reaper: makeH2ReaperModel,
  h2Pumpkin: makeH2PumpkinModel,
  h2Bat: makeH2BatModel,
};
