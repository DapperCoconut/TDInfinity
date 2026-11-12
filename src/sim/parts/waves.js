// Waves and money: starting and skipping waves, spawning enemies (spawn), wave pay, farms and crates.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, TOWERS, VERSUS, choicesOf, detection, difficulty, hpCurve, rootType, waveGroups } from '../../config.js';
import { BEELINE, path } from '../path.js';
import { r2, rand } from './shared.js';

export class SimWaves {

  /** Wave bonus to every player, plus tower income, for clearing (or skipping) the current wave. */
  payWave(skip = false) {
    const w = this.wave;
    const bonus = Math.round((this.waves[w.index]?.bonus ?? GAME.waveBonus(w.index + 1)) * this.cashMult * (this.potShare ?? 1)); // (Halloween waves set their own)
    for (const p of this.players.values()) p.cash += bonus;
    this.events.push({ k: 'waveClear', i: w.index, bonus, ...(skip ? { skip: 1 } : {}) });
    this.payIncome(skip);
  }

  /**
   * Can players vote to skip ahead to the next wave right now? Once every zombie in the wave has
   * spawned, even if some are still walking the path.
   */
  get canSkipWave() {
    const w = this.wave;
    return !this.vs && w.state === 'wave' && !this.queue.length && w.index < this.waves.length - 1;
  }

  /**
   * Skips ahead: pays this wave's bonus now and starts the next wave at once. Zombies already
   * out stay, and ones still waiting to spawn come along with the new wave.
   */
  skipWave() {
    const w = this.wave;
    this.payWave(true);
    const left = this.queue.map((q) => ({ ...q, t: Math.max(0, q.t - w.t) }));
    this.startWave(w.index + 1);
    this.queue.push(...left);
    this.queue.sort((a, b) => a.t - b.t);
    w.left = this.queue.length;
  }

  /** Starts wave `index`. In Versus, earlier waves may still be spawning, so it adds to the queue. */
  startWave(index = this.wave.index) {
    const w = this.wave;
    if (!this.vs) {
      this.queue = [];
      w.t = 0;
    }
    w.index = index;
    // An optional 5th entry sets the exact health for that group (Easy lists it per wave), or
    // (an object) Hard mode's modifiers: { boss, aggro, bloated, nimble, hidden, regen }.
    for (const [type, count, interval, delay, x] of waveGroups(index, this.waves)) {
      const hp = typeof x === 'number' ? x : undefined;
      const mods = x && typeof x === 'object' ? x : undefined;
      for (let i = 0; i < count; i++) this.queue.push({ t: w.t + delay + i * interval, type, hp, mods });
    }
    // Hardcore: a rare golden mimic (Wicky) may sneak into the wave.
    const mim = !this.vs && difficulty(this.mode).mimic;
    if (mim && index + 1 >= mim.from && Math.random() < mim.chance) this.queue.push({ t: w.t + 5 + Math.random() * 10, type: mim.type });
    this.queue.sort((a, b) => a.t - b.t);
    w.state = 'wave';
    w.left = this.queue.length;
    this.healBase();
    this.payInterest();
    this.startRadios();
    this.lightFireworks();
    this.loadCrates();
    this.skipVotes.clear();
    w.votes = 0;
    this.events.push({ k: 'waveStart', i: w.index, ...(this.waves[w.index]?.note ? { note: this.waves[w.index].note } : {}), ...(this.waves[w.index]?.glow ? { glow: 1 } : {}) }); // glow: Halloween Night 3's portal lights up
  }

  /** Versus: zombies another player sent here, `n` of them `gap` seconds apart. */
  queueSent(type, n, gap) {
    for (let i = 0; i < n; i++) this.queue.push({ t: this.wave.t + 0.3 + i * gap, type });
    this.queue.sort((a, b) => a.t - b.t);
    this.wave.left = this.queue.length;
  }

