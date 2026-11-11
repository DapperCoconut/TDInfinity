import * as THREE from 'three';
import { WORLD_SCALE } from './scale.js';
import { ARM_LOW, ARM_UP, LEG_LOW, LEG_UP, SOLE, STIFF_LIMBS } from './rig.js';

// Block-style limbs (like Tower Defense Simulator): arms and legs stay straight, so no elbow or knee bends.
const BEND = STIFF_LIMBS ? 0 : 1;

// Visuals 2.0 pose engine. Every frame it turns a character's style (m.vis: a stance, a way of
// holding its weapon while firing and while resting, an idle animation and a firing animation;
// see visuals.js) into bone rotations on the rig that rigify() (rig.js) added to the model:
//
//   feet are planted with leg IK, so hips can drop, shift and turn while the shoes stay put;
//   a hand that aims a gun is locked to the aim direction and both arms are solved to reach it
//   (the off hand grabs the gun, or does its own thing); other arms keep the pose their builder
//   gave them, with a bent elbow.
//
// Models without a rig (buildings, vehicles, creatures) keep the old straight-arm animation.
//
// Spaces: "model space" is the body group's parent space (feet on y = 0, facing +Z, right = -X).

const V = () => new THREE.Vector3();
const Qn = () => new THREE.Quaternion();
const DOWN = new THREE.Vector3(0, -1, 0);
const X = new THREE.Vector3(1, 0, 0);
const Yax = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const WAIST = new THREE.Vector3(0, 2, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
/** 0 -> 1 -> 0 over [a, b] (smooth bump). */
const bump = (s, a, b) => (s <= a || s >= b ? 0 : Math.sin(((s - a) / (b - a)) * Math.PI));
/** 0 -> 1 between a and b, eased. */
const ramp = (s, a, b) => smooth(clamp((s - a) / (b - a), 0, 1));
/** Smooth pseudo-random wobble in -1..1. */
const wob = (t, seed) => Math.sin(t * 1.0 + seed * 12.9) * 0.5 + Math.sin(t * 2.3 + seed * 4.1) * 0.3 + Math.sin(t * 0.37 + seed * 7.7) * 0.2;

const _e = new THREE.Euler();
const _q1 = Qn();
const _q2 = Qn();
const _q3 = Qn();
const _qb = Qn();
const _qbi = Qn();
const _qu = Qn();
const _qbu = Qn();
const _qbui = Qn();
const _qA = Qn();
const _qH = Qn();
const _qHl = Qn();
const _v1 = V();
const _v2 = V();
const _v3 = V();
const _v4 = V();
const _d = V();
const _perp = V();
const _E = V();
const _dU = V();
const _dF = V();
const _pb = V();
const _pu = V();
const _W = V();
const _WL = V();
const _WL2 = V();
const _poleL2 = V();
const _f = V();
const _up = V();
const _side = V();
const _chest = V();
const _m4 = new THREE.Matrix4();
const _bx = V();
const _by = V();
const _bz = V();

/** Quaternion whose Y axis is `y` and whose Z axis leans toward `zHint`. */
function basis(out, y, zHint) {
  _by.copy(y).normalize();
  _bx.crossVectors(_by, zHint);
  if (_bx.lengthSq() < 1e-8) _bx.crossVectors(_by, Math.abs(_by.x) < 0.9 ? X : Z);
  _bx.normalize();
  _bz.crossVectors(_bx, _by);
  _m4.makeBasis(_bx, _by, _bz);
  return out.setFromRotationMatrix(_m4);
}

export function newState() {
  return { aim: 0, since: 99, n: 0, shots: -1, prevRecoil: 0, seed: Math.random() * 100, pump: 0 };
}

// ---------------------------------------------------------------- the old animation
// Straight arms swinging from the shoulder (models without a rig, and the fallback).
function legacyTower(m, st, o) {
  const r = o.recoil;
  if (m.static || !m.rightArm || !m.pose) {
    // Buildings have no arms to animate, but their guns still kick (below).
  } else if (m.punch) {
    const left = o.shots % 2 === 0;
    m.rightArm.rotation.x = m.pose.right + (left ? 0 : r * m.swing);
    m.leftArm.rotation.x = m.pose.left + (left ? r * m.swing : 0);
  } else if (m.swing) {
    m.rightArm.rotation.x = m.pose.right + r * m.swing;
    m.leftArm.rotation.x = m.pose.left;
  } else if (!m.plane) {
    const dual = m.muzzles.length > 1;
    const leftFired = dual && o.shots % 2 === 0;
    const kick = r * (m.recoilScale ?? 1);
    m.rightArm.rotation.x = m.pose.right - (leftFired ? 0 : kick * 0.35);
    m.leftArm.rotation.x = m.pose.left - (dual && !leftFired ? 0 : kick * m.pose.leftRecoil);
  }
  if (m.body) m.body.position.y = (m.lift || 0) + Math.sin(o.t * 2) * (m.bob ?? (m.lift ? 0.15 : 0.04));
  settleGuns(m, o.dt, 13 / (o.kick ?? 1), o.snap);
}

// ---------------------------------------------------------------- gun recoil for turrets and vehicles
const _wq = new THREE.Quaternion();
const _ws = V();
const AXES = ['x', 'y', 'z'];

/**
 * The gun that `muzzle` sits on slams back against the shot. dir: the way the shot went (world
 * space, unit length); power: how far it slides, in sim units. settleGuns() brings it home.
 * (m: the model, { root, body }.)
 */
export function kickGun(m, muzzle, dir, power = 0.4) {
  let g = muzzle?.parent;
  if (!g) return;
  if (g === m.root) {
    // Fixed straight to the model: the whole body takes the shove.
    if (!m.body || m.body === m.root) return;
    g = m.body;
    power *= 0.5;
  }
  const u = g.userData;
  if (!u.kickDir) {
    u.kickDir = V();
    u.kickAt = g.position.clone(); // where settleGuns last left it
    u.kickHome = g.position.clone();
  }
  // The shot's direction as the gun's parent sees it, so the slide stays right while the model turns.
  g.parent.getWorldQuaternion(_wq);
  g.parent.getWorldScale(_ws);
  u.kickDir.copy(dir).applyQuaternion(_wq.invert()).multiplyScalar((-power * WORLD_SCALE) / (_ws.x || 1));
  u.kick = 1;
  (m.kicked ??= new Set()).add(g);
}

/** Slides kicked guns home again (call every frame). home: put them home right now, for this frame. */
export function settleGuns(m, dt, rate = 13, home = false) {
  if (!m.kicked?.size) return;
  const f = Math.exp(-dt * rate);
  for (const g of m.kicked) {
    const u = g.userData;
    if ((u.kick *= f) < 0.02) u.kick = 0;
    const d = home ? 0 : u.kick;
    // Whatever else moves the group keeps working: per axis, a position nobody touched since last
    // frame goes back to its home before the kick is added; one that changed is the new home.
    const p = g.position;
    for (const ax of AXES) {
      if (p[ax] === u.kickAt[ax]) p[ax] = u.kickHome[ax];
      else u.kickHome[ax] = p[ax];
      p[ax] += u.kickDir[ax] * d;
      u.kickAt[ax] = p[ax];
    }
    if (!u.kick) m.kicked.delete(g);
  }
}

// ---------------------------------------------------------------- pose accumulator
const P = {
  px: 0, py: 0, pz: 0, yaw: 0, twist: 0, lean: 0, roll: 0, hp: 0, hy: 0, hr: 0, jump: 0,
  rW: V(), lW: V(), rPitch: 0, rTurn: 0, rCant: 0, lPitch: 0, lTurn: 0, lCant: 0, grip: 0,
  rfLift: 0, lfLift: 0, rfPitch: 0, lfPitch: 0, rfZ: 0, lfZ: 0, rTuck: 0, lTuck: 0, lGest: 0,
};
function resetP() {
  for (const k in P) {
    if (P[k].isVector3) P[k].set(0, 0, 0);
    else P[k] = 0;
  }
}

// ---------------------------------------------------------------- idle animations
// (t: seconds, a: amplitude, k: how relaxed the character is, 1 = at rest, 0 = firing.)
const IDLES = {
  breathe(t, a) {
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.9)) * 0.045 * a;
    P.lean += Math.sin(t * 1.9 - 0.6) * 0.015 * a;
    P.rW.y += Math.sin(t * 1.9 - 0.9) * 0.025 * a;
  },
  /** Slow side-to-side weight shift. */
  sway(t, a) {
    const s = Math.sin(t * 0.9);
    P.px += s * 0.13 * a;
    P.roll -= s * 0.035 * a;
    P.hr += s * 0.04 * a;
    P.py -= (1 - Math.abs(s)) * 0.03 * a;
  },
  /** Head and shoulders sweep the field. */
  scan(t, a, k) {
    const s = Math.sin(t * 0.55);
    P.hy += s * 0.55 * a * (0.25 + 0.75 * k);
    P.twist += Math.sin(t * 0.55 - 0.5) * 0.12 * a * k;
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.7)) * 0.03;
  },
  /** Light on the feet: a constant springy bounce. */
  bounce(t, a) {
    const s = Math.abs(Math.sin(t * 3.2));
    P.py -= s * 0.11 * a;
    P.lean += s * 0.03 * a;
    P.rW.y -= s * 0.04 * a;
  },
  /** Impatient: taps the front foot, small breathing. */
  tap(t, a) {
    P.lfPitch -= Math.max(0, Math.sin(t * 7)) * 0.34 * a;
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.8)) * 0.035;
    P.hr += Math.sin(t * 0.7) * 0.05 * a;
  },
  /** Moves to a beat: hips, shoulders and a head nod. */
  groove(t, a) {
    const b = t * 4.2;
    P.py -= (0.5 + 0.5 * Math.sin(b * 2)) * 0.09 * a;
    P.px += Math.sin(b) * 0.1 * a;
    P.twist += Math.sin(b) * 0.1 * a;
    P.hp += (0.5 + 0.5 * Math.sin(b * 2 + 0.6)) * 0.14 * a;
    P.roll += Math.sin(b) * 0.04 * a;
  },
  /** Statue-still, with a slow deliberate head turn now and then. */
  stoic(t, a, k, st) {
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.2)) * 0.02;
    const c = (t * 0.12 + st.seed) % 1;
    P.hy += (ramp(c, 0.1, 0.18) - ramp(c, 0.42, 0.5) - ramp(c, 0.6, 0.68) + ramp(c, 0.9, 0.98)) * 0.5 * a * k;
  },
  /** Jumpy: quick little head snaps. */
  twitch(t, a, k, st) {
    const c = t * 1.3 + st.seed;
    const i = Math.floor(c);
    const f = c - i;
    const h = (n) => Math.sin(n * 127.1 + st.seed * 3.3);
    const a0 = h(i);
    const a1 = h(i + 1);
    P.hy += lerp(a0, a1, ramp(f, 0.75, 0.9)) * 0.55 * a * (0.3 + 0.7 * k);
    P.hp += lerp(h(i + 9), h(i + 10), ramp(f, 0.75, 0.9)) * 0.12 * a;
    P.py -= (0.5 + 0.5 * Math.sin(t * 2.6)) * 0.035;
    P.rW.y += Math.sin(t * 2.6) * 0.02;
  },
  /** Looks down to check the weapon every few seconds. */
  check(t, a, k, st) {
    const c = (t * 0.16 + st.seed) % 1;
    const w = ramp(c, 0.55, 0.62) - ramp(c, 0.82, 0.9);
    P.hp += w * 0.42 * a * k;
    P.hy -= w * 0.25 * a * k;
    P.rW.y += w * 0.22 * a * k;
    P.rCant += w * 0.5 * a * k;
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.7)) * 0.035;
  },
  /** Shifts weight from one leg to the other, holding each for a while. */
  shift(t, a, k, st) {
    const c = (t * 0.14 + st.seed) % 1;
    const side = ramp(c, 0, 0.08) - 2 * ramp(c, 0.46, 0.56) + ramp(c, 0.92, 1);
    P.px += side * 0.2 * a;
    P.roll -= side * 0.05 * a;
    P.hr += side * 0.05 * a;
    P.py -= Math.abs(side) * 0.04 * a + (0.5 + 0.5 * Math.sin(t * 1.6)) * 0.025;
  },
  /** Hovering: bobs and drifts. */
  float(t, a) {
    P.jump += Math.sin(t * 1.7) * 0.14 * a;
    P.roll += Math.sin(t * 0.9) * 0.05 * a;
    P.lean += Math.sin(t * 1.3) * 0.04 * a;
  },
  /** Hunched, heavy breathing. */
  hunch(t, a) {
    const s = 0.5 + 0.5 * Math.sin(t * 1.4);
    P.py -= s * 0.07 * a;
    P.lean += s * 0.06 * a;
    P.hp -= s * 0.05 * a;
    P.rW.y -= s * 0.05 * a;
    P.lW.y -= s * 0.05 * a;
  },
  /** Rocks back and forth on the heels. */
  rock(t, a) {
    const s = Math.sin(t * 1.3);
    P.pz += s * 0.1 * a;
    P.lean -= s * 0.05 * a;
    P.rfPitch += Math.min(0, s) * 0.12 * a;
    P.lfPitch += Math.min(0, s) * 0.12 * a;
    P.py -= 0.02;
  },
  /** Looks around with a lazily wandering head. */
  wander(t, a, k, st) {
    P.hy += wob(t * 0.8, st.seed) * 0.5 * a * (0.3 + 0.7 * k);
    P.hp += wob(t * 0.6, st.seed + 3) * 0.12 * a;
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.6)) * 0.035;
  },
  /** Twirls the weapon in the hand every so often. */
  flourish(t, a, k, st) {
    const c = (t * 0.2 + st.seed) % 1;
    P.rCant += ramp(c, 0.7, 0.9) * Math.PI * 2 * k;
    P.rW.y += bump(c, 0.7, 0.9) * 0.2 * a * k;
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.8)) * 0.035;
    P.hr += Math.sin(t * 0.8) * 0.04;
  },
  /** Tosses what it holds up and down in the palm. */
  toss(t, a, k) {
    const s = Math.abs(Math.sin(t * 2.4));
    P.rW.y += s * 0.3 * a * k;
    P.hp += (s - 0.5) * -0.12 * a * k;
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.8)) * 0.03;
  },
  /** Draws slow circles with the hands (casters, conductors). */
  conduct(t, a, k) {
    P.rW.x += Math.cos(t * 1.6) * 0.16 * a * k;
    P.rW.y += Math.sin(t * 1.6) * 0.16 * a * k;
    P.lW.x -= Math.cos(t * 1.6 + 1) * 0.16 * a * k;
    P.lW.y += Math.sin(t * 1.6 + 1) * 0.16 * a * k;
    P.py -= (0.5 + 0.5 * Math.sin(t * 1.6)) * 0.04;
    P.roll += Math.sin(t * 0.8) * 0.03 * a;
  },
  /** Shivers. */
  shiver(t, a) {
    P.px += Math.sin(t * 31) * 0.012 * a;
    P.twist += Math.sin(t * 27) * 0.02 * a;
    P.rW.x += Math.sin(t * 29) * 0.015 * a;
    P.py -= (0.5 + 0.5 * Math.sin(t * 2.2)) * 0.04 + 0.03;
    P.lean += 0.05 * a;
  },
  /** Chest out, slow proud breathing with a chin lift. */
  proud(t, a) {
    const s = 0.5 + 0.5 * Math.sin(t * 1.3);
    P.lean -= 0.05 * a + s * 0.02;
    P.hp -= 0.08 * a + s * 0.03;
    P.py -= s * 0.03;
    P.twist += Math.sin(t * 0.5) * 0.06 * a;
  },
  /** Prowls: slow twists from side to side, staying low. */
  prowl(t, a, k) {
    const s = Math.sin(t * 0.8);
    P.twist += s * 0.2 * a * k;
    P.hy += s * 0.25 * a * k;
    P.px += s * 0.08 * a;
    P.py -= 0.05 * a + (0.5 + 0.5 * Math.sin(t * 1.6)) * 0.03;
  },
  /** Mechanical: perfectly still, then a sharp servo turn of the head. */
  servo(t, a, k, st) {
    const c = t * 0.5 + st.seed;
    const i = Math.floor(c);
    const f = c - i;
    const h = (n) => Math.sin(n * 91.7 + st.seed * 3) > 0 ? 1 : -1;
    P.hy += lerp(h(i), h(i + 1), clamp((f - 0.85) / 0.06, 0, 1)) * 0.4 * a * (0.2 + 0.8 * k);
  },
  /** Stretches up on the toes and settles. */
  tiptoe(t, a) {
    const s = Math.max(0, Math.sin(t * 1.5));
    P.jump += s * 0.1 * a;
    P.rfPitch += s * 0.25 * a;
    P.lfPitch += s * 0.25 * a;
    P.rfLift += s * 0.1 * a;
    P.lfLift += s * 0.1 * a;
    P.lean -= s * 0.03;
  },
  /** Nods along. */
  nod(t, a) {
    P.hp += (0.5 + 0.5 * Math.sin(t * 3.1)) * 0.16 * a;
    P.py -= (0.5 + 0.5 * Math.sin(t * 3.1 + 0.5)) * 0.04;
  },
  none() {},
};

