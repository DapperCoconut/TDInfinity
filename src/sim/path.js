// Shared (client + server) path geometry. Plain math only — no three.js, no DOM.
import { clamp } from '../utils.js';
import { DEFAULT_MAP, mapDef } from './maps.js';

// Just wide enough for one zombie (~4 units wide) to walk single file.
export const PATH_WIDTH = 4.4;
// A route number that isn't a lane: the straight line from the first route's start to its end.
// Enemies with `beeline` (Halloween Night 3's Drakobloxxer) walk it and skip the twisting path.
export const BEELINE = 99;
const DEFAULT_BOUNDS = { minX: -104, maxX: 104, minZ: -66, maxZ: 66 };
// The current map's playable area (most maps use the default; set by setMapPath).
export const BOUNDS = { ...DEFAULT_BOUNDS };
// Where players appear on the current map (set by setMapPath).
export const PLAYER_SPAWN = { x: 0, y: 0, z: 0 };

// The current map's routes (see maps.js): every route runs from a spawn portal to the base. Most
// maps have one; `PATH_POINTS` is the first. Routes of different lengths are stretched to the
// shortest one: an enemy on a longer route walks it a bit faster, so all routes take the same time.
let PATH_ROUTES = [mapDef(DEFAULT_MAP).path];
let PATH_POINTS = PATH_ROUTES[0];

// Insane mode's Beholder pulls everyone into the time dimension: one long straight path that
// ends where the normal one does (so the castle stays put).
const timePoints = () => {
  const [ex, ez] = PATH_POINTS[PATH_POINTS.length - 1];
  return [[-100, ez], [ex, ez]];
};

/** One polyline route: points { x, z, y } and its segments. */
function layRoute(pts) {
  const points = pts.map(([x, z, y = 0]) => ({ x, z, y }));
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-6) continue;
    segs.push({ a, b, len, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len, dy: (b.y - a.y) / len, start: total });
    total += len;
  }
  return { points, segs, length: total };
}

export class Path {
  constructor(pts) {
    this.time = false; // true while the map is the Beholder's time dimension
    this.lastRoute = 0; // the route the last project() call landed on
    this.set(pts);
  }

  /** Re-lays the path through `pts` ([[x, z, y?], ...]): a single route. */
  set(pts) {
    this.setRoutes([pts]);
  }

  /** Re-lays the path as several routes; the first one is `points`/`segs`. */
  setRoutes(list) {
    this.routes = list.map(layRoute);
    this.points = this.routes[0].points;
    this.segs = this.routes[0].segs;
    this.length = Math.min(...this.routes.map((r) => r.length));
    for (const r of this.routes) r.k = r.length / this.length; // path distance d is d * k along this route
    this.multi = this.routes.length > 1;
    const p0 = this.routes[0].points;
    const a = p0[0];
    const b = p0[p0.length - 1];
    this.beeline = layRoute([[a.x, a.z, a.y], [b.x, b.z, b.y]]);
    this.beeline.k = this.beeline.length / this.length; // < 1: shorter than the lanes
  }

  /** Writes x, z, y (height) and direction dx, dz at distance d along route r into `out`. */
  at(d, out = {}, r = 0) {
    const route = r === BEELINE ? this.beeline : this.routes[r] ?? this.routes[0];
    const segs = route.segs;
    d = clamp(d, 0, this.length) * route.k;
    let s = segs[segs.length - 1];
    for (const seg of segs) {
      if (d <= seg.start + seg.len) {
        s = seg;
        break;
      }
    }
    const t = d - s.start;
    out.x = s.a.x + s.dx * t;
    out.z = s.a.z + s.dz * t;
    out.y = s.a.y + s.dy * t;
    out.dx = s.dx;
    out.dz = s.dz;
    return out;
  }

  /** Shortest 2D distance from (x, z) to any route's centerline. */
  distanceTo(x, z) {
    let best = Infinity;
    for (const r of this.routes) {
      for (const s of r.segs) {
        const t = clamp((x - s.a.x) * s.dx + (z - s.a.z) * s.dz, 0, s.len);
        best = Math.min(best, Math.hypot(x - (s.a.x + s.dx * t), z - (s.a.z + s.dz * t)));
      }
    }
    return best;
  }

  /** Distance along the path of the point on it closest to (x, z). Its route goes in `lastRoute`. */
  project(x, z) {
    let best = Infinity;
    let at = 0;
    this.routes.forEach((r, i) => {
      for (const s of r.segs) {
        const t = clamp((x - s.a.x) * s.dx + (z - s.a.z) * s.dz, 0, s.len);
        const d = Math.hypot(x - (s.a.x + s.dx * t), z - (s.a.z + s.dz * t));
        if (d < best - 1e-6) {
          best = d;
          at = Math.min(this.length, (s.start + t) / r.k);
          this.lastRoute = i;
        }
      }
    });
    return at;
  }

  /** The route closest to (x, z). */
  nearestRoute(x, z) {
    if (!this.multi) return 0;
    this.project(x, z);
    return this.lastRoute;
  }

  get start() {
    return this.points[0];
  }
  get end() {
    return this.points[this.points.length - 1];
  }
}

export const path = new Path(PATH_POINTS);

/**
 * Switches the shared path between the normal map and the time dimension. Everything that reads
 * `path` (sim, views, placement) follows it. Safe to call again with the same value.
 */
export function setTimeWorld(on) {
  on = !!on;
  if (path.time === on) return;
  path.time = on;
  path.setRoutes(on ? [timePoints()] : PATH_ROUTES);
}

/** Re-lays the current map's routes (the Last Laugh contract's open court changes its one route). */
export function setMapRoutes(list) {
  PATH_ROUTES = list;
  PATH_POINTS = list[0];
  if (!path.time) path.setRoutes(list);
}

/** Lays out map `def` (from maps.js): its path and the player spawn. Leaves the time dimension. */
export function setMapPath(def) {
  PATH_ROUTES = def.routes ?? [def.path];
  PATH_POINTS = PATH_ROUTES[0];
  Object.assign(PLAYER_SPAWN, { x: def.spawn.x, y: def.spawn.y ?? 0, z: def.spawn.z });
  Object.assign(BOUNDS, def.bounds ?? DEFAULT_BOUNDS);
  path.time = false;
  path.setRoutes(PATH_ROUTES);
}
setMapPath(mapDef(DEFAULT_MAP));
