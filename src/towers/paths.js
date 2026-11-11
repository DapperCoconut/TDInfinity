// Towers: ammo, upgrade paths and FPS. Pursuit, Gatling, Turret, Sentry, AA Turret, Patrol Boat.
// One group of the TOWERS table. config.js joins the groups in order (see TOWERS there).
// Shared units and abilities (MERC, AP_AB, ...) come from shared.js.
import { FPS_AB, HELI_CHASE, HELI_MOVE, OC_1_AB, OC_2_AB, OC_3_AB, PURSUIT_SHARED, REDEPLOY_AB, patrolAbility } from './shared.js';

export const TOWERS_PATHS = {

  // ---------------------------------------------------------------- ammo, paths & FPS
  // ammo / reload: shoots `ammo` times, then stops for `reload` seconds to reload (firerate
  //         boosts don't speed up the reload). Upgrading refills the ammo.
  // Pursuit: a helicopter that flies around inside its patrol zone (`patrol` radius around a
  //         spot, the tower at first) and hovers near the best zombie to shoot it. `range` is
  //         how far its gun reaches from the HELICOPTER. The Patrol ability moves the zone.
  //         missile: { damage, count, every (s), radius, range } splash missiles from the
  //         helicopter, each at a different zombie (doubling up if there are few).
  // Upgrade paths: `branch` names a second tower def that shares the levels before `branchAt`.
  //         At that upgrade the player picks a path; the bottom path turns the tower into the
  //         `branch` type (which says `branchOf`). Both count toward the same placement limit.
  pursuit: {
    name: 'Pursuit',
    altOf: 'helicopter',
    form: 'Pursuit',
    shards: 3,
    lead: 3,
    price: 0,
    cost: 5000,
    limit: 6,
    stunImmune: true,
    heli: { speed: 13, height: 13 },
    branch: 'pursuitBottom',
    branchAt: 4,
    path: 'Top',
    blurb: "A helicopter that patrols an area of the map and hovers to shoot any zombie that comes near. Its gun runs out of ammo and has to reload, and from Lv 4 it also fires splash missiles that can hit lead zombies. At Lv 5 pick a path: the Top path for a huge gun, the Bottom path for hidden detection and lots of big missiles. Can't be stunned. Expensive, and it only sees hidden zombies on the Bottom path.",
    tip: 'Use Patrol to move its zone and chase zombies that are getting away. The Top path loves firerate boosts like the Commander; the Bottom path loves damage boosts like the DJ Booth.',
    levels: PURSUIT_SHARED.concat([
      { name: 'Sky Shredder', path: 'Top', desc: 'Top path: more gun damage, range and ammo, slightly faster shooting, and 4 missiles at a time.', cost: 15000, damage: 18, cooldown: 0.15, range: 11, ammo: 200, reload: 3, patrol: 15, hidden: false,
        missile: { damage: 30, count: 4, every: 5, radius: 3.5, range: 15 }, abilities: [patrolAbility(15)] },
      { name: 'Leviathan', path: 'Top', desc: 'A huge gun damage boost and a bigger patrol area.', cost: 47500, damage: 46, cooldown: 0.15, range: 11, ammo: 200, reload: 3, patrol: 19, hidden: false,
        missile: { damage: 30, count: 4, every: 5, radius: 3.5, range: 15 }, abilities: [patrolAbility(19)] },
    ]),
  },
  // The Pursuit's Bottom path (not in the shop: a Pursuit becomes this when you pick it).
  pursuitBottom: {
    name: 'Pursuit',
    branchOf: 'pursuit',
    branchAt: 4,
    path: 'Bottom',
    lead: 3,
    price: 0,
    cost: 5000,
    limit: 6,
    stunImmune: true,
    heli: { speed: 13, height: 13 },
    blurb: "The Pursuit's Bottom path: hidden detection, more range, and lots of missiles with much bigger explosions.",
    tip: 'Damage boosts like the DJ Booth make every missile hit harder.',
    levels: PURSUIT_SHARED.concat([
      { name: 'Modified Payload', path: 'Bottom', desc: 'Bottom path: hidden detection, more range, and 6 missiles at a time with much bigger explosions.', cost: 9500, damage: 10, cooldown: 0.175, range: 10, ammo: 75, reload: 3, patrol: 15, hidden: true,
        missile: { damage: 35, count: 6, every: 5.5, radius: 5, range: 14 }, abilities: [patrolAbility(15)] },
      { name: 'Demolition Gunship', path: 'Bottom', desc: 'Stronger, bigger and more missiles (8 at a time), fired even faster.', cost: 13500, damage: 10, cooldown: 0.175, range: 12, ammo: 75, reload: 3, patrol: 15, hidden: true,
        missile: { damage: 60, count: 8, every: 5.2, radius: 6.5, range: 16 }, abilities: [patrolAbility(15)] },
    ]),
  },
  // Helicopter (alternate Pursuit form, two paths right away). Flies like the Pursuit (see there),
  // but its zone is small and Move sends it anywhere on the map, so its reach is the whole map.
  // heliSpeed (on a level): how fast it flies. missiles: a list of missile weapons, each on its own
  // timer ({ name, damage, count, every, radius, range }; `air` = only at flying zombies).
  // radius: its bullets explode. pass: bullets pierce that many more zombies.
  // Pursuit (ability `chase`, timed): for `duration` s it flies after the zombie closest to the
  //   base, anywhere on the map. reveal: hidden zombies in its gun range are revealed to every tower.
  // noBuff: support towers can't boost it.
  pursuitHeli: {
    name: 'Attack Helicopter',
    altOf: 'helicopter',
    form: 'Attack Heli',
    shards: 2,
    price: 0,
    cost: 20000,
    limit: 3,
    noBuff: true,
    heli: { speed: 12, height: 13 },
    branch: 'pursuitHeliBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Pursuit with two upgrade paths right away. A flying gunship with machine guns that you can send anywhere on the map with Move, so its range is basically the whole map. Top path: Huey with hidden detection, missiles and Pursuit to chase zombies, then the Apache and War Apache with explosive bullets, rocket pods and anti-air missiles. Bottom path: stun immunity, the AH-1Z Viper, then the Stealth Comanche that enemies can't target and that reveals hidden zombies. Support towers can't boost it.",
    tip: "Great for catching zombies that get past your defenses, and the Top path shreds flying zombies. It needs no ground spot, but it can't be boosted and struggles to catch fast zombies.",
    levels: [
      { name: 'Helicopter', desc: 'A gunship with a fast machine gun. Move it anywhere on the map.', damage: 15, cooldown: 0.1, range: 13, patrol: 5, hp: 1800, hidden: false,
        abilities: [HELI_MOVE] },
      { name: 'Minigun Upgrade', path: 'Top', desc: 'Top path: more damage and faster shooting.', cost: 25000, damage: 25, cooldown: 0.08, range: 13, patrol: 5, hp: 2050, hidden: false,
        abilities: [HELI_MOVE] },
      { name: 'Barrel Spinning', path: 'Top', desc: 'Even more damage and faster shooting.', cost: 31000, damage: 35, cooldown: 0.06, range: 13, patrol: 5, hp: 2350, hidden: false,
        abilities: [HELI_MOVE] },
      { name: 'Huey', path: 'Top', desc: 'Hidden detection, almost twice the range, Hellfire Missiles, and Pursuit: chase the zombie closest to the base.', cost: 60000, damage: 47, cooldown: 0.06, range: 25, patrol: 5, hp: 3550, hidden: true, lead: true,
        missiles: [{ name: 'Hellfire', damage: 300, count: 1, every: 2, radius: 3, range: 25 }], abilities: [HELI_MOVE, HELI_CHASE] },
      { name: 'Apache', path: 'Top', desc: 'Explosive bullets, Rocket Pods, much stronger Hellfire Missiles, flies faster and lots more health. Shoots a bit slower.', cost: 120000, damage: 89, cooldown: 0.09, range: 25, radius: 1.5, patrol: 5, heliSpeed: 15, hp: 8550, hidden: true, lead: true,
        missiles: [{ name: 'Hellfire', damage: 566, count: 1, every: 2, radius: 3, range: 25 }, { name: 'Rocket Pods', damage: 75, count: 4, every: 2, radius: 2.5, range: 25 }],
        abilities: [HELI_MOVE, HELI_CHASE] },
      { name: 'War Apache', path: 'Top', desc: 'Adds Anti-Air Missiles that shred flying zombies, and hugely stronger Hellfire Missiles and Rocket Pods. More damage and bigger bullet blasts.', cost: 320000, damage: 189, cooldown: 0.09, range: 25, radius: 2.5, patrol: 5, heliSpeed: 15, hp: 18450, hidden: true, lead: true,
        missiles: [{ name: 'Hellfire', damage: 4444, count: 1, every: 2, radius: 3, range: 25 }, { name: 'Rocket Pods', damage: 833, count: 4, every: 2, radius: 2.5, range: 25 },
          { name: 'Anti-Air', damage: 2000, count: 2, every: 2, radius: 3, range: 30, air: true }],
        abilities: [HELI_MOVE, HELI_CHASE] },
    ],
  },
  // The Helicopter's Bottom path (not in the shop: a Helicopter becomes this when you pick it).
  pursuitHeliBottom: {
    name: 'Attack Helicopter',
    branchOf: 'pursuitHeli',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 20000,
    limit: 3,
    noBuff: true,
    heli: { speed: 12, height: 13 },
    blurb: "The Helicopter's Bottom path: more damage, stun immunity and speed, then the AH-1Z Viper with piercing bullets, rockets and Hellfire Missiles, and the Stealth Comanche that enemies can't target and that reveals hidden zombies near it.",
    tip: 'The Stealth Comanche is very fast, so it can chase down zombies anywhere. Its stealth runs out now and then, so keep it away from boss attacks.',
    levels: [
      { name: 'Helicopter', desc: 'A gunship with a fast machine gun. Move it anywhere on the map.', damage: 15, cooldown: 0.1, range: 13, patrol: 5, hp: 1800, hidden: false,
        abilities: [HELI_MOVE] },
      { name: 'Heavy Ammo', path: 'Bottom', desc: 'Bottom path: more damage.', cost: 9500, damage: 21, cooldown: 0.1, range: 13, patrol: 5, hp: 1900, hidden: false,
        abilities: [HELI_MOVE] },
      { name: 'Advanced Training', path: 'Bottom', desc: "Can't be stunned. More damage, range and speed.", cost: 13500, damage: 32, cooldown: 0.1, range: 18, patrol: 5, heliSpeed: 15, hp: 2050, hidden: false, stunImmune: true,
        abilities: [HELI_MOVE] },
      { name: 'AH-1Z Viper', path: 'Bottom', desc: 'Hidden detection, bullets pierce 1 more zombie, Rocket Pods and Hellfire Missiles, and it flies much faster.', cost: 50000, damage: 37, cooldown: 0.1, range: 18, pass: 1, patrol: 5, heliSpeed: 21, hp: 3850, hidden: true, lead: true, stunImmune: true,
        missiles: [{ name: 'Hellfire', damage: 175, count: 1, every: 2, radius: 3, range: 20 }, { name: 'Rocket Pods', damage: 33, count: 4, every: 2, radius: 2.5, range: 20 }],
        abilities: [HELI_MOVE] },
      { name: 'Upgraded Armaments', path: 'Bottom', desc: 'More damage, and stronger Rocket Pods and Hellfire Missiles.', cost: 75000, damage: 67, cooldown: 0.1, range: 18, pass: 1, patrol: 5, heliSpeed: 21, hp: 4100, hidden: true, lead: true, stunImmune: true,
        missiles: [{ name: 'Hellfire', damage: 500, count: 1, every: 3, radius: 3, range: 20 }, { name: 'Rocket Pods', damage: 75, count: 4, every: 2, radius: 2.5, range: 20 }],
        abilities: [HELI_MOVE] },
      { name: 'Stealth Comanche', path: 'Bottom', desc: "Stealth: enemies can't target it (it's revealed now and then, and stealthy again 3s later). Reveals hidden zombies near it for every tower. Much stronger Hellfire Missiles, more damage and range, and super fast.", cost: 150000, damage: 139, cooldown: 0.1, range: 26, pass: 1, patrol: 5, heliSpeed: 46, hp: 7100, hidden: true, lead: true, stunImmune: true, stealth: true, restealth: 3, reveal: true,
        missiles: [{ name: 'Hellfire', damage: 800, count: 1, every: 1, radius: 3, range: 28 }, { name: 'Rocket Pods', damage: 75, count: 4, every: 2, radius: 2.5, range: 28 }],
        abilities: [HELI_MOVE] },
    ],
  },
  // Gatling Gun: one per player. It only shoots zombies inside a cone (half-angle `cone`, in
  // radians) in front of where it was placed (it faces away from the camera when you place it).
  // FPS Mode (ability): you take control. Aim with the mouse and hold the left button to fire
  // anywhere on the map: each shot flies in a straight line, pierces up to `fps.pierce` zombies
  // and does `fps.mult` times the damage. Ammo and reloading still apply.
  gatling: {
    name: 'Gatling Gun',
    price: 6000,
    cost: 5250,
    limit: 1,
    placement: 'any',
    stunImmune: true,
    fps: { mult: 2.5, pierce: 3 },
    blurb: "A one-per-player gun that shoots super fast at one zombie at a time, but only inside a cone in front of it. It uses ammo and has to reload. FPS Mode lets you take control and shoot anywhere on the map, and your shots pierce through 3 zombies. Huge damage against tough zombies, but very expensive, and its cone is weak if you aren't controlling it. Sees hidden zombies from Lv 4. Can't be stunned.",
    tip: 'Point it along a straight part of the path so the cone covers more (it faces where your camera looks when you place it). Use FPS Mode to focus summoners, bosses, or zombies that slipped past.',
    levels: [
      { name: 'Gatling Gun', desc: 'Shoots fast in a cone in front of it. FPS Mode lets you aim it yourself.', damage: 5, cooldown: 0.17, range: 25, cone: 0.3, ammo: 50, reload: 2.5, hidden: false, abilities: [FPS_AB] },
      { name: 'Heavier Bullets', desc: 'More damage and range.', cost: 3000, damage: 8, cooldown: 0.17, range: 30, cone: 0.3, ammo: 50, reload: 2.5, hidden: false, abilities: [FPS_AB] },
      { name: 'Bigger Magazine', desc: 'More damage, twice the ammo, faster reloads and a wider cone.', cost: 7500, damage: 12, cooldown: 0.17, range: 30, cone: 0.38, ammo: 100, reload: 2, hidden: false, abilities: [FPS_AB] },
      { name: 'Extra Barrel', desc: 'Shoots faster with more range and ammo, a wider cone, and it can now see hidden zombies.', cost: 15000, damage: 13, cooldown: 0.12, range: 35, cone: 0.46, ammo: 200, reload: 2, hidden: true, abilities: [FPS_AB] },
      { name: 'Minigun Barrel', desc: 'A big damage and range boost and even faster shooting. Finally looks like a real Gatling gun!', cost: 32500, damage: 20, cooldown: 0.09, range: 45, cone: 0.46, ammo: 200, reload: 2, hidden: true, abilities: [FPS_AB] },
      { name: 'Impenetrable Fortress', desc: 'Much more damage and ammo and a wider cone, but reloading takes much longer.', cost: 50000, damage: 36, cooldown: 0.09, range: 50, cone: 0.55, ammo: 400, reload: 6, hidden: true, abilities: [FPS_AB] },
      { name: 'Destruction-Oriented Output Machine', desc: 'A massive damage boost, more ammo and a wider cone. Its initials spell DOOM.', cost: 100000, damage: 67, cooldown: 0.09, range: 50, cone: 0.65, ammo: 600, reload: 6, hidden: true, abilities: [FPS_AB] },
    ],
  },
  // Machine Gunner (alternate Gatling Gun form, two paths). A `facing` tower like the Sentry: it
  // only shoots inside its cone (half-angle `cone`). Redeploy (aimed ability) turns the cone to
  // face a spot you click. Overcharge (Bottom 3-5) is a self boost: `dmg`, `range` and `rate`
  // (firerate) multipliers. pass: piercing bullets. laser: laser damage (see damageKind).
  gatlingMachine: {
    name: 'Machine Gunner',
    altOf: 'gatling',
    form: 'Machine Gunner',
    shards: 2,
    price: 0,
    cost: 900,
    limit: 5,
    facing: true,
    flying: false,
    branch: 'gatlingMachineBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Gatling Gun with two upgrade paths right away: a soldier on a heavy machine gun with long range and very fast fire, but only inside a 110° cone in front of him. Redeploy lets you turn him. Very cost-efficient damage. Top path: piercing bullets, flying detection at Lv 4 and a 220° AA Turret. Bottom path: a Laser MG with hidden detection and Overcharge for huge single-target damage. The Top path never sees hidden zombies.",
    tip: 'Put a Top path one at the end of a long straight on First targeting to hit many zombies in a line.',
    levels: [
      { name: 'Machine Gunner', desc: 'A heavy machine gun with long range and very fast fire, inside a 110° cone. Redeploy turns it.', damage: 2.5, cooldown: 0.2, range: 24, cone: (Math.PI * 110) / 360, hp: 400, hidden: false, abilities: [REDEPLOY_AB] },
      { name: 'Heavy Ammo', path: 'Top', desc: 'Top path: more damage and range.', cost: 1175, damage: 4.5, cooldown: 0.2, range: 27, cone: (Math.PI * 110) / 360, hp: 410, hidden: false, abilities: [REDEPLOY_AB] },
      { name: 'Piercing Rounds', path: 'Top', desc: 'Bullets pierce 1 extra zombie, and more damage.', cost: 1300, damage: 6.5, cooldown: 0.2, range: 27, pass: 1, cone: (Math.PI * 110) / 360, hp: 435, hidden: false, abilities: [REDEPLOY_AB] },
      { name: 'Browning MG', path: 'Top', desc: 'Shoots faster, more damage and lots more health, and its cone widens by 20°.', cost: 6250, damage: 9, cooldown: 0.15, range: 27, pass: 1, cone: (Math.PI * 130) / 360, hp: 610, hidden: false, abilities: [REDEPLOY_AB] },
      { name: 'Double Barrel', path: 'Top', desc: 'Hits flying zombies, a big damage boost, lots more health and a 10° wider cone.', cost: 12000, damage: 17.5, cooldown: 0.15, range: 27, pass: 1, cone: (Math.PI * 140) / 360, hp: 1460, flying: true, hidden: false, abilities: [REDEPLOY_AB] },
      { name: 'AA Turret', path: 'Top', desc: 'A huge damage boost, pierces 2 more zombies, an 80° wider cone (220°) and it can\'t be stunned.', cost: 48250, damage: 47.5, cooldown: 0.15, range: 27, pass: 3, cone: (Math.PI * 220) / 360, hp: 3260, flying: true, stunImmune: true, hidden: false, abilities: [REDEPLOY_AB] },
    ],
  },
  // The Machine Gunner's Bottom path (not in the shop: a Machine Gunner becomes this when you pick it).
  gatlingMachineBottom: {
    name: 'Machine Gunner',
    branchOf: 'gatlingMachine',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 900,
    limit: 5,
    facing: true,
    flying: false,
    blurb: "The Machine Gunner's Bottom path: faster firing and more range, then a Laser MG with hidden detection, a narrower cone and Overcharge, which boosts its damage, range and firerate for a while. It never hits flying zombies.",
    tip: 'Save Overcharge for bosses. Its cone is narrower, so point it straight down the path.',
    levels: [
      { name: 'Machine Gunner', desc: 'A heavy machine gun with long range and very fast fire, inside a 110° cone. Redeploy turns it.', damage: 2.5, cooldown: 0.2, range: 24, cone: (Math.PI * 110) / 360, hp: 400, hidden: false, abilities: [REDEPLOY_AB] },
      { name: 'Faster Firing', path: 'Bottom', desc: 'Bottom path: shoots faster.', cost: 700, damage: 2.5, cooldown: 0.15, range: 24, cone: (Math.PI * 110) / 360, hp: 410, hidden: false, abilities: [REDEPLOY_AB] },
      { name: 'Extended Barrels', path: 'Bottom', desc: 'More range and a bit more damage.', cost: 800, damage: 3.5, cooldown: 0.15, range: 29, cone: (Math.PI * 110) / 360, hp: 435, hidden: false, abilities: [REDEPLOY_AB] },
      { name: 'Laser MG', path: 'Bottom', desc: 'Switches to a laser: sees hidden zombies, a big damage and range boost and lots more health, but shoots a bit slower and the cone narrows by 20°. Unlocks Overcharge.', cost: 10000, damage: 16.5, cooldown: 0.25, range: 41, cone: (Math.PI * 90) / 360, hp: 885, laser: true, hidden: true, abilities: [REDEPLOY_AB, OC_1_AB] },
      { name: 'Laser Cells', path: 'Bottom', desc: 'A big damage boost, more range and health, and a stronger Overcharge.', cost: 16000, damage: 42.5, cooldown: 0.25, range: 47, cone: (Math.PI * 90) / 360, hp: 1560, laser: true, hidden: true, abilities: [REDEPLOY_AB, OC_2_AB] },
      { name: 'Over Charge', path: 'Bottom', desc: 'A huge damage boost, more range and health, a 10° wider cone and an even stronger Overcharge.', cost: 72000, damage: 102.5, cooldown: 0.25, range: 52, cone: (Math.PI * 100) / 360, hp: 3010, laser: true, hidden: true, abilities: [REDEPLOY_AB, OC_3_AB] },
    ],
  },
  // Turret: a big, pricey gun that fires fast, hard-hitting shots at one zombie at a time.
  turret: {
    name: 'Turret',
    lead: 1,
    price: 5000,
    cost: 7750,
    limit: 3,
    blurb: 'A big, expensive gun that fires fast, hard-hitting shots at one zombie at a time from long range. One of the strongest single-target towers, and it sees hidden zombies from the start. Very expensive, and you can only place 3.',
    tip: "Don't place it early; use cheaper towers first. A DJ Booth makes its pricey upgrades cheaper and gives it more range.",
    levels: [
      { name: 'Turret', desc: 'Long range, high damage and hidden detection from the start.', damage: 20, cooldown: 0.4, range: 19, hidden: true },
      { name: 'Stronger Ammunition', desc: 'More damage and lead detection.', cost: 3750, damage: 28, cooldown: 0.4, range: 19, hidden: true },
      { name: 'Radar', desc: 'More range and shoots faster.', cost: 7500, damage: 28, cooldown: 0.26, range: 22, hidden: true },
      { name: 'Dual Turret', desc: 'Two guns: more damage and shoots a lot faster.', cost: 20000, damage: 35, cooldown: 0.16, range: 22, hidden: true },
      { name: 'Even Heavier Ammo', desc: 'More range and a big damage boost.', cost: 35000, damage: 57, cooldown: 0.16, range: 24, hidden: true },
      { name: 'XR-200 Turret', desc: 'More range, damage and firerate. Turns into the XR-200 Turret.', cost: 65000, damage: 68, cooldown: 0.12, range: 27, hidden: true },
    ],
  },
  // XWM Turret (alternate Turret form, two paths): a pilot-driven turret. rebuilds: when knocked
  // out it rebuilds itself (back to full health after `rebuildTime` s, not shooting meanwhile) up
  // to that many times. packHealOnly: Medics can't repair it (Health Packs still can).
  // minRange (on a level): deadzone from that level on. ignoreBulletResist: gets through bullet
  // resistance. Not used by the game yet (kept for later): maxTax (each extra max-level XWM of a
  // player costs this much more).
  turretXwm: {
    name: 'XWM Turret',
    altOf: 'turret',
    form: 'XWM',
    shards: 2,
    price: 0,
    cost: 4850,
    limit: 3,
    noBuff: true,
    packHealOnly: true,
    rebuilds: 4,
    rebuildTime: 10,
    maxTax: 0.25,
    branch: 'turretXwmBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Turret with two upgrade paths right away: a big pilot-driven turret with huge stats that hits flying zombies. When it's knocked out it rebuilds itself up to 4 times (it can't shoot while repairing). Top path: miniguns that shred one zombie at a time, with hidden detection from Lv 4. Bottom path: rockets that splash, then missile pods with enormous range but a blind spot up close. Very expensive, and support towers can't boost it.",
    tip: 'Maxed, it soaks up boss attacks while it rebuilds. Put a Bottom path XWM far back so its blind spot does not cover the path.',
    levels: [
      { name: 'XWM Turret', desc: 'A big pilot-driven turret. Rebuilds itself up to 4 times.', damage: 10, cooldown: 0.3, range: 18, hp: 850, hidden: false },
      { name: 'Bigger Caliber', path: 'Top', desc: 'Top path: more damage and health.', cost: 1850, damage: 16, cooldown: 0.3, range: 18, hp: 1000, hidden: false },
      { name: 'Longer Barrels', path: 'Top', desc: 'More damage and range, and it ignores bullet resistance (hits lead zombies) until Lv 4.', cost: 2750, damage: 22, cooldown: 0.3, range: 21, hp: 1000, lead: true, ignoreBulletResist: true, hidden: false },
      { name: 'Dual Miniguns', path: 'Top', desc: 'Shoots 3x as fast, sees hidden zombies and more range, but no longer hits lead zombies.', cost: 33000, damage: 22, cooldown: 0.1, range: 25, hp: 1000, hidden: true },
      { name: 'Quad Miniguns', path: 'Top', desc: 'More damage, range and health.', cost: 62000, damage: 40, cooldown: 0.1, range: 31, hp: 1500, hidden: true },
      { name: 'Super Quad Miniguns', path: 'Top', desc: "A huge damage and range boost, and it can't be stunned.", cost: 132000, damage: 98, cooldown: 0.1, range: 49, hp: 2000, stunImmune: true, hidden: true },
    ],
  },
  // The XWM Turret's Bottom path (not in the shop: an XWM becomes this when you pick it).
  turretXwmBottom: {
    name: 'XWM Turret',
    branchOf: 'turretXwm',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 4850,
    limit: 3,
    noBuff: true,
    packHealOnly: true,
    rebuilds: 4,
    rebuildTime: 10,
    maxTax: 0.25,
    lob: 0.6,
    homing: true,
    blurb: "The XWM Turret's Bottom path: heavier guns, then rocket launchers that fire bursts of exploding rockets, and missile pods with huge range that can't hit zombies close to it.",
    tip: 'Put it far back from the path: from Lv 5 it has a blind spot around itself.',
    levels: [
      { name: 'XWM Turret', desc: 'A big pilot-driven turret. Rebuilds itself up to 4 times.', damage: 10, cooldown: 0.3, range: 18, hp: 850, hidden: false },
      { name: 'Heavy Ammo', path: 'Bottom', desc: 'Bottom path: a bit more damage, range and health.', cost: 1550, damage: 12, cooldown: 0.3, range: 20, hp: 950, hidden: false },
      { name: 'Bigger Barrel', path: 'Bottom', desc: 'More damage, range and health.', cost: 2000, damage: 16, cooldown: 0.3, range: 22, hp: 1050, hidden: false },
      { name: 'Rocket Launchers', path: 'Bottom', desc: 'Switches to bursts of 3 exploding rockets with splash and more range. Rockets hit lead zombies.', cost: 8000, damage: 66, radius: 3, burst: 3, burstGap: 0.2, cooldown: 2.5, range: 30, hp: 1050, lead: true, hidden: false },
      { name: 'Missile Pods', path: 'Bottom', desc: "Sees hidden zombies, 8 missiles per burst and much more damage and range, but it can't hit zombies within 8 of it.", cost: 62000, damage: 166, radius: 3, burst: 8, burstGap: 0.12, cooldown: 2.5, range: 42, minRange: 8, hp: 1500, lead: true, hidden: true },
      { name: 'Super Missile Pods', path: 'Bottom', desc: "Enormous range, bigger blasts, much faster reloads and it can't be stunned, but its blind spot grows to 14.", cost: 182500, damage: 266, radius: 5, burst: 8, burstGap: 0.08, cooldown: 0.75, range: 85, minRange: 14, hp: 2000, stunImmune: true, lead: true, hidden: true },
    ],
  },
  // Sentry: a cheap turret with two upgrade paths right away. Like the Gatling Gun it only shoots
  // zombies inside its cone (`facing`; half-angle `cone`, in radians), which points away from the
  // camera when you place it. noBuff + noHeal: support towers, Medics and Health Packs can't touch
  // it, but it rebuilds itself (`rebuilds`, see the XWM Turret). rockets (on a level): every
  // `every` s it also fires a homing rocket at its target that explodes for `damage` in `radius`.
  // ignoreBulletResist (Sabot Rounds, X-Sentry): gets through bullet resistance (Expert mode).
  sentry: {
    name: 'Sentry',
    price: 7250,
    cost: 190,
    limit: 10,
    facing: true,
    noBuff: true,
    noHeal: true,
    rebuilds: 8,
    rebuildTime: 8,
    branch: 'sentryBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "A cheap automatic turret that shoots zombies inside a 120° cone in front of it. Support towers, Medics and Health Packs can't help it, but when it's knocked out it rebuilds itself up to 8 times. Top path: hidden detection and Sabot Rounds that hit lead zombies. Bottom path: a minigun with a much wider aim and rockets, but never hidden detection. Great cheap early damage and great bait.",
    tip: 'Its low cost lets you spend more on Farms early. Point it along a straight part of the path (it faces where your camera looks when you place it).',
    levels: [
      { name: 'Sentry', desc: 'A cheap turret that shoots in a 120° cone. Rebuilds itself up to 8 times.', damage: 2, cooldown: 1, range: 14, cone: Math.PI / 3, hp: 50, hidden: false },
      { name: 'Autoloader', path: 'Top', desc: 'Top path: reloads faster and more damage.', cost: 225, damage: 3, cooldown: 0.8, range: 14, cone: Math.PI / 3, hp: 60, hidden: false },
      { name: 'Longer Barrel', path: 'Top', desc: 'More range and damage.', cost: 450, damage: 4, cooldown: 0.8, range: 19, cone: Math.PI / 3, hp: 75, hidden: false },
      { name: 'Bigger Gun', path: 'Top', desc: 'Sees hidden zombies, with a big damage boost, faster reloads and more range.', cost: 1200, damage: 11, cooldown: 0.7, range: 22, cone: Math.PI / 3, hp: 95, hidden: true },
      { name: 'Sabot Rounds', path: 'Top', desc: 'Ignores bullet resistance (hits lead zombies), a big damage boost and a bit more range.', cost: 3375, damage: 31, cooldown: 0.7, range: 23, cone: Math.PI / 3, hp: 245, lead: true, ignoreBulletResist: true, hidden: true },
      { name: 'X-Sentry', path: 'Top', desc: 'Fires much faster, with more damage and lots more health.', cost: 19000, damage: 43, cooldown: 0.2, range: 23, cone: Math.PI / 3, hp: 845, lead: true, ignoreBulletResist: true, hidden: true },
    ],
  },
  // The Sentry's Bottom path (not in the shop: a Sentry becomes this when you pick it).
  sentryBottom: {
    name: 'Sentry',
    branchOf: 'sentry',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 190,
    limit: 10,
    facing: true,
    noBuff: true,
    noHeal: true,
    rebuilds: 8,
    rebuildTime: 8,
    blurb: "The Sentry's Bottom path: more range and damage, then a minigun with a 270° aim and rockets. It never gets hidden detection.",
    tip: 'From Lv 4 its aim is so wide it barely matters which way it faces.',
    levels: [
      { name: 'Sentry', desc: 'A cheap turret that shoots in a 120° cone. Rebuilds itself up to 8 times.', damage: 2, cooldown: 1, range: 14, cone: Math.PI / 3, hp: 50, hidden: false },
      { name: 'Better Optics', path: 'Bottom', desc: 'Bottom path: more range.', cost: 150, damage: 2, cooldown: 1, range: 19, cone: Math.PI / 3, hp: 60, hidden: false },
      { name: 'Heavy Ammo', path: 'Bottom', desc: 'More damage and a bit more range.', cost: 250, damage: 6, cooldown: 1, range: 20, cone: Math.PI / 3, hp: 70, hidden: false },
      { name: 'Minigun', path: 'Bottom', desc: 'A fast minigun with a 150° wider aim, plus rockets (24 DPS). Never gets hidden detection.', cost: 5000, damage: 6, cooldown: 0.4, range: 20, cone: (Math.PI * 3) / 4, hp: 370, rockets: { damage: 60, every: 2.5, radius: 2.5 }, hidden: false },
      { name: 'Full Minigun', path: 'Bottom', desc: 'Rockets double to 48 DPS, and more damage.', cost: 8000, damage: 16, cooldown: 0.4, range: 20, cone: (Math.PI * 3) / 4, hp: 770, rockets: { damage: 85, every: 1.76, radius: 2.5 }, hidden: false },
      { name: 'XW-M Turret', path: 'Bottom', desc: "Rockets rise to 154 DPS and it can't be stunned. More damage, faster firing, more range and a 20° wider aim.", cost: 36500, damage: 30, cooldown: 0.29, range: 22, cone: (Math.PI * 29) / 36, hp: 1320, rockets: { damage: 170, every: 1.1, radius: 3 }, stunImmune: true, hidden: false },
    ],
  },
  // AA Turret: only shoots flying zombies (`ground: false`), with homing explosive missiles, and
  // rebuilds itself up to 3 times. Top path: bigger bursts and huge range with a growing blind spot
  // (minRange). Bottom path: hidden detection, then C-RAM nonstop bullets (no splash).
  aaTurret: {
    name: 'AA Turret',
    price: 11000,
    cost: 450,
    limit: 5,
    ground: false,
    lead: true,
    lob: 0.5,
    homing: true,
    rebuilds: 3,
    rebuildTime: 10,
    branch: 'aaTurretBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An anti-air turret that only shoots flying zombies, with explosive missiles, and rebuilds itself up to 3 times. Top path: bursts of missiles that hit groups of flyers from huge range, but with a blind spot up close. Bottom path: fast single-target bullets with hidden detection. It can't hit ground zombies at all.",
    tip: 'Only bring it to modes with lots of flying zombies, and place the Top path far from the path.',
    levels: [
      { name: 'AA Turret', desc: 'Fires explosive missiles at flying zombies only. Rebuilds itself up to 3 times.', damage: 80, cooldown: 6, burst: 1, burstGap: 0.2, radius: 1, range: 28, hp: 85, hidden: false },
      { name: 'Double Shot', path: 'Top', desc: 'Top path: fires 2 missiles per burst.', cost: 300, damage: 80, cooldown: 6, burst: 2, burstGap: 0.2, radius: 1, range: 30, hp: 95, hidden: false },
      { name: 'Tri Shot', path: 'Top', desc: '3 missiles per burst and more range.', cost: 400, damage: 80, cooldown: 6, burst: 3, burstGap: 0.2, radius: 1, range: 36, hp: 105, hidden: false },
      { name: 'Quad Barrels', path: 'Top', desc: "More damage, 4 missiles per burst and more range, but a bit slower between missiles and it can't hit zombies within 7.", cost: 2400, damage: 105, cooldown: 6, burst: 4, burstGap: 0.3, radius: 1, range: 41, minRange: 7, hp: 355, hidden: false },
      { name: 'AA-X Turret', path: 'Top', desc: 'A big damage boost, 6 missiles per burst, bigger blasts and huge range. Blind spot grows to 10.', cost: 7500, damage: 205, cooldown: 6, burst: 6, burstGap: 0.3, radius: 2, range: 71, minRange: 10, hp: 605, hidden: false },
      { name: 'Patriot Turret', path: 'Top', desc: 'Massive damage, 8 missiles per burst, faster reloads, bigger blasts and enormous range. Blind spot grows to 30.', cost: 145000, damage: 955, cooldown: 4, burst: 8, burstGap: 0.3, radius: 4, range: 162, minRange: 30, hp: 1455, hidden: false },
    ],
  },
  // The AA Turret's Bottom path (not in the shop: an AA Turret becomes this when you pick it).
  aaTurretBottom: {
    name: 'AA Turret',
    branchOf: 'aaTurret',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 450,
    limit: 5,
    ground: false,
    lead: true,
    lob: 0.5,
    homing: true,
    rebuilds: 3,
    rebuildTime: 10,
    blurb: "The AA Turret's Bottom path: more range and hidden detection, then C-RAM: nonstop bullets for fast single-target damage against flyers (no more splash).",
    tip: 'C-RAM is great against tough flying bosses.',
    levels: [
      { name: 'AA Turret', desc: 'Fires explosive missiles at flying zombies only. Rebuilds itself up to 3 times.', damage: 80, cooldown: 6, burst: 1, burstGap: 0.2, radius: 1, range: 28, hp: 85, hidden: false },
      { name: 'Extended Range', path: 'Bottom', desc: 'Bottom path: a big range boost.', cost: 400, damage: 80, cooldown: 6, burst: 1, radius: 1, range: 37, hp: 95, hidden: false },
      { name: 'Upgraded Radar', path: 'Bottom', desc: 'Sees hidden zombies and more range.', cost: 1000, damage: 80, cooldown: 6, burst: 1, radius: 1, range: 47, hp: 105, hidden: true },
      { name: 'C-RAM', path: 'Bottom', desc: 'Switches to nonstop bullet fire for fast single-target damage. Less damage per shot, no splash and less range.', cost: 15000, damage: 20, cooldown: 0.1, range: 33, hp: 925, hidden: true },
      { name: 'Dual Barrels', path: 'Bottom', desc: 'More damage and range, and lots more health.', cost: 20000, damage: 70, cooldown: 0.1, range: 36, hp: 1925, hidden: true },
      { name: 'CX-RAM', path: 'Bottom', desc: 'A huge damage boost, faster firing and more range.', cost: 125000, damage: 158, cooldown: 0.08, range: 44, hp: 4925, hidden: true },
    ],
  },
  // Patrol Boat: a water tower (placement: 'water'), so it only goes in the map's pools. Both paths
  // hit lead zombies from Lv 3 (explosive shots / fire). It never gets hidden detection.
  // rockets on Hellfire Missiles: a homing missile at its target every `every` s, on top of its gun.
  // ignoreFireResist: its flames burn fire-immune zombies too. burnVuln: zombies it sets on fire
  //   take `amount` extra damage from everything for `time` s.
  // packHealOnly: Medics can't repair it (Health Packs still can). Support towers can buff it.
  // ignoreExplosiveResist (Hellfire Missiles): gets through explosive resistance.
  patrolBoat: {
    name: 'Patrol Boat',
    price: 3500,
    cost: 775,
    limit: 5,
    placement: 'water',
    flying: false,
    lead: 3,
    packHealOnly: true,
    branch: 'patrolBoatBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "A boat that can only go in water. Starts with a machine gun. Top path: an explosive long-range gunboat that hits flying zombies, then Hellfire Missiles. Bottom path: a flamethrower boat with burns that last a long time. Both paths hit lead zombies from Lv 3. Support towers can buff it, but Medics can't heal it. It never gets hidden detection.",
    tip: "Park it close to the shore so support towers reach it, and bring a Sniper's Flare Gun or a Laser Gunner's Stealth Sensor to reveal hidden zombies for it.",
    levels: [
      { name: 'Patrol Boat', desc: 'A small boat with a machine gun. Water only.', damage: 2, cooldown: 0.4, range: 14, hp: 300, hidden: false },
      { name: 'Heavy Ammo', path: 'Top', desc: 'Top path: more damage and range.', cost: 450, damage: 4, cooldown: 0.4, range: 17, hp: 350, hidden: false },
      { name: 'RHIB+', path: 'Top', desc: 'A faster hull with more damage and range.', cost: 600, damage: 7, cooldown: 0.4, range: 23, hp: 550, hidden: false },
      { name: 'Attack Boat', path: 'Top', desc: 'Switches to explosive shots that splash and hit lead zombies, much more range, and it can now hit flying zombies.', cost: 2150, damage: 8, radius: 1.5, cooldown: 0.4, range: 31, hp: 800, flying: true, hidden: false },
      { name: 'Dual Guns', path: 'Top', desc: 'Two guns: shoots much faster, a bit more range.', cost: 6000, damage: 8, radius: 1.5, cooldown: 0.25, range: 34, hp: 1200, flying: true, hidden: false },
      { name: 'Hellfire Missiles', path: 'Top', desc: 'Huge range and more damage, and every 2.5s it fires a missile at its target that does 400 damage in a blast.', cost: 32000, damage: 20, radius: 1.5, cooldown: 0.25, range: 52, hp: 2700, flying: true,
        rockets: { damage: 400, every: 2.5, radius: 2 }, ignoreExplosiveResist: true, hidden: false },
    ],
  },
  // The Patrol Boat's Bottom path (not in the shop: a Patrol Boat becomes this when you pick it).
  patrolBoatBottom: {
    name: 'Patrol Boat',
    branchOf: 'patrolBoat',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 775,
    limit: 5,
    placement: 'water',
    flying: false,
    lead: 3,
    packHealOnly: true,
    burnSlow: 0,
    blurb: "The Patrol Boat's Bottom path: a smarter, faster machine gun, then a Flamethrower that sets up to 6 zombies at a time on fire and hits lead zombies. The Monitor can't be stunned, and Flame Tanks burn even fire-immune zombies and make them take extra damage. Short range once it has flames, and it can't hit flying or hidden zombies.",
    tip: 'Put it in the part of the pool closest to the track: the flames only reach 8.',
    levels: [
      { name: 'Patrol Boat', desc: 'A small boat with a machine gun. Water only.', damage: 2, cooldown: 0.4, range: 14, hp: 300, hidden: false },
      { name: 'Smart Gun', path: 'Bottom', desc: 'Bottom path: more damage and range.', cost: 600, damage: 5, cooldown: 0.4, range: 18, hp: 370, hidden: false },
      { name: 'Cooling Barrels', path: 'Bottom', desc: 'Shoots faster.', cost: 700, damage: 5, cooldown: 0.3, range: 18, hp: 470, hidden: false },
      { name: 'Flamethrower', path: 'Bottom', desc: 'Swaps the gun for a flamethrower: hits up to 6 zombies at once (lead ones too) and burns them for 3 per second for 5s. Much shorter range, lots more health.', cost: 2500,
        damage: 2, hits: 6, burn: 3, burnTime: 5, cone: 0.5, cooldown: 0.25, range: 8, hp: 2470, hidden: false },
      { name: 'Monitor', path: 'Bottom', desc: 'A big armored boat: more damage, burns of 12 per second that last 12s, and it can\'t be stunned.', cost: 4900,
        damage: 12, hits: 6, burn: 12, burnTime: 12, cone: 0.5, cooldown: 0.25, range: 8, hp: 4670, stunImmune: true, hidden: false },
      { name: 'Flame Tanks', path: 'Bottom', desc: 'Burns of 35 per second for 18s that even burn fire-immune zombies, and burning zombies take 5% more damage from everything. More damage and faster spraying.', cost: 40000,
        damage: 40, hits: 6, burn: 35, burnTime: 18, cone: 0.5, cooldown: 0.15, range: 8, hp: 9670, stunImmune: true, ignoreFireResist: true, burnVuln: { amount: 0.05, time: 18 }, hidden: false },
    ],
  },
};