// ---------------------------------------------------------------- firing animations
const SOFT_FIRES = new Set(['cast', 'swing', 'chop', 'punch', 'beam', 'command', 'none']);
// (r: the kick, 1 at the shot easing to 0; s: seconds since the shot; a: amplitude; L: the left gun fired.)
const FIRES = {
  kick(r, s, a, L) {
    if (L) {
      P.lPitch -= r * 0.3 * a;
      P.lW.z -= r * 0.36 * a;
      P.lW.y += r * 0.05 * a;
    } else {
      P.rPitch -= r * 0.3 * a;
      P.rW.z -= r * 0.36 * a;
      P.rW.y += r * 0.05 * a;
    }
    P.lean -= r * 0.065 * a;
    P.pz -= r * 0.05 * a;
    P.hp -= r * 0.06 * a;
  },
  /** One-handed snap: the muzzle flips up hard. */
  snap(r, s, a, L) {
    if (L) {
      P.lPitch -= r * 0.7 * a;
      P.lW.y += r * 0.2 * a;
      P.lW.z -= r * 0.24 * a;
    } else {
      P.rPitch -= r * 0.7 * a;
      P.rW.y += r * 0.2 * a;
      P.rW.z -= r * 0.24 * a;
    }
    P.lean -= r * 0.04 * a;
  },
  /** A big gun: the whole body is shoved back and recovers slowly. */
  heavy(r, s, a) {
    const e = Math.exp(-s * 5) * (s < 0.03 ? s / 0.03 : 1);
    P.rW.z -= e * 0.6 * a;
    P.rPitch -= e * 0.36 * a;
    P.pz -= e * 0.34 * a;
    P.lean -= e * 0.2 * a;
    P.py -= e * 0.12 * a;
    P.hp -= e * 0.14 * a;
  },
  /** Automatic fire: a constant hard shake, leaning into the gun. */
  rattle(r, s, a, L, st, t) {
    const on = Math.max(r, ramp(0.3 - s, 0, 0.2));
    P.rW.z -= r * 0.22 * a;
    P.rW.y += Math.sin(t * 61) * 0.03 * a * on;
    P.rW.x += Math.sin(t * 47) * 0.03 * a * on;
    P.rPitch -= r * 0.1 * a + Math.sin(t * 53) * 0.02 * on;
    P.pz -= r * 0.04 * a;
    P.lean += on * 0.07 * a;
    P.twist += Math.sin(t * 43) * 0.02 * a * on;
    P.py -= on * 0.04 * a;
  },
  /** Shotgun: a kick, then the off hand racks the pump. */
  pump(r, s, a) {
    P.rPitch -= r * 0.42 * a;
    P.rW.z -= r * 0.42 * a;
    P.lean -= r * 0.11 * a;
    P.pz -= r * 0.08 * a;
    P.hp -= r * 0.08 * a;
    const b = bump(s, 0.14, 0.46);
    P.grip -= b * 0.42;
    P.rPitch += b * 0.1;
  },
  /** Bolt action: a kick, then the rifle rolls and dips while the bolt is worked. */
  bolt(r, s, a) {
    P.rPitch -= r * 0.34 * a;
    P.rW.z -= r * 0.4 * a;
    P.lean -= r * 0.1 * a;
    P.pz -= r * 0.07 * a;
    const b = bump(s, 0.2, 0.8);
    P.rCant -= b * 0.45;
    P.rPitch += b * 0.14;
    P.rW.y -= b * 0.12;
    P.hp -= b * 0.16;
    P.hr += b * 0.1;
  },
  /** Launcher / thrower: the body dips under the shot and rises again. */
  lob(r, s, a) {
    const e = Math.exp(-s * 4.5);
    P.py -= e * 0.16 * a;
    P.lean += e * 0.13 * a;
    P.rPitch -= r * 0.26 * a;
    P.rW.z -= e * 0.32 * a;
  },
  /** A spell: the hand thrusts out and the caster rises onto the toes. */
  cast(r, s, a, L) {
    const e = Math.exp(-s * 6);
    (L ? P.lW : P.rW).z += e * 0.32 * a;
    (L ? P.lW : P.rW).y += e * 0.12 * a;
    P.lean += e * 0.1 * a;
    P.twist += (L ? -1 : 1) * e * 0.14 * a;
    P.jump += e * 0.06 * a;
  },
  /** A melee swing: shoulders whip around and the weight goes onto the front foot. */
  swing(r, s, a) {
    P.twist += r * 0.5 * a;
    P.lean += r * 0.18 * a;
    P.pz += r * 0.14 * a;
    P.py -= r * 0.08 * a;
    P.rTuck -= r * 0.3;
    P.hy -= r * 0.25 * a;
  },
  /** An overhead chop: up on the toes, then slammed down. */
  chop(r, s, a) {
    P.lean += r * 0.3 * a;
    P.py -= r * 0.16 * a;
    P.pz += r * 0.1 * a;
    P.rTuck -= r * 0.3;
    P.hp += r * 0.15 * a;
  },
  /** Jabs: the shoulder of the punching arm drives forward. */
  punch(r, s, a, L) {
    P.twist += (L ? -1 : 1) * r * 0.42 * a;
    P.pz += r * 0.14 * a;
    P.lean += r * 0.1 * a;
    if (L) P.lTuck -= r * 0.4;
    else P.rTuck -= r * 0.4;
  },
  /** A little hop with every shot. */
  hop(r, s, a, L) {
    const j = bump(s, 0, 0.26);
    P.jump += j * 0.3 * a;
    P.rfLift += j * 0.3 * a;
    P.lfLift += j * 0.3 * a;
    FIRES.kick(r, s, a, L);
  },
  /** Fans the hammer: the off hand slaps across the gun. */
  fan(r, s, a) {
    P.rPitch -= r * 0.5 * a;
    P.rW.z -= r * 0.22 * a;
    P.lW.x -= bump(s, 0, 0.16) * 0.3;
    P.lW.z -= bump(s, 0, 0.16) * 0.15;
  },
  /** Shows off: after the shot the gun spins once around the hand. */
  spin(r, s, a, L) {
    FIRES.snap(r, s, a * 0.7, L);
    const k = ramp(s, 0.12, 0.5) * Math.PI * 2;
    if (L) P.lPitch -= k;
    else P.rPitch -= k;
  },
  /** A steady beam: a fine tremble while it burns. */
  beam(r, s, a, L, st, t) {
    const on = Math.max(r, ramp(0.25 - s, 0, 0.2));
    P.rW.y += Math.sin(t * 38) * 0.012 * a * on;
    P.rW.z -= on * 0.08 * a;
    P.lean += on * 0.06 * a;
    P.py -= on * 0.05 * a;
  },
  /** Twin guns: the firing side kicks and the shoulders rock with it. */
  akimbo(r, s, a, L) {
    FIRES.kick(r, s, a * 1.1, L);
    P.twist += (L ? 1 : -1) * r * 0.16 * a;
    P.roll += (L ? -1 : 1) * r * 0.03 * a;
  },
  /** Points and commands: the arm stabs forward and the chin comes up. */
  command(r, s, a) {
    const e = Math.exp(-s * 3);
    P.rW.z += e * 0.2 * a;
    P.rW.y += e * 0.1 * a;
    P.hp -= e * 0.12 * a;
    P.lean -= e * 0.06 * a;
  },
  /** Braces low with every shot: knees drop, gun stays level. */
  brace(r, s, a) {
    const e = Math.exp(-s * 6);
    P.py -= e * 0.2 * a;
    P.rW.z -= r * 0.36 * a;
    P.rPitch -= r * 0.18 * a;
    P.lean += e * 0.08 * a;
  },
  none() {},
};

