// Wave 8 alternate forms with real crosspathing (see crossTower below), plus the Cyberblade.
//
// Crosspathing: these towers have a Top and a Bottom path. Each tower can buy up the whole of one
// path and up to 2 upgrades on the other (e.g. 4-2 = Top 4 + Bottom 2). Every combination is its
// own tower type (`<key>_<top><bottom>`, `branchOf` the form), so the rest of the game can keep
// reading `TOWERS[t.type].levels[t.level]`. `cross` on a type says where it is and which types
// the next Top / Bottom upgrade turns it into (see crossNext in config.js).
//
// Numbers: the spec comes from a game whose distances are about twice TD Infinity's, so every
// `range`, `radius`, `aura`, `buildRange`, `minRange` and `jump` on a level is halved here
// (HALVE). Distances inside nested objects (unit guns, abilities, near-mode blasts...) are written
// already halved. Damage values stack (`add`), everything else is set by the upgrade that changes
// it. The minor path is applied first, then the main path, so the main path's settings win; table
// rows from the spec (`rows`) then override single combos where the spec's tables say so.
//
// defPierce (defense piercing): the fraction of a zombie's armor its hits ignore (1 = all of it).
// Above 1 counts as 1; negative values make armor count for more (Businessman: -100% = double armor).
// Towers with defPierce >= 0.5 can also hit lead zombies (`lead`), unless a level says otherwise.
//
// Flying detection: these towers can't hit flying zombies (`flying: false`) until an upgrade
// gives them flying detection (a level's `flying: true`).

const HALVE = ['range', 'radius', 'aura', 'buildRange', 'minRange', 'jump'];
const half = (v) => (typeof v === 'number' ? Math.round(v * 50) / 100 : v);

/** Merges `abilities` by key: a newer ability with the same key replaces the old one. */
function mergeAbilities(old = [], add = []) {
  const out = [...old];
  for (const a of add) {
    const i = out.findIndex((o) => o.key === a.key);
    if (i >= 0) out[i] = a;
    else out.push(a);
  }
  return out;
}

/**
 * Builds every tower type of a crosspath tower. spec: tower-level fields (name, altOf, form,
 * shards, cost, limit, blurb, tip, ...) plus
 *   base:   the 0-0 level (spec distances, halved here)
 *   top / bottom: upgrades in order: { name, desc, cost, set, add, abilities, fn, stack }
 *           stack: each tower already holding this upgrade (any player's) makes it this much
 *           more expensive (+40% each for most tier-5 upgrades).
 *   rows:   { 'a-b': fields } table values that override the computed combo
 *   finish: (s) => void, run on every combo last (derived fields)
 * Returns { [type]: def }.
 */
export function crossTower(key, spec) {
  const { base, top, bottom, rows = {}, finish, ...tower } = spec;
  const maxA = top.length;
  const maxB = bottom.length;
  const valid = (a, b) => a >= 0 && b >= 0 && a <= maxA && b <= maxB && Math.min(a, b) <= 2;
  const typeOf = (a, b) => (a === 0 && b === 0 ? key : `${key}_${a}${b}`);

  const stats = (a, b) => {
    const s = { ...base };
    const apply = (list, n) => {
      for (let i = 0; i < n; i++) {
        const u = list[i];
        if (u.set) Object.assign(s, u.set);
        if (u.add) for (const [k, v] of Object.entries(u.add)) s[k] = Math.round(((s[k] || 0) + v) * 1000) / 1000;
        if (u.abilities) s.abilities = mergeAbilities(s.abilities, u.abilities);
        if (u.fn) u.fn(s, a, b);
      }
    };
    // The minor path first, then the main path (its settings win).
    if (a >= b) {
      apply(bottom, b);
      apply(top, a);
    } else {
      apply(top, a);
      apply(bottom, b);
    }
    Object.assign(s, rows[`${a}-${b}`] ?? {});
    for (const k of HALVE) if (s[k] != null) s[k] = half(s[k]);
    if (s.lead == null && s.defPierce >= 0.5) s.lead = true;
    // Shown in the tower panel: the newest upgrade on the main path.
    const main = a >= b && a > 0 ? top[a - 1] : b > 0 ? bottom[b - 1] : null;
    s.name = main ? main.name : base.name;
    s.desc = main ? main.desc : base.desc;
    s.tierText = `${a}-${b}`;
    if (finish) finish(s, a, b);
    return s;
  };

  // Every combo's stats, made once (types share the objects).
  const cache = new Map();
  const at = (a, b) => {
    const k = `${a}-${b}`;
    if (!cache.has(k)) cache.set(k, stats(a, b));
    return cache.get(k);
  };
  // What buying an upgrade shows and costs: the combo's stats with the upgrade's own text and price.
  const upgrade = (path, tier, a, b) => {
    const u = (path === 'Top' ? top : bottom)[tier - 1];
    return { ...at(a, b), name: u.name, desc: u.desc, cost: u.cost, tier, path, stack: u.stack ?? 0, perk: u.perk };
  };

  const out = {};
  for (let a = 0; a <= maxA; a++) {
    for (let b = 0; b <= maxB; b++) {
      if (!valid(a, b)) continue;
      const type = typeOf(a, b);
      const L = a + b;
      // levels[i] is the combo after i upgrades. The root shows the pure Top path and the 0-1
      // type the pure Bottom path (the Loadout plays them through); every other type walks the
      // minor path first, then the main one, ending at its own combo.
      let combos;
      if (a === 0 && b === 0) combos = Array.from({ length: maxA + 1 }, (_, i) => [i, 0]);
      else if (a === 0 && b === 1) combos = Array.from({ length: maxB + 1 }, (_, i) => [0, i]);
      else {
        combos = [[0, 0]];
        const [minorTop, n1, n2] = a >= b ? [false, b, a] : [true, a, b];
        for (let i = 1; i <= n1; i++) combos.push(minorTop ? [i, 0] : [0, i]);
        for (let i = 1; i <= n2; i++) combos.push(minorTop ? [n1, i] : [i, n1]);
      }
      // The pure-path display levels (the form and its 0-1 type) carry each upgrade's own name,
      // text and price, for the Loadout's level list.
      const pure = (a === 0 && b === 0) || (a === 0 && b === 1);
      const levels = combos.map(([x, y], i) => {
        if (!pure || i === 0) return at(x, y);
        const u = (y === 0 ? top : bottom)[i - 1];
        return { ...at(x, y), name: u.name, desc: u.desc, cost: u.cost };
      });
      const def = {
        ...tower,
        levels,
        combos,
        cross: {
          a, b, maxA, maxB,
          up: valid(a + 1, b) ? typeOf(a + 1, b) : null,
          down: valid(a, b + 1) ? typeOf(a, b + 1) : null,
          upNext: valid(a + 1, b) ? upgrade('Top', a + 1, a + 1, b) : null,
          downNext: valid(a, b + 1) ? upgrade('Bottom', b + 1, a, b + 1) : null,
        },
      };
      if (type === key) {
        // The form itself: the Loadout's path toggle shows the 0-1 type as its Bottom path.
        def.branch = typeOf(0, 1);
        def.branchAt = 1;
        def.path = 'Top';
      } else {
        delete def.altOf;
        delete def.form;
        delete def.shards;
        def.branchOf = key;
        def.branchAt = 1;
        def.path = a >= b ? 'Top' : 'Bottom';
        def.crossHidden = !(a === 0 && b === 1); // only the form and its Bottom path show in menus
      }
      out[type] = def;
    }
  }
  return out;
}

// ---------------------------------------------------------------- shared units and abilities

// Gunslinger Reinforcements: a Mercenary on foot walks down the path (30 HP, 16 DPS, sees flyers).
const GS_MERC = { name: 'Mercenary', model: 'gsMerc', soldiers: 1, hp: 30, speed: 4, flying: true, gun: { damage: 4, cooldown: 0.25, range: 8 } };

// Recon Base units. They come from the castle end and walk toward the entrance. A squad's gun
// fires once per living soldier, so each soldier's gun is the squad's DPS split between them.
const RB_OP = { name: 'Operative', model: 'rbOperative', soldiers: 1, hp: 20, speed: 4, flying: false, gun: { damage: 2, cooldown: 0.5, range: 10 } };
const RB_OP2 = { name: 'T2 Operative', model: 'rbOperative2', soldiers: 1, hp: 20, speed: 4, flying: false, gun: { damage: 3, cooldown: 0.4, range: 10 } };
const RB_PAIR = { name: 'Operative Squad', model: 'rbOperative2', soldiers: 2, hp: 20, speed: 4, flying: false, gun: { damage: 1.5, cooldown: 0.2, range: 12 } };
const RB_TRIO = { name: 'Private Squad', model: 'rbPrivate', soldiers: 3, hp: 40, speed: 4, flying: false, gun: { damage: 1, cooldown: 0.12, range: 14 } };
// Fireteam Solemn: SMG + sniper (flyers too), a minigun and a splash rocket launcher, 180 HP shared.
const RB_SOLEMN = { name: 'Fireteam Solemn', model: 'rbSolemn', soldiers: 4, hp: 45, speed: 4, flying: true, lead: true,
  gun: { damage: 6.5, cooldown: 0.25, range: 16 }, cannon: { damage: 20, every: 3, radius: 2 } };
const RB_GHOUL = { name: 'Ghoul ATV', model: 'rbGhoul', hp: 90, speed: 9, ram: true, flying: false };
const RB_GHOUL2 = { name: 'Ghoul M2', model: 'rbGhoul2', hp: 110, speed: 9, ram: true, flying: false, gun: { damage: 1, cooldown: 0.1, range: 8 } };
const RB_PHANTOM = { name: 'Phantom', model: 'rbPhantom', hp: 180, speed: 14, ram: true, flying: false };
const RB_PHANTOM2 = { name: 'Phantom', model: 'rbPhantom', hp: 180, speed: 14, ram: true, flying: false, gun: { damage: 1, cooldown: 0.1, range: 8 } };
const RB_LIGHT = { name: 'Lightstriker', model: 'rbLightstriker', hp: 600, speed: 10, ram: true, flying: false, lead: true, gun: { damage: 15, cooldown: 0.1, range: 12 } };
// Missile Truck: stops shooting volleys of 7 missiles (25 each, flyers too) every 10s.
const RB_TRUCK = { name: 'Missile Truck', model: 'rbTruck', hp: 250, speed: 2.5, flying: true, lead: true,
  gun: { damage: 25, burst: 7, burstGap: 0.15, cooldown: 10, range: 14, radius: 1 } };
