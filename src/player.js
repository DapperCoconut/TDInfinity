import * as THREE from 'three';
import { makeHumanoid } from './models.js';
import { BOUNDS } from './sim/path.js';
import { clamp, lerpAngle } from './utils.js';
import { PLAYER_SCALE } from './scale.js';

// The player is drawn at its original size inside the 3x-smaller map, so its movement (in sim
// units) is scaled up by the same amount to look and feel the same.
const P = PLAYER_SCALE;
const SPEED = 16 * P;
const JUMP = 18.5 * P; // just enough to hop onto the castle walls
const GRAVITY = 48 * P;
const RADIUS = 0.9 * P;
const STEP = 0.3 * P; // how far below an object's top our feet can be and still land on it
const LAND_PAD = RADIUS * 0.5; // our feet can hang this far over an edge and still stand on it

// Colliders are solid shapes you can stand on top of: a circle { x, z, r, h } or an axis-aligned
// box { x, z, hx, hz, h } (half sizes), both h tall from the ground.
function over(o, x, z, pad) {
  if (o.hx !== undefined) return Math.abs(x - o.x) < o.hx + pad && Math.abs(z - o.z) < o.hz + pad;
  return Math.hypot(x - o.x, z - o.z) < o.r + pad;
}

/** Pushes pos (x, z) out of collider o's footprint, keeping `rad` away from it. */
function pushOut(o, pos, rad) {
  if (o.hx === undefined) {
    const dx = pos.x - o.x;
    const dz = pos.z - o.z;
    const d = Math.hypot(dx, dz);
    const min = o.r + rad;
    if (d < min && d > 1e-4) {
      pos.x = o.x + (dx / d) * min;
      pos.z = o.z + (dz / d) * min;
    }
    return;
  }
  const cx = clamp(pos.x, o.x - o.hx, o.x + o.hx);
  const cz = clamp(pos.z, o.z - o.hz, o.z + o.hz);
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const d = Math.hypot(dx, dz);
  if (d >= rad) return;
  if (d > 1e-4) {
    pos.x = cx + (dx / d) * rad;
    pos.z = cz + (dz / d) * rad;
    return;
  }
  // Center inside the box: out through the nearest face.
  const ex = o.hx - Math.abs(pos.x - o.x);
  const ez = o.hz - Math.abs(pos.z - o.z);
  if (ex < ez) pos.x = o.x + Math.sign(pos.x - o.x || 1) * (o.hx + rad);
  else pos.z = o.z + Math.sign(pos.z - o.z || 1) * (o.hz + rad);
}

/**
 * Gives colliders the height of what is really drawn there, so nothing is an invisible wall and
 * everything can be jumped onto: it looks straight down at the built map (`world`, in sim units
 * inside its parent) over each collider. Big colliders are cut into small boxes first, so a tent
 * or a cone gets steps that follow its shape. Colliders marked `top` (cliff tops), `terrain`
 * (grid ground), `hole` (a pit's edge) or `fixed` (shaped by hand) are left alone.
 * Returns the new list.
 */
export function fitColliders(list, world) {
  const frame = world.parent ?? world;
  frame.updateMatrixWorld(true);
  const meshes = [];
  const k = frame.getWorldScale(new THREE.Vector3()).x; // drawn units per sim unit
  world.traverse((o) => {
    if (!o.isMesh || o.material?.transparent || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const box = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if (box.max.x - box.min.x > 120 * k || box.max.z - box.min.z > 120 * k) return; // the ground, sea and sky: nothing to stand on
    meshes.push({ o, box });
  });
  const above = meshes.reduce((y, m) => Math.max(y, m.box.max.y), 0) + 1; // start rays above everything
  // Meshes bucketed by where they stand, so each ray only tests the ones near it.
  const B = 6 * k;
  const buckets = new Map();
  for (const m of meshes) {
    for (let bx = Math.floor(m.box.min.x / B); bx <= Math.floor(m.box.max.x / B); bx++) {
      for (let bz = Math.floor(m.box.min.z / B); bz <= Math.floor(m.box.max.z / B); bz++) {
        const k = `${bx},${bz}`;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(m);
      }
    }
  }
  const ray = new THREE.Raycaster();
  const from = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const local = new THREE.Vector3();
  /** Height (sim units) of the highest drawn thing at map point (x, z). */
  const topAt = (x, z) => {
    from.set(x, 0, z);
    frame.localToWorld(from);
    const cands = (buckets.get(`${Math.floor(from.x / B)},${Math.floor(from.z / B)}`) ?? []).filter((m) => from.x >= m.box.min.x && from.x <= m.box.max.x && from.z >= m.box.min.z && from.z <= m.box.max.z).map((m) => m.o);
    if (!cands.length) return 0;
    from.y = above;
    ray.set(from, down);
    const hit = ray.intersectObjects(cands, false)[0];
    return hit ? frame.worldToLocal(local.copy(hit.point)).y : 0;
  };
  const CELL = 2; // the size of the small boxes big colliders are cut into
  const out = [];
  for (const o of list) {
    if (o.top || o.terrain || o.hole || o.fixed) {
      out.push(o);
      continue;
    }
    const hx = o.hx ?? o.r;
    const hz = o.hz ?? o.r;
    const nx = Math.max(1, Math.round((hx * 2) / CELL));
    const nz = Math.max(1, Math.round((hz * 2) / CELL));
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const cx = o.x - hx + ((i + 0.5) * 2 * hx) / nx;
        const cz = o.z - hz + ((j + 0.5) * 2 * hz) / nz;
        if (o.hx === undefined && nx * nz > 1 && Math.hypot(cx - o.x, cz - o.z) > o.r) continue; // a corner of a round one
        const sx = hx / nx;
        const sz = hz / nz;
        const h = Math.max(...[[0, 0], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]].map(([a, b]) => topAt(cx + a * sx, cz + b * sz)));
        if (h < 0.3) continue; // nothing drawn here: no wall
        out.push(nx * nz === 1 ? { ...o, h } : { x: cx, z: cz, hx: sx, hz: sz, h });
      }
    }
  }
  return out;
}