// ---------------------------------------------------------------- off-hand gestures
// Where the free hand goes: [wrist position, elbow direction] in chest space for the LEFT arm
// (mirrored for the right).
export const GESTURES = {
  hip: [[1.12, 2.5, 0.22], [1, 0.1, -0.7]],
  back: [[0.32, 2.45, -0.62], [1, -0.3, -0.6]],
  side: [[1.62, 2.36, 0.08], [0.4, 0, -1]],
  chest: [[-0.15, 3.35, 0.66], [1, -0.7, 0]],
  salute: [[0.72, 5.02, 0.52], [1, -0.1, -0.1]],
  up: [[1.75, 5.5, 0.15], [1, 0, -0.4]],
  point: [[1.15, 4.1, 1.58], [0.6, -1, 0]],
  pocket: [[0.95, 2.28, 0.38], [1, 0, -0.5]],
  chin: [[0.2, 4.05, 0.78], [0.8, -1, 0]],
  visor: [[0.55, 5.0, 0.74], [1, -0.2, 0]],
  wide: [[2.5, 3.3, 0.45], [0.2, -1, -0.5]],
  head: [[0.55, 4.95, -0.5], [1, 0.3, -0.2]],
  guard: [[0.75, 3.9, 0.95], [1, -0.8, 0]],
  low: [[1.3, 2.7, 0.75], [1, -0.2, -0.6]],
  out: [[1.45, 3.35, 1.3], [1, -0.6, -0.3]],
  cross: [[-0.55, 3.25, 0.68], [1, -0.8, 0.1]],
  ear: [[0.86, 4.75, 0.18], [1, -0.4, 0.2]],
  rest: [[0.8, 2.9, 0.75], [1, -0.4, -0.5]],
};

