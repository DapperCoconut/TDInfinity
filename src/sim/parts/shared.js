// Numbers and small helpers the Sim files share: effect colors, sizes and timings, the status
// names (ST_...), tower buffs (computeBuffs), upgrade costs and a few bits of path math.

import { ENEMIES, TOWERS, crossNext, crossStackMult, familyOf, rootType, trackBoost } from '../../config.js';

export const MAX_STEP = 0.05;
// Insane mode enemies with something to do every tick (see insaneAttacks).
// Void mode enemies with something to do every tick (see voidAttacks).
export const VOID_FX = new Set(Object.keys(ENEMIES).filter((k) => ['punch', 'mark', 'hurtSummon', 'orb', 'skyLaser', 'towerDrain', 'drain'].some((f) => ENEMIES[k][f])));
// Void mode (2026-11-09 spec): Guardian, False Void and VOID moves (see voidBoss).
export const VB_FX = new Set(Object.keys(ENEMIES).filter((k) => ENEMIES[k].vb));
// Insane mode (2026-11-09 spec): enemies with abilities Sim.insanePace runs.
export const ORION_FX = new Set(Object.keys(ENEMIES).filter((k) => ['healPulse', 'build', 'taunt', 'backup', 'throwAt'].some((f) => ENEMIES[k][f])));
// Hardcore mode (2026-11-09 spec): enemies with abilities Sim.hcAttacks runs.
export const HC_FX = new Set(Object.keys(ENEMIES).filter((k) => ['pod', 'jam', 'dispense', 'beacon', 'tank', 'relax', 'pair', 'rageAt', 'vb'].some((f) => ENEMIES[k][f])));
export const INSANE_FX = new Set(Object.keys(ENEMIES).filter((k) => ['trail', 'smoke', 'arc', 'emp', 'stab', 'tempo', 'armorSwap', 'lurch', 'timeWave', 'timeBomb', 'sword', 'shift'].some((f) => ENEMIES[k][f])));
export const rand = (a, b) => a + Math.random() * (b - a);
export const r2 = (n) => Math.round(n * 100) / 100;
export const TAU = Math.PI * 2;
export const BOMB_FALL = 0.55; // seconds from drop to impact
export const MISSILE_TIME = 0.45; // seconds from launch to impact
export const BUBBLE_PUSH_CD = 0.25; // Bubble Blower: a zombie can only be pushed back this often
export const STRIKE_TIME = 1.1; // seconds from calling an Airstrike to the bomb landing
export const CONTACT = 2.2; // path distance at which a unit and a zombie touch
const NO_BUFF = Object.freeze({ range: 1, rate: 1, discount: 0, cta: false, dmg: 1, shield: 0, uber: false, recharge: 0, invuln: false, sell: 0, cdCut: 0, dmgAdd: 0, biz: 0, bizTier: 0, costUp: 0, splash: 1, killCash: 1 });
export const PELLET_WIDTH = 0.9; // how close a shotgun pellet's line must pass to a zombie to hit it
export const TRAP_HIT = 1.6; // how close a zombie must walk to a trap to set it off
export const TRAP_FLIGHT = 0.6; // seconds a thrown trap flies before it lands
export const PULSE_WIDTH = 1.2; // how thick a Pulse Trooper's ring is (zombies this close to its edge get hit)
export const SWEEP_WIDTH = 1.5; // how thick a Sweeper laser is
export const FPS_WIDTH = 1.0; // how close a Gatling FPS bullet's line must pass to a zombie to hit it (times its size)
export const FPS_BACK = 3.2; // the FPS camera (where bullets start) sits this far behind the gun
export const FLY_HEIGHT = 5; // how high Flyers soar above the path (the views draw them there too)
export const FPS_REACH = 400; // FPS bullets fly across the whole map
export const AIM_TIMEOUT = 3; // FPS Mode switches off after this long without aim updates (player left)
export const SEE_ALL = Object.freeze({ hidden: true, flying: true, lead: true }); // airstrikes
export const GROUND_BLAST = Object.freeze({ hidden: true, flying: false, lead: true }); // landmines
export const WRECK_BLAST = Object.freeze({ hidden: false, flying: false, lead: true }); // exploding vehicles
/** Cryo Ranger freeze extras a blast carries (see iceFreeze). */
export const iceFx = (s) => ({ freezeBoss: s.freezeBoss, frostbite: s.frostbite, frozenVuln: s.frozenVuln, ignoreIceResist: s.ignoreIceResist });

