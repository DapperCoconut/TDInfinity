// Things the tower tables share: the units towers send out (goons, mercenaries, vehicles...),
// abilities used by more than one tower, and small helpers that build them.
// The tower groups in this folder import what they need from here.

// How a tower entry is written:
// Each level is fully specified (no inheritance) so it is easy to read and tweak.
// Level index 0 is the tower as placed; indices 1-4 are upgrades (shown as Lv 2-5).
// price: credits to unlock in the Loadout & Shop (0 = owned from the start).
// shards: on a base tower, it's bought with Dimension Shards instead of credits.
// gems: on a base tower, it's bought with Gems (from Hardcore) instead of credits.
// placement: 'ground' (default), 'cliff' (cliff tops only) or 'any'.
// burst: shots fired per cycle, burstGap seconds apart. cooldown is the full cycle time,
//        so DPS = damage * burst / cooldown.
// Detection: which special zombies a tower can hit (see detection() in config.js).
//   hidden: per level; Ghouls are invisible to towers without it (unless a Flare Gun reveals them).
//   flying: towers hit flying zombies unless `flying: false` (on the tower or a level).
//   lead:   lead-armored zombies shrug off weak bullets. `lead: true` = from the start,
//           `lead: 2` = from level index 2 (shown as Lv 3); a level can also set it itself.
// Spawner units only hit lead zombies if their unit def says `lead`, and flying ones if they
// are soldiers on foot (or say `flying`). Crashing into a lead zombie always works, but
// nothing on the ground can ram a flyer.

// Crook Boss goons: gangsters on foot. They walk down the path from the castle end, stop to
// shoot zombies in range and crash into zombies that reach them, until they're destroyed or reach the entrance.
export const PISTOL_GOON = { name: 'Pistol Goon', model: 'pistolgoon', soldiers: 1, hp: 40, speed: 4, ram: true, flying: true,
  gun: { damage: 4, cooldown: 0.75, range: 13 } };
export const TOMMY_GOON = { name: 'Tommy Goon', model: 'tommygoon', soldiers: 1, hp: 175, speed: 4, ram: true, flying: true, hidden: true,
  gun: { damage: 3, burst: 5, cooldown: 0.9, range: 15 } };
export const DON_GOON = { name: 'Made Tommy Goon', model: 'dongoon', soldiers: 1, hp: 350, speed: 4, ram: true, flying: true, hidden: true,
  gun: { damage: 6, burst: 6, cooldown: 0.8, range: 16 } };
// Golden Crook Boss goons: the same gangsters in gold, tougher and with longer range.
export const GOLD_PISTOL_GOON = { name: 'Golden Pistol Goon', model: 'goldpistolgoon', soldiers: 1, hp: 60, speed: 4, ram: true, flying: true, lead: true,
  gun: { damage: 6, cooldown: 0.7, range: 16 } };
export const GOLD_TOMMY_GOON = { name: 'Golden Tommy Goon', model: 'goldtommygoon', soldiers: 1, hp: 250, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 4, burst: 5, cooldown: 0.8, range: 18 } };
export const GOLD_TOMMY_GOON_2 = { name: 'Golden Tommy Goon 2', model: 'golddongoon', soldiers: 1, hp: 500, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 8, burst: 6, cooldown: 0.7, range: 18 } };

// Mobster helpers (Mobster, the alternate Crook Boss form). Goons are gangsters on foot like the
// Crook Boss's; Agents are suited bounty hunters with hidden detection.
export const MOB_GOON = { name: 'Goon', model: 'mgoon', soldiers: 1, hp: 25, speed: 4, ram: true, flying: true,
  gun: { damage: 6.5, cooldown: 0.5, range: 12 } };
export const MOB_GOON_2 = { name: 'Goon 2', model: 'mgoon2', soldiers: 1, hp: 85, speed: 4, ram: true, flying: true,
  gun: { damage: 7, burst: 3, cooldown: 1, range: 13 } };
export const MOB_GOON_3 = { name: 'Goon 3', model: 'mgoon3', soldiers: 1, hp: 135, speed: 4, ram: true, flying: true,
  gun: { damage: 9.5, burst: 3, cooldown: 0.5, range: 14 } };
export const AGENT = { name: 'Agent', model: 'agent', soldiers: 1, hp: 40, speed: 4, ram: true, flying: true, hidden: true,
  gun: { damage: 8.5, cooldown: 0.5, range: 14 } };
export const AGENT_2 = { name: 'Agent 2', model: 'agent2', soldiers: 1, hp: 100, speed: 4, ram: true, flying: true, hidden: true,
  gun: { damage: 29, cooldown: 0.5, range: 15 } };
export const AGENT_3 = { name: 'Agent 3', model: 'agent3', soldiers: 1, hp: 175, speed: 4, ram: true, flying: true, hidden: true, lead: true, ignoreBulletResist: true,
  gun: { damage: 50, cooldown: 0.5, range: 16 } };
// AP Rounds (self boost, see HE_AB): 50% more damage for 10s. Ignoring bullet resistance isn't in the game yet.
export const AP_AB = { key: 'ap', name: 'AP Rounds', desc: 'For 10s: 50% more damage, and its bullets ignore bullet resistance', cooldown: 30, duration: 10, self: true, dmg: 1.5, ignoreBulletResist: true };
// Place Bounty: marks the toughest zombie in range for good. When it dies, the player who placed
// the bounty gets `pct` of its max health as cash, up to `cap`.
export const bountyAbility = (pct, cap) => ({ key: 'bounty', name: 'Place Bounty', desc: `Marks the toughest zombie in range. When it dies you get ${Math.round(pct * 100)}% of its max health as cash (up to $${cap.toLocaleString()})`, cooldown: 20, pct, cap });

