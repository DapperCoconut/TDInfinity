// Mysterious Call (Contract 4, see call/data.js) on screen: the haunted mansion in first person.
// It borrows the game's renderer and canvas while it runs (GameClient.frame hands each frame here).
// The rules are in call/sim.js.

import * as THREE from 'three';
import { audio } from '../audio.js';
import { CALL, CLASSES, CLASS_KEYS } from './data.js';
import { CallSim, EYE, FURNITURE, SPAWNS, WALLS } from './sim.js';

const LOOK = 0.0022; // mouse look speed
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The class pick screen. Calls `onPick(key)` or `onBack()`. */
export function pickClass(onPick, onBack) {
  const el = document.createElement('div');
  el.id = 'call-pick';
  el.innerHTML = `<h2>📞 Mysterious Call</h2><p>Something is on the line... Pick who answers. Survive ${CALL.waves.length} waves of ghosts in the mansion.</p>
    <div class="call-classes">${CLASS_KEYS.map((k) => {
      const c = CLASSES[k];
      return `<button class="call-class" data-cls="${k}" style="--c:${c.color}"><span class="cc-ic">${c.icon}</span><b>${esc(c.name)}</b>
        <small>❤ ${c.hp} · 🏃 ${c.speed}</small><p>${esc(c.desc)}</p></button>`;
    }).join('')}</div>
    <button class="btn small" data-back>Hang up</button>`;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cls],[data-back]');
    if (!b) return;
    el.remove();
    if (b.dataset.cls) onPick(b.dataset.cls);
    else onBack();
  });
  document.body.appendChild(el);
}