// Enemy status bits, sent to clients so they can show ice, stun stars and fire.
export const ST_FROZEN = 1;
export const ST_STUNNED = 2;
export const ST_BURNING = 4;
export const ST_DANCE = 8;
export const ST_SLIMED = 16;
export const ST_CHILLED = 32;
export const ST_HACKED = 64; // hit by a Hacker: slowed, Wire Fraud, comes back as a hologram
export const ST_GASSED = 128; // breathing Toxicnator gas
export const ST_CONFUSED = 256; // Jester / Nightshade / Spotlight confusion: walking backwards
export const ST_FLOAT = 512; // Bubble Blower: floating in a bubble, can't move
export const ST_AIRBORNE = 1024; // Eradicator: flying for a while (fly)
export const ST_SHROOM = 2048; // covered in Pestilence mushrooms (more health, heals)
export const ST_ENRAGED = 4096; // Eradicator final phase: sprinting
export const ST_SMOKED = 8192; // Insane mode: hidden inside a Smoker's smoke
export const ST_ARMORED = 16384; // Time Titan: its armor is up
export const ST_HASTED = 32768; // sped up by a trail, an EMP, a Warper or towers near the Beholder
export const ST_GLITCHED = 65536; // a Glitch went through it: laser resistance for a while
export const ST_VOIDAURA = 131072; // inside VOID's aura: hidden and heavily armored
export const ST_CHARGING = 262144; // VOID (Spirit): charging up to fly off, hidden
export const ST_SHOCKED = 524288; // Byte: shocked (slowed by electricity)
export const ST_BIOHAZARD = 1048576; // Dumpster Child Biohazard
export const ST_CLOAKED = 2097152; // Hard mode: turned hidden mid-game (wave mod, Fallen Summoner)
export const ST_VOIDARMOR = 4194304; // Void mode: wearing void armor (shield, armor, slower, tendrils)

export const BUILD_SPOTS = 24; // random spots an Engineer tries when looking for room for a sentry
export const RANG_HIT = 1.8; // how close a boomerang or knife must pass to hit a zombie

/** Extra firerate a level's Call to Arms gives while it is active. */
const ctaBoost = (s) => s.abilities?.find((a) => a.key === 'cta')?.boost ?? 0;
/** Extra damage a level's Call to Battle (Gold Commander) gives while it is active. */
const ctaDmg = (s) => s.abilities?.find((a) => a.key === 'cta')?.dmg ?? 0;
/** Golden perk towers (and the Bottom paths of golden towers): what a Gold Commander's goldRate boosts. */
const isGolden = (type) => !!(TOWERS[type].goldOf || TOWERS[TOWERS[type].branchOf]?.goldOf);
const rageOf = (s) => s.abilities?.find((a) => a.key === 'rage') ?? null; // John Rage Mode
/** Medigun Medic: its Uber or Kritz ability (whichever its level has), or null. */
export const mediCharge = (s) => s.abilities?.find((a) => a.key === 'uberBeam' || a.key === 'kritz') ?? null;
/** Can a Medigun Medic heal tower `t`? (Not income towers, `noHeal` or `packHealOnly` ones.) */
export const beamHealable = (t) => {
  const def = TOWERS[t.type];
  return def.kind !== 'income' && !def.noHeal && !def.packHealOnly && !t.holo;
};
/** Can tower `t` be stunned? (`stunImmune` on the tower, or on its current level.) */
export const stunImmune = (t) => t.immuneT > 0 || !!(TOWERS[t.type].levels[t.level].stunImmune ?? TOWERS[t.type].stunImmune); // immuneT: Spectre Defense drone, Eldritch Rift
/** A level's deadzone (it can't shoot zombies closer than this), or 0. */
export const minRangeOf = (def, s) => s.minRange ?? def.minRange ?? 0;

