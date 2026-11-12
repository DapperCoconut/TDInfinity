// Mysterious Call contract on screen (see call/data.js). On Lantern Hill Cemetery, with the contract
// accepted, an old phone rings by the chapel door. Walk up to it to answer: that leaves the game and
// starts the haunted mansion (lobby.startCall).
// These are methods of GameClient: game.js puts them on the class, so "this" is the game client.

import * as THREE from 'three';
import { audio } from '../audio.js';
import { profile } from '../profile.js';
import { MAP, mapKey } from '../sim/map.js';
import { baseKey } from '../sim/maps.js';

export class GamePhone {

  /** Every frame: the ringing phone by the cemetery chapel. */
  syncPhone(dt) {
    if (this.versus || baseKey(mapKey) !== 'cemetery' || !profile.contracts.accepted.includes('call') || !this.player || this.ended) return;
    const chapel = MAP.props.find((p) => p.kind === 'chapel');
    if (!chapel) return;
    if (!this.phone) {
      // A little table in front of the chapel door (the door faces north), with an old black phone.
      const g = new THREE.Group();
      const wood = new THREE.MeshLambertMaterial({ color: 0x4e342e });
      const black = new THREE.MeshLambertMaterial({ color: 0x151515 });
      const add = (geo, mat, x, y, z) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        g.add(m);
        return m;
      };
      add(new THREE.BoxGeometry(1.4, 0.15, 1), wood, 0, 1.6, 0);
      for (const [x, z] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]]) add(new THREE.BoxGeometry(0.12, 1.6, 0.12), wood, x, 0.8, z);
      add(new THREE.BoxGeometry(0.8, 0.35, 0.6), black, 0, 1.85, 0); // the phone
      add(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12), new THREE.MeshLambertMaterial({ color: 0xeeeeee }), 0, 2.04, 0.12); // the dial
      const receiver = add(new THREE.BoxGeometry(0.95, 0.16, 0.2), black, 0, 2.12, -0.15);
      const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0xffd54f }));
      mark.position.y = 3.6;
      g.add(mark);
      g.position.set(chapel.x + 3, 0, chapel.z - 4.4);
      this.scene.add(g);
      this.phone = { g, receiver, mark, t: 0 };
      this.ui.toast('📞 A phone is ringing by the chapel door... walk up to it to answer.', 5000);
    }
    const ph = this.phone;
    ph.t += dt;
    const ringing = ph.t % 3 < 1;
    ph.receiver.position.y = 2.12 + (ringing ? Math.abs(Math.sin(ph.t * 40)) * 0.08 : 0);
    ph.mark.rotation.y += dt * 2;
    ph.mark.position.y = 3.6 + Math.sin(ph.t * 3) * 0.2;
    const p = this.player.pos;
    const d = Math.hypot(p.x - ph.g.position.x, p.z - ph.g.position.z);
    if (ringing && !ph.rang) audio.ring(Math.max(0.15, 1 - d / 60));
    ph.rang = ringing;
    if (d < 2.6 && !this.phoneGoing) {
      this.phoneGoing = true;
      this.ui.toast('📞 "...hello? ...come to the mansion..."', 2500);
      setTimeout(() => {
        this.phoneGoing = false;
        this.onCall?.();
      }, 1200);
    }
  }

  /** Forgets the phone (a new game started). */
  clearPhone() {
    if (this.phone) {
      this.scene.remove(this.phone.g);
      this.phone.g.traverse((o) => (o.geometry?.dispose(), o.material?.dispose()));
      this.phone = null;
    }
    this.phoneGoing = false;
  }
}