export class CallGame {
  /** `hooks`: { onEnd(won), onQuit() }. */
  constructor(renderer, canvas, cls, hooks) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.hooks = hooks;
    this.sim = new CallSim(cls);
    this.cls = CLASSES[this.sim.cls];
    this.keys = new Set();
    this.fire = false;
    this.alt = false;
    this.yaw = 0;
    this.pitch = 0;
    this.clock = new THREE.Clock();
    this.fx = []; // fading bits: { obj, left, life, grow, rise }
    this.ghostViews = new Map();
    this.shotViews = new Map();
    this.orbViews = new Map();
    this.trapViews = new Map();
    this.candleViews = new Map();
    this.flashT = 0;
    this.buildScene();
    this.buildHud();
    this.bind();
    audio.musicGame('cemetery', []);
  }

  // ---------------------------------------------------------------- the mansion

  buildScene() {
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x0b0a12);
    scene.fog = new THREE.Fog(0x0b0a12, 8, 38);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 120);
    this.camera.rotation.order = 'YXZ';
    scene.add(this.camera);
    scene.add(new THREE.HemisphereLight(0x8a7faa, 0x2a2018, 0.9));
    this.moon = new THREE.DirectionalLight(0x8899ff, 0.25);
    this.moon.position.set(-10, 20, 6);
    scene.add(this.moon);
    // The floor: dark wood planks. The ceiling: dark plaster.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 32), new THREE.MeshLambertMaterial({ map: planks() }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(48, 32), new THREE.MeshLambertMaterial({ color: 0x1d1a22 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 4;
    scene.add(ceil);
    // A red rug down the hall.
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4, 28), new THREE.MeshLambertMaterial({ color: 0x5a1218 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.01;
    scene.add(rug);
    const wallMat = new THREE.MeshLambertMaterial({ map: wallpaper() });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x2b1d14 });
    for (const b of WALLS) {
      const w = b.x1 - b.x0, d = b.z1 - b.z0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, b.h, d), wallMat);
      m.position.set((b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2);
      scene.add(m);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.35, d + 0.08), trimMat); // skirting board
      trim.position.set(m.position.x, 0.17, m.position.z);
      scene.add(trim);
    }
    const furnColors = { table: 0x4e342e, bed: 0x6d4c41, couch: 0x4a148c, piano: 0x111111, shelf: 0x3e2723, chest: 0x5d4037 };
    for (const b of FURNITURE) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, b.h, b.z1 - b.z0), new THREE.MeshLambertMaterial({ color: furnColors[b.kind] ?? 0x4e342e }));
      m.position.set((b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2);
      scene.add(m);
    }
    // Candles on the long table, fireplaces and windows where ghosts come in.
    this.flames = [];
    for (let z = -3; z <= 3; z += 3) this.addCandle(0, 0.8, z, 0xffa040);
    for (const [x, z] of SPAWNS) {
      const onX = Math.abs(Math.abs(x) - 24) < 1; // on the west / east wall
      const frame = new THREE.Mesh(new THREE.BoxGeometry(onX ? 0.2 : 2.2, 2.2, onX ? 2.2 : 0.2), new THREE.MeshBasicMaterial({ color: 0x24305e }));
      frame.position.set(Math.sign(x) * Math.min(Math.abs(x), 23.7), 2, Math.sign(z) * Math.min(Math.abs(z), 15.7));
      if (!onX && Math.abs(z) > 15) frame.position.x = x;
      if (onX) frame.position.z = z;
      scene.add(frame);
    }
    // A few warm lights that flicker.
    this.lights = [];
    for (const [x, z, c] of [[0, 0, 0xff9a40], [-16, -8, 0xff7043], [16, 8, 0xff7043], [-16, 8, 0x7e57c2], [16, -8, 0x7e57c2]]) {
      const l = new THREE.PointLight(c, 2, 24, 1.4);
      l.position.set(x, 3, z);
      scene.add(l);
      this.lights.push(l);
    }
    // You: the gun or tool in your hand.
    this.hand = viewModel(this.sim.cls);
    this.hand.scale.setScalar(0.6);
    this.camera.add(this.hand);
    const glow = new THREE.PointLight(0xffe0c0, 1.2, 9, 1.5); // a soft light around you, so your hand and nearby ghosts show
    glow.position.set(0, 0.3, 0);
    this.camera.add(glow);
    // Your beam (Light Beamer, Ghostbuster, Allister's vacuum).
    this.beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: this.cls.color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.beamMesh.visible = false;
    scene.add(this.beamMesh);
  }

  addCandle(x, y, z, color) {
    const g = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    stick.position.y = 0.15;
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color }));
    flame.position.y = 0.36;
    flame.scale.y = 1.8;
    g.add(stick, flame);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.flames.push(flame);
    return g;
  }

  // ---------------------------------------------------------------- page

  buildHud() {
    const el = (this.hud = document.createElement('div'));
    el.id = 'call-hud';
    el.innerHTML = `<div class="cross"></div><div class="call-top"><b class="call-wave"></b><span class="call-left"></span></div>
      <div class="call-boss hidden"><b>📞 THE CALLER</b><div class="bar"><span></span></div></div>
      <div class="call-me"><span class="call-cls">${this.cls.icon} ${esc(this.cls.name)}</span><div class="bar hp"><span></span><b></b></div>
      <div class="call-alt"></div><div class="call-heat bar hidden"><span></span></div></div>
      <div class="call-hurt"></div><div class="call-msg"></div>
      <div class="call-lock">Click to play<small>WASD to move · mouse to look · left click: ${esc(fireName(this.cls.fire.kind))} · right click: ${esc(this.cls.alt.name)} · Esc: pause · Q (paused): hang up</small></div>`;
    document.body.appendChild(el);
    this.$ = (s) => el.querySelector(s);
  }

  msg(text, ms = 2500) {
    const m = this.$('.call-msg');
    m.textContent = text;
    m.classList.add('show');
    clearTimeout(this.msgT);
    this.msgT = setTimeout(() => m.classList.remove('show'), ms);
  }

  bind() {
    const c = this.canvas;
    this.on = [];
    const on = (t, ev, f, o) => {
      t.addEventListener(ev, f, o);
      this.on.push([t, ev, f, o]);
    };
    on(window, 'keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyQ' && !this.locked) this.hooks.onQuit();
      if (e.code === 'Space') e.preventDefault();
    });
    on(window, 'keyup', (e) => this.keys.delete(e.code));
    on(window, 'blur', () => (this.keys.clear(), (this.fire = false)));
    on(c, 'mousedown', (e) => {
      if (!this.locked) return c.requestPointerLock?.();
      if (e.button === 0) this.fire = true;
      if (e.button === 2) this.alt = true;
    });
    on(window, 'mouseup', (e) => e.button === 0 && (this.fire = false));
    on(window, 'mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * LOOK;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - e.movementY * LOOK));
    });
    on(document, 'pointerlockchange', () => {
      this.locked = document.pointerLockElement === c;
      this.$('.call-lock').classList.toggle('hidden', this.locked || !!this.sim.over);
      if (!this.locked) this.fire = false;
    });
    on(window, 'resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  dispose() {
    for (const [t, ev, f, o] of this.on) t.removeEventListener(ev, f, o);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.hud.remove();
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      for (const m of [o.material].flat()) m?.map?.dispose(), m?.dispose();
    });
  }

  // ---------------------------------------------------------------- every frame

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const s = this.sim;
    if (this.locked && !s.over) {
      const k = this.keys;
      s.step(dt, {
        fwd: (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0),
        side: (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0),
        yaw: this.yaw, pitch: this.pitch, fire: this.fire, alt: this.alt,
      });
      this.alt = false;
      this.walkT = (this.walkT ?? 0) + (k.has('KeyW') || k.has('KeyS') || k.has('KeyA') || k.has('KeyD') ? dt * this.cls.speed : 0);
    }
    this.events(s.events.splice(0));
    this.draw(dt);
    this.renderer.render(this.scene, this.camera);
  }

  events(list) {
    for (const ev of list) {
      const at = ev.x != null ? new THREE.Vector3(ev.x, ev.y ?? 1, ev.z) : null;
      switch (ev.k) {
        case 'wave':
          this.msg(ev.n === CALL.waves.length ? `📞 Wave ${ev.n}: THE CALLER is here!` : `👻 Wave ${ev.n}`, 2500);
          audio.waveStart();
          break;
        case 'clear':
          this.msg(`✔ Wave ${ev.n} cleared! Catch your breath...`, 2500);
          break;
        case 'shoot':
          audio.shot(1, ev.kind === 'pellets' ? 'shotgunner' : 'scout');
          this.kick = 1;
          break;
        case 'alt':
          this.kick = 1.5;
          if (ev.kind === 'flash') this.flashT = 0.35;
          audio.place();
          break;
        case 'tracer':
          this.line(this.muzzle(), at, 0xffe0a0, 0.08);
          break;
        case 'hit':
          this.hitT = 0.12;
          this.puff(at, 0xffffff, 3, 0.15);
          break;
        case 'kill':
          audio.kill();
          this.puff(at, ev.color, 10, 0.3 * ev.size);
          break;
        case 'shieldBreak':
          this.puff(at, 0x80deea, 8, 0.2);
          break;
        case 'boom':
          audio.boom(3);
          this.ring(at.setY(0.1), ev.r, 0xff9100);
          this.puff(at.setY(1.2), 0xffab40, 14, 0.35);
          break;
        case 'paint':
          audio.boom(2);
          this.ring(at.setY(0.08), ev.r, 0xff4081);
          break;
        case 'splat':
          this.puff(at, ev.look === 'paintballer' ? 0xff4081 : 0xcccccc, 4, 0.12);
          break;
        case 'hurt':
          this.hurtT = 0.35;
          audio.baseHit();
          break;
        case 'overheat':
          this.msg('🔥 Overheated! Wait a moment...', 1500);
          break;
        case 'summon':
          audio.whisper?.();
          break;
        case 'spawn':
          if (ev.boss) {
            audio.laugh?.();
            this.$('.call-boss').classList.remove('hidden');
          }
          break;
        case 'win':
        case 'lose':
          this.end(ev.k === 'win');
          break;
      }
    }
  }

  end(won) {
    if (won) audio.victory();
    else audio.defeat();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.$('.call-lock').classList.add('hidden');
    this.hooks.onEnd(won, this.sim.wave.n);
  }

  /** Where your shots and beams start: a little right of and below your eye. */
  muzzle() {
    const p = this.sim.p;
    const r = new THREE.Vector3(0.2, -0.19, -0.6).applyEuler(this.camera.rotation);
    return new THREE.Vector3(p.x, EYE, p.z).add(r);
  }

  draw(dt) {
    const s = this.sim;
    const p = s.p;
    const t = performance.now() / 1000;
    const bobY = Math.sin((this.walkT ?? 0) * 1.4) * 0.05;
    this.camera.position.set(p.x, EYE + bobY, p.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    // The hand: kicks back when it fires.
    this.kick = Math.max(0, (this.kick ?? 0) - dt * 8);
    this.hand.position.set(0.2, -0.2 + bobY * 0.5, -0.42 + this.kick * 0.04);
    this.hand.rotation.x = this.kick * 0.12;
    // Flickering lights and candle flames; lightning now and then.
    for (const [i, l] of this.lights.entries()) l.intensity = 1.9 + Math.sin(t * 7 + i * 3) * 0.12 + Math.sin(t * 13.3 + i) * 0.08;
    for (const f of this.flames) f.scale.x = f.scale.z = 1 + Math.sin(t * 20 + f.id) * 0.15;
    if ((this.boltT = (this.boltT ?? 6) - dt) <= 0) {
      this.boltT = 7 + Math.random() * 10;
      this.bolt = 0.25;
    }
    this.bolt = Math.max(0, (this.bolt ?? 0) - dt);
    this.moon.intensity = 0.25 + (this.bolt > 0 && Math.sin(this.bolt * 60) > 0 ? 2.2 : 0) + this.flashT * 6;
    this.flashT = Math.max(0, this.flashT - dt);
    // Ghosts.
    sync(this.ghostViews, s.ghosts, (g) => ghostMesh(g), (v, g) => {
      v.position.set(g.x, g.y - 1.3 * g.def.size, g.z);
      v.rotation.y = Math.atan2(p.x - g.x, p.z - g.z);
      const u = v.userData;
      u.body.material.opacity = g.stunT > 0 ? 0.35 : 0.72 + Math.sin(g.bob * 2) * 0.08;
      u.body.material.emissive.setHex(g.held > 0 ? 0xff6d00 : g.slowBy > 0 ? 0x880e4f : 0x000000);
      if (u.shield) u.shield.visible = g.shield > 0;
      if (u.shield) u.shield.rotation.y += dt * 2;
      if (u.bar) {
        u.bar.visible = g.hp < g.maxHp;
        u.bar.children[1].scale.x = Math.max(0.001, g.hp / g.maxHp);
        u.bar.lookAt(this.camera.position);
      }
    }, this.scene);
    sync(this.shotViews, s.shots, (o) => shotMesh(o, this.cls.color), (v, o) => {
      v.position.set(o.x, o.y, o.z);
      v.rotation.x += dt * 20;
    }, this.scene);
    sync(this.orbViews, s.orbs, () => new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd500f9 })), (v, o) => v.position.set(o.x, o.y, o.z), this.scene);
    sync(this.trapViews, s.traps, (o) => trapMesh(o), (v, o) => {
      v.position.set(o.x, 0.02, o.z);
      v.children[1].material.opacity = 0.25 + Math.sin(t * 10) * 0.1;
    }, this.scene);
    sync(this.candleViews, s.candles, (o) => {
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.45, 8), new THREE.MeshLambertMaterial({ color: 0xc62828, emissive: 0x400000 }));
      c.position.y = 0.22;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff5252 }));
      f.position.y = 0.52;
      f.scale.y = 1.8;
      const ring = new THREE.Mesh(new THREE.RingGeometry(this.cls.alt.radius - 0.1, this.cls.alt.radius, 40), new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      const light = new THREE.PointLight(0xff1744, 1.2, 7, 2);
      light.position.y = 0.8;
      g.add(c, f, ring, light);
      return g;
    }, (v, o) => v.position.set(o.x, 0, o.z), this.scene);
    // Your beam.
    const b = s.beam;
    this.beamMesh.visible = !!b;
    if (b) {
      const from = this.muzzle();
      const to = new THREE.Vector3(b.x, b.y, b.z);
      placeBetween(this.beamMesh, from, to, (b.vac ? 0.6 : 0.4) * (1 + Math.sin(t * 40) * 0.3));
      this.beamMesh.material.opacity = b.vac ? 0.45 : 0.85;
    }
    // Fading bits.
    this.fx = this.fx.filter((f) => {
      f.left -= dt;
      const k = Math.max(0, f.left / f.life);
      f.obj.material.opacity = k * (f.alpha ?? 1);
      if (f.grow) f.obj.scale.setScalar(1 + (1 - k) * f.grow);
      if (f.vel) f.obj.position.addScaledVector(f.vel, dt);
      if (f.left > 0) return true;
      this.scene.remove(f.obj);
      f.obj.geometry.dispose();
      f.obj.material.dispose();
      return false;
    });
    this.hud$(dt);
  }

  hud$(dt) {
    const s = this.sim;
    const p = s.p;
    const w = s.wave;
    this.$('.call-wave').textContent = `Wave ${Math.max(1, w.n)} / ${CALL.waves.length}`;
    this.$('.call-left').textContent = w.state === 'wait' ? `Next wave in ${Math.ceil(w.t)}` : `👻 ${s.ghosts.size + w.queue.length} left`;
    this.$('.hp span').style.width = `${(p.hp / p.maxHp) * 100}%`;
    this.$('.hp b').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    const a = this.cls.alt;
    this.$('.call-alt').textContent = p.altCd > 0 ? `🖱 ${a.name}: ${p.altCd.toFixed(1)} s` : `🖱 ${a.name}: ready!`;
    this.$('.call-alt').classList.toggle('ready', !(p.altCd > 0));
    const f = this.cls.fire;
    if (f.heat) {
      const h = this.$('.call-heat');
      h.classList.remove('hidden');
      h.classList.toggle('hot', p.hot > 0);
      h.firstChild.style.width = `${p.hot > 0 ? 100 : (p.heat / f.heat) * 100}%`;
    }
    const boss = [...s.ghosts.values()].find((g) => g.def.boss);
    if (boss) this.$('.call-boss span').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    else this.$('.call-boss').classList.add('hidden');
    this.hurtT = Math.max(0, (this.hurtT ?? 0) - dt);
    this.$('.call-hurt').style.opacity = Math.min(0.7, this.hurtT * 2 + (p.hp < p.maxHp * 0.3 ? 0.25 : 0));
    this.hitT = Math.max(0, (this.hitT ?? 0) - dt);
    this.$('.cross').classList.toggle('hit', this.hitT > 0);
  }

  // ---------------------------------------------------------------- little effects

  puff(at, color, n, size) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color, transparent: true }));
      m.position.copy(at);
      this.scene.add(m);
      const life = 0.4 + Math.random() * 0.3;
      this.fx.push({ obj: m, left: life, life, vel: new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).multiplyScalar(4) });
    }
  }

  ring(at, r, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.copy(at);
    this.scene.add(m);
    this.fx.push({ obj: m, left: 0.4, life: 0.4, alpha: 0.8 });
  }

  line(from, to, color, life) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true }));
    placeBetween(m, from, to, 1);
    this.scene.add(m);
    this.fx.push({ obj: m, left: life, life });
  }
}