// Pursuit: the Patrol ability (moves the patrol zone; the aim ring shows the zone's size).
export const patrolAbility = (radius) => ({ key: 'patrol', name: 'Patrol', desc: 'Move its patrol zone to a spot you click', cooldown: 8, aim: true, radius });
// Levels both Pursuit paths share (Lv 1-4).
export const PURSUIT_SHARED = [
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
export const HELI_MOVE = { key: 'patrol', name: 'Move', desc: 'Fly it to a spot you click, anywhere on the map', cooldown: 1, aim: true, radius: 5 };
export const HELI_CHASE = { key: 'chase', name: 'Pursuit', desc: 'For 15s it chases the zombie closest to the base, anywhere on the map', cooldown: 30, duration: 15 };
// Tactical Sniper (Bottom path) Flare Gun.
// Laser Gunner abilities. Shock Rounds (timed self boost): `dmg` x damage, and each shot stuns
// the zombie it hits first for `stun` s. Stealth Sensor: a shockwave that hits every zombie within
// `radius` for `damage` and reveals hidden ones for good (every tower can hit them until they die).
// Operator Bottom path vehicles (see `operator`): each sends its `unit` down the path.
export const JEEP_AB = { key: 'jeep', name: 'Spawn Jeep', desc: 'Sends a 150 HP Jeep that shoots zombies (8 DPS) and rams them', cooldown: 25, vehicle: true,
  unit: { name: 'Jeep', model: 'gunjeep', hp: 150, speed: 7.3, ram: true, gun: { damage: 2, cooldown: 0.25, range: 31 } } };
export const HUMVEE_AB = { key: 'humvee', name: 'Spawn Humvee', desc: 'Sends a 400 HP Humvee that shoots zombies (32 DPS) and rams them', cooldown: 25, vehicle: true,
  unit: { name: 'Humvee', model: 'humvee3', hp: 400, speed: 7.3, ram: true, gun: { damage: 8, cooldown: 0.25, range: 31 } } };
export const LAV_AB = { key: 'lav', name: 'Spawn LAV-25', desc: 'Sends a 1,850 HP LAV-25 that shoots zombies (62.5 DPS) and takes 25% less damage when it rams them', cooldown: 60, vehicle: true,
  unit: { name: 'LAV-25', model: 'lav25', hp: 1850, speed: 7.3, ram: true, ramArmor: 0.25, stunImmune: true, gun: { damage: 12.5, cooldown: 0.2, range: 31 } } };
export const SHOCK_AB = { key: 'shock', name: 'Shock Rounds', desc: 'For 12s: 50% more damage, and each shot stuns the first zombie it hits for 0.3s', cooldown: 30, duration: 12, self: true, dmg: 1.5, stun: 0.3 };
export const sensorAbility = (tier, damage, cooldown) => ({ key: 'sensor', name: `Stealth Sensor ${tier}`, desc: `A shockwave that does ${damage} damage to nearby zombies and reveals hidden ones for good`, cooldown, radius: 10, damage });
export const FLARE_AB = { key: 'flare', name: 'Flare Gun', desc: 'Reveals hidden zombies in its range for 8s so every tower can hit them', cooldown: 30, duration: 8 };
// Combat Shotgunner support abilities (max level of each path). Health Pack heals what has health
// (towers, Engineer sentries and spawned units) within `radius` by `heal` x their max health.
export const HEALPACK_AB = { key: 'healpack', name: 'Health Pack', desc: 'Heals nearby towers, sentries and units by 45% of their max health', cooldown: 30, radius: 12, heal: 0.45 };
// Unstun Power: frees every stunned tower and sentry within `radius` (any owner's).
export const UNSTUN_AB = { key: 'unstun', name: 'Unstun Power', desc: 'Frees every stunned tower and sentry nearby', cooldown: 25, radius: 14 };
// Gatling Gun FPS Mode (every level has it).
export const FPS_AB = { key: 'fps', name: 'FPS Mode', desc: 'Take control: aim with the mouse and hold click to shoot anywhere. Shots pierce 3 zombies and hit 2.5x harder', cooldown: 0.5 };

// Mercenary Base units (see `mercenary`), by tier. All are soldiers on foot.
export const MERC = {
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
export const GRAVE = {
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
export const ELF = {
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
export const RELIC = {
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
export const sunflower = (hp, damage, cooldown, range, hidden = false) => ({ name: 'Sunflower', model: 'plantsun', hp, life: 30, speed: 0, still: true, flying: false, hidden,
  gun: { damage, cooldown, range } });
export const ivy = (hp, damage, cooldown, range, splash, poison) => ({ name: 'Ivy', model: 'plantivy', hp, life: 20, speed: 0, still: true, flying: false, lead: true,
  gun: { damage, cooldown, range, splash, poison } });
export const nightshade = (hp, damage, cooldown, range, confuse) => ({ name: 'Nightshade', model: 'plantnight', hp, life: 20, speed: 0, still: true, flying: true,
  gun: { damage, cooldown, range, confuse } });

// Necromancer skeletons: raised from gravestones, they walk from their grave toward the entrance
// and fight zombies up close (melee, so they can't hit flyers).
export const SKEL = {
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
export const raiseAbility = { key: 'raise', name: 'Raise the Dead', desc: 'Smash every gravestone to summon skeletons from them', cooldown: 5 };

// Engineer sentries, by tier. `decay`: HP lost every second (it breaks down when it hits 0).
export const SENTRY = {
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
export const cloneAbility = (clone, life) => ({ key: 'clone', name: 'Hologram Tower', desc: `Clone a tower on the map and place the hologram anywhere. Costs ${Math.round(clone * 100)}% of that tower's total cost and lasts ${life}s`, cooldown: 5, aim: true, clone, life });
export const HACKER_SHARED = [
  { name: 'Hacker', desc: 'Hacks zombies with a smartphone. Hacked zombies are slowed, pay more cash for damage, and come back as holograms that fight for you.', damage: 0, cooldown: 0.3, range: 11, synapses: 1, ev: 0.45, slow: 0.075, fraud: 0.125, units: 1000, hidden: false },
  { name: 'Signal Booster', desc: 'More range and a stronger slow.', cost: 125, damage: 0, cooldown: 0.3, range: 12.5, synapses: 1, ev: 0.45, slow: 0.1, fraud: 0.125, units: 1000, hidden: false },
  { name: '1337 Skills', desc: 'Hacks 2 zombies at once, sees hidden zombies, tougher holograms and more Wire Fraud.', cost: 1337, damage: 0, cooldown: 0.3, range: 14, synapses: 2, ev: 0.55, slow: 0.1, fraud: 0.15, units: 1000, hidden: true },
  { name: 'Hologram Projector', desc: 'A wrist gadget: its synapses now deal damage, tougher holograms, and unlocks Hologram Tower to clone any tower.', cost: 6500, damage: 10, cooldown: 0.3, range: 15, synapses: 2, ev: 0.625, slow: 0.1, fraud: 0.15, units: 1000, hidden: true,
    abilities: [cloneAbility(0.3, 25)] },
  { name: 'Botnet', desc: 'More damage, 3 synapses, tougher holograms, more Wire Fraud and cheaper clones.', cost: 24000, damage: 22, cooldown: 0.3, range: 16, synapses: 3, ev: 0.675, slow: 0.1, fraud: 0.2, units: 1000, hidden: true,
    abilities: [cloneAbility(0.25, 25)] },
];

// John (Top 5) Rage Mode: towers within `radius` (not other Johns) deal +`boost` damage for `duration` s.
export const RAGE_AB = { key: 'rage', name: 'Rage Mode', desc: 'Nearby towers deal 50% more damage for 8s', cooldown: 60, duration: 8, radius: 16, boost: 0.5 };
// Self boosts (`self`): for `duration` s the tower's damage x`dmg` and range x`range`; `radius`
// turns every shot into an explosion that hurts all zombies around the target; `heal` repairs it.
export const HE_AB = { key: 'he', name: 'HE Rounds', desc: 'For 10s every bullet explodes, with 50% more damage and 20% more range', cooldown: 60, duration: 10, self: true, dmg: 1.5, range: 1.2, radius: 3 };
export const OVERCHARGE_AB = { key: 'overcharge', name: 'Overcharge', desc: 'For 10s: 50% more damage and 25% more range, and it repairs 2,000 health', cooldown: 60, duration: 10, self: true, dmg: 1.5, range: 1.25, heal: 2000 };
// Slammer (Top 5) Grand Slam: every zombie within `radius` takes the tower's damage, is stunned for
// `stun` s even if it can't normally be stunned (bosses too, at full length), and catches fire.
export const GRANDSLAM_AB = { key: 'grandslam', name: 'Grand Slam', desc: 'Stuns every zombie nearby for 3s, even bosses and stun-immune ones, and sets them on fire', cooldown: 45, radius: 12, stun: 3, burn: 40, burnTime: 5 };
// Knockback "force" (Brawler combos and Reposition) is turned into studs pushed back along the path.
export const KNOCK_STUDS = 0.2;
export const BOSS_KNOCK = 0.25; // bosses are knocked back this fraction as far
// Brawler Reposition: leaps to a spot within `reach` studs, hitting every zombie within `radius`
// of where it lands for `damage` with `knock` force.
export const repositionAbility = (damage, reach) => ({ key: 'reposition', name: 'Reposition', desc: `Leap to a spot within ${reach} studs, dealing ${damage} damage and knocking back every zombie it lands on`, cooldown: 15, aim: true, radius: 4, reach, damage, knock: 25 });
/** Abilities that stay switched on for a while (t.active counts down their `duration`). */
// Machine Gunner: Redeploy turns its cone to face the spot you click; Overcharge I-III boost it.
export const REDEPLOY_AB = { key: 'redeploy', name: 'Redeploy', desc: 'Click a spot to turn its firing cone to face it', cooldown: 5, aim: true };
const mgOvercharge = (lvl, dmg, range, rate, duration, cooldown) => ({ key: 'overcharge', name: `Overcharge ${lvl}`, self: true,
  desc: `For ${duration}s: +${Math.round((dmg - 1) * 100)}% damage, +${Math.round((range - 1) * 100)}% range and +${Math.round((rate - 1) * 100)}% firerate`, cooldown, duration, dmg, range, rate });
export const OC_1_AB = mgOvercharge('I', 1.2, 1.2, 1.1, 12, 30);
export const OC_2_AB = mgOvercharge('II', 1.3, 1.3, 1.18, 14, 30);
export const OC_3_AB = mgOvercharge('III', 1.75, 1.4, 1.25, 16, 25);
// Gladiator: War Cry is a self boost (`rate`: firerate multiplier). Not used by the game yet (kept
// for later): cleanse (clears Fatigue / Scared debuffs on it; the game has no such debuffs yet).
export const WARCRY_AB = { key: 'warcry', name: 'War Cry', desc: 'For 15s it swings 65% faster (and shakes off Fatigue and Scared)', cooldown: 30, duration: 15, self: true, rate: 1.65, cleanse: true };
// Commando (event): Concussive Missiles. Click a spot within `reach` of the tower: `count`
// missiles land there `delay` s later, each `damage` within `radius` (ignoring armor, hitting
// lead zombies) and stunning for `stun` s.
export const concussiveAb = (count, damage, stun, reach, cooldown) => ({ key: 'concussive', name: 'Concussive Missiles', aim: true, radius: 1.5, delay: 2, count, damage, stun, reach, cooldown,
  desc: `Fire ${count} missiles at a spot within ${reach} studs: ${damage} damage each in a small blast (ignores armor, hits lead), ${stun}s stun` });
// Swarmer: Bee Swarm Grenade. Click a spot: `damage` to every zombie within `radius`, ignoring
// armor and hitting lead zombies.
export const beeNadeAb = (damage, radius) => ({ key: 'beeNade', name: 'Bee Swarm Grenade', aim: true, cooldown: 15, damage, radius,
  desc: `Throw a bee grenade: ${damage} damage to every zombie within ${radius} (ignores armor, hits lead)` });
// Harvester: Thorns. Click a spot on the path within the tower's range: a patch of thorns grows
// there for `time` s, hurting every ground zombie inside (hidden ones too, not lead) for `damage`
// every `tick` s and slowing them by `slow`. Every Farm of yours inside the Harvester's range
// sprouts its own patch on the closest bit of path, doing `farmMult` of the damage.
export const thornsAb = (damage, tick, radius, time, slow) => ({ key: 'thorns', name: 'Thorns', aim: true, cooldown: 40, damage, tick, radius, time, slow, farmMult: 0.5,
  desc: `Grow thorns on the path: ${damage} damage every ${tick}s and ${Math.round(slow * 100)}% slow within ${radius} for ${time}s (Farms in range grow weaker thorns too)` });
// Elementalist: Switch Element swaps between Fire and Frost (tower field `choice[0]`). `mode`
// abilities only work in that element.
export const ELEMENT_AB = { key: 'element', name: 'Switch Element', desc: 'Swap between Fire mode (burns) and Frost mode (slows)', cooldown: 5 };
// Heatwave (Fire mode): `damage` to every zombie within `radius` of the tower (it sees hidden
// ones), sets them on fire (`burn` per second for `burnTime` s) and knocks them back `knock`.
export const heatwaveAb = (damage, burn, radius, knock) => ({ key: 'heatwave', name: 'Heatwave', mode: 'fire', cooldown: 40, damage, burn, burnTime: 5, radius, knock,
  desc: `Fire mode: a blast of ${damage} damage within ${radius}, then ${burn} burn per second for 5s, knocking zombies back` });
// Ice Turret (Frost mode): click a spot within `reach`: an ice turret (a unit that stands still)
// shoots there for `unit.life` s, slowing zombies and freezing them when fully chilled.
export const iceTurretAb = (unit) => ({ key: 'iceTurret', name: 'Ice Turret', mode: 'frost', aim: true, cooldown: 50, reach: 25, unit,
  desc: `Frost mode: place an Ice Turret (${unit.hp} HP, lasts ${unit.life}s): ${unit.gun.damage} damage every ${unit.gun.cooldown}s within ${unit.gun.range}, slows and freezes` });
export const iceTurret = (damage, cooldown, range, maxSlow) => ({ name: 'Ice Turret', model: 'iceturret', hp: 1000, life: 45, speed: 0, still: true, flying: false, hidden: true,
  gun: { damage, cooldown, range, chill: { chill: 0.34, maxSlow, chillTime: 3, chillFreeze: 2 } } });
// Flame Trooper Fire Ring: a heatwave (see above) without knockback that works in any mode.
// Not used by the game yet (kept for later): splashTransfer (the spec tags it but doesn't say what it does).
// The spec doesn't give its radius: 8 is a guess.
export const FIRE_RING_AB = { key: 'heatwave', name: 'Fire Ring', cooldown: 20, damage: 500, burn: 100, burnTime: 8, radius: 8, knock: 0, splashTransfer: true,
  desc: 'A ring of fire around it: 375 damage to every zombie within 8, then 75 burn per second for 8s' };
// Goo Gunner Spawn Puddle: a goo puddle on the closest bit of path for `time` s. Every `every` s
// (starting right away) it sends out the `units` ({ unit, n }), which walk down the path and ram
// zombies. The spec gives no ram damage: like other ramming units they deal their health.
const GOO = { name: 'Goo', model: 'goo', soldiers: 1, hp: 75, speed: 2.5, ram: true, flying: false };
const BIG_GOO = { name: 'Big Goo', model: 'biggoo', soldiers: 1, hp: 250, speed: 2.5, ram: true, flying: false };
export const PUDDLE_AB = { key: 'puddle', name: 'Spawn Puddle', cooldown: 60, time: 45, every: 13, radius: 2.5, units: [{ unit: GOO, n: 2 }, { unit: BIG_GOO, n: 1 }],
  desc: 'Drops a goo puddle on the path for 45s that sends out 2 Goos (75 HP) and a Big Goo (250 HP) every 13s to ram zombies' };
// Archer (Bowmaster form): cycles through the arrow types it has unlocked (see arrowModes).
export const ARROWS_AB = { key: 'arrows', name: 'Switch Arrows', desc: 'Switch to the next arrow type it has unlocked', cooldown: 0.5 };
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
export const targetSelectAb = (radius) => ({ key: 'targetSelect', name: 'Target Select', aim: true, cooldown: 2, radius,
  desc: 'Pick the spot (within its range) where it fires its shells' });
// MLRS Carpet Bomb: a B-52 flies along the path through the clicked spot and drops `bombs` bombs
// `gap` s apart over a strip `length` long and `width` wide (centered on the spot, lined up with
// the path there), each `damage` within `radius`. The spec gives no blast size: radius 4.5 with
// bombs zig-zagging across the strip is a guess. Not used by the game yet (kept for later):
// needsAirspace (only maps with room for planes; there's one map and it has open sky) and roofs
// blocking bombs (there are no roofs).
export const CARPET_BOMB_AB = { key: 'carpetBomb', name: 'Carpet Bomb', aim: true, cooldown: 120, bombs: 105, gap: 0.04, damage: 2175, length: 180, width: 18, radius: 4.5, delay: 1.5,
  needsAirspace: true, desc: 'A B-52 drops 105 bombs of 2,175 damage along a 180-long strip of path through the spot you click' };
// Psycho Slayer Teleport / Jump: like the Brawler's Reposition (see repositionAbility), but with
// its own key so a level can have both. Jump also stuns (`stun`, not bosses' immunity) where it lands.
// Not used by the game yet (kept for later): ignoreExplosiveResist on Jump (its landing isn't an
// explosion, so explosive resistance never applies to it yet).
export const TELEPORT_AB = { key: 'teleport', name: 'Teleport', desc: 'Instantly move to a spot within 100 studs', cooldown: 10, aim: true, radius: 0, reach: 100, damage: 0, knock: 0 };
export const jumpAb = (damage, stun, radius, cooldown) => ({ key: 'jump', name: 'Jump', aim: true, reach: 100, damage, stun, radius, cooldown, knock: 0, ignoreExplosiveResist: true,
  desc: `Jump to a spot within 100 studs: ${damage.toLocaleString()} damage and a ${stun}s stun to every zombie within ${radius} of the landing` });
// Psycho Slayer passive weapons (see `missiles` on the Warship; extra fields handled by
// fireMissiles): strongest = aims at the toughest zombie in its `range`; minHp = skips zombies
// with less health than that; minRange = deadzone; gap = seconds between its shots; stun /
// stunAny = stuns what it hits (stunAny: stun-immune ones too); fx = 'slam' (a mace hit) or
// 'rail' (a railgun beam) instead of a missile. ignoreExplosiveResist on the Mortar: its shells get
// through explosive resistance.
export const psychoSlam = (damage, stun, every, minHp, stunAny = false) => ({ name: 'Slam Attack', damage, count: 1, every, radius: 2, range: 7, strongest: true, minHp, stun, fx: 'slam', ...(stunAny ? { stunAny } : {}) });
export const psychoRail = (damage, every) => ({ name: 'Railgun Attack', damage, count: 3, gap: 0.55, every, range: 23, radius: 0.5, fx: 'rail' });
export const psychoRockets = (damage, radius, every) => ({ name: 'Rockets', damage, count: 6, every, range: 30, minRange: 6, radius, flying: true });
export const PSYCHO_MORTAR = { name: 'Mortar', damage: 9000, count: 1, every: 50, range: 150, minRange: 25, radius: 4, strongest: true, ignoreExplosiveResist: true };
// Bubble Blower Bubble Companion: a friendly bubble person with no attack. It blocks zombies
// (`block`: zombies touching it can't walk on) until they wear it down; `hurt`: zombies touching
// it hurt it that many times faster than other units (a guess, so one weak zombie can't be held
// for ages: without it a 100 HP companion holds a basic zombie for 50s).
export const BUBBLE_BUDDY = { name: 'Bubble Companion', model: 'bubblebuddy', soldiers: 1, hp: 100, speed: 5, flying: false, block: true, hurt: 5, max: 2 };
// Ice Breaker Ice Shard: a block of ice (a unit that stands still) on the path closest to the
// click, within `reach`. Zombies walking into it take `bump` damage a second and wear it down;
// when it breaks it explodes, freezing everything in the blast (bosses too, for the full time).
// The spec gives no reach, contact damage or freeze time: 25, 25/s and 3s are guesses.
// ignoreIceResist on the unit's explosion: its freeze works fully on ice-resistant enemies.
const ICE_SHARD = { name: 'Ice Shard', model: 'iceshard', hp: 1250, life: 120, speed: 0, still: true, flying: false, bump: 25,
  explode: { damage: 500, radius: 4, freeze: 3, ice: { freezeBoss: 1 }, ignoreIceResist: true } };
export const ICE_SHARD_AB = { key: 'iceShard', name: 'Ice Shard', aim: true, cooldown: 30, reach: 25, radius: 4, unit: ICE_SHARD,
  desc: 'Put a block of ice (1,250 HP, lasts 120s) on the path where you click. When zombies break it, it explodes: 165 damage and freezes everything within 4, even bosses' };
// Ice Breaker Snow Storm: for `duration` s, every zombie within `radius` gets `freeze` freeze
// amount a second (0.06 chill per point, see Cryo Blaster). Radius and duration are guesses.
export const SNOW_STORM_AB = { key: 'snowStorm', name: 'Snow Storm', cooldown: 25, duration: 6, radius: 10, freeze: 100,
  desc: 'A freezing storm around it for 6s: zombies within 10 freeze solid (bosses too, for half the time)' };

// Cryo Helicopter: Set Location flies it anywhere; Follow Player makes it fly along with you
// (your client keeps sending where you are until you pick a spot again).
export const CRYO_MOVE = { key: 'patrol', name: 'Set Location', desc: 'Fly it to a spot you click, anywhere on the map', cooldown: 5, aim: true, radius: 5 };
export const CRYO_FOLLOW = { key: 'follow', name: 'Follow Player', desc: 'It flies along with you (until you use Set Location)', cooldown: 5 };
// Cryo Missiles: { damage, every, radius, maxHits, chill }. The spec's Body Heat loss (-80 / -130 /
// -200) is chill here: 0.3 / 0.5 / 0.75 (a guess; there is no Body Heat in this game).
export const cryoMissile = (damage, every, chill) => ({ name: 'Cryo Missile', damage, count: 1, every, radius: 3, maxHits: 3, range: 23,
  chill: { chill, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 } });

// ---------------------------------------------------------------- evolved tower helpers
// Kingpin gang units (see `evoKingpin`). Lackeys are gunmen with hidden detection; Money Runners
// don't fight, they just pay `cash` to the Kingpin's owner when they are destroyed. Bouncers and
// Contractors join on the Bottom path. `life`: the unit leaves after that many s. `defense`: takes that much less damage from zombies touching it (rams ignore it).
export const LACKEY = [
  { name: 'Lackey', model: 'mgoon', soldiers: 1, hp: 60, speed: 4, ram: true, flying: true, hidden: true, gun: { damage: 5, cooldown: 0.22, range: 12 } },
  { name: 'Lackey', model: 'mgoon2', soldiers: 1, hp: 90, speed: 4, ram: true, flying: true, hidden: true, gun: { damage: 8, cooldown: 0.2, range: 16 } },
  { name: 'Lackey', model: 'mgoon3', soldiers: 1, hp: 215, speed: 4, ram: true, flying: true, hidden: true, gun: { damage: 9, cooldown: 0.16, range: 17.5 } },
  { name: 'Lackey', model: 'mgoon3', soldiers: 1, hp: 315, speed: 4, ram: true, flying: true, hidden: true, gun: { damage: 10, cooldown: 0.12, range: 18 } },
];
export const runner = (hp, cash) => ({ name: 'Money Runner', model: 'agent', soldiers: 1, hp, speed: 5, ram: true, flying: false, cash });
export const BOUNCER = [
  { name: 'Bouncer', model: 'mriot', soldiers: 1, hp: 500, speed: 4, flying: false, hidden: true, lead: true, life: 150, gun: { damage: 25, cooldown: 0.5, range: 8 } },
  { name: 'Bouncer', model: 'mriot2', soldiers: 1, hp: 750, speed: 4, flying: false, hidden: true, lead: true, life: 150, defense: 0.1, gun: { damage: 35, cooldown: 0.5, range: 8 } },
  { name: 'Bouncer', model: 'mriot2', soldiers: 1, hp: 1000, speed: 4, flying: false, hidden: true, lead: true, life: 150, defense: 0.15, gun: { damage: 40, cooldown: 0.5, range: 8.5 } },
];
export const CONTRACTOR = { name: 'Contractor', model: 'agent3', soldiers: 1, hp: 400, speed: 4, flying: true, hidden: true, lead: true, life: 75, gun: { damage: 170, cooldown: 2, range: 35 } };
// Kingpin Bounty: like the Mobster's, with a long cooldown.
export const kingpinBounty = (pct, cap) => ({ ...bountyAbility(pct, cap), cooldown: 120 });
// Breacher SWAT Vans: drive down the path ramming zombies, then explode when destroyed.
// `defense` is not used by the game yet (kept for later).
export const SWAT_VAN = [
  { name: 'SWAT Van', model: 'mrap', hp: 750, speed: 4, ram: true, defense: 0.1, explode: { damage: 350, radius: 6 } },
  { name: 'SWAT Van', model: 'mrap', hp: 1200, speed: 4, ram: true, defense: 0.15, explode: { damage: 450, radius: 6 } },
  { name: 'SWAT Van Gunner', model: 'mrap', hp: 1500, speed: 4, ram: true, defense: 0.15, hidden: true, explode: { damage: 550, radius: 6 }, gun: { damage: 10, cooldown: 0.15, range: 25 } },
];
// Breacher Support Helicopter (Good Coms): moves one of your towers anywhere on the map.
// Not used by the game yet (kept for later).
export const SUPPORT_HELI = { cost: 500, cooldown: 60, first: 25 };

// ---------------------------------------------------------------- wave 6 towers (Warship and friends)
// Golden Mobster units. Golden damage: they hit lead zombies. Not used by the game yet (kept for
// later): ignoreGoldResist on G_REAPER_2 (unit guns shoot bullets, not golden damage, so golden
// resistance never applies to them yet).
export const G_ENFORCER = { name: 'Enforcer', model: 'goldmgoon', soldiers: 1, hp: 110, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 2, cooldown: 0.12, range: 15 } };
export const G_ENFORCER_2 = { name: 'Enforcer 2', model: 'goldmgoon2', soldiers: 1, hp: 300, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 12, cooldown: 0.1, range: 22 } };
export const G_ENFORCER_3 = { name: 'Enforcer 3', model: 'goldmgoon3', soldiers: 1, hp: 825, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 25, cooldown: 0.12, range: 23 } };
export const G_REAPER = { name: 'Reaper', model: 'goldagent', soldiers: 1, hp: 275, speed: 4, ram: true, flying: true, hidden: true, lead: true,
  gun: { damage: 200, cooldown: 2, range: 35 } };
export const G_REAPER_2 = { name: 'Reaper 2', model: 'goldagent3', soldiers: 1, hp: 475, speed: 4, ram: true, flying: true, hidden: true, lead: true, ignoreGoldResist: true,
  gun: { damage: 425, cooldown: 1.5, range: 40 } };
// Golden Mobster Overload (timed self boost). ignoreGoldResist: for its first 18s it gets through golden resistance.
export const OVERLOAD_AB = { key: 'overload', name: 'Overload', desc: 'For 40s it does 123% more damage', cooldown: 60, duration: 40, self: true, dmg: 2.23, ignoreGoldResist: 18 };
export const gBounty = (pct, cap, cooldown) => ({ ...bountyAbility(pct, cap), cooldown });
// Golden Juggernaut Reboot Systems: works while stunned (abilities always do), unstuns it,
// repairs 2,000 health and +25% damage for 7s.
export const REBOOT_AB = { key: 'overcharge', name: 'Reboot Systems', desc: 'Breaks any stun on it, repairs 2,000 health and gives +25% damage for 7s. Works while stunned', cooldown: 10, duration: 7, self: true, dmg: 1.25, heal: 2000, unstunSelf: true };
// Golden Ranger Grenade: stunAny = stuns bosses and stun-resistant zombies too.
export const G_RANGER_NADE = { key: 'frag', name: 'Golden Ranger Grenade', desc: 'Throws a fire-and-shock grenade at its target: 350 damage within 4, a 1s stun (bosses too) and a 50/s burn for 5s', cooldown: 7, radius: 4, damage: 350,
  stun: 1, stunAny: true, burn: 50, burnTime: 5 };
// Golden Mine Layer Crossbow (aimed: the mine lands on the path nearest the spot) and Charged
// Throw (the toughest zombie on the map, flyers too: `damage` within `radius` plus `extra` to it).
export const crossbowAb = (lvl, damage, radius, reach, cooldown) => ({ key: 'crossbow', name: `Crossbow ${lvl}`, aim: true, reach, cooldown,
  desc: `Shoot a ${damage.toLocaleString()}-damage golden mine onto the path at a spot within ${reach} studs. It waits 90s for a zombie`,
  mine: { damage, radius, life: 90 } });
export const CHARGED_THROW_AB = { key: 'chargedThrow', name: 'Charged Throw', cooldown: 20, damage: 1250, extra: 4000, radius: 4, stun: 1, burn: 100, burnTime: 10,
  desc: 'Throws a mine at the toughest zombie on the map (flyers too): 1,250 damage within 4, 4,000 more to it, a 1s stun that works on bosses, and a 100/s burn for 10s' };
// Warship weapons (`missiles`: passive weapons, each on its own timer; see fireMissiles in sim.js).
// focus: every shell of a volley hits the same zombie. air: flying zombies only. flying: this
// weapon can hit flyers even though the ship's main guns can't.
export const XL_HELLFIRE = { name: 'XL Hellfire Missiles', damage: 350, count: 1, every: 1, radius: 3 };
export const MORTARS = { name: 'Mortars', damage: 225, count: 4, every: 5, radius: 3, focus: true };
export const tomahawk = (damage) => ({ name: 'Tomahawk Missiles', damage, count: 1, every: 8, radius: 4 });
export const aaGuns = (damage) => ({ name: 'AA Guns', damage, count: 1, every: 0.2, radius: 3, air: true });
export const gHellfire = (damage) => ({ name: 'Golden Hellfire Missiles', damage, count: 1, every: 1.05, radius: 4.5 });
export const GATLING_TURRET = { name: 'Gatling Turret', damage: 750, count: 1, every: 0.1, radius: 0.5, flying: true };
export const GATLING_BATTERY = { name: 'Gatling Turrets', damage: 1200, count: 1, every: 0.16, radius: 0.5, flying: true };
export const G_MORTARS = { name: 'Golden Mortars', damage: 2500, count: 5, every: 2, radius: 6, focus: true };
export const GLOBAL_REVEAL_AB = { key: 'flare', name: 'Global Stealth Reveal', desc: 'Reveals every hidden zombie on the whole map for 20s so every tower can hit them', cooldown: 25, duration: 20, global: true };
// Shield Tower Unstun Field: frees stunned towers nearby (abilities work while it is stunned).
export const unstunField = (lvl, cooldown, radius) => ({ key: 'unstun', name: `Unstun Field ${lvl}`, desc: 'Frees every stunned tower nearby, even while the Shield Tower is stunned', cooldown, radius });
// Combat Medic Medic Drone: click a spot; for `time` s it heals the `towers` most hurt towers
// within `radius` of it by `heal` per second.
export const medDroneAb = (lvl, towers, heal, radius, cooldown) => ({ key: 'medDrone', name: `Medic Drone ${lvl}`, aim: true, cooldown, towers, heal, radius, time: 60,
  desc: `Send a Medic Drone to a spot: for 60s it heals ${towers} towers within ${radius} by ${heal}/s each` });
// Jet Trooper Fire Rounds: for `duration` s its bullets set zombies on fire.
export const fireRoundsAb = (lvl, duration, burn, cooldown) => ({ key: 'fireRounds', name: `Fire Rounds ${lvl}`, self: true, duration, burn, burnTime: duration, cooldown,
  desc: `For ${duration}s its bullets set zombies on fire (${burn}/s for ${duration}s)` });
// Combat Drone abilities. Shield (barrier): immune to all attacks for `duration` s, clears stuns.
// Spotter: the toughest zombie in range takes `vuln` more damage and is `slow` slower for 10s (bosses: the boss* values).
export const barrierAb = (lvl, duration) => ({ key: 'barrier', name: `Shield ${lvl}`, desc: `Immune to every attack for ${duration}s, and shakes off stuns`, cooldown: 30, duration });
export const spotterAb = (lvl, vuln, slow, bossVuln, bossSlow) => ({ key: 'spotter', name: `Spotter ${lvl}`, cooldown: 30, duration: 10, vuln, slow, bossVuln, bossSlow,
  desc: `Marks the toughest zombie in range for 10s: it takes ${vuln * 100}% more damage and is ${slow * 100}% slower (bosses ${bossVuln * 100}% / ${bossSlow * 100}%)` });
export const DRONE_FPS_AB = { ...FPS_AB, name: 'Direct Control', desc: 'Fly it yourself: WASD to move it anywhere on the map, aim with the mouse and hold click to shoot for 1.5x damage' };
// Void Traitor summons (Summon Troops, `caravan` units `gap` studs apart). Neurons and Void
// Tanks ram zombies; the Void Empress fights with her sword (gun) and Betraying Ward (cannon), and
// her ward is `defense` against contact damage.
const NEURON = { name: 'Neuron', model: 'voidneuron', hp: 2500, speed: 8, ram: true, flying: false };
const VOID_TANK = { name: 'Void Tank', model: 'voidtank', hp: 85000, speed: 3, ram: true, ramArmor: 0.45, flying: false };
const VOID_EMPRESS = { name: 'Void Empress', model: 'voidempress', soldiers: 1, hp: 50000, speed: 3, flying: false, hidden: true, lead: true, defense: 0.8,
  gun: { damage: 6000, cooldown: 6, range: 9 }, cannon: { damage: 250, every: 10, radius: 12, range: 12 } };
export const VOID_RIFT_AB = { key: 'concussive', name: 'Void Rift', aim: true, reach: 60, radius: 4, delay: 1, count: 12, damage: 1500, stun: 0, cooldown: 85,
  desc: 'Opens a black hole over a spot within 60 studs that rains 12 rocks: 750 damage each in a small blast' };
export const SUMMON_TROOPS_AB = { key: 'caravan', name: 'Summon Troops', cooldown: 180, gap: 1.2,
  units: [...Array(25).fill(NEURON), VOID_TANK, VOID_TANK, VOID_EMPRESS],
  desc: 'Sends 25 Neurons, 2 Void Tanks and a Void Empress down the path' };
export const VOID_SLAM_AB = { key: 'voidSlam', name: 'Void Slam', damage: 12500, cooldown: 20, desc: 'Slams its sword on its current target for 6,250 damage' };

// ---------------------------------------------------------------- wave 7 towers (shared pieces)
// cyc: a burst tower's full cycle time: `burst` shots `gap` s apart, then `cd` s before the next burst.
export const cyc = (burst, gap, cd) => Math.round(((burst - 1) * gap + cd) * 1000) / 1000;

export const VINTAGE_FUZE_AB = { key: 'heatwave', name: 'Vintage Fuze', desc: 'A bomb blows up overhead: 150 damage to every zombie within 7 and sets them on fire (20/s for 4s). It also hurts the Rockety (50 damage)', cooldown: 30, damage: 150, burn: 20, burnTime: 4, radius: 7, knock: 0, selfDamage: 50 };
const HG_TANK = { name: 'Airdropped Tank', model: 'hgtank', hp: 350, speed: 3, flying: false, lead: true, gun: { damage: 80, cooldown: 3, range: 23 } };
export const TANK_DROP_AB = { key: 'summon', name: 'Tank Airdrop', desc: 'A tank (350 HP, 145 damage every 3s) drops onto the path where you click', cooldown: 45, aim: true, radius: 4, drop: [{ unit: HG_TANK, n: 1 }] };

// Ducky Nest ducks. The Trojan Duck lets out 4 Ducky Gladiators when it goes down (onDeath); the
// Ducky Engineer builds a sentry at 75%, 50% and 25% of the way down the path (builds).
const DUCK_GLAD = { name: 'Ducky Gladiator', model: 'duckglad', soldiers: 1, hp: 45, speed: 4, flying: false, gun: { damage: 45, cooldown: 1, range: 3.5 } };
const DUCK_SENTRY = { name: 'Ducky Sentry', model: 'ducksentry', hp: 225, life: 60, speed: 0, still: true, flying: true, gun: { damage: 13, cooldown: 0.2, range: 21 } };
export const DUCK = {
  scout: { name: 'Ducky Scout', model: 'duckscout', soldiers: 1, hp: 10, speed: 4, gun: { damage: 4, cooldown: 2.5, range: 9 } },
  soldier: { name: 'Ducky Soldier', model: 'ducksoldier', soldiers: 1, hp: 20, speed: 4, gun: { damage: 1, cooldown: 0.15, range: 12.5 } },
  rail: { name: 'Ducky Railgunner', model: 'duckrail', soldiers: 1, hp: 40, speed: 4, lead: true, gun: { damage: 150, cooldown: 5, range: 20, rail: true } },
  trojan: { name: 'Trojan Duck', model: 'ducktrojan', hp: 150, speed: 3, flying: false, onDeath: { unit: DUCK_GLAD, n: 4 } },
  eng: { name: 'Ducky Engineer', model: 'duckeng', soldiers: 1, hp: 30, speed: 4, flying: false, builds: { at: [0.75, 0.5, 0.25], unit: DUCK_SENTRY } },
};

export const GHOST_MADNESS_AB = { key: 'ghostHands', name: 'Ghost Madness', desc: 'Spends its ghost charges: each ghost hand fires a revolver shot that bounces to 2 more zombies', cooldown: 30, bounces: 2, jump: 8, mult: 1 };
export const OIL_BARREL_AB = { key: 'concussive', name: 'Oil Barrel', desc: 'Drop a barrel on the path where you click. 3s later it gets bombed 3 times (500 damage each)', cooldown: 45, aim: true, reach: 80, radius: 5, delay: 3, count: 3, damage: 500, stun: 0 };
export const SEE_ME_AB = { key: 'seeMe', name: 'Now-You-See-Me', desc: 'A signal that gives it hidden detection for 25s', cooldown: 60, duration: 25 };
export const NUKE_AB = { key: 'nuke', name: 'Nuke', desc: '22,500 damage to every zombie within 25 of its runway, no matter how many', cooldown: 150, damage: 12500, radius: 25 };
export const DRONE_MODE_AB = { key: 'droneMode', name: 'Drone Mode', desc: 'Switch the drone to the next mode it has unlocked: Offense (bombs), Defense (heals towers, stun immunity), Support (+damage to towers nearby)', cooldown: 1 };

// Buccaneer pirate barrel crew (dropped on the middle of the path).
export const CUTLASS = { name: 'Cutlass Pirate', model: 'cutlass', soldiers: 1, hp: 90, speed: 3.5, flying: false, gun: { damage: 210, cooldown: 1, range: 4 } };
export const CORSAIR = { name: 'Corsair', model: 'corsair', soldiers: 1, hp: 40, speed: 3.5, hidden: true, gun: { damage: 105, cooldown: 2, range: 14 } };
export const liveShowAb = (radius) => ({ key: 'liveShow', name: 'Live Show', desc: `For 15s zombies within ${radius} are slowed 60%, and you get 25% of the damage towers deal to them as cash`, cooldown: 60, duration: 15, radius, slow: 0.6, cash: 0.25 });

// Enforcement Base units (slowFire: they drive slower while they shoot).
export const EB = {
  enf: { name: 'Enforcer', model: 'ebenforcer', soldiers: 1, hp: 20, speed: 4, gun: { damage: 5, cooldown: 0.5, range: 11.5 } },
  m: { name: 'Enforcer M', model: 'ebenforcerm', soldiers: 1, hp: 50, speed: 4, flying: false, gun: { damage: 25, cooldown: 0.75, range: 4 } },
  truck: { name: 'Turret Truck', model: 'ebtruck', hp: 375, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 10.5, cooldown: 0.1, range: 20 } },
  apm: { name: 'APM-Bot', model: 'ebapm', hp: 2250, speed: 3, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 24, cooldown: 0.1, range: 28 }, cannon: { damage: 200, every: 4, radius: 4 } },
};
export const DIVE_AB = { key: 'dive', name: 'Dive', desc: 'Switch between Afloat (fast coastal missiles) and Submerged (slow nukes with a huge blast, hidden detection)', cooldown: 3 };
export const shockMissileAb = (damage, stun) => ({ key: 'frag', name: 'Shock Missile', desc: `A missile at its target: ${damage} damage and a ${stun}s stun, even on bosses`, cooldown: 60, radius: 2, damage, stun, stunAny: true });
export const sonar = (damage, every) => ({ name: 'Sonar Bombs', damage, count: 1, every, radius: 5, hidden: true, reveal: 4 });
export const marauderHarpoon = (damage) => ({ key: 'harpoon', name: 'Harpoon', desc: `${damage.toLocaleString()} damage to the strongest zombie in range, a 3s stun (bosses too), and it takes 25% more damage for 5s. If that would kill it, it's reeled in instead`, cooldown: 45, damage, stun: 3, vuln: 0.25, vulnTime: 5, reel: 15 });
export const bleed = (total, time) => ({ damage: Math.round((total / (time / 0.5)) * 100) / 100, tick: 0.5, time, slow: 0 });
export const WIPEOUT_AB = { key: 'wipeout', name: 'Orbital Wipeout', desc: '60,000 damage split evenly among every zombie on the map, hidden ones too', cooldown: 120, damage: 60000 };
export const JERICHO_AB = { key: 'wipeout', name: 'Jericho Missile', desc: 'A cluster missile that splits midair: 18,000 damage split among every zombie on the map', cooldown: 90, damage: 10000 };

// Void Port carts and trains (train: wagons that follow the locomotive).
export const VP = {
  gunCart: { name: 'Gunner Cart', model: 'vgunner', hp: 100, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 5, cooldown: 0.2, range: 17 } },
  mortarCart: { name: 'Mortar Cart', model: 'vmortar', hp: 100, speed: 4, hidden: true, lead: true, flying: false, slowFire: true, cannon: { damage: 35, every: 2, radius: 3, range: 17 } },
  gunWagon: { name: 'Gun Wagon', model: 'vgunwagon', hp: 500, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 12, cooldown: 0.1, range: 20 } },
  mortarWagon: { name: 'Mortar Wagon', model: 'vmortarwagon', hp: 500, speed: 4, hidden: true, lead: true, flying: false, slowFire: true, cannon: { damage: 60, every: 1, radius: 3.5, range: 20 } },
  voidGun: { name: 'Void GWagon', model: 'vvoidgwagon', hp: 1000, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 20, cooldown: 0.1, range: 22 } },
  voidMortar: { name: 'Void Mortar', model: 'vvoidmortar', hp: 1000, speed: 4, hidden: true, lead: true, flying: false, slowFire: true, cannon: { damage: 150, every: 1, radius: 4, range: 22 } },
};
VP.loco = (train) => ({ name: 'Locomotive', model: 'vloco', hp: 750, speed: 4, hidden: true, lead: true, flying: true, train });
VP.voidLoco = (train) => ({ name: 'Void Loc', model: 'vvoidloco', hp: 1750, speed: 4, hidden: true, lead: true, flying: true, train });