/**
 * Which towers each Medic shields: Map towerId -> the Medic tower shielding it. Each Medic picks
 * the most valuable towers (by money spent) inside its aura that no other Medic has taken yet.
 * Medics never shield other support towers or income towers. Shared with the client (medi beams).
 */
const shieldable = (t) => {
  const kind = TOWERS[t.type].kind;
  return !kind || kind === 'spawner';
};
export function medicShields(towers) {
  const list = [...towers];
  const out = new Map();
  const medics = list.filter((o) => TOWERS[o.type].levels[o.level].shields).sort((a, b) => a.id - b.id);
  for (const m of medics) {
    const s = TOWERS[m.type].levels[m.level];
    const r2max = s.aura * s.aura;
    const picks = list
      .filter((t) => !out.has(t.id) && shieldable(t) && (t.x - m.x) ** 2 + (t.z - m.z) ** 2 <= r2max)
      .sort((a, b) => b.spent - a.spent || a.id - b.id)
      .slice(0, s.shields);
    for (const t of picks) out.set(t.id, m);
  }
  return out;
}

/**
 * Boosts every tower gets from Commanders, DJs, DJ Booths and Medics nearby (any owner's).
 * Returns Map id -> { range, rate, discount, cta, dmg, shield, uber, recharge }. Towers never
 * boost their own type, and boosts of one type don't stack: the strongest Commander and the
 * strongest DJ count. A Medic shield adds its own firerate on top (and Ubercharge damage).
 * DJ Booth tracks: the range and damage of the strongest booth multiply on top; its discount
 * counts like a DJ's (the biggest discount wins). EDJ range boosts count like Booth range, and
 * its Encore adds to its boosts while on. Medigun Medics: Kritz boosts their patient's damage;
 * Uber makes the Medic and its patient invulnerable (`invuln`, which also blocks stuns).
 * Shared by the sim and the client (the client shows boosted range and discounted prices).
 */