  /** A queued wave spawn: { type, hp?, mods? } (hp: the wave's exact health for it; mods: Hard mode modifiers). */
  spawnQueued(q) {
    if (this.contract?.armed) {
      const j = this.contractSwap(q); // Last Laugh: the JESTER comes instead of the final boss
      if (j) return j;
    }
    let mods = q.mods;
    // Hard mode: the first Fallen Squire / Giant / Shield / Angel of the game is a boss.
    if (ENEMIES[q.type]?.bossFirst && !this.bossSeen.has(q.type)) {
      this.bossSeen.add(q.type);
      mods = { ...mods, boss: true };
    }
    if (mods?.boss) this.bossSeen.add(q.type);
    return this.spawn(q.type, { hp: q.hp, mods, wave: true, ...(q.dist != null ? { dist: q.dist, noCash: !!q.noCash } : {}) }); // (Void Caster portals: from her)
  }

  /** Enemy health multiplier for the extra players in this game (Hard has its own table). */
  mpHpMult(def = null) {
    const extra = this.startingPlayers - 1;
    if (extra <= 0) return 1;
    if (this.mpPerEnemy) {
      // Expert: mpTop is its health with 6 players (it grows evenly per player); mpPow compounds.
      if (def?.mpPow) return (1 + def.mpPow) ** extra;
      if (def?.mpTop) return 1 + (def.mpTop - 1) * (Math.min(extra, 5) / 5);
      if (!this.mpHp) return 1; // (Hardcore: the others use its mpHp table)
    }
    if (this.mpHp) return 1 + this.mpHp[Math.min(extra, this.mpHp.length) - 1];
    return 1 + GAME.mpHpScale * extra;
  }

  /**
   * Spawns an enemy at the entrance, or (`at`) partway down the path: { dist, lateral?, hpScale? }.
   * `at.hp` sets its exact health instead of the per-wave growth (still scaled up in multiplayer).
   * Returns it.
   */
  /** The lane the next fresh enemy takes (they take turns on maps with several). */
  nextRoute() {
    if (!path.multi) return 0;
    this.routeN = ((this.routeN ?? -1) + 1) % path.routes.length;
    return this.routeN;
  }