const _built = { q: Qn(), d: V() };

/**
 * Solves one arm (all in chest space): shoulder `sh`, wrist target `W`, hand orientation `Qh`
 * (null: the hand follows the forearm). `q0` / `d0`: the arm's orientation and direction as built.
 */
function solveArm(G, fore, hand, sh, q0, d0, W, Qh, pole, stiff) {
  if (STIFF_LIMBS) {
    // A straight arm: it points from the shoulder at where the hand should be.
    _dU.subVectors(W, sh);
    if (_dU.lengthSq() < 1e-6) _dU.copy(d0);
    _dU.normalize();
    _dF.copy(_dU);
  } else if (stiff && Qh) {
    // A weapon wrapped around the forearm: the forearm itself has to aim.
    _f.copy(DOWN).applyQuaternion(Qh);
    _E.copy(W).addScaledVector(_f, -ARM_LOW);
    _dU.subVectors(_E, sh).normalize();
    _dF.copy(_f);
  } else {
    _d.subVectors(W, sh);
    const len = clamp(_d.length(), 0.5, ARM_UP + ARM_LOW - 0.0006);
    _d.normalize();
    const a = (ARM_UP * ARM_UP - ARM_LOW * ARM_LOW + len * len) / (2 * len);
    const hgt = Math.sqrt(Math.max(0, ARM_UP * ARM_UP - a * a));
    _perp.copy(pole).addScaledVector(_d, -pole.dot(_d));
    if (_perp.lengthSq() < 1e-6) _perp.set(0, 0, -1).addScaledVector(_d, _d.z);
    _perp.normalize();
    _E.copy(sh).addScaledVector(_d, a).addScaledVector(_perp, hgt);
    _dU.subVectors(_E, sh).normalize();
    _v4.copy(sh).addScaledVector(_d, len);
    _dF.subVectors(_v4, _E).normalize();
  }
  _q1.setFromUnitVectors(d0, _dU).multiply(q0); // upper arm
  G.quaternion.copy(_q1);
  _q2.setFromUnitVectors(_dU, _dF).multiply(_q1); // forearm
  fore.quaternion.copy(_q1).invert().multiply(_q2);
  if (Qh) hand.quaternion.copy(_q2).invert().multiply(Qh);
  else hand.quaternion.identity();
}