export function computeBuffs(towers) {
  const list = [...towers];
  const out = new Map();
  // (VOID's corrupted towers boost nobody.)
  const sources = list.filter((o) => { if (o.corrupt) return false; const s = TOWERS[o.type].levels[o.level]; return s.aura || (s.radio && o.radioT > 0) || (o.active > 0 && rageOf(s)) || s.kin || s.radar || s.globalCdCut || s.bizDisc; });
  // (Spectre drones boost damage in Support mode; Glowups boost firerate less the farther away a tower is.)
  if (!sources.length) return out;
  const shields = medicShields(list);
  const family = (o) => familyOf(o.type); // a tower, its alternate forms, upgrade paths and golden versions
  // Businessman Stimulus Booster: every tower's ability cooldowns are shorter, 5% per one (up to 30%).
  let globalCut = 0;
  for (const o of sources) globalCut += TOWERS[o.type].levels[o.level].globalCdCut || 0;
  globalCut = Math.min(0.3, globalCut);
  for (const t of list) {
    let range = 0;
    let rate = 0;
    let cta = 0;
    let music = 0;
    let discount = 0;
    let boothRange = 0;
    let boothDmg = 0;
    let merc = 0;
    let radio = 0;
    let rage = 0;
    let kritz = 0;
    let invuln = false;
    let sell = 0;
    let cdCut = globalCut;
    let dmgAdd = 0; // Bugler Snare Drums: flat damage
    // Slinger Faction Leader / Cysian Overclock: boosts from other Slingers stack up to a cap.
    let kinRate = 0, kinDmg = 0, kinRange = 0, kinRateCap = 0, kinDmgCap = 0, kinRangeCap = 0, kinN = 0, kinMin = 0;
    let costUp = 0; // Specter: towers in its aura pay more for upgrades
    let dmgLoss = 0; // Discount Dog: towers it discounts deal a little less damage
    let rateLoss = 0; // Balloon Pal: towers it boosts attack a little slower
    let splash = 0; // Balloon Pal: bigger splash
    let killCash = 1; // Gold Commander Gold Digging: damage pays more (Versus: kills)
    let goldRate = 0; // Gold Commander: golden towers attack faster
    let ctaD = 0; // Gold Commander Call to Battle: more damage
    let biz = 0, bizCap = 0, bizTier = 0; // Businessman Discount Seeker: stacking upgrade discounts
    for (const o of sources) {
      const s = TOWERS[o.type].levels[o.level];
      if (s.kin && o !== t && rootType(o.type) === rootType(t.type) && (t.x - o.x) ** 2 + (t.z - o.z) ** 2 <= s.range * s.range) {
        const k = s.kin;
        kinRate += k.rate || 0;
        kinDmg += k.dmg || 0;
        kinRange += k.range || 0;
        kinRateCap = Math.max(kinRateCap, k.rateCap || 0);
        kinDmgCap = Math.max(kinDmgCap, k.dmgCap || 0);
        kinRangeCap = Math.max(kinRangeCap, k.rangeCap || 0);
        kinN++;
        kinMin = Math.max(kinMin, k.min || 0); // Bunny: the group boost needs this many others nearby
      }
      // Medigun Medic Uber / Kritz (its patient may be another Medic, so before the family check).
      const charge = o.active > 0 && s.beamHeal ? mediCharge(s) : null;
      if (charge?.key === 'uberBeam' && (o === t || o.lock === t.id)) invuln = true;
      if (charge?.key === 'kritz' && o.lock === t.id) kritz = Math.max(kritz, charge.boost);
      if (family(o) === family(t)) continue;
      const d2 = (t.x - o.x) ** 2 + (t.z - o.z) ** 2;
      // Ranger Intelligence Radio: a range boost for a while after each wave starts.
      if (s.radio && o.radioT > 0 && d2 <= s.radio.radius ** 2) radio = Math.max(radio, s.radio.boost);
      // John Rage Mode: a damage boost while it's on.
      const ra = o.active > 0 ? rageOf(s) : null;
      if (ra && d2 <= ra.radius ** 2) rage = Math.max(rage, ra.boost);
      // Surveyor Radar Drone: more range near the drone (it hovers over the Surveyor until moved).
      if (s.radar && (t.x - (o.rx ?? o.x)) ** 2 + (t.z - (o.rz ?? o.z)) ** 2 <= s.radar.radius ** 2) range = Math.max(range, s.radar.boost);
      if (s.bizDisc && d2 <= s.range * s.range) {
        biz += s.bizDisc.pct;
        bizCap = Math.max(bizCap, s.bizDisc.cap);
        bizTier = Math.max(bizTier, s.bizDisc.tier);
      }
      if (!s.aura || s.shields) continue; // Medics boost through their shields (below), not their aura
      if (d2 > s.aura * s.aura) continue;
      dmgAdd = Math.max(dmgAdd, s.dmgAdd || 0);
      range = Math.max(range, s.rangeBoost || 0);
      rate = Math.max(rate, s.falloff ? (s.rateBoost || 0) * (1 - s.falloff * Math.sqrt(d2) / s.aura) : s.rateBoost || 0);
      if (s.drone?.support && droneMode(o, s) === 'support') merc = Math.max(merc, s.drone.support);
      if (o.active > 0) cta = Math.max(cta, ctaBoost(s));
      if (o.active > 0) ctaD = Math.max(ctaD, ctaDmg(s));
      killCash = Math.max(killCash, s.killCash || 1);
      if (s.goldRate && isGolden(t.type)) goldRate = Math.max(goldRate, s.goldRate);
      const encore = o.active > 0 ? s.abilities?.find((a) => a.key === 'encore') : null; // EDJ
      music = Math.max(music, (s.musicBoost || 0) + (encore?.boost || 0));
      boothRange = Math.max(boothRange, (s.musicRange || 0) + (encore?.range || 0));
      discount = Math.max(discount, s.discount || 0);
      sell = Math.max(sell, s.sellback || 0);
      cdCut = Math.max(cdCut, s.cdCut || 0);
      merc = Math.max(merc, s.dmgBoost || 0);
      costUp = Math.max(costUp, s.costUp || 0);
      dmgLoss = Math.max(dmgLoss, s.dmgLoss || 0);
      rateLoss = Math.max(rateLoss, s.rateLoss || 0);
      splash = Math.max(splash, s.splashBoost || 0);
      if (s.tracks) {
        boothRange = Math.max(boothRange, trackBoost(s, o.track, 'range'));
        boothDmg = Math.max(boothDmg, trackBoost(s, o.track, 'dmg'));
        discount = Math.max(discount, trackBoost(s, o.track, 'discount'));
      }
    }
    const m = shields.get(t.id);
    const ms = m ? TOWERS[m.type].levels[m.level] : null;
    const uber = !!(ms && m.active > 0);
    const uberBoost = uber ? (ms.abilities?.find((a) => a.key === 'uber')?.boost ?? 0) : 0;
    biz = Math.min(biz, bizCap);
    if (kinN < kinMin) kinRate = kinDmg = kinRange = 0;
    kinRate = Math.min(kinRate, kinRateCap);
    kinDmg = Math.min(kinDmg, kinDmgCap);
    kinRange = Math.min(kinRange, kinRangeCap);
    if (TOWERS[t.type].noBuff) {
      // Field Barracks: support towers can't boost it or its units (upgrade discounts still count).
      if (discount || sell || invuln || biz || cdCut || costUp) out.set(t.id, { ...NO_BUFF, discount, sell, invuln, biz, bizTier, cdCut, costUp });
      continue;
    }
    if (range || rate || cta || music || discount || boothRange || boothDmg || merc || radio || rage || m || kritz || invuln || sell || cdCut || dmgAdd || kinRate || kinDmg || kinRange || biz || costUp || dmgLoss || rateLoss || splash || killCash > 1 || goldRate || ctaD) {
      out.set(t.id, {
        range: TOWERS[t.type].noRangeBuff ? 1 : (1 + range) * (1 + boothRange) * (1 + radio) * (1 + kinRange), // Slammer: range can't be boosted
        rate: (1 + rate + cta) * (1 + music) * (1 + (ms?.shieldRate ?? 0)) * (1 + kinRate) * (1 - rateLoss) * (1 + goldRate),
        discount,
        cta: cta > 0,
        dmg: TOWERS[t.type].noDmgBuff ? 1 : (1 + uberBoost) * (1 + boothDmg) * (1 + merc) * (1 + rage) * (1 + kritz) * (1 - dmgLoss) * (1 + ctaD), // Refractor: no damage boosts
        shield: m ? m.id : 0,
        uber,
        recharge: ms?.recharge ?? 0,
        invuln,
        sell,
        cdCut,
        dmgAdd: TOWERS[t.type].noDmgBuff ? 0 : dmgAdd + kinDmg,
        biz,
        bizTier,
        costUp,
        splash: TOWERS[t.type].noRangeBuff ? 1 : 1 + splash,
        killCash,
      });
    }
  }
  return out;
}

