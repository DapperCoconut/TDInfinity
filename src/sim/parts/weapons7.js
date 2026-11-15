// Tower weapons, part 7: Technomancer (Hologram pad, Hijack, Utopia).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { PAD_SNAP } from '../map.js';
import { BOUNDS, PATH_WIDTH, path } from '../path.js';

const PAD_CLEAR = 4; // a Hologram pad stays this far from every tower, so a tower fits on it

export class SimWeapons7 {

  // ---------------------------------------------------------------- Technomancer

  /** Every tick: which of its owner's towers stands on the Technomancer's pad (t.padOn, 0 if none). */
  updateTechno(t) {
    if (!t.pad) return;
    t.padOn = 0;
    for (const o of this.towers.values()) {
      if (o === t || o.owner !== t.owner || o.holo) continue;
      if ((o.x - t.pad.x) ** 2 + (o.z - t.pad.z) ** 2 <= PAD_SNAP * PAD_SNAP) {
        t.padOn = o.id;
        break;
      }
    }
  }

  /** Why the Hologram / Utopia ability can't be used now (null if it can). Utopia makes its copy here. */
  technoWhy(t, p, s, ab, m) {
    const x = Number(m.x);
    const z = Number(m.z);
    if (ab.key === 'hologram') {
      if (t.pad && t.padOn) return 'A tower is standing on its Hologram (sell it to move the Hologram)';
      if (Math.hypot(x - t.x, z - t.z) > s.range) return `Too far! The Hologram goes within ${Math.round(s.range)} studs`;
      if (x < BOUNDS.minX + 2 || x > BOUNDS.maxX - 2 || z < BOUNDS.minZ + 2 || z > BOUNDS.maxZ - 2) return "The Hologram can't go there";
      if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6) return "The Hologram can't go on the path";
      for (const o of this.towers.values()) if (Math.hypot(o.x - x, o.z - z) < PAD_CLEAR) return 'Too close to a tower';
      for (const o of this.towers.values()) if (o !== t && o.pad && Math.hypot(o.pad.x - x, o.pad.z - z) < PAD_CLEAR) return 'Too close to another Hologram';
      return null;
    }
    // Utopia: a free copy of the tower on the pad, placed where the player clicked.
    if (!t.pad) return 'Place its Hologram first';
    const v = this.towers.get(t.padOn);
    if (!v) return 'No tower on its Hologram';
    return this.cloneTower(p, ab, { src: v.id, x, z, yaw: m.yaw ?? v.yaw });
  }

  /** Hologram: the pad goes where the player clicked. */
  placeHologram(t, x, z) {
    t.pad = { x, z };
    t.padOn = 0;
    this.events.push({ k: 'sprout', x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, volt: 1 });
  }

  /** The Technomancer was sold: the tower on its pad is sold too. */
  sellPadTower(t, pid) {
    if (t.padOn && this.towers.has(t.padOn)) this.action(pid, { a: 'sell', id: t.padOn });
  }
}