// ---------------------------------------------------------------- builders

const fireName = (k) => ({ shot: 'shoot', pellets: 'shoot', beam: 'hold to beam', melee: 'slash', vacuum: 'hold to vacuum' })[k] ?? 'fire';

/** Keeps a map of meshes in step with a list (or Map) of { id } things. */
function sync(views, items, make, update, scene) {
  const seen = new Set();
  for (const o of items.values()) {
    seen.add(o.id);
    let v = views.get(o.id);
    if (!v) {
      v = make(o);
      views.set(o.id, v);
      scene.add(v);
    }
    update(v, o);
  }
  for (const [id, v] of views) {
    if (seen.has(id)) continue;
    scene.remove(v);
    v.traverse((o) => (o.geometry?.dispose(), o.material?.dispose()));
    views.delete(id);
  }
}

/** Stretches a unit-tall cylinder from `a` to `b`, `thick` times as wide as it was made. */
function placeBetween(m, a, b, thick) {
  const d = b.clone().sub(a);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(thick, Math.max(0.01, d.length()), thick);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}

/** A blocky ghost: a sheet body that narrows to wisps, a round head, dark eyes and mouth. */
function ghostMesh(g) {
  const def = g.def;
  const s = def.size;
  const root = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: def.color, transparent: true, opacity: 0.75, emissive: 0x000000, depthWrite: false });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.6 * s, 1.3 * s, 8, 1, true), mat);
  body.position.y = 0.95 * s;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48 * s, 10, 8), mat);
  head.position.y = 1.65 * s;
  root.add(body, head);
  // Wispy tails.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 0.5 * s, 5), mat);
    tail.position.set(Math.cos(a) * 0.45 * s, 0.15 * s, Math.sin(a) * 0.45 * s);
    tail.rotation.x = Math.PI;
    root.add(tail);
  }
  const dark = new THREE.MeshBasicMaterial({ color: def.boss ? 0xff1744 : 0x111111 });
  for (const x of [-0.17, 0.17]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.13 * s, 0.2 * s, 0.05), dark);
    eye.position.set(x * s, 1.72 * s, 0.44 * s);
    root.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18 * s, 0.14 * s, 0.05), dark);
  mouth.position.set(0, 1.45 * s, 0.46 * s);
  root.add(mouth);
  if (def.blast) {
    // A Boomer: a lit fuse on its head.
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0x3e2723 }));
    fuse.position.y = 2.2 * s;
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffea00 }));
    spark.position.y = 2.38 * s;
    root.add(fuse, spark);
  }
  if (def.keep) {
    // A Spitter: a wide glowing mouth.
    mouth.material = new THREE.MeshBasicMaterial({ color: 0xd500f9 });
    mouth.scale.set(1.6, 1.4, 1);
  }
  if (def.boss) {
    // The Caller: an old phone receiver in its hand, and a crown of candles.
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.6 * s, 0.15 * s), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    phone.position.set(0.55 * s, 1.6 * s, 0.1 * s);
    phone.rotation.z = 0.4;
    root.add(phone);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.25 * s, 0.08 * s), new THREE.MeshBasicMaterial({ color: 0xff5252 }));
      c.position.set(Math.cos(a) * 0.3 * s, 2.15 * s, Math.sin(a) * 0.3 * s);
      root.add(c);
    }
  }
  root.userData.body = body;
  if (def.shield) {
    const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95 * s, 1), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, wireframe: true, transparent: true, opacity: 0.6 }));
    sh.position.y = 1.2 * s;
    root.add(sh);
    root.userData.shield = sh;
  }
  if (!def.boss) {
    // A small health bar over its head.
    const bar = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.08), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.08), new THREE.MeshBasicMaterial({ color: 0xff5252 }));
    fg.geometry.translate(0.4, 0, 0);
    fg.position.set(-0.4, 0, 0.01);
    bar.add(bg, fg);
    bar.position.y = 2.25 * s + (def.blast ? 0.3 : 0);
    root.add(bar);
    root.userData.bar = bar;
  }
  return root;
}