const RB_JAVELIN = { name: 'Javelin', model: 'rbJavelin', hp: 1500, speed: 3, flying: true, lead: true,
  gun: { damage: 80, burst: 18, burstGap: 0.1, cooldown: 10, range: 18, radius: 1.5 } };
const RB_TANK = { name: 'Tank', model: 'rbTank', hp: 3600, speed: 2.5, flying: false, lead: true,
  gun: { damage: 8, cooldown: 0.15, range: 12 }, cannon: { damage: 183, every: 2.17, radius: 2 } };
const RB_SCYTHER = { name: 'Scyther Tank', model: 'rbScyther', hp: 4000, speed: 2.5, flying: false, lead: true,
  gun: { damage: 25, cooldown: 0.05, range: 14 }, cannon: { damage: 525, every: 2, radius: 3 } };
// Bliss of Finality: an 8,000,000 HP mining warship that flies over the map for 70s. Miniguns,
// missiles, splash Electricizer cannons and a railgun of 26 explosions (up to 6,500 a shot).
const RB_BLISS = { name: 'Bliss of Finality', model: 'rbBliss', hp: 8000000, speed: 1.2, air: true, life: 70, flying: true, lead: true, hidden: true,
  gun: { damage: 30, cooldown: 0.05, range: 30 }, cannon: { damage: 6500, every: 6, radius: 5 } };

const truckAb = (unit, cost) => ({ key: 'rbTruck', vehicle: true, name: 'Missile Truck', desc: `Sends a Missile Truck (${unit.hp} HP) that stops to fire 7-missile volleys every 10s (flyers too)`, cooldown: 70, cost, unit });
const tankAb = (unit, cost, cooldown) => ({ key: 'rbTank', vehicle: true, name: unit.name, desc: `Sends a ${unit.name} (${unit.hp.toLocaleString()} HP) with a machine gun and a cannon. It keeps moving while firing`, cooldown, cost, unit });

// Surveyor drones fly over the path (zombies can't touch them) and leave after their `life`.
const drone = (name, model, life, speed, gun, extra = {}) => ({ name, model, hp: 60, life, speed, air: true, flying: true, gun, ...extra });

// Mechanic turrets: sentries that last `life` s (they wear down by hp / life every second).
// gun.all: hits every zombie in its range at once (Tesla); gun.stun: stuns them;
// gun.radius: splash; gun.defPierce / gun.shieldMult: its own defense piercing / shield damage.
const turretDef = (name, model, hp, life, gun, extra = {}) => ({ name, model, hp, decay: Math.round((hp / life) * 100) / 100, life, gun, ...extra });
const M1 = turretDef('M1 Turret', 0, 100, 15, { damage: 1, cooldown: 0.8, range: 8 });
const M2 = turretDef('M2 Turret', 1, 120, 20, { damage: 1, cooldown: 0.4, range: 11 }, { flying: true });
const M3 = turretDef('M3 Turret', 2, 160, 25, { damage: 3, cooldown: 0.12, range: 14, defPierce: 0.5 }, { flying: true, lead: true });
const M4 = turretDef('M4 Turret', 3, 200, 25, { damage: 5, cooldown: 0.1, range: 14, defPierce: 0.9 }, { flying: true, lead: true });
const DETONATOR = turretDef('Detonator', 4, 200, 25, { damage: 32, cooldown: 0.9, range: 14, radius: 2 }, { flying: true, lead: true });
const PLASMATOR = turretDef('Plasmator', 5, 200, 25, { damage: 4, cooldown: 0.1, range: 14, defPierce: 1, shieldMult: 3 }, { flying: true, lead: true });
const HUNTER = turretDef('Hunter', 6, 200, 25, { damage: 100, cooldown: 2, range: 30, defPierce: 1 }, { flying: true, lead: true });
const TESLA = turretDef('M1 Tesla', 7, 150, 15, { damage: 6, cooldown: 2, range: 8, all: true, stun: 0.5 });
const TESLA2 = turretDef('M2 Tesla', 8, 220, 15, { damage: 26, cooldown: 2, range: 15, all: true, stun: 0.6, defPierce: 0.3 }, { lead: true });
const PLASMATOR_B = turretDef('M2 Plasmator', 5, 200, 15, { damage: 4, cooldown: 0.1, range: 12, defPierce: 1, shieldMult: 3 }, { flying: true, lead: true });