  spawn(type, at = null) {
    const def = ENEMIES[type];
    const mp = this.mpHpMult(def);
    const curve = this.vs || def.fixedHp ? 1 : hpCurve(this.dm, this.wave.index, def.boss || at?.boss); // the mode's balance curve
    const hpMult = def.fixedHp ? 1 : this.vs ? VERSUS.hpMult(this.wave.index) : (this.flatHp ? 1 : 1 + this.wave.index * GAME.hpScalePerWave) * mp * curve;
    const maxHp = at?.hp != null
      ? Math.max(1, Math.round(at.hp * mp * curve))
      : Math.max(1, Math.round(def.hp * hpMult * (at?.hpScale ?? 1)));
    // Engineer teleporters: fresh enemies come out of the one furthest down the path.
    let dist = at?.dist ?? 0;
    // Maps with several lanes: wave spawns take turns; summons follow whoever summoned them.
    let route = at?.route ?? this.enemies.get(at?.owner)?.route ?? this.nextRoute();
    if (def.beeline && at?.dist == null) route = BEELINE; // Drakobloxxer: straight for the base
    if (at?.dist == null && def.placeAt) dist = path.length * rand(...def.placeAt); // Viorb: hovers somewhere along the path
    else if (at?.dist == null) {
      let gate = null;
      for (const o of this.enemies.values()) if (ENEMIES[o.type].portal && (!gate || o.dist > gate.dist)) gate = o;
      if (gate) {
        dist = gate.dist;
        route = gate.route;
        this.events.push({ k: 'warp', x: r2(gate.x), z: r2(gate.z) });
      }
    }
    const sums = def.summon ? [].concat(def.summon) : null;
    const e = {
      id: this.nextId++,
      type,
      hp: maxHp,
      maxHp,
      dist,
      owner: at?.owner ?? 0, // Amplifiers: the enemy that summoned it
      speed: 0,
      baseSpeed: def.speed * (0.94 + Math.random() * 0.12) * (at?.speedMult ?? 1), // Multiplier copies are faster
      noCash: !!at?.noCash, // Grenadier spawns, Multiplier copies: no kill cash
      curve, // the mode's balance curve on its health (it still pays what it would have without it)
      paid: 0, // damage cash it has paid so far, before bonuses (it never pays for more than its max health)
      earned: 0, // ... and what each player got from it, bonuses included (shown when it dies)
      copy: !!at?.copy, // a Multiplier copy (never copied again)
      iceResist: def.iceResist ?? 0, // frost, chill and freezing work this much less on it
      stunImmune: !!def.stunImmune, // can't be stunned or frozen (Predator)
      freezeImmune: !!def.freezeImmune, // Insane: can't be frozen or chilled
      danceImmune: !!def.danceImmune, // Void Boss4: DJ's Apocalypse Rave can't make it dance
      shockImmune: !!def.shockImmune, // Insane: electricity can't stun it (approximated as: no tower stuns, see ENEMIES)
      defense: def.defense ?? 0, // Insane: flat damage blocked from every direct hit
      maxHit: def.maxHit ?? 0, // Insane: no single hit does more than this (0 = no cap)
      carry: at?.carry ?? {}, // Insane: state a shield form hands on to its bare form (once-moves, builds, lowered defense)
      mT: def.mAttacks ? def.mAttacks.map((a) => a.first ?? a.every) : null, // Medium: seconds until each attack
      raged: false, // Medium Eradicator: Electronic Rage has started
      shutT: 0,
      flameT: 0, // Pyrotechnics: seconds of flamethrower left
      route, // which of the map's lanes it walks (see path.routes)
      lateral: at?.lateral ?? 0, // single file: the path is only one zombie wide
      fireImmune: !!(def.fireImmune || (def.statusImmune && !def.burnable)), // fire can't burn it (flamethrowers do nothing)
      statusImmune: !!def.statusImmune, // no burning, freezing, stuns, slime, chill or dancing
      summonT: sums ? sums.map((m) => m.every * 0.5) : null, // seconds until each next summon
      hidden: !!def.hidden,
      flying: !!def.flying, // ground units and traps can't touch it
      lead: !!def.lead, // only towers with lead detection hurt it
      boss: !!def.boss,
      pure: !!def.pure, // every hit does exactly 1 damage
      bulletResist: def.bulletResist ?? 0, // takes this fraction less damage from bullets
      laserResist: def.laserResist ?? 0, // ... and from lasers
      smogT: def.smog ? def.smog.every : 0, // Taint: seconds until the next poison cloud
      stompT: def.stomp ? def.stomp.every * 0.5 : 0, // Overlord: seconds until the next stomp / beam
      beamT: def.beam ? def.beam.first : 0,
      barraged: false, // Overlord: has fired its one missile barrage
      armor: def.armor ?? 0, // takes this fraction less damage
      remains: !!def.remains, // a corpse: never moves, crumbles after `life` seconds
      life: def.decay ?? 0,
      slamT: def.slam ? 3 : 0, // Molten Warlord: seconds until the next slam / axe throw
      axeT: def.axe ? def.axe.every * 0.5 : 0,
      shotT: def.shots ? def.shots.map((s) => s.every * 0.5) : null, // Hard mode: seconds until each shot
      slashT: def.slash ? 1.5 : 0,
      dashT: def.dash ? def.dash.every : 0,
      infectT: def.infect ? 1 : 0,
      flyT: def.fly ? def.fly.first : 0, // Eradicator: seconds until it takes off
      airT: 0, // seconds left flying
      enraged: false,
      shroom: 0, // Pestilence mushrooms: heals this share of max health per second (0 = none)
      stop: 0, // seconds left frozen or stunned
      stopKind: 0, // 'ice' | 'stun' | 0
      burn: 0, // seconds left on fire
      burnDps: 0,
      burnSlow: 0,
      burnAcc: 0, // fractional burn damage not applied yet
      burnBy: 0, // tower id that gets credit for burn damage
      slime: 0, // Slime Trooper slow (fraction of speed lost)
      slimeT: 0, // seconds left slimed
      chill: 0, // Freezer chill, 0..1 (full chill freezes from Lv 3)
      chillT: 0, // seconds until the chill wears off
      chillMax: 0, // slow at full chill
      chillDps: 0,
      chillBy: 0, // tower id that gets credit for chill damage
      chillAcc: 0,
      coldSlow: 0, // Cryo Ranger Ice LMG frostbite (fraction of speed lost, for good)
      iceVuln: 0, // Cryo Ranger Deep Freeze: extra damage taken while this freeze lasts
      beatSlow: 0, // DJ Booth Purple Drop the Beat slow (fraction of speed lost)
      beatT: 0,
      vuln: 0, // DJ Booth Red Drop the Beat: takes this much extra damage from everything
      vulnT: 0,
      neuroT: 0, // Saboteur Neuralyze: seconds left that towers target it first
      poison: null, // Saboteur poison: { damage, tick, slow, left, next, by }
      hackSlow: 0, // Hacker slowness (fraction of speed lost, for good)
      fraud: 0, // Hacker Wire Fraud: extra share of its damage cash (Versus: of the kill reward)
      hackEv: 0, // Hacker: comes back as a hologram with maxHp^hackEv health (0 = no)
      hackBy: 0, // the Hacker tower its hologram fights for
      harpoons: null, // Harpoon Hunter harpoons stuck in it: [{ slow, t }] (null = none)
      bees: null, // Swarmer sting stacks: [{ damage, tick, left, next, by }] (null = none)
      bleed: 0, bleedT: 0, bleedBy: 0, bleedAcc: 0, // Slasher Bleed: stacks, seconds until they fall off, tower credited, fractional damage
      harpoonSlow: 0, // their total slow (capped at harpoonMax)
      harpoonMax: 0,
      harpoonCap: 0, // with harpoons in, all its slows together stop at this
      injured: 0, // Flayer Injured: takes this much extra damage from Knifers
      injuredT: 0,
      zapT: 0, // Stunner: a boss can't be stunned by Stunners again until this runs out
      // Insane mode
      insane: !!(def.hasteAura || def.gear || def.tempo || def.lurch || def.nearHaste || def.trail || def.smoke), // has its own speed rules
      explosiveResist: def.explosiveResist ?? 0, // takes this fraction less damage from explosions
      goldResist: def.goldResist ?? 0, // ... and from golden towers
      aggro: def.aggro ?? 0, // King: towers this close have to shoot it
      gear: 0, // Mechanic armor bolted on (added to armor)
      smoked: false, // inside a Smoker's smoke (hidden)
      hasted: false,
      empT: 0, empHaste: 0, // Battery EMP: moving faster for a while
      glitchT: 0, glitchRes: 0, // a Glitch went through it: laser resistance for a while
      tempo: 1, tempoT: def.tempo ? rand(...def.tempo.every) : 0, // Timeling: current speed multiplier, seconds until it changes
      armorUp: !!def.armorSwap, armorT: def.armorSwap ? rand(...def.armorSwap.every) : 0, // Time Titan
      lurchT: def.lurch ? rand(0.3, def.lurch.every) : 0, // Glitch: seconds until its next lurch
      trailT: 0, smokeT: 0, // Crawler / King trail, Smoker smoke
      arcT: def.arc ? def.arc.every * 0.5 : 0, empCdT: def.emp ? def.emp.every * 0.6 : 0, stabT: def.stab ? 2 : 0, // Battery, King
      waveT: def.timeWave ? def.timeWave.every * 0.5 : 0, bombT: def.timeBomb ? def.timeBomb.every * 0.5 : 0, swordT: def.sword ? 3 : 0, // Beholder
      waitT: 0, // Beholder: standing still at the start of the time dimension
      // Void mode
      void: !!def.void, // a Void enemy (some stuns and slows don't work on it)
      consume: !!def.consume, // Void Consumption: splash can't hurt it
      auraArmor: 0, // inside VOID's aura: extra armor (and hidden)
      punchT: def.punch ? def.punch.every * 0.6 : 0, // VOID
      orbT: def.orb ? def.orb.first : 0,
      laserT: def.skyLaser ? def.skyLaser.first : 0,
      marksDone: 0, hurtDone: 0, // VOID: marks placed, hurt summons done
      dmgBy: def.mark ? new Map() : null, // VOID: damage each tower has dealt to it
      drainT: 1,
      st: 0, // ST_* bits
    };
    if (def.armorSwap) e.armor = def.armorSwap.armor;
    // Hard mode
    if (def.regen) e.regen = def.regen; // Health Regen: share of max health healed per second
    if (def.invuln) e.invulnT = def.invuln; // Breakers popping out
    if (def.charge) e.chargeT = def.charge.time; // Fallen Shield: charges once its shield breaks
    if (def.gift) e.giftT = def.gift.every;
    const fk = def.fallenKing;
    if (fk) {
      e.swingT = fk.swing.first;
      e.swingN = 0;
      e.cometT = fk.comet.first;
      e.boneAt = e.maxHp * (1 - fk.bone.loss);
    }
    if (def.cashDrop) e.drops = 0;
    // Expert mode
    if (def.sprint) e.sprintT = def.sprint.every * rand(0.5, 1); // Time Runner: seconds until its next dash
    if (def.moves) {
      e.moveT = def.moves.first; // seconds until its next boss move
      e.movesDone = 0;
      e.sinceParadox = 0; // Beholder: moves since its last Time Paradox
    }
    if (def.unsheathe) e.unsheathed = false; // Death Angel: no attacks until it draws its staff
    if (at?.boss) e.boss = true; // a boss keeps being one after its shield breaks
    // Insane mode
    if (at?.buildOf) e.buildOf = at.buildOf; // an Engineer's MK11-Device: the Engineer waits for it
    if (def.build && !e.carry.built) e.buildT = def.build.after;
    if (def.healPulse) e.healT = def.healPulse.every * rand(0.4, 1);
    if (def.taunt) e.tauntT = def.taunt.time; // Overlord Taunt: stands still and barely takes damage
    // Hardcore: "+ shield" pools (TDX, Tower Blitz Ranked Up), Drop Pods that can't be hit until they open.
    if (def.roll) {
      // Halloween Night 2 Villagers: each one rolls its own health and explosive resistance.
      const r = def.roll;
      if (r.hp && at?.hp == null) e.hp = e.maxHp = Math.max(1, Math.round(maxHp * rand(...r.hp) / def.hp));
      if (r.explosiveResist) e.explosiveResist = rand(...r.explosiveResist);
    }
    if (def.osh) e.osh = e.oshMax = Math.max(1, Math.round(def.osh * (def.fixedHp ? 1 : mp)));
    if (def.pod) {
      e.podT = def.pod.open;
      e.noTarget = true;
    }
    const mods = at?.mods;
    if (mods) {
      if (mods.boss) e.boss = true;
      if (mods.aggro) e.aggro = 1e4; // every tower in range has to attack it
      if (mods.bloated) e.maxHp = e.hp = Math.round(e.maxHp * GAME.bloated);
      if (mods.nimble) e.baseSpeed *= GAME.nimble;
      if (mods.hidden) e.hidden = e.cloak = true;
      if (mods.regen) e.regen = GAME.healthRegen;
    }
    if (def.adapt) e.bulletResist = e.laserResist = e.explosiveResist = e.goldResist = def.adapt.start;
    if (def.blockShots) this.blockers = true; // turns on line-of-sight checks in findTarget (see blocker)
    // Void mode: wave enemies may spawn in void armor (a group's `voidArmor` mod always does).
    if (this.voidArmor && at?.wave && !def.noVoidArmor && !def.remains && (mods?.voidArmor || Math.random() < (this.waves[this.wave.index]?.va ?? 0))) this.armorUp(e);
    else if (this.voidArmor && mods?.voidArmor) this.armorUp(e);
    e.speed = e.baseSpeed;
    path.at(e.dist, e, e.route);
    e.x += -e.dz * e.lateral;
    e.z += e.dx * e.lateral;
    // Businessman Attrition: zombies that spawn while it's on lose part of their health.
    if (this.attrition?.left > 0 && (!at || at.wave)) {
      const cut = Math.min(this.attrition.cap, e.maxHp * this.attrition.pct);
      e.hp = Math.max(1, e.hp - cut);
    }
    this.enemies.set(e.id, e);
    return e;
  }