export class Player {
  constructor(scene, pos, color = 0x1e88e5) {
    this.scene = scene;
    this.h = makeHumanoid({ skin: 0xf5cd30, shirt: color, pants: 0x43a047, face: 'smile' });
    this.h.root.scale.setScalar(PLAYER_SCALE);
    scene.add(this.h.root);
    this.pos = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.moving = false;
    this.vy = 0;
    this.grounded = true;
    this.yaw = 0;
    this.phase = 0;
    this.swing = 0;
    this.area = null; // optional (x, z) => bool: where the player may walk (Versus: maps + bridges)
  }

  update(dt, keys, camYaw, colliders) {
    let ix = 0;
    let iz = 0;
    if (keys.has('KeyW')) iz += 1;
    if (keys.has('KeyS')) iz -= 1;
    if (keys.has('KeyD')) ix += 1;
    if (keys.has('KeyA')) ix -= 1;

    // Camera-relative movement: forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw)
    const s = Math.sin(camYaw);
    const c = Math.cos(camYaw);
    let mx = -s * iz + c * ix;
    let mz = -c * iz - s * ix;
    const len = Math.hypot(mx, mz);
    const ox = this.pos.x;
    const oz = this.pos.z;
    const moving = len > 0;
    this.moving = moving;
    if (moving) {
      mx /= len;
      mz /= len;
      this.pos.x += mx * SPEED * dt;
      this.pos.z += mz * SPEED * dt;
      this.yaw = lerpAngle(this.yaw, Math.atan2(mx, mz), Math.min(1, dt * 14));
    }

    if (keys.has('Space') && this.grounded) {
      this.vy = JUMP;
      this.grounded = false;
    }
    this.vy -= GRAVITY * dt;
    this.pos.y += this.vy * dt;

    // Push out of trees, rocks, towers, castle - unless we're up on top of it.
    for (const o of colliders) if (this.pos.y < o.h - STEP) pushOut(o, this.pos, RADIUS);

    // Land on the ground or on top of whatever we're standing over; walk off an edge and fall.
    let ground = 0;
    for (const o of colliders) {
      if (o.h > this.pos.y + STEP || o.h <= ground) continue;
      if (over(o, this.pos.x, this.pos.z, LAND_PAD)) ground = o.h;
    }
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
    if (this.area) {
      // Slide along the edge: keep whichever axis of the move is still allowed.
      if (!this.area(this.pos.x, this.pos.z)) {
        if (this.area(this.pos.x, oz)) this.pos.z = oz;
        else if (this.area(ox, this.pos.z)) this.pos.x = ox;
        else this.pos.set(ox, this.pos.y, oz);
      }
    } else {
      this.pos.x = clamp(this.pos.x, BOUNDS.minX, BOUNDS.maxX);
      this.pos.z = clamp(this.pos.z, BOUNDS.minZ, BOUNDS.maxZ);
    }

    // Walk / jump animation
    const h = this.h;
    this.swing += ((moving && this.grounded ? 1 : 0) - this.swing) * Math.min(1, dt * 10);
    this.phase += dt * 11 * (moving ? 1 : 0);
    const sw = Math.sin(this.phase) * 0.9 * this.swing;
    if (this.grounded) {
      h.leftLeg.rotation.x = sw;
      h.rightLeg.rotation.x = -sw;
      h.leftArm.rotation.x = -sw;
      h.rightArm.rotation.x = sw;
      h.leftArm.rotation.z = h.rightArm.rotation.z = 0;
    } else {
      h.leftArm.rotation.x = h.rightArm.rotation.x = -Math.PI * 0.9;
      h.leftArm.rotation.z = -0.2;
      h.rightArm.rotation.z = 0.2;
      h.leftLeg.rotation.x = 0.3;
      h.rightLeg.rotation.x = -0.3;
    }
    h.root.position.copy(this.pos);
    h.root.rotation.y = this.yaw;
  }

  dispose() {
    this.scene.remove(this.h.root);
    for (const m of this.h.mats) m.dispose();
  }
}