const _K = V();
const _yT = V();
const _qT = Qn();
const _qS = Qn();
/** Solves one leg in model space: hip `H`, ankle `A`, knee toward `pole`. */
function solveLeg(G, shin, foot, H, A, pole, qbi, yaw, pitch) {
  _d.subVectors(A, H);
  const len = clamp(_d.length(), 0.45, LEG_UP + LEG_LOW - 0.0006);
  _d.normalize();
  const a = (LEG_UP * LEG_UP - LEG_LOW * LEG_LOW + len * len) / (2 * len);
  const hgt = Math.sqrt(Math.max(0, LEG_UP * LEG_UP - a * a));
  _perp.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_perp.lengthSq() < 1e-6) _perp.set(0, 0, 1);
  _perp.normalize();
  if (STIFF_LIMBS) _K.copy(H).addScaledVector(_d, LEG_UP); // a straight leg
  else _K.copy(H).addScaledVector(_d, a).addScaledVector(_perp, hgt);
  _yT.subVectors(H, _K);
  basis(_qT, _yT, _perp);
  _v4.copy(H).addScaledVector(_d, len); // the ankle, as far as the leg reaches
  _yT.subVectors(_K, _v4);
  basis(_qS, _yT, _perp);
  G.quaternion.copy(qbi).multiply(_qT);
  shin.quaternion.copy(_qT).invert().multiply(_qS);
  _e.set(pitch * BEND, yaw * BEND, 0, 'YXZ');
  foot.quaternion.copy(_qS).invert().multiply(_q3.setFromEuler(_e));
}

const DEF_STANCE = {};
const DEF_HOLD = {};
const _rf = [0, 0, 0, 0, 0];
const _poleR = V();
const _poleL = V();
const _shR = V();
const _shL = V();
const _H = V();
const _A = V();
const _kp = V();
const _g = V();
const _gp = V();
const num = (v, d = 0) => (typeof v === 'number' ? v : d);

/** Blends one numeric field of the firing hold and the resting hold. */
const mix = (hold, rest, key, k, d = 0) => lerp(num(rest[key], num(hold[key], d)), num(hold[key], d), k);

/**
 * Poses a tower model for this frame.
 * o: { t (seconds, for idle motion), dt, recoil (1 at a shot, easing to 0), shots (shot counter),
 *      snap (true: jump straight to the firing pose, for sampling the muzzle) }
 */