export const SKY_SLAM_AB = { key: 'heatwave', name: 'Sky Slam', desc: 'Leaps up and crashes down: 330 damage to every zombie within 20', cooldown: 35, damage: 1000, burn: 0, burnTime: 0, radius: 20, knock: 0 };
export const RIFT_AB = { key: 'teleport', name: 'Rift', desc: 'Teleport to a spot within 100 studs and be stun immune for 20s', cooldown: 40, aim: true, radius: 0, reach: 100, damage: 0, knock: 0, immune: 20 };
export const railgun = (max, damage, range, falloff = 0.1) => ({ max, damage, range, falloff });
export const DROP_POINT_AB = { key: 'deploy', name: 'Set Drop Point', desc: 'Click the path: its units start from there', cooldown: 5, aim: true, radius: 4 };

// Valkyr mechs: `bump` is the melee damage per second to zombies they touch; `decay` is the air leak.
export const MECH = {
  m1: { name: 'Mark 1', model: 'mech1', hp: 825, speed: 3, lead: true, flying: false, bump: 112, decay: 0.5 },
  m2: { name: 'Mark 2', model: 'mech2', hp: 1225, speed: 3, lead: true, flying: true, bump: 220, decay: 1, gun: { damage: 14, cooldown: 0.1, range: 15 } },
  m45: { name: 'Mark 4.5', model: 'mech45', hp: 2500, speed: 3, lead: true, flying: true, bump: 386, decay: 1.5, gun: { damage: 26.7, cooldown: 0.1, range: 16 } },
  m10: { name: 'Mark 10 Kaboom', model: 'mech10', hp: 4000, speed: 3, lead: true, flying: true, bump: 636, decay: 2, gun: { damage: 43, cooldown: 0.1, range: 18 }, cannon: { damage: 212, every: 2, radius: 4 } },
  ult: { name: 'Mark O-Ultimate', model: 'mechult', hp: 5750, speed: 3, lead: true, flying: true, bump: 1000, decay: 2.5, gun: { damage: 66, cooldown: 0.1, range: 20 }, cannon: { damage: 400, every: 2, radius: 5 } },
};

