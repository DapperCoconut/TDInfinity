// All gameplay tuning lives here so balance changes don't require touching game logic.

export const GAME = {
  startCash: 500,
  baseHp: 150,
  firstIntermission: 20, // seconds to place towers before wave 1
  intermission: 8, // seconds between waves
  waveBonus: (wave) => 150 + 40 * wave + 3 * wave * wave, // wave is 1-based; ramps up quadratically
  hpScalePerWave: 0.06, // enemy HP multiplier grows by this much each wave
  sellRatio: 0.5,
  loadoutSize: 6, // towers a player can bring into a game
  // Credits earned at the end of a game (spent in the Loadout & Shop on new towers).
  credits: (wavesCleared, win) => wavesCleared * 40 + (win ? 600 : 0),
  mpHpScale: 0.5, // in multiplayer, enemy HP is multiplied by 1 + this * (players - 1)
  unitContact: 0.4, // zombies touching a Soldier squad hurt it by (their base damage * this) per second
  danceBossScale: 0.5, // bosses dance only this fraction of Apocalypse Rave's duration
  // Dimension Shards: a rare purple currency for alternate tower forms. Only winning pays them.
  shards: (win) => (win ? 1 : 0),
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
  tickRate: 20, // server simulation steps per second
  snapshotEvery: 2, // send a full state snapshot every N ticks
};

// Shirt colors given to players in join order.
export const PLAYER_COLORS = [0x1e88e5, 0xe53935, 0xfdd835, 0x8e24aa];

export const TARGET_MODES = ['First', 'Last', 'Strongest', 'Closest'];