export function poseTower(m, st, o) {
  const rig = m.rig;
  if (!rig || m.static || m.plane) return legacyTower(m, st, o);
  const vis = m.vis ?? {};
  const t = o.t;
  const r = o.recoil;

  // --- shot bookkeeping
  if (st.shots !== o.shots || r > st.prevRecoil + 0.3) {
    if (st.shots !== -1 || r > 0.3) {
      st.since = 0;
      st.n++;
    }
    st.shots = o.shots;
  }
  st.prevRecoil = r;
  st.since += o.dt;
  if (o.aim) st.since = Math.min(st.since, 0.05); // a beam is on: stay in the firing pose
  const s = st.since;
  const quick = vis.quick ?? 2.6;
  const wantAim = vis.rest === null ? 1 : s < quick ? 1 : 0;
  if (o.snap || (s === 0 && wantAim)) st.aim = 1;
  else st.aim = wantAim ? Math.min(1, st.aim + o.dt * 7) : Math.max(0, st.aim - o.dt * 1.6);
  const k = smooth(st.aim); // 1 = firing hold, 0 = resting hold
  const stance = vis.stance ?? DEF_STANCE;
  const hold = vis.hold ?? DEF_HOLD;
  const rest = vis.rest ?? hold;

  // --- which arms aim, which keep their built pose
  const pose = m.pose;
  const melee = !!(m.punch || m.swing);
  const rAim = rig.rFwd && !melee && !rig.armsMoved;
  const lDual = rig.lFwd && !melee && !rig.armsMoved && (rig.lHeld || rig.lMuz);
  const dual = (m.muzzles?.length ?? 0) > 1;
  const leftFired = m.punch ? o.shots % 2 === 0 : dual && lDual && o.shots % 2 === 0;

  resetP();
  const idle = vis.idle;
  const fire = vis.fire;
  if (idle) IDLES[idle[0]]?.(t + st.seed, idle[1] ?? 1, 1 - k * 0.7, st);
  else IDLES.breathe(t + st.seed, 1);
  // Guns kick harder the slower they fire (o.kick, from the tower's cooldown); swings and spells don't.
  const amp = melee || (fire && SOFT_FIRES.has(fire[0])) ? 1 : o.kick ?? 1;
  if (fire && s < 3) FIRES[fire[0]]?.(r, s, (fire[1] ?? 1) * amp, leftFired, st, t);
  else if (!fire && s < 1) FIRES[melee ? (m.punch ? 'punch' : 'swing') : 'kick'](r, s, amp, leftFired, st, t);

  // --- hips and chest
  const lock = rig.lockBody || rig.torsoCustom;
  const sc = rig.scale || 1;
  const yawAll = lock ? 0 : mix(hold, rest, 'yaw', k) + num(stance.yaw) + P.yaw;
  const split = num(stance.split, 0.55); // how much of the turn the hips take
  const bodyYaw = yawAll * split;
  const twist = lock ? 0 : yawAll * (1 - split) + P.twist;
  const lean = (lock ? 0 : num(stance.lean) + mix(hold, rest, 'lean', k)) + P.lean * (lock ? 0.3 : 1);
  const roll = lock ? 0 : num(stance.roll) + mix(hold, rest, 'roll', k) + P.roll;
  const floating = (m.lift || 0) > 0.25;
  _qb.setFromAxisAngle(Yax, bodyYaw);
  _qbi.copy(_qb).invert();
  _e.set(lean, twist, roll, 'YXZ');
  _qu.setFromEuler(_e);
  _pu.copy(WAIST).applyQuaternion(_qu).negate().add(WAIST);
  _qbu.copy(_qb).multiply(_qu);
  _qbui.copy(_qbu).invert();

  // Pelvis: as low as the stance asks, and low enough for both feet to reach the ground.
  let hipY = 2 - num(stance.drop) - mix(hold, rest, 'drop', k) + P.py;
  _pb.set(num(stance.px) + P.px, 0, num(stance.pz) + P.pz);
  const legs = !rig.legsCustom && !rig.torsoCustom;
  const feet = [];
  const fy = bodyYaw * num(stance.follow, 0.6); // the feet turn part of the way with the hips
  const fcs = Math.cos(fy);
  const fsn = Math.sin(fy);
  if (legs && !floating) {
    for (let i = 0; i < 2; i++) {
      const right = i === 0;
      const f = (right ? stance.rf : stance.lf) ?? _rf;
      const sx = right ? -1 : 1;
      const lift = num(f[3]) + (right ? P.rfLift : P.lfLift);
      const fx = sx * (0.5 + num(f[0]));
      const fz = num(f[1]) + (right ? P.rfZ : P.lfZ);
      const foot = {
        x: fx * fcs + fz * fsn,
        z: -fx * fsn + fz * fcs,
        y: SOLE + lift,
        yaw: sx * num(f[2]) + fy,
        pitch: num(f[4]) - (right ? P.rfPitch : P.lfPitch),
      };
      // The hip, turned with the body.
      _H.copy(right ? rig.hipR : rig.hipL).applyQuaternion(_qb).add(_pb);
      const hd2 = (foot.x - _H.x) ** 2 + (foot.z - _H.z) ** 2;
      const max = LEG_UP + LEG_LOW - 0.004;
      if (!f[5]) hipY = Math.min(hipY, foot.y + Math.sqrt(Math.max(0.2, max * max - hd2)));
      feet.push(foot);
    }
  }
  hipY += P.jump;
  _pb.y = hipY - 2;
  if (rig.torsoCustom) {
    m.body.position.y = (m.lift || 0) + Math.sin(t * 2) * (m.bob ?? (m.lift ? 0.15 : 0.04));
  } else {
    m.body.quaternion.copy(_qb);
    m.body.position.set(_pb.x * sc, _pb.y * sc + (m.lift || 0) + (m.bob ? Math.sin(t * 2) * m.bob : 0), _pb.z * sc);
    m.upper.quaternion.copy(_qu);
    m.upper.position.copy(_pu);
    rig.ground.quaternion.copy(_qbi);
    rig.ground.position.copy(_pb).negate().applyQuaternion(_qbi);
  }

  // --- legs
  if (legs) {
    if (floating) {
      // Hovering: the legs hang and trail.
      const a = Math.sin(t * 1.7 + st.seed) * 0.08;
      const fl = stance.float ?? [0.12, 0.45, -0.1, 0.3];
      m.rightLeg.rotation.set(-fl[0] + a, 0, -0.04);
      m.leftLeg.rotation.set(-fl[2] - a, 0, 0.04);
      rig.rShin.rotation.set((fl[1] + a) * BEND, 0, 0);
      rig.lShin.rotation.set((fl[3] - a) * BEND, 0, 0);
      rig.rFoot.rotation.set(0.35 * BEND, 0, 0);
      rig.lFoot.rotation.set(0.35 * BEND, 0, 0);
    } else {
      for (let i = 0; i < 2; i++) {
        const right = i === 0;
        const foot = feet[i];
        _H.copy(right ? rig.hipR : rig.hipL).applyQuaternion(_qb).add(_pb);
        _A.set(foot.x, foot.y + Math.sin(Math.max(0, foot.pitch)) * 0.45, foot.z);
        const kp = right ? stance.rk : stance.lk;
        if (kp) _kp.set(kp[0], kp[1], kp[2]);
        else _kp.set(Math.sin(foot.yaw), 0, Math.cos(foot.yaw));
        solveLeg(right ? m.rightLeg : m.leftLeg, right ? rig.rShin : rig.lShin, right ? rig.rFoot : rig.lFoot, _H, _A, _kp, _qbi, foot.yaw, foot.pitch);
      }
    }
  }

  // --- head: keeps facing the target while the body turns under it
  if (!rig.headCustom) {
    const face = lock ? 0 : -(bodyYaw + twist) * lerp(num(rest.look, 0.7), 1, k);
    const hd = m.head;
    hd.rotation.order = 'YXZ';
    hd.rotation.set(
      rig.headRot.x - lean * 0.85 + P.hp + mix(hold, rest, 'hp', k) + num(stance.hp),
      rig.headRot.y + clamp(face, -1.15, 1.15) + P.hy + mix(hold, rest, 'hy', k),
      rig.headRot.z - roll * 0.8 + P.hr + mix(hold, rest, 'hr', k),
    );
  }
  if (rig.armsMoved) return;

  // --- arms. Everything is solved in chest space; aim targets come from model space.
  // Where the chest has moved to (so held weapons follow the body's small motions).
  _chest.set(0, 4, 0).applyQuaternion(_qu).add(_pu).applyQuaternion(_qb).add(_pb);
  _chest.y -= 4;
  const toChest = (v) => v.sub(_pb).applyQuaternion(_qbi).sub(_pu).applyQuaternion(_q3.copy(_qu).invert());

  let px = pose?.right ?? rig.aimR.x;
  let plx = pose?.left ?? rig.aimL.x;
  if (m.punch) {
    px += leftFired ? 0 : r * m.swing;
    plx += leftFired ? r * m.swing : 0;
  } else if (m.swing) px += r * m.swing;

  // Right arm
  const tuckR = clamp(mix(hold, rest, 'tuck', k, melee || !rAim ? 0.12 : 0) + P.rTuck, 0, 0.6);
  const rp = hold.rp;
  _poleR.set(rp ? rp[0] : -0.7, rp ? rp[1] : -0.75, rp ? rp[2] : -0.35);
  let gunOK = false;
  if (rAim) {
    // The gun hand: locked to the aim direction (plus the hold's cant / the rest pose's tilt).
    _e.set(px, rig.aimR.y, rig.aimR.z, 'XYZ');
    _qA.setFromEuler(_e);
    _f.copy(DOWN).applyQuaternion(_qA);
    const pitch = mix(hold, rest, 'pitch', k) + P.rPitch;
    const turn = mix(hold, rest, 'turn', k) + P.rTurn;
    const cant = mix(hold, rest, 'cant', k) + P.rCant;
    _e.set(pitch, turn, 0, 'YXZ');
    _qH.setFromEuler(_e).multiply(_q1.setFromAxisAngle(_f, cant)).multiply(_qA);
    const hr = hold.r;
    const rr = rest.r ?? hr;
    if (hr) {
      _W.set(lerp(rr[0], hr[0], k), lerp(rr[1], hr[1], k), lerp(rr[2], hr[2], k)).add(_chest);
    } else {
      // No hold given: the arm stays straight out, as built.
      _W.copy(rig.shR).applyQuaternion(_qu).add(_pu).applyQuaternion(_qb).add(_pb).addScaledVector(_f, (ARM_UP + ARM_LOW) * (1 - tuckR));
    }
    _W.add(P.rW);
    // Gun axes in model space, for the off hand.
    _f.copy(DOWN).applyQuaternion(_qH);
    _up.copy(Z).applyQuaternion(_qH);
    _side.copy(X).applyQuaternion(_qH);
    _g.copy(_W);
    gunOK = true;
    toChest(_W);
    _qHl.copy(_qbui).multiply(_qH);
    solveArm(m.rightArm, rig.rFore, rig.rHand, rig.shR, rig.qR, rig.dR, _W, _qHl, _poleR, rig.rStiff);
  } else {
    const g = (k > 0.5 ? hold.rg : rest.rg ?? hold.rg);
    if (g && !rig.rHeld && !melee && GESTURES[g]) {
      const [w, pl] = GESTURES[g];
      _W.set(-w[0], w[1], w[2]).add(P.rW);
      _poleR.set(-pl[0], pl[1], pl[2]);
      solveArm(m.rightArm, rig.rFore, rig.rHand, rig.shR, rig.qR, rig.dR, _W, null, _poleR, false);
    } else {
      // As built (melee weapons, staffs, tools), with a bent elbow and the old swing.
      _e.set(px + mix(hold, rest, 'raise', k), rig.aimR.y, rig.aimR.z + mix(hold, rest, 'splay', k), 'XYZ');
      _qHl.setFromEuler(_e);
      _f.copy(DOWN).applyQuaternion(_qHl);
      _W.copy(rig.shR).addScaledVector(_f, (ARM_UP + ARM_LOW) * (1 - tuckR)).add(P.rW);
      // The elbow bends the natural way for wherever the arm points.
      if (!rp) _poleR.set(-0.6, _f.y > 0.3 ? 0.2 : -0.6, _f.z > 0.5 ? -0.2 : -0.7);
      solveArm(m.rightArm, rig.rFore, rig.rHand, rig.shR, rig.qR, rig.dR, _W, _qHl, _poleR, rig.rStiff);
    }
  }

  // Left arm
  const lp = hold.lp;
  const tuckL = clamp(mix(hold, rest, 'tuckL', k, melee || !rig.lFwd ? 0.12 : 0) + P.lTuck, 0, 0.6);
  if (lDual) {
    // A second gun: aims like the first.
    _e.set(plx, rig.aimL.y, rig.aimL.z, 'XYZ');
    _qA.setFromEuler(_e);
    _f.copy(DOWN).applyQuaternion(_qA);
    const pitch = mix(hold, rest, 'lpitch', k, mix(hold, rest, 'pitch', k)) + P.lPitch;
    const turn = mix(hold, rest, 'lturn', k, -mix(hold, rest, 'turn', k)) + P.lTurn;
    const cant = mix(hold, rest, 'lcant', k, -mix(hold, rest, 'cant', k)) + P.lCant;
    _e.set(pitch, turn, 0, 'YXZ');
    _qH.setFromEuler(_e).multiply(_q1.setFromAxisAngle(_f, cant)).multiply(_qA);
    const hl = hold.l2 ?? (hold.r ? [-hold.r[0], hold.r[1], hold.r[2]] : null);
    const rl = rest.l2 ?? (rest.r ? [-rest.r[0], rest.r[1], rest.r[2]] : hl);
    if (hl) _WL.set(lerp(rl[0], hl[0], k), lerp(rl[1], hl[1], k), lerp(rl[2], hl[2], k)).add(_chest);
    else _WL.copy(rig.shL).applyQuaternion(_qu).add(_pu).applyQuaternion(_qb).add(_pb).addScaledVector(_f, (ARM_UP + ARM_LOW) * (1 - tuckL));
    _WL.add(P.lW);
    toChest(_WL);
    _qHl.copy(_qbui).multiply(_qH);
    _poleL.set(lp ? lp[0] : 0.7, lp ? lp[1] : -0.75, lp ? lp[2] : -0.35);
    solveArm(m.leftArm, rig.lFore, rig.lHand, rig.shL, rig.qL, rig.dL, _WL, _qHl, _poleL, rig.lStiff);
    return;
  }
  // What the off hand does while firing and while resting: 1 holds the gun, 2 a gesture, 3 as built.
  const canGrip = gunOK && rig.lFwd && !rig.lHeld;
  const modeOf = (lg) => (canGrip && (lg == null || lg === 'grip' || lg === 'top') ? 1 : lg && !rig.lHeld && !m.punch && GESTURES[lg] ? 2 : 3);
  const lh = hold.l;
  const lr = rest.l === undefined ? lh : rest.l;
  const mh = modeOf(lh);
  const mr = modeOf(lr);
  let built = false;
  const target = (mode, lg, hd, W, pole) => {
    if (mode === 1) {
      // Supports the gun: as far forward along it as the arm reaches.
      const reach = rig.rReach;
      const want = clamp(num(hd.g, reach * 0.5) + P.grip, 0.1, Math.max(0.2, reach * 0.9));
      _shL.copy(rig.shL).applyQuaternion(_qu).add(_pu).applyQuaternion(_qb).add(_pb);
      const under = (lg === 'top' ? 0.36 : reach < 0.9 ? -0.34 : -0.3) + (rig.rUp || 0); // rUp: how high the gun sits on the hand (weapons.js)
      let gg = want;
      for (let i = 0; i < 6; i++) {
        _gp.copy(_g).addScaledVector(_f, 0.24 + gg).addScaledVector(_up, under).addScaledVector(_side, 0.06);
        if (_gp.distanceTo(_shL) <= ARM_UP + ARM_LOW - 0.03 || gg <= 0.1) break;
        gg = Math.max(0.1, gg - want / 5);
      }
      toChest(W.copy(_gp));
      if (lg === 'top') pole.set(1, 0.5, -0.2);
      else if (hd.lp) pole.set(hd.lp[0], hd.lp[1], hd.lp[2]);
      else pole.set(0.5, -1, -0.1);
    } else if (mode === 2) {
      const [w, pl] = GESTURES[lg];
      W.set(w[0], w[1], w[2]);
      pole.set(pl[0], pl[1], pl[2]);
    } else {
      built = true;
      _e.set(plx + num(hd.raiseL), rig.aimL.y, rig.aimL.z + num(hd.splayL), 'XYZ');
      _qHl.setFromEuler(_e);
      _v1.copy(DOWN).applyQuaternion(_qHl);
      W.copy(rig.shL).addScaledVector(_v1, (ARM_UP + ARM_LOW) * (1 - tuckL));
      if (hd.lp) pole.set(hd.lp[0], hd.lp[1], hd.lp[2]);
      else pole.set(0.6, _v1.y > 0.3 ? 0.2 : -0.6, _v1.z > 0.5 ? -0.2 : -0.7);
    }
  };
  if (k > 0.999 || (mh === mr && (mh !== 2 || lh === lr) && mh !== 1 && mh !== 3)) target(mh, lh, hold, _WL, _poleL);
  else if (k < 0.001) target(mr, lr, rest, _WL, _poleL);
  else {
    target(mr, lr, rest, _WL2, _poleL2);
    const b2 = built;
    built = false;
    target(mh, lh, hold, _WL, _poleL);
    built = built && b2;
    _WL.lerpVectors(_WL2, _WL, k);
    _poleL.lerpVectors(_poleL2, _poleL, k);
  }
  _WL.add(P.lW);
  solveArm(m.leftArm, rig.lFore, rig.lHand, rig.shL, rig.qL, rig.dL, _WL, built && mh === 3 && mr === 3 ? _qHl : null, _poleL, built && rig.lStiff);
}