/** Boosts for tower `id` from a computeBuffs() map (never undefined). */
export const buffOf = (buffs, id) => buffs.get(id) ?? NO_BUFF;

/**
 * What upgrading to level `next` costs, after any DJ discount (or a Businessman discount, which
 * only covers upgrades up to tier `bizTier`; levels without a `tier` count as covered).
 */
export const upgradeCost = (next, buff) => {
  const biz = buff?.biz && (next.tier ?? 0) <= buff.bizTier ? buff.biz : 0;
  return Math.round(next.cost * (1 - Math.max(buff?.discount || 0, biz)) * (1 + (buff?.costUp || 0)));
};

/** Chaos Jester: a level with `costMax` costs a random amount between `cost` and `costMax` (rolled per tower, `t.costRoll` 0..1). */
const rolledLevel = (next, t) => (next?.costMax ? { ...next, cost: Math.round(next.cost + (next.costMax - next.cost) * (t.costRoll ?? 0.5)) } : next);

/**
 * What tower `t` can upgrade to next on `path` ('top' / 'bottom'), and the cost: { type, next,
 * cost } or null. Crosspath towers (see crossNext); towers with paths fork into their `branch` type.
 * `towers` is every tower in the match (for crosspath `stack` prices), `buffs` from computeBuffs().
 */
