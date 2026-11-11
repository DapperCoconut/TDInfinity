// Towers: spread and multi-target. Shotgunner, Plasma, Electro, Tesla, Trapper, Mine Layer.
// One group of the TOWERS table. config.js joins the groups in order (see TOWERS there).
// Shared units and abilities (MERC, AP_AB, ...) come from shared.js.
import { HEALPACK_AB, UNSTUN_AB } from './shared.js';

export const TOWERS_SPREAD = {

  // ---------------------------------------------------------------- spread & multi-target
  // extra / splash / cone: Shotgunner. Each shot hits its target for `damage`, plus up to
  //         `extra` more zombies within `cone` (half-angle, radians) of its aim for `splash`.
  // targets: Plasma Trooper. Every shot zaps up to this many zombies at once.

  shotgunner: {
    name: 'Shotgunner',
    lead: 3,
    price: 300,
    cost: 300,
    limit: 10,
    blurb: 'A cheap, short-range blaster. Each shot does full damage to its target and half damage to a few extra zombies in a cone.',
    levels: [
      { name: 'Shotgunner', desc: 'A cheap, short-range shotgun that also hits one extra zombie.', damage: 4, splash: 2, extra: 1, cone: 0.6, cooldown: 2, range: 6.25, hidden: false },
      { name: 'Midnight Hunter', desc: 'More range.', cost: 300, damage: 4, splash: 2, extra: 1, cone: 0.6, cooldown: 2, range: 8.5, hidden: false },
      { name: 'Bolt Action', desc: 'More damage and shoots almost twice as fast.', cost: 820, damage: 6, splash: 3, extra: 1, cone: 0.6, cooldown: 1.05, range: 8.5, hidden: false },
      { name: 'Bandolier', desc: 'Doubles its damage and hits one more extra zombie.', cost: 1400, damage: 12, splash: 6, extra: 2, cone: 0.6, cooldown: 1.05, range: 8.5, hidden: false },
      { name: 'Crowd Control', desc: 'More damage, more range, slightly faster, and hits one more extra zombie.', cost: 4200, damage: 18, splash: 9, extra: 3, cone: 0.6, cooldown: 0.9, range: 10.5, hidden: false },
    ],
  },
  // pellets: Pump Shotgunner. Each shot sprays this many pellets at random angles inside `cone`
  //          (half-angle). Each pellet pierces: the first 2 zombies on its line take full
  //          `damage`, the 3rd takes half. Up close, more pellets land on the same zombie.
  shotgunnerPump: {
    name: 'Pump Shotgunner',
    lead: 3,
    altOf: 'shotgunner',
    form: 'Pump',
    shards: 1,
    price: 0,
    cost: 1500,
    limit: 9,
    blurb: 'An alternate Shotgunner with a pump shotgun that sprays a cone of piercing pellets: the first two zombies on each pellet\'s line take full damage, the third half. Short range, and zombies up close take more pellets. Sees hidden zombies from Lv 2.',
    tip: 'Place it in line with the path and set targeting to Last or First so zombies walking along the path take every pellet. Lv 4-5 ones clear big late hordes.',
    levels: [
      { name: 'Pump Shotgunner', desc: 'A pump shotgun that sprays 8 piercing pellets in a cone.', damage: 2, pellets: 8, cone: 0.22, cooldown: 1.1, range: 8, hidden: false },
      { name: 'Shotgun Knowledge', desc: 'A little more damage, and it can now see hidden zombies.', cost: 750, damage: 3, pellets: 8, cone: 0.22, cooldown: 1.1, range: 8, hidden: true },
      { name: 'Clay Pigeon Training', desc: 'Shoots faster, more range, one more pellet and a wider spread.', cost: 1500, damage: 3, pellets: 9, cone: 0.28, cooldown: 0.8, range: 9.5, hidden: true },
      { name: 'Heavier Shells', desc: 'Much more damage, more range and a wider spread.', cost: 6500, damage: 7, pellets: 9, cone: 0.32, cooldown: 0.8, range: 11, hidden: true },
      { name: 'Tactical Blowback', desc: 'A big damage boost, more range, 12 pellets per shot and an even wider spread.', cost: 18777, damage: 14, pellets: 12, cone: 0.38, cooldown: 0.8, range: 13.5, hidden: true },
    ],
  },
  // Combat Shotgunner (alternate Shotgunner with two paths): every zombie in its cone takes full
  // damage (splash = damage), up to `extra` + 1 zombies per shot. `hp`: tower health.
  shotgunnerCombat: {
    name: 'Combat Shotgunner',
    altOf: 'shotgunner',
    form: 'Combat',
    shards: 2,
    price: 0,
    cost: 325,
    limit: 10,
    branch: 'shotgunnerCombatBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Shotgunner with two upgrade paths right away. A cheap beginner tower that blasts a cone in front of it, hitting up to 3 zombies at full damage. Great value early and mid game. Top path: fast shooting, hidden detection and the AA-12's Health Pack. Bottom path: heavy damage, flying and lead detection, and the DB-12's Unstun Power.",
    tip: "Place it right next to the path: its range is short. The Bottom path's Unstun Power is great against Smasher and Eradicator stuns. Not recommended for Expert or Endless.",
    levels: [
      { name: 'Combat Shotgunner', desc: 'A cheap shotgun that blasts a cone in front of it, hitting up to 3 zombies.', damage: 3, splash: 3, extra: 2, cone: 0.5, cooldown: 1.75, range: 6.5, hp: 100, flying: false, hidden: false },
      { name: 'Gloves', path: 'Top', desc: 'Top path: shoots faster, with a little more range and health.', cost: 200, damage: 3, splash: 3, extra: 2, cone: 0.5, cooldown: 1.45, range: 7.5, hp: 115, flying: false, hidden: false },
      { name: 'Padded Vest', path: 'Top', desc: 'More damage, health and range, and shoots a bit faster.', cost: 325, damage: 5, splash: 5, extra: 2, cone: 0.5, cooldown: 1.35, range: 8.5, hp: 135, flying: false, hidden: false },
      { name: 'Militant', path: 'Top', desc: 'Hits 1 more zombie, a wider cone and much faster shooting.', cost: 1950, damage: 5, splash: 5, extra: 3, cone: 0.6, cooldown: 0.85, range: 8.5, hp: 135, flying: false, hidden: false },
      { name: 'Advanced Goggles', path: 'Top', desc: 'Sees hidden zombies, hits 3 more zombies, shoots faster and gets more range.', cost: 2400, damage: 5, splash: 5, extra: 6, cone: 0.6, cooldown: 0.6, range: 9.5, hp: 135, flying: false, hidden: true },
      { name: 'AA-12', path: 'Top', desc: 'A big damage boost, very fast shooting, a wider cone and 1 more target. Unlocks Health Pack.', cost: 10000, damage: 21, splash: 21, extra: 7, cone: 0.75, cooldown: 0.2, range: 9.5, hp: 135, flying: false, hidden: true,
        abilities: [HEALPACK_AB] },
    ],
  },
  // The Combat Shotgunner's Bottom path (not in the shop: a Combat Shotgunner becomes this when you pick it).
  shotgunnerCombatBottom: {
    name: 'Combat Shotgunner',
    branchOf: 'shotgunnerCombat',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 325,
    limit: 10,
    blurb: "The Combat Shotgunner's Bottom path: huge damage per pellet, then flying and lead detection, and the DB-12's Unstun Power to free stunned towers.",
    tip: "It never sees hidden zombies: pair it with a tower that does, or a Tactical Sniper's Flare Gun.",
    levels: [
      { name: 'Combat Shotgunner', desc: 'A cheap shotgun that blasts a cone in front of it, hitting up to 3 zombies.', damage: 3, splash: 3, extra: 2, cone: 0.5, cooldown: 1.75, range: 6.5, hp: 100, flying: false, hidden: false },
      { name: 'Shotgun Knowledge', path: 'Bottom', desc: 'Bottom path: more health, damage and a bit more range.', cost: 100, damage: 5, splash: 5, extra: 2, cone: 0.5, cooldown: 1.75, range: 7.5, hp: 130, flying: false, hidden: false },
      { name: 'Bigger Buckshot', path: 'Bottom', desc: 'More damage.', cost: 375, damage: 9, splash: 9, extra: 2, cone: 0.5, cooldown: 1.75, range: 7.5, hp: 130, flying: false, hidden: false },
      { name: 'Officer', path: 'Bottom', desc: 'Hits flying zombies, more damage and range, and 1 more target, but a narrower cone and slower shooting.', cost: 1150, damage: 15, splash: 15, extra: 3, cone: 0.4, cooldown: 2.05, range: 9.5, hp: 130, flying: true, hidden: false },
      { name: 'SWAT Equipment', path: 'Bottom', desc: 'Ignores bullet resistance (hits lead zombies), a big damage boost and 1 more target.', cost: 3250, damage: 35, splash: 35, extra: 4, cone: 0.4, cooldown: 2.05, range: 10.5, hp: 130, flying: true, lead: true, ignoreBulletResist: true, hidden: false },
      { name: 'DB-12', path: 'Bottom', desc: 'A huge damage boost, hits 6 more zombies and lots more health. Unlocks Unstun Power.', cost: 16000, damage: 195, splash: 195, extra: 10, cone: 0.4, cooldown: 2.15, range: 10.5, hp: 250, flying: true, lead: true, ignoreBulletResist: true, hidden: false,
        abilities: [UNSTUN_AB] },
    ],
  },
  plasma: {
    name: 'Plasma Trooper',
    lead: 3,
    price: 2400,
    cost: 950,
    limit: 8,
    blurb: 'Holds a plasma globe that zaps several zombies at once with fast, steady damage. Sees hidden zombies at every level.',
    levels: [
      { name: 'Plasma Trooper', desc: 'Zaps up to 3 zombies at once. Sees hidden zombies.', damage: 3, targets: 3, cooldown: 0.866, range: 6, hidden: true },
      { name: 'Safety Goggles', desc: 'More range.', cost: 400, damage: 3, targets: 3, cooldown: 0.866, range: 9, hidden: true },
      { name: 'Short Wavelength', desc: 'More than doubles its damage.', cost: 970, damage: 8, targets: 3, cooldown: 0.866, range: 9, hidden: true },
      { name: 'Plasma Tower', desc: 'More than double damage, faster zaps, a bit more range, and hits 5 zombies.', cost: 4400, damage: 20, targets: 5, cooldown: 0.75, range: 10, hidden: true },
      { name: 'Lightbulb of Doom', desc: 'More than double damage again, much more range, and hits 8 zombies.', cost: 20000, damage: 45, targets: 8, cooldown: 0.75, range: 14, hidden: true },
    ],
  },
  // pulse: Pulse Trooper. It never aims: every shot is a ring that grows from the tower out to
  //        its range at `pulse` units per second, hitting every zombie it touches once.
  // Sweeper (ability): two lasers on opposite sides of the tower reach across the whole map and
  //        spin around it (one turn every `spin` seconds) for `duration` seconds. Every time a
  //        laser passes over a zombie (hidden ones too) it deals `damage`.
  // Unlike other towers it has 6 levels (Lv 1-6).
  plasmaPulse: {
    name: 'Pulse Trooper',
    lead: true,
    altOf: 'plasma',
    form: 'Pulse',
    shards: 1,
    price: 0,
    cost: 2100,
    limit: 7,
    pulse: 26,
    blurb: 'An alternate Plasma Trooper that never aims: it sends out a ring-shaped pulse that grows to the edge of its range and hurts every zombie it touches. From Lv 5 it can use Sweeper: two lasers spin around it for a few seconds, reaching across the whole map and hitting every zombie they pass, even hidden ones. Weak against single strong zombies, short range, and it can\'t see hidden zombies on its own.',
    tip: 'Place it at loops and U-turns where lots of zombies stay close to it. A DJ makes it pulse faster and a Commander stretches its range. Slow or freeze zombies nearby to keep them in its pulses longer.',
    levels: [
      { name: 'Pulse Trooper', desc: 'Sends out a pulse in a full circle that hits every zombie it touches once.', damage: 13, cooldown: 1.5, range: 7.5, hidden: false },
      { name: 'Capacitor Boost', desc: 'A bit more damage and pulses faster.', cost: 700, damage: 15, cooldown: 1.2, range: 7.5, hidden: false },
      { name: 'Pulse Amplifier', desc: 'More damage and a little more range.', cost: 3600, damage: 25, cooldown: 1.2, range: 8.5, hidden: false },
      { name: 'Charged Filament', desc: 'Pulses more than twice as fast.', cost: 4900, damage: 25, cooldown: 0.55, range: 8.5, hidden: false },
      { name: 'Sweeper', desc: 'More damage and range, and unlocks Sweeper: two lasers spin around it for 6 seconds, reaching across the whole map and hitting every zombie they pass, even hidden ones.', cost: 8500, damage: 35, cooldown: 0.55, range: 9, hidden: false,
        abilities: [{ key: 'sweeper', name: 'Sweeper', desc: 'Two map-wide lasers spin around it for 6s: 72 damage each time one passes a zombie', cooldown: 40, damage: 120, duration: 6, spin: 4 }] },
      { name: 'Arc Reactor', desc: 'More damage and range, and the Sweeper lasers hit much harder and spin faster.', cost: 17000, damage: 50, cooldown: 0.55, range: 10, hidden: false,
        abilities: [{ key: 'sweeper', name: 'Sweeper', desc: 'Two map-wide lasers spin faster around it for 6s: 140 damage each time one passes a zombie', cooldown: 40, damage: 230, duration: 6, spin: 2.5 }] },
    ],
  },

  // chains / jump: Electroshocker. A bolt hits the target, then jumps to the closest zombie it
  //         hasn't hit yet within `jump` of the last one, hitting `chains` zombies in all.
  //         Every hit stuns for `stun` seconds (bosses only get `bossStop` of it, so they slow).
  electro: {
    name: 'Electroshocker',
    lead: true,
    price: 1300,
    cost: 650,
    limit: 7,
    bossStop: 0.4,
    blurb: 'Shoots a lightning bolt that jumps from zombie to zombie in a chain. Every hit briefly stuns, even big zombies (bosses only get a short stun). Sees hidden zombies from Lv 2. Struggles against high-health zombies.',
    tip: 'Put it at corners, crossings or where the path passes by more than once, so the bolt has lots of zombies to jump between.',
    levels: [
      { name: 'Electroshocker', desc: 'A chain of lightning that hits 2 zombies and stuns them for a moment.', damage: 5, chains: 2, jump: 6, stun: 0.25, cooldown: 1.35, range: 10, hidden: false },
      { name: 'Improved Handling', desc: 'More damage and range, shoots faster, chains to one more zombie, and it can now see hidden zombies.', cost: 1225, damage: 8, chains: 3, jump: 6, stun: 0.25, cooldown: 1.15, range: 13, hidden: true },
      { name: "Faraday's Vest", desc: 'Much more damage, and the lightning can jump farther.', cost: 2400, damage: 20, chains: 3, jump: 8, stun: 0.3, cooldown: 1.15, range: 13, hidden: true },
      { name: 'Shock Force', desc: 'A huge damage boost, jumps farther, chains to one more zombie and stuns longer, but fires slower.', cost: 4000, damage: 60, chains: 4, jump: 9, stun: 0.6, cooldown: 2.5, range: 13, hidden: true },
      { name: 'Zeus Cannon', desc: 'More damage and range, chains to 2 more zombies, and stuns even longer.', cost: 10000, damage: 90, chains: 6, jump: 10, stun: 0.9, cooldown: 2.5, range: 15, hidden: true },
    ],
  },
  // Shock Trooper (alternate Electroshocker form). Chain lightning like the Electroshocker
  // (chains = zombies hit in all, the target included); chainMult: the jumps after the first
  // target do this much of the damage. bossStop 0: bosses can't be stunned at all.
  // teamLimit: how many each player may place, by team size (solo, duo, trio, quad).
  // Not used by the game yet (kept for later): throughWalls (Lv 3+: shoots through obstacles).
  electroTrooper: {
    name: 'Shock Trooper',
    lead: true,
    flying: false,
    altOf: 'electro',
    form: 'Trooper',
    shards: 1,
    price: 0,
    cost: 550,
    limit: 3,
    teamLimit: [3, 2, 1, 1],
    bossStop: 0,
    blurb: "An alternate Electroshocker: a soldier with a lightning gun whose bolts chain from zombie to zombie and stun every one they hit. Sees hidden zombies from the start and flying ones from Lv 3, with long range and wide chains. It can't stun bosses, and you can only place a few (3 solo, 2 in a duo, 1 in bigger teams).",
    tip: 'Put it where lots of zombies pass close together so each bolt chains through as many as it can. Bring real damage for bosses: it can only hurt them.',
    levels: [
      { name: 'Shock Trooper', desc: 'A lightning bolt that hits a zombie, then jumps to 1 more for half damage, stunning both.', damage: 10, chains: 2, jump: 4, chainMult: 0.5, stun: 0.3, cooldown: 3, range: 15, hp: 300, hidden: true },
      { name: 'Faster Charge', desc: 'Fires twice as fast (every 3s → 1.5s).', cost: 500, damage: 10, chains: 2, jump: 4, chainMult: 0.5, stun: 0.3, cooldown: 1.5, range: 15, hp: 350, hidden: true },
      { name: 'Extra Voltage', desc: 'Damage 10 → 24, the bolt jumps to 2 zombies and a bit farther, and 2 more range.', cost: 1200, damage: 24, chains: 3, jump: 5, chainMult: 0.5, stun: 0.3, cooldown: 1.5, range: 17, hp: 450, hidden: true },
      { name: 'Tesla Tower', desc: 'Becomes a tesla tower: hits flying zombies, damage 24 → 52, 0.5s stuns, 3 jumps for 60% damage that reach twice as far, and much more range, but fires every 2s.', cost: 5500,
        damage: 52, chains: 4, jump: 10, chainMult: 0.6, stun: 0.5, cooldown: 2, range: 22, hp: 1025, flying: true, throughWalls: true, hidden: true },
      { name: 'Solar Radar', desc: 'Damage 52 → 112, 0.6s stuns, 4 jumps for 70% damage, farther jumps and more range. Fires every 2.25s.', cost: 18000,
        damage: 112, chains: 5, jump: 14, chainMult: 0.7, stun: 0.6, cooldown: 2.25, range: 27, hp: 2525, flying: true, throughWalls: true, hidden: true },
      { name: 'Maximum Charge', desc: 'Damage 112 → 552 and the bolt jumps through 11 zombies, each jump hitting for 125%. 0.9s stuns, huge jumps and more range, but fires every 4.05s.', cost: 75000,
        damage: 552, chains: 12, jump: 20, chainMult: 1.25, stun: 0.9, cooldown: 4.05, range: 34, hp: 4025, flying: true, throughWalls: true, hidden: true },
    ],
  },
  // Tesla: chain lightning like the Electroshocker (chains / jump / stun, bosses only slowed).
  // smite: { hits, damage, radius }: every zombie a bolt hits fills its meter; after `hits` hits
  //   it calls down a thunderbolt on its current target: `damage` to every zombie within
  //   `radius`, ignoring armor, with no falloff.
  tesla: {
    name: 'Tesla',
    altOf: 'paralyzer',
    form: 'Tesla',
    shards: 3,
    lead: true,
    price: 0,
    cost: 5750,
    limit: 2,
    bossStop: 0.4,
    blurb: "Shoots chain lightning that jumps from zombie to zombie, stunning every one it hits. From Lv 3 every hit fills a meter, and when it's full it calls down Smite: a thunderbolt that explodes on its target. Great crowd control that gives your other towers more time to shoot. Never sees hidden zombies, and bosses and stun-immune zombies are only slowed.",
    tip: "Smite ignores armor and doesn't lose damage with distance, so it hurts big groups. The lightning jumps a long way, so it can reach far zombies as long as one is in its range.",
    levels: [
      { name: 'Tesla', desc: 'Chain lightning that hits 2 zombies and briefly stuns them.', damage: 80, chains: 2, jump: 8, stun: 0.3, cooldown: 2, range: 17, hidden: false },
      { name: 'Kite in the Wind', desc: 'More damage, longer stuns, and the lightning hits 1 more zombie.', cost: 4314, damage: 110, chains: 3, jump: 8, stun: 0.45, cooldown: 2, range: 17, hidden: false },
      { name: 'Self-Sustaining Battery', desc: 'More range, fires faster, the lightning jumps farther, and Smite: after 9 hits it calls down a thunderbolt that explodes on its target.', cost: 10007, damage: 120, chains: 3, jump: 12, stun: 0.45, cooldown: 1.6, range: 18.5, hidden: false,
        smite: { hits: 9, damage: 200, radius: 5 } },
      { name: 'Auric Quantum Cooling Cell', desc: 'More range and damage, longer stuns, and a much stronger Smite with a bigger blast, but it takes 12 hits to fill.', cost: 24000, damage: 160, chains: 3, jump: 12, stun: 0.6, cooldown: 1.6, range: 20, hidden: false,
        smite: { hits: 12, damage: 475, radius: 5.5 } },
      { name: "Kimat's Bite", desc: 'A big damage boost, fires faster, longer stuns, the lightning jumps even farther, and a stronger Smite with a huge blast that takes 15 hits to fill.', cost: 55000, damage: 250, chains: 3, jump: 16, stun: 0.85, cooldown: 1.4, range: 20, hidden: false,
        smite: { hits: 15, damage: 650, radius: 7.5 } },
    ],
  },
  // traps: throws traps onto the path within `range` every `cooldown` seconds (at
  // random spots when no zombie is in range), up to `maxTraps` at once. Traps hit hidden zombies.
  //   spike: { damage, uses } hurts each zombie that walks over it once, until `uses` hits are spent.
  //   mine:  { damage, radius, burn, burnTime } explodes on the first zombie and sets the blast on fire.
  //   bear:  { damage, stun } snaps on one zombie and stuns it (bosses get `bossStop` of it).
  //   order: which traps it throws, in turn.
  trapper: {
    name: 'Trapper',
    lead: true,
    flying: false,
    price: 900,
    cost: 500,
    limit: 7,
    traps: true,
    bossStop: 0.4,
    blurb: 'Throws traps onto the path that hurt zombies who step on them. Starts with spikes, then unlocks landmines (Lv 3) and bear traps (Lv 5). Traps hit hidden zombies too. Slow to set up.',
    tip: 'Place it toward the back of the path so it has time to stack up traps between waves. Long stretches of path in range let it spread lots of traps.',
    levels: [
      { name: 'Trapper', desc: 'Throws spike traps that hurt every zombie that walks over them until they wear out.', cooldown: 4, range: 7, maxTraps: 5, hidden: true,
        order: ['spike'], spike: { damage: 10, uses: 4 } },
      { name: 'Sharper Spikes', desc: 'Spikes do more damage and last longer.', cost: 500, cooldown: 4, range: 7, maxTraps: 5, hidden: true,
        order: ['spike'], spike: { damage: 20, uses: 5 } },
      { name: 'Watch your step', desc: 'More range, holds more traps, better spikes, and unlocks landmines that explode and set zombies on fire.', cost: 1500, cooldown: 4, range: 9, maxTraps: 7, hidden: true,
        order: ['spike', 'mine'], spike: { damage: 25, uses: 5 }, mine: { damage: 30, radius: 3.5, burn: 3, burnTime: 3 } },
      { name: 'Better Traps', desc: 'Holds more traps, much stronger spikes and landmines, throws faster, and landmine burns last longer.', cost: 6000, cooldown: 3, range: 10, maxTraps: 9, hidden: true,
        order: ['spike', 'mine'], spike: { damage: 45, uses: 6 }, mine: { damage: 60, radius: 4, burn: 6, burnTime: 5 } },
      { name: "Don't try this at home", desc: 'Holds many more traps, stronger spikes and landmines, and unlocks bear traps that hit one zombie hard and stun it for 3 seconds.', cost: 11500, cooldown: 2.5, range: 10, maxTraps: 13, hidden: true,
        order: ['spike', 'mine', 'spike', 'bear'], spike: { damage: 65, uses: 7 }, mine: { damage: 90, radius: 4.5, burn: 10, burnTime: 5 }, bear: { damage: 250, stun: 3 } },
    ],
  },
  // Mine Layer (alternate Trapper with two paths). Throws one mine every `cooldown` s onto the far
  // end of the path in its range (where leaking zombies go), with no limit on how many lie there.
  //   mine.life:     seconds a mine lies there before it fizzles out. Mines keep working while the
  //                  tower is knocked out (they go when it's sold).
  //   Mines only go off on (and only hurt) hidden zombies once the tower can see them (`hidden`).
  //   mine.thermite: { radius, time, burn, burnTime } the blast leaves a burning patch for `time` s
  //                  that sets every zombie walking through it on fire.
  // hp: tower health (see GAME.towerHp).
  // ignoreExplosiveResist (from Lv 4 Bottom): explosive-resistant zombies take full damage.
  mineLayer: {
    name: 'Mine Layer',
    lead: true,
    flying: false,
    altOf: 'trapper',
    form: 'Mine Layer',
    shards: 2,
    price: 0,
    cost: 280,
    limit: 7,
    traps: true,
    mines: true,
    branch: 'mineLayerBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Trapper with two upgrade paths right away. Throws explosive mines onto the far end of the path in its range. Mines pile up and stay until they wear out, even if the tower is knocked out. Made to catch zombies that sneak past your defense, and stacked mines can melt bosses. Top path: faster throwing, hidden detection at Lv 3 and huge AP mines. Bottom path: longer-lasting mines, then Thermite that burns. Shouldn't be your main damage.",
    tip: 'Place it midgame so mines can pile up, ideally near the end of long maps. A DJ or Commander nearby makes it throw mines faster. The Bottom path never sees hidden zombies.',
    levels: [
      { name: 'Mine Layer', desc: 'Throws an explosive mine onto the path that blows up when a zombie walks over it.', cooldown: 25, range: 9, hp: 65, hidden: false,
        order: ['mine'], mine: { damage: 50, radius: 3.5, life: 60 } },
      { name: 'Faster Arming', path: 'Top', desc: 'Top path: throws mines faster, and they last longer.', cost: 220, cooldown: 20, range: 9, hp: 75, hidden: false,
        order: ['mine'], mine: { damage: 50, radius: 3.5, life: 75 } },
      { name: 'Advanced Training', path: 'Top', desc: 'Throws faster, more damage, and mines last longer.', cost: 650, cooldown: 18, range: 9, hp: 85, hidden: false,
        order: ['mine'], mine: { damage: 65, radius: 3.5, life: 90 } },
      { name: 'Claymore', path: 'Top', desc: 'Sees hidden zombies, throws much faster, more damage and bigger blasts.', cost: 2000, cooldown: 14, range: 9, hp: 100, hidden: true,
        order: ['mine'], mine: { damage: 105, radius: 4.5, life: 90 } },
      { name: 'AP Mine', path: 'Top', desc: 'A big damage boost, and it throws faster.', cost: 3000, cooldown: 12, range: 9, hp: 115, hidden: true,
        order: ['mine'], mine: { damage: 175, radius: 4.5, life: 90 } },
      { name: 'Super AP Mine', path: 'Top', desc: 'A huge damage boost, bigger blasts and more range.', cost: 9000, cooldown: 11, range: 11, hp: 130, hidden: true,
        order: ['mine'], mine: { damage: 275, radius: 5.5, life: 90 } },
    ],
  },
  // The Mine Layer's Bottom path (not in the shop: a Mine Layer becomes this when you pick it).
  mineLayerBottom: {
    name: 'Mine Layer',
    lead: true,
    flying: false,
    branchOf: 'mineLayer',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 280,
    limit: 7,
    traps: true,
    mines: true,
    blurb: "The Mine Layer's Bottom path: mines that last much longer and hit harder, then Thermite mines that leave burning patches on the path, and the X-Mine.",
    tip: "It never sees hidden zombies, so its mines don't go off on them: pair it with a tower that does, or a Tactical Sniper's Flare Gun.",
    levels: [
      { name: 'Mine Layer', desc: 'Throws an explosive mine onto the path that blows up when a zombie walks over it.', cooldown: 25, range: 9, hp: 65, hidden: false,
        order: ['mine'], mine: { damage: 50, radius: 3.5, life: 60 } },
      { name: 'Life Span', path: 'Bottom', desc: 'Bottom path: mines last longer.', cost: 500, cooldown: 25, range: 9, hp: 75, hidden: false,
        order: ['mine'], mine: { damage: 50, radius: 3.5, life: 90 } },
      { name: 'High Explosive', path: 'Bottom', desc: 'More damage, and it throws faster.', cost: 1200, cooldown: 20, range: 9, hp: 85, hidden: false,
        order: ['mine'], mine: { damage: 70, radius: 3.5, life: 90 } },
      { name: 'Anti-Tank Mine', path: 'Bottom', desc: 'More damage and much longer-lasting mines, but smaller blasts and a bit slower throwing.', cost: 3200, cooldown: 23, range: 9, hp: 100, hidden: false,
        order: ['mine'], mine: { damage: 125, radius: 2.5, life: 150 } },
      { name: 'Thermite', path: 'Bottom', desc: 'A big damage boost, ignores explosive resistance, and mines set zombies on fire and leave burning thermite on the path.', cost: 5200, cooldown: 23, range: 9, hp: 115, hidden: false, ignoreExplosiveResist: true,
        order: ['mine'], mine: { damage: 225, radius: 2.5, life: 150, burn: 15, burnTime: 3, thermite: { radius: 3, time: 6, burn: 15, burnTime: 2 } } },
      { name: 'X-Mine', path: 'Bottom', desc: 'A huge damage boost, mines last much longer, and the thermite burns hotter and longer.', cost: 15500, cooldown: 23, range: 9, hp: 130, hidden: false, ignoreExplosiveResist: true,
        order: ['mine'], mine: { damage: 375, radius: 2.5, life: 240, burn: 40, burnTime: 3, thermite: { radius: 3.5, time: 8, burn: 40, burnTime: 2 } } },
    ],
  },
};
