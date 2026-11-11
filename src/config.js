// All gameplay tuning lives here so balance changes don't require touching game logic.

import { CROSS_TOWERS } from './crosstowers.js';
import { HERO_TOWERS } from './herotowers.js';
import { TENTH_TOWERS } from './tenthtowers.js';
import { GOLD_TOWERS } from './goldtowers.js';
import { HARDCORE_WAVES, addHardcoreEnemies } from './hardcore.js';
import { HALLOWEEN_TIMERS, HALLOWEEN_WAVES, addHalloweenEnemies } from './halloween.js';

/** Game speed multipliers the host can pick from. */
export const SPEEDS = [1, 2, 3, 5, 10];

export const GAME = {
  startCash: 500,
  baseHp: 150,
  firstIntermission: 20, // seconds to place towers before wave 1
  intermission: 8, // seconds between waves
  earnMult: 2, // multiplies cash from kills (enemy `reward`, Versus only) and end-of-wave bonuses
  // Cash for damage, like Tower Battles and TDS: every point of health damage your side deals pays
  // each player this much (DIFFICULTIES[mode].dmgCash sets a mode's own rate), so a wave pays for
  // the defense it takes. Tune it with tools/balance/table.mjs. Versus pays for kills instead.
  dmgCash: 0.5,
  waveBonus: (wave) => GAME.earnMult * (100 + 40 * wave + 3 * wave * wave), // wave is 1-based; ramps up quadratically
  hpScalePerWave: 0.06, // enemy HP multiplier grows by this much each wave
  sellRatio: 0.5,
  corruptSell: 0.2, // Void mode: towers VOID corrupted sell for this much more
  // Tower health: a level's `hp`, or `towerHp` + `towerHpPerLevel` per level. Close-range towers
  // are tougher: up to `towerHpShort` more at range `towerHpShortRange[0]` or less, fading to
  // nothing at `towerHpShortRange[1]`. A tower at 0 health is knocked out (stops working) until a
  // Medic or Health Pack heals it.
  towerHp: 100,
  towerHpPerLevel: 30,
  towerHpShort: 0.5,
  towerHpShortRange: [10.6, 40], // was [8, 30] before the 33% range pass (see RANGE_BOOST)
  // Stealth (a level's `stealth`, or a Ghost Grenade): enemies can't target the tower (the Molten
  // Warlord won't throw axes at it or slam for it), and splash from their attacks can't hurt or
  // stun it. A level's stealth slowly drains: it lasts `stealthTime` s (the level's, or this),
  // then the tower is revealed for `restealth` s (the level's, or this) before it refills.
  // Ghost Grenade stealth doesn't drain; it just lasts its duration.
  stealthTime: 20,
  restealth: 5,
  loadoutSize: 6, // towers a player can bring into a game
  // Credits earned at the end of a game (spent in the Loadout & Shop on new towers).
  credits: (wavesCleared, win) => wavesCleared * 40 + (win ? 600 : 0),
  mpHpScale: 0.5, // in multiplayer, enemy HP is multiplied by 1 + this * (players - 1)
  // Hard mode wave modifiers (guessed): Bloated = this much more health, Nimble = this much faster,
  // Health Regen = heals this share of max health per second (2% every 2 s).
  bloated: 1.5,
  nimble: 1.3,
  healthRegen: 0.01,
  unitContact: 0.4, // zombies touching a Soldier squad hurt it by (their base damage * this) per second
  starBattery: 0.1, // Star Cannon: a battery adds this share of a full charge
  danceBossScale: 0.5, // bosses dance only this fraction of Apocalypse Rave's duration
  // Dimension Shards: a rare purple currency for alternate tower forms. Only winning pays them.
  shards: (win) => (win ? 1 : 0),
  // Gems: Hardcore's currency (only Hardcore pays them). Necromancer and Hacker are bought with them.
  gems: (wavesCleared, win) => wavesCleared * 100 + (win ? 5000 : 0),
};

// Versus (PVP): every player defends their own map; the maps are joined by bridges.
// Waves run on one shared clock and never stop; the last base standing wins.
export const VERSUS = {
  minPlayers: 2,
  firstIntermission: 30, // seconds to build before wave 1
  waveBreak: 14, // seconds after a wave's last spawn before the next wave starts
  minWaveGap: 26, // ...but never less than this between wave starts
  // Endless waves get tougher fast after the scripted ones run out, so matches end.
  hpMult: (index) => (1 + index * 0.07) * 1.07 ** Math.max(0, index - 11),
  // Credits: per wave survived, plus a bonus by finishing place (1st, 2nd, 3rd, 4th).
  credits: (waves, place) => waves * 40 + ([0, 800, 300, 120, 0][place] ?? 0),
  shards: (place) => (place === 1 ? 1 : 0), // Dimension Shards for winning the battle
  // Zombies you can buy and send to an opponent's map. n per purchase, `gap` seconds apart.
  // minWave: the first wave (1-based) this send unlocks on.
  sends: {
    normal: { n: 5, cost: 75, gap: 0.6, minWave: 1 },
    fast: { n: 5, cost: 110, gap: 0.45, minWave: 1 },
    slow: { n: 2, cost: 220, gap: 1.2, minWave: 3 },
    flying: { n: 4, cost: 180, gap: 0.7, minWave: 4 },
    lead: { n: 3, cost: 240, gap: 1.0, minWave: 5 },
    hidden: { n: 3, cost: 320, gap: 0.8, minWave: 5 },
    android: { n: 1, cost: 260, gap: 0, minWave: 4 },
    boss: { n: 1, cost: 2200, gap: 0, minWave: 8 },
  },
  smokeRange: 0.5, // smoked towers keep this fraction of their range
};

/** What placing `def` costs: some towers are cheaper outside Versus. */
export const towerCost = (def, versus) => (!versus && def.survivalCost != null ? def.survivalCost : def.cost);

export const MP = {
  maxRoomPlayers: 4,
  maxPartySize: 4,
  hardcorePlayers: 6, // Hardcore co-op rooms hold up to this many (DIFFICULTIES[mode].maxPlayers)
  tickRate: 20, // server simulation steps per second
  snapshotEvery: 2, // send a full state snapshot every N ticks
};

// Shirt colors given to players in join order.
export const PLAYER_COLORS = [0x1e88e5, 0xe53935, 0xfdd835, 0x8e24aa, 0xfb8c00, 0x00acc1];

export const TARGET_MODES = ['First', 'Last', 'Strongest', 'Closest'];

// Each level is fully specified (no inheritance) so it is easy to read and tweak.
// Level index 0 is the tower as placed; indices 1-4 are upgrades (shown as Lv 2-5).
// price: credits to unlock in the Loadout & Shop (0 = owned from the start).
// shards: on a base tower, it's bought with Dimension Shards instead of credits.
// gems: on a base tower, it's bought with Gems (from Hardcore) instead of credits.
// placement: 'ground' (default), 'cliff' (cliff tops only) or 'any'.
// burst: shots fired per cycle, burstGap seconds apart. cooldown is the full cycle time,
//        so DPS = damage * burst / cooldown.
// Detection: which special zombies a tower can hit (see detection() below).
//   hidden: per level; Ghouls are invisible to towers without it (unless a Flare Gun reveals them).
//   flying: towers hit flying zombies unless `flying: false` (on the tower or a level).
//   lead:   lead-armored zombies shrug off weak bullets. `lead: true` = from the start,
//           `lead: 2` = from level index 2 (shown as Lv 3); a level can also set it itself.
// Spawner units only hit lead zombies if their unit def says `lead`, and flying ones if they
// are soldiers on foot (or say `flying`). Crashing into a lead zombie always works, but
// nothing on the ground can ram a flyer.

// Crook Boss goons: gangsters on foot. They walk down the path from the castle end, stop to
// shoot zombies in range and crash into zombies that reach them, until they're destroyed or reach the entrance.
const PISTOL_GOON = { name: 'Pistol Goon', model: 'pistolgoon', soldiers: 1, hp: 40, speed: 4, ram: true, flying: true,
  gun: { damage: 4, cooldown: 0.75, range: 13 } };
const TOMMY_GOON = { name: 'Tommy Goon', model: 'tommygoon', soldiers: 1, hp: 175, speed: 4, ram: true, flying: true, hidden: true,
  gun: { damage: 3, burst: 5, cooldown: 0.9, range: 15 } };
const DON_GOON = { name: 'Made Tommy Goon', model: 'dongoon', soldiers: 1, hp: 350, speed: 4, ram: true, flying: true, hidden: true,
  gun: { damage: 6, burst: 6, cooldown: 0.8, range: 16 } };
// Golden Crook Boss goons: the same gangsters in gold, tougher and with longer range.
const GOLD_PISTOL_GOON = { name: 'Golden Pistol Goon', model: 'goldpistolgoon', soldiers: 1, hp: 60, speed: 4, ram: true, flying: true, lead: true,
  gun: { damage: 6, cooldown: 0.7, range: 16 } };
const GOLD_TOMMY_GOON = { name: 'Golden Tommy Goon', model: 'goldtommygoon', soldiers: 1, hp: 250, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 4, burst: 5, cooldown: 0.8, range: 18 } };
const GOLD_TOMMY_GOON_2 = { name: 'Golden Tommy Goon 2', model: 'golddongoon', soldiers: 1, hp: 500, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 8, burst: 6, cooldown: 0.7, range: 18 } };

// Mobster helpers (Mobster, the alternate Crook Boss form). Goons are gangsters on foot like the
// Crook Boss's; Agents are suited bounty hunters with hidden detection.
const MOB_GOON = { name: 'Goon', model: 'mgoon', soldiers: 1, hp: 25, speed: 4, ram: true, flying: true,
  gun: { damage: 6.5, cooldown: 0.5, range: 12 } };
const MOB_GOON_2 = { name: 'Goon 2', model: 'mgoon2', soldiers: 1, hp: 85, speed: 4, ram: true, flying: true,
  gun: { damage: 7, burst: 3, cooldown: 1, range: 13 } };
const MOB_GOON_3 = { name: 'Goon 3', model: 'mgoon3', soldiers: 1, hp: 135, speed: 4, ram: true, flying: true,
  gun: { damage: 9.5, burst: 3, cooldown: 0.5, range: 14 } };
const AGENT = { name: 'Agent', model: 'agent', soldiers: 1, hp: 40, speed: 4, ram: true, flying: true, hidden: true,
  gun: { damage: 8.5, cooldown: 0.5, range: 14 } };
const AGENT_2 = { name: 'Agent 2', model: 'agent2', soldiers: 1, hp: 100, speed: 4, ram: true, flying: true, hidden: true,
  gun: { damage: 29, cooldown: 0.5, range: 15 } };
const AGENT_3 = { name: 'Agent 3', model: 'agent3', soldiers: 1, hp: 175, speed: 4, ram: true, flying: true, hidden: true, lead: true, ignoreBulletResist: true,
  gun: { damage: 50, cooldown: 0.5, range: 16 } };
// AP Rounds (self boost, see HE_AB): 50% more damage for 10s. Ignoring bullet resistance isn't in the game yet.
const AP_AB = { key: 'ap', name: 'AP Rounds', desc: 'For 10s: 50% more damage, and its bullets ignore bullet resistance', cooldown: 30, duration: 10, self: true, dmg: 1.5, ignoreBulletResist: true };
// Place Bounty: marks the toughest zombie in range for good. When it dies, the player who placed
// the bounty gets `pct` of its max health as cash, up to `cap`.
const bountyAbility = (pct, cap) => ({ key: 'bounty', name: 'Place Bounty', desc: `Marks the toughest zombie in range. When it dies you get ${Math.round(pct * 100)}% of its max health as cash (up to $${cap.toLocaleString()})`, cooldown: 20, pct, cap });

// Pursuit: the Patrol ability (moves the patrol zone; the aim ring shows the zone's size).
const patrolAbility = (radius) => ({ key: 'patrol', name: 'Patrol', desc: 'Move its patrol zone to a spot you click', cooldown: 8, aim: true, radius });
// Levels both Pursuit paths share (Lv 1-4).
const PURSUIT_SHARED = [
  { name: 'Pursuit', desc: 'A helicopter that patrols an area and hovers to shoot zombies that come near.', damage: 7, cooldown: 0.225, range: 7, ammo: 50, reload: 3.5, patrol: 12, hidden: false,
    abilities: [patrolAbility(12)] },
  { name: 'AP Rounds', desc: 'More damage.', cost: 1750, damage: 10, cooldown: 0.225, range: 7, ammo: 50, reload: 3.5, patrol: 12, hidden: false,
    abilities: [patrolAbility(12)] },
  { name: 'Enhanced Radar', desc: 'More range and patrol area, faster shooting, more ammo and a quicker reload.', cost: 3000, damage: 10, cooldown: 0.175, range: 8, ammo: 75, reload: 3, patrol: 15, hidden: false,
    abilities: [patrolAbility(15)] },
  { name: 'Air to Ground Missiles', desc: 'Adds missiles that explode for splash damage and can hit lead zombies.', cost: 4750, damage: 12, cooldown: 0.175, range: 8, ammo: 75, reload: 3, patrol: 15, hidden: false,
    missile: { damage: 30, count: 2, every: 5, radius: 3.5, range: 12 }, abilities: [patrolAbility(15)] },
];
// Helicopter: Move flies it (its small zone) anywhere on the map; Pursuit chases the zombie closest to the base.
const HELI_MOVE = { key: 'patrol', name: 'Move', desc: 'Fly it to a spot you click, anywhere on the map', cooldown: 1, aim: true, radius: 5 };
const HELI_CHASE = { key: 'chase', name: 'Pursuit', desc: 'For 15s it chases the zombie closest to the base, anywhere on the map', cooldown: 30, duration: 15 };
// Tactical Sniper (Bottom path) Flare Gun.
// Laser Gunner abilities. Shock Rounds (timed self boost): `dmg` x damage, and each shot stuns
// the zombie it hits first for `stun` s. Stealth Sensor: a shockwave that hits every zombie within
// `radius` for `damage` and reveals hidden ones for good (every tower can hit them until they die).
// Operator Bottom path vehicles (see `operator`): each sends its `unit` down the path.
const JEEP_AB = { key: 'jeep', name: 'Spawn Jeep', desc: 'Sends a 150 HP Jeep that shoots zombies (8 DPS) and rams them', cooldown: 25, vehicle: true,
  unit: { name: 'Jeep', model: 'gunjeep', hp: 150, speed: 7.3, ram: true, gun: { damage: 2, cooldown: 0.25, range: 31 } } };
const HUMVEE_AB = { key: 'humvee', name: 'Spawn Humvee', desc: 'Sends a 400 HP Humvee that shoots zombies (32 DPS) and rams them', cooldown: 25, vehicle: true,
  unit: { name: 'Humvee', model: 'humvee3', hp: 400, speed: 7.3, ram: true, gun: { damage: 8, cooldown: 0.25, range: 31 } } };
const LAV_AB = { key: 'lav', name: 'Spawn LAV-25', desc: 'Sends a 1,850 HP LAV-25 that shoots zombies (62.5 DPS) and takes 25% less damage when it rams them', cooldown: 60, vehicle: true,
  unit: { name: 'LAV-25', model: 'lav25', hp: 1850, speed: 7.3, ram: true, ramArmor: 0.25, stunImmune: true, gun: { damage: 12.5, cooldown: 0.2, range: 31 } } };
const SHOCK_AB = { key: 'shock', name: 'Shock Rounds', desc: 'For 12s: 50% more damage, and each shot stuns the first zombie it hits for 0.3s', cooldown: 30, duration: 12, self: true, dmg: 1.5, stun: 0.3 };
const sensorAbility = (tier, damage, cooldown) => ({ key: 'sensor', name: `Stealth Sensor ${tier}`, desc: `A shockwave that does ${damage} damage to nearby zombies and reveals hidden ones for good`, cooldown, radius: 10, damage });
const FLARE_AB = { key: 'flare', name: 'Flare Gun', desc: 'Reveals hidden zombies in its range for 8s so every tower can hit them', cooldown: 30, duration: 8 };
// Combat Shotgunner support abilities (max level of each path). Health Pack heals what has health
// (towers, Engineer sentries and spawned units) within `radius` by `heal` x their max health.
const HEALPACK_AB = { key: 'healpack', name: 'Health Pack', desc: 'Heals nearby towers, sentries and units by 45% of their max health', cooldown: 30, radius: 12, heal: 0.45 };
// Unstun Power: frees every stunned tower and sentry within `radius` (any owner's).
const UNSTUN_AB = { key: 'unstun', name: 'Unstun Power', desc: 'Frees every stunned tower and sentry nearby', cooldown: 25, radius: 14 };
// Gatling Gun FPS Mode (every level has it).
const FPS_AB = { key: 'fps', name: 'FPS Mode', desc: 'Take control: aim with the mouse and hold click to shoot anywhere. Shots pierce 3 zombies and hit 2.5x harder', cooldown: 0.5 };

// Mercenary Base units (see `mercenary`), by tier. All are soldiers on foot.
const MERC = {
  rifle: (tier) => [
    { name: 'Rifleman', model: 'mrifle', soldiers: 1, hp: 40, speed: 3.5, flying: false, gun: { damage: 4, burst: 5, cooldown: 1.5, range: 13 } },
    { name: 'Rifleman', model: 'mrifle2', soldiers: 1, hp: 60, speed: 3.5, hidden: true, flying: true, gun: { damage: 6, burst: 5, cooldown: 1.2, range: 15 } },
    { name: 'Rifleman', model: 'mrifle3', soldiers: 1, hp: 120, speed: 3.5, hidden: true, flying: true, gun: { damage: 8, burst: 5, cooldown: 0.75, range: 16 } },
  ][tier],
  gren: (tier) => [
    { name: 'Grenadier', model: 'mgren', soldiers: 1, hp: 50, speed: 3.5, lead: true, flying: false, gun: { damage: 20, cooldown: 2.5, range: 12, radius: 3.5 } },
    { name: 'Grenadier', model: 'mgren2', soldiers: 1, hp: 100, speed: 3.5, lead: true, flying: false, gun: { damage: 50, cooldown: 1.5, range: 13, radius: 4 } },
  ][tier],
  riot: (tier) => [
    { name: 'Riot Guard', model: 'mriot', soldiers: 1, hp: 800, speed: 5, hidden: true, flying: false, gun: { damage: 15, cooldown: 0.5, range: 4, knock: 1.5 } },
    { name: 'Riot Guard', model: 'mriot2', soldiers: 1, hp: 1500, speed: 5, hidden: true, flying: false, gun: { damage: 25, cooldown: 0.5, range: 4, knock: 2 } },
  ][tier],
  medic: (tier) => [
    { name: 'Field Medic', model: 'mmedic', soldiers: 1, hp: 150, speed: 3.5, heal: { rate: 75, range: 10, shield: 0.3 } },
    { name: 'Field Medic', model: 'mmedic2', soldiers: 1, hp: 300, speed: 3.5, heal: { rate: 100, range: 12, shield: 0.4 } },
  ][tier],
  airdrop: { key: 'airdrop', name: 'Air-Drop', desc: 'Drops every unit in its queues onto the path where you click', cooldown: 60, aim: true, radius: 4 },
};

// Graveyard (event tower) undead: they walk down the path from the castle end and crash into
// zombies (Skeletons and Giant Skeletons only crash; knights and Jack also fight up close).
const GRAVE = {
  skeleton: { name: 'Skeleton', model: 'skelmini', soldiers: 1, hp: 12, speed: 4, ram: true, flying: false },
  cursed: { name: 'Cursed Skeleton', model: 'skelcursed', soldiers: 1, hp: 24, speed: 4, ram: true, flying: false },
  giant: { name: 'Giant Skeleton', model: 'skelgiant', soldiers: 1, hp: 150, speed: 3, ram: true, flying: false },
  giantCursed: { name: 'Giant Cursed Skeleton', model: 'skelgiantcursed', soldiers: 1, hp: 300, speed: 3, ram: true, flying: false },
  knight: { name: 'Haunted Knight', model: 'skelhaunted', soldiers: 1, hp: 600, speed: 3.5, ram: true, flying: false, gun: { damage: 30, cooldown: 0.75, range: 4.5 } },
  hallowKnight: { name: 'Hallow Knight', model: 'skelhallowknight', soldiers: 1, hp: 1200, speed: 3.5, ram: true, flying: false, lead: true, gun: { damage: 80, cooldown: 0.75, range: 4.5 } },
  jack: { name: 'Jack', model: 'skeljack', soldiers: 1, hp: 10000, speed: 2.5, ram: true, flying: false, lead: true, hidden: true, gun: { damage: 300, cooldown: 3, range: 6 } },
};

// Elf Camp (event tower) elves: they walk down the path from the castle end. Unit fields:
// pierceArmor: its crashes and its explosion ignore armor (defense). noGhosts: it walks through
// Ghosts and Spirits instead of crashing into them. defense: takes this much less damage from
// zombies. air: it flies over the path (ground zombies can't touch it, it can't crash).
// gun.radius: a lobbed blast; gun.burstGap: seconds between the shots of a burst.
const ELF = {
  basic: { name: 'Elf', model: 'elfbasic', soldiers: 1, hp: 15, speed: 4, ram: true, flying: false, pierceArmor: true, noGhosts: true },
  snowball: { name: 'Snowball Elf', model: 'elfsnow', soldiers: 1, hp: 15, speed: 4, flying: false, noGhosts: true, gun: { damage: 4, cooldown: 2, range: 17 } },
  cannon: { name: 'Cannoneer Elf', model: 'elfcannon', soldiers: 1, hp: 20, speed: 4, flying: false, noGhosts: true, gun: { damage: 4, cooldown: 0.5, range: 18 } },
  bomber: { name: 'Bomber Elf', model: 'elfbomb', soldiers: 1, hp: 5, speed: 5, ram: true, flying: false, lead: true, pierceArmor: true, noGhosts: true,
    explode: { damage: 45, radius: 5 } },
  guardian: { name: 'Guardian Elf', model: 'elfguard', soldiers: 1, hp: 50, speed: 4, flying: false, hidden: true, noGhosts: true, gun: { damage: 18, cooldown: 0.5, range: 7 } },
  guardian2: { name: 'Guardian Elf', model: 'elfguard2', soldiers: 1, hp: 75, speed: 4, flying: false, hidden: true, noGhosts: true, defense: 0.3, gun: { damage: 28, cooldown: 0.5, range: 7 } },
  // A burst cycle is `cooldown` s: burst * burstGap plus the 1s pause between bursts.
  gunner: { name: 'Gunner Elf', model: 'elfgunner', soldiers: 1, hp: 25, speed: 4, flying: false, hidden: true, noGhosts: true,
    gun: { damage: 4, burst: 5, burstGap: 0.4, cooldown: 3, range: 22 } },
  gunner2: { name: 'Gunner Elf', model: 'elfgunner', soldiers: 1, hp: 25, speed: 4, flying: false, hidden: true, noGhosts: true, count: 2,
    gun: { damage: 4, burst: 5, burstGap: 0.35, cooldown: 2.75, range: 22 } },
  gift: { name: 'Gift Bomber', model: 'elfgift', soldiers: 1, hp: 500, speed: 3, air: true, flying: true, hidden: true,
    gun: { damage: 60, cooldown: 2, range: 25, radius: 4.5 } },
  ripped: { name: 'Ripped Elf', model: 'elfripped', soldiers: 1, hp: 1000, speed: 3, flying: false, lead: true, noGhosts: true,
    gun: { damage: 375, cooldown: 7, range: 60, radius: 4 } },
};

// Relic (event tower) units: medieval fighters on foot that stop to fight zombies in range. Their
// swords can't reach flying zombies (only Archers can, until the Relic's last level gives every
// unit air targeting). From Relic Lv 3 (index 2) every unit sees hidden zombies.
// max: at most that many of this unit from one Relic on the field at once (it waits for a free slot).
// gun.stun: every hit stuns its target that long (not bosses).
// beam: { damage, range, every, first }: a laser at the zombie closest to the castle within
//       `range`, every `every` s (the first one `first` s after it spawns).
// summon: { unit, every, pause }: every `every` s it stops for `pause` s and calls `unit` beside it.
// ignoreExplosiveResist (Overseer Prime Radiant Smite): its blasts get through explosive resistance.
// Not used by the game yet (kept for later): stunImmune (nothing stuns units yet: Overseers can
// never be stunned), damage: 'lightning' /
// 'explosive' (Relic Lv 6 damage types). Most bosses should resist ramming, which hurts Overseers.
const RELIC = {
  bandit: { name: 'Bandit', model: 'relicbandit', soldiers: 1, hp: 190, speed: 3.5, flying: false, lead: true, count: 1, gun: { damage: 20, cooldown: 1, range: 4 } },
  bandit3: { name: 'Bandit', model: 'relicbandit', soldiers: 1, hp: 190, speed: 3.5, flying: false, lead: true, count: 3, gun: { damage: 20, cooldown: 1, range: 4 } },
  bandit3h: { name: 'Bandit', model: 'relicbandit', soldiers: 1, hp: 190, speed: 3.5, flying: false, lead: true, hidden: true, count: 3, gun: { damage: 20, cooldown: 1, range: 4 } },
  bandit1: { name: 'Bandit Level 1', model: 'relicbandit1', soldiers: 1, hp: 560, speed: 3.5, flying: false, lead: true, hidden: true, count: 3, gun: { damage: 111, cooldown: 1, range: 4 } },
  zealot: { name: 'Zealot', model: 'reliczealot', soldiers: 1, hp: 2000, speed: 3.5, flying: false, lead: true, hidden: true, gun: { damage: 200, cooldown: 1, range: 4.5 } },
  zealot2: { name: 'Zealot', model: 'reliczealot', soldiers: 1, hp: 2000, speed: 3.5, flying: false, lead: true, hidden: true, count: 2, max: 6, gun: { damage: 200, cooldown: 1, range: 4.5 } },
  archer: { name: 'Archer', model: 'relicarcher', soldiers: 1, hp: 175, speed: 3.5, flying: true, hidden: true, gun: { damage: 30, cooldown: 1, range: 16 } },
  archer2: { name: 'Archer', model: 'relicarcher', soldiers: 1, hp: 175, speed: 3.5, flying: true, hidden: true, count: 2, max: 10, gun: { damage: 30, cooldown: 1, range: 16 } },
  // A slow, heavy swing that also hits zombies right around its target.
  warden: { name: 'Warden', model: 'relicwarden', soldiers: 1, hp: 15000, speed: 3, flying: false, lead: true, hidden: true, gun: { damage: 1500, cooldown: 2, range: 5, splash: 3 } },
  warden2: { name: 'Warden', model: 'relicwarden', soldiers: 1, hp: 15000, speed: 3, flying: false, lead: true, hidden: true, count: 2, max: 6, gun: { damage: 1500, cooldown: 2, range: 5, splash: 3 } },
  // Seraphs float over the zombies (they can't ram or be touched) and strike up close.
  seraph: { name: 'Seraph', model: 'relicseraph', soldiers: 1, hp: 2500, speed: 4, air: true, flying: false, lead: true, hidden: true, max: 3, gun: { damage: 3500, cooldown: 1.8, range: 6 } },
  seraph2: { name: 'Seraph', model: 'relicseraph', soldiers: 1, hp: 2500, speed: 4, air: true, flying: true, lead: true, hidden: true, count: 2, max: 3, gun: { damage: 3500, cooldown: 1.8, range: 6 } },
  // Overseers have no weapon: they only ram. ramArmor: strong resistance to ramming damage.
  overseer: { name: 'Overseer', model: 'relicoverseer', hp: 120000, speed: 6, ram: true, ramArmor: 0.5, lead: true, hidden: true, stunImmune: true },
  overseer2: { name: 'Overseer', model: 'relicoverseer', hp: 120000, speed: 6, ram: true, ramArmor: 0.5, lead: true, hidden: true, stunImmune: true, count: 2 },
  phantom: { name: 'Phantom Overseer', model: 'relicphantom', hp: 100000, speed: 6, ram: true, ramArmor: 0.5, lead: true, hidden: true, stunImmune: true },
};
// Overseer Prime: a giant, very slow unit that rams (20% less ramming damage) and attacks four ways:
// Cleaving Claw (gun: stuns what it hits), Radiant Smite (cannon: a fireball every 7s, range 192),
// Sigil of Destruction (beam: 150,000 to one zombie from up to 300 away, first 7s after it spawns)
// and Ancient Awakening (summon: stops to call a Phantom Overseer).
// The spec gives no numbers for Radiant Smite's damage, the Sigil's cooldown or how often Ancient
// Awakening happens: 25,000 splash, every 20s and every 45s (2s stop) are guesses.
RELIC.prime = { name: 'Overseer Prime', model: 'relicprime', hp: 200000, speed: 1.5, ram: true, ramArmor: 0.2, lead: true, hidden: true, flying: true,
  stunImmune: true, ignoreExplosiveResist: true, max: 2,
  gun: { damage: 80000, cooldown: 1.7, range: 5, stun: 1 },
  cannon: { damage: 25000, every: 7, radius: 6, range: 192 },
  beam: { damage: 150000, range: 300, every: 20, first: 7 },
  summon: { unit: RELIC.phantom, every: 45, pause: 2 } };

// Biologist plants: units that stand still on the path for `life` s (zombies walking over them
// wear them down). gun.splash: every zombie within it of the target is hit too. gun.poison: see
// Toxic Gunner. gun.confuse: { time, cd }: the zombie hit walks backwards for `time` s, then can't
// be confused again for `cd` s (not bosses).
const sunflower = (hp, damage, cooldown, range, hidden = false) => ({ name: 'Sunflower', model: 'plantsun', hp, life: 30, speed: 0, still: true, flying: false, hidden,
  gun: { damage, cooldown, range } });
const ivy = (hp, damage, cooldown, range, splash, poison) => ({ name: 'Ivy', model: 'plantivy', hp, life: 20, speed: 0, still: true, flying: false, lead: true,
  gun: { damage, cooldown, range, splash, poison } });
const nightshade = (hp, damage, cooldown, range, confuse) => ({ name: 'Nightshade', model: 'plantnight', hp, life: 20, speed: 0, still: true, flying: true,
  gun: { damage, cooldown, range, confuse } });

// Necromancer skeletons: raised from gravestones, they walk from their grave toward the entrance
// and fight zombies up close (melee, so they can't hit flyers).
const SKEL = {
  skeleton: { name: 'Skeleton', model: 'skel', soldiers: 1, hp: 60, speed: 4, flying: false, gun: { damage: 8, cooldown: 0.8, range: 4.5 } },
  sword: { name: 'Sword Skeleton', model: 'skelsword', soldiers: 1, hp: 120, speed: 4, flying: false, gun: { damage: 15, cooldown: 0.8, range: 4.5 } },
  sword2: { name: 'Sword Skeleton', model: 'skelsword2', soldiers: 1, hp: 220, speed: 5, flying: false, hidden: true, gun: { damage: 25, cooldown: 0.7, range: 4.5 } },
  giant: { name: 'Giant Skeleton', model: 'skelgiant', soldiers: 1, hp: 900, speed: 2.5, flying: false, lead: true, gun: { damage: 60, cooldown: 1.5, range: 5.5, knock: 1.5 } },
  knight: { name: 'Skeleton Knight', model: 'skelknight', soldiers: 1, hp: 500, speed: 4, flying: false, hidden: true, lead: true, gun: { damage: 40, cooldown: 0.8, range: 5 } },
  hallow: { name: 'Hallow Guard', model: 'skelhallow', soldiers: 1, hp: 1200, speed: 3.5, flying: false, hidden: true, lead: true, gun: { damage: 50, cooldown: 0.9, range: 5 } },
  exec: { name: 'Executioner Skeleton', model: 'skelexec', soldiers: 1, hp: 2000, speed: 3, flying: false, hidden: true, lead: true, gun: { damage: 250, cooldown: 1.6, range: 5.5 } },
};
// Raise the Dead: smashes every gravestone. Each one summons a random unit from its level's
// pool (repeats make a unit more likely).
const raiseAbility = { key: 'raise', name: 'Raise the Dead', desc: 'Smash every gravestone to summon skeletons from them', cooldown: 5 };

// Engineer sentries, by tier. `decay`: HP lost every second (it breaks down when it hits 0).
const SENTRY = {
  basic: { name: 'Sentry', model: 'sentry', hp: 100, decay: 4, lead: true, flying: true, gun: { damage: 2, cooldown: 1, range: 12 } },
  rifle: { name: 'Rifle Sentry', model: 'sentry2', hp: 400, decay: 4, lead: true, flying: true, hidden: true, gun: { damage: 5, cooldown: 1, range: 14 } },
  minigun: { name: 'Minigun Sentry', model: 'sentry3', hp: 750, decay: 4, lead: true, flying: true, hidden: true, gun: { damage: 4, cooldown: 0.2, range: 15 } },
  minigunShield: { name: 'Minigun Sentry', model: 'sentry3', hp: 750, decay: 4, lead: true, flying: true, hidden: true, shield: true, gun: { damage: 4, cooldown: 0.2, range: 15 } },
  war: { name: 'War Machine Sentry', model: 'sentry4', hp: 1500, decay: 4, lead: true, flying: true, hidden: true, shield: true,
    gun: { damage: 6, cooldown: 0.15, range: 17 }, rocket: { damage: 40, every: 1.2, radius: 3.5 } },
};

// Hacker: Hologram Tower clones a tower (not a Hacker or an income tower) for `clone` x that
// tower's total cost. The clone fades after `life` seconds; a player can have as many clones of
// a tower at once as its placement limit.
const cloneAbility = (clone, life) => ({ key: 'clone', name: 'Hologram Tower', desc: `Clone a tower on the map and place the hologram anywhere. Costs ${Math.round(clone * 100)}% of that tower's total cost and lasts ${life}s`, cooldown: 5, aim: true, clone, life });
const HACKER_SHARED = [
  { name: 'Hacker', desc: 'Hacks zombies with a smartphone. Hacked zombies are slowed, pay more cash for damage, and come back as holograms that fight for you.', damage: 0, cooldown: 0.3, range: 11, synapses: 1, ev: 0.45, slow: 0.075, fraud: 0.125, units: 1000, hidden: false },
  { name: 'Signal Booster', desc: 'More range and a stronger slow.', cost: 125, damage: 0, cooldown: 0.3, range: 12.5, synapses: 1, ev: 0.45, slow: 0.1, fraud: 0.125, units: 1000, hidden: false },
  { name: '1337 Skills', desc: 'Hacks 2 zombies at once, sees hidden zombies, tougher holograms and more Wire Fraud.', cost: 1337, damage: 0, cooldown: 0.3, range: 14, synapses: 2, ev: 0.55, slow: 0.1, fraud: 0.15, units: 1000, hidden: true },
  { name: 'Hologram Projector', desc: 'A wrist gadget: its synapses now deal damage, tougher holograms, and unlocks Hologram Tower to clone any tower.', cost: 6500, damage: 10, cooldown: 0.3, range: 15, synapses: 2, ev: 0.625, slow: 0.1, fraud: 0.15, units: 1000, hidden: true,
    abilities: [cloneAbility(0.3, 25)] },
  { name: 'Botnet', desc: 'More damage, 3 synapses, tougher holograms, more Wire Fraud and cheaper clones.', cost: 24000, damage: 22, cooldown: 0.3, range: 16, synapses: 3, ev: 0.675, slow: 0.1, fraud: 0.2, units: 1000, hidden: true,
    abilities: [cloneAbility(0.25, 25)] },
];

// John (Top 5) Rage Mode: towers within `radius` (not other Johns) deal +`boost` damage for `duration` s.
const RAGE_AB = { key: 'rage', name: 'Rage Mode', desc: 'Nearby towers deal 50% more damage for 8s', cooldown: 60, duration: 8, radius: 16, boost: 0.5 };
// Self boosts (`self`): for `duration` s the tower's damage x`dmg` and range x`range`; `radius`
// turns every shot into an explosion that hurts all zombies around the target; `heal` repairs it.
const HE_AB = { key: 'he', name: 'HE Rounds', desc: 'For 10s every bullet explodes, with 50% more damage and 20% more range', cooldown: 60, duration: 10, self: true, dmg: 1.5, range: 1.2, radius: 3 };
const OVERCHARGE_AB = { key: 'overcharge', name: 'Overcharge', desc: 'For 10s: 50% more damage and 25% more range, and it repairs 2,000 health', cooldown: 60, duration: 10, self: true, dmg: 1.5, range: 1.25, heal: 2000 };
// Slammer (Top 5) Grand Slam: every zombie within `radius` takes the tower's damage, is stunned for
// `stun` s even if it can't normally be stunned (bosses too, at full length), and catches fire.
const GRANDSLAM_AB = { key: 'grandslam', name: 'Grand Slam', desc: 'Stuns every zombie nearby for 3s, even bosses and stun-immune ones, and sets them on fire', cooldown: 45, radius: 12, stun: 3, burn: 40, burnTime: 5 };
// Knockback "force" (Brawler combos and Reposition) is turned into studs pushed back along the path.
export const KNOCK_STUDS = 0.2;
export const BOSS_KNOCK = 0.25; // bosses are knocked back this fraction as far
// Brawler Reposition: leaps to a spot within `reach` studs, hitting every zombie within `radius`
// of where it lands for `damage` with `knock` force.
const repositionAbility = (damage, reach) => ({ key: 'reposition', name: 'Reposition', desc: `Leap to a spot within ${reach} studs, dealing ${damage} damage and knocking back every zombie it lands on`, cooldown: 15, aim: true, radius: 4, reach, damage, knock: 25 });
/** Abilities that stay switched on for a while (t.active counts down their `duration`). */
// Machine Gunner: Redeploy turns its cone to face the spot you click; Overcharge I-III boost it.
const REDEPLOY_AB = { key: 'redeploy', name: 'Redeploy', desc: 'Click a spot to turn its firing cone to face it', cooldown: 5, aim: true };
const mgOvercharge = (lvl, dmg, range, rate, duration, cooldown) => ({ key: 'overcharge', name: `Overcharge ${lvl}`, self: true,
  desc: `For ${duration}s: +${Math.round((dmg - 1) * 100)}% damage, +${Math.round((range - 1) * 100)}% range and +${Math.round((rate - 1) * 100)}% firerate`, cooldown, duration, dmg, range, rate });
const OC_1_AB = mgOvercharge('I', 1.2, 1.2, 1.1, 12, 30);
const OC_2_AB = mgOvercharge('II', 1.3, 1.3, 1.18, 14, 30);
const OC_3_AB = mgOvercharge('III', 1.75, 1.4, 1.25, 16, 25);
// Gladiator: War Cry is a self boost (`rate`: firerate multiplier). Not used by the game yet (kept
// for later): cleanse (clears Fatigue / Scared debuffs on it; the game has no such debuffs yet).
const WARCRY_AB = { key: 'warcry', name: 'War Cry', desc: 'For 15s it swings 65% faster (and shakes off Fatigue and Scared)', cooldown: 30, duration: 15, self: true, rate: 1.65, cleanse: true };
// Commando (event): Concussive Missiles. Click a spot within `reach` of the tower: `count`
// missiles land there `delay` s later, each `damage` within `radius` (ignoring armor, hitting
// lead zombies) and stunning for `stun` s.
const concussiveAb = (count, damage, stun, reach, cooldown) => ({ key: 'concussive', name: 'Concussive Missiles', aim: true, radius: 1.5, delay: 2, count, damage, stun, reach, cooldown,
  desc: `Fire ${count} missiles at a spot within ${reach} studs: ${damage} damage each in a small blast (ignores armor, hits lead), ${stun}s stun` });
// Swarmer: Bee Swarm Grenade. Click a spot: `damage` to every zombie within `radius`, ignoring
// armor and hitting lead zombies.
const beeNadeAb = (damage, radius) => ({ key: 'beeNade', name: 'Bee Swarm Grenade', aim: true, cooldown: 15, damage, radius,
  desc: `Throw a bee grenade: ${damage} damage to every zombie within ${radius} (ignores armor, hits lead)` });
// Harvester: Thorns. Click a spot on the path within the tower's range: a patch of thorns grows
// there for `time` s, hurting every ground zombie inside (hidden ones too, not lead) for `damage`
// every `tick` s and slowing them by `slow`. Every Farm of yours inside the Harvester's range
// sprouts its own patch on the closest bit of path, doing `farmMult` of the damage.
const thornsAb = (damage, tick, radius, time, slow) => ({ key: 'thorns', name: 'Thorns', aim: true, cooldown: 40, damage, tick, radius, time, slow, farmMult: 0.5,
  desc: `Grow thorns on the path: ${damage} damage every ${tick}s and ${Math.round(slow * 100)}% slow within ${radius} for ${time}s (Farms in range grow weaker thorns too)` });
// Elementalist: Switch Element swaps between Fire and Frost (tower field `choice[0]`). `mode`
// abilities only work in that element.
const ELEMENT_AB = { key: 'element', name: 'Switch Element', desc: 'Swap between Fire mode (burns) and Frost mode (slows)', cooldown: 5 };
// Heatwave (Fire mode): `damage` to every zombie within `radius` of the tower (it sees hidden
// ones), sets them on fire (`burn` per second for `burnTime` s) and knocks them back `knock`.
const heatwaveAb = (damage, burn, radius, knock) => ({ key: 'heatwave', name: 'Heatwave', mode: 'fire', cooldown: 40, damage, burn, burnTime: 5, radius, knock,
  desc: `Fire mode: a blast of ${damage} damage within ${radius}, then ${burn} burn per second for 5s, knocking zombies back` });
// Ice Turret (Frost mode): click a spot within `reach`: an ice turret (a unit that stands still)
// shoots there for `unit.life` s, slowing zombies and freezing them when fully chilled.
const iceTurretAb = (unit) => ({ key: 'iceTurret', name: 'Ice Turret', mode: 'frost', aim: true, cooldown: 50, reach: 25, unit,
  desc: `Frost mode: place an Ice Turret (${unit.hp} HP, lasts ${unit.life}s): ${unit.gun.damage} damage every ${unit.gun.cooldown}s within ${unit.gun.range}, slows and freezes` });
const iceTurret = (damage, cooldown, range, maxSlow) => ({ name: 'Ice Turret', model: 'iceturret', hp: 1000, life: 45, speed: 0, still: true, flying: false, hidden: true,
  gun: { damage, cooldown, range, chill: { chill: 0.34, maxSlow, chillTime: 3, chillFreeze: 2 } } });
// Flame Trooper Fire Ring: a heatwave (see above) without knockback that works in any mode.
// Not used by the game yet (kept for later): splashTransfer (the spec tags it but doesn't say what it does).
// The spec doesn't give its radius: 8 is a guess.
const FIRE_RING_AB = { key: 'heatwave', name: 'Fire Ring', cooldown: 20, damage: 500, burn: 100, burnTime: 8, radius: 8, knock: 0, splashTransfer: true,
  desc: 'A ring of fire around it: 375 damage to every zombie within 8, then 75 burn per second for 8s' };
// Goo Gunner Spawn Puddle: a goo puddle on the closest bit of path for `time` s. Every `every` s
// (starting right away) it sends out the `units` ({ unit, n }), which walk down the path and ram
// zombies. The spec gives no ram damage: like other ramming units they deal their health.
const GOO = { name: 'Goo', model: 'goo', soldiers: 1, hp: 75, speed: 2.5, ram: true, flying: false };
const BIG_GOO = { name: 'Big Goo', model: 'biggoo', soldiers: 1, hp: 250, speed: 2.5, ram: true, flying: false };
const PUDDLE_AB = { key: 'puddle', name: 'Spawn Puddle', cooldown: 60, time: 45, every: 13, radius: 2.5, units: [{ unit: GOO, n: 2 }, { unit: BIG_GOO, n: 1 }],
  desc: 'Drops a goo puddle on the path for 45s that sends out 2 Goos (75 HP) and a Big Goo (250 HP) every 13s to ram zombies' };
// Archer (Bowmaster form): cycles through the arrow types it has unlocked (see arrowModes).
const ARROWS_AB = { key: 'arrows', name: 'Switch Arrows', desc: 'Switch to the next arrow type it has unlocked', cooldown: 0.5 };
/** The arrow types an Archer (Bowmaster) level has: 'normal' plus its unlocked `arrows` (tower field `track` picks one). */
export const arrowModes = (s) => ['normal', ...Object.keys(s.arrows ?? {})];
export const arrowName = (s, i) => {
  const m = arrowModes(s);
  return { normal: 'Normal', flame: 'Flame', explosive: 'Explosive', shock: 'Shock' }[m[(i || 0) % m.length]];
};
export const timedAbility = (ab) => ['cta', 'uber', 'rage', 'he', 'overcharge', 'uberBeam', 'kritz', 'encore', 'drone', 'ap', 'chase', 'shock', 'warcry', 'snowStorm', 'fireRounds', 'overload', 'dragonFlame', 'blizzard'].includes(ab.key);

/**
 * What using ability `ab` of tower `t` costs right now, or null once it's used up. `costs`: a
 * price per use, in order (Magic Boost); `costStep`: each use costs that much more (Volt Points,
 * Soul Surge, Dragon Flame); `maxUses`: how many times it can be used. Uses are counted in `t.uses`.
 */
export const abilityCost = (t, ab) => {
  const n = t?.uses?.[ab.key] || 0;
  if (ab.maxUses && n >= ab.maxUses) return null;
  if (ab.costs) return n < ab.costs.length ? ab.costs[n] : null;
  return (ab.cost || 0) + (ab.costStep || 0) * n;
};

// Artillery Target Select: click a spot within its range; it fires every shell there (only when
// a zombie it can hit is inside the blast). Levels with `autoAim` pick their own target when
// nothing is at the spot (or no spot is set).
const targetSelectAb = (radius) => ({ key: 'targetSelect', name: 'Target Select', aim: true, cooldown: 2, radius,
  desc: 'Pick the spot (within its range) where it fires its shells' });
// MLRS Carpet Bomb: a B-52 flies along the path through the clicked spot and drops `bombs` bombs
// `gap` s apart over a strip `length` long and `width` wide (centered on the spot, lined up with
// the path there), each `damage` within `radius`. The spec gives no blast size: radius 4.5 with
// bombs zig-zagging across the strip is a guess. Not used by the game yet (kept for later):
// needsAirspace (only maps with room for planes; there's one map and it has open sky) and roofs
// blocking bombs (there are no roofs).
const CARPET_BOMB_AB = { key: 'carpetBomb', name: 'Carpet Bomb', aim: true, cooldown: 120, bombs: 105, gap: 0.04, damage: 2175, length: 180, width: 18, radius: 4.5, delay: 1.5,
  needsAirspace: true, desc: 'A B-52 drops 105 bombs of 2,175 damage along a 180-long strip of path through the spot you click' };
// Psycho Slayer Teleport / Jump: like the Brawler's Reposition (see repositionAbility), but with
// its own key so a level can have both. Jump also stuns (`stun`, not bosses' immunity) where it lands.
// Not used by the game yet (kept for later): ignoreExplosiveResist on Jump (its landing isn't an
// explosion, so explosive resistance never applies to it yet).
const TELEPORT_AB = { key: 'teleport', name: 'Teleport', desc: 'Instantly move to a spot within 100 studs', cooldown: 10, aim: true, radius: 0, reach: 100, damage: 0, knock: 0 };
const jumpAb = (damage, stun, radius, cooldown) => ({ key: 'jump', name: 'Jump', aim: true, reach: 100, damage, stun, radius, cooldown, knock: 0, ignoreExplosiveResist: true,
  desc: `Jump to a spot within 100 studs: ${damage.toLocaleString()} damage and a ${stun}s stun to every zombie within ${radius} of the landing` });
// Psycho Slayer passive weapons (see `missiles` on the Warship; extra fields handled by
// fireMissiles): strongest = aims at the toughest zombie in its `range`; minHp = skips zombies
// with less health than that; minRange = deadzone; gap = seconds between its shots; stun /
// stunAny = stuns what it hits (stunAny: stun-immune ones too); fx = 'slam' (a mace hit) or
// 'rail' (a railgun beam) instead of a missile. ignoreExplosiveResist on the Mortar: its shells get
// through explosive resistance.
const psychoSlam = (damage, stun, every, minHp, stunAny = false) => ({ name: 'Slam Attack', damage, count: 1, every, radius: 2, range: 7, strongest: true, minHp, stun, fx: 'slam', ...(stunAny ? { stunAny } : {}) });
const psychoRail = (damage, every) => ({ name: 'Railgun Attack', damage, count: 3, gap: 0.55, every, range: 23, radius: 0.5, fx: 'rail' });
const psychoRockets = (damage, radius, every) => ({ name: 'Rockets', damage, count: 6, every, range: 30, minRange: 6, radius, flying: true });
const PSYCHO_MORTAR = { name: 'Mortar', damage: 9000, count: 1, every: 50, range: 150, minRange: 25, radius: 4, strongest: true, ignoreExplosiveResist: true };
// Bubble Blower Bubble Companion: a friendly bubble person with no attack. It blocks zombies
// (`block`: zombies touching it can't walk on) until they wear it down; `hurt`: zombies touching
// it hurt it that many times faster than other units (a guess, so one weak zombie can't be held
// for ages: without it a 100 HP companion holds a basic zombie for 50s).
const BUBBLE_BUDDY = { name: 'Bubble Companion', model: 'bubblebuddy', soldiers: 1, hp: 100, speed: 5, flying: false, block: true, hurt: 5, max: 2 };
// Ice Breaker Ice Shard: a block of ice (a unit that stands still) on the path closest to the
// click, within `reach`. Zombies walking into it take `bump` damage a second and wear it down;
// when it breaks it explodes, freezing everything in the blast (bosses too, for the full time).
// The spec gives no reach, contact damage or freeze time: 25, 25/s and 3s are guesses.
// ignoreIceResist on the unit's explosion: its freeze works fully on ice-resistant enemies.
const ICE_SHARD = { name: 'Ice Shard', model: 'iceshard', hp: 1250, life: 120, speed: 0, still: true, flying: false, bump: 25,
  explode: { damage: 500, radius: 4, freeze: 3, ice: { freezeBoss: 1 }, ignoreIceResist: true } };
const ICE_SHARD_AB = { key: 'iceShard', name: 'Ice Shard', aim: true, cooldown: 30, reach: 25, radius: 4, unit: ICE_SHARD,
  desc: 'Put a block of ice (1,250 HP, lasts 120s) on the path where you click. When zombies break it, it explodes: 165 damage and freezes everything within 4, even bosses' };
// Ice Breaker Snow Storm: for `duration` s, every zombie within `radius` gets `freeze` freeze
// amount a second (0.06 chill per point, see Cryo Blaster). Radius and duration are guesses.
const SNOW_STORM_AB = { key: 'snowStorm', name: 'Snow Storm', cooldown: 25, duration: 6, radius: 10, freeze: 100,
  desc: 'A freezing storm around it for 6s: zombies within 10 freeze solid (bosses too, for half the time)' };

// Cryo Helicopter: Set Location flies it anywhere; Follow Player makes it fly along with you
// (your client keeps sending where you are until you pick a spot again).
const CRYO_MOVE = { key: 'patrol', name: 'Set Location', desc: 'Fly it to a spot you click, anywhere on the map', cooldown: 5, aim: true, radius: 5 };
const CRYO_FOLLOW = { key: 'follow', name: 'Follow Player', desc: 'It flies along with you (until you use Set Location)', cooldown: 5 };
// Cryo Missiles: { damage, every, radius, maxHits, chill }. The spec's Body Heat loss (-80 / -130 /
// -200) is chill here: 0.3 / 0.5 / 0.75 (a guess; there is no Body Heat in this game).
const cryoMissile = (damage, every, chill) => ({ name: 'Cryo Missile', damage, count: 1, every, radius: 3, maxHits: 3, range: 23,
  chill: { chill, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 } });

// ---------------------------------------------------------------- evolved tower helpers
// Kingpin gang units (see `evoKingpin`). Lackeys are gunmen with hidden detection; Money Runners
// don't fight, they just pay `cash` to the Kingpin's owner when they are destroyed. Bouncers and
// Contractors join on the Bottom path. `life`: the unit leaves after that many s. `defense`: takes that much less damage from zombies touching it (rams ignore it).
const LACKEY = [
  { name: 'Lackey', model: 'mgoon', soldiers: 1, hp: 60, speed: 4, ram: true, flying: true, hidden: true, gun: { damage: 5, cooldown: 0.22, range: 12 } },
  { name: 'Lackey', model: 'mgoon2', soldiers: 1, hp: 90, speed: 4, ram: true, flying: true, hidden: true, gun: { damage: 8, cooldown: 0.2, range: 16 } },
  { name: 'Lackey', model: 'mgoon3', soldiers: 1, hp: 215, speed: 4, ram: true, flying: true, hidden: true, gun: { damage: 9, cooldown: 0.16, range: 17.5 } },
  { name: 'Lackey', model: 'mgoon3', soldiers: 1, hp: 315, speed: 4, ram: true, flying: true, hidden: true, gun: { damage: 10, cooldown: 0.12, range: 18 } },
];
const runner = (hp, cash) => ({ name: 'Money Runner', model: 'agent', soldiers: 1, hp, speed: 5, ram: true, flying: false, cash });
const BOUNCER = [
  { name: 'Bouncer', model: 'mriot', soldiers: 1, hp: 500, speed: 4, flying: false, hidden: true, lead: true, life: 150, gun: { damage: 25, cooldown: 0.5, range: 8 } },
  { name: 'Bouncer', model: 'mriot2', soldiers: 1, hp: 750, speed: 4, flying: false, hidden: true, lead: true, life: 150, defense: 0.1, gun: { damage: 35, cooldown: 0.5, range: 8 } },
  { name: 'Bouncer', model: 'mriot2', soldiers: 1, hp: 1000, speed: 4, flying: false, hidden: true, lead: true, life: 150, defense: 0.15, gun: { damage: 40, cooldown: 0.5, range: 8.5 } },
];
const CONTRACTOR = { name: 'Contractor', model: 'agent3', soldiers: 1, hp: 400, speed: 4, flying: true, hidden: true, lead: true, life: 75, gun: { damage: 170, cooldown: 2, range: 35 } };
// Kingpin Bounty: like the Mobster's, with a long cooldown.
const kingpinBounty = (pct, cap) => ({ ...bountyAbility(pct, cap), cooldown: 120 });
// Breacher SWAT Vans: drive down the path ramming zombies, then explode when destroyed.
// `defense` is not used by the game yet (kept for later).
const SWAT_VAN = [
  { name: 'SWAT Van', model: 'mrap', hp: 750, speed: 4, ram: true, defense: 0.1, explode: { damage: 350, radius: 6 } },
  { name: 'SWAT Van', model: 'mrap', hp: 1200, speed: 4, ram: true, defense: 0.15, explode: { damage: 450, radius: 6 } },
  { name: 'SWAT Van Gunner', model: 'mrap', hp: 1500, speed: 4, ram: true, defense: 0.15, hidden: true, explode: { damage: 550, radius: 6 }, gun: { damage: 10, cooldown: 0.15, range: 25 } },
];
// Breacher Support Helicopter (Good Coms): moves one of your towers anywhere on the map.
// Not used by the game yet (kept for later).
const SUPPORT_HELI = { cost: 500, cooldown: 60, first: 25 };

// ---------------------------------------------------------------- wave 6 towers (Warship and friends)
// Golden Mobster units. Golden damage: they hit lead zombies. Not used by the game yet (kept for
// later): ignoreGoldResist on G_REAPER_2 (unit guns shoot bullets, not golden damage, so golden
// resistance never applies to them yet).
const G_ENFORCER = { name: 'Enforcer', model: 'goldmgoon', soldiers: 1, hp: 110, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 2, cooldown: 0.12, range: 15 } };
const G_ENFORCER_2 = { name: 'Enforcer 2', model: 'goldmgoon2', soldiers: 1, hp: 300, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 12, cooldown: 0.1, range: 22 } };
const G_ENFORCER_3 = { name: 'Enforcer 3', model: 'goldmgoon3', soldiers: 1, hp: 825, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 25, cooldown: 0.12, range: 23 } };
const G_REAPER = { name: 'Reaper', model: 'goldagent', soldiers: 1, hp: 275, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 200, cooldown: 2, range: 35 } };
const G_REAPER_2 = { name: 'Reaper 2', model: 'goldagent3', soldiers: 1, hp: 475, speed: 4, ram: true, flying: true, hidden: true, lead: true, ignoreGoldResist: true,
  gun: { damage: 425, cooldown: 1.5, range: 40 } };
// Golden Mobster Overload (timed self boost). ignoreGoldResist: for its first 18s it gets through golden resistance.
const OVERLOAD_AB = { key: 'overload', name: 'Overload', desc: 'For 40s it does 123% more damage', cooldown: 60, duration: 40, self: true, dmg: 2.23, ignoreGoldResist: 18 };
const gBounty = (pct, cap, cooldown) => ({ ...bountyAbility(pct, cap), cooldown });
// Golden Juggernaut Reboot Systems: works while stunned (abilities always do), unstuns it,
// repairs 2,000 health and +25% damage for 7s.
const REBOOT_AB = { key: 'overcharge', name: 'Reboot Systems', desc: 'Breaks any stun on it, repairs 2,000 health and gives +25% damage for 7s. Works while stunned', cooldown: 10, duration: 7, self: true, dmg: 1.25, heal: 2000, unstunSelf: true };
// Golden Ranger Grenade: stunAny = stuns bosses and stun-resistant zombies too.
const G_RANGER_NADE = { key: 'frag', name: 'Golden Ranger Grenade', desc: 'Throws a fire-and-shock grenade at its target: 350 damage within 4, a 1s stun (bosses too) and a 50/s burn for 5s', cooldown: 7, radius: 4, damage: 350,
  stun: 1, stunAny: true, burn: 50, burnTime: 5 };
// Golden Mine Layer Crossbow (aimed: the mine lands on the path nearest the spot) and Charged
// Throw (the toughest zombie on the map, flyers too: `damage` within `radius` plus `extra` to it).
const crossbowAb = (lvl, damage, radius, reach, cooldown) => ({ key: 'crossbow', name: `Crossbow ${lvl}`, aim: true, reach, cooldown,
  desc: `Shoot a ${damage.toLocaleString()}-damage golden mine onto the path at a spot within ${reach} studs. It waits 90s for a zombie`,
  mine: { damage, radius, life: 90 } });
const CHARGED_THROW_AB = { key: 'chargedThrow', name: 'Charged Throw', cooldown: 20, damage: 1250, extra: 4000, radius: 4, stun: 1, burn: 100, burnTime: 10,
  desc: 'Throws a mine at the toughest zombie on the map (flyers too): 1,250 damage within 4, 4,000 more to it, a 1s stun that works on bosses, and a 100/s burn for 10s' };
// Warship weapons (`missiles`: passive weapons, each on its own timer; see fireMissiles in sim.js).
// focus: every shell of a volley hits the same zombie. air: flying zombies only. flying: this
// weapon can hit flyers even though the ship's main guns can't.
const XL_HELLFIRE = { name: 'XL Hellfire Missiles', damage: 350, count: 1, every: 1, radius: 3 };
const MORTARS = { name: 'Mortars', damage: 225, count: 4, every: 5, radius: 3, focus: true };
const tomahawk = (damage) => ({ name: 'Tomahawk Missiles', damage, count: 1, every: 8, radius: 4 });
const aaGuns = (damage) => ({ name: 'AA Guns', damage, count: 1, every: 0.2, radius: 3, air: true });
const gHellfire = (damage) => ({ name: 'Golden Hellfire Missiles', damage, count: 1, every: 1.05, radius: 4.5 });
const GATLING_TURRET = { name: 'Gatling Turret', damage: 750, count: 1, every: 0.1, radius: 0.5, flying: true };
const GATLING_BATTERY = { name: 'Gatling Turrets', damage: 1200, count: 1, every: 0.16, radius: 0.5, flying: true };
const G_MORTARS = { name: 'Golden Mortars', damage: 2500, count: 5, every: 2, radius: 6, focus: true };
const GLOBAL_REVEAL_AB = { key: 'flare', name: 'Global Stealth Reveal', desc: 'Reveals every hidden zombie on the whole map for 20s so every tower can hit them', cooldown: 25, duration: 20, global: true };
// Shield Tower Unstun Field: frees stunned towers nearby (abilities work while it is stunned).
const unstunField = (lvl, cooldown, radius) => ({ key: 'unstun', name: `Unstun Field ${lvl}`, desc: 'Frees every stunned tower nearby, even while the Shield Tower is stunned', cooldown, radius });
// Combat Medic Medic Drone: click a spot; for `time` s it heals the `towers` most hurt towers
// within `radius` of it by `heal` per second.
const medDroneAb = (lvl, towers, heal, radius, cooldown) => ({ key: 'medDrone', name: `Medic Drone ${lvl}`, aim: true, cooldown, towers, heal, radius, time: 60,
  desc: `Send a Medic Drone to a spot: for 60s it heals ${towers} towers within ${radius} by ${heal}/s each` });
// Jet Trooper Fire Rounds: for `duration` s its bullets set zombies on fire.
const fireRoundsAb = (lvl, duration, burn, cooldown) => ({ key: 'fireRounds', name: `Fire Rounds ${lvl}`, self: true, duration, burn, burnTime: duration, cooldown,
  desc: `For ${duration}s its bullets set zombies on fire (${burn}/s for ${duration}s)` });
// Combat Drone abilities. Shield (barrier): immune to all attacks for `duration` s, clears stuns.
// Spotter: the toughest zombie in range takes `vuln` more damage and is `slow` slower for 10s (bosses: the boss* values).
const barrierAb = (lvl, duration) => ({ key: 'barrier', name: `Shield ${lvl}`, desc: `Immune to every attack for ${duration}s, and shakes off stuns`, cooldown: 30, duration });
const spotterAb = (lvl, vuln, slow, bossVuln, bossSlow) => ({ key: 'spotter', name: `Spotter ${lvl}`, cooldown: 30, duration: 10, vuln, slow, bossVuln, bossSlow,
  desc: `Marks the toughest zombie in range for 10s: it takes ${vuln * 100}% more damage and is ${slow * 100}% slower (bosses ${bossVuln * 100}% / ${bossSlow * 100}%)` });
const DRONE_FPS_AB = { ...FPS_AB, name: 'Direct Control', desc: 'Fly it yourself: WASD to move it anywhere on the map, aim with the mouse and hold click to shoot for 1.5x damage' };
// Void Traitor summons (Summon Troops, `caravan` units `gap` studs apart). Neurons and Void
// Tanks ram zombies; the Void Empress fights with her sword (gun) and Betraying Ward (cannon), and
// her ward is `defense` against contact damage.
const NEURON = { name: 'Neuron', model: 'voidneuron', hp: 2500, speed: 8, ram: true, flying: false };
const VOID_TANK = { name: 'Void Tank', model: 'voidtank', hp: 85000, speed: 3, ram: true, ramArmor: 0.45, flying: false };
const VOID_EMPRESS = { name: 'Void Empress', model: 'voidempress', soldiers: 1, hp: 50000, speed: 3, flying: false, hidden: true, lead: true, defense: 0.8,
  gun: { damage: 6000, cooldown: 6, range: 9 }, cannon: { damage: 250, every: 10, radius: 12, range: 12 } };
const VOID_RIFT_AB = { key: 'concussive', name: 'Void Rift', aim: true, reach: 60, radius: 4, delay: 1, count: 12, damage: 1500, stun: 0, cooldown: 85,
  desc: 'Opens a black hole over a spot within 60 studs that rains 12 rocks: 750 damage each in a small blast' };
const SUMMON_TROOPS_AB = { key: 'caravan', name: 'Summon Troops', cooldown: 180, gap: 1.2,
  units: [...Array(25).fill(NEURON), VOID_TANK, VOID_TANK, VOID_EMPRESS],
  desc: 'Sends 25 Neurons, 2 Void Tanks and a Void Empress down the path' };
const VOID_SLAM_AB = { key: 'voidSlam', name: 'Void Slam', damage: 12500, cooldown: 20, desc: 'Slams its sword on its current target for 6,250 damage' };

// ---------------------------------------------------------------- wave 7 towers (shared pieces)
// cyc: a burst tower's full cycle time: `burst` shots `gap` s apart, then `cd` s before the next burst.
const cyc = (burst, gap, cd) => Math.round(((burst - 1) * gap + cd) * 1000) / 1000;

const VINTAGE_FUZE_AB = { key: 'heatwave', name: 'Vintage Fuze', desc: 'A bomb blows up overhead: 150 damage to every zombie within 7 and sets them on fire (20/s for 4s). It also hurts the Rockety (50 damage)', cooldown: 30, damage: 150, burn: 20, burnTime: 4, radius: 7, knock: 0, selfDamage: 50 };
const HG_TANK = { name: 'Airdropped Tank', model: 'hgtank', hp: 350, speed: 3, flying: false, lead: true, gun: { damage: 80, cooldown: 3, range: 23 } };
const TANK_DROP_AB = { key: 'summon', name: 'Tank Airdrop', desc: 'A tank (350 HP, 145 damage every 3s) drops onto the path where you click', cooldown: 45, aim: true, radius: 4, drop: [{ unit: HG_TANK, n: 1 }] };

// Ducky Nest ducks. The Trojan Duck lets out 4 Ducky Gladiators when it goes down (onDeath); the
// Ducky Engineer builds a sentry at 75%, 50% and 25% of the way down the path (builds).
const DUCK_GLAD = { name: 'Ducky Gladiator', model: 'duckglad', soldiers: 1, hp: 45, speed: 4, flying: false, gun: { damage: 45, cooldown: 1, range: 3.5 } };
const DUCK_SENTRY = { name: 'Ducky Sentry', model: 'ducksentry', hp: 225, life: 60, speed: 0, still: true, flying: true, gun: { damage: 13, cooldown: 0.2, range: 21 } };
const DUCK = {
  scout: { name: 'Ducky Scout', model: 'duckscout', soldiers: 1, hp: 10, speed: 4, gun: { damage: 4, cooldown: 2.5, range: 9 } },
  soldier: { name: 'Ducky Soldier', model: 'ducksoldier', soldiers: 1, hp: 20, speed: 4, gun: { damage: 1, cooldown: 0.15, range: 12.5 } },
  rail: { name: 'Ducky Railgunner', model: 'duckrail', soldiers: 1, hp: 40, speed: 4, lead: true, gun: { damage: 150, cooldown: 5, range: 20, rail: true } },
  trojan: { name: 'Trojan Duck', model: 'ducktrojan', hp: 150, speed: 3, flying: false, onDeath: { unit: DUCK_GLAD, n: 4 } },
  eng: { name: 'Ducky Engineer', model: 'duckeng', soldiers: 1, hp: 30, speed: 4, flying: false, builds: { at: [0.75, 0.5, 0.25], unit: DUCK_SENTRY } },
};

const GHOST_MADNESS_AB = { key: 'ghostHands', name: 'Ghost Madness', desc: 'Spends its ghost charges: each ghost hand fires a revolver shot that bounces to 2 more zombies', cooldown: 30, bounces: 2, jump: 8, mult: 1 };
const OIL_BARREL_AB = { key: 'concussive', name: 'Oil Barrel', desc: 'Drop a barrel on the path where you click. 3s later it gets bombed 3 times (500 damage each)', cooldown: 45, aim: true, reach: 80, radius: 5, delay: 3, count: 3, damage: 500, stun: 0 };
const SEE_ME_AB = { key: 'seeMe', name: 'Now-You-See-Me', desc: 'A signal that gives it hidden detection for 25s', cooldown: 60, duration: 25 };
const NUKE_AB = { key: 'nuke', name: 'Nuke', desc: '22,500 damage to every zombie within 25 of its runway, no matter how many', cooldown: 150, damage: 12500, radius: 25 };
const DRONE_MODE_AB = { key: 'droneMode', name: 'Drone Mode', desc: 'Switch the drone to the next mode it has unlocked: Offense (bombs), Defense (heals towers, stun immunity), Support (+damage to towers nearby)', cooldown: 1 };

// Buccaneer pirate barrel crew (dropped on the middle of the path).
const CUTLASS = { name: 'Cutlass Pirate', model: 'cutlass', soldiers: 1, hp: 90, speed: 3.5, flying: false, gun: { damage: 210, cooldown: 1, range: 4 } };
const CORSAIR = { name: 'Corsair', model: 'corsair', soldiers: 1, hp: 40, speed: 3.5, hidden: true, gun: { damage: 105, cooldown: 2, range: 14 } };
const liveShowAb = (radius) => ({ key: 'liveShow', name: 'Live Show', desc: `For 15s zombies within ${radius} are slowed 60%, and you get 25% of the damage towers deal to them as cash`, cooldown: 60, duration: 15, radius, slow: 0.6, cash: 0.25 });

// Enforcement Base units (slowFire: they drive slower while they shoot).
const EB = {
  enf: { name: 'Enforcer', model: 'ebenforcer', soldiers: 1, hp: 20, speed: 4, gun: { damage: 5, cooldown: 0.5, range: 11.5 } },
  m: { name: 'Enforcer M', model: 'ebenforcerm', soldiers: 1, hp: 50, speed: 4, flying: false, gun: { damage: 25, cooldown: 0.75, range: 4 } },
  truck: { name: 'Turret Truck', model: 'ebtruck', hp: 375, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 10.5, cooldown: 0.1, range: 20 } },
  apm: { name: 'APM-Bot', model: 'ebapm', hp: 2250, speed: 3, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 24, cooldown: 0.1, range: 28 }, cannon: { damage: 200, every: 4, radius: 4 } },
};
const DIVE_AB = { key: 'dive', name: 'Dive', desc: 'Switch between Afloat (fast coastal missiles) and Submerged (slow nukes with a huge blast, hidden detection)', cooldown: 3 };
const shockMissileAb = (damage, stun) => ({ key: 'frag', name: 'Shock Missile', desc: `A missile at its target: ${damage} damage and a ${stun}s stun, even on bosses`, cooldown: 60, radius: 2, damage, stun, stunAny: true });
const sonar = (damage, every) => ({ name: 'Sonar Bombs', damage, count: 1, every, radius: 5, hidden: true, reveal: 4 });
const marauderHarpoon = (damage) => ({ key: 'harpoon', name: 'Harpoon', desc: `${damage.toLocaleString()} damage to the strongest zombie in range, a 3s stun (bosses too), and it takes 25% more damage for 5s. If that would kill it, it's reeled in instead`, cooldown: 45, damage, stun: 3, vuln: 0.25, vulnTime: 5, reel: 15 });
const bleed = (total, time) => ({ damage: Math.round((total / (time / 0.5)) * 100) / 100, tick: 0.5, time, slow: 0 });
const WIPEOUT_AB = { key: 'wipeout', name: 'Orbital Wipeout', desc: '60,000 damage split evenly among every zombie on the map, hidden ones too', cooldown: 120, damage: 60000 };
const JERICHO_AB = { key: 'wipeout', name: 'Jericho Missile', desc: 'A cluster missile that splits midair: 18,000 damage split among every zombie on the map', cooldown: 90, damage: 10000 };

// Void Port carts and trains (train: wagons that follow the locomotive).
const VP = {
  gunCart: { name: 'Gunner Cart', model: 'vgunner', hp: 100, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 5, cooldown: 0.2, range: 17 } },
  mortarCart: { name: 'Mortar Cart', model: 'vmortar', hp: 100, speed: 4, hidden: true, lead: true, flying: false, slowFire: true, cannon: { damage: 35, every: 2, radius: 3, range: 17 } },
  gunWagon: { name: 'Gun Wagon', model: 'vgunwagon', hp: 500, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 12, cooldown: 0.1, range: 20 } },
  mortarWagon: { name: 'Mortar Wagon', model: 'vmortarwagon', hp: 500, speed: 4, hidden: true, lead: true, flying: false, slowFire: true, cannon: { damage: 60, every: 1, radius: 3.5, range: 20 } },
  voidGun: { name: 'Void GWagon', model: 'vvoidgwagon', hp: 1000, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 20, cooldown: 0.1, range: 22 } },
  voidMortar: { name: 'Void Mortar', model: 'vvoidmortar', hp: 1000, speed: 4, hidden: true, lead: true, flying: false, slowFire: true, cannon: { damage: 150, every: 1, radius: 4, range: 22 } },
};
VP.loco = (train) => ({ name: 'Locomotive', model: 'vloco', hp: 750, speed: 4, hidden: true, lead: true, flying: true, train });
VP.voidLoco = (train) => ({ name: 'Void Loc', model: 'vvoidloco', hp: 1750, speed: 4, hidden: true, lead: true, flying: true, train });

const SKY_SLAM_AB = { key: 'heatwave', name: 'Sky Slam', desc: 'Leaps up and crashes down: 330 damage to every zombie within 20', cooldown: 35, damage: 1000, burn: 0, burnTime: 0, radius: 20, knock: 0 };
const RIFT_AB = { key: 'teleport', name: 'Rift', desc: 'Teleport to a spot within 100 studs and be stun immune for 20s', cooldown: 40, aim: true, radius: 0, reach: 100, damage: 0, knock: 0, immune: 20 };
const railgun = (max, damage, range, falloff = 0.1) => ({ max, damage, range, falloff });
const DROP_POINT_AB = { key: 'deploy', name: 'Set Drop Point', desc: 'Click the path: its units start from there', cooldown: 5, aim: true, radius: 4 };

// Valkyr mechs: `bump` is the melee damage per second to zombies they touch; `decay` is the air leak.
const MECH = {
  m1: { name: 'Mark 1', model: 'mech1', hp: 825, speed: 3, lead: true, flying: false, bump: 112, decay: 0.5 },
  m2: { name: 'Mark 2', model: 'mech2', hp: 1225, speed: 3, lead: true, flying: true, bump: 220, decay: 1, gun: { damage: 14, cooldown: 0.1, range: 15 } },
  m45: { name: 'Mark 4.5', model: 'mech45', hp: 2500, speed: 3, lead: true, flying: true, bump: 386, decay: 1.5, gun: { damage: 26.7, cooldown: 0.1, range: 16 } },
  m10: { name: 'Mark 10 Kaboom', model: 'mech10', hp: 4000, speed: 3, lead: true, flying: true, bump: 636, decay: 2, gun: { damage: 43, cooldown: 0.1, range: 18 }, cannon: { damage: 212, every: 2, radius: 4 } },
  ult: { name: 'Mark O-Ultimate', model: 'mechult', hp: 5750, speed: 3, lead: true, flying: true, bump: 1000, decay: 2.5, gun: { damage: 66, cooldown: 0.1, range: 20 }, cannon: { damage: 400, every: 2, radius: 5 } },
};

// Squadron jets fly over the path (air: zombies can't touch them) and leave after `life` s.
const PARATROOPER = { name: 'Paratrooper', model: 'jpara', soldiers: 1, hp: 100, speed: 3.5, gun: { damage: 15, cooldown: 0.166, range: 12 } };
const JET = {
  merlin: { name: 'Merlin', model: 'jmerlin', hp: 200, speed: 18, air: true, flying: true, hidden: true, lead: true, life: 10, gun: { damage: 125, cooldown: 0.25, range: 25 } },
  falcon: { name: 'Falcon', model: 'jfalcon', hp: 250, speed: 18, air: true, flying: true, hidden: true, lead: true, life: 10, gun: { damage: 450, burst: 5, burstGap: 0.2, cooldown: 5, range: 21, radius: 3 } },
  raptor: { name: 'Raptor', model: 'jraptor', hp: 200, speed: 18, air: true, flying: true, lead: true, life: 10, gun: { damage: 75, cooldown: 0.1, range: 25 } },
  hardpoint: { name: 'Hardpoint', model: 'jhardpoint', hp: 250, speed: 15, air: true, flying: true, lead: true, life: 12, gun: { damage: 1500, burst: 2, burstGap: 0.3, cooldown: 3, range: 40, radius: 5 } },
  airlifter: { name: 'Airlifter', model: 'jairlifter', hp: 1000000, speed: 12, air: true, flying: true, life: 5, summon: { every: 1.5, unit: PARATROOPER, pause: 0 } },
  tentative: { name: 'Tentative', model: 'jtentative', hp: 200000, speed: 10, air: true, flying: true, hidden: true, lead: true, life: 10, beam: { damage: 15000, every: 40, first: 3, range: 55 } },
};

const SPLASH_MOVE = { key: 'patrol', name: 'Relocation', desc: 'Fly it to a spot you click, anywhere on the map (longer trips take longer)', cooldown: 5, aim: true, radius: 5 };
const SPLASH_ALL = { ...SPLASH_MOVE, name: 'Total Relocation', desc: 'Fly every Splash you own to a spot you click', cooldown: 20, all: true };
const SCOPE_AB = { key: 'scope', name: 'Expanded Scope', desc: 'Make its flight circle bigger, or back to normal', cooldown: 3 };
const WRONG_WAY_AB = { key: 'reverse', name: 'Wrong Direction', desc: 'Fly the other way around the circle', cooldown: 1 };

// Punkbuster summons: `max` is how many of each it can have out at once.
const PUNK = {
  fragger: (n) => ({ name: 'Fragger', model: 'pfragger', soldiers: 1, hp: 60, speed: 4, lead: true, count: n, max: n, gun: { damage: 30, cooldown: 2, range: 10, radius: 3 } }),
  boogie: (n, reveal) => ({ name: 'Boogieman', model: 'pboogie', soldiers: 1, hp: 300, speed: 4, flying: false, count: n, max: n, gun: { damage: 60, cooldown: 1, range: 5 }, ...(reveal ? { reveal } : {}) }),
  rocketeer: (n, reveal) => ({ name: 'Rocketeer', model: 'procketeer', soldiers: 1, hp: 150, speed: 4, lead: true, count: n, max: n, gun: { damage: 120, cooldown: 2.5, range: 18, radius: 4 }, ...(reveal ? { reveal } : {}) }),
  nucleus: (reveal) => ({ name: 'Nucleus', model: 'pnucleus', soldiers: 1, hp: 2000, speed: 3, ram: true, flying: false, lead: true, max: 1, explode: { damage: 8000, radius: 10 }, reveal }),
};
const PUNK_REVEAL = { radius: 12, time: 5 };
const REDEPLOY_PUNK_AB = { ...DROP_POINT_AB, name: 'Redeploy', desc: 'Click the path: its summons get thrown there from now on' };

// Borealis planes fly the path from its waypoint and leave after `life` s.
const FESTIVE_TANK = { name: 'Festive Tank', model: 'bfestivetank', hp: 1550, speed: 3, flying: false, lead: true, life: 40, max: 4, cannon: { damage: 380, every: 2.5, radius: 4, range: 15 } };
const BOREAL = {
  breeze: { name: 'Breeze', model: 'bbreeze', hp: 100, speed: 16, air: true, flying: true, lead: true, life: 8, gun: { damage: 15, cooldown: 0.1, range: 15 } },
  ornament: { name: 'Ornament', model: 'bornament', hp: 150, speed: 16, air: true, flying: true, lead: true, life: 8, gun: { damage: 200, cooldown: 1.1, range: 15, radius: 4 } },
  northwind: { name: 'Northwind', model: 'bnorthwind', hp: 250, speed: 16, air: true, flying: true, lead: true, life: 8, gun: { damage: 25, cooldown: 0.08, range: 15 } },
  sleigh: { name: 'Sleigh', model: 'bsleigh', hp: 500, speed: 14, air: true, flying: true, lead: true, life: 8, healTowers: true, cannon: { damage: 300, every: 2, radius: 5, range: 15, stun: 1 } },
  fortress: { name: 'Festive Fortress', model: 'bfortress', hp: 1000, speed: 12, air: true, flying: true, lead: true, life: 8, cannon: { damage: 1650, every: 1.75, radius: 6, range: 15 }, summon: { every: 3, unit: FESTIVE_TANK, pause: 0 } },
};

export const TOWERS = {
  scout: {
    name: 'Scout',
    lead: 3,
    price: 0,
    cost: 150,
    limit: 10,
    blurb: 'Cheap starter tower. Shoots one zombie at a time with a small gun.',
    levels: [
      { name: 'Scout', desc: 'A cheap starter with a small gun.', damage: 1, cooldown: 1.0, range: 14, hidden: false },
      { name: 'Visibility', desc: 'Lets it see and shoot farther.', cost: 100, damage: 1, cooldown: 1.0, range: 19, hidden: false },
      { name: 'Higher Cal', desc: 'Doubles its damage per shot.', cost: 250, damage: 2, cooldown: 1.0, range: 19, hidden: false },
      { name: 'Highest Cal', desc: 'Doubles damage again and shoots a bit faster.', cost: 500, damage: 4, cooldown: 0.8, range: 19, hidden: false },
      { name: 'Secret Agent', desc: 'Can see hidden zombies, shoots almost twice as fast and gets a little more range.', cost: 1200, damage: 4, cooldown: 0.45, range: 22, hidden: true },
    ],
  },
  // ---------------------------------------------------------------- alternate forms
  // altOf: this is an alternate form of that tower, bought with Dimension Shards (`shards`) in
  // the Loadout screen. Equipping it swaps the base tower out of your loadout for this one.
  // form: the short name of the form ("Classic"), shown on the form tabs.
  scoutClassic: {
    name: 'Classic Scout',
    lead: 3,
    altOf: 'scout',
    form: 'Classic',
    shards: 1,
    price: 0,
    cost: 125,
    limit: 10,
    blurb: 'An alternate Scout with a small handgun. Even cheaper, and it sees hidden zombies from Lv 3. Its damage stays low, so it falls off late in the game.',
    tip: 'Place a few Lv 3 Classic Scouts early for cheap hidden detection, then push them to Lv 4-5 later, where they are better value. Great against weak hidden Ghouls while you save up; bring stronger towers for bosses.',
    levels: [
      { name: 'Classic Scout', desc: 'A cheap starter that shoots one zombie at a time with a small handgun.', damage: 1, cooldown: 1.0, range: 12, hidden: false },
      { name: 'Faster Reloading', desc: 'Shoots faster.', cost: 50, damage: 1, cooldown: 0.75, range: 12, hidden: false },
      { name: 'Precise Aiming', desc: 'More damage and range, and it can now see hidden zombies.', cost: 375, damage: 3, cooldown: 0.75, range: 14, hidden: true },
      { name: 'Stronger Equipment', desc: 'A big damage boost, more range and a bit faster shooting.', cost: 1350, damage: 8, cooldown: 0.65, range: 16, hidden: true },
      { name: 'Akimbo Handguns', desc: 'Gets two handguns and shoots about twice as fast.', cost: 2200, damage: 8, cooldown: 0.325, range: 16, hidden: true },
    ],
  },
  // Darter (free alternate Scout form): throws darts that fly to one zombie at a time.
  // fireDart: { chance, dps, time }: that share of darts set the zombie on fire.
  // shockDart: { chance, stun }: that share of darts are electric and stun the zombie, bosses too.
  scoutDarter: {
    name: 'Darter',
    altOf: 'scout',
    form: 'Darter',
    shards: 0,
    price: 0,
    cost: 300,
    limit: 10,
    fly: 28, // darts fly to the zombie
    blurb: 'A free alternate Scout that throws darts at one zombie at a time. Weak, but from Lv 3 it sees hidden zombies and some darts set zombies on fire, and at Lv 4 some darts are electric and briefly stun, even bosses. Good for very cheap early hidden detection; falls off past the early waves.',
    levels: [
      { name: 'Darter', desc: 'Throws darts at one zombie at a time.', damage: 2, cooldown: 2, range: 7, hidden: false },
      { name: 'Sharper Tips', desc: 'More damage and range.', cost: 250, damage: 3, cooldown: 2, range: 8, hidden: false },
      { name: 'Weighted Darts', desc: 'More damage and range.', cost: 350, damage: 5, cooldown: 2, range: 9, hidden: false },
      { name: 'Fire Darts', desc: 'More damage, throws faster, sees hidden zombies, and some darts set zombies on fire.', cost: 650, damage: 8, cooldown: 1.75, range: 9, hidden: true,
        fireDart: { chance: 0.25, dps: 3, time: 3 } },
      { name: 'Shock Darts', desc: 'More damage and range, throws much faster, and some darts are electric and briefly stun zombies, even bosses.', cost: 1050, damage: 11, cooldown: 1.25, range: 10.5, hidden: true,
        fireDart: { chance: 0.25, dps: 4, time: 3 }, shockDart: { chance: 0.2, stun: 0.5 } },
    ],
  },
  // Paintballer: the cheapest tower. Each paintball bursts on hit, splashing every zombie within
  // `radius` for full damage, up to `maxHits` zombies (the one it hit, then the closest ones).
  // paint: its blasts are drawn as colorful paint splats instead of explosions.
  paintballer: {
    name: 'Paintballer',
    price: 0,
    cost: 100,
    limit: 10,
    lob: 0.3,
    paint: true,
    blurb: 'The cheapest tower. Shoots paintballs that burst on hit, splashing up to 5 zombies for the same damage. Fast for a splash tower, but its damage is low. Can\'t hurt lead zombies.',
    tip: 'A few Lv 0 Paintballers can hold the first few waves. It gives very cheap hidden detection from Lv 1, but use towers like the Minigunner for Hidden Bosses.',
    levels: [
      { name: 'Paintballer', desc: 'Paintballs that splash up to 5 zombies for full damage.', damage: 1, cooldown: 1.7, range: 7.5, radius: 3, maxHits: 5, hidden: false },
      { name: 'Paintball Gear', desc: 'Hidden detection, more range and a bigger splash.', cost: 25, damage: 1, cooldown: 1.7, range: 9, radius: 3.5, maxHits: 5, hidden: true },
      { name: 'Shoulder Pads', desc: 'Double damage, fires faster and a bigger splash.', cost: 150, damage: 2, cooldown: 1.4, range: 9, radius: 4, maxHits: 5, hidden: true },
      { name: 'Double Barrel Gun', desc: 'A second barrel: fires twice as fast and hits harder.', cost: 600, damage: 3, cooldown: 0.7, range: 9, radius: 4, maxHits: 5, hidden: true },
      { name: 'Competitive Gear', desc: 'A big damage boost, more range and a bigger splash.', cost: 1500, damage: 8, cooldown: 0.7, range: 10.5, radius: 4.5, maxHits: 5, hidden: true },
      { name: 'Paintball Champion', desc: 'More than double damage and an even bigger splash.', cost: 3600, damage: 20, cooldown: 0.7, range: 10.5, radius: 5, maxHits: 5, hidden: true },
    ],
  },
  // income: cash paid to the owner every time a wave is cleared.
  // shared: can shoot any zombie inside the range of ANY Tweeter on the map (any owner).
  tweeter: {
    name: 'Tweeter',
    price: 0,
    cost: 325,
    limit: 8,
    blurb: 'Pistol shooter with a blue bird. From Lv 3 it earns extra cash every wave.',
    levels: [
      { name: 'Tweeter', desc: 'A pistol shooter with a blue bird on its shoulder.', damage: 2, cooldown: 1.25, range: 10.5, hidden: false },
      { name: 'Hater Shades', desc: 'More range, plus white gold-framed shades.', cost: 120, damage: 2, cooldown: 1.25, range: 14, hidden: false },
      { name: 'Stonk', desc: 'Earns $80 extra every wave. Holds a phone and wears a top hat.', cost: 420, damage: 2, cooldown: 1.25, range: 14, hidden: false, income: 80 },
      { name: 'Dual Wield', desc: 'A second pistol, so it shoots much faster and hits harder.', cost: 780, damage: 3, cooldown: 0.71, range: 14, hidden: false, income: 80 },
      { name: 'ChitChat', desc: 'Can shoot zombies inside the range of ANY other Tweeter on the map, and hits harder.', cost: 1850, damage: 5, cooldown: 0.71, range: 14, hidden: false, income: 80, shared: true },
    ],
  },
  // cash: every `every`th shot is a cash shot that pays the owner `pay`, then the tower twirls its
  //   gun for `spin` seconds without shooting (its cooldown is paused meanwhile).
  cowboy: {
    name: 'Cowboy',
    lead: false,
    flying: false,
    price: 900,
    cost: 550,
    limit: 12,
    blurb: "Shoots one ground zombie at a time and makes money: every few shots it fires a cash shot, then twirls its revolver for a moment. Can't hit lead or flying zombies, and only sees hidden ones from Lv 4.",
    tip: 'It can stand in for a Farm as a second money source while still fighting. It only sees hidden zombies from Lv 4, so bring other towers for early hidden waves.',
    levels: [
      { name: 'Cowboy', desc: 'A revolver that earns $30 with every 6th shot.', damage: 3, cooldown: 1, range: 13, hidden: false,
        cash: { every: 6, pay: 30, spin: 1 } },
      { name: 'Steady Hand', desc: 'Shoots faster, more range, and twirls its gun for less time.', cost: 200, damage: 3, cooldown: 0.9, range: 15, hidden: false,
        cash: { every: 6, pay: 30, spin: 0.35 } },
      { name: 'Lucky Shot', desc: 'More damage, and each cash shot pays more.', cost: 600, damage: 5, cooldown: 0.9, range: 15, hidden: false,
        cash: { every: 6, pay: 50, spin: 0.35 } },
      { name: 'Deadly Precision', desc: 'More range, damage and firerate, and it can now see hidden zombies.', cost: 2000, damage: 10, cooldown: 0.6, range: 17.5, hidden: true,
        cash: { every: 6, pay: 50, spin: 0.4 } },
      { name: 'Double Tap', desc: 'Shoots much faster with more range. Cash shots now come every 12th shot but pay a lot more.', cost: 3000, damage: 10, cooldown: 0.35, range: 20, hidden: true,
        cash: { every: 12, pay: 125, spin: 0.65 } },
      { name: 'Outlawed', desc: 'A big damage boost and the biggest cash shot payout.', cost: 7777, damage: 24, cooldown: 0.35, range: 20, hidden: true,
        cash: { every: 12, pay: 185, spin: 0.65 } },
    ],
  },
  // John: a cheap pistol shooter with two upgrade paths right away (see Pursuit).
  // stunImmune (on a level): can't be stunned from that level on.
  // rail: { damage, every, pass }: a passive railgun that shoots its target every `every` s and
  //       pierces `pass` more zombies behind it.
  // chop: { damage, every, targets, range }: every `every` s an axe hits up to `targets` zombies
  //       within `range`, hidden ones included.
  // ignoreBulletResist: its bullets get through bullet resistance (Expert mode).
  john: {
    name: 'John',
    event: 'Beat Medium mode', // win reward (see DIFFICULTIES unlock)
    price: 600,
    cost: 300,
    limit: 12,
    branch: 'johnBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "A cheap shooter with two upgrade paths right away, and very cost efficient early. Top path: a Desert Eagle that pierces lead, dual pistols, then John Rage, which sees hidden zombies and has Rage Mode to boost nearby towers' damage. Bottom path: an AK Shotgun that hits a cone of zombies, then the Slayer with a passive railgun and an axe. Only Top 5 sees hidden zombies.",
    tip: 'Spam a few early. Bring several Top 5 Johns so one Rage Mode is always ready. Put Bottom path Johns right next to the path on Last targeting.',
    levels: [
      { name: 'John', desc: 'A cheap shooter with a pistol.', damage: 2, cooldown: 1.1, range: 14, hp: 100, hidden: false },
      { name: 'Vest', path: 'Top', desc: 'Top path: more range and health, and shoots a bit faster.', cost: 125, damage: 2, cooldown: 1, range: 16, hp: 130, hidden: false },
      { name: '+P Ammo', path: 'Top', desc: 'More damage.', cost: 450, damage: 6, cooldown: 1, range: 16, hp: 130, hidden: false },
      { name: 'Desert Eagle', path: 'Top', desc: 'A big damage boost, and it ignores bullet resistance (hits lead zombies).', cost: 1400, damage: 18, cooldown: 1, range: 16, hp: 130, lead: true, ignoreBulletResist: true, hidden: false },
      { name: 'Deagles', path: 'Top', desc: 'Dual pistols: two shots at a time, much faster, and lots more health.', cost: 3250, damage: 18, burst: 2, burstGap: 0.12, cooldown: 0.5, range: 16, hp: 250, lead: true, ignoreBulletResist: true, hidden: false },
      { name: 'John Rage', path: 'Top', desc: "Hidden detection, more damage, range and speed, and Rage Mode: nearby towers deal 50% more damage for 8s. Loses ignore bullet resistance.", cost: 52500, damage: 25, burst: 2, burstGap: 0.08, cooldown: 0.2, range: 20, hp: 250, hidden: true,
        abilities: [RAGE_AB] },
    ],
  },
  // John's Bottom path (not in the shop: a John becomes this when you pick it).
  johnBottom: {
    name: 'John',
    branchOf: 'john',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 300,
    limit: 12,
    blurb: "John's Bottom path: a Chef who can't be stunned, then an AK Shotgun that blasts a cone of zombies, and the Slayer with a passive railgun and an axe that hits 8 zombies at once.",
    tip: 'Put it right next to the path on Last targeting so its shotgun cone and axe hit the most zombies. It never sees hidden zombies with its guns, but the axe hits them.',
    levels: [
      { name: 'John', desc: 'A cheap shooter with a pistol.', damage: 2, cooldown: 1.1, range: 14, hp: 100, hidden: false },
      { name: 'Visor Upgrade', path: 'Bottom', desc: 'Bottom path: more range.', cost: 100, damage: 2, cooldown: 1.1, range: 16, hp: 110, hidden: false },
      { name: 'Chef Knowledge', path: 'Bottom', desc: "Can't be stunned, a bit more damage and it shoots a bit faster.", cost: 225, damage: 3, cooldown: 1, range: 16, hp: 120, stunImmune: true, hidden: false },
      { name: 'AK Shotgun', path: 'Bottom', desc: 'Switches to a shotgun: much more damage, and every shot hits up to 3 zombies in a wide cone.', cost: 2000, damage: 11, splash: 11, extra: 2, cone: 0.5, cooldown: 0.8, range: 16, hp: 150, stunImmune: true, hidden: false },
      { name: 'AK Shotgun+', path: 'Bottom', desc: 'A big damage boost, faster shooting, lots more health, and it ignores bullet resistance (hits lead zombies).', cost: 5250, damage: 32, splash: 32, extra: 2, cone: 0.5, cooldown: 0.6, range: 16, hp: 300, stunImmune: true, lead: true, ignoreBulletResist: true, hidden: false },
      { name: 'Slayer', path: 'Bottom', desc: 'Shoots much faster at 4 zombies, plus a passive Railgun and an Axe Attack that hits up to 8 nearby zombies (even hidden ones) hard.', cost: 19000, damage: 37, splash: 37, extra: 3, cone: 0.55, cooldown: 0.25, range: 16, hp: 300, stunImmune: true, lead: true, ignoreBulletResist: true, hidden: false,
        rail: { damage: 300, every: 4, pass: 3 }, chop: { damage: 250, every: 5, targets: 8, range: 9 } },
    ],
  },
  soldier: {
    name: 'Soldier',
    lead: 4,
    price: 500,
    cost: 450,
    limit: 10,
    burstGap: 0.1,
    blurb: 'Fires an assault rifle in quick bursts. Cheap to upgrade; maxed Soldiers shred bosses.',
    levels: [
      { name: 'Soldier', desc: 'Fires quick 3-shot bursts at one zombie at a time.', damage: 1, burst: 3, cooldown: 1.75, range: 14, hidden: false },
      { name: 'Shades', desc: 'A little more range, plus black shades.', cost: 160, damage: 1, burst: 3, cooldown: 1.75, range: 16, hidden: false },
      { name: 'Radio', desc: 'A tiny bit more range, plus a headset.', cost: 240, damage: 1, burst: 3, cooldown: 1.75, range: 17, hidden: false },
      { name: 'Severe Training', desc: 'Doubles damage per shot and doubles each burst to 6 shots.', cost: 1050, damage: 2, burst: 6, cooldown: 2.16, range: 17, hidden: false },
      { name: 'Super Soldier', desc: 'Huge damage boost, 7 shots per burst and more range. Swaps to a laser gun.', cost: 3400, damage: 7, burst: 7, cooldown: 2.29, range: 18, hidden: false },
    ],
  },
  // burstGap can also be set per level (it overrides the tower's).
  soldierClassic: {
    name: 'Classic Soldier',
    lead: 4,
    altOf: 'soldier',
    form: 'Classic',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 10,
    blurb: 'An alternate Soldier with a rifle that fires in bursts. Cheaper and strong early, and sees hidden zombies from Lv 3. Each shot does little damage, so it falls off against tough late-game zombies.',
    tip: 'Lv 3 Classic Soldiers are strong early. Lv 4-5 ones can still handle mid-game waves.',
    levels: [
      { name: 'Classic Soldier', desc: 'Fires a rifle in quick 3-shot bursts.', damage: 1, burst: 3, burstGap: 0.175, cooldown: 1.025, range: 17, hidden: false },
      { name: 'Barracks Training', desc: 'Shoots faster, with a shorter pause between bursts.', cost: 100, damage: 1, burst: 3, burstGap: 0.15, cooldown: 0.85, range: 17, hidden: false },
      { name: 'Better Aiming', desc: 'More range and damage, one more shot per burst, and it can now see hidden zombies.', cost: 700, damage: 2, burst: 4, burstGap: 0.15, cooldown: 1.0, range: 19, hidden: true },
      { name: 'Equipment Upgrades', desc: 'More damage and twice as many shots per burst.', cost: 1850, damage: 4, burst: 8, burstGap: 0.15, cooldown: 1.6, range: 19, hidden: true },
      { name: 'Deadliest Soldier', desc: 'More damage and range, and even bigger bursts.', cost: 6000, damage: 10, burst: 12, burstGap: 0.15, cooldown: 2.2, range: 22, hidden: true },
    ],
  },
  // Ranger (alternate Soldier form with two paths, free: shards 0). Short rifle bursts.
  // Grenade (ability `frag`): an explosive blast centred on its best target in range.
  // m203.patch: the self-firing M203 lobs an incendiary that leaves a burning patch on the path
  //             (the same as Napalm / thermite): `burn`/s for `burnTime` s, lasting `time` s.
  soldierRanger: {
    name: 'Ranger',
    altOf: 'soldier',
    form: 'Ranger',
    shards: 0,
    price: 0,
    cost: 250,
    limit: 10,
    burstGap: 0.1,
    branch: 'soldierRangerBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "A free alternate Soldier with two upgrade paths right away. Fires its rifle in short bursts: cheap early defense. Top path: more bullets, hidden detection at Lv 3, then a nonstop LMG. Bottom path: hits lead zombies from Lv 3, then a Grenade ability and an incendiary M203 that clear crowds. Low health, and it can't see hidden zombies and hit lead ones at the same time.",
    tip: 'Cheap Rangers make good bait to soak up zombie attacks so your important towers survive.',
    levels: [
      { name: 'Ranger', desc: 'Fires its rifle in short 2-shot bursts.', damage: 1, burst: 2, cooldown: 1.75, range: 9, hp: 100, hidden: false },
      { name: 'Laser Sight', path: 'Top', desc: 'Top path: 1 more bullet per burst and more range.', cost: 165, damage: 1, burst: 3, cooldown: 1.75, range: 12, hp: 110, hidden: false },
      { name: 'Advanced Training', path: 'Top', desc: '1 more bullet per burst, more damage, reloads faster and a bit more range.', cost: 350, damage: 1.5, burst: 4, cooldown: 1.65, range: 13, hp: 135, hidden: false },
      { name: 'Stealth Sight', path: 'Top', desc: 'Sees hidden zombies, reloads much faster and 1 more bullet per burst.', cost: 750, damage: 1.5, burst: 5, cooldown: 1.25, range: 13, hp: 185, hidden: true },
      { name: 'Heavy Caliber', path: 'Top', desc: 'A big damage boost and more range.', cost: 2500, damage: 7.5, burst: 5, cooldown: 1.25, range: 15, hp: 205, hidden: true },
      { name: 'LMG', path: 'Top', desc: 'Switches from bursts to nonstop fire, with a big damage boost, more range and lots more health.', cost: 8750, damage: 16.5, cooldown: 0.15, range: 18, hp: 330, hidden: true },
    ],
  },
  // The Ranger's Bottom path (not in the shop: a Ranger becomes this when you pick it).
  soldierRangerBottom: {
    name: 'Ranger',
    branchOf: 'soldierRanger',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 250,
    limit: 10,
    burstGap: 0.1,
    blurb: "The Ranger's Bottom path: more damage, then Assault Loadout that hits lead zombies, the Grenade ability, and Direct Assault with an M203 that leaves burning fire on the path. It never sees hidden zombies.",
    tip: "Its grenades and fire pools clear crowds. Pair it with a tower that sees hidden zombies.",
    levels: [
      { name: 'Ranger', desc: 'Fires its rifle in short 2-shot bursts.', damage: 1, burst: 2, cooldown: 1.75, range: 9, hp: 100, hidden: false },
      { name: 'AP Ammo', path: 'Bottom', desc: 'Bottom path: more damage.', cost: 250, damage: 2.5, burst: 2, cooldown: 1.75, range: 9, hp: 110, hidden: false },
      { name: 'Internal Upgrades', path: 'Bottom', desc: 'Reloads faster and more range.', cost: 425, damage: 2.5, burst: 2, cooldown: 1.5, range: 11, hp: 135, hidden: false },
      { name: 'Assault Loadout', path: 'Bottom', desc: 'Ignores bullet resistance (hits lead zombies), more damage, reloads faster, 1 more bullet per burst and a bit more range.', cost: 1400, damage: 5.5, burst: 3, cooldown: 1.25, range: 12, hp: 235, lead: true, ignoreBulletResist: true, hidden: false },
      { name: 'Explosive Points', path: 'Bottom', desc: 'More damage, 3 more bullets per burst, more range, and the Grenade ability: 75 explosive damage to every zombie near its target.', cost: 2400, damage: 8.5, burst: 6, cooldown: 1.25, range: 14, hp: 295, lead: true, ignoreBulletResist: true, hidden: false,
        abilities: [{ key: 'frag', name: 'Grenade I', desc: 'Throws a grenade at its target: 75 damage to every zombie within 3', cooldown: 8, radius: 3, damage: 75 }] },
      { name: 'Direct Assault', path: 'Bottom', desc: 'A big damage boost, 1 more bullet per burst, lots more health, a stronger Grenade, and an M203 that fires an incendiary grenade every 10s, leaving fire on the path.', cost: 7250, damage: 15.5, burst: 7, cooldown: 1.25, range: 14, hp: 620, lead: true, ignoreBulletResist: true, hidden: false,
        m203: { name: 'M203 Incendiary', every: 10, damage: 0, radius: 3, patch: { time: 5, burn: 4, burnTime: 5 } },
        abilities: [{ key: 'frag', name: 'Grenade II', desc: 'Throws a grenade at its target: 100 damage to every zombie within 4', cooldown: 5, radius: 4, damage: 100 }] },
    ],
  },
  // Quarterer (alternate Soldier form): dual pistols. A burst is `burst` shots `burstGap` apart,
  // then a reload; `cooldown` is the whole cycle: (burst - 1) * burstGap + the reload.
  soldierQuarterer: {
    name: 'Quarterer',
    altOf: 'soldier',
    form: 'Quarterer',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 10,
    blurb: 'An alternate Soldier that dual-wields pistols: fast bursts of low-damage shots, then a pause to reload. Very short range but strong damage for its price, and solid boss damage for a cheap tower. Good at cleaning up zombies that slip past your front line. No hidden detection until Lv 3.',
    levels: [
      { name: 'Quarterer', desc: 'Fires quick 6-shot pistol bursts, then reloads.', damage: 1.5, burst: 6, burstGap: 0.35, cooldown: 4.45, range: 7, hidden: false },
      { name: 'Quick Hands', desc: 'More damage and faster shots.', cost: 200, damage: 2, burst: 6, burstGap: 0.275, cooldown: 4.075, range: 7, hidden: false },
      { name: 'Speed Loader', desc: 'More damage, faster shots and a quicker reload.', cost: 500, damage: 3, burst: 6, burstGap: 0.225, cooldown: 3.325, range: 7, hidden: false },
      { name: 'Extended Mags', desc: 'Sees hidden zombies, more damage and range, 9 shots per burst and a quicker reload.', cost: 1000, damage: 4, burst: 9, burstGap: 0.2, cooldown: 3.5, range: 9, hidden: true },
      { name: 'Drum Mags', desc: 'More damage, much faster shots and 16 shots per burst, but a longer reload.', cost: 2000, damage: 6, burst: 16, burstGap: 0.125, cooldown: 4.875, range: 9, hidden: true },
      { name: 'Bullet Storm', desc: 'More damage, very fast shots and a quicker reload.', cost: 3150, damage: 8, burst: 16, burstGap: 0.075, cooldown: 3.625, range: 9, hidden: true },
    ],
  },
  // Operator: a soldier with a semi-auto gun, two upgrade paths right away. Better value than the
  // Ranger. Bottom path abilities (key jeep / humvee / lav, `vehicle: true`) send `unit` from the
  // end of the path toward the entrance; vehicles shoot and crash into zombies on the way.
  // Not used by the game yet (kept for later): stunImmune on the LAV-25 unit def (nothing stuns units).
  operator: {
    name: 'Operator',
    price: 1250,
    cost: 450,
    limit: 10,
    branch: 'operatorBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "A soldier with a semi-auto gun that hits harder and is better value than the Ranger. Top path: faster shooting, hidden detection at Lv 3, then the huge-damage Ghost. Bottom path: burst fire and flying detection at Lv 3, and abilities that call in a Jeep, a Humvee and an LAV-25 that drive out and fight. No splash and it never hits lead zombies.",
    tip: 'The Top path is a great cheap start. One or two Bottom 5 Operators clean up leaks with their vehicles.',
    levels: [
      { name: 'Operator', desc: 'Fires a semi-auto gun at one zombie at a time.', damage: 1.5, cooldown: 0.4, range: 11, hp: 150, hidden: false },
      { name: 'Advanced Training', path: 'Top', desc: 'Top path: shoots a bit faster and more health.', cost: 125, damage: 1.5, cooldown: 0.35, range: 11, hp: 170, hidden: false },
      { name: 'Better Equipment', path: 'Top', desc: 'More range and health.', cost: 240, damage: 1.5, cooldown: 0.35, range: 14, hp: 200, hidden: false },
      { name: 'Assault Rifle', path: 'Top', desc: 'Sees hidden zombies, triple damage, shoots faster, more range and lots more health.', cost: 1000, damage: 4.5, cooldown: 0.3, range: 17, hp: 305, hidden: true },
      { name: 'Special Forces', path: 'Top', desc: 'More damage, much faster shooting, more range and lots more health.', cost: 3350, damage: 6, cooldown: 0.2, range: 20, hp: 555, hidden: true },
      { name: 'Ghost', path: 'Top', desc: 'A huge damage boost, shoots a bit faster, more range and much more health.', cost: 12750, damage: 28.5, cooldown: 0.18, range: 22, hp: 1255, hidden: true },
    ],
  },
  // The Operator's Bottom path (not in the shop: an Operator becomes this when you pick it).
  operatorBottom: {
    name: 'Operator',
    branchOf: 'operator',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 450,
    limit: 10,
    burstGap: 0.08,
    blurb: "The Operator's Bottom path: more damage, then burst fire with flying detection and abilities that send a Jeep, a Humvee and finally an LAV-25 down the path to shoot and ram zombies. It never sees hidden zombies.",
    tip: 'Save the vehicles for leaks: they drive from your base toward the entrance and catch what slipped through.',
    levels: [
      { name: 'Operator', desc: 'Fires a semi-auto gun at one zombie at a time.', damage: 1.5, cooldown: 0.4, range: 11, hp: 150, hidden: false },
      { name: 'Armor', path: 'Bottom', desc: 'Bottom path: double damage and more health.', cost: 275, damage: 3, cooldown: 0.4, range: 11, hp: 200, hidden: false },
      { name: 'UMP-45', path: 'Bottom', desc: 'More damage, a bit more range and health.', cost: 575, damage: 5, cooldown: 0.4, range: 12, hp: 225, hidden: false },
      { name: 'Jeep Support', path: 'Bottom', desc: 'Switches to 4-shot bursts, hits flying zombies, more damage and lots more health, but slower between bursts. Spawn Jeep: sends a 150 HP Jeep with a gun.', cost: 2000, damage: 6, burst: 4, cooldown: 0.65, range: 12, hp: 475, flying: true, hidden: false,
        abilities: [JEEP_AB] },
      { name: 'Humvee', path: 'Bottom', desc: 'More damage, range and health. Spawn Humvee: sends a 400 HP Humvee with a stronger gun.', cost: 7000, damage: 10, burst: 4, cooldown: 0.65, range: 14, hp: 925, flying: true, hidden: false,
        abilities: [JEEP_AB, HUMVEE_AB] },
      { name: 'X-Captain', path: 'Bottom', desc: "8-shot bursts, more damage, faster bursts, lots more health and it can't be stunned. Spawn LAV-25 replaces the Jeep: a 1,850 HP armored vehicle.", cost: 22000, damage: 12, burst: 8, cooldown: 0.5, range: 14, hp: 2225, flying: true, stunImmune: true, hidden: false,
        abilities: [LAV_AB, HUMVEE_AB] },
    ],
  },
  marksman: {
    name: 'Marksman',
    lead: 2,
    price: 1000,
    cost: 725,
    limit: 8,
    blurb: 'Long-range rifle. Slow, but hits hard. Sees hidden zombies from Lv 2.',
    levels: [
      { name: 'Marksman', desc: 'A long-range rifle that shoots slowly but hits hard.', damage: 4, cooldown: 1.86, range: 18.5, hidden: false },
      { name: 'Specs', desc: 'More range and hidden detection.', cost: 325, damage: 4, cooldown: 1.86, range: 23.5, hidden: true },
      { name: 'Headshot Practice', desc: 'Shoots faster and does a lot more damage per shot.', cost: 840, damage: 10, cooldown: 1.46, range: 23.5, hidden: true },
      { name: 'The Right Tools', desc: 'Doubles its damage with a new rifle.', cost: 2100, damage: 20, cooldown: 1.46, range: 23.5, hidden: true },
      { name: 'Cyber Hunter', desc: 'Massive damage boost and more range. Becomes a sci-fi bounty hunter with a pulse rifle.', cost: 7800, damage: 75, cooldown: 1.46, range: 28.5, hidden: true },
    ],
  },
  // aim: seconds it must aim at a new target before it starts shooting (resets when it has none).
  marksmanHunter: {
    name: 'Hunter',
    lead: true,
    altOf: 'marksman',
    form: 'Hunter',
    shards: 1,
    price: 0,
    cost: 1625,
    limit: 10,
    aim: 1.2,
    blurb: 'An alternate Marksman that fires slow but very strong shots from far away. It has to aim for a moment before it starts shooting. Sees hidden zombies from Lv 4, which costs a lot.',
    tip: 'Pair it with a Commander to make up for its slow firerate. Group several Hunters at bends so a Commander or DJ can boost them all.',
    levels: [
      { name: 'Hunter', desc: 'A slow, very strong long-range shot. Must aim before it starts shooting.', damage: 45, cooldown: 3.45, range: 22, hidden: false },
      { name: 'Quickscope', desc: 'Shoots faster.', cost: 725, damage: 45, cooldown: 2.45, range: 22, hidden: false },
      { name: "Survivalist's Kit", desc: 'A bit more range and a big damage boost.', cost: 2850, damage: 96, cooldown: 2.45, range: 24, hidden: false },
      { name: 'Sharp Shooter', desc: 'Shoots faster, more range and damage, and it can now see hidden zombies.', cost: 9400, damage: 156, cooldown: 2.1, range: 26, hidden: true },
      { name: 'Hunter In The Night', desc: 'Shoots faster again, with more range and much more damage.', cost: 20000, damage: 225, cooldown: 1.8, range: 27.5, hidden: true },
    ],
  },
  // Mercenary: a cheaper, earlier Commando with an assault rifle. ('mercenary' is the Mercenary Base.)
  merc: {
    name: 'Mercenary',
    price: 1000,
    cost: 850,
    limit: 8,
    blurb: 'Fires an assault rifle very fast at one zombie. A cheaper, earlier version of the Commando. Great value at Lv 1, solid again at Lv 5. Sees hidden zombies from Lv 3.',
    tip: 'Levels 2-4 are poor value: keep it at Lv 1, then save up for Lv 5. Let a Mortar or Plasma Trooper clear the weak zombies so it can focus the tough ones.',
    levels: [
      { name: 'Mercenary', desc: 'Fires an assault rifle very fast at one zombie at a time.', damage: 1, cooldown: 0.25, range: 12.5, hidden: false },
      { name: 'Lasers', desc: 'Laser sights for a lot more range.', cost: 200, damage: 1, cooldown: 0.25, range: 16, hidden: false },
      { name: 'Outside Support', desc: 'Can see hidden zombies, and more range.', cost: 560, damage: 1, cooldown: 0.25, range: 18, hidden: true },
      { name: 'Up-Skill', desc: 'Double damage and a little faster shooting.', cost: 1700, damage: 2, cooldown: 0.217, range: 18, hidden: true },
      { name: "World's Deadliest", desc: 'A big damage boost, even faster shooting and more range.', cost: 4750, damage: 5, cooldown: 0.166, range: 20, hidden: true },
    ],
  },
  // sellRatio: sells for 1/3 of what was spent instead of the usual GAME.sellRatio.
  mercMilitant: {
    name: 'Militant',
    lead: 3,
    altOf: 'merc',
    form: 'Militant',
    shards: 1,
    price: 0,
    cost: 600,
    limit: 8,
    flying: false,
    sellRatio: 1 / 3,
    blurb: 'An alternate Mercenary that fires a rifle very fast at one zombie from long range. Each bullet does little damage, but its upgrades boost it a lot (they are expensive). Sees hidden and flying zombies from Lv 2.',
    tip: 'Place several Lv 2 Militants early for cheap hidden and flying detection, then push them to Lv 4-5 later. Its low base damage means you need several maxed ones for tough late waves.',
    levels: [
      { name: 'Militant', desc: 'Fires a rifle very fast at one ground zombie at a time from long range.', damage: 1, cooldown: 0.225, range: 14, hidden: false },
      { name: 'Radio Comms', desc: 'Shoots faster, more range, and it can now see hidden zombies and hit flying ones.', cost: 300, damage: 1, cooldown: 0.175, range: 17, hidden: true, flying: true },
      { name: 'Field Ops', desc: 'Double damage.', cost: 850, damage: 2, cooldown: 0.175, range: 17, hidden: true, flying: true },
      { name: 'Guerrilla Tactics', desc: 'A bigger damage boost.', cost: 2750, damage: 5, cooldown: 0.175, range: 17, hidden: true, flying: true },
      { name: 'Stealth Mercenary', desc: 'More range and a big damage boost.', cost: 8000, damage: 12, cooldown: 0.175, range: 20, hidden: true, flying: true },
    ],
  },
  // Laser Gunner (alternate Mercenary form, two paths right away). Sees hidden zombies from the
  // start and its lasers hit lead zombies. Abilities: Shock Rounds (Top 4-5) and Stealth Sensor
  // (Bottom 3-5), see SHOCK_AB / sensorAbility. pass: piercing shots.
  // laser: laser damage (see damageKind; Expert mode Rushers and UFOs resist it, bullet-resistant enemies don't).
  mercLaser: {
    name: 'Laser Gunner',
    lead: true,
    flying: false,
    altOf: 'merc',
    form: 'Laser',
    shards: 2,
    price: 0,
    cost: 925,
    limit: 8,
    laser: true,
    branch: 'mercLaserBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Mercenary with two upgrade paths right away: a high-tech gunner with fast laser shots at one zombie at a time. Sees hidden zombies from the start, and its lasers hit lead zombies. Top path: big damage, piercing shots, Shock Rounds and the Laser Minigun. Bottom path: much faster shooting, flying detection from Lv 3 and the Stealth Sensor that reveals hidden zombies for good.",
    tip: 'The Top path clears crowds with piercing shots. Put Bottom path ones right next to the path so the Stealth Sensor reaches the zombies.',
    levels: [
      { name: 'Laser Gunner', desc: 'Fast laser shots at one zombie at a time. Sees hidden zombies.', damage: 6, cooldown: 0.7, range: 15, hp: 150, hidden: true },
      { name: 'Laser Knowledge', path: 'Top', desc: 'Top path: more damage, a bit more range and health.', cost: 475, damage: 8, cooldown: 0.7, range: 16, hp: 175, hidden: true },
      { name: 'Energy Cells', path: 'Top', desc: 'A big damage boost and more health.', cost: 1250, damage: 16, cooldown: 0.7, range: 16, hp: 225, hidden: true },
      { name: 'Laser BR', path: 'Top', desc: 'More damage and range, and shots pierce 1 extra zombie.', cost: 4750, damage: 23, cooldown: 0.7, range: 18, pass: 1, hp: 375, hidden: true },
      { name: 'Reinforced Tech', path: 'Top', desc: 'Lots more damage, shoots faster, more range, and unlocks Shock Rounds: 50% more damage and stunning shots for 12s.', cost: 6500, damage: 36, cooldown: 0.6, range: 21, pass: 1, hp: 650, hidden: true,
        abilities: [SHOCK_AB] },
      { name: 'Laser Minigun', path: 'Top', desc: 'Shoots three times as fast but each shot is weaker, a bit more range, shots pierce 1 more zombie, and lots more health.', cost: 28750, damage: 18, cooldown: 0.2, range: 22, pass: 2, hp: 2150, hidden: true,
        abilities: [SHOCK_AB] },
    ],
  },
  // The Laser Gunner's Bottom path (not in the shop: a Laser Gunner becomes this when you pick it).
  mercLaserBottom: {
    name: 'Laser Gunner',
    lead: true,
    flying: false,
    branchOf: 'mercLaser',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 925,
    limit: 8,
    laser: true,
    blurb: "The Laser Gunner's Bottom path: more range, then SMGs that shoot much faster, flying detection from Lv 3, and the Stealth Sensor: a shockwave that hurts nearby zombies and reveals hidden ones for good.",
    tip: 'The Stealth Sensor only reaches zombies close to it, so place it right next to the path.',
    levels: [
      { name: 'Laser Gunner', desc: 'Fast laser shots at one zombie at a time. Sees hidden zombies.', damage: 6, cooldown: 0.7, range: 15, hp: 150, hidden: true },
      { name: 'Upgraded Sensors', path: 'Bottom', desc: 'Bottom path: more range.', cost: 200, damage: 6, cooldown: 0.7, range: 18, hp: 165, hidden: true },
      { name: 'Advanced Tech', path: 'Bottom', desc: 'More damage and shoots faster.', cost: 525, damage: 8, cooldown: 0.6, range: 18, hp: 190, hidden: true },
      { name: 'SMG', path: 'Bottom', desc: 'Shoots almost twice as fast, hits flying zombies, and unlocks Stealth Sensor I (75 damage, reveals hidden zombies for good). A bit less range.', cost: 3850, damage: 9, cooldown: 0.33, range: 17, hp: 440, hidden: true, flying: true,
        abilities: [sensorAbility('I', 75, 12)] },
      { name: 'SMG+', path: 'Bottom', desc: 'More damage, shoots much faster, and Stealth Sensor II (175 damage, 10s cooldown).', cost: 8000, damage: 12, cooldown: 0.18, range: 17, hp: 740, hidden: true, flying: true,
        abilities: [sensorAbility('II', 175, 10)] },
      { name: 'Dual SMGs', path: 'Bottom', desc: 'Two SMGs: more damage, shoots even faster, and Stealth Sensor III (500 damage, 8s cooldown).', cost: 18000, damage: 13, cooldown: 0.1, range: 17, hp: 1740, hidden: true, flying: true,
        abilities: [sensorAbility('III', 500, 8)] },
    ],
  },
  // Unlimited placement (limit: Infinity). Lv 4 alternates between two miniguns.
  commando: {
    name: 'Commando',
    lead: 4,
    price: 1200,
    cost: 1850,
    limit: Infinity,
    blurb: 'Sprays super fast minigun shots at one zombie at a time from really long range. Place as many as you like. Ground only, no splash.',
    levels: [
      { name: 'Commando', desc: 'Sprays super fast minigun shots at one zombie at a time.', damage: 1, cooldown: 0.133, range: 22, hidden: false },
      { name: 'Handling', desc: 'Shoots a bit faster and gets more range.', cost: 950, damage: 1, cooldown: 0.116, range: 25, hidden: false },
      { name: 'Goggles', desc: 'Even more range, plus hidden detection.', cost: 990, damage: 1, cooldown: 0.116, range: 30, hidden: true },
      { name: 'Dual Wield', desc: 'Adds a second minigun, more than doubling its damage.', cost: 3300, damage: 1, cooldown: 0.05, range: 30, hidden: true },
      { name: 'Laser Wield', desc: 'Each shot does four times the damage, with a little more range.', cost: 12000, damage: 4, cooldown: 0.05, range: 31, hidden: true },
    ],
  },
  // rev: per level, seconds of spinning up on a target before it starts shooting. With no target in
  // range it spins back down just as fast, so it has to rev up again.
  commandoMinigunner: {
    name: 'Minigunner',
    lead: false,
    altOf: 'commando',
    form: 'Minigunner',
    shards: 1,
    price: 0,
    cost: 1850,
    limit: Infinity,
    blurb: 'An alternate Commando with a huge minigun that fires very fast at one zombie at a time. It has to rev up before shooting, and revs down again if zombies leave its range. Lots of damage for its price, and you can place as many as you like. Sees hidden zombies from Lv 2, but never lead ones.',
    tip: 'Place lots of them in a group near the start of the path or at corners, so they stay revved up. Get Lv 2 early for hidden waves.',
    levels: [
      { name: 'Minigunner', desc: 'A huge minigun that fires very fast. Has to rev up first.', damage: 2, cooldown: 0.15, range: 16, rev: 2.4, hidden: false },
      { name: 'Improved Handling', desc: 'Shoots faster, revs up quicker, and it can now see hidden zombies.', cost: 350, damage: 2, cooldown: 0.12, range: 16, rev: 1.8, hidden: true },
      { name: 'Specialized Tech', desc: 'More range and damage.', cost: 1500, damage: 3, cooldown: 0.12, range: 18, rev: 1.8, hidden: true },
      { name: 'Geared Up', desc: 'More damage, faster shooting and a quicker rev-up.', cost: 6500, damage: 7, cooldown: 0.1, range: 18, rev: 1.2, hidden: true },
      { name: 'Futuristic Armory', desc: 'A big damage boost and more range.', cost: 21500, damage: 16, cooldown: 0.1, range: 21, rev: 1.2, hidden: true },
    ],
  },
  // Juggernaut (alternate Commando form, two paths): a heavy minigunner. Top path HE Rounds and
  // Bottom path Overcharge are self boosts (see HE_AB). ignoreBulletResist: its bullets get through
  // bullet resistance (Expert mode).
  commandoJuggernaut: {
    name: 'Juggernaut',
    altOf: 'commando',
    form: 'Juggernaut',
    shards: 2,
    price: 0,
    cost: 6350,
    limit: 8,
    branch: 'commandoJuggernautBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Commando with two upgrade paths right away: a big minigun that sprays bullets super fast for huge damage. Strong mid-to-late game, but too expensive early. Top path: more speed and range, lead piercing at Lv 5 and HE Rounds that make its bullets explode. Bottom path: hidden detection at Lv 4, huge damage and Overcharge. Top path never sees hidden zombies; Bottom path never hits lead ones.",
    tip: 'Use Farms to afford it. Save HE Rounds for big crowded waves, because its cooldown is long.',
    levels: [
      { name: 'Juggernaut', desc: 'A big minigun that sprays bullets super fast.', damage: 6, cooldown: 0.1, range: 18, hp: 850, hidden: false },
      { name: 'Power Gloves', path: 'Top', desc: 'Top path: shoots a bit faster, with more range and health.', cost: 850, damage: 6, cooldown: 0.09, range: 19, hp: 950, hidden: false },
      { name: 'Joint Suppressors', path: 'Top', desc: 'Shoots a bit faster, more health.', cost: 1600, damage: 6, cooldown: 0.08, range: 19, hp: 1050, hidden: false },
      { name: 'Longer Barrel', path: 'Top', desc: 'More damage, range and health.', cost: 6250, damage: 11, cooldown: 0.08, range: 21, hp: 1200, hidden: false },
      { name: 'Power Minigun', path: 'Top', desc: 'Ignores bullet resistance (hits lead zombies), more damage and range, but a bit slower.', cost: 9000, damage: 15, cooldown: 0.09, range: 25, hp: 1200, lead: true, ignoreBulletResist: true, hidden: false },
      { name: 'Juggernaut', path: 'Top', desc: 'A big damage and range boost, and HE Rounds: 10s of exploding bullets with more damage and range.', cost: 26000, damage: 25, cooldown: 0.09, range: 29, hp: 1500, lead: true, ignoreBulletResist: true, hidden: false,
        abilities: [HE_AB] },
    ],
  },
  // The Juggernaut's Bottom path (not in the shop: a Juggernaut becomes this when you pick it).
  commandoJuggernautBottom: {
    name: 'Juggernaut',
    branchOf: 'commandoJuggernaut',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 6350,
    limit: 8,
    blurb: "The Juggernaut's Bottom path: more damage, dual guns with hidden detection, then Full Power: huge damage, can't be stunned and Overcharge. It never hits lead zombies.",
    tip: 'Pair it with towers that hit lead zombies. Full Power has to spin up before it fires, so put it where zombies stay in range.',
    levels: [
      { name: 'Juggernaut', desc: 'A big minigun that sprays bullets super fast.', damage: 6, cooldown: 0.1, range: 18, hp: 850, hidden: false },
      { name: 'Better Handling', path: 'Bottom', desc: 'Bottom path: more range.', cost: 600, damage: 6, cooldown: 0.1, range: 20, hp: 850, hidden: false },
      { name: 'AP Ammo', path: 'Bottom', desc: 'More damage.', cost: 3650, damage: 9, cooldown: 0.1, range: 20, hp: 950, hidden: false },
      { name: 'Dual Guns', path: 'Bottom', desc: 'Hidden detection, more damage and lots more health.', cost: 7500, damage: 14, cooldown: 0.1, range: 20, hp: 1300, hidden: true },
      { name: 'Cybernetic Pulse', path: 'Bottom', desc: 'A big damage boost.', cost: 14000, damage: 26, cooldown: 0.1, range: 20, hp: 1300, hidden: true },
      { name: 'Full Power', path: 'Bottom', desc: "Huge damage and can't be stunned, but it spins up before firing. Overcharge: more damage and range for 10s, and it repairs 2,000 health.", cost: 60000, damage: 64, cooldown: 0.1, range: 20, rev: 1.5, hp: 1600, stunImmune: true, hidden: true,
        abilities: [OVERCHARGE_AB] },
    ],
  },
  // Flies a plane in a circle of radius `orbit` around its runway, one lap every `lap` seconds.
  // range: how far from the PLANE its gun reaches. spy: towers inside the orbit borrow hidden detection.
  // bomb: { damage, count, every (s), radius } dropped under the plane.
  // missile: { damage, count, every (s), radius, range } exploding missiles fired at targets near the plane.
  aviator: {
    name: 'Aviator',
    lead: 3,
    price: 1000,
    cost: 850,
    limit: 4,
    placement: 'any',
    orbit: 15,
    lap: 11,
    blurb: 'Flies a plane in a big circle around its runway, shooting zombies right underneath it. From Lv 3, towers inside its ring can see hidden zombies.',
    levels: [
      { name: 'Aviator', desc: 'Flies a plane that shoots quick little shots at zombies right under it.', damage: 1, cooldown: 0.133, range: 6, hidden: false },
      { name: 'Bombs Away', desc: 'Drops a bomb every few seconds that hurts a small area, and its gun hits harder.', cost: 600, damage: 2, cooldown: 0.133, range: 6, hidden: false,
        bomb: { damage: 5, count: 1, every: 4, radius: 3.5 } },
      { name: 'Spy Plane', desc: 'Hidden detection, shared with every tower inside its ring, plus a bit more range.', cost: 1100, damage: 2, cooldown: 0.133, range: 7, hidden: true, spy: true,
        bomb: { damage: 5, count: 1, every: 4, radius: 3.5 } },
      { name: 'Rapid Fire', desc: 'A fighter jet that shoots faster and harder and drops 3 bigger bombs at once.', cost: 4000, damage: 4, cooldown: 0.1, range: 7, hidden: true, spy: true,
        bomb: { damage: 8, count: 3, every: 4, radius: 5 } },
      { name: 'Space Craft', desc: 'A stealth gunship: two exploding missiles every 2 seconds, much stronger bombs with a huge blast, and an even faster gun.', cost: 17500, damage: 4, cooldown: 0.066, range: 7, hidden: true, spy: true,
        bomb: { damage: 30, count: 2, every: 4, radius: 8 }, missile: { damage: 15, count: 2, every: 2, radius: 3.5, range: 22 } },
    ],
  },
  // Ace Pilot: a smaller, faster ring. Per-level `lap` overrides the tower's (flies faster).
  // The Toggle Reverse ability flips which way the plane circles.
  aviatorAce: {
    name: 'Ace Pilot',
    lead: 3,
    altOf: 'aviator',
    form: 'Ace',
    shards: 1,
    price: 0,
    cost: 500,
    limit: 8,
    orbit: 11,
    lap: 9,
    stunImmune: true,
    blurb: 'An alternate Aviator: a cheaper plane that circles a tight ring around its runway, shooting zombies under it. From Lv 2 it drops bombs, and from Lv 4 towers inside its ring can see hidden zombies. Can\'t be stunned.',
    tip: 'Place it at turns in the path, not on straight parts. Use Toggle Reverse to make it fly the same way the zombies walk around a turn.',
    levels: [
      { name: 'Ace Pilot', desc: 'A plane circling the runway with guns. Can\'t be stunned, and can fly the other way.', damage: 2, cooldown: 0.22, range: 9, hidden: false,
        abilities: [{ key: 'reverse', name: 'Toggle Reverse', desc: 'Fly the other way around the ring', cooldown: 1 }] },
      { name: 'Bombs Away!', desc: 'Its guns hit harder and it starts dropping bombs that hurt a small area.', cost: 850, damage: 4, cooldown: 0.22, range: 9, hidden: false,
        bomb: { damage: 10, count: 1, every: 3, radius: 3 },
        abilities: [{ key: 'reverse', name: 'Toggle Reverse', desc: 'Fly the other way around the ring', cooldown: 1 }] },
      { name: 'Aerial Ace', desc: 'Shoots faster, flies faster, a bit more range, and stronger bombs.', cost: 1500, damage: 5, cooldown: 0.15, range: 10, lap: 7.5, hidden: false,
        bomb: { damage: 30, count: 1, every: 3, radius: 3.5 },
        abilities: [{ key: 'reverse', name: 'Toggle Reverse', desc: 'Fly the other way around the ring', cooldown: 1 }] },
      { name: 'Spy Plane', desc: 'A stronger autocannon, bombs twice as often, and hidden detection shared with every tower inside its ring.', cost: 3000, damage: 8, cooldown: 0.15, range: 10, lap: 7.5, hidden: true, spy: true,
        bomb: { damage: 30, count: 1, every: 1.5, radius: 3.5 },
        abilities: [{ key: 'reverse', name: 'Toggle Reverse', desc: 'Fly the other way around the ring', cooldown: 1 }] },
      { name: 'The Surging Sky', desc: 'More damage, flies much faster, and drops bigger bombs more often.', cost: 7000, damage: 14, cooldown: 0.12, range: 10, lap: 6, hidden: true, spy: true,
        bomb: { damage: 45, count: 1, every: 1.2, radius: 4.5 },
        abilities: [{ key: 'reverse', name: 'Toggle Reverse', desc: 'Fly the other way around the ring', cooldown: 1 }] },
    ],
  },
  // Beam: locks onto one zombie and ticks every `cooldown` seconds. Damage per tick ramps from
  // `damage` to `maxDamage` over `ramp` seconds on the same target. After losing its target it
  // waits `retarget` seconds before firing again.
  phaser: {
    name: 'Phaser',
    lead: true,
    price: 2500,
    cost: 3200,
    limit: 6,
    retarget: 2.4,
    blurb: 'Locks a steady energy beam onto one zombie. The longer it stays on target, the harder it hits. Sees hidden zombies from the start. Melts bosses.',
    levels: [
      { name: 'Phaser', desc: 'A steady energy beam that ramps up damage on one target.', damage: 4, maxDamage: 20, ramp: 5, cooldown: 0.5, range: 23, hidden: true },
      { name: 'Handling', desc: 'A lot more range.', cost: 700, damage: 4, maxDamage: 20, ramp: 5, cooldown: 0.5, range: 31.5, hidden: true },
      { name: 'Extra Juice', desc: 'The beam ticks twice as fast, but the damage ramps up more slowly.', cost: 2600, damage: 4, maxDamage: 20, ramp: 8, cooldown: 0.25, range: 31.5, hidden: true },
      { name: 'Death Ray', desc: 'Much higher starting and max damage, and the ramp-up is fast again.', cost: 4900, damage: 10, maxDamage: 51, ramp: 4, cooldown: 0.25, range: 31.5, hidden: true },
      { name: 'Annihilation', desc: 'Roughly doubles its max damage again, ramps up even faster, and adds more range.', cost: 16600, damage: 15, maxDamage: 101, ramp: 3, cooldown: 0.25, range: 37, hidden: true },
    ],
  },
  // Accelerator (alternate Phaser form). Charges for `charge` seconds (only while a zombie is in
  // range), then fires a shot every `cooldown` seconds, locked onto one zombie, until it has dealt
  // `overcharge` damage. Then it cools down for `cool` seconds and charges again.
  phaserAccel: {
    name: 'Accelerator',
    lead: true,
    altOf: 'phaser',
    form: 'Accelerator',
    shards: 5,
    price: 0,
    cost: 7500,
    limit: 5,
    blurb: 'An alternate Phaser: an expensive late-game plasma gun. It charges up, then fires fast, powerful bursts locked onto one zombie until it reaches its overcharge limit, then cools down and repeats. Huge damage to one strong zombie at a time. Sees hidden zombies from Lv 2.',
    tip: 'A few Lv 3 Accelerators handle most mid-game waves for a good price. Its charge-up and cooldown let other zombies slip past, so pair it with towers that cover crowds. Use Farms, Cowboys or a DJ Booth discount to pay for its upgrades.',
    levels: [
      { name: 'Accelerator', desc: 'Charges up, then fires locked-on plasma bursts until it overcharges. Can hit lead zombies.', damage: 12, cooldown: 0.25, range: 19, charge: 5, cool: 2.5, overcharge: 300, hidden: false },
      { name: 'Extra Juice', desc: 'A little more damage, a higher overcharge limit, and hidden detection.', cost: 2000, damage: 15, cooldown: 0.25, range: 19, charge: 5, cool: 2.5, overcharge: 400, hidden: true },
      { name: 'Second Energy Canister', desc: 'More range and damage, a higher overcharge limit and a faster charge-up.', cost: 6000, damage: 25, cooldown: 0.25, range: 21, charge: 4, cool: 2.5, overcharge: 700, hidden: true },
      { name: 'Powerhouse Armor', desc: 'More damage, a higher overcharge limit and a much shorter cooldown.', cost: 9500, damage: 40, cooldown: 0.25, range: 21, charge: 4, cool: 1, overcharge: 1100, hidden: true },
      { name: 'Supercharger', desc: 'More range and damage, faster firing, a much higher overcharge limit and a quicker charge-up.', cost: 24500, damage: 50, cooldown: 0.175, range: 22.5, charge: 2.5, cool: 1, overcharge: 2000, hidden: true },
      { name: 'Vessel Of Infinite Destruction', desc: 'Even more range and damage, faster firing, double the overcharge limit and the quickest charge-up.', cost: 43500, damage: 60, cooldown: 0.125, range: 24, charge: 1.5, cool: 1, overcharge: 4000, hidden: true },
    ],
  },
  // Cliff tower: can only be placed on top of the rocky cliffs. Never detects hidden by itself
  // (it can borrow detection from a Lv 3+ Aviator).
  railgunner: {
    name: 'Railgunner',
    lead: true,
    price: 2200,
    cost: 2450,
    limit: 6,
    placement: 'cliff',
    blurb: 'Sits on a cliff and fires a very slow but very powerful shot from long range. Cliffs only. Can never see hidden zombies by itself.',
    levels: [
      { name: 'Railgunner', desc: 'A slow but very powerful long-range rail shot.', damage: 40, cooldown: 5.15, range: 32, hidden: false },
      { name: 'Faster Reloading', desc: 'Shortens the wait between shots.', cost: 650, damage: 40, cooldown: 3.87, range: 32, hidden: false },
      { name: 'Extra Juice', desc: 'More than doubles the damage of each shot.', cost: 2400, damage: 85, cooldown: 3.87, range: 32, hidden: false },
      { name: 'Sentry', desc: 'Sits at a mounted turret with much stronger shots and more range.', cost: 4800, damage: 150, cooldown: 3.87, range: 38, hidden: false },
      { name: 'Next Generation Warfare', desc: 'A huge heavy cannon with about three times the damage per shot and even more range.', cost: 18500, damage: 460, cooldown: 3.97, range: 46, hidden: false },
    ],
  },
  // radio: { boost, time, radius }: at the start of every wave, towers within `radius` get
  // +`boost` range for `time` seconds (not other Railgunners or Rangers).
  railgunnerRanger: {
    name: 'Ranger',
    lead: true,
    altOf: 'railgunner',
    form: 'Ranger',
    shards: 1,
    price: 0,
    cost: 4500,
    limit: 8,
    placement: 'cliff',
    stunImmune: true,
    blurb: 'An alternate Railgunner: an expensive cliff tower with huge range and huge damage per shot. It shoots one zombie at a time very slowly, so it is best against tough zombies, including flying and lead ones. Cliffs only. Can\'t be stunned, and can never see hidden zombies by itself.',
    tip: 'Check the map for good cliff spots before buying it, and save it for the mid-to-late game: it is too expensive early. Bring other towers for hordes, fast Runners and hidden zombies.',
    levels: [
      { name: 'Ranger', desc: 'A very slow, very strong shot from across the map. Can\'t be stunned.', damage: 100, cooldown: 6, range: 100, hidden: false },
      { name: 'Faster Reloading', desc: 'Shoots faster.', cost: 1500, damage: 100, cooldown: 4.75, range: 100, hidden: false },
      { name: 'Intelligence Radio', desc: 'More damage, and at the start of every wave it gives nearby towers +20% range for 20 seconds.', cost: 5500, damage: 185, cooldown: 4.75, range: 100, hidden: false,
        radio: { boost: 0.2, time: 20, radius: 20 } },
      { name: 'Trained Outlaw', desc: 'A big damage boost and slightly faster shooting.', cost: 15750, damage: 430, cooldown: 4.5, range: 100, hidden: false,
        radio: { boost: 0.2, time: 20, radius: 20 } },
      { name: 'Experimental Weapon of Destruction', desc: 'Huge damage and an Explosive Impact that hurts every zombie around the target, but shoots much slower.', cost: 25000, damage: 700, splash: 350, radius: 6, cooldown: 8, range: 100, hidden: false,
        radio: { boost: 0.2, time: 20, radius: 20 } },
    ],
  },

  // Laser Railgunner (alternate Railgunner form, two paths). Its laser shots hit lead zombies.
  // laser: laser damage (see damageKind; Expert mode Rushers and UFOs resist it, bullet-resistant enemies don't).
  railgunnerLaser: {
    name: 'Laser Railgunner',
    lead: true,
    flying: false,
    altOf: 'railgunner',
    form: 'Laser',
    shards: 2,
    price: 0,
    cost: 3250,
    limit: 6,
    laser: true,
    branch: 'railgunnerLaserBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Railgunner with two upgrade paths right away. Fires a powerful laser shot at one zombie, then reloads for a long time. Built for slow, tough zombies and bosses, and its lasers hit lead zombies. Top path: faster reloads, then the Rail Trooper with hidden and flying detection and piercing shots. Bottom path: huge damage, the Sentry, and the XRT-9000's giant shot. Weak against crowds and fast zombies. Bottom path never sees hidden or flying zombies.",
    tip: 'Use Farms to afford it and pair it with splash towers that clean up small zombies.',
    levels: [
      { name: 'Laser Railgunner', desc: 'A slow, powerful laser shot at one zombie.', damage: 50, cooldown: 5, range: 30, hp: 475, hidden: false },
      { name: 'Cooling Cells', path: 'Top', desc: 'Top path: reloads faster, a bit more range.', cost: 1050, damage: 50, cooldown: 4.25, range: 31, hp: 475, hidden: false },
      { name: 'Advanced Optics', path: 'Top', desc: 'Reloads faster, more range.', cost: 2500, damage: 50, cooldown: 3.5, range: 33, hp: 475, hidden: false },
      { name: 'Rail Trooper', path: 'Top', desc: 'Sees hidden zombies, hits flying ones, and lots more health.', cost: 6500, damage: 50, cooldown: 3.25, range: 34, hp: 800, flying: true, hidden: true },
      { name: 'Suited Up', path: 'Top', desc: 'A big damage boost, and shots pierce 1 extra zombie.', cost: 12000, damage: 150, cooldown: 3, range: 36, pass: 1, hp: 800, flying: true, hidden: true },
      { name: 'Super Rail Trooper', path: 'Top', desc: 'More damage and range, and it reloads much faster.', cost: 26000, damage: 250, cooldown: 2, range: 43, pass: 1, hp: 900, flying: true, hidden: true },
    ],
  },
  // The Laser Railgunner's Bottom path (not in the shop: it becomes this when you pick it).
  railgunnerLaserBottom: {
    name: 'Laser Railgunner',
    lead: true,
    flying: false,
    branchOf: 'railgunnerLaser',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 3250,
    limit: 6,
    laser: true,
    blurb: "The Laser Railgunner's Bottom path: much more damage, then the Sentry turret, Dual Barrels, and the XRT-9000 that aims about 10s before each enormous shot. It never sees hidden or flying zombies.",
    tip: 'The XRT-9000 is for bosses: one shot every 11 seconds or so, but it hits incredibly hard.',
    levels: [
      { name: 'Laser Railgunner', desc: 'A slow, powerful laser shot at one zombie.', damage: 50, cooldown: 5, range: 30, hp: 475, hidden: false },
      { name: 'Proto Ammo', path: 'Bottom', desc: 'Bottom path: more damage.', cost: 1850, damage: 125, cooldown: 5, range: 30, hp: 475, hidden: false },
      { name: 'Lightning Cells', path: 'Bottom', desc: 'More damage, a bit more range.', cost: 3200, damage: 225, cooldown: 5, range: 31, hp: 475, hidden: false },
      { name: 'Sentry', path: 'Bottom', desc: 'Becomes a big turret with much more damage and range, but it reloads slower.', cost: 8000, damage: 525, cooldown: 7, range: 39, hp: 700, hidden: false },
      { name: 'Dual Barrels', path: 'Bottom', desc: 'A huge damage boost and more range.', cost: 17000, damage: 910, cooldown: 6.5, range: 51, hp: 700, hidden: false },
      { name: 'XRT-9000', path: 'Bottom', desc: "A giant shot with enormous damage and range, and it can't be stunned, but it aims about 10s before each shot.", cost: 70000, damage: 7910, cooldown: 1, aimShot: 10, range: 71, hp: 900, stunImmune: true, hidden: false },
    ],
  },
  // ---------------------------------------------------------------- extra stats used below
  // radius: splash. Every zombie within `radius` of the impact takes `damage` (or `splash`
  //         if set; then only the zombie aimed at takes the full `damage`).
  // lob:    seconds the projectile flies before it lands (it aims where the zombie will be).
  // homing: the projectile follows its target instead of landing on a spot.
  // fly:    shots are physical projectiles flying at this speed (units/s, or a level's `speed`)
  //         that home in on the zombie and only hit it when they arrive (none if it died first).
  // stun / freeze: seconds the zombies hit can't move. Bosses only get `bossStop` of it.
  //         Freezers skip zombies that are already frozen.
  // burn / burnTime / cone: Flamethrower. Every `cooldown` it sprays a cone (half-angle in
  //         radians) that sets zombies on fire for `burnTime` seconds at `burn` damage per
  //         second. Burning zombies move `burnSlow` slower. Flames hurt hidden zombies too.
  // melee:  swings a weapon instead of shooting (no tracer).

  sniper: {
    name: 'Sniper',
    lead: 3,
    price: 100,
    cost: 400,
    limit: 8,
    placement: 'cliff',
    blurb: 'Sits on a cliff and takes slow, hard-hitting shots from very far away. Cliffs only. Best pushed all the way to Lv 5.',
    levels: [
      { name: 'Sniper', desc: 'A slow, hard-hitting shot from very far away.', damage: 4, cooldown: 3.1, range: 25, hidden: false },
      { name: 'Steady Aim', desc: 'Learns to hold still, so it can shoot much farther.', cost: 110, damage: 4, cooldown: 3.1, range: 31, hidden: false },
      { name: 'Spotter Scope', desc: 'Hidden detection, shoots faster and sees even farther.', cost: 420, damage: 4, cooldown: 2.6, range: 35, hidden: true },
      { name: 'Heavy Rounds', desc: 'Bigger bullets: triple damage per shot.', cost: 850, damage: 12, cooldown: 2.6, range: 35, hidden: true },
      { name: 'Ghost Sniper', desc: 'Huge damage boost, a bit faster and farther. Wears a leafy camo suit.', cost: 3600, damage: 38, cooldown: 2.45, range: 38, hidden: true },
    ],
  },
  // stunImmune: Anarchist fireworks (Versus) can't stun it.
  sniperClassic: {
    name: 'Classic Sniper',
    lead: true,
    altOf: 'sniper',
    form: 'Classic',
    shards: 1,
    price: 0,
    cost: 450,
    limit: 8,
    placement: 'cliff',
    stunImmune: true,
    blurb: 'An alternate Sniper that hits much harder per shot but reloads very slowly. Cliffs only. Can\'t be stunned, and sees hidden zombies from Lv 3. Struggles with big late waves and fast Runners.',
    tip: 'Even its early levels kill most early zombies in one shot. A Commander nearby makes it shoot faster.',
    levels: [
      { name: 'Classic Sniper', desc: 'Shoots one zombie at a time from very far away. Hits hard but reloads slowly.', damage: 10, cooldown: 5, range: 28, hidden: false },
      { name: 'Faster Reloading', desc: 'A little more damage and shoots faster.', cost: 200, damage: 12, cooldown: 4, range: 28, hidden: false },
      { name: 'Geared Up', desc: 'A big damage boost and more range, and it can now see hidden zombies.', cost: 750, damage: 25, cooldown: 4, range: 30, hidden: true },
      { name: 'Frontlines Sniping', desc: 'Much more damage and range.', cost: 2000, damage: 60, cooldown: 4, range: 35, hidden: true },
      { name: 'Spec Ops', desc: 'A huge range and damage boost, and it shoots faster.', cost: 5000, damage: 100, cooldown: 3.2, range: 45, hidden: true },
    ],
  },
  // Tactical Sniper (alternate Sniper form) with upgrade paths right after placing (see Pursuit).
  // pass:   each shot goes on through `pass` more zombies behind its target (full damage).
  // flare:  Flare Gun ability: hidden zombies inside the tower's range are revealed (every
  //         tower can hit them) for `duration` seconds.
  // stealth: enemies can't target it (see GAME.stealthTime).
  // hp: tower health (see GAME.towerHp). ignoreBulletResist: gets through bullet resistance;
  //         laser: laser damage (see damageKind).
  sniperTactical: {
    name: 'Tactical Sniper',
    altOf: 'sniper',
    form: 'Tactical',
    shards: 2,
    price: 0,
    cost: 500,
    limit: 8,
    placement: 'cliff',
    branch: 'sniperTacticalBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Sniper with two upgrade paths right away. Shoots one zombie at a time from very far away, reloads slowly but hits hard, and hits flying zombies from the start. Top path: cheap hidden detection at Lv 3, then piercing shots and AP Bullets. Bottom path: a faster reload, then Laser Eye's Flare Gun and the Laser Barrett. Its last levels are expensive.",
    tip: "Put it where its huge range covers the most map. The Bottom path's Flare Gun is great with towers that can't see hidden zombies.",
    levels: [
      { name: 'Tactical Sniper', desc: 'Shoots one zombie at a time from very far away. Reloads slowly but hits hard.', damage: 6, cooldown: 2.75, range: 26, hp: 100, hidden: false },
      { name: 'Advanced Training', path: 'Top', desc: 'Top path: faster reload, more range and a bit more health.', cost: 300, damage: 6, cooldown: 2, range: 30, hp: 125, hidden: false },
      { name: 'Enhanced Sight', path: 'Top', desc: 'Sees hidden zombies and gets more range.', cost: 425, damage: 6, cooldown: 2, range: 36, hp: 125, hidden: true },
      { name: 'Intervention', path: 'Top', desc: 'A big damage boost, faster reload and more range. Shots pierce 1 extra zombie.', cost: 2800, damage: 27, cooldown: 1.8, range: 41, pass: 1, hp: 125, hidden: true },
      { name: 'AP Bullets', path: 'Top', desc: 'More damage and range, ignores bullet resistance, and it turns stealthy so enemies can\'t target it. Reloads a bit slower.', cost: 3450, damage: 62, cooldown: 2.1, range: 44, pass: 1, hp: 125, ignoreBulletResist: true, stealth: true, hidden: true },
      { name: 'Pathfinder', path: 'Top', desc: 'A huge damage boost, lots more health, and shots pierce one more zombie, but it reloads a bit slower.', cost: 14250, damage: 192, cooldown: 2.7, range: 47, pass: 2, hp: 250, ignoreBulletResist: true, stealth: true, hidden: true },
    ],
  },
  // The Tactical Sniper's Bottom path (not in the shop: a Tactical Sniper becomes this when you pick it).
  sniperTacticalBottom: {
    name: 'Tactical Sniper',
    branchOf: 'sniperTactical',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 500,
    limit: 8,
    placement: 'cliff',
    blurb: "The Tactical Sniper's Bottom path: more damage, a much faster reload, then the Flare Gun to reveal hidden zombies and a Laser Barrett with enormous range.",
    tip: "It never sees hidden zombies itself: use Laser Eye's Flare Gun so it (and towers like the Patrol Boat) can hit them.",
    levels: [
      { name: 'Tactical Sniper', desc: 'Shoots one zombie at a time from very far away. Reloads slowly but hits hard.', damage: 6, cooldown: 2.75, range: 26, hp: 100, hidden: false },
      { name: 'High Velocity', path: 'Bottom', desc: 'Bottom path: a bit more damage and health.', cost: 300, damage: 10, cooldown: 2.75, range: 26, hp: 120, hidden: false },
      { name: '160 GR Bullet', path: 'Bottom', desc: 'More damage and health.', cost: 1250, damage: 22, cooldown: 2.75, range: 26, hp: 150, hidden: false },
      { name: 'Marksman', path: 'Bottom', desc: 'Much faster reload, more damage and range.', cost: 2850, damage: 27, cooldown: 1.75, range: 31, hp: 150, hidden: false },
      { name: 'Laser Eye', path: 'Bottom', desc: 'More damage, lots more range, and the Flare Gun: reveals hidden zombies in its range for 8s.', cost: 4350, damage: 45, cooldown: 1.75, range: 49, hp: 150, hidden: false,
        abilities: [FLARE_AB] },
      { name: 'Laser Barrett', path: 'Bottom', desc: 'A huge damage boost, switches to laser damage (good against armored zombies), much more range, and shots pierce 1 extra zombie.', cost: 17250, damage: 108, cooldown: 2, range: 71, pass: 1, hp: 150, laser: true, lead: true, hidden: false,
        abilities: [FLARE_AB] },
    ],
  },
  // Penetrator (alternate Sniper form): ground or cliff (placement 'any'). Slow, heavy shots.
  // pen: { pierce, falloff } on the ground: the shot hits `pierce` zombies in a line (its target
  //      first); each one after the first takes `falloff` less than the one before.
  // cliff: on a cliff top these fields replace the level's: more range, and pen: { ricochet,
  //      falloff, jump }: the shot hits its target, then ricochets to `ricochet` more zombies
  //      (each within `jump` of the last), losing `falloff` per hit.
  // flameShot: { every, dps, time }: every `every`th shot is a flaming arrow that sets every
  //      zombie it hits on fire (dps * time burn damage).
  sniperPenetrator: {
    name: 'Penetrator',
    lead: true,
    altOf: 'sniper',
    form: 'Penetrator',
    shards: 2,
    price: 0,
    cost: 575,
    limit: 8,
    placement: 'any',
    blurb: "An alternate Sniper that goes on the ground or a cliff. Fires slow, heavy shots that pierce through a line of zombies, losing some damage with each zombie hit. On the ground it pierces more zombies and loses less damage, but needs them lined up. On a cliff it gets 50% more range and its shots ricochet between zombies, which is more consistent. From Lv 1 it sees hidden zombies and every 3rd shot is a flaming arrow. Weak against fast swarms, because it fires very slowly.",
    levels: [
      { name: 'Penetrator', desc: 'A slow, heavy shot that pierces a line of zombies (ricochets on a cliff).', damage: 5, cooldown: 4, range: 9, hidden: false,
        pen: { pierce: 6, falloff: 0.2 }, cliff: { range: 13.5, pen: { ricochet: 3, falloff: 0.4, jump: 8 } } },
      { name: 'Flaming Arrows', desc: 'More damage, fires faster, sees hidden zombies, and every 3rd shot is a flaming arrow (36 burn damage).', cost: 450, damage: 9, cooldown: 3.5, range: 9, hidden: true,
        pen: { pierce: 6, falloff: 0.2 }, cliff: { range: 13.5, pen: { ricochet: 3, falloff: 0.4, jump: 8 } }, flameShot: { every: 3, dps: 6, time: 4 } },
      { name: 'Heavy Bolts', desc: 'Much more damage and range, fires faster, pierces 1 more zombie, loses less damage per zombie and ricochets once more. Hotter flaming arrows (72 burn).', cost: 1400, damage: 22, cooldown: 3.25, range: 10.5, hidden: true,
        pen: { pierce: 7, falloff: 0.15 }, cliff: { range: 15.75, pen: { ricochet: 4, falloff: 0.3, jump: 8 } }, flameShot: { every: 3, dps: 12, time: 4 } },
      { name: 'Longbow', desc: 'More damage and range and fires a bit faster. Hotter flaming arrows (136 burn).', cost: 3550, damage: 35, cooldown: 3.15, range: 12, hidden: true,
        pen: { pierce: 7, falloff: 0.15 }, cliff: { range: 18, pen: { ricochet: 4, falloff: 0.3, jump: 8 } }, flameShot: { every: 3, dps: 22.75, time: 4 } },
      { name: 'Siege Penetrator', desc: 'A big damage and range boost, fires faster, pierces 3 more zombies, loses less damage per zombie and ricochets once more. Hottest flaming arrows (212 burn).', cost: 6850, damage: 50, cooldown: 2.85, range: 14, hidden: true,
        pen: { pierce: 10, falloff: 0.1 }, cliff: { range: 21, pen: { ricochet: 5, falloff: 0.25, jump: 8 } }, flameShot: { every: 3, dps: 35, time: 4 } },
    ],
  },
  enforcer: {
    name: 'Enforcer',
    lead: 3,
    flying: false,
    price: 800,
    cost: 325,
    limit: 10,
    melee: true,
    bossStop: 0.5,
    blurb: 'A tough prison guard who whacks the closest zombie with a nightstick. Very short range, so put it right next to a corner of the path. From Lv 4 every hit stuns.',
    levels: [
      { name: 'Enforcer', desc: 'Whacks the closest zombie with a wooden nightstick.', damage: 3, cooldown: 1.0, range: 7.5, hidden: false },
      { name: 'Steel Nightstick', desc: 'A heavy steel nightstick: almost triple damage.', cost: 360, damage: 8, cooldown: 1.0, range: 7.5, hidden: false },
      { name: 'Cell Block Patrol', desc: 'A flashlight for dark cell blocks: hidden detection and faster swings.', cost: 750, damage: 8, cooldown: 0.75, range: 7.5, hidden: true },
      { name: 'Shock Baton', desc: 'An electric baton: every hit stuns the zombie, and hits much harder.', cost: 1600, damage: 18, cooldown: 0.75, range: 8, hidden: true, stun: 0.7 },
      { name: 'Lockdown', desc: 'Triple damage and longer stuns. Suits up in riot gear with a big riot shield.', cost: 4800, damage: 55, cooldown: 0.75, range: 8, hidden: true, stun: 1.1 },
    ],
  },
  // Warden (alternate Enforcer form). crit: every `every`th swing does `damage` instead, and stuns
  // for `stun` s (every swing stuns once a level sets `stunAll`). riot: blocks stuns; a block
  // gives `duration` s of double damage and stun immunity.
  enforcerWarden: {
    name: 'Warden',
    lead: 2,
    flying: false,
    altOf: 'enforcer',
    form: 'Warden',
    shards: 1,
    price: 0,
    cost: 1850,
    limit: 12,
    melee: true,
    bossStop: 0.5,
    blurb: 'An alternate Enforcer: the prison Warden hits one zombie at a time with a baton. Every third swing is a critical hit that does extra damage and stuns. Takes up little space and hits hard in the mid-game, but its short range makes it bad against big hordes.',
    tip: 'Place it at bends or turns in the path to get the most out of its short range. A DJ can give it more range, and a Commander helps against hordes.',
    levels: [
      { name: 'Warden', desc: 'Hits the closest zombie with a baton. Every third swing is a critical hit that stuns.', damage: 12, crit: { damage: 18, every: 3 }, stun: 0.5, cooldown: 0.6, range: 6.5, hidden: false },
      { name: 'Night Shift', desc: 'Hidden detection, plus a bit more range, damage and critical damage.', cost: 975, damage: 17, crit: { damage: 30, every: 3 }, stun: 0.5, cooldown: 0.6, range: 7, hidden: true },
      { name: 'Heavier Stick', desc: 'Lead detection, faster swings, harder hits and longer stuns.', cost: 1987, damage: 28, crit: { damage: 49, every: 3 }, stun: 0.75, cooldown: 0.55, range: 7, hidden: true },
      { name: 'Stunning Blows', desc: 'Swings even faster, and now every hit stuns, not just every third one.', cost: 5750, damage: 48, crit: { damage: 96, every: 3 }, stun: 0.75, stunAll: true, cooldown: 0.45, range: 7.5, hidden: true },
      { name: 'Class Foxtrot Defense Level', desc: 'Big damage and stun boost, plus a riot shield that blocks stuns. A block gives it double damage and stun immunity for 6 seconds.', cost: 16500, damage: 80, crit: { damage: 240, every: 3 }, stun: 1, stunAll: true, cooldown: 0.45, range: 8.5, hidden: true,
        riot: { duration: 6 } },
    ],
  },
  // Slammer (alternate Enforcer form, two paths): a melee hammer that hits up to `targets`
  // zombies per swing (stunning each one once a level has `stun`). noRangeBuff: support towers
  // can't boost its range.
  enforcerSlammer: {
    name: 'Slammer',
    lead: 3,
    flying: false,
    altOf: 'enforcer',
    form: 'Slammer',
    shards: 2,
    price: 0,
    cost: 325,
    limit: 10,
    melee: true,
    noRangeBuff: true,
    bossStop: 0.5,
    branch: 'enforcerSlammerBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Enforcer with two upgrade paths right away: smashes several zombies at once with a hammer. Her tiny range can't be boosted by support towers. Top path: huge hits that stun from Lv 4, and Grand Slam, which stuns almost anything, even bosses. Bottom path: faster swings and a Shock Hammer with hidden detection and longer stuns. Top path never sees hidden zombies.",
    tip: "Place her in path corners. Save Grand Slam for bosses and big crowds.",
    levels: [
      { name: 'Slammer', desc: 'Smashes up to 4 zombies at once with a hammer.', damage: 10, targets: 4, cooldown: 2.75, range: 6.5, hp: 125, hidden: false },
      { name: 'Heavy Weight', path: 'Top', desc: 'Top path: more damage.', cost: 225, damage: 15, targets: 4, cooldown: 2.75, range: 6.5, hp: 125, hidden: false },
      { name: 'Strength Training', path: 'Top', desc: 'More damage and health.', cost: 375, damage: 27, targets: 4, cooldown: 2.75, range: 6.5, hp: 160, hidden: false },
      { name: 'Slam Attack', path: 'Top', desc: "Much more damage, hits stun, 2 more targets, and she can't be stunned.", cost: 2100, damage: 92, stun: 0.75, targets: 6, cooldown: 2.75, range: 6.5, hp: 200, stunImmune: true, hidden: false },
      { name: 'Splash Damage', path: 'Top', desc: 'More damage, longer stuns, a bigger hit area and 4 more targets.', cost: 5750, damage: 172, stun: 1.25, targets: 10, cooldown: 2.75, range: 8, hp: 250, stunImmune: true, hidden: false },
      { name: 'Grand Slam', path: 'Top', desc: 'A huge boost, 4 more targets, faster swings, and Grand Slam: stuns every zombie nearby, even bosses and stun-immune ones, and sets them on fire.', cost: 26000, damage: 447, stun: 1.25, targets: 14, cooldown: 2.25, range: 8, hp: 350, stunImmune: true, hidden: false,
        abilities: [GRANDSLAM_AB] },
    ],
  },
  // The Slammer's Bottom path (not in the shop: a Slammer becomes this when you pick it).
  enforcerSlammerBottom: {
    name: 'Slammer',
    lead: 3,
    flying: false,
    branchOf: 'enforcerSlammer',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 325,
    limit: 10,
    melee: true,
    noRangeBuff: true,
    bossStop: 0.5,
    blurb: "The Slammer's Bottom path: faster swings, then a Shock Hammer that sees hidden zombies and stuns every zombie it hits, for longer and longer.",
    tip: 'Great at corners to hold crowds in place for your other towers.',
    levels: [
      { name: 'Slammer', desc: 'Smashes up to 4 zombies at once with a hammer.', damage: 10, targets: 4, cooldown: 2.75, range: 6.5, hp: 125, hidden: false },
      { name: 'Better Handling', path: 'Bottom', desc: 'Bottom path: a bit more damage and range, and faster swings.', cost: 250, damage: 14, targets: 4, cooldown: 2.65, range: 7, hp: 125, hidden: false },
      { name: 'Advanced Training', path: 'Bottom', desc: 'A bit more damage, faster swings.', cost: 450, damage: 18, targets: 4, cooldown: 2.45, range: 7, hp: 140, hidden: false },
      { name: 'Shock Hammer', path: 'Bottom', desc: 'Sees hidden zombies, more damage, and every hit stuns.', cost: 1800, damage: 38, stun: 0.5, targets: 4, cooldown: 2.25, range: 7, hp: 160, hidden: true },
      { name: 'Increased Batteries', path: 'Bottom', desc: "Longer stuns, more damage, and she can't be stunned.", cost: 3125, damage: 68, stun: 1, targets: 4, cooldown: 2.05, range: 7, hp: 200, stunImmune: true, hidden: true },
      { name: 'Maximum Charge', path: 'Bottom', desc: 'A big damage boost and even longer stuns.', cost: 12000, damage: 243, stun: 1.7, targets: 4, cooldown: 1.85, range: 7, hp: 250, stunImmune: true, hidden: true },
    ],
  },
  grenadier: {
    name: 'Grenadier',
    lead: true,
    price: 100,
    cost: 350,
    limit: 10,
    lob: 0.7,
    blurb: 'Throws grenades that hurt every zombie in the blast. Cheap crowd control; place it on a corner.',
    levels: [
      { name: 'Grenadier', desc: 'Throws grenades that hurt every zombie in a small blast.', damage: 2, cooldown: 2.7, range: 8, radius: 3, hidden: false },
      { name: 'More Powder', desc: 'A bigger blast.', cost: 140, damage: 2, cooldown: 2.7, range: 8, radius: 4.2, hidden: false },
      { name: 'Keen Eye', desc: 'Hidden detection and a little more range.', cost: 240, damage: 2, cooldown: 2.7, range: 9.5, radius: 4.2, hidden: true },
      { name: 'Double Pin', desc: 'Double grenade damage and throws a bit faster.', cost: 650, damage: 4, cooldown: 2.5, range: 9.5, radius: 4.2, hidden: true },
      { name: 'Demolitionist', desc: 'Throws sticks of dynamite: triple damage, faster, more range, bigger boom.', cost: 2150, damage: 12, cooldown: 2.0, range: 11, radius: 5, hidden: true },
    ],
  },
  // Per-level `lob` overrides the tower's flight time (faster grenades at Lv 4+).
  grenadierDemo: {
    name: 'Demo Expert',
    lead: true,
    altOf: 'grenadier',
    form: 'Demo',
    shards: 1,
    price: 0,
    cost: 700,
    limit: Infinity,
    lob: 0.9,
    blurb: 'An alternate Grenadier that throws slow, heavy grenades. Every zombie in the blast takes full damage. Place as many as you like. Sees hidden zombies from Lv 3. Weak against bosses and fast Runners, because its grenades are slow.',
    tip: 'Strong early to mid-game, and several of them can clear swarms late game. Use them to clean up the small zombies that bosses spawn.',
    levels: [
      { name: 'Demo Expert', desc: 'Throws slow exploding grenades that hurt every zombie in the blast.', damage: 8, cooldown: 2.6, range: 10, radius: 4.5, hidden: false },
      { name: 'Faster Throwing', desc: 'More range and throws faster.', cost: 300, damage: 8, cooldown: 1.9, range: 12, radius: 4.5, hidden: false },
      { name: 'Sticky Charges', desc: 'A big damage boost, a bigger blast, and it can now see hidden zombies.', cost: 950, damage: 18, cooldown: 1.9, range: 12, radius: 5, hidden: true },
      { name: 'Quick Loader', desc: 'More damage and range, throws faster, a bigger blast and faster grenades.', cost: 2400, damage: 25, cooldown: 1.5, range: 14, radius: 5.5, hidden: true, lob: 0.55 },
      { name: 'Heavy Ordnance', desc: 'More damage and range, and throws even faster.', cost: 5500, damage: 35, cooldown: 1.0, range: 16, radius: 5.5, hidden: true, lob: 0.55 },
    ],
  },
  // Assault Grenadier (alternate Grenadier with two paths). Every zombie in the blast takes full damage.
  // stun / stunTargets: the blast stuns up to `stunTargets` zombies in it (its target first) for
  //         `stun` s. Bosses get `bossStop` of it.
  // Stiel Grenade (ability `stiel`): throw a grenade at a spot you click: `damage` to everything
  //         within `radius`, and sets them on fire (`burn`/s for `burnTime` s).
  // Napalm Grenade (ability `napalm`): the same, plus a burning patch on the ground for `time` s.
  // hp: tower health (see GAME.towerHp). Not used by the game yet (kept for later):
  //   resistDown (Stiel Grenade: zombies it hits lose this much of their resistances).
  grenadierAssault: {
    name: 'Assault Grenadier',
    lead: true,
    altOf: 'grenadier',
    form: 'Assault',
    shards: 2,
    price: 0,
    cost: 550,
    limit: 10,
    lob: 0.7,
    bossStop: 0.5,
    branch: 'grenadierAssaultBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Grenadier with two upgrade paths right away. Throws grenades that hurt every zombie in a small blast. Strong early against crowds of weak zombies. Top path: faster throwing, hidden detection at Lv 3, then grenade abilities you aim yourself that set zombies on fire. Bottom path: bigger blasts, then grenades that stun up to 3-4 zombies. Weak against tough zombies like bosses; slow throwing and short range.",
    tip: "Use several with different targeting so the Bottom path's stuns spread out. A group of them at a chokepoint can keep zombies stunned.",
    levels: [
      { name: 'Assault Grenadier', desc: 'Throws grenades that hurt every zombie in a small blast.', damage: 5, cooldown: 3, range: 10, radius: 2.5, hp: 100, hidden: false },
      { name: 'Advanced Training', path: 'Top', desc: 'Top path: throws faster, with a bit more range and health.', cost: 150, damage: 5, cooldown: 2.5, range: 11, radius: 2.5, hp: 115, hidden: false },
      { name: 'Grenade Knowledge', path: 'Top', desc: 'Throws faster, a little more damage and a bigger blast.', cost: 450, damage: 7, cooldown: 2, range: 11, radius: 3, hp: 115, hidden: false },
      { name: 'Sensor Upgrades', path: 'Top', desc: 'Sees hidden zombies, more damage and range.', cost: 1600, damage: 17, cooldown: 2, range: 13, radius: 3, hp: 115, hidden: true },
      { name: 'Stiel Grenade', path: 'Top', desc: 'Much more damage and health, and the Stiel Grenade: throw a grenade anywhere that sets zombies on fire and lowers their resistances.', cost: 3500, damage: 49, cooldown: 2, range: 14, radius: 3, hp: 175, hidden: true,
        abilities: [{ key: 'stiel', name: 'Stiel Grenade', desc: 'Throw it where you click: 60 damage and sets zombies on fire (15/s for 4s)', cooldown: 25, aim: true, damage: 60, radius: 5, burn: 15, burnTime: 4, resistDown: 0.25 }] },
      { name: 'X13-Flash', path: 'Top', desc: 'A huge damage boost, lots more health, a stronger Stiel Grenade, and the Napalm Grenade: leaves a patch of fire on the ground.', cost: 12000, damage: 165, cooldown: 2, range: 15, radius: 3, hp: 275, hidden: true,
        abilities: [
          { key: 'stiel', name: 'Stiel Grenade', desc: 'Throw it where you click: 180 damage and sets zombies on fire (40/s for 4s)', cooldown: 25, aim: true, damage: 180, radius: 5, burn: 40, burnTime: 4, resistDown: 0.25 },
          { key: 'napalm', name: 'Napalm Grenade', desc: 'Throw it where you click: 100 damage and a fire patch for 8s (60/s burn)', cooldown: 40, aim: true, damage: 100, radius: 5.5, time: 8, burn: 60, burnTime: 2 },
        ] },
    ],
  },
  // The Assault Grenadier's Bottom path (not in the shop: an Assault Grenadier becomes this when you pick it).
  grenadierAssaultBottom: {
    name: 'Assault Grenadier',
    lead: true,
    branchOf: 'grenadierAssault',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 550,
    limit: 10,
    lob: 0.7,
    bossStop: 0.5,
    blurb: "The Assault Grenadier's Bottom path: more damage and bigger blasts, then Stun Explosives that stun up to 3 zombies (4 from Lv 4), and the Shock Trooper with hidden detection.",
    tip: "It can't see hidden zombies until Lv 5: pair it with a tower that does, or a Tactical Sniper's Flare Gun. Bosses only get half the stun.",
    levels: [
      { name: 'Assault Grenadier', desc: 'Throws grenades that hurt every zombie in a small blast.', damage: 5, cooldown: 3, range: 10, radius: 2.5, hp: 100, hidden: false },
      { name: 'HE Grenades', path: 'Bottom', desc: 'Bottom path: more damage and a bigger blast.', cost: 350, damage: 9, cooldown: 3, range: 10, radius: 3, hp: 100, hidden: false },
      { name: 'Extra Shrapnel', path: 'Bottom', desc: 'More damage and range.', cost: 750, damage: 17, cooldown: 3, range: 11, radius: 3, hp: 100, hidden: false },
      { name: 'Stun Explosive', path: 'Bottom', desc: 'Grenades stun up to 3 zombies for a moment, and more damage and range, but it throws slower.', cost: 2250, damage: 40, cooldown: 3.5, range: 13, radius: 3, stun: 0.25, stunTargets: 3, hp: 100, hidden: false },
      { name: 'Advanced Shocks', path: 'Bottom', desc: 'Longer stuns, 1 more zombie stunned, more damage and a bigger blast.', cost: 5250, damage: 80, cooldown: 3.5, range: 14, radius: 3.5, stun: 0.5, stunTargets: 4, hp: 100, hidden: false },
      { name: 'Shock Trooper', path: 'Bottom', desc: 'A huge damage boost, longer stuns, more range, and it can now see hidden zombies.', cost: 17250, damage: 220, cooldown: 3.5, range: 16, radius: 3.5, stun: 1, stunTargets: 4, hp: 100, hidden: true },
    ],
  },
  // Firecracker (free alternate Grenadier form). throws: firecrackers per throw, each lobbed at a
  // different zombie (doubling up if there are few). The damage is per firecracker.
  grenadierFirecracker: {
    name: 'Firecracker',
    lead: true,
    altOf: 'grenadier',
    form: 'Firecracker',
    shards: 0,
    price: 0,
    cost: 300,
    limit: 10,
    lob: 0.6,
    blurb: 'A free alternate Grenadier that throws firecrackers that explode in a small area. From Lv 3 it throws 2 at once, and 3 at Lv 5; the damage is per firecracker. Its damage is explosive, so it hurts lead zombies. Good against crowds of weak zombies; loses most of its use on Medium and up. Never sees hidden zombies.',
    levels: [
      { name: 'Firecracker', desc: 'Throws a firecracker that explodes in a small area.', damage: 3, cooldown: 3.5, range: 4, radius: 2.25, hidden: false },
      { name: 'Bigger Bangs', desc: 'Double damage and throws a bit faster.', cost: 355, damage: 6, cooldown: 3.25, range: 4, radius: 2.25, hidden: false },
      { name: 'Quick Fuse', desc: 'More damage, throws faster, more range and a bigger blast.', cost: 525, damage: 8, cooldown: 2.5, range: 4.5, radius: 2.5, hidden: false },
      { name: 'Double Pack', desc: 'Throws 2 firecrackers at once, with more range and a bigger blast, but throws a bit slower.', cost: 825, damage: 8, cooldown: 2.925, range: 5.25, radius: 3, throws: 2, hidden: false },
      { name: 'Short Fuse', desc: 'More damage and throws faster.', cost: 1050, damage: 9, cooldown: 2.175, range: 5.25, radius: 3, throws: 2, hidden: false },
      { name: 'Grand Finale', desc: 'Throws 3 firecrackers at once, with more damage, range and a bigger blast.', cost: 1745, damage: 10, cooldown: 2.175, range: 5.75, radius: 3.5, throws: 3, hidden: false },
    ],
  },
  frost: {
    name: 'Frost Trooper',
    price: 400,
    cost: 200,
    limit: 8,
    bossStop: 0.3,
    blurb: 'Freezes small groups of zombies in place so your other towers get more time. No damage until Lv 3. Can never see hidden zombies.',
    levels: [
      { name: 'Frost Trooper', desc: 'An ice blast that freezes zombies in a small area.', damage: 0, cooldown: 2.8, range: 8, radius: 1.5, freeze: 1.5, hidden: false },
      { name: 'Deep Freeze', desc: 'Zombies stay frozen more than twice as long.', cost: 200, damage: 0, cooldown: 2.8, range: 8, radius: 1.5, freeze: 3.5, hidden: false },
      { name: 'Frostbite', desc: 'The ice blast now hurts too.', cost: 500, damage: 2, cooldown: 2.8, range: 8, radius: 1.5, freeze: 3.5, hidden: false },
      { name: 'Cryo Core', desc: 'More damage, more range, a bigger blast and longer freezes.', cost: 850, damage: 3, cooldown: 2.8, range: 10, radius: 1.8, freeze: 4.5, hidden: false },
      { name: 'Blizzard', desc: 'A giant freezing blast with the longest freeze and more damage.', cost: 4100, damage: 5, cooldown: 2.8, range: 11, radius: 5, freeze: 6, hidden: false },
    ],
  },
  // chill: Freezer. Each hit adds this much chill (1 = full). Chill slows up to `maxSlow` (bosses
  //        half as much) and hurts `chillDps` per second; it wears off `chillTime` seconds after
  //        the last hit. chillFreeze: a fully chilled zombie freezes this long (never bosses).
  frostFreezer: {
    name: 'Freezer',
    lead: 4,
    altOf: 'frost',
    form: 'Freezer',
    shards: 1,
    price: 0,
    cost: 450,
    limit: Infinity,
    blurb: 'An alternate Frost Trooper that fires a Frost Ray at one zombie. Every hit chills it, slowing it more and more. From Lv 3 it sees hidden zombies, and fully chilled zombies freeze solid. Place as many as you like. Bosses slow less and never freeze.',
    tip: 'Several cheap Freezers work well early. Many Lv 4-5 Freezers can slow down a whole wave.',
    levels: [
      { name: 'Freezer', desc: 'A Frost Ray that chills one zombie, slowing it up to 15%.', damage: 2, cooldown: 0.55, range: 12, hidden: false,
        chill: 0.1, chillTime: 2, maxSlow: 0.15, chillDps: 0 },
      { name: 'Expedition Gear', desc: 'Shoots faster and slows zombies more.', cost: 300, damage: 2, cooldown: 0.35, range: 12, hidden: false,
        chill: 0.1, chillTime: 2, maxSlow: 0.2, chillDps: 0 },
      { name: 'Bundled Up!', desc: 'More damage and range, hidden detection, and fully chilled zombies now freeze.', cost: 450, damage: 3, cooldown: 0.35, range: 14, hidden: true,
        chill: 0.1, chillTime: 2, maxSlow: 0.2, chillDps: 0, chillFreeze: 0.5 },
      { name: 'Arctic Soldier', desc: 'Fires 6-shot bursts, slows more for longer, and the chill now hurts.', cost: 1700, damage: 4, burst: 6, burstGap: 0.15, cooldown: 1.26, range: 14, hidden: true,
        chill: 0.1, chillTime: 3, maxSlow: 0.25, chillDps: 3, chillFreeze: 0.5 },
      { name: 'Glacier Arrow', desc: 'More damage, chill damage and range, 8-shot bursts, longer freezes, and the Frost Grenade ability.', cost: 4500, damage: 9, burst: 8, burstGap: 0.15, cooldown: 1.6, range: 16, hidden: true,
        chill: 0.1, chillTime: 3, maxSlow: 0.25, chillDps: 6, chillFreeze: 0.75,
        abilities: [{ key: 'frostNade', name: 'Frost Grenade', desc: 'Freezes up to 5 zombies in range for 2s', cooldown: 30, count: 5, duration: 2 }] },
    ],
  },
  // Cryo Ranger (alternate Sleeter with two paths). Short bursts of icy bullets that build
  // up chill (see Freezer) until the zombie freezes for `chillFreeze` s.
  // freezeBoss:  bosses can be frozen too, for this fraction of the time.
  // frostbite:   a zombie this tower freezes stays this much slower for good.
  // frozenVuln:  zombies this tower freezes take this much extra damage while frozen.
  // m203:        every `every` s (while shooting) lobs a grenade at its target that freezes
  //              everything within `radius` for `freeze` s and deals `damage`.
  // Cryo Grenade (ability): the same kind of blast, centred on its best target in range.
  // ignoreIceResist (from Lv 3 Bottom): ice-resistant zombies get frozen and chilled normally.
  frostRanger: {
    name: 'Cryo Ranger',
    lead: true,
    altOf: 'sleeter',
    form: 'Ranger',
    shards: 2,
    price: 0,
    cost: 425,
    limit: 8,
    branch: 'frostRangerBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Sleeter with two upgrade paths right away. Shoots short bursts of icy bullets that build up chill until zombies freeze in place. Great for stalling weaker zombies and crowds early, even lead ones. Top path: cheap hidden detection at Lv 3, then the full-auto Ice LMG that freezes bosses. Bottom path: faster shooting, then the Cryo Grenade ability, a self-firing grenade launcher, and boss freezing at max level.",
    tip: "Use it as an early freezer and helper. It struggles against tough zombies, and its last levels are expensive.",
    levels: [
      { name: 'Cryo Ranger', desc: 'Short 3-shot bursts of icy bullets that chill a zombie until it freezes.', damage: 1, burst: 3, burstGap: 0.12, cooldown: 1.75, range: 12, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.15, chillDps: 0, chillFreeze: 1 },
      { name: 'Advanced Training', path: 'Top', desc: 'Top path: a bit more damage and range, and one more bullet per burst.', cost: 200, damage: 1.5, burst: 4, burstGap: 0.12, cooldown: 1.65, range: 13, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.15, chillDps: 0, chillFreeze: 1 },
      { name: 'Extended Barrel', path: 'Top', desc: 'More range.', cost: 175, damage: 1.5, burst: 4, burstGap: 0.12, cooldown: 1.65, range: 16, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.15, chillDps: 0, chillFreeze: 1 },
      { name: 'Stealth Sensor Eye', path: 'Top', desc: 'Sees hidden zombies, much more chill per bullet, 2 more bullets per burst and faster bursts.', cost: 750, damage: 1.5, burst: 6, burstGap: 0.1, cooldown: 1.05, range: 16, hidden: true,
        chill: 0.2, chillTime: 2.5, maxSlow: 0.2, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Nitrogen Rounds', path: 'Top', desc: 'A big boost to damage and chill, more range and longer freezes.', cost: 2850, damage: 6.5, burst: 6, burstGap: 0.1, cooldown: 1.05, range: 18, hidden: true,
        chill: 0.3, chillTime: 3, maxSlow: 0.25, chillDps: 0, chillFreeze: 2 },
      { name: 'Ice LMG', path: 'Top', desc: 'A full-auto gun: much more damage and range, it can freeze bosses, and zombies it freezes stay 10% slower for good.', cost: 9250, damage: 11, cooldown: 0.15, range: 21, hidden: true,
        chill: 0.12, chillTime: 3, maxSlow: 0.25, chillDps: 0, chillFreeze: 2, freezeBoss: 0.5, frostbite: 0.1 },
    ],
  },
  // The Cryo Ranger's Bottom path (not in the shop: a Cryo Ranger becomes this when you pick it).
  frostRangerBottom: {
    name: 'Cryo Ranger',
    lead: true,
    branchOf: 'frostRanger',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 425,
    limit: 8,
    blurb: "The Cryo Ranger's Bottom path: more damage and faster shooting, then the Cryo Grenade ability, a Cryo M203 that launches freezing grenades on its own, and boss freezing at max level.",
    tip: "It never sees hidden zombies: pair it with a tower that does, or a Tactical Sniper's Flare Gun. It can't freeze bosses until Lv 5.",
    levels: [
      { name: 'Cryo Ranger', desc: 'Short 3-shot bursts of icy bullets that chill a zombie until it freezes.', damage: 1, burst: 3, burstGap: 0.12, cooldown: 1.75, range: 12, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.15, chillDps: 0, chillFreeze: 1 },
      { name: 'Heavy Rounds', path: 'Bottom', desc: 'Bottom path: more damage.', cost: 150, damage: 3, burst: 3, burstGap: 0.12, cooldown: 1.75, range: 12, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.15, chillDps: 0, chillFreeze: 1 },
      { name: 'Internal Upgrades', path: 'Bottom', desc: 'Faster shooting, more chill per bullet and more range.', cost: 350, damage: 3, burst: 3, burstGap: 0.12, cooldown: 1.5, range: 14, hidden: false,
        chill: 0.18, chillTime: 2.5, maxSlow: 0.2, chillDps: 0, chillFreeze: 1.25 },
      { name: 'Ice Grenade', path: 'Bottom', desc: 'More damage, faster shooting, a bit more range, and the Cryo Grenade ability.', cost: 2500, damage: 6, ignoreIceResist: true, burst: 3, burstGap: 0.12, cooldown: 1.25, range: 15, hidden: false,
        chill: 0.18, chillTime: 2.5, maxSlow: 0.2, chillDps: 0, chillFreeze: 1.5,
        abilities: [{ key: 'cryoNade', name: 'Cryo Grenade', desc: 'Freezes every zombie near its target for 2s and deals 9 damage', cooldown: 20, radius: 4, duration: 2, damage: 5 }] },
      { name: 'Ice Assault Loadout', path: 'Bottom', desc: 'More damage and range, 3 more bullets per burst, a stronger Cryo Grenade, and a Cryo M203 that launches freezing grenades on its own.', cost: 6500, damage: 9, ignoreIceResist: true, burst: 6, burstGap: 0.1, cooldown: 1.25, range: 17, hidden: false,
        chill: 0.18, chillTime: 3, maxSlow: 0.25, chillDps: 0, chillFreeze: 1.75,
        m203: { every: 6, damage: 10, radius: 3, freeze: 1.5 },
        abilities: [{ key: 'cryoNade', name: 'Cryo Grenade', desc: 'Freezes every zombie near its target for 2.5s and deals 27 damage', cooldown: 20, radius: 5, duration: 2.5, damage: 15 }] },
      { name: 'Deep Freeze Loadout', path: 'Bottom', desc: 'A big damage boost, it can freeze bosses, zombies it freezes take 10% extra damage, and stronger grenades.', cost: 14000, damage: 16, ignoreIceResist: true, burst: 6, burstGap: 0.1, cooldown: 1.25, range: 17, hidden: false,
        chill: 0.18, chillTime: 3, maxSlow: 0.25, chillDps: 0, chillFreeze: 2, freezeBoss: 0.5, frozenVuln: 0.1,
        m203: { every: 5, damage: 25, radius: 3.5, freeze: 2 },
        abilities: [{ key: 'cryoNade', name: 'Cryo Grenade', desc: 'Freezes every zombie near its target for 3s (bosses too) and deals 72 damage', cooldown: 20, radius: 6, duration: 3, damage: 40 }] },
    ],
  },
  rocketeer: {
    name: 'Rocketeer',
    lead: true,
    price: 1500,
    cost: 750,
    limit: 8,
    lob: 0.5,
    homing: true,
    blurb: 'Fires rockets that hit one zombie hard and splash everyone around it. Built for crowds.',
    levels: [
      { name: 'Rocketeer', desc: 'Rockets that hurt the zombie they hit and everyone around it.', damage: 4, splash: 4, cooldown: 4.2, range: 16, radius: 3, hidden: false },
      { name: 'Quick Reload', desc: 'Fires rockets faster.', cost: 320, damage: 4, splash: 4, cooldown: 3.5, range: 16, radius: 3, hidden: false },
      { name: 'Scope', desc: 'More range and hidden detection.', cost: 600, damage: 4, splash: 4, cooldown: 3.5, range: 19, radius: 3, hidden: true },
      { name: 'Bazooka', desc: 'A real bazooka: much more damage, a bigger blast and more range.', cost: 1750, damage: 14, splash: 10, cooldown: 3.5, range: 20.5, radius: 5, hidden: true },
      { name: 'Plasma Launcher', desc: 'Fires glowing plasma rockets: huge damage, even bigger blast and range.', cost: 8200, damage: 45, splash: 38, cooldown: 3.5, range: 24, radius: 6.5, hidden: true },
    ],
  },
  // minRange: deadzone; it can't shoot zombies closer than this.
  // volley: Lv 5 fires this many missiles per shot, each locked onto a different zombie.
  rocketeerMissile: {
    name: 'Missile Rocketeer',
    lead: true,
    altOf: 'rocketeer',
    form: 'Missile',
    shards: 1,
    price: 0,
    cost: 2000,
    limit: 8,
    lob: 0.6,
    homing: true,
    minRange: 5,
    blurb: 'An alternate Rocketeer that fires slow but very powerful rockets. Every zombie in the blast takes the full damage. It can\'t shoot zombies that are too close (under 5). Sees hidden zombies from Lv 3. Expensive and slow, so it\'s a poor early pick.',
    tip: 'Use cheaper splash towers early and get this one later. At Lv 5 it fires 4 missiles that each lock onto a different zombie.',
    levels: [
      { name: 'Missile Rocketeer', desc: 'Fires one rocket that blasts every zombie around it for full damage.', damage: 30, cooldown: 3.75, range: 20, radius: 3, hidden: false },
      { name: 'Faster Reloading', desc: 'Fires more often.', cost: 600, damage: 30, cooldown: 3, range: 20, radius: 3, hidden: false },
      { name: 'Heavier Payload', desc: 'More damage and range, a bigger blast, and it can now see hidden zombies.', cost: 1800, damage: 50, cooldown: 3, range: 22.5, radius: 4, hidden: true },
      { name: 'Explosive Risks', desc: 'A big damage boost, an even bigger blast, and fires a little faster.', cost: 6000, damage: 95, cooldown: 2.75, range: 22.5, radius: 5, hidden: true },
      { name: 'Missile Maelstrom', desc: 'A quad launcher: fires 4 missiles that each lock onto a different zombie, with a bit more range, but reloads slower.', cost: 18500, damage: 95, cooldown: 4.5, range: 24, radius: 5, volley: 4, hidden: true },
    ],
  },
  // Missile Trooper (alternate Rocketeer with two paths). Every zombie in the blast takes `splash`
  // (or `damage` if there is no splash); the zombie the rocket hits takes `damage` (its main-target bonus).
  // aimShot: seconds it aims before every shot (after its reload). hp: tower health (see GAME.towerHp).
  // ignoreExplosiveResist (Bottom Lv 3+): its blasts get through explosive resistance.
  rocketeerTrooper: {
    name: 'Missile Trooper',
    lead: true,
    altOf: 'rocketeer',
    form: 'Trooper',
    shards: 2,
    price: 0,
    cost: 850,
    limit: 8,
    lob: 0.55,
    homing: true,
    branch: 'rocketeerTrooperBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Rocketeer with two upgrade paths right away. Fires explosive rockets with splash and great range, strong enough for tough early and mid-game zombies. Top path: bigger warheads with a main-target bonus, hidden detection at Lv 3, and the Javelin, which hits flying zombies but aims 3s per shot. Bottom path: faster reloads, then huge blasts, and the MRL's rapid rocket barrage with hidden detection. Its reload is slow.",
    tip: "Set some to Strongest so their big hits aren't wasted, but not all, or fast zombies slip by.",
    levels: [
      { name: 'Missile Trooper', desc: 'Fires explosive rockets that blast every zombie around the one it hits.', damage: 40, cooldown: 7.5, range: 20, radius: 2, hp: 100, flying: false, hidden: false },
      { name: 'HE Rockets', path: 'Top', desc: 'Top path: a lot more damage and a bigger blast.', cost: 850, damage: 75, cooldown: 7.5, range: 20, radius: 3, hp: 120, flying: false, hidden: false },
      { name: 'Optic Sight', path: 'Top', desc: 'More range.', cost: 300, damage: 75, cooldown: 7.5, range: 25, radius: 3, hp: 140, flying: false, hidden: false },
      { name: 'SMAW+', path: 'Top', desc: 'More damage and range, 1.2x damage to the zombie it hits, and it can now see hidden zombies.', cost: 1800, damage: 120, splash: 100, cooldown: 7, range: 29, radius: 3, hp: 190, flying: false, hidden: true },
      { name: 'Bigger Warhead', path: 'Top', desc: 'A big damage boost, more range, and 1.5x damage to the zombie it hits.', cost: 3250, damage: 240, splash: 160, cooldown: 7, range: 33, radius: 3, hp: 265, flying: false, hidden: true },
      { name: 'Javelin', path: 'Top', desc: '3x damage to the zombie it hits, huge range, a faster reload and it hits flying zombies, but it aims 3s before every shot.', cost: 12500, damage: 660, splash: 220, cooldown: 5, aimShot: 3, lob: 1.1, range: 45, radius: 3, hp: 975, hidden: true },
    ],
  },
  // The Missile Trooper's Bottom path (not in the shop: a Missile Trooper becomes this when you pick it).
  rocketeerTrooperBottom: {
    name: 'Missile Trooper',
    lead: true,
    branchOf: 'rocketeerTrooper',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 850,
    limit: 8,
    lob: 0.55,
    homing: true,
    blurb: "The Missile Trooper's Bottom path: faster reloads, then the M2 Carl and Bigger Splash's huge blasts that ignore explosive resistance, and the MRL: a small blast but a very short reload and hidden detection, great against hordes.",
    tip: "It can't see hidden zombies until Lv 5: pair it with a tower that does, or a Tactical Sniper's Flare Gun.",
    levels: [
      { name: 'Missile Trooper', desc: 'Fires explosive rockets that blast every zombie around the one it hits.', damage: 40, cooldown: 7.5, range: 20, radius: 2, hp: 100, flying: false, hidden: false },
      { name: 'Fast Hands', path: 'Bottom', desc: 'Bottom path: reloads faster.', cost: 240, damage: 40, cooldown: 6.25, range: 20, radius: 2, hp: 115, flying: false, hidden: false },
      { name: 'Reload Training', path: 'Bottom', desc: 'Reloads even faster.', cost: 260, damage: 40, cooldown: 5, range: 20, radius: 2, hp: 130, flying: false, hidden: false },
      { name: 'M2 Carl', path: 'Bottom', desc: 'Double damage, a much bigger blast and 1.3x damage to the zombie it hits, and it ignores explosive resistance, but it reloads slower.', cost: 2400, damage: 104, splash: 80, cooldown: 6.5, range: 20, radius: 4, hp: 255, flying: false, hidden: false, ignoreExplosiveResist: true },
      { name: 'Bigger Splash', path: 'Bottom', desc: 'A huge blast, a big damage boost and more range.', cost: 3650, damage: 198, splash: 165, cooldown: 6.5, range: 23, radius: 5.5, hp: 430, flying: false, hidden: false, ignoreExplosiveResist: true },
      { name: 'MRL', path: 'Bottom', desc: 'A rocket launcher with a very short reload and hidden detection, but a smaller blast and less damage per rocket. Great against hordes.', cost: 22000, damage: 85, splash: 65, cooldown: 0.6, lob: 0.45, range: 23, radius: 2, hp: 1330, flying: false, hidden: true, ignoreExplosiveResist: true },
    ],
  },
  mortar: {
    name: 'Mortar',
    lead: true,
    flying: false,
    price: 1800,
    cost: 800,
    limit: 6,
    placement: 'cliff',
    lob: 1.3,
    blurb: 'Sits on a cliff and lobs explosive shells across the map. Huge range and a giant blast. Cliffs only.',
    levels: [
      { name: 'Mortar', desc: 'Lobs explosive shells that hit every zombie in a big blast.', damage: 4, cooldown: 4.5, range: 42, radius: 4.5, hidden: false },
      { name: 'Fast Loader', desc: 'Fires faster.', cost: 320, damage: 4, cooldown: 4.0, range: 42, radius: 4.5, hidden: false },
      { name: 'Big Shells', desc: 'Much bigger blast and more damage.', cost: 480, damage: 6, cooldown: 4.0, range: 42, radius: 7.5, hidden: false },
      { name: 'Heavy Ordnance', desc: 'Hidden detection, way more damage, more range and a bigger blast.', cost: 2000, damage: 15, cooldown: 4.0, range: 46, radius: 9, hidden: true },
      { name: 'Doomsday Shells', desc: 'Glowing super shells: huge damage, more range and an enormous blast.', cost: 10800, damage: 52, cooldown: 4.0, range: 52, radius: 12, hidden: true },
    ],
  },
  // Classic Mortar (alternate Mortar form). cluster: after the shell lands it throws `count`
  // small bombs that scatter at random around the blast (inaccurate), each `damage` in `radius`.
  // nuke: a bigger, nuclear-style explosion (looks only).
  mortarClassic: {
    name: 'Classic Mortar',
    lead: true,
    altOf: 'mortar',
    form: 'Classic',
    shards: 1,
    price: 0,
    cost: 1000,
    limit: 4,
    placement: 'cliff',
    lob: 1.3,
    stunImmune: true,
    blurb: 'An alternate Mortar that lobs shells across the map. They explode and hurt every zombie nearby. It fires slowly but hits a big area, and it can hit flying and lead zombies. From Lv 5 its shells also throw cluster bombs. It can never see hidden zombies, and its shells often land behind fast zombies. Can\'t be stunned. Cliffs only.',
    tip: 'Don\'t count on the cluster bombs; they land all over the place. One or two Lv 6 Classic Mortars handle big crowds of tough zombies well.',
    levels: [
      { name: 'Classic Mortar', desc: 'Long-range explosive shells that hit flying and lead zombies. Can\'t be stunned.', damage: 15, cooldown: 4, range: 24, radius: 5, hidden: false },
      { name: 'Improved Handling', desc: 'Shoots more often with more range.', cost: 500, damage: 15, cooldown: 2.75, range: 27, radius: 5, hidden: false },
      { name: 'Upgraded Armaments', desc: 'More damage and a bigger explosion.', cost: 2250, damage: 35, cooldown: 2.75, range: 27, radius: 7.5, hidden: false },
      { name: 'Bigger Cannon', desc: 'More damage, range and explosion size.', cost: 4250, damage: 65, cooldown: 2.75, range: 30, radius: 8.5, hidden: false },
      { name: 'Loaded Warhead', desc: 'More damage, range and explosion size, and shells now throw 4 cluster bombs.', cost: 13500, damage: 100, cooldown: 2.75, range: 34, radius: 8.75, hidden: false,
        cluster: { count: 4, damage: 30, radius: 3 } },
      { name: 'City Buster', desc: 'A huge damage boost, 6 stronger cluster bombs and a nuclear-style explosion.', cost: 30000, damage: 235, cooldown: 2.75, range: 34, radius: 9, hidden: false,
        cluster: { count: 6, damage: 40, radius: 3.5 }, nuke: true },
    ],
  },
  // Artillery (alternate Mortar with two paths). It doesn't pick targets: you aim it with Target
  // Select (see targetSelectAb), and it only fires at that spot. autoAim (Top 5, Bottom 5): it also
  // aims on its own. burst (Triple Barrel): shells per volley, `burstGap` s apart.
  mortarArtillery: {
    name: 'Artillery',
    lead: true,
    flying: false,
    altOf: 'mortar',
    form: 'Artillery',
    shards: 2,
    price: 0,
    cost: 1850,
    limit: 4,
    placement: 'cliff',
    lob: 1.6,
    burstGap: 0.35,
    branch: 'mortarArtilleryBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'An alternate Mortar with two upgrade paths right away: a huge cannon with enormous range and a big blast that you aim yourself. Pick a spot with Target Select and it shells any zombie that walks into the blast there. Top path: much faster reloads, ending with the Triple Barrel. Bottom path: much bigger hits, ending with the Skyhawk. Both max levels aim on their own. Cliffs only.',
    tip: "It won't fire until you pick a spot, so aim it at a busy stretch of path (corners and crossings) and move the spot when the zombies change lanes. Stuns stop you from re-aiming it, so keep it far from the path.",
    levels: [
      { name: 'Artillery', desc: 'A big cannon you aim yourself: pick a spot with Target Select and it shells every zombie in the blast there.', damage: 65, cooldown: 11, range: 65, radius: 4, hp: 400, hidden: false, abilities: [targetSelectAb(4)] },
      { name: 'Crew Training', path: 'Top', desc: 'Top path: reloads 2s faster.', cost: 550, damage: 65, cooldown: 9, range: 65, radius: 4, hp: 430, hidden: false, abilities: [targetSelectAb(4)] },
      { name: 'M119+', path: 'Top', desc: 'A bigger blast, reloads 1s faster and 10 more range.', cost: 1000, damage: 65, cooldown: 8, range: 75, radius: 5, hp: 605, hidden: false, abilities: [targetSelectAb(5)] },
      { name: 'Fire Artillery', path: 'Top', desc: 'Reloads 2s faster again.', cost: 2000, damage: 65, cooldown: 6, range: 75, radius: 5, hp: 685, hidden: false, abilities: [targetSelectAb(5)] },
      { name: 'Bigger Shells', path: 'Top', desc: 'Damage 65 → 165.', cost: 6500, damage: 165, cooldown: 6, range: 75, radius: 5, hp: 735, hidden: false, abilities: [targetSelectAb(5)] },
      { name: 'Triple Barrel', path: 'Top', desc: 'Fires 3 shells per volley and aims on its own when nothing is at its spot. Damage 165 → 190, but reloads 0.5s slower.', cost: 18500, damage: 190, burst: 3, cooldown: 6.5, range: 75, radius: 5, hp: 1735, hidden: false, autoAim: true, abilities: [targetSelectAb(5)] },
    ],
  },
  // The Artillery's Bottom path (not in the shop: an Artillery becomes this when you pick it).
  mortarArtilleryBottom: {
    name: 'Artillery',
    lead: true,
    flying: false,
    branchOf: 'mortarArtillery',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 1850,
    limit: 4,
    placement: 'cliff',
    lob: 1.6,
    blurb: "The Artillery's Bottom path: much harder hits, bigger blasts and more range, ending with the Skyhawk Artillery: a giant gun that aims on its own, sees hidden zombies and can't be stunned.",
    tip: "Its reload never gets faster, so aim it where zombies bunch up. It can't see hidden zombies until Lv 5.",
    levels: [
      { name: 'Artillery', desc: 'A big cannon you aim yourself: pick a spot with Target Select and it shells every zombie in the blast there.', damage: 65, cooldown: 11, range: 65, radius: 4, hp: 400, hidden: false, abilities: [targetSelectAb(4)] },
      { name: 'HE Shells', path: 'Bottom', desc: 'Bottom path: damage 65 → 90 and a bigger blast.', cost: 1200, damage: 90, cooldown: 11, range: 65, radius: 5, hp: 425, hidden: false, abilities: [targetSelectAb(5)] },
      { name: 'Heavy Shells', path: 'Bottom', desc: 'Damage 90 → 150.', cost: 3000, damage: 150, cooldown: 11, range: 65, radius: 5, hp: 460, hidden: false, abilities: [targetSelectAb(5)] },
      { name: 'M198 Howitzer', path: 'Bottom', desc: 'Damage 150 → 275, a much bigger blast and 30 more range.', cost: 10250, damage: 275, cooldown: 11, range: 95, radius: 9, hp: 1460, hidden: false, abilities: [targetSelectAb(9)] },
      { name: 'Bigger Barrel', path: 'Bottom', desc: 'A huge damage boost (275 → 535) and 30 more range.', cost: 12000, damage: 535, cooldown: 11, range: 125, radius: 9, hp: 1560, hidden: false, abilities: [targetSelectAb(9)] },
      { name: 'Skyhawk Artillery', path: 'Bottom', desc: "Massive damage (535 → 2,935), a bigger blast and 70 more range. Aims on its own when nothing is at its spot, sees hidden zombies and can't be stunned. Reloads 2s slower.", cost: 100000, damage: 2935, cooldown: 13, range: 195, radius: 12, hp: 8560, hidden: true, stunImmune: true, autoAim: true, abilities: [targetSelectAb(12)] },
    ],
  },
  flamethrower: {
    name: 'Flamethrower',
    lead: true,
    price: 1000,
    cost: 750,
    limit: 8,
    burnSlow: 0.4,
    blurb: 'Sprays fire that sets every zombie in front of it alight. Burning zombies take damage over time and move 40% slower. Flames even burn hidden zombies.',
    levels: [
      { name: 'Flamethrower', desc: 'Sprays fire: zombies burn for a few seconds and slow down.', burn: 1, burnTime: 3, cooldown: 0.25, range: 6, cone: 0.45, hidden: false },
      { name: 'Bigger Tank', desc: 'Much more range.', cost: 400, burn: 1, burnTime: 3, cooldown: 0.25, range: 9.5, cone: 0.45, hidden: false },
      { name: 'Wide Nozzle', desc: 'Wider flames that burn longer.', cost: 800, burn: 1, burnTime: 5, cooldown: 0.25, range: 9.5, cone: 0.65, hidden: false },
      { name: 'Inferno', desc: 'Much hotter fire: burns do 4 times the damage and last longer.', cost: 1600, burn: 4, burnTime: 7, cooldown: 0.25, range: 10.5, cone: 0.65, hidden: false },
      { name: 'Twin Torches', desc: 'Two flamethrowers: double burn damage, longer burns, more range and wider flames.', cost: 8400, burn: 8, burnTime: 9, cooldown: 0.25, range: 13.5, cone: 0.8, hidden: false },
    ],
  },

  // Pyromancer: each spray also does `damage` straight away, to at most `hits` zombies in the
  // cone (best by target mode). Unlike the Flamethrower it needs hidden detection to hit hidden
  // zombies, and its fire doesn't slow. Burns from different towers don't stack (the hottest wins).
  flamethrowerPyro: {
    name: 'Pyromancer',
    lead: true,
    altOf: 'flamethrower',
    form: 'Pyro',
    shards: 1,
    price: 0,
    cost: 900,
    limit: 8,
    burnSlow: 0,
    blurb: 'An alternate Flamethrower that sprays fire through several zombies at once: they take a hit and keep burning. Short range and low damage on its own. Sees hidden zombies from Lv 2. Its fire doesn\'t slow zombies down.',
    tip: 'Place it near the start of the path so it softens up zombies before they reach your other towers. A DJ or Commander helps with its short range.',
    levels: [
      { name: 'Pyromancer', desc: 'Sprays fire that hits up to 3 zombies and sets them burning for a few seconds.', damage: 1, hits: 3, burn: 2, burnTime: 3, cooldown: 0.275, range: 9, cone: 0.4, hidden: false },
      { name: 'Improved Handling', desc: 'Sprays faster, more range and damage, hits up to 5 zombies, and it can now see hidden zombies.', cost: 1325, damage: 2, hits: 5, burn: 2, burnTime: 3, cooldown: 0.175, range: 11, cone: 0.4, hidden: true },
      { name: 'Fire Hazard', desc: 'More range and burn damage, burns last twice as long, and hits up to 7 zombies.', cost: 2000, damage: 3, hits: 7, burn: 5, burnTime: 6, cooldown: 0.175, range: 12.5, cone: 0.45, hidden: true },
      { name: 'Napalm Thrower', desc: 'More damage and burn damage, and burns last even longer.', cost: 3777, damage: 5, hits: 7, burn: 10, burnTime: 10, cooldown: 0.175, range: 12.5, cone: 0.45, hidden: true },
      { name: 'Pyromaniac', desc: 'A big boost to damage and burn damage, more range, and hits up to 10 zombies at once.', cost: 11111, damage: 9, hits: 10, burn: 25, burnTime: 10, cooldown: 0.175, range: 14, cone: 0.5, hidden: true },
    ],
  },

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

  // ---------------------------------------------------------------- slows, blades & melee
  // slime: { slow, time } Slime Trooper. Hit zombies lose `slow` of their speed for `time`
  //        seconds. Bosses ignore it, and slimes don't stack with each other.
  // pierce / speed / rangs: Boomerang. Throws `rangs` boomerangs that loop out to the target and
  //        back at `speed`, each hitting up to `pierce` zombies once. It waits until they're back.
  // whirl: { every, damage } Assassin. Every `every`th slash hits every zombie in range instead.
  // fan:   { every, damage, pierce, reach, speed } after every `every` damage dealt, throws
  //        three knives that fly `reach` and each pierce up to `pierce` zombies.

  boomerang: {
    name: 'Boomerang',
    lead: 4,
    price: 600,
    cost: 550,
    limit: 12,
    blurb: 'Throws a boomerang that loops out, slices through several zombies, and comes back. It can\'t throw again until the boomerang returns. Never sees hidden zombies.',
    tip: 'Place it where its loop covers as much path as possible. Each throw only hits a set number of zombies, even if it passes more.',
    levels: [
      { name: 'Boomerang', desc: 'A boomerang that hits up to 3 zombies per throw.', damage: 7, cooldown: 2.6, range: 14, pierce: 3, speed: 22, hidden: false },
      { name: 'Steel Fang', desc: 'More damage and a bit more range.', cost: 400, damage: 12, cooldown: 2.6, range: 15, pierce: 3, speed: 22, hidden: false },
      { name: 'Firmer Grip', desc: 'Throws faster, the boomerang flies faster, and it hits one more zombie.', cost: 750, damage: 12, cooldown: 1.6, range: 15, pierce: 4, speed: 28, hidden: false },
      { name: 'Twin Strike', desc: 'Throws a second boomerang at once, with more damage and range.', cost: 2500, damage: 16, cooldown: 1.6, range: 16, pierce: 4, speed: 28, rangs: 2, hidden: false },
      { name: 'Boomerang Master', desc: 'A huge damage boost, throws faster, faster boomerangs, and one more zombie hit.', cost: 7000, damage: 40, cooldown: 1.4, range: 16, pierce: 5, speed: 34, rangs: 2, hidden: false },
    ],
  },
  slime: {
    name: 'Slime Trooper',
    fly: 30, // globs of slime fly to the zombie
    lead: 4,
    price: 500,
    cost: 500,
    limit: 8,
    blurb: 'Shoots sticky globs of slime that slow zombies down, so your damage towers get more time. At Lv 5 the slime explodes and splashes groups. Bosses ignore the slow.',
    tip: 'Pair it with big damage towers like the Marksman, Rocketeer or Railgunner. Its slow stacks with fire and the Freezer.',
    levels: [
      { name: 'Slime Trooper', desc: 'Sticky slime that slows a zombie by 15% for 3s.', damage: 10, cooldown: 3, range: 11.5, slime: { slow: 0.15, time: 3 }, hidden: false },
      { name: 'Stickier Slime', desc: 'Shoots faster, more range and a stronger slow.', cost: 250, damage: 10, cooldown: 2.25, range: 13, slime: { slow: 0.175, time: 3 }, hidden: false },
      { name: 'Heavy Globs', desc: 'More damage and range, and it can now see hidden zombies.', cost: 650, damage: 20, cooldown: 2.25, range: 15.5, slime: { slow: 0.175, time: 3 }, hidden: true },
      { name: 'Potent Goo', desc: 'A big damage boost, more range, and a stronger slow that lasts longer.', cost: 2100, damage: 46, cooldown: 2.25, range: 17, slime: { slow: 0.2, time: 5 }, hidden: true },
      { name: 'Explosive Goo', desc: 'The slime explodes, hurting and slowing every zombie in the splash. More damage, faster shots and a stronger slow.', cost: 4650, damage: 64, cooldown: 1.8, range: 17, radius: 3.5, slime: { slow: 0.225, time: 5 }, hidden: true },
    ],
  },
  assassin: {
    name: 'Assassin',
    lead: 3,
    flying: false,
    price: 750,
    cost: 300,
    limit: 10,
    melee: true,
    blurb: 'Slashes zombies with a knife at very short range. From Lv 3 every third slash is a Whirlwind Slash that hits everything around it, and at Lv 5 it throws fans of knives.',
    tip: 'Place two cheap Assassins and get them to Lv 3 early. Put them at tight bends or spots the path passes more than once.',
    levels: [
      { name: 'Assassin', desc: 'Slashes the closest zombie with a knife.', damage: 3, cooldown: 0.6, range: 6, hidden: false },
      { name: 'CQC Training', desc: 'More damage and slashes faster.', cost: 450, damage: 6, cooldown: 0.5, range: 6, hidden: false },
      { name: 'Shadow Whirl', desc: 'More damage, hidden detection, and every third slash is a Whirlwind Slash that hits all zombies in range.', cost: 625, damage: 9, cooldown: 0.5, range: 6, hidden: true,
        whirl: { every: 3, damage: 9 } },
      { name: 'Shadow Master', desc: 'More damage and whirlwind damage, and slashes faster.', cost: 2000, damage: 16, cooldown: 0.35, range: 6, hidden: true,
        whirl: { every: 3, damage: 24 } },
      { name: 'Blade Storm', desc: 'A big damage boost, a little more range, and Fan of Knives: after every 500 damage it throws three knives that each pierce 3 zombies.', cost: 6800, damage: 35, cooldown: 0.35, range: 6.5, hidden: true,
        whirl: { every: 3, damage: 45 }, fan: { every: 500, damage: 35, pierce: 3, reach: 22, speed: 40 } },
    ],
  },

  // Brawler: a melee boxer with mechanical fists. combo: { hits, damage, knock, cooldown }: every
  // `hits`th punch is a finisher that does `damage` instead and knocks the zombie back `knock`
  // force (KNOCK_STUDS studs per point, bosses a quarter as far); the next combo starts `cooldown`
  // s later (instead of the normal swing time). Reposition: it leaps to a spot within `reach`,
  // hitting every zombie within `radius` of where it lands for `damage` and knocking them back.
  brawler: {
    name: 'Brawler',
    altOf: 'slugger',
    form: 'Brawler',
    lead: true,
    flying: false,
    price: 0,
    shards: 2,
    cost: 300,
    limit: 10,
    melee: true,
    stunImmune: true,
    blurb: 'A cheap melee tower that punches zombies with mechanical fists. From Lv 3 it throws three-punch combos, and the last punch hits harder and knocks the zombie back. It can\'t be stunned and hits lead zombies.',
    tip: 'A few Lv 1 Brawlers can clear weak early hordes. It can\'t be stunned, so it\'s great against zombies that stun towers. Careful: Reposition can move it away from your buff towers.',
    levels: [
      { name: 'Brawler', desc: 'Punches the closest zombie with mechanical fists.', damage: 5, cooldown: 1, range: 6, stunImmune: true, hidden: false },
      { name: 'Hand to Hand Training', desc: 'Punches much faster with a little more reach.', cost: 200, damage: 5, cooldown: 0.6, range: 6.5, stunImmune: true, hidden: false },
      { name: 'Enhanced Gauntlets', desc: 'Much more damage, and a 3-hit combo: the third punch does 11 damage and knocks the zombie back.', cost: 1200, damage: 14, cooldown: 0.6, range: 6.5, stunImmune: true, hidden: false,
        combo: { hits: 3, damage: 21, knock: 17.5, cooldown: 0.6 } },
      { name: 'Pack a Punch', desc: 'More damage, faster punches, a much harder finisher with more knockback, and hidden detection.', cost: 2500, damage: 24, cooldown: 0.5, range: 6.5, stunImmune: true, hidden: true,
        combo: { hits: 3, damage: 48, knock: 24, cooldown: 0.5 } },
      { name: 'GALVAKNUCKLES', desc: 'More damage, reach and knockback, and unlocks Reposition: leap to a spot nearby, smashing and knocking back the zombies it lands on.', cost: 3500, damage: 35, cooldown: 0.5, range: 7, stunImmune: true, hidden: true,
        combo: { hits: 3, damage: 70, knock: 28, cooldown: 0.5 }, abilities: [repositionAbility(50, 7.5)] },
      { name: "Boreas' Fury", desc: 'A big damage boost, more reach, faster punches and combos, more knockback, and a stronger, longer Reposition leap.', cost: 7777, damage: 50, cooldown: 0.4, range: 8, stunImmune: true, hidden: true,
        combo: { hits: 3, damage: 100, knock: 32, cooldown: 0.4 }, abilities: [repositionAbility(100, 10)] },
    ],
  },

  // goons: { every, units }: every `every` seconds of wave time it calls in one of each unit
  // def in `units` (same rules as spawner units). Each call stops it shooting for `callPause`.
  crookBoss: {
    name: 'Crook Boss',
    lead: true,
    price: 3500,
    cost: 2250,
    limit: 5,
    callPause: 1.5,
    blurb: 'A gangster boss who shoots zombies and calls in goons to fight with him. Goons shoot and crash into zombies until they are destroyed. He stops shooting for a moment every time he calls them.',
    tip: "Expensive with short range early, so it's best mid-to-late game. At Lv 5 it's a solid backup damage tower, and its goons help cover hidden and flying zombies.",
    levels: [
      { name: 'Crook Boss', desc: 'Shoots zombies (lead ones too) and calls in a Pistol Goon that can hit flying zombies.', damage: 12, cooldown: 0.9, range: 16.5, hidden: false, flying: false,
        goons: { every: 15, units: [PISTOL_GOON] } },
      { name: 'Quick Getaway', desc: 'More damage, shoots faster, and can now hit flying zombies.', cost: 1500, damage: 16, cooldown: 0.6, range: 16.5, hidden: false,
        goons: { every: 15, units: [PISTOL_GOON] } },
      { name: 'Double Trouble', desc: 'More range and damage, hidden detection, and calls Pistol Goons two at a time.', cost: 2750, damage: 23, cooldown: 0.6, range: 19, hidden: true,
        goons: { every: 15, units: [PISTOL_GOON, PISTOL_GOON] } },
      { name: 'Tommy Goons', desc: 'Shoots much faster with more range, and also calls in a Tommy Goon with a tommy gun that can see hidden zombies.', cost: 14000, damage: 23, cooldown: 0.2, range: 22, hidden: true,
        goons: { every: 15, units: [PISTOL_GOON, PISTOL_GOON, TOMMY_GOON] } },
      { name: 'The Godfather', desc: 'More damage, shoots even faster, and his Tommy Goons get tougher and stronger.', cost: 47500, damage: 38, cooldown: 0.12, range: 22, hidden: true,
        goons: { every: 15, units: [PISTOL_GOON, PISTOL_GOON, DON_GOON] } },
    ],
  },

  // Mobster (alternate Crook Boss form, two paths right away). Shoots and calls in helpers with
  // `goons` (see Crook Boss). cashback: when a tower within its range is knocked out, the Mobster's
  // owner gets that much of the tower's total cost back (the best nearby Mobster pays).
  // Abilities: AP Rounds (self boost) and Place Bounty (see bountyAbility).
  // ignoreBulletResist (Mafia Boss, Agent 3s, AP Rounds): gets through bullet resistance (Expert mode).
  mobster: {
    name: 'Mobster',
    altOf: 'crookBoss',
    form: 'Mobster',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 4,
    callPause: 1,
    branch: 'mobsterBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'An alternate Crook Boss with two upgrade paths right away. A cheap gangster who shoots zombies and calls in helpers. Top path: more damage and crowds of Goons, then AP Rounds. Bottom path: money. Cheap hidden detection, Agents, Place Bounty for cash from tough zombies, and cash back when towers near it are knocked out.',
    tip: 'Good cheap early defense, and Bottom Lv 2 is a very cheap way to see hidden zombies. Its placement limit is low, so it can\'t be your main late-game damage. Put Bottom path Mobsters next to your expensive towers to get cash back if they go down.',
    levels: [
      { name: 'Mobster', desc: 'A cheap gangster with a pistol.', damage: 4, cooldown: 0.9, range: 9.5, hp: 100, hidden: false },
      { name: '+P Ammo', path: 'Top', desc: 'Top path: more damage, range and health.', cost: 200, damage: 6, cooldown: 0.9, range: 10.5, hp: 125, hidden: false },
      { name: 'The Mob', path: 'Top', desc: 'Calls in a Goon every 55s. More damage and health.', cost: 1000, damage: 8, cooldown: 0.9, range: 10.5, hp: 175, hidden: false,
        goons: { every: 55, units: [MOB_GOON] } },
      { name: 'Mac 10', path: 'Top', desc: 'Shoots much faster (but a bit weaker) and calls Goons two at a time. Lots more health.', cost: 4000, damage: 6, cooldown: 0.4, range: 10.5, hp: 375, hidden: false,
        goons: { every: 55, units: [MOB_GOON, MOB_GOON] } },
      { name: 'Upgraded Henchmen', path: 'Top', desc: 'Calls 2 tougher Goon 2s every 48s and unlocks AP Rounds: 50% more damage for 10s. More damage, range and health.', cost: 7000, damage: 11, cooldown: 0.4, range: 11.5, hp: 825, hidden: false,
        goons: { every: 48, units: [MOB_GOON_2, MOB_GOON_2] }, abilities: [AP_AB] },
      { name: 'Mafia Army', path: 'Top', desc: 'Calls 3 strong Goon 3s every 43s. A huge damage boost and lots more range and health.', cost: 18680, damage: 37, cooldown: 0.4, range: 15.5, hp: 1625, hidden: false,
        goons: { every: 43, units: [MOB_GOON_3, MOB_GOON_3, MOB_GOON_3] }, abilities: [AP_AB] },
    ],
  },
  // The Mobster's Bottom path (not in the shop: a Mobster becomes this when you pick it).
  mobsterBottom: {
    name: 'Mobster',
    branchOf: 'mobster',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 400,
    limit: 4,
    callPause: 1,
    blurb: "The Mobster's Bottom path: cheap hidden detection, then Agents, Place Bounty for extra cash from tough zombies, and cash back when towers near it are knocked out.",
    tip: 'Place Bounty on the toughest zombie of the wave (bosses pay the most). Keep it close to your priciest towers for the cash back.',
    levels: [
      { name: 'Mobster', desc: 'A cheap gangster with a pistol.', damage: 4, cooldown: 0.9, range: 9.5, hp: 100, hidden: false },
      { name: 'Extended Barrel', path: 'Bottom', desc: 'Bottom path: more range.', cost: 150, damage: 4, cooldown: 0.9, range: 12.5, hp: 125, hidden: false },
      { name: 'Advanced Visors', path: 'Bottom', desc: 'Sees hidden zombies and shoots faster.', cost: 225, damage: 4, cooldown: 0.65, range: 12.5, hp: 150, hidden: true },
      { name: 'Bounty Hunter', path: 'Bottom', desc: 'Calls in an Agent every 62s, unlocks Place Bounty (15% up to $5,750), and gives 5% cash back when nearby towers are knocked out. Much more damage and range, shoots a bit slower.', cost: 5000, damage: 26, cooldown: 0.85, range: 17.5, hp: 300, hidden: true, cashback: 0.05,
        goons: { every: 62, units: [AGENT] }, abilities: [bountyAbility(0.15, 5750)] },
      { name: 'Life Insurance', path: 'Bottom', desc: 'Agent 2s replace Agents, bounties pay 25% (up to $8,000) and cash back rises to 10%. More damage, range and health.', cost: 8500, damage: 58, cooldown: 0.85, range: 19.5, hp: 1000, hidden: true, cashback: 0.1,
        goons: { every: 62, units: [AGENT_2] }, abilities: [bountyAbility(0.25, 8000)] },
      { name: 'Mafia Boss', path: 'Bottom', desc: 'Agent 3s replace Agent 2s, bounties pay 30% (up to $23,000), cash back rises to 20%, and it ignores bullet resistance (hits lead zombies). A huge damage boost, shoots a bit slower.', cost: 45000, damage: 178, cooldown: 0.95, range: 22.5, hp: 2300, hidden: true, cashback: 0.2, lead: true, ignoreBulletResist: true,
        goons: { every: 62, units: [AGENT_3] }, abilities: [bountyAbility(0.3, 23000)] },
    ],
  },

  // Ghost: a fast-shooting fighter with two paths right away (see Pursuit). Hits flying zombies.
  // C7 Drone (ability `drone`, timed): for `duration` s a drone flies over her that reveals hidden
  //   zombies within `range` (every tower can hit them) and shoots them for `damage` every `every`
  //   s (any zombie in range if no hidden one is).
  // stealth / restealth: see GAME.stealthTime. restealth is how long she stays revealed once her stealth runs out.
  // Ghost Grenade (ability `ghostGrenade`): every tower within `radius` (hers or a teammate's,
  //   her too) turns stealthy for `duration` s.
  // hp: tower health (see GAME.towerHp).
  ghost: {
    name: 'Ghost',
    price: 5000,
    cost: 750,
    limit: 8,
    branch: 'ghostBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'A cheap, fast-shooting fighter with two upgrade paths right away. Strong early damage that can be your main DPS, and hits flying zombies. Top path: hidden detection at Lv 1, much faster shooting, then the C7 Drone that hunts hidden zombies. Bottom path: big damage and range boosts. Low health.',
    tip: 'Go Bottom first: its early upgrades are the best value. Top Lv 1 is a cheap way to see hidden zombies.',
    levels: [
      { name: 'Ghost', desc: 'Shoots one zombie at a time, very fast.', damage: 2, cooldown: 0.3, range: 10, hp: 135, hidden: false },
      { name: 'Eye Sensor', path: 'Top', desc: 'Top path: sees hidden zombies and gets more range.', cost: 550, damage: 2, cooldown: 0.3, range: 13.5, hp: 160, hidden: true },
      { name: 'Faster Firing', path: 'Top', desc: 'Shoots faster.', cost: 900, damage: 2, cooldown: 0.2, range: 13.5, hp: 215, hidden: true },
      { name: 'Stealth Assault', path: 'Top', desc: 'Shoots twice as fast with more range, and turns stealthy so enemies can\'t target her.', cost: 3750, damage: 2, cooldown: 0.1, range: 17.5, hp: 340, hidden: true,
        stealth: true, restealth: 3.5 },
      { name: 'C7 Drone', path: 'Top', desc: 'More damage, shoots faster, lots more health, and the C7 Drone: a drone that reveals hidden zombies and shoots them.', cost: 12750, damage: 5, cooldown: 0.08, range: 17.5, hp: 940, lead: true, hidden: true,
        stealth: true, restealth: 2.5,
        abilities: [{ key: 'drone', name: 'C7 Drone', desc: 'For 15s a drone reveals hidden zombies within 20 and shoots them (10 damage, 4 shots a second)', cooldown: 45, duration: 15, range: 20, damage: 10, every: 0.25 }] },
      { name: 'X-Ghost', path: 'Top', desc: 'A huge damage boost, more range and health, and a stronger C7 Drone II.', cost: 28000, damage: 15.5, cooldown: 0.07, range: 19.5, hp: 1840, lead: true, hidden: true,
        stealth: true, restealth: 1.5,
        abilities: [{ key: 'drone', name: 'C7 Drone II', desc: 'For 20s a drone reveals hidden zombies within 25 and shoots them (30 damage, 5 shots a second)', cooldown: 45, duration: 20, range: 25, damage: 30, every: 0.2 }] },
    ],
  },
  // The Ghost's Bottom path (not in the shop: a Ghost becomes this when you pick it). It never
  // sees hidden zombies.
  ghostBottom: {
    name: 'Ghost',
    branchOf: 'ghost',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 750,
    limit: 8,
    blurb: "The Ghost's Bottom path: much more damage and range, then the Honey Badger with stealth, and the Ghost Grenade.",
    tip: "It never sees hidden zombies: pair it with a tower that does, or a Tactical Sniper's Flare Gun.",
    levels: [
      { name: 'Ghost', desc: 'Shoots one zombie at a time, very fast.', damage: 2, cooldown: 0.3, range: 10, hp: 135, hidden: false },
      { name: '+P Ammo', path: 'Bottom', desc: 'Bottom path: double damage.', cost: 450, damage: 4, cooldown: 0.3, range: 10, hp: 160, hidden: false },
      { name: 'Extended Barrel', path: 'Bottom', desc: 'More damage and range, and it can now hurt lead zombies.', cost: 950, damage: 7, cooldown: 0.3, range: 12, hp: 195, lead: true, hidden: false },
      { name: 'Honey Badger', path: 'Bottom', desc: 'A big damage boost, almost double the range, more health, and stealth so enemies can\'t target her.', cost: 8000, damage: 17, cooldown: 0.3, range: 23, hp: 495, lead: true, hidden: false,
        stealth: true, restealth: 45 },
      { name: 'Stealth Grenade', path: 'Bottom', desc: 'More than double the damage, lots more health, and the Ghost Grenade that makes nearby towers stealthy.', cost: 21000, damage: 39, cooldown: 0.3, range: 24, hp: 1195, lead: true, hidden: false,
        stealth: true, restealth: 40,
        abilities: [{ key: 'ghostGrenade', name: 'Ghost Grenade', desc: 'Towers within 15 turn stealthy for 10s, so bosses can\'t target them', cooldown: 40, radius: 15, duration: 10 }] },
      { name: "World's Deadliest", path: 'Bottom', desc: 'A huge damage boost, shoots faster, more range, and a stronger Ghost Grenade II.', cost: 40000, damage: 76, cooldown: 0.25, range: 27, hp: 2195, lead: true, hidden: false,
        stealth: true, restealth: 35,
        abilities: [{ key: 'ghostGrenade', name: 'Ghost Grenade II', desc: 'Towers within 20 turn stealthy for 15s, so bosses can\'t target them', cooldown: 40, radius: 20, duration: 15 }] },
    ],
  },

  // Toxicnator: lobs toxic grenades that leave a gas cloud of `radius` (two paths right away).
  // gas: { dps, time, cloud, targets }: the cloud lasts `cloud` s. Zombies in it (up to `targets`
  //   different ones per cloud) are gassed: `dps` damage a second for `time` s, refreshed while
  //   they stay inside. Gas from different clouds stacks (unlike fire).
  // Toxic Blast (ability `toxicBlast`): throw it where you click: zombies within `radius` take
  //   `vuln` more damage from everything for `vulnTime` s (bosses `bossVuln`, if set). The game
  //   has no resistances yet, so this extra damage stands in for its resistance cut.
  // hp: tower health (see GAME.towerHp).
  toxicnator: {
    name: 'Toxicnator',
    lead: true,
    price: 6500,
    cost: 925,
    limit: 8,
    lob: 0.8,
    branch: 'toxicnatorBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'Lobs toxic grenades that leave gas clouds, which hurt zombies over time. Clouds stack. Two upgrade paths right away. Top path: wears down huge crowds, with gas that clings to up to 99 zombies at Lv 5. Bottom path: much stronger gas and Toxic Blast, which makes zombies take extra damage from all your towers. Low single-target damage against tanky zombies and bosses.',
    tip: 'Put it on a long stretch of path or near a bend. Use Toxic Blast on bosses.',
    levels: [
      { name: 'Toxicnator', desc: 'Lobs toxic grenades that leave a gas cloud.', damage: 0, cooldown: 6, range: 10, radius: 3, hp: 200, hidden: false,
        gas: { dps: 3, time: 3, cloud: 4, targets: 7 } },
      { name: 'Toxic Research', path: 'Top', desc: 'Top path: stronger gas.', cost: 375, damage: 0, cooldown: 6, range: 10, radius: 3, hp: 220, hidden: false,
        gas: { dps: 4.5, time: 3, cloud: 4, targets: 7 } },
      { name: 'Advanced Nades', path: 'Top', desc: 'More range.', cost: 250, damage: 0, cooldown: 6, range: 13, radius: 3, hp: 245, hidden: false,
        gas: { dps: 4.5, time: 3, cloud: 4, targets: 7 } },
      { name: 'MGL', path: 'Top', desc: 'Stronger gas, bigger clouds that last longer and hit 3 more zombies, and it throws faster.', cost: 1650, damage: 0, cooldown: 5.5, range: 13, radius: 4.5, hp: 295, hidden: false,
        gas: { dps: 6.5, time: 3, cloud: 6, targets: 10 } },
      { name: 'Speed Loader', path: 'Top', desc: 'Sees hidden zombies, throws faster, stronger gas, and clouds hit 2 more zombies.', cost: 2500, damage: 0, cooldown: 4.5, range: 13, radius: 4.5, hp: 545, hidden: true,
        gas: { dps: 7.5, time: 3, cloud: 6, targets: 12 } },
      { name: 'Toxic Fumes', path: 'Top', desc: 'Much stronger gas that clings to zombies for 21s, and each cloud gasses up to 99 zombies.', cost: 30000, damage: 0, cooldown: 4.5, range: 13, radius: 4.5, hp: 1370, hidden: true,
        gas: { dps: 16.5, time: 21, cloud: 6, targets: 99 } },
    ],
  },
  // The Toxicnator's Bottom path (not in the shop: a Toxicnator becomes this when you pick it).
  toxicnatorBottom: {
    name: 'Toxicnator',
    lead: true,
    branchOf: 'toxicnator',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 925,
    limit: 8,
    lob: 0.8,
    blurb: "The Toxicnator's Bottom path: more range, then much stronger gas in short-lived clouds, and Toxic Blast, which makes zombies take extra damage from all your towers.",
    tip: "Use Toxic Blast on bosses. It can't see hidden zombies until Lv 5.",
    levels: [
      { name: 'Toxicnator', desc: 'Lobs toxic grenades that leave a gas cloud.', damage: 0, cooldown: 6, range: 10, radius: 3, hp: 200, hidden: false,
        gas: { dps: 3, time: 3, cloud: 4, targets: 7 } },
      { name: 'Toxic Safety', path: 'Bottom', desc: 'Bottom path: more range.', cost: 150, damage: 0, cooldown: 6, range: 12, radius: 3, hp: 215, hidden: false,
        gas: { dps: 3, time: 3, cloud: 4, targets: 7 } },
      { name: 'Higher Dose', path: 'Bottom', desc: 'Stronger gas and it throws faster.', cost: 425, damage: 0, cooldown: 5, range: 12, radius: 3, hp: 250, hidden: false,
        gas: { dps: 5, time: 3, cloud: 4, targets: 7 } },
      { name: 'Anthrax', path: 'Bottom', desc: 'Much stronger gas that clings 1s longer, and Toxic Blast. Clouds are short-lived and hit 4 fewer zombies.', cost: 4250, damage: 0, cooldown: 5, range: 13, radius: 3, hp: 500, hidden: false,
        gas: { dps: 25.5, time: 4, cloud: 1.1, targets: 3 },
        abilities: [{ key: 'toxicBlast', name: 'Toxic Blast', desc: 'Throw it where you click: zombies in the blast take 5% more damage from everything for 4s', cooldown: 20, aim: true, radius: 6, vuln: 0.05, vulnTime: 4 }] },
      { name: 'Acid Meltdown', path: 'Bottom', desc: 'A huge gas boost, more range, and Toxic Blast II.', cost: 14000, damage: 0, cooldown: 5, range: 15, radius: 3, hp: 1025, hidden: false,
        gas: { dps: 98.5, time: 4, cloud: 1.1, targets: 3 },
        abilities: [{ key: 'toxicBlast', name: 'Toxic Blast II', desc: 'Throw it where you click: zombies in the blast take 10% more damage from everything for 5s', cooldown: 20, aim: true, radius: 6, vuln: 0.1, vulnTime: 5 }] },
      { name: 'Gamma Toxins', path: 'Bottom', desc: 'An enormous gas boost, sees hidden zombies, throws faster, more range, and Toxic Blast III.', cost: 30000, damage: 0, cooldown: 4.5, range: 16, radius: 3, hp: 2275, hidden: true,
        gas: { dps: 273.5, time: 4, cloud: 1.1, targets: 3 },
        abilities: [{ key: 'toxicBlast', name: 'Toxic Blast III', desc: 'Throw it where you click: zombies in the blast take 20% more damage from everything for 6s (bosses 10%)', cooldown: 20, aim: true, radius: 6, vuln: 0.2, vulnTime: 6, bossVuln: 0.1 }] },
    ],
  },
  // Saboteur (alternate Toxicnator form): a shotgun of poison pellets (see Pump Shotgunner for
  //   pellets / cone). scatter: how many zombies along each pellet's line it hits (full damage).
  // poison: { damage, tick, time, slow }: every zombie hit is poisoned for `time` s: `damage`
  //   every `tick` s and `slow` (fraction of speed lost). Poison doesn't stack: the strongest
  //   one wins and every hit refreshes it.
  // Aggressive Toxins (ability `neuralyze`, costs cash each use): a grenade thrown where you
  //   click. Zombies within `radius` are Neuralyzed for `vulnTime` s: they take `vuln` more
  //   damage from everything and every tower targets them first.
  toxicnatorSaboteur: {
    name: 'Saboteur',
    lead: true,
    altOf: 'toxicnator',
    form: 'Saboteur',
    shards: 1,
    price: 0,
    cost: 775,
    limit: 8,
    blurb: 'An alternate Toxicnator that fires a spread of poison pellets like a shotgun. Every zombie hit is poisoned: it takes damage over time and is slowed. From Lv 3 each pellet hits more than one zombie (Scattershot), and at Lv 4 Aggressive Toxins makes zombies take extra damage and pulls every tower\'s fire onto them. Sees hidden zombies from Lv 2. Its pellets spread out, so they don\'t always hit the same zombie.',
    tip: 'Use Aggressive Toxins to make all your towers focus a dangerous zombie, like a boss. Aim the grenade carefully: picking the wrong target can let other zombies slip by.',
    levels: [
      { name: 'Saboteur', desc: 'Fires 3 poison pellets at once. Poisoned zombies are slowed a little.', damage: 2, pellets: 3, cone: 0.3, scatter: 1, cooldown: 1.35, range: 12.5, hidden: false,
        poison: { damage: 1, tick: 0.9, time: 5, slow: 0.075 } },
      { name: 'Scam Artist', desc: 'More damage, poison ticks faster, and it can now see hidden zombies.', cost: 375, damage: 3, pellets: 3, cone: 0.3, scatter: 1, cooldown: 1.35, range: 12.5, hidden: true,
        poison: { damage: 1, tick: 0.6, time: 5, slow: 0.075 } },
      { name: 'Brand New Rig', desc: 'More damage and range, fires faster, stronger and longer poison, a tighter spread, and Scattershot: each pellet hits 1 more zombie.', cost: 1850, damage: 4, pellets: 3, cone: 0.24, scatter: 2, cooldown: 1, range: 13.5, hidden: true,
        poison: { damage: 2, tick: 0.6, time: 6, slow: 0.075 } },
      { name: 'Black Market Tech', desc: 'Much more damage, fires faster, more range, much stronger poison, 4 pellets, and Aggressive Toxins: a grenade that Neuralyzes zombies.', cost: 5950, damage: 7, pellets: 4, cone: 0.24, scatter: 2, cooldown: 0.8, range: 14.5, hidden: true,
        poison: { damage: 4, tick: 0.6, time: 6, slow: 0.075 },
        abilities: [{ key: 'neuralyze', name: 'Aggressive Toxins', desc: 'Throw a grenade where you click: zombies in the blast are Neuralyzed for 5s, taking 10% more damage, and every tower targets them first', cooldown: 15, cost: 500, aim: true, radius: 3.5, vuln: 0.1, vulnTime: 5 }] },
      { name: 'Neural-Runner', desc: 'Fires faster, more range, 6 pellets in a tighter spread that each hit 1 more zombie, much stronger poison that lasts longer, ticks faster and slows more, and a stronger Aggressive Toxins.', cost: 15115, damage: 7, pellets: 6, cone: 0.18, scatter: 3, cooldown: 0.65, range: 16.5, hidden: true,
        poison: { damage: 7, tick: 0.4, time: 8, slow: 0.1 },
        abilities: [{ key: 'neuralyze', name: 'Aggressive Toxins II', desc: 'Throw a grenade where you click: zombies in the blast are Neuralyzed for 7.5s, taking 15% more damage, and every tower targets them first', cooldown: 15, cost: 500, aim: true, radius: 3.5, vuln: 0.15, vulnTime: 7.5 }] },
    ],
  },

  // ---------------------------------------------------------------- spawners
  // kind 'spawner': never shoots itself. Every `spawnEvery` seconds of wave time it sends a
  // unit from the castle end of the path toward the entrance. `maxUnits`: it waits while that
  // many of its units are alive. Firerate boosts don't make it spawn faster, but a unit keeps
  // the firerate boost its tower had when it spawned.
  // unit: { name, model, hp, speed, ram, gun, cannon, explode, soldiers, hidden }
  //   ram:      crashes into zombies (hidden ones too). Each crash costs the unit as much HP
  //             as the zombie had left, and the zombie takes that much damage.
  //   soldiers: a squad on foot. `hp` is per soldier; they stop to shoot zombies in range,
  //             and zombies touching them hurt them (GAME.unitContact).
  //   gun:      { damage, cooldown, range, burst? } (a squad fires once per living soldier)
  //   cannon:   { damage, every, radius } splash shot at the zombie the gun is aiming at
  //   explode:  { damage, radius } blast when the unit is destroyed
  // spawnNow: upgrading to this level sends a fresh unit at once (replacing older ones).

  patrol: {
    name: 'Patrol',
    price: 800,
    cost: 400,
    limit: 4,
    kind: 'spawner',
    spawnEvery: 46,
    blurb: "Doesn't shoot. Every so often it sends a Jeep from the end of the path toward the entrance, ramming ground zombies until it's destroyed. Its vehicles can never get hidden detection.",
    levels: [
      { name: 'Patrol', desc: 'Sends a Jeep that rams zombies.', hidden: false,
        unit: { name: 'Jeep', model: 'jeep', hp: 30, speed: 5, ram: true } },
      { name: 'Spiked Bumper', desc: 'Jeeps get much more health, so they survive more crashes.', cost: 380, hidden: false,
        unit: { name: 'Jeep', model: 'jeep', hp: 70, speed: 5, ram: true } },
      { name: 'Suicide Mission', desc: 'Jeeps explode when destroyed, hurting zombies around them.', cost: 420, hidden: false,
        unit: { name: 'Jeep', model: 'jeep', hp: 70, speed: 5, ram: true, explode: { damage: 20, radius: 7 } } },
      { name: 'Mounted Gunner', desc: 'Instantly sends a Jeep with a machine gunner that shoots zombies in range.', cost: 1200, hidden: false, spawnNow: true,
        unit: { name: 'Gunner Jeep', model: 'gunjeep', hp: 90, speed: 5, ram: true, explode: { damage: 20, radius: 7 }, gun: { damage: 2, cooldown: 0.133, range: 22.5 } } },
      { name: 'Tank', desc: 'Replaces the Jeeps with a tough Tank that fires an exploding cannon.', cost: 7250, hidden: false, spawnNow: true,
        unit: { name: 'Tank', model: 'tank', hp: 800, speed: 3.5, ram: true, explode: { damage: 20, radius: 7 },
          gun: { damage: 2, cooldown: 0.133, range: 24 }, cannon: { damage: 30, splash: 15, every: 1.75, radius: 4 } } },
    ],
  },
  // Military Base (alternate Patrol form). `spawnEvery` can also be set per level.
  // Airstrike `bombs`: the plane drops that many bombs in a line through the spot you pick,
  // each doing `damage` within `radius`.
  patrolMilitary: {
    name: 'Military Base',
    altOf: 'patrol',
    form: 'Military',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 5,
    kind: 'spawner',
    spawnEvery: 45,
    blurb: "An alternate Patrol. Doesn't shoot. Sends vehicles from the end of the path back toward the entrance that run over zombies, and later shoot them with guns and tank cannons. From Lv 4 it can call in an Airstrike. Its vehicles can't hit flying zombies.",
    tip: "Cheap early defense, and crashes and cannon splash are great against tough zombies. Its slow spawns make it weak on short paths, and big crowds of tough zombies wreck its vehicles fast. Place it off the path so it doesn't take good spots.",
    levels: [
      { name: 'Military Base', desc: 'Sends a Humvee every so often that rams zombies on its way up the path.', hidden: false,
        unit: { name: 'Humvee', model: 'humvee', hp: 60, speed: 5, ram: true } },
      { name: 'Barbed Wire', desc: 'Sends vehicles out more often (every 35s instead of 45s).', cost: 200, hidden: false, spawnEvery: 35,
        unit: { name: 'Humvee', model: 'humvee', hp: 60, speed: 5, ram: true } },
      { name: 'Armor Plating', desc: 'Sends a tougher Humvee 2 with more health.', cost: 400, hidden: false, spawnEvery: 35,
        unit: { name: 'Humvee 2', model: 'humvee2', hp: 100, speed: 5, ram: true } },
      { name: 'Mounted Gunner', desc: 'Instantly sends a Humvee 3 with a mounted gun that shoots zombies and can see hidden ones.', cost: 2000, hidden: true, spawnEvery: 35, spawnNow: true,
        unit: { name: 'Humvee 3', model: 'humvee3', hp: 100, speed: 5, ram: true, hidden: true, gun: { damage: 4, cooldown: 0.225, range: 20 } } },
      { name: 'Tank', desc: 'Instantly sends a tough Tank with a gun and a splash cannon, and unlocks Airstrike: a plane drops six bombs on a spot you pick.', cost: 7500, hidden: true, spawnEvery: 35, spawnNow: true,
        unit: { name: 'Tank', model: 'tank', hp: 500, speed: 3.5, ram: true, hidden: true, gun: { damage: 8, cooldown: 0.2, range: 22.5 }, cannon: { damage: 40, every: 2.5, radius: 4 } },
        abilities: [{ key: 'airstrike', name: 'Airstrike', desc: '6 bombs, 60 damage each, where you click', cooldown: 45, damage: 60, radius: 5, bombs: 6, aim: true }] },
      { name: 'Railgun Tank', desc: 'Instantly sends a very tough Railgun Tank with stronger guns and a bigger cannon blast. Airstrike bombs hit harder over a wider area.', cost: 25000, hidden: true, spawnEvery: 35, spawnNow: true,
        unit: { name: 'Railgun Tank', model: 'railtank', hp: 1600, speed: 3.5, ram: true, hidden: true, gun: { damage: 22, cooldown: 0.15, range: 25 }, cannon: { damage: 75, every: 4.5, radius: 6 } },
        abilities: [{ key: 'airstrike', name: 'Airstrike', desc: '6 bombs, 200 damage each, where you click', cooldown: 45, damage: 200, radius: 7, bombs: 6, aim: true }] },
    ],
  },
  // Armored Factory (alternate Patrol form with two upgrade paths). Vehicles never stop: they drive
  // toward the entrance, shooting what's in range and crashing into zombies. `unit2` is a second
  // vehicle sent every `spawnEvery2` seconds on its own timer (it rolls out as soon as it's unlocked).
  // A `cannon` with its own `range` works without a gun (TOW launcher).
  // ignoreExplosiveResist (TOW Missile Upgrade and up, M1X Abrams cannon): unit cannons get through explosive resistance.
  patrolArmored: {
    name: 'Armored Factory',
    altOf: 'patrol',
    form: 'Armored',
    shards: 2,
    price: 0,
    cost: 800,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 75,
    branch: 'patrolArmoredBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Patrol with two upgrade paths right away. Sends armored vehicles down the path, starting with a Humvee. Unlike Barracks soldiers they never stop: they keep driving, shoot anything in range and damage zombies they crash into. Top path: TOW missiles, a Missile Turret that hits flyers, then an M2 Bradley. Bottom path: faster spawns, an MRAP, then M1 Abrams tanks. Both paths get hidden detection eventually.",
    tip: "Great on long maps and against lead zombies, since crashes and splash get past their armor. Weak on short maps, where vehicles drive off fast and respawn slowly. Top path is cheap and good early; Bottom path is better late. Place it where enemies can't attack it.",
    levels: [
      { name: 'Armored Factory', desc: 'Sends a Humvee with a machine gun every 75s. It keeps driving, shoots zombies in range and crashes into the ones it meets.', hidden: false,
        unit: { name: 'Humvee', model: 'afhumvee', hp: 150, speed: 5, ram: true, gun: { damage: 5, cooldown: 0.5, range: 18 } } },
      { name: '50 Cal+', path: 'Top', desc: 'Top path: a stronger Humvee with double the gun damage.', cost: 700, hidden: false,
        unit: { name: 'Humvee', model: 'afhumvee', hp: 250, speed: 5, ram: true, gun: { damage: 10, cooldown: 0.5, range: 18 } } },
      { name: 'TOW Launcher', path: 'Top', desc: 'The Humvee swaps its gun for an explosive TOW missile launcher with splash damage that hits lead zombies.', cost: 1200, hidden: false,
        unit: { name: 'TOW Humvee', model: 'afhumveetow', hp: 300, speed: 5, ram: true, lead: true, cannon: { damage: 25, every: 2, radius: 3.5, range: 22 } } },
      { name: 'TOW Missile Upgrade', path: 'Top', desc: 'Much more missile damage, hidden detection, and it ignores explosive resistance.', cost: 3000, hidden: true,
        unit: { name: 'TOW Humvee', model: 'afhumveetow', hp: 350, speed: 5, ram: true, lead: true, hidden: true, ignoreExplosiveResist: true,
          cannon: { damage: 125, every: 3, radius: 4, range: 24 } } },
      { name: 'Missile Turret', path: 'Top', desc: 'A much stronger Humvee with a missile turret that hits flying zombies, sent every 50s.', cost: 8000, hidden: true, spawnEvery: 50,
        unit: { name: 'Missile Humvee', model: 'afhumveemissile', hp: 700, speed: 5, ram: true, lead: true, hidden: true, flying: true, ignoreExplosiveResist: true,
          cannon: { damage: 180, every: 1.7, radius: 4, range: 26 } } },
      { name: 'M2 Bradley', path: 'Top', desc: 'Adds a tough M2 Bradley every 60s with a rapid autocannon and TOW missiles.', cost: 38000, hidden: true, spawnEvery: 50,
        unit: { name: 'Missile Humvee', model: 'afhumveemissile', hp: 700, speed: 5, ram: true, lead: true, hidden: true, flying: true, ignoreExplosiveResist: true,
          cannon: { damage: 180, every: 1.7, radius: 4, range: 26 } },
        spawnEvery2: 60,
        unit2: { name: 'M2 Bradley', model: 'bradley', hp: 3000, speed: 4, ram: true, lead: true, hidden: true, flying: true, ignoreExplosiveResist: true,
          gun: { damage: 20, cooldown: 0.1, range: 24 }, cannon: { damage: 240, every: 1, radius: 4.5 } } },
    ],
  },
  // The Armored Factory's Bottom path (not in the shop: an Armored Factory becomes this when you pick it).
  patrolArmoredBottom: {
    name: 'Armored Factory',
    branchOf: 'patrolArmored',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 800,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 75,
    blurb: "The Armored Factory's Bottom path: faster spawns, then a slow, tough MRAP with an explosive autocannon, then M1 Abrams tanks with hidden detection. The M1X Abrams cannon hits for 1,200.",
    tip: "Expensive but strong late. The Humvee keeps coming next to the big vehicle, so both keep the path busy.",
    levels: [
      { name: 'Armored Factory', desc: 'Sends a Humvee with a machine gun every 75s. It keeps driving, shoots zombies in range and crashes into the ones it meets.', hidden: false,
        unit: { name: 'Humvee', model: 'afhumvee', hp: 150, speed: 5, ram: true, gun: { damage: 5, cooldown: 0.5, range: 18 } } },
      { name: 'Vehicle Training', path: 'Bottom', desc: 'Bottom path: vehicles spawn 6s faster (every 69s).', cost: 300, hidden: false, spawnEvery: 69,
        unit: { name: 'Humvee', model: 'afhumvee', hp: 150, speed: 5, ram: true, gun: { damage: 5, cooldown: 0.5, range: 18 } } },
      { name: 'Veteran Training', path: 'Bottom', desc: 'Another 7s faster (every 62s).', cost: 400, hidden: false, spawnEvery: 62,
        unit: { name: 'Humvee', model: 'afhumvee', hp: 150, speed: 5, ram: true, gun: { damage: 5, cooldown: 0.5, range: 18 } } },
      { name: 'MRAP', path: 'Bottom', desc: 'Adds a slow, tough MRAP every 59s with an explosive autocannon that hits lead zombies.', cost: 8500, hidden: false, spawnEvery: 62,
        unit: { name: 'Humvee', model: 'afhumvee', hp: 150, speed: 5, ram: true, gun: { damage: 5, cooldown: 0.5, range: 18 } },
        spawnEvery2: 59,
        unit2: { name: 'MRAP', model: 'mrap', hp: 2000, speed: 2.5, ram: true, lead: true, gun: { damage: 25, cooldown: 0.5, range: 20, radius: 3 } } },
      { name: 'M1 Abrams', path: 'Bottom', desc: 'The MRAP is replaced by an M1 Abrams tank every 77s, with a big cannon, a machine gun and hidden detection.', cost: 27000, hidden: true, spawnEvery: 62,
        unit: { name: 'Humvee', model: 'afhumvee', hp: 150, speed: 5, ram: true, gun: { damage: 5, cooldown: 0.5, range: 18 } },
        spawnEvery2: 77,
        unit2: { name: 'M1 Abrams', model: 'abrams', hp: 5000, speed: 3, ram: true, lead: true, hidden: true,
          gun: { damage: 10, cooldown: 0.125, range: 22 }, cannon: { damage: 400, every: 1.75, radius: 4.5 } } },
      { name: 'M1X Abrams', path: 'Bottom', desc: 'A super tough M1X Abrams every 67s whose cannon hits for 1,200 and ignores explosive resistance.', cost: 54000, hidden: true, spawnEvery: 62,
        unit: { name: 'Humvee', model: 'afhumvee', hp: 150, speed: 5, ram: true, gun: { damage: 5, cooldown: 0.5, range: 18 } },
        spawnEvery2: 67,
        unit2: { name: 'M1X Abrams', model: 'm1x', hp: 12000, speed: 3, ram: true, lead: true, hidden: true, ignoreExplosiveResist: true,
          gun: { damage: 15, cooldown: 0.1, range: 24 }, cannon: { damage: 1200, every: 2.5, radius: 5 } } },
    ],
  },
  // Field Barracks (alternate Barracks form with two upgrade paths). Sends Scouts on foot that stop
  // to shoot and hurt zombies they bump into (`bump`: damage per second per soldier to every zombie
  // touching it; they still take contact damage). `noBuff`: support towers can't boost it or its units.
  // `unitsDie`: its units vanish when it's knocked out (and, like every spawner, when it's sold).
  // `teamLimit`: placement limit by team size (1, 2, 3, 4+ players). Extra units on their own
  // timers: `unit2`/`spawnEvery2`, `unit3`/`spawnEvery3`, `unit4`/`spawnEvery4`.
  // A gun with `flame` sprays fire at every zombie within its range and sets them burning
  // (`burn` damage per second for `burnTime` s).
  // laser (Rail Trooper guns): laser damage (see unitGunKind). Not used by the game yet (kept for later): throughWalls (units shoot through walls).
  barracksField: {
    name: 'Field Barracks',
    altOf: 'barracks',
    form: 'Field',
    shards: 2,
    price: 0,
    cost: 325,
    limit: 7,
    teamLimit: [7, 6, 5, 4],
    kind: 'spawner',
    spawnEvery: 55,
    noBuff: true,
    unitsDie: true,
    throughWalls: true,
    branch: 'barracksFieldBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Barracks with two upgrade paths right away. Sends Scouts down the path that stop to shoot zombies and hurt the ones they bump into. Support towers can't boost it or its units, and its units all vanish if it's sold or knocked out. Top path: more and stronger Scouts, then Spec Ops with hidden detection and laser Rail Troopers. Bottom path: faster spawns, then an M202 rocket trooper, a Rioter and a Flamethrower.",
    tip: "Place it anywhere that's bad for other towers. Extra damage early to mid game, and great on looping maps where units shoot across lanes. Weak against hidden zombies (until Top Lv 5), fast zombies and late Endless. Upgrade all your Field Barracks at once, since upgrading resets the spawn timer.",
    levels: [
      { name: 'Field Barracks', desc: 'Sends a Scout every 55s. It stops to shoot zombies and hurts the ones it bumps into.', hidden: false,
        unit: { name: 'Scout', model: 'bscout', soldiers: 1, hp: 30, speed: 3.5, bump: 2, gun: { damage: 3, cooldown: 1, range: 13 } } },
      { name: 'Scout', path: 'Top', desc: 'Top path: sends 2 slightly stronger Scouts.', cost: 300, hidden: false,
        unit: { name: 'Scout', model: 'bscout', soldiers: 2, hp: 40, speed: 3.5, bump: 2, gun: { damage: 5, cooldown: 2, range: 14 } } },
      { name: 'Riflemen', path: 'Top', desc: 'Level 2 Scouts with more health and damage.', cost: 700, hidden: false,
        unit: { name: 'Rifleman', model: 'bscout2', soldiers: 2, hp: 70, speed: 3.5, bump: 3, gun: { damage: 2, burst: 3, cooldown: 1.45, range: 14 } } },
      { name: 'Assault Class', path: 'Top', desc: 'Level 3 Scouts with much more damage.', cost: 1600, hidden: false,
        unit: { name: 'Assault Scout', model: 'bscout3', soldiers: 2, hp: 100, speed: 3.5, bump: 4, gun: { damage: 3, burst: 3, cooldown: 1.25, range: 15 } } },
      { name: 'Spec Ops', path: 'Top', desc: '3 much stronger Scouts that see hidden zombies.', cost: 3800, hidden: true,
        unit: { name: 'Spec Ops', model: 'bspec', soldiers: 3, hp: 180, speed: 3.5, bump: 6, hidden: true, gun: { damage: 7, burst: 3, cooldown: 1.29, range: 16 } } },
      { name: 'Rail Trooper', path: 'Top', desc: 'Adds 2 tough Rail Troopers every 60s with laser rifles that see hidden zombies and hit lead ones.', cost: 20000, hidden: true,
        unit: { name: 'Spec Ops', model: 'bspec', soldiers: 3, hp: 180, speed: 3.5, bump: 6, hidden: true, gun: { damage: 7, burst: 3, cooldown: 1.29, range: 16 } },
        spawnEvery2: 60,
        unit2: { name: 'Rail Trooper', model: 'brail', soldiers: 2, hp: 600, speed: 3.5, bump: 10, hidden: true, lead: true, laser: true, gun: { damage: 200, cooldown: 1.5, range: 20 } } },
    ],
  },
  // The Field Barracks' Bottom path (not in the shop: a Field Barracks becomes this when you pick it).
  barracksFieldBottom: {
    name: 'Field Barracks',
    branchOf: 'barracksField',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 325,
    limit: 7,
    teamLimit: [7, 6, 5, 4],
    kind: 'spawner',
    spawnEvery: 55,
    noBuff: true,
    unitsDie: true,
    throughWalls: true,
    blurb: "The Field Barracks' Bottom path: Scouts come faster, then it adds an M202 trooper with a rocket launcher, a tough Rioter that mostly fights by bumping into zombies, and a slow Flamethrower that burns whole crowds.",
    tip: "The Rioter comes out every 12s and holds zombies up while the others shoot. The Flamethrower is huge against crowds.",
    levels: [
      { name: 'Field Barracks', desc: 'Sends a Scout every 55s. It stops to shoot zombies and hurts the ones it bumps into.', hidden: false,
        unit: { name: 'Scout', model: 'bscout', soldiers: 1, hp: 30, speed: 3.5, bump: 2, gun: { damage: 3, cooldown: 1, range: 13 } } },
      { name: 'Troop Training', path: 'Bottom', desc: 'Bottom path: Scouts spawn 6s faster (every 49s).', cost: 125, hidden: false, spawnEvery: 49,
        unit: { name: 'Scout', model: 'bscout', soldiers: 1, hp: 30, speed: 3.5, bump: 2, gun: { damage: 3, cooldown: 1, range: 13 } } },
      { name: 'Veteran Training', path: 'Bottom', desc: 'Another 7s faster (every 42s).', cost: 250, hidden: false, spawnEvery: 42,
        unit: { name: 'Scout', model: 'bscout', soldiers: 1, hp: 30, speed: 3.5, bump: 2, gun: { damage: 3, cooldown: 1, range: 13 } } },
      { name: 'M202 Trooper', path: 'Bottom', desc: 'Adds an M202 Trooper every 59s with a rocket launcher whose blasts hit lead zombies.', cost: 3250, hidden: false, spawnEvery: 42,
        unit: { name: 'Scout', model: 'bscout', soldiers: 1, hp: 30, speed: 3.5, bump: 2, gun: { damage: 3, cooldown: 1, range: 13 } },
        spawnEvery2: 59,
        unit2: { name: 'M202 Trooper', model: 'bm202', soldiers: 1, hp: 150, speed: 3.5, bump: 3, lead: true, gun: { damage: 50, cooldown: 2.5, range: 16, radius: 4 } } },
      { name: 'Rioter', path: 'Bottom', desc: 'Adds a tough Rioter every 12s that mostly hurts zombies by bumping into them.', cost: 5250, hidden: false, spawnEvery: 42,
        unit: { name: 'Scout', model: 'bscout', soldiers: 1, hp: 30, speed: 3.5, bump: 2, gun: { damage: 3, cooldown: 1, range: 13 } },
        spawnEvery2: 59,
        unit2: { name: 'M202 Trooper', model: 'bm202', soldiers: 1, hp: 150, speed: 3.5, bump: 3, lead: true, gun: { damage: 50, cooldown: 2.5, range: 16, radius: 4 } },
        spawnEvery3: 12,
        unit3: { name: 'Rioter', model: 'briot', soldiers: 1, hp: 450, speed: 3.5, bump: 25, gun: { damage: 5, cooldown: 1, range: 5 } } },
      { name: 'Flamethrower', path: 'Bottom', desc: 'Adds a slow Flamethrower every 47s that sets whole crowds on fire for huge damage.', cost: 12000, hidden: false, spawnEvery: 42,
        unit: { name: 'Scout', model: 'bscout', soldiers: 1, hp: 30, speed: 3.5, bump: 2, gun: { damage: 3, cooldown: 1, range: 13 } },
        spawnEvery2: 59,
        unit2: { name: 'M202 Trooper', model: 'bm202', soldiers: 1, hp: 150, speed: 3.5, bump: 3, lead: true, gun: { damage: 50, cooldown: 2.5, range: 16, radius: 4 } },
        spawnEvery3: 12,
        unit3: { name: 'Rioter', model: 'briot', soldiers: 1, hp: 450, speed: 3.5, bump: 25, gun: { damage: 5, cooldown: 1, range: 5 } },
        spawnEvery4: 47,
        unit4: { name: 'Flamethrower', model: 'bflame', soldiers: 1, hp: 900, speed: 2, bump: 5, gun: { damage: 25, cooldown: 0.2, range: 8, flame: true, burn: 83.3, burnTime: 3 } } },
    ],
  },
  zed: {
    name: 'Zed',
    price: 5400,
    cost: 5650,
    limit: 5,
    kind: 'spawner',
    spawnEvery: 46,
    blurb: 'The most expensive tower to place. Every 46 seconds it sends a tank-like M1 from the end of the path that shoots zombies and runs them over. Its vehicles never get hidden detection.',
    levels: [
      { name: 'Zed', desc: 'Sends an M1 that shoots and runs over zombies.', hidden: false,
        unit: { name: 'M1', model: 'm1', hp: 420, speed: 4, ram: true, gun: { damage: 4, cooldown: 0.5, range: 20 } } },
      { name: 'Spiked Tracks', desc: "The M1's health almost doubles (420 to 820).", cost: 3700, hidden: false,
        unit: { name: 'M1', model: 'm1', hp: 820, speed: 4, ram: true, gun: { damage: 4, cooldown: 0.5, range: 20 } } },
      { name: 'Arm Cannon', desc: 'The M1 gets an arm cannon that fires a 20-damage splash shot every 3.3 seconds.', cost: 4400, hidden: false,
        unit: { name: 'M1', model: 'm1', hp: 880, speed: 4, ram: true, gun: { damage: 4, cooldown: 0.5, range: 20 }, cannon: { damage: 20, every: 3.33, radius: 4 } } },
      { name: 'Mech', desc: 'Instantly sends an M2 (2,200 HP) that replaces the M1, with a faster gun and cannon.', cost: 14200, hidden: false, spawnNow: true,
        unit: { name: 'M2', model: 'm2', hp: 2200, speed: 4, ram: true, gun: { damage: 4, cooldown: 0.25, range: 22.5 }, cannon: { damage: 15, every: 2.1, radius: 4.5 } } },
      { name: 'Extermination', desc: 'Instantly sends an M11 (6,000 HP) with double gun damage and a much stronger, faster cannon.', cost: 60000, hidden: false, spawnNow: true,
        unit: { name: 'M11', model: 'm11', hp: 6000, speed: 4, ram: true, gun: { damage: 8, cooldown: 0.2, range: 25 }, cannon: { damage: 40, every: 1.05, radius: 5 } } },
    ],
  },

  // Behemoth Factory (alternate Zed form, two paths right away). Sends giant Behemoth tanks that
  // fire a big splash cannon. Unit extras: ramArmor = it takes that much less damage when it rams
  // a zombie (the zombie still takes the full hit). A gun with an Infinity range reaches the whole
  // map (Laser Behemoth railguns). `hp` on a level is the factory's own health.
  // laser (Laser Behemoths): laser damage (see unitGunKind). ignoreExplosiveResist (Mammoth): its cannon gets through explosive resistance.
  zedBehemoth: {
    name: 'Behemoth Factory',
    altOf: 'zed',
    form: 'Behemoth',
    shards: 2,
    price: 0,
    cost: 9000,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 150,
    branch: 'zedBehemothBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'An alternate Zed with two upgrade paths right away. Every 150s it sends a giant Behemoth tank down the path that fires a big splash cannon and takes less damage when it rams zombies. Top path: tougher Behemoths, then the huge Mammoth that hits flying zombies. Bottom path: faster spawns, then Laser Behemoths with railguns that reach the whole map and see hidden zombies.',
    tip: 'Very strong late, but expensive and slow to spawn. The Top path is better value late; the Bottom path suits big maps, but its laser tanks have less health and no splash.',
    levels: [
      { name: 'Behemoth Factory', desc: 'Sends a Behemoth every 150s that fires a big splash cannon and rams zombies.', hp: 6250, hidden: false,
        unit: { name: 'Behemoth', model: 'behemoth', hp: 3800, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 375, every: 4, radius: 5, range: 24 } } },
      { name: 'More Armor', path: 'Top', desc: 'Top path: a tougher Behemoth Level 1 with a stronger cannon.', cost: 6500, hp: 6650, hidden: false,
        unit: { name: 'Behemoth 1', model: 'behemoth', hp: 5250, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 500, every: 4, radius: 5, range: 24 } } },
      { name: '130mm Barrel', path: 'Top', desc: 'Behemoth Level 2 with a bigger 130mm cannon.', cost: 12000, hp: 7150, hidden: false,
        unit: { name: 'Behemoth 2', model: 'behemoth2', hp: 6750, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 750, every: 4, radius: 5.5, range: 26 } } },
      { name: 'Improved Chassis', path: 'Top', desc: 'Instantly sends a much tougher Behemoth Level 3.', cost: 47500, hp: 11150, hidden: false, spawnNow: true,
        unit: { name: 'Behemoth 3', model: 'behemoth3', hp: 12000, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 937.5, every: 4, radius: 5.5, range: 26 } } },
      { name: 'Dual Barrels', path: 'Top', desc: 'Instantly sends a Behemoth Level 4 with two cannons: double the health and four times the damage.', cost: 150000, hp: 16150, hidden: false, spawnNow: true,
        unit: { name: 'Behemoth 4', model: 'behemoth4', hp: 24000, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 1897, every: 2, radius: 6, range: 28 } } },
      { name: 'Mammoth', path: 'Top', desc: 'Instantly sends the giant Mammoth: huge health and damage, it hits flying zombies, and its cannon ignores explosive resistance.', cost: 525000, hp: 26150, hidden: false, spawnNow: true,
        unit: { name: 'Mammoth', model: 'mammoth', hp: 62000, speed: 2, ram: true, ramArmor: 0.5, lead: true, flying: true, ignoreExplosiveResist: true, cannon: { damage: 14555, every: 2, radius: 7, range: 30 } } },
    ],
  },
  // The Behemoth Factory's Bottom path (not in the shop: a Behemoth Factory becomes this when you pick it).
  // Each Laser Behemoth comes on its own timer (unit2-4) and the older units keep coming too.
  zedBehemothBottom: {
    name: 'Behemoth Factory',
    branchOf: 'zedBehemoth',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 9000,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 150,
    blurb: "The Behemoth Factory's Bottom path: faster spawns, then Laser Behemoths with railguns that snipe zombies anywhere on the map and see hidden ones. Every level keeps its older units coming and adds a new one.",
    tip: 'Great on big maps, since the railguns reach everywhere. Laser Behemoths have less health than the Top path tanks and no splash.',
    levels: [
      { name: 'Behemoth Factory', desc: 'Sends a Behemoth every 150s that fires a big splash cannon and rams zombies.', hp: 6250, hidden: false,
        unit: { name: 'Behemoth', model: 'behemoth', hp: 3800, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 375, every: 4, radius: 5, range: 24 } } },
      { name: 'Faster Spawn', path: 'Bottom', desc: 'Bottom path: Behemoths come 15s sooner (every 135s).', cost: 1850, hp: 6350, hidden: false, spawnEvery: 135,
        unit: { name: 'Behemoth', model: 'behemoth', hp: 3800, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 375, every: 4, radius: 5, range: 24 } } },
      { name: 'Veteran Training', path: 'Bottom', desc: 'Behemoths come even sooner (every 110s).', cost: 3000, hp: 6450, hidden: false, spawnEvery: 110,
        unit: { name: 'Behemoth', model: 'behemoth', hp: 3800, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 375, every: 4, radius: 5, range: 24 } } },
      { name: 'Laser Tank', path: 'Bottom', desc: 'Adds a Laser Behemoth every 80s: a railgun that snipes zombies anywhere on the map and sees hidden ones.', cost: 75000, hp: 8950, hidden: true, spawnEvery: 110,
        unit: { name: 'Behemoth', model: 'behemoth', hp: 3800, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 375, every: 4, radius: 5, range: 24 } },
        spawnEvery2: 80,
        unit2: { name: 'Laser Behemoth', model: 'laserbehemoth', hp: 10000, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, hidden: true, laser: true, gun: { damage: 1312.5, cooldown: 2, range: Infinity, rail: true } } },
      { name: 'Chain Reaction', path: 'Bottom', desc: 'Also adds a stronger Laser Behemoth Level 4 every 90s.', cost: 145000, hp: 12950, hidden: true, spawnEvery: 110,
        unit: { name: 'Behemoth', model: 'behemoth', hp: 3800, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 375, every: 4, radius: 5, range: 24 } },
        spawnEvery2: 80,
        unit2: { name: 'Laser Behemoth', model: 'laserbehemoth', hp: 10000, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, hidden: true, laser: true, gun: { damage: 1312.5, cooldown: 2, range: Infinity, rail: true } },
        spawnEvery3: 90,
        unit3: { name: 'Laser Behemoth 4', model: 'laserbehemoth2', hp: 10000, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, hidden: true, laser: true, gun: { damage: 2187.5, cooldown: 2, range: Infinity, rail: true } } },
      { name: 'X-Laser Tank', path: 'Bottom', desc: 'Also adds the X-Laser Behemoth every 95s: tougher, with a huge railgun.', cost: 220000, hp: 19950, hidden: true, spawnEvery: 110,
        unit: { name: 'Behemoth', model: 'behemoth', hp: 3800, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, cannon: { damage: 375, every: 4, radius: 5, range: 24 } },
        spawnEvery2: 80,
        unit2: { name: 'Laser Behemoth', model: 'laserbehemoth', hp: 10000, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, hidden: true, laser: true, gun: { damage: 1312.5, cooldown: 2, range: Infinity, rail: true } },
        spawnEvery3: 90,
        unit3: { name: 'Laser Behemoth 4', model: 'laserbehemoth2', hp: 10000, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, hidden: true, laser: true, gun: { damage: 2187.5, cooldown: 2, range: Infinity, rail: true } },
        spawnEvery4: 95,
        unit4: { name: 'X-Laser Behemoth', model: 'laserbehemoth3', hp: 17500, speed: 2.5, ram: true, ramArmor: 0.5, lead: true, hidden: true, laser: true, gun: { damage: 6250, cooldown: 2, range: Infinity, rail: true } } },
    ],
  },

  // War Machine Factory: sends walking mechs (two paths right away). Its units are mechs that
  // walk down the path without stopping and don't ram; they shoot zombies in range on the way.
  // count (on a unit def): sends that many of the unit each time, a little apart.
  // A cannon with `stun` / `knock` stuns and knocks back every zombie in its blast, bosses and
  // stun-immune ones too (War Machines).
  warMachine: {
    name: 'War Machine Factory',
    price: 9000,
    cost: 19000,
    limit: 2,
    kind: 'spawner',
    spawnEvery: 235,
    branch: 'warMachineBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'A factory that sends walking mechs down the path, with two upgrade paths right away. Top path: pairs of long-range Abrams Walkers with cannons and miniguns. Bottom path: one giant War Machine that burns crowds, smashes zombies, hits flying ones and stuns and knocks back any boss, even stun-immune ones. The slowest spawns in the game.',
    tip: 'Best against bosses: War Machines knock back every boss. One fully upgraded factory beats several half-upgraded ones. Its units can be wiped out by boss attacks.',
    levels: [
      { name: 'War Machine Factory', desc: 'Sends 2 Abrams Walkers every 235s with long-range cannons.', hp: 30000, hidden: false,
        unit: { name: 'Abrams Walker', model: 'walker', count: 2, hp: 3000, speed: 2.5, lead: true, cannon: { damage: 324, every: 2, radius: 4, range: 30 } } },
      { name: 'Uranium Armor', path: 'Top', desc: 'Top path: tougher Abrams Walker Level 1s.', cost: 8000, hp: 30100, hidden: false,
        unit: { name: 'Abrams Walker 1', model: 'walker', count: 2, hp: 3750, speed: 2.5, lead: true, cannon: { damage: 324, every: 2, radius: 4, range: 30 } } },
      { name: 'Dual Cannons', path: 'Top', desc: 'Abrams Walker Level 2s with two cannons: more health and over twice the damage.', cost: 18500, hp: 30200, hidden: false,
        unit: { name: 'Abrams Walker 2', model: 'walker2', count: 2, hp: 5750, speed: 2.5, lead: true, cannon: { damage: 383, every: 1, radius: 4, range: 30 } } },
      { name: 'Minigun Arm', path: 'Top', desc: 'Abrams Walker Level 3s with a minigun arm and lots more health.', cost: 38500, hp: 30300, hidden: false,
        unit: { name: 'Abrams Walker 3', model: 'walker3', count: 2, hp: 8000, speed: 2.5, lead: true, gun: { damage: 15, cooldown: 0.1, range: 30 }, cannon: { damage: 226, every: 1, radius: 4 } } },
      { name: 'Dual Weapons', path: 'Top', desc: 'Abrams Walker Level 4s: stronger minigun and cannons, more health.', cost: 78500, hp: 30700, hidden: false,
        unit: { name: 'Abrams Walker 4', model: 'walker4', count: 2, hp: 10000, speed: 2.5, lead: true, gun: { damage: 25, cooldown: 0.1, range: 30 }, cannon: { damage: 397, every: 1, radius: 4.5 } } },
      { name: 'Quad Miniguns', path: 'Top', desc: 'Instantly sends 2 Abrams Walker Level 5s with four miniguns (about 4x the damage), and they come every 140s.', cost: 175000, hp: 35700, hidden: false, spawnEvery: 140, spawnNow: true,
        unit: { name: 'Abrams Walker 5', model: 'walker5', count: 2, hp: 15000, speed: 2.5, lead: true, gun: { damage: 150, cooldown: 0.1, range: 32 }, cannon: { damage: 1167, every: 1, radius: 4.5 } } },
    ],
  },
  // The War Machine Factory's Bottom path (not in the shop: a War Machine Factory becomes this when you pick it).
  warMachineBottom: {
    name: 'War Machine Factory',
    branchOf: 'warMachine',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 19000,
    limit: 2,
    kind: 'spawner',
    spawnEvery: 235,
    blurb: "The War Machine Factory's Bottom path: faster spawns, then a giant War Machine that sprays fire on crowds and punches zombies, hits flying ones, and stuns and knocks back every boss, even stun-immune ones.",
    tip: 'Save it for boss waves: every punch shoves the boss back down the path.',
    levels: [
      { name: 'War Machine Factory', desc: 'Sends 2 Abrams Walkers every 235s with long-range cannons.', hp: 30000, hidden: false,
        unit: { name: 'Abrams Walker', model: 'walker', count: 2, hp: 3000, speed: 2.5, lead: true, cannon: { damage: 324, every: 2, radius: 4, range: 30 } } },
      { name: 'Mecha Upgrades', path: 'Bottom', desc: 'Bottom path: Walkers come 20s sooner (every 215s).', cost: 2500, hp: 30100, hidden: false, spawnEvery: 215,
        unit: { name: 'Abrams Walker', model: 'walker', count: 2, hp: 3000, speed: 2.5, lead: true, cannon: { damage: 324, every: 2, radius: 4, range: 30 } } },
      { name: 'Veteran Training', path: 'Bottom', desc: 'Walkers come even sooner (every 191s).', cost: 3000, hp: 30200, hidden: false, spawnEvery: 191,
        unit: { name: 'Abrams Walker', model: 'walker', count: 2, hp: 3000, speed: 2.5, lead: true, cannon: { damage: 324, every: 2, radius: 4, range: 30 } } },
      { name: 'War Machine I', path: 'Bottom', desc: 'Instantly sends a giant War Machine I (75,000 HP) every 216s instead of the Walkers. It sprays fire, punches, hits flying zombies, and stuns and knocks back zombies, bosses too.', cost: 150000, hp: 30450, hidden: false, spawnEvery: 216, spawnNow: true,
        unit: { name: 'War Machine I', model: 'warmachine', hp: 75000, speed: 2, lead: true, flying: true,
          gun: { damage: 150, cooldown: 0.1, range: 10, flame: true, burn: 667, burnTime: 3 }, cannon: { damage: 2000, every: 1, radius: 5, stun: 1, knock: 4 } } },
      { name: 'War Machine II', path: 'Bottom', desc: 'Instantly sends a stronger War Machine II (110,000 HP) every 231s.', cost: 200000, hp: 32450, hidden: false, spawnEvery: 231, spawnNow: true,
        unit: { name: 'War Machine II', model: 'warmachine2', hp: 110000, speed: 2, lead: true, flying: true,
          gun: { damage: 250, cooldown: 0.1, range: 11, flame: true, burn: 1083, burnTime: 3 }, cannon: { damage: 3500, every: 1, radius: 5.5, stun: 1.25, knock: 5 } } },
      { name: 'War Machine III', path: 'Bottom', desc: 'Instantly sends the mighty War Machine III (175,000 HP) every 236s.', cost: 1100000, hp: 42450, hidden: false, spawnEvery: 236, spawnNow: true,
        unit: { name: 'War Machine III', model: 'warmachine3', hp: 175000, speed: 2, lead: true, flying: true,
          gun: { damage: 350, cooldown: 0.1, range: 12, flame: true, burn: 1500, burnTime: 3 }, cannon: { damage: 5000, every: 1, radius: 6, stun: 1.5, knock: 6 } } },
    ],
  },

  // Mercenary Base: a spawner with a `roster` of units instead of one `unit`. It works through
  // the roster in turn, building `queues` units at the same time; each takes its `every` seconds
  // of wave time. Also a support aura: towers inside `aura` deal +`dmgBoost` damage (several
  // Mercenary Bases don't stack). Unit extras: gun.radius = lobbed splash grenades, gun.knock =
  // knocks zombies back (not bosses), heal = { rate, range } heals nearby units and shields them
  // (they take `shield` less contact damage).
  // Air-Drop (ability `airdrop`): every unit in the queues drops onto the path where you click.
  mercenary: {
    name: 'Mercenary Base',
    price: 3500,
    cost: 2750,
    limit: 3,
    kind: 'spawner',
    blurb: 'Never shoots. Sends mercenaries out onto the path in its range to fight: Riflemen, then Grenadiers, Riot Guards and Field Medics as you upgrade. From Lv 4 it also gives towers nearby more damage, and from Lv 6 it can Air-Drop its units right where you need them.',
    tip: 'Place it next to your strongest towers so they get its damage boost late in the game. Use Air-Drop to drop all its units at once in front of a tough zombie.',
    levels: [
      { name: 'Mercenary Base', desc: 'Sends Riflemen that shoot in bursts.', hidden: false, range: 16, queues: 1,
        roster: [{ every: 30, unit: MERC.rifle(0) }] },
      { name: 'Explosive Experts', desc: 'Adds Grenadiers, which throw grenades that hurt every zombie in a small blast.', cost: 1350, hidden: false, range: 16, queues: 1,
        roster: [{ every: 30, unit: MERC.rifle(0) }, { every: 25, unit: MERC.gren(0) }] },
      { name: 'Upgraded Barracks', desc: 'A second queue, so two units are trained at the same time.', cost: 2750, hidden: false, range: 16, queues: 2,
        roster: [{ every: 30, unit: MERC.rifle(0) }, { every: 25, unit: MERC.gren(0) }] },
      { name: 'Improved Training', desc: 'Towers in range deal 10% more damage, and Riflemen get stronger with hidden and flying detection.', cost: 9650, hidden: false, range: 16, queues: 2,
        aura: 16, dmgBoost: 0.1,
        roster: [{ every: 30, unit: MERC.rifle(1) }, { every: 25, unit: MERC.gren(0) }] },
      { name: 'Riot Control', desc: 'A third queue, and adds the Riot Guard: a tough unit that charges in and knocks zombies back.', cost: 10000, hidden: false, range: 16, queues: 3,
        aura: 16, dmgBoost: 0.1,
        roster: [{ every: 30, unit: MERC.rifle(1) }, { every: 25, unit: MERC.gren(0) }, { every: 40, unit: MERC.riot(0) }] },
      { name: 'Air Transport', desc: 'Adds Field Medics that heal and shield units, a 12.5% damage boost, and the Air-Drop ability.', cost: 12500, hidden: false, range: 16, queues: 3,
        aura: 16, dmgBoost: 0.125,
        roster: [{ every: 30, unit: MERC.rifle(1) }, { every: 25, unit: MERC.gren(0) }, { every: 40, unit: MERC.riot(0) }, { every: 35, unit: MERC.medic(0) }],
        abilities: [MERC.airdrop] },
      { name: 'Enhanced Equipment', desc: 'Every unit gets much stronger, and the damage boost goes up to 15%.', cost: 45000, hidden: false, range: 16, queues: 3,
        aura: 16, dmgBoost: 0.15,
        roster: [{ every: 30, unit: MERC.rifle(2) }, { every: 25, unit: MERC.gren(1) }, { every: 40, unit: MERC.riot(1) }, { every: 35, unit: MERC.medic(1) }],
        abilities: [MERC.airdrop] },
    ],
  },

  // ---------------------------------------------------------------- builders
  // Necromancer. Shoots `bolt`s that pierce up to `pierce` zombies along their line. Every zombie
  // a bolt hits adds a soul; with `souls` souls it stops shooting for `build` seconds and raises a
  // gravestone beside the path in range (up to `graves`). When it has all its gravestones it
  // upgrades the lowest one instead, up to level `graveLvl`. Raise the Dead smashes them all:
  // each summons a unit from `raise[grave level - 1]`. Level `boomLvl` gravestones explode too.
  // stack: { per, max } hits in a row on the same zombie deal +`per` damage each, up to +`max`.
  necromancer: {
    name: 'Necromancer',
    lead: true,
    flying: false,
    price: 0,
    gems: 4000,
    cost: 4200,
    limit: 3,
    blurb: 'Shoots piercing magic bolts. Every zombie it hits fills its soul meter, and when the meter is full it raises a gravestone. Use Raise the Dead to smash them all and summon skeleton warriors. Sees hidden zombies from Lv 3 and flying ones at Lv 5.',
    tip: 'Put it next to the path where it can cover a lot of the route, so it keeps hitting zombies and fills its soul meter faster. It stops shooting while it raises gravestones, so pair it with reliable towers to catch fast zombies.',
    levels: [
      { name: 'Necromancer', desc: 'Piercing bolts fill its soul meter to raise up to 3 gravestones. Raise the Dead turns them into Skeletons.', damage: 16, cooldown: 1, range: 26, bolt: true, pierce: 3, hidden: false,
        souls: 12, build: 2.5, graves: 3, graveLvl: 1, raise: [[SKEL.skeleton]], abilities: [raiseAbility] },
      { name: 'Soul Forge', desc: 'More damage, gravestones rise faster, and they can now summon Sword Skeletons.', cost: 3400, damage: 25, cooldown: 1, range: 26, bolt: true, pierce: 3, hidden: false,
        souls: 10, build: 2, graves: 3, graveLvl: 1, raise: [[SKEL.skeleton, SKEL.sword]], abilities: [raiseAbility] },
      { name: 'Skull Centrifuge', desc: 'More range, faster shots, hidden detection, up to 6 gravestones, tougher and faster Sword Skeletons, and the odd Giant Skeleton.', cost: 12000, damage: 34, cooldown: 0.8, range: 28, bolt: true, pierce: 3, hidden: true,
        souls: 10, build: 2, graves: 6, graveLvl: 1, raise: [[SKEL.skeleton, SKEL.sword2, SKEL.sword2, SKEL.skeleton, SKEL.giant]], abilities: [raiseAbility] },
      { name: 'Graveward', desc: 'More range and damage, and full gravestones get upgraded to Level 2, which summon Skeletons, Skeleton Knights, Hallow Guards and Giant Skeletons.', cost: 40000, damage: 80, cooldown: 0.7, range: 32, bolt: true, pierce: 4, hidden: true,
        souls: 10, build: 1.5, graves: 6, graveLvl: 2,
        raise: [[SKEL.skeleton, SKEL.sword2, SKEL.sword2, SKEL.giant], [SKEL.skeleton, SKEL.knight, SKEL.knight, SKEL.hallow, SKEL.giant]], abilities: [raiseAbility] },
      { name: 'Apostle of Hades', desc: 'Fires much faster with beams that stack damage on one zombie, flying detection, and Level 3 gravestones that summon Hallow Guards, Executioner Skeletons and Skeleton Knights, then explode.', cost: 80000, damage: 42, cooldown: 0.4, range: 36, bolt: true, pierce: 4, hidden: true, flying: true,
        stack: { per: 0.25, max: 2 }, souls: 10, build: 1.2, graves: 6, graveLvl: 3, boomLvl: 3, boom: { damage: 300, radius: 6 },
        raise: [[SKEL.skeleton, SKEL.sword2, SKEL.sword2, SKEL.giant], [SKEL.skeleton, SKEL.knight, SKEL.knight, SKEL.hallow, SKEL.giant], [SKEL.hallow, SKEL.exec, SKEL.knight, SKEL.hallow, SKEL.exec]],
        abilities: [raiseAbility] },
    ],
  },
  // Engineer. Every shot adds scrap; with `scrap` scrap it stops shooting for `build` seconds and
  // builds a `sentry` on open ground between its deadzone (`minRange`) and `buildRange`, up to
  // `sentries` at once. Sentries shoot on their own and slowly break down (SENTRY `decay`).
  // Upgrading the Engineer upgrades the sentries it already has. Shielded sentries can't be stunned.
  engineer: {
    name: 'Rebar Engineer',
    altOf: 'sentryEngineer',
    form: 'Rebar',
    fly: 45, // rebar flies to the zombie
    lead: true,
    price: 0,
    shards: 3,
    cost: 600,
    limit: 6,
    minRange: 3,
    blurb: 'Shoots zombies with a rebar launcher, and every shot collects scrap. When its scrap meter fills, it stops to build a sentry turret nearby that shoots zombies until it breaks down. Lead and flying detection from the start, hidden from Lv 3.',
    tip: 'When placing or selecting it you see three rings: white is its attack range, yellow is where it can build sentries, red is a deadzone where it can\'t shoot or build. Sentries need open ground inside the yellow ring, away from the path.',
    levels: [
      { name: 'Engineer', desc: 'A rebar launcher that collects scrap to build 1 Sentry.', damage: 4, cooldown: 1.4, range: 13, hidden: false,
        scrap: 8, build: 3, buildRange: 9, sentries: 1, sentry: SENTRY.basic },
      { name: 'Precise Calculations', desc: 'More damage, more range and faster shots.', cost: 325, damage: 6, cooldown: 1.2, range: 16, hidden: false,
        scrap: 8, build: 3, buildRange: 10, sentries: 1, sentry: SENTRY.basic },
      { name: 'Makeshift Radar', desc: 'More damage and range, hidden detection, and its sentries become stronger Rifle Sentries that also see hidden zombies.', cost: 900, damage: 10, cooldown: 1.2, range: 18, hidden: true,
        scrap: 10, build: 3, buildRange: 11, sentries: 1, sentry: SENTRY.rifle },
      { name: 'Auto Converter', desc: 'A big damage boost, faster shots and one more sentry.', cost: 2077, damage: 20, cooldown: 1, range: 18, hidden: true,
        scrap: 10, build: 2.5, buildRange: 11, sentries: 2, sentry: SENTRY.rifle },
      { name: 'Heavy Construction', desc: 'More damage and range, and its sentries become tougher Minigun Sentries.', cost: 6250, damage: 33, cooldown: 0.9, range: 21, hidden: true,
        scrap: 12, build: 2.5, buildRange: 12, sentries: 2, sentry: SENTRY.minigun },
      { name: 'Improved Blueprints', desc: 'A big damage boost, faster shots, one more sentry, and sentries get a shield that makes them stun immune.', cost: 12500, damage: 80, cooldown: 0.75, range: 21, hidden: true,
        scrap: 12, build: 2, buildRange: 12, sentries: 3, sentry: SENTRY.minigunShield },
      { name: 'Illegal Gun Parts', desc: 'Its shots explode with splash rockets, one more sentry, and sentries become War Machine Sentries with rockets.', cost: 32500, damage: 90, splash: 45, radius: 3, cooldown: 0.6, range: 22.5, hidden: true,
        scrap: 14, build: 2, buildRange: 13, sentries: 4, sentry: SENTRY.war },
    ],
  },
  // Hacker: shoots synapses at up to `synapses` zombies at once (single-target damage each).
  //         Every zombie it hits is hacked for good: slowed by `slow` (not bosses), pays `fraud`
  //         more cash for damage (Versus: when it dies), and when it dies (to anything) it comes back as a
  //         hologram unit with (max health)^`ev` health that rams zombies (not from bosses).
  //         `units`: holograms it can have out at once. Upgrade paths at Lv 6 (see Pursuit).
  hacker: {
    name: 'Hacker',
    price: 0,
    gems: 10000,
    cost: 900,
    limit: 2,
    branch: 'hackerBottom',
    branchAt: 5,
    path: 'Top',
    blurb: "Hacks zombies with synapses from its gadgets. Hacked zombies are slowed, pay everyone more cash for damage (Wire Fraud), and come back as holograms that ram other zombies (not bosses). Its synapses only deal damage from Lv 4, when it also gets Hologram Tower to clone any tower for a while. At Lv 6 pick a path: Top for fast, hard-hitting synapses, Bottom for a laptop with 4 synapses and long-lasting clones. Sees hidden zombies from Lv 3, never lead ones.",
    tip: "Put it near the start of the path so it hacks zombies early and they spend longer slowed. Clone your strongest tower with Hologram Tower when a tough wave comes.",
    levels: HACKER_SHARED.concat([
      { name: 'Overclocked Uplink', path: 'Top', desc: 'Top path: synapses fire 3x faster and hit harder, with more range and the toughest holograms.', cost: 60001, damage: 25, cooldown: 0.1, range: 18.5, synapses: 3, ev: 0.75, slow: 0.1, fraud: 0.2, units: 1000, hidden: true,
        abilities: [cloneAbility(0.2, 30)] },
    ]),
  },
  // The Hacker's Bottom path (not in the shop: a Hacker becomes this when you pick it).
  hackerBottom: {
    name: 'Hacker',
    branchOf: 'hacker',
    branchAt: 5,
    path: 'Bottom',
    price: 0,
    cost: 900,
    limit: 2,
    blurb: "The Hacker's Bottom path: a laptop with 4 synapses, huge range, a stronger slow, and clones that last 2 minutes (but cost more).",
    tip: 'Clone your most expensive tower: it lasts long enough for a whole wave.',
    levels: HACKER_SHARED.concat([
      { name: 'Mainframe', path: 'Bottom', desc: 'Bottom path: a laptop with 4 synapses, much more range, a stronger slow, and clones last 120s (but cost 75%).', cost: 53200, damage: 22, cooldown: 0.3, range: 21, synapses: 4, ev: 0.675, slow: 0.125, fraud: 0.2, units: 1000, hidden: true,
        abilities: [cloneAbility(0.75, 120)] },
    ]),
  },

  // ---------------------------------------------------------------- income & support
  // kind 'income': never attacks; `income` is paid every wave.
  // kind 'support': boosts towers inside its `aura` (towers of the same type are never boosted).
  //   rangeBoost / rateBoost: Commander (+range, +firerate). Several Commanders don't stack.
  //   musicBoost / discount: DJ (+firerate, cheaper upgrades). Several DJs don't stack.
  //   Commander and DJ boosts do stack with each other.
  //   damage / cooldown / range: the Commander only shoots while Call to Arms is on.
  // abilities: buttons in the tower panel. { key, name, desc, cooldown, cost?, ... }
  //   cta:       +`boost` firerate for `duration` seconds to towers in the aura.
  //   militia:   sends `unit` down the path (so does any ability with `vehicle: true`).
  //   airstrike: pick a spot; `damage` to every zombie within `radius` (hidden ones too).
  //   rave:      every zombie inside the aura stops and dances for `duration` seconds.

  farm: {
    name: 'Farm',
    price: 500,
    cost: 300,
    limit: 8,
    kind: 'income',
    blurb: 'Never attacks. Gives you extra cash every wave on top of kills and wave bonuses. Each upgrade pays for itself in about 5 to 6 waves.',
    levels: [
      { name: 'Farm', desc: 'Earns $50 every wave.', income: 50, hidden: false },
      { name: 'Fertilizer', desc: 'Doubles its cash per wave.', cost: 250, income: 100, hidden: false },
      { name: 'Plantation', desc: 'Doubles it again.', cost: 550, income: 200, hidden: false },
      { name: 'Orchard', desc: 'A big jump in money per wave.', cost: 1200, income: 500, hidden: false },
      { name: 'Fruit of the Future', desc: 'A huge amount of cash every wave.', cost: 4800, income: 1500, hidden: false },
    ],
  },
  farmFruit: {
    name: 'Fruit Farm',
    altOf: 'farm',
    form: 'Fruit',
    shards: 1,
    price: 0,
    cost: 300,
    limit: 10,
    kind: 'income',
    stunImmune: true,
    blurb: 'An alternate Farm that grows a new crop at every level. Never attacks; gives you cash every wave. Its later crops pay much more, and you can place up to 10. Can\'t be stunned.',
    tip: 'Push Farms to Lv 3 and Lv 4 first, and get Lv 4 before Lv 5. Lv 5 Fruit Farms only pay off in long games.',
    levels: [
      { name: 'Fruit Farm', desc: 'Earns $60 every wave.', income: 60, hidden: false },
      { name: 'Wheat Farm', desc: 'Earns $225 every wave.', cost: 800, income: 225, hidden: false },
      { name: 'Tree Farm', desc: 'Earns $500 every wave.', cost: 1250, income: 500, hidden: false },
      { name: 'Apple Farm', desc: 'Earns $900 every wave.', cost: 2500, income: 900, hidden: false },
      { name: 'Space Fruit Farm', desc: 'Earns the most cash: $1,500 every wave.', cost: 4500, income: 1500, hidden: false },
    ],
  },
  // Airdrop Farm (alternate Farm form) with upgrade paths right after placing (see Tactical Sniper).
  // crates: a cargo plane drops this many cash crates on its helipad every wave; together they pay
  //         `income`. The first lands `drop` seconds into the wave, the rest `crateGap` s apart.
  //         Crates still in the air when the wave ends land right away. What a wave pays is fixed
  //         when the wave starts, so upgrades bought during a wave only count from the next one.
  // econ:   Tower Economics: each crate wave also pays `pct` of the money spent on every other
  //         (non-income) tower within `radius`, up to `max`.
  // noHeal: Medics and Health Packs can't heal it.
  farmAirdrop: {
    name: 'Airdrop Farm',
    altOf: 'farm',
    form: 'Airdrop',
    shards: 2,
    price: 0,
    cost: 475,
    limit: 8,
    kind: 'income',
    noHeal: true,
    crateGap: 3,
    branch: 'farmAirdropBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Farm: a helipad that never attacks. Every wave a cargo plane drops cash crates on it. Two upgrade paths right away. Top path: faster drops, more health, and Tower Economics pays a share of the value of expensive towers nearby. Bottom path: much more cash per crate, and two crates a wave at max level. Upgrades bought during a wave only start paying the next wave. Medics can't heal it.",
    tip: "Put Bottom path Farms where other towers wouldn't help, but put Top path Farms next to your most expensive towers. Crates take a while to drop, so don't rush through waves.",
    levels: [
      { name: 'Airdrop Farm', desc: 'A helipad. Every wave a cargo plane drops a $100 cash crate on it.', income: 100, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'Precision Crates', path: 'Top', desc: 'Top path: crates drop 50% faster.', cost: 50, income: 100, crates: 1, drop: 13, hp: 100, hidden: false },
      { name: 'War Bonds', path: 'Top', desc: '+$20 per crate.', cost: 100, income: 120, crates: 1, drop: 13, hp: 100, hidden: false },
      { name: 'Medical Aid', path: 'Top', desc: '+$150 per crate and 25 more health.', cost: 3000, income: 270, crates: 1, drop: 13, hp: 125, hidden: false },
      { name: 'Tower Economics', path: 'Top', desc: "+$175 per crate, plus 1% of the value of nearby towers (up to $5,000).", cost: 9750, income: 445, crates: 1, drop: 13, hp: 125, hidden: false,
        econ: { radius: 14, pct: 0.01, max: 5000 } },
      { name: 'Emergency Airdrop', path: 'Top', desc: '+$1,000 per crate and more health.', cost: 12500, income: 1445, crates: 1, drop: 13, hp: 175, hidden: false,
        econ: { radius: 14, pct: 0.01, max: 5000 } },
    ],
  },
  // The Airdrop Farm's Bottom path (not in the shop: an Airdrop Farm becomes this when you pick it).
  farmAirdropBottom: {
    name: 'Airdrop Farm',
    branchOf: 'farmAirdrop',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 475,
    limit: 8,
    kind: 'income',
    noHeal: true,
    crateGap: 3,
    blurb: "The Airdrop Farm's Bottom path: a lot more cash in every crate, and two crates every wave at max level.",
    tip: "Put it where other towers wouldn't help. Crates take a while to drop, so don't rush through waves.",
    levels: [
      { name: 'Airdrop Farm', desc: 'A helipad. Every wave a cargo plane drops a $100 cash crate on it.', income: 100, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'More Loot', path: 'Bottom', desc: 'Bottom path: +$150 per crate.', cost: 775, income: 250, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'Even More Loot', path: 'Bottom', desc: '+$250 per crate.', cost: 1250, income: 500, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'Valuable Goods', path: 'Bottom', desc: '+$375 per crate.', cost: 1850, income: 875, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'GDA Funding', path: 'Bottom', desc: '+$550 per crate.', cost: 3250, income: 1425, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'Double Crates', path: 'Bottom', desc: 'Two crates every wave, worth $1,725 together (+$300).', cost: 12750, income: 1725, crates: 2, drop: 20, hp: 100, hidden: false },
    ],
  },
  // Medic (support): never attacks. Shields the `shields` most valuable towers inside its `aura`
  // (any owner's, never other Medics). Shielded towers shoot `shieldRate` faster, and a stun that
  // hits them breaks the shield instead; it comes back after `recharge` seconds. Several Medics
  // never shield the same tower. `heal`: base health restored at the start of every wave.
  // `towerHeal`: health per second it restores to every damaged tower inside its aura (any owner's).
  // Ubercharge (ability): shielded towers deal +`boost` damage and ignore stuns for `duration` s.
  medic: {
    name: 'Medic',
    altOf: 'doctor',
    form: 'Medic',
    shards: 2,
    price: 0,
    cost: 400,
    limit: 4,
    kind: 'support',
    blurb: "Never attacks. Shields your best towers nearby with a medi gun: they shoot faster and the shield blocks stuns. Heals your base at the start of every wave and repairs damaged towers nearby. From Lv 3 it can Ubercharge them for bonus damage.",
    tip: 'Shield your most important towers, like ones with low placement limits. All 4 Medics maxed shield up to 20 towers. Medics stack with Commanders and DJs.',
    levels: [
      { name: 'Medic', desc: 'Shields 1 tower (15% faster firing, blocks stuns), heals the base 2 HP every wave, and repairs damaged towers nearby.', aura: 12, shields: 1, shieldRate: 0.15, recharge: 20, heal: 2, towerHeal: 4, hidden: false },
      { name: 'Prescribed Vitamins', desc: 'More range, shields 3 towers, heals more, and the shield recharges faster.', cost: 1075, aura: 14, shields: 3, shieldRate: 0.15, recharge: 15, heal: 4, towerHeal: 6, hidden: false },
      { name: 'BIG BRAIN', desc: 'A bit more range, and unlocks Ubercharge: shielded towers get a damage boost and can\'t be stunned for a while.', cost: 2400, aura: 15, shields: 3, shieldRate: 0.15, recharge: 15, heal: 4, towerHeal: 7, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +25% damage and stun immune for 7.5s', cooldown: 45, duration: 7.5, boost: 0.25 }] },
      { name: 'Medical Pack', desc: 'More range, shields 4 towers, heals more, faster recharge, and a stronger, longer Ubercharge.', cost: 5000, aura: 18, shields: 4, shieldRate: 0.15, recharge: 10, heal: 7, towerHeal: 10, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +40% damage and stun immune for 10s', cooldown: 45, duration: 10, boost: 0.4 }] },
      { name: 'MD-PhD', desc: 'More range, shields 5 towers, faster recharge, and an even stronger Ubercharge.', cost: 12000, aura: 20, shields: 5, shieldRate: 0.15, recharge: 7, heal: 7, towerHeal: 14, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +60% damage and stun immune for 10s', cooldown: 45, duration: 10, boost: 0.6 }] },
    ],
  },
  // Medigun Medic (alternate Medic form) with upgrade paths right after placing (see Tactical Sniper).
  // beamHeal: health per second its medi beam restores to ONE tower inside its `aura` (the most hurt
  //   one, any owner's; never itself, income towers, Sentries or `noHeal` / `packHealOnly` towers).
  //   Two Medigun Medics heal each other. The beam's target is the tower's `lock`.
  // Abilities (they lock the beam onto the current patient, or the most valuable tower in range):
  //   uberBeam: the Medic and its patient are invulnerable (no damage, stuns or smoke) for
  //             `duration` s, and both are cleared of debuffs and fully healed when it starts.
  //   kritz:    its patient (an attacking tower) deals +`boost` damage for `duration` s.
  medicBeam: {
    name: 'Medigun Medic',
    altOf: 'doctor',
    form: 'Medigun',
    shards: 2,
    price: 0,
    cost: 600,
    limit: 4,
    kind: 'support',
    branch: 'medicBeamBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Medic that never attacks: its medi beam heals the most hurt tower nearby. It can't heal itself, so place two to heal each other. Two upgrade paths right away. Top path: much more healing, and Uber makes the Medic and one tower invulnerable. Bottom path: a lot more range, and Kritz gives one tower a big damage boost. Can't heal farms, Sentries or the XWM Turret.",
    tip: 'Place at least 2 so they heal each other. Use Uber to save a tower from stuns and big hits, and Kritz on big hitters like the Railgunner.',
    levels: [
      { name: 'Medigun Medic', desc: 'Heals the most hurt tower nearby 50 HP/s.', aura: 12, beamHeal: 50, hp: 350, hidden: false },
      { name: 'Healing Cells', path: 'Top', desc: 'Top path: +20 healing per second, more range and health.', cost: 400, aura: 14, beamHeal: 70, hp: 400, hidden: false },
      { name: 'Bigger Beam', path: 'Top', desc: '+35 healing per second and more health.', cost: 825, aura: 14, beamHeal: 105, hp: 470, hidden: false },
      { name: 'Advanced Medigun', path: 'Top', desc: '+75 healing per second, more range and health.', cost: 3000, aura: 16, beamHeal: 180, hp: 670, hidden: false },
      { name: 'Uber Charge', path: 'Top', desc: 'Unlocks Uber: the Medic and its patient become invulnerable for 12s, cleared of debuffs and fully healed. +150 healing per second.', cost: 8000, aura: 19, beamHeal: 330, hp: 1145, hidden: false,
        abilities: [{ key: 'uberBeam', name: 'Uber', desc: 'The Medic and one tower are invulnerable for 12s, cleared of debuffs and fully healed', cooldown: 60, duration: 12 }] },
      { name: 'Max Uber', path: 'Top', desc: 'Uber lasts longer and recharges faster, and the Medic can\'t be stunned. +400 healing per second.', cost: 29000, aura: 25, beamHeal: 730, hp: 2545, stunImmune: true, hidden: false,
        abilities: [{ key: 'uberBeam', name: 'Uber', desc: 'The Medic and one tower are invulnerable for 16s, cleared of debuffs and fully healed', cooldown: 45, duration: 16 }] },
    ],
  },
  // The Medigun Medic's Bottom path (not in the shop: a Medigun Medic becomes this when you pick it).
  medicBeamBottom: {
    name: 'Medigun Medic',
    branchOf: 'medicBeam',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 600,
    limit: 4,
    kind: 'support',
    blurb: "The Medigun Medic's Bottom path: a lot more range, and Kritz gives one tower a big damage boost.",
    tip: 'Use Kritz on big hitters like the Railgunner, right when a boss walks into range.',
    levels: [
      { name: 'Medigun Medic', desc: 'Heals the most hurt tower nearby 50 HP/s.', aura: 12, beamHeal: 50, hp: 350, hidden: false },
      { name: 'Extended Range', path: 'Bottom', desc: 'Bottom path: more range and health.', cost: 150, aura: 14, beamHeal: 50, hp: 385, hidden: false },
      { name: 'Lasting Cells', path: 'Bottom', desc: 'More range and health.', cost: 450, aura: 17, beamHeal: 50, hp: 435, hidden: false },
      { name: 'Longer Range', path: 'Bottom', desc: 'A lot more range and +25 healing per second.', cost: 2800, aura: 26, beamHeal: 75, hp: 535, hidden: false },
      { name: 'Damage Charge', path: 'Bottom', desc: "Unlocks Kritz: one tower deals double damage for 10s. The Medic can't be stunned. +125 healing per second.", cost: 9250, aura: 28, beamHeal: 200, hp: 835, stunImmune: true, hidden: false,
        abilities: [{ key: 'kritz', name: 'Kritz', desc: 'One tower deals +100% damage for 10s', cooldown: 50, duration: 10, boost: 1 }] },
      { name: 'Kritz', path: 'Bottom', desc: 'Kritz gets stronger: +200% damage for 12s. +200 healing per second.', cost: 28000, aura: 28, beamHeal: 400, hp: 2035, stunImmune: true, hidden: false,
        abilities: [{ key: 'kritz', name: 'Kritz', desc: 'One tower deals +200% damage for 12s', cooldown: 50, duration: 12, boost: 2 }] },
    ],
  },
  commander: {
    name: 'Commander',
    lead: 4,
    price: 1200,
    cost: 700,
    limit: 4,
    kind: 'support',
    blurb: "Makes nearby towers better: more range, then faster shooting, then abilities to boost even harder, call in a Stryker and order airstrikes. Can't boost other Commanders.",
    levels: [
      { name: 'Commander', desc: 'Towers in range get +25% range.', aura: 14, rangeBoost: 0.25, hidden: false },
      { name: 'Drilling', desc: 'Towers in range also shoot 25% faster.', cost: 1000, aura: 14, rangeBoost: 0.25, rateBoost: 0.25, hidden: false },
      { name: 'Call to Arms', desc: 'Ability: nearby towers get an extra +50% firerate for 8 seconds, and the Commander shoots too.', cost: 2400, aura: 14, rangeBoost: 0.25, rateBoost: 0.25, hidden: false,
        damage: 3, cooldown: 1, range: 14,
        abilities: [{ key: 'cta', name: 'Call to Arms', desc: '+50% firerate for 8s', cooldown: 30, duration: 8, boost: 0.5 }] },
      { name: 'Organized Militia', desc: 'Ability: sends a tough Stryker vehicle down the path ($600 each use).', cost: 5000, aura: 14, rangeBoost: 0.25, rateBoost: 0.25, hidden: false,
        damage: 3, cooldown: 1, range: 14,
        abilities: [
          { key: 'cta', name: 'Call to Arms', desc: '+50% firerate for 8s', cooldown: 30, duration: 8, boost: 0.5 },
          { key: 'militia', name: 'Organized Militia', desc: 'Sends a 600 HP Stryker', cost: 600, cooldown: 20,
            unit: { name: 'Stryker', model: 'stryker', hp: 600, speed: 4.5, ram: true, gun: { damage: 2, cooldown: 0.25, range: 20 } } },
        ] },
      { name: 'Airstrike', desc: 'Ability: a jet bombs a spot you pick for 450 splash damage ($1,200 each use).', cost: 12000, aura: 14, rangeBoost: 0.25, rateBoost: 0.25, hidden: false,
        damage: 12, cooldown: 1, range: 14,
        abilities: [
          { key: 'cta', name: 'Call to Arms', desc: '+50% firerate for 8s', cooldown: 30, duration: 8, boost: 0.5 },
          { key: 'militia', name: 'Organized Militia', desc: 'Sends a 600 HP Stryker', cost: 600, cooldown: 20,
            unit: { name: 'Stryker', model: 'stryker', hp: 600, speed: 4.5, ram: true, gun: { damage: 2, cooldown: 0.25, range: 20 } } },
          { key: 'airstrike', name: 'Airstrike', desc: '450 damage where you click', cost: 1200, cooldown: 30, damage: 450, radius: 8, aim: true },
        ] },
    ],
  },
  // Classic Commander (alternate Commander form). fury: seconds it fights after using any ability.
  // caravan: sends `units` down the path (a little apart).
  commanderClassic: {
    name: 'Classic Commander',
    lead: 2,
    altOf: 'commander',
    form: 'Classic',
    shards: 1,
    price: 0,
    cost: 650,
    limit: 6,
    kind: 'support',
    fury: 10,
    blurb: 'An alternate Commander that makes nearby towers shoot faster. It has no normal attack: it only fights for 10 seconds ("fury mode") after you use one of its abilities. From Lv 3 it gets hidden, flying and lead detection and Call to Arms; at max level it sends a Support Caravan. Can\'t boost other Commanders.',
    tip: 'Place it near as many towers as possible; slow shooters like the Rocketeer and Sniper gain the most. Three Lv 3+ Classic Commanders taking turns using Call to Arms about every 10 seconds keep the boost almost always on.',
    levels: [
      { name: 'Classic Commander', desc: 'Towers in range shoot 10% faster.', aura: 10, rateBoost: 0.1, hidden: false },
      { name: 'Leadership', desc: 'The firerate boost goes up to 15%.', cost: 400, aura: 10, rateBoost: 0.15, hidden: false },
      { name: 'Call to Arms', desc: 'Hidden, flying and lead detection, more range, and unlocks Call to Arms: nearby towers get an extra +10% firerate for 10 seconds.', cost: 2450, aura: 13, rateBoost: 0.15, hidden: true,
        damage: 15, cooldown: 0.6, range: 13,
        abilities: [{ key: 'cta', name: 'Call to Arms', desc: '+10% firerate for 10s', cooldown: 30, duration: 10, boost: 0.1 }] },
      { name: 'Intense Training', desc: 'More range and damage. The boost goes up to 17.5% and Call to Arms to +15%.', cost: 4500, aura: 15, rateBoost: 0.175, hidden: true,
        damage: 30, cooldown: 0.6, range: 15,
        abilities: [{ key: 'cta', name: 'Call to Arms', desc: '+15% firerate for 10s', cooldown: 30, duration: 10, boost: 0.15 }] },
      { name: 'Strength in Numbers', desc: 'Both boosts go up to 20%, and unlocks Support Caravan: two Gunner APCs and a Missile APC drive down the path to fight.', cost: 14000, aura: 17, rateBoost: 0.2, hidden: true,
        damage: 50, cooldown: 0.6, range: 17,
        abilities: [
          { key: 'cta', name: 'Call to Arms', desc: '+20% firerate for 10s', cooldown: 30, duration: 10, boost: 0.2 },
          { key: 'caravan', name: 'Support Caravan', desc: 'Sends 2 Gunner APCs and a Missile APC', cooldown: 60,
            units: [
              { name: 'Gunner APC', model: 'apc', hp: 500, speed: 4, ram: true, lead: true, gun: { damage: 5, cooldown: 0.2, range: 17.5 } },
              { name: 'Gunner APC', model: 'apc', hp: 500, speed: 4, ram: true, lead: true, gun: { damage: 5, cooldown: 0.2, range: 17.5 } },
              { name: 'Missile APC', model: 'missileapc', hp: 800, speed: 4, ram: true, lead: true, flying: true,
                gun: { damage: 3, cooldown: 0.3, range: 20 }, cannon: { damage: 120, radius: 5, every: 2.5 } },
            ] },
        ] },
    ],
  },
  dj: {
    name: 'DJ',
    price: 1400,
    cost: 950,
    limit: 2,
    kind: 'support',
    blurb: 'Plays music and never deals damage. Towers in its big range shoot faster, later their upgrades get cheaper, and at max level it can make zombies dance.',
    levels: [
      { name: 'DJ', desc: 'Towers in range shoot 15% faster.', aura: 20, musicBoost: 0.15, hidden: false },
      { name: 'Louder Speakers', desc: 'More range and a bigger firerate boost.', cost: 600, aura: 25, musicBoost: 0.2, hidden: false },
      { name: 'Thrifty', desc: 'Upgrades become cheaper for every tower in its range.', cost: 2000, aura: 25, musicBoost: 0.2, discount: 0.1, hidden: false },
      { name: 'Encore', desc: 'More range, a bigger boost and a bigger discount.', cost: 6400, aura: 27, musicBoost: 0.25, discount: 0.15, hidden: false },
      { name: 'Apocalypse Rave', desc: 'Even more boost and discount, plus an ability that makes zombies in range stop and dance for 8 seconds.', cost: 12600, aura: 29, musicBoost: 0.3, discount: 0.2, hidden: false,
        abilities: [{ key: 'rave', name: 'Apocalypse Rave', desc: 'Zombies in range dance for 8s', cooldown: 40, duration: 8 }] },
    ],
  },
  // DJ Booth (alternate DJ form). It plays one track at a time (switched with the Switch Track
  // ability, tower field `track`, see TRACKS): Purple +`tracks.range` range, Green
  // `tracks.discount` off upgrades, Red (once `tracks.dmg` is set) +`tracks.dmg` damage.
  // offTrack: the tracks that aren't playing still give this fraction of their boost.
  // Drop the Beat (ability `beat`) does something different on each track:
  //   Purple: knocks zombies in range back `knock` (bosses `bossKnock` of that) and slows them by
  //           `slow` for `slowTime` s. Green: pays the owner `cash`. Red: `pulses` pulses `every`
  //           s apart, each `pulseDamage` to zombies in range; hit zombies take +`vuln` damage
  //           from everything for `vulnTime` s.
  djBooth: {
    name: 'DJ Booth',
    altOf: 'dj',
    form: 'Booth',
    shards: 1,
    price: 0,
    cost: 1000,
    limit: 1,
    lead: 3,
    kind: 'support',
    blurb: 'An alternate DJ that plays one track at a time. Purple gives nearby towers more range, Green makes their upgrades cheaper, and Red (from Lv 3) gives them more damage. From Lv 4 it can Drop the Beat, which does something different on each track. You can only have one.',
    tip: 'Use Green on easy waves to save money, Red against tough zombies or crowds, and Purple against fast ones. Great with expensive long-range towers like the Railgunner and Commando.',
    levels: [
      { name: 'DJ Booth', desc: 'Plays Purple (more range) or Green (cheaper upgrades) for towers in range.', aura: 18, hidden: false,
        tracks: { range: 0.15, discount: 0.1 },
        abilities: [{ key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 }] },
      { name: 'Laptop Studio', desc: 'More range.', cost: 450, aura: 22, hidden: false,
        tracks: { range: 0.15, discount: 0.1 },
        abilities: [{ key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 }] },
      { name: 'Party Mode', desc: 'Stronger tracks, and unlocks the Red track: towers in range deal more damage.', cost: 1500, aura: 22, hidden: false,
        tracks: { range: 0.2, discount: 0.15, dmg: 0.15 },
        abilities: [{ key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 }] },
      { name: 'Thrifty Music', desc: 'Gets lead detection and unlocks Drop the Beat: Purple knocks zombies back and slows them, Green makes cash, and Red sends damaging pulses that make zombies take more damage.', cost: 3000, aura: 22, hidden: false,
        tracks: { range: 0.2, discount: 0.15, dmg: 0.15 },
        abilities: [
          { key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 },
          { key: 'beat', name: 'Drop the Beat', desc: 'Purple: knockback 6 + 40% slow 4s. Green: +$400. Red: 4 pulses of 25 dmg, +15% damage taken 6s', cooldown: 45,
            knock: 6, bossKnock: 0.3, slow: 0.4, slowTime: 4, cash: 400, pulses: 4, every: 1, pulseDamage: 25, vuln: 0.15, vulnTime: 6 },
        ] },
      { name: 'Audio Visualizer', desc: 'More range, and every track and Drop the Beat gets stronger.', cost: 6500, aura: 25, hidden: false,
        tracks: { range: 0.25, discount: 0.2, dmg: 0.2 },
        abilities: [
          { key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 },
          { key: 'beat', name: 'Drop the Beat', desc: 'Purple: knockback 9 + 50% slow 5s. Green: +$800. Red: 5 pulses of 60 dmg, +20% damage taken 6s', cooldown: 45,
            knock: 9, bossKnock: 0.3, slow: 0.5, slowTime: 5, cash: 800, pulses: 5, every: 1, pulseDamage: 60, vuln: 0.2, vulnTime: 6 },
        ] },
      { name: 'Apocalypse Rave', desc: 'All three tracks play at once (the ones you didn\'t pick at half strength), and every track and Drop the Beat is at its strongest.', cost: 15000, aura: 28, hidden: false,
        tracks: { range: 0.3, discount: 0.25, dmg: 0.3 }, offTrack: 0.5,
        abilities: [
          { key: 'track', name: 'Switch Track', desc: 'Pick which track plays at full strength', cooldown: 1 },
          { key: 'beat', name: 'Drop the Beat', desc: 'Purple: knockback 12 + 60% slow 6s. Green: +$1,500. Red: 6 pulses of 150 dmg, +30% damage taken 8s', cooldown: 45,
            knock: 12, bossKnock: 0.3, slow: 0.6, slowTime: 6, cash: 1500, pulses: 6, every: 1, pulseDamage: 150, vuln: 0.3, vulnTime: 8 },
        ] },
    ],
  },
  // EDJ (alternate DJ form) with upgrade paths right after placing (see Tactical Sniper).
  // musicBoost is its firerate boost, musicRange its range boost (they count as DJ boosts: the
  // strongest DJ of any form wins). sellback: towers in range sell for that much more (+0.1 = 10%).
  // cdCut: towers in range get their abilities back that much faster (0.15 = 15% shorter cooldowns).
  // encore (ability): towers in range get +`boost` firerate and +`range` range for `duration` s.
  djEdj: {
    name: 'EDJ',
    altOf: 'dj',
    form: 'EDJ',
    shards: 2,
    price: 0,
    cost: 2000,
    limit: 2,
    kind: 'support',
    branch: 'djEdjBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate DJ with a small range that never deals damage: towers nearby shoot faster and see farther. Two upgrade paths right away. Top path: bigger boosts and the Encore ability. Bottom path: nearby towers' upgrades get up to 30% cheaper, they sell for more, and at max level their abilities recharge faster. Can't boost the Field Barracks or XWM Turret.",
    tip: 'Pair her with John and a Commander. Use the Bottom path next to expensive towers you still have to upgrade.',
    levels: [
      { name: 'EDJ', desc: 'Towers in range get +5% firerate and +5% range.', aura: 8.5, musicBoost: 0.05, musicRange: 0.05, hp: 400, hidden: false },
      { name: 'Bass Boosted', path: 'Top', desc: 'Top path: more range.', cost: 500, aura: 10.5, musicBoost: 0.05, musicRange: 0.05, hp: 420, hidden: false },
      { name: 'Aggressive Tracks', path: 'Top', desc: '+5% firerate boost.', cost: 1500, aura: 10.5, musicBoost: 0.1, musicRange: 0.05, hp: 470, hidden: false },
      { name: 'Rally Call', path: 'Top', desc: 'Bigger boosts and more range, and unlocks Encore: +40% firerate for 7s.', cost: 4300, aura: 11.5, musicBoost: 0.2, musicRange: 0.1, hp: 620, hidden: false,
        abilities: [{ key: 'encore', name: 'Encore', desc: 'Towers in range get +40% firerate for 7s', cooldown: 45, duration: 7, boost: 0.4 }] },
      { name: 'Encore', path: 'Top', desc: '+10% firerate boost.', cost: 5500, aura: 11.5, musicBoost: 0.3, musicRange: 0.1, hp: 970, hidden: false,
        abilities: [{ key: 'encore', name: 'Encore', desc: 'Towers in range get +40% firerate for 7s', cooldown: 45, duration: 7, boost: 0.4 }] },
      { name: 'Showdown', path: 'Top', desc: '+10% firerate and +10% range boost, and Encore becomes Super Encore: +60% firerate and +20% range for 10s.', cost: 20000, aura: 11.5, musicBoost: 0.4, musicRange: 0.2, hp: 1970, hidden: false,
        abilities: [{ key: 'encore', name: 'Super Encore', desc: 'Towers in range get +60% firerate and +20% range for 10s', cooldown: 45, duration: 10, boost: 0.6, range: 0.2 }] },
    ],
  },
  // The EDJ's Bottom path (not in the shop: an EDJ becomes this when you pick it).
  djEdjBottom: {
    name: 'EDJ',
    branchOf: 'djEdj',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 2000,
    limit: 2,
    kind: 'support',
    blurb: "The EDJ's Bottom path: more range boost, then nearby towers' upgrades get up to 30% cheaper and they sell for more. At max level their abilities recharge 15% faster.",
    tip: 'Place her next to expensive towers before you upgrade them.',
    levels: [
      { name: 'EDJ', desc: 'Towers in range get +5% firerate and +5% range.', aura: 8.5, musicBoost: 0.05, musicRange: 0.05, hp: 400, hidden: false },
      { name: 'Sound Effects', path: 'Bottom', desc: 'Bottom path: +5% range boost and more range.', cost: 850, aura: 9.5, musicBoost: 0.05, musicRange: 0.1, hp: 420, hidden: false },
      { name: 'Nice Rhythm', path: 'Bottom', desc: '+5% range boost.', cost: 1100, aura: 9.5, musicBoost: 0.05, musicRange: 0.15, hp: 470, hidden: false },
      { name: 'Budget Costs', path: 'Bottom', desc: 'Towers in range get 10% off upgrades and sell for 10% more.', cost: 3250, aura: 9.5, musicBoost: 0.05, musicRange: 0.15, discount: 0.1, sellback: 0.1, hp: 645, hidden: false },
      { name: 'Cosplay Party', path: 'Bottom', desc: '20% off upgrades, +5% range boost and more range.', cost: 7000, aura: 10.5, musicBoost: 0.05, musicRange: 0.2, discount: 0.2, sellback: 0.1, hp: 1145, hidden: false },
      { name: 'DJ Rave', path: 'Bottom', desc: '30% off upgrades, towers in range sell for 65% more, their ability cooldowns are 15% shorter, and more range.', cost: 16000, aura: 12.5, musicBoost: 0.05, musicRange: 0.2, discount: 0.3, sellback: 0.65, cdCut: 0.15, hp: 2245, hidden: false },
    ],
  },
  // ---------------------------------------------------------------- versus
  // Anarchist: a Versus tower. It shoots normally everywhere (and is cheaper outside Versus), but
  // its tricks only work in Versus: every `android.every` seconds it sends an Android to your
  // target. Abilities with `versus: true` hit the target's towers from afar (auto-aimed at their
  // biggest cluster of towers).
  //   smoke: towers within `radius` keep VERSUS.smokeRange of their range for `duration` s.
  //   pyro:  towers within `radius` are stunned for `duration` s; their units nearby take `unitDamage`.
  //   chip (No Mercy): takes `damage` base health from the target every `every` s, never below `floor`.
  anarchist: {
    name: 'Anarchist',
    price: 1400,
    cost: 650,
    survivalCost: 500,
    limit: 1,
    burstGap: 0.08,
    blurb: 'Versus tower: fires quick bursts and messes with your opponent. Sends Androids to their map, and its upgrades smoke or stun their towers. Short range, no hidden detection. Its tricks only work in Versus.',
    levels: [
      { name: 'Anarchist', desc: 'Fires quick bursts. In Versus, sends an Android to your target every 45 seconds.', damage: 1, burst: 3, cooldown: 1.3, range: 8, hidden: false,
        android: { type: 'android', every: 45 } },
      { name: 'Attrition', desc: 'Androids come more often: one every 30 seconds.', cost: 2, damage: 1, burst: 3, cooldown: 1.3, range: 8, hidden: false,
        android: { type: 'android', every: 30 } },
      { name: 'Smokes', desc: 'Ability: a helicopter drops a smoke bomb on your target\'s towers, halving their range for 12 seconds.', cost: 2, damage: 1, burst: 3, cooldown: 1.3, range: 8, hidden: false,
        android: { type: 'android', every: 30 },
        abilities: [{ key: 'smoke', name: 'Smokes', desc: '-50% range to enemy towers within 5.5 for 12s', cost: 400, cooldown: 30, duration: 12, radius: 5.5, versus: true }] },
      { name: 'Super Bots', desc: 'Sends Super Bots instead: tougher, faster Androids that hit the base harder.', cost: 2, damage: 1, burst: 3, cooldown: 1.3, range: 8, hidden: false,
        android: { type: 'superbot', every: 30 },
        abilities: [{ key: 'smoke', name: 'Smokes', desc: '-50% range to enemy towers within 5.5 for 12s', cost: 400, cooldown: 30, duration: 12, radius: 5.5, versus: true }] },
      { name: 'No Mercy', desc: 'Bursts of 9 with more damage and range. No Mercy keeps chipping 2 base health off your target (down to 2), and Pyrotechnics stuns their towers.', cost: 2500, damage: 3, burst: 9, cooldown: 1.6, range: 16, hidden: false,
        android: { type: 'superbot', every: 30 },
        chip: { damage: 2, every: 12, floor: 2 },
        abilities: [
          { key: 'smoke', name: 'Smokes', desc: '-50% range to enemy towers within 5.5 for 12s', cost: 400, cooldown: 30, duration: 12, radius: 5.5, versus: true },
          { key: 'pyro', name: 'Pyrotechnics', desc: 'Stuns enemy towers within 4.5 for 6s and hurts their units', cost: 900, cooldown: 40, duration: 6, radius: 4.5, unitDamage: 150, versus: true },
        ] },
    ],
  },

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
  // ---------------------------------------------------------------- golden perks
  // goldOf: this is the golden version of that one tower or form (only that form, not the whole
  // tower family). Bought with credits (`price`) in the Loadout once you own that form, then
  // switched on or off there. While on, it replaces that form in your loadout. Golden models are
  // the normal model recoloured gold (see goldify in models.js).
  // melt (on a level): every zombie it hits permanently loses that share of its armor.
  // Not used by the game yet (kept for later): aimDelay (Golden Demoman Loose Cannon removes it).
  goldMinigunner: {
    name: 'Golden Minigunner',
    goldOf: 'commandoMinigunner',
    lead: false,
    price: 10000,
    cost: 2400,
    limit: Infinity,
    blurb: 'The golden Minigunner. Revs up its minigun, then sprays bullets at one zombie very quickly. Lots of damage for its price and great against tough hidden zombies, but shorter range than most damage towers and risky very early. Never hits lead zombies.',
    tip: 'Two Lv 4s are better value than one Lv 5. Place them near the front of the path or in inside corners so they stay revved up.',
    levels: [
      { name: 'Golden Minigunner', desc: 'A golden minigun that fires very fast. Has to rev up first.', damage: 3, cooldown: 0.16, range: 16, rev: 2.2, hidden: false },
      { name: 'Improved Handling', desc: 'Shoots faster, and it can now see hidden zombies.', cost: 1000, damage: 3, cooldown: 0.12, range: 16, rev: 1.8, hidden: true },
      { name: 'Thermal Vision', desc: 'More damage and range.', cost: 4800, damage: 7, cooldown: 0.12, range: 20, rev: 1.8, hidden: true },
      { name: 'High Tech Armory', desc: 'More damage, faster shooting and a quicker rev-up.', cost: 13500, damage: 13, cooldown: 0.1, range: 20, rev: 1.1, hidden: true },
      { name: '24 Karat Gatling Gun', desc: "More damage and range. 'Fires 24K cartridges at 10,000 RPM.'", cost: 27500, damage: 20, cooldown: 0.1, range: 22, rev: 1.1, hidden: true },
    ],
  },
  goldPyromancer: {
    name: 'Golden Pyromancer',
    goldOf: 'flamethrowerPyro',
    lead: true,
    price: 10000,
    cost: 850,
    limit: 8,
    burnSlow: 0,
    blurb: 'The golden Pyromancer. Its flames pierce several ground zombies, set them on fire and melt away their armor. Sees hidden and lead zombies from Lv 1. Weak against fire-immune zombies, flying zombies and very tanky bosses.',
    tip: 'Place it near the start of the path to burn zombies and melt their armor before they reach your main towers.',
    levels: [
      { name: 'Golden Pyromancer', desc: 'Piercing flames that hit up to 4 zombies, burn them and melt their armor.', damage: 1, hits: 4, burn: 2, burnTime: 4, melt: 0.25, cooldown: 0.275, range: 9, cone: 0.4, flying: false, hidden: true },
      { name: 'Improved Handling', desc: 'Sprays faster, more range and wider flames.', cost: 325, damage: 1, hits: 4, burn: 2, burnTime: 4, melt: 0.25, cooldown: 0.175, range: 11, cone: 0.5, flying: false, hidden: true },
      { name: 'Golden Flare', desc: 'More damage and hits 2 more zombies.', cost: 900, damage: 2, hits: 6, burn: 2, burnTime: 4, melt: 0.25, cooldown: 0.175, range: 11, cone: 0.5, flying: false, hidden: true },
      { name: 'Ring Of Fire', desc: 'More damage and range, hotter and longer burns, hits 2 more zombies and melts more armor.', cost: 2777, damage: 4, hits: 8, burn: 5, burnTime: 8, melt: 0.4, cooldown: 0.175, range: 13.5, cone: 0.5, flying: false, hidden: true },
      { name: 'Eternal Ember', desc: 'Much hotter burns that basically never go out, and more armor melt.', cost: 7500, damage: 9, hits: 8, burn: 12, burnTime: 60, melt: 0.55, cooldown: 0.175, range: 13.5, cone: 0.5, flying: false, hidden: true },
      { name: "Kagutsuchi's Blood", desc: 'Huge burn damage, more range, hits up to 10 zombies and melts even more armor.', cost: 16000, damage: 12, hits: 10, burn: 30, burnTime: 60, melt: 0.7, cooldown: 0.175, range: 15, cone: 0.55, flying: false, hidden: true },
    ],
  },
  goldCrookBoss: {
    name: 'Golden Crook Boss',
    goldOf: 'crookBoss',
    lead: true,
    price: 10000,
    cost: 2400,
    limit: 5,
    callPause: 1.5,
    blurb: 'The golden Crook Boss. Shoots zombies himself and calls in golden goons with guns that see flying zombies (and hidden ones once they carry tommy guns). Huge late-game damage, but expensive, weak early, only 5 allowed, and his goons are fragile.',
    tip: 'After placing 5, fill other slots with towers like the Minigunner. His goons shine on maps where zombies can be hit from far away.',
    levels: [
      { name: 'Golden Crook Boss', desc: 'Shoots zombies (lead ones too) and calls in a Golden Pistol Goon.', damage: 12, cooldown: 0.8, range: 16.5, hidden: false, flying: false,
        goons: { every: 15, units: [GOLD_PISTOL_GOON] } },
      { name: 'Broke', desc: 'Shoots faster, more damage, and can now hit flying zombies.', cost: 1600, damage: 16, cooldown: 0.55, range: 16.5, hidden: false,
        goons: { every: 15, units: [GOLD_PISTOL_GOON] } },
      { name: 'Normie', desc: 'More range and damage, hidden detection, and calls Golden Pistol Goons two at a time.', cost: 3200, damage: 25, cooldown: 0.55, range: 19, hidden: true,
        goons: { every: 15, units: [GOLD_PISTOL_GOON, GOLD_PISTOL_GOON] } },
      { name: 'Gamer', desc: 'Shoots much faster with more range, and also calls in a tougher Golden Tommy Goon that sees hidden and flying zombies.', cost: 16500, damage: 25, cooldown: 0.18, range: 22, hidden: true,
        goons: { every: 15, units: [GOLD_PISTOL_GOON, GOLD_PISTOL_GOON, GOLD_TOMMY_GOON] } },
      { name: 'GOD', desc: 'A big damage boost, shoots even faster, and calls even stronger Golden Tommy Goon 2s.', cost: 50000, damage: 42, cooldown: 0.12, range: 22, hidden: true,
        goons: { every: 15, units: [GOLD_PISTOL_GOON, GOLD_PISTOL_GOON, GOLD_TOMMY_GOON_2] } },
    ],
  },
  goldScout: {
    name: 'Golden Classic Scout',
    goldOf: 'scoutClassic',
    lead: 3,
    price: 10000,
    cost: 250,
    limit: 10,
    blurb: 'The golden Classic Scout. A cheap, well-rounded tower you can place from the start that shoots one zombie at a time. Cheap hidden detection from Lv 3 and lead detection from Lv 4, but short range, no flying detection and mediocre late-game damage.',
    tip: 'Place several Lv 1s for early waves. Use them against weak hidden zombies, or in groups against hidden bosses.',
    levels: [
      { name: 'Golden Classic Scout', desc: 'A cheap golden handgun that shoots one zombie at a time.', damage: 2, cooldown: 0.75, range: 14, flying: false, hidden: false },
      { name: 'Higher Caliber', desc: 'Shoots faster with a bit more range.', cost: 150, damage: 2, cooldown: 0.5, range: 15, flying: false, hidden: false },
      { name: 'Precise Aiming', desc: 'More damage, and it can now see hidden zombies.', cost: 600, damage: 5, cooldown: 0.5, range: 15, flying: false, hidden: true },
      { name: 'Golden Deagle', desc: 'Slower but much harder-hitting shots, more range and lead detection.', cost: 1800, damage: 30, cooldown: 1.2, range: 18, flying: false, hidden: true },
      { name: 'Twin Sovereigns', desc: 'Two golden pistols: shoots twice as fast with a bit more damage.', cost: 4000, damage: 36, cooldown: 0.6, range: 18, flying: false, hidden: true },
    ],
  },
  goldCowboy: {
    name: 'Golden Cowboy',
    goldOf: 'cowboy',
    lead: false,
    flying: false,
    price: 10000,
    cost: 600,
    limit: 12,
    blurb: 'The golden Cowboy. Shoots one ground zombie at a time, and every few shots it fires a cash shot and spins its gun, so it helps with damage and money all game, sometimes as much as a Farm. Can\'t hit lead or flying zombies, and sees hidden ones from Lv 4.',
    tip: 'Place several cheap Lv 1s early. Several Lv 3s are great for early farming.',
    levels: [
      { name: 'Golden Cowboy', desc: 'A golden revolver that earns $35 with every 6th shot.', damage: 3, cooldown: 0.9, range: 13, hidden: false,
        cash: { every: 6, pay: 35, spin: 1 } },
      { name: 'Headshot Practice', desc: 'Shoots faster, more range and a quicker cash spin.', cost: 200, damage: 3, cooldown: 0.75, range: 15, hidden: false,
        cash: { every: 6, pay: 35, spin: 0.35 } },
      { name: 'Gold Shot', desc: 'More damage, and each cash shot pays more.', cost: 650, damage: 5, cooldown: 0.75, range: 15, hidden: false,
        cash: { every: 6, pay: 60, spin: 0.35 } },
      { name: 'Deadly Precision', desc: 'More range, damage and firerate, hidden detection and a quicker cash spin.', cost: 2400, damage: 12, cooldown: 0.6, range: 17.5, hidden: true,
        cash: { every: 6, pay: 60, spin: 0.3 } },
      { name: 'Double Tap II', desc: 'Shoots twice as fast with more range. Cash shots now come every 12th shot but pay much more.', cost: 4250, damage: 12, cooldown: 0.3, range: 20, hidden: true,
        cash: { every: 12, pay: 150, spin: 0.6 } },
      { name: 'Wildest Of The West', desc: 'A big damage boost, even more cash and a faster cash spin.', cost: 9750, damage: 26, cooldown: 0.3, range: 20, hidden: true,
        cash: { every: 12, pay: 225, spin: 0.45 } },
    ],
  },
  goldSoldier: {
    name: 'Golden Soldier',
    goldOf: 'soldierClassic',
    lead: false,
    price: 10000,
    cost: 450,
    limit: 10,
    blurb: 'The golden Classic Soldier. Fires bursts of bullets and sees flying zombies from the start, then switches to nonstop fire at Lv 4. Cheap anti-air and great at clearing hordes, with hidden detection from Lv 3. Falls off against high-health zombies late game.',
    tip: 'A Lv 3 is a strong cheap early tower. Several Lv 4-5s handle mid-game waves.',
    levels: [
      { name: 'Golden Soldier', desc: 'Fires a golden rifle in quick 5-shot bursts.', damage: 1, burst: 5, burstGap: 0.15, cooldown: 1.31, range: 17, hidden: false },
      { name: 'Trigger Finger', desc: 'Shoots faster, with a shorter pause between bursts.', cost: 150, damage: 1, burst: 5, burstGap: 0.12, cooldown: 1.04, range: 17, hidden: false },
      { name: 'Field Training', desc: 'More damage and range, bigger bursts, and it can now see hidden zombies.', cost: 800, damage: 2, burst: 8, burstGap: 0.12, cooldown: 1.52, range: 20, hidden: true },
      { name: 'Gilded Gear', desc: 'More damage and no more pauses: it fires nonstop.', cost: 3400, damage: 4, cooldown: 0.12, range: 20, hidden: true },
      { name: 'Maximum Potential', desc: 'More range and a big damage boost.', cost: 11350, damage: 12, cooldown: 0.12, range: 22, hidden: true },
    ],
  },
  goldDemoman: {
    name: 'Golden Demoman',
    goldOf: 'grenadierDemo',
    lead: true,
    price: 10000,
    cost: 875,
    limit: Infinity,
    flying: false,
    lob: 0.9,
    blurb: 'The golden Demo Expert. Throws exploding golden grenades that hit every zombie in the blast for full damage, and throws fast for a splash tower. Place as many as you like. Hits lead zombies, sees hidden ones from Lv 3, but can\'t target flying zombies and is weak against big bosses.',
    tip: 'A strong starter: place one at the front and get it to Lv 4 first.',
    levels: [
      { name: 'Golden Demoman', desc: 'Throws golden grenades that hurt every zombie in the blast.', damage: 10, cooldown: 1.95, range: 12, radius: 4.5, hidden: false },
      { name: 'Faster Pitch', desc: 'More range and throws faster.', cost: 200, damage: 10, cooldown: 1.8, range: 13.5, radius: 4.5, hidden: false },
      { name: 'Golden Handshake', desc: 'More damage, a bigger blast, and it can now see hidden zombies.', cost: 1150, damage: 18, cooldown: 1.8, range: 13.5, radius: 5, hidden: true },
      { name: 'Loose Cannon', desc: 'Throws much faster with more damage and range, a bigger blast and faster grenades.', cost: 2650, damage: 25, cooldown: 1.1, range: 15, radius: 5.5, hidden: true, lob: 0.55, aimDelay: 0 },
      { name: 'A Thousand Exploding Suns', desc: "More range, throws much faster, and can't be stunned.", cost: 7750, damage: 25, cooldown: 0.45, range: 17, radius: 5.5, hidden: true, lob: 0.55, aimDelay: 0, stunImmune: true },
    ],
  },
  // Golden Scout (base Scout): Lv 4 `spy` shares hidden detection with every tower inside its range.
  goldScoutBase: {
    name: 'Golden Scout',
    goldOf: 'scout',
    lead: 3,
    flying: false,
    price: 3500,
    cost: 690,
    limit: 10,
    blurb: 'The golden Scout. Shoots one zombie at a time and does far more damage than a normal Scout, but costs more. Its damage jumps a lot at Lv 3 and Lv 5, so it is useful early and late. Only sees hidden zombies from Lv 4, which is expensive early on. Ground only.',
    tip: 'Save up for Lv 3 and Lv 5, its big damage jumps. Lv 4 lets nearby towers see hidden zombies too.',
    levels: [
      { name: 'Golden Scout', desc: 'A golden Scout that shoots one zombie at a time.', damage: 4, cooldown: 1.23, range: 12.5, hidden: false },
      { name: 'Epic Glasses', desc: 'More range, plus yellow sunglasses.', cost: 180, damage: 4, cooldown: 1.23, range: 16, hidden: false },
      { name: 'Epic Deagle', desc: 'Triples its damage per shot with a golden Desert Eagle.', cost: 1200, damage: 12, cooldown: 1.23, range: 16, hidden: false },
      { name: 'Gilded Detective', desc: 'Sees hidden zombies and shares hidden detection with every tower in its range. Shoots about twice as fast with two pistols.', cost: 2800, damage: 12, cooldown: 0.6, range: 16, hidden: true, spy: true },
      { name: 'AGENT AU', desc: 'Quadruples its damage and adds a bit of range. Gets a halo, golden wings and laser guns.', cost: 12000, damage: 48, cooldown: 0.6, range: 18, hidden: true, spy: true },
    ],
  },
  goldCommando: {
    name: 'Golden Commando',
    goldOf: 'commando',
    lead: 4,
    flying: false,
    price: 8500,
    cost: 4690,
    limit: 6,
    blurb: 'The golden Commando. Sprays fast, strong bullets at one ground zombie at a time. Shreds zombies mid to late game once upgraded, but it is the most expensive tower to max out and you can only place six.',
    tip: 'Save it for mid to late game because of its price, and get it to Lv 3 early for hidden detection.',
    levels: [
      { name: 'Golden Commando', desc: 'A golden minigun that sprays bullets at one zombie at a time.', damage: 2, cooldown: 0.1, range: 25, hidden: false },
      { name: 'Grip', desc: 'A bit more range, plus gold gloves.', cost: 400, damage: 2, cooldown: 0.1, range: 28, hidden: false },
      { name: 'Gold Goggles', desc: 'Hidden detection and a little more range.', cost: 1200, damage: 2, cooldown: 0.1, range: 30, hidden: true },
      { name: 'Golden Heavy Cannon', desc: 'A six-barrel spinning cannon: four times the damage per bullet.', cost: 16000, damage: 8, cooldown: 0.1, range: 30, hidden: true },
      { name: 'Golden Laser Cannon', desc: 'An eight-barrel laser cannon with much more damage, faster fire and more range, plus golden armor, wings and a halo.', cost: 95000, damage: 20, cooldown: 0.066, range: 34, hidden: true },
    ],
  },

  // ---------------------------------------------------------------- event towers
  // event: where the tower came from. Event towers can't be bought in the shop: they only unlock
  // with the Konami code (in the menus) and have their own section in the Loadout screen.
  // ignite (splash towers): every zombie in the blast catches fire for `time` s, taking `dps`
  //        per second and moving `def.burnSlow` slower (it keeps hitting burning zombies).
  // freeze on a tower without `radius` (Sleeter): every shot freezes the zombie it hits.
  // skipBurning: it won't shoot zombies that are on fire (or already frozen).
  // freezeMain (Snowballer): only the zombie the snowball was thrown at gets frozen.
  // leadCap: it aims as if no zombie moves faster than this, so its lobs miss fast zombies.
  // splash: 0 = a lob that only hurts the zombie it was thrown at.
  // payday: a bounty timer of `every` s that only counts down while a zombie is in range; each
  //         time it runs out the owner gets `pay` cash. burstStops: a burst ends when its target dies.
  // kindLabel: the attack type shown in the shop (instead of the guessed one).
  elf: {
    name: 'Elf',
    event: 'Christmas 2017 event reward (no longer obtainable)',
    cost: 400,
    limit: 10,
    lob: 0.8,
    blurb: 'The prize for winning Christmas 2017. Throws exploding presents, and each blast hurts every zombie bunched up where it lands. Does very little damage to one strong zombie, even maxed.',
    tip: 'Get it to Lv 3 early so it can see hidden zombies.',
    levels: [
      { name: 'Elf', desc: 'Throws exploding presents that hurt every zombie in the blast.', damage: 2, cooldown: 3, range: 13, radius: 4, hidden: false },
      { name: 'Rapid Reload', desc: 'Throws presents faster.', cost: 300, damage: 2, cooldown: 2, range: 13, radius: 4, hidden: false },
      { name: 'Elf Tech', desc: 'A headset gives it hidden detection, and a little more range.', cost: 360, damage: 2, cooldown: 2, range: 14, radius: 4, hidden: true },
      { name: 'Present Boom', desc: 'Double present damage and a bigger blast.', cost: 850, damage: 4, cooldown: 2, range: 14, radius: 5, hidden: true },
      { name: 'Fireworks', desc: 'Fireworks: much more damage, a huge blast and more range.', cost: 2700, damage: 10, cooldown: 2, range: 15, radius: 7, hidden: true },
    ],
  },
  hallowboomer: {
    name: 'Hallowboomer',
    event: 'Halloween 2018 reward (sold for 750 Candy in Halloween 2023)',
    lead: true,
    cost: 600,
    limit: 8,
    lob: 0.9,
    burnSlow: 0.4,
    blurb: 'Throws flaming pumpkins. Each one explodes and sets every zombie in the blast on fire: burning zombies take extra damage and walk 40% slower. Its direct hits are weak until the later upgrades.',
    tip: 'Unlike the Flamethrower, it keeps shooting zombies that are already burning. It can even set bosses on fire to slow them.',
    levels: [
      { name: 'Hallowboomer', desc: 'Flaming pumpkins that set every zombie in the blast on fire.', damage: 1, cooldown: 3.08, range: 13, radius: 3, ignite: { dps: 1, time: 3 }, hidden: false },
      { name: 'Specs', desc: 'More range.', cost: 200, damage: 1, cooldown: 3.08, range: 16, radius: 3, ignite: { dps: 1, time: 3 }, hidden: false },
      { name: 'Raking Season', desc: 'Double damage, throws faster and a much bigger blast.', cost: 700, damage: 2, cooldown: 2.65, range: 16, radius: 5.5, ignite: { dps: 1, time: 3 }, hidden: false },
      { name: 'Pumpkin Juice', desc: 'Double damage, and the fire burns twice as hot and much longer.', cost: 1600, damage: 4, cooldown: 2.65, range: 16, radius: 5.5, ignite: { dps: 2, time: 7 }, hidden: false },
      { name: 'Spooky Rampage', desc: 'Double damage, much hotter and longer burns, throws twice as fast, a bigger blast and more range.', cost: 4500, damage: 8, cooldown: 1.35, range: 17, radius: 6.5, ignite: { dps: 5, time: 9 }, hidden: false },
    ],
  },
  graveyard: {
    name: 'Graveyard',
    event: 'Halloween 2020 reward (sold for 1,000 Candy in Halloween 2023)',
    cost: 450,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 20,
    blurb: "Doesn't shoot. Keeps sending undead units onto the path that hurt zombies by crashing into them or hitting them up close. Its first levels only make tiny skeletons that do very little.",
    tip: 'Most of its power is in Lv 4 and 5, so save up for that very expensive last upgrade.',
    levels: [
      { name: 'Graveyard', desc: 'Sends a small Skeleton down the path every 20 seconds.', hidden: false, unit: GRAVE.skeleton },
      { name: 'Extra Capacity', desc: 'Sends a Skeleton every 10 seconds instead of 20.', cost: 400, hidden: false, spawnEvery: 10, unit: GRAVE.skeleton },
      { name: 'Giant Skeleton', desc: 'Also sends a tougher Giant Skeleton every 40 seconds.', cost: 1400, hidden: false, spawnEvery: 10, unit: GRAVE.skeleton,
        unit2: GRAVE.giant, spawnEvery2: 40 },
      { name: 'Fallen Warriors', desc: 'Also sends a sword-swinging Haunted Knight every 45 seconds.', cost: 6200, hidden: false, spawnEvery: 10, unit: GRAVE.skeleton,
        unit2: GRAVE.giant, spawnEvery2: 40, unit3: GRAVE.knight, spawnEvery3: 45 },
      { name: 'Return of the King', desc: 'Summons Jack every 100 seconds, and every unit gets a stronger cursed version.', cost: 40000, hidden: false, spawnEvery: 10, unit: GRAVE.cursed,
        unit2: GRAVE.giantCursed, spawnEvery2: 40, unit3: GRAVE.hallowKnight, spawnEvery3: 45, unit4: GRAVE.jack, spawnEvery4: 100 },
    ],
  },
  sleeter: {
    name: 'Sleeter',
    event: 'Winter 2019 event reward (unobtainable since March 2019)',
    cost: 700,
    limit: 8,
    bossStop: 0.5,
    skipBurning: true,
    blurb: "The prize for Winter 2019. Fires bursts of ice shots that freeze zombies in place for a moment, even fast ones and bosses (for less time). It won't shoot zombies that are already frozen or burning, so keep it away from fire towers.",
    tip: 'Several Sleeters can freeze almost a whole crowd. Keep it away from Flamethrowers and Hallowboomers.',
    levels: [
      { name: 'Sleeter', desc: '3-shot bursts of ice: every shot freezes the zombie it hits.', damage: 2, burst: 3, burstGap: 0.15, cooldown: 2.08, range: 10, freeze: 0.8, hidden: false },
      { name: 'Permafrost', desc: 'After a zombie thaws out, it stays 5% slower for good.', cost: 450, damage: 2, burst: 3, burstGap: 0.15, cooldown: 2.08, range: 10, freeze: 0.8, frostbite: 0.05, hidden: false },
      { name: 'Radio', desc: 'Hidden detection, a little more range and damage.', cost: 650, damage: 3, burst: 3, burstGap: 0.15, cooldown: 2.08, range: 11, freeze: 0.8, frostbite: 0.05, hidden: true },
      { name: 'Arctic Gorilla', desc: 'Double damage, 5-shot bursts and freezes last twice as long.', cost: 3200, damage: 6, burst: 5, burstGap: 0.15, cooldown: 2.08, range: 11, freeze: 1.7, frostbite: 0.05, hidden: true },
      { name: 'Subzero Hero', desc: 'Double damage, faster bursts, 3s freezes, more range, and thawed zombies stay 20% slower for good.', cost: 7500, damage: 12, burst: 5, burstGap: 0.15, cooldown: 1.85, range: 12, freeze: 3, frostbite: 0.2, hidden: true },
    ],
  },
  snowballer: {
    name: 'Snowballer',
    event: 'Sold for 500 credits for a limited time (no longer sold)',
    flying: false,
    cost: 100,
    limit: 12,
    lob: 0.9,
    leadCap: 6.5,
    bossStop: 0.5,
    kindLabel: 'Single',
    blurb: 'Throws snowballs that fly through the air at one ground zombie, so they can miss fast zombies. Cheap early defense, and from Lv 4 its snowballs freeze what they hit. It never sees hidden zombies.',
    tip: "It only costs $100 to place, so it's great at the very start. From Lv 4 it can even freeze bosses for a moment.",
    levels: [
      { name: 'Snowballer', desc: 'Throws snowballs at one zombie. They can miss fast zombies.', damage: 1, cooldown: 3, range: 7.8, radius: 1.3, splash: 0, hidden: false },
      { name: 'Warm Gloves', desc: 'Throws faster with more range.', cost: 80, damage: 1, cooldown: 2, range: 9.5, radius: 1.3, splash: 0, hidden: false },
      { name: 'Thick Snow', desc: 'Double snowball damage.', cost: 280, damage: 2, cooldown: 2, range: 9.5, radius: 1.3, splash: 0, hidden: false },
      { name: 'Icy Snowballs', desc: 'Snowballs do 18 damage and freeze the zombie they hit for 1 second.', cost: 620, damage: 6, cooldown: 2, range: 9.5, radius: 1.3, splash: 0, freeze: 1, freezeMain: true, hidden: false },
      { name: 'Death Ball', desc: 'Snowballs do 36 damage, splash 15 damage onto zombies nearby, and freeze for 2.5s.', cost: 3000, damage: 12, cooldown: 2, range: 9.5, radius: 4, splash: 5, freeze: 2.5, freezeMain: true, hidden: false },
    ],
  },
  huntsman: {
    name: 'Huntsman',
    event: 'Tournament winners and map contributors only',
    flying: false,
    cost: 1000,
    limit: 6,
    burstStops: true,
    blurb: 'A rare tower for tournament winners. Fires long bullet bursts at ground zombies and sees hidden zombies from the start. From Lv 3 its Bounty timer pays you cash while zombies are in range. If its target dies, the burst stops early.',
    tip: 'Get it to Lv 3 quickly to start earning Bounty cash.',
    levels: [
      { name: 'Huntsman', desc: 'Long bullet bursts, with hidden detection from the start.', damage: 1, burst: 10, burstGap: 0.07, cooldown: 1.9, range: 11.5, hidden: true },
      { name: 'Longshot', desc: 'Laser sights: much more range.', cost: 260, damage: 1, burst: 10, burstGap: 0.07, cooldown: 1.9, range: 15.5, hidden: true },
      { name: 'Payday', desc: 'Bounty: a 15s timer counts down while zombies are in range (pausing when none are) and pays $80 each time.', cost: 1500, damage: 1, burst: 10, burstGap: 0.07, cooldown: 1.9, range: 15.5, hidden: true,
        payday: { every: 15, pay: 80 } },
      { name: 'Double Tap', desc: 'Two guns: 20-shot bursts, slightly faster shots, and Bounty pays $160.', cost: 1750, damage: 1, burst: 20, burstGap: 0.06, cooldown: 2.4, range: 15.5, hidden: true,
        payday: { every: 15, pay: 160 } },
      { name: 'Harvester', desc: '4 damage per bullet, 36-shot bursts, more range, and Bounty pays $380 every 10s.', cost: 6400, damage: 4, burst: 36, burstGap: 0.06, cooldown: 3.36, range: 18, hidden: true,
        payday: { every: 10, pay: 380 } },
    ],
  },
  // arrow: { speed, pierce }: a slow arrow flies straight at where the zombie is now, out to the
  //        tower's range, hitting the first `pierce` zombies it passes (it doesn't lead its
  //        target, so it misses zombies walking across its path). With `ignite`, arrows set
  //        every zombie they hit on fire.
  archer: {
    name: 'Archer',
    event: 'Event reward',
    flying: false,
    cost: 650,
    limit: 8,
    kindLabel: 'Pierce',
    blurb: "Shoots slow arrows in a straight line that pierce through up to three zombies, and later sets them on fire. The arrows don't lead their target, so they often miss zombies that aren't walking along the arrow's path.",
    tip: 'Place it where zombies walk straight toward or away from it so the arrows land.',
    levels: [
      { name: 'Archer', desc: 'Slow arrows that fly in a straight line and pierce up to 3 zombies.', damage: 6, cooldown: 3, range: 16, arrow: { speed: 22, pierce: 3 }, hidden: false },
      { name: 'Quick Hand', desc: 'Shoots every 2s instead of 3s.', cost: 260, damage: 6, cooldown: 2, range: 16, arrow: { speed: 22, pierce: 3 }, hidden: false },
      { name: 'Extra Sight', desc: 'Heat-vision goggles: hidden detection, more range and damage.', cost: 780, damage: 8, cooldown: 2, range: 19, arrow: { speed: 22, pierce: 3 }, hidden: true },
      { name: 'Flaming Arrows', desc: 'Arrows set zombies on fire, and damage goes from 13 to 19.', cost: 1950, damage: 12, cooldown: 2, range: 19, arrow: { speed: 22, pierce: 3 }, ignite: { dps: 4, time: 3 }, hidden: true },
      { name: 'Taste for Blood', desc: 'A crossbow: 48 damage per flaming bolt and each bolt pierces up to 5 zombies, but it fires every 2.5s and has less range.', cost: 6400, damage: 30, cooldown: 2.5, range: 17, arrow: { speed: 30, pierce: 5 }, ignite: { dps: 10, time: 4 }, hidden: true },
    ],
  },
  // toss: { damage, every, range, speed, injure? }: on top of its melee swings, it throws a knife
  //       every `every` s at a zombie within the much larger `range` (the knife leads its target).
  //       injure: { amount, time }: zombies hit by a thrown knife take `amount` more damage from
  //       every Knifer for `time` s.
  // focus: { per, max }: every swing in a row on the same zombie does `per` more damage, up to
  //        +`max` (switching targets resets it).
  // skipStopped: it won't shoot zombies that are already stunned or frozen.
  // stunAny: it stuns zombies that normally can't be stunned (bosses still get `bossStop` of it), but never Void enemies.
  // bossGrace: after one of its stuns wears off, a boss can't be stunned by it again for this many s.
  // noBuff: support towers can't boost it.
  stunner: {
    name: 'Stunner',
    event: 'Event reward',
    flying: false,
    cost: 200,
    limit: 8,
    skipStopped: true,
    stunAny: true,
    bossStop: 0.25,
    bossGrace: 2,
    noBuff: true,
    kindLabel: 'Stun',
    blurb: 'Zaps zombies with a taser to stun them for a while, even ones that normally can\'t be stunned (bosses for a quarter of the time). Cheaper than a Cryo-Gunner, but it barely does damage, has no splash, never sees hidden zombies and can\'t be boosted.',
    tip: 'Pair it with strong damage towers so they can hit zombies while they\'re stunned.',
    levels: [
      { name: 'Stunner', desc: 'A taser that stuns one zombie for 5.25s. No damage.', damage: 0, cooldown: 3.05, range: 8, stun: 5.25, hidden: false },
      { name: 'Bigger Zap', desc: 'Stuns last 6s instead of 5.25s.', cost: 200, damage: 0, cooldown: 3.05, range: 8, stun: 6, hidden: false },
      { name: 'Heavy Duty', desc: 'Now does 1 damage per zap, and more range.', cost: 380, damage: 1, cooldown: 3.05, range: 10, stun: 6, hidden: false },
      { name: 'Peacekeeper', desc: 'Zaps every 2.05s instead of 3.05s.', cost: 400, damage: 1, cooldown: 2.05, range: 10, stun: 6, hidden: false },
      { name: 'Thunder God', desc: '2 damage per zap, zaps every 1.15s, 10s stuns and more range.', cost: 1400, damage: 2, cooldown: 1.15, range: 12, stun: 10, hidden: false },
    ],
  },
  // harpoon: { slow, time }: each harpoon slows the zombie it hits by `slow` for `time` s. Harpoons
  //          stack up to `harpoonMax`, and together with fire slows (Flamethrower, Hallowboomer)
  //          up to `slowCap`.
  // Not used by the game yet (kept for later): speed (harpoon flight speed; harpoons hit
  // instantly for now).
  // voidSlow: the most Void enemies can be slowed by its harpoons.
  harpoonHunter: {
    name: 'Harpoon Hunter',
    fly: 65, // harpoons fly at the level's `speed`
    event: 'Event reward',
    cost: 650,
    limit: 6,
    placement: 'cliff',
    harpoonMax: 0.5,
    slowCap: 0.9,
    voidSlow: 0.1,
    kindLabel: 'Slow',
    blurb: 'Fires harpoons from a cliff that stick into zombies and slow them. Each harpoon adds more slow, up to 50%, and with fire slows up to 90%. Big, cost-efficient damage on tough zombies mid to late game. Cliffs only. Never sees hidden zombies, and its slow firerate makes it poor early.',
    tip: 'Use it like a Marksman for tough zombies, paired with something that has hidden detection.',
    levels: [
      { name: 'Harpoon Hunter', desc: 'Harpoons that slow the zombie they hit by 10% for 4s (stacking up to 50%).', damage: 4, cooldown: 2.2, range: 18, speed: 65, harpoon: { slow: 0.1, time: 4 }, hidden: false },
      { name: 'Pressure Gauge', desc: 'Faster harpoons and more range.', cost: 300, damage: 4, cooldown: 2.2, range: 22.5, speed: 80, harpoon: { slow: 0.1, time: 4 }, hidden: false },
      { name: 'Precision', desc: 'Damage 4 → 10, fires a bit faster, and harpoons last 5s.', cost: 750, damage: 10, cooldown: 2, range: 22.5, speed: 80, harpoon: { slow: 0.1, time: 5 }, hidden: false },
      { name: 'Titanium Enforced', desc: 'Damage 10 → 25, and harpoons slow by 15% for 6s.', cost: 1500, damage: 25, cooldown: 2, range: 22.5, speed: 80, harpoon: { slow: 0.15, time: 6 }, hidden: false },
      { name: 'Apex Predator', desc: 'Damage 25 → 100, harpoons slow by 25% for 8s, and much more range.', cost: 7500, damage: 100, cooldown: 2, range: 32, speed: 80, harpoon: { slow: 0.25, time: 8 }, hidden: false },
    ],
  },
  // ---------------------------------------------------------------- event towers (wave 2)
  // parry: blocks every stun aimed at it (not freezes or debuffs), but then stops attacking for
  //        this many s. fireAspect: { every, dps, time }: every `every` s its next swing sets every
  //        zombie it hits on fire (`dps` per second for `time` s, no slow).
  gladiator: {
    name: 'Gladiator',
    event: 'Event reward',
    flying: false,
    lead: 3,
    cost: 525,
    limit: Infinity,
    melee: true,
    parry: 0.75,
    kindLabel: 'Multi',
    blurb: 'An early melee fighter that swings a sword in an arc, hitting several zombies at once. Sees hidden zombies from the start and parries stuns (it pauses for a moment after a parry). Very short range, and it can\'t hit flying zombies.',
    tip: 'Place it at bends or where paths cross so it covers more of the path. It has no placement limit, so stack several around a corner.',
    levels: [
      { name: 'Gladiator', desc: 'Swings a sword at up to 2 zombies, sees hidden zombies and parries stuns.', damage: 5, cooldown: 0.95, range: 5.5, targets: 2, hidden: true },
      { name: 'Arena Conditioning', desc: 'Damage 2.8 → 3.9 and faster swings.', cost: 375, damage: 7, cooldown: 0.8, range: 5.5, targets: 2, hidden: true },
      { name: "Warrior's Call", desc: 'Damage 3.9 → 9.4. Unlocks War Cry: swings 65% faster for 15s.', cost: 1250, damage: 17, cooldown: 0.8, range: 5.5, targets: 2, hidden: true,
        abilities: [WARCRY_AB] },
      { name: "Champion's Flame", desc: 'Damage 9.4 → 15, more range, faster swings, hits 5 zombies and lead detection. Fire Aspect: every 4s its next swing sets zombies on fire.', cost: 2125, damage: 27, cooldown: 0.7, range: 6, targets: 5, lead: true, hidden: true,
        fireAspect: { every: 4, dps: 6.7, time: 1.2 }, abilities: [WARCRY_AB] },
      { name: 'Centurion', desc: 'Damage 15 → 31 and hits 7 zombies. Fire Aspect burns hotter and recharges every 3s.', cost: 6200, damage: 57, cooldown: 0.7, range: 6, targets: 7, lead: true, hidden: true,
        fireAspect: { every: 3, dps: 13.3, time: 1.2 }, abilities: [WARCRY_AB] },
      { name: 'King of the Arena', desc: 'Damage 31 → 42, faster swings, more range and hits 10 zombies. Fire Aspect burns much hotter for 1.5s and recharges every 2s.', cost: 14900, damage: 77, cooldown: 0.55, range: 6.5, targets: 10, lead: true, hidden: true,
        fireAspect: { every: 2, dps: 46.7, time: 1.5 }, abilities: [WARCRY_AB] },
    ],
  },
  // Commando (event, not the base Commando): piercing laser shots (`pass`) with ammo, plus
  // Concussive Missiles (see concussiveAb). laser: laser damage (see damageKind).
  eventCommando: {
    name: 'Commando',
    event: 'Beat Hard mode', // win reward (see DIFFICULTIES unlock)
    cost: 2150,
    limit: 8,
    bossStop: 0.5,
    laser: true,
    blurb: 'A mid-game laser trooper whose shots pierce a second zombie. It has limited ammo and stops to reload. From Lv 4 it fires Concussive Missiles at a spot you pick that blast and stun groups, ignoring armor. Hits flying zombies from the start.',
    tip: 'Before Lv 3, put it where zombies line up (corners, straight paths) for more piercing hits. Aim missiles a little in front of moving zombies: they take 2 seconds to land.',
    levels: [
      { name: 'Commando', desc: 'Fast laser shots that pierce one more zombie, 30 shots per magazine.', damage: 5, cooldown: 0.225, range: 16, pass: 1, ammo: 30, reload: 2.25, hidden: false },
      { name: 'Recon Mission', desc: 'Shoots faster and reloads faster.', cost: 935, damage: 5, cooldown: 0.17, range: 16, pass: 1, ammo: 30, reload: 2, hidden: false },
      { name: 'Titanium Rounds', desc: 'Hidden detection, more range, damage 5 → 7, faster shots and 15 more ammo.', cost: 2850, damage: 7, cooldown: 0.14, range: 17.5, pass: 1, ammo: 45, reload: 2, hidden: true },
      { name: 'Jericho Missiles', desc: 'Damage 7 → 14, 15 more ammo and faster reloads. Unlocks Concussive Missiles.', cost: 8115, damage: 14, cooldown: 0.14, range: 17.5, pass: 1, ammo: 60, reload: 1.5, hidden: true,
        abilities: [concussiveAb(2, 275, 0.5, 35, 20)] },
      { name: 'Death & Taxes', desc: 'Damage 14 → 23, more range, faster shots, 20 more ammo and faster reloads. Missiles: 4 of them, harder, 1s stuns, more reach and half the cooldown.', cost: 25000, damage: 23, cooldown: 0.1, range: 20, pass: 1, ammo: 80, reload: 1.25, hidden: true,
        abilities: [concussiveAb(4, 325, 1, 40, 10)] },
    ],
  },
  // Slasher (alternate Knifer form). crit: see Warden. bleed (on a level): stacks of Bleed each
  // hit adds (see `bleedFx`). bleedFx: { max, dps, time, burst, bossMult }: each stack hurts `dps`
  // of the zombie's max health per second; stacks fall off `time` s after its last hit. At `max`
  // stacks the bleed bursts: `burst` of its max health at once, and the stacks reset. Bosses
  // take `bossMult` of the bleed and burst damage. Not used by the game yet (kept for later):
  // freezeImmune (nothing freezes towers yet).
  kniferSlasher: {
    name: 'Slasher',
    altOf: 'knifer',
    form: 'Slasher',
    shards: 1,
    price: 0,
    flying: false,
    lead: 2,
    cost: 2400,
    limit: 8,
    melee: true,
    bleedFx: { max: 400, dps: 0.00002, time: 5, burst: 0.15, bossMult: 0.2 },
    blurb: 'An alternate Knifer that stabs one zombie at a time, landing a critical hit every third swing. From Lv 3 its hits stack Bleed, which eats away at the zombie\'s max health and bursts for a huge hit when it maxes out.',
    tip: 'Put it on path corners because its range is short. Several Slashers build bleed faster and trigger bursts sooner.',
    levels: [
      { name: 'Slasher', desc: 'Stabs one zombie; every third swing is a critical hit.', damage: 8, cooldown: 0.3, range: 6, crit: { every: 3, damage: 16 }, hidden: false },
      { name: 'Sleight of Hands', desc: 'Damage 8 → 10, faster swings and hidden detection.', cost: 1000, damage: 10, cooldown: 0.25, range: 6, crit: { every: 3, damage: 20 }, hidden: true },
      { name: 'Bloodlust', desc: 'Big, slower hits (damage 10 → 32), stronger crits, lead detection, can\'t be stunned, and every hit adds 10 Bleed.', cost: 5600, damage: 32, cooldown: 0.6, range: 6, crit: { every: 3, damage: 96 }, bleed: 10, stunImmune: true, freezeImmune: true, hidden: true },
      { name: 'Psycho Knife', desc: 'Damage 32 → 40, slightly faster, stronger crits and 18 Bleed per hit.', cost: 11003, damage: 40, cooldown: 0.55, range: 6, crit: { every: 3, damage: 160 }, bleed: 18, stunImmune: true, freezeImmune: true, hidden: true },
      { name: 'Ocean Of Blood', desc: 'Damage 40 → 55, faster swings and 40 Bleed per hit.', cost: 32500, damage: 55, cooldown: 0.5, range: 6, crit: { every: 3, damage: 220 }, bleed: 40, stunImmune: true, freezeImmune: true, hidden: true },
    ],
  },
  // Frost Blaster (alternate Sleeter form): piercing ice shots (`pass`; `pierceFx`: the zombies
  // pierced get the on-hit effects too) that chill (see Freezer). freezeNext: a hit on a zombie
  // that is already fully chilled freezes it for `chillFreeze` s. melt: armor melted (see Pyromancer).
  sleeterBlaster: {
    name: 'Frost Blaster',
    altOf: 'sleeter',
    form: 'Blaster',
    shards: 1,
    price: 0,
    flying: false,
    lead: true,
    cost: 850,
    limit: 12,
    pierceFx: true,
    freezeNext: true,
    blurb: 'An alternate Sleeter that fires piercing ice shots through a line of zombies. Every hit chills (slows) them, a hit on a fully chilled zombie freezes it for a moment, and from Lv 3 its shots melt armor.',
    tip: 'A cheap way to get hidden detection early. Pair it with big damage towers so they get more time to hit.',
    levels: [
      { name: 'Frost Blaster', desc: 'Piercing ice shots that hit 2 zombies and slow them 15%.', damage: 4, cooldown: 0.8, range: 12, pass: 1, chill: 1, maxSlow: 0.15, chillTime: 3, chillFreeze: 0.2, hidden: false },
      { name: 'Endurance', desc: 'Faster shots, more range, hidden detection and longer freezes.', cost: 350, damage: 4, cooldown: 0.6, range: 15, pass: 1, chill: 1, maxSlow: 0.15, chillTime: 3, chillFreeze: 0.3, hidden: true },
      { name: 'Piercing Cold', desc: 'Damage 4 → 8, pierces 3 zombies, 25% slow, and melts 15% of armor.', cost: 1500, damage: 8, cooldown: 0.6, range: 15, pass: 2, chill: 1, maxSlow: 0.25, chillTime: 3, chillFreeze: 0.3, melt: 0.15, hidden: true },
      { name: 'Subzero Hero', desc: 'Damage 8 → 12, more range and faster shots.', cost: 3800, damage: 12, cooldown: 0.45, range: 17.5, pass: 2, chill: 1, maxSlow: 0.25, chillTime: 3, chillFreeze: 0.3, melt: 0.15, hidden: true },
      { name: 'Hyper Icer Trooper', desc: 'Damage 12 → 53 but slower shots. Much more range, pierces 4 zombies, melts 35% of armor and 0.6s freezes.', cost: 9500, damage: 53, cooldown: 0.9, range: 22.5, pass: 3, chill: 1, maxSlow: 0.25, chillTime: 3, chillFreeze: 0.6, melt: 0.35, hidden: true },
    ],
  },
  // ---------------------------------------------------------------- alternate forms, wave 4
  // Flame Trooper (alternate Flamethrower form): a narrow line of fire (small `cone`) that hits the
  // best `hits` zombies in it (see Pyromancer), so it needs detection and never sees hidden ones.
  // From Lv 4 burnVuln (see Patrol Boat Flame Tanks), Lv 5 the Fire Ring ability.
  // Not used by the game yet (kept for later): aimDelay on Lv 5 (spec: "aims 1.1s longer").
  flameTrooper: {
    name: 'Flame Trooper',
    lead: true,
    altOf: 'flamethrower',
    form: 'Trooper',
    shards: 2,
    price: 0,
    cost: 850,
    limit: 8,
    burnSlow: 0,
    blurb: 'An alternate Flamethrower that sprays a line of fire through many zombies at once and sets them burning. From Lv 4 burning zombies take extra damage from all your towers, and at Lv 5 it gets the Fire Ring blast. Very cost-efficient early. No hidden detection, and fire-immune zombies and most bosses shrug it off.',
    tip: 'Put it on tight corners so the line of fire covers more path, and use Random targeting to spread the burn debuff.',
    levels: [
      { name: 'Flame Trooper', desc: 'Sprays a line of fire that hits up to 10 zombies and burns them for 0.8 per second for 5s.', damage: 2, hits: 10, burn: 1, burnTime: 5, cooldown: 0.2, range: 5, cone: 0.2, hp: 175, hidden: false },
      { name: 'Hotter Temps', desc: 'Damage 1.5 → 3.4, burns 1.5 per second and 2 more range.', cost: 1150, damage: 4.5, hits: 10, burn: 2, burnTime: 5, cooldown: 0.2, range: 7, cone: 0.2, hp: 250, hidden: false },
      { name: 'Bigger Flamethrower', desc: 'Damage 3.4 → 7.9 and 4 more range.', cost: 2250, damage: 10.5, hits: 10, burn: 2, burnTime: 5, cooldown: 0.2, range: 11, cone: 0.2, hp: 400, hidden: false },
      { name: 'Napalm', desc: 'Damage 7.9 → 13, burns 4.5 per second and they last 1s longer.', cost: 5250, damage: 17.5, hits: 10, burn: 6, burnTime: 6, cooldown: 0.2, range: 11, cone: 0.2, hp: 650, hidden: false },
      { name: 'M3 Flamethrower', desc: 'Burning zombies take 5% more damage from everything for 7s, and it can\'t be stunned. Damage 13 → 18, burns 6 per second for 10s and 3 more range.', cost: 10500,
        damage: 23.5, hits: 10, burn: 8, burnTime: 10, cooldown: 0.2, range: 14, cone: 0.2, hp: 1100, stunImmune: true, burnVuln: { amount: 0.05, time: 7 }, hidden: false },
      { name: 'Exo-Flame Suit', desc: 'A huge boost: damage 18 → 49, burns 11 per second, burning zombies take 10% more damage, and the Fire Ring ability.', cost: 30500,
        damage: 65.5, hits: 10, burn: 15, burnTime: 10, cooldown: 0.2, range: 14, cone: 0.2, hp: 2550, stunImmune: true, burnVuln: { amount: 0.1, time: 7 }, aimDelay: 1.1, hidden: false,
        abilities: [FIRE_RING_AB] },
    ],
  },
  // Goo Gunner (alternate Slime Trooper form): goo globs (see Slime Trooper) that slow one zombie,
  // then from Lv 3 a Glue Hose that hits `targets` zombies at once. spray: each zombie the hose
  // hits also splashes every zombie within `spray` of it (same damage and slow). Lv 5 Spawn Puddle.
  // The spec doesn't give its base slow: 15% for 3s is a guess (+5% / +2s etc. from there).
  gooGunner: {
    name: 'Goo Gunner',
    fly: 30, // globs of goo fly to the zombie (the hose hits at once)
    lead: 3,
    altOf: 'slime',
    form: 'Gunner',
    shards: 1,
    price: 0,
    cost: 300,
    limit: 8,
    kindLabel: 'Slow',
    blurb: 'An alternate Slime Trooper that shoots toxic goo that slows zombies. At Lv 3 it switches to a Glue Hose that sprays several zombies at once, and at Lv 5 it drops a goo puddle that sends out friendly Goos to ram zombies. Cheap to max, but low damage, and its early single-target shots are slow. Bosses ignore the slow.',
    tip: 'Use Strongest targeting before Glue Hose and Random after it, so the slow spreads over the crowd.',
    levels: [
      { name: 'Goo Gunner', desc: 'Goo globs that slow a zombie by 15% for 3s.', damage: 2, cooldown: 1.5, range: 12, slime: { slow: 0.15, time: 3 }, hp: 500, hidden: false },
      { name: 'Sticky Goo', desc: 'Damage 0.8 → 1.9, 2 more range and a 5% stronger slow.', cost: 400, damage: 5, cooldown: 1.5, range: 14, slime: { slow: 0.2, time: 3 }, hp: 650, hidden: false },
      { name: 'Slow Dry', desc: 'Damage 1.9 → 3.8, shoots a bit faster, and the slow is 5% stronger and lasts 2s longer.', cost: 1000, damage: 10, cooldown: 1.35, range: 14, slime: { slow: 0.25, time: 5 }, hp: 850, hidden: false },
      { name: 'Glue Hose', desc: 'A hose that sprays 3 zombies at once with a small splash and shoots much faster, but damage 3.8 → 1.9 and 3 less range. Can hit lead zombies.', cost: 1850,
        damage: 5, cooldown: 0.2, range: 11, targets: 3, spray: 1, slime: { slow: 0.25, time: 5 }, hp: 1050, hidden: false },
      { name: 'Acidic Goo', desc: 'Damage 1.9 → 3.8, a bigger splash and 5 zombies at once.', cost: 3000, damage: 10, cooldown: 0.2, range: 11, targets: 5, spray: 1.5, slime: { slow: 0.25, time: 5 }, hp: 1450, hidden: false },
      { name: 'Goo Units', desc: 'Damage 3.8 → 5.3, 7 zombies at once, a bigger splash, a 10% stronger slow that lasts 3s longer, and the Spawn Puddle ability.', cost: 6000,
        damage: 14, cooldown: 0.2, range: 11, targets: 7, spray: 2, slime: { slow: 0.35, time: 8 }, hp: 2050, hidden: false, abilities: [PUDDLE_AB] },
    ],
  },
  // Cryo Blaster (alternate Frost Trooper with two paths): sprays ice that builds up chill (see
  // Freezer) until zombies freeze for `chillFreeze` s (the thaw time). The spec's "freeze amount"
  // is chill here at 0.06 chill per point (1 chill = frozen), capped at 1. Hits `targets` zombies
  // with a `spray` splash (see Goo Gunner). frostbite / frozenVuln / freezeBoss: see Cryo Ranger.
  // The spec doesn't give its base thaw time (1s), slow (up to 30%) or splash (1): guesses.
  // ignoreIceResist (Top 5 Snow Storm): its chill, freezes and frost damage ignore ice resistance.
  frostBlaster: {
    name: 'Cryo Blaster',
    lead: true,
    flying: false,
    altOf: 'frost',
    form: 'Blaster',
    shards: 2,
    price: 0,
    cost: 225,
    limit: 10,
    kindLabel: 'Slow',
    branch: 'frostBlasterBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'An alternate Frost Trooper with two upgrade paths right away. Sprays ice that builds up freeze on zombies: they slow down, then get stuck in place until they thaw, and frozen zombies take extra damage. No damage until Lv 3. Top path: a wide Snow Storm that freezes crowds (never bosses, no hidden detection). Bottom path: a Cryo Rifle that freeze-locks a few strong zombies, and at max level freezes bosses and sees hidden and flying zombies.',
    tip: 'Put the Top path near the zombie spawn, or right next to a short-range tower.',
    levels: [
      { name: 'Cryo Blaster', desc: 'Sprays ice that slowly freezes a zombie (and those right next to it). No damage.', damage: 0, cooldown: 0.2, range: 7, targets: 1, spray: 1, hp: 50, hidden: false,
        chill: 0.03, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Subzero Temperature', path: 'Top', desc: 'Top path: zombies it freezes stay 25% slower for good.', cost: 225, damage: 0, cooldown: 0.2, range: 7, targets: 1, spray: 1, hp: 75, hidden: false,
        chill: 0.03, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25 },
      { name: 'Bigger Fan', path: 'Top', desc: '2.5 more range.', cost: 250, damage: 0, cooldown: 0.2, range: 9.5, targets: 1, spray: 1, hp: 110, hidden: false,
        chill: 0.03, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25 },
      { name: 'Cryo Thrower', path: 'Top', desc: 'Freezes much faster, sprays 3 zombies at once and does a little damage.', cost: 1000, damage: 0.5, cooldown: 0.2, range: 9.5, targets: 3, spray: 1, hp: 185, hidden: false,
        chill: 0.15, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25 },
      { name: 'Bigger Tank', path: 'Top', desc: 'Frozen zombies take 40% more damage. Freezes faster, a bigger splash and 5 zombies at once.', cost: 2750, damage: 0.5, cooldown: 0.2, range: 9.5, targets: 5, spray: 2, hp: 435, hidden: false,
        chill: 0.27, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25, frozenVuln: 0.4 },
      { name: 'Snow Storm', path: 'Top', desc: 'A much stronger freeze, frozen zombies take 55% more damage, 10 zombies at once, damage 0.2 → 1 and a bigger splash. Ignores ice resistance.', cost: 7500,
        damage: 2.5, cooldown: 0.2, range: 9.5, targets: 10, spray: 2.5, hp: 985, hidden: false, ignoreIceResist: true,
        chill: 0.69, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25, frozenVuln: 0.55 },
    ],
  },
  // The Cryo Blaster's Bottom path (not in the shop: a Cryo Blaster becomes this when you pick it).
  frostBlasterBottom: {
    name: 'Cryo Blaster',
    lead: true,
    flying: false,
    branchOf: 'frostBlaster',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 225,
    limit: 10,
    kindLabel: 'Slow',
    blurb: 'The Cryo Blaster\'s Bottom path: a stronger freeze, then the Cryo Rifle that freezes up to 3 zombies with every shot and does real damage. At Lv 5 Deep Freeze freezes bosses (for half the time) and sees hidden and flying zombies.',
    tip: 'It can\'t see hidden or flying zombies until Lv 5, and can\'t freeze bosses until then either.',
    levels: [
      { name: 'Cryo Blaster', desc: 'Sprays ice that slowly freezes a zombie (and those right next to it). No damage.', damage: 0, cooldown: 0.2, range: 7, targets: 1, spray: 1, hp: 50, hidden: false,
        chill: 0.03, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Ice Block', path: 'Bottom', desc: 'Bottom path: freezes much faster and frozen zombies take 25% more damage.', cost: 450, damage: 0.5, cooldown: 0.2, range: 7, targets: 1, spray: 1, hp: 65, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frozenVuln: 0.25 },
      { name: 'Turbo Turbine', path: 'Bottom', desc: 'Sprays 3 zombies at once and 3 more range.', cost: 475, damage: 0.5, cooldown: 0.2, range: 10, targets: 3, spray: 1, hp: 100, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frozenVuln: 0.25 },
      { name: 'Cryo Rifle', path: 'Bottom', desc: 'A rifle: every shot freezes up to 3 zombies for 2s and does 20 damage, frozen zombies take 30% more damage and 4.5 more range. No splash, and it shoots every 2s.', cost: 2100,
        damage: 20, cooldown: 2, range: 14.5, targets: 3, hp: 250, hidden: false,
        chill: 1, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 2, frozenVuln: 0.3 },
      { name: 'Overcharged Tanks', path: 'Bottom', desc: 'Damage 20 → 50, shoots a bit faster and 2 more range.', cost: 5675, damage: 50, cooldown: 1.75, range: 16.5, targets: 3, hp: 725, hidden: false,
        chill: 1, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 2, frozenVuln: 0.3 },
      { name: 'Deep Freeze', path: 'Bottom', desc: 'Freezes bosses too (for half the time), sees hidden and flying zombies, freezes last 4s, frozen zombies take 55% more damage, damage 50 → 100 and faster shots.', cost: 14000,
        damage: 100, cooldown: 1.25, range: 17.5, targets: 3, hp: 1975, hidden: true, flying: true,
        chill: 1, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 4, frozenVuln: 0.55, freezeBoss: 0.5 },
    ],
  },
  // Cryo Mortar (alternate Harpoon Hunter form): a cliff mortar lobbing icy shells. Every zombie in
  // the blast gets chill (see Cryo Blaster: 0.06 per "freeze amount" point) and freezes at full chill.
  // minRange: it can't shoot zombies this close. The spec gives no base freeze (4), thaw time
  // (1.5s, 2s at Lv 5) or deadzone (8, then +8): guesses. Its Lv 5 table DPS (89.4) would mean a 7s
  // reload, but the upgrade text says "reloads 1s faster" (4s → 3s): the text wins.
  cryoMortar: {
    name: 'Cryo Mortar',
    lead: true,
    flying: false,
    altOf: 'harpoonHunter',
    form: 'Mortar',
    shards: 2,
    price: 0,
    cost: 1750,
    limit: 4,
    placement: 'cliff',
    lob: 1.3,
    minRange: 8,
    blurb: 'An alternate Harpoon Hunter: a long-range mortar that lobs icy shells, hurting and freezing every zombie in the blast. It can\'t hit zombies that are too close. At Lv 5 it freezes bosses too. Low health. Cliffs only.',
    tip: 'Place it away from your main defense so its blind spot doesn\'t matter, and pair it with other freezing towers.',
    levels: [
      { name: 'Cryo Mortar', desc: 'Icy shells that hurt and chill every zombie in the blast. Can\'t hit zombies within 8.', damage: 10, cooldown: 4.5, range: 30, radius: 4, hp: 300, hidden: false,
        chill: 0.24, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Advanced Training', desc: 'Damage 10 → 16, a stronger freeze, reloads faster and 5 more range.', cost: 650, damage: 16, cooldown: 4, range: 35, radius: 4, hp: 330, hidden: false,
        chill: 0.48, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Bigger Shell', desc: 'Damage 16 → 26, a stronger freeze and a bigger blast.', cost: 1500, damage: 26, cooldown: 4, range: 35, radius: 4.5, hp: 505, hidden: false,
        chill: 0.72, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Nitrogen Shell', desc: 'Damage 26 → 76, every shell now freezes the zombies it hits, and 5 more range.', cost: 4850, damage: 76, cooldown: 4, range: 40, radius: 4.5, hp: 905, hidden: false,
        chill: 1, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Sub-Zero Shell', desc: 'A huge damage boost (76 → 176) and 20 more range.', cost: 16000, damage: 176, cooldown: 4, range: 60, radius: 4.5, hp: 1905, hidden: false,
        chill: 1, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Ice Is Nice', desc: 'Freezes bosses too (for half the time). Damage 176 → 626, a huge blast, reloads faster and 65 more range, but its blind spot grows to 16.', cost: 50000,
        damage: 626, cooldown: 3, range: 125, radius: 11.5, minRange: 16, hp: 2905, hidden: false,
        chill: 1, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 2, freezeBoss: 0.5 },
    ],
  },
  // Archer (Bowmaster form, alternate event Archer). bounce: { hits, jump }: each arrow hits its
  // target, then bounces to the closest zombie within `jump` it hasn't hit, `hits` zombies in all.
  // arrows: the arrow types it has unlocked (Switch Arrows cycles them; 'normal' is always there):
  //   flame:     { dps, time, extra } sets the zombies hit on fire and bounces `extra` more times.
  //   explosive: { damage, radius } a blast where the arrow first lands.
  //   shock:     { stun, targets } stuns the first `targets` zombies it hits.
  // Flame and Explosive arrows can aim at lead zombies, but only their fire / blast hurts them.
  archerBow: {
    name: 'Archer',
    altOf: 'archer',
    form: 'Bowmaster',
    shards: 1,
    price: 0,
    flying: false,
    cost: 600,
    limit: 15,
    kindLabel: 'Bounce',
    blurb: 'An alternate Archer with very long range. Its arrows bounce from zombie to zombie, and later upgrades unlock flaming, exploding and shocking arrows (switch between them with an ability).',
    tip: 'Compact paths make arrows bounce more. Burns don\'t stack, so only a few Archers should use flame arrows.',
    levels: [
      { name: 'Archer', desc: 'Long-range arrows that bounce between up to 3 zombies.', damage: 5, cooldown: 1.6, range: 16.5, bounce: { hits: 3, jump: 7 }, hidden: false },
      { name: 'Eagle Eye', desc: 'Faster shots and much more range.', cost: 250, damage: 5, cooldown: 1.4, range: 20, bounce: { hits: 3, jump: 7 }, hidden: false },
      { name: 'Deadshot', desc: 'Damage 5 → 8 and hidden detection.', cost: 550, damage: 8, cooldown: 1.4, range: 20, bounce: { hits: 3, jump: 7 }, hidden: true },
      { name: 'Flame-tipped Arrows', desc: 'Damage 8 → 10, more range and arrows hit 1 more zombie. Unlocks Flame Arrows (3 burn per second for 2s).', cost: 1250, damage: 10, cooldown: 1.4, range: 21, bounce: { hits: 4, jump: 7 }, hidden: true,
        arrows: { flame: { dps: 3, time: 2, extra: 0 } }, abilities: [ARROWS_AB] },
      { name: 'Powder Keg Arrows', desc: 'Damage 10 → 16 and faster shots. Unlocks Explosive Arrows (25 splash). Flame Arrows burn hotter for 4s and bounce once more.', cost: 3000, damage: 16, cooldown: 1.2, range: 21, bounce: { hits: 4, jump: 7 }, hidden: true,
        arrows: { flame: { dps: 5, time: 4, extra: 1 }, explosive: { damage: 25, radius: 2 } }, abilities: [ARROWS_AB] },
      { name: 'Shock & Awe', desc: 'Damage 16 → 40, faster shots and more range. Unlocks Shock Arrows that stun up to 5 zombies. Bigger, harder explosions and much hotter flames that bounce 4 more times.', cost: 8500, damage: 40, cooldown: 1, range: 24, bounce: { hits: 4, jump: 7 }, hidden: true,
        arrows: { flame: { dps: 14, time: 4, extra: 5 }, explosive: { damage: 45, radius: 2.5 }, shock: { stun: 0.15, targets: 5 } }, abilities: [ARROWS_AB] },
    ],
  },
  // Swarmer: shoots bees (homing projectiles, see `fly`). bees: { damage, tick, time, stacks }:
  // every hit adds a bee sting stack that does `damage` every `tick` s for `time` s. A zombie holds
  // at most `stacks` stacks (from this tower's level); past that, a hit refreshes the oldest one.
  swarmer: {
    name: 'Swarmer',
    event: 'Event reward',
    flying: false,
    cost: 900,
    limit: 10,
    fly: 30,
    kindLabel: 'DoT',
    blurb: 'Shoots bees at a zombie. Every hit adds a stack of bee stings that keep hurting it, and the stacks add up, so it melts tough zombies and bosses over time. From Lv 4 it throws a Bee Swarm Grenade. Slow and short-ranged early on, with no hidden or flying detection.',
    tip: 'Set targeting to Strongest; First can waste stacks on zombies that are about to die.',
    levels: [
      { name: 'Swarmer', desc: 'Shoots bees: each hit adds a sting stack (4.2 damage a second for 2.1s, 1 stack max).', damage: 2, cooldown: 1.2, range: 13, bees: { damage: 3, tick: 1, time: 2.1, stacks: 1 }, hidden: false },
      { name: 'Extra Honey', desc: 'Up to 3 sting stacks on one zombie.', cost: 400, damage: 2, cooldown: 1.2, range: 13, bees: { damage: 3, tick: 1, time: 2.1, stacks: 3 }, hidden: false },
      { name: 'Aggressive Bees', desc: 'Damage 2.8 → 5.6, more range, stings last 4.1s and 6 stacks.', cost: 1250, damage: 4, cooldown: 1.2, range: 15, bees: { damage: 3, tick: 1, time: 4.1, stacks: 6 }, hidden: false },
      { name: 'Bee Certified Weapons', desc: 'No more direct damage and slower shots, but stings tick faster and last 5.25s, more range and 12 stacks. Unlocks Bee Swarm Grenade.', cost: 2000, damage: 0, cooldown: 1.5, range: 18, bees: { damage: 3, tick: 0.75, time: 5.25, stacks: 12 }, hidden: false,
        abilities: [beeNadeAb(30, 6)] },
      { name: 'Beehive of Madness', desc: 'Faster shots, more range, stings last 7.5s and 25 stacks. Grenade: 98 damage in a bigger blast.', cost: 5750, damage: 0, cooldown: 1.25, range: 20, bees: { damage: 3, tick: 0.75, time: 7.5, stacks: 25 }, hidden: false,
        abilities: [beeNadeAb(70, 7)] },
      { name: 'Beekeeper of Death', desc: '+1.4 sting damage, stings last 15s and 30 stacks. Grenade: 175 damage in an even bigger blast.', cost: 10000, damage: 0, cooldown: 1.25, range: 20, bees: { damage: 4, tick: 0.75, time: 15, stacks: 30 }, hidden: false,
        abilities: [beeNadeAb(125, 8)] },
    ],
  },
  // Toxic Gunner: bursts of poison bullets (see Saboteur for `poison`; here every bullet poisons).
  // poison.melt: every poison tick melts this much of the zombie's armor (stacking, down to 0).
  // A burst cycle is `cooldown` s: the pause between bursts plus burst * burstGap.
  toxicGunner: {
    name: 'Toxic Gunner',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 525,
    limit: 10,
    burstGap: 0.1,
    blurb: 'A cheap rapid-fire tower that shoots bursts of poison bullets. Poisoned zombies take damage every second and walk slower, and from Lv 4 the poison melts their armor. It never sees hidden zombies.',
    tip: 'Pair it with high-damage towers so they get more time to hit. Combine it with other slows to almost stop zombies.',
    levels: [
      { name: 'Toxic Gunner', desc: 'Bursts of 4 poison bullets: poisoned zombies take 1 damage a second for 6s and are 10% slower.', damage: 1, burst: 4, cooldown: 1.6, range: 10, poison: { damage: 1, tick: 1, time: 6, slow: 0.1 }, hidden: false },
      { name: 'Faster Reloading', desc: 'Half the pause between bursts.', cost: 200, damage: 1, burst: 4, cooldown: 1.0, range: 10, poison: { damage: 1, tick: 1, time: 6, slow: 0.1 }, hidden: false },
      { name: 'Poisonous Bullets', desc: 'More range, 8 bullets per burst, poison does 3 damage and slows 20%.', cost: 800, damage: 1, burst: 8, cooldown: 1.4, range: 14, poison: { damage: 3, tick: 1, time: 6, slow: 0.2 }, hidden: false },
      { name: 'Sinister Gear', desc: 'Damage 1 → 4, 20 bullets per burst, flying detection, and poison melts 3% of armor every tick.', cost: 3500, damage: 4, burst: 20, cooldown: 2.6, range: 14, flying: true, poison: { damage: 3, tick: 1, time: 6, slow: 0.2, melt: 0.03 }, hidden: false },
      { name: 'Going Nuclear!', desc: 'Fires nonstop, more range, damage 4 → 8, poison does 10 damage for 10s and slows 30%.', cost: 14000, damage: 8, burst: 20, cooldown: 2, range: 18, flying: true, poison: { damage: 10, tick: 1, time: 10, slow: 0.3, melt: 0.03 }, hidden: false },
    ],
  },
  // Sledger: an ice hammer that hits up to `targets` zombies per swing and chills them (see
  // Freezer; `freezeNext` as on the Frost Blaster). iceBreak: damage multiplier against chilled or
  // frozen zombies. aftershock: { delay, mult }: `delay` s after each swing a shockwave hits the
  // same way for `mult` of its damage (it keeps their chill from wearing off, but adds none).
  sledger: {
    name: 'Sledger',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 950,
    limit: 6,
    melee: true,
    freezeNext: true,
    kindLabel: 'Multi',
    blurb: 'A melee tower with a big ice sledgehammer that smashes several zombies at once. Every hit chills (slows) them, and from Lv 4 a fully chilled zombie freezes solid. Its damage falls behind late game, and it can\'t hit hidden zombies.',
    tip: 'Place it near corners next to high-damage towers so its slows give them more time.',
    levels: [
      { name: 'Sledger', desc: 'Swings an ice hammer at up to 4 zombies, chilling them (15% slow per hit, up to 30%).', damage: 10, cooldown: 1.2, range: 7, targets: 4, chill: 0.5, maxSlow: 0.3, chillTime: 4, hidden: false },
      { name: 'Heavier Swings', desc: 'Damage 4 → 5.6.', cost: 400, damage: 14, cooldown: 1.2, range: 7, targets: 4, chill: 0.5, maxSlow: 0.3, chillTime: 4, hidden: false },
      { name: 'Better Sledge', desc: 'Damage 5.6 → 11 and hits 5 zombies.', cost: 1650, damage: 28, cooldown: 1.2, range: 7, targets: 5, chill: 0.5, maxSlow: 0.3, chillTime: 4, hidden: false },
      { name: 'Freezing Point', desc: 'Damage 11 → 22, 35% slow per hit, and a hit on a fully chilled zombie freezes it for 0.85s.', cost: 3200, damage: 55, cooldown: 1.2, range: 7, targets: 5, chill: 1, maxSlow: 0.35, chillTime: 4, chillFreeze: 0.85, hidden: false },
      { name: 'Ice Breaker', desc: 'Damage 22 → 42, more range, slows last 5s, and double damage to chilled and frozen zombies.', cost: 8250, damage: 105, cooldown: 1.2, range: 7.5, targets: 5, chill: 1, maxSlow: 0.35, chillTime: 5, chillFreeze: 0.85, iceBreak: 2, hidden: false },
      { name: 'Arctic Aftershocks', desc: 'Damage 42 → 60, hits 8 zombies, 1.2s freezes, and an Aftershock 0.4s after each swing hits again for 40%.', cost: 16000, damage: 150, cooldown: 1.2, range: 7.5, targets: 8, chill: 1, maxSlow: 0.35, chillTime: 5, chillFreeze: 1.2, iceBreak: 2,
        aftershock: { delay: 0.4, mult: 0.4 }, hidden: false },
    ],
  },
  // Ice Breaker (alternate Sledger form): a melee fighter whose every hit adds freeze (chill, see
  // Cryo Blaster: 0.06 per "freeze amount" point); unlike the Sledger, a zombie freezes as soon as
  // it is fully chilled. burst: hits per attack, `burstGap` s apart. Lv 5 unlocks Ice Shard and
  // Snow Storm (see ICE_SHARD_AB / SNOW_STORM_AB). The spec gives no base freeze amount (3) or
  // thaw time (1s, 1.25s at Lv 5): guesses.
  sledgerIce: {
    name: 'Ice Breaker',
    flying: false,
    lead: true,
    altOf: 'sledger',
    form: 'Breaker',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 6,
    melee: true,
    hitsFrozen: true, // keeps hitting zombies it has frozen (other ice towers skip them)
    burstGap: 0.25,
    kindLabel: 'Freeze',
    blurb: "An alternate Sledger: a cheap melee fighter that freezes zombies with every hit. From Lv 3 one hit is enough to freeze a zombie solid. At Lv 5 she freezes bosses and unlocks Ice Shard (a block of ice that explodes and freezes everything when it breaks) and Snow Storm (a freezing aura). Very short range, and she can't see hidden zombies.",
    tip: 'Place her right by the zombie entrance so she freezes them early and gives your other towers more time.',
    levels: [
      { name: 'Ice Breaker', desc: 'Hits up to 3 zombies with an icy pick, adding freeze to each.', damage: 8, cooldown: 1.75, range: 4.5, targets: 3, hp: 200, hidden: false,
        chill: 0.18, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Better Grip', desc: 'Hits twice per attack, more freeze and a bit more range.', cost: 450, damage: 8, burst: 2, cooldown: 1.75, range: 5, targets: 3, hp: 235, hidden: false,
        chill: 0.3, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Speed Reductions', desc: 'Damage 2.6 → 5.9, more freeze and 1 more zombie per hit.', cost: 1350, damage: 18, burst: 2, cooldown: 1.75, range: 5, targets: 4, hp: 285, hidden: false,
        chill: 0.6, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Crystal Head', desc: 'Damage 5.9 → 13, 1 more zombie and 1 more hit per attack, and every hit freezes a zombie solid.', cost: 2325, damage: 38, burst: 3, cooldown: 1.75, range: 5, targets: 5, hp: 660, hidden: false,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Cryo Fuel', desc: 'Damage 13 → 22.', cost: 6000, damage: 68, burst: 3, cooldown: 1.75, range: 5, targets: 5, hp: 1310, hidden: false,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'X-Cryosuit', desc: "Damage 22 → 40, faster swings, 1 more hit, longer freezes, a bit more range. Freezes bosses (for half the time), can't be stunned, and unlocks Ice Shard and Snow Storm.", cost: 33000,
        damage: 120, burst: 4, cooldown: 1.25, range: 6, targets: 5, hp: 2910, hidden: false, stunImmune: true,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.25, freezeBoss: 0.5, abilities: [ICE_SHARD_AB, SNOW_STORM_AB] },
    ],
  },
  // Cryo Helicopter: flies like the Helicopter (see pursuitHeli: patrol, heli). beam: its ice
  // beam hits up to `beam` zombies every `cooldown` s, adding chill (0.06 per "freeze amount"
  // point) and freezing them at full chill; it prefers zombies that aren't frozen yet.
  // missiles: Cryo Missiles (see cryoMissile). deathBlast: when it's knocked out it stuns towers
  // within `radius` for `stun` s, does `damage` to zombies there and `towerDamage` to towers.
  // The spec gives no death-blast numbers, thaw time (1s) or limit (4): guesses.
  // ignoreIceResist (Lv 5): its chill, freezes and frost damage ignore ice resistance.
  cryoHeli: {
    name: 'Cryo Helicopter',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 2125,
    limit: 4,
    noBuff: true,
    heli: { speed: 12, height: 13 },
    kindLabel: 'Freeze',
    blurb: "A flying helicopter whose ice beam freezes up to 2 zombies at a time. Send it anywhere on the map with Set Location, or have it follow you with Follow Player. Sees hidden and flying zombies from Lv 1, fires freezing Cryo Missiles from Lv 3 and freezes bosses at Lv 5. Low damage for its price, and support towers can't boost it. If it's knocked out, it explodes and briefly freezes your towers nearby.",
    tip: "Use it to freeze dangerous zombies and bosses wherever they are, not as your main damage. Keep it away from your other towers if it might get knocked out.",
    levels: [
      { name: 'Cryo Helicopter', desc: 'An ice beam that freezes up to 2 zombies. Move it anywhere, or have it follow you.', damage: 4, beam: 2, cooldown: 0.2, range: 11, patrol: 5, hp: 850, hidden: false,
        chill: 0.09, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, deathBlast: { radius: 8, stun: 1, damage: 50, towerDamage: 25 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Bigger Beam', desc: 'Hidden and flying detection, damage 4 → 6 and a stronger freeze.', cost: 2500, damage: 6, beam: 2, cooldown: 0.2, range: 11, patrol: 5, hp: 950, hidden: true, flying: true,
        chill: 0.21, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, deathBlast: { radius: 8, stun: 1, damage: 100, towerDamage: 50 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Speed Reduction', desc: 'A much stronger freeze and damage 6 → 10.', cost: 7500, damage: 10, beam: 2, cooldown: 0.2, range: 11, patrol: 5, hp: 1050, hidden: true, flying: true,
        chill: 0.69, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, deathBlast: { radius: 8, stun: 1, damage: 200, towerDamage: 75 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Ice Missiles', desc: 'Every beam hit now freezes, damage 10 → 16, much more range, and Cryo Missiles: 100 damage to up to 3 zombies in a blast every 2s, chilling them.', cost: 17250,
        damage: 16, beam: 2, cooldown: 0.2, range: 23, patrol: 5, hp: 1650, hidden: true, flying: true,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, missiles: [cryoMissile(100, 2, 0.3)], deathBlast: { radius: 8, stun: 1, damage: 400, towerDamage: 100 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Cryo Munitions', desc: 'The beam hits 3 zombies, damage 16 → 30, flies faster, and Cryo Missiles do 200 damage every 1.5s.', cost: 46800,
        damage: 30, beam: 3, cooldown: 0.2, range: 23, patrol: 5, heliSpeed: 15, hp: 3650, hidden: true, flying: true,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, missiles: [cryoMissile(200, 1.5, 0.5)], deathBlast: { radius: 8, stun: 1, damage: 800, towerDamage: 150 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Mi-Ice Hind', desc: 'Freezes bosses (for half the time), damage 30 → 50, a small splash on the beam, longer freezes, and Cryo Missiles do 400 damage every 0.9s. Ignores ice resistance.', cost: 175000,
        damage: 50, beam: 3, spray: 0.5, cooldown: 0.2, range: 23, patrol: 5, heliSpeed: 15, hp: 6900, hidden: true, flying: true, ignoreIceResist: true,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5, freezeBoss: 0.5, missiles: [cryoMissile(400, 0.9, 0.75)], deathBlast: { radius: 8, stun: 1, damage: 1600, towerDamage: 200 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
    ],
  },
  // Executioner: throws a bouncing axe. axe: { targets, bounces, ramp, jump }: it hits its target,
  // then bounces `bounces` times to the closest zombie within `jump` (never the one it just hit;
  // zombies it hasn't hit yet first, at most `targets` different ones). Every bounce does `ramp`
  // more damage than the one before.
  executioner: {
    name: 'Executioner',
    event: 'Event reward',
    lead: false,
    cost: 1800,
    limit: 9,
    kindLabel: 'Bounce',
    blurb: 'Throws an axe that bounces between zombies, hitting harder with every bounce. Great at wiping out groups, very weak against a single zombie. It can\'t hurt lead zombies, sees flying zombies from the start and gets hidden detection at Lv 4.',
    tip: 'It needs at least two zombies close together. Slowing towers keep more zombies near each other.',
    levels: [
      { name: 'Executioner', desc: 'A bouncing axe that hits up to 3 zombies, harder with each bounce.', damage: 7, cooldown: 1, range: 15, axe: { targets: 3, bounces: 2, ramp: 1, jump: 8 }, hidden: false },
      { name: 'Quick Chopping', desc: 'Throws faster and more range.', cost: 450, damage: 7, cooldown: 0.75, range: 17, axe: { targets: 3, bounces: 2, ramp: 1, jump: 8 }, hidden: false },
      { name: 'Double-Headed Axe', desc: 'Damage 2.8 → 5.6, hits 1 more zombie and bounces once more.', cost: 1777, damage: 14, cooldown: 0.75, range: 17, axe: { targets: 4, bounces: 3, ramp: 1, jump: 8 }, hidden: false },
      { name: 'Cloaked Revenant', desc: 'Hidden detection, damage 5.6 → 8, bounces once more and +2.4 damage per bounce.', cost: 3750, damage: 20, cooldown: 0.75, range: 17, axe: { targets: 4, bounces: 4, ramp: 7, jump: 8 }, hidden: true },
      { name: "Ghoul Shreddin'", desc: 'Damage 8 → 16, hits 2 more zombies, bounces 2 more times and +0.4 damage per bounce.', cost: 6750, damage: 40, cooldown: 0.75, range: 17, axe: { targets: 6, bounces: 6, ramp: 8, jump: 8 }, hidden: true },
      { name: 'The Judge & The Jury', desc: 'Throws every 0.5s, more range, damage 16 → 20, 1 more target, 3 more bounces and +0.8 damage per bounce.', cost: 13500, damage: 50, cooldown: 0.5, range: 19, axe: { targets: 7, bounces: 9, ramp: 10, jump: 8 }, hidden: true },
    ],
  },
  // ---------------------------------------------------------------- event towers (wave 3)
  // Elf Camp: see ELF for the unit fields. maxUnits counts every elf it has out.
  elfCamp: {
    name: 'Elf Camp',
    event: 'Event reward',
    cost: 300,
    limit: 4,
    kind: 'spawner',
    spawnEvery: 10,
    maxUnits: 30,
    noBuff: true,
    blurb: "A cheap tower that doesn't attack. It keeps sending friendly elves down the path that crash into zombies, throw snowballs, shoot or explode. Elf crashes and explosions ignore armor, but most elves are fragile, they walk right through Ghosts, and support towers can't boost them.",
    tip: 'Bomber Elf explosions are great for clearing early crowds.',
    levels: [
      { name: 'Elf Camp', desc: 'Sends an Elf (6 HP) every 10s that crashes into zombies.', hidden: false, unit: ELF.basic },
      { name: "Sno'ball Training", desc: 'Also sends a Snowball Elf every 10s that stays back and throws snowballs (1.6 damage every 2s).', cost: 750, hidden: false,
        unit: ELF.basic, unit2: ELF.snowball, spawnEvery2: 10 },
      { name: 'Unpaid Labor', desc: 'Snowball Elves become Cannoneer Elves (1.6 damage every 0.5s), and Bomber Elves explode for 18 when they go down (lead detection).', cost: 2022, hidden: false,
        unit: ELF.basic, unit2: ELF.cannon, spawnEvery2: 12, unit3: ELF.bomber, spawnEvery3: 10 },
      { name: 'Cookie Cutting', desc: 'Elves become sword-swinging Guardian Elves, and Cannoneers become Gunner Elves that fire 5-shot bursts. Both see hidden zombies.', cost: 4500, hidden: false,
        unit: ELF.guardian, unit2: ELF.gunner, spawnEvery2: 25, unit3: ELF.bomber, spawnEvery3: 10 },
      { name: 'A Violent Night', desc: 'Tougher, harder-hitting Guardians with 30% defense, Gunners in pairs that fire faster, flying Gift Bombers, and the 400 HP Ripped Elf.', cost: 12012, hidden: false,
        unit: ELF.guardian2, unit2: ELF.gunner2, spawnEvery2: 25, unit3: ELF.gift, spawnEvery3: 50, unit4: ELF.ripped, spawnEvery4: 100 },
    ],
  },
  // Jester: lobs trick bombs. bombs: the bomb types this level has unlocked; the player picks one
  // per `slots` in the tower panel (tower field `choice`). Every bomb thrown has the effects of
  // every picked type. Its blast is the biggest `radius` of the picked types, and it does the
  // biggest `mult` of their damage. Only Fire bombs can hit lead zombies.
  //   fire: { dps, time } sets them on fire. ice: chill (see Freezer) and `melt` armor.
  //   poison: see Toxic Gunner. confuse: { time, cd } walks them backwards (not bosses).
  jester: {
    name: 'Jester',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 650,
    limit: 8,
    lob: 0.8,
    kindLabel: 'Splash',
    blurb: 'Lobs trick bombs, and you pick which kind in its panel: Fire bombs burn, Ice bombs slow, Poison bombs poison and Confusion bombs make zombies walk backwards. Low range and a slow throw, and it can\'t hit flying zombies. Only Fire bombs hurt lead zombies.',
    tip: 'Switch bombs whenever you like, for free. Confusion bombs work best far from where the zombies come in.',
    levels: [
      { name: 'Jester', desc: 'Throws fire bombs that set zombies on fire.', damage: 4, cooldown: 1.2, range: 10, radius: 3, slots: 1, hidden: false,
        bombs: { fire: { radius: 3, mult: 1, dps: 1, time: 3 } } },
      { name: 'Trained Juggling', desc: 'Damage 1.8 → 2.7, burns +0.4, throws faster and more range.', cost: 400, damage: 6, cooldown: 1, range: 12.3, radius: 3, slots: 1, hidden: false,
        bombs: { fire: { radius: 3, mult: 1, dps: 2, time: 3 } } },
      { name: 'Cold Humor', desc: 'Damage 2.7 → 4.5, burns +0.5 and more range. Unlocks the Ice Bomb: 20% damage, but a 25% slow for 3s in a big blast.', cost: 670, damage: 10, cooldown: 1, range: 13, radius: 3, slots: 1, hidden: false,
        bombs: { fire: { radius: 3, mult: 1, dps: 3, time: 3 }, ice: { radius: 6, mult: 0.2, chill: 1, maxSlow: 0.25, chillTime: 3 } } },
      { name: 'Potent Bombs', desc: 'Damage 4.5 → 14, burns +2.7 and hidden detection. Bigger Ice blasts that melt 1% of armor. Unlocks the Poison Bomb: 1.4 damage every 0.4s for 30s.', cost: 2750, damage: 30, cooldown: 1, range: 13, radius: 3, slots: 1, hidden: true,
        bombs: { fire: { radius: 3, mult: 1, dps: 9, time: 3 }, ice: { radius: 7, mult: 0.2, chill: 1, maxSlow: 0.25, chillTime: 3, melt: 0.01 }, poison: { radius: 3, mult: 1, damage: 3, tick: 0.4, time: 30, slow: 0 } } },
      { name: 'Harlequin of Doom', desc: 'Damage 14 → 22, burns +2.7, poison +0.9, throws faster, more range, and a second bomb slot: two bomb types at once. Unlocks the Confusion Bomb (zombies walk backwards for 2s).', cost: 8500, damage: 48, cooldown: 0.6, range: 16, radius: 3, slots: 2, hidden: true,
        bombs: { fire: { radius: 3, mult: 1, dps: 15, time: 3 }, ice: { radius: 7, mult: 0.2, chill: 1, maxSlow: 0.25, chillTime: 3, melt: 0.01 }, poison: { radius: 3, mult: 1, damage: 5, tick: 0.4, time: 30, slow: 0 },
          confuse: { radius: 3, mult: 0, time: 2, cd: 6 } } },
    ],
  },
  // Cryomancer: a frost beam that hits up to `targets` zombies (see Freezer for chill, Frost
  // Blaster for melt / freezeNext). chillDps: chilled zombies take this much damage per second.
  // Ammo: it fires until its tank is empty, then reloads. Not used by the game yet (kept for
  // later): beamWidth (how wide the beam is; it just hits `targets` zombies for now).
  cryomancer: {
    name: 'Cryomancer',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 250,
    limit: Infinity,
    freezeNext: true,
    kindLabel: 'Slow',
    blurb: 'A cheap support tower that sprays a frost beam over several zombies. Each hit slows them a little more and melts their armor. No damage until Lv 3 (Lv 2 makes slowed zombies take damage), and from Lv 5 it freezes. No hidden or flying detection.',
    tip: 'Not for early defense. Several Cryomancers stall crowds and bosses really well.',
    levels: [
      { name: 'Cryomancer', desc: 'A frost beam that slows up to 3 zombies by 7.5% per hit (up to 15%) and melts 5% of their armor. No damage.', damage: 0, cooldown: 0.2, range: 11, targets: 3, chill: 0.5, maxSlow: 0.15, chillTime: 2, melt: 0.05, ammo: 50, reload: 2, beamWidth: 1.25, hidden: false },
      { name: 'Frosty Gear', desc: 'More range, and a stronger, longer slow: 10% per hit, up to 20%, for 3s.', cost: 200, damage: 0, cooldown: 0.2, range: 13.5, targets: 3, chill: 0.5, maxSlow: 0.2, chillTime: 3, melt: 0.05, ammo: 50, reload: 2, beamWidth: 1.25, hidden: false },
      { name: 'Freezing Tanks', desc: 'Slowed zombies take 1.8 damage every second, 7% armor melt and 25 more ammo.', cost: 935, damage: 0, cooldown: 0.2, range: 13.5, targets: 3, chill: 0.5, maxSlow: 0.2, chillTime: 3, chillDps: 3, melt: 0.07, ammo: 75, reload: 2, beamWidth: 1.25, hidden: false },
      { name: 'Ice Commando', desc: 'The beam does 1.8 damage, slowed zombies take 3 a second, it hits 4 zombies, and slows 12.5% per hit up to 25% for 5s.', cost: 2750, damage: 3, cooldown: 0.2, range: 13.5, targets: 4, chill: 0.5, maxSlow: 0.25, chillTime: 5, chillDps: 5, melt: 0.07, ammo: 75, reload: 2, beamWidth: 1.75, hidden: false },
      { name: "Winter's Fury", desc: 'Damage 1.8 → 3.6, slowed zombies take 6 a second, more range, hits 6 zombies, faster reloads, 20 more ammo, 10% armor melt, and a hit on a fully slowed zombie freezes it for 0.75s.', cost: 6250, damage: 6, cooldown: 0.2, range: 15, targets: 6, chill: 0.5, maxSlow: 0.25, chillTime: 5, chillDps: 10, chillFreeze: 0.75, melt: 0.1, ammo: 95, reload: 1.25, beamWidth: 2.25, hidden: false },
    ],
  },
  // Hallow Punk (alternate Hallowboomer form): homing rockets (`fly`: their speed, or the level's
  // `speed`) that burst in a blast, knocking zombies back `knock` (see knockBack).
  hallowboomerPunk: {
    name: 'Hallow Punk',
    altOf: 'hallowboomer',
    form: 'Punk',
    shards: 1,
    price: 0,
    flying: false,
    lead: true,
    cost: 500,
    limit: 10,
    fly: 35,
    blurb: 'An alternate Hallowboomer that fires homing rockets. The blasts hit a crowd and knock zombies back, and from Lv 3 they set them on fire. A slow fire rate, and it can\'t ignore armor.',
    tip: 'Place a few early for crowds. Strongest targeting gets the most damage; Random spreads the fire around once it burns.',
    levels: [
      { name: 'Hallow Punk', desc: 'Homing rockets: 12 damage in a blast that knocks zombies back.', damage: 12, cooldown: 4.5, range: 18, radius: 3, speed: 35, knock: 10, hidden: false },
      { name: 'Bewitching Blaze', desc: 'Damage 12 → 18, fires faster, more range and a bigger blast.', cost: 300, damage: 18, cooldown: 4, range: 21, radius: 3.5, speed: 35, knock: 10, hidden: false },
      { name: 'Vengeful Missiles', desc: 'Damage 18 → 50, faster rockets, hidden detection, and rockets set zombies on fire (6 a second for 6s).', cost: 2700, damage: 50, cooldown: 4, range: 21, radius: 3.5, speed: 45, knock: 10, ignite: { dps: 6, time: 6 }, hidden: true },
      { name: 'Queen of the Blood Ember', desc: 'Damage 50 → 150, hotter and longer burns, a much bigger blast, stronger knockback and flying detection.', cost: 7270, damage: 150, cooldown: 4, range: 21, radius: 5, speed: 45, knock: 12.5, ignite: { dps: 12, time: 7 }, flying: true, hidden: true },
    ],
  },
  // Harvester: spectral bolts (homing, `fly` speed or the level's `speed`) plus the Thorns ability
  // (see thornsAb).
  harvester: {
    name: 'Harvester',
    event: 'Event reward',
    flying: true,
    lead: false,
    cost: 2000,
    limit: 5,
    fly: 60,
    blurb: 'A haunted scarecrow that shoots spectral bolts at one zombie, with flying detection from the start. Its Thorns ability grows a patch of thorns on the path that hurts and slows zombies, and your Farms in its range grow thorns too. No lead detection, and hidden detection only from Lv 4.',
    tip: 'Place Farms near the path inside its range for extra thorns. Thorns hit hidden zombies but not flying or lead ones.',
    levels: [
      { name: 'Harvester', desc: 'Spectral bolts: 20 damage every 1.4s. Unlocks Thorns.', damage: 20, cooldown: 1.4, range: 20, speed: 60, hidden: false,
        abilities: [thornsAb(2, 0.25, 4, 8, 0.15)] },
      { name: 'Sharper Thorns', desc: 'Shoots faster, and thorns do 2 more damage.', cost: 625, damage: 20, cooldown: 1.2, range: 20, speed: 60, hidden: false,
        abilities: [thornsAb(4, 0.25, 4, 8, 0.15)] },
      { name: 'Early Harvest', desc: 'Damage 20 → 35. Bigger thorn patches that last 11s and slow 20%.', cost: 1500, damage: 35, cooldown: 1.2, range: 20, speed: 60, hidden: false,
        abilities: [thornsAb(4, 0.25, 5, 11, 0.2)] },
      { name: "Nature's Vengence", desc: 'Damage 35 → 65 and hidden detection. Thorns do 4 more damage, cover more path and hit faster.', cost: 4000, damage: 65, cooldown: 1.2, range: 20, speed: 60, hidden: true,
        abilities: [thornsAb(8, 0.2, 6, 11, 0.2)] },
      { name: 'Cold-Hearted Scarecrow', desc: 'Damage 65 → 90, shoots every 0.75s and more range. Thorns cover more path, +1 damage and last 12s.', cost: 8750, damage: 90, cooldown: 0.75, range: 25, speed: 60, hidden: true,
        abilities: [thornsAb(9, 0.2, 7.5, 12, 0.2)] },
      { name: 'Harvesting Season', desc: 'Huge, slow shots: damage 90 → 420 every 1.75s, more range and faster bolts. Thorns do 4 more damage, last 15s and slow 30%.', cost: 24300, damage: 420, cooldown: 1.75, range: 30, speed: 85, hidden: true,
        abilities: [thornsAb(13, 0.2, 8, 15, 0.3)] },
    ],
  },
  // Snowballer (not the old one): exploding snowballs that splash the closest `maxHits` zombies
  // and chill them (see Freezer); from Lv 4 a hit on a fully chilled zombie freezes it.
  snowballerFrost: {
    name: 'Snowballer',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 300,
    limit: Infinity,
    lob: 0.6,
    freezeNext: true,
    kindLabel: 'Splash',
    blurb: 'A very cheap tower that throws exploding snowballs. Each one splashes a couple of zombies and slows them, and from Lv 4 fully slowed zombies freeze for a moment. Lead detection from the start, but low damage.',
    tip: 'Rush it to Lv 4 so it hits more zombies and freezes them. In harder modes, use it mostly to slow.',
    levels: [
      { name: 'Snowballer', desc: 'Snowballs that splash up to 2 zombies and slow them 10% per hit (up to 20%).', damage: 3, cooldown: 1.5, range: 15, radius: 2.5, maxHits: 2, chill: 0.5, maxSlow: 0.2, chillTime: 3, hidden: false },
      { name: 'Snow Day', desc: 'Throws faster and more range.', cost: 50, damage: 3, cooldown: 1.35, range: 17.5, radius: 2.5, maxHits: 2, chill: 0.5, maxSlow: 0.2, chillTime: 3, hidden: false },
      { name: 'Frigid Temperatures', desc: 'Damage 3 → 6, and a stronger slow: 15% per hit, up to 30%.', cost: 320, damage: 6, cooldown: 1.35, range: 17.5, radius: 2.5, maxHits: 2, chill: 0.5, maxSlow: 0.3, chillTime: 3, hidden: false },
      { name: 'Snowball Cannon', desc: 'Damage 6 → 28, throws faster, more range, hits 3 zombies, flying detection, and fully slowed zombies freeze for 0.6s.', cost: 3000, damage: 28, cooldown: 1.25, range: 20, radius: 2.5, maxHits: 3, chill: 0.5, maxSlow: 0.3, chillTime: 3, chillFreeze: 0.6, flying: true, hidden: false },
    ],
  },
  // Elementalist: bursts in Fire or Frost mode (tower field `choice[0]`, 'fire' unless switched
  // with ELEMENT_AB). element.fire: { dps, time } sets the zombies hit on fire. element.frost:
  // chill (see Freezer). Not used by the game yet (kept for later): leadBurn (its burns should
  // hurt lead zombies even though its shots can't hit them).
  elementalist: {
    name: 'Elementalist',
    event: 'Event reward',
    flying: false,
    lead: false,
    leadBurn: true,
    cost: 2000,
    limit: 5,
    choices: { fire: 'Fire', frost: 'Frost' },
    blurb: 'A mid-game burst-fire tower that switches between Fire mode (burns) and Frost mode (slows). From Lv 3 it unlocks Heatwave (Fire) and Ice Turret (Frost). No flying or lead detection.',
    tip: 'Switching takes 5s to recharge. Burns don\'t stack, so run one Elementalist on Fire and the rest on Frost.',
    levels: [
      { name: 'Elementalist', desc: '3-shot bursts in Fire mode (burns) or Frost mode (2% slow per hit, up to 10%).', damage: 3, burst: 3, burstGap: 0.2, cooldown: 1.2, range: 12, hidden: false,
        element: { fire: { dps: 2, time: 2 }, frost: { chill: 0.2, maxSlow: 0.1, chillTime: 3 } }, abilities: [ELEMENT_AB] },
      { name: 'Elemental Armory', desc: 'Damage 3 → 5, more range and 4-shot bursts. Fire burns harder for 3s; Frost slows 2.5% per hit.', cost: 1500, damage: 5, burst: 4, burstGap: 0.2, cooldown: 1.4, range: 15, hidden: false,
        element: { fire: { dps: 5, time: 3 }, frost: { chill: 0.25, maxSlow: 0.1, chillTime: 3 } }, abilities: [ELEMENT_AB] },
      { name: 'Experimental Tech', desc: 'Damage 5 → 10, more range and hidden detection. Fire: Heatwave. Frost: slows up to 15% and Ice Turret.', cost: 4000, damage: 10, burst: 4, burstGap: 0.2, cooldown: 1.4, range: 17, hidden: true,
        element: { fire: { dps: 5, time: 4 }, frost: { chill: 0.167, maxSlow: 0.15, chillTime: 3 } },
        abilities: [ELEMENT_AB, heatwaveAb(150, 20, 12.5, 15), iceTurretAb(iceTurret(10, 0.45, 12, 0.15))] },
      { name: 'Improved Exhaust Systems', desc: 'Damage 10 → 12, 5-shot bursts and shorter pauses. Fire burns tick twice as fast; bigger Heatwave. Frost slows 5% per hit; stronger Ice Turret.', cost: 8000, damage: 12, burst: 5, burstGap: 0.2, cooldown: 1.5, range: 17, hidden: true,
        element: { fire: { dps: 28, time: 2 }, frost: { chill: 0.333, maxSlow: 0.15, chillTime: 3 } },
        abilities: [ELEMENT_AB, heatwaveAb(250, 28, 13.5, 20), iceTurretAb(iceTurret(20, 0.35, 14.5, 0.15))] },
      { name: 'Frost Fire Specialist', desc: 'Damage 12 → 16, 7-shot bursts that fire much faster. Fire burns last 4s; huge Heatwave. Frost slows up to 20%; the best Ice Turret.', cost: 15000, damage: 16, burst: 7, burstGap: 0.125, cooldown: 1.275, range: 17, hidden: true,
        element: { fire: { dps: 28, time: 4 }, frost: { chill: 0.25, maxSlow: 0.2, chillTime: 3 } },
        abilities: [ELEMENT_AB, heatwaveAb(400, 38, 15, 25), iceTurretAb(iceTurret(28, 0.3, 17, 0.2))] },
    ],
  },
  // Firework Technician: a support tower that doesn't attack. When a wave starts, every tower
  // within `aura` gets hidden detection for `firework.time` s, and while that lasts each time
  // one of them damages a zombie it may launch a firework there: `damage` within `radius`
  // (ignoring armor, hitting lead) that sets zombies on fire (`burn` per second for 3s). The
  // chance is half the tower's seconds per shot, up to `cap` (slow towers fire more fireworks).
  fireworkTech: {
    name: 'Firework Technician',
    event: 'Event reward',
    cost: 1500,
    limit: 1,
    kind: 'support',
    blurb: "A support tower that doesn't attack. When a wave starts, towers in its range get hidden detection for a while, and while it lasts they have a chance to shoot a firework whenever they hurt a zombie. Fireworks explode, ignore armor, hit lead zombies and burn. Slow-firing towers get more fireworks.",
    tip: 'Its range is small, so place it right in the middle of your strongest towers.',
    levels: [
      { name: 'Firework Technician', desc: 'Towers in range get hidden detection for 10s each wave and up to a 50% chance of a 6 damage firework.', aura: 10, firework: { damage: 6, radius: 1, burn: 2, time: 10, cap: 0.5 } },
      { name: 'Pyrotechnics', desc: 'Fireworks do 12 damage and burn hotter. Detection lasts 20s, chance up to 60%.', cost: 2000, aura: 10, firework: { damage: 12, radius: 1, burn: 4, time: 20, cap: 0.6 } },
      { name: 'Bigger Boom', desc: 'Fireworks do 24 damage in a bigger blast and burn twice as fast. More range, detection lasts 30s, chance up to 70%.', cost: 6500, aura: 11, firework: { damage: 24, radius: 2, burn: 8, time: 30, cap: 0.7 } },
      { name: 'Light the Sky', desc: 'Fireworks do 35 damage and burn hotter. Chance up to 80%.', cost: 12000, aura: 11, firework: { damage: 35, radius: 2, burn: 16, time: 30, cap: 0.8 } },
      { name: 'The Finale', desc: 'Fireworks do 55 damage in a bigger blast and burn much hotter. More range, detection lasts 60s, chance up to 100%.', cost: 22000, aura: 12, firework: { damage: 55, radius: 3, burn: 32, time: 60, cap: 1 } },
    ],
  },
  // Biologist: grows plants (see sunflower / ivy / nightshade) on the path inside its range. It has
  // `queues` plant queues; the player picks which plant each one grows in the tower panel (tower
  // field `choice`). A queue grows its plant over the plant's `every` s, then starts the next.
  biologist: {
    name: 'Biologist',
    event: 'Event reward',
    cost: 750,
    limit: 8,
    kind: 'spawner',
    plants: true,
    noBuff: true,
    blurb: "Doesn't attack. It grows plants on the path next to it, and you pick which ones in its panel: Sunflowers shoot one zombie, Ivy poisons groups (and hurts lead zombies), and Nightshade confuses zombies. Its range is tiny, plants get trampled by zombies, and support towers can't boost them.",
    tip: 'Place it right beside the path. Several Sunflowers give you hidden detection; Ivy is the plant that hurts lead zombies.',
    levels: [
      { name: 'Biologist', desc: 'Grows Sunflowers on the path: 2.5 damage every 1.1s.', range: 9, queues: 1, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(50, 6, 1.1, 15), every: 10 }] },
      { name: 'Bio Chemistry', desc: 'Sunflowers +1.7 damage and +50 HP. Unlocks Ivy: splash damage that poisons and slows, with lead detection.', cost: 600, range: 9, queues: 1, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(100, 10, 1.1, 15), every: 10 }, { key: 'ivy', unit: ivy(100, 8, 2, 14, 3, { damage: 1, tick: 0.75, time: 4.5, slow: 0.05 }), every: 20 }] },
      { name: 'Scientific Breakthrough', desc: 'A second plant queue. Sunflowers get +0.8 damage, more range and HP, and hidden detection. Ivy hits harder in a bigger splash.', cost: 1850, range: 9, queues: 2, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(200, 12, 1.1, 17, true), every: 10 }, { key: 'ivy', unit: ivy(200, 12, 1.8, 15.5, 4, { damage: 2, tick: 0.75, time: 4.5, slow: 0.075 }), every: 20 }] },
      { name: 'Flower Power', desc: 'Sunflowers +7 damage, Ivy +6 damage with stronger poison. Unlocks Nightshade: 21 damage with huge range that confuses zombies, with flying detection.', cost: 4500, range: 9, queues: 2, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(400, 28, 1, 19.5, true), every: 10 }, { key: 'ivy', unit: ivy(400, 25, 1.8, 17, 4.5, { damage: 4, tick: 0.6, time: 4.5, slow: 0.075 }), every: 20 },
          { key: 'night', unit: nightshade(400, 50, 3, 30, { time: 1, cd: 4 }), every: 20 }] },
      { name: 'Botanical Berserker!', desc: 'A third plant queue, and every plant gets much stronger.', cost: 20000, range: 9, queues: 3, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(800, 55, 0.8, 22.5, true), every: 10 }, { key: 'ivy', unit: ivy(800, 45, 1.5, 18.5, 4.5, { damage: 5, tick: 0.6, time: 5.2, slow: 0.125 }), every: 20 },
          { key: 'night', unit: nightshade(800, 135, 2.75, 35, { time: 1.25, cd: 4 }), every: 20 }] },
    ],
  },
  // Warlock: beams at zombies outside its sword's reach (`minRange` = sword.reach), knocking them
  // back `knock`. sword: { damage, every, reach, targets, bleed? }: every `every` s it swings at up
  // to `targets` zombies within `reach`, adding `bleed` Bleed stacks (see Slasher bleedFx).
  warlock: {
    name: 'Warlock',
    event: 'Event reward',
    flying: false,
    cost: 4200,
    limit: 4,
    bleedFx: { max: 40, dps: 0.0002, time: 5, burst: 0.1, bossMult: 0.2 },
    kindLabel: 'Hybrid',
    blurb: 'A hybrid with a sword for zombies up close and energy beams for zombies farther away. From Lv 3 its beams knock zombies back, and from Lv 5 its sword stacks Bleed that bursts for big damage. Great against tough zombies and bosses, but no flying detection.',
    tip: 'Pair it with slowing towers to keep zombies inside its sword range.',
    levels: [
      { name: 'Warlock', desc: 'Beams far zombies (25 damage) and swings a sword at close ones.', damage: 25, cooldown: 1.1, range: 18, minRange: 6, hidden: false,
        sword: { damage: 40, every: 2, reach: 6, targets: 2 } },
      { name: 'Acolyte', desc: 'Beam damage 25 → 40, more range, sword +30 damage.', cost: 2500, damage: 40, cooldown: 1.1, range: 19, minRange: 6, hidden: false,
        sword: { damage: 70, every: 2, reach: 6, targets: 2 } },
      { name: 'Forbidden Arts', desc: 'Hidden detection. Beams knock zombies back, do 60 damage, fire faster with more range. Sword +65 damage and more reach.', cost: 6800, damage: 60, cooldown: 0.8, range: 22, minRange: 6.5, knock: 5, hidden: true,
        sword: { damage: 135, every: 2, reach: 6.5, targets: 2 } },
      { name: 'Pact of the Blade', desc: 'Beam damage 60 → 115 with stronger knockback. Sword +60 damage and swings faster.', cost: 12000, damage: 115, cooldown: 0.8, range: 22, minRange: 6.5, knock: 7.5, hidden: true,
        sword: { damage: 195, every: 1.8, reach: 6.5, targets: 2 } },
      { name: 'Eldritch Knight', desc: 'Beam damage 115 → 190 and more range. Sword +150 damage, more reach, hits 3 zombies and adds 3 Bleed per hit.', cost: 20000, damage: 190, cooldown: 0.8, range: 24, minRange: 7, knock: 7.5, hidden: true,
        sword: { damage: 345, every: 1.8, reach: 7, targets: 3, bleed: 3 } },
      { name: 'Abyss Walker', desc: 'Lead detection. Beam damage 190 → 250, fires faster, stronger knockback. Sword +200 damage, more reach and 5 Bleed per hit.', cost: 30000, damage: 250, cooldown: 0.7, range: 24, minRange: 8, knock: 10, lead: true, hidden: true,
        sword: { damage: 545, every: 1.8, reach: 8, targets: 3, bleed: 5 } },
    ],
  },
  // Spotlight Tech: sweeps a spotlight toward its target (`spot.speed` studs a second) and every
  // `cooldown` s hits every zombie in the light (`spot.radius`), doing less away from the middle
  // (down to `spot.edge` of the damage at the rim). ignite: burns everything in the light.
  // spot.reveal: hidden zombies in the light are revealed to every tower. spot.confuse: { charge,
  // time, cd }: after dealing `charge` damage, confuses everything in the light (not bosses).
  spotlight: {
    name: 'Spotlight Tech',
    event: 'Event reward',
    placement: 'cliff',
    lead: 1,
    cost: 3225,
    limit: 1,
    stunImmune: true,
    kindLabel: 'Area',
    blurb: 'A cliff tower that sweeps a spotlight over the zombies, hurting every zombie in the light (less near the edge). From Lv 2 the light burns, from Lv 3 it reveals hidden zombies to every tower, and at Lv 5 it can confuse everything in the light. Flying detection and can\'t be stunned. One per player, cliffs only.',
    tip: 'Random targeting spreads the burn around. Slowing towers bunch zombies up so the light hits more of them.',
    levels: [
      { name: 'Spotlight Tech', desc: 'A spotlight that hurts every zombie inside it.', damage: 4, cooldown: 0.325, range: 30, spot: { radius: 2, speed: 18, edge: 0.5 }, hidden: false },
      { name: 'Backstage Crew', desc: 'Lead detection, a bigger light, and it sets zombies on fire.', cost: 1865, damage: 4, cooldown: 0.325, range: 30, spot: { radius: 3.5, speed: 18, edge: 0.5 }, ignite: { dps: 4, time: 2 }, hidden: false },
      { name: 'Non OSHA Compliant', desc: 'Damage 4 → 8, more range, hidden detection, a bigger light, hotter burns, and Hidden Reveal: zombies in the light can be hit by every tower.', cost: 4820, damage: 8, cooldown: 0.325, range: 35, spot: { radius: 4.5, speed: 18, edge: 0.5, reveal: true }, ignite: { dps: 8, time: 2 }, hidden: true },
      { name: 'Backstage Crew', desc: 'Damage 8 → 10, hits much faster, and burns are much hotter and last 4s.', cost: 12560, damage: 10, cooldown: 0.2, range: 35, spot: { radius: 4.5, speed: 18, edge: 0.5, reveal: true }, ignite: { dps: 20, time: 4 }, hidden: true },
      { name: 'Certified Spotlight Operator', desc: 'Damage 10 → 14, more range, a bigger light, much hotter 6s burns, and after dealing 1,800 damage it confuses everything in the light for 2.5s.', cost: 19320, damage: 14, cooldown: 0.2, range: 40,
        spot: { radius: 5.5, speed: 18, edge: 0.5, reveal: true, confuse: { charge: 1800, time: 2.5, cd: 7.5 } }, ignite: { dps: 40, time: 6 }, hidden: true },
    ],
  },
  // Star Cannon: charges up over `star.charge` s (while not rebooting), then fires a beam that
  // explodes for `min` to `max` damage (by charge) within `radius`, ignoring armor. It fires once
  // the charge is full, or sooner if the shot would already kill its target. It then reboots for
  // `star.reboot` s. star.stun: stuns everything in the blast (bosses only with `stunBoss`).
  // star.extra: it also blasts that many more zombies. star.battery: the chance that any kill
  // drops a battery, adding `GAME.starBattery` of a full charge to every Star Cannon. Not used by
  // the game yet (kept for later): freezeImmune (nothing freezes towers yet).
  starCannon: {
    name: 'Star Cannon',
    event: 'Event reward',
    placement: 'cliff',
    lead: true,
    cost: 20210,
    limit: 1,
    stunImmune: true,
    freezeImmune: true,
    kindLabel: 'Charge',
    blurb: 'A huge cliff cannon that charges up and fires a beam that explodes on zombies, ignoring armor. The longer it charges the harder it hits, and kills sometimes drop batteries that speed up the charge. The biggest hits in the game, but long charges and reboots. One per player, cliffs only.',
    tip: 'Strongest targeting gets the most out of each shot. It fires early if a weaker shot is already enough to kill.',
    levels: [
      { name: 'Star Cannon', desc: 'Charges for 30s, then fires a beam: 200 to 4,000 damage (by charge) in a blast that ignores armor.', damage: 200, cooldown: 7.5, range: 90, radius: 2.5, hidden: false,
        star: { min: 200, max: 4000, charge: 30, reboot: 7.5, battery: 0.1 } },
      { name: 'Solar-Flare Batteries', desc: '300 to 5,500 damage, and hits stun zombies (not bosses) for 1s.', cost: 9001, damage: 300, cooldown: 7.5, range: 90, radius: 2.5, hidden: false,
        star: { min: 300, max: 5500, charge: 30, reboot: 7.5, battery: 0.1, stun: 1 } },
      { name: 'Eclipsed Crew', desc: '500 to 15,000 damage, a bigger blast, 2s stuns and more batteries. But a full charge takes 45s and rebooting 10s.', cost: 29001, damage: 500, cooldown: 10, range: 90, radius: 3, hidden: false,
        star: { min: 500, max: 15000, charge: 45, reboot: 10, battery: 0.15, stun: 2 } },
      { name: 'Lunar Charges', desc: '2,000 to 45,000 damage, hidden detection and 4s stuns. Rebooting takes 7.5s, but a full charge 60s.', cost: 80000, damage: 2000, cooldown: 7.5, range: 90, radius: 3, hidden: true,
        star: { min: 2000, max: 45000, charge: 60, reboot: 7.5, battery: 0.15, stun: 4 } },
      { name: 'Shot of the Century', desc: '5,000 to 140,000 damage, a huge blast, each shot hits 3 more zombies, and it stuns bosses too. A full charge takes 70s and rebooting 10s.', cost: 240000, damage: 5000, cooldown: 10, range: 90, radius: 5, hidden: true,
        star: { min: 5000, max: 140000, charge: 70, reboot: 10, battery: 0.15, stun: 4, stunBoss: true, extra: 3 } },
    ],
  },
  // ---------------------------------------------------------------- event towers (wave 4)
  // Relic: a spawner of medieval units (see RELIC for the unit fields). `unit` to `unit5` each
  // come on their own timer (`spawnEvery`, `spawnEvery2`...). Its units can't be boosted by
  // support towers (`noBuff`). Relic Summon (ability `summon`): drops `drop` units on the path
  // where you click. ignoreExplosiveResist (last level): gets through explosive resistance. Not used
  // by the game yet (kept for later): the explosive / lightning damage types the Relic gets at its last level.
  relic: {
    name: 'Relic',
    event: 'The Awakened Invasion (back in the Halloween 2026 update)',
    cost: 2000,
    limit: 5,
    teamLimit: [5, 3, 2, 2],
    kind: 'spawner',
    spawnEvery: 30,
    noBuff: true,
    blurb: "A spawner that sends medieval units down the path to block zombies and fight them. Units stop and attack when zombies come into range; most of their damage is up close or from ramming. Early levels send Bandits, Zealot knights, Archers and Wardens. Lv 5 adds flying Seraphs and the huge Overseer, and the last level sends Seraphs, Overseers and the giant Overseer Prime, and unlocks Relic Summon.",
    tip: "Great at blocking and stalling zombies, and at max level it shreds bosses and hordes: the Overseer Prime's laser reaches almost anywhere. Support towers can't boost its units, and the last level is extremely expensive.",
    levels: [
      { name: 'Relic', desc: 'Sends a Bandit (190 HP, 20 DPS) every 30s that fights zombies up close. The Relic has 2,000 health.', hp: 2000, hidden: false,
        unit: RELIC.bandit },
      { name: 'Armor', desc: 'Sends 3 Bandits every 30s instead of 1. Health 2,300.', cost: 2700, hp: 2300, hidden: false,
        unit: RELIC.bandit3 },
      { name: 'Knights', desc: 'Adds a Zealot knight (2,000 HP, 200 DPS) every 55s and an Archer (175 HP, 30 DPS) every 50s. Units see hidden zombies. Health 2,700.', cost: 16500, hp: 2700, hidden: true,
        unit: RELIC.bandit3h, unit2: RELIC.zealot, spawnEvery2: 55, unit3: RELIC.archer, spawnEvery3: 50 },
      { name: 'Warden', desc: 'Adds a Warden (15,000 HP, 750 DPS, small splash) every 60s, and Bandits become Bandit Level 1s (560 HP, 111 DPS), 3 every 25s. Health 4,200.', cost: 45000, hp: 4200, hidden: true, spawnEvery: 25,
        unit: RELIC.bandit1, unit2: RELIC.zealot, spawnEvery2: 55, unit3: RELIC.archer, spawnEvery3: 50, unit4: RELIC.warden, spawnEvery4: 60 },
      { name: 'Relic Army', desc: 'No more Bandits. Sends 2 Zealots every 15s, 2 Archers every 45s, 2 Wardens every 50s, a flying Seraph (about 1,944 DPS) every 50s and a 120,000 HP Overseer that rams zombies every 145s. Health 11,200.', cost: 250000, hp: 11200, hidden: true, spawnEvery: 15,
        unit: RELIC.zealot2, unit2: RELIC.archer2, spawnEvery2: 45, unit3: RELIC.warden2, spawnEvery3: 50, unit4: RELIC.seraph, spawnEvery4: 50, unit5: RELIC.overseer, spawnEvery5: 145 },
      { name: 'Overseer & Seraph', desc: 'Only Seraphs (2 every 40s), Overseers (2 every 100s) and the giant Overseer Prime (200,000 HP) every 230s, up to 2 at once. Every unit hits flying zombies, and it unlocks Relic Summon. Health 46,200.', cost: 1500000, hp: 46200, hidden: true, spawnEvery: 40,
        ignoreExplosiveResist: true, damageTypes: ['explosive', 'lightning'],
        unit: RELIC.seraph2, unit2: RELIC.overseer2, spawnEvery2: 100, unit3: RELIC.prime, spawnEvery3: 230,
        abilities: [{ key: 'summon', name: 'Relic Summon', desc: 'Drops 2 Wardens, 3 Seraphs and a Phantom Overseer on the path where you click', cooldown: 220, aim: true, radius: 4,
          drop: [{ unit: RELIC.warden, n: 2 }, { unit: RELIC.seraph2, n: 3 }, { unit: RELIC.phantom, n: 1 }] }] },
    ],
  },
  // ---------------------------------------------------------------- event towers (wave 5)
  // MLRS: a rocket truck. It fires `burst` rockets per reload (`burstGap` s apart), each a blast of
  // `radius`, and has a big deadzone (`minRange`). Target Select (see targetSelectAb) aims it at a
  // spot; with `autoAim` it picks its own targets when nothing is there (or no spot is set), so
  // it works either way. Carpet Bomb: see CARPET_BOMB_AB. The spec gives no limit, blast or
  // deadzone size: limit 3, blast 3 (4 at Lv 3, 6 at Lv 5) and deadzone 15 (17 from Lv 2) are guesses.
  mlrs: {
    name: 'MLRS',
    event: 'Event reward',
    cost: 17000,
    limit: 3,
    flying: false,
    lead: true,
    lob: 1.4,
    burstGap: 0.15,
    blurb: 'A rocket truck that fires bursts of explosive rockets from very far away. Aim it yourself with Target Select like the Artillery, or let it pick its own targets. It has a big deadzone close to itself and slow reloads. Sees hidden zombies from Lv 4, and at max level it calls a B-52 bomber to carpet bomb a long stretch of path.',
    tip: 'Aim it at summoners or busy corners, and save Carpet Bomb for long straight stretches of path. Keep it far from the path so the deadzone doesn\'t matter.',
    levels: [
      { name: 'MLRS', desc: 'Fires 6 explosive rockets every 14s from far away. Can\'t hit zombies closer than 15.', damage: 265, burst: 6, cooldown: 14, range: 75, radius: 3, minRange: 15, hp: 1550, hidden: false, autoAim: true, abilities: [targetSelectAb(3)] },
      { name: 'Extra Salvo', desc: '12 rockets per burst instead of 6, and reloads 1s faster.', cost: 10400, damage: 265, burst: 12, cooldown: 13, range: 75, radius: 3, minRange: 15, hp: 1750, hidden: false, autoAim: true, abilities: [targetSelectAb(3)] },
      { name: 'Radar', desc: '+50 range, but the deadzone grows by 2.', cost: 4000, damage: 265, burst: 12, cooldown: 13, range: 125, radius: 3, minRange: 17, hp: 2125, hidden: false, autoAim: true, abilities: [targetSelectAb(3)] },
      { name: 'Heavy Missiles', desc: 'Damage 265 → 765 per rocket and a bigger blast.', cost: 45000, damage: 765, burst: 12, cooldown: 13, range: 125, radius: 4, minRange: 17, hp: 2705, hidden: false, autoAim: true, abilities: [targetSelectAb(4)] },
      { name: 'Dual Radar', desc: 'Hidden detection, +150 range, and reloads 2s faster.', cost: 12000, damage: 765, burst: 12, cooldown: 11, range: 275, radius: 4, minRange: 17, hp: 3625, hidden: true, autoAim: true, abilities: [targetSelectAb(4)] },
      { name: 'Freedom Time', desc: 'Damage 765 → 2,265, a much bigger blast, reloads 1s faster and unlocks Carpet Bomb: a B-52 drops 105 bombs along the path.', cost: 215000, damage: 2265, burst: 12, cooldown: 10, range: 275, radius: 6, minRange: 17, hp: 5095, hidden: true, autoAim: true,
        abilities: [targetSelectAb(6), CARPET_BOMB_AB] },
    ],
  },
  // Psycho Slayer (alternate event Commando form): a big armored warrior. Its Bolter gun shoots one
  // zombie; passive weapons on their own timers (see psychoSlam / psychoRail / psychoRockets /
  // PSYCHO_MORTAR) and Teleport / Jump (see TELEPORT_AB, jumpAb). The spec gives no limit: 3 is a
  // guess. ignoreBulletResist on the Bolter: gets through bullet resistance (it also has `lead:
  // true`). ignoreExplosiveResist on the Mortar works; on Jump it's kept for later (see jumpAb).
  eventCommandoPsycho: {
    name: 'Psycho Slayer',
    altOf: 'eventCommando',
    form: 'Psycho Slayer',
    shards: 1,
    price: 0,
    cost: 3000,
    limit: 3,
    flying: false,
    lead: true,
    ignoreBulletResist: true,
    blurb: 'An alternate Commando: a big armored warrior with a Bolter gun and a mace that smacks and stuns the strongest zombie nearby. Later it adds railguns, rockets that hit flyers and a long-range mortar, and it can teleport or jump around the map. Tons of health, but expensive, no hidden detection until max level, and a low limit.',
    tip: 'Great for catching leaks and as a late-game helper. Pair it with healers like the Combat Medic or Shield Tower. Jump onto bosses to hit them hard, or out of the way of deadly attacks.',
    levels: [
      { name: 'Psycho Slayer', desc: 'A Bolter gun, plus a mace Slam on the strongest zombie within 7 (100 damage, 0.2s stun, every 10s).', damage: 20, cooldown: 0.8, range: 15, hp: 1800, hidden: false,
        missiles: [psychoSlam(100, 0.2, 10, 20)] },
      { name: 'Enhanced Suit', desc: 'Damage 20 → 30, shoots faster, a stronger Slam, and unlocks Teleport.', cost: 2800, damage: 30, cooldown: 0.6, range: 15, hp: 2650, hidden: false,
        missiles: [psychoSlam(160, 0.4, 10, 50)], abilities: [TELEPORT_AB] },
      { name: 'Core Armor', desc: 'Damage 30 → 50, more range and a stronger Slam.', cost: 7250, damage: 50, cooldown: 0.6, range: 18, hp: 4450, hidden: false,
        missiles: [psychoSlam(200, 0.5, 10, 100)], abilities: [TELEPORT_AB] },
      { name: 'Rail Guns', desc: 'Damage 50 → 90, more range, a stronger Slam, and a Railgun Attack: 3 shots of 700 every 12s.', cost: 27000, damage: 90, cooldown: 0.6, range: 23, hp: 7350, hidden: false,
        missiles: [psychoSlam(400, 0.5, 13, 150), psychoRail(700, 12)], abilities: [TELEPORT_AB] },
      { name: 'Space Suit', desc: "Damage 90 → 150, can't be stunned, Rockets that hit flyers (6 × 325 every 16s), Jump, and stronger Slam and Railgun.", cost: 43000, damage: 150, cooldown: 0.5, range: 23, hp: 16600, hidden: false, stunImmune: true,
        missiles: [psychoSlam(600, 1.2, 12, 200), psychoRail(800, 10), psychoRockets(325, 1, 16)], abilities: [TELEPORT_AB, jumpAb(1000, 1, 7, 10)] },
      { name: 'Psycho Warrior', desc: 'Damage 150 → 550, hidden detection, a Mortar that hits the strongest zombie for 9,000, and much stronger Slam (stuns anything), Railgun, Rockets and Jump.', cost: 350000, damage: 550, cooldown: 0.4, range: 23, hp: 66600, hidden: true, stunImmune: true,
        missiles: [psychoSlam(4000, 1.5, 7.5, 300, true), psychoRail(3500, 12), psychoRockets(1400, 2, 12), PSYCHO_MORTAR], abilities: [TELEPORT_AB, jumpAb(5000, 2, 9, 12)] },
    ],
  },
  // Bubble Blower (alternate Cryomancer form): blows bursts of bubbles. bubble: { n, push } — each
  // shot blows `n` bubbles at different zombies in range, each doing `damage` and pushing non-boss
  // zombies back `push` (knockback, see knockBack; a zombie can only be pushed every BUBBLE_PUSH_CD
  // s). bubble.float (Lv 5): bubbles lift non-boss zombies off the ground for that long instead.
  // companion: { unit, every }: a unit that appears on the path at the far end of its range.
  // Big bursts are split into `n` bubbles per shot so they fit the sim's tick rate. The spec gives
  // no limit: 10 is a guess. Not used by the game yet (kept for later): aimDelay (Lv 2 aims 0.72s
  // longer, Lv 5 0.04s faster; the game has no aim delay yet).
  cryomancerBubble: {
    name: 'Bubble Blower',
    altOf: 'cryomancer',
    form: 'Bubble Blower',
    shards: 1,
    price: 0,
    cost: 150,
    limit: 10,
    flying: false,
    lead: true,
    bossStop: 0,
    kindLabel: 'Stall',
    blurb: 'An alternate Cryomancer: a stalling tower that blows bubbles that push zombies backward. At max level it shoots nonstop, its bubbles float zombies in the air so they can\'t move, and it sends out a Bubble Companion every 10 seconds to block the path. Tiny damage, and bubbles do nothing to bosses.',
    tip: 'Pair it with stunning towers and big splash damage: zombies bunch up while they\'re pushed back. Several Bubble Blowers stall crowds really well.',
    levels: [
      { name: 'Bubble Blower', desc: 'Blows 9 bubbles every 4.1s that push non-boss zombies back 0.8 studs.', damage: 0.5, burst: 9, burstGap: 0.2, cooldown: 4.1, range: 6.7, bubble: { n: 1, push: 4 }, hp: 100, hidden: false },
      { name: 'Gloves', desc: 'Reloads 0.5s faster and +1 range.', cost: 285, damage: 0.5, burst: 9, burstGap: 0.2, cooldown: 3.6, range: 7.7, bubble: { n: 1, push: 4 }, hp: 125, hidden: false },
      { name: 'Bubble Gun', desc: '50 bubbles per burst, +2 range and stronger push (1 stud), but reloads a bit slower.', cost: 600, damage: 0.5, burst: 25, burstGap: 0.08, cooldown: 4, range: 9.7, bubble: { n: 2, push: 5 }, hp: 175, hidden: false, aimDelay: 0.72 },
      { name: 'Big Muscles', desc: 'Damage 0.5 → 1 and stronger push (1.5 studs).', cost: 2150, damage: 1, burst: 25, burstGap: 0.08, cooldown: 4, range: 9.7, bubble: { n: 2, push: 7.5 }, hp: 675, hidden: false, aimDelay: 0.72 },
      { name: 'Extra Bubbles', desc: 'Damage 1 → 1.5, 120 bubbles per burst and a bit more push (1.6 studs).', cost: 4750, damage: 1.5, burst: 40, burstGap: 0.06, cooldown: 4, range: 9.7, bubble: { n: 3, push: 8 }, hp: 725, hidden: false, aimDelay: 0.72 },
      { name: 'Super Bubble Man', desc: 'Shoots nonstop and +7 range. Bubbles float non-boss zombies for 2.2s instead of pushing them, and a Bubble Companion (100 HP) appears every 10s, up to 2 at once.', cost: 17250, damage: 1.5, cooldown: 0.14, range: 16.7, bubble: { n: 1, float: 2.2 }, hp: 2225, hidden: false, aimDelay: 0.68,
        companion: { unit: BUBBLE_BUDDY, every: 10 } },
    ],
  },
  // ---------------------------------------------------------------- evolved towers
  // evolved: an evolution of a tower (also an alternate form of `altOf`, picked in the Variants
  // menu). It is unlocked with credits (`price`) and Dimension Shards (`shards`) once the tower
  // it evolves from (`evoFrom`) reaches tower level `evoLevel` (towers earn XP by being used).
  // Evolved towers earn their own XP too: a level with `evo: N` needs evolution level N to buy.
  // coord: Operators within `radius` of another of your Operators deal `boost` more damage.
  // flashbang: after dealing `charge` damage, stuns zombies within `radius` of its target for `stun` s (not bosses).
  // bossMult: damage multiplier against bosses. fortify: your towers within `radius` are stunned `reduce` less long.
  // Not used by the game yet (kept for later): sharedOptics, pump, helicopter, queues (choosing each queue's unit).
  evoOperator: {
    name: 'Operator',
    altOf: 'scout',
    evolved: true,
    evoFrom: 'scout',
    evoLevel: 20,
    form: 'Operator',
    price: 3000,
    shards: 2,
    lead: false,
    flying: false,
    cost: 300,
    limit: 16,
    blurb: 'The evolved Scout. Fires bursts of bullets, and Operators work as a team: Operators packed close together boost each other\'s damage. Cheap enough to place up to 16.',
    tip: 'Best in the early to mid game. Coordination only works if Operators are packed tightly together.',
    levels: [
      { name: 'Operator', desc: 'Fires bursts of 6 bullets.', damage: 1, burst: 6, burstGap: 0.12, cooldown: 2.12, range: 14, hidden: false },
      { name: 'Tactical Gear', desc: '+1 damage and hidden detection.', cost: 325, damage: 2, burst: 6, burstGap: 0.12, cooldown: 2.12, range: 14, hidden: true },
      { name: 'Convergent Forces', desc: '+1 damage, more range, a shorter pause between bursts and flying detection. Coordination: Operators within 4 studs of each other deal 10% more damage.', cost: 700, damage: 3, burst: 6, burstGap: 0.12, cooldown: 1.72, range: 15.5, hidden: true, flying: true,
        coord: { radius: 4, boost: 0.1 } },
      { name: 'Cyber-Enforcer', desc: '+1 damage, faster shots and bigger bursts (9 shots).', cost: 1250, damage: 4, burst: 9, burstGap: 0.1, cooldown: 1.9, range: 15.5, hidden: true, flying: true,
        coord: { radius: 4, boost: 0.1 } },
      { name: 'Threat Detection Sentinel', desc: '+2 damage and a bigger Coordination radius (5.5 studs).', cost: 1950, damage: 6, burst: 9, burstGap: 0.1, cooldown: 1.9, range: 15.5, hidden: true, flying: true,
        coord: { radius: 5.5, boost: 0.1 } },
      { name: 'Synchronized Vision', desc: 'No more pause between bursts: it fires nonstop (each shot a bit slower). More range. Shared Optics: it can shoot zombies another Operator in its range can see.', cost: 3500, evo: 10, damage: 6, cooldown: 0.16, range: 16, hidden: true, flying: true,
        coord: { radius: 5.5, boost: 0.1 }, sharedOptics: true },
      { name: '1000-THR E.M.', desc: '+4 damage and more range.', cost: 7000, evo: 20, damage: 10, cooldown: 0.16, range: 17, hidden: true, flying: true,
        coord: { radius: 5.5, boost: 0.1 }, sharedOptics: true },
    ],
  },
  // Breacher (evolved Shotgunner): piercing pump-shotgun pellets (see Pump Shotgunner; `scatter`
  // zombies per pellet take full damage). Paths split at Lv 6.
  evoBreacher: {
    name: 'Breacher',
    altOf: 'shotgunner',
    evolved: true,
    evoFrom: 'shotgunner',
    evoLevel: 20,
    form: 'Breacher',
    price: 8000,
    shards: 3,
    lead: true,
    cost: 3000,
    limit: 5,
    callPause: 0,
    branch: 'evoBreacherBottom',
    branchAt: 5,
    path: 'Top',
    blurb: 'The evolved Shotgunner. Fires shotgun blasts whose pellets pierce zombies, and from Lv 3 throws flashbangs that stun groups. Top path: a full-auto shotgun. Bottom path: SWAT Vans that ram zombies and explode.',
    tip: 'Good placement and targeting let each pellet pierce more zombies. Bosses and stun-immune zombies ignore the flashbang.',
    levels: [
      { name: 'Breacher', desc: 'A pump shotgun firing 6 piercing pellets. Hits lead zombies.', damage: 10, pellets: 6, scatter: 3, cone: 0.22, cooldown: 1, range: 10, hidden: false, pump: 1 },
      { name: 'Elbow Grease', desc: 'More range, and it shoots and pumps faster.', cost: 750, damage: 10, pellets: 6, scatter: 3, cone: 0.22, cooldown: 0.85, range: 12, hidden: false, pump: 0.85 },
      { name: 'Flash Grenade', desc: '+2 damage per pellet, 8 pellets and hidden detection. Flashbang: after 640 damage it stuns zombies within 4 studs for 0.5s.', cost: 2650, damage: 12, pellets: 8, scatter: 3, cone: 0.22, cooldown: 0.85, range: 12, hidden: true, pump: 0.85,
        flashbang: { charge: 640, radius: 4, stun: 0.5 } },
      { name: 'Urban Operations', desc: '+8 damage per pellet and a bigger flashbang.', cost: 4600, damage: 20, pellets: 8, scatter: 3, cone: 0.22, cooldown: 0.85, range: 12, hidden: true, pump: 0.85,
        flashbang: { charge: 1000, radius: 5, stun: 0.5 } },
      { name: 'Specialist', desc: '+13 damage per pellet and longer flashbang stuns.', cost: 7250, damage: 33, pellets: 8, scatter: 3, cone: 0.22, cooldown: 0.85, range: 12, hidden: true, pump: 0.85,
        flashbang: { charge: 1500, radius: 5, stun: 0.75 } },
      { name: 'Good Coms', path: 'Top', desc: 'Top path: a full-auto shotgun: fires every 0.2s with 25 shots per magazine. Fewer, weaker pellets in a tighter spread, more range, and stronger flashbangs.', cost: 12000, damage: 14, pellets: 4, scatter: 2, cone: 0.15, cooldown: 0.2, range: 17, ammo: 25, reload: 1.5, hidden: true,
        flashbang: { charge: 1200, radius: 4.5, stun: 1.2 }, helicopter: SUPPORT_HELI },
      { name: 'Full Arsenal', path: 'Top', desc: 'More range, 6 pellets and 60 shots per magazine.', cost: 20000, evo: 5, damage: 14, pellets: 6, scatter: 2, cone: 0.15, cooldown: 0.2, range: 19.5, ammo: 60, reload: 1.5, hidden: true,
        flashbang: { charge: 1800, radius: 4.5, stun: 1.2 }, helicopter: SUPPORT_HELI },
      { name: 'Punisher', path: 'Top', desc: '+4 damage per pellet, faster reloads and 1.5s flashbang stuns.', cost: 31500, evo: 15, damage: 18, pellets: 6, scatter: 2, cone: 0.15, cooldown: 0.2, range: 19.5, ammo: 60, reload: 1, hidden: true,
        flashbang: { charge: 2700, radius: 4.5, stun: 1.5 }, helicopter: SUPPORT_HELI },
    ],
  },
  // The Breacher's Bottom path (not in the shop: a Breacher becomes this when you pick it).
  evoBreacherBottom: {
    name: 'Breacher',
    branchOf: 'evoBreacher',
    branchAt: 5,
    path: 'Bottom',
    lead: true,
    price: 0,
    cost: 3000,
    limit: 5,
    callPause: 0,
    blurb: "The Breacher's Bottom path: faster pumps and a tighter spread, and SWAT Vans that ram zombies down the path and explode when destroyed.",
    tip: 'Vans explode when destroyed, so they hurt crowds the most. Commander, DJ Booth and Medic help the flashbang charge faster.',
    levels: [
      { name: 'Breacher', desc: 'A pump shotgun firing 6 piercing pellets. Hits lead zombies.', damage: 10, pellets: 6, scatter: 3, cone: 0.22, cooldown: 1, range: 10, hidden: false, pump: 1 },
      { name: 'Elbow Grease', desc: 'More range, and it shoots and pumps faster.', cost: 750, damage: 10, pellets: 6, scatter: 3, cone: 0.22, cooldown: 0.85, range: 12, hidden: false, pump: 0.85 },
      { name: 'Flash Grenade', desc: '+2 damage per pellet, 8 pellets and hidden detection. Flashbang: after 640 damage it stuns zombies within 4 studs for 0.5s.', cost: 2650, damage: 12, pellets: 8, scatter: 3, cone: 0.22, cooldown: 0.85, range: 12, hidden: true, pump: 0.85,
        flashbang: { charge: 640, radius: 4, stun: 0.5 } },
      { name: 'Urban Operations', desc: '+8 damage per pellet and a bigger flashbang.', cost: 4600, damage: 20, pellets: 8, scatter: 3, cone: 0.22, cooldown: 0.85, range: 12, hidden: true, pump: 0.85,
        flashbang: { charge: 1000, radius: 5, stun: 0.5 } },
      { name: 'Specialist', desc: '+13 damage per pellet and longer flashbang stuns.', cost: 7250, damage: 33, pellets: 8, scatter: 3, cone: 0.22, cooldown: 0.85, range: 12, hidden: true, pump: 0.85,
        flashbang: { charge: 1500, radius: 5, stun: 0.75 } },
      { name: 'SWAT Van', path: 'Bottom', desc: 'Bottom path: faster shots, more range and a tighter spread. Calls a SWAT Van every 45s that rams zombies, then explodes for 350 damage when destroyed.', cost: 12000, damage: 33, pellets: 8, scatter: 3, cone: 0.18, cooldown: 0.7, range: 13, hidden: true, pump: 0.7,
        flashbang: { charge: 2000, radius: 6.5, stun: 0.75 }, goons: { every: 45, units: [SWAT_VAN[0]] } },
      { name: 'Full Suit', path: 'Bottom', desc: '+5 damage per pellet, 10 pellets and longer stuns. Vans get more health and a bigger explosion.', cost: 15000, evo: 10, damage: 38, pellets: 10, scatter: 3, cone: 0.18, cooldown: 0.7, range: 13, hidden: true, pump: 0.7,
        flashbang: { charge: 2500, radius: 4.5, stun: 1 }, goons: { every: 45, units: [SWAT_VAN[1]] } },
      { name: 'Peacekeeper', path: 'Bottom', desc: "+7 damage per pellet, more range and it can't be stunned. Calls 2 vans at a time, each with a machine gunner that sees hidden zombies.", cost: 20000, evo: 20, damage: 45, pellets: 10, scatter: 3, cone: 0.18, cooldown: 0.7, range: 14, hidden: true, pump: 0.7, stunImmune: true,
        flashbang: { charge: 3000, radius: 4.5, stun: 1 }, goons: { every: 45, units: [SWAT_VAN[2], SWAT_VAN[2]] } },
    ],
  },
  // Kingpin (evolved Crook Boss): shoots and calls its gang (see Crook Boss `goons`). Paths split at Lv 5.
  evoKingpin: {
    name: 'Kingpin',
    altOf: 'crookBoss',
    evolved: true,
    evoFrom: 'crookBoss',
    evoLevel: 20,
    form: 'Kingpin',
    price: 10000,
    shards: 3,
    lead: false,
    cost: 3600,
    limit: 4,
    callPause: 0,
    branch: 'evoKingpinBottom',
    branchAt: 4,
    path: 'Top',
    blurb: 'The evolved Crook Boss. Shoots one zombie at a time and calls its gang: Lackeys (gunmen with hidden detection) and Money Runners that pay cash when they go down. Top path: Bounty for big cash. Bottom path: tougher units, Bouncers and Contractors.',
    tip: 'Use the Top path to make money for towers like the Titan. Put Bounty on high-health zombies, since they pay the most.',
    levels: [
      { name: 'Kingpin', desc: 'Shoots one zombie at a time and calls a Lackey every 37.5s.', damage: 24, cooldown: 1.1, range: 17.5, hidden: false, flying: false, queues: 1,
        goons: { every: 37.5, units: [LACKEY[0]] } },
      { name: 'Hat Trick', desc: 'More range and faster shots.', cost: 1400, damage: 24, cooldown: 0.85, range: 20, hidden: false, flying: false, queues: 1,
        goons: { every: 37.5, units: [LACKEY[0]] } },
      { name: 'Mafia Expansion', desc: 'Fires about six times as fast, but each shot is weaker. A second queue adds a Money Runner.', cost: 4000, damage: 7, cooldown: 0.14, range: 20, hidden: false, flying: false, queues: 2,
        goons: { every: 37.5, units: [LACKEY[0], runner(50, 200)] } },
      { name: 'High Roller', desc: 'Flying detection, +5 damage and units come every 30s.', cost: 6000, damage: 12, cooldown: 0.14, range: 20, hidden: false, queues: 2,
        goons: { every: 30, units: [LACKEY[0], runner(50, 200)] } },
      { name: 'LV. 10 Bounty Hunter', path: 'Top', desc: 'Top path: big, slow shots and lead detection. Money Runners drop $450. Unlocks Bounty: mark a zombie and get 60% of its max health as cash when it dies (up to $10,000).', cost: 7250, damage: 160, cooldown: 1.65, range: 20, hidden: false, lead: true, queues: 2,
        goons: { every: 30, units: [LACKEY[0], runner(85, 450)] }, abilities: [kingpinBounty(0.6, 10000)] },
      { name: 'LV. 50 Flashy Business', path: 'Top', desc: '+135 damage. Bounty pays 80% (up to $25,000). Stronger Lackeys, and Money Runners drop $600.', cost: 16500, evo: 5, damage: 295, cooldown: 1.65, range: 20, hidden: false, lead: true, queues: 2,
        goons: { every: 27.5, units: [LACKEY[1], runner(85, 600)] }, abilities: [kingpinBounty(0.8, 25000)] },
      { name: 'LV. 999 BOSS', path: 'Top', desc: 'Shoots twice as often for less damage per shot. Bounty pays 100% (up to $50,000). Much stronger Lackeys, and Money Runners drop $850.', cost: 38500, evo: 15, damage: 225, cooldown: 0.8, range: 21.5, hidden: false, lead: true, queues: 2,
        goons: { every: 25, units: [LACKEY[2], runner(110, 850)] }, abilities: [kingpinBounty(1, 50000)] },
    ],
  },
  // The Kingpin's Bottom path (not in the shop: a Kingpin becomes this when you pick it).
  evoKingpinBottom: {
    name: 'Kingpin',
    branchOf: 'evoKingpin',
    branchAt: 4,
    path: 'Bottom',
    lead: false,
    price: 0,
    cost: 3600,
    limit: 4,
    callPause: 0,
    blurb: "The Kingpin's Bottom path: a third unit queue, tough Bouncers, and at the top Contractors that snipe from very long range.",
    tip: 'Its units do the heavy lifting: place it where they reach the zombies quickly.',
    levels: [
      { name: 'Kingpin', desc: 'Shoots one zombie at a time and calls a Lackey every 37.5s.', damage: 24, cooldown: 1.1, range: 17.5, hidden: false, flying: false, queues: 1,
        goons: { every: 37.5, units: [LACKEY[0]] } },
      { name: 'Hat Trick', desc: 'More range and faster shots.', cost: 1400, damage: 24, cooldown: 0.85, range: 20, hidden: false, flying: false, queues: 1,
        goons: { every: 37.5, units: [LACKEY[0]] } },
      { name: 'Mafia Expansion', desc: 'Fires about six times as fast, but each shot is weaker. A second queue adds a Money Runner.', cost: 4000, damage: 7, cooldown: 0.14, range: 20, hidden: false, flying: false, queues: 2,
        goons: { every: 37.5, units: [LACKEY[0], runner(50, 200)] } },
      { name: 'High Roller', desc: 'Flying detection, +5 damage and units come every 30s.', cost: 6000, damage: 12, cooldown: 0.14, range: 20, hidden: false, queues: 2,
        goons: { every: 30, units: [LACKEY[0], runner(50, 200)] } },
      { name: 'Underworld Backup', path: 'Bottom', desc: 'Bottom path: faster shots, more range and damage, and a third queue that adds the Bouncer: a tough brawler that sees hidden and lead zombies. Stronger Lackeys.', cost: 14000, damage: 17, cooldown: 0.12, range: 22, hidden: false, queues: 3,
        goons: { every: 30, units: [LACKEY[1], runner(50, 200), BOUNCER[0]] } },
      { name: 'B.P. Operations', path: 'Bottom', desc: 'More range and damage. Lackeys and Bouncers get much tougher, and units come every 25s.', cost: 32500, evo: 10, damage: 34, cooldown: 0.12, range: 23, hidden: false, queues: 3,
        goons: { every: 25, units: [LACKEY[2], runner(50, 200), BOUNCER[1]] } },
      { name: 'Golden Syndicate', path: 'Bottom', desc: 'Lead detection, faster shots and more damage. Adds the Contractor: a long-range hitter that sees everything. Every unit gets tougher, and Money Runners drop $450.', cost: 64000, evo: 20, damage: 46, cooldown: 0.1, range: 23, hidden: false, lead: true, queues: 3,
        goons: { every: 25, units: [LACKEY[3], runner(85, 450), BOUNCER[2], CONTRACTOR] } },
    ],
  },
  // Titan (evolved Minigunner, picked as a Commando variant): revs up a giant minigun. Paths split at Lv 5.
  evoTitan: {
    name: 'Titan',
    altOf: 'commando',
    evolved: true,
    evoFrom: 'commandoMinigunner',
    evoLevel: 20,
    form: 'Titan',
    price: 15000,
    shards: 4,
    lead: false,
    flying: false,
    cost: 10000,
    limit: 1,
    branch: 'evoTitanBottom',
    branchAt: 4,
    path: 'Top',
    blurb: 'The evolved Minigunner. Revs up a giant minigun and shreds one zombie at a time. Top path: Fortify Zone protects nearby towers from stuns. Bottom path: melts bosses. Super expensive, and you can only place one.',
    tip: "Use it mid-to-late game: it's too pricey for short games. Farms and the Kingpin's Top path help pay for it.",
    levels: [
      { name: 'Titan', desc: 'A giant minigun that has to rev up for 2s before firing.', damage: 10, cooldown: 0.14, range: 17.5, rev: 2, hidden: false },
      { name: 'Combat Tactics', desc: 'Shoots faster.', cost: 2800, damage: 10, cooldown: 0.12, range: 17.5, rev: 2, hidden: false },
      { name: '32nd Spec-Ops', desc: 'Hidden detection, more damage and range, and a quicker rev-up.', cost: 7000, damage: 15, cooldown: 0.12, range: 20, rev: 1.8, hidden: true },
      { name: 'Re-routed Funds', desc: 'Double damage and more range.', cost: 17200, damage: 30, cooldown: 0.12, range: 22, rev: 1.8, hidden: true },
      { name: 'Fortifier', path: 'Top', desc: 'Top path: much more damage and flying detection, a bit slower but revs up much faster. Fortify Zone: your towers within 13 studs are stunned 35% less long.', cost: 35000, damage: 65, cooldown: 0.15, range: 22, rev: 1.2, hidden: true, flying: true,
        fortify: { radius: 13, reduce: 0.35 } },
      { name: 'Defensive Maneuvers', path: 'Top', desc: 'Much more damage and range, and a stronger, bigger Fortify Zone (40%).', cost: 60000, evo: 3, damage: 120, cooldown: 0.15, range: 26, rev: 1.2, hidden: true, flying: true,
        fortify: { radius: 14, reduce: 0.4 } },
      { name: 'Flak Jacket', path: 'Top', desc: 'More damage, faster shots and a quicker rev-up.', cost: 95000, evo: 9, damage: 150, cooldown: 0.12, range: 26, rev: 1, hidden: true, flying: true,
        fortify: { radius: 14, reduce: 0.4 } },
      { name: 'Hammerhead', path: 'Top', desc: 'Much more damage, and Fortify Zone grows to 16 studs and halves stuns on nearby towers.', cost: 175000, evo: 16, damage: 215, cooldown: 0.12, range: 26, rev: 1, hidden: true, flying: true,
        fortify: { radius: 16, reduce: 0.5 } },
    ],
  },
  // The Titan's Bottom path (not in the shop: a Titan becomes this when you pick it).
  evoTitanBottom: {
    name: 'Titan',
    branchOf: 'evoTitan',
    branchAt: 4,
    path: 'Bottom',
    lead: false,
    flying: false,
    cost: 10000,
    price: 0,
    limit: 1,
    blurb: "The Titan's Bottom path: a multi-barrel minigun with lead detection whose special rounds hit bosses much harder.",
    tip: 'Save it for boss waves: its special rounds do 1.4x (later 1.5x) damage to bosses.',
    levels: [
      { name: 'Titan', desc: 'A giant minigun that has to rev up for 2s before firing.', damage: 10, cooldown: 0.14, range: 17.5, rev: 2, hidden: false },
      { name: 'Combat Tactics', desc: 'Shoots faster.', cost: 2800, damage: 10, cooldown: 0.12, range: 17.5, rev: 2, hidden: false },
      { name: '32nd Spec-Ops', desc: 'Hidden detection, more damage and range, and a quicker rev-up.', cost: 7000, damage: 15, cooldown: 0.12, range: 20, rev: 1.8, hidden: true },
      { name: 'Re-routed Funds', desc: 'Double damage and more range.', cost: 17200, damage: 30, cooldown: 0.12, range: 22, rev: 1.8, hidden: true },
      { name: 'Experimental Weaponry', path: 'Bottom', desc: 'Bottom path: a multi-barrel minigun: faster shots, more damage and lead detection. Its special rounds do 1.4x damage to bosses.', cost: 40000, damage: 40, cooldown: 0.1, range: 22, rev: 1.8, hidden: true, lead: true, bossMult: 1.4 },
      { name: 'Bigger Guns', path: 'Bottom', desc: 'Much more damage and range.', cost: 95000, evo: 6, damage: 85, cooldown: 0.1, range: 26, rev: 1.8, hidden: true, lead: true, bossMult: 1.4 },
      { name: 'Titanium Armor', path: 'Bottom', desc: 'Much more damage.', cost: 130000, evo: 12, damage: 140, cooldown: 0.1, range: 26, rev: 1.8, hidden: true, lead: true, bossMult: 1.4 },
      { name: 'Thresher', path: 'Bottom', desc: 'More damage, faster shots, a quicker rev-up, and bosses take 1.5x damage.', cost: 230000, evo: 20, damage: 165, cooldown: 0.09, range: 26, rev: 1.6, hidden: true, lead: true, bossMult: 1.5 },
    ],
  },
  // ---------------------------------------------------------------- wave 6: Warship and friends
  // Warship: a huge navy ship (water only). Its main guns lob `volley` explosive shells per
  // reload, each at a different zombie, from nearly map-wide range. `missiles` are passive weapons
  // on their own timers (XL Hellfire, Mortars, Tomahawks). Not used by the game yet (kept for later):
  // bigWater (should only fit big lakes; the pools are small), splashTransfer (Battleship).
  warship: {
    name: 'Warship',
    price: 9000,
    cost: 10000,
    limit: 2,
    placement: 'water',
    flying: false,
    lead: true,
    noBuff: true,
    lob: 1.2,
    bigWater: true,
    branch: 'warshipBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "A giant navy ship that fires explosive shells across basically the whole map, growing into bigger ships as you upgrade. The biggest tower in the game. Top path: crowd control with more and more shells, Hellfire Missiles, then the 17-shell Battleship with Mortars. Bottom path: hidden detection and Tomahawks, then the Railgun Warship that hits one zombie extremely hard, turns stealthy and can reveal every hidden zombie on the map. Water only, can't be buffed, can't hit flying zombies.",
    tip: 'Set the Top path to Random-style crowd targeting (First works too) and the Bottom path to Strongest.',
    levels: [
      { name: 'Warship', desc: 'A navy ship that lobs an explosive shell at a zombie almost anywhere on the map. Water only.', damage: 225, cooldown: 4, range: 400, radius: 4, volley: 1, hp: 2000, hidden: false },
      { name: 'Longer Barrel', path: 'Top', desc: 'Top path: more range and damage.', cost: 5000, damage: 275, cooldown: 4, range: 500, radius: 4, volley: 1, hp: 2100, hidden: false },
      { name: 'Bigger Shell', path: 'Top', desc: 'More damage and a bigger blast.', cost: 6800, damage: 325, cooldown: 4, range: 500, radius: 6, volley: 1, hp: 2550, hidden: false },
      { name: 'Cruiser', path: 'Top', desc: 'A second gun: 2 shells per reload at different zombies. More damage, range and lots more health.', cost: 28000, damage: 395, cooldown: 4, range: 525, radius: 6, volley: 2, hp: 14550, hidden: false },
      { name: 'Missile Turret', path: 'Top', desc: 'Adds XL Hellfire Missiles: a 350-damage missile at its target every second. A bit more range.', cost: 52000, damage: 395, cooldown: 4, range: 550, radius: 6, volley: 2, hp: 15550, hidden: false,
        missiles: [XL_HELLFIRE] },
      { name: 'Battleship', path: 'Top', desc: '17 shells per reload, huge damage, range and blasts. Mortars (4 shells of 225 every 5s) replace the Hellfire Missiles. Reloads 15s slower.', cost: 235000, damage: 1595, cooldown: 19, range: 1160, radius: 14, volley: 17, hp: 90550, hidden: false, splashTransfer: true,
        missiles: [MORTARS] },
    ],
  },
  // The Warship's Bottom path (not in the shop: a Warship becomes this when you pick it).
  warshipBottom: {
    name: 'Warship',
    branchOf: 'warship',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 10000,
    limit: 2,
    placement: 'water',
    flying: false,
    lead: true,
    noBuff: true,
    lob: 1.2,
    bigWater: true,
    blurb: "The Warship's Bottom path: faster reloads, then the Frigate Carrier with hidden detection and Tomahawk Missiles, and the Railgun Warship: one enormous shot that hits a single zombie extremely hard. It turns stealthy (enemies can't target it) and its Global Stealth Reveal uncovers every hidden zombie on the map.",
    tip: 'Set it to Strongest so the railgun hits bosses. Use Global Stealth Reveal on hidden waves so all your towers can join in.',
    levels: [
      { name: 'Warship', desc: 'A navy ship that lobs an explosive shell at a zombie almost anywhere on the map. Water only.', damage: 225, cooldown: 4, range: 400, radius: 4, volley: 1, hp: 2000, hidden: false },
      { name: 'Precision Targeting', path: 'Bottom', desc: 'Bottom path: more range and damage.', cost: 1000, damage: 240, cooldown: 4, range: 450, radius: 4, volley: 1, hp: 2100, hidden: false },
      { name: 'Crew Training', path: 'Bottom', desc: 'Reloads 1s faster.', cost: 3200, damage: 240, cooldown: 3, range: 450, radius: 4, volley: 1, hp: 2350, hidden: false },
      { name: 'Frigate Carrier', path: 'Bottom', desc: 'Hidden detection, a second gun, a bigger blast, more damage and Tomahawk Missiles (800 damage every 8s). Lots more health.', cost: 44000, damage: 330, cooldown: 3, range: 450, radius: 5, volley: 2, hp: 12350, hidden: true,
        missiles: [tomahawk(800)] },
      { name: 'Advanced Missiles', path: 'Bottom', desc: 'More damage, and Tomahawks hit for 1,750.', cost: 55000, damage: 430, cooldown: 3, range: 450, radius: 5, volley: 2, hp: 12470, hidden: true,
        missiles: [tomahawk(1750)] },
      { name: 'Railgun Warship', path: 'Bottom', desc: "One railgun shot of 15,455 damage, much more range, and stealth: enemies can't target it (it's revealed now and then, stealthy again 60s later). Unlocks Global Stealth Reveal. Loses a gun, some blast and the Tomahawks; reloads 3s slower.", cost: 285000, damage: 15455, cooldown: 6, range: 850, radius: 3, volley: 1, hp: 57470, hidden: true,
        stealth: true, restealth: 60, abilities: [GLOBAL_REVEAL_AB] },
    ],
  },
  // Shield Tower: never attacks. Every `shield.every` s it gives out a blue shield that soaks up
  // damage before health (see soakShield in sim.js). shared (Top path): one pool of `amount` that a
  // hit on any tower in its `aura` drains (it shields itself too). Per tower (Bottom 3+): every tower
  // in range gets its own `amount` shield (not itself). Shield Towers can't shield each other.
  // Bottom 4-5 towerHeal: repairs towers in range per second; mutualHeal: Shield Towers heal each
  // other. Not used by the game yet (kept for later): ignoresNoBuff (Unstun Field works on maps or
  // enemies that block friendly buffs; none exist yet).
  shieldTower: {
    name: 'Shield Tower',
    price: 3000,
    cost: 4000,
    limit: 3,
    kind: 'support',
    mutualHeal: true,
    branch: 'shieldTowerBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'Never attacks. Gives nearby towers a blue Shield, like extra health that soaks up attacks. The Top path shield is shared, so a hit on one tower drains it for all of them; the Bottom path gives every tower its own shield and later heals them. Only Shield Towers refill Shield, and two Shield Towers can\'t shield each other.',
    tip: 'Two Top path Shield Towers side by side give double shields. The Bottom path is great against bosses that hit lots of towers, and Bottom path Shield Towers heal each other.',
    levels: [
      { name: 'Shield Tower', desc: 'Every 52s it gives towers in range a 5,000 shared shield.', aura: 6, hp: 2500, shield: { amount: 5000, every: 52, shared: true }, hidden: false },
      { name: 'More Range', path: 'Top', desc: 'Top path: much more range.', cost: 1850, aura: 11, hp: 2750, shield: { amount: 5000, every: 52, shared: true }, hidden: false },
      { name: 'Faster Regen', path: 'Top', desc: 'Gives its shield 12s sooner.', cost: 2000, aura: 11, hp: 2850, shield: { amount: 5000, every: 40, shared: true }, hidden: false },
      { name: 'Shield+', path: 'Top', desc: 'The shared shield grows to 11,000.', cost: 13000, aura: 11, hp: 2950, shield: { amount: 11000, every: 40, shared: true }, hidden: false },
      { name: 'System Reboot', path: 'Top', desc: 'The shared shield grows to 19,000, and unlocks Unstun Field to free stunned towers nearby.', cost: 27500, aura: 11, hp: 3350, shield: { amount: 19000, every: 40, shared: true }, hidden: false, ignoresNoBuff: true,
        abilities: [unstunField('I', 35, 11)] },
      { name: 'X-Shield Generator', path: 'Top', desc: 'A 49,000 shared shield, a bit more range and a faster Unstun Field.', cost: 175000, aura: 12, hp: 5850, shield: { amount: 49000, every: 40, shared: true }, hidden: false, ignoresNoBuff: true,
        abilities: [unstunField('II', 25, 12)] },
    ],
  },
  // The Shield Tower's Bottom path (not in the shop: a Shield Tower becomes this when you pick it).
  shieldTowerBottom: {
    name: 'Shield Tower',
    branchOf: 'shieldTower',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 4000,
    limit: 3,
    kind: 'support',
    mutualHeal: true,
    blurb: "The Shield Tower's Bottom path: faster shields, then Nano Shields that give every tower in range its own shield, and Passive Healing that repairs them too. It can't shield itself.",
    tip: 'Bottom path Shield Towers heal each other, so place two side by side.',
    levels: [
      { name: 'Shield Tower', desc: 'Every 52s it gives towers in range a 5,000 shared shield.', aura: 6, hp: 2500, shield: { amount: 5000, every: 52, shared: true }, hidden: false },
      { name: 'Advanced Repairs', path: 'Bottom', desc: 'Bottom path: gives its shield 7s sooner.', cost: 1500, aura: 6, hp: 2600, shield: { amount: 5000, every: 45, shared: true }, hidden: false },
      { name: 'Internal Upgrades', path: 'Bottom', desc: 'A 5,750 shared shield, given 3s sooner, and a bit more range.', cost: 2000, aura: 7, hp: 2850, shield: { amount: 5750, every: 42, shared: true }, hidden: false },
      { name: 'Nano Shields', path: 'Bottom', desc: 'Every tower in range gets its own 650 shield (not this one), given 15s sooner.', cost: 16000, aura: 7, hp: 3100, shield: { amount: 650, every: 27 }, hidden: false },
      { name: 'Passive Healing', path: 'Bottom', desc: 'Heals towers in range for 100 per second. Per-tower shields of 2,550, given 2s sooner, and more range.', cost: 65000, aura: 9, hp: 5100, towerHeal: 100, shield: { amount: 2550, every: 25 }, hidden: false },
      { name: 'X-Nano Shields', path: 'Bottom', desc: 'Per-tower shields of 6,050, heals 300 per second, given 4s sooner, and a bit more range.', cost: 120000, aura: 10, hp: 8100, towerHeal: 300, shield: { amount: 6050, every: 21 }, hidden: false },
    ],
  },
  // Oil Derrick: a money tower. oil: pays `pay` cash every `every` seconds (all game long, not
  // per wave). Bottom path: `income` is paid every wave as well. Medics can't heal it (noHeal).
  // dmgCash (Bottom path Lv 3+, "Cash Back"): its owner gets that share on top of all the cash
  // they earn from damage (GAME.dmgCash; in Versus, from kills). noStack: with several of them
  // only the best one counts. A stunned or knocked out Derrick gives none. winCredits (Bottom
  // Lv 5): its owner gets that many extra credits for a win with one on the field (one bonus,
  // however many they have; not multiplied by the mode's credits).
  oilDerrick: {
    name: 'Oil Derrick',
    price: 1500,
    cost: 575,
    limit: 6,
    kind: 'income',
    noHeal: true,
    branch: 'oilDerrickBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'A money tower like the Farm, but it pays cash every few seconds instead of once per wave. Top path: more cash, faster. Bottom path: also pays every wave, from Cash Back on you earn more cash from damage, and at X-5 it earns bonus credits when you win. Medics can\'t heal it.',
    tip: 'The Top path makes more cash overall; Lv 2-4 are the best value. Long maps make it even better, because waves last longer.',
    levels: [
      { name: 'Oil Derrick', desc: 'Pays $45 every 6s.', oil: { pay: 45, every: 6 }, hp: 800, hidden: false },
      { name: 'Extra Gas Cans', path: 'Top', desc: 'Top path: $65 every 6s.', cost: 400, oil: { pay: 65, every: 6 }, hp: 950, hidden: false },
      { name: 'Oil Barrels', path: 'Top', desc: '$135 every 6s.', cost: 1500, oil: { pay: 135, every: 6 }, hp: 1150, hidden: false },
      { name: 'Oil Drill', path: 'Top', desc: '$295 every 6s.', cost: 6500, oil: { pay: 295, every: 6 }, hp: 1850, hidden: false },
      { name: 'Supply Lines', path: 'Top', desc: '$445 every 5s.', cost: 13000, oil: { pay: 445, every: 5 }, hp: 3650, hidden: false },
      { name: 'USA Grade Oil', path: 'Top', desc: '$605 every 4s.', cost: 40000, oil: { pay: 605, every: 4 }, hp: 7650, hidden: false },
    ],
  },
  // The Oil Derrick's Bottom path (not in the shop: an Oil Derrick becomes this when you pick it).
  oilDerrickBottom: {
    name: 'Oil Derrick',
    branchOf: 'oilDerrick',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 575,
    limit: 6,
    kind: 'income',
    noHeal: true,
    noStack: true,
    blurb: "The Oil Derrick's Bottom path: cash every wave on top of its oil, more cash from damage from Cash Back on (only your best Derrick counts), and at US Military Budget it earns 200 bonus credits when you win.",
    tip: 'Upgrade to Lv 5 at the very end of a game for the bonus credits.',
    levels: [
      { name: 'Oil Derrick', desc: 'Pays $45 every 6s.', oil: { pay: 45, every: 6 }, hp: 800, hidden: false },
      { name: 'US Bonds', path: 'Bottom', desc: 'Bottom path: +$200 every wave.', cost: 1550, oil: { pay: 45, every: 6 }, income: 200, hp: 950, hidden: false },
      { name: 'Extra Funding', path: 'Bottom', desc: '$800 every wave.', cost: 5250, oil: { pay: 45, every: 6 }, income: 800, hp: 1200, hidden: false },
      { name: 'Cash Back', path: 'Bottom', desc: '$1,800 every wave, $175 every 6s, and you earn 3% more cash from damage.', cost: 12000, oil: { pay: 175, every: 6 }, income: 1800, dmgCash: 0.03, hp: 2200, hidden: false },
      { name: 'War Budget', path: 'Bottom', desc: '$4,600 every wave, $250 every 6s, and 8% more cash from damage.', cost: 38100, oil: { pay: 250, every: 6 }, income: 4600, dmgCash: 0.08, hp: 4000, hidden: false },
      { name: 'US Military Budget', path: 'Bottom', desc: '$9,600 every wave, $300 every 6s, 18% more cash from damage, and +200 credits when you win.', cost: 75000, oil: { pay: 300, every: 6 }, income: 9600, dmgCash: 0.18, winCredits: 200, hp: 10000, hidden: false },
    ],
  },
  // Combat Medic: shoots bullet bursts (flyers too) and repairs every tower in its `aura`
  // (towerHeal per second; Combat Medics heal each other, mutualHeal). revive (Top 3-5): when a
  // tower in range is knocked out, it's brought back at full health `delay` s later; then the
  // pack recharges for `cooldown` s (`first`: s until the first one is ready). Medic Drone: see
  // medDroneAb. Not used by the game yet (kept for later): `mechanical` on towers (Revive Pack
  // can't revive Mechanical towers; no tower is marked yet).
  combatMedic: {
    name: 'Combat Medic',
    price: 2500,
    cost: 1000,
    limit: 5,
    mutualHeal: true,
    burstGap: 0.08,
    branch: 'combatMedicBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'A medic that also fights, shooting bullet bursts that can hit flying zombies, while slowly healing all nearby towers. Top path: Revive Packs that bring knocked-out towers back. Bottom path: much more healing and Medic Drones you send anywhere to heal lots of towers.',
    tip: 'Top path near expensive towers like the Refractor; Bottom path near big groups. Two are better than one, because they heal each other.',
    levels: [
      { name: 'Combat Medic', desc: 'Shoots 17-shot bursts and heals nearby towers 25 per second.', damage: 1, burst: 17, cooldown: 2.6, range: 13, aura: 13, towerHeal: 25, hp: 300, hidden: false },
      { name: 'Burst Increase', path: 'Top', desc: 'Top path: 7 more shots per burst.', cost: 550, damage: 1, burst: 24, cooldown: 3.3, range: 13, aura: 13, towerHeal: 25, hp: 350, hidden: false },
      { name: '+P Ammo', path: 'Top', desc: 'Much more damage and a bit more range.', cost: 1800, damage: 4.5, burst: 24, cooldown: 3.3, range: 14, aura: 14, towerHeal: 25, hp: 500, hidden: false },
      { name: 'Revive Pack', path: 'Top', desc: 'Revive Pack: a knocked-out tower nearby is back at full health 5s later (every 20s). Heals 35 per second.', cost: 6500, damage: 6, burst: 24, cooldown: 3.3, range: 14, aura: 14, towerHeal: 35, hp: 800, hidden: false,
        revive: { delay: 5, cooldown: 20, first: 2.5 } },
      { name: 'Revive Charge', path: 'Top', desc: 'Revive Pack recharges in 15s. More damage, heals 45 per second.', cost: 10000, damage: 8, burst: 24, cooldown: 3.3, range: 14, aura: 14, towerHeal: 45, hp: 1300, hidden: false,
        revive: { delay: 5, cooldown: 15, first: 1.5 } },
      { name: 'Combat Medic', path: 'Top', desc: 'Revives take 3.5s and recharge in 10s. A big damage boost, a bit more range, heals 55 per second.', cost: 25000, damage: 20, burst: 24, cooldown: 3.3, range: 15, aura: 15, towerHeal: 55, hp: 2400, hidden: false,
        revive: { delay: 3.5, cooldown: 10 } },
    ],
  },
  // The Combat Medic's Bottom path (not in the shop: a Combat Medic becomes this when you pick it).
  combatMedicBottom: {
    name: 'Combat Medic',
    branchOf: 'combatMedic',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 1000,
    limit: 5,
    mutualHeal: true,
    burstGap: 0.08,
    blurb: "The Combat Medic's Bottom path: much more healing, then Medic Drones that you send anywhere on the map to heal lots of towers, nonstop fire, and hidden detection at Lv 5.",
    tip: 'Send Medic Drones to whichever group of towers a boss is hitting.',
    levels: [
      { name: 'Combat Medic', desc: 'Shoots 17-shot bursts and heals nearby towers 25 per second.', damage: 1, burst: 17, cooldown: 2.6, range: 13, aura: 13, towerHeal: 25, hp: 300, hidden: false },
      { name: 'Medical+', path: 'Bottom', desc: 'Bottom path: heals 60 per second.', cost: 1200, damage: 1, burst: 17, cooldown: 2.6, range: 13, aura: 13, towerHeal: 60, hp: 375, hidden: false },
      { name: 'More Heals', path: 'Bottom', desc: 'Heals 120 per second, more range.', cost: 2000, damage: 1, burst: 17, cooldown: 2.6, range: 15, aura: 15, towerHeal: 120, hp: 475, hidden: false },
      { name: 'Medic Drone', path: 'Bottom', desc: 'Nonstop fire, lots more range, heals 145 per second, and unlocks Medic Drone.', cost: 7250, damage: 3, cooldown: 0.1, range: 22, aura: 22, towerHeal: 145, hp: 925, hidden: false,
        abilities: [medDroneAb('1', 4, 100, 12, 90)] },
      { name: 'Even More Heals', path: 'Bottom', desc: 'More damage, heals 215 per second, and a bigger Medic Drone.', cost: 18500, damage: 7, cooldown: 0.09, range: 23, aura: 23, towerHeal: 215, hp: 1725, hidden: false,
        abilities: [medDroneAb('2', 6, 200, 14, 75)] },
      { name: 'Rapid Support', path: 'Bottom', desc: 'Hidden detection, more damage and range, heals 425 per second, and the biggest Medic Drone.', cost: 36000, damage: 17, cooldown: 0.08, range: 26, aura: 26, towerHeal: 425, hp: 3900, hidden: true,
        abilities: [medDroneAb('3', 9, 300, 16, 60)] },
    ],
  },
  // Scout Helicopter: one per player, a small heli (see Pursuit `heli`) you can Move anywhere or have
  // follow you. reveal: hidden zombies within its range are revealed for every tower. `missiles`:
  // Rocket Pods, and the V-Osprey's Bomb (dropped right under it: a 3-stud reach).
  scoutHeli: {
    name: 'Scout Helicopter',
    price: 2500,
    cost: 2150,
    limit: 1,
    noBuff: true,
    heli: { speed: 9, height: 10 },
    blurb: "A small helicopter whose gunners shoot rifles at zombies, flyers too. Move it anywhere or make it follow you, so it's great for chasing leaks. From Lv 1 it reveals hidden zombies near it for your other towers. Low damage, only 1 allowed, and it can't be buffed.",
    tip: 'Use it as support, not main damage. At Lv 5, park it right above the path so the bomb hits.',
    levels: [
      { name: 'Scout Helicopter', desc: 'A small helicopter with rifle gunners. Move it anywhere, or have it follow you.', damage: 2, cooldown: 0.15, range: 8, patrol: 5, hp: 600, hidden: false,
        abilities: [HELI_MOVE, CRYO_FOLLOW] },
      { name: 'Stealth Sensor', desc: 'Hidden detection, and it reveals hidden zombies near it for every tower.', cost: 2200, damage: 2.5, cooldown: 0.15, range: 8, patrol: 5, hp: 700, hidden: true, reveal: true,
        abilities: [HELI_MOVE, CRYO_FOLLOW] },
      { name: 'Rockets', desc: 'Rocket Pods: a 25-damage splash rocket every 4.5s. More damage.', cost: 2900, damage: 3.5, cooldown: 0.15, range: 8, patrol: 5, hp: 800, hidden: true, reveal: true,
        missiles: [{ name: 'Rocket Pods', damage: 25, count: 1, every: 4.5, radius: 2, range: 8 }], abilities: [HELI_MOVE, CRYO_FOLLOW] },
      { name: 'Bigger Payload', desc: 'Stronger rockets (45 every 3.5s), more damage, faster shooting and flying.', cost: 4750, damage: 5.5, cooldown: 0.13, range: 8, patrol: 5, heliSpeed: 13, hp: 1400, hidden: true, reveal: true,
        missiles: [{ name: 'Rocket Pods', damage: 45, count: 1, every: 3.5, radius: 2, range: 8 }], abilities: [HELI_MOVE, CRYO_FOLLOW] },
      { name: 'Extended Radar', desc: 'Almost triple the range, and rockets of 120 every 2.75s. Lots more health.', cost: 6500, damage: 5.5, cooldown: 0.13, range: 23, patrol: 5, heliSpeed: 13, hp: 4200, hidden: true, reveal: true,
        missiles: [{ name: 'Rocket Pods', damage: 120, count: 1, every: 2.75, radius: 2, range: 23 }], abilities: [HELI_MOVE, CRYO_FOLLOW] },
      { name: 'V-Osprey', desc: 'Drops a 1,000-damage bomb under itself every 5s. Much more damage, range and speed.', cost: 24000, damage: 25.5, cooldown: 0.13, range: 30, patrol: 5, heliSpeed: 20, hp: 8200, hidden: true, reveal: true,
        missiles: [{ name: 'Rocket Pods', damage: 120, count: 1, every: 2.75, radius: 2, range: 30 }, { name: 'Bomb', damage: 1000, count: 1, every: 5, radius: 3, range: 3 }],
        abilities: [HELI_MOVE, CRYO_FOLLOW] },
    ],
  },
  // Jet Trooper: a flying soldier (see Pursuit `heli`) you can Move anywhere. Explodes when it's
  // knocked out (deathBlast). Its 10-bullet bursts are a steady stream with the same damage per
  // second. Not used by the game yet (kept for later): flyingTower (ground-only enemy attacks
  // shouldn't reach it; no enemy attacks towers by height yet).
  jetTrooper: {
    name: 'Jet Trooper',
    price: 1500,
    cost: 1175,
    limit: 6,
    noHeal: true,
    flyingTower: true,
    heli: { speed: 8, height: 8 },
    branch: 'jetTrooperBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "A flying soldier with a jetpack and an assault rifle. Cheap early to mid game defense that you can fly to wherever zombies leak, and it explodes when it's knocked out. Top path: hidden detection and fast, strong shots. Bottom path: stun immunity, explosive bullets and Fire Rounds. Low health, and Medics can't heal it.",
    tip: 'The Top path is great early. Put a Bottom path one where zombies bunch up to spread its splash and fire.',
    levels: [
      { name: 'Jet Trooper', desc: 'A flying soldier with a rifle. Move it anywhere on the map.', damage: 3.5, cooldown: 0.35, range: 11, patrol: 5, hp: 400, hidden: false,
        deathBlast: { damage: 100, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
      { name: 'Faster Reload', path: 'Top', desc: 'Top path: shoots faster.', cost: 225, damage: 3.5, cooldown: 0.31, range: 11, patrol: 5, hp: 420, hidden: false,
        deathBlast: { damage: 100, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
      { name: 'Better Thrusters', path: 'Top', desc: 'Flies much faster.', cost: 700, damage: 3.5, cooldown: 0.31, range: 11, patrol: 5, heliSpeed: 14, hp: 445, hidden: false,
        deathBlast: { damage: 150, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
      { name: 'Advanced Sensors', path: 'Top', desc: 'Hidden detection, more damage and range, shoots faster.', cost: 2000, damage: 7.5, cooldown: 0.285, range: 13, patrol: 5, heliSpeed: 14, hp: 695, hidden: true,
        deathBlast: { damage: 250, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
      { name: '+P Ammo', path: 'Top', desc: 'Roughly double damage, shoots faster.', cost: 5250, damage: 15.5, cooldown: 0.265, range: 13, patrol: 5, heliSpeed: 14, hp: 1045, hidden: true,
        deathBlast: { damage: 400, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
      { name: 'Air Defender', path: 'Top', desc: 'A big damage boost, more range, much faster shots and flying.', cost: 7800, damage: 27.5, cooldown: 0.19, range: 17.5, patrol: 5, heliSpeed: 34, hp: 1745, hidden: true,
        deathBlast: { damage: 700, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
    ],
  },
  // The Jet Trooper's Bottom path (not in the shop: a Jet Trooper becomes this when you pick it).
  jetTrooperBottom: {
    name: 'Jet Trooper',
    branchOf: 'jetTrooper',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 1175,
    limit: 6,
    noHeal: true,
    flyingTower: true,
    heli: { speed: 8, height: 8 },
    blurb: "The Jet Trooper's Bottom path: more range, stun immunity, then explosive bullets and Fire Rounds that set zombies on fire. It never sees hidden zombies.",
    tip: 'Turn Fire Rounds on when a big crowd arrives.',
    levels: [
      { name: 'Jet Trooper', desc: 'A flying soldier with a rifle. Move it anywhere on the map.', damage: 3.5, cooldown: 0.35, range: 11, patrol: 5, hp: 400, hidden: false,
        deathBlast: { damage: 100, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
      { name: 'Extended Sensors', path: 'Bottom', desc: 'Bottom path: more range.', cost: 250, damage: 3.5, cooldown: 0.35, range: 14.5, patrol: 5, hp: 420, hidden: false,
        deathBlast: { damage: 100, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
      { name: 'Heavy Ammo', path: 'Bottom', desc: "More damage, and it can't be stunned.", cost: 1000, damage: 6.5, cooldown: 0.355, range: 14.5, patrol: 5, hp: 520, hidden: false, stunImmune: true,
        deathBlast: { damage: 150, radius: 6, stun: 0 }, abilities: [HELI_MOVE] },
      { name: 'Explosive Ammo', path: 'Bottom', desc: 'Explosive bullets with a small splash, much faster shooting, and Fire Rounds. Lots more health.', cost: 4850, damage: 8.5, radius: 0.5, cooldown: 0.17, range: 14.5, patrol: 5, hp: 1520, hidden: false, stunImmune: true,
        deathBlast: { damage: 300, radius: 6, stun: 0 }, abilities: [HELI_MOVE, fireRoundsAb('1', 7, 12, 20)] },
      { name: 'Incendiary+ Ammo', path: 'Bottom', desc: 'More damage, flies a bit faster, and stronger Fire Rounds.', cost: 15000, damage: 19.5, radius: 0.5, cooldown: 0.17, range: 14.5, patrol: 5, heliSpeed: 9, hp: 1870, hidden: false, stunImmune: true,
        deathBlast: { damage: 500, radius: 6, stun: 0 }, abilities: [HELI_MOVE, fireRoundsAb('2', 9, 25, 22)] },
      { name: 'X-Jet Suit', path: 'Bottom', desc: 'A big damage boost, a bigger splash, faster shots and the strongest Fire Rounds.', cost: 31750, damage: 37.5, radius: 1, cooldown: 0.153, range: 14.5, patrol: 5, heliSpeed: 9, hp: 3070, hidden: false, stunImmune: true,
        deathBlast: { damage: 800, radius: 6, stun: 0 }, abilities: [HELI_MOVE, fireRoundsAb('3', 12, 75, 24)] },
    ],
  },
  // Combat Drone: a flying gun drone (see Pursuit `heli`) you can Move or have follow you.
  // Direct Control (fps): you fly it with WASD and aim and shoot it like the Gatling Gun's FPS
  // Mode, for fps.mult damage. Explodes when knocked out. laser: laser damage (see damageKind).
  // Not used by the game yet (kept for later): headshots (Direct Control headshots should do much
  // more and ignore resistance), paveStun (Bottom 5 Direct Control missiles should stun even bosses).
  combatDrone: {
    name: 'Combat Drone',
    price: 5000,
    cost: 3000,
    limit: 3,
    noBuff: true,
    heli: { speed: 12, height: 9 },
    fps: { mult: 1.5, pierce: 1 },
    branch: 'combatDroneBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "A flying gun drone. Its special trick is Direct Control: fly it yourself for 1.5x damage. It can follow you around and explodes when it's knocked out. Top path: a gatling gun, Shield, rockets, bombs and Pursuit. Bottom path: hidden detection, then the Reaper Drone that circles the map firing explosive missiles, stealth, and Spotter to weaken a zombie.",
    tip: 'Top path for single targets, Bottom path for bosses and crowds. While you control it you can still see the battle, but you can\'t place or upgrade towers.',
    levels: [
      { name: 'Combat Drone', desc: 'A flying gun drone. Move it, have it follow you, or take Direct Control.', damage: 2, cooldown: 0.17, range: 8, patrol: 5, hp: 800, hidden: false,
        deathBlast: { damage: 150, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB] },
      { name: 'AR Platform', path: 'Top', desc: 'Top path: more damage, shoots a bit faster.', cost: 1800, damage: 4, cooldown: 0.15, range: 8, patrol: 5, hp: 900, hidden: false,
        deathBlast: { damage: 150, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB] },
      { name: 'Heavy Ammo', path: 'Top', desc: 'Much more damage.', cost: 6500, damage: 14, cooldown: 0.15, range: 8, patrol: 5, hp: 1000, hidden: false,
        deathBlast: { damage: 300, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB] },
      { name: 'Gatling Gun', path: 'Top', desc: 'A gatling gun: more damage, range and faster shots. Unlocks Shield: immune to all attacks for 10s.', cost: 21000, damage: 26, cooldown: 0.1, range: 13, patrol: 5, hp: 1600, hidden: false,
        deathBlast: { damage: 600, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB, barrierAb('I', 10)] },
      { name: 'Rocket Pods', path: 'Top', desc: 'Fires a 165-damage rocket every 4s on its own. More damage, a longer Shield, lots more health.', cost: 75000, damage: 46, cooldown: 0.1, range: 13, patrol: 5, hp: 4400, hidden: false,
        missiles: [{ name: 'Rockets', damage: 165, count: 1, every: 4, radius: 2 }],
        deathBlast: { damage: 1200, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB, barrierAb('II', 12)] },
      { name: 'X22 Combat Drone', path: 'Top', desc: 'Laser bullets with much more damage, rockets of 500 every second, a 4,000-damage bomb every 18s, and Pursuit to chase the zombie closest to the base.', cost: 205000, damage: 111, cooldown: 0.1, range: 13, patrol: 5, hp: 8400, hidden: false, laser: true,
        missiles: [{ name: 'Rockets', damage: 500, count: 1, every: 1, radius: 2 }, { name: 'Bombs', damage: 4000, count: 1, every: 18, radius: 3, range: 3 }],
        deathBlast: { damage: 2500, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB, barrierAb('III', 14), HELI_CHASE] },
    ],
  },
  // The Combat Drone's Bottom path (not in the shop: a Combat Drone becomes this when you pick it).
  combatDroneBottom: {
    name: 'Combat Drone',
    branchOf: 'combatDrone',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 3000,
    limit: 3,
    noBuff: true,
    heli: { speed: 12, height: 9 },
    fps: { mult: 1.5, pierce: 1 },
    blurb: "The Combat Drone's Bottom path: hidden detection, stun immunity, then the Reaper Drone that fires explosive missiles at zombies anywhere on the map and is stealthy, plus Spotter to make a zombie take more damage and slow down.",
    tip: 'Use Spotter on bosses right before your big hitters fire.',
    levels: [
      { name: 'Combat Drone', desc: 'A flying gun drone. Move it, have it follow you, or take Direct Control.', damage: 2, cooldown: 0.17, range: 8, patrol: 5, hp: 800, hidden: false,
        deathBlast: { damage: 150, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB] },
      { name: 'Upgraded Sensors', path: 'Bottom', desc: 'Bottom path: hidden detection and double range.', cost: 575, damage: 2, cooldown: 0.17, range: 16, patrol: 5, hp: 900, hidden: true,
        deathBlast: { damage: 150, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB] },
      { name: 'Additional Ammo', path: 'Bottom', desc: "Can't be stunned, a bit more damage and speed.", cost: 900, damage: 3, cooldown: 0.17, range: 16, patrol: 5, heliSpeed: 13, hp: 1000, hidden: true, stunImmune: true,
        deathBlast: { damage: 200, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB] },
      { name: 'Reaper Drone', path: 'Bottom', desc: "Fires explosive missiles (142 damage, 2.5 blast) at zombies anywhere on the map, and stealth: enemies can't target it. Hits lead zombies. Slower shots.", cost: 14000, damage: 142, radius: 2.5, cooldown: 1.37, range: 316, patrol: 5, heliSpeed: 13, hp: 2000, hidden: true, lead: true, stunImmune: true, stealth: true,
        deathBlast: { damage: 500, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB] },
      { name: 'Enemy Highlight', path: 'Bottom', desc: 'Much more damage and a bigger blast. Unlocks Spotter: the toughest zombie takes 10% more damage and is 20% slower for 10s.', cost: 82000, damage: 592, radius: 3.5, cooldown: 1.37, range: 316, patrol: 5, heliSpeed: 13, hp: 2250, hidden: true, lead: true, stunImmune: true, stealth: true,
        deathBlast: { damage: 1000, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB, spotterAb('I', 0.1, 0.2, 0.05, 0.05)] },
      { name: 'P.A.V.E Missiles', path: 'Bottom', desc: 'Faster shots, more damage, a bigger blast and a stronger Spotter.', cost: 130000, damage: 612, radius: 4.5, cooldown: 0.87, range: 316, patrol: 5, heliSpeed: 13, hp: 3250, hidden: true, lead: true, stunImmune: true, stealth: true, paveStun: true,
        deathBlast: { damage: 1500, radius: 6, stun: 0 }, abilities: [HELI_MOVE, CRYO_FOLLOW, DRONE_FPS_AB, spotterAb('II', 0.2, 0.5, 0.1, 0.1)] },
    ],
  },
  // Refractor (alternate Phaser form, two paths): a fast golden laser. Top path: the beam chains to
  // `chains - 1` more zombies within `jump` of each other, each doing `chainMult` of the damage.
  // Bottom path: a ramping beam (see Phaser: damage → maxDamage over `ramp` s on one zombie).
  // noDmgBuff: support towers can't boost its damage (range, firerate and discounts still work).
  // Not used by the game yet (kept for later): throughWalls (Top 3+), rampCd (Bottom: ramp cooldown),
  // stackCost (each Calamity Beam costs $8,000 more than the last), damageType 'golden'.
  refractor: {
    name: 'Refractor',
    lead: true,
    altOf: 'phaser',
    form: 'Refractor',
    shards: 4,
    price: 0,
    cost: 20000,
    limit: 4,
    noDmgBuff: true,
    damageType: 'golden',
    branch: 'refractorBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Phaser: a super strong late-game tower that fires a fast golden laser beam. Huge damage, range and health. Top path: the beam chains to more and more zombies. Bottom path: the beam gets far stronger the longer it stays on one zombie. Very expensive, bosses love to target it, and support towers can't boost its damage.",
    tip: 'Protect it with a Medic, Shield Tower or Top path Combat Medic. On the Bottom path, get several Lv 3-4 Refractors before a Lv 5.',
    levels: [
      { name: 'Refractor', desc: 'A fast golden laser beam that hits lead zombies.', damage: 40, cooldown: 0.2, range: 24, hp: 1800, hidden: false },
      { name: 'Cell Refusion', path: 'Top', desc: 'Top path: more damage and range.', cost: 8750, damage: 49, cooldown: 0.2, range: 29, hp: 2050, hidden: false },
      { name: 'Fusion Core', path: 'Top', desc: 'More damage and range, fires faster.', cost: 17500, damage: 61, cooldown: 0.15, range: 31, hp: 2500, hidden: false },
      { name: 'Beam Spreader', path: 'Top', desc: 'The beam chains to 1 more zombie for half damage. Hidden detection, more damage and range.', cost: 43500, damage: 76, cooldown: 0.15, range: 34, hp: 5250, hidden: true,
        chains: 2, jump: 8, chainMult: 0.5, throughWalls: true },
      { name: 'Chain Reaction', path: 'Top', desc: "Chains to 3 zombies for 60% damage, much more damage, and it can't be stunned.", cost: 110000, damage: 136, cooldown: 0.15, range: 34, hp: 9250, hidden: true, stunImmune: true,
        chains: 4, jump: 8, chainMult: 0.6, throughWalls: true },
      { name: 'Atom Diffuser', path: 'Top', desc: 'Chains to 7 zombies for full damage. Huge damage and more range.', cost: 225000, damage: 273, cooldown: 0.15, range: 47, hp: 21250, hidden: true, stunImmune: true,
        chains: 8, jump: 8, chainMult: 1, throughWalls: true },
    ],
  },
  // The Refractor's Bottom path (not in the shop: a Refractor becomes this when you pick it).
  refractorBottom: {
    name: 'Refractor',
    lead: true,
    branchOf: 'refractor',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 20000,
    limit: 4,
    noDmgBuff: true,
    damageType: 'golden',
    retarget: 0,
    blurb: "The Refractor's Bottom path: more damage, then the Destructor Beam that ramps up to 1.8x damage on one zombie (later 3.5x), stun immunity and hidden detection.",
    tip: 'Set it to Strongest so the ramp builds up on bosses.',
    levels: [
      { name: 'Refractor', desc: 'A fast golden laser beam that hits lead zombies.', damage: 40, maxDamage: 40, ramp: 1, cooldown: 0.2, range: 24, hp: 1800, hidden: false },
      { name: 'Damage Increase', path: 'Bottom', desc: 'Bottom path: more damage.', cost: 7000, damage: 50, maxDamage: 50, ramp: 1, cooldown: 0.2, range: 24, hp: 1950, hidden: false },
      { name: 'Damage Multiplier', path: 'Bottom', desc: 'More damage.', cost: 19000, damage: 67, maxDamage: 67, ramp: 1, cooldown: 0.2, range: 24, hp: 2250, hidden: false },
      { name: 'Destructor Beam', path: 'Bottom', desc: "The beam ramps up to 1.8x damage over 15s on one zombie. More damage and range, and it can't be stunned.", cost: 55000, damage: 117, maxDamage: 211, ramp: 15, cooldown: 0.2, range: 32, hp: 5500, hidden: false, stunImmune: true, rampCd: 8.5 },
      { name: 'Core Fusion', path: 'Bottom', desc: 'Hidden detection, ramps up to 2.4x over 17s, much more damage and range.', cost: 225000, damage: 242, maxDamage: 581, ramp: 17, cooldown: 0.2, range: 42, hp: 12250, hidden: true, stunImmune: true, rampCd: 8 },
      { name: 'Calamity Beam', path: 'Bottom', desc: 'Ramps up to 3.5x over 19s, with huge damage and more range.', cost: 1000000, damage: 692, maxDamage: 2422, ramp: 19, cooldown: 0.2, range: 50, hp: 27250, hidden: true, stunImmune: true, rampCd: 22, stackCost: 8000 },
    ],
  },
  // Noob Tuber (alternate Paintballer form): a grenade launcher with instant (hitscan) explosive
  // blasts, then bigger and bigger bursts. cooldown here = burst time + reload. Not used by the game
  // yet (kept for later): stackCost (each X-Turret costs $500 more than the last, even after selling).
  noobTuber: {
    name: 'Noob Tuber',
    lead: true,
    altOf: 'paintballer',
    form: 'Noob Tuber',
    shards: 1,
    price: 0,
    cost: 900,
    limit: 8,
    blurb: "An alternate Paintballer: an early-to-mid game grenade launcher with explosive splash. Its shots are instant, so it never misses, even fast zombies. From Lv 2 it fires bursts that get much bigger later. Small splash and low health.",
    tip: 'Great against hordes. Spread several along the path so their bursts cover more zombies.',
    levels: [
      { name: 'Noob Tuber', desc: 'A grenade launcher whose shots explode instantly on the zombie.', damage: 16, cooldown: 3.5, range: 16, radius: 2, hp: 300, hidden: false },
      { name: 'Faster Reload', desc: 'Reloads 1s faster.', cost: 250, damage: 16, cooldown: 2.5, range: 16, radius: 2, hp: 320, hidden: false },
      { name: 'MGL', desc: 'Fires 6-grenade bursts and more range, but reloads slower.', cost: 1000, damage: 16, burst: 6, burstGap: 0.5, cooldown: 8.5, range: 19, radius: 2, hp: 340, hidden: false },
      { name: 'IR Sensor', desc: 'Hidden detection, more damage and range, reloads faster.', cost: 2000, damage: 24, burst: 6, burstGap: 0.5, cooldown: 7.5, range: 23, radius: 2, hp: 390, hidden: true },
      { name: 'Turret', desc: 'Becomes a turret firing 40-grenade bursts, closer together, but it reloads slower.', cost: 6900, damage: 24, burst: 40, burstGap: 0.2, cooldown: 15.5, range: 23, radius: 2, hp: 465, hidden: true },
      { name: 'X-Turret', desc: '80-grenade bursts, more damage, shots closer together and a faster reload.', cost: 28000, damage: 40, burst: 80, burstGap: 0.15, cooldown: 18, range: 23, radius: 2, hp: 1175, hidden: true, stackCost: 500 },
    ],
  },
  // Stinger (alternate Marksman form): homing anti-air rockets that slow zombies (slime) and do
  // `airMult` times damage to flyers. It can't fire rockets inside its deadzone (`minRange`), so it
  // shoots its handgun ({ damage, cooldown }) at a zombie in there instead.
  stinger: {
    name: 'Stinger',
    lead: true,
    altOf: 'marksman',
    form: 'Stinger',
    shards: 1,
    price: 0,
    cost: 650,
    limit: 8,
    homing: true,
    lob: 0.6,
    minRange: 5,
    blurb: "An alternate Marksman: an early-to-mid game anti-air rocket launcher. Its rockets slow zombies and do 6x damage to flying ones. Zombies too close for rockets get its handgun instead. Only so-so against ground zombies, and no hidden detection until Lv 5.",
    tip: 'Lv 4-5 Stingers spread their slow around crowds. Great for flying waves.',
    levels: [
      { name: 'Stinger', desc: 'A homing rocket that slows zombies and does 6x damage to flyers. A handgun for close zombies.', damage: 20, radius: 0.5, cooldown: 4.5, range: 23, airMult: 6, slime: { slow: 0.25, time: 2 }, handgun: { damage: 1.5, cooldown: 0.35 }, hp: 115, hidden: false },
      { name: 'Advanced Training', desc: 'More damage and range, and a stronger handgun.', cost: 300, damage: 26, radius: 0.5, cooldown: 4.5, range: 27, airMult: 6, slime: { slow: 0.25, time: 2 }, handgun: { damage: 2.5, cooldown: 0.35 }, hp: 140, hidden: false },
      { name: 'Radar Sensor', desc: 'Much more range, reloads faster, stronger handgun.', cost: 600, damage: 26, radius: 0.5, cooldown: 4, range: 42, airMult: 6, slime: { slow: 0.25, time: 2 }, handgun: { damage: 4, cooldown: 0.35 }, hp: 180, hidden: false },
      { name: 'Stinger+', desc: 'Much more damage, a bigger blast, more range and a stronger handgun.', cost: 1600, damage: 48, radius: 1.5, cooldown: 4, range: 44, airMult: 6, slime: { slow: 0.25, time: 2 }, handgun: { damage: 8.75, cooldown: 0.35 }, hp: 330, hidden: false },
      { name: 'Quad Burst', desc: 'An M202 Flash: 4 rockets per burst, but it reloads 1s slower. Much stronger handgun.', cost: 6500, damage: 48, radius: 1.5, burst: 4, burstGap: 0.25, cooldown: 5, range: 44, airMult: 6, slime: { slow: 0.25, time: 2 }, handgun: { damage: 28, cooldown: 0.35 }, hp: 730, hidden: false },
      { name: 'X-Stinger', desc: 'Back to 1 huge rocket with massive damage, a bigger blast, much more range and hidden detection. A bigger deadzone, and the strongest handgun.', cost: 14700, damage: 325, radius: 2.5, cooldown: 4, range: 64, minRange: 7, airMult: 6, slime: { slow: 0.25, time: 2 }, handgun: { damage: 48, cooldown: 0.3 }, hp: 1930, hidden: true },
    ],
  },
  // ---------------------------------------------------------------- golden perks, wave 6
  // Golden towers with two paths: the golden base has `branch`, and its Bottom path is a normal
  // branch type (`branchOf` the golden base). Golden damage hits lead zombies (`lead: true`).
  // damageType 'golden': golden damage (golden resistance applies). ignoreGoldResist: gets through it.
  goldJuggernaut: {
    name: 'Golden Juggernaut',
    goldOf: 'commandoJuggernaut',
    lead: true,
    damageType: 'golden',
    price: 12000,
    cost: 7250,
    limit: 8,
    branch: 'goldJuggernautBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "The golden Juggernaut: a minigun that does golden damage (hits lead zombies), with more range and early stun immunity on the Top path. At Lv 5 either path unlocks Reboot Systems, which breaks stuns, repairs it and boosts its damage. Great against bosses, bad at crowds, and very expensive.",
    tip: 'Pair it with a Medic or Shield Tower to keep it alive.',
    levels: [
      { name: 'Golden Juggernaut', desc: 'A golden minigun that sprays bullets super fast.', damage: 12, cooldown: 0.1, range: 16, hp: 1000, hidden: false },
      { name: 'Power Gloves', path: 'Top', desc: "Top path: can't be stunned, shoots a bit faster, a bit more range.", cost: 900, damage: 12, cooldown: 0.09, range: 17, hp: 1100, stunImmune: true, hidden: false },
      { name: 'Joint Suppressors', path: 'Top', desc: 'Shoots a bit faster.', cost: 1750, damage: 12, cooldown: 0.08, range: 17, hp: 1225, stunImmune: true, hidden: false },
      { name: 'Longer Barrel', path: 'Top', desc: 'Hidden detection, more damage and range.', cost: 12000, damage: 16, cooldown: 0.08, range: 22, hp: 1475, stunImmune: true, hidden: true },
      { name: 'Power Minigun', path: 'Top', desc: 'Much more damage and range, but shoots a bit slower.', cost: 20000, damage: 24, cooldown: 0.09, range: 26, hp: 2225, stunImmune: true, hidden: true },
      { name: 'Juggernaut', path: 'Top', desc: 'Bullets pierce 1 more zombie and ignore golden resistance, huge damage and range, and Reboot Systems.', cost: 84000, damage: 43, cooldown: 0.09, range: 37, pass: 1, hp: 6475, stunImmune: true, hidden: true, ignoreGoldResist: true,
        abilities: [REBOOT_AB] },
    ],
  },
  // The Golden Juggernaut's Bottom path. aim: it aims 0.9s at each new target before shooting.
  goldJuggernautBottom: {
    name: 'Golden Juggernaut',
    branchOf: 'goldJuggernaut',
    branchAt: 1,
    path: 'Bottom',
    lead: true,
    damageType: 'golden',
    price: 0,
    cost: 7250,
    limit: 8,
    aim: 0.9,
    blurb: "The Golden Juggernaut's Bottom path: more damage, dual guns with hidden detection, then Full Power with huge damage and Reboot Systems. It aims for a moment at each new target.",
    tip: 'Put it where zombies stay in range for a long time, so it doesn\'t keep re-aiming.',
    levels: [
      { name: 'Golden Juggernaut', desc: 'A golden minigun that sprays bullets super fast.', damage: 12, cooldown: 0.1, range: 16, hp: 1000, hidden: false },
      { name: 'Better Handling', path: 'Bottom', desc: 'Bottom path: more range.', cost: 600, damage: 12, cooldown: 0.1, range: 19, hp: 1100, hidden: false },
      { name: 'AP Ammo', path: 'Bottom', desc: 'More damage.', cost: 3650, damage: 15, cooldown: 0.1, range: 19, hp: 1300, hidden: false },
      { name: 'Dual Guns', path: 'Bottom', desc: 'Hidden detection and more damage.', cost: 15000, damage: 21, cooldown: 0.1, range: 19, hp: 2150, hidden: true },
      { name: 'Cybernetic Pulse', path: 'Bottom', desc: 'A big damage boost.', cost: 28000, damage: 35, cooldown: 0.1, range: 19, hp: 3400, hidden: true },
      { name: 'Full Power', path: 'Bottom', desc: 'Massive damage, more range, and Reboot Systems.', cost: 267000, damage: 185, cooldown: 0.1, range: 31, hp: 11400, hidden: true,
        abilities: [REBOOT_AB] },
    ],
  },
  // Golden Mobster: golden bursts, golden Enforcers / Reapers (goons, on one shared timer), and on
  // Top 3+ cash every full reload (`cash`: `pay` after every `every` shots = one burst).
  goldMobster: {
    name: 'Golden Mobster',
    goldOf: 'mobster',
    lead: true,
    flying: false,
    damageType: 'golden',
    price: 9000,
    cost: 1350,
    limit: 4,
    callPause: 1,
    burstGap: 0.5,
    branch: 'goldMobsterBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'The golden Mobster: fires bursts of golden damage (hits lead zombies), calls in golden troops, and on some upgrades earns cash every full reload. Top path: lots of Enforcers and cash. Bottom path: cheap hidden detection, flyer targeting, Place Bounty, cash back and Reapers. A bit of everything, but specialized towers do each job better.',
    tip: 'Use the Bottom path in long games, where bounties and cash back add up.',
    levels: [
      { name: 'Golden Mobster', desc: 'A golden gangster firing 3-shot bursts.', damage: 9, burst: 3, cooldown: 2.5, range: 15, hp: 300, hidden: false },
      { name: 'Additional Ammo', path: 'Top', desc: 'Top path: much more damage.', cost: 850, damage: 17, burst: 3, cooldown: 2.5, range: 15, hp: 400, hidden: false },
      { name: 'Golden Troop', path: 'Top', desc: 'Calls an Enforcer every 55s. More damage, reloads faster.', cost: 2000, damage: 20, burst: 3, cooldown: 2.3, range: 15, hp: 600, hidden: false,
        goons: { every: 55, units: [G_ENFORCER] } },
      { name: 'Golden Squad', path: 'Top', desc: 'Earns $100 every full reload, 8-shot bursts, 3 Enforcers every 48s. More damage and range.', cost: 11500, damage: 29, burst: 8, burstGap: 0.13, cooldown: 2.08, range: 17, hp: 1150, hidden: false,
        cash: { every: 8, pay: 100, spin: 0 }, goons: { every: 48, units: [G_ENFORCER, G_ENFORCER, G_ENFORCER] } },
      { name: 'Golden Army', path: 'Top', desc: '$258 every reload, adds 2 Enforcer 2s, and unlocks Overload (+123% damage for 40s). More damage.', cost: 30000, damage: 47, burst: 8, burstGap: 0.2, cooldown: 2.08, range: 18, hp: 2150, hidden: false,
        cash: { every: 8, pay: 258, spin: 0 }, goons: { every: 48, units: [G_ENFORCER, G_ENFORCER, G_ENFORCER, G_ENFORCER_2, G_ENFORCER_2] }, abilities: [OVERLOAD_AB] },
      { name: 'Golden Mafia', path: 'Top', desc: '$585 every reload, 14-shot bursts, and 4 Enforcer 3s replace the Enforcers (every 40s). Much more damage and range.', cost: 125000, damage: 79, burst: 14, burstGap: 0.13, cooldown: 2.25, range: 22, hp: 4025, hidden: false,
        cash: { every: 14, pay: 585, spin: 0 }, goons: { every: 40, units: [G_ENFORCER_2, G_ENFORCER_2, G_ENFORCER_3, G_ENFORCER_3, G_ENFORCER_3, G_ENFORCER_3] }, abilities: [OVERLOAD_AB] },
    ],
  },
  // The Golden Mobster's Bottom path.
  goldMobsterBottom: {
    name: 'Golden Mobster',
    branchOf: 'goldMobster',
    branchAt: 1,
    path: 'Bottom',
    lead: true,
    flying: false,
    damageType: 'golden',
    price: 0,
    cost: 1350,
    limit: 4,
    callPause: 1,
    burstGap: 0.5,
    blurb: "The Golden Mobster's Bottom path: cheap hidden detection, then flyer targeting, Place Bounty, cash back when towers near it are knocked out, Enforcers and Reapers.",
    tip: 'Place Bounty on bosses, and keep it next to your priciest towers for the cash back.',
    levels: [
      { name: 'Golden Mobster', desc: 'A golden gangster firing 3-shot bursts.', damage: 9, burst: 3, cooldown: 2.5, range: 15, hp: 300, hidden: false },
      { name: 'Upgraded Visor', path: 'Bottom', desc: 'Bottom path: hidden detection and more range.', cost: 275, damage: 9, burst: 3, cooldown: 2.5, range: 20, hp: 325, hidden: true },
      { name: 'Regenerative Reload', path: 'Bottom', desc: 'Reloads faster.', cost: 333, damage: 9, burst: 3, cooldown: 2, range: 20, hp: 400, hidden: true },
      { name: 'Bounty Seeker', path: 'Bottom', desc: 'Hits flying zombies, Place Bounty (20% up to $8,000), 20% cash back when nearby towers are knocked out, and an Enforcer every 30s. Much more damage, reloads a bit slower.', cost: 17000, damage: 66, burst: 3, cooldown: 2.6, range: 24, hp: 1400, flying: true, hidden: true, cashback: 0.2,
        goons: { every: 30, units: [G_ENFORCER] }, abilities: [gBounty(0.2, 8000, 8)] },
      { name: 'Golden Sniper', path: 'Bottom', desc: 'Calls a Reaper sniper with each Enforcer (every 55s), bounties pay 30% (up to $10,000) and cash back rises to 25%. More damage and range.', cost: 36000, damage: 116, burst: 3, cooldown: 2.6, range: 27, hp: 2900, flying: true, hidden: true, cashback: 0.25,
        goons: { every: 55, units: [G_ENFORCER, G_REAPER] }, abilities: [gBounty(0.3, 10000, 15)] },
      { name: 'Gold Economy', path: 'Bottom', desc: 'Reaper 2s replace Reapers, bounties pay 45% (up to $110,000), cash back 35%. A huge damage boost.', cost: 140000, damage: 416, burst: 3, burstGap: 0.66, cooldown: 2.6, range: 30, hp: 6700, flying: true, hidden: true, cashback: 0.35,
        goons: { every: 55, units: [G_ENFORCER, G_REAPER_2] }, abilities: [gBounty(0.45, 110000, 25)] },
    ],
  },
  // Golden Ranger: golden bursts (hit lead zombies). Not used by the game yet (kept for later):
  // m203 `slow` (G M203 fire pools should slow 30% for 4s; patches only burn for now).
  goldRanger: {
    name: 'Golden Ranger',
    goldOf: 'soldierRanger',
    lead: true,
    flying: false,
    damageType: 'golden',
    price: 5000,
    cost: 850,
    limit: 10,
    burstGap: 0.1,
    branch: 'goldRangerBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "The golden Ranger: fires bursts of golden damage, so it hurts lead zombies. Cheap hidden detection on both paths. Top path: bigger bursts, then nonstop golden LMG fire. Bottom path: flyer targeting, then a grenade that stuns even bosses and fire grenades that burn the path. Poor value late game.",
    tip: 'Switch to a Golden Juggernaut for late-game damage.',
    levels: [
      { name: 'Golden Ranger', desc: 'Fires its golden rifle in 2-shot bursts.', damage: 6, burst: 2, cooldown: 1.25, range: 11, hp: 300, hidden: false },
      { name: 'Extended Range', path: 'Top', desc: 'Top path: 1 more bullet per burst and more range.', cost: 450, damage: 6, burst: 3, cooldown: 1.25, range: 14, hp: 350, hidden: false },
      { name: 'Advanced Training', path: 'Top', desc: 'More damage, 1 more bullet per burst, reloads faster, more range.', cost: 950, damage: 7.5, burst: 4, cooldown: 1.15, range: 17.5, hp: 450, hidden: false },
      { name: 'More Equipment', path: 'Top', desc: 'Hidden detection, reloads much faster, more range and damage, 1 more bullet per burst.', cost: 3250, damage: 10.5, burst: 5, cooldown: 0.75, range: 22.5, hp: 800, hidden: true },
      { name: 'Heavy Caliber', path: 'Top', desc: 'Switches to nonstop fire, with more damage and range.', cost: 10500, damage: 17, cooldown: 0.12, range: 24.5, hp: 1350, hidden: true },
      { name: 'X LMG', path: 'Top', desc: 'A huge damage boost and more range.', cost: 40000, damage: 49.5, cooldown: 0.1, range: 27.5, hp: 3000, hidden: true },
    ],
  },
  // The Golden Ranger's Bottom path.
  goldRangerBottom: {
    name: 'Golden Ranger',
    branchOf: 'goldRanger',
    branchAt: 1,
    path: 'Bottom',
    lead: true,
    flying: false,
    damageType: 'golden',
    price: 0,
    cost: 850,
    limit: 10,
    burstGap: 0.1,
    blurb: "The Golden Ranger's Bottom path: hidden detection, flyer targeting, then Energy Assault with a grenade that stuns even bosses and a G M203 that leaves fire on the path.",
    tip: 'Save the grenade for bosses: its stun works on them.',
    levels: [
      { name: 'Golden Ranger', desc: 'Fires its golden rifle in 2-shot bursts.', damage: 6, burst: 2, cooldown: 1.25, range: 11, hp: 300, hidden: false },
      { name: 'AP Ammo', path: 'Bottom', desc: 'Bottom path: more damage.', cost: 350, damage: 9, burst: 2, cooldown: 1.25, range: 11, hp: 350, hidden: false },
      { name: 'Internal Upgrades', path: 'Bottom', desc: 'Hidden detection, reloads faster, more range.', cost: 900, damage: 9, burst: 2, cooldown: 1, range: 13.5, hp: 425, hidden: true },
      { name: 'Assault Loadout', path: 'Bottom', desc: 'Hits flying zombies, more damage, reloads faster, 1 more bullet per burst and more range.', cost: 5250, damage: 15, burst: 3, cooldown: 0.75, range: 16.5, hp: 725, flying: true, hidden: true },
      { name: 'Upgraded Cells', path: 'Bottom', desc: 'A big damage boost, 3 more bullets per burst, a bit more range.', cost: 10000, damage: 28, burst: 6, cooldown: 0.75, range: 17.5, hp: 1700, flying: true, hidden: true },
      { name: 'Energy Assault', path: 'Bottom', desc: 'More damage, 1 more bullet per burst, the Golden Ranger Grenade, and a G M203 that fires a fire grenade every 10s.', cost: 32000, damage: 52, burst: 7, cooldown: 0.75, range: 17.5, hp: 4550, flying: true, hidden: true,
        m203: { name: 'G M203 Incendiary', every: 10, damage: 0, radius: 3, patch: { time: 5, burn: 20, burnTime: 5 }, slow: { amount: 0.3, time: 4 } },
        abilities: [G_RANGER_NADE] },
    ],
  },
  // Golden Mine Layer: golden mines that see hidden zombies from Lv 0. mine.stun (Bottom 5): mines
  // stun for that long. noVoidStun: its mines and Charged Throw can't stun Void bosses.
  // Not used by the game yet (kept for later): splashTransfer (Top 5).
  goldMineLayer: {
    name: 'Golden Mine Layer',
    goldOf: 'mineLayer',
    lead: true,
    flying: false,
    damageType: 'golden',
    price: 6000,
    cost: 600,
    limit: 7,
    traps: true,
    mines: true,
    noVoidStun: true,
    branch: 'goldMineLayerBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "The golden Mine Layer: drops exploding golden mines on the path that hit hidden zombies from the start. Lots of stacked mines stop leaks and hurt bosses. Top path: faster mines and a Crossbow that shoots big mines anywhere on the path. Bottom path: long-lasting burning mines that ignore explosive resistance, then stunning mines and Charged Throw.",
    tip: 'The Bottom path is usually better. Place it near the middle of the path; Lv 5 Bottom Charged Throw is a strong boss stunner.',
    levels: [
      { name: 'Golden Mine Layer', desc: 'Throws a golden mine onto the path that blows up when a zombie walks over it. Sees hidden zombies.', cooldown: 15.5, range: 5, hp: 100, hidden: true,
        order: ['mine'], mine: { damage: 40, radius: 3.5, life: 35 } },
      { name: 'Faster Arming', path: 'Top', desc: 'Top path: mines last longer, throws faster.', cost: 500, cooldown: 13, range: 5, hp: 150, hidden: true,
        order: ['mine'], mine: { damage: 40, radius: 3.5, life: 42.5 } },
      { name: 'Advanced Training', path: 'Top', desc: 'More damage, throws much faster.', cost: 1750, cooldown: 9.5, range: 5, hp: 250, hidden: true,
        order: ['mine'], mine: { damage: 65, radius: 3.5, life: 42.5 } },
      { name: 'Crossbow', path: 'Top', desc: 'Unlocks Crossbow: shoot a 450-damage mine onto the path far away. More damage, bigger blasts, faster throwing.', cost: 5000, cooldown: 8.5, range: 5, hp: 825, hidden: true,
        order: ['mine'], mine: { damage: 135, radius: 5, life: 42.5 }, abilities: [crossbowAb('I', 450, 3.5, 30, 14)] },
      { name: 'Faster Reload', path: 'Top', desc: 'Throws faster, more damage, and a stronger Crossbow.', cost: 8500, cooldown: 6.5, range: 5, hp: 1675, hidden: true,
        order: ['mine'], mine: { damage: 220, radius: 5, life: 42.5 }, abilities: [crossbowAb('II', 950, 3.5, 38, 16)] },
      { name: 'S-Crossbow', path: 'Top', desc: 'Much more damage, bigger blasts, more range, faster throwing and the strongest Crossbow.', cost: 13250, cooldown: 5.5, range: 8, hp: 3475, hidden: true, splashTransfer: true,
        order: ['mine'], mine: { damage: 380, radius: 7, life: 42.5 }, abilities: [crossbowAb('III', 2000, 5.5, 60, 16)] },
    ],
  },
  // The Golden Mine Layer's Bottom path.
  goldMineLayerBottom: {
    name: 'Golden Mine Layer',
    branchOf: 'goldMineLayer',
    branchAt: 1,
    path: 'Bottom',
    lead: true,
    flying: false,
    damageType: 'golden',
    price: 0,
    cost: 600,
    limit: 7,
    traps: true,
    mines: true,
    noVoidStun: true,
    blurb: "The Golden Mine Layer's Bottom path: mines that last much longer, then fire mines that burn and ignore explosive resistance, and S-Mines that stun, plus Charged Throw at the toughest zombie on the map.",
    tip: 'Charged Throw stuns even bosses: save it for them.',
    levels: [
      { name: 'Golden Mine Layer', desc: 'Throws a golden mine onto the path that blows up when a zombie walks over it. Sees hidden zombies.', cooldown: 15.5, range: 5, hp: 100, hidden: true,
        order: ['mine'], mine: { damage: 40, radius: 3.5, life: 35 } },
      { name: 'Life Span', path: 'Bottom', desc: 'Bottom path: mines last 25s longer.', cost: 225, cooldown: 15.5, range: 5, hp: 150, hidden: true,
        order: ['mine'], mine: { damage: 40, radius: 3.5, life: 60 } },
      { name: 'HE Mine', path: 'Bottom', desc: 'Double damage and bigger blasts.', cost: 1800, cooldown: 15.5, range: 5, hp: 275, hidden: true,
        order: ['mine'], mine: { damage: 80, radius: 4.5, life: 60 } },
      { name: 'X Fire Mine', path: 'Bottom', desc: 'Mines burn zombies (10/s for 10s) and ignore explosive resistance. Much more damage and longer-lasting mines.', cost: 8500, cooldown: 15.5, range: 5, hp: 800, hidden: true, ignoreExplosiveResist: true,
        order: ['mine'], mine: { damage: 245, radius: 4.5, life: 105, burn: 10, burnTime: 10 } },
      { name: 'Napalm', path: 'Bottom', desc: 'Hotter, longer burns (20/s for 14s), double damage and longer-lasting mines.', cost: 18000, cooldown: 15.5, range: 5, hp: 1850, hidden: true, ignoreExplosiveResist: true,
        order: ['mine'], mine: { damage: 540, radius: 4.5, life: 135, burn: 20, burnTime: 14 } },
      { name: 'S-Mine', path: 'Bottom', desc: 'Mines stun for 1s, burn 100/s for 10s, huge damage, bigger blasts, and Charged Throw.', cost: 102000, cooldown: 15.5, range: 5, hp: 3850, hidden: true, ignoreExplosiveResist: true,
        order: ['mine'], mine: { damage: 1370, radius: 6, life: 157.5, burn: 100, burnTime: 10, stun: 1 }, abilities: [CHARGED_THROW_AB] },
    ],
  },
  // Golden Warship: the golden version of the Warship (an event tower). See Warship. Not used by the
  // game yet (kept for later): arc (Bottom 3-4 railgun can only turn 270 degrees), splashTransfer.
  goldWarship: {
    name: 'Golden Warship',
    goldOf: 'warship',
    lead: true,
    flying: false,
    damageType: 'golden',
    price: 40000,
    cost: 375000,
    limit: 2,
    placement: 'water',
    noBuff: true,
    lob: 1.2,
    bigWater: true,
    branch: 'goldWarshipBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An event tower: a super strong golden battleship for big water areas. It fires heavy golden splash shells from huge range and adds AA guns, missiles, gatlings and mortars as you upgrade. It costs a fortune, so it's a late-game tower. Top path: Warship-X with 25 shells per reload. Bottom path: a railgun, then the BFG-X.",
    tip: "Only use it in high-cash games, with Oil Derricks to pay. Don't stop at Lv 3 or 4.",
    levels: [
      { name: 'Golden Warship', desc: 'Lobs 3 heavy golden shells per reload at zombies almost anywhere on the map. Water only.', damage: 4000, cooldown: 3, range: 800, radius: 5, volley: 3, hp: 60000, hidden: false },
      { name: 'Triple Barrel', path: 'Top', desc: 'Top path: 6 shells per reload, more damage and range.', cost: 100000, damage: 4050, cooldown: 3, range: 900, radius: 5, volley: 6, hp: 62000, hidden: false },
      { name: 'AA Guns', path: 'Top', desc: 'AA Guns: exploding 600-damage rounds at flying zombies 5 times a second.', cost: 180000, damage: 4050, cooldown: 3, range: 900, radius: 5, volley: 6, hp: 62450, hidden: false,
        missiles: [aaGuns(1500)] },
      { name: 'Missile Turret', path: 'Top', desc: 'Golden Hellfire Missiles: 1,600 damage about every second. More damage, range and lots more health.', cost: 700000, damage: 4120, cooldown: 3, range: 925, radius: 5, volley: 6, hp: 74450, hidden: false,
        missiles: [aaGuns(1500), gHellfire(4000)] },
      { name: 'Gattling Gun', path: 'Top', desc: 'A Gatling Turret that hits ground and flying zombies (3,000 damage per second), stronger AA Guns and Hellfire Missiles.', cost: 450000, damage: 4120, cooldown: 3, range: 950, radius: 5, volley: 6, hp: 75450, hidden: false,
        missiles: [aaGuns(2000), gHellfire(4875), GATLING_TURRET] },
      { name: 'Warship-X', path: 'Top', desc: '25 enormous shells per reload, Golden Mortars (5 x 1,000 every 2s) and a battery of gatlings, but it loses the AA Guns and missiles and reloads 15s slower.', cost: 3500000, damage: 20120, cooldown: 18, range: 1200, radius: 13, volley: 25, hp: 825450, hidden: false, splashTransfer: true,
        missiles: [GATLING_BATTERY, G_MORTARS] },
    ],
  },
  // The Golden Warship's Bottom path.
  goldWarshipBottom: {
    name: 'Golden Warship',
    branchOf: 'goldWarship',
    branchAt: 1,
    path: 'Bottom',
    lead: true,
    flying: false,
    damageType: 'golden',
    price: 0,
    cost: 375000,
    limit: 2,
    placement: 'water',
    noBuff: true,
    lob: 1.2,
    bigWater: true,
    blurb: "The Golden Warship's Bottom path: more range and shells, AA Guns, then a Railgun Turret with one massive shot, and the BFG-X that hits for over 94,000.",
    tip: 'Set it to Strongest for bosses.',
    levels: [
      { name: 'Golden Warship', desc: 'Lobs 3 heavy golden shells per reload at zombies almost anywhere on the map. Water only.', damage: 4000, cooldown: 3, range: 800, radius: 5, volley: 3, hp: 60000, hidden: false },
      { name: 'Calamity Power', path: 'Bottom', desc: 'Bottom path: 6 shells per reload and much more range.', cost: 57000, damage: 4005, cooldown: 3, range: 1300, radius: 5, volley: 6, hp: 61000, hidden: false },
      { name: 'Cool Stuff', path: 'Bottom', desc: 'AA Guns, more damage, reloads faster.', cost: 90000, damage: 4075, cooldown: 2.25, range: 1300, radius: 5, volley: 6, hp: 61250, hidden: false,
        missiles: [aaGuns(1500)] },
      { name: 'Railgun Turret', path: 'Bottom', desc: 'A railgun: one 1,450-damage shot with a smaller blast. Reloads slower, and it loses the AA Guns.', cost: 440000, damage: 12075, cooldown: 5.25, range: 1300, radius: 3, volley: 1, hp: 71250, hidden: false, arc: 270 },
      { name: 'Bigger Railgun', path: 'Bottom', desc: 'Much more damage.', cost: 550000, damage: 27075, cooldown: 5.25, range: 1300, radius: 3, volley: 1, hp: 71370, hidden: false, arc: 270 },
      { name: 'BFG-X', path: 'Bottom', desc: 'A 94,200-damage shot that ignores golden resistance, a bigger blast and more range.', cost: 7600000, damage: 785075, cooldown: 5.25, range: 1700, radius: 7.5, volley: 1, hp: 521370, hidden: false, ignoreGoldResist: true, splashTransfer: true },
    ],
  },
  // Void Traitor (event): a melee sword that hits `targets` zombies per swing and sets them all on
  // fire (fireAspect every 0 = every swing). Lv 5: Void Rift, Summon Troops and Void Slam. Not used
  // by the game yet (kept for later): swordSplash (sword splash radius).
  voidTraitor: {
    name: 'Inferno Traitor',
    altOf: 'traitor',
    form: 'Inferno',
    shards: 3,
    price: 0,
    flying: false,
    lead: true,
    cost: 3000,
    limit: 4,
    melee: true,
    kindLabel: 'Multi',
    blurb: 'A melee tower that swings a sword at several zombies at once and sets them on fire. At Lv 5 it opens a black hole that rains rocks, slams its sword for huge damage, and summons void troops onto the path. Slow swings, short range, low health and a high price.',
    tip: 'Use Void Rift on crowds so your main towers can focus the boss, and Summon Troops to stop leaks. Bring a Medic or Shield Tower.',
    levels: [
      { name: 'Void Traitor', desc: 'Swings a sword at up to 4 zombies and burns them (6/s for 3s).', damage: 75, cooldown: 1.5, range: 7, targets: 4, fireAspect: { every: 0, dps: 12, time: 3 }, hp: 1400, hidden: false, swordSplash: 1 },
      { name: 'Sharper Blade', desc: 'More damage and hotter burns.', cost: 1050, damage: 100, cooldown: 1.5, range: 7, targets: 4, fireAspect: { every: 0, dps: 25, time: 3 }, hp: 1470, hidden: false, swordSplash: 1 },
      { name: 'Void Blade', desc: 'Hits 6 zombies, more damage, burns of 25/s.', cost: 3000, damage: 145, cooldown: 1.5, range: 7, targets: 6, fireAspect: { every: 0, dps: 50, time: 3 }, hp: 1770, hidden: false, swordSplash: 1 },
      { name: 'All Seeing Eye', desc: 'Hidden detection, much more damage, burns of 58/s, a bit more range.', cost: 4000, damage: 345, cooldown: 1.5, range: 8, targets: 6, fireAspect: { every: 0, dps: 115, time: 3 }, hp: 2370, hidden: true, swordSplash: 1 },
      { name: 'Void Armor', desc: 'More damage, burns of 100/s, lots more health.', cost: 13000, damage: 570, cooldown: 1.5, range: 8, targets: 6, fireAspect: { every: 0, dps: 200, time: 3 }, hp: 4370, hidden: true, swordSplash: 2 },
      { name: 'Void Traitor', desc: 'Hits 14 zombies for huge damage with 750/s burns, but swings slower. Unlocks Void Rift, Summon Troops and Void Slam.', cost: 350000, damage: 5250, cooldown: 2.75, range: 8, targets: 14, fireAspect: { every: 0, dps: 1500, time: 3 }, hp: 20000, hidden: true, swordSplash: 3,
        abilities: [VOID_RIFT_AB, SUMMON_TROOPS_AB, VOID_SLAM_AB] },
    ],
  },
  // ---------------------------------------------------------------- wave 7: tons of towers
  // Shared pieces (units, abilities, cyc) are defined above TOWERS. Burst towers use
  // cyc(burst, gap, burstCooldown) for `cooldown`.
  //
  // Rockety (alternate Paintballer form): homing missiles that explode. Never gets hidden detection.
  rockety: {
    name: 'Rockety',
    lead: true,
    altOf: 'paintballer',
    form: 'Rockety',
    shards: 1,
    price: 0,
    cost: 575,
    limit: 8,
    homing: true,
    lob: 0.6,
    kindLabel: 'Splash',
    blurb: 'An alternate Paintballer: a retro rocket launcher whose missiles explode in an area, with long range. The strongest crowd control a beginner can get. Never sees hidden zombies, and weak against single tough zombies. At Lv 4 it unlocks Vintage Fuze, an overhead bomb that burns everything nearby but hurts the Rockety too.',
    tip: 'Pair it with a single-target tower for an easy early and mid game.',
    levels: [
      { name: 'Rockety', desc: 'Missiles that explode, hurting every zombie in the blast.', damage: 6, cooldown: 3.25, range: 13, radius: 2, hidden: false },
      { name: 'Bigger Rockets', desc: 'Damage 6 → 8, fires faster, bigger blast.', cost: 450, damage: 8, cooldown: 2.75, range: 13, radius: 2.75, hidden: false },
      { name: 'Payload', desc: 'Damage 8 → 17 and more range.', cost: 850, damage: 17, cooldown: 2.75, range: 14, radius: 2.75, hidden: false },
      { name: 'Twin Tubes', desc: 'Damage 17 → 30, fires faster, more range and a bigger blast.', cost: 1900, damage: 30, cooldown: 2.5, range: 14.5, radius: 3.35, hidden: false },
      { name: 'Vintage Fuze', desc: 'Damage 30 → 44, fires faster, more range. Unlocks Vintage Fuze.', cost: 3600, damage: 44, cooldown: 2.25, range: 16.5, radius: 3.35, hidden: false, abilities: [VINTAGE_FUZE_AB] },
    ],
  },
  // Samurai (alternate Gladiator form): sword bursts that cut up to `targets` zombies. When nothing
  // is in reach it throws a shuriken (3x its base damage) at a zombie a bit farther out.
  samurai: {
    name: 'Samurai',
    altOf: 'gladiator',
    form: 'Samurai',
    shards: 1,
    price: 0,
    flying: false,
    lead: 3,
    cost: 600,
    limit: 10,
    melee: true,
    kindLabel: 'Multi',
    blurb: 'An alternate Gladiator: a melee fighter that slashes in rapid bursts, cutting several zombies at once. The shortest range in the game, so he throws a shuriken at zombies just out of reach. Shreds groups of weaker zombies early on, but gets few hits on bosses.',
    tip: 'Always place him on a corner of the path so more of it passes through his reach.',
    levels: [
      { name: 'Samurai', desc: 'Bursts of 2 slashes, each hitting up to 3 zombies. Shuriken for zombies just out of reach.', damage: 8, burst: 2, burstGap: 0.3, cooldown: cyc(2, 0.3, 1.7), range: 4.5, targets: 3, shuriken: { damage: 24, range: 10, cooldown: 1.5 }, hidden: false },
      { name: 'Swift Blade', desc: 'Bursts of 3 slashes.', cost: 300, damage: 8, burst: 3, burstGap: 0.3, cooldown: cyc(3, 0.3, 1.7), range: 4.5, targets: 3, shuriken: { damage: 24, range: 10, cooldown: 1.5 }, hidden: false },
      { name: 'Sharpened Steel', desc: 'Damage 8 → 12, faster slashes and shorter pauses.', cost: 1450, damage: 12, burst: 3, burstGap: 0.25, cooldown: cyc(3, 0.25, 1.5), range: 4.5, targets: 3, shuriken: { damage: 36, range: 10, cooldown: 1.5 }, hidden: false },
      { name: 'Way of the Blade', desc: 'Damage 12 → 15, bursts of 4, shorter pauses, and hidden detection.', cost: 2850, damage: 15, burst: 4, burstGap: 0.25, cooldown: cyc(4, 0.25, 1.2), range: 4.5, targets: 3, shuriken: { damage: 45, range: 10, cooldown: 1.5 }, hidden: true },
      { name: 'Twin Katanas', desc: 'Damage 15 → 20, more reach and bursts of 5.', cost: 5800, damage: 20, burst: 5, burstGap: 0.25, cooldown: cyc(5, 0.25, 1.2), range: 5, targets: 3, shuriken: { damage: 60, range: 11, cooldown: 1.5 }, hidden: true },
    ],
  },
  // Plantation (alternate Farm form): more cash per wave than the Farm, with 6 levels.
  plantation: {
    name: 'Plantation',
    altOf: 'farm',
    form: 'Plantation',
    shards: 1,
    price: 0,
    cost: 300,
    limit: 8,
    kind: 'income',
    blurb: 'An alternate Farm. Never attacks, but pays extra cash at the start of every wave for your attacking towers. Each upgrade pays for itself in about 3 to 5 waves. Too many early can cause leaks.',
    tip: 'Place all your Plantations first, then upgrade them together one level at a time.',
    levels: [
      { name: 'Plantation', desc: 'Earns $100 every wave.', income: 100, hidden: false },
      { name: 'Seedlings', desc: '$150 every wave.', cost: 150, income: 150, hidden: false },
      { name: 'Crop Rows', desc: '$350 every wave.', cost: 700, income: 350, hidden: false },
      { name: 'Barn', desc: '$600 every wave.', cost: 1050, income: 600, hidden: false },
      { name: 'Estate', desc: '$1,250 every wave.', cost: 2750, income: 1250, hidden: false },
      { name: 'Golden Fields', desc: '$2,000 every wave.', cost: 4500, income: 2000, hidden: false },
    ],
  },
  // Hired Gun (alternate Operator form): long bursts of weak bullets. Lv 5 airdrops a tank.
  hiredGun: {
    name: 'Hired Gun',
    altOf: 'operator',
    form: 'Hired Gun',
    shards: 1,
    price: 0,
    cost: 600,
    limit: 8,
    blurb: 'An alternate Operator: a mercenary who sprays long bursts of low-damage bullets. Gets hidden detection early (Lv 2). At max level he calls in a Tank Airdrop anywhere on the path, on a short cooldown. His middle levels are poor value.',
    tip: 'Use him as backup damage and save up to jump straight to max level for the tank.',
    levels: [
      { name: 'Hired Gun', desc: 'Bursts of 25 bullets.', damage: 2, burst: 25, burstGap: 0.4, cooldown: cyc(25, 0.4, 3.25), range: 9, hidden: false },
      { name: 'Better Rifle', desc: 'Damage 3.6 → 5.4, shoots faster.', cost: 450, damage: 3, burst: 25, burstGap: 0.35, cooldown: cyc(25, 0.35, 3.2), range: 9, hidden: false },
      { name: 'Night Vision', desc: 'Damage 5.4 → 8.1, faster, more range, bursts of 30 and hidden detection.', cost: 950, damage: 4.5, burst: 30, burstGap: 0.275, cooldown: cyc(30, 0.275, 3.25), range: 11.5, hidden: true },
      { name: 'Drum Mag', desc: 'Damage 8.1 → 12, faster, bursts of 40.', cost: 2150, damage: 6.5, burst: 40, burstGap: 0.25, cooldown: cyc(40, 0.25, 3), range: 11.5, hidden: true },
      { name: 'Heavy Armor', desc: 'Damage 12 → 16, faster, much more range.', cost: 6200, damage: 9, burst: 40, burstGap: 0.2, cooldown: cyc(40, 0.2, 2.75), range: 14, hidden: true },
      { name: 'Radio Support', desc: 'Damage 16 → 22, more range. Unlocks Tank Airdrop.', cost: 12000, damage: 12, burst: 40, burstGap: 0.2, cooldown: cyc(40, 0.2, 2.75), range: 15, hidden: true, abilities: [TANK_DROP_AB] },
    ],
  },
  // Focus (alternate Phaser form): very fast shots; after `ammo` shots it overheats for `reload` s.
  // Shots at zombies inside its inner range (`coolRange`) don't add heat.
  focus: {
    name: 'Focus',
    lead: true,
    altOf: 'phaser',
    form: 'Focus',
    shards: 1,
    price: 0,
    cost: 2000,
    limit: 8,
    blurb: 'An alternate Phaser: an extremely fast stream of small shots at one zombie. After a set number of shots it overheats and has to cool down, but zombies inside its green inner range don\'t add heat. Cheap to max out. Can\'t be stunned at max level.',
    tip: 'Place it so zombies walk through its inner range: then it fires without overheating.',
    levels: [
      { name: 'Focus', desc: 'Rapid shots. Overheats after 40 shots for 5s.', damage: 2.5, cooldown: 0.125, range: 10, coolRange: 5, ammo: 40, reload: 5, hidden: false },
      { name: 'Cooling Fins', desc: 'Damage 3.5 → 4.2, faster, more range, 65 shots before overheating, 4s cooldown.', cost: 1850, damage: 3, cooldown: 0.1, range: 12, coolRange: 5.5, ammo: 65, reload: 4, hidden: false },
      { name: 'Scanner', desc: 'Damage 4.2 → 7, faster, and hidden detection.', cost: 2900, damage: 5, cooldown: 0.08, range: 12, coolRange: 5.5, ammo: 65, reload: 4, hidden: true },
      { name: 'Twin Barrels', desc: 'Damage 7 → 9.8, more range, bigger inner range, 90 shots.', cost: 7500, damage: 7, cooldown: 0.08, range: 14.5, coolRange: 7, ammo: 90, reload: 4, hidden: true },
      { name: 'Heat Sink', desc: 'Damage 9.8 → 12, faster, 115 shots.', cost: 10500, damage: 8.5, cooldown: 0.075, range: 14.5, coolRange: 7, ammo: 115, reload: 4, hidden: true },
      { name: 'White Hot', desc: 'Damage 12 → 15, much faster, more range, 150 shots, and it can\'t be stunned.', cost: 21000, damage: 11, cooldown: 0.055, range: 17, coolRange: 7, ammo: 150, reload: 4, hidden: true, stunImmune: true },
    ],
  },
  // Ducky Nest (alternate Barracks form): waves of armed ducks.
  duckyNest: {
    name: 'Ducky Nest',
    altOf: 'barracks',
    form: 'Ducky Nest',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 65,
    blurb: 'An alternate Barracks that sends out armed ducks: Scouts, then Soldiers, Railgunners, Trojan Ducks (4 Ducky Gladiators burst out when one goes down) and Engineers that build sentries along the path. No duck ever sees hidden zombies, and ducks die easily.',
    tip: 'A great cheap pick for beginners. Pair it with a hidden-detection tower.',
    levels: [
      { name: 'Ducky Nest', desc: 'A Ducky Scout every 65s.', hidden: false, unit: DUCK.scout },
      { name: 'More Scouts', desc: '2 Scouts every 50s.', cost: 650, hidden: false, spawnEvery: 50, unit: { ...DUCK.scout, count: 2 } },
      { name: 'Ducky Soldiers', desc: 'Adds a Ducky Soldier every 60s: a rapid shooter.', cost: 1650, hidden: false, spawnEvery: 50, unit: { ...DUCK.scout, count: 2 }, unit2: DUCK.soldier, spawnEvery2: 60 },
      { name: 'Railgunners', desc: '2 Soldiers, plus a Ducky Railgunner every 90s (450-damage shots).', cost: 4350, hidden: false, spawnEvery: 50, unit: { ...DUCK.scout, count: 2 },
        unit2: { ...DUCK.soldier, count: 2 }, spawnEvery2: 60, unit3: DUCK.rail, spawnEvery3: 90 },
      { name: 'Trojan Duck', desc: '3 Soldiers, plus a Trojan Duck every 40s that lets out 4 Ducky Gladiators when it goes down.', cost: 8350, hidden: false, spawnEvery: 50, unit: { ...DUCK.scout, count: 2 },
        unit2: { ...DUCK.soldier, count: 3 }, spawnEvery2: 60, unit3: DUCK.rail, spawnEvery3: 90, unit4: DUCK.trojan, spawnEvery4: 40 },
      { name: 'Ducky Engineers', desc: '2 Railgunners, plus a Ducky Engineer every 45s that builds sentries 75%, 50% and 25% of the way down the path.', cost: 17500, hidden: false, spawnEvery: 50, unit: { ...DUCK.scout, count: 2 },
        unit2: { ...DUCK.soldier, count: 3 }, spawnEvery2: 60, unit3: { ...DUCK.rail, count: 2 }, spawnEvery3: 90, unit4: DUCK.trojan, spawnEvery4: 40, unit5: DUCK.eng, spawnEvery5: 45 },
    ],
  },
  // Outlaw: a revolver with random critical hits (critChance, critMult). It reloads after 6 shots.
  // Ghost Madness (Lv 2+): `ghosts` ghost hands, each a revolver shot that bounces to 2 more zombies.
  outlaw: {
    name: 'Outlaw',
    price: 2750,
    cost: 650,
    limit: 8,
    blurb: 'A gunslinger whose revolver hits hard for its price, with good range and a chance to land critical hits. At Lv 2 she unlocks Ghost Madness: ghostly hands that tear through crowds. Strong early and still useful late, but her health is very low.',
    tip: 'Keep her away from boss attacks.',
    levels: [
      { name: 'Outlaw', desc: 'A revolver (6 shots, then a reload). 25% of shots crit for 1.25x.', damage: 8, cooldown: 0.35, ammo: 6, reload: 6.9, range: 10, critChance: 0.25, critMult: 1.25, hp: 80, hidden: false },
      { name: 'Quick Draw', desc: 'Damage 8 → 12, faster, more range, crits 1.3x.', cost: 350, damage: 12, cooldown: 0.315, ammo: 6, reload: 7.1, range: 12, critChance: 0.25, critMult: 1.3, hp: 90, hidden: false },
      { name: 'Ghost Madness', desc: 'Damage 12 → 18, more range, 30% crits. Unlocks Ghost Madness (1 ghost hand).', cost: 1250, damage: 18, cooldown: 0.3, ammo: 6, reload: 5.7, range: 14, critChance: 0.3, critMult: 1.3, ghosts: 1, hp: 100, hidden: false, abilities: [GHOST_MADNESS_AB] },
      { name: 'Fan the Hammer', desc: 'Damage 18 → 20, fires 2-shot bursts, crits 1.4x, 2 ghost hands, and hidden detection.', cost: 3150, damage: 20, burst: 2, burstGap: 0.1, cooldown: 0.35, ammo: 6, reload: 3.6, range: 14, critChance: 0.3, critMult: 1.4, ghosts: 2, hp: 120, hidden: true, abilities: [GHOST_MADNESS_AB] },
      { name: 'Dead Eye', desc: 'Damage 20 → 25, faster, more range, 35% crits for 1.6x.', cost: 6000, damage: 25, burst: 2, burstGap: 0.1, cooldown: 0.3, ammo: 6, reload: 3, range: 16, critChance: 0.35, critMult: 1.6, ghosts: 2, hp: 140, hidden: true, abilities: [GHOST_MADNESS_AB] },
      { name: 'Legend of the West', desc: 'Damage 25 → 35, more range, 50% crits for 1.8x, 4 ghost hands.', cost: 7825, damage: 35, burst: 2, burstGap: 0.1, cooldown: 0.3, ammo: 6, reload: 3, range: 17, critChance: 0.5, critMult: 1.8, ghosts: 4, hp: 160, hidden: true, abilities: [GHOST_MADNESS_AB] },
    ],
  },
  // Liberator (alternate Mercenary form): two rifles, 60-round bursts, then a reload.
  liberator: {
    name: 'Liberator',
    altOf: 'merc',
    form: 'Liberator',
    shards: 1,
    price: 0,
    cost: 1800,
    limit: 6,
    blurb: 'An alternate Mercenary who dual-wields assault rifles in 60-round bursts, then reloads. At max level his Oil Barrel ability calls bombs down on a spot. Great extra damage next to a main damage dealer. Never sees hidden zombies.',
    tip: 'Drop the barrel a little ahead of your target: the bombs land a few seconds later.',
    levels: [
      { name: 'Liberator', desc: '60-round bursts from two rifles, then a 4s reload.', damage: 4, burst: 60, burstGap: 0.135, cooldown: cyc(60, 0.135, 4), range: 8, hidden: false },
      { name: 'Freedom Rounds', desc: 'Damage 4 → 6.5, faster, quicker reload.', cost: 2100, damage: 6.5, burst: 60, burstGap: 0.115, cooldown: cyc(60, 0.115, 3.75), range: 8, hidden: false },
      { name: 'Stars and Stripes', desc: 'Damage 6.5 → 9.5, faster, more range.', cost: 3400, damage: 9.5, burst: 60, burstGap: 0.1, cooldown: cyc(60, 0.1, 3.75), range: 9, hidden: false },
      { name: 'Independence', desc: 'Damage 9.5 → 14, more range, quicker reload.', cost: 7200, damage: 14, burst: 60, burstGap: 0.1, cooldown: cyc(60, 0.1, 3.25), range: 11, hidden: false },
      { name: 'Oil Barrel', desc: 'Faster, more range, quicker reload. Unlocks Oil Barrel.', cost: 9900, damage: 14, burst: 60, burstGap: 0.075, cooldown: cyc(60, 0.075, 2.75), range: 12, hidden: false, abilities: [OIL_BARREL_AB] },
    ],
  },
  // Ruptor (alternate Railgunner form): bursts; from Lv 1 the last shot of each burst explodes
  // (`boom`). Ground or cliff: +50% range on a cliff.
  ruptor: {
    name: 'Ruptor',
    lead: 1,
    altOf: 'railgunner',
    form: 'Ruptor',
    shards: 1,
    price: 0,
    cost: 1550,
    limit: 6,
    placement: 'any',
    blurb: 'An alternate Railgunner that fires bursts at one zombie, ending each burst with an explosion that splashes the zombies around it. One of the most flexible towers you can get early. Goes on the ground or a cliff, and gets 50% more range on a cliff. Short range and fairly expensive.',
    tip: 'Always put it on a cliff, and use it as your second damage source.',
    levels: [
      { name: 'Ruptor', desc: 'Bursts of 7 shots.', damage: 4, burst: 7, burstGap: 0.1, cooldown: cyc(7, 0.1, 3), range: 10, cliff: { range: 15 }, hidden: false },
      { name: 'Rupture', desc: 'Bursts of 8, and each burst ends in an explosion (15 damage).', cost: 1000, damage: 4, burst: 8, burstGap: 0.1, cooldown: cyc(8, 0.1, 3), range: 10, cliff: { range: 15 }, boom: { damage: 15, radius: 3 }, hidden: false },
      { name: 'Overpressure', desc: 'Damage 4 → 6, more range, bursts of 9, shorter pauses, explosions 30.', cost: 2450, damage: 6, burst: 9, burstGap: 0.1, cooldown: cyc(9, 0.1, 2.7), range: 11, cliff: { range: 16.5 }, boom: { damage: 30, radius: 3 }, hidden: false },
      { name: 'Fault Line', desc: 'Damage 6 → 12, faster, more range, explosions 70, and hidden detection.', cost: 9550, damage: 12, burst: 9, burstGap: 0.075, cooldown: cyc(9, 0.075, 2.7), range: 12, cliff: { range: 18 }, boom: { damage: 70, radius: 3 }, hidden: true },
      { name: 'Tremor', desc: 'Damage 12 → 16, bursts of 11, explosions 130.', cost: 14500, damage: 16, burst: 11, burstGap: 0.075, cooldown: cyc(11, 0.075, 2.7), range: 12, cliff: { range: 18 }, boom: { damage: 130, radius: 3 }, hidden: true },
      { name: 'Cataclysm', desc: 'Faster, more range, bursts of 20, shorter pauses, explosions 245.', cost: 29000, damage: 16, burst: 20, burstGap: 0.06, cooldown: cyc(20, 0.06, 2.5), range: 13, cliff: { range: 19.5 }, boom: { damage: 245, radius: 3 }, hidden: true },
    ],
  },
  // Trawler (alternate Oil Derrick form, water): `catch.n` catches of `min`-`max` cash every wave.
  // Skipping a wave adds `boost` (up to `maxBoost`); waves you don't skip lose it twice as fast.
  // Not used by the game yet (kept for later): `window` (s after the skip vote opens that a skip
  // must happen in to count) and `weather` (Lv 4-5 Weather Forecast ability).
  trawler: {
    name: 'Trawler',
    altOf: 'oilDerrick',
    form: 'Trawler',
    shards: 1,
    price: 0,
    cost: 600,
    limit: 6,
    placement: 'water',
    kind: 'income',
    noHeal: true,
    blurb: 'An alternate Oil Derrick: a fishing boat that hauls in several catches of cash every wave. Skipping waves gives it a stacking cash boost (up to a cap), but waves you don\'t skip make the boost drop fast. Water only. Without skipping it earns less than a Plantation.',
    tip: 'Great for speedrunning: skip waves early, but don\'t skip so hard that zombies leak.',
    levels: [
      { name: 'Trawler', desc: '7 catches of $20-25 every wave. +10% per skipped wave (up to 25%).', income: 158, catch: { min: 20, max: 25, n: 7, boost: 0.1, maxBoost: 0.25, window: 10 }, hidden: false },
      { name: 'Bigger Nets', desc: 'Catches of $35-43.', cost: 525, income: 273, catch: { min: 35, max: 43, n: 7, boost: 0.1, maxBoost: 0.25, window: 10 }, hidden: false },
      { name: 'Second Crane', desc: '9 catches of $55-79. +11.5% per skip (up to 45%).', cost: 1650, income: 603, catch: { min: 55, max: 79, n: 9, boost: 0.115, maxBoost: 0.45, window: 15 }, hidden: false },
      { name: 'Deep Sea', desc: 'Catches of $110-159.', cost: 2800, income: 1210, catch: { min: 110, max: 159, n: 9, boost: 0.115, maxBoost: 0.45, window: 15 }, hidden: false },
      { name: 'Weather Radar', desc: '12 catches of $150-255. +14% per skip (up to 70%).', cost: 6000, income: 2430, catch: { min: 150, max: 255, n: 12, boost: 0.14, maxBoost: 0.7, window: 20 }, weather: true, hidden: false },
      { name: 'Factory Ship', desc: 'Catches of $270-459.', cost: 14500, income: 4374, catch: { min: 270, max: 459, n: 12, boost: 0.14, maxBoost: 0.7, window: 20 }, weather: true, hidden: false },
    ],
  },
  // Spark: instant sparkly explosions that hit the target and the closest others (up to maxHits),
  // in bursts, then a 4s reload. Now-You-See-Me (Lv 2+): hidden detection for 25s.
  spark: {
    name: 'Spark',
    lead: true,
    price: 4000,
    cost: 3000,
    limit: 6,
    blurb: 'Fires sparkly explosions that hit their target hard and also hurt up to 3 zombies at once, then reloads. Damage and range together make it dump a lot of damage very fast in the mid game. No hidden detection, but its Now-You-See-Me ability gives it hidden detection for a while. Struggles with fast zombies.',
    tip: 'Bring something else for speedy zombies, and save the ability for hidden waves.',
    levels: [
      { name: 'Spark', desc: 'A sparkly explosion every 4s that hits up to 3 zombies.', damage: 50, burst: 1, cooldown: cyc(1, 1.25, 4), range: 16, radius: 3, maxHits: 3, hidden: false },
      { name: 'Brighter Sparks', desc: 'Damage 50 → 85, more range, hits up to 4 zombies.', cost: 2400, damage: 85, burst: 1, cooldown: cyc(1, 1.25, 4), range: 19, radius: 3, maxHits: 4, hidden: false },
      { name: 'Double Spark', desc: 'Damage 85 → 95, more range, 2 explosions per reload. Unlocks Now-You-See-Me.', cost: 4000, damage: 95, burst: 2, burstGap: 1.25, cooldown: cyc(2, 1.25, 4), range: 21, radius: 3, maxHits: 4, hidden: false, abilities: [SEE_ME_AB] },
      { name: 'Supercharged', desc: 'Damage 95 → 175, faster, more range.', cost: 8900, damage: 175, burst: 2, burstGap: 1.15, cooldown: cyc(2, 1.15, 4), range: 22, radius: 3, maxHits: 4, hidden: false, abilities: [SEE_ME_AB] },
      { name: 'Triple Spark', desc: 'Damage 175 → 225, more range, 3 explosions, hits up to 5 zombies.', cost: 15540, damage: 225, burst: 3, burstGap: 1.15, cooldown: cyc(3, 1.15, 4), range: 25, radius: 3, maxHits: 5, hidden: false, abilities: [SEE_ME_AB] },
      { name: 'Supernova', desc: 'Damage 225 → 315, faster, huge range, 4 explosions.', cost: 33333, damage: 315, burst: 4, burstGap: 1, cooldown: cyc(4, 1, 4), range: 34, radius: 3, maxHits: 5, hidden: false, abilities: [SEE_ME_AB] },
    ],
  },
  // Raider (alternate Aviator form): an attack plane circling its runway (the spec has it fly back
  // and forth in a line; it circles like the Aviator for now). Lv 4+ bombs, Lv 5 Nuke.
  raider: {
    name: 'Raider',
    lead: 3,
    altOf: 'aviator',
    form: 'Raider',
    shards: 1,
    price: 0,
    cost: 600,
    limit: 3,
    placement: 'any',
    orbit: 15,
    lap: 9,
    stunImmune: true,
    blurb: 'An alternate Aviator: an attack plane that strafes the path from its runway. Can\'t be stunned. At Lv 4 it drops 3 bombs every pass, and at Lv 5 it gets a Nuke that does 22,500 damage to every zombie near its runway. Pricey early upgrades.',
    tip: 'Place the runway where the path passes close by, and fire the Nuke when a crowd or boss is near it.',
    levels: [
      { name: 'Raider', desc: 'Strafes zombies under it.', damage: 3, cooldown: 0.15, range: 6.5, hidden: false },
      { name: 'Heavier Guns', desc: 'Damage 5.4 → 11, faster, more range.', cost: 1050, damage: 6, cooldown: 0.14, range: 7, hidden: false },
      { name: 'Jet Engine', desc: 'Damage 11 → 14, much faster.', cost: 2100, damage: 8, cooldown: 0.1, range: 7, hidden: false },
      { name: 'Targeting Pod', desc: 'Damage 14 → 18, more range, and hidden detection.', cost: 3900, damage: 10, cooldown: 0.1, range: 9, hidden: true },
      { name: 'Bomber', desc: 'Damage 18 → 31, faster, more range, and 3 bombs per pass (90 damage).', cost: 11500, damage: 17, cooldown: 0.09, range: 11, hidden: true, bomb: { damage: 50, count: 3, every: 4, radius: 2.5 } },
      { name: 'Stealth Bomber', desc: 'Damage 31 → 63, faster, 5 bombs of 900. Unlocks Nuke.', cost: 145000, damage: 35, cooldown: 0.075, range: 12, hidden: true, bomb: { damage: 500, count: 5, every: 4, radius: 2.5 }, abilities: [NUKE_AB] },
    ],
  },
  // Plunder (alternate Cowboy form): a shotgun spread hitting up to `targets` zombies. Only its
  // owner's oldest Plunder (the Captain) digs up treasure every `cash.every` shots.
  plunder: {
    name: 'Plunder',
    altOf: 'cowboy',
    form: 'Plunder',
    shards: 1,
    price: 0,
    cost: 500,
    limit: 8,
    blurb: 'An alternate Cowboy: a pirate with a shotgun spread that hits several zombies. Your oldest Plunder is the Captain: every so many shots he stops to dig up treasure and pays you cash. If the Captain goes down, the next-oldest takes over. Two jobs in one slot, but a real farm makes more and a dedicated tower defends better.',
    tip: 'Keep your first Plunder safe so the Captain stays a strong one.',
    levels: [
      { name: 'Plunder', desc: 'A shotgun spread at up to 3 zombies. The Captain digs up $150 every 10 shots.', damage: 6, cooldown: 2, range: 6.5, targets: 3, cash: { every: 10, pay: 150, spin: 2, captain: true }, hidden: false },
      { name: 'Wider Spread', desc: 'Damage 6 → 13, hits 4 zombies. Digs $350 every 15 shots.', cost: 950, damage: 13, cooldown: 2, range: 7, targets: 4, cash: { every: 15, pay: 350, spin: 2, captain: true }, hidden: false },
      { name: 'Spyglass', desc: 'Damage 13 → 22, faster, more range, hidden detection. Digs $850.', cost: 2100, damage: 22, cooldown: 1.75, range: 8, targets: 4, cash: { every: 15, pay: 850, spin: 2, captain: true }, hidden: true },
      { name: 'Captain\'s Coat', desc: 'Damage 22 → 50, faster, hits 6 zombies. Digs $2,350 every 20 shots.', cost: 8000, damage: 50, cooldown: 1.5, range: 9, targets: 6, cash: { every: 20, pay: 2350, spin: 2, captain: true }, hidden: true },
      { name: 'Pirate King', desc: 'Damage 50 → 105, faster, hits 7 zombies. Digs $6,800 every 25 shots.', cost: 20500, damage: 105, cooldown: 1.35, range: 9.5, targets: 7, cash: { every: 25, pay: 6800, spin: 2, captain: true }, hidden: true },
    ],
  },
  // Spectre (alternate Ghost form): bursts, plus a drone (Lv 1+) in one of its modes (DRONE_MODE_AB):
  // offense: bombs (a missile on its own timer; Lv 4+ the Spectre also does offenseDmg x damage);
  // defense (Lv 3+): heals towers in `aura` and makes them stun immune; support (Lv 4+): +damage.
  spectre: {
    name: 'Spectre',
    altOf: 'ghost',
    form: 'Spectre',
    shards: 1,
    price: 0,
    cost: 600,
    limit: 6,
    blurb: 'An alternate Ghost that shoots in bursts and sees hidden zombies from the start. From Lv 1 it has a drone: Offense mode drops bombs, Defense mode (Lv 3) heals nearby towers and makes them stun immune for a while, and Support mode (Lv 4) boosts their damage. Its own damage is modest.',
    tip: 'Use Defense against bosses that stun, and Support next to your strongest towers.',
    levels: [
      { name: 'Spectre', desc: 'Bursts of 6 shots. Sees hidden zombies.', damage: 3, burst: 6, burstGap: 0.4, cooldown: cyc(6, 0.4, 1.7), range: 8, hidden: true },
      { name: 'Drone', desc: 'More range and a drone that drops 8-damage bombs.', cost: 1250, damage: 3, burst: 6, burstGap: 0.4, cooldown: cyc(6, 0.4, 1.7), range: 9, aura: 9, hidden: true,
        drone: { offense: { name: 'Drone Bombs', damage: 8, count: 1, every: 2, radius: 3 } } },
      { name: 'Hollow Points', desc: 'Damage 3 → 5, faster, drone bombs 25.', cost: 3500, damage: 5, burst: 6, burstGap: 0.3, cooldown: cyc(6, 0.3, 1.5), range: 9, aura: 9, hidden: true,
        drone: { offense: { name: 'Drone Bombs', damage: 25, count: 1, every: 2, radius: 3 } } },
      { name: 'Defense Mode', desc: 'Damage 5 → 8, bursts of 8. Unlocks Defense mode: heals towers 10 every 3s and gives 5s of stun immunity.', cost: 7200, damage: 8, burst: 8, burstGap: 0.3, cooldown: cyc(8, 0.3, 1.5), range: 9, aura: 9, hidden: true,
        drone: { offense: { name: 'Drone Bombs', damage: 25, count: 1, every: 1.5, radius: 3 }, defense: { heal: 10, every: 3, immune: 5 } }, abilities: [DRONE_MODE_AB] },
      { name: 'Support Mode', desc: 'Damage 8 → 22, faster, more range, bursts of 12. Unlocks Support mode (+15% damage to towers nearby), and +50% damage while on Offense.', cost: 16750, damage: 22, burst: 12, burstGap: 0.25, cooldown: cyc(12, 0.25, 1.5), range: 12, aura: 12, hidden: true,
        drone: { offense: { name: 'Drone Bombs', damage: 25, count: 1, every: 1.5, radius: 3 }, offenseDmg: 1.5, defense: { heal: 10, every: 3, immune: 5 }, support: 0.15 }, abilities: [DRONE_MODE_AB] },
      { name: 'Phantom Ops', desc: 'Damage 22 → 30, faster, more range, bursts of 18. Drone: 90-damage bombs, heals 15 every 2s with 10s immunity, +20% support.', cost: 23000, damage: 30, burst: 18, burstGap: 0.2, cooldown: cyc(18, 0.2, 1.2), range: 14, aura: 14, hidden: true,
        drone: { offense: { name: 'Drone Bombs', damage: 90, count: 1, every: 2.5, radius: 3.5 }, offenseDmg: 1.5, defense: { heal: 15, every: 2, immune: 10 }, support: 0.2 }, abilities: [DRONE_MODE_AB] },
    ],
  },
  // Buccaneer (alternate Patrol Boat form, water): cannon bursts across most of the map. Lv 4+ its
  // pirate barrel (`drop`) lands 2 Cutlass pirates and a Corsair on the middle of the path.
  // Not used by the game yet (kept for later): `friendlyFire` (it should hit nearby Buccaneers).
  buccaneer: {
    name: 'Buccaneer',
    lead: true,
    altOf: 'patrolBoat',
    form: 'Buccaneer',
    shards: 1,
    price: 0,
    cost: 4750,
    limit: 6,
    placement: 'water',
    lob: 0.8,
    friendlyFire: true,
    blurb: 'An alternate Patrol Boat: a pirate ship that bombards the path with cannonballs from almost anywhere on the map. From Lv 4 its pirate barrel drops 2 Cutlass pirates and a Corsair onto the middle of the path every 90s. Water only, and it never sees hidden zombies (the Corsair does).',
    tip: 'Set it to Strongest to take down big zombies.',
    levels: [
      { name: 'Buccaneer', desc: '2-cannonball bursts with huge range.', damage: 20, burst: 2, burstGap: 0.25, cooldown: cyc(2, 0.25, 3), range: 90, radius: 2, hidden: false },
      { name: 'Heavy Shot', desc: 'Damage 20 → 30, more range.', cost: 3000, damage: 30, burst: 2, burstGap: 0.25, cooldown: cyc(2, 0.25, 3), range: 100, radius: 2, hidden: false },
      { name: 'Broadside', desc: 'Damage 30 → 35, 4-cannonball bursts.', cost: 7500, damage: 35, burst: 4, burstGap: 0.25, cooldown: cyc(4, 0.25, 3), range: 100, radius: 2, hidden: false },
      { name: 'Man-o\'-War', desc: 'Damage 35 → 45, more range, 6-cannonball bursts.', cost: 10500, damage: 45, burst: 6, burstGap: 0.25, cooldown: cyc(6, 0.25, 3), range: 120, radius: 2, hidden: false },
      { name: 'Pirate Barrel', desc: '12-cannonball bursts, faster, more range, longer pauses. Every 90s it drops 2 Cutlass pirates and a Corsair on the path.', cost: 18500, damage: 45, burst: 12, burstGap: 0.1, cooldown: cyc(12, 0.1, 4.5), range: 130, radius: 2, hidden: false,
        drop: { every: 90, at: 0.5, units: [CUTLASS, CUTLASS, CORSAIR] } },
      { name: 'Dread Galleon', desc: 'Damage 45 → 90, more range, shorter pauses. The barrel comes every 80s.', cost: 40000, damage: 90, burst: 12, burstGap: 0.125, cooldown: cyc(12, 0.125, 3.5), range: 150, radius: 2, hidden: false,
        drop: { every: 80, at: 0.5, units: [CUTLASS, CUTLASS, CORSAIR] } },
    ],
  },
  // Broadcaster (alternate Commander form): no damage. More range for towers in its aura, and from
  // Lv 3 cheaper upgrades for them.
  broadcaster: {
    name: 'Broadcaster',
    altOf: 'commander',
    form: 'Broadcaster',
    shards: 1,
    price: 0,
    cost: 1200,
    limit: 2,
    kind: 'support',
    blurb: 'An alternate Commander that never attacks. It boosts the range of every tower near it, and from Lv 3 it also makes their upgrades cheaper. Only 2 allowed, so it is wasted if it isn\'t covering your main defense.',
    tip: 'Get it to Lv 3 for the discount before buying big upgrades, and cover as much of your main defense as you can.',
    levels: [
      { name: 'Broadcaster', desc: '+10% range to towers nearby.', aura: 14, rangeBoost: 0.1, hidden: false },
      { name: 'Signal Boost', desc: '+15% range.', cost: 900, aura: 14, rangeBoost: 0.15, hidden: false },
      { name: 'Bigger Dish', desc: '+20% range.', cost: 2200, aura: 14, rangeBoost: 0.2, hidden: false },
      { name: 'Sponsorship', desc: 'Covers more, and upgrades nearby cost 10% less.', cost: 6000, aura: 16, rangeBoost: 0.2, discount: 0.1, hidden: false },
      { name: 'Prime Time', desc: '+25% range.', cost: 9500, aura: 16, rangeBoost: 0.25, discount: 0.1, hidden: false },
      { name: 'Global Network', desc: 'Covers much more, +30% range, upgrades 15% cheaper.', cost: 22000, aura: 22, rangeBoost: 0.3, discount: 0.15, hidden: false },
    ],
  },
  // Stasis (alternate Electroshocker form): charges up (aimShot), then a freezing blast. The freeze
  // lasts `freeze` x sqrt(freezeHp / max health) s (0.25x to 24x): fragile zombies stay frozen far longer.
  stasis: {
    name: 'Stasis',
    altOf: 'electro',
    form: 'Stasis',
    shards: 1,
    price: 0,
    cost: 750,
    limit: 2,
    kindLabel: 'Freeze',
    blurb: 'An alternate Electroshocker that barely does damage but locks zombies in place. Its blast freezes every zombie nearby, and the freeze lasts much longer on zombies with less max health: fast, fragile ones get stuck for a very long time. Tanky zombies and bosses get much shorter freezes. Never sees hidden zombies.',
    tip: 'Use it to hold zombies inside short-range towers like the Samurai, or inside a Focus\'s inner range. Lv 0 is enough for most games.',
    levels: [
      { name: 'Stasis', desc: 'Charges for 1s, then a freezing blast (2.5s base freeze).', damage: 2, cooldown: 5.5, aimShot: 1, range: 10, radius: 4, freeze: 2.5, freezeHp: 400, hidden: false },
      { name: 'Wider Field', desc: 'Fires faster, bigger blast.', cost: 450, damage: 2, cooldown: 5, aimShot: 1, range: 10, radius: 4.5, freeze: 2.5, freezeHp: 400, hidden: false },
      { name: 'Quick Charge', desc: 'Damage 2 → 5, more range, charges faster.', cost: 1050, damage: 5, cooldown: 5, aimShot: 0.85, range: 12, radius: 4.5, freeze: 2.5, freezeHp: 400, hidden: false },
      { name: 'Deep Freeze', desc: 'Damage 5 → 9, longer freezes.', cost: 2650, damage: 9, cooldown: 5, aimShot: 0.85, range: 12, radius: 4.5, freeze: 2.75, freezeHp: 400, hidden: false },
      { name: 'Field Amplifier', desc: 'Damage 9 → 15, faster, more range, bigger blast, charges faster.', cost: 6500, damage: 15, cooldown: 4.5, aimShot: 0.75, range: 14, radius: 5, freeze: 2.75, freezeHp: 400, hidden: false },
      { name: 'Absolute Zero', desc: 'Damage 15 → 25, faster, more range, bigger blast, longer freezes.', cost: 9500, damage: 25, cooldown: 4, aimShot: 0.75, range: 16, radius: 5.5, freeze: 3.25, freezeHp: 400, hidden: false },
    ],
  },
  // Glowup (alternate DJ form): +firerate to towers in its aura, less the farther away they are
  // (`falloff`: half as much at the edge). Live Show (Lv 4+): a big slow, and cash for damage there.
  glowup: {
    name: 'Glowup',
    altOf: 'dj',
    form: 'Glowup',
    shards: 1,
    price: 0,
    cost: 1450,
    limit: 2,
    kind: 'support',
    blurb: 'An alternate DJ that makes nearby towers fire faster: the closer they are, the bigger the boost. At Lv 4 it unlocks Live Show, which slows zombies heavily and pays you 25% of the damage your towers deal inside it.',
    tip: 'Put your best towers right next to it and weaker ones toward the edge. Use Live Show as a big slow first, extra cash second.',
    levels: [
      { name: 'Glowup', desc: 'Up to +15% firerate (half at the edge).', aura: 12, rateBoost: 0.15, falloff: 0.5, hidden: false },
      { name: 'Neon Lights', desc: 'Up to +20% firerate.', cost: 1800, aura: 12, rateBoost: 0.2, falloff: 0.5, hidden: false },
      { name: 'Bigger Stage', desc: 'Covers more.', cost: 2900, aura: 14, rateBoost: 0.2, falloff: 0.5, hidden: false },
      { name: 'Glow Sticks', desc: 'Covers more, up to +25% firerate.', cost: 4750, aura: 15, rateBoost: 0.25, falloff: 0.5, hidden: false },
      { name: 'Live Show', desc: 'Unlocks Live Show.', cost: 9500, aura: 15, rateBoost: 0.25, falloff: 0.5, hidden: false, abilities: [liveShowAb(15)] },
      { name: 'Headliner', desc: 'Covers much more, up to +30% firerate.', cost: 19500, aura: 20, rateBoost: 0.3, falloff: 0.5, hidden: false, abilities: [liveShowAb(20)] },
    ],
  },
  // Glacier (alternate Harpoon Hunter form, cliffs): traps its target in an ice cube (see
  // Sim.iceCube): the cube takes the damage until it breaks or melts (cube.time s, bosses twice that).
  glacier: {
    name: 'Glacier',
    altOf: 'harpoonHunter',
    form: 'Glacier',
    shards: 1,
    price: 0,
    lead: true,
    cost: 1500,
    limit: 4,
    placement: 'cliff',
    kindLabel: 'Freeze',
    blurb: 'An alternate Harpoon Hunter that traps zombies in ice cubes. The cube has the zombie\'s health (up to a cap; bosses get 3x) and soaks up damage; the zombie thaws when the cube breaks or melts. Zombies stuck behind a frozen one get wrecked. Fires slowly, so it struggles with fast crowds. Cliffs only.',
    tip: 'Pair it with high-damage towers so the frozen time turns into kills.',
    levels: [
      { name: 'Glacier', desc: 'Traps a zombie in an ice cube (up to 250 HP) for 2.5s.', damage: 0.5, cooldown: 8, range: 12, cube: { hp: 250, time: 2.5 }, hidden: false },
      { name: 'Thicker Ice', desc: 'Damage 0.5 → 2, faster, more range, cubes up to 550 HP.', cost: 3200, damage: 2, cooldown: 7, range: 14, cube: { hp: 550, time: 2.5 }, hidden: false },
      { name: 'Frost Sight', desc: 'Damage 2 → 5, faster, more range, cubes up to 750, and hidden detection.', cost: 4100, damage: 5, cooldown: 6.5, range: 16, cube: { hp: 750, time: 2.5 }, hidden: true },
      { name: 'Permafrost', desc: 'Damage 5 → 10, faster, cubes up to 1,500 for 2.75s.', cost: 6000, damage: 10, cooldown: 6, range: 16, cube: { hp: 1500, time: 2.75 }, hidden: true },
      { name: 'Ice Age', desc: 'Damage 10 → 25, faster, more range, cubes up to 3,500 for 3s.', cost: 15000, damage: 25, cooldown: 5.5, range: 18.5, cube: { hp: 3500, time: 3 }, hidden: true },
    ],
  },
  // Enforcement Base (alternate Patrol form): sends Enforcers, Enforcer Ms, Turret Trucks and the APM-Bot.
  enforcementBase: {
    name: 'Enforcement Base',
    altOf: 'patrol',
    form: 'Enforcement Base',
    shards: 1,
    price: 0,
    cost: 1150,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 60,
    blurb: 'An alternate Patrol: a building that sends a squad of hard-hitting units down the path: Enforcers, Enforcer Ms, then the Turret Truck and the APM-Bot, which slow down while they fire. Cheap to place with huge late-game power, but its top upgrade is very expensive.',
    tip: 'Pair it with a Broadcaster to make its later levels cheaper.',
    levels: [
      { name: 'Enforcement Base', desc: 'An Enforcer every 60s.', hidden: false, unit: EB.enf },
      { name: 'Faster Dispatch', desc: 'An Enforcer every 40s.', cost: 850, hidden: false, spawnEvery: 40, unit: EB.enf },
      { name: 'Enforcer M', desc: 'Adds an Enforcer M every 45s: a sturdier close-range unit.', cost: 2500, hidden: false, spawnEvery: 40, unit: EB.enf, unit2: EB.m, spawnEvery2: 45 },
      { name: 'Squads', desc: '3 Enforcers every 30s, 2 Enforcer Ms every 45s.', cost: 5850, hidden: false, spawnEvery: 30, unit: { ...EB.enf, count: 3 }, unit2: { ...EB.m, count: 2 }, spawnEvery2: 45 },
      { name: 'Turret Truck', desc: 'Faster squads, and a Turret Truck every 50s (450 HP, 140 DPS, hidden detection).', cost: 14500, hidden: true, spawnEvery: 25, unit: { ...EB.enf, count: 3 },
        unit2: { ...EB.m, count: 3 }, spawnEvery2: 35, unit3: EB.truck, spawnEvery3: 50 },
      { name: 'APM-Bot', desc: '5 Enforcers every 25s, more Ms and Trucks, and the APM-Bot every 75s (2,700 HP, 375 DPS, 260-damage blasts).', cost: 80000, hidden: true, spawnEvery: 25, unit: { ...EB.enf, count: 5 },
        unit2: { ...EB.m, count: 3 }, spawnEvery2: 25, unit3: EB.truck, spawnEvery3: 40, unit4: EB.apm, spawnEvery4: 75 },
    ],
  },
  // Planeswalker: a cliff sniper. Zombies inside its inner range (`closeRange`) take `closeMult` damage.
  planeswalker: {
    name: 'Planeswalker',
    event: 'Beat Expert mode', // win reward (see DIFFICULTIES unlock)
    lead: true,
    price: 12000,
    cost: 4500,
    limit: 12,
    placement: 'cliff',
    kindLabel: 'Sniper',
    blurb: 'A cliff sniper whose shots hit harder the farther away the zombie is: zombies inside its inner range take less. Fires instantly, so it snipes fast zombies easily. Hits one zombie at a time, and it\'s very expensive. Hidden detection at max level.',
    tip: 'Put it as far from the path as its range allows to get the most damage.',
    levels: [
      { name: 'Planeswalker', desc: 'A long-range instant shot. Zombies inside its inner range take 30% less.', damage: 135, cooldown: 5, range: 16, closeRange: 6.5, closeMult: 0.7, hidden: false },
      { name: 'Farsight', desc: 'Damage 135 → 180, faster, more range.', cost: 3250, damage: 180, cooldown: 4.5, range: 20, closeRange: 8, closeMult: 0.7, hidden: false },
      { name: 'Planar Rounds', desc: 'Damage 180 → 285, faster, more range.', cost: 9000, damage: 285, cooldown: 4, range: 25, closeRange: 10, closeMult: 0.7, hidden: false },
      { name: 'Rift Walker', desc: 'Damage 285 → 360, much faster, more range.', cost: 22500, damage: 360, cooldown: 2.5, range: 28, closeRange: 11, closeMult: 0.7, hidden: false },
      { name: 'Walker of Planes', desc: 'Damage 360 → 505, faster, more range, and hidden detection.', cost: 46000, damage: 505, cooldown: 2, range: 32, closeRange: 12.5, closeMult: 0.7, hidden: true },
    ],
  },
  // Submerge (alternate Warship form, water): Afloat mode fires coastal missile bursts. From Lv 3
  // Dive switches to Submerged mode (`sub` fields replace the level's): slow nukes with a huge
  // blast, and the only mode with hidden detection. Lv 5: Jericho Missile.
  submerge: {
    name: 'Submerge',
    lead: true,
    altOf: 'warship',
    form: 'Submerge',
    shards: 1,
    price: 0,
    cost: 6000,
    limit: 5,
    placement: 'water',
    homing: true,
    lob: 1,
    blurb: 'An alternate Warship: a submarine with two modes from Lv 3. Afloat fires bursts of coastal missiles; Submerged launches slow nukes with huge splash and is the only mode that sees hidden zombies. At Lv 5 its Jericho Missile splits midair and rains 18,000 damage across the map. A slow burn, and water only.',
    tip: 'Most players keep it Submerged. Set it to Strongest so less damage is wasted.',
    levels: [
      { name: 'Submerge', desc: 'Bursts of 2 coastal missiles.', damage: 35, burst: 2, burstGap: 1, cooldown: cyc(2, 1, 7), range: 110, radius: 3, hidden: false },
      { name: 'More Tubes', desc: 'Damage 63 → 90, bursts of 4.', cost: 3500, damage: 50, burst: 4, burstGap: 1, cooldown: cyc(4, 1, 7), range: 110, radius: 3, hidden: false },
      { name: 'Missile Deck', desc: 'Damage 90 → 115, more range, bursts of 8, shorter pauses.', cost: 6550, damage: 65, burst: 8, burstGap: 1, cooldown: cyc(8, 1, 6.5), range: 130, radius: 3, hidden: false },
      { name: 'Dive', desc: 'Afloat: damage 115 → 135, much shorter pauses. Unlocks Submerged mode: 575-damage nukes with a huge blast and hidden detection.', cost: 11000, damage: 75, burst: 8, burstGap: 1, cooldown: cyc(8, 1, 3.5), range: 130, radius: 3, hidden: false,
        sub: { damage: 320, burst: 1, burstGap: 3, cooldown: 6, range: 150, radius: 8, lob: 2.5, hidden: true }, abilities: [DIVE_AB] },
      { name: 'Silent Hunter', desc: 'Afloat: damage 145, faster, more range. Submerged: 855-damage nukes, 2 per burst, more range.', cost: 19500, damage: 80, burst: 8, burstGap: 0.8, cooldown: cyc(8, 0.8, 3.5), range: 140, radius: 3, hidden: false,
        sub: { damage: 475, burst: 2, burstGap: 2.5, cooldown: cyc(2, 2.5, 6), range: 190, radius: 8, lob: 2.5, hidden: true }, abilities: [DIVE_AB] },
      { name: 'Jericho', desc: 'Afloat: damage 215, faster, more range. Submerged: 1,530-damage nukes, 3 per burst. Unlocks the Jericho Missile.', cost: 42000, damage: 120, burst: 8, burstGap: 0.75, cooldown: cyc(8, 0.75, 3.5), range: 150, radius: 3, hidden: false,
        sub: { damage: 850, burst: 3, burstGap: 2.5, cooldown: cyc(3, 2.5, 10), range: 200, radius: 9, lob: 2.5, hidden: true }, abilities: [DIVE_AB, JERICHO_AB] },
    ],
  },
  // Shock Commando (alternate Commando form): bursts of explosive missiles. Lv 4+: Shock Missile.
  shockCommando: {
    name: 'Shock Commando',
    lead: true,
    altOf: 'commando',
    form: 'Shock Commando',
    shards: 1,
    price: 0,
    cost: 850,
    limit: 8,
    homing: true,
    lob: 0.5,
    blurb: 'An alternate Commando that fires bursts of high-damage explosive missiles. Strong early, keeps up in the mid game, and late on you can build lots of them. From Lv 4 its Shock Missile does heavy damage and stuns any zombie, bosses included.',
    tip: 'Save the Shock Missile for boss attacks.',
    levels: [
      { name: 'Shock Commando', desc: 'Bursts of 2 explosive missiles.', damage: 14, burst: 2, burstGap: 0.75, cooldown: cyc(2, 0.75, 3), range: 10, radius: 2, hidden: false },
      { name: 'Bigger Warheads', desc: 'Damage 14 → 20, shorter pauses, bigger blast.', cost: 950, damage: 20, burst: 2, burstGap: 0.75, cooldown: cyc(2, 0.75, 2.8), range: 10, radius: 2.45, hidden: false },
      { name: 'Thermal Sights', desc: 'Damage 20 → 30, faster, more range, and hidden detection.', cost: 2400, damage: 30, burst: 2, burstGap: 0.65, cooldown: cyc(2, 0.65, 2.7), range: 12, radius: 2.45, hidden: true },
      { name: 'Second Pod', desc: 'Damage 30 → 35, more range, bursts of 4, bigger blast.', cost: 6500, damage: 35, burst: 4, burstGap: 0.65, cooldown: cyc(4, 0.65, 2.7), range: 14, radius: 2.75, hidden: true },
      { name: 'Shock Missile', desc: 'Damage 35 → 60, faster, more range. Unlocks Shock Missile (150 damage, 1s stun).', cost: 7500, damage: 60, burst: 4, burstGap: 0.5, cooldown: cyc(4, 0.5, 2.7), range: 16, radius: 2.75, hidden: true, abilities: [shockMissileAb(150, 1)] },
      { name: 'Storm Commando', desc: 'Damage 60 → 135, more range, bigger blast. Shock Missile: 500 damage, 1.25s stun.', cost: 23000, damage: 135, burst: 4, burstGap: 0.5, cooldown: cyc(4, 0.5, 2.7), range: 17, radius: 3, hidden: true, abilities: [shockMissileAb(500, 1.25)] },
    ],
  },
  // Marauder (water): razors that make zombies bleed (poison-style damage every 0.5s). Lv 3+ sonar
  // bombs that go for hidden zombies first and reveal them; Lv 4+ Harpoon. No hidden detection.
  marauder: {
    name: 'Marauder',
    lead: true,
    price: 9500,
    cost: 7650,
    limit: 3,
    placement: 'water',
    blurb: 'A raider boat that fires razors that make zombies bleed. Later levels add sonar bombs that hunt down and reveal hidden zombies, and a Harpoon that does huge damage, stuns (bosses too) and makes its target take 25% more damage. A top heavy-damage pick for Hard mode, but very expensive and it can\'t see hidden zombies itself. Water only.',
    tip: 'One Marauder gives most of the value: spend the rest of your cash elsewhere. Open boss fights with the Harpoon.',
    levels: [
      { name: 'Marauder', desc: 'Razors that make zombies bleed (15 over 3s).', damage: 40, cooldown: 3, range: 60, poison: bleed(15, 3), hidden: false },
      { name: 'Serrated Razors', desc: 'Damage 40 → 65, bleed 25 over 3.5s.', cost: 5350, damage: 65, cooldown: 3, range: 60, poison: bleed(25, 3.5), hidden: false },
      { name: 'Twin Launchers', desc: '2 razors per shot, more range, bleed 40.', cost: 10000, damage: 65, burst: 2, burstGap: 0.75, cooldown: cyc(2, 0.75, 3), range: 70, poison: bleed(40, 3.5), hidden: false },
      { name: 'Sonar', desc: 'Damage 65 → 90, bleed 65 over 4s. Sonar bombs (350 damage) every 17.5s that hunt and reveal hidden zombies.', cost: 23500, damage: 90, burst: 2, burstGap: 0.75, cooldown: cyc(2, 0.75, 2.75), range: 70, poison: bleed(65, 4), hidden: false,
        missiles: [sonar(350, 17.5)] },
      { name: 'Harpoon', desc: 'Damage 90 → 200, more range, bleed 115, sonar 550 every 15s. Unlocks the Harpoon.', cost: 45500, damage: 200, burst: 2, burstGap: 0.75, cooldown: cyc(2, 0.75, 3.25), range: 85, poison: bleed(115, 4.5), hidden: false,
        missiles: [sonar(550, 15)], abilities: [marauderHarpoon(2500)] },
      { name: 'Blood Tide', desc: 'Damage 160 → 400, faster, bleed 210, sonar 1,150 every 12.5s, Harpoon 5,000.', cost: 85000, damage: 400, burst: 2, burstGap: 0.5, cooldown: cyc(2, 0.5, 2.5), range: 90, poison: bleed(210, 4.5), hidden: false,
        missiles: [sonar(1150, 12.5)], abilities: [marauderHarpoon(5000)] },
    ],
  },
  // Orbit: a satellite that fires a long laser burst (firing time), then recharges. Its shield
  // (Shield Tower style) protects towers in its aura. Lv 5: Orbital Wipeout.
  orbit: {
    name: 'Orbit',
    lead: true,
    laser: true,
    price: 15000,
    cost: 5000,
    limit: 4,
    blurb: 'Launches a satellite that charges up for a long time, then fires a plasma laser in a long burst. Sees hidden zombies from the start. Its Aligning Stars shield protects towers nearby from damage. At max level, Orbital Wipeout splits huge damage among every zombie on the map. Some zombies resist lasers.',
    tip: 'Place it where it sees a lot of path and its shield covers your towers. Farms and a Broadcaster help you afford it.',
    levels: [
      { name: 'Orbit', desc: '5s of laser fire, then 8s recharging. Shields towers nearby (100 every 15s).', damage: 7, burst: 42, burstGap: 0.12, cooldown: cyc(42, 0.12, 8), range: 20, aura: 20, shield: { amount: 100, every: 15 }, hidden: true },
      { name: 'Focusing Lens', desc: 'Damage 7 → 12, faster, more range, 6s of fire.', cost: 4900, damage: 12, burst: 60, burstGap: 0.1, cooldown: cyc(60, 0.1, 8), range: 22, aura: 22, shield: { amount: 150, every: 15 }, hidden: true },
      { name: 'Plasma Core', desc: 'Damage 12 → 18, more range.', cost: 10000, damage: 18, burst: 60, burstGap: 0.1, cooldown: cyc(60, 0.1, 8), range: 23, aura: 23, shield: { amount: 250, every: 15 }, hidden: true },
      { name: 'Solar Array', desc: 'Damage 18 → 28, 7s of fire.', cost: 19000, damage: 28, burst: 70, burstGap: 0.1, cooldown: cyc(70, 0.1, 8), range: 23, aura: 23, shield: { amount: 400, every: 15 }, hidden: true },
      { name: 'Quick Recharge', desc: 'Damage 28 → 33, more range, recharges in 7s.', cost: 27500, damage: 33, burst: 70, burstGap: 0.1, cooldown: cyc(70, 0.1, 7), range: 24, aura: 24, shield: { amount: 600, every: 15 }, hidden: true },
      { name: 'Orbital Wipeout', desc: 'Damage 33 → 40, more range, 10s of fire, recharges in 6.5s. Unlocks Orbital Wipeout.', cost: 44500, damage: 40, burst: 100, burstGap: 0.1, cooldown: cyc(100, 0.1, 6.5), range: 25, aura: 25, shield: { amount: 1000, every: 15 }, hidden: true, abilities: [WIPEOUT_AB] },
    ],
  },
  // Void Port (alternate Zed form): sends armed carts, then trains (a locomotive whose `train`
  // wagons follow it). Carts slow down while they shoot. Not used by the game yet (kept for later):
  // `trainStops` (when the locomotive is destroyed the wagons should stop where they are and keep firing).
  voidPort: {
    name: 'Void Port',
    altOf: 'zed',
    form: 'Void Port',
    shards: 1,
    price: 0,
    cost: 4950,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 85,
    trainStops: true,
    blurb: 'An alternate Zed that sends armed carts down the path, and later a whole train: a locomotive pulling gun wagons and mortar wagons. The carts are tanky, hit hard, see hidden zombies, and slow down while they shoot. Very expensive.',
    tip: 'A Broadcaster cuts its huge upgrade costs. Its carts are great at catching fast zombies.',
    levels: [
      { name: 'Void Port', desc: 'A Gunner Cart and a Mortar Cart every 85s.', hidden: true, unit: VP.gunCart, unit2: VP.mortarCart, spawnEvery2: 85 },
      { name: 'Faster Rails', desc: 'Carts every 65s.', cost: 2625, hidden: true, spawnEvery: 65, unit: VP.gunCart, unit2: VP.mortarCart, spawnEvery2: 65 },
      { name: 'Double Carts', desc: '2 Gunner Carts and 2 Mortar Carts.', cost: 7200, hidden: true, spawnEvery: 65, unit: { ...VP.gunCart, count: 2 }, unit2: { ...VP.mortarCart, count: 2 }, spawnEvery2: 65 },
      { name: 'Train', desc: 'A train every 75s: a Locomotive (975 HP) pulling a Gun Wagon (170 DPS) and a Mortar Wagon.', cost: 20000, hidden: true, spawnEvery: 75, unit: VP.loco([VP.gunWagon, VP.mortarWagon]) },
      { name: 'Long Train', desc: '2 Gun Wagons and 2 Mortar Wagons.', cost: 33250, hidden: true, spawnEvery: 75, unit: VP.loco([VP.gunWagon, VP.gunWagon, VP.mortarWagon, VP.mortarWagon]) },
      { name: 'Void Train', desc: 'The Void train: a Void Loc (2,280 HP), 2 Void GWagons (280 DPS) and 2 Void Mortars, each 1,300 HP.', cost: 95000, hidden: true, spawnEvery: 75, unit: VP.voidLoco([VP.voidGun, VP.voidGun, VP.voidMortar, VP.voidMortar]) },
    ],
  },
  // Void King (alternate Void Traitor form): a melee sword hitting up to `targets` zombies. Every
  // `lasers.every` hits, lasers strike `count` zombies within `reach` and stun them. Lv 4: Sky Slam.
  voidKing: {
    name: 'Void King',
    altOf: 'traitor',
    form: 'Void King',
    shards: 1,
    price: 0,
    flying: false,
    lead: true,
    cost: 2000,
    limit: 4,
    melee: true,
    kindLabel: 'Multi',
    blurb: 'An alternate Void Traitor: one of the strongest towers in the game. Huge sword swings that hit several zombies, and every few hits he summons lasers that do massive damage and stun. Can\'t be stunned from Lv 3. At max level his Sky Slam crashes down for 330 damage in a huge radius. Tiny range, and he never sees hidden zombies.',
    tip: 'Place him on the busiest stretch of path, and pair him with a tower that sees hidden zombies.',
    levels: [
      { name: 'Void King', desc: 'Sword swings at up to 3 zombies.', damage: 50, cooldown: 2, range: 4.5, targets: 3, hp: 1400, hidden: false },
      { name: 'Void Lasers', desc: 'Damage 17 → 38, hits 4. Every 25 hits, lasers strike 3 zombies (115 damage, 1s stun).', cost: 3250, damage: 115, cooldown: 2, range: 4.5, targets: 4, lasers: { every: 25, count: 3, damage: 350, stun: 1, reach: 15 }, hp: 1600, hidden: false },
      { name: 'Crimson Edge', desc: 'Damage 38 → 83, faster, more reach. Lasers 250.', cost: 7500, damage: 250, cooldown: 1.75, range: 5, targets: 4, lasers: { every: 25, count: 3, damage: 750, stun: 1, reach: 15 }, hp: 2000, hidden: false },
      { name: 'Unshakable', desc: 'Damage 83 → 155, hits 5, can\'t be stunned. Lasers 460.', cost: 18000, damage: 475, cooldown: 1.75, range: 5, targets: 5, lasers: { every: 25, count: 3, damage: 1400, stun: 1, reach: 15 }, hp: 3000, hidden: false, stunImmune: true },
      { name: 'King of the Void', desc: 'Damage 155 → 415, faster, more reach, hits 7, lasers every 15 hits (1,240). Unlocks Sky Slam.', cost: 35400, damage: 1250, cooldown: 1.5, range: 5.5, targets: 7, lasers: { every: 15, count: 4, damage: 3750, stun: 1, reach: 15 }, hp: 6000, hidden: false, stunImmune: true, abilities: [SKY_SLAM_AB] },
    ],
  },
  // The Eldritch (alternate Star Cannon form): every hit builds charge; at `railgun.max` it fires a
  // railgun that pierces every zombie on a long line. Rift: teleport + 20s stun immunity. Support
  // towers can't boost it and nothing can heal it. Not used by the game yet (kept for later):
  // `noShield` (Shield Tower / Orbit shields shouldn't cover it), `leech` (heals as it fires).
  eldritch: {
    name: 'The Eldritch',
    altOf: 'starCannon',
    form: 'The Eldritch',
    shards: 1,
    price: 0,
    lead: true,
    cost: 5750,
    limit: 3,
    noBuff: true,
    noHeal: true,
    noShield: true,
    blurb: 'An alternate Star Cannon: a cosmic railgun. Its shots build charge, and when it\'s full it fires a railgun shot that pierces every zombie on a huge line. Sees hidden zombies from the start, and Rift teleports it anywhere. Very fragile, and support towers, shields and healing do nothing for it.',
    tip: 'Use Rift to move it out of danger when a boss comes close. High risk, high reward.',
    levels: [
      { name: 'The Eldritch', desc: 'Every 8 hits: a 350-damage railgun shot that pierces a 44-long line.', damage: 40, cooldown: 1, range: 22, railgun: railgun(8, 350, 44), hp: 30, hidden: true, leech: true, abilities: [RIFT_AB] },
      { name: 'Whispers', desc: 'Damage 40 → 80, more range, railgun 650 every 10 hits.', cost: 7600, damage: 80, cooldown: 1, range: 25, railgun: railgun(10, 650, 50), hp: 35, hidden: true, leech: true, abilities: [RIFT_AB] },
      { name: 'Madness', desc: 'Damage 80 → 140, faster, railgun 1,150 every 12 hits.', cost: 9500, damage: 140, cooldown: 0.85, range: 25, railgun: railgun(12, 1150, 55), hp: 40, hidden: true, leech: true, abilities: [RIFT_AB] },
      { name: 'Beyond the Stars', desc: 'Damage 140 → 215, faster, more range, railgun 2,700.', cost: 23750, damage: 215, cooldown: 0.8, range: 32, railgun: railgun(12, 2700, 65), hp: 50, hidden: true, leech: true, abilities: [RIFT_AB] },
      { name: 'Old Ones', desc: 'Damage 215 → 330, railgun 4,350.', cost: 35600, damage: 330, cooldown: 0.8, range: 32, railgun: railgun(12, 4350, 70), hp: 55, hidden: true, leech: true, abilities: [RIFT_AB] },
      { name: 'The Eldritch', desc: 'Damage 330 → 435, faster, more range, railgun 9,000 every 18 hits with an 85-long line that loses only 5% per zombie.', cost: 80000, damage: 435, cooldown: 0.75, range: 34, railgun: railgun(18, 9000, 85, 0.05), hp: 65, hidden: true, leech: true, abilities: [RIFT_AB] },
    ],
  },
  // Valkyr (alternate War Machine Factory form): drops a mech at its drop point (the path closest
  // to it until you pick one). Mechs fight up close (`bump`) and leak air (`decay`). Not used by the
  // game yet (kept for later): `smallRange` (its mechs should only fight in a very small range until max level).
  valkyr: {
    name: 'Valkyr',
    altOf: 'warMachine',
    form: 'Valkyr',
    shards: 1,
    price: 0,
    cost: 11500,
    limit: 2,
    kind: 'spawner',
    spawnEvery: 60,
    throwNear: true,
    smallRange: true,
    blurb: 'An alternate War Machine Factory that airdrops a giant mech at a drop point you choose. Mechs hit devastatingly hard up close, and later get rifles and explosives. When damaged they leak air and slowly lose health. One of the strongest summoners when it gets to fight, but it drops slowly and is very expensive.',
    tip: 'Set the drop point where zombies bunch up.',
    levels: [
      { name: 'Valkyr', desc: 'Drops a Mark 1 mech (1,490 HP, 225 melee DPS) every 60s.', hidden: false, unit: MECH.m1, abilities: [DROP_POINT_AB] },
      { name: 'Mark 2', desc: 'Drops a Mark 2 (2,210 HP, 440 melee DPS, a 280 DPS rifle) every 75s.', cost: 15000, hidden: false, spawnEvery: 75, unit: MECH.m2, abilities: [DROP_POINT_AB] },
      { name: 'Mark 4.5', desc: 'Mark 4.5: 4,500 HP, 770 melee DPS, 530 DPS rifle.', cost: 30500, hidden: false, spawnEvery: 75, unit: MECH.m45, abilities: [DROP_POINT_AB] },
      { name: 'Mark 10 Kaboom', desc: 'Mark 10 Kaboom every 85s: 7,200 HP, 1,270 melee DPS, 860 DPS rifle, and explosives.', cost: 46500, hidden: false, spawnEvery: 85, unit: MECH.m10, abilities: [DROP_POINT_AB] },
      { name: 'Mark O-Ultimate', desc: 'Mark O-Ultimate: 10,400 HP, 2,000 melee DPS, 1,300 DPS rifle, stronger explosives.', cost: 78500, hidden: false, spawnEvery: 85, unit: MECH.ult, abilities: [DROP_POINT_AB] },
    ],
  },
  // Squadron (water): an aircraft carrier. Each jet it has unlocked takes off every 42s and flies
  // down the path from its drop point (zombies can't touch them). Airlifters drop paratroopers.
  // Not used by the game yet (kept for later): `irradiate` (if it's destroyed it should explode
  // and badly hurt your towers nearby for 5 minutes).
  squadron: {
    name: 'Squadron',
    lead: true,
    price: 50000,
    cost: 16500,
    limit: 2,
    placement: 'water',
    kind: 'spawner',
    spawnEvery: 42,
    irradiate: true,
    blurb: 'An aircraft carrier that launches fighter jets to strafe the path and drop paratroopers. On paper the highest damage in the game, but each jet only comes every 42s and flies past quickly. Huge bursts that wipe out big threats. Water only, and very expensive.',
    tip: 'Set the drop point so the jets fly over the busiest part of the path. Keep slowing towers for the gaps.',
    levels: [
      { name: 'Squadron', desc: 'Launches a Merlin every 42s (500 DPS, hidden detection).', hidden: true, unit: JET.merlin, abilities: [DROP_POINT_AB] },
      { name: 'Falcon', desc: 'Adds the Falcon: 5-shot bursts of 450 blast damage.', cost: 15500, hidden: true, unit: JET.merlin, unit2: JET.falcon, spawnEvery2: 42, abilities: [DROP_POINT_AB] },
      { name: 'Raptor', desc: 'Adds the Raptor: 75 damage every 0.1s.', cost: 30000, hidden: true, unit: JET.merlin, unit2: JET.falcon, spawnEvery2: 42, unit3: JET.raptor, spawnEvery3: 42, abilities: [DROP_POINT_AB] },
      { name: 'Hardpoint', desc: 'Adds the Hardpoint: 2-bomb bursts of 1,500 blast damage.', cost: 42500, hidden: true, unit: JET.merlin, unit2: JET.falcon, spawnEvery2: 42, unit3: JET.raptor, spawnEvery3: 42,
        unit4: JET.hardpoint, spawnEvery4: 42, abilities: [DROP_POINT_AB] },
      { name: 'Airlifter', desc: 'Adds the Airlifter, which drops 3 paratroopers (90 DPS each).', cost: 60000, hidden: true, unit: JET.merlin, unit2: JET.falcon, spawnEvery2: 42, unit3: JET.raptor, spawnEvery3: 42,
        unit4: JET.hardpoint, spawnEvery4: 42, unit5: JET.airlifter, spawnEvery5: 42, abilities: [DROP_POINT_AB] },
      { name: 'Tentative', desc: 'Adds the Tentative: a 15,000-damage shot after 3s of aiming.', cost: 125000, hidden: true, unit: JET.merlin, unit2: JET.falcon, spawnEvery2: 42, unit3: JET.raptor, spawnEvery3: 42,
        unit4: JET.hardpoint, spawnEvery4: 42, unit5: JET.airlifter, spawnEvery5: 42, unit6: JET.tentative, spawnEvery6: 42, abilities: [DROP_POINT_AB] },
    ],
  },
  // Splash (alternate Cryo Helicopter form): a helicopter whose water shots slow zombies (bosses
  // half as much). Relocation flies it anywhere; Total Relocation moves every Splash you own.
  splash: {
    name: 'Splash',
    altOf: 'cryoHeli',
    form: 'Splash',
    shards: 1,
    price: 0,
    cost: 575,
    limit: 6,
    heli: { speed: 12, height: 13 },
    kindLabel: 'Slow',
    blurb: 'An alternate Cryo Helicopter: a water helicopter with low damage whose shots slow zombies by 30-45% (bosses half as much). Its range is small, but Relocation flies it anywhere on the map, and Total Relocation moves all your Splashes at once. Never sees hidden zombies.',
    tip: 'Keep moving it to wherever the current threat is.',
    levels: [
      { name: 'Splash', desc: 'Water shots that slow zombies 30% for 3s.', damage: 7, cooldown: 4, range: 7, patrol: 5, slime: { slow: 0.3, time: 3, boss: 0.5 }, hp: 70, hidden: false, abilities: [SPLASH_MOVE, SPLASH_ALL] },
      { name: 'Pressure Hose', desc: 'Damage 21 → 60, more range and health.', cost: 900, damage: 20, cooldown: 4, range: 8, patrol: 5, slime: { slow: 0.3, time: 3, boss: 0.5 }, hp: 150, hidden: false, abilities: [SPLASH_MOVE, SPLASH_ALL] },
      { name: 'Soaker', desc: 'Damage 60 → 75, faster, 40% slow.', cost: 2800, damage: 25, cooldown: 3.5, range: 8, patrol: 5, slime: { slow: 0.4, time: 3, boss: 0.5 }, hp: 390, hidden: false, abilities: [SPLASH_MOVE, SPLASH_ALL] },
      { name: 'Tidal Cannon', desc: 'Damage 75 → 90, more range, 45% slow.', cost: 6500, damage: 30, cooldown: 3.5, range: 10, patrol: 5, slime: { slow: 0.45, time: 3, boss: 0.5 }, hp: 780, hidden: false, abilities: [SPLASH_MOVE, SPLASH_ALL] },
      { name: 'Tsunami', desc: 'Damage 90 → 270, faster.', cost: 9000, damage: 90, cooldown: 3, range: 10, patrol: 5, slime: { slow: 0.45, time: 3, boss: 0.5 }, hp: 1320, hidden: false, abilities: [SPLASH_MOVE, SPLASH_ALL] },
    ],
  },
  // Ghostbuster (event tower): a plasma beam. Each other Ghostbuster beaming the same zombie adds
  // `team.boost` damage, but crossed beams hurt it (`team.self` per tick). Lv 1+: 2x vs Ghosts.
  ghostbuster: {
    name: 'Ghostbuster',
    event: 'Ghost\'s Edge event reward',
    lead: true,
    laser: true,
    cost: 3400,
    limit: 8,
    retarget: 0,
    blurb: 'Fires a plasma beam. On its own it\'s an ordinary tower, but every other Ghostbuster beaming the same zombie adds 10% damage. Once beams cross, the Ghostbusters start hurting themselves. From Lv 1 it does double damage to Ghosts. Sees hidden zombies. Some zombies resist lasers.',
    tip: 'Build them in groups: a group of Lv 2s is the sweet spot.',
    levels: [
      { name: 'Ghostbuster', desc: 'A plasma beam at one zombie.', damage: 6, maxDamage: 6, ramp: 1, cooldown: 0.2, range: 12, team: { boost: 0.1, self: 0.5 }, hidden: true },
      { name: 'Ghost Trap', desc: 'Damage 6 → 9, faster, more range, and double damage to Ghosts.', cost: 2300, damage: 9, maxDamage: 9, ramp: 1, cooldown: 0.175, range: 14, team: { boost: 0.1, self: 0.5 }, ghostMult: 2, hidden: true },
      { name: 'Proton Boost', desc: 'Damage 9 → 13, faster.', cost: 4000, damage: 13, maxDamage: 13, ramp: 1, cooldown: 0.15, range: 14, team: { boost: 0.1, self: 0.5 }, ghostMult: 2, hidden: true },
      { name: 'Long Stream', desc: 'Damage 13 → 15, faster, more range.', cost: 8500, damage: 15, maxDamage: 15, ramp: 1, cooldown: 0.125, range: 16, team: { boost: 0.1, self: 0.5 }, ghostMult: 2, hidden: true },
      { name: 'Overload Pack', desc: 'Damage 15 → 19, faster.', cost: 15000, damage: 19, maxDamage: 19, ramp: 1, cooldown: 0.1, range: 16, team: { boost: 0.1, self: 0.5 }, ghostMult: 2, hidden: true },
      { name: 'Total Protonic Reversal', desc: 'Damage 19 → 25, faster.', cost: 25000, damage: 25, maxDamage: 25, ramp: 1, cooldown: 0.075, range: 16, team: { boost: 0.1, self: 0.5 }, ghostMult: 2, hidden: true },
    ],
  },
  // Gift Elf (alternate Elf form): lobbed presents that burst on a small area. From Lv 1 they
  // reveal hidden zombies in the blast for `reveal` s; from Lv 3 they stun the zombie they land on.
  giftElf: {
    name: 'Gift Elf',
    altOf: 'elf',
    form: 'Gift Elf',
    shards: 1,
    price: 0,
    cost: 350,
    limit: 10,
    lob: 0.8,
    blurb: 'An alternate Elf: a cheap early support tower that throws gifts. From Lv 1 its gifts reveal hidden zombies, it sees hidden zombies itself from Lv 2, and from Lv 3 its gifts stun the zombie they land on. Great value early, but it falls off in the mid and late game.',
    tip: 'Its revealing gifts let your other towers hit hidden zombies too.',
    levels: [
      { name: 'Gift Elf', desc: 'Throws gifts that burst on a small area.', damage: 12, cooldown: 3, range: 8, radius: 3, hidden: false },
      { name: 'Wrapping Paper', desc: 'Damage 12 → 15, more range, and gifts reveal hidden zombies for 3s.', cost: 500, damage: 15, cooldown: 3, range: 9, radius: 3, reveal: 3, hidden: false },
      { name: 'Naughty List', desc: 'Damage 15 → 21, faster, and hidden detection.', cost: 1200, damage: 21, cooldown: 2.75, range: 9, radius: 3, reveal: 3, hidden: true },
      { name: 'Stun Presents', desc: 'Damage 21 → 33, more range, and gifts stun the zombie they land on (0.5s).', cost: 2000, damage: 33, cooldown: 2.75, range: 12, radius: 3, reveal: 3, stun: 0.5, stunTargets: 1, hidden: true },
      { name: 'Big Sack', desc: 'Damage 33 → 45, faster, more range, 0.75s stuns.', cost: 3250, damage: 45, cooldown: 2.5, range: 13, radius: 3, reveal: 3, stun: 0.75, stunTargets: 1, hidden: true },
    ],
  },
  // Stormwing (event tower): a plane circling its pad, shooting and (Lv 1+) bombing. Expanded Scope
  // makes the circle `scope` times as big; Wrong Direction flies it the other way round.
  stormwing: {
    name: 'Stormwing',
    event: 'Event gift reward',
    lead: 3,
    cost: 650,
    limit: 6,
    placement: 'any',
    orbit: 10,
    lap: 7,
    blurb: 'A plane that circles its landing pad, firing at the zombies under it. From Lv 1 it drops bombs too. Expanded Scope makes its circle bigger, and Wrong Direction flips which way it flies, so it can hover over a horde or sweep back through it. Strong early and mid game, but fairly weak if you don\'t use its abilities.',
    tip: 'Keep flipping Wrong Direction so it stays over the horde, and resize the circle to catch extra hits.',
    levels: [
      { name: 'Stormwing', desc: 'Circles its pad, firing at zombies under it.', damage: 3, cooldown: 0.2, range: 6, scope: 1.6, hidden: false, abilities: [SCOPE_AB, WRONG_WAY_AB] },
      { name: 'Bomb Bay', desc: 'Damage 3 → 4, faster, and 12-damage bombs.', cost: 700, damage: 4, cooldown: 0.175, range: 6, scope: 1.6, bomb: { damage: 12, count: 1, every: 2, radius: 3 }, hidden: false, abilities: [SCOPE_AB, WRONG_WAY_AB] },
      { name: 'Storm Radar', desc: 'Damage 4 → 7, more range, 20-damage bombs, and hidden detection.', cost: 1800, damage: 7, cooldown: 0.175, range: 6.5, scope: 1.6, bomb: { damage: 20, count: 1, every: 2, radius: 3 }, hidden: true, abilities: [SCOPE_AB, WRONG_WAY_AB] },
      { name: 'Twin Bombs', desc: 'Damage 7 → 12, faster, two 45-damage bombs.', cost: 5800, damage: 12, cooldown: 0.15, range: 6.5, scope: 1.6, bomb: { damage: 45, count: 2, every: 2, radius: 3.5 }, hidden: true, abilities: [SCOPE_AB, WRONG_WAY_AB] },
      { name: 'Thunderhead', desc: 'Damage 12 → 19, much faster, more range, two 75-damage bombs.', cost: 14000, damage: 19, cooldown: 0.11, range: 6.75, scope: 1.6, bomb: { damage: 75, count: 2, every: 2, radius: 3.5 }, hidden: true, abilities: [SCOPE_AB, WRONG_WAY_AB] },
    ],
  },
  // Punkbuster (alternate Graveyard form): throws summons onto the path nearest it (or where Redeploy
  // sends them). It can only have as many of each out as it throws at once (`max`). Lv 3+ summons
  // reveal hidden zombies near where they land.
  punkbuster: {
    name: 'Punkbuster',
    altOf: 'graveyard',
    form: 'Punkbuster',
    shards: 1,
    price: 0,
    cost: 800,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 60,
    throwNear: true,
    blurb: 'An alternate Graveyard that throws fighters onto the path near it: Fraggers first, then Boogiemen, Rocketeers and finally the Nucleus, which blows up for huge damage. It can only keep as many of each out as it throws at once. From Lv 3 its summons reveal hidden zombies where they land. Very strong early; the top upgrade is very expensive.',
    tip: 'Use Redeploy to throw its summons right where the trouble is.',
    levels: [
      { name: 'Punkbuster', desc: 'Throws a Fragger every 60s (keeps 1 out).', hidden: false, unit: PUNK.fragger(1), abilities: [REDEPLOY_PUNK_AB] },
      { name: 'Double Trouble', desc: '2 Fraggers every 50s.', cost: 2050, hidden: false, spawnEvery: 50, unit: PUNK.fragger(2), abilities: [REDEPLOY_PUNK_AB] },
      { name: 'Boogieman', desc: 'Also throws a Boogieman every 60s.', cost: 8500, hidden: false, spawnEvery: 50, unit: PUNK.fragger(2), unit2: PUNK.boogie(1), spawnEvery2: 60, abilities: [REDEPLOY_PUNK_AB] },
      { name: 'Rocketeers', desc: 'Also throws a Rocketeer every 75s, and summons reveal hidden zombies where they land.', cost: 30500, hidden: false, spawnEvery: 50, unit: { ...PUNK.fragger(2), reveal: PUNK_REVEAL },
        unit2: PUNK.boogie(1, PUNK_REVEAL), spawnEvery2: 60, unit3: PUNK.rocketeer(1, PUNK_REVEAL), spawnEvery3: 75, abilities: [REDEPLOY_PUNK_AB] },
      { name: 'Nucleus', desc: '2 Boogiemen and 2 Rocketeers at a time, plus the Nucleus every 150s, which blows up for 24,000 damage.', cost: 125000, hidden: false, spawnEvery: 50, unit: { ...PUNK.fragger(2), reveal: PUNK_REVEAL },
        unit2: PUNK.boogie(2, PUNK_REVEAL), spawnEvery2: 60, unit3: PUNK.rocketeer(2, PUNK_REVEAL), spawnEvery3: 75, unit4: PUNK.nucleus(PUNK_REVEAL), spawnEvery4: 150, abilities: [REDEPLOY_PUNK_AB] },
    ],
  },
  // Borealis (alternate Elf Camp form, water): an ice carrier whose planes fly down the path from
  // its waypoint. Not used by the game yet (kept for later): Sleigh `healTowers` (should heal towers it flies over).
  borealis: {
    name: 'Borealis',
    altOf: 'elfCamp',
    form: 'Borealis',
    shards: 1,
    price: 0,
    cost: 11000,
    limit: 2,
    placement: 'water',
    kind: 'spawner',
    spawnEvery: 15,
    noBuff: true,
    blurb: 'An alternate Elf Camp: an aircraft carrier made of ice. Its planes fly down the path from a waypoint you set, dealing big damage along the way. Later it adds Sleighs that stun zombies and the Festive Fortress, which drops tanky Festive Tanks to catch leaks. Weak against bosses, and expensive. Water only.',
    tip: 'Set the waypoint so its planes cover as much path as possible.',
    levels: [
      { name: 'Borealis', desc: 'A Breeze every 15s (150 DPS).', hidden: false, unit: BOREAL.breeze, abilities: [DROP_POINT_AB] },
      { name: 'Ornaments', desc: 'Adds an Ornament every 20s (200-damage blasts).', cost: 12000, hidden: false, unit: BOREAL.breeze, unit2: BOREAL.ornament, spawnEvery2: 20, abilities: [DROP_POINT_AB] },
      { name: 'Northwinds', desc: 'Breezes become Northwinds (312 DPS).', cost: 20000, hidden: false, unit: BOREAL.northwind, unit2: BOREAL.ornament, spawnEvery2: 20, abilities: [DROP_POINT_AB] },
      { name: 'Sleighs', desc: 'Faster planes, and a Sleigh every 25s that bombs and stuns zombies.', cost: 35000, hidden: false, spawnEvery: 12, unit: BOREAL.northwind, unit2: BOREAL.ornament, spawnEvery2: 17,
        unit3: BOREAL.sleigh, spawnEvery3: 25, abilities: [DROP_POINT_AB] },
      { name: 'Festive Fortress', desc: 'Adds the Festive Fortress every 30s (942 DPS), which drops Festive Tanks (1,550 HP) to catch leaks.', cost: 105000, hidden: false, unit: BOREAL.northwind, unit2: BOREAL.ornament, spawnEvery2: 20,
        unit3: BOREAL.sleigh, spawnEvery3: 25, unit4: BOREAL.fortress, spawnEvery4: 30, abilities: [DROP_POINT_AB] },
    ],
  },
  // Wave 8: crosspath alternate forms (Slinger, Crossbower, ... Surveyor) and the Cyberblade. See crosstowers.js.
  ...CROSS_TOWERS,
  // Wave 9: hero towers (Wizard, Chef, ... Balloon Pal, Buzzer, Nuki Launcher, Hayes). See herotowers.js.
  ...HERO_TOWERS,
  // Wave 10: Scarecrow / Knifer / Barracks reworks and new parents (Paralyzer, Helicopter, Slugger,
  // Doctor, Engineer, Void Traitor) plus new towers. See tenthtowers.js.
  ...TENTH_TOWERS,
  // Good as gold: golden Samurai, Mercenary, Focus, Outlaw, Buccaneer, Enforcement Base, Submerge,
  // Commando and Orbit, plus the Gold Commander. See goldtowers.js.
  ...GOLD_TOWERS,
};

/**
 * Range pass (2026-11-10): the whole cast reaches 33% farther than the numbers written in the
 * tables above. Every distance a tower (or anything it sends out: units, sentries, drones,
 * medics, abilities) reaches with is scaled here, once, so the tables keep their original values:
 * `range`, `aura` (support towers), `buildRange` (Engineer), `beamRange` (Doctor), `patrol`
 * (helicopters) and `orbit` (planes). Left alone: blast `radius`, `minRange` dead zones,
 * `meleeRange` / `closeRange` / `coolRange` (inner zones), and anything under 2, which is a
 * range *multiplier* (ability `range: 1.2`, DJ `tracks.range: 0.15`), not a distance. Zombies
 * (ENEMIES) keep their own ranges.
 */
export const RANGE_BOOST = 1.33;
const REACH_KEYS = new Set(['range', 'aura', 'buildRange', 'beamRange', 'patrol', 'orbit']);
(function boostReach(o, seen) {
  if (!o || typeof o !== 'object' || seen.has(o)) return; // shared objects (units, sentries) are scaled once
  seen.add(o);
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === 'number') {
      if (REACH_KEYS.has(k) && Number.isFinite(v) && v >= 2) o[k] = Math.round(v * RANGE_BOOST * 10) / 10;
    } else boostReach(v, seen);
  }
})(TOWERS, new Set());

/**
 * Balance pass (2026-11-10): towers that were far stronger or weaker than their cost says, measured
 * by benching every tower at every level and by letting each one play Hard alone. Like the range
 * pass above it is applied here, once, on top of the tables, so the tables keep the numbers they
 * were written with. Keyed by tower; an entry also covers that tower's other upgrade paths unless
 * a path has its own entry (`johnBottom`).
 *   dmg:  every damage number of the tower and of what it sends out (shots, burns, blasts, unit
 *         and sentry guns, damaging abilities) is multiplied by this. An array is per level.
 *   hp:   health of what it sends out (units, sentries) is multiplied by this.
 *   cost: placing it and every upgrade cost this much more / less.
 *   from: only levels from this one on, and only this path (1 = the levels a path has to itself).
 * Left alone on purpose: a Mako's stored charged hit, the damage a Spiritual Advocate needs per
 * soul, heals, the Slinger's team boost, and what abilities cost to use.
 * Upgrade descriptions and blurbs that quote a number were rewritten by hand to say the number
 * the game ends up with, so change them along with an entry. Ability descriptions follow on
 * their own: the pass swaps the numbers it changes into the ability's text.
 */
export const TOWER_TUNE = {
  // --- Too strong for their cost ---
  sentryEngineer: { dmg: [0.18, 0.1, 0.1, 0.2, 0.27] },
  toxicnatorMaitake: { dmg: 0.25 },
  gooGunner: { dmg: 0.38 },
  frostBlaster: { dmg: 0.4, from: 1 }, // top path (Cryo Blaster)
  voidKing: { dmg: 0.33 },
  sledger: { dmg: 0.4 },
  sledgerIce: { dmg: 0.33 },
  executioner: { dmg: 0.4 },
  traitor: { dmg: 0.38 },
  voidTraitor: { dmg: 0.5 },
  spiritAdvocate: { dmg: 0.55 },
  biologist: { dmg: 0.42 },
  jester: { dmg: 0.45 },
  goldPyromancer: { dmg: 0.42 },
  flamethrowerPyro: { dmg: 0.55 },
  flamethrowerDumpster: { dmg: 0.5 },
  flameTrooper: { dmg: 0.75 },
  enforcerSlammer: { dmg: 0.5 },
  kniferYasuke: { dmg: 0.6 },
  gladiator: { dmg: 0.55 },
  brawler: { dmg: 0.5 },
  brawlerMako: { dmg: 0.6 },
  goldMako: { dmg: 0.52 },
  johnBottom: { dmg: 0.55, from: 1 },
  grenadierSoda: { dmg: 0.75 },
  slugger: { dmg: 0.4 },
  nukiLauncher: { dmg: 0.4, hp: 0.5 },
  cryomancer: { dmg: 0.6 },
  turretXwmBottom: { dmg: 0.6, from: 1 },
  barracksOddport: { dmg: 0.3, hp: 0.35 },
  elfCamp: { dmg: 0.4, hp: 0.4 },
  zedKart: { dmg: 0.45, hp: 0.45 },
  plasmaPulse: { dmg: 0.6 },
  // --- Too weak for their cost ---
  sniper: { dmg: 1.5 },
  tweeter: { dmg: 1.8 },
  sniperPenetrator: { dmg: 1.5 },
  hiredGun: { dmg: 1.8 },
  goldHiredGun: { dmg: 1.4 },
  scoutSlinger: { dmg: 3 },
  mercLaser: { dmg: 1.8, from: 1 }, // top path
  focus: { dmg: 1.4 },
  railgunnerElectricizer: { dmg: 1.4 },
  shotgunner: { dmg: 1.4 },
  shotgunnerPump: { dmg: 1.9 },
  splash: { dmg: 3 },
  trapperGoblino: { dmg: 3 },
  swarmer: { dmg: 1.4 },
  grenadier: { dmg: 1.7 },
  grenadierAssaultBottom: { dmg: 1.8, from: 1 },
  rocketeer: { dmg: 2 },
  archer: { dmg: 1.6 },
  elf: { dmg: 1.8 },
  snowballer: { dmg: 3 },
  aviator: { dmg: 2 },
  mineLayer: { dmg: 2.5, from: 1 }, // top path
  frostRangerBottom: { dmg: 1.8, from: 1 },
  necromancer: { dmg: 1.4 },
  raider: { dmg: 1.8 },
  submerge: { dmg: 1.8 },
  goldSubmerge: { dmg: 1.8 },
  goldOrbit: { dmg: 1.8 },
  goldMobsterBottom: { dmg: 1.4, from: 1 },
  enforcementBase: { dmg: 1.3, hp: 1.2 },
  voidPort: { dmg: 1.4, hp: 1.3 },
  barracks: { dmg: 2.5, hp: 2.5 },
  valkyr: { dmg: 2, hp: 1.8 },
  duckyNest: { dmg: 3, hp: 2.5 },
  punkbuster: { dmg: 3, hp: 3, cost: 0.7 },
  mercenary: { dmg: 3, hp: 2.5 },
  zedRecon: { dmg: 3, hp: 3, cost: 0.5 },
  // --- Cost more than any game pays ---
  goldWarship: { cost: 0.3, dmg: 0.4 },
  goldWarshipBottom: { cost: 0.2, dmg: 0.12, from: 1 },
};
const TUNE_DMG_KEYS = new Set(['damage', 'dps', 'burn', 'chillDps', 'dDmg', 'maxDamage', 'nearDmg', 'pulseDamage', 'unitDamage', 'bump', 'dmgMin']);
const tuneNum = (v, m) => {
  const x = v * m;
  if (x >= 1000) return Number(x.toPrecision(3));
  if (x >= 100) return Math.round(x / 5) * 5;
  return x >= 10 ? Math.round(x) : Math.round(x * 10) / 10;
};
const tuneCost = (v, m) => {
  const x = v * m;
  const step = x >= 100000 ? 5000 : x >= 10000 ? 500 : x >= 1000 ? 50 : 5;
  return Math.round(x / step) * step;
};
(function tuneTowers() {
  // Which entry covers a level: a path's own entry from its `from` level on; below that (and on
  // paths without an entry) the tower's whole-tower entry, if it has one.
  const entryOf = (type, i) => {
    const own = TOWER_TUNE[type];
    if (own && i >= (own.from ?? 0)) return own;
    const root = TOWER_TUNE[TOWERS[type].branchOf ?? type];
    return root && root.from == null ? root : null;
  };
  // Anything two entries (or a tuned and an untuned tower) both use is left alone, so tuning one
  // tower never moves another: e.g. the goons both Golden Mobster paths call in.
  const user = new Map();
  const shared = new Set();
  const claim = (o, tn, seen) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (!user.has(o)) user.set(o, tn);
    else if (user.get(o) !== tn) shared.add(o);
    for (const v of Object.values(o)) claim(v, tn, seen);
  };
  for (const [type, def] of Object.entries(TOWERS)) def.levels.forEach((s, i) => claim(s, entryOf(type, i), new Set()));
  const seen = new Set(); // things a tower uses at several levels are scaled once
  // `in_`: the key `o` sits under. Three keys are damage only in some places: an axe's `ramp` is
  // damage per bounce (elsewhere it's a time), `splash` is the damage to the zombies around the one
  // hit (on a unit's gun it's a radius), and a `damages` list is all damage numbers.
  // `said`: the ability (or other described thing inside a level) `o` belongs to. Its description is
  // often built from its numbers when the table is made, so the numbers that change here are noted
  // and swapped in its text afterwards. (A level's own description is written by hand, to match.)
  const told = new Map(); // described thing -> Map(old number -> new number, or null if two disagree)
  const scale = (o, dmg, hp, deep, in_ = '', said = null) => {
    if (!o || typeof o !== 'object' || seen.has(o) || shared.has(o)) return;
    seen.add(o);
    if (deep && typeof o.desc === 'string') said = o;
    const set = (k, n) => {
      if (said && n !== o[k]) {
        const m = told.get(said) ?? told.set(said, new Map()).get(said);
        m.set(o[k], m.has(o[k]) && m.get(o[k]) !== n ? null : n);
      }
      o[k] = n;
    };
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v !== 'number') scale(v, dmg, hp, true, Array.isArray(o) ? in_ : k, said);
      else if (!(v > 0) || !Number.isFinite(v)) continue;
      else if ((TUNE_DMG_KEYS.has(k) || (k === 'ramp' && in_ === 'axe') || (k === 'splash' && in_ !== 'gun') || (in_ === 'damages' && Array.isArray(o))) && dmg !== 1) set(k, tuneNum(v, dmg));
      else if (k === 'hp' && deep && hp !== 1) set(k, tuneNum(v, hp));
    }
  };
  for (const [type, def] of Object.entries(TOWERS)) {
    const root = TOWER_TUNE[def.branchOf ?? type];
    if (root?.cost && def.cost) def.cost = tuneCost(def.cost, root.cost);
    def.levels.forEach((s, i) => {
      const tn = entryOf(type, i);
      if (!tn || seen.has(s) || shared.has(s)) return;
      if (tn.cost && s.cost) s.cost = tuneCost(s.cost, tn.cost);
      scale(s, Array.isArray(tn.dmg) ? tn.dmg[i] ?? 1 : tn.dmg ?? 1, tn.hp ?? 1, false);
    });
    // A crosspath tower's upgrade buttons hold their own copy of the level they lead to, and it is
    // that copy's price the game charges.
    for (const [to, next] of [[def.cross?.up, def.cross?.upNext], [def.cross?.down, def.cross?.downNext]]) {
      const i = next ? TOWERS[to].levels.length - 1 : 0;
      const tn = next && entryOf(to, i);
      if (!tn) continue;
      if (tn.cost && next.cost) next.cost = tuneCost(next.cost, tn.cost);
      scale(next, Array.isArray(tn.dmg) ? tn.dmg[i] ?? 1 : tn.dmg ?? 1, tn.hp ?? 1, false);
    }
  }
  for (const [o, nums] of told) {
    o.desc = o.desc.replace(/\d[\d,]*(?:\.\d+)?/g, (txt) => {
      const n = nums.get(Number(txt.replace(/,/g, '')));
      return n == null ? txt : n >= 1000 ? n.toLocaleString('en-US') : String(n);
    });
  }
})();

/**
 * Crosspath towers (see crosstowers.js): what the next upgrade on `path` ('top' / 'bottom') of
 * a tower of `type` would be: { type, next } (`next` is the new level, with the upgrade's own
 * name, desc, cost, tier, path and stack), or null if that path is maxed or blocked.
 */
export function crossNext(type, path) {
  const c = TOWERS[type]?.cross;
  if (!c) return null;
  const bottom = path === 'bottom';
  const to = bottom ? c.down : c.up;
  return to ? { type: to, next: bottom ? c.downNext : c.upNext } : null;
}

/**
 * Upgrades with `stack` (most tier-5 upgrades, Businessman X-3 / X-4) cost `stack` more for
 * every tower in the match (any player's) of the same tower that already has that tier on that path.
 */
export function crossStackMult(towers, t, nx) {
  const st = nx?.next?.stack;
  if (!st) return 1;
  const root = rootType(t.type);
  const top = nx.next.path === 'Top';
  let n = 0;
  for (const o of towers) {
    if (o === t || o.holo || rootType(o.type) !== root) continue;
    const c = TOWERS[o.type].cross;
    if (c && (top ? c.a : c.b) >= nx.next.tier) n++;
  }
  return 1 + st * n;
}

/** What Hologram Tower ability `ab` costs to clone tower `src` (a share of its total cost). */
export const cloneCost = (ab, src) => Math.round(ab.clone * src.spent);

/** A spawner level's extra units on their own timers: [{ n, unit, every }] for unit2, unit3, unit4. */
export const spawnExtras = (s) => [2, 3, 4, 5, 6].filter((n) => s[`unit${n}`]).map((n) => ({ n, unit: s[`unit${n}`], every: s[`spawnEvery${n}`] }));

/** Placement limit of `def` with `players` on the team (`teamLimit` lowers it in bigger teams). */
export const towerLimit = (def, players = 1) =>
  def.teamLimit ? def.teamLimit[Math.max(0, Math.min(players, def.teamLimit.length) - 1)] : def.limit;

/** The tower a branch (upgrade path) belongs to, e.g. 'pursuitBottom' -> 'pursuit'. */
export const rootType = (type) => TOWERS[type]?.branchOf ?? type;

/**
 * What tower `type` at `level` can hit: { hidden, flying, lead } (Aviator spy rings that lend
 * hidden detection are added by the sim). Spawners report what their unit can hit.
 */
export function detection(type, level) {
  const def = typeof type === 'string' ? TOWERS[type] : type; // a type key or the def itself
  const s = def.levels[level];
  if (def.kind === 'spawner') {
    if (!s.roster && !s.unit2 && !s.plants && !s.drawings) return unitDetection(s.unit);
    // Mercenary Base / Armored Factory / Field Barracks: everything any of its units can hit.
    const d = { hidden: false, flying: false, lead: false };
    const units = s.roster ? s.roster.map((r) => r.unit) : s.plants ? s.plants.map((p) => p.unit) : s.drawings ? s.drawings : [s.unit, ...spawnExtras(s).map((x) => x.unit)];
    for (const u of units) for (const [k, v] of Object.entries(unitDetection(u))) d[k] ||= v;
    return d;
  }
  const lead = s.lead ?? (typeof def.lead === 'number' ? level >= def.lead : !!def.lead);
  // ground: false = it only hits flying zombies (AA Turret).
  return { hidden: !!s.hidden, flying: s.flying ?? def.flying ?? true, lead, ground: s.ground ?? def.ground ?? true };
}

/** What a spawner / goon unit can hit with its guns. Soldiers on foot can shoot flyers; vehicles can't. */
export const unitDetection = (u) => ({ hidden: !!u.hidden, flying: u.flying ?? !!u.soldiers, lead: !!u.lead });

/** Can something with detection `d` hit zombie `e`? */
export const canHit = (d, e) => !(e.noTarget || (e.hidden && !d.hidden && !(e.revealT > 0)) || (e.flying && !d.flying) || (!e.flying && d.ground === false) || (e.lead && !d.lead));

/** Does this tower only shoot inside a cone facing where it was placed (Gatling Gun, Sentry)? */
export const facesCone = (def) => !!(def.fps || def.facing);

/** Base towers (not alternate forms or event towers), in shop/loadout order. */
export const BASE_TOWERS = Object.keys(TOWERS).filter((t) => !TOWERS[t].altOf && !TOWERS[t].branchOf && !TOWERS[t].goldOf && !TOWERS[t].event);

/** Event towers: only unlocked with the Konami code, shown in their own Loadout section. */
export const EVENT_TOWERS = Object.keys(TOWERS).filter((t) => TOWERS[t].event);

/** Towers every player owns without buying them. */
export const STARTER_TOWERS = BASE_TOWERS.filter((t) => !TOWERS[t].price && !TOWERS[t].shards && !TOWERS[t].gems);

/** Evolved towers (type keys). */
export const EVOLVED_TOWERS = Object.keys(TOWERS).filter((t) => TOWERS[t].evolved);

/**
 * Tower levels: towers earn XP while you use them. XP to go from tower level `lv` to `lv + 1`;
 * levels stop at `TOWER_MAX_LEVEL`. Evolved towers use the same curve for their evolution level.
 */
export const TOWER_MAX_LEVEL = 20;
export const xpToNext = (lv) => 20 + 10 * lv;

/** Which XP a tower type earns / uses: golden perks and Bottom paths count for the tower they belong to. */
export const xpKey = (type) => {
  const def = TOWERS[type];
  if (def?.goldOf) return xpKey(def.goldOf);
  return def?.branchOf ?? type;
};

/** Alternate forms of a base tower (type keys). */
export const formsOf = (base) => Object.keys(TOWERS).filter((t) => TOWERS[t].altOf === base);

/** The golden perk tower of a tower or form (type key), or null. */
export const goldOf = (type) => Object.keys(TOWERS).find((t) => TOWERS[t].goldOf === type) ?? null;

/** The tower family a type belongs to: its base tower (through forms, paths and golden versions). */
export const familyOf = (type) => {
  const def = TOWERS[type];
  if (def?.goldOf) return familyOf(def.goldOf);
  return def?.altOf ?? rootType(type);
};

/** DJ Booth tracks, by tower `track` index: which `tracks` boost each one plays. */
export const TRACKS = [
  { key: 'range', name: 'Purple', color: 0xb388ff, css: '#b388ff' },
  { key: 'discount', name: 'Green', color: 0x69f0ae, css: '#69f0ae' },
  { key: 'dmg', name: 'Red', color: 0xff5252, css: '#ff5252' },
];

/** The track a DJ Booth plays after `track` at level data `s` (Red needs `tracks.dmg`). */
export const nextTrack = (track, s) => {
  let n = ((track || 0) + 1) % TRACKS.length;
  while (!s.tracks?.[TRACKS[n].key]) n = (n + 1) % TRACKS.length;
  return n;
};

/** How much of track `key` a DJ Booth at level data `s`, playing `track`, gives right now. */
export const trackBoost = (s, track, key) => {
  const i = TRACKS.findIndex((k) => k.key === key);
  return (s.tracks?.[key] || 0) * ((track || 0) === i ? 1 : s.offTrack || 0);
};

// Insane mode (2026-11-09 spec) guesses: kill reward and base damage from an enemy's health.
const iR = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
const iD = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));
// Void mode: the same guessed reward / base damage curves as Insane.
const vR = iR;
const vD = iD;

export const ENEMIES = {
  normal: { name: 'Zombie', hp: 5, speed: 6, reward: 6, damage: 5, scale: 1, skin: 0x7fb069, shirt: 0x4a6fa5, pants: 0x3b3b5c },
  fast: { name: 'Runner', hp: 3, speed: 10, reward: 5, damage: 4, scale: 0.85, skin: 0x9ccc65, shirt: 0xe07b24, pants: 0x5a3a22 },
  slow: { name: 'Tank', hp: 22, speed: 3.5, reward: 15, damage: 12, scale: 1.3, skin: 0x55813f, shirt: 0x5d5d5d, pants: 0x333333, helmet: true },
  // Flyers soar over the path: ground units and traps can't touch them, and a few towers
  // (melee, Mortar, Trapper, Lv 1 Crook Boss) can't hit them.
  flying: { name: 'Flyer', hp: 6, speed: 7.5, reward: 9, damage: 6, scale: 0.9, skin: 0x8bc34a, shirt: 0x6d4c41, pants: 0x3e2723, flying: true, wings: 0x4e342e },
  // Lead Zombies wear lead armor: only towers with lead detection can hurt them.
  lead: { name: 'Lead Zombie', hp: 18, speed: 4.5, reward: 14, damage: 10, scale: 1.15, skin: 0x6d8b5a, shirt: 0x78909c, pants: 0x546e7a, lead: true },
  hidden: { name: 'Ghoul', hp: 8, speed: 6.5, reward: 12, damage: 8, scale: 1, skin: 0xa5c4ae, shirt: 0x22283a, pants: 0x111111, hidden: true, hood: true },
  // Androids are only ever sent by other players (Anarchist, or bought in Versus).
  android: { name: 'Android', hp: 30, speed: 5.5, reward: 10, damage: 10, scale: 1.1, skin: 0xb0bec5, shirt: 0x37474f, pants: 0x263238, robot: 0xff1744 },
  superbot: { name: 'Super Bot', hp: 80, speed: 6.5, reward: 20, damage: 18, scale: 1.25, skin: 0xffca28, shirt: 0x212121, pants: 0x111111, robot: 0x00e5ff },
  boss: { name: 'Brute', hp: 150, speed: 2.5, reward: 300, damage: 60, scale: 2.2, skin: 0x4e7d32, shirt: 0x6a1b9a, pants: 0x2a0f3a, boss: true },

  // ---------------------------------------------------------------- Easy mode creatures
  // model: which creature model the client builds (see makeEnemy in models.js); h: model height
  // before `scale`; skin: the color of the death puff (purple for everyone, blue for the King Slime).
  // hp is the base health; Easy's waves set each group's exact health (5th entry in EASY_WAVES).
  // speed is the spec's speed number x3.
  // Types: Fire (burnResist: burns and flames do that much less; frostWeak: frost and freeze do
  // that much more), Poison (poisonResist: poison and toxic gas do that much less).
  // summon: { type, n, every }: drops `n` of `type` behind it every `every` seconds.
  // cage: when destroyed, a random enemy from this list bursts out with `cageHp` of its health.
  // phase2: when killed, it comes back as this enemy with a fresh health pool.
  slime: { name: 'Slime', model: 'easySlime', h: 2.6, hp: 3, speed: 4.5, reward: 4, damage: 3, scale: 1, skin: 0x8e24aa, color: 0x9c4dcc },
  goblin: { name: 'Goblin', model: 'goblin', h: 5.2, hp: 10, speed: 5.4, reward: 7, damage: 6, scale: 0.75, skin: 0x8e24aa },
  spider: { name: 'Spider', model: 'spider', h: 1.8, hp: 17, speed: 18, reward: 9, damage: 6, scale: 0.9, skin: 0x8e24aa },
  ghost: { name: 'Ghost', model: 'ghost', h: 4, hp: 15, speed: 18, reward: 9, damage: 6, scale: 1, skin: 0x8e24aa, hidden: true },
  shroom: { name: 'Shroom', model: 'shroom', h: 3.6, hp: 40, speed: 6, reward: 16, damage: 12, scale: 1, skin: 0x8e24aa, poisonType: true, poisonResist: 0.5 },
  giantGoblin: { name: 'Giant Goblin', model: 'giantGoblin', h: 5.2, hp: 180, speed: 4.2, reward: 60, damage: 40, scale: 1.5, skin: 0x8e24aa },
  fireSlime: { name: 'Fire Slime', model: 'easySlime', h: 2.6, hp: 70, speed: 7.5, reward: 22, damage: 15, scale: 1.2, skin: 0x8e24aa, color: 0xff8f00,
    fireType: true, burnResist: 0.5, frostWeak: 0.5 },
  golem: { name: 'Golem', model: 'boulder', h: 4.2, hp: 70, speed: 3, reward: 22, damage: 15, scale: 1.1, skin: 0x8e24aa },
  reaper: { name: 'Reaper', model: 'reaper', h: 4.4, hp: 450, speed: 6, reward: 90, damage: 60, scale: 0.9, skin: 0x8e24aa, hidden: true },
  infernoSlime: { name: 'Inferno Slime', model: 'easySlime', h: 2.6, hp: 400, speed: 7.5, reward: 70, damage: 50, scale: 1.5, skin: 0x8e24aa, color: 0x1e88e5,
    fireType: true, burnResist: 0.5, frostWeak: 0.5 },
  // The King Slime: no ability, no element. Its death puff is blue.
  kingSlime: { name: 'King Slime', model: 'kingSlime', h: 3, hp: 10000, speed: 2.1, reward: 500, damage: 1000, scale: 3.4, skin: 0x1e88e5, color: 0x1e88e5, boss: true },

  // ---------------------------------------------------------------- Medium mode enemies
  // Medium (Intermediate) from the user's 2026-11-09 spec. Health is exact: Medium doesn't grow
  // enemy health per wave (DIFFICULTIES.medium.flatHp). speed = the spec's speed number x3.
  // Rewards, base damage and anything the spec didn't give are guesses.
  // mlook: which outfit mediumParts (models.js) gives it.
  // iceResist: frost, chill and freezing work that much less on it (1 = not at all).
  // stunImmune: can't be stunned or frozen (slows still work). collisionResist: unit crashes hurt it that much less.
  // multiply.copies / .speed / .noCash: each nearby enemy is copied `copies` times; copies move
  //   `speed` times faster and give no cash (and are never copied again).
  // blast.stun: when killed, stuns towers within `radius` for that long (Shocker).
  // mAttacks: timed attacks on towers (see Sim.mediumAttacks). first: seconds until the first one.
  //   slam { range, stun }: stuns every tower in range. jam { range, slow, time }: towers in range
  //   work `slow` slower. shot { range, pick: strongest|weakest|random, n, same, dmg, pct, near }:
  //   fires at `n` towers (same: n shots at one tower) for dmg + pct of the tower's max health;
  //   near [r, dmg]: towers within r of it take dmg instead. offensive: skips income towers.
  //   cleave { range, dmg }: hurts every tower in range. flame { range, arc, dps, time }: sprays
  //   fire ahead of it. toss { list, ahead, flight }: throws a grenade `ahead` studs down the path
  //   that spawns `list` ([type, n]) enemies there, worth no cash. phase: 2 = only after rage.
  // rage { at, heal, speed, shut, immune, intro }: once its health drops to `at`, it shuts down for
  //   `shut` s (towers get `immune` s of stun immunity), heals `heal`, moves at `speed` and starts
  //   its phase-2 attacks.
  zombiePlus: { name: 'Zombie+', hp: 12, speed: 8.4, reward: 3, damage: 5, scale: 1, skin: 0xf08a3c, shirt: 0x1c1c1c, pants: 0x121212, mlook: 'implants' },
  fastZombiePlus: { name: 'Fast Zombie+', hp: 12, speed: 13.2, reward: 3, damage: 4, scale: 0.85, skin: 0xf08a3c, shirt: 0x1c1c1c, pants: 0x121212, mlook: 'fast' },
  heavyZombiePlus: { name: 'Heavy Zombie+', hp: 35, speed: 7.5, reward: 6, damage: 10, scale: 1.3, skin: 0xf08a3c, shirt: 0x2b2b2b, pants: 0x1c1c1c, mlook: 'heavy', plate: 0x8a8f94 },
  revivedBoss1: { name: 'Revived Boss 1', hp: 295, speed: 7.2, reward: 30, damage: 30, scale: 1.6, skin: 0x2e5d2e, shirt: 0x263226, pants: 0x1b1f1b, mlook: 'revived' },
  multiplier1: { name: 'Multiplier 1', hp: 20, speed: 10.5, reward: 5, damage: 5, scale: 1, skin: 0xff9100, shirt: 0xff9100, pants: 0xff9100, mlook: 'mult', xColor: 0xff6d00,
    iceResist: 1, multiply: { radius: 10, max: 8, copies: 1, speed: 1.3, noCash: true },
    intro: '✖️ Multiplier! When it dies it copies the enemies around it (the copies are faster). Ice can\'t touch it.' },
  grenadier: { name: 'Grenadier', hp: 155, speed: 7.5, reward: 20, damage: 25, scale: 1.1, skin: 0xb5c99a, shirt: 0x161616, pants: 0x161616, mlook: 'grenadier',
    mAttacks: [{ toss: { list: [['zombiePlus', 1], ['fastZombiePlus', 2], ['heavyZombiePlus', 2]], ahead: 0, flight: 0.6 }, first: 1, every: 14 }],
    intro: '💣 Grenadier! Its grenades burst into more zombies.' },
  armoredHeavyZombiePlus: { name: 'Armored Heavy Zombie+', hp: 35, speed: 5.4, reward: 8, damage: 12, scale: 1.3, skin: 0x8b1e1e, shirt: 0x6d6d6d, pants: 0x555555, mlook: 'heavy', plate: 0x9ea4a8,
    bulletResist: 0.95, intro: '🛡️ Armored zombies! Bullets do 95% less to them. Use explosions, fire, melee and the like.' },
  superHeavyZombie: { name: 'Super Heavy Zombie', hp: 550, speed: 6, reward: 50, damage: 60, scale: 1.6, skin: 0xb5605a, shirt: 0x4e4e4e, pants: 0x3a3a3a, mlook: 'superHeavy',
    bulletResist: 0.9 },
  nuclearZombie: { name: 'Nuclear Zombie', hp: 225, speed: 11.4, reward: 20, damage: 25, scale: 1.05, skin: 0x76ff03, shirt: 0x33691e, pants: 0x263d14, mlook: 'nuclear',
    iceResist: 0.8 },
  revivedTitan: { name: 'Revived Titan', hp: 1475, speed: 5.7, reward: 120, damage: 120, scale: 2.2, skin: 0x1b1b1b, shirt: 0x5d0f0f, pants: 0x3d0a0a, mlook: 'titan',
    bulletResist: 0.92 },
  multiplier2: { name: 'Multiplier 2', hp: 100, speed: 7.8, reward: 12, damage: 10, scale: 1.1, skin: 0x2979ff, shirt: 0x2979ff, pants: 0x2979ff, mlook: 'mult', xColor: 0x00b0ff,
    iceResist: 1, multiply: { radius: 10, max: 10, copies: 2, speed: 1.3, noCash: true } },
  monster: { name: 'Monster', hp: 4200, speed: 6.6, reward: 250, damage: 200, scale: 2.4, skin: 0x8d9a8a, shirt: 0x5d5a52, pants: 0x4a463e, mlook: 'monster',
    noHeadshot: true, intro: '🧟 A Monster! Huge health, no resistances.' },
  infiltrator: { name: 'Infiltrator', hp: 850, speed: 24, reward: 50, damage: 60, scale: 1.05, skin: 0x9e9e7e, shirt: 0x616161, pants: 0x616161, mlook: 'infiltrator',
    explosiveResist: 0.85, intro: '🪖 Infiltrators! Extremely fast, and explosions do 85% less to them.' },
  chargerBoss: { name: 'Charger Boss', hp: 2400, speed: 19.8, reward: 120, damage: 150, scale: 1.8, skin: 0x3f6fd8, shirt: 0x1a237e, pants: 0x0d1452, mlook: 'charger',
    intro: '⚡ A Charger Boss! Tough and extremely fast.' },
  smasher: { name: 'Smasher', hp: 9000, speed: 6.6, reward: 400, damage: 300, scale: 2.6, skin: 0x1c1c1c, shirt: 0x5d0f0f, pants: 0x3d0a0a, mlook: 'smasher',
    mAttacks: [{ slam: { range: 10, stun: 3 }, first: 3, every: 37 }],
    intro: '👊 A Smasher! Its smash stuns every tower near it for 3s.' },
  shocker: { name: 'Shocker', hp: 325, speed: 9.6, reward: 25, damage: 25, scale: 1.1, skin: 0xb5c99a, shirt: 0x161616, pants: 0x161616, mlook: 'shocker',
    blast: { radius: 20, dmg: 0, stun: 5, color: 0x40c4ff }, intro: '⚡ Shockers! When one dies, its shockwave stuns towers for 5s.' },
  mPredator: { name: 'Predator', hp: 35000, speed: 7.8, reward: 1500, damage: 300, scale: 2.3, skin: 0x9ccc65, shirt: 0x1c1c1c, pants: 0x1a237e, mlook: 'predator',
    boss: true, stunImmune: true, collisionResist: 0.3,
    mAttacks: [
      { shot: { range: 15, pick: 'strongest', offensive: true, n: 1, dmg: 600, pct: 0.04, kind: 'laser', flight: 0 }, first: 11, every: 15, name: 'Decimation' },
      { shot: { range: 22, pick: 'weakest', n: 3, dmg: 100, near: [10, 250], kind: 'revolver', flight: 0 }, first: 5, every: 12 }],
    intro: '🦾 Miniboss: the PREDATOR! He shoots your towers and can destroy them.' },
  eliteGrenadier: { name: 'Elite Grenadier', hp: 825, speed: 7.5, reward: 60, damage: 80, scale: 1.2, skin: 0xb5c99a, shirt: 0x161616, pants: 0x161616, mlook: 'eliteGrenadier',
    mAttacks: [{ toss: { list: [['revivedBoss1', 2], ['revivedTitan', 1], ['shocker', 1]], ahead: 25, flight: 1.2 }, first: 4, every: 43 }],
    intro: '💣 Elite Grenadier! Its grenades land far down the path and burst into bosses.' },
  revivedAbomination: { name: 'Revived Abomination', hp: 6000, speed: 27, reward: 300, damage: 250, scale: 2.4, skin: 0x7d8a76, shirt: 0x5a5a5a, pants: 0x444444, mlook: 'abomination',
    intro: '☣️ A Revived Abomination! Very tough and VERY fast.' },
  mEradicator: { name: 'Eradicator', hp: 140000, speed: 7.2, reward: 0, damage: 1000, scale: 3.6, skin: 0x1a1a1a, shirt: 0x1a1a1a, pants: 0x141414, mlook: 'eradicator',
    boss: true, statusImmune: true, burnable: true, collisionResist: 0.3,
    mAttacks: [
      { slam: { range: 12, stun: 3, spin: true }, first: 3, every: 45, name: 'Spin Slash' },
      { jam: { range: 18, slow: 0.77, time: 6 }, first: 6, every: 50, name: 'Sword Shock' },
      { shot: { range: 30, pick: 'random', n: 12, dmg: 125, pct: 0.1, kind: 'missile', flight: 1.2 }, first: 15, every: 80, name: 'Rocket Barrage' },
      { shot: { range: 15, pick: 'strongest', n: 3, same: true, dmg: 475, pct: 0.1, kind: 'missile', flight: 0.8 }, first: 6, every: 30, name: 'Triple Rocket Burst' },
      { cleave: { range: 25, dmg: 60 }, first: 3, every: 20, phase: 2, name: 'Energy Cleave' },
      { flame: { range: 20, arc: 100, dps: 84, time: 4 }, first: 5, every: 40, phase: 2, name: 'Pyrotechnics' }],
    rage: { at: 85000, heal: 10000, speed: 8.1, shut: 3, immune: 5, intro: '😡 ELECTRONIC RAGE! The Eradicator healed and got faster, with a sword cleave and a flamethrower!' },
    intro: '⚔️ The ERADICATOR has arrived! Swords, rockets and shockwaves: guard your towers!' },
  // ---------------------------------------------------------------- Hard mode enemies (Fallen)
  // Hard ("Fallen") from the user's 2026-11-09 spec. Health is exact (DIFFICULTIES.hard.flatHp);
  // speed = the spec's speed number x3. Rewards, base damage and anything the spec didn't give are guesses.
  // flook: which outfit fallenParts (models.js) gives it. armor = the spec's defense (1 = 100%: only
  //   defense piercing gets through). bossFirst: the first one spawned in a game is a boss.
  // regen: heals this share of its max health per second (2% every 2 s = 0.01).
  // invuln: can't be hurt for this many seconds after it spawns (Breakers popping out).
  // gift { every, radius }: Fallen Jester gifts make nearby enemies Bloated or Blessed (not bosses or Jesters).
  // necroBurst { radius, slow, time, unitDmg, goo: { n, life, heal, every, r } }: Necrotic Skeleton death.
  // hideAt: turns hidden once its health drops to that share. charge { speed, time }: charges when it spawns.
  // slam.unitDmg: the slam also hurts units within its range. fallenKing / cashDrop: see Sim.fallenKing.
  abnormal: { name: 'Abnormal', hp: 8, speed: 10.5, reward: 3, damage: 2, scale: 1, skin: 0xb5d6a7, shirt: 0x6d4c41, pants: 0x4e342e, flook: 'veins', vein: 0x2e7d32 },
  quick: { name: 'Quick', hp: 10, speed: 19.5, reward: 3, damage: 2, scale: 0.9, skin: 0xb3d4e6, shirt: 0x6d4c41, pants: 0x4e342e, flook: 'veins', vein: 0x1565c0,
    intro: '💨 Quicks! Fast and fragile.' },
  fSkeleton: { name: 'Fallen Skeleton', hp: 50, speed: 12, reward: 5, damage: 4, scale: 1, skin: 0xe0cfa0, shirt: 0xe0cfa0, pants: 0xe0cfa0, face: 'fallenSkull', flook: 'skeleton' },
  fDreg: { name: 'Fallen Dreg', hp: 80, speed: 13.5, reward: 8, damage: 5, scale: 1.05, skin: 0x5c7a99, shirt: 0x607d8b, pants: 0x546e7a, flook: 'dreg',
    armor: 0.2, corpse: 'fCorpse', cageHp: 0.75, intro: '💀 Fallen Dregs leave a Corpse behind: 100% defense, only defense piercing hurts it. You don\'t have to break it.' },
  fCorpse: { name: 'Corpse', model: 'corpse', h: 1.4, hp: 80, speed: 0, reward: 2, damage: 0, scale: 1.1, skin: 0x263238, lava: 0x37474f,
    remains: true, decay: 30, armor: 1, stunImmune: true, fireImmune: true },
  fSquire: { name: 'Fallen Squire', hp: 500, speed: 7.5, reward: 40, damage: 20, scale: 1.4, skin: 0x1c1c1c, shirt: 0x4f7a8a, pants: 0x3e5f6b, face: 'fallen', flook: 'squire',
    armor: 0.5, bossFirst: true, intro: '🛡️ Miniboss: the Fallen Squire! 50% defense.' },
  breaker2: { name: 'Breaker2', hp: 100, speed: 13.5, reward: 6, damage: 5, scale: 1, skin: 0x9ccc65, shirt: 0x9ccc65, pants: 0x9ccc65, face: 'paper', flook: 'paper', figure: 0x1e88e5,
    deathSpawn: { list: ['breaker'], n: 1 }, intro: '📄 Breakers split into smaller Breakers when they die.' },
  breaker: { name: 'Breaker', hp: 50, speed: 16.05, reward: 3, damage: 3, scale: 0.85, skin: 0x64b5f6, shirt: 0x64b5f6, pants: 0x64b5f6, face: 'paper', flook: 'paper', figure: 0x0d47a1,
    invuln: 0.5 },
  fSoul: { name: 'Fallen Soul', hp: 150, speed: 12, reward: 10, damage: 6, scale: 1, skin: 0x1a237e, shirt: 0x1a237e, pants: 0x1a237e, face: 'fallenSkull', flook: 'soul',
    hidden: true, armor: 0.2, intro: '👻 Fallen Souls are hidden! You need hidden detection.' },
  fallen: { name: 'Fallen', hp: 300, speed: 22.5, reward: 15, damage: 8, scale: 1, skin: 0xd7dde0, shirt: 0x26c6da, pants: 0x37474f, flook: 'fallen',
    intro: '🏃 The Fallen: very fast!' },
  fGiant: { name: 'Fallen Giant', hp: 4000, speed: 6, reward: 150, damage: 60, scale: 2.6, skin: 0x161616, shirt: 0xeceff1, pants: 0x212121, face: 'fallen', flook: 'giant',
    stunImmune: true, bossFirst: true, intro: '🗿 Boss: the Fallen Giant! It can\'t be stunned.' },
  fHazmat: { name: 'Fallen Hazmat', hp: 400, speed: 10.5, reward: 25, damage: 12, scale: 1.15, skin: 0x161616, shirt: 0x607d8b, pants: 0x455a64, face: 'fallen', flook: 'hazmat',
    armor: 0.6, fireImmune: true, stunImmune: true, intro: '☢️ Fallen Hazmats: 60% defense, and they can\'t be burned, stunned or frozen.' },
  fPossessed: { name: 'Possessed Armor', hp: 750, speed: 10.5, reward: 30, damage: 20, scale: 1.4, skin: 0x0d0d0d, shirt: 0x90a4ae, pants: 0x78909c, face: 'fallen', flook: 'possessed',
    armor: 0.5, shield: true, phase2: 'fPossessedGhost', intro: '🛡️ Possessed Armor: when its shield breaks the ghost inside gets faster and turns hidden!' },
  fPossessedGhost: { name: 'Possessed Armor (ghost)', hp: 1500, speed: 16.5, reward: 50, damage: 20, scale: 1.3, skin: 0x0d0d0d, shirt: 0x0d0d0d, pants: 0x0d0d0d, face: 'fallen', flook: 'ghost',
    hidden: true },
  fNecro: { name: 'Fallen Necromancer', hp: 3000, speed: 6, reward: 150, damage: 50, scale: 1.5, skin: 0x9e9e9e, shirt: 0x616161, pants: 0x424242, face: 'fallen', flook: 'necro',
    stunImmune: true, summon: { type: 'fSkeleton', n: 8, every: 10 }, intro: '💀 Fallen Necromancer! Every 10s it summons 8 Fallen Skeletons.' },
  fCorrupted: { name: 'Corrupted Fallen', hp: 1200, speed: 22.5, reward: 60, damage: 25, scale: 1.05, skin: 0x161616, shirt: 0x263238, pants: 0x1c1c1c, face: 'fallen', flook: 'corrupted',
    regen: 0.01, intro: '🩸 Corrupted Fallen: fast, and they heal 2% of their health every 2s.' },
  fSeraph: { name: 'Fallen Seraph', hp: 250, speed: 13.5, reward: 15, damage: 8, scale: 1, skin: 0x3f6fd8, shirt: 0x1a237e, pants: 0x0d1452, flook: 'seraph', flying: true, wings: 0x0d1452,
    intro: '🪽 Fallen Seraphs fly! Only towers that hit flyers can reach them.' },
  fJester: { name: 'Fallen Jester', hp: 10000, speed: 9, reward: 400, damage: 100, scale: 1.6, skin: 0x161616, shirt: 0x0d47a1, pants: 0x111111, face: 'fallen', flook: 'jester',
    boss: true, gift: { every: 7.5, radius: 5, bloated: 1.5, blessed: 0.25 },
    intro: '🎁 Boss: the Fallen Jester! Its gifts make nearby enemies Bloated (more health) or Blessed (more defense).' },
  fNecrotic: { name: 'Necrotic Skeleton', hp: 1400, speed: 18, reward: 60, damage: 25, scale: 1.15, skin: 0xe0cfa0, shirt: 0x78909c, pants: 0xe0cfa0, face: 'fallenSkull', flook: 'necrotic',
    necroBurst: { radius: 15, slow: 0.35, time: 3, unitDmg: 40, goo: { n: 4, life: 15, heal: 60, every: 0.5, r: 2.5 } },
    intro: '🦴 Necrotic Skeletons! When one dies, nearby towers fire slower for 3s and its goo heals enemies.' },
  breaker4: { name: 'Breaker4', hp: 320, speed: 9, reward: 15, damage: 10, scale: 1.25, skin: 0x8e24aa, shirt: 0x8e24aa, pants: 0x8e24aa, face: 'paper', flook: 'paper', figure: 0xe53935,
    armor: 0.35, deathSpawn: { list: ['breaker3'], n: 3 }, intro: '📄 Breaker4s split into 3 Breaker3s, which split again!' },
  breaker3: { name: 'Breaker3', hp: 160, speed: 12, reward: 8, damage: 6, scale: 1.1, skin: 0xff7043, shirt: 0xff7043, pants: 0xff7043, face: 'paper', flook: 'paper', figure: 0x43a047,
    armor: 0.2, deathSpawn: { list: ['breaker2'], n: 1 } },
  fRusher: { name: 'Fallen Rusher', hp: 800, speed: 36, reward: 40, damage: 25, scale: 1.2, skin: 0x161616, shirt: 0x37474f, pants: 0x263238, face: 'fallen', flook: 'rusher',
    armor: 0.8, shield: true, phase2: 'fRusherBroken', intro: '💨 Fallen Rushers: VERY fast with 80% defense until their shield breaks.' },
  fRusherBroken: { name: 'Fallen Rusher', hp: 900, speed: 18, reward: 40, damage: 25, scale: 1.2, skin: 0x161616, shirt: 0x37474f, pants: 0x263238, face: 'fallen', flook: 'rusherBroken' },
  fHero: { name: 'Fallen Hero', hp: 3500, speed: 13.5, reward: 150, damage: 50, scale: 1.3, skin: 0x161616, shirt: 0x607d8b, pants: 0x455a64, face: 'fallen', flook: 'hero',
    armor: 0.3, stunImmune: true, intro: '👑 Fallen Heroes: 30% defense, and they can\'t be stunned.' },
  fShield: { name: 'Fallen Shield', hp: 5000, speed: 4.5, reward: 300, damage: 150, scale: 2.4, skin: 0x161616, shirt: 0x26535a, pants: 0x1c3c42, face: 'fallen', flook: 'shieldKnight',
    armor: 0.5, stunImmune: true, bossFirst: true, shield: true, phase2: 'fShieldBroken',
    intro: '🛡️ Boss: the Fallen Shield! When its shield breaks, it charges!' },
  fShieldBroken: { name: 'Fallen Shield', hp: 15000, speed: 4.5, reward: 700, damage: 150, scale: 2.4, skin: 0x161616, shirt: 0x26535a, pants: 0x1c3c42, face: 'fallen', flook: 'shieldBroken',
    armor: 0.5, stunImmune: true, charge: { speed: 18, time: 4 } },
  fSummoner: { name: 'Fallen Summoner', hp: 12500, speed: 4.5, reward: 600, damage: 150, scale: 1.7, skin: 0x161616, shirt: 0x111111, pants: 0x111111, face: 'fallen', flook: 'summoner',
    stunImmune: true, summon: { type: 'fNecrotic', n: 3, every: 20 }, hideAt: 0.5,
    intro: '🔮 The Fallen Summoner! It summons Necrotic Skeletons and turns hidden at half health.' },
  fAngel: { name: 'Fallen Angel', hp: 5000, speed: 9, reward: 250, damage: 80, scale: 1.6, skin: 0x161616, shirt: 0x1565c0, pants: 0x0d47a1, face: 'fallen', flook: 'angel', flying: true, wings: 0x111111,
    regen: 0.01, bossFirst: true, intro: '😇 Boss: the Fallen Angel! It flies and heals 2% every 2s.' },
  fHonorGuard: { name: 'Fallen Honor Guard', hp: 100000, speed: 2.7, reward: 5000, damage: 1000, scale: 3.2, skin: 0x0d0d0d, shirt: 0x26535a, pants: 0x1c3c42, face: 'fallen', flook: 'honorGuard',
    boss: true, stunImmune: true,
    mAttacks: [{ slam: { range: 6, stun: 6, unitDmg: 250, color: 0x00e5ff }, first: 8, every: 15, name: 'Flail Smash' }],
    trail: { every: 2, radius: 3, life: 360, speed: 0.1, color: 0x00838f },
    intro: '⛓️ Boss: the Fallen Honor Guard! Its flails stun towers for 6s, and its goo trail speeds enemies up.' },
  fTank: { name: 'Fallen Tank', hp: 22500, speed: 22.5, reward: 800, damage: 200, scale: 1.9, skin: 0x78909c, shirt: 0x607d8b, pants: 0x546e7a, face: 'helm', flook: 'tank',
    intro: '🚚 The Fallen Tank: huge health AND very fast!' },
  fGuardian: { name: 'Fallen Guardian', hp: 45000, speed: 6, reward: 1500, damage: 400, scale: 2.2, skin: 0x161616, shirt: 0x1565c0, pants: 0x0d47a1, face: 'fallen', flook: 'guardian',
    armor: 0.3, stunImmune: true,
    mAttacks: [{ slam: { range: 8, stun: 3, unitDmg: 150, color: 0xb388ff }, first: 5, every: 10, name: 'Guardian Slash' }],
    intro: '⚔️ The Fallen Guardian! Its slash stuns towers for 3s.' },
  fKing: { name: 'Fallen King', hp: 250000, speed: 4.2, reward: 0, damage: 100000, scale: 3.6, skin: 0x161616, shirt: 0x9e9e9e, pants: 0x616161, face: 'fallenKing', flook: 'king',
    boss: true, stunImmune: true,
    summon: { type: 'fNecrotic', n: 5, every: 45 },
    fallenKing: {
      horde: { at: 0.5, n: 40, list: ['fPossessed', 'fCorrupted', 'fHero', 'fGiant', 'fNecro'] },
      swing: { every: 25, first: 10, range: 18, gap: 0.7, arcs: [120, 240, 360], stun: 6, unitDmg: 100 },
      comet: { every: 45, first: 30, stun: 5, unitDmg: 50 },
      bone: { loss: 0.2, add: 0.15, max: 0.6 },
    },
    cashDrop: { pct: 0.05, cash: 10000 },
    intro: '👑 FINAL BOSS: THE FALLEN KING! Sword swings and comets stun your towers. He drops $10,000 for every 5% of his health!' },

  // ---------------------------------------------------------------- Expert mode enemies
  // Expert from the user's 2026-11-09 spec: cracked figures, Vio ghosts, bots and beings of time,
  // 30 waves ending with the Beholder. Health is exact (DIFFICULTIES.expert.flatHp).
  // speed = the spec's speed x 0.45 (this spec's numbers run ~6.7x Hard's, so x0.45 lines its
  // "very fast" up with Hard's). Rewards, base damage and anything the spec didn't give are guesses.
  // xlook: which outfit expertParts (models.js) gives it.
  // mpTop: its health with 6 players, as a multiple of solo (grows evenly per extra player).
  //   mpPow: +this much health per extra player, compounding (Beholder). Neither: same health in multiplayer.
  // A negative resistance is a weakness (bulletResist: -0.75 = takes 75% more from bullets).
  // plasmaResist: placeholder, the game has no plasma damage type yet. ghost: placeholder (Viorb).
  // deathHaste { radius, speed, time }: when killed, enemies within `radius` move `speed` faster for `time` s.
  // placeAt [a, b]: appears at a random spot between those shares of the path (instead of the entrance).
  // summon `noCash`: the summons give no kill cash.
  // shots: `n` orbs at random towers; `shrink` s of halved range, `weak` { amt, time, max } stacking
  //   damage cut, `haste` { radius, speed, time } speeds up enemies near the shooter (Vio Gunner).
  // sprint { every, time, speed }: runs `speed` times faster for `time` s every `every` s (Time Runner).
  // moves { first, every, list }: a boss picks one of `list` every `every` s (see Sim.expertMoves).
  // sacrifice { at, resist, sellDmg, rams }: Rebirther's Blood Sacrifice (see Sim.expertMoves).
  // unsheathe { at, time }: Death Angel: no attacks until it has lost `at` of its health; then it
  //   stops for `time` s and draws its staff.
  // shift { at, into, heal, refund }: below `at` health it warps everyone to the Beholder's Field
  //   (Sim.timeShift): `into` takes over at full health (heal), towers are refunded `refund` of what they cost.
  xDrab: { name: 'Cracked Drab', hp: 15, speed: 12.4, reward: 4, damage: 3, scale: 1, skin: 0xc5e1a5, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'cracked',
    intro: '🪨 Expert mode! Cracked Drabs are weak but quick on their feet.' },
  xQuick: { name: 'Cracked Quick', hp: 15, speed: 33.8, reward: 4, damage: 3, scale: 0.95, skin: 0x81d4fa, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'cracked',
    intro: '💨 Cracked Quicks are extremely fast!' },
  xTrampled: { name: 'Cracked Trampled', hp: 105, speed: 6.75, reward: 10, damage: 8, scale: 1.25, skin: 0x4a4e69, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'trampled',
    intro: '🐢 Cracked Trampled: slow and tanky.' },
  xNoticeable: { name: 'Noticeable', hp: 25, speed: 6.75, reward: 6, damage: 4, scale: 1, skin: 0xce93d8, shirt: 0xb39ddb, pants: 0xb39ddb, face: 'blank', xlook: 'noticeable',
    hidden: true, intro: '👻 Noticeables are hidden! You need hidden detection.' },
  xLimbed: { name: 'Limbed', hp: 850, mpTop: 1100 / 850, speed: 6.75, reward: 55, damage: 25, scale: 1.3, skin: 0x7cb342, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'limbed',
    intro: '💪 Limbed: huge arms, lots of health.' },
  xQuickLimbed: { name: 'Quick Limbed', hp: 1050, mpTop: 1550 / 1050, speed: 22.5, reward: 65, damage: 30, scale: 1.3, skin: 0x42a5f5, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'limbed',
    intro: '💨 Quick Limbed: a Limbed that runs!' },
  xCharger: { name: 'Charger', hp: 75, speed: 40, reward: 12, damage: 10, scale: 1, skin: 0xff4fa3, shirt: 0x161616, pants: 0x111111, face: 'blank', xlook: 'charger', glowC: 0xff4fa3,
    intro: '⚡ Chargers are among the fastest things in the game!' },
  xViodrop: { name: 'Viodrop', hp: 65, speed: 15.75, reward: 8, damage: 6, scale: 0.95, skin: 0xd1b3ff, shirt: 0xd1b3ff, pants: 0xd1b3ff, face: 'blank', xlook: 'vio',
    bulletResist: -0.75, explosiveResist: 0.5, intro: '🟣 Viodrops come in swarms. Vio enemies resist explosions but bullets hurt them a lot more.' },
  xOvercharged: { name: 'Overcharged', hp: 400, speed: 22.5, reward: 30, damage: 20, scale: 1.15, skin: 0xff4fa3, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'overcharged', glowC: 0xff4fa3,
    plasmaResist: 0.5, deathHaste: { radius: 12, speed: 1, time: 3 },
    intro: '⚡ Overcharged: when one dies, the enemies around it get a big burst of speed!' },
  xCloaker: { name: 'Cloaker Bot', hp: 150, speed: 9, reward: 15, damage: 20, scale: 1.1, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'visor', xlook: 'cloaker', glowC: 0xb388ff,
    hidden: true, shield: true, phase2: 'xCloakerBare', bulletResist: 0.5, explosiveResist: -0.75,
    intro: '🫧 Cloaker Bots are hidden until their bubble shield breaks, then they speed up. Explosions wreck them.' },
  xCloakerBare: { name: 'Cloaker Bot', hp: 450, speed: 18, reward: 20, damage: 20, scale: 1.1, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'visor', xlook: 'bot', glowC: 0xb388ff,
    bulletResist: 0.5, explosiveResist: -0.75 },
  xViorb: { name: 'Viorb', model: 'viorb', h: 4, hp: 3500, speed: 0, reward: 150, damage: 0, scale: 1.5, skin: 0xd500f9,
    bulletResist: -0.75, explosiveResist: 0.5, ghost: true, placeAt: [0.2, 0.55],
    summon: { type: 'xViodrop', n: 2, every: 5, here: true, noCash: true },
    intro: '🔮 A Viorb! It never moves, but it keeps summoning Viodrops until you destroy it.' },
  xVioGunner: { name: 'Vio Gunner', hp: 1550, mpTop: 2550 / 1550, speed: 7.9, reward: 100, damage: 40, scale: 1.25, skin: 0xd1b3ff, shirt: 0x9c27b0, pants: 0x7b1fa2, face: 'goggles', xlook: 'vioGunner',
    bulletResist: -0.75, explosiveResist: 0.5,
    shots: [{ kind: 'vioOrb', range: 28, radius: 2.5, dmg: 15, every: 6, n: 4, flight: 0.9, shrink: 6, weak: { amt: 0.5, time: 6, max: 0.75 }, haste: { radius: 12, speed: 0.4, time: 4 } }],
    intro: '🔫 Vio Gunners fire orbs that halve your towers\' range and cut their damage (it stacks!), and speed up nearby enemies.' },
  xArmoured: { name: 'Armoured Bot', hp: 1500, speed: 6.75, reward: 90, damage: 40, scale: 1.4, skin: 0x1a237e, shirt: 0x1a237e, pants: 0x121858, face: 'visorRed', xlook: 'armoured',
    bulletResist: 0.8, explosiveResist: -0.5, intro: '🤖 Armoured Bots barely feel bullets, but explosions hurt them more.' },
  xUndercharged: { name: 'Undercharged', hp: 100, speed: 50, reward: 10, damage: 25, scale: 1.05, skin: 0xaa00ff, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'undercharged', glowC: 0xaa00ff,
    shield: true, phase2: 'xUnderchargedBare', intro: '⚡ Undercharged: the FASTEST enemy in the game, until its shield breaks!' },
  xUnderchargedBare: { name: 'Undercharged', hp: 500, speed: 22.5, reward: 30, damage: 25, scale: 1.05, skin: 0xaa00ff, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'undercharged', glowC: 0x6a1b9a },
  xRusher: { name: 'Rusher', hp: 4250, mpTop: 6750 / 4250, speed: 22.5, reward: 150, damage: 60, scale: 1.15, skin: 0x1e88e5, shirt: 0x424242, pants: 0x333333, face: 'blank', xlook: 'rusher',
    intro: '🏃 Rushers: fast AND tough.' },
  xScarlet: { name: 'Scarlet', hp: 5000, mpTop: 1.5, speed: 6.75, reward: 120, damage: 60, scale: 1.25, skin: 0x212121, shirt: 0x757575, pants: 0x616161, face: 'hoodPurple', xlook: 'scarlet',
    bulletResist: -0.25, explosiveResist: -0.25, plasmaResist: 0.25 },
  xFlagBot: { name: 'Flag Bot', hp: 1500, speed: 9, reward: 90, damage: 40, scale: 1.3, skin: 0x263238, shirt: 0x263238, pants: 0x1c1c1c, face: 'visorRed', xlook: 'flagBot',
    aggro: 1e4, bulletResist: 0.5, explosiveResist: -0.75,
    intro: '🚩 Flag Bots: every tower that can reach one HAS to target it. Explosions hurt them more.' },
  xVioRusher: { name: 'Vio Rusher', hp: 15000, mpTop: 1.5, speed: 33.8, reward: 320, damage: 100, scale: 1.2, skin: 0xaa00ff, shirt: 0x161616, pants: 0x111111, face: 'blank', xlook: 'charger', glowC: 0xaa00ff,
    intro: '🟣 Vio Rushers: a much stronger, much faster Rusher.' },
  xShieldBot: { name: 'Shield Bot', hp: 7500, speed: 7.9, reward: 250, damage: 150, scale: 1.55, skin: 0x311b92, shirt: 0x311b92, pants: 0x1a0f3a, face: 'visorRed', xlook: 'shieldBot',
    bulletResist: 0.8, shield: true, phase2: 'xShieldBotBare',
    intro: '🛡️ Shield Bots: a stronger Armoured Bot with a big shield, and explosions don\'t hurt it extra.' },
  xShieldBotBare: { name: 'Shield Bot', hp: 16000, speed: 7.9, reward: 400, damage: 150, scale: 1.55, skin: 0x311b92, shirt: 0x311b92, pants: 0x1a0f3a, face: 'visorRed', xlook: 'armoured',
    bulletResist: 0.8 },
  xTimeRunner: { name: 'Time Runner', hp: 35000, mpTop: 47500 / 35000, speed: 13.5, reward: 500, damage: 150, scale: 1.1, skin: 0xffffff, shirt: 0xf5f5f5, pants: 0xeeeeee, face: 'blank', xlook: 'timeRunner', glowC: 0xb388ff,
    sprint: { every: 6, time: 1.5, speed: 4 }, intro: '⏱️ Time Runners dash forward at huge speed every few seconds!' },
  xTimeTitan: { name: 'Time Titan', hp: 70000, mpTop: 95000 / 70000, speed: 6.75, reward: 400, damage: 200, scale: 2.1, skin: 0x1a237e, shirt: 0x1a237e, pants: 0x121858, face: 'blank', xlook: 'timeTitan', glowC: 0x8c9eff,
    lessDmgCash: true, intro: '⚡ Time Titans: huge tanks that pay less cash than you\'d think.' },
  xTimeCrystal: { name: 'Time Crystal', model: 'timeCrystal', h: 6, hp: 37500, mpTop: 42500 / 37500, speed: 2.25, reward: 300, damage: 150, scale: 1.4, skin: 0xffffff,
    deathSpawn: { list: ['xFragment'], n: 6 }, intro: '💎 Time Crystals shatter into Time Fragments when destroyed!' },
  xFragment: { name: 'Time Fragment', model: 'timeFragment', h: 3, hp: 2993, speed: 4.5, reward: 40, damage: 40, scale: 1.1, skin: 0xff4fa3 },
  xTimeShard: { name: 'Time Shard', hp: 400, speed: 18, reward: 20, damage: 10, scale: 0.8, skin: 0xffffff, shirt: 0xffffff, pants: 0xf5f5f5, face: 'blank', xlook: 'timeShard', glowC: 0xb388ff,
    armor: 0.5, bulletResist: 0.5, laserResist: 0.5, explosiveResist: 0.5, shield: true, phase2: 'xTimeShardBare' },
  xTimeShardBare: { name: 'Time Shard', hp: 4, speed: 18, reward: 10, damage: 10, scale: 0.8, skin: 0xffffff, shirt: 0xffffff, pants: 0xf5f5f5, face: 'blank', xlook: 'timeShardBare', glowC: 0xb388ff,
    armor: 0.5 },
  xDoomelist: { name: 'Doomelist', hp: 50000, mpTop: 62500 / 50000, speed: 4.5, reward: 800, damage: 300, scale: 1.7, skin: 0xffccbc, shirt: 0xeceff1, pants: 0xb71c1c, face: 'goggles', xlook: 'doomelist',
    stunImmune: true, shots: [{ kind: 'rocket', range: 45, radius: 9, dmg: 120, every: 14, flight: 1.6 }],
    intro: '🚀 Doomelists fire giant rockets that blow up everything around where they land!' },
  xRebirther: { name: 'Rebirther', hp: 100000, speed: 4.05, reward: 3000, damage: 1000, scale: 2.4, skin: 0x212121, shirt: 0x4a148c, pants: 0x111111, face: 'hoodPurple', xlook: 'rebirther',
    boss: true, stunImmune: true,
    moves: { first: 6, every: 10, list: [
      { key: 'violetCall', w: 2, summon: 'xScarlet', n: 2 },
      { key: 'bloodRain', w: 2, dmg: 10, stun: 2 },
      { key: 'ritual', w: 1 }] },
    sacrifice: { at: 0.5, resist: 0.999, sellDmg: 1, rams: ['enforcementBase', 'buccaneer'] },
    intro: '🩸 BOSS: the Rebirther! It summons Scarlets, rains blood on your towers, and its Ritual kills a tower.' },
  xDeathAngel: { name: 'Death Angel', hp: 100000, mpTop: 3.5, speed: 7.9, reward: 4000, damage: 1000, scale: 2.2, skin: 0xfbe9e7, shirt: 0xefebe9, pants: 0xd7ccc8, face: 'angel', xlook: 'deathAngel',
    boss: true, stunImmune: true, unsheathe: { at: 0.8, time: 2 },
    moves: { first: 2, every: 8, list: [
      { key: 'twirl', w: 2, range: 16, dmg: 21, stun: 2 },
      { key: 'bloodAssembly', w: 2, n: 5, radius: 4, dmg: 40, flight: 1.2 },
      { key: 'purePain', w: 1, range: 15, dmg: 250 }] },
    intro: '🪽 BOSS: the Death Angel! Once it draws its staff, its Pure Pain can one-shot towers, even through shields.' },
  xBeholder: { name: 'Beholder', h: 5.2, hp: 250000, mpPow: 0.25, speed: 4.3, reward: 0, damage: 100000, scale: 3.8, skin: 0x050505, shirt: 0x9e9e9e, pants: 0x616161, face: 'beholder', xlook: 'beholder',
    boss: true, stunImmune: true, chrono: true,
    moves: { first: 5, every: 8, list: [
      { key: 'timeSnap', w: 2, range: 18, dmg: 40, stun: 3 },
      { key: 'realityTear', w: 2, n: 8, radius: 4, dmg: 35, flight: 1.5 },
      { key: 'timeParadox', w: 2, n: 3, gap: 3 }] },
    shift: { at: 0.15, into: 'xBeholderField', heal: true, refund: 1 },
    intro: '👁️ FINAL BOSS: the Beholder, time itself! Its Time Paradox turns your towers into other towers.' },
  // In the Beholder's Field: back at full health, with Time Crystals and Time Shards at its side.
  xBeholderField: { name: 'Beholder (Beholder\'s Field)', h: 5.2, hp: 250000, speed: 4.3, reward: 0, damage: 100000, scale: 3.8, skin: 0x050505, shirt: 0x9e9e9e, pants: 0x616161, face: 'beholder', xlook: 'beholder',
    boss: true, stunImmune: true, chrono: true, fixedHp: true,
    moves: { first: 10, every: 8, list: [
      { key: 'timeSnap', w: 2, range: 18, dmg: 40, stun: 3 },
      { key: 'realityTear', w: 2, n: 8, radius: 4, dmg: 35, flight: 1.5 },
      { key: 'timeParadox', w: 2, n: 3, gap: 3 }] },
    summon: [{ type: 'xTimeCrystal', n: 1, every: 30 }, { type: 'xTimeShard', n: 3, every: 15 }],
    shiftIntro: '🌌 The Beholder WARPED you to the Beholder\'s Field! It healed fully, and your towers were refunded. Rebuild fast, it moves in 8 seconds!' },
  // ---------------------------------------------------------------- Insane mode enemies
  // Insane from the user's 2026-11-09 spec: soldiers, robots, the XCF and beings of light and
  // corruption, 50 waves ending with the Overlord. Health is exact (DIFFICULTIES.insane.flatHp);
  // "X + Y shield" = a shield form with Y health (`shield`, phase2) that turns into the bare form
  // with X. speed = the spec's speed x3 (like Easy / Medium / Hard). Rewards (iR), base damage (iD)
  // and anything the spec didn't give (ability timings, ranges, stun lengths) are guesses.
  // ilook: which outfit orionParts (models.js) gives a humanoid one; glowC: its glow color.
  // defense: flat damage blocked from every direct hit (damage over time ignores it; defense
  //   piercing `defPierce` cuts it like armor). maxHit: no single hit does more than this.
  // freezeImmune: can't be frozen or chilled. shockImmune: electricity can't stun it (approximation:
  //   no tower stuns at all, except stun-anything ones like the Stunner; no Byte shocks or Paralyzer slows).
  // healPulse { every, radius, hp | pct, over }: every `every` s heals the other enemies within
  //   `radius` by `hp` (or `pct` of their max health), up to `over` x their max health (1 = no overheal).
  // build { after, type }: `after` s after it spawns it builds a `type` next to itself and stands
  //   still until that is destroyed (Engineer -> MK11-Device). Only once, even after its shield breaks.
  // moves (see Sim.expertMoves / bossMove): `once` moves are used one time only.
  // taunt { time, maxHit }: right after it spawns it stands still for `time` s and no hit does more than `maxHit`.
  // backup { at, type, n }: below `at` of its health, `n` `type`s appear next to it (Overlord Amplifiers:
  //   `amp` heals it, never past ampCap of its max health). despair { speed, defense, maxHit, summon, n }:
  //   once every Amplifier is destroyed it moves `speed` x faster, gets tougher, and `summon`s come out of the entrance.
  // throwAt { at, speed }: below `at` of its health it throws its hammer away: `speed` x faster, no more moves.
  // Wiki looks the spec gave are in each enemy's ilook (orionParts).
  iSwordsman: { name: 'Swordsman', hp: 5, speed: 11.1, reward: iR(5), damage: iD(5), scale: 1, skin: 0x9e9e9e, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'frown', ilook: 'swordsman',
    intro: '⚔️ Insane mode! Swordsmen carry a sword they never use. Enemies here have Defense: it blocks some damage from every hit.' },
  iNinja: { name: 'Ninja', hp: 6, speed: 18, reward: iR(6), damage: iD(6), scale: 0.95, skin: 0xf5f5f5, shirt: 0x111111, pants: 0x111111, face: 'frown', ilook: 'ninja',
    intro: '🥷 Ninjas are fast and come in groups.' },
  iWorker: { name: 'Worker', hp: 14, speed: 10.5, reward: iR(14), damage: iD(14), scale: 1.05, skin: 0xef9a9a, shirt: 0xe57373, pants: 0x424242, face: 'zombie', ilook: 'worker' },
  iSoldier: { name: 'Soldier', hp: 16, speed: 9, reward: iR(16), damage: iD(16), scale: 1.05, skin: 0xa5d6a7, shirt: 0x2e7d32, pants: 0x33691e, face: 'frown', ilook: 'soldier',
    defense: 1, intro: '🪖 Soldiers have 1 Defense: every hit on them does 1 less damage.' },
  iMetallic: { name: 'Metallic', hp: 125, speed: 8.4, reward: iR(125), damage: iD(125), scale: 1.25, skin: 0x424242, shirt: 0x37474f, pants: 0x37474f, face: 'visorRed', ilook: 'metallic', glowC: 0xff1744,
    defense: 2, intro: '🤖 A Metallic! Tough, with 2 Defense.' },
  iJetpacker: { name: 'Jetpacker', hp: 18, speed: 16.5, reward: iR(18), damage: iD(18), scale: 1, skin: 0x212121, shirt: 0x111111, pants: 0x111111, face: 'visor', ilook: 'jetpacker', glowC: 0x76ff03,
    flying: true, defense: 1, freezeImmune: true, intro: '🚀 Jetpackers fly! You need towers that can hit flying enemies. They can\'t be frozen.' },
  iDrone: { name: 'Drone', model: 'crystalCar', h: 2.2, hp: 50, speed: 30, reward: iR(50), damage: iD(50), scale: 0.7, skin: 0x81d4fa, shard: 0x40c4ff,
    intro: '🚙 Drones are very fast little cars.' },
  iTruck: { name: 'Truck M2', model: 'iTruck', h: 3.2, hp: 40, speed: 16.8, reward: iR(40), damage: iD(40), scale: 1, skin: 0x33691e,
    defense: 2, bulletResist: 0.45, deathSpawn: { list: ['iSoldier'], n: 4 },
    intro: '🚚 Truck M2s resist bullets (45% less damage) and drop 4 Soldiers when destroyed!' },
  iBerserker: { name: 'Berserker', hp: 800, speed: 4.05, reward: iR(800), damage: iD(2500), scale: 2, skin: 0x00695c, shirt: 0x004d40, pants: 0x00332c, face: 'blank', ilook: 'berserker', glowC: 0x40c4ff,
    boss: true, shield: true, phase2: 'iBerserkerBare', defense: 1, moves: { first: 4, every: 2, list: [{ key: 'hammerSmash', once: true, range: 16, stun: 15 }] },
    intro: '🔨 Miniboss: the Berserker! Its Hammer Smash stuns one tower for a long time (only once).' },
  iBerserkerBare: { name: 'Berserker', hp: 1700, speed: 4.05, reward: iR(1700), damage: iD(2500), scale: 2, skin: 0x00695c, shirt: 0x004d40, pants: 0x00332c, face: 'blank', ilook: 'berserker', glowC: 0x40c4ff,
    boss: true, defense: 1, moves: { first: 2, every: 2, list: [{ key: 'hammerSmash', once: true, range: 16, stun: 15 }] } },
  iTeleporter: { name: 'Teleporter', hp: 115, speed: 18, reward: iR(115), damage: iD(115), scale: 1.05, skin: 0xe53935, shirt: 0x37474f, pants: 0x263238, face: 'frown', ilook: 'teleporter', glowC: 0x40c4ff,
    defense: 2, deathSpawn: { list: ['iMetallic', 'iDrone', 'iUfo', 'iTruck'], n: 1 },
    intro: '📡 Teleporters pull in a Metallic, Drone, UFO or Truck M2 when they die!' },
  iSprinterM5: { name: 'Sprinter M5', hp: 600, speed: 18, reward: iR(600), damage: iD(600), scale: 1, skin: 0xffe0b2, shirt: 0x81d4fa, pants: 0x37474f, face: 'halfMetal', ilook: 'sprinterM5', glowC: 0x40c4ff,
    freezeImmune: true, shockImmune: true, intro: '🦾 Sprinter M5s are fast, and can\'t be frozen or stunned by electricity.' },
  iUfo: { name: 'UFO', model: 'crystalUfo', h: 2.4, hp: 250, speed: 9, reward: iR(250), damage: iD(300), scale: 0.8, skin: 0x111111, shard: 0x2979ff,
    flying: true, defense: 2, shield: true, phase2: 'iUfoBare', intro: '🛸 UFOs fly, and their blue forcefield has to break before you can hurt the UFO.' },
  iUfoBare: { name: 'UFO', model: 'crystalUfo', h: 2.4, hp: 50, speed: 9, reward: iR(50), damage: iD(300), scale: 0.8, skin: 0x111111, shard: 0x2979ff, flying: true, defense: 2 },
  iEliteSoldier: { name: 'Elite Soldier', hp: 175, speed: 21, reward: iR(175), damage: iD(175), scale: 1.1, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'blank', ilook: 'eliteSoldier', glowC: 0x40c4ff,
    intro: '🗡️ Elite Soldiers: very fast, with glowing blue swords.' },
  iEliteDrone: { name: 'Elite Drone', model: 'crystalCar', h: 2, hp: 75, speed: 39, reward: iR(75), damage: iD(75), scale: 0.6, skin: 0x111111, shard: 0xaa00ff,
    defense: 10, freezeImmune: true, intro: '🏎️ Elite Drones are tiny, rapid and armored: 10 Defense! Weak hits do nothing to them.' },
  iRaygunner: { name: 'Raygunner', hp: 300, speed: 10.5, reward: iR(300), damage: iD(500), scale: 1.05, skin: 0xffcc80, shirt: 0x263238, pants: 0x212121, face: 'eyepatch', ilook: 'raygunner', glowC: 0x40c4ff,
    shield: true, phase2: 'iRaygunnerBare', intro: '🔫 Raygunners hide in a shield bubble until it breaks.' },
  iRaygunnerBare: { name: 'Raygunner', hp: 200, speed: 10.5, reward: iR(200), damage: iD(500), scale: 1.05, skin: 0xffcc80, shirt: 0x263238, pants: 0x212121, face: 'eyepatch', ilook: 'raygunnerBare', glowC: 0x40c4ff },
  iEliteTeleporter: { name: 'Elite Teleporter', hp: 400, speed: 21.6, reward: iR(400), damage: iD(400), scale: 1.1, skin: 0x00b0ff, shirt: 0x263238, pants: 0x1c1c1c, face: 'blank', ilook: 'eliteTeleporter', glowC: 0x00e5ff,
    deathSpawn: { list: ['iEliteSoldier', 'iShielder', 'iSprinterM5', 'iRaygunner', 'iCosmil'], n: 1 },
    intro: '🌀 Elite Teleporters pull in an Elite Soldier, Shielder, Sprinter M5, Raygunner or Cosmil when they die!' },
  iMedic: { name: 'Field Medic', hp: 135, speed: 9.75, reward: iR(135), damage: iD(135), scale: 1.05, skin: 0xffe0b2, shirt: 0xfafafa, pants: 0xeceff1, face: 'smile', ilook: 'medic',
    defense: 4, healPulse: { every: 4, radius: 12, hp: 50, over: 1 }, intro: '⛑️ Field Medics heal the enemies around them by 50 every few seconds. Take them out first!' },
  iShielder: { name: 'Shielder', hp: 840, speed: 6.9, reward: iR(840), damage: iD(1000), scale: 1.2, skin: 0xeceff1, shirt: 0xfafafa, pants: 0xe0e0e0, face: 'visor', ilook: 'shielder', glowC: 0x40c4ff,
    defense: 4, shield: true, phase2: 'iShielderBare', intro: '🛡️ Shielders carry a big plasma shield, with 4 Defense.' },
  iShielderBare: { name: 'Shielder', hp: 200, speed: 6.9, reward: iR(200), damage: iD(1000), scale: 1.2, skin: 0xeceff1, shirt: 0xfafafa, pants: 0xe0e0e0, face: 'visor', ilook: 'shielderBare', glowC: 0x40c4ff, defense: 4 },
  iCarrier: { name: 'Carrier Tank', model: 'iCarrier', h: 3, hp: 1000, speed: 6, reward: iR(1000), damage: iD(6000), scale: 1.2, skin: 0x311b92, shard: 0xd500f9,
    defense: 5, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iCarrierBare',
    intro: '🛻 Carrier Tanks: shielded, 5 Defense, can\'t be frozen or shocked, and they release Elite units when destroyed!' },
  iCarrierBare: { name: 'Carrier Tank', model: 'iCarrier', h: 3, hp: 5000, speed: 6, reward: iR(5000), damage: iD(6000), scale: 1.2, skin: 0x311b92, shard: 0xd500f9,
    defense: 5, freezeImmune: true, shockImmune: true, deathSpawn: { list: ['iEliteTeleporter', 'iEliteDrone', 'iEliteSoldier', 'iRaygunner'], n: 4 } },
  iEliteSwordsman: { name: 'Elite Swordsman', hp: 200, speed: 10.8, reward: iR(200), damage: iD(200), scale: 1, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'blank', ilook: 'eliteSwordsman', glowC: 0xffffff,
    defense: 1 },
  iCosmil: { name: 'Cosmil', hp: 450, speed: 15, reward: iR(450), damage: iD(450), scale: 1.15, skin: 0x80d8ff, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'visorRed', ilook: 'cosmil', glowC: 0xff1744,
    defense: 20, intro: '🔴 Cosmils have 20 Defense! Small hits barely scratch them. Use strong single hits.' },
  iEngineer: { name: 'Engineer', hp: 2000, speed: 6.6, reward: iR(2000), damage: iD(10000), scale: 1.35, skin: 0x81d4fa, shirt: 0x0277bd, pants: 0x111111, face: 'welder', ilook: 'engineer',
    defense: 2, shield: true, phase2: 'iEngineerBare', build: { after: 6, type: 'iMK11' },
    intro: '🔧 Engineers build an MK11-Device that keeps summoning Elite Soldiers, and wait by it until it\'s destroyed!' },
  iEngineerBare: { name: 'Engineer', hp: 8000, speed: 6.6, reward: iR(8000), damage: iD(10000), scale: 1.35, skin: 0x81d4fa, shirt: 0x0277bd, pants: 0x111111, face: 'welder', ilook: 'engineer',
    defense: 2, build: { after: 2, type: 'iMK11' } },
  iMK11: { name: 'MK11-Device', model: 'iMK11', h: 3, hp: 1000, speed: 0.3, reward: iR(1000), damage: iD(1000), scale: 1, skin: 0x1c1c1c, shard: 0x2979ff,
    summon: { type: 'iEliteSoldier', n: [2, 3], every: 6.5, here: true } },
  iPureEnergy: { name: 'Pure Energy', hp: 150, speed: 45, reward: iR(150), damage: iD(450), scale: 1, skin: 0xaa00ff, shirt: 0xaa00ff, pants: 0xaa00ff, face: 'blank', ilook: 'pureEnergy', glowC: 0xd500f9,
    shield: true, phase2: 'iPureEnergyBare', maxHit: 250, freezeImmune: true,
    intro: '💜 Pure Energy: very, VERY fast, and no single hit can do more than 250 damage to it.' },
  iPureEnergyBare: { name: 'Pure Energy', hp: 300, speed: 45, reward: iR(300), damage: iD(450), scale: 1, skin: 0xaa00ff, shirt: 0xaa00ff, pants: 0xaa00ff, face: 'blank', ilook: 'pureEnergy', glowC: 0xd500f9,
    maxHit: 250, freezeImmune: true },
  iBoltmaster: { name: 'Boltmaster', hp: 50000, speed: 4.5, reward: iR(50000), damage: 1e5, scale: 2.3, skin: 0x111111, shirt: 0x1c1c1c, pants: 0x111111, face: 'visor', ilook: 'boltmaster', glowC: 0xaa00ff,
    boss: true, defense: 6, freezeImmune: true, shockImmune: true,
    moves: { first: 5, every: 9, list: [
      { key: 'boltSlam', w: 2, range: 24, slow: 0.5, time: 8, inner: 11, stun: 3 },
      { key: 'callUnits', w: 1, list: ['iShielder', 'iCosmil', 'iMK11', 'iRaygunner', 'iUfo'], n: 3, name: 'Bolt Summon' }] },
    intro: '⚡ BOSS: the Boltmaster! Bolt Slam slows towers around it and stuns the closest ones, and Bolt Summon calls in more units.' },
  iMothership: { name: 'Mothership', model: 'crystalUfo', h: 4, hp: 6500, speed: 5.4, reward: iR(6500), damage: iD(6500), scale: 2.2, skin: 0x111111, shard: 0xd500f9,
    flying: true, defense: 3, freezeImmune: true, shockImmune: true, healPulse: { every: 5, radius: 16, pct: 0.2, over: 1.2 },
    intro: '🛸 A Mothership! It flies and heals the enemies around it by 20% (even past full health). Shoot it down!' },
  iSentinel: { name: 'Sentinel', hp: 6000, speed: 6.6, reward: iR(6000), damage: iD(25000), scale: 1.6, skin: 0x1c1c1c, shirt: 0x212121, pants: 0x1c1c1c, face: 'visor', ilook: 'sentinel', glowC: 0xaa00ff,
    defense: 5, shield: true, phase2: 'iSentinelBare', intro: '🕴️ Sentinels: huge health, a shield and 5 Defense.' },
  iSentinelBare: { name: 'Sentinel', hp: 19000, speed: 6.6, reward: iR(19000), damage: iD(25000), scale: 1.6, skin: 0x1c1c1c, shirt: 0x212121, pants: 0x1c1c1c, face: 'visor', ilook: 'sentinel', glowC: 0xaa00ff, defense: 5 },
  iOverseer: { name: 'Robotic Overseer', hp: 25000, speed: 6.9, reward: iR(25000), damage: 1e5, scale: 3, skin: 0x4a148c, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'visor', ilook: 'overseer', glowC: 0xd500f9,
    boss: true, defense: 4, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iOverseerBare',
    moves: { first: 6, every: 10, list: [
      { key: 'rocketBombard', w: 1, n: 8, radius: 4, stun: 3, flight: 1.8 },
      { key: 'minigun', w: 1, range: 26, n: 6, stun: 2.5 }] },
    intro: '🤖 BOSS: the Robotic Overseer! Its rockets reach anywhere on the map, and its minigun stuns every tower it hits.' },
  iOverseerBare: { name: 'Robotic Overseer', hp: 100000, speed: 6.9, reward: iR(100000), damage: 1e5, scale: 3, skin: 0x4a148c, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'visor', ilook: 'overseer', glowC: 0xd500f9,
    boss: true, defense: 4, freezeImmune: true, shockImmune: true,
    moves: { first: 3, every: 10, list: [
      { key: 'rocketBombard', w: 1, n: 8, radius: 4, stun: 3, flight: 1.8 },
      { key: 'minigun', w: 1, range: 26, n: 6, stun: 2.5 }] } },
  iVessel: { name: 'Unstable Vessel', hp: 8000, speed: 18, reward: iR(8000), damage: iD(8000), scale: 1.25, skin: 0x76ff03, shirt: 0x33691e, pants: 0x1b5e20, face: 'blank', ilook: 'vessel', glowC: 0x76ff03,
    freezeImmune: true, blast: { radius: 10, stun: 3, color: 0x76ff03 }, deathSpawn: { list: ['iEliteSoldier', 'iRaygunner', 'iEliteDrone', 'iEliteTeleporter'], n: 3 },
    intro: '☢️ Unstable Vessels explode when they die, stunning towers nearby, and Elite units pour out!' },
  iKugelblitz: { name: 'Kugelblitz', hp: 5000, speed: 9, reward: iR(5000), damage: iD(9000), scale: 1.2, skin: 0x050505, shirt: 0x050505, pants: 0x050505, face: 'blank', ilook: 'kugelblitz', glowC: 0xff6d00,
    flying: true, freezeImmune: true, shield: true, phase2: 'iKugelblitzBare', intro: '⚫ Kugelblitz: a flying black hole with a big shield.' },
  iKugelblitzBare: { name: 'Kugelblitz', hp: 4000, speed: 9, reward: iR(4000), damage: iD(9000), scale: 1.2, skin: 0x050505, shirt: 0x050505, pants: 0x050505, face: 'blank', ilook: 'kugelblitz', glowC: 0xff6d00,
    flying: true, freezeImmune: true },
  iVengeful: { name: 'Vengeful', hp: 6000, speed: 22.5, reward: iR(6000), damage: iD(6000), scale: 1.1, skin: 0x111111, shirt: 0x1c1c1c, pants: 0x111111, face: 'indigo', ilook: 'vengeful', glowC: 0x651fff,
    deathHaste: { radius: 12, speed: 1, time: 4 }, intro: '👑 When a Vengeful dies, the enemies around it move 2x faster for a while!' },
  iChampion: { name: 'Vengeful Champion', hp: 40000, speed: 6.6, reward: iR(40000), damage: iD(40000), scale: 1.8, skin: 0x111111, shirt: 0x1a1a2e, pants: 0x111111, face: 'indigo', ilook: 'champion', glowC: 0x651fff,
    defense: 8, moves: { first: 4, every: 9, list: [
      { key: 'swordThrow', w: 1, range: 35, radius: 1.5, stun: 5, flight: 0.8 },
      { key: 'vengefulSlash', w: 1, range: 16, stun: 3 }] },
    intro: '🎩 Vengeful Champions throw their sword to stun a tower, and their Vengeful Slash stuns every tower in front of them.' },
  iRavagerEnergy: { name: 'Ravager Energy', hp: 900, speed: 45, reward: iR(900), damage: iD(900), scale: 1.05, skin: 0x18ffff, shirt: 0x18ffff, pants: 0x18ffff, face: 'blank', ilook: 'ravagerEnergy', glowC: 0x18ffff,
    defense: 3, maxHit: 200, freezeImmune: true, intro: '💠 Ravager Energy: EXTREMELY fast, and no hit does more than 200 damage to it.' },
  iAvantGuard: { name: 'Avant Guard', hp: 55000, speed: 6, reward: iR(55000), damage: 1e5, scale: 2.2, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'blank', ilook: 'avantGuard', glowC: 0x80d8ff,
    boss: true, defense: 6, maxHit: 300, freezeImmune: true, shield: true, phase2: 'iAvantGuardBare',
    moves: { first: 4, every: 8, list: [{ key: 'axeSlash', range: 15, slow: 0.4, time: 8 }] },
    intro: '🪓 BOSS: the Avant Guard! A giant shield bubble, no hit over 300 damage, and its Axe Slash makes nearby towers fire slower.' },
  iAvantGuardBare: { name: 'Avant Guard', hp: 25000, speed: 6, reward: iR(25000), damage: 1e5, scale: 2.2, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'blank', ilook: 'avantGuardBare', glowC: 0x80d8ff,
    boss: true, defense: 6, maxHit: 300, freezeImmune: true,
    moves: { first: 3, every: 8, list: [{ key: 'axeSlash', range: 15, slow: 0.4, time: 8 }] } },
  iVanguard: { name: 'The Vanguard', hp: 50000, speed: 5.1, reward: iR(50000), damage: 1e5, scale: 2.6, skin: 0x111111, shirt: 0x1b5e20, pants: 0x111111, face: 'blank', ilook: 'vanguard', glowC: 0x00e676,
    boss: true, defense: 1, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iVanguardBare',
    moves: { first: 5, every: 9, list: [
      { key: 'hammerLine', w: 1, length: 36, width: 5, stun: 3.5 },
      { key: 'hammerSpin', w: 1, range: 15, stun: 3 }] },
    intro: '🔨 BOSS: The Vanguard! Its hammer shockwaves stun lines and rings of towers. At low health it throws its hammer away and runs!' },
  iVanguardBare: { name: 'The Vanguard', hp: 100000, speed: 5.1, reward: iR(100000), damage: 1e5, scale: 2.6, skin: 0x111111, shirt: 0x1b5e20, pants: 0x111111, face: 'blank', ilook: 'vanguard', glowC: 0x00e676,
    boss: true, defense: 1, freezeImmune: true, shockImmune: true, throwAt: { at: 0.25, speed: 2 },
    moves: { first: 3, every: 9, list: [
      { key: 'hammerLine', w: 1, length: 36, width: 5, stun: 3.5 },
      { key: 'hammerSpin', w: 1, range: 15, stun: 3 }] } },
  iSpirit: { name: 'Spirit of Light', hp: 1350, speed: 15, reward: iR(1350), damage: iD(1350), scale: 1, skin: 0xffab40, shirt: 0xffab40, pants: 0xffab40, face: 'blank', ilook: 'spirit', glowC: 0xffab40,
    flying: true, freezeImmune: true, intro: '✨ Spirits of Light fly, and can\'t be frozen.' },
  iDivine: { name: 'Divine Being', hp: 25000, speed: 8.1, reward: iR(25000), damage: iD(25000), scale: 1.7, skin: 0xffe0b2, shirt: 0xfafafa, pants: 0xf5f5f5, face: 'blank', ilook: 'divine', glowC: 0xffab40,
    defense: 4, summon: { type: 'iSpirit', n: [2, 3], every: 9 }, intro: '🕊️ Divine Beings keep summoning Spirits of Light.' },
  iArchangel: { name: 'The Archangel', hp: 10000, speed: 14.4, reward: iR(10000), damage: 1e5, scale: 2, skin: 0xffe0b2, shirt: 0xfafafa, pants: 0xeceff1, face: 'blank', ilook: 'archangel', glowC: 0x18ffff,
    boss: true, flying: true, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iArchangelBare',
    intro: '😇 BOSS: The Archangel! It flies: you NEED flying detection to stop it.' },
  iArchangelBare: { name: 'The Archangel', hp: 30000, speed: 14.4, reward: iR(30000), damage: 1e5, scale: 2, skin: 0xffe0b2, shirt: 0xfafafa, pants: 0xeceff1, face: 'blank', ilook: 'archangel', glowC: 0x18ffff,
    boss: true, flying: true, freezeImmune: true, shockImmune: true },
  iCorruption: { name: 'Corruption', hp: 8000, speed: 12, reward: iR(8000), damage: iD(8000), scale: 1.4, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'blank', ilook: 'corruption', glowC: 0xffffff,
    defense: 7, freezeImmune: true, intro: '👁️ Corruptions: 7 Defense and they can\'t be frozen.' },
  iTranquil: { name: 'Tranquil', hp: 20000, speed: 8.4, reward: iR(20000), damage: iD(20000), scale: 1.9, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'blank', ilook: 'tranquil', glowC: 0xd50000,
    defense: 4, shockImmune: true, intro: '🖤 Tranquils: huge, and electricity can\'t stun them.' },
  iNull: { name: 'Null', hp: 4500, speed: 21, reward: iR(4500), damage: iD(4500), scale: 1.05, skin: 0x0d0d0d, shirt: 0x0d0d0d, pants: 0x0d0d0d, face: 'blank', ilook: 'null', glowC: 0xaa00ff,
    defense: 5, intro: '🟣 Nulls are fast, with 5 Defense.' },
  iCorrupted: { name: 'The Corrupted', hp: 150000, speed: 3.3, reward: iR(150000), damage: 1e5, scale: 3.4, skin: 0x111111, shirt: 0x6a1b9a, pants: 0x1c1c1c, face: 'blank', ilook: 'corrupted', glowC: 0xd500f9,
    boss: true, defense: 30, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iCorruptedBare',
    summon: { type: 'iNull', n: 1, every: 10 },
    moves: { first: 6, every: 11, list: [
      { key: 'eyeLaser', w: 1, radius: 9, stun: 4, flight: 2.5, defense: 15, maxHit: 200 },
      { key: 'callUnits', w: 1, list: ['iNull'], n: 3, name: 'Eyeficated Summon' }] },
    intro: '👁️ BOSS: The Corrupted! 30 Defense. Its eye laser stuns towers around its target (and lowers its Defense for good). It keeps summoning Nulls.' },
  iCorruptedBare: { name: 'The Corrupted', hp: 100000, speed: 3.3, reward: iR(100000), damage: 1e5, scale: 3.4, skin: 0x111111, shirt: 0x6a1b9a, pants: 0x1c1c1c, face: 'blank', ilook: 'corrupted', glowC: 0xd500f9,
    boss: true, defense: 30, maxHit: 600, freezeImmune: true, shockImmune: true, summon: { type: 'iNull', n: 1, every: 10 },
    moves: { first: 4, every: 11, list: [
      { key: 'eyeLaser', w: 1, radius: 9, stun: 4, flight: 2.5, defense: 15, maxHit: 200 },
      { key: 'callUnits', w: 1, list: ['iNull'], n: 3, name: 'Eyeficated Summon' }] } },
  iHardLight: { name: 'Hard Light', hp: 150, speed: 15, reward: iR(150), damage: iD(150), scale: 1, skin: 0xffffff, shirt: 0xffffff, pants: 0xffffff, face: 'blank', ilook: 'hardLight', glowC: 0xffffff,
    defense: 8000, maxHit: 30, intro: '⬜ Hard Light: 8,000 Defense! Only burns, poison and other damage over time (or defense piercing) can hurt it.' },
  iBolt: { name: 'Bolt', hp: 600, speed: 9, reward: iR(600), damage: iD(600), scale: 1.05, skin: 0xaed581, shirt: 0x1565c0, pants: 0x263238, face: 'frown', ilook: 'bolt', glowC: 0x76ff03, shockImmune: true },
  iMage: { name: 'Mage', hp: 350, speed: 6.9, reward: iR(350), damage: iD(350), scale: 1.05, skin: 0x81d4fa, shirt: 0x111111, pants: 0x111111, face: 'frown', ilook: 'mage', glowC: 0x40c4ff,
    freezeImmune: true, moves: { first: 3, every: 7, list: [{ key: 'staffSlam', radius: 12, haste: 0.5, time: 2 }] } },
  iLightningKing: { name: 'Lightning King', hp: 800, speed: 4.8, reward: iR(800), damage: iD(800), scale: 1.2, skin: 0x90caf9, shirt: 0x0d1b4a, pants: 0x0d1b4a, face: 'frown', ilook: 'lightningKing', glowC: 0x40c4ff, freezeImmune: true },
  iLightspeed: { name: 'Lightspeed', hp: 3500, speed: 13.2, reward: iR(3500), damage: iD(3500), scale: 1.15, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'visor', ilook: 'lightspeed', glowC: 0x40c4ff,
    defense: 2, freezeImmune: true, shockImmune: true },
  iRavager: { name: 'Ravager', hp: 15000, speed: 24, reward: iR(15000), damage: iD(35000), scale: 1.7, skin: 0x0288d1, shirt: 0x37474f, pants: 0x263238, face: 'blank', ilook: 'ravager', glowC: 0x40c4ff,
    defense: 1, maxHit: 500, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iRavagerBare',
    moves: { first: 3, every: 8, list: [{ key: 'crystalThrow', range: 35, radius: 2, stun: 4, flight: 0.9 }] } },
  iRavagerBare: { name: 'Ravager', hp: 20000, speed: 24, reward: iR(20000), damage: iD(35000), scale: 1.7, skin: 0x0288d1, shirt: 0x37474f, pants: 0x263238, face: 'blank', ilook: 'ravager', glowC: 0x40c4ff,
    defense: 1, maxHit: 500, freezeImmune: true, shockImmune: true,
    moves: { first: 2, every: 8, list: [{ key: 'crystalThrow', range: 35, radius: 2, stun: 4, flight: 0.9 }] } },
  iReactor: { name: 'Reactor', hp: 400, speed: 7.5, reward: iR(400), damage: iD(1200), scale: 1.3, skin: 0xc62828, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'frown', ilook: 'reactor', glowC: 0xff1744,
    defense: 8, fireImmune: true, shield: true, phase2: 'iReactorBare' },
  iReactorBare: { name: 'Reactor', hp: 800, speed: 7.5, reward: iR(800), damage: iD(1200), scale: 1.3, skin: 0xc62828, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'frown', ilook: 'reactor', glowC: 0xff1744,
    defense: 8, fireImmune: true },
  iUnstable: { name: 'Unstable', hp: 100, speed: 16.5, reward: iR(100), damage: iD(100), scale: 1, skin: 0xff1744, shirt: 0xff8a80, pants: 0xff8a80, face: 'blank', ilook: 'unstable', glowC: 0xff1744,
    blast: { radius: 5, stun: 2, color: 0xff1744 } },
  iApparition: { name: 'Apparition', hp: 4000, speed: 6, reward: iR(4000), damage: iD(4000), scale: 1.3, skin: 0x212121, shirt: 0x212121, pants: 0x212121, face: 'blank', ilook: 'apparition', glowC: 0x9e9e9e, flying: true },
  iHellspeed: { name: 'Hellspeed', hp: 500, speed: 12, reward: iR(500), damage: iD(4500), scale: 1.2, skin: 0x1c1c1c, shirt: 0x111111, pants: 0x111111, face: 'flameEye', ilook: 'hellspeed', glowC: 0xff6d00,
    defense: 3, freezeImmune: true, fireImmune: true, shield: true, phase2: 'iHellspeedBare' },
  iHellspeedBare: { name: 'Hellspeed', hp: 4000, speed: 12, reward: iR(4000), damage: iD(4500), scale: 1.2, skin: 0x1c1c1c, shirt: 0x111111, pants: 0x111111, face: 'flameEye', ilook: 'hellspeed', glowC: 0xff6d00,
    defense: 3, freezeImmune: true, fireImmune: true },
  iHellflame: { name: 'Hellflame Reactor', hp: 1000, speed: 4.2, reward: iR(1000), damage: iD(5000), scale: 1.4, skin: 0xff6d00, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'blank', ilook: 'hellflame', glowC: 0xff6d00,
    defense: 1, freezeImmune: true, fireImmune: true, shield: true, phase2: 'iHellflameBare' },
  iHellflameBare: { name: 'Hellflame Reactor', hp: 4000, speed: 4.2, reward: iR(4000), damage: iD(5000), scale: 1.4, skin: 0xff6d00, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'blank', ilook: 'hellflame', glowC: 0xff6d00,
    defense: 1, freezeImmune: true, fireImmune: true },
  iPrompter: { name: 'Prompter', hp: 6500, speed: 6.6, reward: iR(6500), damage: iD(6500), scale: 1.35, skin: 0xff6d00, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'sad', ilook: 'prompter', glowC: 0xff3d00,
    freezeImmune: true, fireImmune: true },
  iVengefulSpeed: { name: 'Vengeful Speed', hp: 1000, speed: 18, reward: iR(1000), damage: iD(6000), scale: 1.1, skin: 0x616161, shirt: 0x311b92, pants: 0x1a1a2e, face: 'indigo', ilook: 'vengefulSpeed', glowC: 0x7c4dff,
    defense: 1, freezeImmune: true, shield: true, phase2: 'iVengefulSpeedBare' },
  iVengefulSpeedBare: { name: 'Vengeful Speed', hp: 5000, speed: 18, reward: iR(5000), damage: iD(6000), scale: 1.1, skin: 0x616161, shirt: 0x311b92, pants: 0x1a1a2e, face: 'indigo', ilook: 'vengefulSpeed', glowC: 0x7c4dff,
    defense: 1, freezeImmune: true },
  iOverlord: { name: 'Overlord', h: 5.2, hp: 500000, speed: 3.9, reward: 0, damage: 1e6, scale: 4, skin: 0xfafafa, shirt: 0xfafafa, pants: 0x111111, face: 'overlord', ilook: 'overlord', glowC: 0xff1744,
    boss: true, defense: 2, freezeImmune: true, shockImmune: true, ampCap: 0.6,
    taunt: { time: 7, maxHit: 30 },
    backup: { at: 0.6, type: 'iAmplifier', n: 2 },
    despair: { speed: 2.5, defense: 10, maxHit: 780, summon: 'iChampion', n: 2 },
    moves: { first: 10, every: 8, list: [
      { key: 'thunderstorm', w: 2, n: 6, radius: 3, stun: 3 },
      { key: 'concLightning', w: 2, range: 22, stun: 3.5 },
      { key: 'callUnits', w: 1, list: ['iTranquil', 'iCorruption'], n: 2, name: 'Summoning' },
      { key: 'telekinesis', w: 2, n: 2, radius: 6, stun: 3, dmg: 0, flight: 1.6 }] },
    intro: '👑 FINAL BOSS: the OVERLORD, leader of the XCF\'s Orion Arm! His Taunt lets almost nothing through at first. At 60% health he calls in Amplifiers that heal him: destroy them!' },
  // Overlord Amplifier: a huge machine that never moves and keeps healing the Overlord (`amp.heal` of his max health per second).
  iAmplifier: { name: 'Overlord Amplifier', model: 'amplifier', h: 5, hp: 25000, speed: 0, reward: iR(25000), damage: 0, scale: 2.4, skin: 0xd50000, shard: 0xff1744,
    defense: 10, freezeImmune: true, shockImmune: true, amp: { speed: 0, heal: 0.008 } },

  // ---------------------------------------------------------------- Void mode enemies (2026-11-09 spec)
  // Void mode plays the 40 Tower Battles Survival waves (keys v*, stats from the user's doc: health
  // as listed, speed = studs/s x3, word speeds guessed), then 10 more. Wave 40 ends with the False
  // Void (the Tower Battles Void), wave 45 brings it back in void armor, and wave 50 is the real VOID
  // (the TDX Tower Battles mode Void, with its own Abyss Spawns). Rewards vR(hp) and base damage
  // vD(hp) use the same guessed curves as Insane.
  // blook: which outfit tbParts (models.js) gives it. noVoidArmor: never rolls void armor.
  // Void armor (DIFFICULTIES.void.voidArmor): any wave enemy may spawn wearing it (each wave's `va`
  //   is the chance; a group's `voidArmor` mod forces it). See Sim.armorUp.
  // vb: Void boss moves, run by Sim.voidBoss. Each has `first` (s after spawning) and `every` (none:
  //   used once). Keys:
  //   slash { range, time }: Guardian axe. A ground tower in range bleeds: it can't attack, use
  //     abilities or be upgraded for `time` s. Air and cliff towers are safe.
  //   shockwave { radius, stun, unitDmg } / stomp { radius, stun, unitDmg }: False Void. Stuns ground
  //     towers (not air or cliff ones) and hurts units in the radius.
  //   summon { n: [min, max], list }: pulls Spawns out of its body (no cash).
  //   abyss { stun }: VOID From the Abyss. Stuns every tower, even stun-immune ones, and kills every unit.
  //   corruption { share }: VOID turns `share` of the attacking towers to its side for good (they stop
  //     working, but sell for `GAME.corruptSell` more) and destroys that share of the units.
  //   devastation { radius, stun, dmg }: stomp, only when a tower is in range; ignores stun immunity.
  //   army { list }: Unforeseen Army. [type, n] pairs appear all along the path (no cash).
  //   meteors { rocks: [[dmg, radius, n]], stun, flight }: Abyssal Strikedown. Purple rocks fall on
  //     random towers; each stuns (even stun-immune towers) and hurts the towers it lands on.
  //   telekinesis { min, n, slow, time }: only with `min`+ Warships out. Destroys `n` of them, and
  //     every tower works `slow` slower for `time` s.
  // arrive: { title, sub, toast } a banner when it first appears.
  vNormal: { name: 'Normal', hp: 4, speed: 9.6, reward: vR(4), damage: vD(4), scale: 1, skin: 0x7cb342, shirt: 0x6d4c41, pants: 0x5d4037,
    intro: '🟣 Void mode: the 40 Tower Battles waves, and 10 more. Watch out for VOID ARMOR: a purple shield, extra armor, and tendrils that lash your towers!' },
  vSpeedy: { name: 'Speedy', hp: 3, speed: 15, reward: vR(3), damage: vD(3), scale: 0.95, skin: 0x4fc3f7, shirt: 0x6d4c41, pants: 0x5d4037 },
  vSlow: { name: 'Slow', hp: 16, speed: 4.5, reward: vR(16), damage: vD(16), scale: 1.1, skin: 0x33691e, shirt: 0x4e342e, pants: 0x3e2723 },
  vBoss1: { name: 'Boss1', hp: 180, speed: 4.2, reward: vR(180), damage: vD(180), scale: 1.5, skin: 0xaed581, shirt: 0x37474f, pants: 0x263238, blook: 'boss1',
    boss: true, iceResist: 0.2, intro: '🧟 Boss1! A big zombie in diamond-plate clothes.' },
  vHidden: { name: 'Hidden', hp: 10, speed: 9.6, reward: vR(10), damage: vD(10), scale: 1, skin: 0x1a237e, shirt: 0x111111, pants: 0x111111, blook: 'hidden', hidden: true,
    intro: '👻 Hidden zombies! Only towers with hidden detection can see them.' },
  vMystery: { name: 'Mystery', hp: 10, speed: 9.6, reward: vR(10), damage: vD(10), scale: 1, skin: 0x4fc3f7, shirt: 0x29b6f6, pants: 0x0288d1, blook: 'mystery',
    cage: ['vNormal', 'vNormal', 'vSpeedy', 'vSpeedy', 'vSlow', 'vSlow', 'vBoss1', 'vHidden', 'vHidden'], cageHp: 1, // Boss1 half as likely
    intro: '❓ Mysteries turn into a Normal, Speedy, Slow, Boss1 or Hidden when they die!' },
  vNecro: { name: 'Necromancer', hp: 200, speed: 4.5, reward: vR(200), damage: vD(200), scale: 1.3, skin: 0x9e9e9e, shirt: 0x111111, pants: 0x111111, blook: 'necro',
    boss: true, summon: { type: 'vSummon', n: [2, 3], every: 6, noCash: true },
    intro: '💀 The Necromancer! Every few seconds it slams its staff and raises Summons.' },
  vSummon: { name: 'Summon', hp: 7, speed: 9.6, reward: 0, damage: vD(7), scale: 0.95, skin: 0xc0ca33, shirt: 0x6d4c41, pants: 0x5d4037, blook: 'summon' },
  vBoss2: { name: 'Boss2', hp: 1600, speed: 3.2, reward: vR(1600), damage: vD(1600), scale: 1.9, skin: 0x33691e, shirt: 0x8d6e63, pants: 0x6d4c41, blook: 'boss2',
    boss: true, iceResist: 0.13, intro: '🧟 Boss2! Slow, limping, and very tough.' },
  vLava: { name: 'Lava', hp: 120, speed: 7.8, reward: vR(120), damage: vD(120), scale: 1.1, skin: 0xff6d00, shirt: 0x212121, pants: 0x212121, lava: 0xff6d00,
    fireImmune: true, freezeImmune: true, corpse: 'vPetrified',
    intro: '🌋 Lava zombies can\'t be frozen or burned, and they turn into Petrified statues when they die. Statues block shots aimed at zombies behind them.' },
  vPetrified: { name: 'Petrified', hp: 60, speed: 0, reward: vR(60), damage: 0, scale: 1.1, skin: 0x1c1c1c, shirt: 0x1c1c1c, pants: 0x1c1c1c, blook: 'statue',
    remains: true, decay: 20, noVoidArmor: true, danceImmune: true, blockShots: 1.6 }, // blockShots: radius that stops shots aimed past it
  vHiddenBoss: { name: 'Hidden Boss', hp: 800, speed: 9, reward: vR(800), damage: vD(800), scale: 1.6, skin: 0x1a237e, shirt: 0x111111, pants: 0x111111, blook: 'hiddenBoss',
    boss: true, hidden: true, intro: '👻 The Hidden Boss! Tough, fast and hidden.' },
  vToxic: { name: 'Toxic', hp: 140, speed: 12, reward: vR(140), damage: vD(140), scale: 1.15, skin: 0x76ff03, shirt: 0x8d6e63, pants: 0x6d4c41, blook: 'toxic',
    blast: { radius: 6, stun: 5, units: 100, color: 0x76ff03 },
    intro: '🧪 Toxic zombies burst into gas when they die: nearby towers get sick (stunned) and units take damage!' },
  vLightning: { name: 'Lightning', hp: 120, speed: 24, reward: vR(120), damage: vD(120), scale: 1, skin: 0xffee58, shirt: 0x81d4fa, pants: 0x4fc3f7, blook: 'lightning',
    shockImmune: true, intro: '⚡ Lightning zombies are extremely fast, and electricity can\'t stun them!' },
  vSlime: { name: 'Slime', model: 'slime', h: 2.2, hp: 560, speed: 9.6, reward: vR(560), damage: vD(560), scale: 2.4, skin: 0x76ff03, color: 0x64dd17,
    deathSpawn: { list: ['vGoo'], n: [3, 4] }, intro: '🟢 Slimes split into 3-4 Goos when they die!' },
  vGoo: { name: 'Goo', model: 'slime', h: 2.2, hp: 120, speed: 15, reward: vR(120), damage: vD(120), scale: 1.3, skin: 0x43a047, color: 0x2e7d32, noVoidArmor: true },
  vMystery2: { name: 'Mystery2', hp: 100, speed: 9.6, reward: vR(100), damage: vD(100), scale: 1.05, skin: 0xff1744, shirt: 0xd50000, pants: 0xb71c1c, blook: 'mystery2',
    cage: ['vBoss2', 'vLava', 'vSlime', 'vHiddenBoss', 'vLightning'], cageHp: 1,
    intro: '❓ Mystery2! These turn into a Boss2, Lava, Slime, Hidden Boss or Lightning when they die.' },
  vBoss3: { name: 'Boss3', hp: 3000, speed: 15.3, reward: vR(3000), damage: vD(3000), scale: 1.5, skin: 0xfff59d, shirt: 0xffc107, pants: 0xffa000, blook: 'boss3',
    boss: true, intro: '🎩 Boss3! Very tough and very fast, in a gold tuxedo.' },
  vBoss4: { name: 'Boss4', hp: 7400, speed: 9, reward: vR(7400), damage: vD(7400), scale: 2.6, skin: 0x880e4f, shirt: 0x3e2723, pants: 0x3e2723, blook: 'boss4',
    boss: true, freezeImmune: true, danceImmune: true, intro: '🦾 Boss4! A maroon giant with pipes and a huge chained arm. It can\'t be frozen or made to dance.' },
  vNecroBoss: { name: 'Necromancer Boss', hp: 15000, speed: 7.8, reward: vR(15000), damage: vD(15000), scale: 2, skin: 0xd7ccc8, shirt: 0x1a237e, pants: 0x111111,
    blook: 'necroBoss', boss: true, summon: { type: 'vFireSpirit', n: [2, 3], every: 8, noCash: true },
    intro: '🎩 The Necromancer Boss! Every 8 seconds it summons Fire Spirits.' },
  vFireSpirit: { name: 'Fire Spirit', hp: 700, speed: 15, reward: 0, damage: vD(700), scale: 1.1, skin: 0x212121, shirt: 0x212121, pants: 0x212121, blook: 'fireSpirit',
    fireImmune: true },
  vGuardian: { name: 'Guardian', hp: 60000, speed: 2.4, reward: vR(60000), damage: 1e5, scale: 3, skin: 0x424242, shirt: 0x4a148c, pants: 0x311b92, blook: 'guardian',
    boss: true, void: true, freezeImmune: true, shockImmune: true, noVoidArmor: true, vb: { slash: { first: 6, every: 12, range: 16, time: 20 } },
    intro: '🪓 A Guardian of the Void! Its axe makes a tower bleed for 20 seconds: no attacks, abilities or upgrades. Air and cliff towers are safe.' },
  // The False Void: the Tower Battles Void. Its health bar and the dark sky are the voidWorld ones.
  vFalseVoid: { name: 'False Void', hp: 500000, speed: 2.4, reward: vR(500000), damage: 1e5, scale: 5.5, skin: 0x150a1c, shirt: 0x1c0a22, pants: 0x100614,
    face: 'voidKing', vlook: 'king', vvein: 0x9c27b0, vglow: 0xd500f9, void: true, boss: true, statusImmune: true, noVoidArmor: true, voidWorld: 1, barName: 'THE FALSE VOID', barSub: 'The Tower Battles Void',
    vb: {
      shockwave: { first: 3, radius: 70, stun: 7, unitDmg: 4000 },
      stomp: { first: 12, every: 16, radius: 16, stun: 7, unitDmg: 4000 },
      summon: { first: 9, every: 20, n: [3, 4], list: ['vSpawn1', 'vSpawn2', 'vSpawn3', 'vSpawn4'] },
    },
    arrive: { title: 'THE FALSE VOID', sub: '"I guess... I\'ll just have to kill you MYSELF!"',
      toast: '🟣 The False Void! Its scream and stomps stun ground towers for 7s and crush units. Air and cliff towers are safe.' } },
  vSpawn1: { name: 'Spawn1', hp: 1200, speed: 9.6, reward: 0, damage: vD(1200), scale: 1.1, skin: 0x7e6a8f, shirt: 0x6a1b9a, pants: 0x4a148c, blook: 'spawn', void: true, noVoidArmor: true },
  vSpawn2: { name: 'Spawn2', hp: 900, speed: 9.6, reward: 0, damage: vD(900), scale: 1.1, skin: 0x8d6e63, shirt: 0x4a148c, pants: 0x311b92, blook: 'spawn', void: true, noVoidArmor: true },
  vSpawn3: { name: 'Spawn3', hp: 1400, speed: 4.5, reward: 0, damage: vD(1400), scale: 1.2, skin: 0x6d4c41, shirt: 0x4a148c, pants: 0x311b92, blook: 'spawn', void: true, noVoidArmor: true },
  vSpawn4: { name: 'Spawn4', hp: 1800, speed: 9.6, reward: 0, damage: vD(1800), scale: 1.3, skin: 0x795548, shirt: 0x7b1fa2, pants: 0x4a148c, blook: 'spawn', void: true, noVoidArmor: true },
  // VOID: the real final boss (TDX Tower Battles mode). No damage resistances; stuns and slows do nothing.
  vVoid: { name: 'VOID', hp: 900000, speed: 3, reward: 0, damage: 1e5, scale: 6, skin: 0x0d0612, shirt: 0x120818, pants: 0x0d0612,
    face: 'voidKing', vlook: 'king', vvein: 0x7b1fa2, vglow: 0xd500f9, blook: 'trueVoid', void: true, boss: true, statusImmune: true, burnable: true,
    noVoidArmor: true, voidWorld: 2, finale: true, barName: 'VOID', barSub: 'From the Abyss',
    vb: {
      abyss: { first: 4, stun: 6 },
      devastation: { first: 15, every: 25, radius: 15, stun: 6, dmg: 150 },
      army: { first: 15, every: 120, list: [['vMystery2', 10], ['vHiddenBoss', 10], ['vAbyss1', 3], ['vAbyss2', 2], ['vAbyss3', 1], ['vAbyss4', 1]] },
      corruption: { first: 30, every: 100, share: 0.1 },
      meteors: { first: 30, every: 82, stun: 1, flight: 1.6, rocks: [[75, 1.25, 3], [125, 1.25, 12], [150, 1.5, 2], [155, 2.5, 1], [175, 3, 1], [250, 3, 1]] },
      telekinesis: { first: 6, every: 25, min: 2, n: 2, slow: 0.4, time: 5 },
    },
    arrive: { title: 'VOID', sub: 'From the Abyss… the real one has come.',
      toast: '🟣 The real VOID! He stuns every tower and wipes out your units, corrupts towers to his side, and calls down meteors and armies. Sell corrupted towers!' } },
  // Abyss Spawns: VOID's own spawns (only from Unforeseen Army). Lasers and golden towers barely hurt them.
  vAbyss1: { name: 'Abyss Spawn 1', hp: 4444, speed: 8.4, reward: 0, damage: vD(4444), scale: 1.2, skin: 0x3e2723, shirt: 0x6a1b9a, pants: 0x4a148c, blook: 'abyss',
    void: true, laserResist: 0.95, goldResist: 0.95, noVoidArmor: true },
  vAbyss2: { name: 'Abyss Spawn 2', hp: 6666, speed: 6.6, reward: 0, damage: vD(6666), scale: 1.6, skin: 0x3e2723, shirt: 0x6a1b9a, pants: 0x4a148c, blook: 'abyss',
    void: true, laserResist: 0.95, goldResist: 0.95, noVoidArmor: true },
  vAbyss3: { name: 'Abyss Spawn 3', hp: 3333, speed: 27, reward: 0, damage: vD(3333), scale: 1.1, skin: 0x3e2723, shirt: 0x6a1b9a, pants: 0x4a148c, blook: 'abyss',
    void: true, laserResist: 0.95, goldResist: 0.95, noVoidArmor: true },
  vAbyss4: { name: 'Abyss Spawn 4', hp: 9999, speed: 9.9, reward: 0, damage: vD(9999), scale: 1.7, skin: 0x7b1fa2, shirt: 0x6a1b9a, pants: 0x6a1b9a, blook: 'abyssBig',
    void: true, laserResist: 0.95, goldResist: 0.95, noVoidArmor: true },
};

// Medium mode stealth versions (e.g. 'fastZombiePlusS' = Stealth Fast Zombie+): hidden, otherwise the same.
for (const k of ['fastZombiePlus', 'heavyZombiePlus', 'revivedBoss1', 'nuclearZombie', 'multiplier2']) {
  ENEMIES[`${k}S`] = { ...ENEMIES[k], name: `Stealth ${ENEMIES[k].name}`, hidden: true, intro: undefined };
}
// Hardcore mode's enemies (see hardcore.js): its own copies of earlier modes' enemies, plus new ones.
addHardcoreEnemies(ENEMIES);
addHalloweenEnemies(ENEMIES); // the Halloween Event's own enemies (see halloween.js)

/**
 * What kind of damage tower `type` at `level` deals with its own attacks: 'bullet', 'laser',
 * 'golden' or null (melee, explosives, fire, ice, electricity...). Explosions, burns and other
 * damage over time never count as bullets or lasers. Bullet and laser resistance use this.
 */
const BULLET_TOWERS = new Set([
  'scout', 'scoutClassic', 'tweeter', 'cowboy', 'john', 'soldier', 'soldierClassic', 'soldierRanger', 'soldierQuarterer', 'operator',
  'marksman', 'marksmanHunter', 'merc', 'mercMilitant', 'commando', 'commandoMinigunner', 'commandoJuggernaut', 'aviator', 'aviatorAce',
  'railgunner', 'railgunnerRanger', 'sniper', 'sniperClassic', 'sniperTactical', 'sniperPenetrator', 'shotgunner', 'shotgunnerPump',
  'shotgunnerCombat', 'crookBoss', 'mobster', 'ghost', 'anarchist', 'pursuit', 'pursuitHeli', 'gatling', 'gatlingMachine', 'turret',
  'turretXwm', 'sentry', 'patrolBoat', 'goldMinigunner', 'goldCrookBoss', 'goldScout', 'goldCowboy', 'goldSoldier', 'goldScoutBase',
  'goldCommando', 'huntsman', 'frostRanger', 'toxicGunner', 'combatMedic', 'scoutHeli', 'jetTrooper', 'combatDrone', 'evoOperator',
  'evoBreacher', 'evoKingpin', 'evoTitan', 'eventCommandoPsycho', 'helicopter', 'hunter', 'doctor', 'sentryEngineer',
  'hiredGun', 'outlaw', 'liberator', 'ruptor', 'raider', 'plunder', 'spectre', 'planeswalker', 'stormwing',
  'shotgunnerGunslinger', 'sniperX', 'marksmanSharpshooter', 'commandoVulcan', 'cowboyBusinessman',
]);
const LASER_TOWERS = new Set(['phaser', 'phaserAccel']);
const kindCache = new Map();
export function damageKind(type, level) {
  const key = `${type}|${level}`;
  if (kindCache.has(key)) return kindCache.get(key);
  const def = TOWERS[type];
  const s = def?.levels[level] ?? {};
  const root = rootType(type);
  const kind = (s.laser ?? def?.laser) || LASER_TOWERS.has(root) ? 'laser'
    : (s.damageType ?? def?.damageType) === 'golden' ? 'golden'
      : BULLET_TOWERS.has(root) ? 'bullet' : null;
  kindCache.set(key, kind);
  return kind;
}

/** A Mercenary Base / Barracks / vehicle unit's gun: lasers (Rail Trooper, Laser Behemoths), otherwise bullets. */
// Units with ignoreBulletResist (Agent 3s) shoot bullets that resistance can't touch.
export const unitGunKind = (d, g) => (d.laser || g.laser || g.rail ? 'laser' : d.ignoreBulletResist || g.ignoreBulletResist ? 'none' : 'bullet');

// Each group: [enemyType, count, secondsBetweenSpawns, startDelaySeconds]
export const WAVES = [
  { groups: [['normal', 5, 1.6, 0]] },
  { groups: [['normal', 8, 1.2, 0]] },
  { groups: [['normal', 6, 1.2, 0], ['fast', 4, 1.0, 4]], note: 'Runners incoming — they are quick!' },
  { groups: [['normal', 10, 1.0, 0], ['slow', 2, 3, 5]], note: 'Tanks have lots of health.' },
  { groups: [['fast', 8, 0.7, 0], ['slow', 4, 2.5, 3]] },
  { groups: [['normal', 14, 0.7, 0], ['fast', 6, 0.6, 4], ['slow', 3, 2, 8], ['lead', 3, 2.5, 6]], note: 'Lead Zombies! Their armor blocks weak bullets. You need towers with lead detection.' },
  { groups: [['slow', 6, 1.6, 0], ['fast', 10, 0.5, 3], ['flying', 6, 1.0, 5]], note: 'Flyers! They fly over the path, so melee towers, traps and vehicles can\'t touch them.' },
  { groups: [['normal', 10, 0.8, 0], ['hidden', 3, 2, 4]], note: 'Hidden Ghouls! Only towers with hidden detection can hit them.' },
  { groups: [['normal', 18, 0.5, 0], ['slow', 8, 1.2, 3], ['hidden', 3, 1.5, 8], ['lead', 4, 1.8, 5]] },
  { groups: [['normal', 10, 0.8, 0], ['boss', 1, 0, 6]], note: 'A Brute is coming!' },
  { groups: [['fast', 16, 0.4, 0], ['slow', 10, 1.0, 2], ['hidden', 8, 1.0, 6], ['flying', 8, 0.7, 4], ['lead', 4, 1.5, 8]] },
  { groups: [['slow', 12, 0.9, 0], ['hidden', 10, 0.8, 4], ['flying', 8, 0.6, 6], ['lead', 6, 1.2, 3], ['boss', 2, 6, 8]], note: 'Final wave!' },
];

// Easy mode: 25 waves of slimes, goblins, spiders and friends, ending with the King Slime.
// Each group: [enemyType, count, secondsBetweenSpawns, startDelaySeconds, health]. Easy sets the
// exact health per wave (it doesn't use GAME.hpScalePerWave); it starts growing from wave 11.
export const EASY_WAVES = [
  { groups: [['slime', 2, 3.0, 0, 3]], note: 'Slimes! Squishy and slow.' },
  { groups: [['slime', 4, 2.5, 0, 3]] },
  { groups: [['slime', 2, 2.5, 0, 3], ['goblin', 1, 0, 6, 10]], note: 'A Goblin! It has more health than a slime.' },
  { groups: [['slime', 3, 2.2, 0, 3], ['goblin', 2, 3.0, 4, 10]] },
  { groups: [['slime', 1, 0, 0, 3], ['goblin', 1, 0, 2.5, 10], ['spider', 1, 0, 5, 17]], note: 'A Spider! Spiders are very fast.' },
  { groups: [['goblin', 2, 2.5, 0, 10], ['spider', 2, 2.5, 4, 17]] },
  { groups: [['ghost', 3, 2.5, 0, 15]], note: 'Ghosts are hidden! You need towers with hidden detection.' },
  { groups: [['ghost', 2, 2.5, 0, 15], ['spider', 2, 2.5, 3, 17], ['shroom', 1, 0, 6, 40]], note: 'A Shroom! It is Poison type, so poison hurts it less.' },
  { groups: [['slime', 1, 0, 0, 3], ['goblin', 2, 2.0, 1.5, 10], ['ghost', 2, 2.0, 4, 15], ['spider', 1, 0, 7, 17]] },
  { groups: [['slime', 3, 2.0, 0, 3], ['giantGoblin', 1, 0, 6, 180]], note: 'A Giant Goblin is coming!' },
  { groups: [['ghost', 2, 2.0, 0, 16], ['shroom', 3, 2.5, 3, 41]], note: 'From now on, enemies get a little tougher every wave.' },
  { groups: [['goblin', 2, 2.0, 0, 12], ['giantGoblin', 1, 0, 4, 182]] },
  { groups: [['slime', 3, 1.8, 0, 6], ['fireSlime', 1, 0, 5, 73]], note: 'A Fire Slime! Fire type: burns hurt it less, frost hurts it more.' },
  { groups: [['ghost', 2, 2.0, 0, 19], ['fireSlime', 2, 2.5, 3, 74]] },
  { groups: [['spider', 4, 1.5, 0, 22], ['golem', 2, 3.0, 4, 75]], note: 'Golems! Very slow, but made of solid rock.' },
  { groups: [['shroom', 1, 0, 0, 46], ['golem', 4, 2.5, 2, 76]] },
  { groups: [['golem', 3, 2.5, 0, 77], ['giantGoblin', 2, 4.0, 4, 187]] },
  { groups: [['shroom', 10, 1.2, 0, 48]], note: 'A whole patch of Shrooms!' },
  { groups: [['golem', 5, 2.0, 0, 79]] },
  { groups: [['reaper', 1, 0, 0, 460]], note: 'A Reaper! It is hidden and very tough.' },
  { groups: [['spider', 2, 1.5, 0, 28], ['reaper', 2, 4.0, 3, 461]] },
  { groups: [['ghost', 1, 0, 0, 27], ['reaper', 3, 3.5, 2, 462]] },
  { groups: [['infernoSlime', 2, 3.0, 0, 413], ['reaper', 1, 0, 4, 463]], note: 'Inferno Slimes! Fire type, and much tougher than Fire Slimes.' },
  { groups: [['infernoSlime', 5, 2.5, 0, 414]], note: 'The ground is wobbling… something huge is coming next wave.' },
  { groups: [['infernoSlime', 2, 3.0, 0, 415], ['kingSlime', 1, 0, 5, 10000]], note: 'Final wave! The King Slime has arrived!' },
];

// Medium mode: 32 waves of upgraded zombies, revived bosses, Multipliers and Grenadiers, with the
// Predator as a miniboss on wave 29 and the Eradicator as the final boss. Spawns are exact from the
// user's spec; gaps and delays are guessed. Each group: [enemyType, count, secondsBetweenSpawns, startDelaySeconds].
// Stealth versions end in S (see the loop after ENEMIES).
export const MEDIUM_WAVES = [
  { groups: [['zombiePlus', 6, 1.5, 0]], note: 'Zombie+! Stronger, faster zombies with metal implants.' },
  { groups: [['zombiePlus', 9, 1.2, 0]] },
  { groups: [['fastZombiePlus', 8, 1.0, 0], ['zombiePlus', 5, 1.2, 3]], note: 'Fast Zombie+ are very quick!' },
  { groups: [['fastZombiePlus', 12, 0.8, 0], ['zombiePlus', 5, 1.2, 4]] },
  { groups: [['fastZombiePlus', 12, 0.7, 0], ['zombiePlus', 10, 0.9, 2], ['heavyZombiePlus', 4, 2.0, 6]], note: 'Heavy Zombie+ have more health.' },
  { groups: [['fastZombiePlus', 7, 0.8, 0], ['zombiePlus', 8, 0.9, 2], ['heavyZombiePlus', 9, 1.5, 4]] },
  { groups: [['heavyZombiePlus', 13, 1.2, 0], ['fastZombiePlus', 8, 0.8, 4]] },
  { groups: [['heavyZombiePlus', 5, 1.5, 0], ['revivedBoss1', 1, 0, 5]], note: 'A Revived Boss 1: lots of health for this early!' },
  { groups: [['zombiePlus', 5, 1.2, 0], ['revivedBoss1', 2, 4, 3]] },
  { groups: [['heavyZombiePlus', 25, 0.6, 0]], note: 'A horde of Heavy Zombie+!' },
  { groups: [['fastZombiePlusS', 15, 0.5, 0]], note: 'Stealth rush! You need hidden detection.' },
  { groups: [['revivedBoss1', 2, 4, 0], ['multiplier1', 1, 0, 5]] },
  { groups: [['revivedBoss1', 2, 4, 0], ['grenadier', 1, 0, 3]] },
  { groups: [['heavyZombiePlus', 30, 0.5, 0], ['multiplier1', 2, 6, 5]] },
  { groups: [['armoredHeavyZombiePlus', 5, 2.0, 0]] },
  { groups: [['revivedBoss1', 6, 2.5, 0], ['grenadier', 1, 0, 6]] },
  { groups: [['superHeavyZombie', 1, 0, 0], ['grenadier', 2, 5, 3]], note: 'A Super Heavy Zombie: 90% bullet resistance.' },
  { groups: [['nuclearZombie', 8, 0.8, 0]], note: 'Nuclear Zombies! Fast, and ice barely works on them.' },
  { groups: [['revivedTitan', 1, 0, 0]], note: 'A Revived Titan: huge health and 92% bullet resistance.' },
  { groups: [['nuclearZombie', 10, 0.8, 0], ['multiplier1', 1, 0, 6]] },
  { groups: [['revivedBoss1', 10, 1.5, 0], ['multiplier2S', 2, 6, 6]], note: 'Stealth Multiplier 2s: each one makes TWO copies of the enemies around it.' },
  { groups: [['revivedTitan', 2, 6, 0], ['grenadier', 2, 6, 3]] },
  { groups: [['superHeavyZombie', 2, 5, 0], ['monster', 1, 0, 6]] },
  { groups: [['revivedTitan', 1, 0, 0], ['nuclearZombieS', 20, 0.5, 3], ['infiltrator', 2, 4, 8]] },
  { groups: [['superHeavyZombie', 3, 4, 0], ['chargerBoss', 1, 0, 6]] },
  { groups: [['monster', 2, 8, 0], ['revivedBoss1S', 6, 2, 3], ['nuclearZombieS', 6, 1, 6]] },
  { groups: [['smasher', 1, 0, 0], ['heavyZombiePlusS', 30, 0.4, 2], ['shocker', 2, 4, 6], ['superHeavyZombie', 1, 0, 10]] },
  { groups: [['monster', 3, 8, 0], ['nuclearZombie', 16, 0.6, 2], ['revivedBoss1', 9, 1.5, 4], ['multiplier1', 1, 0, 14]],
    note: 'Something is hunting you… a miniboss comes next wave.' },
  { groups: [['revivedBoss1', 115, 1.2, 0], ['mPredator', 1, 0, 10], ['monster', 6, 15, 20], ['chargerBoss', 3, 20, 30]],
    note: 'Miniboss: the Predator, with a HUGE crowd behind him!' },
  { groups: [['monster', 6, 6, 0], ['eliteGrenadier', 1, 0, 10], ['revivedAbomination', 1, 0, 20]] },
  { groups: [['smasher', 1, 0, 0], ['infiltrator', 15, 1.5, 4], ['eliteGrenadier', 2, 10, 8]],
    note: 'The ground is shaking… the Eradicator comes next wave.' },
  { groups: [['grenadier', 5, 4, 0], ['eliteGrenadier', 1, 0, 10], ['mEradicator', 1, 0, 15], ['infiltrator', 7, 2, 20], ['chargerBoss', 2, 8, 25], ['revivedAbomination', 2, 10, 30]],
    note: 'FINAL WAVE! The Eradicator has arrived!' },
];

// Hard ("Fallen") mode: 40 waves from the user's 2026-11-09 spec, ending with the Fallen King.
// Spawns are exact (solo); gaps and delays are guessed. Each group: [enemyType, count,
// secondsBetweenSpawns, startDelaySeconds, mods?]. mods (see Sim.spawn): boss, aggro (towers must
// target it), bloated (more health), nimble (faster), hidden, regen (heals over time).
const H_BOSS = { boss: true };
const H_AGGRO = { aggro: true };
export const HARD_WAVES = [
  { groups: [['abnormal', 5, 1.5, 0]], note: 'Hard mode: the Fallen! Abnormals are slow and weak.' },
  { groups: [['abnormal', 8, 1.2, 0]] },
  { groups: [['quick', 4, 1.0, 0], ['abnormal', 6, 1.2, 3]] },
  { groups: [['quick', 8, 0.8, 0], ['abnormal', 8, 1.0, 3]] },
  { groups: [['fSkeleton', 3, 2.0, 0], ['abnormal', 5, 1.0, 3], ['quick', 5, 0.8, 6]], note: 'Fallen Skeletons: more health.' },
  { groups: [['fSkeleton', 5, 1.6, 0]] },
  { groups: [['fDreg', 1, 0, 0], ['abnormal', 9, 0.9, 2, { bloated: true }], ['quick', 3, 1.0, 6, { nimble: true }]],
    note: 'Bloated enemies have more health, Nimble ones are faster.' },
  { groups: [['fDreg', 3, 2.0, 0], ['fSkeleton', 4, 1.5, 3]] },
  { groups: [['fSquire', 1, 0, 0, { aggro: true }], ['abnormal', 6, 1.0, 3], ['fSkeleton', 4, 1.5, 6]],
    note: 'Miniboss: the Fallen Squire! It\'s Aggro: towers in range have to attack it.' },
  { groups: [['fDreg', 3, 2.0, 0], ['breaker2', 2, 2.5, 3], ['fSkeleton', 4, 1.5, 6]] },
  { groups: [['fSquire', 1, 0, 0, H_AGGRO], ['fDreg', 3, 1.8, 3], ['fSkeleton', 3, 1.5, 5], ['breaker2', 3, 2.0, 8]] },
  { groups: [['fSoul', 11, 1.0, 0]] },
  { groups: [['fSkeleton', 5, 1.2, 0], ['fDreg', 3, 1.8, 3], ['fSquire', 1, 0, 8, { nimble: true }]] },
  { groups: [['breaker2', 6, 1.5, 0], ['fSoul', 6, 1.2, 3], ['fallen', 3, 2.0, 7]] },
  { groups: [['fSkeleton', 8, 1.0, 0], ['fSquire', 2, 4, 3, H_AGGRO], ['breaker2', 4, 1.5, 6], ['fallen', 1, 0, 10]] },
  { groups: [['fDreg', 5, 1.5, 0], ['fSoul', 4, 1.5, 3], ['fallen', 3, 2.0, 6], ['fSquire', 2, 4, 8], ['fGiant', 1, 0, 14, H_BOSS]],
    note: 'Boss wave: the Fallen Giant!' },
  { groups: [['fHazmat', 6, 2.0, 0], ['fallen', 2, 3, 6]] },
  { groups: [['fGiant', 1, 0, 0], ['fHazmat', 7, 1.8, 4]] },
  { groups: [['fSquire', 3, 3, 0], ['fDreg', 10, 1.0, 2], ['fallen', 4, 1.5, 5], ['fSoul', 8, 1.0, 8], ['fPossessed', 1, 0, 12]] },
  { groups: [['fallen', 6, 1.2, 0], ['fHazmat', 5, 1.6, 3], ['fSkeleton', 8, 0.9, 5], ['fSquire', 3, 3, 8], ['fNecro', 1, 0, 12]] },
  { groups: [['fCorrupted', 2, 3, 0], ['breaker2', 5, 1.2, 3], ['fSquire', 3, 3, 5], ['fSoul', 8, 1.0, 7], ['fPossessed', 2, 4, 10]] },
  { groups: [['fCorrupted', 3, 2.5, 0], ['fSquire', 3, 3, 3], ['fSeraph', 5, 1.5, 6]] },
  { groups: [['fSquire', 3, 3, 0, { bloated: true, aggro: true }], ['fSeraph', 5, 1.5, 3], ['fNecro', 1, 0, 6], ['fHazmat', 5, 1.5, 8]] },
  { groups: [['fSoul', 7, 1.0, 0], ['fPossessed', 3, 3, 3], ['fHazmat', 4, 1.6, 6], ['fCorrupted', 2, 3, 9, { hidden: true }]],
    note: 'Hidden Corrupted Fallen!' },
  { groups: [['fPossessed', 1, 0, 0], ['fHazmat', 6, 1.5, 2], ['fCorrupted', 3, 2.5, 5], ['fGiant', 3, 5, 8], ['fJester', 1, 0, 16, H_BOSS]],
    note: 'Boss wave: the Fallen Jester!' },
  { groups: [['fNecrotic', 1, 0, 0], ['fGiant', 3, 5, 3], ['breaker4', 8, 1.2, 6]] },
  { groups: [['fGiant', 1, 0, 0], ['fNecrotic', 3, 3, 3], ['fPossessed', 3, 3, 6], ['fSeraph', 8, 1.0, 8], ['fNecro', 1, 0, 12]] },
  { groups: [['fRusher', 7, 1.5, 0]] },
  { groups: [['fRusher', 1, 0, 0], ['fCorrupted', 4, 2, 2], ['breaker4', 10, 1.0, 4], ['fHazmat', 8, 1.2, 6], ['fHero', 1, 0, 10], ['fSeraph', 9, 1.0, 12]],
    note: 'Fallen Heroes: tough and stun-immune.' },
  { groups: [['fRusher', 3, 2, 0], ['fCorrupted', 5, 2, 3], ['fGiant', 4, 4, 6], ['fNecro', 1, 0, 10], ['fShield', 1, 0, 14, H_BOSS], ['fNecrotic', 5, 2.5, 18], ['fSummoner', 1, 0, 24]],
    note: 'Boss wave: the Fallen Shield and the Fallen Summoner!' },
  { groups: [['fHero', 6, 2.5, 0], ['fGiant', 3, 4, 3], ['fHazmat', 7, 1.2, 6], ['fPossessed', 3, 3, 9], ['fCorrupted', 4, 2, 12], ['fNecro', 2, 6, 14], ['fSummoner', 1, 0, 20]] },
  { groups: [['fShield', 1, 0, 0], ['fRusher', 5, 1.5, 3], ['breaker4', 6, 1.2, 6], ['fJester', 2, 8, 10], ['fHero', 4, 2.5, 14]] },
  { groups: [['fNecrotic', 1, 0, 0], ['fCorrupted', 7, 1.5, 2], ['fGiant', 3, 4, 5], ['fNecro', 3, 5, 8], ['fSeraph', 18, 0.6, 10], ['fAngel', 1, 0, 18, H_BOSS]],
    note: 'Boss wave: the Fallen Angel!' },
  { groups: [['fShield', 1, 0, 0], ['fNecrotic', 2, 3, 3], ['fHero', 6, 2, 6], ['fRusher', 6, 1.5, 9], ['fSummoner', 1, 0, 14]] },
  { groups: [['fNecrotic', 1, 0, 0], ['breaker4', 9, 1.0, 2], ['fHero', 5, 2, 5], ['fGiant', 3, 4, 8], ['fNecro', 3, 5, 11], ['fHonorGuard', 1, 0, 16, H_BOSS]],
    note: 'Boss wave: the Fallen Honor Guard!' },
  { groups: [['fGiant', 4, 4, 0, H_AGGRO], ['fCorrupted', 8, 1.2, 3], ['fHero', 10, 1.5, 6], ['fTank', 1, 0, 14]] },
  { groups: [['fCorrupted', 10, 1.0, 0], ['fHero', 12, 1.2, 3], ['fNecro', 3, 4, 6, { regen: true }], ['fPossessed', 15, 0.8, 8], ['fGiant', 3, 4, 12], ['fAngel', 3, 4, 15], ['fSummoner', 2, 8, 18]] },
  { groups: [['fShield', 1, 0, 0], ['fNecrotic', 3, 3, 2], ['fPossessed', 18, 0.7, 4], ['fRusher', 7, 1.2, 7], ['fHero', 8, 1.5, 10], ['fAngel', 5, 3, 13], ['fGuardian', 1, 0, 18], ['fTank', 1, 0, 22]],
    note: 'The Fallen Guardian: its slash stuns your towers.' },
  { groups: [['fTank', 1, 0, 0], ['fRusher', 6, 1.2, 2], ['breaker4', 6, 1.0, 4], ['fShield', 1, 0, 6], ['fHero', 7, 1.5, 8], ['fGiant', 5, 3, 11], ['fJester', 3, 5, 14], ['fGuardian', 1, 0, 18], ['fSummoner', 1, 0, 22]],
    note: 'The air grows cold… the Fallen King comes next wave.' },
  { groups: [['fShield', 1, 0, 0], ['fRusher', 8, 1.2, 2], ['fNecrotic', 3, 3, 4], ['fTank', 1, 0, 7], ['fPossessed', 6, 1.2, 9], ['fHero', 5, 1.5, 11], ['fGiant', 3, 4, 13], ['fAngel', 3, 4, 15], ['fSummoner', 2, 8, 17], ['fGuardian', 2, 8, 20], ['fKing', 1, 0, 26]],
    note: 'FINAL WAVE! The Fallen King has arrived!' },
];

// Expert mode: 30 waves from the user's 2026-11-09 spec, ending with the Beholder. The spec only
// gives the wave where each enemy first shows up; everything else (counts, gaps, delays, the
// waves between) is made up around that. Each group: [enemyType, count, secondsBetweenSpawns,
// startDelaySeconds, mods?] (mods: see HARD_WAVES).
const X_BOSS = { boss: true };
export const EXPERT_WAVES = [
  { groups: [['xDrab', 4, 2.0, 0]], note: 'Expert mode! Cracked Drabs are quick little things.' },
  { groups: [['xDrab', 7, 1.5, 0]] },
  { groups: [['xQuick', 3, 1.5, 0], ['xDrab', 5, 1.2, 3]], note: 'Cracked Quicks are extremely fast!' },
  { groups: [['xDrab', 7, 1.0, 0], ['xQuick', 5, 1.0, 3]] },
  { groups: [['xTrampled', 2, 3, 0], ['xNoticeable', 2, 2, 3], ['xDrab', 6, 1.0, 5]], note: 'Cracked Trampled are tanky, and Noticeables are hidden!' },
  { groups: [['xDrab', 8, 0.9, 0], ['xQuick', 6, 0.8, 3], ['xTrampled', 2, 3, 6]] },
  { groups: [['xNoticeable', 5, 1.5, 0], ['xTrampled', 3, 2.5, 3], ['xQuick', 6, 0.8, 6]] },
  { groups: [['xTrampled', 5, 2.0, 0], ['xDrab', 10, 0.8, 3], ['xNoticeable', 4, 1.5, 6]] },
  { groups: [['xQuick', 12, 0.6, 0], ['xTrampled', 6, 1.8, 3], ['xNoticeable', 6, 1.2, 6]] },
  { groups: [['xDrab', 10, 0.8, 0], ['xTrampled', 4, 2, 3], ['xLimbed', 1, 0, 8]], note: 'A Limbed! Huge arms, lots of health.' },
  { groups: [['xQuick', 8, 0.7, 0], ['xCharger', 3, 2, 3], ['xLimbed', 1, 0, 7]], note: 'Chargers are the 2nd fastest enemy in the game!' },
  { groups: [['xNoticeable', 8, 1.0, 0], ['xCharger', 4, 1.8, 3], ['xLimbed', 2, 4, 6]] },
  { groups: [['xViodrop', 10, 0.6, 0], ['xTrampled', 6, 1.5, 3], ['xLimbed', 2, 4, 6]], note: 'A swarm of Viodrops! Vio enemies resist explosions but bullets wreck them.' },
  { groups: [['xViodrop', 12, 0.5, 0], ['xCharger', 4, 1.5, 3], ['xQuickLimbed', 1, 0, 7]], note: 'A Quick Limbed: a Limbed that runs!' },
  { groups: [['xLimbed', 3, 3, 0], ['xViodrop', 15, 0.5, 3], ['xCharger', 6, 1.2, 6], ['xQuickLimbed', 2, 4, 9]] },
  { groups: [['xViodrop', 12, 0.5, 0], ['xOvercharged', 3, 2.5, 3], ['xQuickLimbed', 2, 4, 6]], note: 'Overcharged: when one dies, the enemies around it speed up a lot!' },
  { groups: [['xLimbed', 3, 3, 0], ['xOvercharged', 3, 2.5, 3], ['xCloaker', 3, 2.5, 6]], note: 'Cloaker Bots are hidden until their shield breaks.' },
  { groups: [['xViodrop', 10, 0.5, 0], ['xCloaker', 3, 2.5, 2], ['xArmoured', 2, 4, 5], ['xViorb', 1, 0, 8], ['xVioGunner', 1, 0, 12]],
    note: 'A Viorb, a Vio Gunner and Armoured Bots! Armoured Bots shrug off bullets: bring explosives.' },
  { groups: [['xArmoured', 3, 3, 0], ['xOvercharged', 5, 1.5, 3], ['xQuickLimbed', 3, 3, 6], ['xCloaker', 4, 2, 8], ['xVioGunner', 2, 6, 11]] },
  { groups: [['xOvercharged', 4, 1.8, 0], ['xArmoured', 2, 4, 3], ['xUndercharged', 3, 2, 6], ['xRusher', 1, 0, 10]],
    note: 'Undercharged: the FASTEST enemy in the game! And a Rusher: fast with lots of health.' },
  { groups: [['xCloaker', 5, 1.5, 0], ['xUndercharged', 4, 1.8, 3], ['xViorb', 1, 0, 5], ['xVioGunner', 2, 5, 7], ['xRusher', 3, 3, 10]] },
  { groups: [['xOvercharged', 6, 1.2, 0], ['xQuickLimbed', 4, 2.5, 3], ['xUndercharged', 6, 1.2, 6], ['xArmoured', 4, 3, 8], ['xRusher', 4, 2.5, 12]],
    note: 'Blood is in the air… the Rebirther comes next wave.' },
  { groups: [['xArmoured', 3, 3, 0], ['xCloaker', 4, 2, 3], ['xRusher', 3, 3, 6], ['xRebirther', 1, 0, 12]],
    note: 'BOSS WAVE: the Rebirther! At half health it sits in its blood bowl: only selling towers (and Enforcement Base / Buccaneer crashes) hurt it then.' },
  { groups: [['xFlagBot', 2, 4, 0], ['xRusher', 4, 2.5, 3], ['xUndercharged', 5, 1.5, 6], ['xVioGunner', 3, 4, 8], ['xArmoured', 3, 3, 11]],
    note: 'Flag Bots: every tower that can reach one has to target it!' },
  { groups: [['xFlagBot', 2, 4, 0], ['xRusher', 5, 2, 3], ['xArmoured', 4, 2.5, 6], ['xDoomelist', 2, 6, 12, X_BOSS]],
    note: 'BOSS WAVE: a pair of Doomelists! Their rockets blow up whole groups of towers.' },
  { groups: [['xRusher', 4, 2, 0], ['xFlagBot', 2, 4, 3], ['xVioRusher', 3, 3, 6], ['xShieldBot', 1, 0, 10], ['xDeathAngel', 1, 0, 16]],
    note: 'BOSS WAVE: the Death Angel! Hurt it and it draws its staff. Watch out for Pure Pain!' },
  { groups: [['xVioRusher', 3, 3, 0], ['xTimeRunner', 2, 4, 3], ['xShieldBot', 1, 0, 6], ['xTimeTitan', 1, 0, 10], ['xTimeCrystal', 1, 0, 14]],
    note: 'Beings of time! Time Runners dash, Time Titans are huge, and Time Crystals shatter into Time Fragments.' },
  { groups: [['xFlagBot', 2, 4, 0], ['xTimeRunner', 4, 2.5, 3], ['xVioRusher', 4, 2.5, 6], ['xShieldBot', 2, 5, 9], ['xTimeTitan', 2, 6, 12], ['xTimeCrystal', 2, 6, 15]] },
  { groups: [['xVioRusher', 5, 2, 0], ['xTimeRunner', 4, 2.5, 3], ['xShieldBot', 2, 5, 6], ['xDoomelist', 2, 6, 9], ['xTimeTitan', 2, 6, 13], ['xTimeCrystal', 2, 6, 16]],
    note: 'Doomelists again, this time not as bosses. Time itself is coming next wave…' },
  { groups: [['xFlagBot', 2, 4, 0], ['xVioRusher', 4, 2.5, 3], ['xTimeRunner', 4, 2.5, 6], ['xShieldBot', 2, 5, 9], ['xTimeTitan', 2, 6, 12], ['xTimeCrystal', 2, 6, 15], ['xBeholder', 1, 0, 20]],
    note: 'FINAL WAVE: the Beholder! At low health it warps you to the Beholder\'s Field.' },
];

// Insane mode: 50 waves from the user's 2026-11-09 spec (wiki wave list), ending with the Overlord.
// The spec gives what spawns in each wave (and often the wave's total health); exact counts, gaps
// and delays are made up around that, aiming at the spec's totals. Each group: [enemyType, count,
// secondsBetweenSpawns, startDelaySeconds, mods?] (mods: see HARD_WAVES).
export const INSANE_WAVES = [
  { groups: [['iSwordsman', 5, 2.0, 0]], note: 'Insane mode! Swordsmen first. Enemies here have Defense: it blocks damage from every hit.' },
  { groups: [['iSwordsman', 8, 1.5, 0]] },
  { groups: [['iSwordsman', 13, 1.0, 0]] },
  { groups: [['iSwordsman', 6, 1.2, 0], ['iNinja', 3, 0.6, 5]], note: 'Ninjas! Fast, and they come in groups.' },
  { groups: [['iNinja', 5, 0.6, 0], ['iSwordsman', 8, 1.0, 4]] },
  { groups: [['iWorker', 4, 1.5, 0], ['iNinja', 5, 0.6, 4], ['iSwordsman', 6, 1.0, 7]], note: 'Workers: slow, but they take a few more hits.' },
  { groups: [['iWorker', 6, 1.2, 0], ['iNinja', 6, 0.6, 4], ['iSwordsman', 8, 0.8, 8]] },
  { groups: [['iSoldier', 8, 1.2, 0], ['iWorker', 4, 1.2, 6]], note: 'Soldiers have 1 Defense: towers that only do 1 damage can\'t hurt them!' },
  { groups: [['iNinja', 6, 0.6, 0], ['iSwordsman', 8, 0.8, 3], ['iWorker', 5, 1.0, 6], ['iSoldier', 6, 1.0, 9], ['iMetallic', 1, 0, 14]], note: 'A Metallic! The first really tough enemy.' },
  { groups: [['iSoldier', 8, 0.9, 0], ['iNinja', 8, 0.5, 4], ['iWorker', 6, 1.0, 7], ['iMetallic', 2, 4, 11]] },
  { groups: [['iSwordsman', 12, 0.6, 0], ['iSoldier', 10, 0.8, 4], ['iNinja', 8, 0.5, 8], ['iMetallic', 3, 3, 12]] },
  { groups: [['iJetpacker', 8, 1.0, 0], ['iSoldier', 3, 1.5, 4]], note: 'FLYING ENEMIES! Jetpackers fly over the path: get towers that can hit them.' },
  { groups: [['iJetpacker', 6, 1.0, 0], ['iDrone', 3, 1.5, 4], ['iSoldier', 6, 1.0, 6], ['iMetallic', 2, 4, 10]], note: 'Drones are very fast!' },
  { groups: [['iDrone', 6, 1.0, 0], ['iJetpacker', 8, 0.8, 3], ['iMetallic', 3, 3, 7], ['iNinja', 10, 0.4, 10]] },
  { groups: [['iSoldier', 8, 0.8, 0], ['iTruck', 2, 4, 3], ['iDrone', 4, 1.2, 8], ['iMetallic', 2, 4, 11]], note: 'Truck M2s resist bullets and drop 4 Soldiers when destroyed!' },
  { groups: [['iTruck', 3, 3, 0], ['iDrone', 6, 1.0, 4], ['iSoldier', 10, 0.7, 7], ['iMetallic', 3, 3, 10]] },
  { groups: [['iMetallic', 4, 2.5, 0], ['iTruck', 3, 3, 4], ['iJetpacker', 8, 0.8, 7], ['iDrone', 6, 1.0, 10]] },
  { groups: [['iDrone', 8, 0.8, 0], ['iTruck', 4, 2.5, 3], ['iMetallic', 5, 2, 7], ['iSoldier', 12, 0.6, 10]],
    note: 'Something big is coming next wave…' },
  { groups: [['iSwordsman', 6, 0.8, 0], ['iNinja', 10, 0.4, 3], ['iJetpacker', 5, 1.0, 6], ['iMetallic', 2, 3, 9], ['iDrone', 5, 1.0, 11], ['iTruck', 2, 3, 13], ['iBerserker', 1, 0, 18]],
    note: 'MINIBOSS: the Berserker! Its Hammer Smash stuns one tower for a long time.' },
  { groups: [['iTeleporter', 7, 1.5, 0], ['iSoldier', 8, 0.8, 4], ['iMetallic', 3, 3, 8]], note: 'Teleporters pull in a Metallic, Drone, UFO or Truck when they die!' },
  { groups: [['iTeleporter', 6, 1.2, 0], ['iDrone', 8, 0.8, 3], ['iTruck', 4, 2.5, 6], ['iJetpacker', 8, 0.8, 9], ['iMetallic', 4, 2.5, 12]] },
  { groups: [['iNinja', 12, 0.4, 0], ['iSprinterM5', 2, 3, 4], ['iTeleporter', 5, 1.5, 7], ['iMetallic', 4, 2.5, 10]], note: 'Sprinter M5s can\'t be frozen or stunned by electricity.' },
  { groups: [['iUfo', 2, 3, 0], ['iJetpacker', 8, 0.8, 3], ['iSprinterM5', 3, 2.5, 6], ['iTeleporter', 6, 1.2, 9], ['iTruck', 3, 3, 12]], note: 'UFOs fly, and have a forcefield to break first.' },
  { groups: [['iJetpacker', 15, 0.6, 0], ['iUfo', 5, 2, 4]], note: 'AN ALL-AIR WAVE! Every enemy flies.' },
  { groups: [['iEliteSoldier', 8, 1.2, 0]], note: 'Elite Soldiers: very fast, glowing blue swords.' },
  { groups: [['iEliteDrone', 4, 1.5, 0], ['iEliteSoldier', 6, 1.0, 4], ['iSprinterM5', 3, 2.5, 7], ['iUfo', 3, 2.5, 10]], note: 'Elite Drones have 10 Defense! Weak hits do nothing to them.' },
  { groups: [['iRaygunner', 3, 2.5, 0], ['iEliteTeleporter', 2, 3, 4], ['iEliteSoldier', 6, 1.0, 7], ['iEliteDrone', 4, 1.5, 10]], note: 'Raygunners and Elite Teleporters!' },
  { groups: [['iMedic', 3, 2.5, 0], ['iEliteSoldier', 8, 0.9, 2], ['iRaygunner', 3, 2.5, 5], ['iSprinterM5', 3, 2.5, 8], ['iEliteTeleporter', 2, 3, 11]], note: 'Field Medics heal the enemies around them!' },
  { groups: [['iShielder', 5, 2.5, 0], ['iRaygunner', 2, 3, 3], ['iEliteTeleporter', 2, 3, 6], ['iEliteSoldier', 6, 1.0, 8], ['iMedic', 4, 2, 10], ['iEliteDrone', 6, 1.0, 12], ['iSprinterM5', 4, 2, 15], ['iMetallic', 3, 2.5, 18]],
    note: 'Shielders: big plasma shields and 4 Defense.' },
  { groups: [['iCarrier', 1, 0, 0], ['iEliteSoldier', 6, 1.0, 3], ['iShielder', 2, 3, 6]], note: 'A Carrier Tank! It releases Elite units when destroyed.' },
  { groups: [['iEliteSwordsman', 12, 0.5, 0], ['iCarrier', 1, 0, 4], ['iShielder', 3, 2.5, 7], ['iMedic', 3, 2, 9], ['iRaygunner', 4, 2, 11]], note: 'Elite Swordsmen!' },
  { groups: [['iCosmil', 4, 2, 0], ['iEliteDrone', 6, 1.0, 3], ['iShielder', 3, 2.5, 6], ['iEliteTeleporter', 3, 2.5, 9], ['iSprinterM5', 4, 2, 12]], note: 'Cosmils have 20 Defense! Use towers with big single hits.' },
  { groups: [['iEngineer', 1, 0, 0], ['iCosmil', 4, 2, 4], ['iEliteSoldier', 8, 0.8, 7], ['iMedic', 3, 2, 10]], note: 'An Engineer! It builds an MK11-Device that keeps summoning Elite Soldiers.' },
  { groups: [['iCarrier', 2, 5, 0], ['iCosmil', 6, 1.5, 3], ['iShielder', 4, 2, 6], ['iUfo', 4, 2, 9], ['iEliteSwordsman', 10, 0.5, 12], ['iRaygunner', 4, 2, 15]] },
  { groups: [['iPureEnergy', 4, 1.5, 0], ['iEngineer', 1, 0, 4], ['iCosmil', 6, 1.5, 7], ['iCarrier', 1, 0, 10], ['iShielder', 4, 2, 13], ['iEliteDrone', 8, 0.8, 16]],
    note: 'Pure Energy: insanely fast, and no hit does more than 250 to it. The Boltmaster comes next wave…' },
  { groups: [['iCosmil', 10, 0.8, 0], ['iPureEnergy', 6, 1.0, 4], ['iShielder', 4, 2, 7], ['iEliteDrone', 8, 0.6, 10], ['iUfo', 5, 1.5, 13], ['iMedic', 6, 1.2, 16],
    ['iCarrier', 2, 4, 19], ['iEngineer', 1, 0, 23], ['iCosmil', 10, 0.8, 26], ['iBoltmaster', 1, 0, 30]],
    note: 'BOSS WAVE: the Boltmaster, with about 50 escorts! Its Bolt Slam slows and stuns the towers around it.' },
  { groups: [['iMothership', 1, 0, 0], ['iCosmil', 8, 1.0, 3], ['iShielder', 4, 2, 6], ['iEliteDrone', 8, 0.8, 9], ['iPureEnergy', 4, 1.2, 12]], note: 'A Mothership! It flies and heals the enemies around it. Shoot it down fast!' },
  { groups: [['iSentinel', 1, 0, 0], ['iCarrier', 2, 4, 3], ['iCosmil', 8, 1.0, 6], ['iMedic', 4, 2, 9], ['iUfo', 6, 1.5, 12]], note: 'A Sentinel: huge health, a shield and 5 Defense.' },
  { groups: [['iSentinel', 2, 5, 0], ['iMothership', 2, 6, 4], ['iCarrier', 2, 4, 8], ['iCosmil', 6, 0.8, 12], ['iPureEnergy', 6, 1.0, 15]],
    note: 'Enemies are getting stronger. The Robotic Overseer is coming next wave…' },
  { groups: [['iSentinel', 2, 5, 0], ['iEliteSoldier', 10, 0.6, 3], ['iCosmil', 10, 0.8, 6], ['iEngineer', 2, 6, 10], ['iMothership', 1, 0, 14], ['iEliteDrone', 15, 0.5, 17], ['iOverseer', 1, 0, 26]],
    note: 'BOSS WAVE: the Robotic Overseer arrives mid-wave! Its rockets and minigun stun towers anywhere.' },
  { groups: [['iVessel', 5, 2.5, 0], ['iKugelblitz', 2, 4, 6]], note: 'Unstable Vessels explode and stun towers when they die, and Kugelblitzes are flying black holes!' },
  { groups: [['iVengeful', 4, 2, 0], ['iVessel', 3, 3, 4], ['iChampion', 1, 0, 9], ['iKugelblitz', 2, 4, 12]], note: 'Vengefuls make the enemies around them faster when they die. And a Vengeful Champion!' },
  { groups: [['iRavagerEnergy', 6, 1.0, 0], ['iVessel', 3, 3, 3], ['iVengeful', 3, 2, 8], ['iAvantGuard', 1, 0, 14]],
    note: 'BOSS WAVE: the Avant Guard! No hit does more than 300 to it, and its Axe Slash slows your towers.' },
  { groups: [['iRavagerEnergy', 18, 0.6, 0], ['iVessel', 5, 2.5, 4], ['iChampion', 2, 6, 9], ['iAvantGuard', 1, 0, 15], ['iVanguard', 1, 0, 22]],
    note: 'BOSS WAVE: the Avant Guard AND The Vanguard! Spread your towers out: its hammer stuns whole lines of them.' },
  { groups: [['iSpirit', 6, 1.2, 0], ['iDivine', 2, 6, 4], ['iVengeful', 3, 2, 9]], note: 'Spirits of Light fly, and Divine Beings keep summoning them!' },
  { groups: [['iVengeful', 3, 2, 0], ['iSpirit', 7, 1.0, 3], ['iDivine', 4, 4, 7], ['iVessel', 3, 3, 12], ['iArchangel', 1, 0, 20]],
    note: 'BOSS WAVE: The Archangel! It flies, so you need flying detection.' },
  { groups: [['iCorruption', 18, 0.8, 0], ['iTranquil', 3, 4, 5], ['iVessel', 1, 0, 12]], note: 'Corruptions (7 Defense) and Tranquils (huge, can\'t be shocked)!' },
  { groups: [['iCorruption', 13, 0.6, 0], ['iTranquil', 4, 3, 3], ['iNull', 6, 0.8, 6], ['iDivine', 3, 5, 9], ['iVengeful', 1, 0, 12], ['iCorruption', 13, 0.6, 14],
    ['iTranquil', 4, 3, 17], ['iNull', 6, 0.8, 20], ['iCorrupted', 1, 0, 24]],
    note: 'BOSS WAVE: The Corrupted! 30 Defense, a huge shield, and it never stops summoning Nulls.' },
  { groups: [['iHardLight', 10, 0.5, 0], ['iBolt', 10, 0.6, 2], ['iMage', 8, 0.8, 4], ['iLightningKing', 8, 0.8, 6], ['iLightspeed', 8, 0.8, 8], ['iUnstable', 20, 0.3, 10],
    ['iRavagerEnergy', 10, 0.5, 12], ['iReactor', 8, 0.8, 14], ['iApparition', 8, 1.0, 16], ['iHellspeed', 8, 0.8, 18], ['iHellflame', 6, 1.0, 20], ['iPrompter', 8, 1.0, 22],
    ['iVengefulSpeed', 8, 0.8, 24], ['iMothership', 3, 3, 26], ['iCarrier', 4, 2.5, 28], ['iKugelblitz', 6, 2, 30], ['iSpirit', 10, 0.8, 32], ['iCorruption', 16, 0.6, 34],
    ['iNull', 10, 0.6, 36], ['iDivine', 3, 4, 38], ['iTranquil', 4, 3, 40], ['iVessel', 5, 2, 42], ['iVengeful', 6, 1.2, 44], ['iChampion', 2, 5, 46], ['iRavager', 2, 5, 48],
    ['iAvantGuard', 2, 8, 52]],
    note: 'THE EVERYTHING WAVE! Hard Light, Bolts, Mages, Ravagers, Reactors, Hellspeeds and more, and the Avant Guard returns!' },
  { groups: [['iCorruption', 6, 1.0, 0], ['iTranquil', 3, 3, 4], ['iDivine', 2, 6, 8], ['iCarrier', 3, 3, 12], ['iMothership', 2, 5, 15], ['iVengeful', 5, 1.5, 18],
    ['iPrompter', 6, 1.2, 22], ['iRavagerEnergy', 10, 0.5, 26], ['iChampion', 1, 0, 30], ['iCorruption', 7, 1.0, 33], ['iOverlord', 1, 0, 38]],
    note: 'FINAL WAVE: the OVERLORD! Destroy his Amplifiers to stop the healing, but then he falls into Despair…' },
];

// Void mode: the 40 Tower Battles Survival waves (exact counts from the user's doc, the top of each
// range), then 10 denser waves full of void armor. Wave 40 ends with the False Void, wave 45 brings
// it back in void armor, and wave 50 is the real VOID. Gaps and delays are made up. Each group:
// [enemyType, count, secondsBetweenSpawns, startDelaySeconds, mods?] (mods: see HARD_WAVES, plus
// `voidArmor`: always spawns in void armor). `va`: the chance any other enemy in the wave spawns in
// void armor (guessed: it grows through the mode).
export const VOID_WAVES = [
  { va: 0.03, groups: [['vNormal', 7, 1.5, 0]], note: 'Void mode! The 40 Tower Battles waves, then 10 more. Some zombies spawn in VOID ARMOR: break the purple shield first.' },
  { va: 0.03, groups: [['vNormal', 11, 1.2, 0]] },
  { va: 0.03, groups: [['vSpeedy', 9, 1.0, 0]], note: 'Speedies! Fast but fragile.' },
  { va: 0.03, groups: [['vNormal', 7, 1.2, 0], ['vSpeedy', 12, 0.8, 5]] },
  { va: 0.04, groups: [['vSlow', 9, 1.5, 0]], note: 'Slows come in big groups and take more hits.' },
  { va: 0.05, groups: [['vNormal', 15, 0.8, 0], ['vSpeedy', 8, 0.8, 6]] },
  { va: 0.05, groups: [['vSpeedy', 8, 0.8, 0], ['vNormal', 5, 1.0, 4], ['vSlow', 8, 1.2, 8]] },
  { va: 0.05, groups: [['vSpeedy', 8, 0.8, 0], ['vNormal', 6, 1.0, 4], ['vSlow', 5, 1.2, 8], ['vBoss1', 1, 0, 14]], note: 'BOSS WAVE: Boss1!' },
  { va: 0.06, groups: [['vSlow', 20, 0.8, 0]] },
  { va: 0.06, groups: [['vHidden', 8, 1.2, 0]], note: 'Hidden zombies! You need towers with hidden detection.' },
  { va: 0.08, groups: [['vSlow', 8, 1.0, 0], ['vBoss1', 2, 4, 6]] },
  { va: 0.08, groups: [['vHidden', 10, 1.0, 0]] },
  { va: 0.08, groups: [['vMystery', 10, 1.2, 0]], note: 'Mysteries turn into a random zombie when they die.' },
  { va: 0.1, groups: [['vSlow', 5, 1.0, 0], ['vBoss1', 2, 4, 3], ['vSpeedy', 8, 0.7, 6], ['vNecro', 1, 0, 11]], note: 'BOSS WAVE: the Necromancer! It raises Summons every few seconds.' },
  { va: 0.1, groups: [['vMystery', 22, 0.7, 0]] },
  { va: 0.1, groups: [['vSlow', 20, 0.7, 0]] },
  { va: 0.1, groups: [['vMystery', 10, 0.8, 0], ['vSpeedy', 2, 0.6, 4], ['vHidden', 2, 0.8, 5], ['vNormal', 2, 0.8, 6], ['vSlow', 2, 1, 7], ['vBoss1', 2, 3, 9],
    ['vNecro', 1, 0, 13], ['vBoss2', 1, 0, 17]], note: 'BOSS WAVE: Boss2!' },
  { va: 0.1, groups: [['vBoss1', 4, 3, 0], ['vNecro', 1, 0, 6], ['vMystery', 6, 1, 8]] },
  { va: 0.12, groups: [['vSlow', 4, 1, 0], ['vLava', 10, 1, 3], ['vBoss1', 1, 0, 12]], note: 'Lava zombies: no freezing or burning, and they leave statues behind.' },
  { va: 0.12, groups: [['vMystery', 15, 0.7, 0], ['vHidden', 4, 1, 5], ['vBoss1', 2, 3, 8], ['vLava', 5, 1, 12]] },
  { va: 0.12, groups: [['vHidden', 6, 0.8, 0], ['vLava', 5, 1, 3], ['vMystery', 8, 0.7, 6], ['vBoss1', 8, 1.5, 9], ['vBoss2', 1, 0, 20]] },
  { va: 0.13, groups: [['vHidden', 6, 0.8, 0], ['vBoss2', 1, 0, 4], ['vHiddenBoss', 1, 0, 8], ['vLava', 12, 0.8, 10]], note: 'BOSS WAVE: the Hidden Boss!' },
  { va: 0.13, groups: [['vToxic', 10, 1, 0], ['vBoss1', 2, 3, 4], ['vBoss2', 1, 0, 8], ['vMystery', 4, 1, 10], ['vHiddenBoss', 2, 4, 13], ['vNecro', 1, 0, 18]],
    note: 'Toxic zombies make nearby towers sick when they die. Keep your towers spread out!' },
  { va: 0.14, groups: [['vBoss1', 4, 2.5, 0], ['vHiddenBoss', 3, 4, 4], ['vLava', 6, 1, 8], ['vBoss2', 1, 0, 14]] },
  { va: 0.14, groups: [['vLava', 10, 0.8, 0], ['vToxic', 5, 1, 4], ['vBoss1', 3, 2.5, 7], ['vBoss2', 1, 0, 11], ['vLightning', 8, 0.6, 14], ['vNecro', 2, 5, 17]],
    note: 'Lightning zombies are extremely fast!' },
  { va: 0.15, groups: [['vSlime', 6, 2.5, 0]], note: 'Slimes split into Goos when they die.' },
  { va: 0.15, groups: [['vBoss2', 3, 4, 0], ['vLightning', 19, 0.4, 5], ['vToxic', 6, 1, 10], ['vBoss1', 1, 0, 15]] },
  { va: 0.15, groups: [['vSlime', 3, 3, 0], ['vBoss2', 1, 0, 5], ['vHiddenBoss', 3, 3, 8], ['vLightning', 12, 0.5, 12], ['vNecro', 1, 0, 17]] },
  { va: 0.16, groups: [['vMystery', 15, 0.6, 0], ['vMystery2', 16, 0.7, 5], ['vLightning', 8, 0.5, 10], ['vSlime', 5, 2, 13], ['vToxic', 4, 1, 17], ['vNecro', 3, 3, 19],
    ['vBoss2', 2, 4, 22], ['vHiddenBoss', 2, 4, 25]], note: 'Mystery2: they turn into much worse zombies!' },
  { va: 0.16, groups: [['vMystery2', 12, 0.7, 0], ['vLightning', 12, 0.5, 4], ['vSlime', 9, 1.5, 8], ['vBoss1', 5, 2, 13], ['vBoss2', 1, 0, 18]] },
  { va: 0.18, groups: [['vMystery2', 10, 0.6, 0], ['vLightning', 10, 0.5, 3], ['vMystery', 8, 0.6, 6], ['vHiddenBoss', 5, 2, 8], ['vLava', 5, 0.8, 11], ['vToxic', 5, 0.8, 13],
    ['vBoss1', 3, 2, 15], ['vSlow', 3, 1, 17], ['vBoss2', 2, 4, 19], ['vSlime', 2, 3, 22], ['vNormal', 2, 1, 24], ['vSpeedy', 2, 1, 25], ['vNecro', 1, 0, 26], ['vBoss3', 1, 0, 30]],
    note: 'BOSS WAVE: Boss3, in a gold tuxedo, and very fast!' },
  { va: 0.18, groups: [['vMystery2', 12, 0.6, 0], ['vLightning', 8, 0.5, 4], ['vBoss2', 6, 2.5, 7], ['vHiddenBoss', 5, 2, 12], ['vBoss3', 2, 4, 17], ['vNecro', 2, 4, 20]] },
  { va: 0.18, groups: [['vMystery2', 14, 0.6, 0], ['vMystery', 10, 0.5, 4], ['vBoss3', 5, 3, 8], ['vHiddenBoss', 2, 4, 14]] },
  { va: 0.2, groups: [['vMystery2', 12, 0.5, 0], ['vLightning', 12, 0.4, 3], ['vBoss3', 10, 2, 6], ['vHiddenBoss', 9, 1.5, 10], ['vNecro', 3, 3, 14], ['vBoss1', 3, 2, 17],
    ['vBoss2', 1, 0, 20]] },
  { va: 0.2, groups: [['vMystery2', 20, 0.5, 0], ['vLightning', 10, 0.4, 4], ['vSlime', 8, 1.2, 7], ['vBoss3', 6, 2, 11], ['vBoss2', 4, 3, 15], ['vBoss1', 2, 2, 19],
    ['vNecro', 2, 3, 21], ['vBoss4', 1, 0, 26]], note: 'BOSS WAVE: Boss4! A giant with a chained arm that can\'t be frozen or made to dance.' },
  { va: 0.22, groups: [['vLightning', 29, 0.35, 0], ['vMystery2', 20, 0.5, 4], ['vLava', 10, 0.7, 8], ['vBoss3', 8, 1.8, 12], ['vBoss4', 4, 4, 17], ['vNecro', 2, 4, 22]] },
  { va: 0.22, groups: [['vLightning', 20, 0.4, 0], ['vBoss3', 6, 2, 4], ['vBoss4', 4, 4, 9], ['vNecro', 4, 3, 14], ['vHiddenBoss', 2, 3, 18], ['vNecroBoss', 1, 0, 24]],
    note: 'BOSS WAVE: the Necromancer Boss! It keeps summoning Fire Spirits.' },
  { va: 0.24, groups: [['vMystery2', 35, 0.4, 0], ['vBoss3', 11, 1.5, 5], ['vBoss4', 6, 3, 11], ['vHiddenBoss', 6, 2, 16], ['vNecroBoss', 1, 0, 22]] },
  { va: 0.25, groups: [['vMystery2', 35, 0.4, 0], ['vHiddenBoss', 12, 1.5, 4], ['vBoss4', 10, 2.5, 9], ['vBoss3', 6, 2, 15], ['vNecroBoss', 3, 5, 20]],
    note: 'The longest wave yet. Something is watching from the void…' },
  { va: 0.25, groups: [['vMystery2', 55, 0.3, 0], ['vBoss3', 25, 1, 4], ['vLightning', 20, 0.4, 8], ['vBoss4', 13, 2, 12], ['vHiddenBoss', 7, 2, 16], ['vBoss2', 5, 3, 20],
    ['vNecroBoss', 4, 5, 24], ['vGuardian', 2, 6, 30], ['vFalseVoid', 1, 0, 40], ['vGuardian', 2, 6, 60]],
    note: 'THE LAST WAVE… or is it? Two Guardians escort the FALSE VOID, and two more follow it.' },
  // Waves 41-50: dense waves, lots of void armor.
  { va: 0.5, groups: [['vMystery2', 40, 0.35, 0], ['vLightning', 20, 0.35, 4], ['vBoss3', 12, 1.2, 8], ['vBoss4', 8, 2.5, 12], ['vHiddenBoss', 6, 2, 16]],
    note: 'The void isn\'t finished with you. From now on, most zombies wear void armor!' },
  { va: 0.55, groups: [['vLava', 30, 0.4, 0], ['vToxic', 30, 0.4, 3], ['vSlime', 10, 1.2, 8], ['vBoss4', 10, 2.5, 12], ['vNecroBoss', 3, 6, 18]] },
  { va: 0.6, groups: [['vMystery2', 50, 0.3, 0], ['vHiddenBoss', 15, 1.2, 4], ['vBoss3', 15, 1.2, 8], ['vGuardian', 2, 8, 16]] },
  { va: 0.6, groups: [['vLightning', 40, 0.3, 0], ['vBoss2', 20, 1, 4, { voidArmor: true }], ['vBoss4', 12, 2, 10], ['vNecroBoss', 4, 5, 15],
    ['vSpawn1', 3, 1, 20], ['vSpawn2', 3, 1, 22], ['vSpawn3', 2, 1.5, 24], ['vSpawn4', 2, 1.5, 26]], note: 'A wall of armored Boss2s!' },
  { va: 0.65, groups: [['vMystery2', 30, 0.35, 0], ['vBoss3', 15, 1.2, 4], ['vBoss4', 10, 2, 9], ['vGuardian', 3, 6, 14], ['vFalseVoid', 1, 0, 26, { voidArmor: true }]],
    note: 'The FALSE VOID returns… in VOID ARMOR. Break its shield, and keep away from its tendrils!' },
  { va: 0.65, groups: [['vMystery2', 60, 0.3, 0], ['vBoss3', 20, 1, 5], ['vBoss4', 15, 1.8, 10], ['vNecroBoss', 6, 4, 15]] },
  { va: 0.7, groups: [['vLightning', 40, 0.3, 0], ['vLava', 30, 0.35, 3], ['vHiddenBoss', 20, 0.8, 7], ['vBoss4', 15, 1.8, 11], ['vGuardian', 4, 6, 17]] },
  { va: 0.7, groups: [['vSpawn1', 20, 0.6, 0], ['vSpawn2', 15, 0.7, 4], ['vSpawn3', 15, 0.8, 8], ['vSpawn4', 10, 1, 12], ['vBoss4', 20, 1.5, 16], ['vNecroBoss', 6, 4, 22]],
    note: 'The void pours out its Spawns!' },
  { va: 0.75, groups: [['vMystery2', 80, 0.25, 0], ['vBoss3', 30, 0.8, 4], ['vBoss4', 20, 1.5, 9], ['vHiddenBoss', 10, 1.2, 14], ['vGuardian', 6, 4, 20]],
    note: 'The sky is tearing open. The real one is coming next wave…' },
  { va: 0.6, groups: [['vToxic', 50, 0.3, 0], ['vLava', 50, 0.3, 2], ['vBoss3', 15, 1, 6], ['vBoss4', 8, 2, 10], ['vNecroBoss', 1, 0, 14], ['vGuardian', 2, 6, 16],
    ['vVoid', 1, 0, 24]],
    note: 'FINAL WAVE. VOID himself has come from the Abyss. Defeat him to win and unlock the Void Traitor!' },
];

/**
 * Difficulty modes for Solo and Co-op. Versus always uses the zombie waves.
 * `waves`: the scripted waves; winning means clearing the last one.
 * Each step up in difficulty has 5 more waves than the one before (Hard 40, Insane 50, ...); Easy (25), Medium (32) and Expert (30) follow the user's specs.
 * `unlock`: a tower winning it gives you (Void: the Void Traitor).
 * Versus always plays the original zombie WAVES (it isn't a difficulty you can pick).
 * `color` and `boss`: the mode's card in the menus is a square of that color with a picture of
 * that enemy (its final boss).
 */
// Harder modes pay more: `cash` multiplies starting cash and wave bonuses, `credits` the credits
// earned at the end, and `shards` is the Dimension Shards for winning.
// Upgrade perks won by beating a mode (DIFFICULTIES[mode].perk): an upgrade level with `perk: key`
// can't be bought until you have it. The text says how to get it.
export const PERKS = { bliss: 'Beat Insane mode' };
// Modes you have to beat before Hardcore unlocks (DIFFICULTIES[mode].needs).
export const HARDCORE_NEEDS = ['easy', 'medium', 'hard', 'expert', 'insane', 'void'];
export const PERK_NAMES = { bliss: "Recon Base's Bliss of Finality upgrade" };

export const DIFFICULTIES = {
  easy: { name: 'Easy', icon: '🟢', color: '#43a047', boss: 'kingSlime', desc: '25 waves. Beat the King Slime to unlock Slime King Patrol.', unlock: 'patrolSlime', waves: EASY_WAVES,
    cash: 1, dmgCash: 1, credits: 1, shards: 1 },
  // cash: multiplies the end-of-wave bonus. dmgCash: cash for each point of damage (GAME.dmgCash);
  // the tougher the mode's zombies, the lower its rate, so it's never more than you need.
  // baseHp / startCash: this mode's base health and starting cash (instead of GAME's). groupBonus:
  // extra starting cash for each player in a group (2+ players). flatHp: enemy health never grows
  // per wave (still more in multiplayer). firstIntermission: seconds before wave 1. timers[i]: once
  // wave i+1 has run that many seconds (and finished spawning), the next wave starts anyway, as if
  // skipped (null: wait until it's cleared).
  medium: { name: 'Medium', icon: '🟠', color: '#fb8c00', boss: 'mEradicator', desc: '32 waves. Beat the Eradicator to unlock John. 2x credits.',
    unlock: 'john', waves: MEDIUM_WAVES, cash: 1.3, dmgCash: 0.6, credits: 2, shards: 2, baseHp: 300, startCash: 725, groupBonus: 125, flatHp: true, firstIntermission: 14,
    timers: [...Array(18).fill(59), ...Array(10).fill(null), 449, 59, 59, null] },
  // mpHp[n-1]: enemy health bonus with n extra players (instead of GAME.mpHpScale).
  hard: { name: 'Hard', icon: '🔴', color: '#e53935', boss: 'fKing', desc: '40 waves. Beat the Fallen King to unlock the laser Commando. 3x credits.',
    unlock: 'eventCommando', waves: HARD_WAVES, cash: 1.6, dmgCash: 0.4, credits: 3, shards: 3, baseHp: 200, startCash: 500, groupBonus: 100, flatHp: true, mpHp: [0.15, 0.25, 0.4] },
  // mpPerEnemy: each enemy's own mpTop / mpPow sets its multiplayer health (none: no bonus).
  expert: { name: 'Expert', icon: '💎', color: '#00acc1', boss: 'xBeholder', desc: '30 waves. Beat the Beholder to unlock the Planeswalker. 4x credits.',
    unlock: 'planeswalker', waves: EXPERT_WAVES, cash: 1.9, dmgCash: 0.6, credits: 4, shards: 4, baseHp: 200, startCash: 600, groupBonus: 100, flatHp: true, mpPerEnemy: true },
  insane: { name: 'Insane', icon: '⏳', color: '#ec407a', boss: 'iOverlord', desc: '50 waves. Beat the Overlord to unlock Bliss of Finality. 5x credits.',
    perk: 'bliss', waves: INSANE_WAVES, cash: 2.2, dmgCash: 0.25, credits: 5, shards: 5, baseHp: 200, startCash: 600, groupBonus: 100, flatHp: true, mpHp: [0.15, 0.25, 0.4] },
  // voidArmor: the Void mutation (see Sim.armorUp). shield: extra shield = that share of max health;
  // armor: extra armor while it's up; slow: walks that much slower; tendril: { range, every, n, mult,
  // min, max } lashes up to n towers in range for mult x sqrt(max health) (kept between min and max).
  void: { name: 'Void', icon: '🟣', color: '#7e57c2', boss: 'vVoid', desc: '50 waves. Beat VOID to unlock the Void Traitor. 6x credits.',
    waves: VOID_WAVES, cash: 2.5, dmgCash: 0.4, credits: 6, shards: 6, unlock: 'traitor', baseHp: 200, startCash: 650, flatHp: true, mpHp: [0.15, 0.25, 0.4],
    voidArmor: { shield: 0.5, armor: 0.3, slow: 0.25, tendril: { range: 9, every: 2.5, n: 2, mult: 0.6, min: 4, max: 200 } } },
  // Hardcore (2026-11-09 spec, see hardcore.js): locked until every mode in `needs` is beaten. Pays
  // Gems (GAME.gems) on top of credits. maxPlayers: co-op rooms hold up to this many. mpHp has an
  // entry for each extra player (up to 5); enemies with their own mpTop / mpPow use those instead.
  // mimic: each wave from `from` on has a `chance` of a rare golden `type` (Wicky).
  hardcore: { name: 'Hardcore', icon: '💀', color: '#37474f', boss: 'txEmperor', desc: '50 brutal waves from seven games, ending with all six final bosses. Pays Gems. Up to 6 players. 7x credits.',
    waves: HARDCORE_WAVES, cash: 3.5, dmgCash: 0.2, credits: 7, shards: 7, gems: true, needs: HARDCORE_NEEDS, maxPlayers: 6,
    baseHp: 200, startCash: 700, groupBonus: 100, flatHp: true, mpPerEnemy: true, mpHp: [0.15, 0.25, 0.4, 0.55, 0.7],
    mimic: { type: 'thWicky', chance: 1 / 1700, from: 10 } },
  // Halloween Event (2026-11-10 spec, see halloween.js). `event`: not one of the mode cards, it has
  // its own button in the top right of the menus. `map`: an event and its map are one thing, the
  // event always plays that map and no other mode can (the map says so too: MAPS[map].event).
  // Open to everyone. Each wave pays its own `bonus` (instead of GAME.waveBonus). mpHp all 0: enemy
  // health doesn't grow with more players (the spec's numbers are for a full server). pot: so the
  // cash is a full server's too, shared between whoever plays: startCash and each wave's bonus are
  // what one of `pot` players gets (solo: 4x, two players: 2x each), and damage cash is split.
  halloween: { name: 'Halloween Event', icon: '🎃', color: '#ef6c00', boss: 'hwJack', desc: '10 spooky waves on Lantern Hill Cemetery. Survive the Reaper, the Demon and JACK, the Pumpkin King. A full server\'s cash is shared between the players: $22,000 to start solo, $5,500 each with four. 100 base health. 3x credits.',
    waves: HALLOWEEN_WAVES, event: true, map: 'cemetery', cash: 1, dmgCash: 1.5, pot: 4, credits: 3, shards: 3, baseHp: 100, startCash: 5500, groupBonus: 0, flatHp: true,
    mpHp: [0, 0, 0, 0, 0], timers: HALLOWEEN_TIMERS },
};
export const DEFAULT_DIFFICULTY = 'easy';
/** The modes on the mode cards, and the special events (each has its own button and its own map). */
export const MODE_KEYS = Object.keys(DIFFICULTIES).filter((k) => !DIFFICULTIES[k].event);
export const EVENT_KEYS = Object.keys(DIFFICULTIES).filter((k) => DIFFICULTIES[k].event);
export const difficulty = (key) => DIFFICULTIES[key] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];

/**
 * Spawn groups for wave `index` (0-based) of `waves`. Past the scripted waves (Versus is endless) it
 * cycles through the last few waves with more and more zombies; enemy HP keeps growing too.
 */
export function waveGroups(index, waves = WAVES) {
  if (index < waves.length) return waves[index].groups;
  const k = index - waves.length;
  const base = waves[waves.length - 4 + (k % 4)].groups;
  const more = 1 + 0.25 * (Math.floor(k / 4) + 1);
  const groups = base.map(([type, count, gap, delay]) => [type, Math.ceil(count * more), gap / Math.min(2, more), delay]);
  if (k % 2 === 1) groups.push(['boss', 1 + Math.floor(k / 6), 5, 6]);
  return groups;
}

/** A tower's max health at level `level` (see GAME.towerHp): more for higher levels and close range. */
export function towerMaxHp(type, level) {
  const s = TOWERS[type].levels[level];
  const base = s.hp ?? GAME.towerHp + GAME.towerHpPerLevel * level;
  const [near, far] = GAME.towerHpShortRange;
  // Judged on the tower's starting range, so upgrades that add range never cost health.
  const r = TOWERS[type].levels[0].range;
  const short = r ? Math.min(1, Math.max(0, (far - r) / (far - near))) : 0;
  return Math.round(base * (1 + GAME.towerHpShort * short));
}

/**
 * Towers where the player picks one option per slot in the tower panel (tower field `choice`):
 * Jester bombs, Biologist plant queues and the Elementalist element. Returns { title, slots,
 * options: [{ key, name }], free } or null. `free`: picking is free and instant (the Elementalist
 * switches with its ability instead, so its panel only shows the element).
 */
const BOMB_NAMES = { fire: 'Fire', ice: 'Ice', poison: 'Poison', confuse: 'Confusion' };
const PLANT_NAMES = { sun: 'Sunflower', ivy: 'Ivy', night: 'Nightshade' };
export function choiceOptions(def, s) {
  if (s.bombs) return { title: 'Bombs', slot: 'Slot', slots: s.slots || 1, options: Object.keys(s.bombs).map((k) => ({ key: k, name: BOMB_NAMES[k] ?? k })), free: true, distinct: true };
  if (s.plants) return { title: 'Plants', slot: 'Queue', slots: s.queues || 1, options: s.plants.map((p) => ({ key: p.key, name: PLANT_NAMES[p.key] ?? p.unit.name })), free: true };
  if (def.choices) return { title: 'Element', slot: '', slots: 1, options: Object.entries(def.choices).map(([key, name]) => ({ key, name })), free: false };
  return null;
}

/** Tower `t`'s pick for every slot (filling empty or no-longer-valid slots with sensible defaults). */
export function choicesOf(def, s, choice) {
  const c = choiceOptions(def, s);
  if (!c) return [];
  const keys = c.options.map((o) => o.key);
  const out = [];
  for (let i = 0; i < c.slots; i++) {
    let k = choice?.[i];
    if (!keys.includes(k) || (c.distinct && out.includes(k))) k = keys.find((x) => !(c.distinct && out.includes(x))) ?? keys[0];
    out.push(k);
  }
  return out;
}

const PICK_TRAP_NAMES = { spike: 'Spikes', mine: 'Landmines', bear: 'Bear Traps' };
/**
 * Towers with several things to choose between: Trapper traps and Mercenary Base units.
 * Each can be switched on or off in the tower panel (`t.off` holds the keys switched off).
 * Returns [{ key, name }], or null when the tower (at this level) has nothing to pick.
 */
export function pickOptions(s) {
  if (s.roster?.length > 1) return s.roster.map((r, i) => ({ key: String(i), name: r.unit.name }));
  const kinds = s.order ? [...new Set(s.order)] : [];
  if (kinds.length > 1) return kinds.map((k) => ({ key: k, name: PICK_TRAP_NAMES[k] ?? k }));
  return null;
}
