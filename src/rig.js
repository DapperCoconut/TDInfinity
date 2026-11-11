import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Visuals 2.0 rig: the pieces every character is built from (round heads, bevelled bodies,
// elbows and knees) and the passes that turn a finished blocky model into a jointed one.
//
//   makeHumanoid (models.js) builds the body out of these geometries, straight-limbed.
//   conformHead(h) reshapes what a model builder put on the head so it fits a round head.
//   rigify(h) adds elbows and knees and sorts every attached part onto the right bone.
//
// Characters face +Z; their right side is -X. Limbs hang along -Y from their pivot.

export const HEAD_R = 0.62;
export const HEAD_H = 1.22;

const cache = new Map();
const cached = (key, make) => {
  let g = cache.get(key);
  if (!g) cache.set(key, (g = make()));
  return g;
};

/** A box with softly rounded edges (same size and centre as a BoxGeometry). */
export function bevelGeo(w, h, d, r = 0.08) {
  r = Math.min(r, w / 2.01, h / 2.01, d / 2.01);
  return cached(`b|${w}|${h}|${d}|${r}`, () => new RoundedBoxGeometry(w, h, d, 1, r));
}

/** Surface of revolution from a profile of [radius, y] points; rx / rz stretch it into an oval. */
function latheGeo(profile, seg, rx = 1, rz = 1) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y));
  const g = new THREE.LatheGeometry(pts, seg);
  if (rx !== 1 || rz !== 1) g.scale(rx, 1, rz);
  g.computeVertexNormals();
  return g;
}