function shotMesh(o, color) {
  if (o.look === 'knife') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), new THREE.MeshLambertMaterial({ color: 0xcfd8dc }));
    return m;
  }
  const c = o.look === 'bomb' ? 0xff4081 : color;
  return new THREE.Mesh(new THREE.SphereGeometry(o.size ?? 0.1, 8, 6), new THREE.MeshBasicMaterial({ color: c }));
}

function trapMesh(o) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.4), new THREE.MeshLambertMaterial({ color: 0x424242 }));
  box.position.y = 0.12;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 0.6, o.r, 3, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  cone.position.y = 1.5;
  g.add(box, cone);
  return g;
}

/** The thing in your hand, by class (seen from behind, at the bottom right). */
function viewModel(cls) {
  const g = new THREE.Group();
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, c, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const col = new THREE.Color(CLASSES[cls].color).getHex();
  if (cls === 'paintballer') {
    box(0.08, 0.1, 0.4, 0x263238);
    box(0.14, 0.14, 0.14, col, 0, 0.11, 0.05); // the paint hopper
    box(0.04, 0.04, 0.2, 0x111111, 0, 0.01, -0.28);
  } else if (cls === 'john') {
    box(0.07, 0.08, 0.6, 0x3e2723, 0, 0, -0.05);
    box(0.05, 0.05, 0.5, 0x37474f, 0, 0.05, -0.2);
  } else if (cls === 'lightBeamer') {
    box(0.1, 0.1, 0.35, 0x455a64);
    const lens = box(0.14, 0.14, 0.05, 0xffee58, 0, 0, -0.2);
    lens.material = new THREE.MeshBasicMaterial({ color: 0xfff59d });
  } else if (cls === 'ghostbuster') {
    box(0.08, 0.1, 0.45, 0x424242);
    box(0.05, 0.05, 0.12, col, 0, 0.02, -0.28);
    box(0.06, 0.12, 0.08, 0x212121, 0, -0.08, 0.05);
  } else if (cls === 'knifer') {
    box(0.04, 0.05, 0.12, 0x3e2723, 0, 0, 0.05);
    box(0.02, 0.06, 0.32, 0xcfd8dc, 0, 0.01, -0.17);
  } else {
    // Allister: a big vacuum nozzle.
    box(0.14, 0.14, 0.3, 0x5d4037);
    box(0.08, 0.08, 0.35, col, 0, 0, -0.3);
    box(0.18, 0.06, 0.06, 0x212121, 0, 0, -0.48);
  }
  return g;
}

/** Dark wood planks, drawn once. */
function planks() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    x.fillStyle = `hsl(25, 35%, ${12 + (i % 3) * 3}%)`;
    x.fillRect(0, i * 16, 128, 16);
    x.fillStyle = 'rgba(0,0,0,0.5)';
    x.fillRect(0, i * 16 + 15, 128, 1);
    x.fillRect(((i * 53) % 128), i * 16, 1, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 8);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Old striped wallpaper, drawn once. */
function wallpaper() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#3a2440';
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#2c1a31';
  for (let i = 0; i < 64; i += 16) x.fillRect(i, 0, 6, 64);
  x.fillStyle = '#5a3a55';
  for (let i = 8; i < 64; i += 16) x.fillRect(i, 28, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