// ---------------------------------------------------------------- enemies
// How an arm is carried while walking: [upper pitch, splay, elbow bend, upper swing, elbow swing,
// wrist droop, twist]. Pitch < 0 is forward; the elbow bends with negative values.
export const ARMS = {
  reach: [-1.45, 0.04, -0.12, 0.08, 0.05, 0.55, 0],
  reachLow: [-0.95, 0.1, -0.35, 0.12, 0.1, 0.45, 0],
  reachHigh: [-1.9, 0.12, -0.25, 0.08, 0.05, 0.3, 0],
  hang: [0.06, 0.07, -0.12, 0.22, 0.1, 0, 0],
  swing: [0, 0.1, -0.28, 0.55, 0.25, 0, 0],
  stiff: [0, 0.06, -0.04, 0.7, 0, 0, 0],
  pump: [0.15, 0.12, -1.5, 0.85, 0.2, 0, 0],
  claw: [-0.75, 0.28, -1.3, 0.14, 0.2, 0.5, 0],
  drag: [0.3, 0.16, -0.05, 0.06, 0.04, 0.25, 0],
  wide: [-0.12, 0.6, -0.55, 0.2, 0.15, 0, 0],
  high: [-2.75, 0.3, -0.45, 0.08, 0.1, 0, 0],
  back: [0.5, -0.12, -0.95, 0.03, 0, 0, 0.5],
  hip: [0.35, 0.62, -1.75, 0.03, 0, 0, 0.3],
  trail: [0.95, 0.22, -0.1, 0.06, 0.03, 0, 0],
  ape: [-0.55, 0.22, -0.12, 0.3, 0.05, 0.2, 0],
  bot: [-0.2, 0.08, -1.35, 0.35, 0, 0, 0],
  chest: [-0.35, 0.05, -2.0, 0.04, 0.04, 0, 0.7],
  // arms that carry something: the forearm stays near level, so the thing keeps its heading
  carry: [-0.5, 0.1, -1.07, 0.1, 0, 0, 0],
  carryHigh: [-0.95, 0.16, -0.95, 0.08, 0, 0, 0],
  carryLow: [-0.2, 0.12, -1.05, 0.14, 0, 0, 0],
  thrust: [-1.3, 0.02, -0.27, 0.06, 0, 0, 0],
  tuck: [-0.3, -0.05, -1.3, 0.05, 0, 0, 0.25],
};