// Squadron jets fly over the path (air: zombies can't touch them) and leave after `life` s.
const PARATROOPER = { name: 'Paratrooper', model: 'jpara', soldiers: 1, hp: 100, speed: 3.5, gun: { damage: 15, cooldown: 0.166, range: 12 } };
export const JET = {
  merlin: { name: 'Merlin', model: 'jmerlin', hp: 200, speed: 18, air: true, flying: true, hidden: true, lead: true, life: 10, gun: { damage: 125, cooldown: 0.25, range: 25 } },
  falcon: { name: 'Falcon', model: 'jfalcon', hp: 250, speed: 18, air: true, flying: true, hidden: true, lead: true, life: 10, gun: { damage: 450, burst: 5, burstGap: 0.2, cooldown: 5, range: 21, radius: 3 } },
  raptor: { name: 'Raptor', model: 'jraptor', hp: 200, speed: 18, air: true, flying: true, lead: true, life: 10, gun: { damage: 75, cooldown: 0.1, range: 25 } },
  hardpoint: { name: 'Hardpoint', model: 'jhardpoint', hp: 250, speed: 15, air: true, flying: true, lead: true, life: 12, gun: { damage: 1500, burst: 2, burstGap: 0.3, cooldown: 3, range: 40, radius: 5 } },
  airlifter: { name: 'Airlifter', model: 'jairlifter', hp: 1000000, speed: 12, air: true, flying: true, life: 5, summon: { every: 1.5, unit: PARATROOPER, pause: 0 } },
  tentative: { name: 'Tentative', model: 'jtentative', hp: 200000, speed: 10, air: true, flying: true, hidden: true, lead: true, life: 10, beam: { damage: 15000, every: 40, first: 3, range: 55 } },
};

