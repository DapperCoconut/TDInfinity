// Tower portraits: one small picture per tower type and level, drawn once and cached.
// Also portraits of what towers send out (units, sentries, gravestones): subIcon.
// Used by the hotbar, the loadout and the upgrade panel (each upgrade shows what it turns into).
import * as THREE from 'three';
import { ENEMIES, TOWERS } from './config.js';
import { TOWER_MODELS, makeEnemy, makeGrave, makeHologram, makeSentry, makeUnit } from './models.js';
import { newState, poseTower } from './anim.js';

const SIZE = 128;
const cache = new Map();
const _pose = { t: 0.6, dt: 0, recoil: 0, shots: 0, snap: true, aim: false };
let stage = null;

function getStage() {
  if (stage) return stage;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(3, 5, 6);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const holder = new THREE.Group();
  scene.add(holder);
  stage = { renderer, scene, cam, holder };
  return stage;
}

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _mid = new THREE.Vector3();

/** Draws one model as a portrait and returns it as a data URL. */
export function renderIcon(model) {
  const { renderer, scene, cam, holder } = getStage();
  model.root.rotation.y = 0.6;
  holder.add(model.root);
  if (model.plane) {
    // Aviator: show its plane flying overhead in the portrait.
    model.plane.position.set(-0.4, 5.6, -2.5);
    model.plane.rotation.set(0.25, 1.9, 0);
    model.plane.scale.setScalar(0.55);
    holder.add(model.plane);
  }
  // Its own stance and weapon hold (see anim.js), so no two portraits stand the same way.
  try {
    poseTower(model, newState(), _pose);
  } catch {
    /* an odd model keeps the pose it was built in */
  }
  // Frame it: a normal tower fills the picture, a big one is pulled back so it still fits.
  holder.updateMatrixWorld(true);
  _box.setFromObject(model.root);
  _box.getSize(_size);
  _box.getCenter(_mid);
  const tall = Math.max(5.6, _size.y * 1.08, Math.hypot(_size.x, _size.z) * 0.95);
  const k = tall / 5.6;
  const cy = _size.y > 6.2 ? _mid.y : 3.1;
  cam.position.set(1.5 * k, cy + 1.1 * k, 11 * k);
  cam.lookAt(0, cy, 0);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL();
  holder.clear();
  return url;
}

/** A tower's level-0 portrait if it's drawn already, else undefined (nothing gets drawn). */
export function cachedTowerIcon(type) {
  return cache.get(`${type}|0`);
}

/** The portrait of a tower at a level (0 = as placed). */
export function towerIcon(type, level = 0) {
  const make = TOWER_MODELS[type];
  if (!make) return '';
  const lv = Math.max(0, Math.min(level, (TOWERS[type]?.levels.length ?? 1) - 1));
  const key = `${type}|${lv}`;
  let url = cache.get(key);
  if (url === undefined) {
    try {
      const m = make(lv);
      url = renderIcon(m);
      for (const mat of m.mats ?? []) mat.dispose();
    } catch {
      url = '';
    }
    cache.set(key, url);
  }
  return url;
}

const _sphere = new THREE.Sphere();

/**
 * Draws anything (a jeep, a squad, a sentry...) so that it just fills the picture, seen from the front corner.
 * `size`: picture size in pixels. `yaw`: how far it's turned. `rise`: how high the camera sits (0 = level).
 */
const _mb = new THREE.Box3();
const _mc = new THREE.Vector3();
const _ms = new THREE.Vector3();
/**
 * Where a model's bulk is: the middle of its meshes weighed by their size, and how far the bulk
 * reaches from there. A long thin sword or a banner pole hardly counts, so a portrait framed on
 * this shows the body big instead of a small figure under a tall weapon.
 */