  /** Spawns what died-and-came-back or was summoned this tick (after every tower has fired). */
  spawnReborn() {
    if (this.holos.length) this.spawnHolograms();
    if (!this.reborn.length) return;
    const list = this.reborn;
    this.reborn = [];
    for (const r of list) {
      const e = this.spawn(r.type, r);
      if (r.keep) {
        // Shell breaks, VOID rising: the new form carries on with the old one's health.
        e.maxHp = r.keep.maxHp;
        e.hp = Math.min(e.maxHp, Math.max(1, r.keep.hp));
      }
      if (r.from) this.events.push({ k: 'reborn', e: e.id, from: r.from, type: r.type, ...(r.shell ? { shell: 1 } : {}) });
    }
  }

  end(win) {
    this.over = win ? 1 : -1;
    this.wave.state = win ? 'victory' : 'defeat';
    const bonus = win ? this.winCredits() : null;
    this.events.push({ k: 'end', win, ...(bonus ? { bonus } : {}) });
  }

  /**
   * Oil Derrick US Military Budget: bonus credits for winning with one on the field, as
   * { player id: credits } (null: nobody has one). `noStack`: several don't add up.
   */
  winCredits() {
    let out = null;
    for (const t of this.towers.values()) {
      const v = TOWERS[t.type].levels[t.level].winCredits;
      if (!v || t.holo) continue;
      out ??= {};
      out[t.owner] = TOWERS[t.type].noStack ? Math.max(out[t.owner] ?? 0, v) : (out[t.owner] ?? 0) + v;
    }
    return out;
  }