export const SPLASH_MOVE = { key: 'patrol', name: 'Relocation', desc: 'Fly it to a spot you click, anywhere on the map (longer trips take longer)', cooldown: 5, aim: true, radius: 5 };
export const SPLASH_ALL = { ...SPLASH_MOVE, name: 'Total Relocation', desc: 'Fly every Splash you own to a spot you click', cooldown: 20, all: true };
export const SCOPE_AB = { key: 'scope', name: 'Expanded Scope', desc: 'Make its flight circle bigger, or back to normal', cooldown: 3 };
export const WRONG_WAY_AB = { key: 'reverse', name: 'Wrong Direction', desc: 'Fly the other way around the circle', cooldown: 1 };

// Punkbuster summons: `max` is how many of each it can have out at once.
export const PUNK = {
  fragger: (n) => ({ name: 'Fragger', model: 'pfragger', soldiers: 1, hp: 60, speed: 4, lead: true, count: n, max: n, gun: { damage: 30, cooldown: 2, range: 10, radius: 3 } }),
  boogie: (n, reveal) => ({ name: 'Boogieman', model: 'pboogie', soldiers: 1, hp: 300, speed: 4, flying: false, count: n, max: n, gun: { damage: 60, cooldown: 1, range: 5 }, ...(reveal ? { reveal } : {}) }),
  rocketeer: (n, reveal) => ({ name: 'Rocketeer', model: 'procketeer', soldiers: 1, hp: 150, speed: 4, lead: true, count: n, max: n, gun: { damage: 120, cooldown: 2.5, range: 18, radius: 4 }, ...(reveal ? { reveal } : {}) }),
  nucleus: (reveal) => ({ name: 'Nucleus', model: 'pnucleus', soldiers: 1, hp: 2000, speed: 3, ram: true, flying: false, lead: true, max: 1, explode: { damage: 8000, radius: 10 }, reveal }),
};
export const PUNK_REVEAL = { radius: 12, time: 5 };
export const REDEPLOY_PUNK_AB = { ...DROP_POINT_AB, name: 'Redeploy', desc: 'Click the path: its summons get thrown there from now on' };