function setUpper(m, lean, twist, roll) {
  _e.set(lean, twist, roll, 'YXZ');
  _qu.setFromEuler(_e);
  m.upper.quaternion.copy(_qu);
  m.upper.position.copy(WAIST).applyQuaternion(_qu).negate().add(WAIST);
}

/**
 * Walks an enemy for this frame, in its own gait (m.gait, from visuals.js gaitFor).
 * o: { phase (walk cycle, advances with the distance walked), t (seconds), atk (0..1 while it
 *      swings at something, else -1), dance, fly }
 * Returns false when the model has no rig or gait (the caller then uses the old animation).
 */
export function poseEnemy(m, st, o) {
  const rig = m.rig;
  const g = m.gait;
  if (!rig || !g) return false;
  const t = o.t + (st.seed ?? 0);
  const ph = o.phase * g.cad;
  let sn = Math.sin(ph);
  let cs = Math.cos(ph);
  if (g.snap) {
    // Machines move in firm, clipped steps.
    sn = Math.sign(sn) * Math.abs(sn) ** 0.45;
    cs = Math.sign(cs) * Math.abs(cs) ** 0.45;
  }
  const sc = rig.scale || 1;
  let tw = 0; // jitter: sudden little glitches
  if (g.jitter) {
    const n = Math.floor(t * 2.2);
    const h = Math.sin(n * 91.7 + (st.seed ?? 0) * 13) * 43758.5;
    const f = h - Math.floor(h);
    if (f > 0.55) tw = (f - 0.775) * 4.4 * g.jitter * (t * 2.2 - n < 0.35 ? 1 : 0);
  }

  // --- legs
  let hip = 0;
  const float = g.float || o.fly;
  if (!rig.legsCustom) {
    if (float) {
      const a = Math.sin(t * 1.7) * 0.1;
      m.rightLeg.rotation.set(g.trail + a, 0, -0.05);
      m.leftLeg.rotation.set(g.trail * 0.55 - a, 0, 0.05);
      rig.rShin.rotation.x = (0.55 + a) * BEND;
      rig.lShin.rotation.x = (0.3 - a) * BEND;
      rig.rFoot.rotation.x = rig.lFoot.rotation.x = 0.5 * BEND;
      hip = 0.25 + Math.sin(t * 2.3) * 0.16;
    } else {
      let best = 0;
      for (let i = 0; i < 2; i++) {
        const right = i === 0;
        const sx = right ? -1 : 1;
        const s = g.hop ? sn : right ? sn : -sn;
        const c = g.hop ? cs : right ? cs : -cs;
        const lk = right === g.limpRight ? 1 - g.limp * 0.65 : 1;
        const sw = Math.max(0, c); // 1 in the middle of the swing forward
        const A = -g.crouch - g.stride * lk * s;
        const K = (2 * g.crouch + 0.05 + g.knee * lk * sw ** 1.3) * BEND;
        const leg = right ? m.rightLeg : m.leftLeg;
        leg.rotation.set(A, sx * -g.toeOut, sx * g.width);
        (right ? rig.rShin : rig.lShin).rotation.x = K;
        (right ? rig.rFoot : rig.lFoot).rotation.x = (-(A + K) + sw * 0.4 + g.tip) * BEND;
        const reach = (LEG_UP * Math.cos(A) + LEG_LOW * Math.cos(A + K)) * Math.cos(g.width) + SOLE * Math.cos(g.tip * BEND);
        if (reach > best) best = reach;
      }
      hip = best - (LEG_UP + LEG_LOW + SOLE) + g.bounce * Math.abs(g.hop ? Math.max(0, cs) : sn);
    }
  }
  const dance = o.dance ? 1 : 0;
  m.body.position.y = rig.bodyY + (hip + (dance ? Math.abs(Math.sin(t * 8)) * 0.6 : 0)) * sc;
  if (!rig.torsoCustom) {
    m.body.rotation.z = -g.sway * cs + (g.limp ? g.limp * 0.07 * (g.limpRight ? 1 : -1) * Math.max(0, g.limpRight ? -cs : cs) : 0);
    m.body.rotation.y = dance ? Math.sin(t * 6) * 0.7 : g.hips * sn;
    setUpper(m, g.lean + g.nod * Math.abs(sn) + (float ? Math.sin(t * 1.3) * 0.05 : 0) + tw * 0.2, -g.twist * sn - m.body.rotation.y * 0.5 + tw * 0.5, g.roll + g.sway * cs * 0.6 + tw * 0.3);
  }

  // --- head
  if (!rig.headCustom && m.head) {
    const hr = rig.headRot;
    m.head.rotation.set(hr.x + g.headP - g.lean * 0.6 + Math.sin(ph * 2 + 1) * g.headBob, hr.y + Math.sin(t * g.lookRate) * g.look + tw * 1.5, hr.z + g.headR + Math.sin(t * 0.9 + 2) * g.headLoll + tw);
  }

  // --- arms
  const f = o.atk;
  for (let i = 0; i < 2; i++) {
    const right = i === 0;
    const sx = right ? -1 : 1;
    const arm = right ? m.rightArm : m.leftArm;
    const fore = right ? rig.rFore : rig.lFore;
    const hand = right ? rig.rHand : rig.lHand;
    const aim = right ? rig.aimR : rig.aimL;
    const stiff = STIFF_LIMBS || (right ? rig.rStiff : rig.lStiff);
    if (f >= 0) {
      // Attack: both arms go up over the head, then chop down.
      const a = f < 0.6 ? -Math.PI * 0.95 * (f / 0.6) : -Math.PI * 0.95 + (Math.PI * 0.6 * (f - 0.6)) / 0.4;
      arm.rotation.set(a, aim.y, aim.z);
      fore.rotation.x = stiff ? 0 : -0.25;
      continue;
    }
    if (dance) {
      arm.rotation.set(-Math.PI + Math.sin(t * 8) * 0.5 * -sx, aim.y, aim.z + sx * 0.25);
      fore.rotation.x = stiff ? 0 : -0.5;
      continue;
    }
    const a = right ? g.armR : g.armL;
    const s = (right ? sn : -sn) * (g.hop ? 0.4 : 1); // back when the leg on this side is forward
    const drift = g.wob ? wob(t * 0.9, i * 3.1 + (st.seed ?? 0)) * g.wob : 0;
    let ux = a[0] + a[3] * s * g.armSwing + drift + (i ? tw : -tw);
    let fx = a[2] + a[4] * s * g.armSwing + drift * 0.5;
    if (rig.armsMoved) {
      arm.rotation.x = aim.x + a[3] * s * 0.3;
      continue;
    }
    if (stiff) {
      // An arm that can't bend (a huge fist, a plated sleeve) swings whole.
      ux += fx * 0.55;
      fx = 0;
    }
    arm.rotation.set(ux, aim.y - sx * a[6], aim.z + sx * a[1]);
    fore.rotation.x = fx;
    hand.rotation.x = a[5];
  }
  return true;
}