  // ---------------------------------------------------------------- towers

  /** Medics heal the base at the start of every wave (never above its starting health). */
  healBase() {
    for (const t of this.towers.values()) {
      const heal = TOWERS[t.type].levels[t.level].heal;
      if (!heal || this.baseHp >= this.maxBaseHp) continue;
      const v = Math.min(heal, this.maxBaseHp - this.baseHp);
      this.baseHp += v;
      this.events.push({ k: 'heal', id: t.id, v, x: t.x, z: t.z });
    }
  }

  /** Market Banking: the money in each bank grows by its interest at the start of every wave (up to its cap). */
  payInterest() {
    for (const t of this.towers.values()) {
      const bank = TOWERS[t.type].levels[t.level].bank;
      if (bank && t.bank > 0) t.bank = Math.min(bank.cap, Math.round(t.bank * (1 + bank.interest)));
    }
  }

  /** Rangers with Intelligence Radio boost the range of nearby towers for a while every wave. */
  startRadios() {
    for (const t of this.towers.values()) {
      const radio = TOWERS[t.type].levels[t.level].radio;
      if (radio) t.radioT = radio.time;
    }
  }

  /**
   * Airdrop Farms: a wave's crates are set when the wave starts (so upgrades bought mid-wave
   * count from the next wave). Crates left over from an earlier wave land first.
   */
  loadCrates() {
    for (const t of this.towers.values()) {
      const def = TOWERS[t.type];
      const s = def.levels[t.level];
      if (!s.crates || t.holo) continue;
      this.landCrates(t);
      let total = s.income;
      if (s.econ) {
        // Tower Economics: a share of what was spent on the other towers nearby.
        let value = 0;
        for (const o of this.towers.values()) {
          if (o === t || o.holo || TOWERS[o.type].kind === 'income') continue;
          if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= s.econ.radius ** 2) value += o.spent;
        }
        total += Math.min(s.econ.max, Math.floor(value * s.econ.pct));
      }
      const each = Math.floor(total / s.crates);
      for (let i = 0; i < s.crates; i++) {
        t.crates.push({ t: s.drop + i * (def.crateGap ?? 3), v: i ? each : total - each * (s.crates - 1) });
      }
    }
  }

  /** Airdrop Farm crates count down; `all`: land every one still in the air right now. */
  landCrates(t, dt = 0, all = true) {
    if (!t.crates.length) return;
    t.crates = t.crates.filter((c) => {
      if (!all && (c.t -= dt) > 0) return true;
      const owner = this.players.get(t.owner);
      const bank = TOWERS[t.type].levels[t.level].bank;
      if (bank && t.hp > 0) {
        // Market Banking: bundles go into its bank (up to the cap) instead of being paid out.
        t.bank = Math.min(bank.cap, (t.bank || 0) + c.v);
        this.events.push({ k: 'crate', id: t.id, owner: t.owner, v: 0, x: t.x, z: t.z });
      } else if (owner && t.hp > 0) {
        owner.cash += c.v; // a knocked-out helipad loses its crate
        this.events.push({ k: 'crate', id: t.id, owner: t.owner, v: c.v, x: t.x, z: t.z });
      }
      return false;
    });
  }

  /** Towers with an `income` stat (e.g. Stonk Tweeters) pay their owner after each wave. */
  /**
   * Trawler: `catch.n` catches of `min`-`max` cash each. Skipping a wave adds `boost` (stacking up
   * to `maxBoost`); a wave that isn't skipped loses it twice as fast.
   */
  catchFish(t, c, skip) {
    t.boost = skip ? Math.min(c.maxBoost, (t.boost || 0) + c.boost) : Math.max(0, (t.boost || 0) - c.boost * 2);
    let pay = 0;
    for (let i = 0; i < c.n; i++) pay += Math.round(rand(c.min, c.max));
    return Math.round(pay * (1 + t.boost));
  }

  payIncome(skip = false) {
    for (const t of this.towers.values()) {
      if (t.crates.length || TOWERS[t.type].levels[t.level].crates) {
        this.landCrates(t); // Airdrop Farms are paid by their crates
        continue;
      }
      let income = !t.holo && TOWERS[t.type].levels[t.level].income;
      const fish = !t.holo && TOWERS[t.type].levels[t.level].catch;
      if (fish) income = this.catchFish(t, fish, skip);
      const owner = this.players.get(t.owner);
      if (!income || !owner) continue;
      owner.cash += income;
      this.events.push({ k: 'income', id: t.id, owner: t.owner, v: income, x: t.x, z: t.z });
    }
  }

  /** Every tower of `type` (any upgrade path) as a range circle; used by `shared` towers (ChitChat, Businessman). */
  rangeCircles(type) {
    const circles = [];
    const root = rootType(type);
    for (const o of this.towers.values()) {
      if (rootType(o.type) !== root) continue;
      const r = TOWERS[o.type].levels[o.level].range;
      circles.push({ x: o.x, z: o.z, r2: r * r });
    }
    return circles;
  }

  /** What tower `t` can hit right now: { hidden, flying, lead } (Aviator spy rings lend hidden). */
  detects(t, s) {
    const d = detection(t.type, t.level);
    if (!d.hidden && this.spies.some((c) => (t.x - c.x) ** 2 + (t.z - c.z) ** 2 <= c.r2)) d.hidden = true;
    if (t.fwT > 0) d.hidden = true; // Firework Technician: hidden detection for a while each wave
    if (t.seeT > 0 || s?.hidden) d.hidden = true; // Spark Now-You-See-Me; Submerge's Submerged mode
    if (s?.bombs && !this.bombsOf(t, s).some((b) => b.key === 'fire')) d.lead = false; // Jester: only Fire bombs hurt lead
    return d;
  }

  /** Jester: the bomb types it has picked, as [{ key, ...bomb }]. */
  bombsOf(t, s) {
    return choicesOf(TOWERS[t.type], s, t.choice).map((k) => ({ key: k, ...s.bombs[k] }));
  }
}