export function nextUpgrade(t, path, towers, buffs) {
  const def = TOWERS[t.type];
  const buff = buffOf(buffs, t.id);
  if (def.cross) {
    const nx = crossNext(t.type, path);
    if (!nx) return null;
    return { type: nx.type, next: nx.next, cost: Math.round(upgradeCost(nx.next, buff) * crossStackMult(towers, t, nx)) };
  }
  const branch = path === 'bottom' && def.branch && t.level + 1 === def.branchAt;
  if (path === 'bottom' && !branch) return null;
  const type = branch ? def.branch : t.type;
  const next = rolledLevel(TOWERS[type].levels[t.level + 1], t);
  return next ? { type, next, cost: upgradeCost(next, buff) } : null;
}

/**
 * Lv 3+ Aviators share hidden detection with every tower inside their flight ring; other `spy`
 * towers (Golden Scout Lv 4+) share it with every tower inside their range.
 */
export function spyCircles(towers) {
  const out = [];
  for (const o of towers) {
    const def = TOWERS[o.type];
    const s = def.levels[o.level];
    if (!s.spy) continue;
    const r = def.orbit ?? s.range;
    out.push({ x: o.x, z: o.z, r2: r * r });
  }
  return out;
}

/** Does tower `t` borrow hidden detection from one of the `circles` (and not have its own)? */
export function borrowsHidden(t, circles) {
  return !TOWERS[t.type].levels[t.level].hidden && circles.some((c) => (t.x - c.x) ** 2 + (t.z - c.z) ** 2 <= c.r2);
}

/** An Aviator's flight ring radius (Stormwing Expanded Scope: `scope` times as big). */
export const orbitOf = (t) => {
  const def = TOWERS[t.type];
  return (def.levels[t.level].orbit ?? def.orbit) * (t.choice?.[0] === 'wide' ? def.levels[t.level].scope ?? 1 : 1); // Beebo: per-level circle
};

/**
 * Stats that depend on a tower's mode (tower field `choice`): Submerge's Submerged mode
 * (`sub` fields replace the level's), and the Spectre's Offense drone (`drone.offenseDmg`).
 */
export function modeStats(s, t) {
  if (s.sub && t.choice?.[0] === 'sub') return { ...s, ...s.sub };
  if (s.drone?.offenseDmg && droneMode(t, s) === 'offense') return { ...s, damage: s.damage * s.drone.offenseDmg };
  return s;
}

/** Spectre: which drone mode it's in ('offense', 'defense' or 'support'; the first it has unlocked by default). */
export const droneMode = (t, s) => {
  const modes = droneModes(s);
  return modes.includes(t.choice?.[0]) ? t.choice[0] : modes[0];
};
export const droneModes = (s) => ['offense', 'defense', 'support'].filter((k) => s.drone?.[k]);

/** Where an Aviator's plane is (flight ring around the tower at angle t.ang). */
export function planePos(t, out = {}) {
  const R = orbitOf(t);
  out.x = t.x + Math.cos(t.ang) * R;
  out.z = t.z + Math.sin(t.ang) * R;
  return out;
}

/** Ability cooldowns for snapshots (rounded, empty for most towers). */
export function cdSnap(cd) {
  const out = {};
  for (const k in cd) out[k] = Math.round(cd[k] * 10) / 10;
  return out;
}

/** Boomerang loop: an oval from the thrower out to (tx, tz) and back, `d` long and 0.7 * d wide. */
const RANG_WIDTH = 0.35; // half-width of the oval, as a fraction of its length
export function rangTime(d, speed) {
  const a = d / 2;
  const b = d * RANG_WIDTH;
  const perim = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))); // Ramanujan
  return perim / speed;
}

/**
 * Where a blade is at fraction `f` (0..1) of its flight. Loops (boomerangs) go out along one
 * side of the oval and come back along the other; straight blades (knives) fly in a line.
 * Shared with the client so the boomerang drawn on screen follows the same path.
 */
export function bladePos(b, f, out) {
  const dx = b.tx - b.ox;
  const dz = b.tz - b.oz;
  if (!b.loop) {
    out.x = b.ox + dx * f;
    out.z = b.oz + dz * f;
    return out;
  }
  const th = f * TAU;
  const u = (1 - Math.cos(th)) / 2; // 0 at the thrower, 1 at the far end
  const w = Math.sin(th) * RANG_WIDTH * (b.side ?? 1);
  out.x = b.ox + dx * u - dz * w;
  out.z = b.oz + dz * u + dx * w;
  return out;
}
