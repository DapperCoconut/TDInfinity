// handleEvents: shows what just happened in the sim (shots, hits, blasts, abilities, deaths...).
// One "case" per kind of event; find one by searching for its name, like case 'shot'.
// These are methods of GameClient: game.js puts them on the class, so "this" is the game client.

import * as THREE from 'three';
import { DIFFICULTIES, ENEMIES, GAME, PERK_NAMES, TOWERS, TRACKS, VERSUS, WAVES, difficulty, rootType } from '../config.js';
import { profile } from '../profile.js';
import { CONTRACTS } from '../lastlaugh.js';
import { LEAP_TIME } from '../views.js';
import { audio } from '../audio.js';
import { NM_STATE } from '../nightmareworld.js';
import { FR_STATE } from '../frostworld.js';
import { MODEL_SCALE } from '../scale.js';
import { BOUNDS, path } from '../sim/path.js';
import { CASTLE, laneOf, laneOz, mapInfo, mapKey } from '../sim/map.js';
import { candyFor } from '../halloweenpass.js';
import { ICE_NADE, ORDINAL } from './shared.js';

// What an order from the wheel says on the map (the hub puts the same words in chat).
const ORDER_WORDS = { upgrade: 'Upgrade!', sell: 'Sell!', move: 'Move here!', build: 'Build here!', defend: 'Defense!', farm: 'Farm up!', save: 'Save cash!', look: 'Look!' };

export class GameEvents {

