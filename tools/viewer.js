// Dev-only model viewer: lays tower / enemy models out in a grid so looks can be checked quickly.
//   tools/viewer.html?kind=tower&q=scout,soldier&level=4
//   tools/viewer.html?kind=tower&from=0&n=40&level=0       (by index in TOWERS)
//   tools/viewer.html?kind=enemy&from=0&n=40
//   tools/viewer.html?kind=unit&q=jeep,tank,abrams           (summoned units, by model name)
//   tools/viewer.html?kind=unit&from=0&n=40                  (by order of first use in TOWERS)
//   &t=1.3 freezes the animation clock at 1.3s, &fire=0.5 shows the firing pose (recoil 0..1),
//   &cols=8 &yaw=0.5 &zoom=1 &levels=0,2,4 (one row per tower, one column per level)
import * as THREE from 'three';
import { TOWERS, ENEMIES } from '../src/config.js';
import { TOWER_MODELS, makeEnemy, makeUnit } from '../src/models.js';
import * as anim from '../src/anim.js';
import { HOLDS, RESTS, STANCES, classOf } from '../src/visuals.js';

const P = new URLSearchParams(location.search);
const kind = P.get('kind') || 'tower';
const cols = +(P.get('cols') || 8);
const yaw = +(P.get('yaw') ?? 0.5);
const zoom = +(P.get('zoom') || 1);
const freeze = P.get('t') != null ? +P.get('t') : null;
const fire = P.get('fire') != null ? +P.get('fire') : null;
const aim = P.get('aim') === '1';
const pitchK = +(P.get('pitch') ?? 0.62);
const lib = P.get('lib'); // hold | rest | stance: one tower in every hold / rest / stance
/** Every unit model a tower can send out, in the order the towers list them. */
function unitModels() {
  const out = new Map();
  const seen = new Set();
  const walk = (o, d) => {
    if (!o || typeof o !== 'object' || seen.has(o) || d > 8) return;
    seen.add(o);
    if (typeof o.model === 'string' && o.hp != null && !out.has(o.model)) out.set(o.model, o);
    for (const v of Object.values(o)) walk(v, d + 1);
  };
  for (const def of Object.values(TOWERS)) walk(def, 0);
  return out;
}
const UNITS = kind === 'unit' ? unitModels() : null;
const all = UNITS ? [...UNITS.keys()] : Object.keys(kind === 'tower' ? TOWERS : ENEMIES).filter((k) => kind !== 'tower' || TOWER_MODELS[k]);
let keys = P.get('q') ? P.get('q').split(',') : all.slice(+(P.get('from') || 0), +(P.get('from') || 0) + +(P.get('n') || 40));
if (P.get('match')) keys = all.filter((k) => new RegExp(P.get('match')).test(k)).slice(0, +(P.get('n') || 60));
const levels = P.get('levels') ? P.get('levels').split(',').map(Number) : null;
const level = +(P.get('level') || 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(P.get('bg') ? '#' + P.get('bg') : '#6fa35a');
scene.add(new THREE.HemisphereLight(0xdff3ff, 0x4a6b3a, 1.6));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
sun.position.set(30, 60, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = -120; sc.right = 120; sc.top = 120; sc.bottom = -120; sc.far = 300;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0x6fa35a }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const cell = +(P.get('cell') || 9);
const rowK = (kind === 'tower' ? 1.15 : 1.25) * Math.max(1, 0.62 / pitchK) ** 1.6;
const items = [];
const errors = [];
const entries = [];
for (const k of keys) for (const lv of levels ?? [level]) entries.push([k, lv]);
if (lib) {
  const [k, lv] = entries[0];
  entries.length = 0;
  const L = lib === 'hold' ? HOLDS : lib === 'rest' ? RESTS : STANCES;
  for (const n of Object.keys(L)) entries.push([k, lv, n]);
}
const nCols = levels ? levels.length : cols;
entries.forEach(([k, lv, ln], i) => {
  let m;
  try {
    if (kind === 'unit') m = makeUnit(k, UNITS.get(k)?.soldiers || 1);
    else if (kind === 'tower') m = TOWER_MODELS[k](Math.min(lv, (TOWERS[k]?.levels.length ?? 6) - 1));
    else m = makeEnemy(ENEMIES[k]);
  } catch (e) {
    errors.push(`${k}: ${e.message}`);
    return;
  }
  if (ln) {
    const cls = classOf(m);
    const L = lib === 'hold' ? HOLDS : lib === 'rest' ? RESTS : STANCES;
    const c = L[ln].c;
    const ok = lib === 'stance' || (cls === 'T' ? 'TOG' : cls === 'O' ? 'OG' : cls === 'D' ? 'D' : cls === 'M' || cls === 'P' ? 'M' : 'A').includes(c);
    if (!ok) return;
    m.vis = { ...m.vis, [lib]: L[ln], ...(lib === 'hold' ? { rest: null } : null) };
  }
  const g = new THREE.Group();
  const ii = lib ? items.length : i;
  const cx = (ii % nCols) * cell;
  const cz = Math.floor(ii / nCols) * cell * rowK;
  g.position.set(cx, kind === 'unit' && m.fly ? Math.min(3.5, m.fly) : 0, cz); // flyers hover so their undersides show
  if (kind === 'enemy') {
    const s = Math.min(1.6, ENEMIES[k].scale);
    g.scale.setScalar(s);
  }
  m.root.rotation.y = yaw;
  g.add(m.root);
  if (m.plane) { m.plane.position.set(0, 9, 0); g.add(m.plane); }
  scene.add(g);
  items.push({ k, lv, ln, m, g, state: anim.newState?.() ?? {}, phase: i * 0.7 });
});
window.__errors = errors;
if (errors.length) console.error(errors.join('\n'));

const rows = Math.ceil((lib ? items.length : entries.length) / nCols);
const w = nCols * cell;
const d = (rows - 1) * cell * rowK + cell;
const cam = new THREE.PerspectiveCamera(18, innerWidth / innerHeight, 1, 2000);
const center = new THREE.Vector3(w / 2 - cell / 2, 2.5, (d - cell) / 2);
const dist = Math.max(w / (2 * Math.tan((9 * Math.PI) / 180) * cam.aspect), (d * Math.min(1, pitchK + 0.25) + 7) / (2 * Math.tan((9 * Math.PI) / 180))) * 1.08 / zoom;
const camK = 1.012 / Math.hypot(pitchK, 0.8);
cam.position.set(center.x, center.y + dist * pitchK * camK, center.z + dist * 0.8 * camK);
cam.lookAt(center);

const labels = items.map((it) => {
  const el = document.createElement('div');
  el.className = 'lab';
  el.textContent = it.ln ?? (levels ? `${it.k} L${it.lv}` : P.get('names') ? `${it.k}: ${it.m.vis?.name ?? it.m.gait?.kind ?? '-'}` : it.k);
  document.body.appendChild(el);
  return el;
});
const v = new THREE.Vector3();
function place() {
  items.forEach((it, i) => {
    v.set(it.g.position.x, 0, it.g.position.z + cell * 0.36).project(cam);
    labels[i].style.left = `${((v.x + 1) / 2) * innerWidth}px`;
    labels[i].style.top = `${((1 - v.y) / 2) * innerHeight}px`;
  });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = freeze ?? now / 1000;
  for (const it of items) {
    try {
      if (kind === 'unit') {
        // Units: roll the wheels and swing the turret, the way UnitView does.
        for (const w of it.m.wheels ?? []) w.rotation.x = t * 2;
        for (const sp of it.m.spin ?? []) sp.o.rotation[sp.axis] = t * sp.rate;
        if (it.m.turret && P.get('turn')) it.m.turret.rotation.y = +P.get('turn');
      } else if (kind === 'tower') anim.poseTower?.(it.m, it.state, { t: t + (freeze != null ? 0 : it.phase), dt: freeze != null ? 0 : dt, recoil: fire ?? Math.max(0, 1 - ((t + it.phase) % 1.4) * 5), shots: Math.floor((t + it.phase) / 1.4), snap: aim });
      else if (it.m.anim) it.m.anim((freeze ?? now / 1000) * 5 + it.phase, t); // creatures and posed looks move themselves
      else anim.poseEnemy?.(it.m, it.state, { phase: (freeze ?? now / 1000) * 5 + it.phase, t, dt, atk: -1, fly: !!it.m.wings });
    } catch (e) {
      if (!it.err) { it.err = 1; errors.push(`${it.k} anim: ${e.message}`); console.error(it.k, e); }
    }
  }
  renderer.render(scene, cam);
  place();
  window.__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
