// Towers: big hits, blasts, fire and ice. Sniper, Enforcer, Grenadier, Freezer, Rocketeer,
// Mortar, Flamethrower, and their alternate forms.
// One group of the TOWERS table. config.js joins the groups in order (see TOWERS there).
// Shared units and abilities (MERC, AP_AB, ...) come from shared.js.
import { FLARE_AB, GRANDSLAM_AB, targetSelectAb } from './shared.js';

export const TOWERS_HEAVY = {
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
};