// Each level is fully specified (no inheritance) so it is easy to read and tweak.
// Level index 0 is the tower as placed; indices 1-4 are upgrades (shown as Lv 2-5).
// price: credits to unlock in the Loadout & Shop (0 = owned from the start).
// shards: on a base tower, it's bought with Dimension Shards instead of credits.
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
// Tactical Sniper (Bottom path) Flare Gun.
const FLARE_AB = { key: 'flare', name: 'Flare Gun', desc: 'Reveals hidden zombies in its range for 8s so every tower can hit them', cooldown: 30, duration: 8 };
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
  { name: 'Hacker', desc: 'Hacks zombies with a smartphone. Hacked zombies are slowed, pay more cash when they die, and come back as holograms that fight for you.', damage: 0, cooldown: 0.3, range: 11, synapses: 1, ev: 0.45, slow: 0.075, fraud: 0.125, units: 1000, hidden: false },
  { name: 'Signal Booster', desc: 'More range and a stronger slow.', cost: 125, damage: 0, cooldown: 0.3, range: 12.5, synapses: 1, ev: 0.45, slow: 0.1, fraud: 0.125, units: 1000, hidden: false },
  { name: '1337 Skills', desc: 'Hacks 2 zombies at once, sees hidden zombies, tougher holograms and more Wire Fraud.', cost: 1337, damage: 0, cooldown: 0.3, range: 14, synapses: 2, ev: 0.55, slow: 0.1, fraud: 0.15, units: 1000, hidden: true },
  { name: 'Hologram Projector', desc: 'A wrist gadget: its synapses now deal damage, tougher holograms, and unlocks Hologram Tower to clone any tower.', cost: 6500, damage: 10, cooldown: 0.3, range: 15, synapses: 2, ev: 0.625, slow: 0.1, fraud: 0.15, units: 1000, hidden: true,
    abilities: [cloneAbility(0.3, 25)] },
  { name: 'Botnet', desc: 'More damage, 3 synapses, tougher holograms, more Wire Fraud and cheaper clones.', cost: 24000, damage: 22, cooldown: 0.3, range: 16, synapses: 3, ev: 0.675, slow: 0.1, fraud: 0.2, units: 1000, hidden: true,
    abilities: [cloneAbility(0.25, 25)] },
];

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

  // ---------------------------------------------------------------- extra stats used below
  // radius: splash. Every zombie within `radius` of the impact takes `damage` (or `splash`
  //         if set; then only the zombie aimed at takes the full `damage`).
  // lob:    seconds the projectile flies before it lands (it aims where the zombie will be).
  // homing: the projectile follows its target instead of landing on a spot.
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
  // Not used by the game yet (kept for later): hp (tower health), ignoreBulletResist,
  //         laser (laser damage type), stealth (enemies can't target the tower).
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
  rifleman: {
    name: 'Rifleman',
    lead: 4,
    price: 1000,
    cost: 800,
    limit: 8,
    blurb: 'Fires a rifle really fast at one zombie. Great value at Lv 1, strong again at Lv 5.',
    levels: [
      { name: 'Rifleman', desc: 'Fires a rifle really fast at one zombie at a time.', damage: 1, cooldown: 0.26, range: 12, hidden: false },
      { name: 'Red Dot', desc: 'A red-dot sight for more range.', cost: 200, damage: 1, cooldown: 0.26, range: 15.5, hidden: false },
      { name: 'Night Vision', desc: 'Hidden detection and a little more range.', cost: 550, damage: 1, cooldown: 0.26, range: 17.5, hidden: true },
      { name: 'Veteran', desc: 'Double damage and faster shooting with a better rifle.', cost: 1650, damage: 2, cooldown: 0.22, range: 17.5, hidden: true },
      { name: 'Heavy Gunner', desc: 'Swaps to a big machine gun: much more damage, faster, more range.', cost: 4600, damage: 5, cooldown: 0.17, range: 20, hidden: true },
    ],
  },
  riflemanMilitant: {
    name: 'Militant',
    lead: 3,
    altOf: 'rifleman',
    form: 'Militant',
    shards: 1,
    price: 0,
    cost: 600,
    limit: 8,
    blurb: 'An alternate Rifleman that fires a rifle very fast at one zombie from long range. Each bullet does little damage, but its upgrades boost it a lot (they are expensive). Sees hidden zombies from Lv 2.',
    tip: 'Place several Lv 2 Militants early for cheap hidden detection, then push them to Lv 4-5 later. Its low base damage means you need several maxed ones for tough late waves.',
    levels: [
      { name: 'Militant', desc: 'Fires a rifle very fast at one zombie at a time from long range.', damage: 1, cooldown: 0.225, range: 14, hidden: false },
      { name: 'Radio Comms', desc: 'Shoots faster, more range, and it can now see hidden zombies.', cost: 300, damage: 1, cooldown: 0.175, range: 17, hidden: true },
      { name: 'Field Ops', desc: 'Double damage.', cost: 850, damage: 2, cooldown: 0.175, range: 17, hidden: true },
      { name: 'Guerrilla Tactics', desc: 'A bigger damage boost.', cost: 2750, damage: 5, cooldown: 0.175, range: 17, hidden: true },
      { name: 'Stealth Mercenary', desc: 'More range and a big damage boost.', cost: 8000, damage: 12, cooldown: 0.175, range: 20, hidden: true },
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
  plasma: {
    name: 'Plasma Trooper',
    lead: 3,
    price: 2400,
    cost: 950,
    limit: 8,
    blurb: 'Holds a plasma globe that zaps several zombies at once with fast, steady damage. Sees hidden zombies at every level.',
    levels: [
      { name: 'Plasma Trooper', desc: 'Zaps up to 3 zombies at once. Sees hidden zombies.', damage: 2, targets: 3, cooldown: 0.866, range: 6, hidden: true },
      { name: 'Safety Goggles', desc: 'More range.', cost: 400, damage: 2, targets: 3, cooldown: 0.866, range: 9, hidden: true },
      { name: 'Short Wavelength', desc: 'More than doubles its damage.', cost: 970, damage: 5, targets: 3, cooldown: 0.866, range: 9, hidden: true },
      { name: 'Plasma Tower', desc: 'Double damage, faster zaps, a bit more range, and hits 5 zombies.', cost: 4400, damage: 10, targets: 5, cooldown: 0.75, range: 10, hidden: true },
      { name: 'Lightbulb of Doom', desc: 'Double damage again, much more range, and hits 8 zombies.', cost: 20000, damage: 22, targets: 8, cooldown: 0.75, range: 14, hidden: true },
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
        abilities: [{ key: 'sweeper', name: 'Sweeper', desc: 'Two map-wide lasers spin around it for 6s: 175 damage each time one passes a zombie', cooldown: 40, damage: 175, duration: 6, spin: 4 }] },
      { name: 'Arc Reactor', desc: 'More damage and range, and the Sweeper lasers hit much harder and spin faster.', cost: 17000, damage: 50, cooldown: 0.55, range: 10, hidden: false,
        abilities: [{ key: 'sweeper', name: 'Sweeper', desc: 'Two map-wide lasers spin faster around it for 6s: 350 damage each time one passes a zombie', cooldown: 40, damage: 350, duration: 6, spin: 2.5 }] },
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
  barracks: {
    name: 'Barracks',
    price: 1000,
    cost: 750,
    limit: 2,
    kind: 'spawner',
    spawnEvery: 45,
    maxUnits: 2,
    blurb: 'Sends a squad of Soldiers along the path every 45 seconds. They stop to shoot zombies in range. Only two squads can be out at once.',
    levels: [
      { name: 'Barracks', desc: 'Sends a squad of 2 Soldiers down the path.', hidden: false,
        unit: { name: 'Squad', model: 'squad', soldiers: 2, hp: 4, speed: 3.5, gun: { damage: 1, burst: 3, cooldown: 1.5, range: 14 } } },
      { name: 'Squadron', desc: 'Each squad has 3 Soldiers instead of 2.', cost: 450, hidden: false,
        unit: { name: 'Squad', model: 'squad', soldiers: 3, hp: 4, speed: 3.5, gun: { damage: 1, burst: 3, cooldown: 1.5, range: 14 } } },
      { name: 'Spec Ops', desc: 'Soldiers get hidden detection and a bit more range.', cost: 720, hidden: true,
        unit: { name: 'Spec Ops', model: 'specops', soldiers: 3, hp: 4, speed: 3.5, hidden: true, gun: { damage: 1, burst: 3, cooldown: 1.5, range: 17 } } },
      { name: 'Legion', desc: '4 Soldiers per squad with more health, damage and longer bursts. Upgraded Soldiers appear right away.', cost: 4300, hidden: true, spawnNow: true,
        unit: { name: 'Legion', model: 'legion', soldiers: 4, hp: 10, speed: 3.5, hidden: true, gun: { damage: 2, burst: 6, cooldown: 1.5, range: 17 } } },
      { name: 'Fortress', desc: 'Soldiers become much tougher and stronger with a bit more range.', cost: 13500, hidden: true,
        unit: { name: 'Fortress', model: 'fortress', soldiers: 4, hp: 40, speed: 3.5, hidden: true, gun: { damage: 7, burst: 7, cooldown: 1.5, range: 18 } } },
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
    blurb: 'Never shoots. Sends mercenaries down the path to fight: Riflemen, then Grenadiers, Riot Guards and Field Medics as you upgrade. From Lv 4 it also gives towers nearby more damage, and from Lv 6 it can Air-Drop its units right where you need them.',
    tip: 'Place it next to your strongest towers so they get its damage boost late in the game. Use Air-Drop to drop all its units at once in front of a tough zombie.',
    levels: [
      { name: 'Mercenary Base', desc: 'Sends Riflemen that shoot in bursts.', hidden: false, queues: 1,
        roster: [{ every: 30, unit: MERC.rifle(0) }] },
      { name: 'Explosive Experts', desc: 'Adds Grenadiers, which throw grenades that hurt every zombie in a small blast.', cost: 1350, hidden: false, queues: 1,
        roster: [{ every: 30, unit: MERC.rifle(0) }, { every: 25, unit: MERC.gren(0) }] },
      { name: 'Upgraded Barracks', desc: 'A second queue, so two units are trained at the same time.', cost: 2750, hidden: false, queues: 2,
        roster: [{ every: 30, unit: MERC.rifle(0) }, { every: 25, unit: MERC.gren(0) }] },
      { name: 'Improved Training', desc: 'Towers in range deal 10% more damage, and Riflemen get stronger with hidden and flying detection.', cost: 9650, hidden: false, queues: 2,
        aura: 16, dmgBoost: 0.1,
        roster: [{ every: 30, unit: MERC.rifle(1) }, { every: 25, unit: MERC.gren(0) }] },
      { name: 'Riot Control', desc: 'A third queue, and adds the Riot Guard: a tough unit that charges in and knocks zombies back.', cost: 10000, hidden: false, queues: 3,
        aura: 16, dmgBoost: 0.1,
        roster: [{ every: 30, unit: MERC.rifle(1) }, { every: 25, unit: MERC.gren(0) }, { every: 40, unit: MERC.riot(0) }] },
      { name: 'Air Transport', desc: 'Adds Field Medics that heal and shield units, a 12.5% damage boost, and the Air-Drop ability.', cost: 12500, hidden: false, queues: 3,
        aura: 16, dmgBoost: 0.125,
        roster: [{ every: 30, unit: MERC.rifle(1) }, { every: 25, unit: MERC.gren(0) }, { every: 40, unit: MERC.riot(0) }, { every: 35, unit: MERC.medic(0) }],
        abilities: [MERC.airdrop] },
      { name: 'Enhanced Equipment', desc: 'Every unit gets much stronger, and the damage boost goes up to 15%.', cost: 45000, hidden: false, queues: 3,
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
    shards: 4,
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
    name: 'Engineer',
    lead: true,
    price: 0,
    shards: 6,
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
  //         more cash to everyone when it dies, and when it dies (to anything) it comes back as a
  //         hologram unit with (max health)^`ev` health that rams zombies (not from bosses).
  //         `units`: holograms it can have out at once. Upgrade paths at Lv 6 (see Pursuit).
  hacker: {
    name: 'Hacker',
    price: 0,
    shards: 10,
    cost: 900,
    limit: 2,
    branch: 'hackerBottom',
    branchAt: 5,
    path: 'Top',
    blurb: "Hacks zombies with synapses from its gadgets. Hacked zombies are slowed, pay everyone more cash when they die (Wire Fraud), and come back as holograms that ram other zombies (not bosses). Its synapses only deal damage from Lv 4, when it also gets Hologram Tower to clone any tower for a while. At Lv 6 pick a path: Top for fast, hard-hitting synapses, Bottom for a laptop with 4 synapses and long-lasting clones. Sees hidden zombies from Lv 3, never lead ones.",
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
  //   militia:   sends `unit` down the path.
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
  // Medic (support): never attacks. Shields the `shields` most valuable towers inside its `aura`
  // (any owner's, never other Medics). Shielded towers shoot `shieldRate` faster, and a stun that
  // hits them breaks the shield instead; it comes back after `recharge` seconds. Several Medics
  // never shield the same tower. `heal`: base health restored at the start of every wave.
  // Ubercharge (ability): shielded towers deal +`boost` damage and ignore stuns for `duration` s.
  medic: {
    name: 'Medic',
    price: 1100,
    cost: 400,
    limit: 4,
    kind: 'support',
    blurb: "Never attacks. Shields your best towers nearby with a medi gun: they shoot faster and the shield blocks stuns. Heals your base at the start of every wave. From Lv 3 it can Ubercharge them for bonus damage.",
    tip: 'Shield your most important towers, like ones with low placement limits. All 4 Medics maxed shield up to 20 towers. Medics stack with Commanders and DJs.',
    levels: [
      { name: 'Medic', desc: 'Shields 1 tower (15% faster firing, blocks stuns) and heals the base 2 HP every wave.', aura: 12, shields: 1, shieldRate: 0.15, recharge: 20, heal: 2, hidden: false },
      { name: 'Prescribed Vitamins', desc: 'More range, shields 3 towers, heals more, and the shield recharges faster.', cost: 1075, aura: 14, shields: 3, shieldRate: 0.15, recharge: 15, heal: 4, hidden: false },
      { name: 'BIG BRAIN', desc: 'A bit more range, and unlocks Ubercharge: shielded towers get a damage boost and can\'t be stunned for a while.', cost: 2400, aura: 15, shields: 3, shieldRate: 0.15, recharge: 15, heal: 4, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +25% damage and stun immune for 7.5s', cooldown: 45, duration: 7.5, boost: 0.25 }] },
      { name: 'Medical Pack', desc: 'More range, shields 4 towers, heals more, faster recharge, and a stronger, longer Ubercharge.', cost: 5000, aura: 18, shields: 4, shieldRate: 0.15, recharge: 10, heal: 7, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +40% damage and stun immune for 10s', cooldown: 45, duration: 10, boost: 0.4 }] },
      { name: 'MD-PhD', desc: 'More range, shields 5 towers, faster recharge, and an even stronger Ubercharge.', cost: 12000, aura: 20, shields: 5, shieldRate: 0.15, recharge: 7, heal: 7, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +60% damage and stun immune for 10s', cooldown: 45, duration: 10, boost: 0.6 }] },
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
    lead: 3,
    price: 4500,
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
};

/** What Hologram Tower ability `ab` costs to clone tower `src` (a share of its total cost). */
export const cloneCost = (ab, src) => Math.round(ab.clone * src.spent);

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
    if (!s.roster) return unitDetection(s.unit);
    // Mercenary Base: everything any of its units can hit.
    const d = { hidden: false, flying: false, lead: false };
    for (const r of s.roster) for (const [k, v] of Object.entries(unitDetection(r.unit))) d[k] ||= v;
    return d;
  }
  const lead = s.lead ?? (typeof def.lead === 'number' ? level >= def.lead : !!def.lead);
  return { hidden: !!s.hidden, flying: s.flying ?? def.flying ?? true, lead };
}

/** What a spawner / goon unit can hit with its guns. Soldiers on foot can shoot flyers; vehicles can't. */
export const unitDetection = (u) => ({ hidden: !!u.hidden, flying: u.flying ?? !!u.soldiers, lead: !!u.lead });

/** Can something with detection `d` hit zombie `e`? */
export const canHit = (d, e) => !((e.hidden && !d.hidden && !(e.revealT > 0)) || (e.flying && !d.flying) || (e.lead && !d.lead));

/** Base towers (not alternate forms), in shop/loadout order. */
export const BASE_TOWERS = Object.keys(TOWERS).filter((t) => !TOWERS[t].altOf && !TOWERS[t].branchOf);

/** Towers every player owns without buying them. */
export const STARTER_TOWERS = BASE_TOWERS.filter((t) => !TOWERS[t].price && !TOWERS[t].shards);

/** Alternate forms of a base tower (type keys). */
export const formsOf = (base) => Object.keys(TOWERS).filter((t) => TOWERS[t].altOf === base);

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
  // before `scale`; skin: the color of the death puff.
  // fireImmune: fire can't burn it and flamethrowers do no damage.
  // statusImmune: can't be burned, frozen, stunned, slimed, chilled or made to dance.
  // summon: { type, n, every }: drops `n` of `type` behind it every `every` seconds.
  // cage: when destroyed, a random enemy from this list bursts out with `cageHp` of its health.
  // phase2: when killed, it comes back as this enemy with a fresh health pool.
  slime: { name: 'Slime', model: 'slime', h: 2.2, hp: 4, speed: 4.5, reward: 5, damage: 3, scale: 1, skin: 0x66bb6a, color: 0x66bb6a },
  goblin: { name: 'Goblin', model: 'goblin', h: 5.2, hp: 12, speed: 4.5, reward: 8, damage: 6, scale: 0.75, skin: 0x8bc34a },
  spider: { name: 'Spider', model: 'spider', h: 1.8, hp: 4, speed: 10, reward: 6, damage: 4, scale: 0.9, skin: 0x3e2723 },
  ghost: { name: 'Ghost', model: 'ghost', h: 4, hp: 6, speed: 9, reward: 10, damage: 6, scale: 1, skin: 0xeceff1, hidden: true },
  stump: { name: 'Stump', model: 'stump', h: 3.2, hp: 28, speed: 6, reward: 14, damage: 10, scale: 1.1, skin: 0x795548 },
  alien: { name: 'Alien', model: 'ufo', h: 3, hp: 10, speed: 6, reward: 10, damage: 7, scale: 1, skin: 0x90a4ae, flying: true },
  golem: { name: 'Golem', model: 'golem', h: 6, hp: 60, speed: 3, reward: 25, damage: 18, scale: 1.2, skin: 0x9e9e9e },
  goblinKing: { name: 'Goblin King', model: 'goblin', h: 5.2, hp: 220, speed: 5, reward: 120, damage: 40, scale: 1.4, skin: 0x7cb342, crown: true, boss: true },
  spiderQueen: { name: 'Spider Queen', model: 'spider', h: 1.8, hp: 160, speed: 3.5, reward: 120, damage: 40, scale: 2.2, skin: 0x4a148c, queen: true, boss: true,
    summon: { type: 'spider', n: 2, every: 5 } },
  spirit: { name: 'Spirit', model: 'ghost', h: 4, hp: 40, speed: 9, reward: 22, damage: 14, scale: 1.25, skin: 0x80deea, hidden: true, spirit: true },
  fireSlime: { name: 'Fire Slime', model: 'slime', h: 2.2, hp: 30, speed: 6, reward: 14, damage: 8, scale: 1.2, skin: 0xff7043, color: 0xff5722, fire: true, fireImmune: true },
  cage: { name: 'Caged Monster', model: 'cage', h: 3.4, hp: 25, speed: 4, reward: 10, damage: 8, scale: 1, skin: 0x757575,
    cage: ['goblin', 'spider', 'ghost', 'stump', 'alien', 'golem', 'fireSlime', 'spirit'], cageHp: 0.5 },
  infernoSlime: { name: 'Inferno Slime', model: 'slime', h: 2.2, hp: 90, speed: 5, reward: 30, damage: 20, scale: 1.6, skin: 0xd50000, color: 0xb71c1c, fire: true, inferno: true,
    fireImmune: true, statusImmune: true },
  slimeKing: { name: 'Slime King', model: 'slime', h: 2.2, hp: 600, speed: 2, reward: 100, damage: 100, scale: 4, skin: 0x43a047, color: 0x43a047, crown: true, boss: true,
    phase2: 'slimeKingBlaze' },
  slimeKingBlaze: { name: 'Blazing Slime King', model: 'slime', h: 2.2, hp: 450, speed: 3.5, reward: 400, damage: 100, scale: 4, skin: 0xff6d00, color: 0xff6d00, crown: true,
    fire: true, fireImmune: true, boss: true },

  // ---------------------------------------------------------------- Medium mode zombies
  // armor: takes this fraction less damage from everything (0.4 = 40% less).
  // corpse: when killed, leaves this enemy behind where it fell.
  // remains: a corpse. It never moves, doesn't hurt the base, and the wave can end without
  //   killing it. It crumbles away by itself after `decay` seconds.
  // slam: { range, stun, every }: smashes the ground, stunning every tower within `range`.
  // axe: { range, radius, stun, every, flight }: throws an axe at a tower up to `range` away,
  //   stunning towers within `radius` of where it lands.
  // embers: the whole world fills with orange embers while it's alive.
  zombie: { name: 'Zombie', hp: 8, speed: 5.5, reward: 6, damage: 5, scale: 1, skin: 0x7fb069, shirt: 0x4a6fa5, pants: 0x3b3b5c },
  speedy: { name: 'Speedy', hp: 5, speed: 10, reward: 6, damage: 4, scale: 0.85, skin: 0x9ccc65, shirt: 0xfdd835, pants: 0x5a3a22 },
  heavy: { name: 'Heavy', hp: 40, speed: 3.2, reward: 16, damage: 12, scale: 1.35, skin: 0x55813f, shirt: 0x5d4037, pants: 0x333333, helmet: true },
  zombieBoss: { name: 'Zombie Boss', hp: 200, speed: 1.6, reward: 150, damage: 60, scale: 2.4, skin: 0x4e7d32, shirt: 0x880e4f, pants: 0x2a0f3a, boss: true },
  molten: { name: 'Molten', hp: 30, speed: 5.5, reward: 14, damage: 10, scale: 1.05, skin: 0x4e342e, shirt: 0x3e2723, pants: 0x212121, lava: 0xff6d00,
    fireImmune: true, corpse: 'moltenCorpse' },
  moltenCorpse: { name: 'Molten Corpse', model: 'corpse', h: 1.4, hp: 15, speed: 0, reward: 2, damage: 0, scale: 1, skin: 0xff6d00, lava: 0xff6d00,
    remains: true, decay: 25, fireImmune: true },
  demon: { name: 'Demon', hp: 35, speed: 9, reward: 18, damage: 12, scale: 1, skin: 0xc62828, shirt: 0x212121, pants: 0x1a1a1a, horns: 0x212121 },
  hazmat: { name: 'Hazmat', hp: 28, speed: 6, reward: 16, damage: 10, scale: 1.05, skin: 0x7fb069, shirt: 0xfdd835, pants: 0xf9a825, hazmat: true,
    statusImmune: true },
  moltenSquire: { name: 'Molten Squire', hp: 70, speed: 3.5, reward: 25, damage: 15, scale: 1.15, skin: 0x4e342e, shirt: 0x3e2723, pants: 0x212121, lava: 0xff6d00,
    armor: 0.2, plate: 0x8d6e63, fireImmune: true },
  moltenKnight: { name: 'Molten Knight', hp: 350, speed: 2.2, reward: 150, damage: 50, scale: 1.9, skin: 0x4e342e, shirt: 0x3e2723, pants: 0x212121, lava: 0xff3d00,
    armor: 0.4, plate: 0x455a64, knight: true, fireImmune: true, boss: true },
  necromancer: { name: 'Molten Necromancer', hp: 120, speed: 2.5, reward: 60, damage: 30, scale: 1.3, skin: 0x4e342e, shirt: 0x311b92, pants: 0x1a0f3a, lava: 0xb388ff,
    robe: 0x311b92, fireImmune: true, summon: { type: 'molten', n: 3, every: 40 } },
  bulwark: { name: 'Bulwark', hp: 500, speed: 2, reward: 120, damage: 60, scale: 2, skin: 0x37474f, shirt: 0x546e7a, pants: 0x37474f, lava: 0xff6d00,
    mech: true, fireImmune: true, corpse: 'bulwarkWreck' },
  bulwarkWreck: { name: 'Bulwark Wreck', model: 'corpse', h: 1.4, hp: 250, speed: 0, reward: 30, damage: 0, scale: 2.2, skin: 0x546e7a, lava: 0xff6d00, metal: true,
    remains: true, decay: 40, fireImmune: true },
  warlord: { name: 'Molten Warlord', hp: 5000, speed: 1.4, reward: 1000, damage: 1000, scale: 3.6, skin: 0x3e2723, shirt: 0x212121, pants: 0x1a1a1a, lava: 0xff3d00,
    horns: 0x111111, axes: true, plate: 0x37474f, armor: 0.2, fireImmune: true, boss: true, embers: true,
    slam: { range: 14, stun: 3, every: 7 }, axe: { range: 60, radius: 6, stun: 4, every: 13, flight: 1.2 } },
};

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

// Easy mode: 20 waves of slimes, goblins, spiders and friends, ending with the Slime King.
export const EASY_WAVES = [
  { groups: [['slime', 6, 1.5, 0]], note: 'Slimes! Squishy and slow.' },
  { groups: [['slime', 10, 1.1, 0]] },
  { groups: [['slime', 8, 1.0, 0], ['goblin', 3, 2.5, 4]], note: 'Goblins have more health.' },
  { groups: [['slime', 8, 1.0, 2], ['spider', 6, 0.8, 0]], note: 'Spiders are fast!' },
  { groups: [['slime', 10, 0.7, 0], ['goblin', 6, 1.6, 0], ['spider', 8, 0.6, 3]] },
  { groups: [['slime', 12, 0.8, 0], ['ghost', 4, 1.8, 4]], note: 'Ghosts are hidden! You need towers with hidden detection.' },
  { groups: [['goblin', 5, 1.5, 1], ['stump', 4, 2.5, 0], ['spider', 10, 0.5, 3]], note: 'Stumps are tough old tree stumps.' },
  { groups: [['slime', 15, 0.6, 0], ['alien', 6, 1.2, 2]], note: 'Aliens fly in UFOs! Melee towers, traps and vehicles can\'t touch them.' },
  { groups: [['goblin', 8, 1.2, 0], ['golem', 2, 4, 0], ['ghost', 4, 1.5, 6]], note: 'Golems are slow, but made of solid rock.' },
  { groups: [['goblin', 10, 1.0, 0], ['goblinKing', 1, 0, 8]], note: 'The Goblin King is coming!' },
  { groups: [['slime', 14, 0.5, 0], ['fireSlime', 6, 1.4, 0]], note: 'Fire Slimes! Fire can\'t hurt them.' },
  { groups: [['spider', 12, 0.5, 0], ['cage', 5, 2.0, 2], ['stump', 4, 2, 4]], note: 'Caged Monsters! Break the cage and something jumps out.' },
  { groups: [['ghost', 6, 1.2, 0], ['alien', 6, 1.0, 3], ['spirit', 3, 2, 5]], note: 'Spirits: hidden, fast and tough.' },
  { groups: [['spider', 14, 0.5, 0], ['spiderQueen', 1, 0, 6]], note: 'The Spider Queen! She keeps laying spiders.' },
  { groups: [['golem', 4, 3, 0], ['fireSlime', 8, 1.0, 2], ['alien', 8, 0.8, 4], ['cage', 4, 2, 5]] },
  { groups: [['slime', 20, 0.4, 0], ['fireSlime', 6, 1, 2], ['infernoSlime', 3, 3, 4]], note: 'Inferno Slimes can\'t be burned, frozen, stunned or slowed!' },
  { groups: [['goblin', 12, 0.9, 0], ['goblinKing', 1, 0, 4], ['spirit', 4, 1.5, 6], ['spiderQueen', 1, 0, 12]], note: 'Royalty! The Goblin King and the Spider Queen.' },
  { groups: [['stump', 8, 1.5, 0], ['alien', 10, 0.7, 2], ['golem', 5, 2.5, 3], ['ghost', 8, 0.9, 5], ['cage', 6, 1.5, 6]] },
  { groups: [['fireSlime', 10, 0.8, 1], ['infernoSlime', 5, 2.5, 0], ['spirit', 6, 1.2, 3], ['golem', 4, 2.5, 6], ['goblinKing', 2, 8, 10]] },
  { groups: [['slime', 20, 0.6, 0], ['fireSlime', 8, 1.2, 4], ['slimeKing', 1, 0, 6], ['infernoSlime', 2, 4, 10]],
    note: 'Final wave! The Slime King has arrived. Beware his second form!' },
];

// Medium mode: 25 waves of zombies and molten monsters, ending with the Molten Warlord.
export const MEDIUM_WAVES = [
  { groups: [['zombie', 8, 1.4, 0]], note: 'Zombies! Slow, but they never stop coming.' },
  { groups: [['zombie', 10, 1.1, 0], ['speedy', 4, 1.0, 4]], note: 'Speedy zombies are fast but weak.' },
  { groups: [['zombie', 12, 0.9, 0], ['speedy', 8, 0.7, 3]] },
  { groups: [['zombie', 10, 1.0, 0], ['heavy', 3, 3, 5]], note: 'Heavies are slow, with lots of health.' },
  { groups: [['speedy', 10, 0.6, 0], ['heavy', 4, 2.5, 3], ['zombie', 8, 0.9, 2]] },
  { groups: [['zombie', 10, 0.9, 0], ['molten', 4, 2.5, 4]], note: 'Molten zombies! Fire can\'t hurt them, and their corpses have to be broken too.' },
  { groups: [['speedy', 8, 0.6, 0], ['demon', 4, 1.8, 4]], note: 'Demons: fast AND tough!' },
  { groups: [['zombie', 12, 0.7, 0], ['heavy', 6, 1.8, 2], ['molten', 6, 1.5, 5]] },
  { groups: [['zombie', 12, 0.8, 0], ['hazmat', 5, 1.8, 3]], note: 'Hazmat zombies are immune to every effect: no stuns, slows, freezing or burning!' },
  { groups: [['zombie', 12, 0.8, 0], ['heavy', 4, 2, 3], ['zombieBoss', 1, 0, 8]], note: 'A Zombie Boss is coming! Very slow, very tough.' },
  { groups: [['molten', 6, 1.4, 0], ['moltenSquire', 3, 3, 4]], note: 'Molten Squires wear armor that blocks some of every hit.' },
  { groups: [['speedy', 12, 0.5, 0], ['demon', 8, 1.2, 2], ['hazmat', 6, 1.5, 5]] },
  { groups: [['molten', 10, 1.0, 0], ['heavy', 8, 1.5, 2], ['moltenSquire', 4, 2.5, 6]] },
  { groups: [['zombie', 16, 0.6, 0], ['molten', 4, 1.5, 3], ['necromancer', 1, 0, 6]], note: 'A Molten Necromancer! It raises more Moltens every 40 seconds.' },
  { groups: [['molten', 6, 1.2, 0], ['moltenSquire', 4, 2, 2], ['moltenKnight', 1, 0, 8]], note: 'Miniboss: the Molten Knight! Heavy armor and lots of health.' },
  { groups: [['heavy', 8, 1.4, 0], ['demon', 6, 1.2, 3], ['bulwark', 1, 0, 6]], note: 'A Bulwark mech! Its wreck is tough too.' },
  { groups: [['hazmat', 10, 0.9, 0], ['demon', 10, 0.8, 3], ['molten', 8, 1.0, 5]] },
  { groups: [['speedy', 16, 0.4, 0], ['moltenSquire', 6, 1.6, 2], ['necromancer', 2, 10, 4]], note: 'Two Necromancers!' },
  { groups: [['heavy', 10, 1.2, 0], ['molten', 10, 0.9, 2], ['zombieBoss', 2, 8, 5]] },
  { groups: [['hazmat', 8, 1.0, 0], ['moltenSquire', 6, 1.5, 2], ['moltenKnight', 2, 10, 6]], note: 'Two Molten Knights!' },
  { groups: [['demon', 12, 0.8, 0], ['molten', 10, 0.9, 2], ['bulwark', 2, 10, 5]] },
  { groups: [['hazmat', 10, 0.8, 0], ['moltenSquire', 6, 1.4, 2], ['necromancer', 2, 8, 4], ['moltenKnight', 1, 0, 12]] },
  { groups: [['demon', 14, 0.7, 0], ['zombieBoss', 2, 8, 3], ['bulwark', 2, 10, 6]] },
  { groups: [['molten', 12, 0.7, 0], ['hazmat', 12, 0.8, 2], ['necromancer', 2, 8, 4], ['bulwark', 2, 10, 6], ['moltenKnight', 3, 6, 8]],
    note: 'The ground is shaking… something huge is coming next wave.' },
  { groups: [['zombie', 20, 0.5, 0], ['molten', 10, 1.0, 2], ['moltenSquire', 6, 1.5, 4], ['demon', 10, 0.8, 6], ['warlord', 1, 0, 10]],
    note: 'Final wave! The Molten Warlord rises! His slams and thrown axes stun your towers!' },
];

/**
 * Difficulty modes for Solo and Co-op. Versus always uses the zombie waves.
 * `waves`: the scripted waves; winning means clearing the last one.
 */
// Harder modes pay more: `cash` multiplies starting cash and wave bonuses, `credits` the credits
// earned at the end, and `shards` is the Dimension Shards for winning.
export const DIFFICULTIES = {
  easy: { name: 'Easy', icon: '🟢', desc: '20 waves of slimes, goblins, spiders and more. Beat the Slime King to win!', waves: EASY_WAVES,
    cash: 1, credits: 1, shards: 1 },
  medium: { name: 'Medium', icon: '🟠', desc: '25 waves of zombies and molten monsters. Defeat the Molten Warlord to win! 2x credits, 2 shards for winning and more cash in-game.',
    waves: MEDIUM_WAVES, cash: 1.3, credits: 2, shards: 2 },
  zombies: { name: 'Zombies (Test)', icon: '🧟', desc: 'The original 12 zombie waves. Handy for testing towers.', waves: WAVES, cash: 1, credits: 1, shards: 1 },
};
export const DEFAULT_DIFFICULTY = 'easy';
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