function bulk(root, center) {
  const items = [];
  let total = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _mb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    _mb.getSize(_ms);
    const v = Math.max(1e-4, _ms.x * _ms.y * _ms.z);
    _mb.getCenter(_mc);
    items.push([v, _mc.x, _mc.y, _mc.z, _ms.x, _ms.y, _ms.z]);
    total += v;
  });
  if (!total) return 0;
  center.set(0, 0, 0);
  for (const [v, x, y, z] of items) center.add(_mc.set(x, y, z).multiplyScalar(v / total));
  let sx = 0;
  let sy = 0;
  for (const [v, x, y, z, w, h, d] of items) {
    const k = v / total;
    sx += k * (((x - center.x) ** 2 + (z - center.z) ** 2) / 2 + (w * w + d * d) / 24);
    sy += k * ((y - center.y) ** 2 + (h * h) / 12);
  }
  return Math.sqrt(Math.max(sx, sy)) * 2.15;
}

function renderFitted(root, { size = SIZE, yaw = 0.7, rise = 0.36, fill = 1.02, focus = false } = {}) {
  const { renderer, scene, cam, holder } = getStage();
  if (size !== SIZE) renderer.setSize(size, size);
  root.rotation.y = yaw;
  holder.add(root);
  holder.updateMatrixWorld(true);
  _box.setFromObject(root);
  _box.getBoundingSphere(_sphere);
  _box.getSize(_size);
  // Long thin things (aerials, gun barrels) make the sphere bigger than the thing looks: tighten it a bit.
  let r = Math.max(0.5, Math.min(_sphere.radius, Math.max(_size.x, _size.y, _size.z) * 0.62));
  const c = _sphere.center;
  if (focus) {
    // Frame the body, not the whole outline (see bulk).
    const br = bulk(root, _mid);
    if (br > 0 && br < r) {
      r = Math.max(br, r * 0.5);
      c.copy(_mid);
      c.y += r * 0.12;
    }
  }
  const dist = (r / Math.sin((cam.fov * Math.PI) / 360)) * fill;
  cam.position.set(c.x + dist * 0.12, c.y + dist * rise, c.z + dist * Math.sqrt(Math.max(0.05, 1 - 0.12 * 0.12 - rise * rise)));
  cam.lookAt(c);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL();
  holder.clear();
  if (size !== SIZE) renderer.setSize(SIZE, SIZE);
  return url;
}

/**
 * The portrait of an enemy (the main menu shows each mode's final boss): bigger than a tower
 * icon and seen from a little below, so a boss looms. '' if it can't be drawn.
 */
export function enemyIcon(type, size = 256) {
  const key = `enemy|${type}|${size}`;
  let url = cache.get(key);
  if (url === undefined) {
    try {
      const m = makeEnemy(ENEMIES[type]);
      url = renderFitted(m.root, { size, yaw: 0.45, rise: 0.1, fill: 1, focus: true });
      for (const mat of m.mats ?? []) mat.dispose();
    } catch {
      url = '';
    }
    cache.set(key, url);
  }
  return url;
}

/**
 * The portrait of something a tower put on the map. `what` is { kind: 'unit', model, count } (a
 * unit model name from config, 'holo:<enemy>' for holograms), { kind: 'sentry', lvl } or
 * { kind: 'grave', lvl }. '' if it can't be drawn.
 */
export function subIcon(what) {
  if (!what) return '';
  const key = `sub|${what.kind}|${what.model ?? what.lvl}|${what.count ?? 1}`;
  let url = cache.get(key);
  if (url === undefined) {
    try {
      const m = what.kind === 'sentry' ? makeSentry(what.lvl) : what.kind === 'grave' ? makeGrave(what.lvl)
        : what.model.startsWith('holo:') ? makeHologram(ENEMIES[what.model.slice(5)]) : makeUnit(what.model, what.count ?? 1);
      url = renderFitted(m.root);
      for (const mat of m.mats ?? []) mat.dispose();
    } catch {
      url = '';
    }
    cache.set(key, url);
  }
  return url;
}