// Borealis planes fly the path from its waypoint and leave after `life` s.
const FESTIVE_TANK = { name: 'Festive Tank', model: 'bfestivetank', hp: 1550, speed: 3, flying: false, lead: true, life: 40, max: 4, cannon: { damage: 380, every: 2.5, radius: 4, range: 15 } };
export const BOREAL = {
  breeze: { name: 'Breeze', model: 'bbreeze', hp: 100, speed: 16, air: true, flying: true, lead: true, life: 8, gun: { damage: 15, cooldown: 0.1, range: 15 } },
  ornament: { name: 'Ornament', model: 'bornament', hp: 150, speed: 16, air: true, flying: true, lead: true, life: 8, gun: { damage: 200, cooldown: 1.1, range: 15, radius: 4 } },
  northwind: { name: 'Northwind', model: 'bnorthwind', hp: 250, speed: 16, air: true, flying: true, lead: true, life: 8, gun: { damage: 25, cooldown: 0.08, range: 15 } },
  sleigh: { name: 'Sleigh', model: 'bsleigh', hp: 500, speed: 14, air: true, flying: true, lead: true, life: 8, healTowers: true, cannon: { damage: 300, every: 2, radius: 5, range: 15, stun: 1 } },
  fortress: { name: 'Festive Fortress', model: 'bfortress', hp: 1000, speed: 12, air: true, flying: true, lead: true, life: 8, cannon: { damage: 1650, every: 1.75, radius: 6, range: 15 }, summon: { every: 3, unit: FESTIVE_TANK, pause: 0 } },
};