export const CROSS_TOWERS = {
  // ---------------------------------------------------------------- Slinger (Scout)
  // kin (Faction Leader / Cysian Overclock): boosts other Slingers inside its range (never
  // itself). Each one adds `rate` firerate, `dmg` damage and `range` range; the totals are capped
  // at the biggest `rateCap` / `dmgCap` / `rangeCap` among the Slingers boosting it.
  ...crossTower('scoutSlinger', {
    name: 'Slinger',
    altOf: 'scout',
    form: 'Slinger',
    shards: 0,
    price: 0,
    cost: 200,
    limit: 40,
    flying: false,
    fly: 30,
    blurb: 'A free alternate Scout: a kid with a slingshot. Weak, but cheap, with a huge placement limit. Top path: flying detection at 3-X, then it boosts the damage, firerate and range of nearby Slingers. Bottom path: harder hits that splash a small area. Falls far behind in late waves: no defense piercing.',
    tip: 'Its 40-tower limit is the point. Spam them early, and put one Top path Slinger in the middle of the group to boost the rest.',
    base: { name: 'Slinger', desc: 'A kid with a slingshot: one stone at a time.', damage: 1, cooldown: 1.6, range: 25 },
    top: [
      { name: 'Gloves', desc: 'Range 25 → 28.', cost: 60, set: { range: 28 } },
      { name: 'Earpiece', desc: 'Range 28 → 32.', cost: 80, set: { range: 32 } },
      { name: "'Ranked Up", desc: 'Range 32 → 34, fires every 1.2s instead of 1.6s, and gains flying detection.', cost: 250, set: { range: 34, cooldown: 1.2, flying: true } },
      { name: 'Faction Leader', desc: 'Damage 1 → 3 and fires every 1s. Nearby Slingers get +5% firerate each (up to +25%). It never boosts itself.', cost: 1750, add: { damage: 2 }, set: { cooldown: 1, kin: { rate: 0.05, rateCap: 0.25 } } },
      { name: 'Cysian Overclock', desc: 'Damage 3 → 9 and fires every 0.8s. Nearby Slingers get +20% range, +4 damage and +55% firerate (up to +40%, +8 and +125%). Each Cysian Overclock in the match costs 40% more.', cost: 10000, stack: 0.4,
        add: { damage: 6 }, set: { cooldown: 0.8, kin: { rate: 0.55, rateCap: 1.25, dmg: 4, dmgCap: 8, range: 0.2, rangeCap: 0.4 } } },
    ],
    bottom: [
      { name: 'Stronger Materials', desc: 'Damage 1 → 2.', cost: 200, add: { damage: 1 } },
      { name: 'Pullback Strength', desc: 'Damage 2 → 4.', cost: 400, add: { damage: 2 } },
      { name: 'Heavy Autoloader', desc: 'Damage 4 → 7 and shots splash a small area, but it fires every 2.1s instead of 1.6s.', cost: 700, add: { damage: 3 }, set: { cooldown: 2.1, radius: 3 } },
      { name: 'Volatile Bolts', desc: 'Exploding shots: damage 7 → 14, fires every 1.6s again and a slightly bigger blast.', cost: 2100, add: { damage: 7 }, set: { cooldown: 1.6, radius: 4, lead: true } },
      { name: 'Bold Trebuchet', desc: 'A long-range heavy shot: damage 14 → 54 and range 32 → 62, but it fires every 2.6s and loses its splash. Each Bold Trebuchet in the match costs 40% more.', cost: 7200, stack: 0.4,
        add: { damage: 40 }, set: { range: 62, cooldown: 2.6, radius: 0 } },
    ],
  }),

  // ---------------------------------------------------------------- Crossbower (event Archer)
  // arrow: straight piercing arrows (see the Archer). Homing Arrows switch to `bounce` (the arrow
  // finds a target, then ricochets to the closest zombie within `jump`, `hits` zombies in all).
  // cycle (Arbalist): each arrow has the next effect in turn: poison, burn, electric stun.
  // poacher (Power Poacher): blue fire on zombies that aren't burning, a slow on burning ones, and
  // an explosion when 3+ zombies are within `near` of the one it hit.
  ...crossTower('archerCrossbower', {
    name: 'Crossbower',
    altOf: 'archer',
    form: 'Crossbower',
    bossStop: 0.25, // bosses are stunned a quarter as long
    shards: 1,
    price: 0,
    cost: 400,
    limit: 25,
    flying: false,
    blurb: 'An alternate Archer with a crossbow: slow arrows that pierce a line of zombies. Top path: homing arrows that ricochet between targets, with flying detection. Bottom path: poison, then cycling poison, fire and stunning electricity, and at X-4 explosions in crowds. Weak against single tough zombies.',
    tip: 'Put it on a long straight stretch with targeting on First or Last to make the most of its pierce. Homing arrows make placement matter less. One X-2 Crossbower is enough: poison doesn\'t stack.',
    base: { name: 'Crossbower', desc: 'Slow arrows that pierce 2 zombies.', damage: 2, cooldown: 2.5, range: 28, arrow: { speed: 20, pierce: 2 } },
    top: [
      { name: 'Goggles', desc: 'Range 28 → 31.', cost: 80, set: { range: 31 } },
      { name: 'Refurbished Handle', desc: 'Damage 2 → 5.', cost: 310, add: { damage: 3 } },
      { name: 'Homing Arrows', desc: 'Arrows home in and ricochet between zombies: damage 5 → 8, pierce 2 → 5, 40% defense piercing and flying detection.', cost: 1100,
        add: { damage: 3 }, set: { arrow: null, bounce: { hits: 5, jump: 4 }, defPierce: 0.4, flying: true } },
      { name: 'Winter Hunter', desc: 'Damage 8 → 17, fires every 2.2s, pierce 5 → 10, 60% defense piercing and a much bigger homing range.', cost: 2750,
        add: { damage: 9 }, set: { cooldown: 2.2, bounce: { hits: 10, jump: 7 }, defPierce: 0.6 } },
    ],
    bottom: [
      { name: 'Poison Tipped', desc: 'Arrows poison zombies: 1 damage every second for 2s.', cost: 130, set: { poison: { damage: 1, tick: 1, time: 2, slow: 0 } } },
      { name: 'Stronger Poison', desc: 'Poison 1 → 2 damage per tick (4 total).', cost: 200, set: { poison: { damage: 2, tick: 1, time: 2, slow: 0 } } },
      { name: 'Arbalist', desc: 'Damage 2 → 3. Arrows cycle through poison (3 every 0.5s for 2s), fire (3 every 0.5s for 2s) and electricity (stuns for 0.5s).', cost: 550,
        add: { damage: 1 }, set: { poison: null, cycle: [{ poison: { damage: 3, tick: 0.5, time: 2, slow: 0 } }, { fire: { dps: 6, time: 2 } }, { stun: 0.5 }] } },
      { name: 'Power Poacher', desc: 'Damage 3 → 7, range 28 → 32, pierce 2 → 6 and 50% defense piercing. Blue fire (8 damage) on unburned zombies, a 1s slow on burning ones, and a 30-damage explosion when 3+ zombies are near the target.', cost: 1750,
        add: { damage: 4 }, set: { range: 32, arrow: { speed: 20, pierce: 6 }, defPierce: 0.5, cycle: null, poacher: { fire: { dps: 4, time: 2 }, slow: { slow: 0.5, time: 1 }, near: 3, count: 3, boom: { damage: 30, radius: 2 } } } },
    ],
    // Homing (bounce) arrows pierce as many zombies as the arrow would.
    finish: (s) => {
      if (s.bounce && s.arrow) delete s.arrow;
    },
    rows: { '2-4': { defPierce: 0.9 } },
  }),

  // ---------------------------------------------------------------- Gunslinger (Shotgunner)
  // A shotgun blast: the zombie it hits and (with maxHits) the closest others within `radius`.
  ...crossTower('shotgunnerGunslinger', {
    name: 'Gunslinger',
    altOf: 'shotgunner',
    form: 'Gunslinger',
    shards: 1,
    price: 0,
    cost: 300,
    limit: 25,
    flying: false,
    blurb: 'An alternate Shotgunner with a short-range shotgun. Top path: range, flying detection and Reinforcements, a Mercenary that walks down the path. Bottom path: 2- then 3-shot explosive bursts with a much bigger blast. Very short range and no defense piercing.',
    tip: '3-4 base Gunslingers hold the first waves while you save up. Mercenaries are best on winding single-lane paths.',
    base: { name: 'Gunslinger', desc: 'A shotgun that hits one zombie up close.', damage: 6, cooldown: 2.5, range: 15, radius: 5, maxHits: 1 },
    top: [
      { name: 'Shades', desc: 'Range 15 → 18.', cost: 80, set: { range: 18 } },
      { name: 'Gloves', desc: 'Fires every 2.2s instead of 2.5s.', cost: 200, set: { cooldown: 2.2 } },
      { name: 'Marksman', desc: 'Damage 6 → 7, range 18 → 26 and flying detection.', cost: 500, add: { damage: 1 }, set: { range: 26, flying: true } },
      { name: 'Reinforcements', desc: 'Damage 7 → 11 and range 26 → 28. Reinforcements: a Mercenary (30 HP, 16 DPS, sees flyers) walks down the path. 30s cooldown, and it calls them on its own when ready.', cost: 2300,
        add: { damage: 4 }, set: { range: 28 }, abilities: [{ key: 'militia', name: 'Reinforcements', desc: 'A Mercenary (30 HP, 16 DPS, sees flyers) walks down the path. Calls itself when ready', cooldown: 30, auto: true, unit: GS_MERC }] },
    ],
    bottom: [
      { name: 'Bigger Blast', desc: 'Each shot hits 2 zombies instead of 1, and the blast grows from 5 to 7.2.', cost: 230, set: { maxHits: 2, radius: 7.2 } },
      { name: 'AP Rounds', desc: 'Damage 6 → 10.', cost: 440, add: { damage: 4 } },
      { name: 'Quad-Barrel', desc: '2-shot bursts and damage 10 → 11.', cost: 750, add: { damage: 1 }, set: { burst: 2, burstGap: 0.25 } },
      { name: 'Wasteland Ravager', desc: 'Explosive shots: damage 11 → 33, blast 7.2 → 12.2, range 15 → 17, 3-shot bursts, fires every 2.3s.', cost: 5500,
        add: { damage: 22 }, set: { radius: 12.2, range: 17, burst: 3, cooldown: 2.3, maxHits: 0, lead: true } },
    ],
    rows: { '2-4': { range: 20, cooldown: 2 } },
  }),

  // ---------------------------------------------------------------- Freezer X (Frost Trooper)
  // A freeze ray: every hit adds `chill` (see the Freezer); a fully chilled zombie freezes for
  // `chillFreeze` s (never bosses). Explosives (Top 3): blasts that freeze everything in `radius`.
  // Not used by the game yet (kept for later): iceResistDown (Living Legend lowers enemies' ice
  // resistance; there's no ice resistance yet), slowFreezeResist (Absolute Zero should also slow
  // freeze-immune zombies).
  ...crossTower('frostFreezerX', {
    name: 'Freezer',
    altOf: 'frost',
    form: 'Freezer X',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 10,
    flying: false,
    blurb: 'An alternate Frost Trooper with a freeze ray. It does almost no damage, but stops zombies in their tracks. Top path: slower splash freezing and lower ice resistance. Bottom path: slows zombies before they freeze, then Absolute Zero freezes everything in range.',
    tip: 'Put it in front of your main damage towers so frozen zombies sit inside their range.',
    base: { name: 'Freezer', desc: 'A freeze ray: hits build up chill until the zombie freezes for 1s.', damage: 1, cooldown: 0.25, range: 13, chill: 0.15, maxSlow: 0, chillTime: 1.5, chillFreeze: 1 },
    top: [
      { name: 'Gloves', desc: 'Range 13 → 17.', cost: 150, set: { range: 17 } },
      { name: 'Extra Snow', desc: 'Zombies stay frozen longer (1s → 1.75s).', cost: 500, set: { chillFreeze: 1.75 } },
      { name: 'Explosives', desc: 'Frozen explosives that freeze every zombie near the target. Range 17 → 21, but it fires every 1.35s.', cost: 1800,
        set: { range: 21, cooldown: 1.35, radius: 4, chill: 0, maxSlow: 0, freeze: 1.5 } },
      { name: 'Living Legend', desc: 'Lowers zombies\' ice resistance, and damage 1 → 6.', cost: 2000, add: { damage: 5 }, set: { iceResistDown: 0.25 } },
    ],
    bottom: [
      { name: 'Air Pressure', desc: 'Damage 1 → 2.', cost: 250, add: { damage: 1 } },
      { name: 'Cooling Tanks', desc: 'Damage 2 → 4.', cost: 500, add: { damage: 2 } },
      { name: 'Glacial Prowless', desc: 'Zombies are slowed (up to 40%) while they are being frozen.', cost: 1700, set: { maxSlow: 0.4 } },
      { name: 'Absolute Zero', desc: 'Damage 4 → 5. Absolute Zero: freezes every zombie in a slightly larger range for 1s and deals 10 damage ($150, 30s cooldown).', cost: 4500,
        add: { damage: 1 }, set: { slowFreezeResist: true },
        abilities: [{ key: 'absZero', name: 'Absolute Zero', desc: 'Freezes every zombie within 9.5 for 1s (bosses too) and deals 10 damage', cooldown: 30, cost: 150, radius: 9.5, freeze: 1, damage: 10 }] },
    ],
    finish: (s) => {
      if (s.freeze) s.chill = 0; // explosives freeze outright
      if (!s.chill) delete s.chill;
    },
  }),

  // ---------------------------------------------------------------- Demolitionist (Grenadier)
  // Lobbed grenades that explode across `radius`. It can't aim at flyers, but its blasts hurt
  // flyers near the ground zombie it hit (splashAir). Airstrike: see the Military Base.
  // Not used by the game yet (kept for later): globalCd on the Airstrike (1s, 6s at X-4).
  ...crossTower('grenadierDemolitionist', {
    name: 'Demolitionist',
    altOf: 'grenadier',
    form: 'Demolitionist',
    shards: 4,
    price: 0,
    cost: 900,
    limit: 16,
    flying: false,
    splashAir: true,
    lob: 0.9,
    blurb: 'An alternate Grenadier: grenades that explode across a wide area, with 75% defense piercing from the start. Top path: huge slow rockets with full defense piercing. Bottom path: faster, smaller blasts and an Airstrike you can call anywhere on the map. Can\'t aim at flyers, but its blasts catch them.',
    tip: 'Several 4-2 Demolitionists clear almost any crowd. Time the Airstrike for clumps of zombies.',
    base: { name: 'Demolitionist', desc: 'Lobbed grenades with a wide blast and 75% defense piercing.', damage: 5, cooldown: 3, range: 34, radius: 14, defPierce: 0.75 },
    top: [
      { name: 'Ironsights', desc: 'Range 34 → 36.', cost: 80, set: { range: 36 } },
      { name: 'Big Blasts', desc: 'Damage 5 → 6 and blast 14 → 16.', cost: 325, add: { damage: 1 }, set: { radius: 16 } },
      { name: 'Artilleryman', desc: 'A rocket launcher: damage 6 → 41, blast 16 → 18, range 36 → 52, and 100% defense piercing.', cost: 5000, add: { damage: 35 }, set: { radius: 18, range: 52, defPierce: 1 } },
      { name: 'Bunker Buster', desc: 'Damage 41 → 126, range 52 → 62, blast 18 → 28, but it fires every 3.3s.', cost: 13500, add: { damage: 85 }, set: { range: 62, radius: 28, cooldown: 3.3 } },
    ],
    bottom: [
      { name: 'Gloves', desc: 'Fires every 2.8s instead of 3s.', cost: 325, set: { cooldown: 2.8 } },
      { name: 'Strong Shells', desc: 'Damage 5 → 7 and defense piercing 75% → 95%.', cost: 550, add: { damage: 2 }, set: { defPierce: 0.95 } },
      { name: 'Lock and Load', desc: 'Fires every 1.1s and damage 7 → 17. Airstrike: 800 damage in a large radius anywhere on the map ($300, 50s cooldown).', cost: 4000,
        add: { damage: 10 }, set: { cooldown: 1.1 },
        abilities: [{ key: 'airstrike', name: 'Airstrike', desc: 'Click anywhere: 800 damage to every zombie within 7 (flyers and hidden ones too)', cooldown: 50, cost: 300, aim: true, damage: 800, radius: 7, globalCd: 1 }] },
      { name: 'Strike Force One', desc: 'Airstrike 800 → 1,500 damage. Damage 17 → 21 and it fires every 0.75s.', cost: 12000,
        add: { damage: 4 }, set: { cooldown: 0.75 },
        abilities: [{ key: 'airstrike', name: 'Airstrike', desc: 'Click anywhere: 1,500 damage to every zombie within 7 (flyers and hidden ones too)', cooldown: 50, cost: 300, aim: true, damage: 1500, radius: 7, globalCd: 6 }] },
    ],
    rows: { '3-2': { defPierce: 1.2 }, '4-2': { defPierce: 1.2, cooldown: 3.1 } },
  }),

  // ---------------------------------------------------------------- Sniper X (Sniper)
  // aimShot (Fatal Precision): it focuses 1s on its target before every shot.
  ...crossTower('sniperX', {
    name: 'Sniper',
    altOf: 'sniper',
    form: 'Sniper X',
    shards: 2,
    price: 0,
    cost: 500,
    limit: 25,
    flying: false,
    blurb: 'An alternate Sniper: slow, heavy shots from long range with 100% defense piercing. Top path: huge shots with a 1s lock-on. Bottom path: flying detection at X-1, then much faster fire with less defense piercing. Great against tough single zombies, poor against crowds.',
    tip: 'Fill the early waves with 1-1 Snipers, or save for a 3-2 or 2-4 to handle a big boss.',
    base: { name: 'Sniper', desc: 'Slow, heavy long-range shots with 100% defense piercing.', damage: 4, cooldown: 3.6, range: 48, defPierce: 1 },
    top: [
      { name: 'Big Bullets', desc: 'Damage 4 → 7.', cost: 330, add: { damage: 3 } },
      { name: 'Heavy Calibre', desc: 'Damage 7 → 11.', cost: 800, add: { damage: 4 } },
      { name: 'Fatal Precision', desc: 'Laser sights focus 1s on the target before every shot, but damage 11 → 156. Range 48 → 54.', cost: 7000, add: { damage: 145 }, set: { aimShot: 1, range: 54 } },
      { name: 'Heavy Impact', desc: 'Damage 156 → 290 and range 54 → 65.', cost: 10000, add: { damage: 134 }, set: { range: 65 } },
    ],
    bottom: [
      { name: 'Night Vision', desc: 'Gains flying detection.', cost: 200, set: { flying: true } },
      { name: 'Faster Firing', desc: 'Fires every 2.6s instead of 3.6s.', cost: 500, set: { cooldown: 2.6 } },
      { name: 'Semi Auto', desc: 'Damage 4 → 12 and fires every 1.2s, but defense piercing 100% → 50%.', cost: 2250, add: { damage: 8 }, set: { cooldown: 1.2, defPierce: 0.5 } },
      { name: 'Straight Bolt Pull', desc: 'Fires every 0.35s though damage 12 → 10. Range 48 → 70 and defense piercing 50% → 80%.', cost: 6500, add: { damage: -2 }, set: { cooldown: 0.35, range: 70, defPierce: 0.8 } },
    ],
  }),

  // ---------------------------------------------------------------- Sharpshooter (Marksman)
  // Molotov (m203 with burn + patch): every `every` s it lobs a molotov at its target that sets the
  // zombies in it on fire (fire ignores armor; it doesn't stack). fireDart chance 1 = burning bullets.
  ...crossTower('marksmanSharpshooter', {
    name: 'Sharpshooter',
    altOf: 'marksman',
    form: 'Sharpshooter',
    shards: 2,
    price: 0,
    cost: 600,
    limit: 25,
    flying: false,
    blurb: 'An alternate Marksman: a balanced rifleman with cheap early upgrades. Top path: flying detection at 2-X, then a fast-firing damage dealer with 150% defense piercing. Bottom path: sets zombies on fire and throws Molotovs that burn groups.',
    tip: '2-4 is very cost-efficient early on and can handle hordes by itself.',
    base: { name: 'Sharpshooter', desc: 'A rifle: one zombie at a time.', damage: 2, cooldown: 1, range: 28 },
    top: [
      { name: 'Training', desc: 'Damage 2 → 4.', cost: 400, add: { damage: 2 } },
      { name: 'Precise Aiming', desc: 'Gains flying detection, and range 28 → 31.', cost: 300, set: { flying: true, range: 31 } },
      { name: 'Rifle Mastery', desc: 'Damage 4 → 8 and fires every 0.7s. Molotovs every 3s instead of 6s, and 100% defense piercing.', cost: 1750,
        add: { damage: 4 }, set: { cooldown: 0.7, defPierce: 1 }, fn: (s) => { if (s.m203) s.m203 = { ...s.m203, every: 3 }; } },
      { name: 'True Survivalist', desc: 'Damage 8 → 10 and fires every 0.2s. Range 31 → 32 and defense piercing 100% → 150%.', cost: 6000, add: { damage: 2 }, set: { cooldown: 0.2, range: 32, defPierce: 1.5 } },
    ],
    bottom: [
      { name: 'Molotov', desc: 'Every 6s it throws a Molotov at its target: zombies in it burn for 1 damage every 0.5s for 1.5s. Fire ignores armor and doesn\'t stack.', cost: 450,
        set: { m203: { name: 'Molotov', every: 6, damage: 0, radius: 2.5, burn: 2, burnTime: 1.5 } } },
      { name: 'Wall of Flames', desc: 'Molotovs leave fire on the path for 2s.', cost: 500, fn: (s) => { s.m203 = { ...s.m203, patch: { time: 2, burn: 2, burnTime: 1.5 } }; } },
      { name: 'Flaming Bullets', desc: 'Bullets set zombies on fire. Damage 2 → 6, burn 1 → 2 per tick, 100% defense piercing, and Molotovs every 3s.', cost: 1250,
        add: { damage: 4 }, set: { fireDart: { chance: 1, dps: 4, time: 1.5 }, defPierce: 1 }, fn: (s) => { s.m203 = { ...s.m203, every: 3, burn: 4, ...(s.m203.patch ? { patch: { ...s.m203.patch, burn: 4 } } : {}) }; } },
      { name: 'Superhot Gun', desc: 'Damage 6 → 14 and burns 2 → 7 per tick for 4s. Range 28 → 30 and defense piercing 100% → 130%.', cost: 3000,
        add: { damage: 8 }, set: { fireDart: { chance: 1, dps: 14, time: 4 }, range: 30, defPierce: 1.3 }, fn: (s) => { s.m203 = { ...s.m203, burn: 14, burnTime: 4, ...(s.m203.patch ? { patch: { ...s.m203.patch, burn: 14, burnTime: 4 } } : {}) }; } },
    ],
    rows: { '2-4': { range: 33 } },
  }),

  // ---------------------------------------------------------------- Market (Farm)
  // Pays its cash in `bundles` during each wave (crates, see the Airdrop Farm), each worth
  // `bundle`. bank (Banking): the bundles go into its bank instead, which earns `interest` at the
  // start of every wave, up to `cap`. Collect Bank pays out what's in it.
  ...crossTower('farmMarket', {
    name: 'Market',
    altOf: 'farm',
    form: 'Market',
    shards: 2,
    price: 0,
    cost: 650,
    limit: 6,
    kind: 'income',
    crateGap: 3,
    blurb: 'An alternate Farm. It never attacks: it pays you cash in bundles during each wave. Top path: more and bigger bundles for steady income. Bottom path: a bank that earns interest every wave, up to a cap, and you collect it any time.',
    tip: 'On the Bottom path, collect before the bank hits its cap ($8,000 at X-3, $18,000 at X-4), or the extra interest is wasted.',
    base: { name: 'Market', desc: '2 cash bundles of $40 during each wave.', bundles: 2, bundle: 40, drop: 4 },
    top: [
      { name: 'Advertising', desc: 'Bundles per wave 2 → 3.', cost: 375, add: { bundles: 1 } },
      { name: 'Extra Storage', desc: 'Bundles per wave 3 → 4.', cost: 425, add: { bundles: 1 } },
      { name: 'Small Business', desc: 'Bundles per wave 4 → 8, each worth $115 instead of $40.', cost: 2300, add: { bundles: 4, bundle: 75 } },
      { name: 'Government Agency', desc: 'Each bundle is worth $305 instead of $115.', cost: 8500, add: { bundle: 190 } },
    ],
    bottom: [
      { name: 'Cash Register', desc: 'Each bundle is worth $50 instead of $40.', cost: 320, add: { bundle: 10 } },
      { name: 'Enthusiasm', desc: 'Each bundle is worth $65 instead of $50.', cost: 540, add: { bundle: 15 } },
      { name: 'Banking', desc: 'Bundles 2 → 7, worth $77 each. Cash is stored in the bank (up to $8,000) instead of paid out, and earns 40% interest at the start of each wave. Collect it any time.', cost: 3400,
        add: { bundles: 5, bundle: 12 }, set: { bank: { interest: 0.4, cap: 8000 } },
        abilities: [{ key: 'withdraw', name: 'Collect Bank', desc: 'Pays out everything in the bank', cooldown: 1 }] },
      { name: 'Economic Boost', desc: 'Bundles 7 → 10, worth $95 each. Interest 40% → 50% and the bank holds up to $18,000.', cost: 10000,
        add: { bundles: 3, bundle: 18 }, set: { bank: { interest: 0.5, cap: 18000 } } },
    ],
    finish: (s) => {
      s.crates = s.bundles;
      s.income = s.bundles * s.bundle;
    },
  }),

  // ---------------------------------------------------------------- Vulcan (Commando)
  // A minigun that has to spin up (`rev` s) before it fires. pass: piercing bullets.
  ...crossTower('commandoVulcan', {
    name: 'Vulcan',
    altOf: 'commando',
    form: 'Vulcan',
    shards: 3,
    price: 0,
    cost: 2500,
    limit: 13,
    flying: false,
    blurb: 'An alternate Commando: a mounted minigun. Each bullet is weak, but it fires so fast it has some of the highest DPS around. Never gets flying detection. Top path: even faster, piercing bullets. Bottom path: heavy plasma rounds with 120% defense piercing.',
    tip: 'Put it on loops or corners, and pair it with a Bugler or Surveyor for extra range. It\'s cheap enough to sell and rebuild wherever the fight is.',
    base: { name: 'Vulcan', desc: 'A minigun that spins up for 0.8s, then fires very fast.', damage: 2, cooldown: 0.2, range: 25, rev: 0.8 },
    top: [
      { name: 'Faster Spinup', desc: 'Spins up faster (0.8s → 0.5s).', cost: 300, set: { rev: 0.5 } },
      { name: 'Quicker Rotations', desc: 'Fires every 0.16s instead of 0.2s.', cost: 700, set: { cooldown: 0.16 } },
      { name: 'Double Tap', desc: 'Two cannons: fires every 0.08s, damage 2 → 3 and range 25 → 27.', cost: 2400, add: { damage: 1 }, set: { cooldown: 0.08, range: 27 } },
      { name: 'Radioactive Bullets', desc: 'Bullets pierce up to 3 zombies. Damage 3 → 9, range 27 → 40 and 60% defense piercing.', cost: 9000, add: { damage: 6 }, set: { pass: 2, range: 40, defPierce: 0.6 } },
    ],
    bottom: [
      { name: 'Gloves', desc: 'Range 25 → 28.', cost: 325, set: { range: 28 } },
      { name: 'Heavy Armor', desc: 'Damage 2 → 3.', cost: 800, add: { damage: 1 } },
      { name: 'Better Structure', desc: 'Damage 3 → 10 and 30% defense piercing.', cost: 3000, add: { damage: 7 }, set: { defPierce: 0.3 } },
      { name: 'Plasma Reactor', desc: 'Damage 10 → 18, fires every 0.16s, range 28 → 36 and 120% defense piercing.', cost: 14000, add: { damage: 8 }, set: { cooldown: 0.16, range: 36, defPierce: 1.2 } },
    ],
    rows: { '3-2': { range: 29 }, '4-2': { range: 43, defPierce: 0.9 }, '2-4': { cooldown: 0.12 } },
  }),

  // ---------------------------------------------------------------- Electricizer (Railgunner)
  // Huge slow shots across most of the map. near: when a zombie it can hit is within `within` of
  // its range, it switches to its short-range mode (these fields replace the level's).
  // chains / jump / stun: chain lightning (see the Electroshocker). Not used by the game yet (kept
  // for later): zapBig (Voltage Overdrive's long shots should stun bigger zombies).
  ...crossTower('railgunnerElectricizer', {
    name: 'Electricizer',
    altOf: 'railgunner',
    form: 'Electricizer',
    bossStop: 0.25, // bosses are stunned a quarter as long
    shards: 5,
    price: 0,
    cost: 3800,
    limit: 8,
    flying: false,
    blurb: 'An alternate Railgunner: huge, slow electric shots with range across most of the map. When zombies get within half its range it switches to a splashing short-range mode. Top path: pure damage, up to the Starship Killer. Bottom path: chain lightning that stuns, flying detection at X-3, and Voltage Overdrive.',
    tip: 'Its range makes placement flexible: put it somewhere safe from zombies that stun towers.',
    base: { name: 'Electricizer', desc: 'Huge electric shots. Zombies within half its range get a splashing short-range shot.', damage: 70, cooldown: 5, range: 80, near: { within: 0.5, radius: 2 } },
    top: [
      { name: 'Extra Range', desc: 'Range 80 → 95.', cost: 250, set: { range: 95 } },
      { name: 'Extra Power', desc: 'Damage 70 → 105.', cost: 2800, add: { damage: 35 } },
      { name: 'Mounted Rifle', desc: 'Damage 105 → 255, but it loses its mode switch and splash: single target only.', cost: 8000, add: { damage: 150 }, set: { near: null } },
      { name: 'Experimental Death Cannon', desc: 'Damage 255 → 630 and range 95 → 105.', cost: 32500, add: { damage: 375 }, set: { range: 105 } },
      { name: 'Starship Killer', desc: 'Charges for 30s, then fires 25,630 damage spread over 40 shots. Range 105 → 135 and flying detection. Each Starship Killer in the match costs 40% more.', cost: 250000, stack: 0.4,
        set: { cooldown: 31, burst: 40, burstGap: 0.05, range: 135, flying: true, lead: true },
        fn: (s) => { s.damage = Math.round(((s.damage - 630 + 25630) / 40) * 100) / 100; } },
    ],
    bottom: [
      { name: 'Weighted Tripod', desc: 'Damage 70 → 80 and range 80 → 85.', cost: 900, add: { damage: 10 }, set: { range: 85 } },
      { name: 'Greased Trigger', desc: 'Fires every 4.5s instead of 5s.', cost: 1100, set: { cooldown: 4.5 } },
      { name: 'Electric Shock', desc: 'Damage 80 → 120. Shots chain to 4 nearby zombies and stun them. Flying detection and 40% defense piercing.', cost: 5500,
        add: { damage: 40 }, set: { chains: 5, jump: 10, stun: 0.6, flying: true, defPierce: 0.4, near: { within: 0.5, radius: 4, chains: 0 } } },
      { name: 'Expert Ranger', desc: 'Damage 120 → 220, chains reach 7 zombies, longer stuns and 80% defense piercing.', cost: 22500,
        add: { damage: 100 }, set: { chains: 8, stun: 1, defPierce: 0.8, near: { within: 0.5, radius: 7, chains: 0 } } },
      { name: 'Voltage Overdrive', desc: 'Long range: 420 damage, 1.2s stuns and a 14 splash. Short range: 45 damage every 0.5s with 0.3s stuns, no splash. Each one in the match costs 140% more.', cost: 37250, stack: 1.4,
        add: { damage: 200 }, set: { chains: 0, radius: 14, stun: 1.2, zapBig: true, near: { within: 0.5, damage: 45, cooldown: 0.5, stun: 0.3, radius: 0, chains: 0 } } },
    ],
    rows: { '2-2': { range: 100 }, '3-2': { range: 100 }, '4-2': { range: 110 }, '5-2': { range: 140 }, '2-3': { range: 100 }, '2-4': { range: 100 }, '2-5': { range: 100 } },
  }),

  // ---------------------------------------------------------------- Trapper X (Trapper)
  // Throws spikes onto the path. spike.pool: a spike's health: each zombie walking over it takes
  // up to what's left and wears it down by that much. life: seconds a spike lasts (Perma-spike:
  // until its health runs out). shred: zombies with more than `over` max health take `mult` x
  // trap damage. boom: the trap explodes when its health runs out. Can't be stunned.
  ...crossTower('trapperX', {
    name: 'Trapper',
    altOf: 'trapper',
    form: 'Trapper X',
    shards: 2,
    price: 0,
    cost: 500,
    limit: 8,
    traps: true,
    stunImmune: true,
    flying: false,
    blurb: 'An alternate Trapper that never shoots: it throws spikes that hurt zombies walking over them, until their health runs out. Can\'t be stunned. Top path: defense piercing and spikes that last until used up, up to 62 at once. Bottom path: faster throws and explosive mines that shred big zombies.',
    tip: 'Put it at the front with 2-4 to hit tanky zombies, or 3-X early for cheap defense-ignoring damage. Its traps can\'t reach flyers.',
    base: { name: 'Trapper', desc: 'Throws a spike (4 health) every 3s. Spikes last 30s, up to 12 at once.', damage: 0, cooldown: 3, range: 17, trapHp: 4, trapLife: 30, maxTraps: 12 },
    top: [
      { name: 'Defense Piercing', desc: 'Traps ignore zombie armor (100% defense piercing).', cost: 300, set: { defPierce: 1 } },
      { name: 'Super Spikes', desc: 'Spike health 4 → 6 and they last 45s instead of 30s.', cost: 500, add: { trapHp: 2 }, set: { trapLife: 45 } },
      { name: 'Hi-Tec Spikes', desc: 'Spike health 6 → 47 and up to 22 traps at once.', cost: 2100, add: { trapHp: 41 }, set: { maxTraps: 22 } },
      { name: 'Perma-spike', desc: 'Spikes last until their health runs out. Spike health 47 → 87 and up to 62 traps, but it throws every 3.5s.', cost: 6500, add: { trapHp: 40 }, set: { trapLife: 0, maxTraps: 62, cooldown: 3.5 } },
    ],
    bottom: [
      { name: 'Bigger Spikes', desc: 'Spike health 4 → 7.', cost: 400, add: { trapHp: 3 } },
      { name: 'Gloves', desc: 'Throws every 2.3s instead of 3s.', cost: 350, set: { cooldown: 2.3 } },
      { name: 'Research & Development', desc: 'Spike health 7 → 11, throws every 1.3s, range 17 → 20, 13 traps. Traps do triple damage to zombies with over 750 max health.', cost: 3800,
        add: { trapHp: 4 }, set: { cooldown: 1.3, range: 20, maxTraps: 13, shred: { over: 750, mult: 3 } } },
      { name: 'Explosive Mines', desc: 'Mine health 11 → 43, and mines explode for 85 damage nearby when used up. Defense piercing +35%.', cost: 6500,
        add: { trapHp: 32, defPierce: 0.35 }, set: { boom: { damage: 85, radius: 2 } } },
    ],
    rows: { '4-2': { trapHp: 100, cooldown: 2.8 } },
    finish: (s) => {
      s.order = ['spike'];
      s.spike = { damage: s.trapHp, pool: s.trapHp, life: s.trapLife || null, ...(s.shred ? { shred: s.shred } : {}), ...(s.boom ? { boom: s.boom } : {}) };
      s.damage = s.trapHp; // shown as the trap's damage
    },
  }),

  // ---------------------------------------------------------------- Bugler (Commander)
  // A support tower: towers in its `aura` get +rateBoost firerate, +rangeBoost range and
  // +dmgAdd damage (flat). Snare Drums: Call to Arms (+`boost` firerate for `duration` s).
  // Unit Commander: click near a zombie; towers in its aura attack it first until it dies.
  // Directed Power: click near one of your towers: +`boost` firerate for longer the lower its level.
  // Not used by the game yet (kept for later): globalCd (Snare Drums' 30s global cooldown).
  ...crossTower('commanderBugler', {
    name: 'Bugler',
    altOf: 'commander',
    form: 'Bugler',
    shards: 3,
    price: 0,
    cost: 750,
    limit: 3,
    kind: 'support',
    blurb: 'An alternate Commander that never attacks. It boosts the firerate, and later the range and damage, of every tower near it. Top path: a bigger firerate boost and Snare Drums. Bottom path: a bigger range boost, Unit Commander to focus fire, and Directed Power to double one tower\'s firerate.',
    tip: 'Cluster your main damage towers inside its circle, and use Directed Power on your strongest one. It doesn\'t boost spawners like the Recon Base or Surveyor.',
    base: { name: 'Bugler', desc: 'Nearby towers fire 5% faster.', aura: 25, rateBoost: 0.05 },
    top: [
      { name: 'Louder Calls', desc: 'Boost range 25 → 28.', cost: 350, set: { aura: 28 } },
      { name: 'Better Firerate', desc: 'Firerate boost 5% → 10%.', cost: 1500, set: { rateBoost: 0.1 } },
      { name: 'Snare Drums', desc: 'Nearby towers get +1 damage. Snare Drums: +20% firerate for 15s to nearby towers (60s cooldown).', cost: 4000,
        set: { dmgAdd: 1 }, abilities: [{ key: 'cta', name: 'Snare Drums', desc: '+20% firerate for 15s to towers in its range', cooldown: 60, duration: 15, boost: 0.2, globalCd: 30 }] },
      { name: 'Cysian Overseer', desc: 'Firerate boost 10% → 25% and boost range 28 → 31. Snare Drums has no global cooldown.', cost: 12000, set: { rateBoost: 0.25, aura: 31 },
        abilities: [{ key: 'cta', name: 'Snare Drums', desc: '+20% firerate for 15s to towers in its range', cooldown: 60, duration: 15, boost: 0.2 }] },
    ],
    bottom: [
      { name: 'Plume', desc: 'Nearby towers get 10% more range.', cost: 500, set: { rangeBoost: 0.1 } },
      { name: 'Cape', desc: 'Firerate boost 5% → 14%.', cost: 1750, set: { rateBoost: 0.14 } },
      { name: 'Unit Commander', desc: 'Range boost 10% → 20%. Unit Commander: towers in range attack the zombie you pick until it dies (5s cooldown).', cost: 3500,
        set: { rangeBoost: 0.2 }, abilities: [{ key: 'unitCommand', name: 'Unit Commander', desc: 'Click a zombie: towers in its range attack it first until it dies', cooldown: 5, aim: true, radius: 2 }] },
      { name: 'Directed Power', desc: 'Range boost 20% → 30%. Directed Power: one of your towers gets +100% firerate for about 75s (lower-level towers longer, down to 59s at max level). 70s cooldown.', cost: 12000,
        set: { rangeBoost: 0.3 }, abilities: [{ key: 'directedPower', name: 'Directed Power', desc: 'Click one of your towers: +100% firerate for 59-75s (longer for lower levels)', cooldown: 70, aim: true, radius: 2, boost: 1, long: 75, short: 59 }] },
    ],
    rows: { '2-2': { rateBoost: 0.2 }, '3-2': { rateBoost: 0.2 }, '4-2': { rateBoost: 0.35 }, '2-3': { rateBoost: 0.2 }, '2-4': { rateBoost: 0.2 } },
  }),

  // ---------------------------------------------------------------- Recon Base (Zed)
  // A spawner (see the Patrol): units come from the castle end toward the entrance. unit2 /
  // spawnEvery2: a second unit on its own timer (Ghouls). Paid vehicles are abilities that cost
  // cash (Missile Truck, Tank / Alien Warfare units, Bliss of Finality). noBuff: support towers
  // can't boost it. Ramming ignores armor and damage caps.
  ...crossTower('zedRecon', {
    name: 'Recon Base',
    altOf: 'zed',
    form: 'Recon Base',
    shards: 6,
    price: 0,
    cost: 1000,
    limit: 3,
    kind: 'spawner',
    noBuff: true,
    spawnEvery: 45,
    blurb: 'An alternate Zed that sends units down the path from the castle toward the entrance. Some come for free; others cost cash each time. Top path: Ghouls, Missile Trucks and Tanks, then alien tech. Bottom path: bigger Operative squads up to Fireteam Solemn, then the Bliss of Finality warship.',
    tip: 'Send the paid units right before big waves, not as soon as they are ready. Support towers can\'t boost it.',
    base: { name: 'Recon Base', desc: 'Sends an Operative (20 HP) every 45s.', unit: RB_OP, spawnEvery: 45 },
    top: [
      { name: 'Garage Ventilation', desc: 'Operatives every 30s instead of 45s.', cost: 400, set: { spawnEvery: 30 } },
      { name: 'All-Terrain Vehicle', desc: 'Ghoul ATV: 90 HP, fast, rams zombies. Every 40s.', cost: 800, set: { unit2: RB_GHOUL, spawnEvery2: 40 } },
      { name: 'Ballistic Missiles', desc: 'Missile Truck ($900, 70s cooldown): 250 HP, stops every 10s to fire 7 missiles of 25 damage (flyers too). Ghouls become Ghoul M2s with 110 HP and a minigun.', cost: 4800,
        set: { unit2: RB_GHOUL2 }, abilities: [truckAb(RB_TRUCK, 900)] },
      { name: 'Frontline Forces', desc: 'Tank ($2,000, 45s cooldown): 3,600 HP, a machine gun and a cannon, about 131 DPS. It keeps moving while firing.', cost: 20000,
        abilities: [tankAb(RB_TANK, 2000, 45)] },
      { name: 'Alien Warfare', desc: 'Every vehicle upgrades: Lightstrikers (600 HP, 150 DPS), Javelins ($1,600; 1,500 HP; 144 DPS) and Scyther Tanks ($3,500; 4,000 HP; about 762 DPS). Each Alien Warfare in the match costs 30% more.', cost: 95000, stack: 0.3,
        set: { unit2: RB_LIGHT },
        abilities: [{ ...truckAb(RB_JAVELIN, 1600), name: 'Javelin', desc: 'Sends a Javelin (1,500 HP): 18 rockets of 80 damage every 10s' }, tankAb(RB_SCYTHER, 3500, 45)] },
    ],
    bottom: [
      { name: 'Suppressor', desc: 'T2 Operatives: damage 2 → 3, firing every 0.4s.', cost: 600, set: { unit: RB_OP2 } },
      { name: 'More Recruits', desc: 'Operatives come as a pair sharing 40 HP, firing every 0.2s with more range.', cost: 900, set: { unit: RB_PAIR } },
      { name: 'Special Air Service', desc: 'A Private Squad trio (120 HP), range 24 → 28, firing every 0.12s. Ghouls become Phantoms (180 HP, much faster).', cost: 4000,
        set: { unit: RB_TRIO }, fn: (s) => { if (s.unit2) s.unit2 = s.unit2.gun ? RB_PHANTOM2 : RB_PHANTOM; } },
      { name: 'Fireteam Solemn', desc: 'A 4-unit squad sharing 180 HP: SMG and sniper (flyers too), a minigun and a splash rocket launcher.', cost: 18000, set: { unit: RB_SOLEMN } },
      { name: 'Bliss of Finality', perk: 'bliss', desc: '🔒 Beat Insane mode to unlock. Bliss of Finality ($45,000, 240s cooldown): an 8,000,000 HP mining warship flies over the map for 70s with miniguns and a 6,500-damage railgun. Each one in the match costs 35% more.', cost: 140000, stack: 0.35,
        abilities: [{ key: 'rbBliss', vehicle: true, name: 'Bliss of Finality', desc: 'An 8,000,000 HP warship flies over the path for 70s: miniguns and a 6,500-damage railgun', cooldown: 240, cost: 45000, unit: RB_BLISS, globalCd: 105 }] },
    ],
  }),

  // ---------------------------------------------------------------- Elite (Phaser)
  // Plasma bursts until it overheats (ammo / reload), then it pauses. heatRamp (Plasma Rifle):
  // full auto, firing faster the hotter it gets (cooldown → minCd) and with up to `dmg` more
  // damage. shieldMult: x damage to shielded zombies (Shielders). Immolation: a huge shot at the
  // zombie closest to where you click.
  ...crossTower('phaserElite', {
    name: 'Elite',
    altOf: 'phaser',
    form: 'Elite',
    shards: 4,
    price: 0,
    cost: 1000,
    limit: 12,
    flying: false,
    laser: true,
    blurb: 'An alternate Phaser: fast plasma bursts until its gun overheats, then a short pause. Top path: full auto that fires faster as it heats up, up to 100% defense piercing. Bottom path: flying detection, 3x damage to shields, no more overheating, and Immolation.',
    tip: 'Great against shielded zombies. Build lots of Top path Elites for steady damage, and keep one Bottom path Elite for Immolation on priority targets.',
    base: { name: 'Elite', desc: '3-shot plasma bursts. Overheats after 7 bursts, then cools down for 3s.', damage: 2, burst: 3, burstGap: 0.1, cooldown: 0.8, range: 32, ammo: 21, reload: 3, defPierce: 0.1 },
    top: [
      { name: 'Ventilation', desc: 'Overheats less often: 10 bursts instead of 7.', cost: 200, set: { ammo: 30 } },
      { name: 'Armor Plating', desc: 'Damage 2 → 3 and 5-shot bursts.', cost: 1200, add: { damage: 1 }, set: { burst: 5, ammo: 48 } },
      { name: 'Plasma Rifle', desc: 'Fully automatic: damage 4, a shot every 0.13s and 59 shots before overheating. It fires faster as it heats up (down to 0.03s). Defense piercing 10% → 35%.', cost: 3200,
        add: { damage: 1 }, set: { burst: 1, burstGap: 0, cooldown: 0.13, ammo: 59, heatRamp: { minCd: 0.03, dmg: 0 }, defPierce: 0.35 } },
      { name: 'Particle Accelerator', desc: 'Damage 4 → 8, defense piercing 35% → 100% and 176 shots before overheating. Up to +37.5% damage as it heats up.', cost: 12500,
        add: { damage: 4 }, set: { ammo: 176, heatRamp: { minCd: 0.03, dmg: 0.375 }, defPierce: 1 } },
    ],
    bottom: [
      { name: 'Cyborg Enhancements', desc: 'Gains flying detection, and range 32 → 35.', cost: 200, set: { flying: true, range: 35 } },
      { name: 'Plasma Bombardment', desc: 'Deals 3x damage to shields.', cost: 450, set: { shieldMult: 3 } },
      { name: 'Master Design', desc: 'The gun no longer overheats.', cost: 1100, set: { ammo: 0, reload: 0 } },
      { name: 'Immolator Overcharge', desc: 'Full auto (every 0.1s) and damage 2 → 3. Immolation: 2,400 damage (7,200 to shields) to the zombie you pick ($1,800, 45s cooldown).', cost: 4000,
        add: { damage: 1 }, set: { burst: 1, burstGap: 0, cooldown: 0.1 },
        abilities: [{ key: 'immolation', name: 'Immolation', desc: 'Click a zombie: 2,400 damage (7,200 to shields)', cooldown: 45, cost: 1800, aim: true, radius: 2, damage: 2400, shieldMult: 3, globalCd: 3 }] },
    ],
    rows: { '4-2': { ammo: 149 } },
    finish: (s) => {
      if (!s.ammo) {
        delete s.ammo;
        delete s.reload;
      }
    },
  }),

  // ---------------------------------------------------------------- Businessman (Cowboy)
  // Shoots and earns `income` every wave. defPierce -1: armored zombies take half damage.
  // globalCdCut (Stimulus Booster): every tower's ability cooldowns are 5% shorter per one (up to 30%).
  // shared (Discount Seeker): it can also shoot zombies inside any other Businessman's range.
  // bizDisc: towers in its range get `pct` off upgrades up to tier `tier` (stacking to `cap`).
  // Attrition: zombies that spawn in the next `duration` s lose `pct` of their health (up to `cap`).
  ...crossTower('cowboyBusinessman', {
    name: 'Businessman',
    altOf: 'cowboy',
    form: 'Businessman',
    shards: 4,
    price: 0,
    cost: 650,
    limit: 16,
    blurb: 'An alternate Cowboy that shoots and earns cash every wave. Sees flyers from the start, but -100% defense piercing early on (armored zombies take half damage). Top path: more money and shorter ability cooldowns for every tower. Bottom path: cheaper upgrades for nearby towers, shared range with other Businessmen, and Attrition.',
    tip: 'Makes far less than a Market. Its upgrades get 5% pricier for each one already on the map.',
    base: { name: 'Businessman', desc: 'Shoots one zombie at a time and earns $40 every wave.', damage: 4, cooldown: 2, range: 28, income: 40, defPierce: -1 },
    top: [
      { name: 'Briefcase', desc: 'Earns $100 every wave instead of $40.', cost: 250, set: { income: 100 } },
      { name: 'Strapped for Cash', desc: 'Earns $250 every wave instead of $100.', cost: 750, set: { income: 250 } },
      { name: 'Stimulus Booster', desc: 'Earns $400 a wave. Damage 4 → 12 and defense piercing -100% → 0%. Every tower\'s ability cooldowns are 5% shorter (stacking to 30%).', cost: 4000,
        add: { damage: 8 }, set: { income: 400, defPierce: 0, globalCdCut: 0.05 } },
      { name: 'Sleazy Operation', desc: 'Earns $800 a wave. Damage 12 → 75 and defense piercing 0% → 150%.', cost: 7500, add: { damage: 63 }, set: { income: 800, defPierce: 1.5 } },
    ],
    bottom: [
      { name: 'AP Rounds', desc: 'Damage 4 → 6.', cost: 200, add: { damage: 2 } },
      { name: 'Professional', desc: 'Damage 6 → 7, fires every 1.5s and range 28 → 32.', cost: 600, add: { damage: 1 }, set: { cooldown: 1.5, range: 32 } },
      { name: 'Discount Seeker', desc: 'Shoots zombies inside other Businessmen\'s range. Towers in range get 5% off tier 1-3 upgrades (stacking to 20%). Range 32 → 42, damage 7 → 15, defense piercing 100%. Costs 5% more per tier-3 Businessman placed.', cost: 4500, stack: 0.05,
        add: { damage: 8 }, set: { shared: true, bizDisc: { pct: 0.05, cap: 0.2, tier: 3 }, range: 42, defPierce: 1 } },
      { name: 'The Omni', desc: 'Damage 15 → 30, $90 a wave, range 42 → 45, and the discount covers tier 4 upgrades. Attrition ($2,000, 75s cooldown): zombies that spawn in the next 20s lose 30% of their health (up to 2,500). Costs 5% more per tier-4 Businessman placed.', cost: 11500, stack: 0.05,
        add: { damage: 15 }, set: { income: 90, range: 45, bizDisc: { pct: 0.05, cap: 0.2, tier: 4 } },
        abilities: [{ key: 'attrition', name: 'Attrition', desc: 'Zombies that spawn in the next 20s lose 30% of their health (up to 2,500)', cooldown: 75, cost: 2000, duration: 20, pct: 0.3, cap: 2500 }] },
    ],
    rows: { '2-4': { income: 300 } },
  }),

  // ---------------------------------------------------------------- Mechanic (Engineer)
  // A weak nailgun, plus temporary turrets: every `buildEvery` s it builds one (sentry, see the
  // Engineer) on open ground in `buildRange`, up to `sentries` at once. Each lasts its `life`.
  // sentryCycle: the turret kinds it builds in turn. Forcefield: towers within `radius` of it
  // can't be stunned for `duration` s.
  // Not used by the game yet (kept for later): the 2s turret setup time (they work at once), globalCd.
  ...crossTower('engineerMechanic', {
    name: 'Mechanic',
    altOf: 'sentryEngineer',
    form: 'Mechanic',
    shards: 4,
    price: 0,
    cost: 480,
    limit: 20,
    flying: false,
    blurb: 'An alternate Engineer with a weak nailgun. His real damage comes from the temporary turrets he builds in his range every 10s. Top path: stronger turrets (M1 to M4), then Detonators, Plasmators and Hunters. Bottom path: Teslas that stun everything nearby, then a Forcefield that blocks stuns.',
    tip: 'Unlike drones and units, his turrets can be boosted by a Bugler. They appear in random spots in his range.',
    base: { name: 'Mechanic', desc: 'A nailgun: one zombie at a time.', damage: 1, cooldown: 0.8, range: 16 },
    top: [
      { name: 'Attack Turret', desc: 'Builds an M1 Turret every 10s (up to 2) that lasts 15s: 1 damage every 0.8s.', cost: 500, set: { buildEvery: 10, sentries: 2, sentryCycle: [M1] } },
      { name: 'Rewritten AI', desc: 'M2 Turrets: flying detection, up to 3, last 20s and fire every 0.4s with more range.', cost: 1200, set: { sentries: 3, sentryCycle: [M2] } },
      { name: 'Chain Barrel', desc: 'M3 Turrets: damage 3 every 0.12s, 50% defense piercing, more range, last 25s. The Mechanic\'s own damage 1 → 3.', cost: 3800, add: { damage: 2 }, set: { sentryCycle: [M3] } },
      { name: 'Multi-Purpose Weaponry', desc: 'Turrets rotate between M4 Turrets (90% piercing), Detonators (explosive), Plasmators (3x shield damage) and Hunters (100 damage, huge range). Mechanic damage 3 → 8.', cost: 7200,
        add: { damage: 5 }, set: { sentryCycle: [M4, DETONATOR, PLASMATOR, HUNTER] } },
    ],
    bottom: [
      { name: 'Metallic Nails', desc: 'Nail damage 1 → 2 (turrets are unaffected).', cost: 350, add: { damage: 1 } },
      { name: 'Area of Denial', desc: 'Range 16 → 24 (turrets are built farther out too).', cost: 320, set: { range: 24 } },
      { name: 'Inventor', desc: 'Fires every 0.4s. Builds Tesla turrets every 10s (up to 3, last 15s) that hit and stun every zombie in their range for 6 damage every 2s.', cost: 3250,
        set: { cooldown: 0.4, buildEvery: 10, sentries: 3, sentryCycle: [TESLA] } },
      { name: 'Forcefield Generator', desc: 'Damage 2 → 5, fires every 0.3s. Teslas: 26 damage, more range, 30% piercing; Plasmators join them. Forcefield ($1,000, 45s cooldown): towers nearby can\'t be stunned for 20s.', cost: 6500,
        add: { damage: 3 }, set: { cooldown: 0.3, sentryCycle: [TESLA2, PLASMATOR_B] },
        abilities: [{ key: 'forcefield', name: 'Forcefield', desc: 'Towers within 11.5 can\'t be stunned for 20s', cooldown: 45, cost: 1000, radius: 11.5, duration: 20, globalCd: 15 }] },
    ],
    rows: { '2-3': { sentryCycle: [M2, TESLA] } },
    finish: (s) => {
      if (s.sentryCycle) {
        s.sentry = s.sentryCycle[0]; // shown in the panel
        s.buildRange = s.range;
      }
    },
  }),

  // ---------------------------------------------------------------- Surveyor (Ghost)
  // A drone spawner: drones fly over the path from the path closest to it (they can't be
  // stunned or touched), shoot, and leave after their life. maxUnits (on a level): drone cap.
  // radar (Drone Intel): towers within `radius` of the Radar Drone (at the Surveyor until moved)
  // get `boost` more range. noBuff: support towers can't boost it or its drones.
  ...crossTower('ghostSurveyor', {
    name: 'Surveyor',
    altOf: 'ghost',
    form: 'Surveyor',
    shards: 4,
    price: 0,
    cost: 750,
    limit: 4,
    kind: 'spawner',
    noBuff: true,
    throwNear: true,
    spawnEvery: 13,
    blurb: 'An alternate Ghost that never attacks directly: it launches drones that fly over the path, shoot (flyers too), and expire. Drones can\'t be stunned. Top path: a movable Radar Drone that gives nearby towers more range, and Cryo Drones. Bottom path: Bomber Drones and Sentinel Drones.',
    tip: '0-2 is a strong, steady early pick. Its drones can\'t be boosted by a Bugler.',
    base: { name: 'Surveyor', desc: 'Launches a Burst Drone every 13s (up to 3 out).', range: 30, spawnEvery: 13, maxUnits: 3, dLife: 20, dSpeed: 5, dDmg: 1, dBurst: 3, dCd: 2.5, dRange: 10, dModel: 'svBurst' },
    top: [
      { name: 'Surveying Zone', desc: 'Range 30 → 60.', cost: 450, set: { range: 60 } },
      { name: 'Improved Battery', desc: 'Drones last 10s longer and fly twice as fast.', cost: 300, add: { dLife: 10 }, set: { dSpeed: 10 } },
      { name: 'Drone Intel', desc: 'A Radar Drone gives nearby towers +10% range; move it anywhere (15s cooldown). Drones last another 10s, and Burst Drones become M3s with Stronger Drones.', cost: 3150,
        add: { dLife: 10 }, set: { radar: { boost: 0.1, radius: 9 } }, fn: (s) => { if (s.dModel === 'svBurst2') Object.assign(s, { dDmg: 2, dBurst: 7, dCd: 2, dModel: 'svBurst3' }); },
        abilities: [{ key: 'radarMove', name: 'Move Radar Drone', desc: 'Click where the Radar Drone should hover', cooldown: 15, aim: true, radius: 9 }] },
      { name: 'Support Guardian', desc: 'Drone cap 4 → 5 and Cryo Drones that freeze with explosive shots. Burst Drones become M4s (20 DPS), and the Radar Drone gives +20%.', cost: 9750,
        add: { maxUnits: 1 }, set: { radar: { boost: 0.2, radius: 9 }, dDmg: 4, dBurst: 10, dCd: 2, dModel: 'svBurst4',
          unit2: drone('Cryo Drone', 'svCryo', 30, 6, { damage: 10, cooldown: 3, range: 10, radius: 2, stun: 1 }), spawnEvery2: 20 } },
    ],
    bottom: [
      { name: 'More Support', desc: 'Drone cap +1, and drones deploy every 10s.', cost: 450, add: { maxUnits: 1 }, set: { spawnEvery: 10 } },
      { name: 'Stronger Drones', desc: 'Burst Drone M2s: 5-shot bursts every 2s, more range, last 5s longer.', cost: 1650, add: { dLife: 5 }, set: { dBurst: 5, dCd: 2, dRange: 17.5, dModel: 'svBurst2' } },
      { name: 'Drone Warfare', desc: 'Bomber Drones: 3 bombs of 20 splash damage every 3s, lasting 50s. Burst Drones become M3s (7 shots of 2 every 2s).', cost: 6500,
        add: { maxUnits: 1 }, set: { dDmg: 2, dBurst: 7, dCd: 2, dModel: 'svBurst3',
          unit2: drone('Bomber Drone', 'svBomber', 50, 3, { damage: 20, burst: 3, burstGap: 0.3, cooldown: 3, range: 10, radius: 2.5 }), spawnEvery2: 25 } },
      { name: 'Death Swarm', desc: 'Drone cap → 7, drones last 4s+ longer, and Sentinel Drones (8 damage every 0.12s) replace Burst Drones.', cost: 26500,
        add: { dLife: 4 }, set: { maxUnits: 7, dDmg: 8, dBurst: 1, dCd: 0.1167, dModel: 'svSentinel' } },
    ],
    finish: (s) => {
      const name = { svBurst: 'Burst Drone', svBurst2: 'Burst Drone M2', svBurst3: 'Burst Drone M3', svBurst4: 'Burst Drone M4', svSentinel: 'Sentinel Drone' }[s.dModel];
      s.unit = drone(name, s.dModel, s.dLife, s.dSpeed, { damage: s.dDmg, ...(s.dBurst > 1 ? { burst: s.dBurst, burstGap: 0.08 } : {}), cooldown: s.dCd, range: s.dRange });
    },
  }),

  // ---------------------------------------------------------------- Lightbeamer (Plasma Trooper)
  // A beam that pierces a line of zombies (`pass` more behind the target). combine (Avarian
  // Technology): every `hits` of its pellets on one zombie (counted per Lightbeamer) blow up for
  // `damage` within `radius`.
  ...crossTower('plasmaLightbeamer', {
    name: 'Lightbeamer',
    altOf: 'plasma',
    form: 'Lightbeamer',
    shards: 4,
    price: 0,
    cost: 1800,
    limit: 6,
    flying: false,
    laser: true,
    blurb: 'An alternate Plasma Trooper: a beam that pierces through a line of zombies. Top path: a rapid beam that hits up to 17 zombies at once (40 at tier 5), with 100% defense piercing. Bottom path: plasma pellets with flying detection that combine into explosions.',
    tip: 'Line the Top path beam up with a long stretch of path so it hits as many zombies as possible.',
    base: { name: 'Lightbeamer', desc: 'A beam that pierces 3 zombies.', damage: 8, cooldown: 2.5, range: 40, pass: 2 },
    top: [
      { name: 'OSHA Certified', desc: 'Range 40 → 50.', cost: 650, set: { range: 50 } },
      { name: 'Nanosuit', desc: '50% defense piercing.', cost: 600, set: { defPierce: 0.5 } },
      { name: 'Stream of Energy', desc: 'A constant beam: damage 8 → 3, but it fires every 0.2s. Range 50 → 60, pierces 7 zombies and 100% defense piercing.', cost: 4000, add: { damage: -5 }, set: { cooldown: 0.2, range: 60, pass: 6, defPierce: 1 } },
      { name: 'Degradation Device', desc: 'Damage 3 → 9, pierces 13 zombies and fires every 0.1s.', cost: 35000, add: { damage: 6 }, set: { pass: 12, cooldown: 0.1 } },
      { name: 'The Prototype', desc: 'Damage 9 → 50 and pierces 50 zombies. Each Prototype in the match costs 40% more.', cost: 140000, stack: 0.4, add: { damage: 41 }, set: { pass: 49 } },
    ],
    bottom: [
      { name: 'Piercing Beam', desc: 'The beam pierces 6 zombies instead of 3.', cost: 300, set: { pass: 5 } },
      { name: 'Finer Weapon', desc: 'Damage 8 → 11.', cost: 900, add: { damage: 3 } },
      { name: 'Avarian Technology', desc: 'Plasma pellets with flying detection: damage 11 → 1, but a pellet every 0.1s. 40 pellet hits on one zombie combine into a 250-damage explosion.', cost: 7500,
        add: { damage: -10 }, set: { cooldown: 0.1, flying: true, pass: 0, range: 50, combine: { hits: 40, damage: 250, radius: 2 }, laser: false } },
      { name: 'Impact Burst', desc: 'Pellet damage 1 → 2. Explosions after 20 hits instead of 40, for 520 damage instead of 250.', cost: 57500,
        add: { damage: 1 }, set: { combine: { hits: 20, damage: 520, radius: 2 } } },
    ],
    rows: { '2-2': { pass: 6 }, '3-2': { pass: 10 }, '4-2': { pass: 16 }, '5-2': { pass: 39 } },
    finish: (s) => {
      if (!s.pass) delete s.pass;
    },
  }),

  // ---------------------------------------------------------------- Cyberblade (Gladiator)
  // The only melee tower with a single upgrade path (plain levels, no crosspathing). It ignores
  // all armor. hpScale (Prototype Archaic): damage from `min` to `max` by the target's health, at
  // `max` from `at` health up. Its reach isn't halved like other distances: the spec's 7-11 halved
  // would be shorter than the closest a tower can stand to the path (like the Samurai), so it uses
  // the Gladiator's reach scale instead (5.5 → 7.5).
  gladiatorCyberblade: {
    name: 'Cyberblade',
    altOf: 'gladiator',
    form: 'Cyberblade',
    shards: 0,
    price: 0,
    cost: 400,
    limit: 10,
    melee: true,
    flying: false,
    lead: true,
    blurb: 'A free alternate Gladiator with a cyber sword and a single upgrade path. Tiny reach, but it hits hard for the price and ignores all armor. From Lv 3 it hits several zombies per swing, and at Lv 5 it hits harder the more health its target has.',
    tip: 'Put it right on a corner or an intersection so more of the path passes through its reach. It can\'t hit flyers.',
    levels: [
      { name: 'Cyberblade', desc: 'A cyber sword that ignores armor.', damage: 4, cooldown: 0.8, range: 5.5, defPierce: 1 },
      { name: 'Swordsman', desc: 'Damage 4 → 5 and reach 7 → 8.', cost: 150, damage: 5, cooldown: 0.8, range: 6, defPierce: 1 },
      { name: 'Improved Grip', desc: 'Damage 5 → 7, and the sword hits up to 3 zombies per swing.', cost: 400, damage: 7, cooldown: 0.8, range: 6, targets: 3, defPierce: 1 },
      { name: 'Advanced Vision', desc: 'Damage 7 → 12 and reach 8 → 9.', cost: 1100, damage: 12, cooldown: 0.8, range: 6.5, targets: 3, defPierce: 1 },
      { name: 'Prototype Archaic', desc: 'Damage 16-48 by the target\'s health (48 from 1,000 HP up), reach 9 → 11 and 200% defense piercing.', cost: 2200,
        damage: 16, hpScale: { min: 16, max: 48, at: 1000 }, cooldown: 0.8, range: 7.5, targets: 3, defPierce: 2 },
    ],
  },
};