/** Points of a quarter-circle fillet from angle a0 to a1 around (cx, cy). */
function arc(cx, cy, r, a0, a1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/**
 * The classic round head: a cylinder with rounded top and bottom edges, sitting on y = 0.
 * Group 0 is the front half (it takes the face texture, projected flat from the front, so faces
 * drawn for a square head still read the same); group 1 is the back half.
 */
export function headGeo() {
  return cached('head', () => {
    const R = HEAD_R;
    const H = HEAD_H;
    const b = 0.2;
    const prof = [[0, 0], ...arc(R - b, b, b, -Math.PI / 2, 0, 4), ...arc(R - b, H - b, b, 0, Math.PI / 2, 4), [0, H]];
    const src = latheGeo(prof, 22).toNonIndexed();
    const pos = src.attributes.position;
    const nor = src.attributes.normal;
    const front = [];
    const back = [];
    for (let i = 0; i < pos.count; i += 3) {
      const z = pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2);
      (z > 0 ? front : back).push(i);
    }
    const n = pos.count;
    const P = new Float32Array(n * 3);
    const N = new Float32Array(n * 3);
    const U = new Float32Array(n * 2);
    let k = 0;
    for (const i of [...front, ...back]) {
      for (let j = 0; j < 3; j++, k++) {
        const x = pos.getX(i + j);
        const y = pos.getY(i + j);
        P.set([x, y, pos.getZ(i + j)], k * 3);
        N.set([nor.getX(i + j), nor.getY(i + j), nor.getZ(i + j)], k * 3);
        U.set([x / (2 * 0.6) + 0.5, y / H], k * 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    g.addGroup(0, front.length * 3, 0);
    g.addGroup(front.length * 3, back.length * 3, 1);
    src.dispose();
    return g;
  });
}

/** A round (or oval) cap / disc / drum with slightly eased edges, centred like a box of w x h x d. */
export function capGeo(w, h, d) {
  return cached(`cap|${w}|${h}|${d}`, () => {
    const r = w / 2;
    const b = Math.min(0.09, h * 0.3, r * 0.3);
    const y0 = -h / 2;
    const y1 = h / 2;
    const prof = [[0, y0], [r - b, y0], [r, y0 + b], [r, y1 - b], [r - b, y1], [0, y1]];
    const g = latheGeo(prof, 20, 1, d / w).toNonIndexed();
    g.computeVertexNormals(); // flat faces: a crisp chamfer, like the boxes around it
    return g;
  });
}

/** A dome (half an oval ball) sitting on y = -h/2: bowl helmets, hair. */
export function domeGeo(w, h, d) {
  return cached(`dome|${w}|${h}|${d}`, () => {
    const r = w / 2;
    const prof = [];
    for (let i = 0; i <= 5; i++) {
      const a = (i / 5) * (Math.PI / 2);
      prof.push([Math.cos(a) * r, -h / 2 + Math.sin(a) * h]);
    }
    prof.unshift([0, -h / 2]);
    return latheGeo(prof, 18, 1, d / w);
  });
}

/**
 * A curved band hugging a cylinder of radius `r`: `thick` deep, `h` tall, `arcLen` wide (measured
 * along the curve), centred on +Z. Glasses, visors, straps and badges on a round head.
 */
export function bandGeo(r, thick, h, arcLen) {
  const ang = Math.min(arcLen / r, Math.PI * 1.9);
  return cached(`band|${r.toFixed(3)}|${thick}|${h}|${ang.toFixed(3)}`, () => {
    const n = Math.max(2, Math.ceil(ang / 0.22));
    const r0 = r;
    const r1 = r + thick;
    const y0 = -h / 2;
    const y1 = h / 2;
    const P = [];
    const quad = (a, b, c, d) => P.push(...a, ...b, ...c, ...a, ...c, ...d);
    const at = (rad, a, y) => [Math.sin(a) * rad, y, Math.cos(a) * rad];
    for (let i = 0; i < n; i++) {
      const a = -ang / 2 + (ang * i) / n;
      const b = -ang / 2 + (ang * (i + 1)) / n;
      quad(at(r1, a, y0), at(r1, b, y0), at(r1, b, y1), at(r1, a, y1)); // outside
      quad(at(r0, b, y0), at(r0, a, y0), at(r0, a, y1), at(r0, b, y1)); // inside
      quad(at(r1, a, y1), at(r1, b, y1), at(r0, b, y1), at(r0, a, y1)); // top
      quad(at(r0, a, y0), at(r0, b, y0), at(r1, b, y0), at(r1, a, y0)); // bottom
    }
    const a = -ang / 2;
    const b = ang / 2;
    quad(at(r0, a, y0), at(r1, a, y0), at(r1, a, y1), at(r0, a, y1));
    quad(at(r1, b, y0), at(r0, b, y0), at(r0, b, y1), at(r1, b, y1));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    g.computeVertexNormals();
    return g;
  });
}

const plainBox = (w, h, d) => cached(`box|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d));

/** A ball joint (elbows, knees, shoulders). */
export function ballGeo(r) {
  return cached(`ball|${r}`, () => new THREE.SphereGeometry(r, 12, 8));
}

/** A cylinder along Y (cached). */
export function tubeGeo(rt, rb, h, seg = 12) {
  return cached(`tube|${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}

const isPlainBox = (m) =>
  m.isMesh && m.geometry?.type === 'BoxGeometry' && !Array.isArray(m.material) && m.rotation.x === 0 && m.rotation.y === 0 && m.rotation.z === 0 && m.scale.x === 1 && m.scale.y === 1 && m.scale.z === 1;

/**
 * Model builders dress the head with boxes sized for a square head. This reshapes those boxes for
 * the round one: helmets, hats and hair become round, visors and glasses wrap around the face,
 * and small badges and lenses sit on the curve instead of floating in front of it.
 */
export function conformHead(h) {
  const head = h.head;
  if (!head || head.userData.conformed || !head.children[0]?.userData.roundHead) return;
  head.userData.conformed = true;
  for (const m of [...head.children].slice(1)) {
    if (!isPlainBox(m)) continue;
    const { width: w, height: hh, depth: d } = m.geometry.parameters;
    const { x, y, z } = m.position;
    if (w >= 1.1 && d >= 1.0 && Math.abs(x) <= 0.12 && Math.abs(z) <= 0.3 && Math.min(w, d) / Math.max(w, d) >= 0.78) {
      // Wraps the whole head: helmets, hoods, hair, hat crowns and brims.
      m.geometry = capGeo(w, hh, d);
      continue;
    }
    if (d <= 0.3 && Math.abs(z) - d / 2 >= 0.4 && w <= 1.75) {
      // A plate on the face (or the back of the head).
      const back = z < 0;
      const r = Math.max(HEAD_R, Math.abs(z) - d / 2);
      if (w >= 0.75 && Math.abs(x) <= 0.2) {
        m.geometry = bandGeo(r, d, hh, w * 1.08);
        m.position.set(0, y, 0);
        m.rotation.y = (back ? Math.PI : 0) + (back ? -x : x) / r;
      } else if (Math.abs(x) >= 0.15) {
        const a = Math.max(-1.25, Math.min(1.25, x / 0.6));
        const rr = r + d / 2;
        m.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr * (back ? -1 : 1));
        m.rotation.y = back ? -a : a;
      }
      continue;
    }
    if (w <= 0.3 && Math.abs(x) - w / 2 >= 0.4 && d >= 0.75 && d <= 1.75 && Math.abs(z) <= 0.2) {
      // A plate on the side of the head (hair sides, cheek guards).
      const r = Math.max(HEAD_R, Math.abs(x) - w / 2);
      m.geometry = bandGeo(r, w, hh, d * 1.08);
      m.position.set(0, y, 0);
      m.rotation.y = (x > 0 ? Math.PI / 2 : -Math.PI / 2) - (x > 0 ? z : -z) / r;
    }
  }
}

const _box = new THREE.Box3();
const _m4 = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _v = new THREE.Vector3();

/** Bounding box of `obj` (and everything under it) in the space of its ancestor `anc`. */
export function localBox(obj, anc, out = new THREE.Box3()) {
  out.makeEmpty();
  anc.updateMatrixWorld(true);
  _inv.copy(anc.matrixWorld).invert();
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _m4.multiplyMatrices(_inv, o.matrixWorld);
    _box.copy(o.geometry.boundingBox).applyMatrix4(_m4);
    out.union(_box);
  });
  if (out.isEmpty()) {
    obj.getWorldPosition(_v).applyMatrix4(_inv);
    out.expandByPoint(_v);
  }
  return out;
}

export const ARM_UP = 1; // shoulder -> elbow
export const ARM_LOW = 0.66; // elbow -> wrist
export const LEG_UP = 1; // hip -> knee
export const LEG_LOW = 0.78; // knee -> ankle
export const SOLE = 0.22; // ankle -> sole of the shoe

/**
 * Splits limb group `G` (2 long, hanging along -Y) into three bones: the limb itself (upper arm /
 * thigh), a lower group at the elbow / knee, and an end group at the wrist / ankle. Everything the
 * builder attached is sorted onto the bone it sits on, and plain boxes that span the middle joint
 * are cut in two. Returns { low, end, held, stiff }.
 */
function joint(G, own, isArm) {
  const lowLen = isArm ? ARM_LOW : LEG_LOW;
  const low = new THREE.Group();
  low.position.set(0, -1, 0);
  const end = new THREE.Group();
  end.position.set(0, -lowLen, 0);
  low.add(end);
  const kids = [...G.children];
  G.add(low);
  const endY = -1 - lowLen; // the wrist / ankle, in limb space
  const toLow = (c) => {
    c.position.y += 1;
    low.add(c);
  };
  const toEnd = (c) => {
    c.position.y -= endY;
    end.add(c);
  };
  let held = 0;
  let stiff = false;
  const items = []; // what the hand holds (weapons.js works on these)
  const b = new THREE.Box3();
  for (const c of kids) {
    if (c === own) {
      for (const m of own.userData.lower) {
        m.visible = m.visible && own.visible;
        toLow(m);
      }
      for (const m of own.userData.end) {
        m.visible = m.visible && own.visible;
        toEnd(m);
      }
      continue;
    }
    localBox(c, G, b);
    const mid = (b.min.y + b.max.y) / 2;
    const span = b.min.y < -1.3 && b.max.y > -0.7;
    if (span && isPlainBox(c) && !c.children.length) {
      // A sleeve / armour box over the whole limb: cut it at the joint (and again at the wrist).
      const { width, height, depth } = c.geometry.parameters;
      const top = c.position.y + height / 2;
      const bot = c.position.y - height / 2;
      const cut = isArm && bot < endY - 0.12 ? endY : bot;
      const piece = (y1, y0, into) => {
        const m = c.clone();
        m.geometry = plainBox(width, y1 - y0, depth);
        m.position.y = (y1 + y0) / 2;
        into(m);
      };
      piece(-1, cut, toLow);
      if (cut > bot) piece(cut, bot, toEnd);
      c.geometry = plainBox(width, top + 1, depth);
      c.position.y = -1 + (top + 1) / 2;
      continue;
    }
    if (mid >= -1.02 && b.min.y > -1.95) continue; // stays on the upper bone
    if (isArm ? mid < -1.6 || b.min.y < -2.06 : mid < -1.62 && b.max.y < -1.2) {
      toEnd(c);
      if (isArm) {
        held++;
        items.push(c);
        // Something wrapped around the whole forearm (arm cannons, gauntlets): the wrist stays straight.
        if (b.max.y > -1.25 && (b.max.x - b.min.x >= 0.8 || b.max.z - b.min.z >= 0.8)) stiff = true;
      }
    } else toLow(c);
  }
  return { low, end, held, stiff, items };
}

const near = (a, b, e = 0.06) => Math.abs(a - b) <= e;
const zero = (r) => r.x === 0 && r.y === 0 && r.z === 0;
const under = (o, anc) => {
  for (let p = o; p; p = p.parent) if (p === anc) return true;
  return false;
};

/**
 * Gives a finished humanoid model elbows, wrists, knees and ankles (h.rig), so the pose engine
 * (anim.js) can bend it. Parts the builder attached are sorted onto the bone they sit on.
 * Models whose builders moved the body around themselves keep those parts exactly as built.
 */
export function rigify(h) {
  if (h.rig !== undefined) return h.rig;
  h.rig = null;
  const { rightArm: ra, leftArm: la, rightLeg: rl, leftLeg: ll, upper, body, torso, head } = h;
  if (!upper || !ra || !la || !rl || !ll || !torso || !head) return null;
  const owns = [ra, la, rl, ll].map((g) => g.children[0]);
  if (owns.some((o) => !o?.userData.lower)) return null;
  h.root.updateMatrixWorld(true);
  conformHead(h);

  const rig = { h };
  // Did the builder pose the body itself? Then that part stays as built.
  rig.armsMoved = !(near(ra.position.x, -1.5, 0.35) && near(la.position.x, 1.5, 0.35) && near(ra.position.y, 4, 0.2) && near(la.position.y, 4, 0.2) && near(ra.position.z, 0, 0.15) && near(la.position.z, 0, 0.15));
  rig.legsCustom = !(zero(rl.rotation) && zero(ll.rotation) && near(rl.position.y, 2) && near(ll.position.y, 2) && near(rl.position.x, -0.5, 0.2) && near(ll.position.x, 0.5, 0.2) && near(rl.position.z, 0) && near(ll.position.z, 0)) || !owns[2].visible || !owns[3].visible || rl.parent !== body || ll.parent !== body;
  rig.torsoCustom = !(zero(torso.rotation) && zero(body.rotation) && zero(upper.rotation) && near(torso.position.y, 3) && near(torso.position.x, 0) && near(torso.position.z, 0) && near(body.position.x, 0) && near(body.position.z, 0));
  rig.headCustom = !(zero(head.rotation) && near(head.position.y, 4, 0.12) && near(head.position.x, 0) && near(head.position.z, 0));
  rig.scale = body.scale.y;

  // Things hung on the body above the waist follow the chest when it leans and twists; things
  // standing on the ground (ammo boxes, bipods, pedestals) stay put when the hips move.
  const ground = new THREE.Group();
  body.add(ground);
  rig.ground = ground;
  const b = new THREE.Box3();
  for (const c of [...body.children]) {
    if (c === upper || c === rl || c === ll || c === ground) continue;
    localBox(c, body, b);
    if (b.min.y >= 1.6 || (b.min.y + b.max.y) / 2 >= 2.6) upper.add(c);
    else if (!h.lift && (b.max.y <= 1.3 || (b.min.y <= 0.2 && (b.min.y + b.max.y) / 2 < 1.3))) ground.add(c);
  }

  const R = joint(ra, owns[0], true);
  const L = joint(la, owns[1], true);
  const RL = joint(rl, owns[2], false);
  const LL = joint(ll, owns[3], false);
  rig.rFore = R.low;
  rig.rHand = R.end;
  rig.lFore = L.low;
  rig.lHand = L.end;
  rig.rShin = RL.low;
  rig.rFoot = RL.end;
  rig.lShin = LL.low;
  rig.lFoot = LL.end;
  rig.rStiff = R.stiff;
  rig.lStiff = L.stiff;
  rig.rItems = R.items;
  rig.lItems = L.items;
  rig.aimR = ra.rotation.clone();
  rig.aimL = la.rotation.clone();
  rig.qR = ra.quaternion.clone();
  rig.qL = la.quaternion.clone();
  rig.dR = new THREE.Vector3(0, -1, 0).applyQuaternion(rig.qR);
  rig.dL = new THREE.Vector3(0, -1, 0).applyQuaternion(rig.qL);
  rig.shR = ra.position.clone();
  rig.shL = la.position.clone();
  rig.hipR = rl.position.clone();
  rig.hipL = ll.position.clone();
  rig.headPos = head.position.clone();
  rig.headRot = head.rotation.clone();
  rig.rHeld = R.held > 0;
  rig.lHeld = L.held > 0;
  const fwd = (r) => r.x < -0.85 && r.x > -2.3 && Math.abs(r.y) < 0.6 && Math.abs(r.z) < 0.9;
  rig.rFwd = fwd(ra.rotation);
  rig.lFwd = fwd(la.rotation);
  rig.bodyY = body.position.y;
  // How far what each hand holds reaches past the hand, and whether it shoots.
  const reach = (hand) => {
    hand.updateMatrixWorld(true);
    localBox(hand, hand, b);
    return Math.max(0, -b.min.y - 0.34);
  };
  h.root.updateMatrixWorld(true);
  rig.rReach = rig.rHeld ? reach(R.end) : 0;
  rig.lReach = rig.lHeld ? reach(L.end) : 0;
  const muzzles = h.muzzles ?? [];
  rig.rMuz = muzzles.some((m) => under(m, ra));
  rig.lMuz = muzzles.some((m) => under(m, la));
  // A weapon built into the chest, head or back has to keep pointing at the target.
  rig.lockBody = muzzles.some((m) => under(m, body) && !under(m, ra) && !under(m, la)) || !!h.lamp;
  h.rig = rig;
  return rig;
}
