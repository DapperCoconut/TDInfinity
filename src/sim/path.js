// Shared (client + server) path geometry. Plain math only — no three.js, no DOM.
import { clamp } from '../utils.js';

// Just wide enough for one zombie (~4 units wide) to walk single file.
export const PATH_WIDTH = 4.4;
export const BOUNDS = { minX: -104, maxX: 104, minZ: -66, maxZ: 66 };
export const PLAYER_SPAWN = { x: 8, y: 0, z: 0 };

// Winding path from the spawn portal (west) to the base (east).
const PATH_POINTS = [
  [-100, -40], [-45, -40], [-45, 30], [-10, 30], [-10, -35],
  [25, -35], [25, 35], [55, 35], [55, -10], [90, -10],
];

// Insane mode's Beholder pulls everyone into the time dimension: one long straight path that
// ends where the normal one does (so the castle stays put).
const TIME_POINTS = [[-100, -10], [90, -10]];

export class Path {
  constructor(pts) {
    this.time = false; // true while the map is the Beholder's time dimension
    this.set(pts);
  }

  /** Re-lays the path through `pts` ([[x, z], ...]). */
  set(pts) {
    this.points = pts.map(([x, z]) => ({ x, z }));
    this.segs = [];
    let total = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      this.segs.push({ a, b, len, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len, start: total });
      total += len;
    }
    this.length = total;
  }

  /** Writes x, z and direction dx, dz at distance d along the path into `out`. */
  at(d, out = {}) {
    d = clamp(d, 0, this.length);
    let s = this.segs[this.segs.length - 1];
    for (const seg of this.segs) {
      if (d <= seg.start + seg.len) {
        s = seg;
        break;
      }
    }
    const t = d - s.start;
    out.x = s.a.x + s.dx * t;
    out.z = s.a.z + s.dz * t;
    out.dx = s.dx;
    out.dz = s.dz;
    return out;
  }

  /** Shortest 2D distance from (x, z) to the path centerline. */
  distanceTo(x, z) {
    let best = Infinity;
    for (const s of this.segs) {
      const t = clamp((x - s.a.x) * s.dx + (z - s.a.z) * s.dz, 0, s.len);
      best = Math.min(best, Math.hypot(x - (s.a.x + s.dx * t), z - (s.a.z + s.dz * t)));
    }
    return best;
  }

  /** Distance along the path of the point on it closest to (x, z). */
  project(x, z) {
    let best = Infinity;
    let at = 0;
    for (const s of this.segs) {
      const t = clamp((x - s.a.x) * s.dx + (z - s.a.z) * s.dz, 0, s.len);
      const d = Math.hypot(x - (s.a.x + s.dx * t), z - (s.a.z + s.dz * t));
      if (d < best) {
        best = d;
        at = s.start + t;
      }
    }
    return at;
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
  path.set(on ? TIME_POINTS : PATH_POINTS);
}