  handleEvents(evs) {
    const st = this.state;
    const myId = this.session.myId;
    for (const ev of evs) {
      switch (ev.k) {
        case 'shot': {
          const e = this.enemyViews.get(ev.e);
          if (ev.dr) this.towerViews.get(ev.t)?.droneShoot(e, this.effects, audio); // Ghost C7 Drone
          else this.towerViews.get(ev.t)?.shoot(e, this.effects, audio);
          if (ev.c && e) this.effects.text(e.aimPoint(new THREE.Vector3()).add(new THREE.Vector3(0, 2.5, 0)), ev.c === 2 ? 'POW!' : 'CRIT!', ev.c === 2 ? '#ffd740' : '#ff7043', 2); // Brawler combo finisher / Warden critical hit
          break;
        }
        case 'cloak': {
          // Ghost Grenade: a purple smoke burst; towers inside turn stealthy.
          const v = this.towerViews.get(ev.id);
          if (!v) break;
          const at = new THREE.Vector3(v.x, 0.3, v.z);
          this.effects.pulse(at, ev.r, 0.6, 0x7e57c2);
          this.effects.puff(at.clone().setY(1.5), 0x9575cd, 16, 0.7, 6);
          audio.lob('gas');
          break;
        }
        case 'exposed': {
          const v = this.towerViews.get(ev.id);
          if (v) this.effects.text(new THREE.Vector3(v.x, 8 * MODEL_SCALE, v.z), 'Revealed!', '#b39ddb', 1.8);
          break;
        }
        case 'block':
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.p ? 'Parried!' : 'Blocked!', '#90caf9', 2.4); // Gladiator parry / Warden riot shield
          break;
        case 'bounce': {
          // Executioner axe / Archer (Bowmaster) arrow: hits its target, then bounces from zombie to zombie.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const first = this.enemyViews.get(ev.es[0]);
          const from = v.fireFrom(first?.pos.x ?? null, first?.pos.z ?? null, new THREE.Vector3());
          const color = ev.m === 'flame' ? 0xff7043 : ev.m === 'explosive' ? 0xffab40 : ev.m === 'shock' ? 0x80d8ff : v.model.tracer ?? 0xd7ccc8;
          let prev = from;
          for (const id of ev.es) {
            const e = this.enemyViews.get(id);
            if (!e) continue;
            const p = e.aimPoint(new THREE.Vector3());
            this.effects.tracer(prev, p, color, ev.axe ? 0.3 : 0.16);
            e.hit();
            prev = p;
          }
          if (ev.axe && first) this.effects.axe(from, first.aimPoint(new THREE.Vector3()), 0.25);
          if (ev.m === 'shock') this.effects.lightning([from, prev], 0x80d8ff);
          audio.shot(v.level, v.type);
          break;
        }
        case 'bleedBurst': {
          // Slasher: maxed-out Bleed bursts.
          const e = this.enemyViews.get(ev.e);
          if (!e) break;
          const at = e.aimPoint(new THREE.Vector3());
          this.effects.puff(at, 0xb71c1c, 18, 0.6, 8);
          this.effects.text(at.clone().add(new THREE.Vector3(0, 2.5, 0)), 'BLEED!', '#ff1744', 2.4);
          break;
        }
        case 'quake': {
          // Sledger Aftershock: an icy shockwave around the tower.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.4, 0x80d8ff);
          this.effects.puff(at.clone().setY(1), 0xb3e5fc, 12, 0.5, 8);
          audio.boom(2);
          break;
        }
        case 'fpsShot': {
          // Gatling Gun FPS Mode: a straight bullet that pierces the zombies it hits.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(null, null, new THREE.Vector3());
          const to = new THREE.Vector3(ev.x, ev.y, ev.z);
          this.effects.tracer(from, to, v.model.tracer ?? 0xffe066, v.model.tracerWidth);
          this.effects.flash(from, 0xfff3b0, 0.8);
          for (const id of ev.es) this.enemyViews.get(id)?.hit();
          if (v.model.spin) v.spinSpeed = 30;
          audio.shot(v.level, v.type);
          break;
        }
        case 'reload': {
          const t = st.towers.get(ev.t);
          if (t?.owner === myId && ev.d >= 2) this.effects.text(new THREE.Vector3(t.x, 7 * MODEL_SCALE, t.z), 'Reloading!', '#ffe082', 1.6);
          break;
        }
        case 'pellets': {
          // Pump Shotgunner: a tracer to every zombie hit, plus a few stray pellets.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(null, null, new THREE.Vector3());
          for (const id of ev.es) {
            const e = this.enemyViews.get(id);
            if (!e) continue;
            this.effects.tracer(from, e.aimPoint(new THREE.Vector3()), v.model.tracer ?? 0xffab40);
            e.hit();
          }
          for (let i = 0; i < 3; i++) {
            const a = ev.a + (Math.random() * 2 - 1) * ev.c;
            const to = from.clone().add(new THREE.Vector3(Math.sin(a) * ev.r, -from.y + 1, Math.cos(a) * ev.r));
            this.effects.tracer(from, to, v.model.tracer ?? 0xffab40, 0.08);
          }
          this.effects.flash(from, 0xfff3b0, 1.1);
          audio.shot(v.level, v.type);
          break;
        }
        case 'zap': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const first = this.enemyViews.get(ev.es[0]);
          const pts = [v.fireFrom(first?.pos.x ?? null, first?.pos.z ?? null, new THREE.Vector3())];
          for (const id of ev.es) {
            const e = this.enemyViews.get(id);
            if (!e) continue;
            pts.push(e.aimPoint(new THREE.Vector3()));
            e.hit();
          }
          this.effects.lightning(pts, v.model.tracer ?? 0x80d8ff);
          audio.shot(v.level, v.type);
          break;
        }
        case 'trapThrow': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(ev.x, ev.z, new THREE.Vector3());
          this.effects.lob(from, new THREE.Vector3(ev.x, 0.3, ev.z), ev.d, v.model.projectile);
          audio.lob(v.type);
          break;
        }
        case 'trapGone':
          if (ev.kind === 'grave') {
            // Raise the Dead: the gravestone bursts and a skeleton climbs out.
            this.effects.puff(new THREE.Vector3(ev.x, 1, ev.z), 0x9e9e9e, 10, 0.5, 7);
            this.effects.puff(new THREE.Vector3(ev.x, 1.5, ev.z), 0x76ff03, 6, 0.3, 4);
          } else if (ev.kind === 'sentry') {
            this.effects.puff(new THREE.Vector3(ev.x, 1.5, ev.z), 0x616161, 10, 0.45, 7);
            audio.kill();
          } else if (ev.kind === 'gas') {
            this.effects.puff(new THREE.Vector3(ev.x, 0.8, ev.z), 0x9ccc3c, 5, 0.4, 3); // the cloud thins out
          } else if (ev.kind === 'thermite') {
            this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x424242, 8, 0.4, 5); // burns out in smoke
          } else if (ev.kind === 'thorns') {
            this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x558b2f, 6, 0.4, 4); // thorns wither away
          } else if (ev.kind === 'goo') {
            this.effects.puff(new THREE.Vector3(ev.x, 0.5, ev.z), 0x76ff03, 8, 0.4, 4); // the puddle dries up
          } else if (ev.kind !== 'mine') this.effects.puff(new THREE.Vector3(ev.x, 0.4, ev.z), 0x8d6e63, 6, 0.35, 5);
          break;
        case 'bolt': {
          // Necromancer: a piercing bolt through every zombie it hits, out to the edge of its range.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(ev.x, ev.z, new THREE.Vector3());
          const color = v.model.tracer ?? 0xb388ff;
          const to = new THREE.Vector3(ev.x, from.y, ev.z);
          const last = ev.es.length ? this.enemyViews.get(ev.es[ev.es.length - 1]) : null;
          if (last) to.copy(last.aimPoint(new THREE.Vector3()));
          this.effects.tracer(from, to, color, (v.model.tracerWidth ?? 0.25) * (ev.m ? Math.min(2, ev.m) : 1));
          for (const id of ev.es) this.enemyViews.get(id)?.hit();
          this.effects.flash(from, color, 0.9);
          audio.shot(v.level, v.type);
          break;
        }
        case 'building': {
          const t = st.towers.get(ev.t);
          if (t?.owner === myId) this.effects.text(new THREE.Vector3(t.x, 7 * MODEL_SCALE, t.z), TOWERS[t.type].levels[t.level].souls ? 'Raising a grave…' : 'Building…', '#ffe082', 1.6);
          break;
        }
        case 'grave':
          this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x5d4037, 10, 0.45, 6);
          this.effects.puff(new THREE.Vector3(ev.x, 1.2, ev.z), 0xb388ff, 5, 0.3, 3);
          break;
        case 'graveUp':
          this.effects.puff(new THREE.Vector3(ev.x, 1.5, ev.z), ev.lvl >= 3 ? 0xff1744 : 0x76ff03, 8, 0.35, 4);
          this.effects.text(new THREE.Vector3(ev.x, 5 * MODEL_SCALE, ev.z), `Grave Lv ${ev.lvl}`, ev.lvl >= 3 ? '#ff5252' : '#b2ff59', 1.8);
          break;
        case 'sentry':
          this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x9e9e9e, 10, 0.45, 6);
          audio.place();
          break;
        case 'sshot':
          this.trapViews.get(ev.s)?.shoot(this.enemyViews.get(ev.e), this.effects, audio, ev.c);
          break;
        case 'overcharge': {
          const t = st.towers.get(ev.t);
          if (t) this.effects.puff(new THREE.Vector3(t.x, 4, t.z), 0xb0bec5, 8, 0.4, 4); // vents steam while it cools
          break;
        }
        case 'goons':
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.n > 1 ? 'Goons!' : 'Goon!', '#ffca28', 2.4);
          break;
        case 'heal':
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), `+${ev.v} HP`, '#69f0ae', 2.4);
          break;
        case 'ushot':
          this.unitViews.get(ev.u)?.shoot(this.enemyViews.get(ev.e), this.effects, audio, ev.i, ev.c, ev.rail);
          break;
        case 'udie': {
          const v = this.unitViews.get(ev.u);
          if (v) {
            v.dispose();
            this.unitViews.delete(ev.u);
          }
          const at = new THREE.Vector3(ev.x, 1, ev.z);
          if (ev.wilt) {
            this.effects.puff(at, 0x8bc34a, 6, 0.35, 4); // a plant wilts / an Ice Turret melts
          } else if (ev.boom) {
            this.effects.explosion(at, 5);
            audio.boom(5);
          } else {
            this.effects.puff(at, 0x616161, 10, 0.5, 8);
            audio.kill();
          }
          break;
        }
        case 'strike': {
          // Airstrike: a bomb whistles down from high above.
          const to = new THREE.Vector3(ev.x, 0.3, ev.z);
          const v = ev.t != null ? this.towerViews.get(ev.t) : null;
          if (v) {
            // Commando Concussive Missiles: they arc up from the tower and come down on the spot.
            this.effects.bomb(new THREE.Vector3((v.x + ev.x) / 2, 45, (v.z + ev.z) / 2), to, ev.d);
            if (!ev.n) audio.missile();
            break;
          }
          this.effects.bomb(new THREE.Vector3(ev.x - 25, 45, ev.z), to, ev.d);
          if (!ev.n) audio.jet(); // one jet per plane, even when it drops several bombs
          break;
        }
        case 'pshot': {
          // Psycho Slayer: a mace Slam on the strongest zombie nearby, or a railgun shot.
          const v = this.towerViews.get(ev.t);
          const e = this.enemyViews.get(ev.e);
          if (!v || !e) break;
          const to = e.aimPoint(new THREE.Vector3());
          if (ev.fx === 'slam') {
            v.recoil = 1; // the mace arm swings
            setTimeout(() => {
              this.effects.whirl(new THREE.Vector3(to.x, 0, to.z), Math.max(2, ev.r));
              this.effects.flash(to, 0xffab40, 1.2);
              this.effects.text(to.clone().add(new THREE.Vector3(0, 2.5, 0)), 'SLAM!', '#ffab40', 2);
              e.hit();
              audio.boom(4);
            }, ev.d * 1000);
          } else {
            setTimeout(() => {
              if (!this.towerViews.has(ev.t)) return;
              const at = e.aimPoint(new THREE.Vector3());
              const from = v.fireFrom(at.x, at.z, new THREE.Vector3());
              this.effects.tracer(from, at, 0xff1744, 0.45);
              this.effects.flash(at, 0xff8a80, 1);
              audio.shot(v.level, v.type);
            }, ev.d * 1000);
          }
          break;
        }
        case 'b52': {
          // MLRS Carpet Bomb: the B-52 is on its way (its bombs come as 'strike' events).
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), 'Carpet Bomb!', '#ffca28', 3);
          break;
        }
        case 'rave': {
          this.effects.rave(new THREE.Vector3(ev.x, 0.4, ev.z), ev.r);
          audio.rave();
          break;
        }
        case 'ability':
          if (ev.owner === myId) audio.upgrade();
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.name, '#e1bee7', 2.6);
          break;
        case 'order': {
          // A player's order from the wheel (see wheel.js): a ring and its words where it points.
          if (ev.x == null) break;
          const color = ev.color ?? 0xffffff;
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.pulse(at, 5, 0.9, color);
          this.effects.text(at.clone().setY(6 * MODEL_SCALE), `📣 ${ORDER_WORDS[ev.cmd] ?? ev.cmd}`, '#' + color.toString(16).padStart(6, '0'), 3);
          break;
        }
        case 'drop': {
          const v = this.towerViews.get(ev.t);
          if (v) this.effects.bomb(v.bayPosition(new THREE.Vector3()), new THREE.Vector3(ev.x, 0.3, ev.z), ev.d);
          break;
        }
        case 'missile': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const last = new THREE.Vector3();
          const target = (out) => {
            const ev2 = this.enemyViews.get(ev.e);
            if (ev2) ev2.aimPoint(last);
            return out.copy(last);
          };
          target(last);
          this.effects.missile(v.podPosition(ev.i, new THREE.Vector3()), target, ev.d);
          audio.missile();
          break;
        }
        case 'uflame': {
          // Field Barracks Flamethrower: a spray of fire toward its target.
          const v = this.unitViews.get(ev.u);
          if (!v) break;
          v.aimAt(ev.y);
          this.effects.flames(v.muzzlePosition(new THREE.Vector3()), ev.y, ev.r, 0.5);
          audio.flame();
          break;
        }
        case 'ulob': {
          // Mercenary Grenadier: a grenade arcing from the unit to where the zombie will be.
          const v = this.unitViews.get(ev.u);
          if (!v) break;
          v.aimAt(ev.x, ev.z);
          this.effects.lob(v.muzzlePosition(new THREE.Vector3()), new THREE.Vector3(ev.x, 0.3, ev.z), ev.d, v.m.projectile);
          audio.lob('grenadier');
          break;
        }
        case 'cluster':
          // Classic Mortar cluster bombs bouncing out of the blast.
          this.effects.lob(new THREE.Vector3(ev.x + ev.fx, 0.5, ev.z + ev.fz), new THREE.Vector3(ev.x, 0.3, ev.z), ev.d, { color: 0x3e2723, size: 0.4, arc: 5 });
          break;
        case 'airdrop':
          this.effects.puff(new THREE.Vector3(ev.x, 1, ev.z), 0xbcaaa4, 14, 0.6, 10);
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.relic ? 'Relic Summon!' : 'Air-Drop!', ev.relic ? '#ffe082' : '#ffca28', 2.6);
          if (!ev.relic) audio.jet();
          break;
        case 'smite': {
          // Tesla Smite: a thunderbolt from the sky and a crackling blast where it lands.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          const pts = [at.clone().setY(45)];
          for (let i = 1; i < 6; i++) pts.push(new THREE.Vector3(ev.x + (Math.random() - 0.5) * 3, 45 - i * 7.5, ev.z + (Math.random() - 0.5) * 3));
          pts.push(at);
          this.effects.lightning(pts, 0xb3e5fc);
          this.effects.pulse(at, ev.r, 0.45, 0x80d8ff);
          this.effects.flash(at.clone().setY(1.5), 0xe1f5fe, ev.r * 0.8);
          for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
          audio.boom(ev.r * 2);
          break;
        }
        case 'sprout': {
          // Biologist plant / Elementalist Ice Turret popping up.
          const at = new THREE.Vector3(ev.x, 0.8, ev.z);
          this.effects.puff(at, ev.ice || ev.bubble ? 0xb3e5fc : ev.paint ? 0xce93d8 : ev.volt ? 0xffee58 : 0x66bb6a, 8, 0.4, 4); // Stella paint, Volt Point
          break;
        }
        case 'gsword': {
          // Gold Commander: a huge golden broadsword sweep all around him.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.whirl(at, ev.r);
          this.effects.pulse(at, ev.r, 0.35, 0xffd740);
          this.effects.puff(at.clone().setY(2), 0xffe082, 10, 0.4, ev.r);
          this.towerViews.get(ev.id)?.swingSword();
          audio.lob('grenadierAssaultBottom');
          break;
        }
        case 'wheel': {
          // Last Laugh: someone spun the little jester's wheel.
          this.spinWheelFx(ev.win);
          const who = ev.by === myId ? 'You' : st.players.get(ev.by)?.name ?? 'Someone';
          if (ev.win) {
            this.ui.toast(`🟨 YELLOW! ${who} hit the jackpot and the jester vanished. The final boss will be the JESTER!`, 4000);
            audio.waveStart();
          } else {
            this.ui.toast(`🟥 Red! ${who} spun the wheel: ${ev.extra} more enemies are coming.`, 2200);
            if (ev.open) setTimeout(() => this.ui.toast('🧭 The board is open! Enemies take the shortest way to the base now. Build fences (key 7) to make it longer.', 5000), 2300);
          }
          break;
        }
        case 'jesterBoost':
          this.ui.toast('🃏 The JESTER is a quarter of the way down your path: your towers hit much harder and faster!', 3500);
          audio.waveStart();
          break;
        case 'contractDone': {
          const def = CONTRACTS[ev.key];
          if (profile.finishContract(ev.key)) {
            this.ui.toast(`🏆 Contract complete: ${def?.name ?? 'Contract'}!${ev.endless ? ' The Backrooms go on forever: how far can you get?' : ''}`, 4500);
            const got = profile.halloweenRewards();
            if (got.length) setTimeout(() => this.ui.toast(`🎁 Halloween reward: ${got.join(', ')}!`, 4500), 4600);
          }
          break;
        }
        case 'lmShift':
        case 'lmOffer':
        case 'lmPicked':
          this.liminalEvent(ev); // Liminal contract: the rooms shift, tower picks
          break;
        case 'dice': {
          // Last Laugh: the JESTER's exploding dice.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.pulse(at, ev.r, 0.45, 0xffffff);
          this.effects.puff(at.clone().setY(1.5), 0xe040fb, 16, 0.6, 12);
          this.effects.text(at.clone().setY(5), `🎲 ${ev.roll}`, '#ffffff', 2);
          audio.boom(3);
          break;
        }
        case 'courtRoute':
          break; // (the route is redrawn by syncContract)
        case 'chaos':
          // Chaos Jester outcomes, Oddport revives, Kart Kid stars.
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.text, ev.color, 2.6);
          break;
        case 'battery': {
          // Star Cannon: a kill dropped a battery.
          this.effects.text(new THREE.Vector3(ev.x, 6 * MODEL_SCALE, ev.z), '🔋 +charge', '#ffd740', 1.6);
          break;
        }
        case 'confuse': {
          // Spotlight Tech: everything in the light is confused.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.pulse(at, ev.r, 0.5, 0xd500f9);
          this.effects.text(at.clone().setY(7), 'Confused!', '#ea80fc', 2);
          break;
        }
        case 'boom': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          if (ev.bomb) {
            // Jester: the bomb's colors show which bombs it carries.
            const colors = { fire: 0xff6d00, ice: 0x80d8ff, poison: 0x76ff03, confuse: 0xd500f9 };
            const keys = ev.bomb.split(',');
            for (const k of keys) this.effects.puff(at.clone().setY(1), colors[k] ?? 0xffffff, 8, 0.45, 3 + ev.r);
            if (keys.includes('fire') || keys.includes('poison')) this.effects.explosion(at, Math.min(ev.r, 3));
            if (keys.includes('ice')) this.effects.iceBlast(at, ev.r);
            if (keys.includes('confuse')) this.effects.pulse(at, ev.r, 0.4, 0xd500f9);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.boom(ev.r);
            break;
          }
          if (ev.fw) {
            // Firework Technician: a burst of colored sparks.
            const c = [0xff1744, 0xffea00, 0x2979ff, 0x00e676, 0xd500f9][Math.floor(Math.random() * 5)];
            this.effects.puff(at.clone().setY(2), c, 10, 0.5, 5 + ev.r * 2);
            this.effects.flash(at.clone().setY(2), c, ev.r + 1);
            audio.boom(1.5);
            break;
          }
          if (ev.heat) {
            // Elementalist Heatwave: a ring of fire around the tower.
            this.effects.pulse(at, ev.r, 0.6, 0xff6d00);
            this.effects.puff(at.clone().setY(1), 0xff9100, 14, 0.6, ev.r);
            audio.boom(ev.r);
            break;
          }
          if (ev.neuro) {
            // Saboteur Aggressive Toxins: a pink-purple burst; zombies inside are Neuralyzed.
            this.effects.puff(at.clone().setY(1), 0xea80fc, 12, 0.6, 5);
            this.effects.pulse(at, ev.r, 0.5, 0xe040fb);
            this.effects.text(at.clone().setY(7), 'Neuralyzed!', '#ea80fc', 2.2);
            audio.lob('gas');
            break;
          }
          if (ev.nuke) {
            this.effects.nuke(at, ev.r);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.boom(ev.r * 2);
            break;
          }
          if (ev.flash) {
            // Breacher Flashbang: a white flash; zombies inside are stunned.
            this.effects.flash(at.clone().setY(1.5), 0xffffff, ev.r);
            this.effects.pulse(at, ev.r, 0.4, 0xfffde7);
            audio.boom(ev.r);
            break;
          }
          if (ev.ice) {
            this.effects.iceBlast(at, ev.r);
            audio.ice();
            break;
          }
          if (ev.gas) {
            // Toxicnator grenade: a burst of green gas.
            this.effects.puff(at.clone().setY(1), 0x9ccc3c, Math.min(14, 5 + Math.round(ev.r * 1.5)), 0.6, 4 + ev.r);
            audio.lob('gas');
            break;
          }
          if (ev.paint) {
            this.effects.paintSplat(at, ev.r);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.lob('paint');
            break;
          }
          if (ev.slime) {
            this.effects.slimeSplash(at, ev.r);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.lob('slime');
            break;
          }
          this.effects.explosion(at, ev.r);
          for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
          audio.boom(ev.r);
          break;
        }
        case 'rang':
        case 'knife': {
          // Boomerangs and knives follow the sim's own flight path (bladePos).
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(ev.x, ev.z, new THREE.Vector3());
          const knife = ev.k === 'knife';
          const b = { loop: !knife, ox: v.x, oz: v.z, tx: ev.x, tz: ev.z, side: ev.s };
          this.effects.blade(b, ev.d, from.y, knife ? { color: 0xb0bec5, size: 1, ...v.model.blade, knife } : v.model.projectile); // Archer arrows bring their own look
          audio.lob(v.type);
          break;
        }
        case 'slice':
          this.enemyViews.get(ev.e)?.hit();
          break;
        case 'pulse': {
          // Pulse Trooper: a ring grows out to its range (hits arrive as 'slice' events).
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          v.fireFrom(null, null, new THREE.Vector3());
          this.effects.pulse(new THREE.Vector3(v.x, 0, v.z), ev.r, ev.d, v.model.tracer);
          audio.shot(v.level, v.type);
          break;
        }
        case 'sweep': {
          // Sweeper: two lasers spin around the tower, reaching to the edge of its map (Versus lane).
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const oz = laneOz(laneOf(v.z));
          const bounds = { minX: BOUNDS.minX, maxX: BOUNDS.maxX, minZ: BOUNDS.minZ + oz, maxZ: BOUNDS.maxZ + oz };
          this.effects.sweep(new THREE.Vector3(v.x, 0, v.z), bounds, ev.a, ev.d, ev.s, v.model.tracer);
          audio.sweep(ev.d);
          break;
        }
        case 'leap': {
          // Brawler Reposition: it hops from its old spot and smashes down where it lands.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          if (ev.tp) {
            // Psycho Slayer Teleport: vanishes in a flash and appears at the new spot.
            this.effects.puff(new THREE.Vector3(ev.fx, 2, ev.fz), 0xb388ff, 14, 0.5, 6);
            this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0xb388ff, 14, 0.5, 6);
            this.effects.flash(new THREE.Vector3(ev.x, 2, ev.z), 0xe1bee7, 2);
            break;
          }
          v.leap(ev.fx, ev.fz, ev.x, ev.z);
          setTimeout(() => {
            if (!this.towerViews.has(ev.t)) return;
            this.effects.whirl(new THREE.Vector3(ev.x, 0, ev.z), ev.r);
            this.effects.puff(new THREE.Vector3(ev.x, 1, ev.z), 0xbcaaa4, 14, 0.5, 6);
            for (const e of this.enemyViews.values()) if (Math.hypot(e.pos.x - ev.x, e.pos.z - ev.z) <= ev.r) e.hit();
            audio.shot(v.level, v.type);
          }, LEAP_TIME * 1000);
          break;
        }
        case 'whirl': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          v.fireFrom(null, null, new THREE.Vector3());
          this.effects.whirl(new THREE.Vector3(v.x, 0, v.z), ev.r);
          for (const e of this.enemyViews.values()) if (Math.hypot(e.pos.x - v.x, e.pos.z - v.z) <= ev.r) e.hit();
          audio.shot(v.level, v.type);
          break;
        }
        case 'lob': {
          // Grenade or mortar shell arcing to where the zombie will be.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(ev.x, ev.z, new THREE.Vector3());
          const to = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.lob(from, to, ev.d, ev.nade === 'ice' ? ICE_NADE : v.model.projectile);
          audio.lob(ev.nade ? 'grenadier' : v.type);
          break;
        }
        case 'fly': {
          // A physical projectile (slime glob, harpoon, rebar, thrown grenade) homing in on a zombie.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const last = new THREE.Vector3();
          const target = (out) => {
            this.enemyViews.get(ev.e)?.aimPoint(last);
            return out.copy(last);
          };
          target(last);
          const from = v.fireFrom(last.x, last.z, new THREE.Vector3());
          const nade = ev.nade === 'ice';
          const p = nade ? ICE_NADE : v.model.flight ?? { color: v.model.tracer ?? 0x9e9e9e, size: 0.5 };
          this.effects.toss(from, target, ev.d, nade ? { ...p, arc: 3 } : p);
          if (!nade) this.effects.flash(from, p.color, 0.5);
          if (nade) audio.lob('grenadier');
          else audio.shot(v.level, v.type);
          break;
        }
        case 'impact': {
          // The projectile reached its zombie.
          const e = this.enemyViews.get(ev.e);
          if (!e) break;
          e.hit();
          const at = e.aimPoint(new THREE.Vector3());
          if (ev.ice) {
            this.effects.iceBlast(at, 1.5);
            break;
          }
          const v = this.towerViews.get(ev.t);
          const color = v?.model.flight?.color ?? v?.model.tracer ?? 0xffffff;
          this.effects.flash(at, color, 0.9);
          if (v?.model.flight?.blob) this.effects.puff(at, color, 5, 0.3, 4);
          break;
        }
        case 'rocket': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const last = new THREE.Vector3();
          const target = (out) => {
            this.enemyViews.get(ev.e)?.aimPoint(last);
            return out.copy(last);
          };
          target(last);
          const p = v.model.projectile ?? {};
          this.effects.missile(v.fireFrom(last.x, last.z, new THREE.Vector3()), target, ev.d, p.color, p.size);
          audio.rocket(v.level, v.type);
          break;
        }
        case 'flame': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(null, null, new THREE.Vector3());
          this.effects.flames(from, v.yaw, ev.r, ev.c);
          if (v.model.muzzles.length > 1) this.effects.flames(v.fireFrom(null, null, new THREE.Vector3()), v.yaw, ev.r, ev.c);
          audio.flame();
          break;
        }
        case 'kill': {
          const v = this.enemyViews.get(ev.e);
          if (v?.def.headRoll) {
            // Halloween Jack: falls on his back, his head rolls off, and a whisper.
            audio.whisper();
            this.ui.banner('JACK HAS FALLEN', 'Happy Halloween!', 4000);
          }
          if (v?.def.thaw && mapInfo.frost && !FR_STATE.spring) {
            // Frostwatch Basin: the Frost Spirit falls and the season is restored (snow melts, the portal goes dark).
            FR_STATE.spring = 1;
            this.applyLighting();
            this.setSky(0x6f8584);
            this.ui.banner('THE FROST SPIRIT HAS FALLEN', 'The season is restored!', 4000);
          }
          if (v) {
            v.die(ev.r, this.effects, audio);
            this.enemyViews.delete(ev.e);
            this.dying.push(v);
          }
          break;
        }
        case 'decay': {
          // A corpse crumbles away on its own (no reward).
          const v = this.enemyViews.get(ev.e);
          if (v) {
            v.die(0, this.effects, audio, true);
            this.enemyViews.delete(ev.e);
            this.dying.push(v);
          }
          break;
        }
        case 'slam': {
          // Molten Warlord smashes the ground: a lava shockwave that stuns nearby towers.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.6, ev.c ?? 0xff6d00);
          this.effects.puff(at.clone().setY(1), ev.c ?? 0xff3d00, 20, 0.6, 12);
          audio.boom(5);
          if (ev.spin) this.effects.whirl(at, ev.r);
          if (ev.n) this.ui.toast(`💥 ${ev.name ?? 'The slam'} stunned ${ev.n} tower${ev.n > 1 ? 's' : ''}!`, 1400);
          break;
        }
        // ---------------------------------------------------------------- Medium mode enemies
        case 'jam': {
          // Eradicator Sword Shock: an orange shockwave that makes towers reload much slower.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.6, 0xff9100);
          this.effects.pulse(at, ev.r * 0.6, 0.45, 0xffd180);
          audio.boom(3);
          if (ev.n) this.ui.toast(`🗡️ Sword Shock jammed ${ev.n} tower${ev.n > 1 ? 's' : ''}: they reload much slower!`, 1800);
          break;
        }
        case 'eFlame': {
          // Eradicator Pyrotechnics: a flamethrower in its mouth.
          const v = this.enemyViews.get(ev.e);
          const from = v ? v.aimPoint(new THREE.Vector3()) : new THREE.Vector3(ev.x, 4 * MODEL_SCALE, ev.z + laneOz(ev.L ?? 0));
          this.effects.flames(from, ev.yaw, ev.r, (ev.arc / 2) * (Math.PI / 180));
          break;
        }
        case 'mRage': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(4), 0xff1744, 24, 0.8, 12);
          audio.waveStart();
          this.shake?.(0.5, 1.2);
          this.ui.toast(ENEMIES[st.enemies.get(ev.e)?.type]?.rage?.intro ?? '😡 Electronic Rage!', 3500);
          break;
        }
        // ---------------------------------------------------------------- Hard mode (Fallen) enemies
        case 'gift': {
          // Fallen Jester: a gift bursts, buffing the enemies around it.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.5, 0x2979ff);
          this.effects.puff(at.clone().setY(2), 0x82b1ff, 12, 0.5, 8);
          break;
        }
        case 'goo': // Necrotic Skeleton: a puddle of goo that heals enemies
          this.effects.puddle(new THREE.Vector3(ev.x, 0, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, 0x00e5ff);
          break;
        case 'cloak': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(3), 0x263238, 16, 0.6, 8);
          this.ui.toast(`👻 The ${v?.def.name ?? 'enemy'} turned hidden!`, 2000);
          break;
        }
        case 'kingHorde': {
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          if (v) this.effects.pulse(v.pos.clone().setY(0.3), 14, 0.8, 0x18ffff);
          audio.waveStart();
          this.shake?.(0.5, 1.2);
          this.ui.toast(`👑 The Fallen King raised his sword and summoned ${ev.n} Fallen!`, 3000);
          break;
        }
        case 'kingSwing': {
          // Fallen King Sword Swing: three slashes, the last a full circle.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          if (ev.arc >= 360) this.effects.whirl(at, ev.r);
          this.effects.pulse(at, ev.r * (0.6 + 0.2 * ev.i), 0.45, 0x18ffff);
          audio.boom(4);
          if (ev.n) this.ui.toast(`⚔️ Sword Swing stunned ${ev.n} tower${ev.n > 1 ? 's' : ''}!`, 1200);
          break;
        }
        case 'comet': {
          // Fallen Comet: purple spikes rain down on the whole map.
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          if (v) {
            for (let i = 0; i < 24; i++) {
              const p = v.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 120, 3, (Math.random() - 0.5) * 120));
              this.effects.puff(p, 0xd500f9, 4, 0.5, 4);
            }
          }
          audio.boom(6);
          this.shake?.(0.6, 1.4);
          this.ui.toast(`☄️ FALLEN COMET! ${ev.n} tower${ev.n === 1 ? ' is' : 's are'} stunned for 5s!`, 2500);
          break;
        }
        case 'boneArmor': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(4), 0xe0e0e0, 14, 0.6, 8);
          this.ui.toast(`🦴 Bone Armor! The Fallen King now has ${ev.a}% defense.`, 2000);
          break;
        }
        case 'cashDrop':
          this.effects.text(new THREE.Vector3(ev.x, 8, ev.z + laneOz(ev.L ?? 0)), `+$${ev.v.toLocaleString()}`, '#ffd740', 3.5);
          audio.cash?.();
          break;
        case 'waveTimer':
          this.ui.toast('⏱️ Time\'s up: the next wave is here!', 1600);
          break;
        case 'axe': {
          const oz = laneOz(ev.L ?? 0);
          this.enemyViews.get(ev.e)?.attack();
          this.effects.axe(new THREE.Vector3(ev.fx, 9 * MODEL_SCALE, ev.fz + oz), new THREE.Vector3(ev.x, 1.5, ev.z + oz), ev.d);
          audio.rocket(1);
          break;
        }
        case 'axeHit': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.5, 0xff9100);
          this.effects.puff(at.clone().setY(1), 0xff6d00, 14, 0.5, 10);
          audio.boom(3);
          break;
        }
        // ---------------------------------------------------------------- Hard mode enemies
        case 'eShot': {
          // An enemy attacks a tower: fireballs, boulders, magma, crossbow bolts, lasers, turrets, missiles.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          const from = v ? v.aimPoint(new THREE.Vector3()) : new THREE.Vector3(ev.fx, 4 * MODEL_SCALE, ev.fz + oz);
          const to = new THREE.Vector3(ev.x, 1.5, ev.z + oz);
          const aim = (out) => out.copy(to);
          if (ev.kind === 'turret' || ev.kind === 'missile') from.y += (v?.height ?? 0) * 0.25;
          else v?.attack();
          switch (ev.kind) {
            case 'laser':
              this.effects.tracer(from, to, 0xff1744, 0.35);
              this.effects.flash(to, 0xff5252, 1);
              audio.shot(0, 'phaser');
              break;
            case 'turret':
              this.effects.tracer(from, to, 0xffd600, 0.12);
              break;
            case 'fireball':
              this.effects.toss(from, aim, ev.d, { color: 0xff6d00, size: 1.3, arc: 3, glowing: true });
              audio.lob();
              break;
            case 'boulder':
              this.effects.lob(from, to, ev.d, { color: 0x4e342e, size: 1.8, arc: 12 });
              audio.lob('mortar');
              break;
            case 'magma':
              this.effects.lob(from, to, ev.d, { color: 0xff6d00, size: 1.2, arc: 9, glowing: true });
              audio.lob('paint');
              break;
            case 'knife': // Halloween Night 2 Psycho
              this.effects.toss(from, aim, ev.d, { color: 0xcfd8dc, size: 0.7, arc: 1.2, long: true });
              audio.lob('paintballer');
              break;
            case 'bolt':
              this.effects.toss(from, aim, ev.d, { color: 0x5d4037, size: 0.9, arc: 0.3, long: true });
              audio.lob('paintballer');
              break;
            case 'missile':
              this.effects.missile(from, aim, ev.d, 0xff6d00, 1.2);
              audio.missile();
              break;
            case 'rocket': // Expert Doomelist: a giant rocket
              this.effects.missile(from, aim, ev.d, 0xff1744, 2.4);
              audio.missile();
              this.ui.toast('🚀 A Doomelist fired a giant rocket!', 1400);
              break;
            case 'vioOrb': // Expert Vio Gunner
              this.effects.toss(from, aim, ev.d, { color: 0xd500f9, size: 0.9, arc: 1.5, glowing: true });
              if (Math.random() < 0.4) audio.lob('paint');
              break;
            case 'goo': // Bio Gunner
              this.effects.lob(from, to, ev.d, { color: 0xaa00ff, size: 1.1, arc: 6, glowing: true });
              audio.lob('paint');
              break;
            case 'timeLaser': // Time Parasite
              this.effects.tracer(from, to, 0x7c4dff, 0.4);
              this.effects.flash(to, 0xb388ff, 1.2);
              audio.shot(0, 'phaser');
              break;
            case 'shuriken': // Void Ninja / Shadow Master
              this.effects.toss(from, aim, ev.d, { color: 0xff4081, size: 0.7, arc: 0.4, glowing: true });
              if (Math.random() < 0.4) audio.lob('paintballer');
              break;
            case 'magmaShot': // Magma Void corpse
              this.effects.toss(from, aim, ev.d, { color: 0xff3d00, size: 0.8, arc: 2, glowing: true });
              break;
            case 'poisonCloud': // Void Lich
              this.effects.lob(from, to, ev.d, { color: 0x76ff03, size: 1.4, arc: 10, glowing: true });
              audio.lob('paint');
              break;
            case 'revolver': // Medium Predator Triple Shot
              this.effects.tracer(from, to, 0xffab40, 0.2);
              this.effects.flash(to, 0xffd180, 0.8);
              audio.shot(0, 'cowboy');
              break;
            case 'grenade': // Medium Grenadiers
              this.effects.lob(from, to, ev.d, { color: v?.def.mlook === 'eliteGrenadier' ? 0xff9100 : 0x40c4ff, size: 0.7, arc: 6, glowing: true });
              audio.lob();
              break;
            case 'shell': // Hardcore TDX shooters
              this.effects.missile(from, aim, ev.d, 0xff6d00, 0.9);
              if (Math.random() < 0.4) audio.missile();
              break;
            case 'pumpkin': // Hardcore Expired Jack
              this.effects.lob(from, to, ev.d, { color: 0xff6d00, size: 1.6, arc: 10, glowing: true });
              audio.lob('mortar');
              this.ui.toast(`🎃 ${v?.def.name ?? 'Jack'} threw a flaming pumpkin! Towers it hits burn and can't fight for 42 seconds.`, 1800);
              break;
            case 'sword': // Beholder (time dimension): throws its sword
              this.effects.axe(from, to, ev.d);
              audio.rocket(1);
              this.ui.toast('🗡️ The Beholder threw its sword!', 1200);
              break;
          }
          break;
        }
        case 'eHit': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          if (ev.kind === 'magma') {
            this.effects.puddle(at, ev.r, ev.life ?? 6);
            this.effects.puff(at.clone().setY(1), 0xff6d00, 10, 0.5, 8);
          } else if (ev.kind === 'pumpkin') {
            this.effects.pulse(at, ev.r, 0.5, 0xff6d00);
            this.effects.puff(at.clone().setY(1), 0xff3d00, 16, 0.7, 8);
            audio.boom(3);
          } else if (ev.kind === 'voidRock') {
            this.effects.pulse(at, ev.r * 1.5, 0.4, 0xd500f9);
            this.effects.puff(at.clone().setY(1), 0x4a0072, 10, 0.6, 8);
            audio.boom(3);
          } else if (ev.kind === 'boulder') {
            this.effects.pulse(at, ev.r, 0.4, 0x8d6e63);
            this.effects.puff(at.clone().setY(1), 0x4e342e, 14, 0.7, 10);
            audio.boom(4);
          } else if (ev.kind === 'goo') {
            this.effects.puddle(at, ev.r, ev.life ?? 6, 0x9c27b0);
            this.effects.puff(at.clone().setY(1), 0xd500f9, 10, 0.5, 8);
          } else if (ev.kind === 'poisonCloud') {
            this.effects.smoke(at.clone().setY(0.3), ev.r, ev.life ?? 8, [0x33691e, 0x4a148c], 10);
            this.ui.toast('☠️ Poison cloud! Towers inside deal less damage and can\'t use abilities until it fades.', 2200);
          } else if (ev.kind === 'magmaShot') {
            this.effects.puff(at.clone().setY(1), 0xff3d00, 6, 0.4, 6);
          } else if (ev.kind === 'sword') {
            this.effects.pulse(at, ev.r, 0.4, 0xeceff1);
            this.effects.puff(at.clone().setY(1), 0xb388ff, 14, 0.6, 10);
            audio.boom(4);
          } else if (ev.kind === 'grenade') {
            this.effects.pulse(at, ev.r, 0.35, 0x40c4ff);
            this.effects.puff(at.clone().setY(1), 0x9e9e9e, 12, 0.6, 9);
            audio.boom(2);
          } else if (ev.kind === 'rocket') {
            this.effects.explosion(at.clone().setY(0.5), ev.r);
            this.effects.pulse(at, ev.r, 0.5, 0xff1744);
            audio.boom(7);
            this.shake?.(0.4, 0.8);
          } else if (ev.kind === 'vioOrb') {
            this.effects.pulse(at, ev.r, 0.35, 0xd500f9);
            this.effects.puff(at.clone().setY(1), 0xea80fc, 8, 0.4, 6);
          } else if (ev.kind === 'bloodOrb') {
            this.effects.pulse(at, ev.r, 0.4, 0xb71c1c);
            this.effects.puff(at.clone().setY(1), 0xd50000, 12, 0.5, 8);
            audio.boom(2);
          } else if (ev.kind === 'tearOrb') {
            this.effects.pulse(at, ev.r, 0.4, 0xeceff1);
            this.effects.puff(at.clone().setY(1), 0xb388ff, 10, 0.5, 8);
            audio.boom(2);
          } else if (ev.kind === 'swordThrow' || ev.kind === 'crystalThrow') {
            // Insane: a Vengeful Champion's sword / a Ravager's crystal lands on a tower.
            const c = ev.kind === 'swordThrow' ? 0x7c4dff : 0x40c4ff;
            this.effects.pulse(at, Math.max(ev.r, 1.5), 0.4, c);
            this.effects.puff(at.clone().setY(1.5), c, 12, 0.5, 8);
            audio.boom(3);
          } else if (ev.kind === 'eyeLaser') {
            // The Corrupted's eye laser: everything around the target is stunned.
            this.effects.pulse(at, ev.r, 0.6, 0xd500f9);
            this.effects.pulse(at, ev.r * 0.5, 0.4, 0xffffff);
            this.effects.puff(at.clone().setY(1.5), 0xaa00ff, 20, 0.7, 12);
            audio.boom(6);
            this.shake?.(0.4, 0.8);
          } else if (ev.kind === 'fireball' || ev.kind === 'missile') {
            this.effects.pulse(at, Math.max(ev.r, 1.5), 0.35, 0xff9100);
            this.effects.puff(at.clone().setY(1), 0xff6d00, 8, 0.5, 8);
            if (ev.kind === 'fireball') audio.boom(2);
          }
          break;
        }
        case 'slash': {
          // Knight / Eradicator sword sweep around it.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.25, 0xeceff1);
          audio.lob('grenadierAssaultBottom');
          if (ev.spin) {
            // Beholder spin slash: a whirl of violet blades all around it.
            this.effects.whirl(at, ev.r);
            this.effects.pulse(at, ev.r * 0.7, 0.4, 0xb388ff);
            this.ui.toast('🌀 SPIN SLASH!', 1200);
          }
          break;
        }
        case 'dash': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(1), 0xbcaaa4, 8, 0.5, 6);
          break;
        }
        case 'infect': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.6, 0x8e24aa);
          this.effects.puff(at.clone().setY(3), 0xc62828, 10, 0.4, 6);
          break;
        }
        case 'burst': {
          const v = this.enemyViews.get(ev.e) ?? this.dying.find((d) => d.id === ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(2), ev.kind === 'multiply' ? 0x18ffff : 0xff1744, 16, 0.6, 10);
          if (ev.kind === 'berserk') this.ui.toast(`💀 The ${v?.def.name ?? 'Berserker'} burst into ${ev.n} enemies!`, 2000);
          break;
        }
        case 'takeoff':
        case 'land': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(1), 0xff9100, 16, 0.7, 10);
          audio.jet();
          if (ev.k === 'takeoff') this.ui.toast(`🚀 The ${v?.def.name ?? 'Eradicator'} takes flight! Only towers that hit flyers can reach it, and missiles rain down!`, 2500);
          break;
        }
        // ---------------------------------------------------------------- Expert mode enemies
        case 'smog': {
          // Taint: a cloud of dark poison smog that hurts towers inside it.
          this.effects.smoke(new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, [0x4a148c, 0x212121], 5);
          break;
        }
        case 'dHeal': {
          // Devotee: heals the enemies around it as it dies.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.5, 0x69f0ae);
          this.effects.puff(at.clone().setY(2), 0x69f0ae, 8, 0.35, 6);
          break;
        }
        case 'warp': {
          // An enemy comes out of an Engineer's teleporter.
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z + laneOz(ev.L ?? 0)), 0xb388ff, 6, 0.35, 5);
          break;
        }
        case 'summon': {
          if (ev.type === 'amplifier') {
            this.ui.toast('🔊 The Overlord summoned an Amplifier! It speeds up and heals the Overlord: destroy it fast!', 2500);
            audio.waveStart();
          } else if (ev.type === 'teleporter') this.ui.toast('🌀 The Engineer built a teleporter! New enemies come out of it.', 2200);
          else if (ev.type === 'voidHurt') {
            const v = this.enemyViews.get(ev.e);
            if (v) this.effects.puff(v.pos.clone().setY(3), 0xd500f9, 16, 0.6, 10);
          }
          break;
        }
        case 'stomp': {
          // Overlord: a crushing stomp that hurts every tower nearby.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.5, 0xff80ab);
          this.effects.pulse(at, ev.r * 0.6, 0.35, 0xffffff);
          this.effects.puff(at.clone().setY(1), 0xeceff1, 20, 0.7, 12);
          audio.boom(6);
          if (ENEMIES[st.enemies.get(ev.e)?.type]?.voidWorld) this.shake(0.6, 1.5); // VOID's leg slam
          break;
        }
        case 'oBeam': {
          // Overlord: its scepter fires a beam that strikes every tower on the map.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const from = v ? v.aimPoint(new THREE.Vector3()) : null;
          if (from) from.y += v.height * 0.6;
          for (const [x, z] of ev.h) {
            const to = new THREE.Vector3(x, 1.5, z + oz);
            this.effects.tracer(from ?? to.clone().setY(60), to, 0xff80ab, 0.6);
            this.effects.flash(to, 0xff4081, 1.4);
          }
          audio.shot(0, 'phaser');
          this.ui.toast('💥 The Overlord\'s scepter beam strikes every tower!', 1600);
          break;
        }
        case 'barrage': {
          // Overlord: missiles rain down from the starships on towers all over the map (once).
          const oz = laneOz(ev.L ?? 0);
          for (const [x, z, d] of ev.h) {
            const to = new THREE.Vector3(x, 0.3, z + oz);
            const from = new THREE.Vector3(x + (Math.random() - 0.5) * 40, 70, z + oz + (Math.random() - 0.5) * 40);
            this.effects.pulse(to, ev.r, d, 0xff1744);
            this.effects.missile(from, (out) => out.copy(to), d, 0xff4081, 2);
          }
          audio.missile();
          audio.waveStart();
          this.ui.toast('🚀 MISSILE BARRAGE! Missiles are raining down on your towers!', 3500);
          break;
        }
        // ---------------------------------------------------------------- Insane mode enemies
        case 'trail': // Crawler / King: a purple patch that speeds up enemies
          this.effects.puddle(new THREE.Vector3(ev.x, 0, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, ev.c ?? 0x7b1fa2); // Honor Guard: teal goo
          break;
        case 'smoke2': // Smoker: smoke that hides enemies
          this.effects.smoke(new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, [0x616161, 0x424242], 4);
          break;
        case 'arc': {
          // Battery: lightning from it to a tower, jumping on to the towers next to it.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const pts = [v ? v.aimPoint(new THREE.Vector3()) : new THREE.Vector3(ev.h[0][0], 8, ev.h[0][1] + oz)];
          for (const [x, z] of ev.h) pts.push(new THREE.Vector3(x, 2, z + oz));
          this.effects.lightning(pts, 0x40c4ff);
          audio.shot(0, 'electro');
          break;
        }
        case 'emp': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.5, 0x40c4ff);
          this.effects.pulse(at, ev.r * 0.6, 0.35, 0xffffff);
          audio.boom(3);
          if (ev.n) this.ui.toast(`⚡ The Battery's EMP stunned ${ev.n} tower${ev.n > 1 ? 's' : ''} and sped up the enemies around it!`, 1600);
          break;
        }
        case 'stab': {
          // King: a spear thrust at one tower.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const to = new THREE.Vector3(ev.x, 1.5, ev.z + oz);
          if (v) this.effects.tracer(v.aimPoint(new THREE.Vector3()), to, 0xd500f9, 0.5);
          this.effects.puff(to, 0xd500f9, 10, 0.5, 8);
          audio.lob('grenadierAssaultBottom');
          break;
        }
        case 'eBlast': {
          // Radiator: a green nuclear blast when it dies.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.45, ev.c ?? 0x76ff03); // Medium Shocker: blue
          this.effects.puff(at.clone().setY(1.5), ev.c ?? 0x76ff03, 18, 0.6, 12);
          audio.boom(4);
          break;
        }
        case 'lurch': {
          // Glitch: jumps forward in a burst of static.
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(2), 0x00e5ff, 6, 0.4, 6);
          break;
        }
        case 'armorSwap': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(3), ev.on ? 0xffc400 : 0x18ffff, 12, 0.6, 8);
          break;
        }
        case 'rewind': {
          // Rewind: scratches the base, then zips back to the start.
          if (!this.versus || ev.L === this.myLane) audio.baseHit();
          this.effects.puff(new THREE.Vector3(path.end.x, 3, path.end.z + laneOz(ev.L ?? 0)), 0x18ffff, 10, 0.5, 8);
          this.ui.toast('⏪ A Rewind hit your base and rewound to the start!', 1400);
          break;
        }
        case 'timeWave': {
          // Beholder: a wave of slowed time rolls out over your towers.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 1.2, 0x7c4dff);
          this.effects.pulse(at, ev.r * 0.6, 0.9, 0xffd740);
          audio.waveStart();
          if (ev.n) this.ui.toast(`⏳ The Beholder slowed time! ${ev.n} tower${ev.n > 1 ? 's are' : ' is'} working slower for a while.`, 2200);
          break;
        }
        case 'tBomb': {
          this.enemyViews.get(ev.e)?.attack();
          this.effects.flash(new THREE.Vector3(ev.x, 7, ev.z + laneOz(ev.L ?? 0)), 0xffd740, 2);
          audio.lob('mortar');
          this.ui.toast(`💣 TIME BOMB! Click it to defuse it before it blows (${ev.fuse}s)!`, 2600);
          break;
        }
        case 'tbBoom': {
          const at = new THREE.Vector3(ev.x, 0.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.explosion(at, ev.r);
          this.effects.pulse(at, ev.r, 0.5, 0xffd740);
          audio.boom(6);
          this.ui.toast('💥 A time bomb went off!', 1500);
          break;
        }
        case 'defused': {
          if (ev.quiet) break;
          this.effects.puff(new THREE.Vector3(ev.x, 7, ev.z + laneOz(ev.L ?? 0)), 0xffd740, 12, 0.5, 8);
          audio.upgrade();
          const who = ev.by === this.session.myId ? 'You' : this.state.players.get(ev.by)?.name ?? 'Someone';
          this.ui.toast(`✅ ${who} defused a time bomb!`, 1400);
          break;
        }
        case 'swipe': {
          // Beholder: a sword swipe that hurts nearby towers and slows them down for good.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.3, 0xeceff1);
          this.effects.whirl(at, ev.r * 0.8);
          audio.lob('grenadierAssaultBottom');
          if (ev.n) this.ui.toast(`🗡️ The Beholder's sword hit ${ev.n} tower${ev.n > 1 ? 's' : ''}. They'll fire a little slower for good!`, 1800);
          break;
        }
        case 'timeShift': {
          audio.waveStart();
          this.ui.toast(ENEMIES[ev.into]?.shiftIntro ?? '🌌 The Beholder pulled you into the TIME DIMENSION! Your towers were sold. Rebuild fast, it starts moving in 8 seconds!', 6000);
          break;
        }
        // ---------------------------------------------------------------- Expert mode enemies (2026-11-09)
        case 'xSacrifice': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.puddle(at, 4, 60, 0xb71c1c);
          this.effects.puff(at.clone().setY(2), 0xd50000, 24, 0.8, 12);
          audio.waveStart();
          this.ui.toast('🩸 BLOOD SACRIFICE! The Rebirther sits in its blood bowl: 99.9% damage resistance. SELL towers to hurt it (Enforcement Base and Buccaneer crashes work too)!', 6000);
          break;
        }
        case 'xSellHit': {
          const at = new THREE.Vector3(ev.x, 7, ev.z + laneOz(ev.L ?? 0));
          this.effects.text(at, `🩸 -${ev.d.toLocaleString()}`, '#ff5252', 2.4);
          this.effects.puff(at, 0xd50000, 10, 0.5, 6);
          break;
        }
        case 'xUnsheathe': {
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          if (v) this.effects.puff(v.pos.clone().setY(6), 0xb71c1c, 24, 0.8, 12);
          audio.waveStart();
          this.ui.toast('🪽 The Death Angel drew its staff! Now it attacks.', 2600);
          break;
        }
        case 'xMove': {
          const oz = laneOz(ev.L ?? 0);
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + oz);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const plural = (n) => `${n} tower${n === 1 ? '' : 's'}`;
          switch (ev.key) {
            case 'violetCall':
              this.effects.puff(at.clone().setY(3), 0xaa00ff, 20, 0.7, 10);
              this.ui.toast(`🟣 Violet Call! The Rebirther summoned ${ev.n} Scarlets.`, 2000);
              break;
            case 'bloodRain':
              for (const [x, z] of ev.h) this.effects.puff(new THREE.Vector3(x, 4, z + oz), 0xd50000, 5, 0.4, 3);
              audio.boom(2);
              this.ui.toast(`🩸 Blood Rain! ${plural(ev.n)} stunned.`, 1800);
              break;
            case 'ritual':
              this.effects.pulse(new THREE.Vector3(ev.tx, 0.3, ev.tz + oz), 3, 0.8, 0xd50000);
              this.effects.puff(new THREE.Vector3(ev.tx, 3, ev.tz + oz), 0x4a148c, 20, 0.8, 8);
              audio.boom(5);
              this.ui.toast('☠️ RITUAL! The Rebirther killed one of your towers.', 2500);
              break;
            case 'twirl':
              this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.5, 0xb71c1c);
              audio.boom(4);
              if (ev.n) this.ui.toast(`🌀 Twirl stunned ${plural(ev.n)}!`, 1400);
              break;
            case 'bloodAssembly':
            case 'realityTear':
              for (const [x, z, d] of ev.h) {
                const to = new THREE.Vector3(x, 0.3, z + oz);
                this.effects.pulse(to, ev.r, d, ev.key === 'bloodAssembly' ? 0xd50000 : 0xb388ff);
                const from = v ? v.aimPoint(new THREE.Vector3()) : to.clone().setY(30);
                this.effects.lob(from, to, d, { color: ev.key === 'bloodAssembly' ? 0xb71c1c : 0xeceff1, size: 1, arc: 10, glowing: true });
              }
              this.ui.toast(ev.key === 'bloodAssembly' ? '🩸 Blood Assembly! Blood orbs are falling on your towers.' : '🌌 Reality Tear! Orbs of time are raining down.', 1800);
              break;
            case 'purePain':
              this.effects.pulse(at, ev.r, 0.4, 0xff1744);
              this.effects.pulse(at, ev.r * 0.6, 0.3, 0xffffff);
              audio.boom(7);
              this.shake?.(0.5, 1);
              this.ui.toast(`💢 PURE PAIN! The Death Angel's staff hit ${plural(ev.n)} (shields can't block it).`, 2400);
              break;
            case 'timeSnap':
              this.effects.pulse(at, ev.r, 0.5, 0xeceff1);
              this.effects.pulse(at, ev.r * 0.6, 0.35, 0x7c4dff);
              audio.boom(4);
              if (ev.n) this.ui.toast(`🫰 Time Snap stunned ${plural(ev.n)}!`, 1400);
              break;
            // ------------------------------------------------ Insane mode moves
            case 'hammerSmash':
              this.effects.pulse(new THREE.Vector3(ev.tx, 0.3, ev.tz + oz), 3, 0.6, 0x40c4ff);
              this.effects.puff(new THREE.Vector3(ev.tx, 2, ev.tz + oz), 0x9e9e9e, 16, 0.6, 10);
              audio.boom(5);
              this.ui.toast(`🔨 HAMMER SMASH! A tower is stunned for ${ev.stun} seconds.`, 2200);
              break;
            case 'boltSlam':
              this.effects.pulse(at, ev.r, 0.6, 0xaa00ff);
              this.effects.pulse(at, ev.inner, 0.45, 0xea80fc);
              audio.shot(0, 'electro');
              audio.boom(4);
              this.ui.toast(`⚡ BOLT SLAM! Towers around the Boltmaster fire slower${ev.n ? `, and ${plural(ev.n)} got stunned` : ''}.`, 1800);
              break;
            case 'callUnits':
              this.effects.puff(at.clone().setY(3), 0xb388ff, 20, 0.7, 10);
              this.ui.toast(`📣 ${ev.name ?? 'Summon'}! ${ev.n} more enemies appeared.`, 1800);
              break;
            case 'rocketBombard':
            case 'telekinesis':
              for (const [x, z, d] of ev.h) {
                const to = new THREE.Vector3(x, 0.3, z + oz);
                this.effects.pulse(to, ev.r, d, ev.key === 'telekinesis' ? 0xff1744 : 0xff9100);
                const from = v ? v.aimPoint(new THREE.Vector3()) : to.clone().setY(30);
                if (ev.key === 'telekinesis') this.effects.lob(from, to, d, { color: 0x6d4c41, size: 2.2, arc: 14 });
                else this.effects.missile(from, (out) => out.copy(to), d, 0xff6d00, 1.2);
              }
              audio.missile();
              this.ui.toast(ev.key === 'telekinesis' ? '🪨 TELEKINESIS! The Overlord hurls boulders at your towers.' : '🚀 ROCKET BOMBARDMENT! Rockets are flying at your towers.', 2000);
              break;
            case 'minigun':
            case 'thunderstorm': {
              const from = v ? v.aimPoint(new THREE.Vector3()) : null;
              for (const [x, z] of ev.h) {
                const to = new THREE.Vector3(x, 1.5, z + oz);
                if (ev.key === 'minigun') this.effects.tracer(from ?? to.clone().setY(20), to, 0xffd740, 0.2);
                else this.effects.lightning([to.clone().setY(60), to], 0xb388ff);
                this.effects.flash(to, ev.key === 'minigun' ? 0xffd740 : 0xb388ff, 1.2);
              }
              audio.shot(0, ev.key === 'minigun' ? 'minigun' : 'electro');
              this.ui.toast(ev.key === 'minigun' ? `🔫 MINIGUN MAYHEM! ${plural(ev.n)} stunned.` : `🌩️ THUNDERSTORM! ${plural(ev.n)} stunned.`, 1800);
              break;
            }
            case 'swordThrow':
            case 'crystalThrow':
            case 'eyeLaser': {
              const to = new THREE.Vector3(ev.tx, 1.5, ev.tz + oz);
              const from = v ? v.aimPoint(new THREE.Vector3()) : to.clone().setY(20);
              if (ev.key === 'eyeLaser') {
                this.effects.pulse(to.clone().setY(0.3), ev.r, ev.d, 0xd500f9); // where it will hit
                this.effects.tracer(from, to, 0xd500f9, 0.5);
                this.ui.toast('👁️ The Corrupted is charging its eye at your towers!', 2000);
              } else this.effects.lob(from, to, ev.d, { color: ev.key === 'swordThrow' ? 0x7c4dff : 0x40c4ff, size: 1, arc: 4, glowing: true });
              break;
            }
            case 'vengefulSlash':
            case 'hammerSpin':
            case 'concLightning':
              if (ev.key === 'hammerSpin') this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.5, ev.key === 'concLightning' ? 0xb388ff : ev.key === 'hammerSpin' ? 0x00e676 : 0x7c4dff);
              if (ev.key === 'concLightning') this.effects.pulse(at, ev.r * 0.6, 0.4, 0xffffff);
              audio.boom(4);
              if (ev.n) this.ui.toast(`${ev.key === 'vengefulSlash' ? '⚔️ Vengeful Slash' : ev.key === 'hammerSpin' ? '🔨 Hammer Spin' : '⚡ Concentrated Lightning'} stunned ${plural(ev.n)}!`, 1500);
              break;
            case 'hammerLine': {
              // A shockwave rolling straight ahead along the path.
              for (let i = 1; i <= 6; i++) {
                const p = new THREE.Vector3(ev.x + ev.dx * (ev.len * i) / 6, 0.3, ev.z + ev.dz * (ev.len * i) / 6 + oz);
                this.effects.pulse(p, 3, 0.25 + i * 0.06, 0x00e676);
              }
              audio.boom(5);
              if (ev.n) this.ui.toast(`🔨 Hammer Smash stunned ${plural(ev.n)}!`, 1500);
              break;
            }
            case 'axeSlash':
              this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.4, 0x80d8ff);
              audio.lob('grenadierAssaultBottom');
              if (ev.n) this.ui.toast(`🪓 Axe Slash! ${plural(ev.n)} fire slower for a while.`, 1500);
              break;
            case 'staffSlam':
              this.effects.pulse(at, ev.r, 0.35, 0x40c4ff);
              break;
            // ------------------------------------------------ Hardcore moves
            case 'gaze': {
              for (const [x, z] of ev.h) {
                const to = new THREE.Vector3(x, 1.5, z + oz);
                this.effects.tracer(v ? v.aimPoint(new THREE.Vector3()) : to.clone().setY(20), to, 0xaa00ff, 0.3);
                this.effects.flash(to, 0xd500f9, 1);
              }
              break;
            }
            case 'dSword':
            case 'dSpikes':
              if (ev.key === 'dSword') this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.5, ev.key === 'dSword' ? 0x9e9e9e : 0xaa00ff);
              audio.boom(ev.key === 'dSword' ? 4 : 6);
              if (ev.n) this.ui.toast(`${ev.key === 'dSword' ? '🗡️ Demise swung its sword' : '🪨 Spikes burst from the ground'}: ${plural(ev.n)} stunned!`, 1600);
              break;
            case 'dMist':
              this.effects.smoke(at.clone().setY(0.5), ev.r, 3, [0xff80ab, 0xf48fb1], 14);
              audio.boom(3);
              this.ui.toast(ev.n ? `🌸 PINK MIST! Demise downgraded ${plural(ev.n)} by one level.` : '🌸 Demise breathes a pink mist…', 2400);
              break;
            case 'crystalLaser':
              this.effects.pulse(at, ev.r, 0.6, 0xd500f9);
              this.effects.pulse(at, ev.r * 0.5, 0.4, 0xffffff);
              audio.shot(0, 'phaser');
              this.ui.toast(`💎 The Crystalian fires its laser${ev.n ? `: ${plural(ev.n)} deal less damage` : ''}. It can be hurt for ${ev.open}s: HIT IT!`, 2000);
              break;
            case 'hammerBounce': {
              let prev = v ? v.aimPoint(new THREE.Vector3()) : null;
              for (const [x, z] of ev.h) {
                const to = new THREE.Vector3(x, 1.5, z + oz);
                if (prev) this.effects.tracer(prev, to, 0xb388ff, 0.4);
                this.effects.flash(to, 0xb388ff, 1);
                prev = to;
              }
              audio.boom(4);
              this.ui.toast(`🔨 The Vindicator's hammer scared ${plural(ev.h.length)}: they can't attack for a while!`, 2000);
              break;
            }
            case 'spear':
              for (let i = 1; i <= 6; i++) this.effects.pulse(new THREE.Vector3(ev.x + (ev.dx * ev.len * i) / 6, 0.3, ev.z + (ev.dz * ev.len * i) / 6 + oz), 2.5, 0.25 + i * 0.05, 0x80d8ff);
              audio.boom(5);
              if (ev.n) this.ui.toast(`🔱 The Void Guardian's spear froze ${plural(ev.n)} for 10 seconds!`, 1800);
              break;
            case 'timeParadox':
              this.effects.pulse(at, 10, 0.6, 0xffffff);
              for (const [x, z] of ev.h) this.effects.puff(new THREE.Vector3(x, 3, z + oz), 0xeceff1, 18, 0.7, 8);
              audio.boom(6);
              this.shake?.(0.5, 1);
              this.ui.toast(ev.n ? `⌛ TIME PARADOX! ${plural(ev.n)} turned into different towers at level 1!` : '⌛ Time Paradox! Luckily nothing changed.', 2800);
              break;
          }
          break;
        }
        // ---------------------------------------------------------------- Insane mode (2026-11-09 spec)
        case 'iBuild':
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z + laneOz(ev.L ?? 0)), 0x2979ff, 14, 0.5, 8);
          this.ui.toast('🔧 The Engineer built an MK11-Device! It waits there until the device is destroyed.', 2400);
          break;
        case 'iBackup':
          audio.waveStart();
          this.ui.toast('🔊 BACKUP! The Overlord called in his Amplifiers. They heal him: destroy them!', 3000);
          break;
        case 'iDespair': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(4), 0xff1744, 30, 0.9, 14);
          audio.waveStart();
          this.ui.screenFlash?.('#ff1744', 500);
          this.ui.toast('😡 DESPAIR! The Overlord is much faster and tougher now, and Vengeful Champions are coming out of the entrance!', 3500);
          break;
        }
        case 'iThrow': {
          const at = new THREE.Vector3(ev.x, 2, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0x00e676, 16, 0.6, 10);
          this.ui.toast('🏃 The Vanguard threw its hammer away! It runs much faster, but has no more attacks.', 2600);
          break;
        }
        // ---------------------------------------------------------------- Void mode enemies
        case 'vTendril': {
          // Void armor tendrils lash the towers next to the enemy.
          const v = this.enemyViews.get(ev.e);
          if (!v) break;
          v.lash();
          const from = v.aimPoint(new THREE.Vector3());
          const oz = laneOz(ev.L ?? 0);
          for (const [x, z] of ev.h) {
            const to = new THREE.Vector3(x, 2, z + oz);
            this.effects.tracer(from, to, 0xaa00ff, 0.5);
            this.effects.puff(to, 0x4a0072, 5, 0.4, 4);
          }
          break;
        }
        case 'vArmorBreak': {
          // The void armor shatters: no more shield, armor, slow or tendrils.
          const at = new THREE.Vector3(ev.x, 2.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0xd500f9, ev.big ? 30 : 10, ev.big ? 0.8 : 0.5, ev.big ? 16 : 8);
          if (ev.big) {
            this.effects.pulse(at.clone().setY(0.3), 8, 0.6, 0xea80fc);
            audio.boom(5);
            this.ui.toast(`💥 The ${ENEMIES[ev.type]?.name ?? 'boss'}'s void armor shattered!`, 2400);
          }
          break;
        }
        case 'vMove': {
          // Guardian, False Void and VOID moves (see Sim.voidMove).
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + oz);
          const plural = (n, w = 'tower') => `${n} ${w}${n === 1 ? '' : 's'}`;
          switch (ev.key) {
            case 'slash': {
              const to = new THREE.Vector3(ev.tx, 2, ev.tz + oz);
              this.effects.pulse(to.clone().setY(0.3), 3, 0.4, 0xb71c1c);
              this.effects.puff(to, 0xd50000, 14, 0.5, 8);
              audio.boom(3);
              const name = TOWERS[st.towers.get(ev.tower)?.type]?.name ?? 'tower';
              this.ui.toast(`🪓 A Guardian's axe hit your ${name}! It bleeds for ${ev.time}s: no attacks, abilities or upgrades.`, 2600);
              break;
            }
            case 'shockwave':
            case 'stomp': {
              this.effects.pulse(at, ev.r, ev.key === 'shockwave' ? 1.4 : 0.6, 0xd500f9);
              this.effects.puff(at.clone().setY(2), 0x4a0072, ev.key === 'shockwave' ? 40 : 18, 1, 14);
              audio.boom(ev.key === 'shockwave' ? 8 : 6);
              this.shake(ev.key === 'shockwave' ? 2 : 1, 1);
              if (ev.key === 'shockwave') this.ui.screenFlash('#4a0072', 800);
              this.ui.toast(ev.key === 'shockwave'
                ? `😱 The False Void SCREAMS! ${plural(ev.n, 'ground tower')} stunned for ${ev.stun}s, and units are crushed.`
                : `🦶 The False Void stomps! ${plural(ev.n, 'ground tower')} stunned for ${ev.stun}s.`, 2600);
              break;
            }
            case 'summon':
              if (v) this.effects.puff(v.pos.clone().setY(4), 0x7b1fa2, 20, 0.7, 10);
              this.ui.toast(`🟣 The False Void pulled ${ev.n} Spawns out of its body!`, 2000);
              break;
            case 'abyss':
              this.effects.pulse(at, 80, 1.6, 0xd500f9);
              this.effects.pulse(at, 40, 1.0, 0x000000);
              audio.boom(9);
              this.shake(3, 2);
              this.ui.screenFlash('#1a0026', 1500);
              this.ui.toast(`😱 FROM THE ABYSS! VOID's scream stunned EVERY tower for ${ev.stun}s${ev.u ? ` and wiped out ${plural(ev.u, 'unit')}` : ''}.`, 3500);
              break;
            case 'corruption':
              if (v) this.effects.pulse(v.pos.clone().setY(0.3), 30, 1.4, 0x9c27b0);
              for (const id of ev.ids) {
                const tw = st.towers.get(id);
                if (tw) this.effects.puff(new THREE.Vector3(tw.x, 3, tw.z + oz), 0xaa00ff, 20, 0.8, 10);
              }
              audio.waveStart();
              this.ui.screenFlash('#6a1b9a', 700);
              this.ui.toast(`🟪 CORRUPTION! VOID turned ${plural(ev.ids.length)} to his side${ev.u ? ` and took ${plural(ev.u, 'unit')}` : ''}. Corrupted towers sell for 20% more!`, 3500);
              break;
            case 'devastation':
              this.effects.pulse(at, ev.r, 0.6, 0xff1744);
              this.effects.puff(at.clone().setY(1), 0x4a0072, 22, 0.8, 12);
              audio.boom(7);
              this.shake(1.2, 0.8);
              break;
            case 'army':
              audio.waveStart();
              this.ui.toast(`👥 UNFORESEEN ARMY! ${ev.n} enemies appeared all along the path!`, 3000);
              break;
            case 'meteors':
              for (const [x, z, d, r] of ev.h) {
                const to = new THREE.Vector3(x, 0.3, z + oz);
                this.effects.pulse(to, r, d, 0xd500f9);
                this.effects.lob(new THREE.Vector3(x + 6, 70, z + oz - 6), to, d, { color: 0x7b1fa2, size: 1 + r * 0.4, arc: 0, glowing: true });
              }
              this.ui.toast('☄️ ABYSSAL STRIKEDOWN! Purple meteors are falling on your towers!', 2600);
              break;
            case 'telekinesis':
              for (const [x, z] of ev.h) {
                const to = new THREE.Vector3(x, 1, z + oz);
                this.effects.tracer(to.clone().setY(30), to, 0xd500f9, 1);
                this.effects.explosion(to, 4);
              }
              audio.boom(6);
              this.ui.toast(`🌀 TELEKINESIS! VOID crushed ${plural(ev.h.length, 'Warship')}, and every tower works ${Math.round(ev.slow * 100)}% slower for ${ev.time}s.`, 3200);
              break;
          }
          break;
        }
        case 'shellBreak': {
          // Voidkin / Guardian: the void armor shatters.
          const at = new THREE.Vector3(ev.x, 2.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0xd500f9, 26, 0.7, 14);
          this.effects.pulse(at.clone().setY(0.3), 6, 0.5, 0xea80fc);
          audio.boom(4);
          const name = ENEMIES[ev.type]?.name ?? 'enemy';
          this.ui.toast(ev.type === 'voidGuardian' ? `⚔️ The ${name}'s armor shattered! It draws its swords and charges!` : `💥 The ${name}'s void armor broke! No more lead or explosion resistance.`, 2600);
          break;
        }
        case 'acid': // Acid Void: a puddle of acid
          this.effects.puddle(new THREE.Vector3(ev.x, 0, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, 0x64dd17);
          this.effects.puff(new THREE.Vector3(ev.x, 1, ev.z + laneOz(ev.L ?? 0)), 0x76ff03, 10, 0.5, 6);
          break;
        case 'drain': {
          // Golden Void: cash floats off toward it.
          const v = this.enemyViews.get(ev.e);
          if (v && Math.random() < 0.5) this.effects.text(v.pos.clone().setY(v.height + 2), `-$${ev.v}`, '#ffd740', 2.5);
          break;
        }
        case 'punch': {
          // VOID punches a tower clean out of position.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const to = new THREE.Vector3(ev.x, 2, ev.z + oz);
          if (v) this.effects.tracer(v.aimPoint(new THREE.Vector3()), to, 0xff1744, 1.2);
          this.effects.flash(to, 0xff1744, 3);
          this.effects.puff(to, 0xd500f9, 18, 0.7, 12);
          audio.boom(6);
          this.shake(0.4, 0.8);
          break;
        }
        case 'vMark': {
          this.enemyViews.get(ev.e)?.attack();
          audio.waveStart();
          this.ui.screenFlash('#aa00ff', 500);
          const name = TOWERS[st.towers.get(ev.tower)?.type]?.name ?? 'tower';
          this.ui.toast(`✖ VOID MARKED your ${name}! It will be destroyed in ${ev.fuse} seconds!`, 3500);
          break;
        }
        case 'vMarkHit': {
          const at = new THREE.Vector3(ev.x, 0.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.explosion(at, 5);
          this.effects.pulse(at, 7, 0.6, 0xd500f9);
          this.effects.tracer(at.clone().setY(60), at, 0xd500f9, 1.6);
          audio.boom(7);
          this.shake(0.5, 1);
          break;
        }
        case 'vOrb': {
          this.enemyViews.get(ev.e)?.attack();
          audio.lob('paint');
          this.ui.toast('🔮 VOID launched a magic missile at your base! Run into it to pop it!', 3200);
          break;
        }
        case 'orbPop': {
          this.popped?.delete(ev.id);
          const at = new THREE.Vector3(ev.x, 3, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0xea80fc, 20, 0.6, 10);
          this.effects.pulse(at.clone().setY(0.3), 4, 0.4, 0xd500f9);
          audio.upgrade();
          const who = ev.by === this.session.myId ? 'You' : st.players.get(ev.by)?.name ?? 'Someone';
          this.ui.toast(`✨ ${who} popped VOID's magic missile!`, 1600);
          break;
        }
        case 'orbHit': {
          this.popped?.delete(ev.id);
          audio.baseHit();
          this.effects.puff(new THREE.Vector3(path.end.x, 3, path.end.z + laneOz(ev.L ?? 0)), 0xd500f9, 24, 0.7, 12);
          this.shake(0.5, 1);
          this.ui.toast(`💥 VOID's magic missile hit your base for ${ev.d}!`, 2200);
          break;
        }
        case 'vLaserWarn': {
          this.enemyViews.get(ev.e)?.attack();
          audio.waveStart();
          this.ui.toast('🔴 VOID is calling down a laser from the sky! Every unit on the track will be burned away!', 2400);
          break;
        }
        case 'vLaser': {
          const oz = laneOz(ev.L ?? 0);
          const pts = [];
          for (let r = 0; r < path.routes.length; r++) for (let d = 0; d <= path.length; d += 3) {
            const at = path.at(d, {}, r);
            pts.push(new THREE.Vector3(at.x, at.y, at.z + oz));
          }
          this.effects.skyLaser(pts, 1.6);
          this.ui.screenFlash('#ff1744', 700);
          audio.shot(0, 'phaser');
          audio.boom(5);
          this.shake(1.6, 0.6);
          if (ev.n) this.ui.toast(`🔴 The sky laser wiped out ${ev.n} unit${ev.n > 1 ? 's' : ''}!`, 2000);
          break;
        }
        case 'vRise': {
          // Phase two: VOID becomes a ghost with a void heart, and three Guardians appear.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, 30, 1.5, 0xd500f9);
          this.effects.pulse(at, 18, 1.0, 0xffffff);
          this.effects.puff(at.clone().setY(6), 0x7c4dff, 40, 1.2, 20);
          audio.boom(8);
          audio.waveStart();
          this.shake(2.5, 3);
          this.ui.screenFlash('#1a0026', 2000);
          this.ui.banner('VOID RISES', 'His body is gone. Only the void heart remains…', 5000);
          this.ui.toast('👻 VOID has become a spirit! He is faster, withers every tower, and three Guardians stand at his side!', 6000);
          break;
        }
        case 'vCharge': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.pulse(v.pos.clone().setY(0.3), 10, 2, 0x7c4dff);
          this.ui.toast('👻 VOID is charging up… he\'s about to vanish into the sky!', 2000);
          break;
        }
        case 'vDown': {
          // VOID is finally defeated.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          for (let i = 0; i < 4; i++) {
            setTimeout(() => {
              if (!this.session) return;
              this.effects.pulse(at, 12 + i * 10, 1.2, i % 2 ? 0xffffff : 0xd500f9);
              this.effects.puff(at.clone().setY(4 + i * 2), i % 2 ? 0xffffff : 0xea80fc, 30, 1, 18);
              audio.boom(6 + i);
            }, i * 450);
          }
          this.shake(3.5, 3);
          this.ui.screenFlash('#ffffff', 2500);
          this.ui.banner('VOID HAS FALLEN', 'Light returns to the world. It is finally over.', 5000, 'light');
          break;
        }
        case 'xmFly': {
          // Christmas Frost Spirit: Flying Frost at half health (it hovers a little, views.js).
          const v = this.enemyViews.get(ev.e);
          if (v) v.hover = 1;
          audio.waveStart();
          break;
        }
        case 'enrage': {
          const v = this.enemyViews.get(ev.e);
          audio.waveStart();
          this.ui.toast(`😡 The ${v?.def.name ?? 'Eradicator'} is enraged and sprinting for your base! Finish it!`, 3500);
          break;
        }
        case 'leak': {
          const v = this.enemyViews.get(ev.e);
          if (v) {
            v.dispose();
            this.enemyViews.delete(ev.e);
          }
          if (!this.versus || ev.L === this.myLane) audio.baseHit();
          this.effects.puff(new THREE.Vector3(path.end.x, 3, path.end.z + laneOz(ev.L ?? 0)), 0xe53935, 10, 0.5, 8);
          if (!this.versus || ev.L === this.myLane) this.effects.baseHit(new THREE.Vector3(path.end.x, 0, path.end.z + laneOz(ev.L ?? 0)));
          break;
        }
        case 'repair': {
          // Frostgate Citadel: someone paid to mend the gate.
          this.effects.puff(new THREE.Vector3(path.end.x + 2, 8, path.end.z), 0x66bb6a, 14, 0.6, 10);
          const who = ev.by === this.session.myId ? 'You' : this.state.players.get(ev.by)?.name ?? 'Someone';
          this.ui.toast(`${who} repaired the gate (+${ev.hp.toLocaleString()})`, 1600);
          break;
        }
        case 'gateHit': {
          // Frostgate Citadel: an enemy at the gate hits it (a spark on the gate, a thud now and then).
          this.effects.puff(new THREE.Vector3(ev.x + 1.5, 3, ev.z), 0xff6f8f, 5, 0.4, 5);
          const now = performance.now();
          if (now - (this.gateSound ?? 0) > 700) {
            this.gateSound = now;
            audio.baseHit();
          }
          break;
        }
        case 'waveStart': {
          this.earnXp();
          if (this.versus) {
            audio.waveStart();
            const scripted = WAVES[ev.i]?.note;
            this.ui.toast(`Wave ${ev.i + 1}${ev.bonus ? ` · +$${ev.bonus}` : ''}${scripted && !scripted.startsWith('Final') ? ` — ${scripted}` : ''}`, scripted ? 3000 : 1600);
            break;
          }
          if (ev.glow) NM_STATE.glow = 1; // Halloween Night 3: the portal starts to glow
          const note = ev.note ?? difficulty(st.mode).waves[ev.i]?.note;
          audio.waveStart();
          this.ui.toast(note ? `Wave ${ev.i + 1}: ${note}` : `Wave ${ev.i + 1}`, note ? 3200 : 1500);
          break;
        }
        case 'waveClear':
          audio.cash();
          this.ui.toast(`Wave ${ev.i + 1} ${ev.skip ? 'skipped' : 'cleared'}! +$${ev.bonus}`);
          break;
        case 'place':
          if (ev.owner === myId) audio.place();
          if (ev.holo) this.effects.puff(new THREE.Vector3(ev.x, 0.5, ev.z), 0x18ffff, 16, 0.4, 6);
          this.effects.placeFx(new THREE.Vector3(ev.x, 0, ev.z), ev.holo ? 0x18ffff : 0xcfd8dc);
          break;
        case 'towerDown': // a tower ran out of health: knocked out until healed
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0x616161, 14, 0.6, 8);
          this.effects.sparks(new THREE.Vector3(ev.x, 3, ev.z), 0xffd54f, 10, 13);
          this.effects.smokePuff(new THREE.Vector3(ev.x, 3, ev.z), 1.6, 6);
          if (ev.owner === myId) this.ui.toast('💫 One of your towers was knocked out! Heal it with a Medic or Health Pack', 2200);
          break;
        case 'bounty': {
          // Mobster Place Bounty: a gold tag over the marked zombie.
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.text(v.aimPoint(new THREE.Vector3()).setY(8 * MODEL_SCALE), `Bounty $${ev.v.toLocaleString()}`, '#ffd740', 2.6);
          break;
        }
        case 'bountyPaid':
          if (ev.owner === myId) {
            this.effects.text(new THREE.Vector3(ev.x, 9 * MODEL_SCALE, ev.z), `+$${ev.v.toLocaleString()}${ev.run ? '' : ' bounty!'}`, '#ffd740', 3.2);
            audio.cash();
          }
          break;
        case 'cashback': // Mobster Life Insurance
          if (ev.owner === myId) this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), `+$${ev.v.toLocaleString()} cash back`, '#69f0ae', 2.6);
          break;
        case 'towerUp': // healed back up
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0x69f0ae, 12, 0.5, 6);
          break;
        case 'paradox': // Expert Beholder Time Paradox: this tower became another one
          this.effects.puff(new THREE.Vector3(ev.x, 3, ev.z), 0xeceff1, 16, 0.6, 8);
          break;
        case 'holoEnd': // a Hacker clone fades away
          this.effects.puff(new THREE.Vector3(ev.x, 3, ev.z), 0x18ffff, 16, 0.5, 8);
          break;
        case 'convert': // a hacked zombie comes back as a hologram
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0x18ffff, 10, 0.4, 6);
          break;
        case 'upgrade':
          if (ev.owner === myId) audio.upgrade();
          this.effects.levelUp(new THREE.Vector3(ev.x, 0, ev.z), 0xffd54f, 6);
          this.effects.text(new THREE.Vector3(ev.x, 7.5 * MODEL_SCALE, ev.z), ev.name, '#ffd54f', 2.6);
          break;
        case 'konami':
          if (ev.owner === myId) {
            audio.upgrade();
            this.ui.toast('Konami code! ∞ money this game', 2500);
          }
          break;
        case 'income':
          if (ev.owner === myId) this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `+$${ev.v}`, '#a5f36b');
          break;
        case 'revive':
          // Combat Medic Revive Pack: the tower gets back up in a few seconds.
          this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `✚ Reviving (${ev.d}s)`, '#ff8a80');
          break;
        case 'shieldUp':
          this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), '🛡 Shields up', '#80d8ff');
          break;
        case 'medDrone':
          this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `✚ Medic Drone (${ev.d}s)`, '#ff8a80', 2.6);
          break;
        case 'crate':
          if (rootType(st.towers.get(ev.id)?.type ?? '') === 'farmMarket') {
            // Market: its cash bundles just pop out (or go into its bank).
            if (ev.owner === myId) {
              this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), ev.v ? `+$${ev.v}` : '🏦 Banked', '#a5f36b', 2.2);
              if (ev.v) audio.cash();
            }
            break;
          }
          // Airdrop Farm: a cargo plane drops a cash crate on the helipad.
          this.effects.airdrop({ x: ev.x, z: ev.z }, () => {
            if (ev.owner !== myId) return;
            this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `+$${ev.v}`, '#a5f36b', 2.6);
            audio.cash();
          });
          break;
        case 'cash': {
          // Cowboy cash shot: a gold coin pops out and the revolver twirls.
          this.towerViews.get(ev.id)?.twirl(ev.spin);
          if (ev.owner === myId) {
            this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `+$${ev.v}`, '#ffd54f', 2.4);
            audio.cash();
          }
          this.effects.puff(new THREE.Vector3(ev.x, 5, ev.z), 0xffd54f, 5, 0.3, 6);
          break;
        }
        case 'beat': {
          // DJ Booth Drop the Beat: a ring in the track's color (Red sends one per pulse).
          const at = new THREE.Vector3(ev.x, 0, ev.z);
          this.effects.pulse(at, ev.r, 0.5, TRACKS[ev.c].color);
          if (ev.c === 2) {
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.shot(4, 'djBooth');
          } else {
            this.effects.rave(at.setY(0.4), ev.r);
            audio.rave();
          }
          break;
        }
        case 'sell':
          if (ev.x != null) this.effects.sellFx(new THREE.Vector3(ev.x, 0, ev.z));
          if (ev.owner === myId) {
            audio.sell();
            this.effects.text(new THREE.Vector3(ev.x, 5 * MODEL_SCALE, ev.z), `+$${ev.value}`, '#a5f36b');
          }
          break;
        // ---------------------------------------------------------------- Hardcore mode (2026-11-09)
        case 'hcMove': {
          // Soul Stealer, Void Reaver, Void Caster and Emperor moves (see Sim.hcMove).
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + oz);
          const from = v ? v.aimPoint(new THREE.Vector3()) : at.clone().setY(8);
          const plural = (n, w = 'tower') => `${n} ${w}${n === 1 ? '' : 's'}`;
          const marks = (h, color) => {
            for (const [x, z] of h ?? []) {
              const to = new THREE.Vector3(x, 1.5, z + oz);
              this.effects.tracer(from, to, color, 0.4);
              this.effects.pulse(to.clone().setY(0.3), 2.5, 0.5, color);
            }
          };
          switch (ev.key) {
            case 'curseTower': {
              const to = new THREE.Vector3(ev.tx, 1.5, ev.tz + oz);
              this.effects.tracer(from, to, 0xffc400, 0.5);
              this.effects.puff(to, 0xffc400, 12, 0.6, 6);
              this.ui.toast('🔒 The Soul Stealer CURSED a tower! It can\'t do anything until the Soul Stealer dies.', 2200);
              break;
            }
            case 'soulSummon':
              this.effects.puff(at.clone().setY(3), 0xeeeeee, 24, 0.8, 10);
              this.ui.toast(`👻 The Soul Stealer summoned ${ev.n} Souls and a Void Eye, and vanished for a while!`, 2200);
              break;
            case 'cursedBlade':
            case 'spearLine':
              for (let i = 1; i <= 7; i++) this.effects.pulse(new THREE.Vector3(ev.x + (ev.dx * ev.len * i) / 7, 0.3, ev.z + (ev.dz * ev.len * i) / 7 + oz), 3, 0.25 + i * 0.05, 0xaa00ff);
              audio.boom(5);
              this.ui.toast(`🗡️ CURSED BLADE! ${ev.n ? `${plural(ev.n)} deal less damage and lose range` : 'A wave of void cuts down the path'}, and Blessed Souls appear.`, 2000);
              break;
            case 'judgement':
              for (const [x, z] of ev.h) this.effects.lightning([new THREE.Vector3(x, 60, z + oz), new THREE.Vector3(x, 1, z + oz)], 0xd500f9);
              audio.boom(6);
              this.ui.toast(`⚖️ VOID JUDGEMENT! ${plural(ev.h.length)} can't attack until the Void Reaver hits 0 health.`, 2800);
              break;
            case 'unnervingGaze':
              this.effects.pulse(at, 8, 0.6, 0xaa00ff);
              this.ui.toast('👁️ Unnerving Gaze! Portals opened: Void Eyes will stun your towers. Destroy them!', 2200);
              break;
            case 'rupture':
              this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.5, 0xd500f9);
              audio.boom(6);
              this.ui.banner('VOID RUPTURE', `Deal ${ev.cancel.toLocaleString()} damage in ${ev.charge}s to stop the slash!`, ev.charge * 1000);
              break;
            case 'ruptureSlash':
              this.effects.pulse(at, 80, 1, 0xd500f9);
              this.effects.pulse(at, 50, 0.8, 0xffffff);
              audio.boom(9);
              this.shake(1.4, 2);
              this.ui.screenFlash('#4a0072', 900);
              this.ui.toast(`💥 VOID RUPTURE! Every tower is stunned for ${ev.stun}s.`, 3000);
              break;
            case 'ruptureCancel':
              this.effects.puff(at.clone().setY(4), 0xffffff, 30, 0.8, 12);
              this.ui.toast('✋ You interrupted the Void Rupture!', 2500);
              break;
            case 'casterShield': {
              const to = new THREE.Vector3(ev.tx, 3, ev.tz + oz);
              this.effects.tracer(from, to, 0xd500f9, 0.6);
              this.effects.puff(to, 0xea80fc, 20, 0.7, 8);
              this.ui.toast('🛡️ The Void Caster shielded the Void Reaver!', 1800);
              break;
            }
            case 'casterPortal':
              this.effects.pulse(at, 5, ev.time, 0xaa00ff);
              this.effects.puff(at.clone().setY(3), 0xaa00ff, 30, 1, 10);
              this.ui.toast(`🌀 The Void Caster opened a portal: ${ev.n} enemies are pouring out!`, 2500);
              break;
            case 'finalEradication':
              this.effects.pulse(at, 60, 0.9, 0xff1744);
              this.effects.pulse(at, 30, 0.6, 0xffffff);
              audio.boom(9);
              this.shake(1.2, 2);
              this.ui.toast(`🔨 FINAL ERADICATION! Every unit destroyed${ev.n ? ` and ${plural(ev.n)} stunned` : ''}.`, 2800);
              break;
            case 'chronoStasis':
              this.ui.screenFlash('#ffffff', 700);
              this.effects.pulse(at, 40, ev.time, 0xeceff1);
              audio.boom(6);
              this.ui.toast(`⏱️ CHRONO STASIS! Time crawls (your towers barely move), and an orb hit your base for ${ev.d}.`, 3000);
              break;
            case 'encore':
              this.effects.puff(at.clone().setY(4), 0xff1744, 30, 0.9, 12);
              this.ui.toast(`🤖 ERADICATORS' ENCORE! The Emperor called in ${ev.n} drones and clones.`, 2600);
              break;
            case 'divineProtection':
              this.effects.pulse(at, ev.r, 0.6, 0xffd740);
              this.effects.puff(at.clone().setY(4), 0xffe57f, 24, 0.8, 8);
              this.ui.toast('✨ Divine Protection! The Emperor raised a huge shield.', 2000);
              break;
            case 'meteoricSwarm':
              for (const [x, z, d] of ev.h) {
                const to = new THREE.Vector3(x, 0.3, z + oz);
                this.effects.pulse(to, ev.r, d, 0xff1744);
                this.effects.missile(to.clone().setY(60), (out) => out.copy(to), d, 0xff6d00, 1.4);
              }
              audio.missile();
              this.ui.toast('☄️ METEORIC SWARM! Drones are raining down on your towers.', 2200);
              break;
            case 'corruptingBlast':
              marks(ev.h, 0xff1744);
              this.ui.toast(`🟥 CORRUPTING BLAST! ${plural(ev.h.length)} can't fight for ${ev.time}s.`, 2400);
              break;
            case 'harvest':
              marks(ev.h, 0xff5252);
              audio.shot(0, 'phaser');
              this.ui.toast(`🩸 EMPEROR'S HARVEST! Beams drain ${plural(ev.h.length)} while he heals.`, 2400);
              break;
            case 'execution': {
              const to = new THREE.Vector3(ev.tx, 1.5, ev.tz + oz);
              this.effects.pulse(to.clone().setY(0.3), 3, 0.5, 0xffffff);
              this.effects.puff(to, 0xff1744, 20, 0.7, 10);
              audio.boom(7);
              this.ui.toast('👋 PERSONAL EXECUTION! The Emperor slapped down your priciest tower nearby.', 2600);
              break;
            }
            case 'overdrive':
              this.effects.puff(at.clone().setY(3), 0xff1744, 16, 0.6, 10);
              break;
          }
          break;
        }
        case 'hcWrath': {
          const v = this.enemyViews.get(ev.e);
          audio.boom(8);
          this.shake(1.2, 2);
          this.ui.screenFlash('#4a0072', 1200);
          this.ui.banner("VOID'S WRATH", 'The Void Reaver rips off its mask… and the Void Caster answers.', 4000);
          if (v) this.effects.puff(v.aimPoint(new THREE.Vector3()), 0xd500f9, 40, 1, 14);
          break;
        }
        case 'hcDown':
          audio.waveStart();
          this.ui.toast(`💀 The Void Reaver is down! The Void Caster is reviving him in ${ev.t}s. HIT HER NOW!`, 4000);
          break;
        case 'hcRevive':
          this.ui.toast('🔮 The Void Caster revived the Void Reaver!', 2500);
          break;
        case 'hcDeathwish':
          audio.boom(8);
          this.ui.banner('VOID DEATHWISH', 'The Caster is gone. The Reaver runs for your base!', 3500);
          break;
        case 'hcRage':
          this.ui.toast('😡 The Void Caster is ENRAGED!', 2000);
          break;
        case 'hcRecede':
          audio.waveStart();
          this.ui.toast(ev.left ? `🌀 TAUNTING RECESSION! The Emperor warped back to the start (${ev.left} more time${ev.left === 1 ? '' : 's'}).` : '🌀 The Emperor warped back to the start. Next time he WILL enter your base!', 3500);
          break;
        case 'hcDowngrade': {
          const at = new THREE.Vector3(ev.x, 2, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0xff80ab, 14, 0.6, 6);
          break;
        }
        case 'oshBreak': {
          const at = new THREE.Vector3(ev.x, 2.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0x80deea, ev.big ? 24 : 8, 0.4, ev.big ? 10 : 5);
          if (ev.big) {
            audio.boom(4);
            this.ui.toast(`💥 ${ENEMIES[st.enemies.get(ev.e)?.type]?.name ?? 'The boss'}'s shield broke!`, 1600);
          }
          break;
        }
        case 'timeShiftEnd':
          audio.waveStart();
          this.ui.screenFlash('#ffffff', 900);
          this.ui.toast('🌍 The Beholder is beaten! You\'re back on the real map, and every tower was refunded. You have extra time to rebuild!', 6000);
          break;
        case 'reborn': {
          // A cage broke open, or a boss came back for its second phase.
          const e = st.enemies.get(ev.e);
          const def = ENEMIES[ev.type];
          if (e) {
            const at = path.at(e.dist, {}, e.route);
            const color = def.fire ? 0xff6d00 : ENEMIES[ev.from].cage ? 0x9e9e9e : def.skin;
            this.effects.puff(new THREE.Vector3(at.x, 2, at.z + laneOz(e.lane ?? 0)), color, def.boss ? 24 : 10, 0.5, def.boss ? 12 : 6);
          }
          if (ev.type === 'devotee' && ENEMIES[ev.from].name !== 'Devotee' && e) {
            // Reviver: a fallen enemy rises again as a Devotee.
            const at = path.at(e.dist, {}, e.route);
            this.effects.pulse(new THREE.Vector3(at.x, at.y + 0.3, at.z + laneOz(e.lane ?? 0)), 3, 0.4, 0x69f0ae);
          } else if (ENEMIES[ev.from].shield) {
            // Shielders: the crystal shield shatters.
            audio.boom(1);
          } else if (ENEMIES[ev.from].phase2) {
            audio.waveStart();
            this.ui.toast(`🔥 The ${ENEMIES[ev.from].name} bursts into flames! ${def.name}: immune to fire and faster!`, 3500);
          }
          break;
        }
        case 'sent': {
          const from = st.players.get(ev.from)?.name ?? 'Someone';
          const to = st.players.get(ev.to)?.name ?? 'someone';
          const what = `${ev.n > 1 ? `${ev.n} ` : 'a '}${ENEMIES[ev.type].name}${ev.n > 1 ? 's' : ''}`;
          if (ev.to === myId) {
            audio.error();
            this.ui.toast(`${from} sent you ${what}!`, 2200);
          } else if (ev.from === myId) this.ui.toast(`Sent ${what} to ${to}`, 1400);
          break;
        }
        case 'chip':
          if (ev.to === myId) {
            audio.baseHit();
            this.ui.toast(`No Mercy! ${st.players.get(ev.from)?.name ?? 'Someone'} chipped ${ev.d} base health`, 1600);
          }
          this.effects.text(new THREE.Vector3(CASTLE.x, 18 * MODEL_SCALE, CASTLE.z + laneOz(ev.L)), `-${ev.d}`, '#ef5350', 3);
          break;
        case 'smoke':
        case 'pyro': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.heli(at);
          audio.jet();
          if (ev.k === 'smoke') this.effects.smoke(at, ev.r, ev.d);
          else {
            this.effects.fireworks(at, ev.r);
            audio.boom(6);
          }
          const name = ev.k === 'smoke' ? 'Smokes' : 'Pyrotechnics';
          if (ev.to === myId) this.ui.toast(`${st.players.get(ev.from)?.name ?? 'Someone'} hit your towers with ${name}! (${ev.n} affected)`, 2400);
          else if (ev.from === myId) this.ui.toast(`${name} hit ${ev.n} of ${st.players.get(ev.to)?.name ?? 'their'}'s towers`, 1800);
          break;
        }
        case 'elim': {
          const name = st.players.get(ev.id)?.name ?? 'A player';
          if (ev.id === myId) {
            this.spectating = true;
            this.elimWave = ev.wave - 1;
            this.elimPlace = ev.place;
            this.cancelPlace();
            this.deselect();
            audio.defeat();
            this.ui.toast(`Your base fell on wave ${ev.wave}! You finished ${ORDINAL[ev.place] ?? `#${ev.place}`}. Watch the rest of the battle…`, 4500);
          } else this.ui.toast(`${name}'s base has fallen! (${ORDINAL[ev.place] ?? `#${ev.place}`} place)`, 2600);
          break;
        }
        case 'end': {
          this.ended = true;
          if (ev.versus) {
            this.cancelPlace();
            this.deselect();
            const win = ev.winner === myId;
            if (win) audio.victory();
            const place = ev.places[myId] ?? st.lanes;
            const waves = win ? ev.wave : this.elimWave;
            const derrick = (win && ev.bonus?.[myId]) || 0; // Oil Derrick US Military Budget
            const credits = VERSUS.credits(waves, place) + derrick;
            const shards = VERSUS.shards(place);
            profile.addCredits(credits);
            profile.addShards(shards);
            this.halloweenPay(waves, win, false);
            this.ui.showVersusEnd(place, st.players.get(ev.winner)?.name ?? '?', win ? ev.wave : this.elimWave + 1, credits, shards, derrick);
            break;
          }
          this.cancelPlace();
          this.deselect();
          ev.win ? audio.victory() : audio.defeat();
          const diff = difficulty(st.mode);
          const derrick = (ev.win && ev.bonus?.[myId]) || 0; // Oil Derrick US Military Budget: a flat bonus for a win
          const credits = Math.round(GAME.credits(ev.win ? st.wave.total : st.wave.index, ev.win) * diff.credits) + derrick;
          const shards = GAME.shards(ev.win) * diff.shards;
          const gems = diff.gems ? GAME.gems(ev.win ? st.wave.total : st.wave.index, ev.win) : 0; // Hardcore
          profile.addCredits(credits);
          profile.addShards(shards);
          profile.addGems(gems);
          const opened = ev.win && profile.markBeaten(st.mode) && Object.keys(DIFFICULTIES).find((k) => DIFFICULTIES[k].needs?.includes(st.mode) && profile.modeOpen(k));
          // Win rewards: a tower or variant (Easy, Medium, Hard, Void) or an upgrade perk (Insane).
          let unlocked = ev.win && diff.unlock && profile.grant(diff.unlock) ? (TOWERS[diff.unlock].altOf ? `${TOWERS[diff.unlock].name} (${TOWERS[TOWERS[diff.unlock].altOf].name} variant)` : TOWERS[diff.unlock].name) : null;
          if (ev.win && diff.perk && profile.grantPerk(diff.perk)) unlocked = PERK_NAMES[diff.perk];
          if (ev.win && st.mode === 'halloween') profile.winNight(String(mapKey).split(':')[0]); // a Halloween night won
          this.halloweenPay(ev.win ? st.wave.total : st.wave.index, ev.win, !!(diff.event || diff.hidden));
          if (opened && !unlocked) unlocked = `${DIFFICULTIES[opened].icon} ${DIFFICULTIES[opened].name} mode`; // every mode beaten: Hardcore is open
          else if (opened) unlocked += ` and ${DIFFICULTIES[opened].icon} ${DIFFICULTIES[opened].name} mode`;
          this.ui.showEnd(ev.win, st.wave.index + 1, this.session.mp, credits, shards, st.wave.total, st.mode, unlocked, gems, derrick);
          break;
        }
      }
    }
  }

  /** Halloween: Candy Corn for a game that ended (Battle Pass rewards it reaches), and the night / contract towers earned. */
  halloweenPay(waves, win, isEvent) {
    const candy = candyFor(waves, win, isEvent);
    const pass = profile.addCandy(candy);
    const got = [...profile.halloweenRewards(), ...pass.map((r) => (r.tower ? TOWERS[r.tower].name : r.credits ? `${r.credits} credits` : r.map ? 'a new map' : r.name))];
    if (candy) setTimeout(() => this.ui.toast(`🌽 +${candy} Candy Corn${got.length ? `. 🎁 Unlocked: ${got.join(', ')}!` : ''}`, 5000), 1200);
  }
}
