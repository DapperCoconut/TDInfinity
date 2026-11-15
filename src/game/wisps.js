// Spirit wisps (2026-11-15): a killed enemy may leave a glowing wisp. Walk into it (or click it)
// to add that enemy to your Enemy Journal (src/journal.js). Only enemies not in the journal yet
// drop one. A boss drops a big red boss wisp on your 3rd kill of it (and after, until picked up).
// Every player rolls for their own wisps. These are methods of GameClient (game.js puts them on
// the class), so "this" is the game client.

import * as THREE from 'three';
import { ENEMIES } from '../config.js';
import { profile } from '../profile.js';
import { audio } from '../audio.js';

const WISP_CHANCE = 0.1; // a normal enemy's chance to drop a wisp
const BOSS_KILLS = 3; // a boss's wisp comes on this kill
const WISP_LIFE = 40; // seconds before an unclaimed wisp fades away
const REACH = 4; // how close you have to walk (sim units; boss wisps: 1.5x)

const geo = new THREE.SphereGeometry(1, 14, 10);
const haloGeo = new THREE.SphereGeometry(1, 14, 10);

export class GameWisps {

  /** An enemy of `type` died at `pos`: maybe leave a wisp there. */
  maybeWisp(type, pos) {
    const def = ENEMIES[type];
    if (!def || def.dummy || profile.knows(type)) return;
    this.wisps ??= [];
    if (this.wisps.some((w) => w.type === type)) return;
    let boss = false;
    if (def.boss) {
      if (profile.bossKill(type) < BOSS_KILLS) return;
      boss = true;
    } else if (Math.random() >= WISP_CHANCE) return;
    const size = boss ? 1.4 : 0.7;
    const color = boss ? 0xff1744 : 0x80deea;
    const group = new THREE.Group();
    const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: boss ? 0xff8a80 : 0xe0f7fa }));
    core.scale.setScalar(size * 0.55);
    const halo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
    halo.scale.setScalar(size);
    core.userData.wisp = halo.userData.wisp = type;
    group.add(core, halo);
    group.position.set(pos.x, 2.5, pos.z);
    this.scene.add(group);
    this.wisps.push({ type, boss, group, core, halo, life: WISP_LIFE, t: Math.random() * 6 });
    if (boss) this.ui.toast(`🔴 A BOSS WISP! Pick it up to add ${def.name} to your Enemy Journal.`, 3000);
  }

  /** Each frame: wisps bob and pulse; walking into one picks it up. */
  updateWisps(dt) {
    if (!this.wisps?.length) return;
    const p = this.player?.pos;
    for (const w of [...this.wisps]) {
      w.t += dt;
      w.life -= dt;
      w.group.position.y = 2.5 + Math.sin(w.t * 2.4) * 0.5;
      w.halo.scale.setScalar((w.boss ? 1.4 : 0.7) * (1 + Math.sin(w.t * 5) * 0.15));
      if (w.life < 3) w.halo.material.opacity = 0.35 * Math.max(0, w.life / 3);
      const reach = REACH * (w.boss ? 1.5 : 1);
      if (p && !this.fps && Math.hypot(p.x - w.group.position.x, p.z - w.group.position.z) < reach) this.takeWisp(w);
      else if (w.life <= 0) this.dropWisp(w);
    }
  }

  /** The wisp under the mouse, if any (clicking one picks it up). */
  pickWisp() {
    if (!this.wisps?.length) return null;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.intersectObjects(this.wisps.map((w) => w.group), true)[0];
    return hit ? this.wisps.find((w) => w.type === hit.object.userData.wisp) ?? null : null;
  }

  takeWisp(w) {
    this.dropWisp(w);
    if (!profile.learn(w.type)) return;
    const name = ENEMIES[w.type].name;
    this.effects.puff(w.group.position.clone(), w.boss ? 0xff1744 : 0x80deea, 14, 0.5, 8);
    audio.cash?.();
    this.ui.toast(`📖 New Enemy Journal entry: ${name}!`, 2500);
  }

  dropWisp(w) {
    this.scene.remove(w.group);
    w.core.material.dispose();
    w.halo.material.dispose();
    this.wisps.splice(this.wisps.indexOf(w), 1);
  }

  clearWisps() {
    for (const w of [...(this.wisps ?? [])]) this.dropWisp(w);
  }
}
