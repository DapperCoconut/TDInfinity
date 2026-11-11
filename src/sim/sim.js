// Authoritative game simulation. Pure logic: no three.js, no DOM.
// Runs in the browser for solo play and on the server (one per room) for multiplayer.
import { PERKS, WAVES, SPEEDS, BOSS_KNOCK, arrowModes, damageKind, unitGunKind, DIFFICULTIES, ENEMIES, KNOCK_STUDS, GAME, PLAYER_COLORS, TARGET_MODES, TOWERS, VERSUS, canHit, difficulty, detection, facesCone, spawnExtras, towerLimit, nextTrack, cloneCost, familyOf, rootType, towerCost, towerMaxHp, trackBoost, timedAbility, unitDetection, waveGroups, pickOptions, choiceOptions, choicesOf, crossNext, crossStackMult, abilityCost } from '../config.js';
import { angleDiff, lerpAngle } from '../utils.js';
import { canPlace, heightAt, laneOf, laneOz, levelAt, mapKey, placeFail, setMap } from './map.js';
import { pickableMap } from './maps.js';
import { BOUNDS, PATH_WIDTH, path, setTimeWorld } from './path.js';

const MAX_STEP = 0.05;
// Insane mode enemies with something to do every tick (see insaneAttacks).
// Void mode enemies with something to do every tick (see voidAttacks).
const VOID_FX = new Set(Object.keys(ENEMIES).filter((k) => ['punch', 'mark', 'hurtSummon', 'orb', 'skyLaser', 'towerDrain', 'drain'].some((f) => ENEMIES[k][f])));
// Void mode (2026-11-09 spec): Guardian, False Void and VOID moves (see voidBoss).
const VB_FX = new Set(Object.keys(ENEMIES).filter((k) => ENEMIES[k].vb));
// Insane mode (2026-11-09 spec): enemies with abilities Sim.insanePace runs.
const ORION_FX = new Set(Object.keys(ENEMIES).filter((k) => ['healPulse', 'build', 'taunt', 'backup', 'throwAt'].some((f) => ENEMIES[k][f])));
// Hardcore mode (2026-11-09 spec): enemies with abilities Sim.hcAttacks runs.
const HC_FX = new Set(Object.keys(ENEMIES).filter((k) => ['pod', 'jam', 'dispense', 'beacon', 'tank', 'relax', 'pair', 'rageAt', 'vb'].some((f) => ENEMIES[k][f])));
const INSANE_FX = new Set(Object.keys(ENEMIES).filter((k) => ['trail', 'smoke', 'arc', 'emp', 'stab', 'tempo', 'armorSwap', 'lurch', 'timeWave', 'timeBomb', 'sword', 'shift'].some((f) => ENEMIES[k][f])));
const rand = (a, b) => a + Math.random() * (b - a);
const r2 = (n) => Math.round(n * 100) / 100;
const TAU = Math.PI * 2;
const BOMB_FALL = 0.55; // seconds from drop to impact
const MISSILE_TIME = 0.45; // seconds from launch to impact
const BUBBLE_PUSH_CD = 0.25; // Bubble Blower: a zombie can only be pushed back this often
const STRIKE_TIME = 1.1; // seconds from calling an Airstrike to the bomb landing
const CONTACT = 2.2; // path distance at which a unit and a zombie touch
const NO_BUFF = Object.freeze({ range: 1, rate: 1, discount: 0, cta: false, dmg: 1, shield: 0, uber: false, recharge: 0, invuln: false, sell: 0, cdCut: 0, dmgAdd: 0, biz: 0, bizTier: 0, costUp: 0, splash: 1, killCash: 1 });
const PELLET_WIDTH = 0.9; // how close a shotgun pellet's line must pass to a zombie to hit it
const TRAP_HIT = 1.6; // how close a zombie must walk to a trap to set it off
const TRAP_FLIGHT = 0.6; // seconds a thrown trap flies before it lands
const PULSE_WIDTH = 1.2; // how thick a Pulse Trooper's ring is (zombies this close to its edge get hit)
const SWEEP_WIDTH = 1.5; // how thick a Sweeper laser is
const FPS_WIDTH = 1.0; // how close a Gatling FPS bullet's line must pass to a zombie to hit it (times its size)
export const FPS_BACK = 3.2; // the FPS camera (where bullets start) sits this far behind the gun
export const FLY_HEIGHT = 5; // how high Flyers soar above the path (the views draw them there too)
const FPS_REACH = 400; // FPS bullets fly across the whole map
const AIM_TIMEOUT = 3; // FPS Mode switches off after this long without aim updates (player left)
const SEE_ALL = Object.freeze({ hidden: true, flying: true, lead: true }); // airstrikes
const GROUND_BLAST = Object.freeze({ hidden: true, flying: false, lead: true }); // landmines
const WRECK_BLAST = Object.freeze({ hidden: false, flying: false, lead: true }); // exploding vehicles
/** Cryo Ranger freeze extras a blast carries (see iceFreeze). */
const iceFx = (s) => ({ freezeBoss: s.freezeBoss, frostbite: s.frostbite, frozenVuln: s.frozenVuln, ignoreIceResist: s.ignoreIceResist });

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

const BUILD_SPOTS = 24; // random spots an Engineer tries when looking for room for a sentry
const RANG_HIT = 1.8; // how close a boomerang or knife must pass to hit a zombie

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
const stunImmune = (t) => t.immuneT > 0 || !!(TOWERS[t.type].levels[t.level].stunImmune ?? TOWERS[t.type].stunImmune); // immuneT: Spectre Defense drone, Eldritch Rift
/** A level's deadzone (it can't shoot zombies closer than this), or 0. */
const minRangeOf = (def, s) => s.minRange ?? def.minRange ?? 0;

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
function cdSnap(cd) {
  const out = {};
  for (const k in cd) out[k] = Math.round(cd[k] * 10) / 10;
  return out;
}

/** Boomerang loop: an oval from the thrower out to (tx, tz) and back, `d` long and 0.7 * d wide. */
const RANG_WIDTH = 0.35; // half-width of the oval, as a fraction of its length
function rangTime(d, speed) {
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

export class Sim {
  /**
   * @param {{id: string, name: string, color?: number, loadout?: string[], evo?: object}[]} players  (no loadout = any tower;
   *   evo: evolution level of each evolved tower they own, which gates its upgrades; none = no gate)
   * @param {{vs?: object, lane?: number, idBase?: number}} opts  Versus: the VersusSim running this map,
   *   which lane it is, and where its ids start (so ids are unique across every lane).
   */
  constructor(players, opts = {}) {
    this.vs = opts.vs ?? null;
    // Difficulty: which scripted waves this game plays (Versus always plays the zombie waves).
    this.mode = this.vs ? 'zombies' : DIFFICULTIES[opts.mode] ? opts.mode : 'easy';
    // Versus lanes: the VersusSim already picked the map. Event modes always play their own map.
    if (!this.vs) setMap(difficulty(this.mode).map ?? pickableMap(opts.map), true); // an event plays its own map, and only an event does
    this.map = mapKey;
    this.waves = this.vs ? WAVES : difficulty(this.mode).waves;
    this.cashMult = this.vs ? 1 : difficulty(this.mode).cash; // harder modes pay more in-game cash
    const dm = this.vs ? {} : difficulty(this.mode);
    // Cash for damage (see GAME.dmgCash): every point of health damage pays every player this
    // much. 0 (Versus): enemies pay their `reward` when they die instead.
    this.dmgCash = this.vs ? 0 : dm.dmgCash ?? GAME.dmgCash;
    this.cashAcc = 0; // damage cash not paid out yet (it pays whole dollars)
    // Halloween (`pot`): the mode's cash numbers are a full server's, shared between whoever is
    // playing: with a pot of 4, a solo player gets 4x the starting cash and wave bonus and all of
    // the damage cash, and four players get the listed numbers and a quarter of the damage cash each.
    this.potShare = dm.pot ? dm.pot / Math.max(1, players.length) : 1;
    this.dmgShare = dm.pot ? 1 / Math.max(1, players.length) : 0; // 0: not a pot mode (see payDamage)
    this.flatHp = !!dm.flatHp; // Medium: enemy health doesn't grow per wave
    this.timers = dm.timers ?? null; // Medium: waves that start the next one after a while anyway
    this.maxBaseHp = dm.baseHp ?? GAME.baseHp;
    this.mpHp = dm.mpHp ?? null; // Hard: enemy health bonus per number of extra players
    this.mpPerEnemy = !!dm.mpPerEnemy; // Expert: each enemy has its own multiplayer health (mpTop / mpPow)
    this.voidArmor = dm.voidArmor ?? null; // Void mode: the void armor mutation (see armorUp)
    this.bossSeen = new Set(); // Hard: `bossFirst` enemies already spawned this game
    this.goos = []; // Hard: Necrotic Skeleton goo puddles that heal enemies: { x, z, r, left, heal, every, t }
    // Medium sets its own starting cash, plus a group bonus when playing with others.
    const startCash = Math.round((dm.startCash != null ? dm.startCash + (players.length > 1 ? dm.groupBonus ?? 0 : 0) : Math.round(GAME.startCash * this.cashMult)) * this.potShare);
    this.lane = opts.lane ?? 0;
    this.players = new Map();
    players.forEach((p, i) =>
      this.players.set(p.id, { id: p.id, name: p.name, color: p.color ?? PLAYER_COLORS[i % PLAYER_COLORS.length], cash: startCash, loadout: p.loadout ?? null, evo: p.evo ?? null }),
    );
    this.startingPlayers = Math.max(1, players.length);
    this.towers = new Map();
    this.enemies = new Map();
    this.nextId = opts.idBase ?? 1;
    this.baseHp = this.maxBaseHp;
    this.speed = 1;
    this.over = 0; // 0 = playing, 1 = victory, -1 = defeat
    this.wave = { state: 'intermission', index: 0, countdown: dm.firstIntermission ?? GAME.firstIntermission, t: 0, left: 0, votes: 0, total: this.waves.length };
    this.queue = [];
    this.shells = []; // bombs and missiles in flight
    this.flights = []; // single-target projectiles in flight (slime globs, harpoons, thrown grenades...)
    this.blades = []; // boomerangs and thrown knives in flight (they pierce, so they're tracked over time)
    this.rings = []; // Pulse Trooper pulses growing out from their tower
    this.sweeps = []; // Sweeper lasers spinning around their tower
    this.spies = []; // Aviator hidden-detection rings, refreshed every tick
    this.buffs = new Map(); // Commander / DJ boosts, refreshed every tick
    this.cashBacks = new Map(); // player id -> Oil Derrick Cash Back share, refreshed every tick
    this.units = new Map(); // Jeeps, Tanks, Soldier squads... driving from the castle toward the entrance
    this.traps = new Map(); // Trapper spikes, landmines and bear traps lying on the path
    this.skipVotes = new Set();
    this.holos = []; // hacked zombies that died this tick, to come back as holograms
    this.fraudAcc = 0; // Wire Fraud cash not paid out yet (it pays whole dollars)
    this.axes = []; // Molten Warlord axes (and Hard mode fireballs, boulders, missiles...) in flight
    this.puddles = []; // Lava Golem magma puddles: { x, z, r, dps, left }
    this.reborn = []; // enemies to spawn at the end of the tick (cage monsters, boss phase 2, summons)
    this.zones = []; // Insane mode trails and smoke on the path: { kind: 'trail' | 'smoke', x, z, r, left, speed }
    this.bombs = []; // Beholder time bombs stuck to towers: { id, tower, x, z, left, dmg, r }
    this.timeWorld = false; // the Beholder pulled everyone into the time dimension
    this.marks = []; // VOID's purple X marks on towers: { id, tower, x, z, left }
    this.orbs = []; // VOID's magic missiles flying down the path: { id, dist, x, z, speed, dmg }
    this.lasers = []; // VOID's sky lasers charging up: { left }
    this.finaleT = 0; // VOID is dead: seconds of the finale before the game is won
    setTimeWorld(false);
    this.events = []; // drained by whoever runs the sim
    this.tmp = {};
  }

  removePlayer(id) {
    this.players.delete(id);
    this.skipVotes.delete(id);
    this.wave.votes = this.skipVotes.size;
    this.checkSkip();
  }

  // ---------------------------------------------------------------- stepping

  step(realDt) {
    let dt = realDt * this.speed;
    while (dt > 1e-6 && !this.over) {
      const h = Math.min(dt, MAX_STEP);
      this.tick(h);
      dt -= h;
    }
  }

  tick(dt) {
    const w = this.wave;
    if (this.vs) {
      // Versus: the VersusSim starts waves on its shared clock; the queue just keeps running.
      if (w.state === 'wave') {
        w.t += dt;
        while (this.queue.length && this.queue[0].t <= w.t) this.spawnQueued(this.queue.shift());
        w.left = this.queue.length;
      }
    } else if (w.state === 'intermission') {
      w.countdown -= dt;
      if (w.countdown <= 0) this.startWave();
    } else if (w.state === 'wave') {
      w.t += dt;
      while (this.queue.length && this.queue[0].t <= w.t) this.spawnQueued(this.queue.shift());
      w.left = this.queue.length;
      // Medium wave timers: when it runs out, the next wave comes whether this one is cleared or not.
      const timer = this.timers?.[w.index];
      w.countdown = timer && w.index < this.waves.length - 1 ? Math.max(0, timer - w.t) : 0;
      if (timer && w.t >= timer && this.canSkipWave) {
        this.events.push({ k: 'waveTimer', i: w.index });
        this.skipWave();
      }
    }

    // Overlord Amplifiers: the speed and healing each summoner gets from its amplifiers (they stack).
    let amps = null;
    for (const o of this.enemies.values()) {
      const amp = ENEMIES[o.type].amp;
      if (!amp || !o.owner) continue;
      const sum = (amps ??= new Map()).get(o.owner) ?? { speed: 0, heal: 0 };
      sum.speed += amp.speed;
      sum.heal += amp.heal;
      amps.set(o.owner, sum);
    }
    if (this.finaleT > 0) this.finaleT = Math.max(0, this.finaleT - dt);
    // VOID's aura: enemies near him are hidden and heavily armored.
    let voidAuras = null;
    for (const o of this.enemies.values()) if (ENEMIES[o.type].aura) (voidAuras ??= []).push(o);
    // Insane mode: Warpers speed up the enemies around them, Mechanics armor them up.
    let auras = null;
    for (const o of this.enemies.values()) {
      const d = ENEMIES[o.type];
      if (d.hasteAura || d.gear) (auras ??= []).push(o);
    }
    // Time Dilators: time bubbles that speed up or slow down towers and zombies inside them.
    const dils = this.timeBubbles(dt);
    for (const e of this.enemies.values()) {
      // Status effects: frozen/stunned zombies stand still, burning ones are slowed.
      e.stop = Math.max(0, e.stop - dt);
      if (!e.stop) {
        e.stopKind = 0;
        e.iceVuln = 0;
        e.cubeHp = 0; // Glacier: the ice cube has melted
      }
      e.burn = Math.max(0, e.burn - dt);
      e.slimeT = Math.max(0, e.slimeT - dt);
      if (!e.slimeT) e.slime = 0;
      e.chillT = Math.max(0, e.chillT - dt);
      if (!e.chillT) e.chill = 0;
      e.beatT = Math.max(0, e.beatT - dt);
      if (!e.beatT) e.beatSlow = 0;
      e.vulnT = Math.max(0, e.vulnT - dt);
      if (!e.vulnT) e.vuln = 0;
      if (e.neuroT) e.neuroT = Math.max(0, e.neuroT - dt);
      if (e.zapT) e.zapT = Math.max(0, e.zapT - dt);
      if (e.injuredT && !(e.injuredT = Math.max(0, e.injuredT - dt))) e.injured = 0;
      if (e.harpoons) {
        let sum = 0;
        for (let i = e.harpoons.length - 1; i >= 0; i--) {
          const h = e.harpoons[i];
          if ((h.t -= dt) <= 0) e.harpoons.splice(i, 1);
          else sum += h.slow;
        }
        e.harpoonSlow = Math.min(e.harpoonMax, sum);
        if (!e.harpoons.length) e.harpoons = null;
      }
      if (e.revealT) e.revealT = Math.max(0, e.revealT - dt); // Flare Gun
      if (e.shockT) e.shockT = Math.max(0, e.shockT - dt); // Byte
      if (e.confT) e.confT = Math.max(0, e.confT - dt); // confused: walking backwards
      if (e.confCd) e.confCd = Math.max(0, e.confCd - dt); // can't be confused again yet
      if (e.thornT && !(e.thornT = Math.max(0, e.thornT - dt))) e.thornSlow = 0; // Harvester thorns
      if (e.paraT && !(e.paraT = Math.max(0, e.paraT - dt))) e.paraSlow = 0; // Paralyzer laser
      // Slows from fire, slime, chill, frostbite and Drop the Beat all stack (multiplicatively).
      let slow = (1 - (e.burn ? Math.max(e.burnSlow, ENEMIES[e.type].fireSlow ?? 0) : 0)) * (1 - e.slime) * (1 - e.chill * e.chillMax) * (1 - e.beatSlow) * (1 - e.hackSlow) * (1 - e.coldSlow) * (1 - (e.poison ? e.poison.slow : 0)) * (1 - (e.thornSlow || 0)) * (1 - (e.shockT > 0 ? e.shock : 0)) * (1 - (e.paraSlow || 0));
      // Harpoons stack on top, but never take it past `harpoonCap` (unless it already was).
      if (e.harpoonSlow) slow = Math.max(slow * (1 - e.harpoonSlow), Math.min(slow, 1 - e.harpoonCap));
      if (e.pushT) e.pushT = Math.max(0, e.pushT - dt); // Bubble Blower push cooldown
      if (e.holdT) e.holdT = Math.max(0, e.holdT - dt); // held up by a blocking unit (Bubble Companion)
      e.speed = e.stop || e.holdT ? 0 : e.baseSpeed * slow;
      const def = ENEMIES[e.type];
      if (e.enraged) e.speed *= def.enrage.speed; // Eradicator's last stand
      if (e.shutT > 0) {
        // Medium Eradicator: shut down for a moment when Electronic Rage starts.
        e.shutT = Math.max(0, e.shutT - dt);
        e.speed = 0;
      }
      if (e.vShield > 0) e.speed *= 1 - this.voidArmor.slow; // Void armor is heavy
      if (def.accel) {
        // Void Speedy: faster the longer it has been walking.
        e.age = (e.age || 0) + dt;
        e.speed *= Math.min(def.accel.max, 1 + def.accel.rate * e.age);
      }
      const amp = amps?.get(e.id);
      if (amp) {
        // Insane Overlord: his Amplifiers never heal him past ampCap of his max health.
        const top = e.maxHp * (def.ampCap ?? 1);
        e.speed *= 1 + amp.speed;
        if (e.hp < top) e.hp = Math.min(top, e.hp + e.maxHp * amp.heal * dt);
      }
      // Archers stop and stay back while they have a tower to snipe.
      if (def.camp && this.enemyTargets(e, def.camp).length) e.speed = 0;
      // (Also once the last trail or cloud is gone, so smoke, armor and haste wear off.)
      if (auras || this.zones.length || e.insane || e.smoked || e.hasted || e.gear || e.empT || e.glitchT) e.speed *= this.insaneSpeed(e, def, auras, dt);
      if (voidAuras || e.auraArmor || def.fly?.hide) {
        // VOID's aura (not on himself), and VOID (Spirit) is hidden while it flies.
        let aura = 0;
        for (const a of voidAuras ?? []) {
          const ad = ENEMIES[a.type].aura;
          if (a !== e && !e.remains && (e.x - a.x) ** 2 + (e.z - a.z) ** 2 <= ad.radius * ad.radius) aura = Math.max(aura, ad.armor);
        }
        e.auraArmor = aura;
        e.hidden = !!def.hidden || !!e.cloak || !!e.smoked || aura > 0 || (!!def.fly?.hide && (e.airT > 0 || e.charging));
      }
      if (dils) {
        // Time bubble: bosses can be sped up but never slowed down.
        const sc = this.dilationAt(e.x, e.z, dils)?.scale ?? 1;
        if (sc > 1 || (sc < 1 && !e.boss)) e.speed *= sc;
      }
      // Pestilence mushrooms heal.
      if (e.shroom && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.shroom * dt);
      // Hard mode: Health Regen, Breakers' spawn invulnerability, Fallen Shield charge, Summoner hiding.
      if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
      if (e.invulnT > 0) e.invulnT -= dt;
      if (e.chargeT > 0) {
        e.chargeT -= dt;
        e.speed *= def.charge.speed / def.speed;
      }
      if (def.hideAt && !e.cloak && e.hp <= e.maxHp * def.hideAt) {
        e.hidden = e.cloak = true;
        this.events.push({ k: 'cloak', e: e.id });
      }
      if (def.gift || def.fallenKing) this.fallenAttacks(e, def, dt);
      if (ORION_FX.has(e.type) || e.speedBoost) this.insanePace(e, def, dt);
      if (e.sprinting > 0) {
        // Time Runner: dashing ahead at many times its speed.
        e.sprinting = Math.max(0, e.sprinting - dt);
        e.speed *= def.sprint.speed;
      }
      if (HC_FX.has(e.type) && this.hcAttacks(e, def, dt) === 'gone') continue; // Hardcore (a Drop Pod may burst open)
      e.st = (e.stopKind === 'ice' ? ST_FROZEN : e.stopKind === 'stun' ? ST_STUNNED : e.stopKind === 'dance' ? ST_DANCE : e.stopKind === 'float' ? ST_FLOAT : 0) | (e.burn || e.taints?.has('burn') ? ST_BURNING : 0)
        | (e.slime ? ST_SLIMED : 0) | (e.chill ? ST_CHILLED : 0) | (e.hackEv || e.fraud ? ST_HACKED : 0) | (e.gas?.size || e.poison || e.taints?.has('radioactive') ? ST_GASSED : 0) | (e.confT > 0 ? ST_CONFUSED : 0)
        | (e.shockT > 0 ? ST_SHOCKED : 0) | (e.taints?.has('biohazard') ? ST_BIOHAZARD : 0)
        | (e.airT > 0 ? ST_AIRBORNE : 0) | (e.shroom ? ST_SHROOM : 0) | (e.enraged || e.raged ? ST_ENRAGED : 0)
        | (e.smoked ? ST_SMOKED : 0) | (e.armorUp ? ST_ARMORED : 0) | (e.hasted ? ST_HASTED : 0) | (e.glitchT > 0 ? ST_GLITCHED : 0)
        | (e.auraArmor ? ST_VOIDAURA : 0) | (e.charging ? ST_CHARGING : 0) | (e.cloak ? ST_CLOAKED : 0) | (e.vShield > 0 ? ST_VOIDARMOR : 0);
      // Confused zombies walk back toward the entrance.
      if (e.confT > 0) e.dist = Math.max(0, e.dist - e.speed * dt);
      else e.dist += e.speed * dt;
      // Spider Queen: lays spiders behind her (not while frozen or stunned). Some summon several kinds.
      if (e.summonT && !e.stop) {
        [].concat(def.summon).forEach((sm, i) => {
          if ((e.summonT[i] -= dt) > 0) return;
          e.summonT[i] = sm.every;
          if (sm.max) {
            let alive = 0;
            for (const o of this.enemies.values()) if (o.owner === e.id && o.type === sm.type) alive++;
            for (const r of this.reborn) if (r.owner === e.id && r.type === sm.type) alive++;
            if (alive >= sm.max) return;
          }
          const cnt = Array.isArray(sm.n) ? sm.n[0] + Math.floor(Math.random() * (sm.n[1] - sm.n[0] + 1)) : sm.n; // MK11-Device: 2-3
          for (let j = 0; j < cnt; j++) this.reborn.push({ route: e.route, type: sm.type, dist: Math.max(0, sm.here ? e.dist : e.dist - 1.5 - j), lateral: sm.here ? e.lateral : 0, hpScale: 1, owner: e.id, noCash: !!sm.noCash });
          this.events.push({ k: 'summon', e: e.id, type: sm.type });
        });
      }
      // Amplifiers float along next to the enemy that summoned them.
      if (def.escort) {
        const boss = this.enemies.get(e.owner);
        if (boss) {
          e.dist = Math.max(0, boss.dist - 3);
          e.lateral = boss.lateral + 2.5;
        }
      }
      // Corpses crumble away after a while.
      if (e.remains && (e.life -= dt) <= 0) {
        this.enemies.delete(e.id);
        this.events.push({ k: 'decay', e: e.id });
        continue;
      }
      if ((def.slam || def.axe) && !e.stop) this.bossAttacks(e, def, dt);
      if (def.shots || def.slash || def.dash || def.fly || def.infect || def.enrage) this.hardAttacks(e, def, dt);
      if (def.smog || def.stomp || def.beam || def.barrage) this.expertAttacks(e, def, dt);
      if (def.moves || def.sprint || def.sacrifice) this.expertMoves(e, def, dt);
      if (INSANE_FX.has(e.type)) this.insaneAttacks(e, def, dt);
      if (VOID_FX.has(e.type)) this.voidAttacks(e, def, dt);
      if (VB_FX.has(e.type)) this.voidBoss(e, def, dt);
      if (e.vShield > 0) this.voidTendrils(e, dt);
      if (def.mAttacks || def.rage || e.flameT > 0) this.mediumAttacks(e, def, dt);
      if (e.dist >= path.length && def.rewind) {
        // Rewind: only scratches the base, then goes back to the start.
        const dmg = def.damage;
        this.baseHp = Math.max(0, this.baseHp - dmg);
        this.events.push({ k: 'rewind', e: e.id, d: dmg, x: r2(e.x), z: r2(e.z) });
        if (this.baseHp <= 0) return this.end(false);
        e.dist = 0;
      }
      if (e.dist >= path.length && def.recede && (e.recedes || 0) < def.recede.n) {
        // Emperor Taunting Recession: warps back to the start instead of entering the base.
        e.recedes = (e.recedes || 0) + 1;
        e.dist = 0;
        this.events.push({ k: 'hcRecede', e: e.id, n: e.recedes, left: def.recede.n - e.recedes });
      }
      if (e.dist >= path.length) {
        this.enemies.delete(e.id);
        const dmg = ENEMIES[e.type].damage;
        this.baseHp = Math.max(0, this.baseHp - dmg);
        this.events.push({ k: 'leak', e: e.id, d: dmg });
        if (this.baseHp <= 0) return this.end(false);
        continue;
      }
      path.at(e.dist, e, e.route);
      e.x += -e.dz * e.lateral;
      e.z += e.dx * e.lateral;
    }

    this.spies = spyCircles(this.towers.values());
    this.buffs = computeBuffs(this.towers.values());
    // Golden Byte: zombies in its range that are stunned or slowed take more damage (see damage()).
    this.slowVulns = [];
    // Oil Derrick Cash Back: each player's bonus on cash from damage (see cashBack). Derricks that
    // are stunned or knocked out don't count, and `noStack` ones don't add up: the best one counts.
    this.cashBacks.clear();
    for (const o of this.towers.values()) {
      const back = TOWERS[o.type].levels[o.level].dmgCash;
      if (back && o.hp > 0 && !(o.stunT > 0) && !o.holo && !o.corrupt && !o.curseBy) {
        const had = this.cashBacks.get(o.owner) ?? 0;
        this.cashBacks.set(o.owner, TOWERS[o.type].noStack ? Math.max(had, back) : had + back);
      }
      const v = TOWERS[o.type].levels[o.level].slowVuln;
      if (v && o.hp > 0 && !(o.stunT > 0)) this.slowVulns.push({ x: o.x, z: o.z, r: TOWERS[o.type].levels[o.level].range * buffOf(this.buffs, o.id).range, v });
    }
    this.medicRepair(dt);
    this.updateHealZones(dt);
    for (const t of this.towers.values()) {
      t.dil = dils && !TOWERS[t.type].levels[t.level].dilate ? this.dilationAt(t.x, t.z, dils) : null;
      this.updateTower(t, dt);
    }
    // Unit crashes and the like are never bullets or lasers; unit guns say what they fire.
    this.hitKind = 'none';
    try {
      this.updateUnits(dt);
    } finally {
      this.hitKind = undefined;
    }
    this.updateShells(dt);
    this.updateFlights(dt);
    this.updateBlades(dt);
    if (this.attrition?.left > 0) this.attrition.left -= dt; // Businessman Attrition
    this.updateRings(dt);
    this.updateSweeps(dt);
    this.updateTraps(dt);
    this.updateSentries(dt);
    this.updateBurns(dt);
    this.updateAxes(dt);
    this.updatePuddles(dt);
    this.updateGoos(dt);
    this.updateZones(dt);
    this.updateBombs(dt);
    if (this.shiftBoss) this.timeShift(this.shiftBoss);
    this.updateMarks(dt);
    this.updateOrbs(dt);
    if (this.over) return;
    this.updateLasers(dt);
    if (this.riseBoss) this.voidRise(this.riseBoss);
    this.spawnReborn();

    if (!this.vs && w.state === 'wave' && !this.queue.length && !(this.finaleT > 0) && this.allClear()) {
      this.payWave();
      if (w.index >= this.waves.length - 1) return this.end(true);
      w.index++;
      w.state = 'intermission';
      w.countdown = GAME.intermission + (this.breakBonus || 0); // back from the Beholder's Field: time to rebuild
      this.breakBonus = 0;
    }
  }

  /**
   * Time Dilators that are working right now (not knocked out, stunned or recharging after a
   * stun): [{ x, z, r2, level, scale, spawn, cd }] or null.
   */
  timeBubbles(dt) {
    let out = null;
    for (const o of this.towers.values()) {
      const ds = TOWERS[o.type].levels[o.level].dilate;
      if (!ds) continue;
      if (o.stunT > 0) o.dilOff = ds.recharge; // the shield has to recharge after a stun
      else if (o.dilOff > 0) o.dilOff = Math.max(0, o.dilOff - dt);
      if (o.hp <= 0 || o.stunT > 0 || o.dilOff > 0) continue;
      (out ??= []).push({ x: o.x, z: o.z, r2: ds.radius * ds.radius, level: o.level, scale: o.choice?.[0] === 'slow' ? ds.slow : ds.fast, spawn: ds.spawn, cd: ds.cd });
    }
    return out;
  }

  /** The time bubble at (x, z): where bubbles overlap only the highest-level one counts. */
  dilationAt(x, z, dils) {
    let best = null;
    for (const d of dils) if ((x - d.x) ** 2 + (z - d.z) ** 2 <= d.r2 && (!best || d.level > best.level)) best = d;
    return best;
  }

  /** No enemies left except corpses (they don't have to be broken to finish a wave). */
  allClear() {
    for (const e of this.enemies.values()) if (!e.remains) return false;
    return true;
  }

  /** Molten Warlord: slams stun nearby towers, and thrown axes stun towers far away. */
  bossAttacks(e, def, dt) {
    const sl = def.slam;
    if (sl && (e.slamT -= dt) <= 0) {
      if (this.towerNear(e.x, e.z, sl.range, true)) {
        e.slamT = sl.every;
        const n = this.hexTowers(e.x, e.z, sl.range, 'stun', sl.stun, true);
        if (sl.dmg) this.hurtTowers(e.x, e.z, sl.range, sl.dmg, true);
        this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: sl.range, n });
      } else e.slamT = 0.5;
    }
    const ax = def.axe;
    if (ax && (e.axeT -= dt) <= 0) {
      // Prefer towers out of slam reach, so the axe goes after the ones hiding far away.
      const near = (sl?.range ?? 0) ** 2;
      const all = [];
      const far = [];
      for (const t of this.towers.values()) {
        const d2 = (t.x - e.x) ** 2 + (t.z - e.z) ** 2;
        if (d2 > ax.range * ax.range || this.stealthy(t)) continue; // stealthy towers can't be targeted
        all.push(t);
        if (d2 > near) far.push(t);
      }
      // Scarecrows are bait: the axe goes for one of them when it can.
      const bait = all.filter((o) => TOWERS[o.type].bait && o.hp > 0);
      const list = bait.length ? bait : far.length ? far : all;
      if (!list.length) {
        e.axeT = 1;
        return;
      }
      const t = list[Math.floor(Math.random() * list.length)];
      e.axeT = ax.every;
      this.axes.push({ x: t.x, z: t.z, left: ax.flight, r: ax.radius, stun: ax.stun, dmg: ax.dmg ?? 0 });
      this.events.push({ k: 'axe', e: e.id, fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: ax.flight });
    }
  }

  /** Towers enemy `e` can attack within `range`: working, not stealthy (Scarecrows first if any). */
  enemyTargets(e, range) {
    const out = [];
    for (const t of this.towers.values()) {
      if (t.hp <= 0 || (t.x - e.x) ** 2 + (t.z - e.z) ** 2 > range * range || this.stealthy(t)) continue;
      out.push(t);
    }
    const bait = out.filter((o) => TOWERS[o.type].bait);
    return bait.length ? bait : out;
  }

  /**
   * Hard mode enemy abilities (see the Hard mode comment in ENEMIES): the Eradicator's enrage and
   * flight, Knight dashes and slashes, Pestilence mushrooms, and shots at towers.
   */
  hardAttacks(e, def, dt) {
    if (def.enrage?.after) e.ageT = (e.ageT || 0) + dt;
    if (def.enrage && !e.enraged && (def.enrage.after ? e.ageT >= def.enrage.after : e.hp <= e.maxHp * def.enrage.at)) {
      e.enraged = true;
      if (def.enrage.osh) {
        // Hardcore Lurch 3: smashes its core and gains a shield.
        e.osh = (e.osh || 0) + e.maxHp * def.enrage.osh;
        e.oshMax = Math.max(e.oshMax || 0, e.osh);
      }
      this.events.push({ k: 'enrage', e: e.id });
    }
    if (e.stop) return; // frozen or stunned enemies don't attack
    const fl = def.fly;
    if (fl) {
      if (e.airT > 0) {
        if ((e.airT -= dt) <= 0) {
          e.airT = 0;
          e.flying = !!def.flying;
          e.flyT = fl.every;
          this.events.push({ k: 'land', e: e.id });
        }
      } else if ((e.flyT -= dt) <= 0) {
        e.airT = fl.dur;
        e.flying = true;
        e.charging = false;
        this.events.push({ k: 'takeoff', e: e.id });
      } else if (fl.charge && !e.charging && e.flyT <= fl.charge) {
        // VOID (Spirit): glows and fades out before it flies off.
        e.charging = true;
        this.events.push({ k: 'vCharge', e: e.id });
      }
    }
    if (def.dash && (e.dashT -= dt) <= 0) {
      e.dashT = def.dash.every;
      e.dist += def.dash.dist;
      this.events.push({ k: 'dash', e: e.id });
    }
    const sl = def.slash;
    if (sl && (e.slashT -= dt) <= 0) {
      if (this.enemyTargets(e, sl.range).length) {
        e.slashT = sl.every;
        this.hurtTowers(e.x, e.z, sl.range, sl.dmg, true);
        this.events.push({ k: 'slash', e: e.id, x: r2(e.x), z: r2(e.z), r: sl.range, ...(sl.spin ? { spin: 1 } : {}) });
      } else e.slashT = 0.5;
    }
    const inf = def.infect;
    if (inf && (e.infectT -= dt) <= 0) {
      e.infectT = inf.every;
      let n = 0;
      for (const o of this.enemies.values()) {
        if (n >= inf.max) break;
        if (o.remains || o.shroom || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > inf.radius * inf.radius) continue;
        const add = Math.round(o.maxHp * inf.hp);
        o.maxHp += add;
        o.hp += add;
        o.shroom = inf.regen;
        n++;
      }
      if (n) this.events.push({ k: 'infect', e: e.id, x: r2(e.x), z: r2(e.z), r: inf.radius });
    }
    if (!def.shots) return;
    def.shots.forEach((s, i) => {
      if (s.air && !(e.airT > 0)) return;
      if ((e.shotT[i] -= dt) > 0) return;
      const list = this.enemyTargets(e, s.range);
      if (!list.length) {
        e.shotT[i] = 0.5;
        return;
      }
      e.shotT[i] = s.every;
      if (s.haste) {
        // Vio Gunner: the enemies around it speed up as it fires.
        for (const o of this.enemies.values()) {
          if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > s.haste.radius ** 2) continue;
          o.empT = Math.max(o.empT || 0, s.haste.time);
          o.empHaste = Math.max(o.empT > 0 ? o.empHaste || 0 : 0, s.haste.speed);
        }
      }
      // Shadow Master: a flurry of `n` shurikens at random towers.
      for (let k = 0; k < (s.n || 1); k++) {
        const t = list[Math.floor(Math.random() * list.length)];
        const fl = (s.flight || 0) + k * 0.08;
        this.events.push({ k: 'eShot', e: e.id, kind: s.kind, fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: fl, air: e.airT > 0 ? 1 : 0 });
        const hit = { x: t.x, z: t.z, left: fl, r: s.radius, stun: s.stun || 0, dmg: s.dmg, kind: s.kind, puddle: s.puddle, slow: s.slow, shrink: s.shrink, weak: s.weak, lock: s.lock };
        if (s.drain && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * s.drain); // Time Parasite heals off its beam
        if (fl) this.axes.push(hit);
        else this.landShot(hit);
      }
    });
  }

  /**
   * Medium mode attacks (see the Medium comment in ENEMIES): Smasher / Eradicator slams, Sword
   * Shock, Predator and Eradicator shots and rockets, Energy Cleave, Pyrotechnics, Grenadier
   * grenades, and the Eradicator's Electronic Rage.
   */
  mediumAttacks(e, def, dt) {
    const rg = def.rage;
    if (rg && !e.raged && e.hp <= rg.at) {
      e.raged = true;
      e.shutT = rg.shut;
      e.hp = Math.min(e.maxHp, e.hp + rg.heal);
      e.baseSpeed = rg.speed;
      for (const o of this.towers.values()) o.immuneT = Math.max(o.immuneT || 0, rg.immune); // a short stun immunity
      this.events.push({ k: 'mRage', e: e.id });
    }
    if (e.flameT > 0) {
      // Pyrotechnics: a flamethrower sprays an arc in front of it (the way it walks).
      const fl = e.flameAb;
      e.flameT = Math.max(0, e.flameT - dt);
      const half = (fl.arc / 2) * (Math.PI / 180);
      for (const o of this.enemyTargets(e, fl.range)) {
        const a = Math.atan2(o.x - e.x, o.z - e.z) - Math.atan2(e.dx, e.dz);
        if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= half) this.hurtTower(o, fl.dps * dt, true);
      }
      if ((e.flameFx = (e.flameFx || 0) - dt) <= 0) {
        e.flameFx = 0.25;
        this.events.push({ k: 'eFlame', e: e.id, x: r2(e.x), z: r2(e.z), yaw: r2(Math.atan2(e.dx, e.dz)), r: fl.range, arc: fl.arc });
      }
    }
    if (e.stop || e.shutT > 0 || !def.mAttacks) return; // stunned, frozen or shut down: no attacks
    def.mAttacks.forEach((a, i) => {
      if (a.phase === 2 && !e.raged) return;
      if ((e.mT[i] -= dt) > 0) return;
      if (a.slam) {
        if (!this.towerNear(e.x, e.z, a.slam.range, true)) return void (e.mT[i] = 0.5);
        const n = this.hexTowers(e.x, e.z, a.slam.range, 'stun', a.slam.stun, true);
        if (a.slam.unitDmg) this.hurtUnitsNear(e.x, e.z, a.slam.range, a.slam.unitDmg); // Hard: Honor Guard, Guardian
        this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: a.slam.range, n, name: a.name ?? def.name, ...(a.slam.spin ? { spin: 1 } : {}), ...(a.slam.color ? { c: a.slam.color } : {}) });
      } else if (a.jam) {
        if (!this.enemyTargets(e, a.jam.range).length) return void (e.mT[i] = 0.5);
        const n = this.slowTowers(e.x, e.z, a.jam.range, a.jam.slow, a.jam.time, true);
        this.events.push({ k: 'jam', e: e.id, x: r2(e.x), z: r2(e.z), r: a.jam.range, n });
      } else if (a.cleave) {
        if (!this.enemyTargets(e, a.cleave.range).length) return void (e.mT[i] = 0.5);
        this.hurtTowers(e.x, e.z, a.cleave.range, a.cleave.dmg, true);
        this.events.push({ k: 'slash', e: e.id, x: r2(e.x), z: r2(e.z), r: a.cleave.range });
      } else if (a.flame) {
        if (!this.enemyTargets(e, a.flame.range).length) return void (e.mT[i] = 0.5);
        e.flameT = a.flame.time;
        e.flameAb = a.flame;
        e.flameFx = 0;
      } else if (a.toss) {
        const tg = a.toss;
        const dist = Math.min(e.dist + (tg.ahead || 0), path.length - 2);
        const p = path.at(dist, {}, e.route);
        this.events.push({ k: 'eShot', e: e.id, kind: 'grenade', fx: r2(e.x), fz: r2(e.z), x: r2(p.x), z: r2(p.z), d: tg.flight });
        this.axes.push({ x: p.x, z: p.z, left: tg.flight, r: 3, stun: 0, dmg: 0, kind: 'grenade', spawn: { list: tg.list, dist } });
      } else if (a.shot) {
        const s = a.shot;
        let list = this.enemyTargets(e, s.range);
        if (s.offensive) list = list.filter((o) => TOWERS[o.type].kind !== 'income');
        if (!list.length) return void (e.mT[i] = 0.5);
        let picks;
        if (s.pick === 'random') picks = Array.from({ length: s.n }, () => list[Math.floor(Math.random() * list.length)]);
        else {
          list.sort((x, y) => (s.pick === 'weakest' ? x.spent - y.spent : y.spent - x.spent) || x.id - y.id);
          picks = s.same ? Array(s.n).fill(list[0]) : list.slice(0, s.n);
        }
        picks.forEach((o, k) => {
          const close = s.near && (o.x - e.x) ** 2 + (o.z - e.z) ** 2 <= s.near[0] ** 2;
          const dmg = (close ? s.near[1] : s.dmg) + (s.pct ? o.maxHp * s.pct : 0);
          const fl = (s.flight || 0) + k * 0.1;
          this.events.push({ k: 'eShot', e: e.id, kind: s.kind, fx: r2(e.x), fz: r2(e.z), x: r2(o.x), z: r2(o.z), d: fl });
          // Aimed at one tower: only that tower is hit.
          const hit = { x: o.x, z: o.z, left: fl, r: 0.5, stun: s.stun || 0, dmg: 0, kind: s.kind, tower: o.id, tdmg: dmg, weak: s.weak, slow: s.slow, lock: s.lock }; // (Hardcore: stun / weaken / slow it too)
          if (fl) this.axes.push(hit);
          else this.landShot(hit);
        });
      }
      e.mT[i] = a.every;
    });
  }

  /**
   * Hard mode (Fallen) abilities: Fallen Jester gifts, and the Fallen King's Summon (once), Sword
   * Swing (three slashes, each wider) and Fallen Comet. Undead Charge is a plain `summon`.
   */
  fallenAttacks(e, def, dt) {
    if (e.stop) return;
    const g = def.gift;
    if (g && (e.giftT -= dt) <= 0) {
      e.giftT = g.every;
      let n = 0;
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || o.boss || o.gifted || ENEMIES[o.type].gift || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > g.radius * g.radius) continue;
        o.gifted = true;
        n++;
        if (Math.random() < 0.5) {
          // Bloated: more health.
          o.maxHp = Math.round(o.maxHp * g.bloated);
          o.hp = Math.min(o.maxHp, o.hp * g.bloated);
        } else o.blessed = g.blessed; // Blessed: more defense
      }
      this.events.push({ k: 'gift', e: e.id, x: r2(e.x), z: r2(e.z), r: g.radius, n });
    }
    const fk = def.fallenKing;
    if (!fk) return;
    // Summon (once): a horde of Fallen bursts out behind him.
    if (!e.hordeDone && e.hp <= e.maxHp * fk.horde.at) {
      e.hordeDone = true;
      for (let i = 0; i < fk.horde.n; i++) {
        const type = fk.horde.list[Math.floor(Math.random() * fk.horde.list.length)];
        this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 3 - i * 0.6), lateral: (Math.random() - 0.5) * 2, hpScale: 1, owner: e.id });
      }
      this.events.push({ k: 'kingHorde', e: e.id, n: fk.horde.n });
    }
    // Sword Swing: three slashes, each one wider than the last (the third is a full circle).
    const sw = fk.swing;
    if ((e.swingT -= dt) <= 0) {
      if (!e.swingN && !this.enemyTargets(e, sw.range).length) e.swingT = 0.5;
      else {
        const arc = sw.arcs[e.swingN];
        const half = (arc / 2) * (Math.PI / 180);
        const yaw = Math.atan2(e.dx, e.dz);
        const inArc = (o) => {
          if (arc >= 360) return true;
          const a = Math.atan2(o.x - e.x, o.z - e.z) - yaw;
          return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= half;
        };
        const n = this.hexTowers(e.x, e.z, sw.range, 'stun', sw.stun, true, inArc);
        this.hurtUnitsNear(e.x, e.z, sw.range, sw.unitDmg, inArc);
        this.events.push({ k: 'kingSwing', e: e.id, x: r2(e.x), z: r2(e.z), r: sw.range, arc, yaw: r2(yaw), n, i: e.swingN });
        e.swingN++;
        if (e.swingN >= sw.arcs.length) {
          e.swingN = 0;
          e.swingT = sw.every;
        } else e.swingT = sw.gap;
      }
    }
    // Fallen Comet: spikes rain down on the whole map.
    const cm = fk.comet;
    if ((e.cometT -= dt) <= 0) {
      e.cometT = cm.every;
      const n = this.hexTowers(e.x, e.z, 1e5, 'stun', cm.stun, true);
      this.hurtUnits(cm.unitDmg);
      this.events.push({ k: 'comet', e: e.id, n });
    }
  }

  /** Fallen King: Bone Armor (more defense as he loses health) and $10,000 for every 5% of health lost. */
  kingHurt(e) {
    const def = ENEMIES[e.type];
    const bone = def.fallenKing?.bone;
    if (bone && e.hp > 0 && e.hp <= e.boneAt && e.armor < bone.max) {
      e.armor = Math.min(bone.max, e.armor + bone.add);
      e.boneAt = e.hp * (1 - bone.loss);
      this.events.push({ k: 'boneArmor', e: e.id, a: Math.round(e.armor * 100) });
    }
    const cd = def.cashDrop;
    if (cd) {
      const lost = Math.min(Math.round(1 / cd.pct), Math.floor((1 - Math.max(0, e.hp) / e.maxHp) / cd.pct + 1e-9));
      if (lost > e.drops) {
        const v = (lost - e.drops) * cd.cash;
        e.drops = lost;
        for (const p of this.players.values()) p.cash += v;
        this.events.push({ k: 'cashDrop', x: r2(e.x), z: r2(e.z), v });
      }
    }
  }

  /** Necrotic Skeleton dies: towers nearby fire slower, units get hurt, and healing goo spills on the path. */
  necroBurst(e, nb) {
    this.slowTowers(e.x, e.z, nb.radius, nb.slow, nb.time, true);
    this.hurtUnitsNear(e.x, e.z, nb.radius, nb.unitDmg);
    this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: nb.radius, c: 0x00e5ff });
    const g = nb.goo;
    for (let i = 0; i < g.n; i++) {
      const d = Math.min(path.length - 1, Math.max(0, e.dist + (i - (g.n - 1) / 2) * 3));
      const p = path.at(d, {}, e.route);
      this.goos.push({ x: p.x, z: p.z, r: g.r, left: g.life, heal: g.heal, every: g.every, t: g.every });
      this.events.push({ k: 'goo', x: r2(p.x), z: r2(p.z), r: g.r, life: g.life });
    }
  }

  /** Necrotic goo: heals the enemies standing in it every `every` s. */
  updateGoos(dt) {
    if (!this.goos.length) return;
    this.goos = this.goos.filter((g) => {
      if ((g.t -= dt) <= 0) {
        g.t += g.every;
        for (const o of this.enemies.values()) {
          if (o.remains || o.hp >= o.maxHp || (o.x - g.x) ** 2 + (o.z - g.z) ** 2 > g.r * g.r) continue;
          o.hp = Math.min(o.maxHp, o.hp + g.heal);
        }
      }
      return (g.left -= dt) > 0;
    });
  }

  /**
   * Insane mode: how much faster (or slower) enemy `e` moves this tick. Trails and EMPs and Warpers
   * speed it up (the strongest one counts), Timelings change pace, Glitches only lurch, the
   * Beholder speeds up near towers. Also: Smoker smoke hides it, Mechanics armor it up.
   */
  insaneSpeed(e, def, auras, dt) {
    let haste = e.empT > 0 ? e.empHaste : 0;
    if (e.empT > 0) e.empT = Math.max(0, e.empT - dt);
    if (e.glitchT > 0) e.glitchT = Math.max(0, e.glitchT - dt);
    let smoked = false;
    for (const z of this.zones) {
      if ((e.x - z.x) ** 2 + (e.z - z.z) ** 2 > z.r * z.r) continue;
      if (z.kind === 'smoke') smoked = true;
      else if (z.by !== e.id) haste = Math.max(haste, z.speed);
    }
    let geared = 0;
    if (auras) {
      for (const a of auras) {
        if (a === e) continue;
        const ad = ENEMIES[a.type];
        const d2 = (e.x - a.x) ** 2 + (e.z - a.z) ** 2;
        if (ad.hasteAura && d2 <= ad.hasteAura.radius ** 2) haste = Math.max(haste, ad.hasteAura.speed);
        if (ad.gear && d2 <= ad.gear.radius ** 2 && !e.remains) geared = ad.gear;
      }
    }
    if (geared) e.gear = Math.min(geared.max, e.gear + geared.rate * dt);
    else if (e.gear) e.gear = Math.max(0, e.gear - 0.05 * dt);
    e.smoked = smoked && !def.hidden;
    e.hidden = !!def.hidden || !!e.cloak || smoked;
    const nh = def.nearHaste;
    if (nh) {
      let n = 0;
      for (const t of this.towers.values()) if (t.hp > 0 && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= nh.radius * nh.radius) n++;
      haste = Math.max(haste, Math.min(nh.max, n * nh.per));
    }
    e.hasted = haste > 0;
    let mult = 1 + haste;
    if (def.tempo) mult *= e.tempo;
    if (def.lurch) mult = 0; // Glitches don't walk, they lurch (insaneAttacks)
    if (e.waitT > 0) {
      e.waitT = Math.max(0, e.waitT - dt);
      mult = 0;
    }
    return mult;
  }

  /** Towers within `r` of (x, z) work `amt` slower for `secs` s (`enemy`: stealthy towers are safe). Returns how many. */
  slowTowers(x, z, r, amt, secs, enemy = true) {
    let n = 0;
    for (const t of this.towers.values()) {
      if ((t.x - x) ** 2 + (t.z - z) ** 2 > r * r) continue;
      if (enemy && this.stealthy(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
      t.slowAmt = t.slowT > 0 ? Math.max(t.slowAmt, amt) : amt;
      t.slowT = Math.max(t.slowT || 0, secs);
      n++;
    }
    return n;
  }

  /**
   * Insane mode enemy abilities (see the Insane mode comment in ENEMIES): trails and smoke, Battery
   * lightning and EMPs, King stabs, Timeling pace, Time Titan armor, Glitch lurches, and the
   * Beholder's time waves, time bombs, sword and its shift into the time dimension.
   */
  insaneAttacks(e, def, dt) {
    if (def.shift && !e.shifted && e.hp <= e.maxHp * def.shift.at && !this.shiftBoss) {
      e.shifted = true;
      this.shiftBoss = e;
      return;
    }
    if (def.trail && (e.trailT -= dt) <= 0) {
      e.trailT = def.trail.every;
      this.zones.push({ kind: 'trail', x: e.x, z: e.z, r: def.trail.radius, left: def.trail.life, speed: def.trail.speed, by: e.id });
      this.events.push({ k: 'trail', x: r2(e.x), z: r2(e.z), r: def.trail.radius, life: def.trail.life, ...(def.trail.color ? { c: def.trail.color } : {}) });
    }
    if (def.smoke && (e.smokeT -= dt) <= 0) {
      e.smokeT = def.smoke.every;
      this.zones.push({ kind: 'smoke', x: e.x, z: e.z, r: def.smoke.radius, left: def.smoke.life });
      this.events.push({ k: 'smoke2', x: r2(e.x), z: r2(e.z), r: def.smoke.radius, life: def.smoke.life });
    }
    if (def.tempo && (e.tempoT -= dt) <= 0) {
      e.tempoT = rand(...def.tempo.every);
      e.tempo = rand(def.tempo.min, def.tempo.max);
    }
    if (def.armorSwap && (e.armorT -= dt) <= 0) {
      e.armorT = rand(...def.armorSwap.every);
      e.armorUp = !e.armorUp;
      e.armor = e.armorUp ? def.armorSwap.armor : 0;
      this.events.push({ k: 'armorSwap', e: e.id, on: e.armorUp ? 1 : 0 });
    }
    if (e.stop) return; // frozen or stunned enemies don't attack (or lurch)
    const lu = def.lurch;
    if (lu && (e.lurchT -= dt) <= 0) {
      e.lurchT = lu.every * rand(0.6, 1.4);
      const from = e.dist;
      const step = lu.dist * rand(0.7, 1.3);
      e.dist = e.confT > 0 ? Math.max(0, e.dist - step) : e.dist + step;
      const lo = Math.min(from, e.dist);
      const hi = Math.max(from, e.dist);
      // Every enemy it glitched through gets laser resistance for a while.
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || o.dist < lo || o.dist > hi) continue;
        o.glitchT = lu.time;
        o.glitchRes = lu.resist;
      }
      this.events.push({ k: 'lurch', e: e.id });
    }
    const arc = def.arc;
    if (arc && (e.arcT -= dt) <= 0) {
      const list = this.enemyTargets(e, arc.range);
      if (!list.length) e.arcT = 0.5;
      else {
        // Battery lightning: one tower, then it jumps on to the closest towers nearby.
        e.arcT = arc.every;
        let t = list[Math.floor(Math.random() * list.length)];
        const hit = [t];
        for (let i = 0; i < arc.n; i++) {
          let best = null;
          let bd = arc.jump * arc.jump;
          for (const o of this.towers.values()) {
            if (o.hp <= 0 || hit.includes(o) || this.stealthy(o)) continue;
            const d2 = (o.x - t.x) ** 2 + (o.z - t.z) ** 2;
            if (d2 <= bd) {
              bd = d2;
              best = o;
            }
          }
          if (!best) break;
          hit.push(best);
          t = best;
        }
        for (const o of hit) this.hurtTowers(o.x, o.z, 0.01, arc.dmg, true);
        this.events.push({ k: 'arc', e: e.id, h: hit.map((o) => [r2(o.x), r2(o.z)]) });
      }
    }
    const emp = def.emp;
    if (emp && (e.empCdT -= dt) <= 0) {
      if (!this.towerNear(e.x, e.z, emp.radius, true)) e.empCdT = 0.5;
      else {
        e.empCdT = emp.every;
        const n = this.hexTowers(e.x, e.z, emp.radius, 'stun', emp.stun, true);
        for (const o of this.enemies.values()) {
          if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > emp.radius * emp.radius) continue;
          o.empT = emp.time;
          o.empHaste = emp.haste;
        }
        this.events.push({ k: 'emp', e: e.id, x: r2(e.x), z: r2(e.z), r: emp.radius, n });
      }
    }
    const sb = def.stab;
    if (sb && (e.stabT -= dt) <= 0) {
      const list = this.enemyTargets(e, sb.range);
      if (!list.length) e.stabT = 0.5;
      else {
        e.stabT = sb.every;
        const t = list[Math.floor(Math.random() * list.length)];
        this.hurtTowers(t.x, t.z, 0.01, sb.dmg, true);
        this.events.push({ k: 'stab', e: e.id, x: r2(t.x), z: r2(t.z) });
      }
    }
    const tw = def.timeWave;
    if (tw && (e.waveT -= dt) <= 0) {
      e.waveT = tw.every;
      const n = this.slowTowers(e.x, e.z, tw.radius, tw.slow, tw.time);
      this.events.push({ k: 'timeWave', e: e.id, x: r2(e.x), z: r2(e.z), r: tw.radius, n });
    }
    const tb = def.timeBomb;
    if (tb && (e.bombT -= dt) <= 0) {
      const list = this.openTowers().filter((t) => !this.bombs.some((b) => b.tower === t.id));
      if (!list.length) e.bombT = 1;
      else {
        e.bombT = tb.every;
        const t = list[Math.floor(Math.random() * list.length)];
        const b = { id: this.nextId++, tower: t.id, x: t.x, z: t.z, left: tb.fuse, dmg: tb.dmg, r: tb.radius };
        this.bombs.push(b);
        this.events.push({ k: 'tBomb', e: e.id, id: b.id, x: r2(b.x), z: r2(b.z), fuse: tb.fuse });
      }
    }
    const sw = def.sword;
    if (sw && (e.swordT -= dt) <= 0) {
      const list = this.enemyTargets(e, sw.range);
      if (!list.length) e.swordT = 0.5;
      else {
        // A sword swipe: hurts the towers around it, and they fire a bit slower for good.
        e.swordT = sw.every;
        this.hurtTowers(e.x, e.z, sw.range, sw.dmg, true);
        for (const t of list) t.nerf = Math.max(sw.minRate, (t.nerf ?? 1) * (1 - sw.nerf));
        this.events.push({ k: 'swipe', e: e.id, x: r2(e.x), z: r2(e.z), r: sw.range, n: list.length });
      }
    }
  }

  // ---------------------------------------------------------------- Void mode

  /** Void Colossus: each hit of a kind wears that kind's resistance down a little. */
  adaptResist(e, kind, dmg, adapt) {
    const field = kind === 'bullet' ? 'bulletResist' : kind === 'laser' ? 'laserResist' : kind === 'explosive' ? 'explosiveResist' : kind === 'golden' ? 'goldResist' : null;
    if (!field || !(e[field] > 0) || !(dmg > 0)) return;
    e[field] = Math.max(0, e[field] - adapt.rate * (dmg / e.maxHp));
  }

  /** How dark the world is: 0 normal, 1 while VOID is alive, 2 for his spirit form. */
  get voidLevel() {
    let lv = 0;
    for (const e of this.enemies.values()) lv = Math.max(lv, ENEMIES[e.type].voidWorld ?? 0);
    if (this.riseBoss || this.reborn.some((r) => ENEMIES[r.type].voidWorld)) lv = Math.max(lv, 1);
    return lv;
  }

  /**
   * Void mode enemy abilities (see the Void mode comment in ENEMIES): the Golden Void's cash drain,
   * and VOID's punch, marks, summons when hurt, magic missiles, sky laser and tower drain.
   */
  voidAttacks(e, def, dt) {
    if (def.drain && (e.drainT -= dt) <= 0) {
      // Golden Void: takes cash from every player each second.
      e.drainT = 1;
      for (const p of this.players.values()) p.cash = Math.max(0, p.cash - def.drain);
      this.events.push({ k: 'drain', e: e.id, v: def.drain });
    }
    if (def.towerDrain) {
      // VOID (Spirit): every tower on the map slowly withers.
      for (const t of this.towers.values()) if (t.hp > 0) this.hurtTower(t, def.towerDrain * dt, true);
    }
    const lost = 1 - e.hp / e.maxHp;
    const hs = def.hurtSummon;
    if (hs) {
      // Each `per` of health lost: a few random enemies burst out.
      const due = Math.floor(lost / hs.per);
      if (due > e.hurtDone && !e.risen) {
        e.hurtDone = due; // a huge hit still only lets out one batch
        for (let i = 0; i < hs.n; i++) {
          const type = hs.list[Math.floor(Math.random() * hs.list.length)];
          this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 1.5 - i * 1.5), lateral: (Math.random() - 0.5) * 2, hpScale: 1, from: e.type });
        }
        this.events.push({ k: 'summon', e: e.id, type: 'voidHurt' });
      }
    }
    if (def.mark) {
      // Every 25% of health lost: a purple X over the tower that has hurt him most.
      while (e.marksDone < 3 && lost >= 0.25 * (e.marksDone + 1)) {
        e.marksDone++;
        const marked = new Set(this.marks.map((k) => k.tower));
        let best = null;
        let most = -1;
        for (const t of this.towers.values()) {
          if (t.hp <= 0 || marked.has(t.id)) continue;
          const v = e.dmgBy.get(t.id) ?? -1 + t.damageDealt * 1e-9; // nobody hurt him? then the strongest damage dealer
          if (v > most) {
            most = v;
            best = t;
          }
        }
        if (!best) continue;
        const k = { id: this.nextId++, tower: best.id, x: best.x, z: best.z, left: def.mark.fuse };
        this.marks.push(k);
        this.events.push({ k: 'vMark', e: e.id, id: k.id, tower: best.id, x: r2(best.x), z: r2(best.z), fuse: def.mark.fuse });
      }
    }
    const ob = def.orb;
    if (ob && (e.orbT -= dt) <= 0) {
      // A slow magic missile flies down the path toward the base. Touch it to pop it!
      e.orbT = ob.every;
      const o = { id: this.nextId++, dist: e.dist + 2, route: e.route, x: e.x, z: e.z, speed: ob.speed, dmg: ob.dmg };
      path.at(o.dist, o, o.route);
      this.orbs.push(o);
      this.events.push({ k: 'vOrb', e: e.id, id: o.id, x: r2(o.x), z: r2(o.z) });
    }
    const sk = def.skyLaser;
    if (sk && (e.laserT -= dt) <= 0) {
      e.laserT = sk.every;
      this.lasers.push({ left: sk.warn });
      this.events.push({ k: 'vLaserWarn', e: e.id, warn: sk.warn });
    }
    if (e.stop) return; // frozen or stunned: no punches
    const pu = def.punch;
    if (pu && (e.punchT -= dt) <= 0) {
      const list = this.enemyTargets(e, pu.range);
      if (!list.length) e.punchT = 0.5;
      else {
        e.punchT = pu.every;
        const t = list[Math.floor(Math.random() * list.length)];
        this.events.push({ k: 'punch', e: e.id, x: r2(t.x), z: r2(t.z) });
        this.hurtTower(t, pu.dmg, true);
        this.knockTower(t, e, pu.knock);
      }
    }
  }

  /** VOID's punch sends tower `t` flying up to `dist` studs away from `from` (if there's room to land). */
  knockTower(t, from, dist) {
    const def = TOWERS[t.type];
    if (def.heli || !this.towers.has(t.id)) return;
    const d = Math.hypot(t.x - from.x, t.z - from.z) || 1;
    const dx = (t.x - from.x) / d;
    const dz = (t.z - from.z) / d;
    const others = [...this.towers.values()].filter((o) => o !== t);
    for (const f of [1, 0.75, 0.5, 0.25]) {
      const x = t.x + dx * dist * f;
      const z = t.z + dz * dist * f;
      if (!canPlace(x, z, others, def.placement)) continue;
      this.reposition(t, null, { radius: 0 }, x, z);
      return;
    }
  }

  /** VOID's marks count down; when one runs out its tower is destroyed (knocked out). */
  updateMarks(dt) {
    if (!this.marks.length) return;
    this.marks = this.marks.filter((k) => {
      const t = this.towers.get(k.tower);
      if (!t) return false; // sold
      k.x = t.x;
      k.z = t.z;
      if ((k.left -= dt) > 0) return true;
      if (t.hp > 0) {
        if (t.shieldHp) t.shieldHp = 0;
        this.knockOut(t);
      }
      this.events.push({ k: 'vMarkHit', id: k.id, tower: t.id, x: r2(t.x), z: r2(t.z) });
      return false;
    });
  }

  /** VOID's magic missiles float down the path; one that reaches the base hurts it. */
  updateOrbs(dt) {
    if (!this.orbs.length) return;
    this.orbs = this.orbs.filter((o) => {
      o.dist += o.speed * dt;
      if (o.dist < path.length) {
        path.at(o.dist, o, o.route);
        return true;
      }
      this.baseHp = Math.max(0, this.baseHp - o.dmg);
      this.events.push({ k: 'orbHit', id: o.id, d: o.dmg });
      if (this.baseHp <= 0) this.end(false);
      return false;
    });
  }

  /** VOID's sky laser: after its warning it burns the whole track, killing every unit on it. */
  updateLasers(dt) {
    if (!this.lasers.length) return;
    this.lasers = this.lasers.filter((l) => {
      if ((l.left -= dt) > 0) return true;
      const n = this.units.size;
      for (const u of [...this.units.values()]) this.destroyUnit(u, this.towers.get(u.tower) ?? null);
      this.events.push({ k: 'vLaser', n });
      return false;
    });
  }

  /** VOID's health ran out: he rises as a spirit with a void heart, and Guardians appear around him. */
  voidRise(boss) {
    this.riseBoss = null;
    const rise = ENEMIES[boss.type].rise;
    this.enemies.delete(boss.id);
    this.events.push({ k: 'decay', e: boss.id });
    this.reborn.push({ route: boss.route, type: rise.into, dist: boss.dist, lateral: 0, hpScale: 1, from: boss.type });
    for (let i = 0; i < rise.n; i++) {
      this.reborn.push({ route: boss.route, type: rise.guards, dist: Math.max(0, boss.dist - 4 - i * 3), lateral: (i - (rise.n - 1) / 2) * 2.5, hpScale: 1 });
    }
    this.events.push({ k: 'vRise', x: r2(boss.x), z: r2(boss.z) });
  }

  /** VOID is defeated: everything else fades away, and after a short finale the game is won. */
  voidDown(e) {
    for (const o of this.enemies.values()) this.events.push({ k: 'decay', e: o.id });
    this.enemies.clear();
    this.queue = [];
    this.wave.left = 0;
    this.reborn = [];
    this.orbs = [];
    this.marks = [];
    this.lasers = [];
    this.axes = [];
    this.puddles = [];
    this.finaleT = 5;
    this.events.push({ k: 'vDown', x: r2(e.x), z: r2(e.z) });
  }

  // ---------------------------------------------------------------- Void mode (2026-11-09 spec)

  /** Void armor: a shield worth `shield` of its max health, extra armor, slower, and tendrils (see DIFFICULTIES.void). */
  armorUp(e) {
    const va = this.voidArmor;
    e.vShieldMax = e.vShield = Math.max(1, Math.round(e.maxHp * va.shield));
    e.tendrilT = va.tendril.every * rand(0.3, 1);
  }

  /** Void armor tendrils lash up to `n` towers near the enemy while its shield holds. */
  voidTendrils(e, dt) {
    const td = this.voidArmor.tendril;
    if (e.stop || (e.tendrilT -= dt) > 0) return;
    const list = this.enemyTargets(e, td.range);
    if (!list.length) {
      e.tendrilT = 0.5;
      return;
    }
    e.tendrilT = td.every;
    const dmg = Math.min(td.max, Math.max(td.min, Math.round(Math.sqrt(e.maxHp) * td.mult)));
    const h = [];
    for (let i = 0; i < td.n && list.length; i++) {
      const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
      this.hurtTower(t, dmg, true);
      h.push([r2(t.x), r2(t.z)]);
    }
    this.events.push({ k: 'vTendril', e: e.id, h });
  }

  /** Air and cliff towers (Aviators, helicopters, Railgunners...): the False Void and Guardians can't reach them. */
  airTower(t) {
    const d = TOWERS[t.type];
    return !!(d.heli || d.orbit || d.flyingTower || d.placement === 'cliff' || d.placement === 'any');
  }

  /** Stuns every tower within `r` of (x, z) for `secs` s, even stun-immune ones (VOID). Returns how many. */
  hardStun(x, z, r, secs) {
    let n = 0;
    for (const t of this.towers.values()) {
      if (t.hp <= 0 || (t.x - x) ** 2 + (t.z - z) ** 2 > r * r || this.stealthy(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
      t.stunT = Math.max(t.stunT, secs);
      n++;
    }
    return n;
  }

  /** Void boss moves (def.vb, see ENEMIES): each on its own timer; one without `every` happens once. */
  voidBoss(e, def, dt) {
    const vb = def.vb;
    e.vbT ??= Object.fromEntries(Object.entries(vb).map(([k, m]) => [k, m.first ?? m.every]));
    if (e.stop) return;
    for (const k in vb) {
      if (e.vbT[k] == null || (e.vbT[k] -= dt) > 0) continue;
      const m = vb[k];
      const done = this.voidMove(e, k, m);
      e.vbT[k] = !done ? 0.5 : m.every ?? null; // nothing to hit yet: try again soon
    }
  }

  /** One Void boss move (see voidBoss). Returns false if it had nothing to do. */
  voidMove(e, k, m) {
    const ev = (extra) => this.events.push({ k: 'vMove', e: e.id, key: k, x: r2(e.x), z: r2(e.z), ...extra });
    const ground = (t) => !this.airTower(t);
    switch (k) {
      case 'slash': {
        // Guardian: an axe strike makes one ground tower bleed (no attacks, abilities or upgrades).
        const list = this.enemyTargets(e, m.range).filter(ground);
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) return true;
        t.bleedT = Math.max(t.bleedT || 0, m.time);
        ev({ tx: r2(t.x), tz: r2(t.z), tower: t.id, time: m.time });
        return true;
      }
      case 'shockwave':
      case 'stomp': {
        // False Void: a scream (huge radius) or a stomp; ground towers are stunned, units crushed.
        if (k === 'stomp' && !this.enemyTargets(e, m.radius).filter(ground).length) return false;
        const n = this.hexTowers(e.x, e.z, m.radius, 'stun', m.stun, true, ground);
        this.hurtUnitsNear(e.x, e.z, m.radius, m.unitDmg);
        ev({ r: m.radius, n, stun: m.stun });
        return true;
      }
      case 'summon': {
        // False Void: reaches into its body and pulls out Spawns (no cash).
        const cnt = m.n[0] + Math.floor(Math.random() * (m.n[1] - m.n[0] + 1));
        for (let i = 0; i < cnt; i++) {
          const type = m.list[Math.floor(Math.random() * m.list.length)];
          this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 2 - i * 1.5), lateral: (i - (cnt - 1) / 2) * 1.5, hpScale: 1, owner: e.id, noCash: true });
        }
        ev({ n: cnt });
        return true;
      }
      case 'abyss': {
        // VOID From the Abyss: a scream that stuns every tower (even stun-immune) and kills every unit.
        const n = this.hardStun(e.x, e.z, 1e4, m.stun);
        const u = this.units.size;
        for (const x of [...this.units.values()]) this.destroyUnit(x, this.towers.get(x.tower) ?? null);
        ev({ n, u, stun: m.stun });
        return true;
      }
      case 'corruption': {
        // VOID Corruption: a share of the attacking towers (and units) turn to his side for good.
        const list = [...this.towers.values()].filter((t) => !t.corrupt && !t.holo && TOWERS[t.type].kind !== 'income');
        const n = list.length ? Math.max(1, Math.round(list.length * m.share)) : 0;
        const ids = [];
        for (let i = 0; i < n; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          t.corrupt = true;
          this.removeUnitsOf(t.id); // its units go too
          ids.push(t.id);
        }
        const units = [...this.units.values()];
        const nu = Math.round(units.length * m.share);
        for (let i = 0; i < nu; i++) {
          const u = units.splice(Math.floor(Math.random() * units.length), 1)[0];
          this.destroyUnit(u, this.towers.get(u.tower) ?? null);
        }
        ev({ ids, u: nu });
        return true;
      }
      case 'devastation': {
        // VOID Devastation: only when a tower is near; stuns (even stun-immune) and hurts them.
        if (!this.enemyTargets(e, m.radius).length) return false;
        const n = this.hardStun(e.x, e.z, m.radius, m.stun);
        this.hurtTowers(e.x, e.z, m.radius, m.dmg, true);
        ev({ r: m.radius, n });
        return true;
      }
      case 'army': {
        // VOID Unforeseen Army: enemies appear all along the path (no cash).
        let n = 0;
        for (const [type, cnt] of m.list) {
          for (let i = 0; i < cnt; i++, n++) this.reborn.push({ type, dist: path.length * rand(0.08, 0.75), lateral: (Math.random() - 0.5) * 2, hpScale: 1, noCash: true });
        }
        ev({ n });
        return true;
      }
      case 'meteors': {
        // VOID Abyssal Strikedown: purple rocks rain down on towers; each one stuns what it lands on.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (const [dmg, r, cnt] of m.rocks) {
          for (let i = 0; i < cnt; i++) {
            const t = list[Math.floor(Math.random() * list.length)];
            const x = t.x + (Math.random() - 0.5) * 3;
            const z = t.z + (Math.random() - 0.5) * 3;
            const d = m.flight + Math.random() * 1.5;
            this.axes.push({ x, z, left: d, r, stun: m.stun, hard: true, dmg, kind: 'voidRock' });
            h.push([r2(x), r2(z), r2(d), r]);
          }
        }
        ev({ h });
        return true;
      }
      case 'telekinesis': {
        // VOID Telekinesis: with 2+ Warships out he lifts some and destroys them; meanwhile every tower is slowed.
        const ships = [...this.towers.values()].filter((t) => t.hp > 0 && /warship/i.test(t.type));
        if (ships.length < m.min) return false;
        const h = [];
        for (let i = 0; i < m.n && ships.length; i++) {
          const t = ships.splice(Math.floor(Math.random() * ships.length), 1)[0];
          if (t.shieldHp) t.shieldHp = 0;
          this.knockOut(t);
          h.push([r2(t.x), r2(t.z)]);
        }
        this.slowTowers(e.x, e.z, 1e4, m.slow, m.time, false);
        ev({ h, slow: m.slow, time: m.time });
        return true;
      }
    }
    return this.hcMove(e, k, m); // Hardcore bosses
  }

  // ---------------------------------------------------------------- Hardcore mode (2026-11-09 spec)

  /**
   * Hardcore abilities that run every tick (see hardcore.js): Drop Pods opening, Jammers, Dispensers,
   * Void Cultist beacons, the Crystalian's tank shell, the Grand Eye relaxing its defense, Soul
   * Stealer hiding, and the Void Reaver / Void Caster pair. Runs before the enemy moves this tick.
   * Returns 'gone' if the enemy left the map (a pod burst open).
   */
  hcAttacks(e, def, dt) {
    e.ageT = (e.ageT || 0) + dt;
    const pd = def.pod;
    if (pd && (e.podT -= dt) <= 0) {
      // A Drop Pod bursts open: out come its enemies, and the pod blows up.
      this.enemies.delete(e.id);
      let j = 0;
      for (const [type, n] of pd.list) for (let i = 0; i < n; i++, j++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - j * 0.7), lateral: ((j % 3) - 1) * 1.2, hpScale: 1, from: e.type });
      this.events.push({ k: 'decay', e: e.id });
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: 4, c: 0xd500f9 });
      return 'gone';
    }
    if (def.jam) this.weakenTowers(e.x, e.z, def.jam.radius, 0, 0.4); // Jammer: no abilities near it
    const dp = def.dispense;
    if (dp && !e.stop && (e.dispT = (e.dispT ?? dp.every) - dt) <= 0) {
      // Dispenser: the enemies around it get extra shield (never more than their max health).
      e.dispT = dp.every;
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > dp.radius * dp.radius) continue;
        o.osh = Math.min(o.maxHp, (o.osh || 0) + dp.shield + o.maxHp * dp.pct);
        o.oshMax = Math.max(o.oshMax || 0, o.osh);
      }
      this.events.push({ k: 'dHeal', x: r2(e.x), z: r2(e.z), r: dp.radius });
    }
    const bc = def.beacon;
    if (bc && !e.stop && (e.beaconT = (e.beaconT ?? bc.every * 0.5) - dt) <= 0) {
      // Void Cultist: a Healing Beacon on the ground heals the enemies standing in it.
      e.beaconT = bc.every;
      this.zones.push({ kind: 'heal', x: e.x, z: e.z, r: bc.radius, left: bc.life, speed: 0, heal: bc.heal, by: e.id });
      this.events.push({ k: 'trail', x: r2(e.x), z: r2(e.z), r: bc.radius, life: bc.life, c: bc.color });
    }
    if (def.tank) {
      // Crystalian: every hit does 1 damage, except while it's attacking (crystalLaser opens it up).
      if (e.openT > 0) e.openT = Math.max(0, e.openT - dt);
      e.pure = !(e.openT > 0);
    }
    if (def.relax && e.ageT >= def.relax.after && !e.relaxed) {
      e.relaxed = true;
      e.defense = def.relax.defense; // Grand Eye: 40 defense when it spawns, then 15
    }
    if (e.hideT > 0 && (e.hideT -= dt) <= 0) {
      e.cloak = false; // Soul Stealer: visible again
      e.hidden = !!def.hidden;
    }
    if (e.harvestT > 0) {
      e.harvestT -= dt; // Emperor's Harvest: heals while the beams are in
      e.hp = Math.min(e.maxHp, e.hp + e.harvestHeal * dt);
    }
    if (e.ruptT > 0 && (e.ruptT -= dt) <= 0) {
      // Void Rupture: the giant circular slash, unless enough damage stopped the charge.
      const m = def.vb.rupture;
      const taken = e.ruptHp - (e.hp + (e.osh || 0));
      if (taken >= m.cancel) this.events.push({ k: 'hcMove', e: e.id, key: 'ruptureCancel', x: r2(e.x), z: r2(e.z) });
      else {
        const n = this.hexTowers(e.x, e.z, 1e5, 'stun', m.bigStun, true);
        this.hurtUnits(m.unitDmg);
        this.events.push({ k: 'hcMove', e: e.id, key: 'ruptureSlash', x: r2(e.x), z: r2(e.z), n, stun: m.bigStun });
      }
    }
    if (def.pair || def.rageAt) this.hcPair(e, def, dt);
  }

  /**
   * The Void Reaver and Void Caster. The Reaver below `wrathAt` health: Void's Wrath (a short stop,
   * faster, Void Rupture unlocked, and the Caster appears). The Caster can't be targeted or hurt
   * while the Reaver stands. When the Reaver falls she revives him (`reviveTime` s, at `reviveHp`),
   * and she can be hit meanwhile. When she dies, he comes back at `deathwishHp` in Deathwish: very
   * fast, no abilities. He only dies for good once she's gone.
   */
  hcPair(e, def, dt) {
    if (def.rageAt && !e.raging && e.hp <= e.maxHp * def.rageAt) {
      e.raging = true; // Void Caster Rage: hood up, horns out, slower
      e.baseSpeed *= def.rageSpeed;
      this.events.push({ k: 'hcRage', e: e.id });
    }
    if (def.rageAt) {
      // The Caster: protected while her Reaver stands.
      const rv = this.enemies.get(e.owner);
      e.noTarget = !!(rv && !(rv.downT > 0) && !rv.deathwish);
      return;
    }
    const pr = def.pair;
    if (!e.wrath && e.hp <= e.maxHp * pr.wrathAt) this.reaverWrath(e, pr);
    if (e.downT > 0) {
      e.speed = 0;
      if ((e.downT -= dt) <= 0) {
        // Revived by the Caster.
        e.downT = 0;
        e.noTarget = false;
        e.hp = Math.min(e.maxHp, pr.reviveHp);
        this.events.push({ k: 'hcRevive', e: e.id });
      }
    }
    if (e.deathwish && !e.stop) e.speed = pr.deathwishSpeed; // Deathwish: runs for the base
  }

  /** Void Reaver Void's Wrath: stops for a moment, rips off its mask, gets faster and calls the Void Caster. */
  reaverWrath(e, pr) {
    e.wrath = true;
    e.shutT = Math.max(e.shutT || 0, 2);
    e.baseSpeed *= pr.wrathSpeed;
    if (!this.casterOf(e)) this.reborn.push({ route: e.route, type: pr.caster, dist: Math.max(0, e.dist - 4), lateral: 3, hpScale: 1, owner: e.id, from: e.type });
    this.events.push({ k: 'hcWrath', e: e.id });
  }

  /** The Void Caster protecting Void Reaver `e` (alive, or about to spawn), or null. */
  casterOf(e) {
    const type = ENEMIES[e.type].pair.caster;
    for (const o of this.enemies.values()) if (o.owner === e.id && o.type === type) return o;
    return this.reborn.find((r) => r.owner === e.id && r.type === type) ?? null;
  }

  /**
   * Called when a Hardcore pair boss runs out of health. Returns true if it doesn't die (the
   * Reaver is downed for the Caster to revive, or comes back in Deathwish when she falls).
   */
  pairDeath(e, def) {
    if (def.pair && !e.deathwish) {
      if (!e.wrath) this.reaverWrath(e, def.pair); // killed in one go: she still comes
      e.hp = 1;
      if (e.downT > 0) return true;
      e.downT = def.pair.reviveTime;
      e.noTarget = true;
      for (const t of this.towers.values()) if (t.curseBy === e.id) t.curseBy = 0; // Void Judgement ends at 0 health
      this.events.push({ k: 'hcDown', e: e.id, t: def.pair.reviveTime });
      return true;
    }
    if (def.rageAt) {
      // The Caster falls: her Reaver instantly comes back in Deathwish.
      const rv = this.enemies.get(e.owner);
      if (rv && ENEMIES[rv.type].pair) {
        const pr = ENEMIES[rv.type].pair;
        rv.downT = 0;
        rv.noTarget = false;
        rv.deathwish = true;
        rv.hp = Math.min(rv.maxHp, pr.deathwishHp);
        this.events.push({ k: 'hcDeathwish', e: rv.id });
      }
    }
    return false;
  }

  /** Demise's pink mist: towers within `r` of (x, z) drop one level (no refund). Returns how many. */
  downgradeTowers(x, z, r) {
    let n = 0;
    for (const t of this.towers.values()) {
      if (t.level <= 0 || t.holo || (t.x - x) ** 2 + (t.z - z) ** 2 > r * r || this.stealthy(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
      const def = TOWERS[t.type];
      if (def.cross || !def.levels[t.level - 1]) continue; // crosspath towers keep their levels
      t.spent = Math.max(0, t.spent - (def.levels[t.level].cost ?? 0));
      t.level--;
      this.setTowerLevelHp(t);
      this.events.push({ k: 'hcDowngrade', id: t.id, x: r2(t.x), z: r2(t.z) });
      n++;
    }
    return n;
  }

  /** Puts `n` enemies of `type` next to enemy `e` (summons: no cash). */
  summonNear(e, type, n, spread = 1.5, extra = {}) {
    for (let i = 0; i < n; i++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 1.5 - i * spread), lateral: (i % 3 - 1) * 2, hpScale: 1, owner: e.id, noCash: true, ...extra });
  }

  /** Every working tower in a straight line ahead of `e` (see towersInLine) gets `fn(t)`. Returns how many. */
  lineHit(e, length, width, fn) {
    const list = this.towersInLine(e, length, width).filter((t) => !(buffOf(this.buffs, t.id).invuln || t.invulnT > 0));
    for (const t of list) fn(t);
    return list.length;
  }

  /** Towers deal `amt` less damage for `secs` s (the strongest weakness counts). */
  weakTower(t, amt, secs) {
    t.weakAmt = t.weakT > 0 ? Math.max(t.weakAmt, amt) : amt;
    t.weakT = Math.max(t.weakT || 0, secs);
  }

  /** Hardcore boss moves on their own timers (def.vb, see voidBoss). Returns false if it had nothing to do. */
  hcMove(e, k, m) {
    const ev = (extra) => this.events.push({ k: 'hcMove', e: e.id, key: k, x: r2(e.x), z: r2(e.z), ...extra });
    if (e.downT > 0 || e.deathwish || e.shutT > 0) return false; // downed, Deathwish or Void's Wrath: no abilities
    switch (k) {
      // ------------------------------------------------ Soul Stealer
      case 'curseTower': {
        const cursed = [...this.towers.values()].filter((t) => t.curseBy === e.id).length;
        if (cursed >= m.max) return false;
        const list = this.enemyTargets(e, m.range).filter((t) => !t.curseBy && !t.holo);
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        t.curseBy = e.id;
        this.summonNear(e, m.soul, 1);
        ev({ tx: r2(t.x), tz: r2(t.z) });
        return true;
      }
      case 'soulSummon': {
        this.summonNear(e, m.souls, m.n);
        this.summonNear(e, m.eye, 1, 1, { lateral: 4 });
        e.hidden = e.cloak = true;
        e.hideT = m.hide;
        ev({ n: m.n });
        return true;
      }
      // ------------------------------------------------ Void Reaver
      case 'cursedBlade': {
        // A straight shockwave: towers it crosses deal less damage and lose range for a while.
        const n = this.lineHit(e, m.length, m.width, (t) => {
          this.weakTower(t, m.weak, m.time);
          t.smoke = Math.max(t.smoke, m.time);
        });
        this.summonNear(e, m.soul, m.souls, 1);
        ev({ len: m.length, dx: r2(e.dx), dz: r2(e.dz), n });
        return true;
      }
      case 'judgement': {
        // Six towers are cursed: they can't attack until the Reaver hits 0 health.
        const list = this.openTowers().filter((t) => !t.curseBy && !t.holo);
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          t.curseBy = e.id;
          h.push([r2(t.x), r2(t.z)]);
        }
        ev({ h });
        return true;
      }
      case 'unnervingGaze': {
        // Stabs the ground: three portals, a Void Eye from each.
        for (let i = 0; i < m.n; i++) this.reborn.push({ route: e.route, type: m.eye, dist: Math.max(0, e.dist - 2 - i * 3), lateral: (i - 1) * 4, hpScale: 1, owner: e.id, noCash: true });
        ev({ n: m.n });
        return true;
      }
      case 'rupture': {
        // Void Rupture (after Void's Wrath): three slashes stun towers near it, then it charges a
        // giant circular slash. Dealing `cancel` damage while it charges stops it.
        if (m.wrath && !e.wrath) return false;
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        e.ruptT = m.charge;
        e.ruptHp = e.hp + (e.osh || 0);
        e.shutT = Math.max(e.shutT || 0, m.charge);
        ev({ r: m.range, n, charge: m.charge, cancel: m.cancel });
        return true;
      }
      // ------------------------------------------------ Void Caster
      case 'casterShield': {
        const rv = this.enemies.get(e.owner);
        if (!rv || rv.downT > 0) return false;
        rv.osh = Math.max(rv.osh || 0, m.shield);
        rv.oshMax = Math.max(rv.oshMax || 0, rv.osh);
        rv.hp = Math.min(rv.maxHp, rv.hp + rv.maxHp * m.heal);
        ev({ tx: r2(rv.x), tz: r2(rv.z) });
        return true;
      }
      case 'casterPortal': {
        // A portal next to her spits out `n` enemies over `time` s.
        for (let i = 0; i < m.n; i++) {
          const type = m.list[Math.floor(Math.random() * m.list.length)];
          this.queue.push({ t: this.wave.t + 0.5 + (i * m.time) / m.n, type, dist: Math.max(0, e.dist - 2), noCash: true });
        }
        this.queue.sort((a, b) => a.t - b.t);
        this.wave.left = this.queue.length;
        ev({ n: m.n, time: m.time });
        return true;
      }
      // ------------------------------------------------ Emperor
      case 'finalEradication': {
        // Poleaxe slam: every unit is destroyed and every tower stunned.
        const n = this.hexTowers(e.x, e.z, 1e5, 'stun', m.stun, true);
        const u = this.units.size;
        for (const x of [...this.units.values()]) this.destroyUnit(x, this.towers.get(x.tower) ?? null);
        ev({ n, u });
        return true;
      }
      case 'chronoStasis': {
        // Time slows to a crawl (towers nearly stop), an orb hits the base, and he leaps ahead untouchable.
        this.slowTowers(e.x, e.z, 1e5, m.slow, m.time, false);
        e.invulnT = Math.max(e.invulnT || 0, m.time);
        e.dist = Math.min(path.length - 3, e.dist + m.leap);
        this.baseHp = Math.max(1, this.baseHp - m.baseDmg); // (it can't end the game on its own)
        ev({ time: m.time, d: m.baseDmg });
        return true;
      }
      case 'encore': {
        let j = 0;
        for (const [type, n] of m.list) for (let i = 0; i < n; i++, j++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 3 - j * 1.2), lateral: ((j % 3) - 1) * 3, hpScale: 1, owner: e.id, noCash: true, from: e.type });
        ev({ n: j });
        return true;
      }
      case 'divineProtection': {
        e.osh = Math.min(m.max, (e.osh || 0) + m.shield);
        e.oshMax = Math.max(e.oshMax || 0, e.osh);
        for (const x of [...this.units.values()]) if ((x.x - e.x) ** 2 + (x.z - e.z) ** 2 <= m.units * m.units) this.destroyUnit(x, this.towers.get(x.tower) ?? null);
        const n = this.slowTowers(e.x, e.z, m.range, m.slow, m.time);
        ev({ r: m.range, n });
        return true;
      }
      case 'meteoricSwarm': {
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n; i++) {
          const t = list[Math.floor(Math.random() * list.length)];
          const x = t.x + (Math.random() - 0.5) * 3;
          const z = t.z + (Math.random() - 0.5) * 3;
          const d = 1.2 + Math.random() * 1.5;
          this.axes.push({ x, z, left: d, r: m.radius, stun: m.stun, dmg: m.dmg, kind: 'missile' });
          h.push([r2(x), r2(z), r2(d)]);
        }
        ev({ h, r: m.radius });
        return true;
      }
      case 'corruptingBlast': {
        // Takes over towers for a while (they can't fight) and destroys a few units.
        const list = this.openTowers().filter((t) => !t.holo && TOWERS[t.type].kind !== 'income');
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
          t.bleedT = Math.max(t.bleedT || 0, m.time);
          h.push([r2(t.x), r2(t.z)]);
        }
        const units = [...this.units.values()];
        for (let i = 0; i < m.units && units.length; i++) {
          const u = units.splice(Math.floor(Math.random() * units.length), 1)[0];
          this.destroyUnit(u, this.towers.get(u.tower) ?? null);
        }
        ev({ h, time: m.time });
        return true;
      }
      case 'harvest': {
        // Beams into up to `n` towers: damage and less range, while he heals.
        const list = this.openTowers();
        if (!list.length) return false;
        list.sort((a, b) => b.spent - a.spent || a.id - b.id);
        const hit = list.slice(0, m.n);
        for (const t of hit) {
          this.hurtTower(t, m.dmg, true);
          t.smoke = Math.max(t.smoke, m.smoke);
        }
        e.harvestT = m.time;
        e.harvestHeal = m.heal;
        ev({ h: hit.map((t) => [r2(t.x), r2(t.z)]) });
        return true;
      }
      case 'execution': {
        // A slap that instantly knocks out a pricey tower close by, shields or not.
        const list = this.enemyTargets(e, m.range).filter((t) => t.spent >= m.min && !t.holo);
        if (!list.length) return false;
        list.sort((a, b) => b.spent - a.spent);
        const t = list[0];
        if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) return false;
        if (t.shieldHp) t.shieldHp = 0;
        this.knockOut(t);
        ev({ tx: r2(t.x), tz: r2(t.z) });
        return true;
      }
      case 'overdrive': {
        e.dist = Math.min(path.length - 3, e.dist + m.dist); // Nova's Overdrive: glides ahead
        ev({});
        return true;
      }
    }
    return false;
  }

  /** Insane mode trails and smoke fade away. Hardcore healing beacons heal the enemies in them. */
  updateZones(dt) {
    if (!this.zones.length) return;
    for (const z of this.zones) {
      if (z.kind !== 'heal') continue;
      for (const o of this.enemies.values()) {
        if (o.remains || o.hp >= o.maxHp || (o.x - z.x) ** 2 + (o.z - z.z) ** 2 > z.r * z.r) continue;
        o.hp = Math.min(o.maxHp, o.hp + z.heal * dt);
      }
    }
    this.zones = this.zones.filter((z) => (z.left -= dt) > 0);
  }

  /** Beholder time bombs tick down; one that runs out blows up its tower (and those around it). */
  updateBombs(dt) {
    if (!this.bombs.length) return;
    this.bombs = this.bombs.filter((b) => {
      if (!this.towers.has(b.tower)) {
        this.events.push({ k: 'defused', id: b.id, x: r2(b.x), z: r2(b.z), quiet: 1 }); // its tower was sold
        return false;
      }
      if ((b.left -= dt) > 0) return true;
      this.hurtTowers(b.x, b.z, b.r, b.dmg);
      this.events.push({ k: 'tbBoom', id: b.id, x: r2(b.x), z: r2(b.z), r: b.r });
      return false;
    });
  }

  /**
   * The Beholder, low on health, pulls everyone into the time dimension: every tower is sold (its
   * owner gets the usual sell value), every other enemy is left behind, and the map becomes one
   * long straight path. The Beholder starts again from the entrance with its sword drawn, and
   * waits a few seconds so players can build again.
   */
  timeShift(boss) {
    this.shiftBoss = null;
    const sh = ENEMIES[boss.type].shift;
    for (const t of [...this.towers.values()]) {
      // Expert Beholder's Field: towers are refunded (`refund` of what they cost).
      const value = t.holo ? 0 : sh.refund != null ? Math.floor(t.spent * sh.refund) : Math.floor(t.spent * (TOWERS[t.type].sellRatio ?? GAME.sellRatio) * (1 + buffOf(this.buffs, t.id).sell));
      const p = this.players.get(t.owner);
      if (p) p.cash += value;
      this.removeTower(t, 'sell', { value });
    }
    for (const e of this.enemies.values()) this.events.push({ k: 'decay', e: e.id });
    this.enemies.clear();
    this.units.clear();
    this.traps.clear();
    this.queue = [];
    this.wave.left = 0;
    this.zones = [];
    this.puddles = [];
    this.axes = [];
    this.bombs = [];
    this.shells = [];
    this.flights = [];
    this.blades = [];
    this.rings = [];
    this.sweeps = [];
    this.reborn = [];
    this.holos = [];
    this.timeWorld = true;
    setTimeWorld(true);
    const e = this.spawn(sh.into ?? 'beholderTime', { dist: 0 });
    e.maxHp = boss.maxHp;
    e.hp = sh.heal ? e.maxHp : Math.max(boss.hp, boss.maxHp * sh.at * 0.5); // a lucky overkill still leaves a fight
    if (sh.heal) e.shutT = 8; // (Expert enemies don't use the Insane speed rules that read waitT)
    else e.waitT = 8;
    this.events.push({ k: 'timeShift', e: e.id, wait: 8, into: sh.into ?? 'beholderTime' });
  }

  /**
   * Hardcore: the Beholder was beaten in its Field. Everyone goes back to the real map: towers built
   * in the Field are refunded in full (they wouldn't fit the real map), and the next break is longer.
   */
  endTimeShift() {
    if (!this.timeWorld) return;
    for (const t of [...this.towers.values()]) {
      const value = t.holo ? 0 : Math.floor(t.spent);
      const p = this.players.get(t.owner);
      if (p) p.cash += value;
      this.removeTower(t, 'sell', { value });
    }
    this.units.clear();
    this.traps.clear();
    this.timeWorld = false;
    setTimeWorld(false);
    this.breakBonus = 20;
    this.events.push({ k: 'timeShiftEnd' });
  }

  /** Rebirther Blood Sacrifice: selling a tower hurts it (by `sellDmg` x what was spent on the tower). */
  sellSacrifice(t) {
    for (const e of [...this.enemies.values()]) {
      if (!e.sacrificing) continue;
      const dmg = Math.round(t.spent * ENEMIES[e.type].sacrifice.sellDmg);
      if (!(dmg > 0)) continue;
      this.events.push({ k: 'xSellHit', e: e.id, x: r2(e.x), z: r2(e.z), d: dmg });
      this.bloodPass = true;
      try {
        this.damage(null, e, dmg, true, 'none');
      } finally {
        this.bloodPass = false;
      }
    }
  }

  /** Every working tower enemies can target, anywhere on the map (Scarecrows don't draw these attacks). */
  openTowers() {
    return [...this.towers.values()].filter((t) => t.hp > 0 && !this.stealthy(t));
  }

  /**
   * Expert mode enemy abilities (see the Expert mode comment in ENEMIES): Taint poison smog, and the
   * Overlord's stomp, scepter beam and one-time missile barrage.
   */
  expertAttacks(e, def, dt) {
    const sg = def.smog;
    if (sg && (e.smogT -= dt) <= 0) {
      // The cloud is left behind even while it's stunned; it hurts towers, never enemies.
      e.smogT = sg.every;
      this.puddles.push({ x: e.x, z: e.z, r: sg.radius, dps: sg.dps, left: sg.life });
      this.events.push({ k: 'smog', x: r2(e.x), z: r2(e.z), r: sg.radius, life: sg.life });
    }
    const bg = def.barrage;
    if (bg && !e.barraged && e.hp <= e.maxHp * bg.at) {
      // Once: missiles fall from the sky on random towers all over the map.
      e.barraged = true;
      const list = this.openTowers();
      const hits = [];
      for (let i = 0; i < bg.n && list.length; i++) {
        const t = list[i < list.length ? i : Math.floor(Math.random() * list.length)];
        const x = t.x + (i < list.length ? 0 : (Math.random() - 0.5) * 6);
        const z = t.z + (i < list.length ? 0 : (Math.random() - 0.5) * 6);
        const d = bg.flight + Math.random() * 1.5;
        this.axes.push({ x, z, left: d, r: bg.radius, stun: 0, dmg: bg.dmg, kind: 'missile' });
        hits.push([r2(x), r2(z), r2(d)]);
      }
      this.events.push({ k: 'barrage', e: e.id, h: hits, r: bg.radius });
    }
    if (e.stop) return; // frozen or stunned enemies don't attack
    const st = def.stomp;
    if (st && (e.stompT -= dt) <= 0) {
      if (this.enemyTargets(e, st.range).length) {
        e.stompT = st.every;
        this.hurtTowers(e.x, e.z, st.range, st.dmg, true);
        this.events.push({ k: 'stomp', e: e.id, x: r2(e.x), z: r2(e.z), r: st.range });
      } else e.stompT = 0.5;
    }
    const bm = def.beam;
    if (bm && (e.beamT -= dt) <= 0) {
      const list = this.openTowers();
      if (list.length) {
        e.beamT = bm.every;
        for (const t of list) this.hurtTowers(t.x, t.z, 0.01, bm.dmg, true);
        this.events.push({ k: 'oBeam', e: e.id, h: list.map((t) => [r2(t.x), r2(t.z)]) });
      } else e.beamT = 1;
    }
  }

  /**
   * Expert mode (2026-11-09 spec): Time Runner dashes, the Rebirther's Blood Sacrifice, the Death
   * Angel drawing its staff, and the boss moves (`moves`): every `every` s a boss picks one of its
   * moves at random (by weight `w`). Rebirther: Violet Call, Blood Rain, Ritual. Death Angel:
   * Twirl, Blood Assembly, Pure Pain. Beholder: Time Snap, Reality Tear, Time Paradox.
   */
  expertMoves(e, def, dt) {
    const sp = def.sprint;
    if (sp && !e.stop && (e.sprintT -= dt) <= 0) {
      e.sprintT = sp.every;
      e.sprinting = sp.time;
      this.events.push({ k: 'dash', e: e.id });
      if (sp.stun) {
        // Hardcore Skeleton Rogues: the sword swing that starts the dash stuns the towers around it.
        const n = this.hexTowers(e.x, e.z, sp.stun.range, 'stun', sp.stun.time, true);
        if (n) this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: sp.stun.range, n, name: def.name, c: 0x64b5f6 });
      }
    }
    const sac = def.sacrifice;
    if (sac && !e.sacrificing && e.hp <= e.maxHp * sac.at) {
      // Blood Sacrifice: sits down in its blood bowl for good and shrugs off almost everything.
      e.sacrificing = true;
      e.baseSpeed = 0;
      this.events.push({ k: 'xSacrifice', e: e.id, x: r2(e.x), z: r2(e.z) });
    }
    const un = def.unsheathe;
    if (un && !e.unsheathed) {
      if (e.hp > e.maxHp * un.at) return;
      // Death Angel: flies up and draws its staff; from now on it attacks.
      e.unsheathed = true;
      e.shutT = Math.max(e.shutT || 0, un.time);
      e.moveT = Math.max(e.moveT, un.time + 1);
      this.events.push({ k: 'xUnsheathe', e: e.id });
    }
    const mv = def.moves;
    if (!mv || e.noMoves || e.stop || e.shutT > 0 || e.tauntT > 0 || (e.moveT -= dt) > 0) return;
    // Time Paradox: never the first move, and at least `gap` other moves between two of them.
    // Insane `once` moves (Berserker Hammer Smash) are used one time only, even after a shield breaks.
    const list = mv.list.filter((m) => (m.key !== 'timeParadox' || (e.movesDone > 0 && e.sinceParadox >= (m.gap ?? 3))) && !(m.once && e.carry[m.key]));
    if (!list.length) {
      e.moveT = 1e9;
      return;
    }
    let roll = Math.random() * list.reduce((n, m) => n + (m.w ?? 1), 0);
    const m = list.find((x) => (roll -= x.w ?? 1) <= 0) ?? list[0];
    if (!this.bossMove(e, m)) {
      e.moveT = 0.5; // nothing to hit yet
      return;
    }
    e.moveT = mv.every * (e.despair ? 0.6 : 1); // Overlord Despair: attacks more often
    if (m.once) e.carry[m.key] = true;
    e.movesDone++;
    e.sinceParadox = m.key === 'timeParadox' ? 0 : e.sinceParadox + 1;
  }

  // ---------------------------------------------------------------- Insane mode (2026-11-09 spec)

  /**
   * Insane mode abilities that change how an enemy moves (runs before it moves this tick): Field
   * Medic / Mothership heal pulses, the Engineer building its MK11-Device and waiting by it, the
   * Overlord's Taunt, Backup (Amplifiers) and Despair, and The Vanguard's Hammer Throw.
   */
  insanePace(e, def, dt) {
    if (e.speedBoost) e.speed *= e.speedBoost; // Hammer Throw, Despair
    const hp = def.healPulse;
    if (hp && !e.stop && (e.healT -= dt) <= 0) {
      e.healT = hp.every;
      let n = 0;
      for (const o of this.enemies.values()) {
        const top = o.maxHp * (hp.over ?? 1);
        if (o === e || o.remains || o.hp >= top || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > hp.radius * hp.radius) continue;
        o.hp = Math.min(top, o.hp + (hp.pct ? o.maxHp * hp.pct : hp.hp));
        n++;
      }
      if (n) this.events.push({ k: 'dHeal', x: r2(e.x), z: r2(e.z), r: hp.radius });
    }
    const bd = def.build;
    if (bd) {
      if (e.buildT > 0 && !e.stop && (e.buildT -= dt) <= 0) {
        // Engineer: builds an MK11-Device right ahead of itself, then waits by it.
        e.carry.built = true;
        e.building = true;
        this.reborn.push({ route: e.route, type: bd.type, dist: e.dist + 2, lateral: e.lateral, hpScale: 1, owner: e.id, buildOf: e.carry, from: e.type });
        this.events.push({ k: 'iBuild', e: e.id, x: r2(e.x), z: r2(e.z) });
      }
      if (e.carry.built && e.building !== false) {
        // It stands still until its device is destroyed (the shield form's device counts too).
        let alive = false;
        for (const o of this.enemies.values()) if (o.buildOf === e.carry) alive = true;
        for (const r of this.reborn) if (r.buildOf === e.carry) alive = true;
        e.building = alive;
      }
      if (e.building) e.speed = 0;
    }
    if (def.taunt && e.tauntT > 0) {
      e.tauntT = Math.max(0, e.tauntT - dt);
      e.speed = 0;
    }
    const bk = def.backup;
    if (bk && !e.backedUp && e.hp <= e.maxHp * bk.at) {
      // Overlord Backup: two Amplifiers appear beside him and keep healing him.
      e.backedUp = true;
      for (let i = 0; i < bk.n; i++) this.reborn.push({ route: e.route, type: bk.type, dist: Math.max(0, e.dist - 2), lateral: (i % 2 ? 1 : -1) * 4, hpScale: 1, owner: e.id, from: e.type });
      this.events.push({ k: 'iBackup', e: e.id, n: bk.n });
    }
    const ds = def.despair;
    if (ds && e.backedUp && !e.despair) {
      let amps = 0;
      for (const o of this.enemies.values()) if (o.owner === e.id && o.type === bk.type) amps++;
      for (const r of this.reborn) if (r.owner === e.id && r.type === bk.type) amps++;
      if (!amps) {
        // Despair: much faster and tougher, and Vengeful Champions come out of the entrance.
        e.despair = true;
        e.speedBoost = ds.speed;
        e.carry.defense = ds.defense;
        e.carry.maxHit = ds.maxHit;
        for (let i = 0; i < ds.n; i++) this.reborn.push({ type: ds.summon, dist: 0, lateral: (i - (ds.n - 1) / 2) * 2, hpScale: 1 });
        this.events.push({ k: 'iDespair', e: e.id });
      }
    }
    const th = def.throwAt;
    if (th && !e.carry.thrown && e.hp <= e.maxHp * th.at) {
      // The Vanguard throws its hammer away: runs faster, but no more abilities.
      e.carry.thrown = true;
      e.speedBoost = th.speed;
      e.noMoves = true;
      this.events.push({ k: 'iThrow', e: e.id, x: r2(e.x), z: r2(e.z) });
    }
  }

  /** Towers `e` could hit in a line `length` long and `width` wide, straight ahead along the path. */
  towersInLine(e, length, width) {
    return this.openTowers().filter((t) => {
      const ax = t.x - e.x;
      const az = t.z - e.z;
      const along = ax * e.dx + az * e.dz;
      const side = Math.abs(ax * e.dz - az * e.dx);
      return along >= -1 && along <= length && side <= width;
    });
  }

  /** Stuns tower `t` (and anything within `r` of it) for `secs` s; returns how many were stunned. */
  stunAt(t, r, secs) {
    return this.hexTowers(t.x, t.z, Math.max(0.01, r), 'stun', secs, true);
  }

  /** Boss move `m` of enemy `e` (see expertMoves). Returns false if it had nothing to do. */
  bossMove(e, m) {
    const ev = (extra) => this.events.push({ k: 'xMove', e: e.id, key: m.key, x: r2(e.x), z: r2(e.z), ...extra });
    switch (m.key) {
      case 'violetCall': {
        // Rebirther: Scarlets step out next to it (they still give cash).
        for (let i = 0; i < m.n; i++) this.reborn.push({ route: e.route, type: m.summon, dist: Math.max(0, e.dist - 1.5 - i * 1.5), lateral: (i - (m.n - 1) / 2) * 2, hpScale: 1, owner: e.id });
        ev({ n: m.n });
        return true;
      }
      case 'bloodRain': {
        // Rebirther: a drop of blood on every tower: a little damage and a stun.
        const list = this.openTowers();
        if (!list.length) return false;
        for (const t of list) this.hurtTower(t, m.dmg, true);
        const n = this.hexTowers(e.x, e.z, 1e5, 'stun', m.stun, true);
        ev({ n, h: list.map((t) => [r2(t.x), r2(t.z)]) });
        return true;
      }
      case 'ritual': {
        // Rebirther: kills one tower.
        const list = this.openTowers();
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        if (t.shieldHp) t.shieldHp = 0;
        this.knockOut(t);
        ev({ tx: r2(t.x), tz: r2(t.z), id: t.id });
        return true;
      }
      case 'twirl': {
        // Death Angel: spins, a shockwave that hurts and stuns the towers around it.
        if (!this.enemyTargets(e, m.range).length) return false;
        this.hurtTowers(e.x, e.z, m.range, m.dmg, true);
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        ev({ r: m.range, n });
        return true;
      }
      case 'bloodAssembly': {
        // Death Angel: blood orbs drop on random towers, hurting them and the towers next to them.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n; i++) {
          const t = list[Math.floor(Math.random() * list.length)];
          const d = m.flight + i * 0.15;
          this.axes.push({ x: t.x, z: t.z, left: d, r: m.radius, stun: 0, dmg: m.dmg, kind: 'bloodOrb' });
          h.push([r2(t.x), r2(t.z), r2(d)]);
        }
        ev({ h, r: m.radius });
        return true;
      }
      case 'purePain': {
        // Death Angel: thrusts its staff: huge damage all around it, and shields can't block it.
        const list = this.enemyTargets(e, m.range);
        if (!list.length) return false;
        for (const t of list) this.hurtTower(t, m.dmg, true, true);
        ev({ r: m.range, n: list.length });
        return true;
      }
      case 'timeSnap': {
        // Beholder: a finger snap, a shockwave that hurts and stuns the towers near it.
        if (!this.enemyTargets(e, m.range).length) return false;
        this.hurtTowers(e.x, e.z, m.range, m.dmg, true);
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        ev({ r: m.range, n });
        return true;
      }
      case 'realityTear': {
        // Beholder: an orb that bursts into many small orbs, each landing on a random tower.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n; i++) {
          const t = list[Math.floor(Math.random() * list.length)];
          const x = t.x + (Math.random() - 0.5) * 2;
          const z = t.z + (Math.random() - 0.5) * 2;
          const d = m.flight + Math.random() * 0.8;
          this.axes.push({ x, z, left: d, r: m.radius, stun: 0, dmg: m.dmg, kind: 'tearOrb' });
          h.push([r2(x), r2(z), r2(d)]);
        }
        ev({ h, r: m.radius });
        return true;
      }
      case 'timeParadox': {
        // Beholder: slams down; random towers turn into other towers at level 1, with no refund.
        // The new tower can't cost more than was spent on the old one (and has to fit where it stands).
        const list = this.openTowers().filter((t) => !t.holo && !TOWERS[t.type].heli);
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          const p = this.players.get(t.owner);
          const others = [...this.towers.values()].filter((o) => o !== t);
          // From the owner's loadout (no loadout: any plain tower, not alt forms, golden or event towers).
          const pool = (p?.loadout ?? Object.keys(TOWERS).filter((k) => TOWERS[k].levels && !TOWERS[k].altOf && !TOWERS[k].branchOf && !TOWERS[k].goldOf && !TOWERS[k].event))
            .filter((k) => TOWERS[k] && k !== rootType(t.type) && towerCost(TOWERS[k]) <= t.spent && canPlace(t.x, t.z, others, TOWERS[k].placement));
          if (!pool.length) continue;
          const type = pool[Math.floor(Math.random() * pool.length)];
          this.removeTower(t, 'paradox', { into: type });
          this.newTower(t.owner, type, t.x, t.z, 0, towerCost(TOWERS[type]));
          h.push([r2(t.x), r2(t.z)]);
        }
        ev({ h, n: h.length });
        return true;
      }
      // ---------------------------------------------------------------- Insane mode moves
      case 'hammerSmash': {
        // Berserker (once): smashes one tower and stuns it for a long time.
        const list = this.enemyTargets(e, m.range);
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        this.stunAt(t, 0, m.stun);
        ev({ tx: r2(t.x), tz: r2(t.z), stun: m.stun });
        return true;
      }
      case 'boltSlam': {
        // Boltmaster: towers in a big ring fire slower, the ones closest to it are stunned.
        if (!this.enemyTargets(e, m.range).length) return false;
        this.slowTowers(e.x, e.z, m.range, m.slow, m.time);
        const n = this.hexTowers(e.x, e.z, m.inner, 'stun', m.stun, true);
        ev({ r: m.range, inner: m.inner, n });
        return true;
      }
      case 'callUnits': {
        // Bolt Summon, Eyeficated Summon, Overlord Summoning: a few units step out beside it.
        for (let i = 0; i < m.n; i++) {
          const type = m.list[Math.floor(Math.random() * m.list.length)];
          this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 1.5 - i * 1.5), lateral: (i - (m.n - 1) / 2) * 2, hpScale: 1, owner: e.id, from: e.type });
        }
        ev({ n: m.n, name: m.name });
        return true;
      }
      case 'rocketBombard':
      case 'telekinesis': {
        // Robotic Overseer: rockets that reach anywhere on the map. Overlord: two thrown boulders.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n; i++) {
          const t = list[Math.floor(Math.random() * list.length)];
          const x = t.x + (Math.random() - 0.5) * 2;
          const z = t.z + (Math.random() - 0.5) * 2;
          const d = m.flight + Math.random() * 0.8;
          this.axes.push({ x, z, left: d, r: m.radius, stun: m.stun, dmg: m.dmg ?? 0, kind: m.key === 'telekinesis' ? 'boulder' : 'missile' });
          h.push([r2(x), r2(z), r2(d)]);
        }
        ev({ h, r: m.radius });
        return true;
      }
      case 'minigun':
      case 'thunderstorm': {
        // Robotic Overseer Minigun Mayhem (towers near it) / Overlord Thunderstorm (anywhere):
        // up to `n` towers are hit and stunned.
        const list = m.range ? this.enemyTargets(e, m.range) : this.openTowers();
        if (!list.length) return false;
        const h = [];
        let n = 0;
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          n += this.stunAt(t, m.radius ?? 0, m.stun);
          h.push([r2(t.x), r2(t.z)]);
        }
        ev({ h, n });
        return true;
      }
      case 'swordThrow':
      case 'crystalThrow':
      case 'eyeLaser': {
        // Vengeful Champion / Ravager: a thrown sword or crystal stuns the tower it lands on.
        // The Corrupted: charges its eye at a tower, then a laser stuns every tower around it;
        // afterwards its Defense and max damage per hit stay lowered for good.
        const list = m.range ? this.enemyTargets(e, m.range) : this.openTowers();
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        this.axes.push({ x: t.x, z: t.z, left: m.flight, r: m.radius, stun: m.stun, dmg: 0, kind: m.key });
        if (m.key === 'eyeLaser') {
          e.carry.defense = m.defense;
          e.carry.maxHit = m.maxHit;
        }
        ev({ tx: r2(t.x), tz: r2(t.z), d: m.flight, r: m.radius });
        return true;
      }
      case 'vengefulSlash': {
        // Vengeful Champion: a slash that stuns every tower in front of it.
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true, (t) => (t.x - e.x) * e.dx + (t.z - e.z) * e.dz >= -1);
        if (!n) return false;
        ev({ r: m.range, n });
        return true;
      }
      case 'axeSlash': {
        // Avant Guard: slashes the towers near it, and they fire slower for a while.
        if (!this.enemyTargets(e, m.range).length) return false;
        const n = this.slowTowers(e.x, e.z, m.range, m.slow, m.time);
        ev({ r: m.range, n });
        return true;
      }
      case 'hammerLine': {
        // The Vanguard Hammer Smash: a shockwave in a line ahead of it stuns the towers it crosses.
        const list = this.towersInLine(e, m.length, m.width);
        if (!list.length) return false;
        const ids = new Set(list.map((t) => t.id));
        const n = this.hexTowers(e.x, e.z, m.length + m.width, 'stun', m.stun, true, (t) => ids.has(t.id));
        if (m.unitDmg) this.hurtUnitsNear(e.x, e.z, m.length, m.unitDmg); // Hardcore Void Titan
        ev({ len: m.length, dx: r2(e.dx), dz: r2(e.dz), n });
        return true;
      }
      // ---------------------------------------------------------------- Hardcore moves
      case 'gaze': {
        // Seer / Overseer: stuns towers anywhere on the map.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        let n = 0;
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          n += this.stunAt(t, 0, m.stun);
          h.push([r2(t.x), r2(t.z)]);
        }
        ev({ h, n });
        return true;
      }
      case 'dSword':
      case 'dSpikes': {
        // Demise: a sword swing (close) or spikes all around (wide) stun the towers near it.
        if (!this.enemyTargets(e, m.range).length) return false;
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        ev({ r: m.range, n });
        return true;
      }
      case 'dMist': {
        // Demise: a pink mist downgrades the towers near it by one level.
        if (!this.enemyTargets(e, m.range).length) return false;
        const n = this.downgradeTowers(e.x, e.z, m.range);
        ev({ r: m.range, n });
        return true;
      }
      case 'crystalLaser': {
        // Crystalian: floats up and fires a laser all around. It can be hurt while it does.
        e.openT = m.open;
        const list = this.enemyTargets(e, m.range);
        for (const t of list) if (!(buffOf(this.buffs, t.id).invuln || t.invulnT > 0)) this.weakTower(t, m.weak, m.time);
        this.hurtUnitsNear(e.x, e.z, m.range, m.unitDmg);
        ev({ r: m.range, n: list.length, open: m.open });
        return true;
      }
      case 'hammerBounce': {
        // Vindicator: a thrown hammer bounces between up to `n` towers and scares them (no attacks).
        const list = this.enemyTargets(e, m.range);
        if (!list.length) return false;
        let t = list[Math.floor(Math.random() * list.length)];
        const hit = [t];
        while (hit.length < m.n) {
          let best = null;
          let bd = 400;
          for (const o of this.towers.values()) {
            if (o.hp <= 0 || hit.includes(o) || this.stealthy(o)) continue;
            const d2 = (o.x - t.x) ** 2 + (o.z - t.z) ** 2;
            if (d2 < bd) {
              bd = d2;
              best = o;
            }
          }
          if (!best) break;
          hit.push(best);
          t = best;
        }
        for (const o of hit) if (!(buffOf(this.buffs, o.id).invuln || o.invulnT > 0)) o.bleedT = Math.max(o.bleedT || 0, m.lock);
        this.hurtUnitsNear(e.x, e.z, m.range, m.unitDmg);
        ev({ h: hit.map((o) => [r2(o.x), r2(o.z)]) });
        return true;
      }
      case 'spear': {
        // Void Guardian: a spear thrust freezes the towers in a line, and resets its shield.
        const list = this.towersInLine(e, m.length, m.width);
        if (!list.length) return false;
        const ids = new Set(list.map((t) => t.id));
        const n = this.hexTowers(e.x, e.z, m.length + m.width, 'stun', m.stun, true, (t) => ids.has(t.id));
        this.hurtUnitsNear(e.x, e.z, m.length, m.unitDmg);
        e.osh = Math.max(e.osh || 0, m.shield);
        e.oshMax = Math.max(e.oshMax || 0, e.osh);
        ev({ len: m.length, dx: r2(e.dx), dz: r2(e.dz), n });
        return true;
      }
      case 'hammerSpin':
      case 'concLightning': {
        // The Vanguard Hammer Spin / Overlord Concentrated Lightning: stuns every tower around it.
        if (!this.enemyTargets(e, m.range).length) return false;
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        ev({ r: m.range, n });
        return true;
      }
      case 'staffSlam': {
        // Mage: slams its staff; the enemies around it move faster for a moment.
        let n = 0;
        for (const o of this.enemies.values()) {
          if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > m.radius * m.radius) continue;
          o.empHaste = Math.max(o.empT > 0 ? o.empHaste || 0 : 0, m.haste);
          o.empT = Math.max(o.empT || 0, m.time);
          n++;
        }
        ev({ r: m.radius, n });
        return true;
      }
    }
    return false;
  }

  /** Lava Golem magma: towers standing in a puddle keep getting hurt until it cools. */
  updatePuddles(dt) {
    if (!this.puddles.length) return;
    this.puddles = this.puddles.filter((p) => {
      if (p.dps) this.hurtTowers(p.x, p.z, p.r, p.dps * dt, true);
      if (p.slow) this.slowTowers(p.x, p.z, p.r, p.slow, 0.3); // Bio Gunner goo
      if (p.weak || p.silence) this.weakenTowers(p.x, p.z, p.r, p.weak || 0, p.silence ? 0.3 : 0); // Acid Void acid, Void Lich poison
      return (p.left -= dt) > 0;
    });
  }

  /** A thrown axe (or Hard mode shot) lands: stuns and hurts the towers around it. */
  landShot(a) {
    const n = a.stun ? (a.hard ? this.hardStun(a.x, a.z, a.r, a.stun) : this.hexTowers(a.x, a.z, a.r, 'stun', a.stun, true)) : 0; // VOID's meteors ignore stun immunity
    if (a.tower) {
      // Medium Predator / Eradicator: a shot at one tower (if it's still there).
      const o = this.towers.get(a.tower);
      if (o) this.hurtTower(o, a.tdmg, true);
    }
    if (a.dmg) this.hurtTowers(a.x, a.z, a.r, a.dmg, true);
    if (a.puddle) this.puddles.push({ x: a.x, z: a.z, r: a.r, dps: a.puddle.dps, left: a.puddle.life, slow: a.puddle.slow ?? 0, weak: a.puddle.weak ?? 0, silence: !!a.puddle.silence });
    if (a.slow) this.slowTowers(a.x, a.z, Math.max(a.r, 0.5), a.slow.amt, a.slow.time, true); // Time Parasite
    if (a.lock) {
      // Hardcore Expired Jack: a flaming pumpkin sets the towers it lands on burning (they can't fight).
      for (const t of this.towers.values()) {
        if ((t.x - a.x) ** 2 + (t.z - a.z) ** 2 > Math.max(a.r, 0.5) ** 2 || this.stealthy(t)) continue;
        if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
        t.bleedT = Math.max(t.bleedT || 0, a.lock);
      }
    }
    if (a.shrink || a.weak) {
      // Vio Gunner orbs: half range for a while, and a damage cut that stacks with every orb.
      for (const t of this.towers.values()) {
        if ((t.x - a.x) ** 2 + (t.z - a.z) ** 2 > a.r * a.r || this.stealthy(t)) continue;
        if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
        if (a.shrink) t.smoke = Math.max(t.smoke, a.shrink); // the same halved range as Versus smoke
        if (a.weak) {
          const w = a.weak;
          t.weakAmt = Math.min(w.max, 1 - (1 - (t.weakT > 0 ? t.weakAmt : 0)) * (1 - w.amt));
          t.weakT = Math.max(t.weakT || 0, w.time);
        }
      }
    }
    if (a.spawn) {
      // Medium Grenadiers: the grenade bursts into zombies (worth no cash).
      let j = 0;
      for (const [type, n] of a.spawn.list) for (let i = 0; i < n; i++, j++) this.reborn.push({ type, dist: Math.max(0, a.spawn.dist - j * 0.8), lateral: 0, hpScale: 1, noCash: true });
    }
    if (a.kind) this.events.push({ k: 'eHit', kind: a.kind, x: r2(a.x), z: r2(a.z), r: a.r, ...(a.puddle ? { life: a.puddle.life } : {}) });
    else this.events.push({ k: 'axeHit', x: r2(a.x), z: r2(a.z), r: a.r, n });
  }

  /** Can enemies target tower `t`? Stealthy towers (a level's `stealth` or a Ghost Grenade) can't be, unless revealed. */
  stealthy(t) {
    if (t.cloakT > 0) return true; // Ghost Grenade
    return !!TOWERS[t.type].levels[t.level].stealth && !(t.exposedT > 0);
  }

  /** A level's stealth slowly drains; once it's gone the tower is revealed for a while, then it refills. */
  drainStealth(t, s, dt) {
    const full = s.stealthTime ?? GAME.stealthTime;
    if (!s.stealth) {
      t.stealthLeft = full; // ready for when it upgrades into stealth
      t.exposedT = 0;
      return;
    }
    t.stealthLeft ??= full;
    if (t.exposedT > 0) {
      t.exposedT = Math.max(0, t.exposedT - dt);
      if (!t.exposedT) t.stealthLeft = full;
      return;
    }
    t.stealthLeft = Math.min(full, t.stealthLeft) - dt;
    if (t.stealthLeft > 0) return;
    t.stealthLeft = 0;
    t.exposedT = s.restealth ?? GAME.restealth;
    this.events.push({ k: 'exposed', id: t.id, x: t.x, z: t.z });
  }

  /** Ghost Grenade: every tower within `ab.radius` of `t` (it too) turns stealthy for `ab.duration` s. */
  ghostGrenade(t, ab) {
    const r2max = ab.radius * ab.radius;
    for (const o of this.towers.values()) {
      if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max) o.cloakT = Math.max(o.cloakT || 0, ab.duration);
    }
    this.events.push({ k: 'cloak', id: t.id, x: t.x, z: t.z, r: ab.radius });
  }

  /**
   * Every tower within `r` of (x, z) loses `dmg` health; at 0 it's knocked out until healed.
   * `enemy`: an enemy's attack, which can't touch stealthy towers.
   */
  hurtTowers(x, z, r, dmg, enemy = false) {
    for (const t of this.towers.values()) {
      if (t.hp <= 0 || (t.x - x) ** 2 + (t.z - z) ** 2 > r * r) continue;
      this.hurtTower(t, dmg, enemy);
    }
  }

  /** Tower `t` loses `dmg` health (see hurtTowers). */
  hurtTower(t, dmg, enemy = false, noShield = false) {
    if (t.hp <= 0) return;
    if (enemy && this.stealthy(t)) return;
    if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) return; // Medigun Medic Uber / Combat Drone Shield
    const left = noShield ? dmg : this.soakShield(t, dmg); // Shield Tower shields take the hit first (not Death Angel Pure Pain)
    if (left <= 0) return;
    t.calmT = 0; // Doctor: its regen waits again
    const xl = TOWERS[t.type].levels[t.level].extraLife;
    if (xl && t.hp - left <= 0 && !(t.lifeCd > 0)) {
      // Second life: back to full health and immortal for a moment.
      t.hp = t.maxHp;
      t.invulnT = xl.immune;
      t.lifeCd = xl.back;
      this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '✚ Second life!', color: '#80d8ff' });
      return;
    }
    t.hp = Math.max(0, t.hp - left);
    if (t.hp <= 0) this.knockOut(t);
  }

  /** Tower `t` just ran out of health: it's knocked out until healed. */
  knockOut(t) {
    t.hp = 0;
    this.events.push({ k: 'towerDown', id: t.id, owner: t.owner, x: t.x, z: t.z });
    this.lifeInsurance(t);
    this.deathBlast(t);
    this.revivePack(t);
  }

  /** Towers within `r` of (x, z) deal `weak` less damage for a while; `silence` s: they can't use abilities. */
  weakenTowers(x, z, r, weak, silence) {
    for (const t of this.towers.values()) {
      if ((t.x - x) ** 2 + (t.z - z) ** 2 > r * r || this.stealthy(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
      if (weak) {
        t.weakAmt = t.weakT > 0 ? Math.max(t.weakAmt, weak) : weak;
        t.weakT = Math.max(t.weakT || 0, 4); // lingers a few seconds after leaving the puddle
      }
      if (silence) t.silenceT = Math.max(t.silenceT || 0, silence);
    }
  }

  /**
   * Cryo Helicopter Freeze on Death: where the helicopter is, towers are stunned (frozen) and
   * hurt, and zombies take damage.
   */
  deathBlast(t) {
    const b = TOWERS[t.type].levels[t.level].deathBlast;
    if (!b) return;
    const x = t.hx ?? t.x;
    const z = t.hz ?? t.z;
    this.explode(t, x, z, { damage: b.damage, radius: b.radius, det: SEE_ALL });
    this.events.push({ k: 'boom', x: r2(x), z: r2(z), r: b.radius, ice: 1 });
    this.hexTowers(x, z, b.radius, 'stun', b.stun);
    if (b.towerDamage) this.hurtTowers(x, z, b.radius, b.towerDamage);
  }

  /**
   * Mobster (Bottom path) cash back: when tower `down` is knocked out, the best working Mobster
   * that has it in range pays its owner `cashback` of the tower's total cost.
   */
  lifeInsurance(down) {
    let best = null;
    for (const m of this.towers.values()) {
      if (m === down || m.hp <= 0 || m.holo) continue;
      const ms = TOWERS[m.type].levels[m.level];
      if (!ms.cashback || (m.x - down.x) ** 2 + (m.z - down.z) ** 2 > ms.range * ms.range) continue;
      if (!best || ms.cashback > best.pct) best = { m, pct: ms.cashback };
    }
    if (!best) return;
    const v = Math.floor(down.spent * best.pct);
    const p = this.players.get(best.m.owner);
    if (!p || v <= 0) return;
    p.cash += v;
    this.events.push({ k: 'cashback', x: down.x, z: down.z, v, owner: p.id });
  }

  /** Heals a tower by `amount` (up to its max); a knocked-out tower gets back up. */
  /** Heals tower `t` up to `amount`; returns how much it actually healed. */
  healTower(t, amount) {
    if (t.hp >= t.maxHp || amount <= 0) return 0;
    const was = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + amount);
    if (was <= 0 && t.hp > 0) this.events.push({ k: 'towerUp', id: t.id, owner: t.owner, x: t.x, z: t.z });
    return t.hp - was;
  }

  /** Medics repair damaged towers inside their aura (any owner's, not other Medics) every second. */
  medicRepair(dt) {
    for (const m of this.towers.values()) {
      const s = TOWERS[m.type].levels[m.level];
      if (!s.towerHeal || m.stunT > 0 || m.hp <= 0) continue;
      const r2max = s.aura * s.aura;
      for (const t of this.towers.values()) {
        if (t === m || t.hp >= t.maxHp || (t.x - m.x) ** 2 + (t.z - m.z) ** 2 > r2max) continue;
        if ((TOWERS[t.type].levels[t.level].towerHeal && !TOWERS[m.type].mutualHeal) || TOWERS[t.type].noHeal || TOWERS[t.type].packHealOnly) continue;
        this.healPay(m, s, this.healTower(t, s.towerHeal * dt));
      }
    }
  }

  /** Medigun Medic: towers its beam can reach (inside its aura, healable, not itself). */
  beamPatients(m, s) {
    const out = [];
    for (const t of this.towers.values()) {
      const r = s.beamRange ?? s.aura; // Doctor: its medigun reaches farther than its medkits
      if (t !== m && beamHealable(t) && (t.x - m.x) ** 2 + (t.z - m.z) ** 2 <= r * r) out.push(t);
    }
    return out;
  }

  /**
   * Who a Medigun Medic's Uber / Kritz goes to: its current patient if it can take it, else the
   * most valuable tower in range (Kritz: attacking towers only). Null if there is none.
   */
  chargeTarget(m, s, ab) {
    const ok = ab.key === 'kritz' ? this.beamPatients(m, s).filter((t) => !TOWERS[t.type].kind && !TOWERS[t.type].noBuff) : this.beamPatients(m, s);
    return ok.find((t) => t.id === m.lock) ?? ok.sort((a, b) => b.spent - a.spent || a.id - b.id)[0] ?? null;
  }

  /**
   * Medigun Medic: its beam heals the most hurt tower in range (it sticks with its patient while
   * one is just as hurt, and stays on it when nobody is hurt). While Uber or Kritz is on, the beam
   * stays locked on the tower that got it.
   */
  updateMediBeam(t, s, dt) {
    const list = this.beamPatients(t, s);
    let p = list.find((o) => o.id === t.lock) ?? null;
    if (!(t.active > 0 && mediCharge(s))) {
      const hurt = (o) => o.hp / o.maxHp;
      let best = p && p.hp < p.maxHp ? p : null;
      for (const o of list) if (o.hp < o.maxHp && (!best || hurt(o) < hurt(best) - 0.05)) best = o;
      if (best) p = best;
    }
    t.lock = p ? p.id : 0;
    if (p) this.healPay(t, s, this.healTower(p, (s.beamHeal + (s.beamPct ? p.maxHp * s.beamPct : 0)) * dt)); // Doctor: + a share of max health
  }

  towerNear(x, z, r, targetable = false) {
    for (const t of this.towers.values()) if ((t.x - x) ** 2 + (t.z - z) ** 2 <= r * r && !(targetable && this.stealthy(t))) return true;
    return false;
  }

  /** Thrown axes land and stun the towers around them. */
  updateAxes(dt) {
    if (!this.axes.length) return;
    this.axes = this.axes.filter((a) => {
      if ((a.left -= dt) > 0) return true;
      this.landShot(a);
      return false;
    });
  }

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
    this.events.push({ k: 'waveStart', i: w.index });
  }

  /** Versus: zombies another player sent here, `n` of them `gap` seconds apart. */
  queueSent(type, n, gap) {
    for (let i = 0; i < n; i++) this.queue.push({ t: this.wave.t + 0.3 + i * gap, type });
    this.queue.sort((a, b) => a.t - b.t);
    this.wave.left = this.queue.length;
  }

  /** A queued wave spawn: { type, hp?, mods? } (hp: the wave's exact health for it; mods: Hard mode modifiers). */
  spawnQueued(q) {
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
    const hpMult = def.fixedHp ? 1 : this.vs ? VERSUS.hpMult(this.wave.index) : (this.flatHp ? 1 : 1 + this.wave.index * GAME.hpScalePerWave) * mp;
    const maxHp = at?.hp != null
      ? Math.max(1, Math.round(at.hp * mp))
      : Math.max(1, Math.round(def.hp * hpMult * (at?.hpScale ?? 1)));
    // Engineer teleporters: fresh enemies come out of the one furthest down the path.
    let dist = at?.dist ?? 0;
    // Maps with several lanes: wave spawns take turns; summons follow whoever summoned them.
    let route = at?.route ?? this.enemies.get(at?.owner)?.route ?? this.nextRoute();
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

  /**
   * Gold Commander: his giant broadsword hits every zombie around him once a second while Call to
   * Battle is on (always at max level; the ability multiplies its damage), and the Orbital
   * Airstrike beam glides toward its owner's cursor, melting everything under it.
   */
  updateGoldCommander(t, s, dt) {
    const sw = s.sword?.radius ? s.sword : null;
    if (sw && (sw.always || t.active > 0)) {
      t.swordT = (t.swordT || 0) - dt;
      if (t.swordT <= 0) {
        const cta = t.active > 0 ? s.abilities?.find((a) => a.key === 'cta') : null;
        const dmg = sw.damage * (cta?.swordMult ?? 1);
        const det = this.detects(t, s);
        const r2max = sw.radius * sw.radius;
        const hits = [...this.enemies.values()].filter((e) => canHit(det, e) && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max);
        if (hits.length) {
          t.swordT += sw.every;
          t.yaw = Math.atan2(hits[0].x - t.x, hits[0].z - t.z);
          for (const e of hits) this.damage(t, e, dmg);
          this.events.push({ k: 'gsword', id: t.id, x: r2(t.x), z: r2(t.z), r: sw.radius });
        } else t.swordT = 0; // swings as soon as a zombie comes close
      }
    } else t.swordT = 0;
    const o = t.orb;
    if (o) {
      const dx = o.tx - o.x;
      const dz = o.tz - o.z;
      const d = Math.hypot(dx, dz);
      const step = o.speed * dt;
      if (d <= step) {
        o.x = o.tx;
        o.z = o.tz;
      } else {
        o.x += (dx / d) * step;
        o.z += (dz / d) * step;
      }
      // Hits everything under it (hidden and flying too), a little every tick.
      this.dot = true;
      for (const e of [...this.enemies.values()]) if ((e.x - o.x) ** 2 + (e.z - o.z) ** 2 <= o.radius * o.radius) this.damage(t, e, o.dps * dt);
      this.dot = false;
      if ((o.left -= dt) <= 0) t.orb = null;
    }
  }

  /** Confuses zombie `e` for `secs` (walks backwards), then it can't be confused for `cd` s. Not bosses. */
  confuse(e, secs, cd) {
    if (e.boss || e.statusImmune || e.confCd > 0 || e.remains || !this.enemies.has(e.id)) return;
    e.confT = secs;
    e.confCd = secs + cd;
  }

  updateTower(t, dt) {
    // Hacker clones fade away when their time is up.
    if (t.holo && (t.holo -= dt) <= 0) return this.removeTower(t, 'holoEnd');
    const def = TOWERS[t.type];
    let s = levelAt(def.levels[t.level], t.x, t.z); // Penetrator: cliff stats on a cliff
    s = modeStats(s, t); // Submerge Submerged mode, Spectre Offense drone
    const b = buffOf(this.buffs, t.id);
    if (t.immuneT > 0) t.immuneT = Math.max(0, t.immuneT - dt); // Spectre Defense drone / Eldritch Rift: stun immunity
    if (t.seeT > 0) t.seeT = Math.max(0, t.seeT - dt); // Spark Now-You-See-Me: hidden detection
    t.active = Math.max(0, t.active - dt);
    t.fury = Math.max(0, t.fury - dt);
    t.riotT = Math.max(0, t.riotT - dt);
    t.parryT = Math.max(0, (t.parryT || 0) - dt);
    t.aspectT = Math.max(0, (t.aspectT || 0) - dt);
    t.radioT = Math.max(0, t.radioT - dt);
    if (t.fwT > 0) t.fwT = Math.max(0, t.fwT - dt); // Firework Technician boost
    // Time Dilator Warp Drive: ability cooldowns run on bubble time too.
    const cdDt = t.dil?.cd ? dt * t.dil.scale : dt;
    for (const k in t.cd) t.cd[k] = Math.max(0, t.cd[k] - cdDt);
    this.towerUpkeep(t, def, def.levels[t.level], dt);
    // Versus debuffs from an opponent's Anarchist: smoke halves range, fireworks stun.
    t.smoke = Math.max(0, t.smoke - dt);
    t.stunT = Math.max(0, t.stunT - dt);
    if (t.slowT > 0) t.slowT = Math.max(0, t.slowT - dt); // Insane mode: goo, time waves, Time Parasites
    if (t.weakT > 0) t.weakT = Math.max(0, t.weakT - dt); // Void mode: acid
    if (t.silenceT > 0) t.silenceT = Math.max(0, t.silenceT - dt); // Void Lich poison: no abilities
    if (t.bleedT > 0) t.bleedT = Math.max(0, t.bleedT - dt); // Void Guardian axe: bleeding
    this.drainStealth(t, def.levels[t.level], dt);
    if (t.cloakT > 0) t.cloakT = Math.max(0, t.cloakT - dt); // Ghost Grenade
    t.shieldT = Math.max(0, t.shieldT - dt); // Medic shield recharging after blocking a stun
    if (t.invulnT > 0) t.invulnT = Math.max(0, t.invulnT - dt); // Combat Drone Shield
    if (t.reviveT > 0 && (t.reviveT -= dt) <= 0) {
      // Combat Medic Revive Pack: back on its feet at full health.
      t.reviveT = 0;
      this.healTower(t, t.maxHp);
    }
    this.landCrates(t, dt, false); // Airdrop Farm crates still fall while it's stunned
    if (t.hp <= 0 && def.unitsDie && t.unitsOut) {
      this.removeUnitsOf(t.id); // Field Barracks: its units die with it
      t.unitsOut = false;
    }
    if (t.hp > 0) t.repairT = 0;
    else if (def.rebuilds && t.rebuilt < def.rebuilds) {
      // XWM Turret: rebuilds itself to full health (it can't shoot meanwhile).
      if (!(t.repairT > 0)) t.repairT = def.rebuildTime;
      t.repairT -= dt;
      if (t.repairT <= 0) {
        t.repairT = 0;
        t.rebuilt++;
        this.healTower(t, t.maxHp);
      }
      return;
    }
    if (t.stunT > 0 || t.hp <= 0) return; // stunned, or knocked out until healed
    if (t.bleedT > 0 || t.corrupt) return; // Void mode: bleeding (Guardian) or turned by VOID
    if (t.curseBy) {
      // Hardcore: cursed by the Soul Stealer / Void Reaver: nothing works until that enemy is gone.
      if (this.enemies.has(t.curseBy)) return;
      t.curseBy = 0;
    }
    if (t.parryT > 0) return; // Gladiator: recovering from a parry
    // Slowed towers (and ones the Beholder's sword has nerfed for good) do everything slower.
    // Time Dilator bubble: faster or slower (spawners only from Paradox Limiters).
    const tempo = (t.slowT > 0 ? 1 - t.slowAmt : 1) * (t.nerf ?? 1) * (t.dil && (def.kind !== 'spawner' || t.dil.spawn) ? t.dil.scale : 1);
    if (tempo !== 1) dt *= tempo;
    if (t.dpT > 0) t.dpT = Math.max(0, t.dpT - dt); // Bugler Directed Power
    // Abilities with `auto` (Gunslinger Reinforcements) use themselves when ready during a wave.
    if (s.abilities && this.wave.state === 'wave' && this.enemies.size && !(t.silenceT > 0) && !(t.bleedT > 0) && !t.corrupt) {
      for (const ab of s.abilities) {
        if (!ab.auto || t.cd[ab.key] > 0) continue;
        t.cd[ab.key] = ab.cooldown * (1 - b.cdCut);
        this.useAbility(t, s, ab, {});
        this.events.push({ k: 'ability', id: t.id, owner: t.owner, name: ab.name, x: t.x, z: t.z });
      }
    }
    if (s.android && this.vs) this.updateAnarchy(t, s, dt);
    if (s.oil) this.updateOil(t, s, dt);
    if (s.shield) this.updateShieldTower(t, s, dt);
    if (s.revive) this.updateRevive(t, s, dt);
    if (s.sword?.radius || t.orb) this.updateGoldCommander(t, s, dt); // not the Warlock / Engineer melee `sword` (that has `reach`)
    if (s.missiles && !def.heli) this.updateMissiles(t, s, dt); // Warship: passive weapons on their own timers
    if (s.companion) this.updateCompanion(t, s, dt); // Bubble Blower
    if (s.drop?.units) this.updateDrops(t, s, dt); // Buccaneer pirate barrel (Airdrop Farms / Markets use `drop` for crate timing)
    if (s.drone) this.updateSpectreDrone(t, s, dt); // Spectre drone
    if (t.liveT > 0) this.updateLiveShow(t, s, dt); // Glowup Live Show
    if (s.scare) return this.updateScare(t, def, s, b, dt); // Scarecrow
    if (def.bait) return; // bait never attacks
    if (def.kind === 'spawner') return this.updateSpawner(t, def, s, dt);
    if (s.goons && this.updateGoons(t, def, s, dt)) return;
    if (s.lemon) return this.updateLemon(t, s, b, dt); // Lemonade Cat: cash for zombies in range
    if (def.kind === 'income') return;
    if (s.chaos) return this.updateChaos(t, s, dt); // Chaos Jester
    if (s.tracks) return this.updateBooth(t, s, dt);
    if (s.beamHeal) {
      this.updateMediBeam(t, s, dt);
      if (!s.damage) return; // Doctor: its pistol keeps shooting
    }
    // Commanders only shoot during Call to Arms (Classic Commanders: for `fury` s after any ability).
    if (def.kind === 'support' && !(s.damage && (t.active > 0 || t.fury > 0))) return;
    // Cowboy: twirling its revolver after a cash shot (its cooldown waits too).
    if (t.spinT > 0) {
      t.spinT = Math.max(0, t.spinT - dt * b.rate);
      return;
    }
    const rangeMult = b.range * (t.smoke > 0 ? VERSUS.smokeRange : 1);
    if (rangeMult !== 1) s = { ...s, range: s.range * rangeMult };
    // Electricizer: zombies within part of its range switch it to its short-range mode.
    if (s.near) {
      t.near = this.anyNear(t.x, t.z, s.range * s.near.within, this.detects(t, s));
      if (t.near) s = { ...s, ...s.near };
    }
    // HE Rounds / Overcharge: more damage and range while on (HE: every bullet explodes).
    const self = t.active > 0 ? s.abilities?.find((a) => a.self) : null;
    // Shock Rounds: shots also stun the zombie they hit first.
    if (self) s = { ...s, damage: s.damage * (self.dmg ?? 1), range: s.range * (self.range ?? 1), ...(self.radius ? { radius: self.radius } : {}), ...(self.stun ? { stun: Math.max(s.stun || 0, self.stun) } : {}),
      ...(self.burn ? { fire: { dps: self.burn, time: self.burnTime } } : {}), // Jet Trooper Fire Rounds
      ...(self.burst ? { burst: self.burst, burstGap: self.burstGap, cooldown: self.cycle } : {}) }; // Yasuke Dragon Flame
    if (t.magic) s = { ...s, damage: s.damage + t.magic }; // Wizard Magic Boost
    if (t.uses?.soulSurge) s = { ...s, targets: 1 + t.uses.soulSurge }; // Lure Soul Surge: more zombies per shot
    // Balloon Pal: bigger splash too.
    if (b.splash > 1 && (s.radius || s.area)) s = { ...s, ...(s.radius ? { radius: s.radius * b.splash } : {}), ...(s.area ? { area: s.area * b.splash } : {}) };
    // Cooldowns may dip just below zero so leftover time carries into the next shot;
    // that keeps very fast fire rates accurate at any tick length. Firerate boosts speed them up.
    const dpRate = t.dpT > 0 ? 1 + (t.dpBoost || 0) : 1; // Bugler Directed Power
    t.cooldown = Math.max(-dt, t.cooldown - dt * b.rate * dpRate * (self?.rate ?? 1)); // Machine Gunner Overcharge: faster firing
    t.gap = Math.max(0, t.gap - dt);
    // Ammo towers stop shooting while they reload (firerate boosts don't speed that up).
    let loaded = true;
    if (s.ammo) {
      if (t.reloadT > 0) {
        t.reloadT = Math.max(0, t.reloadT - dt);
        if (t.reloadT <= 0) t.ammo = s.ammo;
      }
      loaded = t.reloadT <= 0;
      if (!loaded) t.cooldown = Math.max(0, t.cooldown);
    }
    if (def.pulse) return this.firePulse(t, def, s);
    if (s.star) return this.updateStar(t, def, s, dt);
    if (s.spot) return this.updateSpotlight(t, def, s, dt);
    if (def.orbit) return this.updateAviator(t, def, s, dt);
    if (def.fps && t.manual) return this.updateFps(t, def, s, dt, loaded);
    if (def.heli) return this.updatePursuit(t, def, s, dt, loaded);
    if (s.maxDamage != null) return this.updateBeam(t, def, s, dt);
    if (s.overcharge != null) return this.updateAccel(t, s, dt);
    if (s.synapses) return this.updateHacker(t, s);
    // Necromancer / Engineer: busy raising a gravestone or building a sentry.
    if ((s.souls || s.scrap) && this.updateBuilder(t, s, dt)) return;
    if (s.buildEvery) this.updateTurrets(t, s, dt); // Mechanic: a temporary turret every `buildEvery` s
    if (s.burn != null) return this.updateFlame(t, def, s, dt);
    if (def.traps) return this.updateTrapper(t, def, s);
    // Ice Apprentice Blizzard: its staff can't attack while it lasts.
    if (t.active > 0 && s.abilities?.some((a) => a.key === 'blizzard')) return this.updateBlizzard(t, s, dt);
    if (s.soul && t.choice?.[0] === 'beam') return this.updateSoulBeam(t, s, dt * b.rate); // Spiritual Advocate Beam mode
    if (t.restT > 0) {
      t.restT -= dt; // Spiritual Advocate Heal: its sword rests
      return;
    }
    if (s.fan && t.fanAcc >= s.fan.every) this.throwKnives(t, s);
    if (s.chop) this.chopAxe(t, s, dt);
    if (t.shockT > 0 && (t.shockT -= dt) <= 0) this.aftershock(t, def, s); // Sledger
    if (s.toss) this.tossKnife(t, s, dt * b.rate);
    if (s.sword) this.swingSword(t, def, s, dt * b.rate); // Warlock: its sword works on its own timer
    if (t.active > 0) this.updateDrone(t, s, dt);
    if (t.active > 0) this.updateSnowStorm(t, s, dt);

    // Boomerangs can't be thrown again until every one of them is back.
    if (s.pierce && t.out > 0) return;

    // Freezers don't waste shots on zombies that are already frozen.
    // Sleeters won't shoot burning zombies either.
    let skip = s.shock?.hitAll ? null // Golden Byte: zaps any zombie (it only shocks the ones it can)
      : s.shock ? (e) => e.shockT > 0 || e.stop > 0 || e.statusImmune || e.shockImmune || (s.shock.maxHp != null && e.maxHp > s.shock.maxHp) // Byte: only zombies it can still shock
      : s.taint ? (e) => !!e.taints?.has(s.taint.kind) || e.statusImmune // Dumpster Child: zombies without its effect yet
      : def.skipStopped ? (e) => e.stop > 0 || (e.boss && e.zapT > 0) // Stunner
      : (s.freeze || s.chill) && !def.hitsFrozen ? (e) => e.stopKind === 'ice' || (def.skipBurning && e.burn > 0)
      : minRangeOf(def, s) ? this.deadzone(t, minRangeOf(def, s))
      : facesCone(def) ? this.outsideCone(t, s.cone) // Gatling Gun / Sentry: only zombies inside its cone
      : s.bubble?.float ? (e) => e.stopKind === 'float' // Bubble Blower: don't waste bubbles on floating zombies
      : s.cube ? (e) => e.cubeHp > 0 // Glacier: not zombies already in a cube
      : null;
    if ((s.freeze || s.chill) && !def.skipStopped && !def.hitsFrozen && minRangeOf(def, s)) {
      // Cryo Mortar: skips frozen zombies and can't hit close ones either.
      const ice = skip;
      const close = this.deadzone(t, minRangeOf(def, s));
      skip = (e) => ice(e) || close(e);
    }
    if (s.payday) this.updatePayday(t, s, dt);
    if (s.handgun) this.fireHandgun(t, def, s, dt * b.rate);
    let target;
    if (s.abilities?.some((a) => a.key === 'targetSelect')) {
      // Artillery: only shoots zombies in the blast at its Target Select spot. autoAim levels
      // pick their own target when nothing is there (or no spot is set).
      target = t.spot ? this.findTarget(t, s, t.spot.x, t.spot.z, s.radius, skip) : null;
      t.spotOn = !!target;
      if (!target && s.autoAim) target = this.findTarget(t, s, t.x, t.z, s.range, skip);
    } else target = this.findTarget(t, s, t.x, t.z, s.range, skip);
    // Volt: zombies near any Volt Point on the map can be zapped too.
    if (!target && def.voltUser) {
      for (const u of this.units.values()) {
        if (!u.def.point) continue;
        target = this.findTarget(t, s, u.x, u.z, u.def.radius, skip);
        if (target) break;
      }
    }
    if (!target) {
      if (s.charge) t.chargeT = Math.min(s.charge.time, (t.chargeT || 0) + dt); // Mako: charging up while idle
      if (s.shuriken) this.throwShuriken(t, s, dt * b.rate); // Samurai: a shuriken at a zombie just out of reach
      t.aimT = 0; // Hunters have to aim again at the next zombie
      t.revT = Math.max(0, t.revT - dt * b.rate); // Minigunners spin back down
      return;
    }
    // Minigunner: spins up on a target before the first shot.
    if (s.rev && t.revT < s.rev) {
      t.revT = Math.min(s.rev, t.revT + dt * b.rate);
      t.cooldown = Math.max(0, t.cooldown);
      if (t.revT < s.rev) return;
    }
    const want = Math.atan2(target.x - t.x, target.z - t.z);
    t.yaw = lerpAngle(t.yaw, want, Math.min(1, dt * 18));
    if (Math.abs(angleDiff(t.yaw, want)) > 0.35) return;
    if (!loaded) return;
    if (s.rockets) this.fireRockets(t, s, target, dt * b.rate);
    if (s.m203) this.fireM203(t, s, target, dt);
    if (s.rail) this.fireRail(t, s, target, dt);
    if (def.aim && t.aimT < def.aim) {
      t.aimT += dt * b.rate;
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }

    // A cycle is `burst` shots `burstGap` apart; the cycle restarts after `cooldown`.
    if (t.burstLeft > 0) {
      if (t.gap > 0) return;
    } else {
      if (t.cooldown > 0) return;
      // Javelin: once reloaded, it aims `aimShot` s before every shot.
      if (s.aimShot) {
        if (t.aimT < s.aimShot) {
          t.aimT += dt * b.rate;
          t.cooldown = Math.max(0, t.cooldown);
          if (t.aimT < s.aimShot) return;
        }
        t.aimT = 0;
      }
      t.burstLeft = s.burst || 1;
      if (s.burstMax) {
        // Fracture: a random number of shards per burst; the cycle is the pause plus the burst.
        t.burstLeft = s.burst + Math.floor(Math.random() * (s.burstMax - s.burst + 1));
        t.cooldown += s.burstPause + t.burstLeft * s.burstGap;
      } else
      // Elite Plasma Rifle: fires faster the hotter it gets (the fewer shots before it overheats).
      t.cooldown += s.heatRamp && s.ammo ? s.cooldown + (s.heatRamp.minCd - s.cooldown) * this.heat(t, s) : s.cooldown;
    }
    t.burstLeft--;
    t.gap = s.burstGap ?? def.burstGap ?? 0;
    if (s.bolt) return this.bolt(t, s, target, want);
    if (s.bubble) return this.blowBubbles(t, def, s, target);
    if (s.scrap) t.meter++; // Engineer: every shot collects scrap
    if (s.pierce) return this.throwRangs(t, s, target);
    if (s.whirl && ++t.swings % s.whirl.every === 0) return this.whirl(t, s);
    if (s.pellets) {
      this.pump(t, s, want);
      if (s.ammo) this.useAmmo(t, s); // Breacher Good Coms: a full-auto magazine
      return;
    }
    if (s.chains) return this.chain(t, def, s, target);
    if (s.arrow) return this.fireArrow(t, s, want);
    if (s.axe) return this.throwAxe(t, s, target);
    if (s.bounce) return this.bounceArrow(t, s, target);
    if (s.pen) return this.penetrate(t, s, target);
    if (s.flask) this.flask(t, s, target); // Maitake: heals summons, frees towers, leaves a cloud
    if (s.area) return this.areaHit(t, def, s, target); // Hotdog Frank / Mako
    if (s.shock) return this.byteZap(t, def, s, target); // Byte
    if (s.radius) return this.fireSplash(t, def, s, target);
    if (s.targets) {
      // Gladiator Fire Aspect: this swing sets every zombie it hits on fire.
      const fire = s.fireAspect && t.aspectT <= 0 ? s.fireAspect : null;
      if (fire) t.aspectT = fire.every;
      const hit = this.findTargets(t, s, s.targets);
      const at = hit.map((e) => [e.x, e.z]); // where they were (for the spray), even if they die
      // Void Traitor critical hits; Spiritual Advocate Sword Imbue (stronger with more souls).
      let mult = 1;
      if (s.critEvery && hit.length && ++t.swings % s.critEvery.every === 0) mult = s.critEvery.mult;
      if (s.soul?.imbue && t.soulN > 0) mult *= 1 + s.soul.imbue * t.soulN;
      if (s.soul?.imbue && hit.length) this.setSouls(t, s, t.soulN - s.soul.cost * hit.length);
      for (const e of hit) {
        this.shoot(t, e, (s.hpScale ? this.hpScaled(s, e) : s.damage) * mult);
        if (!this.enemies.has(e.id)) continue;
        if (s.stun) this.stop(def, e, s.stun, 'stun'); // Slammer: every zombie hit is stunned
        if (fire) this.ignite(e, t.id, fire.dps, fire.time, 0);
        this.hitEffects(t, def, s, e, 0); // Sledger: chills every zombie it hits
      }
      if (s.spray) this.spray(t, def, s, hit, at);
      if (s.lasers && hit.length && ++t.swings % s.lasers.every === 0) this.voidLasers(t, def, s); // Void King
      if (s.aftershock) t.shockT = s.aftershock.delay;
      if (s.ammo) this.useAmmo(t, s); // Cryomancer: one tank of frost per spray
      if (s.cash && hit.length && ++t.cashN % s.cash.every === 0) this.cashShot(t, s.cash); // Plunder
      return;
    }
    // Warden: every `crit.every`th swing is a critical hit (and stuns, unless every hit does).
    // Riot shield: double damage for a while after blocking a stun.
    let dmg = s.hpScale ? this.hpScaled(s, target) : s.damage; // Cyberblade Prototype Archaic
    // Wafer: hits harder the closer the zombie is (`damage` at the edge of its range, `nearDmg` point blank).
    // Inside `meleeRange` it's the full candy-cane hit; past it the damage fades out to the edge of its range.
    if (s.nearDmg != null) {
      const mr = s.meleeRange || 0;
      const d = Math.hypot(target.x - t.x, target.z - t.z);
      dmg = Math.round((d <= mr ? s.nearDmg : s.damage + (s.nearDmg - s.damage) * Math.max(0, 1 - (d - mr) / Math.max(0.01, s.range - mr))) * 100) / 100;
    }
    if (s.heatRamp?.dmg && s.ammo) dmg = Math.round(dmg * (1 + s.heatRamp.dmg * this.heat(t, s)) * 100) / 100; // Particle Accelerator
    let stun = s.stun;
    // Outlaw: a random share of shots are critical hits.
    let lucky = false;
    if (s.critChance && Math.random() < s.critChance) {
      dmg = Math.round(dmg * s.critMult * 100) / 100;
      lucky = true;
    }
    // Planeswalker: zombies inside its inner range take less damage.
    if (s.closeRange && (target.x - t.x) ** 2 + (target.z - t.z) ** 2 <= s.closeRange ** 2) dmg = Math.round(dmg * s.closeMult * 100) / 100;
    // Hunter Collateral: spends bounty for a double-damage shot that bounces to nearby zombies.
    let collat = null;
    if (s.collateral && (t.bank || 0) >= s.collateral.cost) {
      t.bank -= s.collateral.cost;
      dmg *= 2;
      collat = { x: target.x, z: target.z, main: target.id };
    }
    // Flayer: every swing in a row on the same zombie hits a bit harder.
    if (s.focus) {
      t.focusN = t.focusE === target.id ? (t.focusN || 0) + 1 : 0;
      t.focusE = target.id;
      dmg = Math.round(dmg * (1 + Math.min(s.focus.max, t.focusN * s.focus.per)) * 100) / 100;
    }
    if (s.combo) {
      // Brawler: every `hits`th punch is the combo finisher (harder, with knockback). The next
      // combo starts `combo.cooldown` s after it instead of the normal swing time.
      const fin = ++t.swings % s.combo.hits === 0;
      if (fin) {
        dmg = s.combo.damage;
        t.cooldown += s.combo.cooldown - s.cooldown;
      }
      this.events.push({ k: 'shot', t: t.id, e: target.id, ...(fin ? { c: 2 } : {}) });
      this.damage(t, target, dmg);
      if (fin && this.enemies.has(target.id)) this.knockBack(target, s.combo.knock);
    } else if (s.crit) {
      const crit = ++t.swings % s.crit.every === 0;
      if (crit) dmg = s.crit.damage;
      else if (!s.stunAll) stun = 0;
      if (t.riotT > 0) dmg *= 2;
      this.events.push({ k: 'shot', t: t.id, e: target.id, ...(crit ? { c: 1 } : {}) });
      this.damage(t, target, dmg);
    } else if (def.fly) this.launch(t, s, target, dmg, stun);
    else if (lucky) {
      this.events.push({ k: 'shot', t: t.id, e: target.id, c: 1 });
      this.damage(t, target, dmg);
    } else this.shoot(t, target, dmg);
    if (s.pass) this.passThrough(t, s, target, dmg);
    if (collat) this.collateralBounce(t, s, collat);
    if (s.combine && this.enemies.has(target.id)) this.combinePellet(t, s, target); // Lightbeamer pellets
    // Focus: shots at zombies inside its inner range don't add heat.
    if (s.ammo && !(s.coolRange && (target.x - t.x) ** 2 + (target.z - t.z) ** 2 <= s.coolRange ** 2)) this.useAmmo(t, s);
    if (s.railgun) this.chargeRailgun(t, s, target); // The Eldritch
    // Ruptor: the last shot of every burst explodes.
    if (s.boom && t.burstLeft === 0) this.explode(t, target.x, target.z, { damage: s.boom.damage, radius: s.boom.radius, det: this.detects(t, s) });
    if (s.cash && ++t.cashN % s.cash.every === 0) this.cashShot(t, s.cash);
    if (def.fly) return; // the projectile's effects happen when it lands
    if (!this.enemies.has(target.id)) {
      if (def.burstStops) t.burstLeft = 0; // Huntsman: its burst ends when the target dies
      return;
    }
    if (s.extra) this.spread(t, s, target);
    this.hitEffects(t, def, s, target, stun);
  }

  /** Elite: how hot its gun is, 0 (fresh) to 1 (about to overheat). */
  heat(t, s) {
    return Math.max(0, Math.min(1, 1 - (t.ammo ?? s.ammo) / s.ammo));
  }

  /** Cyberblade Prototype Archaic: damage from `min` to `max` by the target's health (`max` from `at` up). */
  hpScaled(s, e) {
    const h = s.hpScale;
    return Math.round((h.min + (h.max - h.min) * Math.min(1, e.hp / h.at)) * 100) / 100;
  }

  /**
   * Lightbeamer Avarian Technology: its pellets build up on a zombie (per Lightbeamer); every
   * `combine.hits` of them blow up for `combine.damage` within `combine.radius`.
   */
  combinePellet(t, s, e) {
    const c = s.combine;
    e.pellets ??= new Map();
    const n = (e.pellets.get(t.id) ?? 0) + 1;
    if (n < c.hits) {
      e.pellets.set(t.id, n);
      return;
    }
    e.pellets.set(t.id, 0);
    this.explode(t, e.x, e.z, { damage: c.damage, radius: c.radius, det: this.detects(t, s), main: e.id });
  }

  /**
   * Goo Gunner hose / Cryo Blaster: every zombie within `s.spray` of a zombie it just hit (at
   * `at`) gets the same damage and on-hit effects, once per shot.
   */
  spray(t, def, s, hit, at) {
    const det = this.detects(t, s);
    const done = new Set(hit.map((e) => e.id));
    const r2max = s.spray * s.spray;
    for (const e of [...this.enemies.values()]) {
      if (done.has(e.id) || !canHit(det, e) || !at.some(([x, z]) => (e.x - x) ** 2 + (e.z - z) ** 2 <= r2max)) continue;
      if (s.damage) this.damage(t, e, s.damage);
      if (this.enemies.has(e.id)) this.hitEffects(t, def, s, e, 0);
    }
  }

  /**
   * Crossbower arrows: the on-hit effects of this arrow, or null if it has none. Arbalist arrows
   * take the next effect of `cycle` in turn (poison, fire, electric stun). Returns { s, stun }.
   */
  arrowFx(t, s) {
    if (s.cycle) {
      t.cycleN = ((t.cycleN ?? -1) + 1) % s.cycle.length;
      const c = s.cycle[t.cycleN];
      return { s: { ...s, poison: null, fire: null, ...c, cycle: null }, stun: c.stun || 0 };
    }
    return s.poison || s.poacher || s.freeze ? { s, stun: 0 } : null; // freeze: Ice Apprentice orbs
  }

  /**
   * Crossbower Power Poacher: blue fire on a zombie that isn't burning, a short slow on one that
   * is, and an explosion when `count`+ other zombies are within `near` of it.
   */
  poach(t, s, e) {
    const p = s.poacher;
    if (e.burn > 0) this.applySlime(e, p.slow);
    else this.ignite(e, t.id, p.fire.dps, p.fire.time, 0);
    let n = 0;
    for (const o of this.enemies.values()) if (o !== e && !o.flying && (o.x - e.x) ** 2 + (o.z - e.z) ** 2 <= p.near * p.near) n++;
    if (n >= p.count) this.explode(t, e.x, e.z, { damage: p.boom.damage, radius: p.boom.radius, det: this.detects(t, s), main: e.id });
  }

  /** What a single-target hit does besides damage. `t` may be null (sold while its shot flew). */
  hitEffects(t, def, s, target, stun) {
    if (s.poacher && t) this.poach(t, s, target);
    if (stun) this.stop(def, target, stun, 'stun');
    if (s.fire) this.ignite(target, t.id, s.fire.dps, s.fire.time, 0); // Jet Trooper Fire Rounds
    // Darter: some darts set the zombie on fire, some are electric and stun it (bosses too).
    if (s.fireDart && Math.random() < s.fireDart.chance) this.ignite(target, t?.id ?? 0, s.fireDart.dps, s.fireDart.time, 0);
    if (s.shockDart && Math.random() < s.shockDart.chance) this.stop({ bossStop: 1 }, target, s.shockDart.stun, 'stun');
    // Sleeter: every shot freezes the zombie it hits (bosses for `bossStop` of the time).
    if (s.freeze && !s.radius) this.iceFreeze(target, s.freeze, { freezeBoss: def.bossStop ?? 0, frostbite: s.frostbite, ignoreIceResist: s.ignoreIceResist });
    if (s.slime) this.applySlime(target, s.slime);
    if (s.chill && t) this.applyChill(t, s, target);
    if (s.harpoon) this.applyHarpoon(def, target, s.harpoon);
    if (s.cube && t) this.iceCube(t, s, target); // Glacier
    if (s.poison && t) this.applyPoison(t, target, s.poison); // Toxic Gunner, Marauder bleed, Maitake
    if (s.taint && t) this.applyTaint(t, target, s.taint); // Dumpster Child
    if (s.bees && t) this.applyBees(t, target, s.bees); // Swarmer
    if (s.bleed && t) this.applyBleed(t, def, target, s.bleed); // Slasher
    if (s.paraSlow && !target.statusImmune && !target.shockImmune) {
      // Paralyzer laser: every tick slows the zombie a bit more.
      target.paraSlow = Math.min(s.paraSlow.max, (target.paraT > 0 ? target.paraSlow || 0 : 0) + s.paraSlow.per);
      target.paraT = s.paraSlow.time;
    }
    // Frost Blaster: melts armor (the strongest melt so far wins, as with the Golden Pyromancer).
    if (s.melt && target.armor) target.armor = Math.min(target.armor, (ENEMIES[target.type].armor ?? 0) * (1 - s.melt));
    if (s.knock && this.enemies.has(target.id)) this.knockBack(target, s.knock); // Warlock beams
    if (s.element && t) {
      // Elementalist: Fire mode burns, Frost mode chills.
      const mode = choicesOf(def, s, t.choice)[0];
      if (mode === 'frost') this.applyChill(t, s.element.frost, target);
      else this.ignite(target, t.id, s.element.fire.dps, s.element.fire.time, 0);
    }
  }

  /** Warlock: every `sword.every` s it swings at up to `sword.targets` zombies within `sword.reach`. */
  swingSword(t, def, s, dt) {
    const sw = s.sword;
    t.swordT = (t.swordT ?? 0) - dt;
    if (t.swordT > 0) return;
    const list = this.findTargets(t, { ...s, range: sw.reach }, sw.targets);
    if (!list.length) {
      t.swordT = 0;
      return;
    }
    t.swordT = sw.every;
    t.yaw = Math.atan2(list[0].x - t.x, list[0].z - t.z);
    this.events.push({ k: 'shot', t: t.id, e: list[0].id });
    for (const e of list) {
      this.damage(t, e, sw.damage);
      if (sw.bleed && this.enemies.has(e.id)) this.applyBleed(t, def, e, sw.bleed);
    }
  }

  /**
   * Star Cannon: charges over `star.charge` s, then fires at its target once full, or sooner when the
   * shot at its current charge would already kill it. Then it reboots for `star.reboot` s.
   */
  updateStar(t, def, s, dt) {
    const st = s.star;
    if (t.starT > 0) {
      t.starT = Math.max(0, t.starT - dt);
      return;
    }
    t.charge = Math.min(1, (t.charge || 0) + dt / st.charge);
    const target = this.findTarget(t, s, t.x, t.z, s.range);
    if (!target) return;
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    const dmg = Math.round(st.min + (st.max - st.min) * t.charge);
    if (t.charge < 1 && dmg < target.hp) return;
    t.charge = 0;
    t.starT = st.reboot;
    const det = this.detects(t, s);
    const blast = (e) => {
      this.events.push({ k: 'shot', t: t.id, e: e.id });
      const x = e.x;
      const z = e.z;
      const hit = [...this.enemies.values()].filter((o) => canHit(det, o) && (o.x - x) ** 2 + (o.z - z) ** 2 <= s.radius * s.radius);
      this.explode(t, x, z, { damage: dmg, radius: s.radius, det, main: e.id, pierceArmor: true, nuke: s.radius >= 5 });
      if (st.stun) for (const o of hit) if (this.enemies.has(o.id)) this.stop({ bossStop: st.stunBoss ? 1 : 0 }, o, st.stun, 'stun');
    };
    blast(target);
    if (st.extra) for (const e of this.findTargets(t, s, st.extra + 1).filter((e) => e !== target).slice(0, st.extra)) if (this.enemies.has(e.id)) blast(e);
  }

  /** Star Cannon batteries: a kill may drop one, charging every Star Cannon a bit. */
  dropBattery(e) {
    for (const t of this.towers.values()) {
      const st = TOWERS[t.type].levels[t.level].star;
      if (!st || t.starT > 0 || t.charge >= 1 || Math.random() >= st.battery) continue;
      t.charge = Math.min(1, (t.charge || 0) + GAME.starBattery);
      this.events.push({ k: 'battery', t: t.id, x: r2(e.x), z: r2(e.z) });
    }
  }

  /**
   * Spotlight Tech: the light glides toward its target; every `cooldown` s it hurts every zombie
   * inside it (less near the rim), burns them, reveals hidden ones and, once charged, confuses them.
   */
  updateSpotlight(t, def, s, dt) {
    const sp = s.spot;
    if (t.lx == null) {
      t.lx = t.x;
      t.lz = t.z;
    }
    t.spotCd = Math.max(0, (t.spotCd || 0) - dt);
    const target = this.findTarget(t, s, t.x, t.z, s.range);
    if (target) {
      const dx = target.x - t.lx;
      const dz = target.z - t.lz;
      const d = Math.hypot(dx, dz);
      const step = Math.min(d, sp.speed * dt);
      if (d > 0) {
        t.lx += (dx / d) * step;
        t.lz += (dz / d) * step;
      }
      t.yaw = Math.atan2(t.lx - t.x, t.lz - t.z);
    }
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    const det = this.detects(t, s);
    const r2max = sp.radius * sp.radius;
    const lit = [];
    for (const e of this.enemies.values()) {
      const d2 = (e.x - t.lx) ** 2 + (e.z - t.lz) ** 2;
      if (d2 > r2max) continue;
      if (sp.reveal && e.hidden && det.hidden) e.revealT = Math.max(e.revealT || 0, 0.5); // Hidden Reveal
      if (canHit(det, e)) lit.push([e, d2]);
    }
    if (!lit.length) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    let dealt = 0;
    for (const [e, d2] of lit) {
      const k = 1 - (1 - sp.edge) * Math.sqrt(d2 / r2max);
      const before = e.hp;
      this.damage(t, e, Math.round(s.damage * k * 100) / 100);
      dealt += before - Math.max(0, e.hp);
      if (s.ignite && this.enemies.has(e.id)) this.ignite(e, t.id, s.ignite.dps, s.ignite.time, 0);
    }
    if (sp.confuse && t.spotCd <= 0) {
      t.spotAcc = (t.spotAcc || 0) + dealt;
      if (t.spotAcc >= sp.confuse.charge) {
        t.spotAcc = 0;
        t.spotCd = sp.confuse.cd;
        for (const [e] of lit) this.confuse(e, sp.confuse.time, 0);
        this.events.push({ k: 'confuse', x: r2(t.lx), z: r2(t.lz), r: sp.radius });
      }
    }
  }

  /** Swarmer: one more bee sting stack on `e` (refreshes its oldest one when it has `b.stacks`). */
  applyBees(t, e, b) {
    const list = (e.bees ??= []);
    const sting = { damage: b.damage, tick: b.tick, left: b.time, next: b.tick, by: t.id };
    if (list.length < b.stacks) list.push(sting);
    else {
      let old = 0;
      for (let i = 1; i < list.length; i++) if (list[i].left < list[old].left) old = i;
      list[old] = sting;
    }
  }

  /**
   * Slasher: `n` more Bleed stacks on `e`. Stacks hurt a share of its max health every second;
   * at the tower's `bleedFx.max` they burst for `bleedFx.burst` of its max health and reset.
   */
  applyBleed(t, def, e, n) {
    const fx = def.bleedFx;
    if (!fx) return;
    e.bleed = Math.min(fx.max, e.bleed + n);
    e.bleedT = fx.time;
    e.bleedBy = t.id;
    e.bleedFx = fx;
    if (e.bleed < fx.max) return;
    e.bleed = 0;
    e.bleedT = 0;
    this.events.push({ k: 'bleedBurst', e: e.id });
    this.damage(t, e, e.maxHp * fx.burst * (e.boss ? fx.bossMult : 1), true);
  }

  /**
   * Executioner: an axe that hits `target`, then bounces `axe.bounces` times to the closest zombie
   * within `axe.jump` (never the one it just hit; unhit ones first, at most `axe.targets` different
   * ones). Every bounce does `axe.ramp` more damage. Lead zombies are skipped unless it sees lead.
   */
  throwAxe(t, s, target) {
    const a = s.axe;
    const det = this.detects(t, s);
    const hits = [target];
    const seen = new Set([target.id]);
    const j2 = a.jump * a.jump;
    let cur = target;
    for (let i = 0; i < a.bounces; i++) {
      let best = null;
      let bestD = Infinity;
      for (const e of this.enemies.values()) {
        if (e === cur || !canHit(det, e)) continue;
        const fresh = !seen.has(e.id);
        if (!fresh && seen.size < a.targets) continue; // go for new zombies while it can
        if (fresh && seen.size >= a.targets) continue;
        const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
        if (d <= j2 && d < bestD) {
          best = e;
          bestD = d;
        }
      }
      if (!best && seen.size < a.targets) {
        // No new zombie close by: bounce back to one it already hit.
        for (const e of this.enemies.values()) {
          if (e === cur || !seen.has(e.id)) continue;
          const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
          if (d <= j2 && d < bestD) {
            best = e;
            bestD = d;
          }
        }
      }
      if (!best) break;
      hits.push(best);
      seen.add(best.id);
      cur = best;
    }
    this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id), axe: 1 });
    hits.forEach((e, i) => {
      if (this.enemies.has(e.id)) this.damage(t, e, s.damage + i * a.ramp);
    });
  }

  /**
   * Archer (Bowmaster): an arrow that hits `target` and bounces to the closest unhit zombie within
   * `bounce.jump`, `bounce.hits` zombies in all, with its current arrow type's extras.
   */
  bounceArrow(t, s, target) {
    const modes = arrowModes(s);
    const mode = modes[(t.track || 0) % modes.length]; // `track` doubles as its arrow type (it's in snapshots)
    const fx = mode === 'normal' ? null : s.arrows[mode];
    // Flame and Explosive arrows can bounce onto lead zombies (only the fire / blast hurts them).
    const det = { ...this.detects(t, s), ...(mode === 'flame' || mode === 'explosive' ? { lead: true } : {}) };
    const total = s.bounce.hits + (mode === 'flame' ? fx.extra : 0);
    const hits = [target];
    const seen = new Set([target.id]);
    const j2 = s.bounce.jump * s.bounce.jump;
    let cur = target;
    while (hits.length < total) {
      let best = null;
      let bestD = Infinity;
      for (const e of this.enemies.values()) {
        if (seen.has(e.id) || !canHit(det, e)) continue;
        const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
        if (d <= j2 && d < bestD) {
          best = e;
          bestD = d;
        }
      }
      if (!best) break;
      hits.push(best);
      seen.add(best.id);
      cur = best;
    }
    this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id), ...(mode !== 'normal' ? { m: mode } : {}) });
    if (mode === 'explosive') this.explode(t, target.x, target.z, { damage: fx.damage, radius: fx.radius, det: { ...det, hidden: true } });
    const cfx = this.arrowFx(t, s); // Crossbower homing arrows: poison / cycling effects / Power Poacher
    hits.forEach((e, i) => {
      if (!this.enemies.has(e.id)) return;
      if (!e.lead || this.detects(t, s).lead) this.damage(t, e, s.damage);
      if (!this.enemies.has(e.id)) return;
      if (cfx) this.hitEffects(t, TOWERS[t.type], cfx.s, e, cfx.stun);
      if (!this.enemies.has(e.id)) return;
      if (mode === 'flame') this.ignite(e, t.id, fx.dps, fx.time, 0);
      if (mode === 'shock' && i < fx.targets) this.stop({}, e, fx.stun, 'stun');
    });
  }

  /** Sledger Aftershock: a second shockwave after a swing, for `aftershock.mult` of its damage. */
  aftershock(t, def, s) {
    if (!s.aftershock) return;
    const list = this.findTargets(t, s, s.targets);
    if (!list.length) return;
    this.events.push({ k: 'quake', x: r2(t.x), z: r2(t.z), r: s.range });
    for (const e of list) {
      this.damage(t, e, s.damage * s.aftershock.mult);
      if (this.enemies.has(e.id)) this.hitEffects(t, def, { ...s, chill: 0 }, e, 0); // refreshes the chill without adding to it
    }
  }

  /** Seconds a `fly` tower's projectile takes from `t` to `e` (a level's `speed` overrides `def.fly`). */
  flyTime(t, s, e) {
    const speed = s.speed ?? TOWERS[t.type].fly;
    return Math.max(0.06, Math.hypot(e.x - t.x, e.z - t.z) / speed);
  }

  /**
   * A physical projectile (slime glob, harpoon, rebar) flying from `t` to zombie `e`: it homes in
   * and deals `dmg` plus the tower's on-hit effects when it arrives. If `e` dies first, it's wasted.
   */
  launch(t, s, e, dmg, stun) {
    const time = this.flyTime(t, s, e);
    this.flights.push({ tower: t.id, type: t.type, enemy: e.id, time, dmg, stun, s });
    this.events.push({ k: 'fly', t: t.id, e: e.id, d: r2(time) });
  }

  updateFlights(dt) {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      if ((f.time -= dt) > 0) continue;
      this.flights.splice(i, 1);
      const e = this.enemies.get(f.enemy);
      if (!e) continue;
      const t = this.towers.get(f.tower) ?? null;
      this.events.push({ k: 'impact', e: e.id, t: f.tower, ...(f.ice ? { ice: 1 } : {}) });
      if (f.ice) {
        // Frost Grenade: freezes the zombie it lands on.
        if (!e.boss) this.stop({}, e, f.ice, 'ice');
        continue;
      }
      this.damage(t, e, f.dmg);
      if (this.enemies.has(e.id)) this.hitEffects(t, TOWERS[f.type], f.s, e, f.stun);
    }
  }

  /** Archer: a slow arrow flies straight along `aim` out to its range, piercing `arrow.pierce` zombies. */
  fireArrow(t, s, aim) {
    const a = s.arrow;
    const tx = t.x + Math.sin(aim) * s.range;
    const tz = t.z + Math.cos(aim) * s.range;
    const time = s.range / a.speed;
    const fx = this.arrowFx(t, s); // Crossbower: poison / cycling effects / Power Poacher on every zombie hit
    this.blades.push({ tower: t.id, loop: false, ox: t.x, oz: t.z, tx, tz, t: 0, time, left: a.pierce, hits: new Set(), damage: s.damage, det: this.detects(t, s),
      ...(s.ignite ? { burn: s.ignite.dps, burnTime: s.ignite.time } : {}), ...(fx ? { fxS: fx.s, fxStun: fx.stun } : {}) });
    this.events.push({ k: 'knife', t: t.id, x: r2(tx), z: r2(tz), d: r2(time) });
  }

  /** Knifer Dual Wield / Flayer: every `toss.every` s, throws a knife at a zombie within `toss.range`. */
  tossKnife(t, s, dt) {
    const k = s.toss;
    t.tossT = (t.tossT ?? 0) - dt;
    if (t.tossT > 0) return;
    const target = this.findTarget(t, s, t.x, t.z, k.range);
    if (!target) {
      t.tossT = 0;
      return;
    }
    t.tossT = k.every;
    const time = Math.hypot(target.x - t.x, target.z - t.z) / k.speed;
    const p = this.leadPoint(target, time);
    // Fly a little past the aim point so a knife that's slightly off can still connect.
    const dx = p.x - t.x;
    const dz = p.z - t.z;
    const d = Math.hypot(dx, dz) || 1;
    const reach = d + 1.5;
    const tx = t.x + (dx / d) * reach;
    const tz = t.z + (dz / d) * reach;
    const fly = reach / k.speed;
    this.blades.push({ tower: t.id, loop: false, ox: t.x, oz: t.z, tx, tz, t: 0, time: fly, left: k.pierce ?? 1, hits: new Set(), damage: k.damage, det: this.detects(t, s),
      ...(k.injure ? { injure: k.injure } : {}), ...(k.stun ? { stun: k.stun, bossSlow: k.bossSlow, flash: k.flash } : {}) }); // Slugger baseball
    this.events.push({ k: 'knife', t: t.id, x: r2(tx), z: r2(tz), d: r2(fly) });
  }

  /** Harpoon Hunter: one more harpoon stuck in `e`, slowing it (stacking up to the tower's `harpoonMax`). */
  applyHarpoon(def, e, h) {
    if (e.statusImmune) return;
    (e.harpoons ??= []).push({ slow: h.slow, t: h.time });
    e.harpoonMax = Math.max(e.harpoonMax, e.void && def.voidSlow != null ? Math.min(def.harpoonMax, def.voidSlow) : def.harpoonMax);
    e.harpoonCap = Math.max(e.harpoonCap, def.slowCap);
    e.harpoonSlow = Math.min(e.harpoonMax, e.harpoonSlow + h.slow);
  }

  /**
   * Huntsman Bounty: a timer that only counts down while a zombie it can see is in range. Each
   * time it runs out the owner gets `payday.pay` cash.
   */
  updatePayday(t, s, dt) {
    const det = this.detects(t, s);
    if (!this.anyNear(t.x, t.z, s.range, det)) return;
    t.payT = (t.payT ?? s.payday.every) - dt;
    if (t.payT > 0) return;
    t.payT += s.payday.every;
    this.cashShot(t, { pay: s.payday.pay, spin: 0 });
  }

  /** Sentry Minigun: a homing rocket at its target every `rockets.every` s, on top of its gun. */
  fireRockets(t, s, target, dt) {
    t.rocketT = (t.rocketT ?? 0) - dt;
    if (t.rocketT > 0) return;
    t.rocketT = s.rockets.every;
    const time = 0.5;
    this.shells.push({ tower: t.id, enemy: target.id, x: target.x, z: target.z, time, damage: s.rockets.damage, radius: s.rockets.radius, det: this.detects(t, s), main: target.id });
    this.events.push({ k: 'rocket', t: t.id, e: target.id, d: time });
  }

  /** Spends one bullet; an empty gun starts reloading. */
  useAmmo(t, s) {
    t.ammo--;
    if (t.ammo > 0) return;
    t.ammo = 0;
    t.reloadT = s.reload;
    this.events.push({ k: 'reload', t: t.id, d: s.reload });
  }

  /** Skip-test for the Gatling Gun: zombies outside its cone (half-angle `cone`) around where it faces. */
  outsideCone(t, cone) {
    return (e) => Math.abs(angleDiff(t.face, Math.atan2(e.x - t.x, e.z - t.z))) > cone;
  }

  /**
   * Gatling Gun in FPS Mode: the owner aims it (t.aimYaw) and holds fire (t.fire). Each bullet
   * flies in a straight line across the map and hits the first `fps.pierce` zombies it passes.
   */
  updateFps(t, def, s, dt, loaded) {
    t.aimAge += dt;
    if (t.aimAge > AIM_TIMEOUT) {
      // No aim updates for a while (the player left or lost connection): back to automatic.
      t.manual = false;
      t.fire = false;
      return;
    }
    t.yaw = t.aimYaw;
    t.face = t.aimYaw; // the cone follows the gun, so it keeps facing this way back on automatic
    if (def.heli) {
      // Combat Drone Direct Control: it flies wherever the owner steers it (they send where
      // they've flown to; it follows at a bit over its own speed so it can catch up).
      if (Number.isFinite(t.flyX)) {
        const mx = t.flyX - t.hx;
        const mz = t.flyZ - t.hz;
        const md = Math.hypot(mx, mz);
        const step = (s.heliSpeed ?? def.heli.speed) * 1.5 * dt;
        if (md > 1e-3) {
          const k = Math.min(1, step / md);
          t.hx += mx * k;
          t.hz += mz * k;
        }
      }
      // Its patrol zone moves with it, so it stays here when you let go.
      t.cx = t.hx;
      t.cz = t.hz;
      t.hyaw = t.aimYaw;
    }
    if (!t.fire || !loaded) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    const det = this.detects(t, s);
    // The bullet flies in 3D from the FPS camera along the aim (yaw and pitch). `along` is how
    // far it has gone across the ground; its height there is oy + along * slope.
    const ux = Math.sin(t.aimYaw);
    const uz = Math.cos(t.aimYaw);
    const px = def.heli ? t.hx : t.x; // the Combat Drone shoots from wherever it's flying
    const pz = def.heli ? t.hz : t.z;
    const ox = px - ux * FPS_BACK;
    const oz = pz - uz * FPS_BACK;
    const oy = heightAt(px, pz) + t.aimH;
    const slope = Math.tan(t.aimPitch);
    // Aimed down, it stops where it hits the ground.
    const reach = slope < 0 ? Math.min(FPS_REACH, oy / -slope) : FPS_REACH;
    const line = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const def2 = ENEMIES[e.type];
      const size = def2.scale ?? 1;
      const dx = e.x - ox;
      const dz = e.z - oz;
      const along = dx * ux + dz * uz;
      if (along < 0 || along > reach) continue;
      if (Math.abs(dx * uz - dz * ux) > FPS_WIDTH * size) continue;
      // Zombies are standing boxes from their feet (or flying height) to the top of their head.
      const y = oy + along * slope;
      const foot = def2.flying ? FLY_HEIGHT : 0;
      if (y >= foot - 0.4 && y <= foot + (def2.h ?? 5.2) * size + 0.4) line.push({ e, along });
    }
    line.sort((a, b) => a.along - b.along);
    const hits = line.slice(0, def.fps.pierce).map((h) => h.e);
    // The bullet stops at the last zombie it pierces (or the ground, or flies on out of sight).
    const len = hits.length >= def.fps.pierce ? line[def.fps.pierce - 1].along : Math.min(reach, 160);
    this.events.push({
      k: 'fpsShot', t: t.id, es: hits.map((e) => e.id),
      x: r2(ox + ux * len), y: r2(oy + slope * len), z: r2(oz + uz * len),
    });
    for (const e of hits) if (this.enemies.has(e.id)) this.damage(t, e, s.damage * def.fps.mult);
    if (s.ammo) this.useAmmo(t, s);
  }

  /**
   * Pursuit: the helicopter flies around inside its patrol zone. With a zombie in the zone it
   * flies over to hover near it and shoots whatever is in its gun range, plus splash missiles.
   */
  updatePursuit(t, def, s, dt, loaded) {
    // Helicopter: parked on its pad until it's moved the first time.
    if (def.moveDelay != null && t.parked !== false) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    // Helicopter Pursuit: the zone follows the zombie closest to the base, anywhere on the map.
    if (t.active > 0 && s.abilities?.some((a) => a.key === 'chase')) {
      const det = this.detects(t, s);
      let first = null;
      for (const e of this.enemies.values()) if (canHit(det, e) && (!first || e.dist > first.dist)) first = e;
      if (first) {
        t.cx = first.x;
        t.cz = first.z;
      }
    }
    const R = s.patrol;
    const target = this.findTarget(t, s, t.cx, t.cz, R + s.range);
    let gx = t.hx;
    let gz = t.hz;
    if (target) {
      // Fly toward it until it's comfortably inside the gun's range, then hover.
      const dx = target.x - t.hx;
      const dz = target.z - t.hz;
      const d = Math.hypot(dx, dz);
      const hover = s.range * 0.55;
      if (d > hover) {
        gx = t.hx + (dx / d) * (d - hover);
        gz = t.hz + (dz / d) * (d - hover);
      }
      t.hyaw = lerpAngle(t.hyaw, Math.atan2(dx, dz), Math.min(1, dt * 6));
    } else {
      // Nothing to chase: circle lazily around the middle of the zone.
      t.ang = (t.ang + dt * 0.35) % TAU;
      gx = t.cx + Math.cos(t.ang) * R * 0.45;
      gz = t.cz + Math.sin(t.ang) * R * 0.45;
    }
    // Never leave the patrol zone.
    const ox = gx - t.cx;
    const oz = gz - t.cz;
    const od = Math.hypot(ox, oz);
    if (od > R) {
      gx = t.cx + (ox / od) * R;
      gz = t.cz + (oz / od) * R;
    }
    const mx = gx - t.hx;
    const mz = gz - t.hz;
    const md = Math.hypot(mx, mz);
    const step = (s.heliSpeed ?? def.heli.speed) * dt;
    if (md > 1e-3) {
      const k = Math.min(1, step / md);
      t.hx += mx * k;
      t.hz += mz * k;
      if (!target && md > 0.5) t.hyaw = lerpAngle(t.hyaw, Math.atan2(mx, mz), Math.min(1, dt * 3));
    }
    // Helicopter: waits a moment after every move before it attacks.
    if (t.heliWait > 0) {
      t.heliWait = Math.max(0, t.heliWait - dt);
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    // Stealth Comanche: hidden zombies near the helicopter are revealed to every tower.
    if (s.reveal) {
      const r2max = s.range * s.range;
      for (const e of this.enemies.values()) {
        if (e.hidden && (e.x - t.hx) ** 2 + (e.z - t.hz) ** 2 <= r2max) e.revealT = Math.max(e.revealT || 0, 0.3);
      }
    }
    // Cryo Helicopter: an ice beam at up to `beam` zombies near the helicopter, unfrozen ones first.
    if (s.beam) {
      const from = { ...t, x: t.hx, z: t.hz };
      let list = this.findTargets(from, s, s.beam, (e) => e.stopKind !== 'ice');
      if (list.length < s.beam) list = list.concat(this.findTargets(from, s, s.beam - list.length, (e) => e.stopKind === 'ice'));
      if (!list.length) t.cooldown = Math.max(0, t.cooldown);
      else if (t.cooldown <= 0) {
        t.cooldown += s.cooldown;
        const at = list.map((e) => [e.x, e.z]);
        for (const e of list) {
          this.shoot(t, e, s.damage);
          if (this.enemies.has(e.id)) this.hitEffects(t, def, s, e, 0);
        }
        if (s.spray) this.spray(t, def, s, list, at);
      }
    } else if (loaded) {
      // Gun: whatever is in range of the helicopter itself.
      const e = this.findTarget(t, s, t.hx, t.hz, s.range);
      if (e && t.cooldown <= 0) {
        t.cooldown += s.cooldown;
        if (s.radius) {
          // Apache: explosive bullets.
          this.events.push({ k: 'shot', t: t.id, e: e.id });
          this.explode(t, e.x, e.z, { damage: s.damage, radius: s.radius, main: e.id, det: this.detects(t, s), ...(s.fire ? { burn: s.fire.dps, burnTime: s.fire.time } : {}) });
        } else {
          this.shoot(t, e, s.damage);
          if (s.fire && this.enemies.has(e.id)) this.ignite(e, t.id, s.fire.dps, s.fire.time, 0); // Jet Trooper Fire Rounds
          if (s.slime && this.enemies.has(e.id)) this.applySlime(e, s.slime); // Splash
        }
        if (s.pass && this.enemies.has(e.id)) this.passThrough({ ...t, x: t.hx, z: t.hz }, s, e, s.damage);
        if (s.ammo) this.useAmmo(t, s);
      } else if (!e) t.cooldown = Math.max(0, t.cooldown);
    }
    // Helicopter: several missile weapons, each on its own timer.
    if (s.missiles) {
      t.mT ??= [];
      s.missiles.forEach((m, k) => {
        t.mT[k] = Math.max(0, (t.mT[k] ?? 0) - dt);
        if (t.mT[k] > 0) return;
        if (this.fireMissiles(t, s, m, k)) t.mT[k] = m.every;
      });
      return;
    }
    // Missiles: each one at a different zombie near the helicopter.
    if (s.missile) {
      const m = s.missile;
      t.missileT = Math.max(0, t.missileT - dt);
      if (t.missileT > 0) return;
      const list = this.findTargets({ ...t, x: t.hx, z: t.hz }, { ...s, range: m.range }, m.count);
      if (!list.length) return;
      t.missileT = m.every;
      const det = this.detects(t, s);
      for (let i = 0; i < m.count; i++) {
        const e = list[i % list.length];
        const time = MISSILE_TIME + i * 0.1;
        this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time, damage: m.damage, radius: m.radius, det });
        this.events.push({ k: 'missile', t: t.id, e: e.id, i, d: time });
      }
    }
  }

  /** One volley of Helicopter missiles `m` (weapon `k`): each at a different zombie near the helicopter. Returns false if nothing is in range. */
  fireMissiles(t, s, m, k) {
    // air: only flying zombies (AA Guns). flying: this weapon hits flyers even if the main gun can't (Gatling Turret).
    let det = this.detects(t, s);
    if (m.air || m.flying) det = { ...det, flying: true, ...(m.air ? { ground: false } : {}) };
    if (m.hidden) det = { ...det, hidden: true };
    // Psycho Slayer: minRange = deadzone, minHp = skips zombies with less health, strongest = the toughest first.
    const fx = t.hx ?? t.x;
    const fz = t.hz ?? t.z;
    const close = (m.minRange ?? 0) ** 2;
    const ok = (e) => (!m.air || e.flying) && (!close || (e.x - fx) ** 2 + (e.z - fz) ** 2 >= close) && !(m.minHp && e.hp < m.minHp);
    const list = this.findTargets({ ...t, x: fx, z: fz, ...(m.strongest ? { targetMode: 2 } : {}) }, { ...s, range: m.range ?? s.range }, m.count, ok, det);
    if (!list.length) return false;
    if (m.reveal) {
      // Marauder sonar bombs: hidden zombies first, and every hidden zombie near the target is revealed.
      list.sort((a, c) => (c.hidden ? 1 : 0) - (a.hidden ? 1 : 0));
      const at = list[0];
      for (const e of this.enemies.values()) if (e.hidden && (e.x - at.x) ** 2 + (e.z - at.z) ** 2 <= m.radius * m.radius * 4) e.revealT = Math.max(e.revealT || 0, m.reveal);
    }
    for (let i = 0; i < m.count; i++) {
      const e = m.focus || m.strongest || m.gap ? list[0] : list[i % list.length]; // focus: every shell at the same zombie (Mortars)
      if (m.fx) {
        // Psycho Slayer Slam / Railgun: a hit straight from the tower (`gap` s between shots).
        const time = (m.fx === 'slam' ? 0.15 : 0.05) + i * (m.gap ?? 0);
        this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time, damage: m.damage, radius: m.radius, det, main: e.id, stun: m.stun, stunAny: m.stunAny });
        this.events.push({ k: 'pshot', t: t.id, e: e.id, fx: m.fx, r: m.radius, d: r2(time) });
        continue;
      }
      const time = MISSILE_TIME + i * (m.gap ?? 0.1);
      // Cryo Missiles: hit at most `maxHits` zombies and chill them.
      this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time, damage: m.damage, radius: m.radius, det, main: e.id, maxHits: m.maxHits, chill: m.chill, stun: m.stun, stunAny: m.stunAny, burn: m.burn, burnTime: m.burnTime, ignoreExplosiveResist: m.ignoreExplosiveResist });
      this.events.push({ k: 'missile', t: t.id, e: e.id, i: i + k * 4, d: time });
    }
    return true;
  }

  // ---------------------------------------------------------------- Shield Tower, Oil Derrick, Combat Medic

  /** Shield Tower shields soak `dmg` meant for tower `t` (its own shield first, then shared ones). Returns what's left. */
  soakShield(t, dmg) {
    if (t.shieldHp > 0) {
      const used = Math.min(t.shieldHp, dmg);
      t.shieldHp -= used;
      dmg -= used;
    }
    if (dmg <= 0) return 0;
    for (const o of this.towers.values()) {
      if (!(o.pool > 0) || o.hp <= 0 || !this.shieldCovers(o, t)) continue;
      const used = Math.min(o.pool, dmg);
      o.pool -= used;
      dmg -= used;
      if (dmg <= 0) return 0;
    }
    return dmg;
  }

  /** Does Shield Tower `o` cover tower `t`? Shield Towers can't shield each other (Top path shields itself). */
  shieldCovers(o, t) {
    const sh = TOWERS[o.type].levels[o.level].shield;
    if (!sh) return false;
    if (t === o) return !!sh.shared;
    if (TOWERS[t.type].levels[t.level].shield) return false;
    const r = TOWERS[o.type].levels[o.level].aura;
    return (t.x - o.x) ** 2 + (t.z - o.z) ** 2 <= r * r;
  }

  /**
   * Shield Tower: every `shield.every` s it gives out its shield. Shared (Top path): one pool of
   * `amount` that every tower in range drains. Per tower (Bottom path): each tower in range (not
   * itself) gets a shield of `amount`.
   */
  updateShieldTower(t, s, dt) {
    const sh = s.shield;
    t.shieldGenT = (t.shieldGenT ?? 0) - dt;
    if (t.shieldGenT > 0) return;
    t.shieldGenT = sh.every;
    if (sh.shared) t.pool = sh.amount;
    else {
      t.pool = 0;
      for (const o of this.towers.values()) if (o !== t && this.shieldCovers(t, o)) o.shieldHp = Math.max(o.shieldHp || 0, sh.amount);
    }
    this.events.push({ k: 'shieldUp', id: t.id, x: t.x, z: t.z, r: s.aura });
  }

  /** Oil Derrick: pays its owner `oil.pay` every `oil.every` seconds. */
  updateOil(t, s, dt) {
    if (this.over || t.holo) return;
    t.oilT = (t.oilT ?? 0) + dt;
    if (t.oilT < s.oil.every) return;
    t.oilT -= s.oil.every;
    const owner = this.players.get(t.owner);
    if (!owner) return;
    owner.cash += s.oil.pay;
    this.events.push({ k: 'income', id: t.id, owner: t.owner, v: s.oil.pay, x: t.x, z: t.z });
  }

  /** Combat Medic Revive Pack: just recharges (the pack is thrown in revivePack when a tower goes down). */
  updateRevive(t, s, dt) {
    t.revCd = Math.max(0, (t.revCd ?? s.revive.first ?? 0) - dt);
  }

  /**
   * Tower `down` was just knocked out: the first working Combat Medic in range with a Revive Pack
   * ready throws it, and `down` is back at full health `revive.delay` s later.
   */
  revivePack(down) {
    if (down.holo || TOWERS[down.type].mechanical || TOWERS[down.type].rebuilds) return;
    for (const m of this.towers.values()) {
      const ms = TOWERS[m.type].levels[m.level];
      if (m === down || !ms.revive || m.hp <= 0 || m.stunT > 0 || m.holo || (m.revCd ?? ms.revive.first ?? 0) > 0) continue;
      if ((m.x - down.x) ** 2 + (m.z - down.z) ** 2 > ms.aura * ms.aura) continue;
      down.reviveT = ms.revive.delay;
      m.revCd = ms.revive.cooldown;
      this.events.push({ k: 'revive', id: down.id, by: m.id, x: down.x, z: down.z, d: ms.revive.delay });
      return;
    }
  }

  /** Combat Medic Medic Drone: heals the `n` most hurt towers within `radius` of its spot every second until it leaves. */
  updateHealZones(dt) {
    if (!this.healZones?.length) return;
    for (let i = this.healZones.length - 1; i >= 0; i--) {
      const z = this.healZones[i];
      if ((z.left -= dt) <= 0 || !this.towers.has(z.tower)) {
        this.healZones.splice(i, 1);
        continue;
      }
      const r2max = z.radius * z.radius;
      const hurt = [...this.towers.values()]
        .filter((o) => o.hp < o.maxHp && !TOWERS[o.type].noHeal && (o.x - z.x) ** 2 + (o.z - z.z) ** 2 <= r2max)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
        .slice(0, z.n);
      for (const o of hurt) this.healTower(o, z.heal * dt);
    }
  }

  /** Passive weapons (Warship missiles, mortars, AA guns...), each on its own timer. */
  updateMissiles(t, s, dt) {
    t.mT ??= [];
    s.missiles.forEach((m, k) => {
      t.mT[k] = Math.max(0, (t.mT[k] ?? 0) - dt);
      if (t.mT[k] > 0) return;
      if (this.fireMissiles(t, s, m, k)) t.mT[k] = m.every;
    });
  }

  /** Stinger handgun: shoots a zombie inside its rocket deadzone. */
  fireHandgun(t, def, s, dt) {
    const hg = s.handgun;
    t.hgT = Math.max(-dt, (t.hgT ?? 0) - dt);
    if (t.hgT > 0) return;
    const e = this.findTarget(t, s, t.x, t.z, minRangeOf(def, s));
    if (!e) {
      t.hgT = Math.max(0, t.hgT);
      return;
    }
    t.hgT += hg.cooldown;
    this.shoot(t, e, hg.damage);
  }

  /** The point on the path closest to (x, z). */
  nearestPathPoint(x, z) {
    const p = {};
    let best = null;
    let bestD = Infinity;
    for (let r = 0; r < path.routes.length; r++) for (let d = 0; d <= path.length; d += 0.5) {
      path.at(d, p, r);
      const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = { x: p.x, z: p.z };
      }
    }
    return best;
  }

  /** Golden Mine Layer Crossbow: a mine shot onto the path at the clicked spot. */
  crossbowMine(t, s, ab, x, z) {
    const p = this.nearestPathPoint(x, z);
    if (!p) return;
    const trap = { id: this.nextId++, tower: t.id, kind: 'mine', x: p.x, z: p.z, land: TRAP_FLIGHT, uses: 1, hits: new Set(), ...ab.mine };
    trap.det = { hidden: true, flying: false, lead: true };
    this.traps.set(trap.id, trap);
    t.yaw = Math.atan2(p.x - t.x, p.z - t.z);
    this.events.push({ k: 'trapThrow', t: t.id, x: r2(p.x), z: r2(p.z), d: TRAP_FLIGHT });
  }

  /** Golden Mine Layer Charged Throw: a mine at the toughest zombie on the map (flyers too). */
  chargedThrow(t, s, ab) {
    const det = { hidden: !!s.hidden, flying: true, lead: true };
    let best = null;
    for (const e of this.enemies.values()) if (canHit(det, e) && (!best || e.hp > best.hp)) best = e;
    if (!best) return;
    const time = 0.8;
    this.shells.push({ tower: t.id, enemy: best.id, x: best.x, z: best.z, time, main: best.id, damage: ab.damage + ab.extra, splash: ab.damage, radius: ab.radius,
      stun: ab.stun, stunAny: true, burn: ab.burn, burnTime: ab.burnTime, det });
    t.yaw = Math.atan2(best.x - t.x, best.z - t.z);
    this.events.push({ k: 'fly', t: t.id, e: best.id, d: time });
  }

  /** Combat Drone Spotter: the toughest zombie in range takes extra damage and is slowed for a while. */
  spotter(t, s, ab) {
    let best = null;
    const det = this.detects(t, s);
    for (const e of this.enemies.values()) {
      if (!canHit(det, e) || (e.x - (t.hx ?? t.x)) ** 2 + (e.z - (t.hz ?? t.z)) ** 2 > s.range * s.range) continue;
      if (!best || e.hp > best.hp) best = e;
    }
    if (!best) return;
    const boss = best.boss;
    best.vuln = Math.max(best.vuln || 0, boss ? ab.bossVuln : ab.vuln);
    best.vulnT = Math.max(best.vulnT || 0, ab.duration);
    best.thornSlow = Math.max(best.thornSlow || 0, boss ? ab.bossSlow : ab.slow);
    best.thornT = Math.max(best.thornT || 0, ab.duration);
    this.events.push({ k: 'spotted', e: best.id, d: ab.duration });
  }

  /** Cowboy cash shot: pays the owner, then the Cowboy twirls its gun for a moment. */
  cashShot(t, c) {
    if (c.captain) {
      // Plunder: only the Captain (its owner's oldest Plunder still standing) digs up treasure.
      let cap = null;
      for (const o of this.towers.values()) if (o.type === t.type && o.owner === t.owner && o.hp > 0 && (!cap || o.id < cap.id)) cap = o;
      if (cap !== t) return;
    }
    const owner = this.players.get(t.owner);
    if (owner) owner.cash += c.pay;
    t.spinT = c.spin;
    this.events.push({ k: 'cash', id: t.id, owner: t.owner, v: c.pay, spin: c.spin, x: t.x, z: t.z });
  }

  /** DJ Booth: never shoots; it only fires the pulses of a Red Drop the Beat. */
  updateBooth(t, s, dt) {
    if (!(t.pulses > 0)) return;
    t.pulseT -= dt;
    if (t.pulseT > 0) return;
    const ab = s.abilities?.find((a) => a.key === 'beat');
    if (!ab) return void (t.pulses = 0);
    t.pulses--;
    t.pulseT += ab.every;
    const det = this.detects(t, s);
    const r2max = s.aura * s.aura;
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      e.vuln = Math.max(e.vuln, ab.vuln);
      e.vulnT = Math.max(e.vulnT, ab.vulnTime);
      this.damage(t, e, ab.pulseDamage);
    }
    this.events.push({ k: 'beat', id: t.id, x: t.x, z: t.z, r: s.aura, c: 2 });
  }

  /** Drop the Beat: what it does depends on the track the DJ Booth is playing. */
  dropBeat(t, s, ab) {
    const track = t.track || 0;
    if (track === 1) {
      const owner = this.players.get(t.owner);
      if (owner) owner.cash += ab.cash;
      this.events.push({ k: 'income', id: t.id, owner: t.owner, v: ab.cash, x: t.x, z: t.z });
    } else if (track === 2) {
      t.pulses = ab.pulses;
      t.pulseT = 0; // the first pulse goes off right away
      return;
    } else {
      const det = this.detects(t, s);
      const r2max = s.aura * s.aura;
      for (const e of this.enemies.values()) {
        if (!canHit(det, e) || e.statusImmune || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
        e.dist = Math.max(0, e.dist - ab.knock * (e.boss ? ab.bossKnock : 1));
        e.beatSlow = Math.max(e.beatSlow, ab.slow);
        e.beatT = Math.max(e.beatT, ab.slowTime);
      }
    }
    this.events.push({ k: 'beat', id: t.id, x: t.x, z: t.z, r: s.aura, c: track });
  }

  /** Skip-test for towers with a deadzone: zombies closer than `r` can't be targeted. */
  deadzone(t, r) {
    return (e) => (e.x - t.x) ** 2 + (e.z - t.z) ** 2 < r * r;
  }

  /**
   * Pump Shotgunner: `pellets` pellets at random angles inside the cone around `aim`. Each one
   * pierces along its line: the first 2 zombies take full damage, the 3rd half.
   * Saboteur: each pellet hits the first `scatter` zombies on its line (full damage) and
   * poisons every zombie it hits.
   */
  pump(t, s, aim) {
    const det = this.detects(t, s);
    const near = [];
    const r2max = s.range * s.range;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      if (dx * dx + dz * dz <= r2max) near.push({ e, dx, dz });
    }
    const hits = new Map(); // enemy -> damage this shot
    for (let i = 0; i < s.pellets; i++) {
      const a = aim + (Math.random() * 2 - 1) * s.cone;
      const ux = Math.sin(a);
      const uz = Math.cos(a);
      const line = [];
      for (const n of near) {
        const along = n.dx * ux + n.dz * uz;
        if (along < 0) continue;
        if (Math.abs(n.dx * uz - n.dz * ux) <= PELLET_WIDTH) line.push({ e: n.e, along });
      }
      line.sort((p, q) => p.along - q.along);
      for (let k = 0; k < Math.min(s.scatter ?? 3, line.length); k++) {
        const d = s.scatter || k < 2 ? s.damage : s.damage / 2;
        hits.set(line[k].e, (hits.get(line[k].e) || 0) + d);
      }
    }
    this.events.push({ k: 'pellets', t: t.id, es: [...hits.keys()].map((e) => e.id), a: r2(aim), r: s.range, c: s.cone });
    for (const [e, d] of hits) {
      if (!this.enemies.has(e.id)) continue;
      this.damage(t, e, d);
      if (s.poison && this.enemies.has(e.id)) this.applyPoison(t, e, s.poison);
    }
  }

  /** Saboteur poison: damage every `tick` s and a slow. The strongest poison wins; hits refresh it. */
  applyPoison(t, e, po) {
    if (e.statusImmune || (po.fire && e.fireImmune)) return; // Knifer bleed: fire-immune zombies ignore it
    const old = e.poison;
    if (old && old.left > 0 && old.damage / old.tick > po.damage / po.tick) {
      old.left = Math.max(old.left, po.time);
      return;
    }
    e.poison = { damage: po.damage, tick: po.tick, slow: po.slow, melt: po.melt ?? 0, left: po.time, next: old?.left > 0 ? old.next : po.tick, by: t.id };
  }

  /** Electroshocker: a bolt that hits the target and jumps to the closest unhit zombie, stunning each. */
  chain(t, def, s, target) {
    const det = this.detects(t, s);
    const list = [target];
    const seen = new Set([target.id]);
    let cur = target;
    const j2 = s.jump * s.jump;
    while (list.length < s.chains) {
      let best = null;
      let bestD = Infinity;
      for (const e of this.enemies.values()) {
        if (seen.has(e.id) || !canHit(det, e)) continue;
        const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
        if (d <= j2 && d < bestD) {
          best = e;
          bestD = d;
        }
      }
      if (!best) break;
      list.push(best);
      seen.add(best.id);
      cur = best;
    }
    this.events.push({ k: 'zap', t: t.id, es: list.map((e) => e.id) });
    list.forEach((e, i) => {
      if (!this.enemies.has(e.id)) return;
      // Shock Trooper: the jumps after the first zombie do `chainMult` of the damage.
      this.damage(t, e, i && s.chainMult != null ? Math.round(s.damage * s.chainMult * 100) / 100 : s.damage);
      if (s.stun && this.enemies.has(e.id)) this.stop(def, e, s.stun, 'stun');
    });
    // Tesla Smite: every zombie hit fills the meter; when it's full, a thunderbolt hits the target.
    const sm = s.smite;
    if (!sm) return;
    t.meter = (t.meter || 0) + list.length;
    if (t.meter >= sm.hits) {
      t.meter = 0;
      this.events.push({ k: 'smite', x: r2(target.x), z: r2(target.z), r: sm.radius });
      this.explode(t, target.x, target.z, { damage: sm.damage, radius: sm.radius, det, pierceArmor: true, smite: true });
    }
    t.charge = t.meter / sm.hits;
  }

  // ---------------------------------------------------------------- pulses & sweeps

  /** Pulse Trooper: whenever a zombie it can see is in range, sends out a growing ring. */
  firePulse(t, def, s) {
    if (t.cooldown > 0) return;
    const det = this.detects(t, s);
    if (!this.anyNear(t.x, t.z, s.range + PULSE_WIDTH, det)) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    this.rings.push({ tower: t.id, x: t.x, z: t.z, r: 0, max: s.range, speed: def.pulse, damage: s.damage, det, hits: new Set() });
    this.events.push({ k: 'pulse', t: t.id, r: r2(s.range), d: r2(s.range / def.pulse) });
  }

  /** Rings grow outward; each zombie the edge passes over is hit once. */
  updateRings(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      const r0 = ring.r;
      ring.r = Math.min(ring.max, ring.r + ring.speed * dt);
      const lo = Math.max(0, r0 - PULSE_WIDTH);
      const hi = ring.r + PULSE_WIDTH;
      const tower = this.towers.get(ring.tower) ?? null;
      for (const e of [...this.enemies.values()]) {
        if (ring.hits.has(e.id) || !canHit(ring.det, e)) continue;
        const d = Math.hypot(e.x - ring.x, e.z - ring.z);
        if (d < lo || d > hi) continue;
        ring.hits.add(e.id);
        this.events.push({ k: 'slice', e: e.id });
        this.damage(tower, e, ring.damage);
      }
      if (ring.r >= ring.max) this.rings.splice(i, 1);
    }
  }

  /**
   * Sweeper: two lasers on opposite sides of the tower, reaching across the whole map, spin
   * around it (one turn every `spin` seconds) for `duration` seconds.
   */
  sweep(t, ab) {
    const ang = t.yaw || 0;
    this.sweeps.push({ tower: t.id, x: t.x, z: t.z, ang, rate: TAU / ab.spin, spin: ab.spin, left: ab.duration, t: 0, damage: ab.damage, last: [new Map(), new Map()] });
    this.events.push({ k: 'sweep', t: t.id, a: r2(ang), d: ab.duration, s: ab.spin });
  }

  /**
   * Each laser hits every zombie (hidden ones too) it passes over. A zombie can be hit again by
   * the same laser on its next turn, so it's hit about twice per spin while the lasers last.
   */
  updateSweeps(dt) {
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const sw = this.sweeps[i];
      const step = Math.min(dt, sw.left);
      const a0 = sw.ang;
      const turn = sw.rate * step;
      sw.ang += turn;
      sw.t += step;
      sw.left -= step;
      const tower = this.towers.get(sw.tower) ?? null;
      for (const e of [...this.enemies.values()]) {
        const dx = e.x - sw.x;
        const dz = e.z - sw.z;
        const d = Math.hypot(dx, dz);
        const tol = d > 0.01 ? Math.atan2(SWEEP_WIDTH, d) : Math.PI;
        const ea = Math.atan2(dx, dz);
        for (let k = 0; k < 2; k++) {
          const diff = (((ea - a0 - k * Math.PI) % TAU) + TAU) % TAU; // how far ahead of the laser it is
          if (diff > turn + tol && diff < TAU - tol) continue;
          const last = sw.last[k].get(e.id);
          if (last != null && sw.t - last < sw.spin * 0.5) continue; // already hit on this pass
          sw.last[k].set(e.id, sw.t);
          this.events.push({ k: 'slice', e: e.id });
          this.damage(tower, e, sw.damage);
          if (!this.enemies.has(e.id)) break;
        }
      }
      if (sw.left <= 0) this.sweeps.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- traps

  /** Path points a Trapper can throw traps on: every unit of path inside its range. */
  trapSpots(t, range) {
    const spots = [];
    const p = {};
    for (let r = 0; r < path.routes.length; r++) {
      for (let d = 0; d < path.length; d += 1) {
        path.at(d, p, r);
        if ((p.x - t.x) ** 2 + (p.z - t.z) ** 2 <= range * range) spots.push({ d, r, x: p.x, z: p.z, dx: p.dx, dz: p.dz });
      }
    }
    if (path.multi) spots.sort((a, b) => a.d - b.d); // castle-most last, whatever its lane
    return spots;
  }

  /** Trapper: throws its next trap (spike / mine / bear, in `order`) onto the path in range. */
  updateTrapper(t, def, s) {
    if (t.cooldown > 0) return;
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return;
    let mine = 0;
    for (const tr of this.traps.values()) if (tr.tower === t.id && tr.kind !== 'thermite') mine++;
    if (s.maxTraps && mine >= s.maxTraps) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    // Aim a little ahead of the lead zombie in range; otherwise anywhere in range.
    // Mine Layer: always the far end of the path in range, so mines stack up where leaks go.
    const far = def.mines ? t.spots[t.spots.length - 1].d - 6 : 0;
    const lead = def.mines ? null : this.findTarget(t, s, t.x, t.z, s.range);
    const ahead = def.mines ? t.spots.filter((p) => p.d >= far) : lead ? t.spots.filter((p) => p.d > lead.dist + 3 && p.d < lead.dist + 12) : [];
    const pool = ahead.length ? ahead : t.spots;
    const spot = pool[Math.floor(Math.random() * pool.length)];
    const lat = (Math.random() - 0.5) * 2;
    const x = spot.x - spot.dz * lat;
    const z = spot.z + spot.dx * lat;
    // Traps switched off in the tower panel are skipped (at least one always stays on).
    const order = s.order.filter((k) => !t.off?.includes(k));
    const use = order.length ? order : s.order;
    const kind = use[t.trapN++ % use.length];
    const st = s[kind];
    const trap = { id: this.nextId++, tower: t.id, kind, x, z, land: TRAP_FLIGHT, uses: st.uses ?? 1, hits: new Set(), ...st };
    trap.bossStop = def.bossStop;
    // Mine Layer mines only see hidden zombies when the tower does (Trapper traps always do).
    trap.det = def.mines ? { hidden: !!s.hidden, flying: false, lead: true } : GROUND_BLAST;
    this.traps.set(trap.id, trap);
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'trapThrow', t: t.id, x: r2(x), z: r2(z), d: TRAP_FLIGHT });
  }

  /** Traps spring when a zombie (hidden ones too, not flyers) walks over them. */
  updateTraps(dt) {
    for (const tr of this.traps.values()) {
      if (tr.kind === 'grave' || tr.kind === 'sentry') continue; // Necromancer / Engineer builds
      if (tr.kind === 'thermite') {
        this.burnPatch(tr, dt);
        continue;
      }
      if (tr.kind === 'gas') {
        this.gasCloud(tr, dt);
        continue;
      }
      if (tr.kind === 'thorns') {
        this.thornPatch(tr, dt);
        continue;
      }
      if (tr.kind === 'goo') {
        this.gooPuddle(tr, dt);
        continue;
      }
      if (tr.life != null && (tr.life -= dt) <= 0) tr.uses = 0; // Mine Layer mine wore out
      if (tr.land > 0) {
        tr.land -= dt;
        continue;
      }
      const tower = this.towers.get(tr.tower) ?? null;
      for (const e of tr.uses > 0 ? [...this.enemies.values()] : []) {
        if (e.flying || !canHit(tr.det, e)) continue; // flyers pass over traps
        if ((e.x - tr.x) ** 2 + (e.z - tr.z) ** 2 > TRAP_HIT * TRAP_HIT) continue;
        if (tr.kind === 'spike') {
          if (tr.hits.has(e.id)) continue;
          tr.hits.add(e.id);
          this.events.push({ k: 'slice', e: e.id });
          if (tr.pool != null) {
            // Trapper X: a spike with health wears down by the damage it deals.
            this.poolSpike(tower, tr, e);
            if (tr.pool > 0) continue;
          } else {
            this.damage(tower, e, tr.damage);
            if (--tr.uses > 0) continue;
          }
        } else if (tr.kind === 'mine') {
          this.explode(tower, tr.x, tr.z, { damage: tr.damage, radius: tr.radius, det: tr.det, burn: tr.burn, burnTime: tr.burnTime, stun: tr.stun }); // Golden S-Mine: stuns
          if (tr.thermite) this.dropThermite(tr);
        } else {
          this.events.push({ k: 'slice', e: e.id });
          this.stop({ bossStop: tr.bossStop, noVoidStun: tower ? TOWERS[tower.type].noVoidStun : false }, e, tr.stun, 'stun');
          this.damage(tower, e, tr.damage);
        }
        tr.uses = 0;
        break;
      }
      if (tr.uses <= 0) {
        this.traps.delete(tr.id);
        this.events.push({ k: 'trapGone', id: tr.id, kind: tr.kind, x: r2(tr.x), z: r2(tr.z) });
      }
    }
  }

  /**
   * Trapper X spike: zombie `e` takes up to the spike's health left (`shred`: zombies with more
   * than `shred.over` max health take `shred.mult` x as much for the same wear). A used-up spike
   * with `boom` explodes.
   */
  poolSpike(tower, tr, e) {
    const mult = tr.shred && e.maxHp > tr.shred.over ? tr.shred.mult : 1;
    const hit = Math.min(tr.pool * mult, e.hp);
    this.damage(tower, e, hit);
    tr.pool -= hit / mult;
    if (tr.pool > 0.01) return;
    tr.pool = 0;
    if (tr.boom) this.explode(tower, tr.x, tr.z, { damage: tr.boom.damage, radius: tr.boom.radius, det: tr.det });
  }

  /** Mine Layer Thermite: a burning patch where a mine went off. */
  dropThermite(tr) {
    const th = tr.thermite;
    const p = { id: this.nextId++, tower: tr.tower, kind: 'thermite', x: tr.x, z: tr.z, land: 0, radius: th.radius, left: th.time, burn: th.burn, burnTime: th.burnTime, det: tr.det };
    this.traps.set(p.id, p);
  }

  /** Thermite patch: sets every ground zombie inside it on fire until it burns out. */
  burnPatch(p, dt) {
    if ((p.left -= dt) <= 0) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    const r2max = p.radius * p.radius;
    for (const e of this.enemies.values()) {
      if (e.flying || !canHit(p.det, e) || (e.x - p.x) ** 2 + (e.z - p.z) ** 2 > r2max) continue;
      this.ignite(e, p.tower, p.burn, p.burnTime, 0);
    }
  }

  /** Toxicnator gas cloud: gasses up to `targets` different zombies that come inside it. */
  gasCloud(p, dt) {
    if ((p.left -= dt) <= 0) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    const r2max = p.radius * p.radius;
    for (const e of this.enemies.values()) {
      if (!canHit(p.det, e) || (e.x - p.x) ** 2 + (e.z - p.z) ** 2 > r2max) continue;
      if (!p.hits.has(e.id)) {
        if (p.hits.size >= p.targets) continue;
        p.hits.add(e.id);
      }
      // One gas stack per cloud, so gas from several clouds adds up.
      (e.gas ??= new Map()).set(p.id, { dps: p.dps, left: p.time, by: p.tower });
    }
  }

  /** Toxic Blast: zombie `e` takes extra damage from everything for a while. */
  weaken(e, tx) {
    const v = e.boss && tx.bossVuln != null ? tx.bossVuln : tx.vuln;
    e.vuln = Math.max(e.vuln, v);
    e.vulnT = Math.max(e.vulnT, tx.vulnTime);
    if (tx.key === 'neuralyze') e.neuroT = Math.max(e.neuroT, tx.vulnTime); // Saboteur: towers target it first
  }

  removeTrapsOf(towerId) {
    for (const tr of this.traps.values()) if (tr.tower === towerId) this.traps.delete(tr.id);
  }

  // ---------------------------------------------------------------- builders (Necromancer, Engineer)

  buildsOf(towerId, kind) {
    const list = [];
    for (const tr of this.traps.values()) if (tr.tower === towerId && tr.kind === kind) list.push(tr);
    return list;
  }

  /**
   * Fills the soul / scrap meter's bookkeeping and, once it's full, stops the tower for `build`
   * seconds while it raises a gravestone or builds a sentry. Returns true while it is busy.
   */
  updateBuilder(t, s, dt) {
    const need = s.souls || s.scrap;
    t.meter = Math.min(need, t.meter || 0);
    if (t.buildT < 0) t.buildT = Math.min(0, t.buildT + dt); // nowhere to build last time: wait a bit
    if (t.buildT > 0) {
      t.buildT -= dt;
      t.charge = 1;
      if (t.buildT > 0) return true;
      t.buildT = 0;
      if (s.souls ? this.raiseGrave(t, s) : this.buildSentry(t, s)) t.meter = 0;
      else t.buildT = -4;
      t.cooldown = Math.max(0, t.cooldown);
      t.burstLeft = 0;
    } else if (t.buildT === 0 && t.meter >= need && (s.souls ? this.canGrave(t, s) : this.buildsOf(t.id, 'sentry').length < s.sentries)) {
      t.buildT = s.build;
      this.events.push({ k: 'building', t: t.id, d: s.build });
      return true;
    }
    t.charge = t.meter / need;
    return false;
  }

  /** Can the Necromancer raise a new gravestone, or upgrade one it has? */
  canGrave(t, s) {
    const graves = this.buildsOf(t.id, 'grave');
    return graves.length < s.graves || graves.some((g) => g.lvl < s.graveLvl);
  }

  /** A new gravestone beside the path in range, or (with all of them up) the lowest one gets a level. */
  raiseGrave(t, s) {
    const graves = this.buildsOf(t.id, 'grave');
    if (graves.length >= s.graves) {
      let low = null;
      for (const g of graves) if (g.lvl < s.graveLvl && (!low || g.lvl < low.lvl)) low = g;
      if (!low) return false;
      low.lvl++;
      this.events.push({ k: 'graveUp', x: r2(low.x), z: r2(low.z), lvl: low.lvl });
      return true;
    }
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return false;
    // Spread them out: try a few random spots and keep the one farthest from the other graves.
    let best = null;
    let bestGap = -1;
    for (let i = 0; i < 8; i++) {
      const p = t.spots[Math.floor(Math.random() * t.spots.length)];
      let gap = Infinity;
      for (const g of graves) gap = Math.min(gap, Math.abs(g.d - p.d));
      if (gap > bestGap) {
        bestGap = gap;
        best = p;
      }
    }
    const side = Math.random() < 0.5 ? -1 : 1;
    const lat = side * (PATH_WIDTH / 2 + 1.2);
    const g = { id: this.nextId++, tower: t.id, kind: 'grave', x: best.x - best.dz * lat, z: best.z + best.dx * lat, d: best.d, r: best.r ?? 0, lvl: 1, land: 0, uses: 1, yaw: Math.atan2(best.dz * side, -best.dx * side) }; // facing the path
    this.traps.set(g.id, g);
    t.yaw = Math.atan2(g.x - t.x, g.z - t.z);
    this.events.push({ k: 'grave', t: t.id, x: r2(g.x), z: r2(g.z) });
    return true;
  }

  /** Raise the Dead: every gravestone breaks and summons a unit (Level `boomLvl` ones also explode). */
  raiseDead(t, s) {
    for (const g of this.buildsOf(t.id, 'grave')) {
      const pool = s.raise[Math.min(g.lvl, s.raise.length) - 1];
      const u = this.spawnUnit(t, pool[Math.floor(Math.random() * pool.length)]);
      u.dist = Math.max(0, Math.min(path.length - 1, g.d));
      u.route = g.r ?? 0;
      u.lateral = 0; // single file
      this.placeUnit(u);
      this.traps.delete(g.id);
      const boom = s.boomLvl && g.lvl >= s.boomLvl;
      this.events.push({ k: 'trapGone', id: g.id, kind: 'grave', x: r2(g.x), z: r2(g.z) });
      if (boom) this.explode(t, g.x, g.z, { damage: s.boom.damage, radius: s.boom.radius, det: GROUND_BLAST });
    }
  }

  /**
   * Mechanic: every `buildEvery` s of wave time it builds the next turret of `sentryCycle` (up to
   * `sentries` at once). It keeps shooting meanwhile.
   */
  updateTurrets(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    t.turretT = (t.turretT ?? 2) - dt;
    if (t.turretT > 0) return;
    if (s.devices) {
      // Engineer: builds the first device it has fewer of than its max.
      const mine = this.buildsOf(t.id, 'sentry');
      const k = s.devices.findIndex((d, i) => mine.filter((o) => o.slot === i).length < d.max);
      if (k < 0) t.turretT = 0;
      else t.turretT = this.buildSentry(t, { ...s, sentry: s.devices[k].def }, k) ? s.buildEvery : 2;
      return;
    }
    if (this.buildsOf(t.id, 'sentry').length >= s.sentries) {
      t.turretT = 0;
      return;
    }
    const st = s.sentryCycle[(t.turretN ?? 0) % s.sentryCycle.length];
    if (this.buildSentry(t, { ...s, sentry: st })) {
      t.turretN = (t.turretN ?? 0) + 1;
      t.turretT = s.buildEvery;
    } else t.turretT = 2; // no room right now
  }

  /** A sentry on open ground between the Engineer's deadzone and its build range. */
  buildSentry(t, s, slot = null) {
    const def = TOWERS[t.type];
    const blockers = [...this.towers.values(), ...this.traps.values()].filter((o) => !o.kind || o.kind === 'sentry');
    const inner = (def.minRange || 0) + 1.5;
    for (let i = 0; i < BUILD_SPOTS; i++) {
      const a = Math.random() * TAU;
      const r = inner + Math.sqrt(Math.random()) * (s.buildRange - inner);
      const x = t.x + Math.sin(a) * r;
      const z = t.z + Math.cos(a) * r;
      if (!canPlace(x, z, blockers, 'ground')) continue;
      const st = s.sentry;
      const sn = { id: this.nextId++, tower: t.id, kind: 'sentry', x, z, land: 0, uses: 1, hp: st.hp, maxHp: st.hp, yaw: a, cooldown: 0, rocketT: 0, stunT: 0, lvl: t.level };
      if (s.sentryCycle || slot != null) {
        // Mechanic turrets keep their own kind; `lvl` 100+ picks its model (see makeSentry).
        // Engineer devices remember their slot so upgrades can swap them (models 100+ -> lvl 200+).
        sn.def = st;
        sn.lvl = 100 + st.model;
        if (slot != null) sn.slot = slot;
      }
      this.traps.set(sn.id, sn);
      t.yaw = a;
      this.events.push({ k: 'sentry', t: t.id, x: r2(x), z: r2(z) });
      return true;
    }
    return false; // no room: try again later with the meter still full
  }

  /** Sentries shoot (First, by their own detection), fire rockets and slowly break down. */
  updateSentries(dt) {
    for (const sn of this.traps.values()) {
      if (sn.kind !== 'sentry') continue;
      const t = this.towers.get(sn.tower);
      if (!t) {
        this.traps.delete(sn.id);
        continue;
      }
      if (sn.slot != null) {
        // Engineer upgraded: its devices become the new model, keeping their share of health.
        const cur = TOWERS[t.type].levels[t.level].devices?.[sn.slot]?.def;
        if (cur && cur !== sn.def) {
          sn.hp = (sn.hp / sn.maxHp) * cur.hp;
          sn.maxHp = cur.hp;
          sn.def = cur;
          sn.lvl = 100 + cur.model;
        }
      }
      const st = sn.def ?? TOWERS[t.type].levels[t.level].sentry;
      if (!sn.def && sn.maxHp !== st.hp) {
        // The Engineer was upgraded: the sentry becomes the new model, keeping its share of health.
        sn.hp = (sn.hp / sn.maxHp) * st.hp;
        sn.maxHp = st.hp;
      }
      if (!sn.def) sn.lvl = t.level;
      sn.hp -= st.decay * dt;
      if (sn.hp <= 0) {
        this.traps.delete(sn.id);
        this.events.push({ k: 'trapGone', id: sn.id, kind: 'sentry', x: r2(sn.x), z: r2(sn.z) });
        continue;
      }
      sn.stunT = Math.max(0, sn.stunT - dt);
      if (sn.stunT > 0) continue;
      if (st.heal) {
        // Mender: heals every tower near it (a share of max health + a flat amount a second).
        const h = st.heal;
        for (const o of this.towers.values()) {
          if ((o.x - sn.x) ** 2 + (o.z - sn.z) ** 2 > h.radius * h.radius || !beamHealable(o)) continue;
          this.healTower(o, (o.maxHp * h.pct + h.flat) * dt);
        }
        continue;
      }
      const rate = buffOf(this.buffs, t.id).rate;
      sn.cooldown = Math.max(-dt, sn.cooldown - dt * rate);
      sn.rocketT = Math.max(0, sn.rocketT - dt * rate);
      const target = this.unitTarget(sn, st.gun.range, st);
      if (!target) {
        sn.cooldown = Math.max(0, sn.cooldown);
        continue;
      }
      sn.yaw = Math.atan2(target.x - sn.x, target.z - sn.z);
      if (sn.cooldown <= 0) {
        sn.cooldown += st.gun.cooldown;
        this.events.push({ k: 'sshot', s: sn.id, e: target.id });
        const g = st.gun;
        // Mechanic turrets: their own defense piercing / shield damage, Tesla zaps, Detonator blasts.
        this.hitMods = g.defPierce != null || g.shieldMult ? { defPierce: g.defPierce, shieldMult: g.shieldMult } : null;
        if (g.all) {
          const det = unitDetection(st);
          for (const e of [...this.enemies.values()]) {
            if (!canHit(det, e) || (e.x - sn.x) ** 2 + (e.z - sn.z) ** 2 > g.range * g.range) continue;
            this.damage(t, e, g.damage);
            if (g.stun && this.enemies.has(e.id)) this.stop({ bossStop: 0.25 }, e, g.stun, 'stun');
          }
        } else if (g.radius) this.explode(t, target.x, target.z, { damage: g.damage, radius: g.radius, main: target.id, det: unitDetection(st) });
        else this.damage(t, target, g.damage);
        this.hitMods = null;
      }
      if (st.rocket && sn.rocketT <= 0 && this.enemies.has(target.id)) {
        sn.rocketT = st.rocket.every;
        this.events.push({ k: 'sshot', s: sn.id, e: target.id, c: 1 });
        this.explode(t, target.x, target.z, { damage: st.rocket.damage, radius: st.rocket.radius, main: target.id, det: unitDetection(st) });
      }
    }
  }

  /**
   * Necromancer bolt: flies from the tower through `target` to the edge of its range, hitting up
   * to `pierce` zombies along the way (closest first). Each zombie hit adds a soul. Apostle of
   * Hades: hits in a row on the same main target stack extra damage.
   */
  bolt(t, s, target, aim) {
    const det = this.detects(t, s);
    const dx = Math.sin(aim);
    const dz = Math.cos(aim);
    const hits = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const ex = e.x - t.x;
      const ez = e.z - t.z;
      const along = ex * dx + ez * dz;
      if (along < 0 || along > s.range) continue;
      if (Math.abs(ex * dz - ez * dx) > PELLET_WIDTH * 1.4 && e !== target) continue;
      hits.push({ e, along });
    }
    hits.sort((a, b) => a.along - b.along);
    const list = hits.slice(0, s.pierce).map((h) => h.e);
    if (!list.includes(target)) {
      if (list.length >= s.pierce) list.pop();
      list.push(target);
    }
    let mult = 1;
    if (s.stack) {
      t.stackN = t.stackE === target.id ? (t.stackN || 0) + 1 : 0;
      t.stackE = target.id;
      mult = 1 + Math.min(s.stack.max, t.stackN * s.stack.per);
    }
    this.events.push({ k: 'bolt', t: t.id, es: list.map((e) => e.id), x: r2(t.x + dx * s.range), z: r2(t.z + dz * s.range), ...(mult > 1 ? { m: r2(mult) } : {}) });
    for (const e of list) {
      t.meter = (t.meter || 0) + 1;
      this.damage(t, e, e === target ? Math.round(s.damage * mult * 100) / 100 : s.damage);
    }
  }

  /**
   * Accelerator: charges up while a zombie is in range, then fires locked-on shots (switching
   * to a new zombie if its target dies or leaves) until it has dealt `overcharge` damage, then
   * cools down. t.charge: 0..1 charging, 1..0 overcharge left while firing, below 0 cooling.
   */
  updateAccel(t, s, dt) {
    t.phase ??= 0;
    if (t.phase === 2) {
      t.wait -= dt;
      t.charge = -Math.max(0, t.wait) / s.cool;
      t.cooldown = Math.max(0, t.cooldown);
      if (t.wait > 0) return;
      t.phase = 0;
      t.beamT = 0;
    }
    const det = this.detects(t, s);
    let e = t.lock ? this.enemies.get(t.lock) : null;
    if (e && ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > s.range * s.range || !canHit(det, e))) e = null;
    if (!e) e = this.findTarget(t, s, t.x, t.z, s.range);
    if (t.phase === 0) {
      t.lock = 0;
      t.cooldown = Math.max(0, t.cooldown);
      if (!e) return;
      t.yaw = lerpAngle(t.yaw, Math.atan2(e.x - t.x, e.z - t.z), Math.min(1, dt * 10));
      t.beamT += dt;
      t.charge = Math.min(1, t.beamT / s.charge);
      if (t.charge < 1) return;
      t.phase = 1;
      t.dealt = 0;
    }
    if (!e) {
      t.lock = 0;
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.lock = e.id;
    t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
    while (t.cooldown <= 0 && this.enemies.has(e.id)) {
      t.cooldown += s.cooldown;
      this.shoot(t, e, s.damage);
      t.dealt += s.damage;
      if (t.dealt >= s.overcharge) {
        t.phase = 2;
        t.wait = s.cool;
        t.lock = 0;
        t.charge = -1;
        t.cooldown = Math.max(0, t.cooldown);
        this.events.push({ k: 'overcharge', t: t.id });
        return;
      }
    }
    t.charge = 1 - t.dealt / s.overcharge;
  }

  // ---------------------------------------------------------------- hacker

  /** Hacker: every `cooldown` s, a synapse hits each of the best `synapses` zombies in range. */
  updateHacker(t, s) {
    const list = this.findTargets(t, s, s.synapses);
    if (!list.length) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(list[0].x - t.x, list[0].z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    for (const e of list) {
      this.hack(t, s, e);
      this.events.push({ k: 'shot', t: t.id, e: e.id });
      if (s.damage) this.damage(t, e, s.damage);
    }
  }

  /** Hacks a zombie for good: slowness (not bosses), Wire Fraud, and conversion when it dies (not bosses). */
  hack(t, s, e) {
    e.fraud = Math.max(e.fraud, s.fraud);
    if (e.boss) return;
    e.hackSlow = Math.max(e.hackSlow, s.slow);
    if (s.ev >= e.hackEv) {
      e.hackEv = s.ev;
      e.hackBy = t.id;
    }
  }

  /** Hacked zombies that died this tick come back as holograms that ram other zombies. */
  spawnHolograms() {
    const list = this.holos;
    this.holos = [];
    for (const e of list) {
      const t = this.towers.get(e.hackBy);
      if (!t) continue; // its Hacker was sold
      const s = TOWERS[t.type].levels[t.level];
      if (this.unitsOf(t.id).length >= (s.units ?? Infinity)) continue;
      const hp = Math.max(1, Math.round(e.maxHp ** e.hackEv * 10) / 10);
      const def = { name: 'Hologram', model: `holo:${e.type}`, hp, speed: ENEMIES[e.type].speed, ram: true, holo: true };
      const u = this.spawnUnit(t, def);
      u.dist = Math.max(0, Math.min(path.length - 1, e.dist));
      u.route = e.route;
      u.lateral = e.lateral;
      this.placeUnit(u);
      this.events.push({ k: 'convert', u: u.id, x: r2(u.x), z: r2(u.z) });
    }
  }

  /** Hologram Tower: clones tower `src` at (x, z). Returns an error message, or null. */
  cloneTower(p, ab, m) {
    const src = this.towers.get(Number(m.src));
    if (!src) return 'Pick a tower to clone';
    const def = TOWERS[src.type];
    const root = rootType(src.type);
    if (root === 'hacker') return "Hackers can't clone Hackers";
    if (def.kind === 'income') return "Income towers can't be cloned";
    if (src.holo) return "Holograms can't be cloned";
    let clones = 0;
    for (const t of this.towers.values()) if (t.holo && t.owner === p.id && rootType(t.type) === root) clones++;
    if (clones >= TOWERS[root].limit) return `You already have ${clones} ${def.name} hologram${clones === 1 ? '' : 's'} (its limit)`;
    const cost = cloneCost(ab, src);
    if (p.cash < cost) return `Need $${cost} to clone the ${def.name}`;
    const x = Number(m.x);
    const z = Number(m.z);
    if (!canPlace(x, z, this.towers.values(), def.placement)) return placeFail(def, 'A');
    p.cash -= cost;
    const t = this.newTower(p.id, src.type, x, z, m.yaw, 0);
    t.level = src.level;
    t.hp = t.maxHp = towerMaxHp(t.type, t.level);
    t.targetMode = src.targetMode;
    t.track = src.track;
    t.off = [...(src.off ?? [])];
    t.ammo = def.levels[t.level].ammo ?? 0;
    t.holo = t.holoMax = ab.life;
    this.events.push({ k: 'place', id: t.id, owner: p.id, x, z, holo: 1 });
    return null;
  }

  /** After an upgrade: the new max health, keeping the damage the tower has taken. */
  setTowerLevelHp(t) {
    const max = towerMaxHp(t.type, t.level);
    if (t.hp > 0) t.hp = Math.max(1, t.hp + max - t.maxHp);
    t.maxHp = max;
  }

  /** Takes a tower off the map with everything it made (sold, or a hologram fading). */
  removeTower(t, k, extra = {}) {
    this.towers.delete(t.id);
    this.removeUnitsOf(t.id);
    this.removeTrapsOf(t.id);
    this.events.push({ k, id: t.id, owner: t.owner, x: t.x, z: t.z, ...extra });
  }

  // ---------------------------------------------------------------- slows

  /** Slime Trooper: slows a zombie by `slow` for `time` seconds. Bosses ignore it; slimes don't stack. */
  applySlime(e, sl) {
    if ((e.boss && !sl.boss) || e.statusImmune) return;
    const slow = e.boss ? sl.slow * sl.boss : sl.slow; // Splash: bosses are slowed `boss` as much
    e.slime = Math.max(e.slimeT > 0 ? e.slime : 0, slow);
    e.slimeT = Math.max(e.slimeT, sl.time);
  }

  /**
   * Freezer: every hit adds `s.chill` chill (0..1). Chill slows up to `maxSlow` (half for bosses)
   * and hurts `chillDps` per second while it lasts. At full chill, `chillFreeze` freezes the zombie.
   */
  applyChill(t, s, e) {
    const ir = s.ignoreIceResist ? 0 : e.iceResist; // Ice Grenade, Snow Storm, Cryo Helicopter Lv 5...
    if (e.statusImmune || e.freezeImmune || ir >= 1) return;
    e.chillMax = Math.max(e.chillT > 0 ? e.chillMax : 0, s.maxSlow * (e.boss ? 0.5 : 1));
    const wasFull = e.chillT > 0 && e.chill >= 1;
    e.chill = Math.min(1, e.chill + s.chill * (1 - ir));
    e.chillT = s.chillTime;
    if (s.chillDps >= e.chillDps) {
      e.chillDps = s.chillDps;
      e.chillBy = t.id;
    }
    // freezeNext (Frost Blaster, Sledger): only a hit on an already fully chilled zombie freezes it.
    const full = TOWERS[t.type].freezeNext ? wasFull : e.chill >= 1;
    if (full && s.chillFreeze && (!e.boss || s.freezeBoss)) {
      this.iceFreeze(e, s.chillFreeze, s);
      e.chill = 0;
      e.chillT = 0;
    }
  }

  /**
   * Cryo Ranger freeze for `secs`. fx: { freezeBoss? (bosses freeze this fraction of the time,
   * else never), frostbite? (slower for good), frozenVuln? (extra damage while frozen) }.
   */
  iceFreeze(e, secs, fx) {
    this.stop({ bossStop: fx.freezeBoss ?? 0, ignoreIceResist: fx.ignoreIceResist }, e, secs, 'ice');
    if (e.stopKind !== 'ice' || !this.enemies.has(e.id)) return;
    if (fx.frostbite) e.coldSlow = Math.max(e.coldSlow, fx.frostbite);
    if (fx.frozenVuln) e.iceVuln = Math.max(e.iceVuln, fx.frozenVuln);
  }

  /** Cryo M203 / M203 Incendiary: every `m203.every` s while shooting, lobs a grenade at the target. */
  fireM203(t, s, target, dt) {
    const m = s.m203;
    t.m203T = (t.m203T ?? m.every * 0.5) - dt;
    if (t.m203T > 0) return;
    t.m203T = m.every;
    const time = 0.7;
    const p = this.leadPoint(target, time);
    // Cryo M203 freezes; the Ranger's M203 Incendiary leaves a burning patch (see updateShells).
    const fx = m.patch ? { patch: { radius: m.radius, ...m.patch } } : m.burn ? {} : { freeze: m.freeze, ice: iceFx(s) };
    if (m.burn) Object.assign(fx, { burn: m.burn, burnTime: m.burnTime }); // Sharpshooter Molotov: sets the zombies in it on fire
    this.shells.push({ tower: t.id, x: p.x, z: p.z, time, damage: m.damage, radius: m.radius, ...fx, det: this.detects(t, s) });
    this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d: time });
  }

  /** John Slayer: a passive railgun that shoots its target every `rail.every` s, piercing `rail.pass` more. */
  fireRail(t, s, target, dt) {
    const r = s.rail;
    t.railT = (t.railT ?? r.every * 0.5) - dt;
    if (t.railT > 0) return;
    t.railT = r.every;
    this.shoot(t, target, r.damage);
    this.passThrough(t, { ...s, pass: r.pass }, target, r.damage);
  }

  /** John Slayer: every `chop.every` s its axe hits up to `chop.targets` zombies nearby, hidden ones too. */
  chopAxe(t, s, dt) {
    const c = s.chop;
    t.chopT = Math.max(0, (t.chopT ?? 0) - dt);
    if (t.chopT > 0) return;
    const r2max = c.range * c.range;
    const det = { ...this.detects(t, s), hidden: true };
    const list = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const d2 = (e.x - t.x) ** 2 + (e.z - t.z) ** 2;
      if (d2 <= r2max) list.push({ e, d2 });
    }
    if (!list.length) return;
    t.chopT = c.every;
    list.sort((a, b) => a.d2 - b.d2);
    this.events.push({ k: 'whirl', t: t.id, r: c.range });
    for (const { e } of list.slice(0, c.targets)) this.damage(t, e, c.damage);
  }

  // ---------------------------------------------------------------- piercing blades

  /**
   * Boomerang: throws `rangs` boomerangs on an oval loop out to where the target will be and
   * back. Each one hits up to `pierce` zombies once. The second one loops on the other side.
   */
  throwRangs(t, s, target) {
    const det = this.detects(t, s);
    let p = { x: target.x, z: target.z };
    for (let i = 0; i < 2; i++) {
      const d = Math.hypot(p.x - t.x, p.z - t.z);
      p = this.leadPoint(target, rangTime(d, s.speed) / 2);
    }
    const d = Math.max(2, Math.hypot(p.x - t.x, p.z - t.z));
    const time = rangTime(d, s.speed);
    const n = s.rangs || 1;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? -1 : 1;
      this.blades.push({ tower: t.id, loop: true, ox: t.x, oz: t.z, tx: p.x, tz: p.z, side, t: 0, time, left: s.pierce, hits: new Set(), damage: s.damage, det });
      this.events.push({ k: 'rang', t: t.id, x: r2(p.x), z: r2(p.z), d: r2(time), s: side });
    }
    t.out = n;
  }

  /** Assassin Fan of Knives: three knives fly out past its range, each piercing a few zombies. */
  throwKnives(t, s) {
    const f = s.fan;
    t.fanAcc -= f.every;
    const det = this.detects(t, s);
    for (const off of [-0.3, 0, 0.3]) {
      const a = t.yaw + off;
      const tx = t.x + Math.sin(a) * f.reach;
      const tz = t.z + Math.cos(a) * f.reach;
      const time = f.reach / f.speed;
      this.blades.push({ tower: t.id, loop: false, ox: t.x, oz: t.z, tx, tz, t: 0, time, left: f.pierce, hits: new Set(), damage: f.damage, det });
      this.events.push({ k: 'knife', t: t.id, x: r2(tx), z: r2(tz), d: r2(time) });
    }
  }

  updateBlades(dt) {
    const pos = this.tmp;
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const b = this.blades[i];
      b.t += dt;
      bladePos(b, Math.min(1, b.t / b.time), pos);
      const tower = this.towers.get(b.tower) ?? null;
      if (b.left > 0) {
        for (const e of this.enemies.values()) {
          if (b.hits.has(e.id) || !canHit(b.det, e)) continue;
          if ((e.x - pos.x) ** 2 + (e.z - pos.z) ** 2 > RANG_HIT * RANG_HIT) continue;
          b.hits.add(e.id);
          this.events.push({ k: 'slice', e: e.id });
          this.damage(tower, e, b.damage);
          if (tower) this.soulGain(tower, b.damage); // Spiritual Advocate souls
          if (b.burn) this.ignite(e, b.tower, b.burn, b.burnTime, 0); // Archer Flaming Arrows
          if (b.fxS && tower && this.enemies.has(e.id)) this.hitEffects(tower, TOWERS[tower.type], b.fxS, e, b.fxStun); // Crossbower
          if (b.stun && this.enemies.has(e.id)) this.baseball(tower, b, e);
          if (b.injure) {
            // Flayer: thrown knives leave zombies Injured.
            e.injured = Math.max(e.injured, b.injure.amount);
            e.injuredT = Math.max(e.injuredT, b.injure.time);
          }
          if (--b.left <= 0) break;
        }
      }
      if (b.t < b.time) continue;
      this.blades.splice(i, 1);
      if (b.loop && tower) tower.out = Math.max(0, tower.out - 1);
    }
  }

  /** Assassin Whirlwind Slash: hits every zombie in range. */
  whirl(t, s) {
    const det = this.detects(t, s);
    this.events.push({ k: 'whirl', t: t.id, r: s.range });
    const r2max = s.range * s.range;
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e)) continue;
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) this.damage(t, e, s.whirl.damage);
    }
  }

  /** Knocks zombie `e` back along the path by `force` knockback (bosses a fraction as far). */
  knockBack(e, force) {
    if (e.statusImmune) return;
    e.dist = Math.max(0, e.dist - force * KNOCK_STUDS * (e.boss ? BOSS_KNOCK : 1));
  }

  /**
   * Brawler Reposition: the tower leaps to (x, z) (already checked by the action), then every
   * zombie it can see within `ab.radius` of the landing spot takes `ab.damage` and is knocked back.
   */
  reposition(t, s, ab, x, z) {
    const fromX = t.x;
    const fromZ = t.z;
    t.x = x;
    t.z = z;
    if (!TOWERS[t.type].heli) {
      t.hx = x; // passive weapons (Psycho Slayer) fire from where it is now
      t.hz = z;
    }
    this.events.push({ k: 'leap', t: t.id, fx: r2(fromX), fz: r2(fromZ), x: r2(x), z: r2(z), r: ab.radius, ...(ab.key === 'teleport' ? { tp: 1 } : {}) });
    if (!ab.radius) return; // Psycho Slayer Teleport: just moves
    const det = this.detects(t, s);
    const r2max = ab.radius * ab.radius;
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - x) ** 2 + (e.z - z) ** 2 > r2max) continue;
      if (ab.damage) this.damage(t, e, ab.damage);
      if (!this.enemies.has(e.id)) continue;
      if (ab.knock) this.knockBack(e, ab.knock);
      if (ab.stun) this.stop(TOWERS[t.type], e, ab.stun, 'stun'); // Psycho Slayer Jump
    }
  }

  /**
   * Penetrator: on the ground the shot pierces `pen.pierce` zombies in a line; on a cliff it hits its
   * target and ricochets to `pen.ricochet` more. Each zombie after the first takes `pen.falloff` less
   * than the one before. Every `flameShot.every`th shot is a flaming arrow that burns all it hits.
   */
  penetrate(t, s, target) {
    const p = s.pen;
    const det = this.detects(t, s);
    const hits = [target];
    if (p.ricochet) {
      const seen = new Set([target.id]);
      const j2 = p.jump * p.jump;
      let cur = target;
      while (hits.length <= p.ricochet) {
        let best = null;
        let bestD = Infinity;
        for (const e of this.enemies.values()) {
          if (seen.has(e.id) || !canHit(det, e)) continue;
          const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
          if (d <= j2 && d < bestD) {
            best = e;
            bestD = d;
          }
        }
        if (!best) break;
        hits.push(best);
        seen.add(best.id);
        cur = best;
      }
    } else hits.push(...this.lineBehind(t, s, target, det).slice(0, p.pierce - 1));
    const flame = s.flameShot && (t.flameN = (t.flameN || 0) + 1) % s.flameShot.every === 0 ? s.flameShot : null;
    this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id), ...(flame ? { m: 'flame' } : {}) });
    let dmg = s.damage;
    for (const e of hits) {
      if (!this.enemies.has(e.id)) continue;
      this.damage(t, e, Math.round(dmg * 100) / 100);
      if (flame && this.enemies.has(e.id)) this.ignite(e, t.id, flame.dps, flame.time, 0);
      dmg *= 1 - p.falloff;
    }
  }

  /** The zombies `det` can hit behind `main` on the line from the tower, out to its range (closest first). */
  lineBehind(t, s, main, det) {
    const dx = main.x - t.x;
    const dz = main.z - t.z;
    const d0 = Math.hypot(dx, dz) || 1;
    const ux = dx / d0;
    const uz = dz / d0;
    const list = [];
    for (const e of this.enemies.values()) {
      if (e === main || !canHit(det, e)) continue;
      const ex = e.x - t.x;
      const ez = e.z - t.z;
      const along = ex * ux + ez * uz;
      if (along <= d0 || along > s.range) continue;
      if (Math.abs(ex * uz - ez * ux) > 1.2 * (ENEMIES[e.type].scale ?? 1)) continue;
      list.push({ e, along });
    }
    return list.sort((a, b) => a.along - b.along).map((o) => o.e);
  }

  /** Tactical Sniper: the shot goes on through up to `pass` more zombies behind `main` (closest first). */
  passThrough(t, s, main, dmg) {
    const fx = TOWERS[t.type].pierceFx; // Frost Blaster: pierced zombies get chilled too
    for (const e of this.lineBehind(t, s, main, this.detects(t, s)).slice(0, s.pass)) {
      this.shoot(t, e, dmg);
      if (fx && this.enemies.has(e.id)) this.hitEffects(t, TOWERS[t.type], s, e, 0);
    }
  }

  /** Health Pack (Combat Shotgunner): towers, sentries and units within `ab.radius` get `ab.heal` of their max health back. */
  healPack(t, ab) {
    const r2max = ab.radius * ab.radius;
    const near = (o) => (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max;
    for (const o of this.towers.values()) if (near(o) && !TOWERS[o.type].noHeal) this.healTower(o, o.maxHp * ab.heal);
    for (const sn of this.traps.values()) if (sn.maxHp && near(sn)) sn.hp = Math.min(sn.maxHp, sn.hp + sn.maxHp * ab.heal);
    for (const u of this.units.values()) {
      if (!near(u)) continue;
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * ab.heal);
      if (u.def.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / u.def.hp - 1e-6));
    }
  }

  /** Unstun Power (Combat Shotgunner): every tower and sentry within `ab.radius` stops being stunned. */
  unstun(t, ab) {
    const r2max = ab.radius * ab.radius;
    for (const o of this.towers.values()) if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max) o.stunT = 0;
    for (const sn of this.traps.values()) if (sn.stunT && (sn.x - t.x) ** 2 + (sn.z - t.z) ** 2 <= r2max) sn.stunT = 0;
  }

  /** Flare Gun: hidden zombies in the tower's range are revealed to every tower for a while. */
  flare(t, s, ab) {
    const r2max = ab.global ? Infinity : s.range * s.range; // Railgun Warship: the whole map
    for (const e of this.enemies.values()) {
      if (e.hidden && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) e.revealT = Math.max(e.revealT || 0, ab.duration);
    }
  }

  /** Laser Gunner's Stealth Sensor: hidden zombies nearby are revealed for good, then a shockwave hits everything nearby. */
  stealthSensor(t, s, ab) {
    const r2max = ab.radius * ab.radius;
    for (const e of this.enemies.values()) {
      if (e.hidden && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) e.revealT = Infinity;
    }
    this.explode(t, t.x, t.z, { damage: ab.damage, radius: ab.radius, det: this.detects(t, s) });
  }

  /** Shotgunner: up to `extra` more zombies in its cone (closest to the main target first) take `splash`. */
  spread(t, s, main) {
    const det = this.detects(t, s);
    const r2max = s.range * s.range;
    const list = [];
    for (const e of this.enemies.values()) {
      if (e === main || !canHit(det, e)) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      if (dx * dx + dz * dz > r2max) continue;
      if (Math.abs(angleDiff(t.yaw, Math.atan2(dx, dz))) > s.cone) continue;
      list.push({ e, d: (e.x - main.x) ** 2 + (e.z - main.z) ** 2 });
    }
    list.sort((a, b) => a.d - b.d);
    for (let i = 0; i < Math.min(s.extra, list.length); i++) this.shoot(t, list[i].e, s.splash);
  }

  // ---------------------------------------------------------------- versus

  /** Anarchist (Versus only): sends Androids to its owner's target, and No Mercy chips their base. */
  updateAnarchy(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    t.androidT -= dt;
    if (t.androidT <= 0) {
      t.androidT += s.android.every;
      this.vs.attack(this.lane, 'android', { type: s.android.type, tower: t.id });
    }
    if (s.chip) {
      if (t.chipT == null) t.chipT = s.chip.every;
      t.chipT -= dt;
      if (t.chipT <= 0) {
        t.chipT += s.chip.every;
        this.vs.attack(this.lane, 'chip', s.chip);
      }
    }
  }

  /** Smoke (`kind` 'smoke') or stun ('stun') every tower within `r` of (x, z) for `secs`. */
  hexTowers(x, z, r, kind, secs, enemy = false, filter = null) {
    const key = kind === 'smoke' ? 'smoke' : 'stunT';
    let n = 0;
    for (const t of this.towers.values()) {
      if ((t.x - x) ** 2 + (t.z - z) ** 2 > r * r) continue;
      if (filter && !filter(t)) continue; // Fallen King sword swings only reach towers in their arc
      if (enemy && this.stealthy(t)) continue; // an enemy's attack can't touch stealthy towers
      if (kind === 'stun' && stunImmune(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue; // Medigun Medic Uber / Combat Drone Shield
      if (kind === 'stun') {
        // Warden riot shield: blocks the stun, then double damage and stun immune for a while.
        // Gladiator parry: blocks the stun, but it stops attacking for a moment.
        if (TOWERS[t.type].parry) {
          t.parryT = Math.max(t.parryT || 0, TOWERS[t.type].parry);
          this.events.push({ k: 'block', id: t.id, x: t.x, z: t.z, p: 1 });
          continue;
        }
        const riot = TOWERS[t.type].levels[t.level].riot;
        if (riot) {
          if (t.riotT <= 0) {
            t.riotT = riot.duration;
            this.events.push({ k: 'block', id: t.id, x: t.x, z: t.z });
          }
          continue;
        }
        // A Medic shield blocks the stun (and then recharges); Ubercharge blocks every stun.
        const b = buffOf(this.buffs, t.id);
        if (b.uber) continue;
        if (b.shield && t.shieldT <= 0) {
          t.shieldT = b.recharge;
          continue;
        }
      }
      t[key] = Math.max(t[key], secs * (1 - this.fortifyOf(t))); // Titan Fortify Zone
      n++;
    }
    // Engineer sentries get stunned too, unless they have a shield.
    if (kind === 'stun') {
      for (const sn of this.traps.values()) {
        if (sn.kind !== 'sentry' || (sn.x - x) ** 2 + (sn.z - z) ** 2 > r * r) continue;
        const t = this.towers.get(sn.tower);
        if (t && (sn.def ?? TOWERS[t.type].levels[t.level].sentry)?.shield) continue;
        sn.stunT = Math.max(sn.stunT, secs);
      }
    }
    return n;
  }

  /** Every unit on this map takes `dmg` (Pyrotechnics). */
  hurtUnits(dmg) {
    for (const u of [...this.units.values()]) {
      if (u.ghostT > 0) continue; // Gold Commander cyber tank ghost
      u.hp -= dmg;
      if (u.def.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / u.def.hp - 1e-6));
      if (u.hp <= 0 && !u.def.ghost) this.destroyUnit(u, this.towers.get(u.tower) ?? null); // a cyber tank turns into a ghost on its next update
    }
  }

  /** Units within `r` of (x, z) take `dmg` (Hard mode slams, Necrotic Skeletons, the Fallen King). */
  hurtUnitsNear(x, z, r, dmg, filter = null) {
    for (const u of [...this.units.values()]) {
      if (u.ghostT > 0 || (u.x - x) ** 2 + (u.z - z) ** 2 > r * r || (filter && !filter(u))) continue;
      u.hp -= dmg;
      if (u.def.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / u.def.hp - 1e-6));
      if (u.hp <= 0 && !u.def.ghost) this.destroyUnit(u, this.towers.get(u.tower) ?? null);
    }
  }

  /** No Mercy: takes up to `d` base health, but never below `floor`. Returns what it took. */
  chipBase(d, floor) {
    const n = Math.min(d, Math.max(0, this.baseHp - floor));
    if (n <= 0) return 0;
    this.baseHp -= n;
    return n;
  }

  /** The spot (a tower's position) whose `r` circle covers the most towers; the path's end if there are none. */
  bestCluster(r) {
    let best = null;
    let most = 0;
    for (const t of this.towers.values()) {
      let n = 0;
      for (const o of this.towers.values()) if ((t.x - o.x) ** 2 + (t.z - o.z) ** 2 <= r * r) n++;
      if (n > most) {
        most = n;
        best = { x: t.x, z: t.z };
      }
    }
    return best ?? path.at(path.length - 12, {});
  }

  // ---------------------------------------------------------------- spawners & units

  /** Spawner towers send a unit every `spawnEvery` seconds of wave time. */
  updateSpawner(t, def, s, dt) {
    if (this.wave.state !== 'wave') return;
    if (s.roster) return this.updateQueues(t, s, dt);
    if (s.plants) return this.updatePlants(t, def, s, dt);
    if (s.drawings) return this.updateStella(t, s, dt);
    const cap = s.maxUnits ?? def.maxUnits; // Surveyor: its drone cap grows with upgrades
    const full = () => cap && this.unitsOf(t.id).length >= cap;
    // Extra units on their own timers (Armored Factory, Field Barracks). Each rolls out as soon as it's unlocked.
    for (const x of spawnExtras(s)) {
      const k = `spawnT${x.n}`;
      t[k] = (t[k] ?? 0) - dt;
      if (t[k] <= 0) {
        if (full() || this.unitCapped(t, x.unit)) {
          t[k] = 0; // Elf Camp: wait for a free slot
          continue;
        }
        t[k] = x.every;
        this.spawnUnits(t, x.unit);
      }
    }
    t.spawnT -= dt;
    if (t.spawnT > 0) return;
    if (full() || this.unitCapped(t, s.unit)) {
      t.spawnT = 0; // wait for a free slot
      return;
    }
    t.spawnT = s.spawnEvery ?? def.spawnEvery;
    this.spawnUnits(t, s.unit);
  }

  /**
   * Crook Boss: every `goons.every` seconds of wave time it calls in its goons (one unit per
   * def in `goons.units`, a little apart) and stops shooting for `callPause` seconds.
   * Returns true while it is busy calling.
   */
  updateGoons(t, def, s, dt) {
    t.callT = Math.max(0, (t.callT || 0) - dt);
    if (this.wave.state === 'wave') {
      t.spawnT -= dt;
      if (t.spawnT <= 0) {
        t.spawnT = s.goons.every;
        s.goons.units.forEach((u, i) => this.spawnUnit(t, u, i * 2));
        t.callT = def.callPause ?? 0;
        this.events.push({ k: 'goons', id: t.id, x: t.x, z: t.z, n: s.goons.units.length });
      }
    }
    return t.callT > 0;
  }

  /**
   * Mercenary Base: `s.queues` queues each train one unit at a time, taking turns through the
   * roster. Upgrades add queues and units; a unit uses the tower's current level when it rolls out.
   */
  updateQueues(t, s, dt) {
    this.fillQueues(t, s);
    for (const q of t.queues) {
      q.left -= dt;
      if (q.left > 0) continue;
      this.spawnUnit(t, s.roster[q.r].unit, 0, this.deployDist(t, s), t.deployR);
      this.nextInQueue(t, s, q);
    }
  }

  fillQueues(t, s) {
    t.queues ??= [];
    while (t.queues.length < s.queues) {
      const q = { r: 0, left: 0 };
      this.nextInQueue(t, s, q);
      t.queues.push(q);
    }
  }

  /** The next unit in the roster that isn't switched off in the tower panel. */
  nextInQueue(t, s, q) {
    const n = s.roster.length;
    for (let i = 0; i < n; i++) {
      t.rot = (t.rot ?? -1) + 1;
      if (!t.off?.includes(String(t.rot % n))) break;
    }
    q.r = t.rot % n;
    q.left = s.roster[q.r].every;
  }

  /**
   * Biologist: each queue grows the plant picked for it (tower field `choice`) over the plant's
   * `every` s, then plants it on a random bit of path inside the tower's range. No path in range, no plants.
   */
  updatePlants(t, def, s, dt) {
    const picks = choicesOf(def, s, t.choice);
    t.plantT ??= [];
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    picks.forEach((key, i) => {
      const p = s.plants.find((x) => x.key === key);
      t.plantT[i] = (t.plantT[i] ?? p.every) - dt;
      if (t.plantT[i] > 0) return;
      if (!t.spots.length) {
        t.plantT[i] = 0;
        return;
      }
      t.plantT[i] = p.every;
      const spot = t.spots[Math.floor(Math.random() * t.spots.length)];
      const u = this.spawnUnit(t, p.unit, 0, spot.d, spot.r);
      u.lateral = (Math.random() - 0.5) * 2.4;
      this.placeUnit(u);
      this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z) });
    });
  }

  /** Mercenary Base: units roll out at the castle-most bit of path inside its range (or the castle if none is). */
  deployDist(t, s) {
    t.deployR = path.nearestRoute(t.x, t.z);
    if (!s.range) return path.length - 1;
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return path.length - 1;
    const last = t.spots[t.spots.length - 1];
    t.deployR = last.r ?? 0;
    return last.d;
  }

  /** Air-Drop: every unit in the queues drops onto the path near (x, z), and the queues start over. */
  airDrop(t, s, x, z) {
    this.fillQueues(t, s);
    const d = path.project(x, z);
    const route = path.lastRoute;
    t.queues.forEach((q, i) => {
      const u = this.spawnUnit(t, s.roster[q.r].unit, 0, path.length - 1, route);
      u.dist = Math.max(0, Math.min(path.length - 1, d + (i - (t.queues.length - 1) / 2) * 2));
      this.placeUnit(u);
      this.nextInQueue(t, s, q);
    });
    const p = path.at(d, {}, route);
    this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: t.queues.length });
  }

  unitsOf(towerId) {
    return [...this.units.values()].filter((u) => u.tower === towerId);
  }

  /** How many units with this def's name tower `t` has out (Relic: `max` caps each unit type). */
  countOf(t, def) {
    let n = 0;
    for (const u of this.units.values()) if (u.tower === t.id && u.def.name === def.name) n++;
    return n;
  }

  unitCapped(t, def) {
    return !!def.max && this.countOf(t, def) >= def.max;
  }

  /** Sends `def.count` (or 1) of a unit, a little apart (War Machine Factory Abrams Walkers come in pairs), but never more than its `max`. */
  spawnUnits(t, def) {
    const n = def.max ? Math.min(def.count || 1, def.max - this.countOf(t, def)) : def.count || 1;
    // Valkyr / Punkbuster / Squadron / Borealis: units start at the drop point picked with an ability.
    const start = t.dropD ?? (TOWERS[t.type].throwNear ? path.project(t.x, t.z) : path.length - 1); // throwNear: the path closest to it
    const route = t.dropD != null ? t.dropR ?? 0 : path.nearestRoute(t.x, t.z);
    for (let i = 0; i < n; i++) this.spawnUnit(t, def, i * 4, start, route);
    // Void Port: a train's wagons follow its locomotive.
    if (def.train) def.train.forEach((w, i) => this.spawnUnit(t, w, (n + i) * 4, start, route));
  }

  /** A unit starts at the castle end of the path (or `start`). It keeps its tower's firerate boost from now on. */
  spawnUnit(t, def, back = 0, start = path.length - 1, route = path.nearestRoute(t.x, t.z)) {
    const n = def.soldiers || 1;
    const u = {
      id: this.nextId++, tower: t.id, model: def.model, def,
      hp: def.hp * n, maxHp: def.hp * n, alive: n,
      dist: Math.max(0, start - back), route: route ?? 0, lateral: 0, speed: def.speed,
      rate: buffOf(this.buffs, t.id).rate,
      cooldown: 0, gap: 0, burstLeft: 0, cannonT: def.cannon ? def.cannon.every / 2 : 0, yaw: 0,
      beamT: def.beam ? def.beam.first ?? def.beam.every : 0, summonT: def.summon ? def.summon.every : 0, pauseT: 0,
      life: def.life ?? 0, // Biologist plants / Ice Turrets: seconds until it wilts (0 = forever)
    };
    if (TOWERS[t.type].noBuff) u.rate = 1; // Elf Camp / Biologist: support towers can't boost them
    this.placeUnit(u);
    if (def.free) {
      // Crows, bees and Volt Points live off the path: they start at their tower.
      u.x = t.x;
      u.z = t.z;
    }
    if (def.reveal) {
      // Punkbuster summons: hidden zombies near where they land are revealed.
      for (const e of this.enemies.values()) if (e.hidden && (e.x - u.x) ** 2 + (e.z - u.z) ** 2 <= def.reveal.radius ** 2) e.revealT = Math.max(e.revealT || 0, def.reveal.time);
    }
    this.units.set(u.id, u);
    t.unitsOut = true;
    return u;
  }

  placeUnit(u) {
    path.at(u.dist, u, u.route);
    u.x += -u.dz * u.lateral;
    u.z += u.dx * u.lateral;
  }

  /** Units shoot (First), fire cannons, drive toward the entrance and crash into zombies. */
  updateUnits(dt) {
    // Field Medics shield units near them (less contact damage) and heal them.
    const medics = [...this.units.values()].filter((u) => u.def.heal);
    const shieldOf = (u) => {
      let best = 0;
      for (const m of medics) {
        const h = m.def.heal;
        if (m !== u && (m.x - u.x) ** 2 + (m.z - u.z) ** 2 <= h.range * h.range) best = Math.max(best, h.shield || 0);
      }
      return best;
    };
    for (const m of medics) {
      const h = m.def.heal;
      m.healing = false;
      for (const o of this.units.values()) {
        if (o === m || o.hp >= o.maxHp || (o.x - m.x) ** 2 + (o.z - m.z) ** 2 > h.range * h.range) continue;
        o.hp = Math.min(o.maxHp, o.hp + h.rate * dt);
        m.healing = true;
      }
      // A medic waits with units that are fighting nearby instead of walking off alone.
      if (!m.healing) for (const o of this.units.values()) if (o !== m && o.speed === 0 && (o.x - m.x) ** 2 + (o.z - m.z) ** 2 <= h.range * h.range) m.healing = true;
    }
    for (const u of this.units.values()) {
      const d = u.def;
      const tower = this.towers.get(u.tower) ?? null;
      if (d.free) {
        this.updateFree(u, tower, dt); // crows, bees, Volt Points
        continue;
      }
      if (u.starT > 0 && (u.starT -= dt) <= 0) {
        this.destroyUnit(u, tower); // Kart Kid: the star ran out
        continue;
      }
      if (d.life && (u.life -= dt) <= 0) {
        this.units.delete(u.id); // a plant wilts / an Ice Turret melts
        this.events.push({ k: 'udie', u: u.id, x: r2(u.x), z: r2(u.z), wilt: 1 });
        continue;
      }
      if (u.ghostT > 0) {
        // Gold Commander cyber tank ghost: can't be hurt, fades away after a while.
        u.hp = u.maxHp;
        if ((u.ghostT -= dt) <= 0) {
          this.units.delete(u.id);
          this.events.push({ k: 'udie', u: u.id, x: r2(u.x), z: r2(u.z), wilt: 1 });
          continue;
        }
      }
      if (d.decay) {
        // Valkyr mechs: an air leak slowly drains their health.
        u.hp -= d.decay * dt;
        if (u.hp <= 0) {
          this.destroyUnit(u, tower);
          continue;
        }
      }
      if (d.builds) this.buildAlong(u, tower); // Ducky Engineer sentries
      u.cooldown = Math.max(-dt, u.cooldown - dt * u.rate);
      u.gap = Math.max(0, u.gap - dt);
      const g = d.gun;
      const target = g ? this.unitTarget(u, g.range) : null;
      if (target) {
        u.yaw = Math.atan2(target.x - u.x, target.z - u.z);
        let fire = false;
        if (u.burstLeft > 0) fire = u.gap <= 0;
        else if (u.cooldown <= 0) {
          u.burstLeft = g.burst || 1;
          u.cooldown += g.cooldown;
          fire = true;
        }
        if (fire) {
          u.burstLeft--;
          u.gap = g.burstGap ?? 0.1;
          // Every soldier in a squad fires.
          for (let i = 0; i < u.alive; i++) {
            const e = i === 0 ? target : this.unitTarget(u, g.range);
            if (!e) break;
            if (g.flame) {
              // Flamethrower: fire on every zombie in range it can see (one spray per unit).
              if (i) break;
              const det = unitDetection(d);
              for (const z of [...this.enemies.values()]) {
                if (!canHit(det, z) || (z.x - u.x) ** 2 + (z.z - u.z) ** 2 > g.range * g.range) continue;
                if (z.fireImmune) continue; // Fire Slimes shrug off flames
                if (g.burn) this.ignite(z, u.tower, g.burn, g.burnTime, 0);
                this.damage(tower, z, g.damage);
              }
              this.events.push({ k: 'uflame', u: u.id, y: r2(u.yaw), r: g.range });
              continue;
            }
            if (g.radius) {
              // Grenadier: a grenade lobbed at the zombie, hurting everyone in the blast.
              const time = 0.5;
              const p = this.leadPoint(e, time);
              this.shells.push({ tower: u.tower, x: p.x, z: p.z, time, damage: g.damage, radius: g.radius, det: unitDetection(d), pierceArmor: d.pierceArmor });
              this.events.push({ k: 'ulob', u: u.id, x: r2(p.x), z: r2(p.z), d: time });
              continue;
            }
            this.events.push({ k: 'ushot', u: u.id, e: e.id, i, ...(g.rail ? { rail: 1 } : {}) });
            if (g.splash) {
              // Ivy: a splash around its target that poisons and slows.
              const det = unitDetection(d);
              const x = e.x;
              const z = e.z;
              this.events.push({ k: 'boom', x: r2(x), z: r2(z), r: g.splash, gas: 1 });
              for (const o of [...this.enemies.values()]) {
                if (!canHit(det, o) || (o.x - x) ** 2 + (o.z - z) ** 2 > g.splash * g.splash) continue;
                if (g.poison && tower) this.applyPoison(tower, o, g.poison);
                this.damage(tower, o, g.damage);
              }
              continue;
            }
            // Oddport students: harder hits the closer the zombie (`dmgMin` at the edge of their range).
            const gd = g.dmgMin != null ? Math.round((g.dmgMin + (g.damage - g.dmgMin) * Math.max(0, 1 - Math.hypot(e.x - u.x, e.z - u.z) / g.range)) * 100) / 100 : g.damage;
            this.damage(tower, e, gd, false, unitGunKind(d, g));
            if (this.enemies.has(e.id)) {
              if (g.chill && tower) this.applyChill(tower, g.chill, e); // Ice Turret
              if (g.poison && tower) this.applyPoison(tower, e, g.poison);
              if (g.confuse) this.confuse(e, g.confuse.time, g.confuse.cd); // Nightshade
              // Overseer Prime Cleaving Claw: stuns what it hits (not bosses).
              if (g.stun && !e.boss && !e.statusImmune && !(e.stop >= g.stun)) {
                e.stop = g.stun;
                e.stopKind = 'stun';
                e.speed = 0;
              }
            }
            // Riot Guard: shoves the zombie back down the path (bosses are too heavy).
            if (g.knock && this.enemies.has(e.id) && !e.boss) e.dist = Math.max(0, e.dist - g.knock);
          }
        }
      } else {
        u.cooldown = Math.max(0, u.cooldown);
        u.burstLeft = 0;
      }
      if (d.cannon) {
        const c = d.cannon;
        u.cannonT = Math.max(0, u.cannonT - dt * u.rate);
        // A cannon-only vehicle (no gun) aims with the cannon's own range.
        // Overseer Prime Radiant Smite: a cannon with its own range reaches further than the gun.
        const aim = u.cannonT <= 0 && (target && this.enemies.has(target.id) ? target : this.unitTarget(u, c.range ?? g.range));
        if (aim) {
          u.cannonT = c.every;
          this.events.push({ k: 'ushot', u: u.id, e: aim.id, c: 1 });
          const ax = aim.x;
          const az = aim.z;
          this.explode(tower, ax, az, { damage: c.damage, splash: c.splash, radius: c.radius, main: aim.id, det: unitDetection(d), ignoreExplosiveResist: d.ignoreExplosiveResist || c.ignoreExplosiveResist });
          if (c.stun || c.knock) this.smash(c, ax, az, unitDetection(d));
        }
      }

      if (d.beam) {
        // Overseer Prime Sigil of Destruction: a long laser at one zombie.
        u.beamT = Math.max(0, u.beamT - dt * u.rate);
        const e = u.beamT <= 0 && this.unitTarget(u, d.beam.range);
        if (e) {
          u.beamT = d.beam.every;
          this.events.push({ k: 'ushot', u: u.id, e: e.id, rail: 1 });
          this.damage(tower, e, d.beam.damage, false, 'laser');
        }
      }
      if (d.summon && tower) {
        // Overseer Prime Ancient Awakening: stops to call a unit beside it.
        u.summonT -= dt;
        if (u.summonT <= 0) {
          u.summonT = d.summon.every;
          u.pauseT = d.summon.pause;
          this.spawnUnit(tower, d.summon.unit, 0, u.dist, u.route);
          this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z) });
        }
      }
      u.pauseT = Math.max(0, u.pauseT - dt);

      // Squads stop while they have something to shoot; vehicles keep driving.
      u.speed = (d.soldiers && (target || u.healing)) || u.pauseT > 0 ? 0 : target && d.slowFire ? d.speed * 0.4 : d.speed; // slowFire: Turret Trucks, Void Port carts
      if (u.starT > 0) u.speed = d.speed * 1.6; // Kart Kid star power
      // Bubble Companion: stands its ground while it's blocking a zombie.
      if (d.block) for (const e of this.enemies.values()) if (!e.flying && !e.remains && !ENEMIES[e.type].noCollide && e.route === u.route && Math.abs(e.dist - u.dist) <= CONTACT) u.speed = 0;
      if (d.still) {
        // Plants and Ice Turrets stay put; zombies walking over them still wear them down.
        u.speed = 0;
      }
      const from = u.dist; // where it was before this tick's move (for the pass-through check below)
      if (!d.still) {
        u.dist -= u.speed * dt;
        if (u.dist <= 0) {
          this.units.delete(u.id); // reached the entrance
          continue;
        }
        this.placeUnit(u);
      }
      if (d.air || u.ghostT > 0) continue; // Gift Bombers fly over the zombies; ghosts pass through them

      // Crashes (hidden zombies too: you don't need to see a zombie to run it over).
      // Every walking summon crashes: vehicles and squads alike (Punkbuster punks, Field Barracks
      // soldiers... used to let zombies walk straight through them). Only still units (plants, Ice
      // Shards) and blockers (Bubble Companions) take contact damage instead.
      const crash = !d.still && !d.block;
      for (const e of this.enemies.values()) {
        if (e.flying) continue; // flyers pass overhead
        if (e.route !== u.route) continue; // another lane
        if (ENEMIES[e.type].noCollide) continue; // Halloween Ghosts float right through units
        // Touching, or they swapped sides since the last tick (a fast zombie and a unit can jump
        // past each other in one step without ever being within CONTACT).
        const gap = e.dist - u.dist;
        if (Math.abs(gap) > CONTACT && !((e.ud ?? e.dist) - from > 0 !== gap > 0)) continue;
        if (d.noGhosts && ENEMIES[e.type].model === 'ghost') continue; // elves walk right through Ghosts
        if (d.block) e.holdT = Math.max(e.holdT || 0, 0.1); // Bubble Companion: zombies can't walk past it
        if (u.starT > 0) {
          // Kart Kid star: invincible; smashes each zombie once, a bit weaker with every hit.
          if (u.starHits.has(e.id)) continue;
          u.starHits.add(e.id);
          this.damage(tower, e, Math.round(u.starDmg));
          u.starDmg *= d.star.fade;
          continue;
        }
        if (crash) {
          // Behemoths take less damage when they ram (ramArmor), so they hit for more before breaking.
          const soak = 1 - (d.ramArmor || 0);
          const hit = Math.min(e.hp, u.hp / soak);
          u.hp -= hit * soak;
          this.crashing = true; // Rebirther: Enforcement Base / Buccaneer crashes get through Blood Sacrifice
          this.damage(tower, e, hit * (1 - (ENEMIES[e.type].collisionResist ?? 0)), d.pierceArmor); // Elf crashes ignore armor; Medium bosses resist crashes
          this.crashing = false;
          if (d.burn && this.enemies.has(e.id)) this.ignite(e, u.tower, d.burn.dps, d.burn.time, 0); // Slime King fire slimes
        } else {
          // Field Barracks soldiers hurt the zombies they bump into.
          if (d.bump) this.damage(tower, e, d.bump * u.alive * dt);
          u.hp -= ENEMIES[e.type].damage * GAME.unitContact * (d.hurt ?? 1) * dt * (medics.length ? 1 - shieldOf(u) : 1) * (1 - (d.defense || 0)); // hurt: Bubble Companions pop faster
        }
        if (u.hp <= 0) break;
      }
      if (u.hp <= 0 && d.revive && (u.revived || 0) < d.revive) {
        // Oddport: Reese patches the whole group back up.
        u.revived = (u.revived || 0) + 1;
        u.hp = u.maxHp;
        this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text: '✚ Revived!', color: '#ff8a80' });
      }
      if (u.hp <= 0 && d.ghost && !u.ghostT) {
        // Gold Commander cyber tank: destroyed, it fights on as a ghost (it just can't ram).
        u.ghostT = d.ghost.life;
        u.hp = u.maxHp;
        u.model = `${d.model}ghost`;
        this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text: '👻 Ghost form!', color: '#fff59d' });
      }
      if (u.hp <= 0 && d.star && !u.starUsed) {
        // Kart Kid Lv 5: out of health, it grabs a star instead of breaking.
        u.starUsed = true;
        u.starT = d.star.time;
        u.starDmg = d.star.damage;
        u.starHits = new Set();
        u.hp = u.maxHp;
        this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text: '★ Star power!', color: '#ffd740' });
      }
      if (d.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / d.hp - 1e-6));
      if (u.hp <= 0) this.destroyUnit(u, tower);
    }
    for (const e of this.enemies.values()) e.ud = e.dist; // for next tick's pass-through check
  }

  /**
   * War Machine punch: every zombie in the blast is knocked back `c.knock` and stunned for `c.stun`
   * s, bosses and stun-immune ones too (at full length).
   */
  smash(c, x, z, det) {
    const r2max = c.radius * c.radius;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e) || (e.x - x) ** 2 + (e.z - z) ** 2 > r2max) continue;
      if (c.knock) e.dist = Math.max(0, e.dist - c.knock);
      if (c.stun && !(e.stop >= c.stun && e.stopKind)) {
        e.stop = c.stun;
        e.stopKind = 'stun';
        e.speed = 0;
      }
    }
  }

  /** The zombie closest to the castle within `range` of the unit. Units only see hidden / flying / lead zombies if their def says so. */
  unitTarget(u, range, def = u.def) {
    const r2max = range * range;
    const det = unitDetection(def);
    let best = null;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if ((e.x - u.x) ** 2 + (e.z - u.z) ** 2 > r2max) continue;
      if (!best || e.dist > best.dist) best = e;
    }
    return best;
  }

  destroyUnit(u, tower) {
    this.units.delete(u.id);
    if (u.def.onDeath && tower) {
      // Trojan Duck: lets its passengers out where it went down.
      const o = u.def.onDeath;
      for (let i = 0; i < o.n; i++) this.spawnUnit(tower, o.unit, 0, Math.min(path.length - 1, u.dist + i * 1.2), u.route);
    }
    if (u.def.cash && tower) {
      // Kingpin Money Runner: pays its tower's owner when it goes down.
      const p = this.players.get(tower.owner);
      if (p) p.cash += u.def.cash;
      this.events.push({ k: 'bountyPaid', x: r2(u.x), z: r2(u.z), v: u.def.cash, owner: tower.owner, run: 1 });
    }
    let ex = u.def.explode;
    // Buzzer Dark Summoner: its owner's summons explode for half their max health.
    if (!ex && !u.def.point && tower && this.players.get(tower.owner)?.darkSummon && u.maxHp > 1) ex = { damage: Math.round(u.maxHp / 2), radius: 6 };
    this.events.push({ k: 'udie', u: u.id, x: r2(u.x), z: r2(u.z), ...(ex ? { boom: 1 } : {}) });
    if (ex) this.explode(tower, u.x, u.z, { damage: ex.damage, radius: ex.radius, det: WRECK_BLAST, pierceArmor: u.def.pierceArmor, freeze: ex.freeze, ice: ex.ice, ignoreIceResist: ex.ignoreIceResist }); // Ice Shard: freezes too (through ice resistance)
  }

  removeUnitsOf(towerId) {
    for (const u of this.units.values()) if (u.tower === towerId) this.units.delete(u.id);
  }

  // ---------------------------------------------------------------- abilities

  useAbility(t, s, ab, m) {
    const fury = TOWERS[t.type].fury;
    if (fury) t.fury = Math.max(t.fury, fury); // Classic Commander fights for a while after any ability
    if (timedAbility(ab)) {
      t.active = ab.duration;
      if (ab.key === 'uberBeam' || ab.key === 'kritz') {
        // Medigun Medic: lock the beam onto the tower getting it.
        const p = this.chargeTarget(t, s, ab);
        t.lock = p ? p.id : 0;
        if (ab.key === 'uberBeam') {
          for (const o of p ? [t, p] : [t]) {
            o.stunT = 0;
            o.smoke = 0;
            this.healTower(o, o.maxHp);
          }
        }
      }
      if (ab.heal) this.healTower(t, ab.heal); // Juggernaut Overcharge
      if (ab.unstunSelf) t.stunT = 0; // Golden Juggernaut Reboot Systems
      if (ab.immune) {
        t.immuneT = Math.max(t.immuneT || 0, ab.duration); // Yasuke Dragon Flame: can't be stunned
        t.stunT = 0;
      }
    } else if (ab.key === 'grandslam') this.grandSlam(t, s, ab);
    else if (ab.key === 'magicBoost') t.magic = (t.magic || 0) + ab.add; // Wizard
    else if (ab.key === 'soulSurge') {} // Lure: the use count is the effect (see updateTower)
    else if (ab.key === 'spore') {
      // Quinn Spore Field: every zombie in range slows down (bosses too).
      for (const e of this.enemies.values()) if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= s.range * s.range) this.applySlime(e, { slow: ab.slow, time: ab.time, boss: 1 });
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.range });
    } else if (ab.key === 'crucifix') {
      const e = this.crucifixTarget(t, s);
      if (e) {
        this.stop({ bossStop: ab.boss }, e, ab.time, 'ice');
        this.events.push({ k: 'shot', t: t.id, e: e.id, c: 1 });
      }
    } else if (ab.key === 'voltPoint') {
      const u = this.spawnUnit(t, { ...ab.unit, radius: ab.radius }, 0, path.project(Number(m.x), Number(m.z)), path.lastRoute);
      u.x = Number(m.x);
      u.z = Number(m.z);
      this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z), volt: 1 });
    } else if (ab.key === 'extraSlot' || ab.key === 'darkSummon') {
      const p = this.players.get(t.owner);
      if (p && ab.key === 'extraSlot') p.extraSlots = (p.extraSlots || 0) + 1; // Discount Dog
      if (p && ab.key === 'darkSummon') p.darkSummon = true; // Buzzer
    } else if (ab.key === 'repaint') {
      // Stella: every drawing back to full health.
      for (const u of this.units.values()) if (u.tower === t.id) u.hp = u.maxHp;
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.range });
    }
    else if (ab.key === 'reposition' || ab.key === 'teleport' || ab.key === 'jump') {
      this.reposition(t, s, ab, Number(m.x), Number(m.z));
      if (ab.immune) t.immuneT = Math.max(t.immuneT || 0, ab.immune); // Eldritch Rift: stun immunity
    }
    else if (ab.key === 'carpetBomb') this.carpetBomb(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'redeploy') t.face = t.yaw = Math.atan2(Number(m.x) - t.x, Number(m.z) - t.z); // Machine Gunner: turn its cone
    else if (ab.key === 'reverse') t.dir = -(t.dir || 1);
    else if (ab.key === 'patrol') {
      // Pursuit: move the patrol zone (the helicopter flies over on its own).
      // Splash Total Relocation: every Splash its owner has flies there.
      let x = Number(m.x);
      let z = Number(m.z);
      if (s.flyArea) {
        // Helicopter: only inside its fly area (range boosts make it bigger), then a wait before it attacks.
        const area = s.flyArea * buffOf(this.buffs, t.id).range;
        const d = Math.hypot(x - t.x, z - t.z);
        if (d > area) {
          x = t.x + ((x - t.x) / d) * area;
          z = t.z + ((z - t.z) / d) * area;
        }
        t.parked = false;
        t.heliWait = TOWERS[t.type].moveDelay ?? 0;
      }
      for (const o of ab.all ? [...this.towers.values()].filter((o) => o.type === t.type && o.owner === t.owner) : [t]) {
        o.cx = x;
        o.cz = z;
      }
    } else if (ab.key === 'crows') this.crowFlock(t, s, ab);
    else if (ab.key === 'strike') this.strike(t, s, ab);
    else if (ab.key === 'meteor') this.iceMeteor(t, s, ab);
    else if (ab.key === 'timeWarp') t.choice = t.choice?.[0] === 'slow' ? [] : ['slow']; // Time Dilator
    else if (ab.key === 'soulBeam') t.choice = t.choice?.[0] === 'beam' ? [] : ['beam']; // Spiritual Advocate
    else if (ab.key === 'selfHeal' || ab.key === 'soulHeal') {
      this.setSouls(t, s, (t.soulN || 0) - ab.souls);
      const r2max = (ab.radius ?? 0) ** 2;
      for (const o of ab.key === 'selfHeal' ? [t] : [...this.towers.values()].filter((o) => (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max)) {
        if (!beamHealable(o) && o !== t) continue;
        o.hotT = ab.time;
        o.hotRate = (o.maxHp * ab.pct) / ab.time;
      }
      if (ab.pause) t.restT = ab.pause;
      this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '✚ Healing', color: '#b2ff59' });
    } else if (ab.key === 'fps') {
      t.manual = !t.manual;
      t.fire = false;
      t.flyX = t.flyZ = undefined;
      t.aimYaw = t.yaw;
      t.aimAge = 0;
    }
    else if (ab.key === 'track') t.track = nextTrack(t.track, s);
    else if (ab.key === 'absZero') this.absoluteZero(t, ab);
    else if (ab.key === 'unitCommand' || ab.key === 'immolation') {
      // Bugler Unit Commander / Elite Immolation: the zombie closest to the clicked spot.
      const e = this.closestEnemy(Number(m.x), Number(m.z), ab.key === 'immolation' ? this.detects(t, s) : SEE_ALL);
      if (e && ab.key === 'unitCommand') {
        for (const o of this.towers.values()) if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= s.aura * s.aura) o.forceE = e.id;
        this.events.push({ k: 'shot', t: t.id, e: e.id, c: 1 });
      } else if (e) {
        this.events.push({ k: 'shot', t: t.id, e: e.id, c: 2 });
        this.hitMods = { shieldMult: ab.shieldMult };
        this.damage(t, e, ab.damage);
        this.hitMods = null;
      }
    } else if (ab.key === 'directedPower') {
      // Bugler Directed Power: the owner's tower closest to the spot fires `boost` faster; low levels for longer.
      let best = null;
      let bestD = Infinity;
      for (const o of this.towers.values()) {
        if (o.owner !== t.owner || o === t || TOWERS[o.type].kind) continue;
        const d = (o.x - Number(m.x)) ** 2 + (o.z - Number(m.z)) ** 2;
        if (d < bestD) {
          best = o;
          bestD = d;
        }
      }
      if (best) {
        const max = Math.max(1, TOWERS[best.type].levels.length - 1);
        best.dpT = ab.long - (ab.long - ab.short) * Math.min(1, best.level / Math.min(4, max));
        best.dpBoost = ab.boost;
        this.events.push({ k: 'ability', id: best.id, owner: best.owner, name: 'Directed Power', x: best.x, z: best.z });
      }
    } else if (ab.key === 'attrition') {
      this.attrition = { left: ab.duration, pct: ab.pct, cap: ab.cap };
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: 6 });
    } else if (ab.key === 'withdraw') {
      // Market Banking: pays out the bank.
      const owner = this.players.get(t.owner);
      const v = Math.floor(t.bank || 0);
      t.bank = 0;
      if (owner && v > 0) {
        owner.cash += v;
        this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
      }
    } else if (ab.key === 'radarMove') {
      t.rx = Number(m.x); // Surveyor Radar Drone
      t.rz = Number(m.z);
    } else if (ab.key === 'forcefield') {
      // Mechanic Forcefield Generator: towers nearby can't be stunned for a while.
      for (const o of this.towers.values()) {
        if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 > ab.radius * ab.radius) continue;
        o.immuneT = Math.max(o.immuneT || 0, ab.duration);
        o.stunT = 0;
      }
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: ab.radius });
    }
    else if (ab.key === 'bounty') this.placeBounty(t, s, ab);
    else if (ab.key === 'beat') this.dropBeat(t, s, ab);
    else if (ab.key === 'militia' || ab.vehicle) this.spawnUnit(t, ab.unit);
    else if (ab.key === 'raise') this.raiseDead(t, s);
    else if (ab.key === 'airdrop') this.airDrop(t, s, Number(m.x), Number(m.z));
    else if (ab.key === 'summon') this.relicSummon(t, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'caravan') ab.units.forEach((u, i) => this.spawnUnit(t, u, i * (ab.gap ?? 6)));
    else if (ab.key === 'crossbow') this.crossbowMine(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'chargedThrow') this.chargedThrow(t, s, ab);
    else if (ab.key === 'spotter') this.spotter(t, s, ab);
    else if (ab.key === 'barrier') {
      // Combat Drone Shield: immune to every attack for a while, and shakes off debuffs.
      t.invulnT = ab.duration;
      t.stunT = 0;
      t.smoke = 0;
    } else if (ab.key === 'medDrone') {
      this.healZones ??= [];
      this.healZones.push({ tower: t.id, x: Number(m.x), z: Number(m.z), radius: ab.radius, n: ab.towers, heal: ab.heal, left: ab.time });
      this.events.push({ k: 'medDrone', id: t.id, x: r2(Number(m.x)), z: r2(Number(m.z)), r: ab.radius, d: ab.time });
    } else if (ab.key === 'voidSlam') {
      const e = this.findTarget(t, s, t.x, t.z, s.range);
      if (e) {
        this.events.push({ k: 'shot', t: t.id, e: e.id, c: 2 });
        this.damage(t, e, ab.damage);
      }
    }
    else if (ab.key === 'sweeper') this.sweep(t, ab);
    else if (ab.key === 'flare') this.flare(t, s, ab);
    else if (ab.key === 'sensor') this.stealthSensor(t, s, ab);
    else if (ab.key === 'healpack') this.healPack(t, ab);
    else if (ab.key === 'unstun') this.unstun(t, ab);
    else if (ab.key === 'stiel' || ab.key === 'napalm') this.throwNade(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'ghostGrenade') this.ghostGrenade(t, ab);
    else if (ab.key === 'concussive') this.concussive(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'beeNade') this.beeNade(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'arrows') t.track = ((t.track || 0) + 1) % arrowModes(s).length; // Archer (Bowmaster)
    else if (ab.key === 'element') t.choice = [choicesOf(TOWERS[t.type], s, t.choice)[0] === 'fire' ? 'frost' : 'fire']; // Elementalist
    else if (ab.key === 'heatwave') {
      this.heatwave(t, s, ab);
      if (ab.selfDamage) this.hurtTower(t, ab.selfDamage); // Rockety Vintage Fuze blows up on top of it
    }
    else if (ab.key === 'ghostHands') this.ghostHands(t, s, ab);
    else if (ab.key === 'seeMe') t.seeT = ab.duration;
    else if (ab.key === 'nuke') this.nuke(t, s, ab);
    else if (ab.key === 'droneMode') {
      // Spectre: switch to the next drone mode it has unlocked.
      const modes = droneModes(s);
      t.choice = [modes[(modes.indexOf(droneMode(t, s)) + 1) % modes.length]];
    } else if (ab.key === 'dive') t.choice = t.choice?.[0] === 'sub' ? [] : ['sub']; // Submerge
    else if (ab.key === 'scope') t.choice = t.choice?.[0] === 'wide' ? [] : ['wide']; // Stormwing Expanded Scope
    else if (ab.key === 'liveShow') {
      t.liveT = ab.duration;
      this.liveShows = true;
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: ab.radius });
    } else if (ab.key === 'wipeout') this.wipeout(t, s, ab);
    else if (ab.key === 'orbital') {
      // Gold Commander Orbital Airstrike: the beam starts where you clicked, then follows your cursor ('laser').
      const x = Number(m.x);
      const z = Number(m.z);
      t.orb = { x, z, tx: x, tz: z, left: ab.time, dps: ab.dps, radius: ab.radius, speed: ab.speed };
    }
    else if (ab.key === 'harpoon') this.harpoonShot(t, s, ab);
    else if (ab.key === 'deploy') {
      // Valkyr / Punkbuster / Squadron / Borealis: units now start from the path closest to this spot.
      t.dropD = path.project(Number(m.x), Number(m.z));
      t.dropR = path.lastRoute;
      const p = path.at(t.dropD, {}, t.dropR);
      this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: 0 });
    }
    else if (ab.key === 'iceTurret' || ab.key === 'iceShard') this.placeIceTurret(t, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'targetSelect') t.spot = { x: Number(m.x), z: Number(m.z) }; // Artillery
    else if (ab.key === 'thorns') this.growThorns(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'puddle') this.dropPuddle(t, ab);
    else if (ab.key === 'toxicBlast' || ab.key === 'neuralyze') this.throwToxic(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'airstrike') {
      const x = Number(m.x);
      const z = Number(m.z);
      // One bomb, or `bombs` of them in a line through the spot (the plane flies along +x).
      const n = ab.bombs || 1;
      const gap = ab.radius * 0.9;
      for (let i = 0; i < n; i++) {
        const bx = x + (i - (n - 1) / 2) * gap;
        const time = STRIKE_TIME + i * 0.12;
        this.shells.push({ tower: t.id, x: bx, z, time, damage: ab.damage, radius: ab.radius, det: SEE_ALL });
        this.events.push({ k: 'strike', x: r2(bx), z: r2(z), d: time, ...(i ? { n: i } : {}) });
      }
    } else if (ab.key === 'frostNade') {
      // Freezes the best few zombies in range (bosses can't be frozen).
      // Each one gets its own thrown grenade.
      const list = this.findTargets(t, s, ab.count, (e) => !e.boss);
      list.forEach((e, i) => {
        const time = 0.55 + i * 0.08;
        this.flights.push({ tower: t.id, type: t.type, enemy: e.id, time, ice: ab.duration });
        this.events.push({ k: 'fly', t: t.id, e: e.id, d: r2(time), nade: 'ice' });
      });
    } else if (ab.key === 'frag') {
      // Ranger Grenade: an explosive blast around its best target in range (or at its feet).
      const e = this.findTarget(t, s, t.x, t.z, s.range);
      const x = e ? e.x : t.x;
      const z = e ? e.z : t.z;
      const time = 0.6;
      this.shells.push({ tower: t.id, x, z, time, damage: ab.damage, radius: ab.radius, det: this.detects(t, s), stun: ab.stun, stunAny: ab.stunAny, burn: ab.burn, burnTime: ab.burnTime });
      t.yaw = Math.atan2(x - t.x, z - t.z);
      this.events.push({ k: 'lob', t: t.id, x: r2(x), z: r2(z), d: time });
    } else if (ab.key === 'cryoNade') {
      // Cryo Ranger: a freezing blast around its best target in range (or at its feet).
      // The grenade is thrown at where the zombie will be when it lands.
      const e = this.findTarget(t, s, t.x, t.z, s.range);
      const time = 0.6;
      const p = e ? this.leadPoint(e, time) : { x: t.x, z: t.z };
      this.shells.push({ tower: t.id, x: p.x, z: p.z, time, damage: ab.damage, radius: ab.radius, freeze: ab.duration, ice: iceFx(s), det: this.detects(t, s) });
      t.yaw = Math.atan2(p.x - t.x, p.z - t.z);
      this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d: time, nade: 'ice' });
    } else if (ab.versus) {
      this.vs.attack(this.lane, ab.key, ab); // Smokes / Pyrotechnics land on the target's map
    } else if (ab.key === 'rave') {
      const stopDef = { bossStop: GAME.danceBossScale };
      for (const e of this.enemies.values()) {
        if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= s.aura * s.aura) this.stop(stopDef, e, ab.duration, 'dance');
      }
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.aura });
    }
  }

  // ---------------------------------------------------------------- wave 7 towers

  /** Freezer Absolute Zero: every zombie within `radius` of it freezes for `freeze` s (bosses half) and takes `damage`. */
  absoluteZero(t, ab) {
    for (const e of [...this.enemies.values()]) {
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > ab.radius * ab.radius) continue;
      this.damage(t, e, ab.damage);
      if (this.enemies.has(e.id)) this.iceFreeze(e, ab.freeze, { freezeBoss: 0.5 });
    }
    this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: ab.radius, ice: 1 });
  }

  /** The zombie closest to (x, z) that `det` can see, or null. */
  /** El Goblino Crucifix: the zombie in range with the most health (that isn't frozen already). */
  crucifixTarget(t, s) {
    const det = this.detects(t, s);
    let best = null;
    for (const e of this.enemies.values()) {
      if (e.remains || !canHit(det, e) || e.statusImmune || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > s.range * s.range) continue;
      if (!best || e.hp > best.hp) best = e;
    }
    return best;
  }

  closestEnemy(x, z, det) {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const d = (e.x - x) ** 2 + (e.z - z) ** 2;
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  /** Samurai: when nothing is in reach, throws a shuriken (`damage`) at a zombie within `shuriken.range`. */
  throwShuriken(t, s, dt) {
    const sh = s.shuriken;
    t.shurT = Math.max(0, (t.shurT ?? 0) - dt);
    if (t.shurT > 0) return;
    const e = this.findTarget(t, s, t.x, t.z, sh.range);
    if (!e) return;
    t.shurT = sh.cooldown;
    t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
    this.shoot(t, e, sh.damage);
  }

  /** Void King: every `lasers.every` hits, lasers strike up to `count` zombies within `reach`, hurting and stunning them. */
  voidLasers(t, def, s) {
    const l = s.lasers;
    const list = this.findTargets(t, { ...s, range: l.reach }, l.count);
    for (const e of list) {
      this.events.push({ k: 'shot', t: t.id, e: e.id, c: 2 });
      this.damage(t, e, l.damage);
      if (this.enemies.has(e.id)) this.stop(def, e, l.stun, 'stun');
    }
  }

  /**
   * The Eldritch: every hit builds charge; at `railgun.max` it fires its railgun: `damage` to every
   * zombie on a line out to `range`, losing `falloff` with each zombie it pierces.
   */
  chargeRailgun(t, s, target) {
    const rg = s.railgun;
    t.meter = (t.meter || 0) + 1;
    if (t.meter < rg.max) return;
    t.meter = 0;
    this.penetrate(t, { ...s, damage: rg.damage, range: rg.range, pen: { pierce: 100, falloff: rg.falloff } }, target);
  }

  /** Outlaw Ghost Madness: a ghost hand per charge, each a revolver shot that bounces to `bounces` more zombies. */
  ghostHands(t, s, ab) {
    const det = this.detects(t, s);
    const firsts = this.findTargets(t, s, s.ghosts);
    for (let i = 0; i < s.ghosts && firsts.length; i++) {
      let cur = firsts[i % firsts.length];
      const seen = new Set();
      const hits = [];
      while (cur && hits.length <= ab.bounces) {
        hits.push(cur);
        seen.add(cur.id);
        let best = null;
        let bestD = ab.jump * ab.jump;
        for (const e of this.enemies.values()) {
          if (seen.has(e.id) || !canHit(det, e)) continue;
          const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
          if (d <= bestD) {
            best = e;
            bestD = d;
          }
        }
        cur = best;
      }
      this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id), m: 'ghost' });
      for (const e of hits) if (this.enemies.has(e.id)) this.damage(t, e, s.damage * ab.mult);
    }
  }

  /** Raider Nuke: `damage` to every zombie within `radius` of the tower, no matter how many. */
  nuke(t, s, ab) {
    const r2max = ab.radius * ab.radius;
    for (const e of [...this.enemies.values()]) {
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) this.damage(t, e, ab.damage, false, 'none');
    }
    this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: ab.radius, nuke: 1 });
  }

  /** Orbital Wipeout / Jericho Missile: `damage` split evenly among every zombie on the map (hidden ones too). */
  wipeout(t, s, ab) {
    const all = [...this.enemies.values()].filter((e) => !e.remains);
    if (!all.length) return;
    const each = ab.damage / all.length;
    for (const e of all) {
      this.events.push({ k: 'strike', x: r2(e.x), z: r2(e.z), d: 0.6 });
      this.damage(t, e, Math.round(each * 100) / 100, false, 'none');
    }
  }

  /** Marauder Harpoon: a huge hit on its strongest zombie in range that stuns it (bosses too) and makes it take more damage. */
  harpoonShot(t, s, ab) {
    const e = this.findTarget({ ...t, targetMode: 2 }, s, t.x, t.z, s.range);
    if (!e) return;
    t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
    this.events.push({ k: 'shot', t: t.id, e: e.id, c: 2 });
    // If the harpoon would kill it, it reels the zombie in instead (pulled back down the path).
    if (e.hp <= ab.damage && !e.boss) {
      e.dist = Math.max(0, e.dist - ab.reel);
    }
    this.damage(t, e, ab.damage);
    if (!this.enemies.has(e.id)) return;
    this.stop({ stunAny: true, bossStop: 1 }, e, ab.stun, 'stun');
    e.vuln = Math.max(e.vuln, ab.vuln);
    e.vulnT = Math.max(e.vulnT || 0, ab.vulnTime);
  }

  /** Buccaneer pirate barrel: every `drop.every` s its units land on the path, `drop.at` of the way along it. */
  updateDrops(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    t.dropT = (t.dropT ?? s.drop.every) - dt;
    if (t.dropT > 0) return;
    t.dropT = s.drop.every;
    const d = path.length * s.drop.at;
    const route = path.nearestRoute(t.x, t.z);
    s.drop.units.forEach((u, i) => this.spawnUnit(t, u, i * 1.5, d, route));
    const p = path.at(d, {}, route);
    this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: s.drop.units.length });
  }

  /**
   * Spectre drone. Offense: drops `offense` bombs on its own timer (and the Spectre does
   * `offenseDmg` times damage). Defense: every `defense.every` s heals towers in `aura` by
   * `defense.heal` and makes them stun immune for `defense.immune` s. Support: boosts the damage
   * of towers in `aura` (see computeBuffs).
   */
  updateSpectreDrone(t, s, dt) {
    const mode = droneMode(t, s);
    const d = s.drone;
    t.droneT = Math.max(0, (t.droneT ?? 0) - dt);
    if (t.droneT > 0) return;
    if (mode === 'offense') {
      if (this.fireMissiles(t, s, d.offense, 0)) t.droneT = d.offense.every;
    } else if (mode === 'defense') {
      t.droneT = d.defense.every;
      const r2max = s.aura * s.aura;
      for (const o of this.towers.values()) {
        if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 > r2max) continue;
        if (!TOWERS[o.type].noHeal) this.healTower(o, d.defense.heal);
        o.immuneT = Math.max(o.immuneT || 0, d.defense.immune);
      }
      this.events.push({ k: 'shieldUp', id: t.id, x: t.x, z: t.z, r: s.aura });
    }
  }

  /** Glowup Live Show: zombies in its radius are slowed heavily (cash for damage there: see damage). */
  updateLiveShow(t, s, dt) {
    t.liveT = Math.max(0, t.liveT - dt);
    if (!t.liveT) this.liveShows = [...this.towers.values()].some((o) => o.liveT > 0);
    const ab = s.abilities?.find((a) => a.key === 'liveShow');
    if (!ab) return;
    const r2max = ab.radius * ab.radius;
    for (const e of this.enemies.values()) {
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) this.applySlime(e, { slow: ab.slow, time: 0.3 });
    }
  }

  /** Live Show cash: the Glowup owner whose show covers (x, z) gets `cash` of the damage done there. */
  showCash(e, dealt) {
    for (const o of this.towers.values()) {
      if (!(o.liveT > 0)) continue;
      const ab = TOWERS[o.type].levels[o.level].abilities?.find((a) => a.key === 'liveShow');
      if (!ab || (e.x - o.x) ** 2 + (e.z - o.z) ** 2 > ab.radius * ab.radius) continue;
      const p = this.players.get(o.owner);
      if (!p) continue;
      o.showAcc = (o.showAcc || 0) + dealt * ab.cash;
      const pay = Math.floor(o.showAcc);
      o.showAcc -= pay;
      p.cash += pay;
      return;
    }
  }

  /**
   * Glacier: traps the zombie in an ice cube for `cube.time` s (bosses: `bossTime`). The cube has
   * the zombie's health (at most `cube.hp`, bosses 3x that) and takes the damage meant for the
   * zombie; the zombie thaws when it breaks or melts.
   */
  iceCube(t, s, e) {
    if (e.cubeHp > 0 || e.statusImmune || e.stunImmune || e.freezeImmune || e.iceResist >= 1) return;
    const c = s.cube;
    const boss = !!e.boss;
    e.cubeHp = Math.min(e.hp, c.hp) * (boss ? 3 : 1);
    e.stop = boss ? c.time * 2 : c.time;
    e.stopKind = 'ice';
    e.speed = 0;
    this.events.push({ k: 'boom', x: r2(e.x), z: r2(e.z), r: 1.5, ice: 1 });
  }

  /** Ducky Engineer: builds its sentry at each `builds.at` share of the path it walks past. */
  buildAlong(u, tower) {
    const b = u.def.builds;
    u.built ??= 0;
    while (u.built < b.at.length && u.dist <= path.length * b.at[u.built]) {
      u.built++;
      if (!tower) continue;
      this.spawnUnit(tower, b.unit, 0, u.dist, u.route);
      this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z) });
    }
  }

  /** Elementalist Heatwave: hurts, burns and knocks back every zombie it can see within `ab.radius`. */
  heatwave(t, s, ab) {
    const det = this.detects(t, s);
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > ab.radius * ab.radius) continue;
      this.ignite(e, t.id, ab.burn, ab.burnTime, 0);
      this.damage(t, e, ab.damage);
      if (this.enemies.has(e.id)) this.knockBack(e, ab.knock);
    }
    this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: ab.radius, heat: 1 });
  }

  /** Elementalist Ice Turret: a turret (a unit that stands still) on the path closest to (x, z). */
  /** Relic Summon: drops every unit in `ab.drop` on the path near (x, z), a little apart. */
  relicSummon(t, ab, x, z) {
    const d = path.project(x, z);
    const route = path.lastRoute;
    const all = ab.drop.flatMap((g) => Array(g.n).fill(g.unit));
    all.forEach((def, i) => {
      const u = this.spawnUnit(t, def, 0, path.length - 1, route);
      u.dist = Math.max(0, Math.min(path.length - 1, d + (i - (all.length - 1) / 2) * 1.5));
      this.placeUnit(u);
    });
    const p = path.at(d, {}, route);
    this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: all.length, relic: 1 });
  }

  placeIceTurret(t, ab, x, z) {
    const u = this.spawnUnit(t, ab.unit, 0, path.project(x, z), path.lastRoute);
    this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z), ice: 1 });
  }

  /** Harvester Thorns: a thorn patch where you clicked, plus a weaker one by each of your Farms in range. */
  growThorns(t, s, ab, x, z) {
    const patch = (px, pz, mult) => {
      const p = { id: this.nextId++, tower: t.id, kind: 'thorns', x: px, z: pz, land: 0, radius: ab.radius, left: ab.time, damage: ab.damage * mult, tick: ab.tick, next: 0, slow: ab.slow };
      this.traps.set(p.id, p);
    };
    patch(x, z, 1);
    for (const o of this.towers.values()) {
      if (o.owner !== t.owner || familyOf(o.type) !== 'farm' || (o.x - t.x) ** 2 + (o.z - t.z) ** 2 > s.range * s.range) continue;
      const p = path.at(path.project(o.x, o.z), {}, path.lastRoute);
      patch(p.x, p.z, ab.farmMult);
    }
  }

  /** Goo Gunner Spawn Puddle: a goo puddle on the bit of path closest to the tower. */
  dropPuddle(t, ab) {
    const d = path.project(t.x, t.z);
    const r = path.lastRoute;
    const p = path.at(d, {}, r);
    const id = this.nextId++;
    this.traps.set(id, { id, tower: t.id, kind: 'goo', x: p.x, z: p.z, d, r, land: 0, radius: ab.radius, left: ab.time, every: ab.every, next: 0, units: ab.units });
    this.events.push({ k: 'boom', x: r2(p.x), z: r2(p.z), r: ab.radius, slime: 1 });
  }

  /** A goo puddle: sends out its units every `every` s until it dries up (or its tower is gone). */
  gooPuddle(p, dt) {
    const tower = this.towers.get(p.tower);
    if ((p.left -= dt) <= 0 || !tower) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    if ((p.next -= dt) > 0) return;
    p.next += p.every;
    const all = p.units.flatMap((g) => Array(g.n).fill(g.unit));
    all.forEach((def, i) => this.spawnUnit(tower, def, i * 1.5, p.d, p.r ?? 0));
    this.events.push({ k: 'boom', x: r2(p.x), z: r2(p.z), r: p.radius, slime: 1 });
  }

  /** A thorn patch: hurts and slows every ground zombie inside (hidden ones too, never lead) every `tick` s. */
  thornPatch(p, dt) {
    if ((p.left -= dt) <= 0) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    p.next -= dt;
    const hit = p.next <= 0;
    if (hit) p.next += p.tick;
    const tower = this.towers.get(p.tower) ?? null;
    for (const e of [...this.enemies.values()]) {
      if (e.flying || e.lead || (e.x - p.x) ** 2 + (e.z - p.z) ** 2 > p.radius * p.radius) continue;
      if (!e.statusImmune) {
        e.thornSlow = Math.max(e.thornT > 0 ? e.thornSlow : 0, p.slow);
        e.thornT = 1;
      }
      if (hit) this.damage(tower, e, p.damage);
    }
  }

  /** Firework Technician: when a wave starts, towers in its range get hidden detection and fireworks for a while. */
  lightFireworks() {
    for (const f of this.towers.values()) {
      const fw = TOWERS[f.type].levels[f.level].firework;
      if (!fw || f.hp <= 0) continue;
      const r = TOWERS[f.type].levels[f.level].aura;
      for (const t of this.towers.values()) {
        if (t === f || TOWERS[t.type].kind === 'income' || TOWERS[t.type].levels[t.level].firework || (t.x - f.x) ** 2 + (t.z - f.z) ** 2 > r * r) continue;
        // The best Technician in range wins.
        if (t.fwT > 0 && t.fw && t.fw.damage >= fw.damage) continue;
        t.fwT = fw.time;
        t.fw = { ...fw, by: f.id };
      }
    }
  }

  /** Firework: tower `t` (boosted by a Technician) may launch one at the zombie it just hurt. */
  firework(t, e) {
    const s = TOWERS[t.type].levels[t.level];
    const per = (s.cooldown || 1) / (s.burst || 1);
    if (Math.random() >= Math.min(t.fw.cap, per / 2)) return;
    const by = this.towers.get(t.fw.by) ?? null;
    this.explode(by, e.x, e.z, { damage: t.fw.damage, radius: t.fw.radius, burn: t.fw.burn, burnTime: 3, det: { hidden: true, flying: true, lead: true }, pierceArmor: true, firework: 1 });
  }

  /** Mobster Place Bounty: the toughest zombie in range it can hit that has no bounty yet (or the toughest one). */
  bountyTarget(t, s) {
    const det = this.detects(t, s);
    const r2max = s.range * s.range;
    let best = null;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      const rank = (e.bounty ? 0 : 1e12) + e.hp;
      if (!best || rank > best.rank) best = { e, rank };
    }
    return best?.e ?? null;
  }

  /** Marks a zombie for good: when it dies, the owner gets `ab.pct` of its max health as cash, up to `ab.cap`. A better bounty replaces a worse one. */
  placeBounty(t, s, ab) {
    const e = this.bountyTarget(t, s);
    if (!e) return;
    const pay = Math.round(Math.min(ab.cap, e.maxHp * ab.pct));
    if (e.bounty && e.bounty.pay >= pay) return;
    e.bounty = { owner: t.owner, pay };
    this.events.push({ k: 'bounty', e: e.id, v: pay });
  }

  /**
   * Slammer Grand Slam: every zombie it can hit within `ab.radius` takes its damage, catches fire
   * and is stunned for `ab.stun` s, even bosses (full length) and stun-immune zombies.
   */
  grandSlam(t, s, ab) {
    const det = this.detects(t, s);
    const r2max = ab.radius * ab.radius;
    this.events.push({ k: 'whirl', t: t.id, r: ab.radius });
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      this.ignite(e, t.id, ab.burn, ab.burnTime, 0);
      this.damage(t, e, s.damage);
      if (!this.enemies.has(e.id) || e.stop >= ab.stun) continue;
      e.stop = ab.stun;
      e.stopKind = 'stun';
      e.speed = 0;
    }
  }

  /**
   * Assault Grenadier Stiel / Napalm Grenade: thrown at a spot the player picked. The blast sets
   * zombies on fire; napalm also leaves a burning patch (a thermite trap) for `ab.time` s.
   */
  throwNade(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const time = 0.9;
    const det = this.detects(t, s);
    const patch = ab.time ? { radius: ab.radius, time: ab.time, burn: ab.burn, burnTime: ab.burnTime } : null;
    this.shells.push({ tower: t.id, x, z, time, damage: ab.damage, radius: ab.radius, burn: ab.burn, burnTime: ab.burnTime, det, patch });
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'lob', t: t.id, x: r2(x), z: r2(z), d: time });
  }

  /**
   * Commando Concussive Missiles: `count` missiles land around (x, z) `delay` s later, each
   * `damage` within `radius` (ignoring armor, hitting lead zombies) and stunning for `stun` s.
   */
  concussive(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const det = { ...this.detects(t, s), lead: true };
    for (let i = 0; i < ab.count; i++) {
      const a = (i / ab.count) * TAU;
      const off = ab.count > 1 ? ab.radius * 0.6 : 0;
      const bx = x + Math.sin(a) * off;
      const bz = z + Math.cos(a) * off;
      const time = ab.delay + i * 0.15;
      this.shells.push({ tower: t.id, x: bx, z: bz, time, damage: ab.damage, radius: ab.radius, stun: ab.stun, det, pierceArmor: true });
      this.events.push({ k: 'strike', x: r2(bx), z: r2(bz), d: time, ...(i ? { n: i } : {}), t: t.id });
    }
    t.yaw = Math.atan2(x - t.x, z - t.z);
  }

  /**
   * MLRS Carpet Bomb: a B-52 flies along the path through (x, z) and drops `ab.bombs` bombs
   * `ab.gap` s apart over a strip `ab.length` long, zig-zagging across its `ab.width`.
   */
  carpetBomb(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    // Line it up with the path where it's closest to the click.
    const p = path.at(path.project(x, z), {}, path.lastRoute);
    const ux = p.dx;
    const uz = p.dz;
    const det = { ...this.detects(t, s), lead: true };
    const n = ab.bombs;
    const side = ab.width / 2 - ab.radius;
    for (let i = 0; i < n; i++) {
      const along = (i / (n - 1) - 0.5) * ab.length;
      const across = (i % 2 ? 1 : -1) * side;
      const bx = x + ux * along - uz * across;
      const bz = z + uz * along + ux * across;
      const time = ab.delay + i * ab.gap;
      this.shells.push({ tower: t.id, x: bx, z: bz, time, damage: ab.damage, radius: ab.radius, det });
      this.events.push({ k: 'strike', x: r2(bx), z: r2(bz), d: r2(time), ...(i ? { n: i } : {}) });
    }
    this.events.push({ k: 'b52', x: r2(x), z: r2(z), dx: r2(ux), dz: r2(uz), d: ab.delay, len: ab.length, gap: ab.gap * n });
  }

  /**
   * Bubble Blower: `s.bubble.n` bubbles at different zombies in range (the target first). Each does
   * `s.damage`; non-boss zombies are pushed back (`push`, at most once every BUBBLE_PUSH_CD s) or,
   * with `float`, lifted off the ground for that long.
   */
  blowBubbles(t, def, s, target) {
    const b = s.bubble;
    const list = b.n > 1 ? [target, ...this.findTargets(t, s, b.n - 1, (e) => e !== target)] : [target];
    for (const e of list) {
      this.shoot(t, e, s.damage);
      if (!this.enemies.has(e.id) || e.boss || e.statusImmune) continue;
      if (b.float) this.stop(def, e, b.float, 'float');
      else if (!(e.pushT > 0)) {
        this.knockBack(e, b.push);
        e.pushT = BUBBLE_PUSH_CD;
      }
    }
  }

  /** Bubble Blower Lv 5: a Bubble Companion every `every` s of wave time, at the far end of the path in its range. */
  updateCompanion(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    const c = s.companion;
    t.compT = (t.compT ?? 0) - dt;
    if (t.compT > 0) return;
    if (this.countOf(t, c.unit) >= (c.unit.max ?? Infinity)) {
      t.compT = 0; // wait for a free slot
      return;
    }
    const p = {};
    const r2max = s.range * s.range;
    for (let r = 0; r < path.routes.length; r++) for (let d = 0; d <= path.length; d += 0.5) {
      path.at(d, p, r);
      if ((p.x - t.x) ** 2 + (p.z - t.z) ** 2 > r2max) continue;
      t.compT = c.every;
      this.spawnUnit(t, c.unit, 0, d, r);
      this.events.push({ k: 'sprout', x: r2(p.x), z: r2(p.z), bubble: 1 });
      return;
    }
    t.compT = 1; // no path in range
  }

  /** Swarmer Bee Swarm Grenade:`damage` to everything within `radius` of (x, z), ignoring armor, lead too. */
  beeNade(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const time = 0.9;
    this.shells.push({ tower: t.id, x, z, time, damage: ab.damage, radius: ab.radius, det: { ...this.detects(t, s), lead: true }, pierceArmor: true });
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'lob', t: t.id, x: r2(x), z: r2(z), d: time });
  }

  /**
   * Toxicnator Toxic Blast / Saboteur Aggressive Toxins: a grenade thrown at a spot; zombies in
   * the blast take extra damage for a while (Neuralyzed ones are also targeted first).
   */
  throwToxic(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const time = 0.9;
    this.shells.push({ tower: t.id, x, z, time, damage: 0, radius: ab.radius, det: this.detects(t, s), toxic: ab });
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'lob', t: t.id, x: r2(x), z: r2(z), d: time });
  }

  /**
   * Ghost C7 Drone (while it's on): reveals hidden zombies within its range and shoots them,
   * or any zombie in range when there is no hidden one.
   */
  /** Ice Breaker Snow Storm: while it's on, zombies around the tower build up freeze fast. */
  updateSnowStorm(t, s, dt) {
    const ab = s.abilities?.find((a) => a.key === 'snowStorm');
    if (!ab) return;
    const det = this.detects(t, s);
    const r2max = ab.radius * ab.radius;
    const fx = { chill: ab.freeze * 0.06 * dt, chillTime: s.chillTime ?? 3, maxSlow: s.maxSlow ?? 0.3, chillDps: 0, chillFreeze: s.chillFreeze ?? 1, freezeBoss: s.freezeBoss };
    for (const e of this.enemies.values()) {
      if (canHit(det, e) && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) this.applyChill(t, fx, e);
    }
    // A puff of snow about once a second while it lasts.
    t.stormFx = (t.stormFx ?? 0) - dt;
    if (t.stormFx <= 0) {
      t.stormFx = 1;
      this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: ab.radius, ice: 1 });
    }
  }

  updateDrone(t, s, dt) {
    const ab = s.abilities?.find((a) => a.key === 'drone');
    if (!ab) return;
    const r2max = ab.range * ab.range;
    let best = null;
    let bestHidden = false;
    for (const e of this.enemies.values()) {
      if (e.remains || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      if (e.hidden) e.revealT = Math.max(e.revealT || 0, 0.3);
      // Hidden zombies first, then the one furthest down the path.
      if (!best || (e.hidden && !bestHidden) || (e.hidden === bestHidden && e.dist > best.dist)) {
        best = e;
        bestHidden = e.hidden;
      }
    }
    t.droneT = Math.max(-dt, (t.droneT || 0) - dt);
    if (!best || t.droneT > 0) return;
    t.droneT += ab.every;
    this.events.push({ k: 'shot', t: t.id, e: best.id, dr: 1 });
    this.damage(t, best, ab.damage);
  }

  /** Splash towers: grenades/shells lobbed at where the zombie will be, homing rockets, or an instant ice blast. */
  fireSplash(t, def, s, target) {
    let det = this.detects(t, s);
    if (def.splashAir) det = { ...det, flying: true }; // Demolitionist: its blasts catch flyers near the ground zombie
    const blast = { damage: s.damage, splash: s.splash, radius: s.radius, freeze: s.freeze, freezeMain: s.freezeMain, slime: s.slime,
      ...(s.ignite ? { burn: s.ignite.dps, burnTime: s.ignite.time, burnSlow: def.burnSlow ?? 0 } : {}), stun: s.stun, stunTargets: s.stunTargets, det, main: target.id, cluster: s.cluster, nuke: s.nuke, gas: s.gas, maxHits: s.maxHits, paint: def.paint,
      knock: s.knock, chill: s.chill ? s : null, airMult: s.airMult, freezeHp: s.freezeHp, reveal: s.reveal,
      ...(s.poison ? { poison: s.poison } : {}), ...(s.nuki ? { nuki: s.nuki } : {}) }; // Maitake splash poison, Nuki Launcher
    if (s.bombs) {
      // Jester: every bomb has the effects of every bomb type picked (the biggest blast and damage of them).
      const bombs = this.bombsOf(t, s);
      blast.radius = Math.max(...bombs.map((b) => b.radius));
      blast.damage = s.damage * Math.max(...bombs.map((b) => b.mult));
      for (const b of bombs) {
        if (b.key === 'fire') Object.assign(blast, { burn: b.dps, burnTime: b.time, burnSlow: 0 });
        else if (b.key === 'ice') Object.assign(blast, { chill: b, melt: b.melt, ice: null });
        else if (b.key === 'poison') blast.poison = b;
        else if (b.key === 'confuse') blast.confuse = b;
      }
      blast.bomb = bombs.map((b) => b.key).join(',');
    }
    if (def.fly) {
      // Explosive Goo / splash rockets: fly to the zombie and burst where it is when they land.
      const time = this.flyTime(t, s, target);
      this.shells.push({ tower: t.id, enemy: target.id, x: target.x, z: target.z, time, ...blast });
      this.events.push({ k: 'fly', t: t.id, e: target.id, d: r2(time) });
      return;
    }
    if (!def.lob) {
      // Ice blast: instant hit on the target, freezing everything around it.
      this.events.push({ k: 'shot', t: t.id, e: target.id });
      this.explode(t, target.x, target.z, blast);
      return;
    }
    const time = s.lob ?? def.lob;
    if (s.throws > 1) {
      // Firecracker: each firecracker is lobbed at a different zombie (doubling up if there are few).
      const list = this.findTargets(t, s, s.throws);
      if (!list.length) list.push(target);
      for (let i = 0; i < s.throws; i++) {
        const e = list[i % list.length];
        const d = time + i * 0.08;
        const p = this.leadPoint(e, d);
        this.shells.push({ tower: t.id, x: p.x, z: p.z, time: d, ...blast, main: e.id });
        this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d });
      }
      return;
    }
    if (s.volley) {
      // Missile Maelstrom: each missile locks onto a different zombie (doubling up if there are few).
      const list = this.findTargets(t, s, s.volley, minRangeOf(def, s) ? (e) => !this.deadzone(t, minRangeOf(def, s))(e) : null);
      if (!list.length) list.push(target);
      for (let i = 0; i < s.volley; i++) {
        const e = list[i % list.length];
        const d = time + i * 0.1;
        this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time: d, ...blast, main: e.id });
        this.events.push({ k: 'rocket', t: t.id, e: e.id, d });
      }
      return;
    }
    if (def.homing) {
      this.shells.push({ tower: t.id, enemy: target.id, x: target.x, z: target.z, time, ...blast });
      this.events.push({ k: 'rocket', t: t.id, e: target.id, d: time });
      return;
    }
    // Snowballer: aims as if no zombie is faster than `leadCap`, so fast ones walk out of the way.
    // Artillery: shells land right on its Target Select spot.
    const p = t.spotOn ? t.spot : this.leadPoint(target, time, def.leadCap);
    this.shells.push({ tower: t.id, x: p.x, z: p.z, time, ...blast });
    this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d: time });
  }

  /** Where enemy `e` will be after `time` seconds at its current speed (at most `maxSpeed`). */
  leadPoint(e, time, maxSpeed = Infinity) {
    const p = path.at(e.dist + Math.min(e.speed, maxSpeed) * time, {}, e.route);
    p.x += -p.dz * e.lateral;
    p.z += p.dx * e.lateral;
    return p;
  }

  /** Freeze or stun an enemy for `secs` (bosses get only `def.bossStop` of it). */
  stop(def, e, secs, kind) {
    if (!this.enemies.has(e.id) || (e.statusImmune && !def.stunAny)) return; // Stunner: stuns anything
    if (e.void && kind === 'stun' && (def.stunAny || (def.noVoidStun && e.boss))) return; // ...but never Void enemies
    if (e.stunImmune && !def.stunAny) return; // Medium Predator: no stuns or freezes
    if (kind === 'ice' && e.freezeImmune) return; // Insane: freeze immune
    if (kind === 'dance' && e.danceImmune) return; // Void Boss4: won't dance
    if (kind === 'stun' && e.shockImmune && !def.stunAny) return; // Insane: electric immune
    if (kind === 'ice' && e.iceResist && !def.ignoreIceResist) secs *= 1 - e.iceResist; // Multipliers, Nuclear Zombies
    const d = e.boss ? secs * (def.bossStop ?? 1) : secs;
    if (d <= 0 || (d <= e.stop && e.stopKind)) return;
    e.stop = d;
    e.stopKind = kind;
    e.speed = 0;
    if (e.boss && def.bossGrace) e.zapT = d + def.bossGrace;
  }

  /** Flamethrower: sprays a cone toward its target that sets zombies on fire (hidden ones included). */
  updateFlame(t, def, s, dt) {
    const target = this.findTarget(t, s, t.x, t.z, s.range);
    if (!target) return;
    const want = Math.atan2(target.x - t.x, target.z - t.z);
    t.yaw = lerpAngle(t.yaw, want, Math.min(1, dt * 14));
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    this.events.push({ k: 'flame', t: t.id, r: s.range, c: s.cone });
    const r2max = s.range * s.range;
    // Pyromancers need detection for hidden zombies and only hit the best `hits` in the cone.
    const det = s.hits ? this.detects(t, s) : { ...this.detects(t, s), hidden: true };
    let list = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2max) continue;
      if (Math.abs(angleDiff(t.yaw, Math.atan2(dx, dz))) > s.cone) continue;
      list.push({ e, sc: this.score(t.targetMode, e, d2, t) });
    }
    if (s.hits) list = list.sort((a, b) => b.sc - a.sc).slice(0, s.hits);
    for (const { e } of list) {
      // Fire Slimes shrug off flames (unless it ignores fire resistance: Flame Tanks).
      if (e.fireImmune && !s.ignoreFireResist) continue;
      this.ignite(e, t.id, s.burn, s.burnTime, def.burnSlow ?? 0, s.ignoreFireResist);
      // Flame Tanks: zombies it sets on fire take extra damage from everything for a while.
      if (s.burnVuln) {
        e.vuln = Math.max(e.vuln, s.burnVuln.amount);
        e.vulnT = Math.max(e.vulnT, s.burnVuln.time);
      }
      // Golden Pyromancer: melts away armor for good (the strongest melt so far wins).
      if (s.melt && e.armor) e.armor = Math.min(e.armor, (ENEMIES[e.type].armor ?? 0) * (1 - s.melt));
      if (s.damage) this.damage(t, e, s.damage * (1 - (ENEMIES[e.type].burnResist ?? 0))); // Fire types resist flames
    }
  }

  /** Sets a zombie on fire. Burns don't stack: the hottest one sets the damage. */
  ignite(e, by, dps, time, slow, force = false) {
    if (e.fireImmune && !force) return;
    e.burnSlow = Math.max(e.burn > 0 ? e.burnSlow : 0, slow);
    e.burn = Math.max(e.burn, time);
    if (dps >= e.burnDps) {
      e.burnDps = dps;
      e.burnBy = by;
    }
  }

  updateBurns(dt) {
    this.dot = true; // damage over time never launches fireworks
    try {
      this.tickDots(dt);
    } finally {
      this.dot = false;
    }
  }

  tickDots(dt) {
    for (const e of [...this.enemies.values()]) {
      const el = ENEMIES[e.type]; // Easy mode types: Fire takes less from burns, more from frost; Poison less from poison
      if (e.chillT > 0 && e.chillDps > 0) {
        e.chillAcc += e.chillDps * dt * (1 + (el.frostWeak ?? 0)) * (1 - e.iceResist);
        const whole = Math.floor(e.chillAcc);
        if (whole >= 1) {
          e.chillAcc -= whole;
          this.damage(this.towers.get(e.chillBy) ?? null, e, whole);
          if (!this.enemies.has(e.id)) continue;
        }
      } else {
        e.chillDps = 0;
        e.chillAcc = 0;
      }
      if (e.poison) {
        // Saboteur poison: a hit every `tick` seconds while it lasts.
        const po = e.poison;
        po.left -= dt;
        po.next -= dt;
        if (po.left <= 0) e.poison = null;
        if (po.next <= 0) {
          po.next += po.tick;
          // Toxic Gunner Sinister Gear: every tick melts a little more armor.
          if (po.melt && e.armor) e.armor = Math.max(0, e.armor - (ENEMIES[e.type].armor ?? 0) * po.melt);
          this.damage(this.towers.get(po.by) ?? null, e, el.poisonResist ? Math.max(1, Math.round(po.damage * (1 - el.poisonResist))) : po.damage);
          if (!this.enemies.has(e.id)) continue;
        }
      }
      if (e.taints) {
        // Dumpster Child: Burn / Radioactive / Biohazard, each on its own tick (armor doesn't help).
        for (const [k, d] of e.taints) {
          d.left -= dt;
          d.next -= dt;
          if (d.next <= 0 && d.left > -1e-6) {
            d.next += d.tick;
            this.damage(this.towers.get(d.by) ?? null, e, d.damage, true);
          }
          if (d.left <= 0) e.taints.delete(k);
        }
        if (!e.taints.size) e.taints = null;
        if (!this.enemies.has(e.id)) continue;
      }
      if (e.bees) {
        // Swarmer: every sting stack hurts on its own tick.
        for (let i = e.bees.length - 1; i >= 0; i--) {
          const b = e.bees[i];
          b.left -= dt;
          b.next -= dt;
          if (b.next <= 0 && b.left > -1e-6) {
            b.next += b.tick;
            this.damage(this.towers.get(b.by) ?? null, e, b.damage);
          }
          if (b.left <= 0) e.bees.splice(i, 1);
        }
        if (!e.bees.length) e.bees = null;
        if (!this.enemies.has(e.id)) continue;
      }
      if (e.bleed > 0) {
        // Slasher Bleed: a share of its max health per second per stack, until the stacks fall off.
        if ((e.bleedT -= dt) <= 0) {
          e.bleed = 0;
          e.bleedAcc = 0;
        } else {
          const fx = e.bleedFx;
          e.bleedAcc += e.maxHp * fx.dps * e.bleed * (e.boss ? fx.bossMult : 1) * dt;
          const whole = Math.floor(e.bleedAcc);
          if (whole >= 1) {
            e.bleedAcc -= whole;
            this.damage(this.towers.get(e.bleedBy) ?? null, e, whole, true);
            if (!this.enemies.has(e.id)) continue;
          }
        }
      }
      if (e.gas?.size) {
        // Toxicnator gas: every stack hurts; the strongest one's tower gets the credit.
        let dps = 0;
        let top = 0;
        let by = 0;
        for (const [k, g] of e.gas) {
          if ((g.left -= dt) <= 0) {
            e.gas.delete(k);
            continue;
          }
          dps += g.dps;
          if (g.dps > top) {
            top = g.dps;
            by = g.by;
          }
        }
        e.gasAcc = (e.gasAcc || 0) + dps * dt * (1 - (el.poisonResist ?? 0)); // Toxicnator gas is poison
        const whole = Math.floor(e.gasAcc);
        if (whole >= 1) {
          e.gasAcc -= whole;
          this.damage(this.towers.get(by) ?? null, e, whole);
          if (!this.enemies.has(e.id)) continue;
        }
      }
      if (!e.burn) {
        e.burnDps = 0;
        e.burnAcc = 0;
        continue;
      }
      e.burnAcc += e.burnDps * dt * (1 - (el.burnResist ?? 0));
      const whole = Math.floor(e.burnAcc);
      if (whole < 1) continue;
      e.burnAcc -= whole;
      this.damage(this.towers.get(e.burnBy) ?? null, e, whole);
    }
  }

  /** Plane circles the runway; its gun shoots what's under it, plus bombs and missiles. */
  updateAviator(t, def, s, dt) {
    const dir = t.dir || 1;
    t.ang = (((t.ang + (dir * dt * TAU) / (s.lap ?? def.lap)) % TAU) + TAU) % TAU;
    const p = planePos(t, this.tmp);
    const px = p.x;
    const pz = p.z;
    const target = this.findTarget(t, s, px, pz, s.range);
    if (target && t.cooldown <= 0) {
      t.cooldown += s.cooldown;
      this.shoot(t, target, s.damage);
    }
    const det = this.detects(t, s);
    if (s.bomb) {
      t.bombT = Math.max(0, t.bombT - dt);
      const b = s.bomb;
      if (t.bombT <= 0 && this.anyNear(px, pz, b.radius + s.range, det)) {
        t.bombT = b.every;
        // A stick of bombs, spaced along the flight direction.
        const dx = -Math.sin(t.ang) * dir;
        const dz = Math.cos(t.ang) * dir;
        for (let i = 0; i < b.count; i++) {
          const off = (i - (b.count - 1) / 2) * 3.5;
          const x = px + dx * off;
          const z = pz + dz * off;
          this.shells.push({ tower: t.id, x, z, time: BOMB_FALL, damage: b.damage, radius: b.radius, det });
          this.events.push({ k: 'drop', t: t.id, x: r2(x), z: r2(z), d: BOMB_FALL });
        }
      }
    }
    if (s.missile) {
      t.missileT = Math.max(0, t.missileT - dt);
      const m = s.missile;
      const aim = t.missileT <= 0 && this.findTarget(t, s, px, pz, m.range);
      if (aim) {
        t.missileT = m.every;
        for (let i = 0; i < m.count; i++) {
          this.shells.push({ tower: t.id, enemy: aim.id, x: aim.x, z: aim.z, time: MISSILE_TIME + i * 0.12, damage: m.damage, radius: m.radius, det });
          this.events.push({ k: 'missile', t: t.id, e: aim.id, i, d: MISSILE_TIME + i * 0.12 });
        }
      }
    }
  }

  /**
   * Phaser: a beam locked on one zombie. Damage per tick ramps up the longer it stays
   * on that target; after losing it, the tower waits `retarget` seconds.
   */
  updateBeam(t, def, s, dt) {
    t.wait = Math.max(0, t.wait - dt);
    const det = this.detects(t, s);
    let e = t.lock ? this.enemies.get(t.lock) : null;
    if (e && ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > s.range * s.range || !canHit(det, e))) e = null;
    if (!e && t.lock) {
      t.lock = 0;
      t.charge = 0;
      t.beamT = 0;
      t.wait = def.retarget;
    }
    if (t.wait > 0) return;
    if (!e) {
      e = this.findTarget(t, s, t.x, t.z, s.range);
      if (!e) return;
      t.lock = e.id;
      t.beamT = 0;
      t.cooldown = Math.max(0, t.cooldown);
    }
    t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
    t.beamT += dt;
    t.charge = Math.min(1, t.beamT / s.ramp);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    this.shoot(t, e, Math.round(s.damage + (s.maxDamage - s.damage) * t.charge));
  }

  updateShells(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const sh = this.shells[i];
      const e = sh.enemy && this.enemies.get(sh.enemy);
      if (e) {
        // Missiles home in on their target.
        sh.x = e.x;
        sh.z = e.z;
      }
      sh.time -= dt;
      if (sh.time > 0) continue;
      this.shells.splice(i, 1);
      this.explode(this.towers.get(sh.tower) ?? null, sh.x, sh.z, sh);
      if (sh.cluster) this.scatter(sh);
      if (sh.nuki) this.landNuki(sh);
      if (sh.gas) {
        // Toxicnator: a gas cloud where the grenade landed.
        const g = sh.gas;
        const p = { id: this.nextId++, tower: sh.tower, kind: 'gas', x: sh.x, z: sh.z, land: 0, radius: sh.radius, left: g.cloud, dps: g.dps, time: g.time, targets: g.targets, hits: new Set(), det: sh.det };
        this.traps.set(p.id, p);
      }
      if (sh.patch) {
        // Napalm Grenade: a burning patch, the same as Mine Layer thermite.
        const p = { id: this.nextId++, tower: sh.tower, kind: 'thermite', x: sh.x, z: sh.z, land: 0, radius: sh.patch.radius, left: sh.patch.time, burn: sh.patch.burn, burnTime: sh.patch.burnTime, det: sh.det };
        this.traps.set(p.id, p);
      }
    }
  }

  /** Classic Mortar cluster bombs: they bounce out of the blast and land at random spots around it. */
  scatter(sh) {
    const c = sh.cluster;
    for (let i = 0; i < c.count; i++) {
      const a = Math.random() * TAU;
      const d = sh.radius * (0.5 + Math.random());
      const x = sh.x + Math.cos(a) * d;
      const z = sh.z + Math.sin(a) * d;
      const time = 0.45 + Math.random() * 0.35;
      this.shells.push({ tower: sh.tower, x, z, time, damage: c.damage, radius: c.radius, det: sh.det });
      this.events.push({ k: 'cluster', x: r2(x), z: r2(z), fx: r2(sh.x - x), fz: r2(sh.z - z), d: r2(time) }); // from: the blast (relative, for Versus lanes)
    }
  }

  /**
   * Blast at (x, z). b: { radius, damage, det, splash?, main?, freeze?, stun?, stunTargets? }. The
   * `main` zombie takes `damage`; others take `splash` (or `damage` if there is no separate splash).
   * `stun` stuns up to `stunTargets` zombies in the blast (the main one first).
   */
  explode(t, x, z, b) {
    if (!b.smite) this.events.push({ k: 'boom', x: r2(x), z: r2(z), r: b.radius, ...(b.bomb ? { bomb: b.bomb } : b.firework ? { fw: 1 } : b.freeze || b.chill ? { ice: 1 } : b.slime ? { slime: 1 } : b.nuke ? { nuke: 1 } : b.toxic?.key === 'neuralyze' ? { neuro: 1 } : b.gas || b.toxic ? { gas: 1 } : b.paint ? { paint: 1 } : {}) });
    const r2max = b.radius * b.radius;
    const def = t ? TOWERS[t.type] : {};
    const stuns = b.stun ? [] : null;
    // Explosive resistance (Chained) applies unless the blast, its unit or its tower ignores it.
    const boomKind = b.ignoreExplosiveResist || this.ignoresExplosiveResist(t) ? 'none' : 'explosive';
    let hits = this.enemies.values();
    if (b.reveal) {
      // Gift Elf: presents reveal hidden zombies in the blast for a while.
      for (const e of this.enemies.values()) if (e.hidden && (e.x - x) ** 2 + (e.z - z) ** 2 <= r2max) e.revealT = Math.max(e.revealT || 0, b.reveal);
    }
    if (b.maxHits) {
      // Paintballer: only the zombie it hit and the closest others get splashed.
      const d2 = (e) => (e.id === b.main ? -1 : (e.x - x) ** 2 + (e.z - z) ** 2);
      hits = [...hits].filter((e) => canHit(b.det, e) && d2(e) <= r2max).sort((a, c) => d2(a) - d2(c)).slice(0, b.maxHits);
    }
    this.splashing = true; // Void Consumption: Void Skeletons ignore splash
    try {
      this.explodeHits(t, x, z, b, hits, r2max, def, stuns, boomKind);
    } finally {
      this.splashing = false;
    }
    // stunAny: stuns bosses and stun-immune zombies too, for the full time (Golden Ranger Grenade, Charged Throw).
    const stunDef = b.stunAny ? { stunAny: true, bossStop: 1, noVoidStun: def.noVoidStun } : def;
    if (stuns) for (const e of stuns.slice(0, b.stunTargets ?? Infinity)) this.stop(stunDef, e, b.stun, 'stun');
  }

  /** The enemies one explosion hits (see explode). */
  explodeHits(t, x, z, b, hits, r2max, def, stuns, boomKind) {
    for (const e of hits) {
      if (e.hp <= 0 || !canHit(b.det, e)) continue; // (a firework where a zombie just died)
      if ((e.x - x) ** 2 + (e.z - z) ** 2 > r2max) continue;
      if (stuns) {
        if (e.id === b.main) stuns.unshift(e);
        else stuns.push(e);
      }
      let dmg = b.splash != null && e.id !== b.main ? b.splash : b.damage;
      if (b.airMult && e.flying) dmg *= b.airMult; // Stinger: rockets hit flyers much harder
      if (b.freeze && (!b.freezeMain || e.id === b.main)) {
        // Stasis: zombies with less max health stay frozen much longer (bosses much shorter).
        const secs = b.freezeHp ? b.freeze * Math.min(24, Math.max(0.25, Math.sqrt(b.freezeHp / e.maxHp))) : b.freeze;
        if (b.ice) this.iceFreeze(e, secs, b.ignoreIceResist ? { ...b.ice, ignoreIceResist: true } : b.ice); // Ice Shard explosion
        else this.stop(def, e, secs, 'ice');
      }
      if (b.slime) this.applySlime(e, b.slime);
      if (b.burn) this.ignite(e, t?.id ?? 0, b.burn, b.burnTime, b.burnSlow ?? 0);
      if (b.toxic) this.weaken(e, b.toxic);
      if (b.chill && t) this.applyChill(t, b.chill, e); // Snowballer / Jester Ice Bomb
      if (b.melt && e.armor) e.armor = Math.min(e.armor, (ENEMIES[e.type].armor ?? 0) * (1 - b.melt));
      if (b.poison && t) this.applyPoison(t, e, b.poison); // Jester Poison Bomb
      if (b.confuse) this.confuse(e, b.confuse.time, b.confuse.cd); // Jester Confusion Bomb
      if (dmg > 0) this.damage(t, e, dmg, b.pierceArmor, boomKind); // explosions are never bullets or lasers
      if (b.knock && this.enemies.has(e.id)) this.knockBack(e, b.knock); // Hallow Punk
    }
  }

  anyNear(x, z, r, det) {
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if ((e.x - x) ** 2 + (e.z - z) ** 2 <= r * r) return true;
    }
    return false;
  }

  shoot(t, e, dmg) {
    this.events.push({ k: 'shot', t: t.id, e: e.id });
    this.damage(t, e, dmg);
  }

  /**
   * Damages an enemy; `t` (may be null if the tower was sold) gets the credit. `kind`: 'bullet',
   * 'laser', 'golden' or 'none' for bullet / laser resistance; by default the tower's own kind
   * (damageKind), except for damage over time, explosions and unit crashes (`this.hitKind`).
   */
  /**
   * Cash for damage, the way Roblox tower defense games pay (Tower Battles, TDS): `dealt` health
   * damage to `e` pays every player `dealt` x the mode's rate, so a tougher wave pays for the
   * defense it takes. The extra health enemies get in multiplayer pays nothing extra (everyone
   * earns what the enemy is worth solo), and in a `pot` mode the cash is split between the players
   * instead. Shields pay nothing, summons flagged `noCash` and minions with `reward: 0` pay
   * nothing, and an enemy never pays for more than its max health (healing can't be farmed).
   * Wire Fraud and Gold Digging pay their bonus on top.
   */
  payDamage(t, e, dealt) {
    if (e.noCash || dealt <= 0) return;
    const def = ENEMIES[e.type];
    if (def.reward === 0 && !e.boss) return; // summoned minions (final bosses are `reward: 0` too, but they pay)
    const rate = this.dmgCash * (def.cash ?? 1) * (this.dmgShare || 1 / this.mpHpMult(def));
    let v = Math.min(dealt * rate, e.maxHp * rate - e.paid);
    if (v <= 0) return;
    e.paid += v;
    if (e.fraud) v *= 1 + e.fraud; // Hacker Wire Fraud
    if (t && this.towers.has(t.id)) v *= buffOf(this.buffs, t.id).killCash; // Gold Commander Gold Digging
    e.earned += v;
    this.cashAcc += v;
    const whole = Math.floor(this.cashAcc);
    if (!whole) return;
    this.cashAcc -= whole;
    for (const p of this.players.values()) p.cash += whole + this.cashBack(p, whole);
  }

  /**
   * Oil Derrick Cash Back: the extra `p` gets on top of `v` cash from damage (Versus: from a kill),
   * their Derrick's `dmgCash` share of it, in whole dollars (the rest carries over).
   */
  cashBack(p, v) {
    const share = this.cashBacks.get(p.id);
    if (!share) return 0;
    p.backAcc = (p.backAcc ?? 0) + v * share;
    const extra = Math.floor(p.backAcc);
    p.backAcc -= extra;
    return extra;
  }

  damage(t, e, dmg, pierceArmor = false, kind = undefined) {
    kind ??= this.hitKind ?? (this.dot || !t ? 'none' : damageKind(t.type, t.level));
    if (e.invulnT > 0) return; // Breakers: invincible for a moment as they pop out
    if (e.noTarget) return; // Hardcore: closed Drop Pods, a downed Void Reaver, the protected Void Caster
    if (e.consume && this.splashing) return; // Void Consumption: only direct hits work
    const ts0 = t ? TOWERS[t.type]?.levels[t.level] : null;
    const hm = this.hitMods; // a Mechanic turret's or an ability's own defPierce / shieldMult
    if (t && !this.dot && dmg > 0) dmg += buffOf(this.buffs, t.id).dmgAdd || 0; // Bugler Snare Drums, Slinger boosts
    const adapt = ENEMIES[e.type].adapt;
    if (adapt) this.adaptResist(e, kind, dmg, adapt); // Void Colossus: its resistance wears down
    if (kind === 'bullet' && e.bulletResist && !this.ignoresBulletResist(t)) dmg *= 1 - e.bulletResist; // Shielders, Drones...
    else if (kind === 'laser') {
      const lr = Math.max(e.laserResist, e.glitchT > 0 ? e.glitchRes : 0); // Rushers, UFOs; Glitches lend it out
      if (lr) dmg *= 1 - lr;
    } else if (kind === 'explosive' && e.explosiveResist) dmg *= 1 - e.explosiveResist; // Chained
    else if (kind === 'golden' && e.goldResist && !this.ignoresGoldResist(t)) dmg *= 1 - e.goldResist; // Warpers, the Beholder
    // Armor tops out at 90%, except Hard mode Corpses (100%: only defense piercing gets through).
    const cap = e.armor >= 1 ? 1 : 0.9;
    let armor = Math.min(cap, e.armor + (e.gear || 0) + (e.auraArmor || 0) + (e.blessed || 0) + (e.vShield > 0 ? this.voidArmor.armor : 0)); // Mechanics bolt extra armor on; VOID's aura; Jester Blessed; void armor
    // Defense piercing: ignores that share of the armor (negative: armor counts for more).
    const dp = this.dot ? 0 : hm?.defPierce ?? ts0?.defPierce ?? 0;
    if (dp && armor) armor = Math.min(cap, armor * (1 - Math.min(1, dp)));
    if (armor && !pierceArmor) dmg *= 1 - armor; // Molten Squires, Knights... (Tesla Smite ignores it)
    // Insane: flat Defense blocks part of every direct hit (defense piercing cuts it like armor).
    const block = e.carry?.defense ?? e.defense;
    if (block && !this.dot && !pierceArmor) dmg = Math.max(0, dmg - block * (1 - Math.min(1, dp)));
    if (e.vuln) dmg *= 1 + e.vuln; // softened up by a DJ Booth's Red Drop the Beat
    if (e.sacrificing && !this.bloodPass) {
      // Rebirther Blood Sacrifice: almost nothing gets through, except crashes from some units.
      const sac = ENEMIES[e.type].sacrifice;
      if (!(this.crashing && t && sac.rams.includes(rootType(t.type)))) dmg *= 1 - sac.resist;
    }
    if (this.slowVulns?.length && (e.stop > 0 || e.shockT > 0 || e.slime || e.chillT > 0 || e.harpoonSlow || e.beatSlow || e.thornSlow || (e.burn && e.burnSlow) || e.poison?.slow)) {
      // Golden Byte: stunned or slowed zombies in its range take more damage (the strongest one counts).
      let v = 0;
      for (const g of this.slowVulns) if (g.v > v && (e.x - g.x) ** 2 + (e.z - g.z) ** 2 <= g.r * g.r) v = g.v;
      dmg *= 1 + v;
    }
    if (e.injured && t && rootType(t.type) === 'knifer') dmg *= 1 + e.injured; // Flayer Injured
    if (e.iceVuln && e.stopKind === 'ice') dmg *= 1 + e.iceVuln; // Cryo Ranger Deep Freeze
    const fw = ENEMIES[e.type].frostWeak; // Fire types: frost towers' hits hurt them more
    if (fw && !this.dot && ts0 && (ts0.chill || ts0.freeze || ts0.chillDps)) dmg *= 1 + fw;
    if (e.iceResist && !this.dot && ts0 && (ts0.chill || ts0.freeze || ts0.chillDps) && !ts0.ignoreIceResist) dmg *= 1 - e.iceResist; // Medium: ice resistance
    if (t) {
      const ts = TOWERS[t.type].levels[t.level];
      let mult = buffOf(this.buffs, t.id).dmg; // Ubercharge, DJ Booth Red track
      if (ts.ghostMult && ENEMIES[e.type].model === 'ghost') mult *= ts.ghostMult; // Ghostbuster
      if (ts.team && !this.dot) {
        // Ghostbuster: +`team.boost` damage for every other Ghostbuster beaming the same zombie,
        // but once beams cross they hurt themselves.
        let n = 0;
        for (const o of this.towers.values()) if (o !== t && o.type === t.type && o.lock === e.id) n++;
        if (n) {
          mult *= 1 + ts.team.boost * n;
          this.hurtTower(t, ts.team.self);
        }
      }
      if (ts.bossMult && e.boss) mult *= ts.bossMult; // Titan special rounds
      const shm = hm?.shieldMult ?? ts.shieldMult; // Elite Plasma Bombardment, Plasmators, Immolation
      if (shm && ENEMIES[e.type].shield) mult *= shm;
      if (ts.iceBreak && (e.chillT > 0 || e.stopKind === 'ice')) mult *= ts.iceBreak; // Sledger Ice Breaker
      if (ts.coord && this.coordinated(t, ts.coord)) mult *= 1 + ts.coord.boost; // Operator Coordination
      if (t.weakT > 0) mult *= 1 - t.weakAmt; // Void mode acid / poison
      if (mult !== 1) dmg = Math.round(dmg * mult * 100) / 100;
      if (!this.dot) dmg = this.capHit(e, dmg); // Insane: max damage per hit
      if (e.pure && dmg > 0) dmg = 1; // Pure crystals: every hit does exactly 1
      const dealt = Math.min(dmg, e.hp);
      t.damageDealt += dealt;
      t.fanAcc += dealt;
      if (e.dmgBy) e.dmgBy.set(t.id, (e.dmgBy.get(t.id) ?? 0) + dealt); // VOID marks whoever hurts him most
      if (ts.flashbang && this.towers.has(t.id)) this.chargeFlashbang(t, ts.flashbang, e, dealt);
    }
    if (e.pure && dmg > 0) dmg = 1;
    if (!this.dot) dmg = this.capHit(e, dmg);
    if (e.cubeHp > 0 && e.stopKind === 'ice') {
      // Glacier: the ice cube takes the hit; the zombie thaws once it breaks.
      const used = Math.min(e.cubeHp, dmg);
      e.cubeHp -= used;
      dmg -= used;
      if (e.cubeHp <= 0) {
        e.stop = 0;
        this.events.push({ k: 'boom', x: r2(e.x), z: r2(e.z), r: 1.5, ice: 1 });
      }
      if (dmg <= 0) return;
    }
    if (t && dmg > 0 && !this.dot && this.liveShows) this.showCash(e, Math.min(dmg, e.hp)); // Glowup Live Show
    if (e.vShield > 0) {
      // Void armor: its shield takes the hit first; once it breaks, the armor, slow and tendrils go.
      const used = Math.min(e.vShield, dmg);
      e.vShield -= used;
      dmg -= used;
      if (e.vShield <= 0) {
        e.vShield = 0;
        this.events.push({ k: 'vArmorBreak', e: e.id, x: r2(e.x), z: r2(e.z), big: e.boss ? 1 : 0, type: e.type });
      }
      if (dmg <= 0) return;
    }
    if (e.osh > 0) {
      // Hardcore shields ("+ shield"): they take the hit first.
      const used = Math.min(e.osh, dmg);
      e.osh -= used;
      dmg -= used;
      if (e.osh <= 0) {
        e.osh = 0;
        const sb = ENEMIES[e.type].oshBreakSpeed;
        if (sb) e.baseSpeed *= sb; // Reforged Gargantuan: faster without its shield
        this.events.push({ k: 'oshBreak', e: e.id, x: r2(e.x), z: r2(e.z), big: e.boss ? 1 : 0 });
      }
      if (dmg <= 0) return;
    }
    if (this.dmgCash) this.payDamage(t, e, Math.min(dmg, e.hp));
    e.hp -= dmg;
    // The Beholder can't die before it has pulled everyone into the time dimension.
    if (e.hp <= 0 && !e.shifted && ENEMIES[e.type].shift) {
      e.hp = 1;
      e.shifted = true;
      this.shiftBoss = e;
    }
    // VOID can't die before he rises as a spirit.
    const rise = ENEMIES[e.type].rise;
    if (e.hp <= 0 && rise && !e.risen) {
      e.hp = 1;
      e.risen = true;
      this.riseBoss = e;
    }
    // Voidkin / Guardian: the void armor breaks once enough health is gone.
    const shell = ENEMIES[e.type].shell;
    if (shell && e.hp > 0 && e.hp <= e.maxHp * (1 - shell.at) && this.enemies.delete(e.id)) {
      this.events.push({ k: 'decay', e: e.id });
      this.events.push({ k: 'shellBreak', x: r2(e.x), z: r2(e.z), type: e.type });
      this.reborn.push({ route: e.route, type: shell.into, dist: e.dist, lateral: e.lateral, hpScale: 1, from: e.type, shell: 1, keep: { hp: e.hp, maxHp: e.maxHp } });
      return;
    }
    if (e.boneAt || e.drops != null) this.kingHurt(e); // Fallen King: Bone Armor, cash drops
    // Firework Technician: a boosted tower may launch a firework where it hit (fireworks never chain).
    if (t?.fwT > 0 && t.fw && dmg > 0 && !this.dot && this.towers.has(t.id)) this.firework(t, e);
    if (e.hp > 0) return;
    const pdef = ENEMIES[e.type];
    if ((pdef.pair || pdef.rageAt) && this.enemies.has(e.id) && this.pairDeath(e, pdef)) return; // Hardcore Void Reaver / Caster
    if (!this.enemies.delete(e.id)) return; // already dead (no double rewards or double cage monsters)
    if (t) t.kills++;
    const hunt = t && TOWERS[t.type]?.levels[t.level]?.hunt;
    if (hunt) t.bank = Math.min(hunt.cap, (t.bank || 0) + e.maxHp * hunt.rate); // Hunter bounties
    this.dropBattery(e); // Star Cannon
    const def = ENEMIES[e.type];
    // Wire Fraud: hacked zombies pay everyone extra (whole dollars; the rest carries over).
    let reward = e.noCash ? 0 : def.reward * GAME.earnMult;
    if (e.fraud && !e.noCash && !this.dmgCash) {
      this.fraudAcc += def.reward * GAME.earnMult * e.fraud;
      const extra = Math.floor(this.fraudAcc);
      this.fraudAcc -= extra;
      reward += extra;
    }
    if (e.hackEv) this.holos.push(e);
    if (this.dmgCash) reward = Math.round(e.earned); // already paid, hit by hit (see payDamage): this is only what the kill shows
    else {
      // Gold Commander Gold Digging: kills by towers in its aura pay more.
      if (t && this.towers.has(t.id) && buffOf(this.buffs, t.id).killCash > 1) reward = Math.round(reward * buffOf(this.buffs, t.id).killCash);
      for (const p of this.players.values()) p.cash += reward + this.cashBack(p, reward);
    }
    this.events.push({ k: 'kill', e: e.id, r: reward });
    if (e.bounty) {
      // Mobster Place Bounty: the player who placed it cashes in.
      const p = this.players.get(e.bounty.owner);
      if (p) p.cash += e.bounty.pay;
      this.events.push({ k: 'bountyPaid', x: r2(e.x), z: r2(e.z), v: e.bounty.pay, owner: e.bounty.owner });
    }
    // Cages release a random monster; the Slime King comes back for round two; Moltens leave corpses.
    const next = def.phase2 ?? def.corpse ?? (def.cage ? def.cage[Math.floor(Math.random() * def.cage.length)] : null);
    if (next) this.reborn.push({ route: e.route, type: next, dist: e.dist, lateral: e.lateral, hpScale: def.phase2 ? 1 : def.cageHp ?? 1, from: e.type, ...(def.phase2 && e.boss ? { boss: true } : {}), ...(def.phase2 ? { carry: e.carry } : {}) });
    // Multipliers copy the enemies around them; Berserkers burst into a crowd.
    if (def.multiply) {
      const m = def.multiply;
      const near = [...this.enemies.values()]
        .filter((o) => !o.remains && !o.boss && !o.copy && !ENEMIES[o.type].multiply && (o.x - e.x) ** 2 + (o.z - e.z) ** 2 <= m.radius * m.radius)
        .slice(0, m.max);
      // Medium Multipliers: `copies` of each, faster, worth no cash, and never copied again.
      for (const o of near) {
        for (let c = 0; c < (m.copies ?? 1); c++) {
          this.reborn.push({ type: o.type, dist: Math.max(0, o.dist - 1 - c), lateral: o.lateral, hpScale: 1, from: e.type,
            ...(m.copies ? { copy: true, noCash: !!m.noCash, speedMult: m.speed ?? 1 } : {}) });
        }
      }
      if (near.length) this.events.push({ k: 'burst', e: e.id, n: near.length, kind: 'multiply' });
    }
    // Devotees heal the enemies around them as they die.
    if (def.deathHeal) {
      const h = def.deathHeal;
      for (const o of this.enemies.values()) {
        if (o.remains || o.hp >= o.maxHp || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > h.radius * h.radius) continue;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * h.heal);
      }
      this.events.push({ k: 'dHeal', x: r2(e.x), z: r2(e.z), r: h.radius });
    }
    // Revivers raise the enemies that fall near them as Devotees.
    if (!next && !e.boss && !e.remains && !def.deathHeal) {
      for (const o of this.enemies.values()) {
        const rv = ENEMIES[o.type].revive;
        if (!rv || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > rv.radius * rv.radius) continue;
        this.reborn.push({ route: e.route, type: 'devotee', dist: e.dist, lateral: e.lateral, hpScale: 1, from: e.type, revived: 1 });
        break;
      }
    }
    if (def.blast) {
      // Radiator: blows up, hurting the towers around it.
      if (def.blast.dmg) this.hurtTowers(e.x, e.z, def.blast.radius, def.blast.dmg, true);
      if (def.blast.stun) this.hexTowers(e.x, e.z, def.blast.radius, 'stun', def.blast.stun, true); // Medium Shocker
      if (def.blast.units) this.hurtUnitsNear(e.x, e.z, def.blast.radius, def.blast.units); // Void Toxic gas
      if (def.blast.weak) {
        // Hardcore Unknowns: towers nearby deal less damage for a while.
        for (const t of this.towers.values()) {
          if ((t.x - e.x) ** 2 + (t.z - e.z) ** 2 > def.blast.radius ** 2 || this.stealthy(t)) continue;
          if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
          this.weakTower(t, def.blast.weak.amt, def.blast.weak.time);
        }
      }
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: def.blast.radius, ...(def.blast.color ? { c: def.blast.color } : {}) });
    }
    if (def.acid) {
      // Acid Void: a puddle of acid that hurts towers and weakens their damage.
      const a = def.acid;
      this.puddles.push({ x: e.x, z: e.z, r: a.radius, dps: a.dps, left: a.life, weak: a.weak });
      this.events.push({ k: 'acid', x: r2(e.x), z: r2(e.z), r: a.radius, life: a.life });
    }
    if (def.finale) this.voidDown(e); // VOID is finally defeated
    if (def.endShift) this.endTimeShift(); // Hardcore: the Beholder beaten in its Field: back to the real map
    if (def.deathZone) {
      // Hardcore Speedy King / Nuclear Tank: a circle on the path that makes enemies in it faster.
      const z = def.deathZone;
      this.zones.push({ kind: 'trail', x: e.x, z: e.z, r: z.radius, left: z.life, speed: z.speed, by: e.id });
      this.events.push({ k: 'trail', x: r2(e.x), z: r2(e.z), r: z.radius, life: z.life, c: z.color });
    }
    if (def.necroBurst) this.necroBurst(e, def.necroBurst);
    if (def.deathHaste) {
      // Overcharged: the enemies around it get a big burst of speed.
      const h = def.deathHaste;
      for (const o of this.enemies.values()) {
        if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > h.radius * h.radius) continue;
        o.empT = Math.max(o.empT || 0, h.time);
        o.empHaste = Math.max(o.empHaste || 0, h.speed);
      }
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: h.radius, c: 0xff4fa3 });
    }
    if (def.deathSpawn?.fixed) {
      // Hardcore: a set list ([type, n, mods?]), e.g. Mandrake: 1 Hefty, 2 Odds and 2 Swifts.
      let j = 0;
      for (const [type, n, mods] of def.deathSpawn.fixed) for (let i = 0; i < n; i++, j++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - j * 1.1), lateral: e.lateral, hpScale: 1, from: e.type, ...(mods ? { mods } : {}) });
      this.events.push({ k: 'burst', e: e.id, n: j, kind: 'berserk' });
    } else if (def.deathSpawn) {
      const d = def.deathSpawn;
      const cnt = Array.isArray(d.n) ? d.n[0] + Math.floor(Math.random() * (d.n[1] - d.n[0] + 1)) : d.n; // Void Slime: 3-4 Goos
      for (let i = 0; i < cnt; i++) {
        const type = d.list[Math.floor(Math.random() * d.list.length)];
        this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - i * 1.2), lateral: e.lateral, hpScale: 1, from: e.type });
      }
      this.events.push({ k: 'burst', e: e.id, n: cnt, kind: 'berserk' });
    }
  }

  /** Insane: no single hit does more than an enemy's maxHit (or its Taunt cap, or what a move lowered it to). */
  capHit(e, dmg) {
    const cap = e.tauntT > 0 ? ENEMIES[e.type].taunt.maxHit : e.carry?.maxHit ?? e.maxHit;
    return cap && dmg > cap ? cap : dmg;
  }

  /** Does tower `t` get through golden resistance right now (its level, or the first seconds of Golden Mobster Overload)? */
  ignoresGoldResist(t) {
    if (!t) return false;
    const def = TOWERS[t.type];
    const s = def.levels[t.level];
    if (s.ignoreGoldResist || def.ignoreGoldResist) return true;
    const ab = t.active > 0 ? s.abilities?.find((a) => a.self && a.ignoreGoldResist) : null;
    return !!ab && (ab.ignoreGoldResist === true || ab.duration - t.active < ab.ignoreGoldResist);
  }

  /** Do tower `t`'s explosions get through explosive resistance (its level, or the tower itself)? */
  ignoresExplosiveResist(t) {
    if (!t) return false;
    const def = TOWERS[t.type];
    return !!(def.levels[t.level].ignoreExplosiveResist || def.ignoreExplosiveResist);
  }

  /** Do tower `t`'s bullets get through bullet resistance right now (its level, or AP Rounds)? */
  ignoresBulletResist(t) {
    if (!t) return false;
    const s = TOWERS[t.type].levels[t.level];
    return !!(s.ignoreBulletResist || (t.active > 0 && s.abilities?.some((a) => a.self && a.ignoreBulletResist)));
  }

  /** Operator Coordination: is another of this owner's Operators within `c.radius`? */
  coordinated(t, c) {
    const fam = rootType(t.type);
    for (const o of this.towers.values()) {
      if (o === t || o.owner !== t.owner || rootType(o.type) !== fam || o.holo) continue;
      if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= c.radius * c.radius) return true;
    }
    return false;
  }

  /** Breacher Flashbang: charges with damage dealt; when full, stuns zombies around `e` (not bosses). */
  chargeFlashbang(t, fb, e, dealt) {
    t.flashAcc = (t.flashAcc || 0) + dealt;
    if (t.flashAcc < fb.charge) return;
    t.flashAcc = 0;
    const def = TOWERS[t.type];
    for (const o of [...this.enemies.values()]) {
      if (o.boss || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > fb.radius * fb.radius) continue;
      this.stop(def, o, fb.stun, 'stun');
    }
    this.events.push({ k: 'boom', x: r2(e.x), z: r2(e.z), r: fb.radius, flash: 1 });
  }

  /** Titan Fortify Zone: how much shorter stuns on tower `t` are (the best zone it is in). */
  fortifyOf(t) {
    let best = 0;
    for (const o of this.towers.values()) {
      const f = TOWERS[o.type].levels[o.level].fortify;
      if (f && (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= f.radius * f.radius) best = Math.max(best, f.reduce);
    }
    return best;
  }

  /** Best enemy for `t` within `range` of (ox, oz), by the tower's target mode. */
  findTarget(t, s, ox, oz, range, skip = null) {
    const r2max = range * range;
    const det = this.detects(t, s);
    const shared = s.shared ? this.rangeCircles(t.type) : null;
    const inShared = (e) => shared.some((c) => (e.x - c.x) ** 2 + (e.z - c.z) ** 2 <= c.r2);
    let best = null;
    let bestScore = -Infinity;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if (skip?.(e)) continue;
      const dx = e.x - ox;
      const dz = e.z - oz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2max && !(shared && inShared(e))) continue;
      const score = this.score(t.targetMode, e, d2, t);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best ? this.blocker(best, ox, oz, det) : best;
  }

  /** Void Petrified: a statue standing between the shooter and its target takes the shot instead. */
  blocker(e, ox, oz, det) {
    if (!this.blockers) return e;
    const tx = e.x - ox;
    const tz = e.z - oz;
    const len2 = tx * tx + tz * tz;
    if (len2 < 1e-6) return e;
    let hit = e;
    let hitT = 1;
    for (const o of this.enemies.values()) {
      if (o === e || !ENEMIES[o.type].blockShots || !canHit(det, o)) continue;
      const u = ((o.x - ox) * tx + (o.z - oz) * tz) / len2; // how far along the shot line, 0..1
      if (u <= 0 || u >= hitT) continue;
      const px = ox + tx * u - o.x;
      const pz = oz + tz * u - o.z;
      const r = ENEMIES[o.type].blockShots;
      if (px * px + pz * pz <= r * r) { hit = o; hitT = u; }
    }
    return hit;
  }

  /** Target-mode score: higher is a better target. `d2` is squared distance to the shooter. */
  score(mode, e, d2, t = null) {
    let focus = e.neuroT > 0 ? 1e12 : 0; // Saboteur Neuralyze: every tower targets it first
    if (t?.forceE === e.id) focus += 1e14; // Bugler Unit Commander: its towers attack this one first
    // King: towers near him have to attack him.
    if (e.aggro && t && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= e.aggro * e.aggro) focus += 1e13;
    switch (mode) {
      case 0: return focus + e.dist; // First
      case 1: return focus - e.dist; // Last
      case 2: return focus + e.hp * 10000 + e.dist; // Strongest
      default: return focus - d2; // Closest
    }
  }

  /** Up to `n` best enemies in range, by target mode (Plasma Trooper). */
  findTargets(t, s, n, ok = null, det = this.detects(t, s)) {
    const r2max = s.range * s.range;
    const list = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if (ok && !ok(e)) continue;
      const d2 = (e.x - t.x) ** 2 + (e.z - t.z) ** 2;
      if (d2 <= r2max) list.push({ e, sc: this.score(t.targetMode, e, d2, t) });
    }
    list.sort((a, b) => b.sc - a.sc);
    return list.slice(0, n).map((x) => x.e);
  }

  /** A new tower at level 0 (`spent`: what it cost, for selling). */
  newTower(pid, type, x, z, camYaw, spent) {
    const def = TOWERS[type];
    // The Gatling Gun's cone points away from the camera, the way the player is looking.
    const yaw = (Number(camYaw) || 0) + (facesCone(def) ? Math.PI : 0);
    const t = {
      id: this.nextId++, owner: pid, type, level: 0, x, z,
      yaw, targetMode: def.melee ? 3 : 0, // melee towers start on Closest
      cooldown: 0, gap: 0, burstLeft: 0, kills: 0, damageDealt: 0, spent,
      ang: 0, bombT: 0, missileT: 0, // Aviator
      lock: 0, charge: 0, beamT: 0, wait: 0, // Phaser
      out: 0, // Boomerang: boomerangs still in the air
      swings: 0, fanAcc: 0, // Assassin: slashes so far, damage toward the next Fan of Knives
      spawnT: 0, // spawners: seconds until the next unit
      cd: {}, active: 0, // ability cooldowns (key -> seconds) and Call to Arms time left
      fury: 0, // Classic Commander: seconds left fighting after an ability
      riotT: 0, // Warden riot shield: seconds of double damage and stun immunity left
      smoke: 0, stunT: 0, // Versus debuffs: seconds left smoked / stunned
      androidT: def.levels[0].android?.every ?? 0, // Anarchist: seconds until the next Android
      aimT: 0, // Hunter: seconds spent aiming at the current target
      revT: 0, // Minigunner: seconds of spin-up so far
      radioT: 0, // Ranger: seconds left of its Intelligence Radio range boost
      dir: 1, // Ace Pilot: 1 or -1, which way the plane circles
      shieldT: 0, // Medic shield: seconds until it's back after blocking a stun
      off: [], // Trapper traps / Mercenary Base units switched off in the tower panel (pickOptions keys)
      trapN: 0, spots: [], spotsR: 0, // Trapper: traps thrown so far, path spots in range (Necromancer too)
      meter: 0, buildT: 0, // Necromancer souls / Engineer scrap, seconds left raising a gravestone or building a sentry
      phase: 0, dealt: 0, // Accelerator: 0 charging, 1 firing (damage dealt so far), 2 cooling down
      cashN: 0, spinT: 0, // Cowboy: shots toward the next cash shot, seconds left twirling
      track: 0, pulses: 0, pulseT: 0, // DJ Booth: track playing (TRACKS index), Red beat pulses left
      ammo: def.levels[0].ammo ?? 0, reloadT: 0, // Pursuit / Gatling Gun: bullets left, seconds of reloading left
      hx: x, hz: z, hyaw: 0, cx: x, cz: z, // Pursuit: where the helicopter is, middle of its patrol zone
      face: yaw, manual: false, fire: false, aimYaw: yaw, aimPitch: 0, aimH: 4, aimAge: 0, // Gatling Gun: cone direction, FPS Mode
      holo: 0, holoMax: 0, // Hacker clone: seconds left, lifetime
      rebuilt: 0, repairT: 0, // XWM Turret: rebuilds used, seconds left rebuilding
      rocketT: 0, // Sentry Minigun: seconds until the next rocket
      chopT: 0, // John Slayer: seconds until the next axe attack
      parryT: 0, // Gladiator: seconds left recovering from a parry (it doesn't attack meanwhile)
      aspectT: 0, // Gladiator Fire Aspect: seconds until its next swing sets zombies on fire
      shockT: 0, // Sledger Aftershock: seconds until the shockwave after its last swing
      crates: [], // Airdrop Farm: crates still falling this wave ({ t: seconds until it lands, v: cash })
      choice: [], // Jester bombs / Biologist plants / Elementalist element, by slot (see choicesOf)
      fwT: 0, fw: null, // Firework Technician: seconds of boost left, its firework
      starT: 0, // Star Cannon: seconds left rebooting
      lx: x, lz: z, // Spotlight Tech: where the light is
      costRoll: Math.random(), // Chaos Jester: where in its price range the next upgrade lands
    };
    t.hp = t.maxHp = towerMaxHp(type, 0); // tower health (see GAME.towerHp)
    this.towers.set(t.id, t);
    return t;
  }

  // ---------------------------------------------------------------- player actions

  /** Applies an action from a player. Returns an error message, or null on success. */
  action(pid, m) {
    const p = this.players.get(pid);
    if (!p || this.over || !m) return null;
    switch (m.a) {
      case 'place': {
        const def = TOWERS[m.type];
        if (!def) return 'Unknown tower';
        if (p.loadout && !p.loadout.includes(m.type)) return `${def.name} isn't in your loadout`;
        const cost = towerCost(def, !!this.vs);
        if (p.cash < cost) return `Not enough cash! ${def.name} costs $${cost}`;
        let owned = 0;
        for (const t of this.towers.values()) if (t.owner === pid && !t.holo && rootType(t.type) === m.type) owned++;
        const limit = towerLimit(def, this.vs ? 1 : this.players.size) + (p.extraSlots || 0); // Discount Dog Extra Slot
        if (owned >= limit) return `Placement limit reached (${limit})`;
        const x = Number(m.x);
        const z = Number(m.z);
        if (!canPlace(x, z, this.towers.values(), def.placement)) {
          return placeFail(def);
        }
        p.cash -= cost;
        const t = this.newTower(pid, m.type, x, z, m.yaw, cost);
        this.events.push({ k: 'place', id: t.id, owner: pid, x, z });
        return null;
      }
      case 'upgrade': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        if (t.holo) return "Holograms can't be upgraded";
        if (t.bleedT > 0) return "Bleeding! It can't be upgraded until it stops";
        if (t.corrupt) return 'Corrupted by VOID! It can only be sold now';
        // Upgrade paths: picking the bottom path turns the tower into its branch type; crosspath
        // towers turn into the type of their new Top / Bottom combo.
        const up = nextUpgrade(t, m.path === 'bottom' ? 'bottom' : 'top', this.towers.values(), computeBuffs(this.towers.values()));
        if (!up) return TOWERS[t.type].cross ? (TOWERS[t.type].cross.a + TOWERS[t.type].cross.b > 0 ? "That path can't go any higher" : 'Already max level!') : 'Already max level!';
        const def = TOWERS[up.type];
        const next = up.next;
        if (next.evo && p.evo && (p.evo[rootType(t.type)] ?? 0) < next.evo) return `Needs evolution level ${next.evo}`;
        if (next.perk && p.evo && !p.evo[`perk:${next.perk}`]) return `Locked: ${PERKS[next.perk] ?? 'win a mode'} to unlock this upgrade`;
        const cost = up.cost;
        if (p.cash < cost) return `Need $${cost} to upgrade`;
        p.cash -= cost;
        t.type = up.type;
        t.level++;
        this.setTowerLevelHp(t);
        t.spent += cost;
        t.costRoll = Math.random(); // Chaos Jester: a new random price for the next upgrade
        if (next.ammo) {
          t.ammo = next.ammo; // a fresh, bigger magazine
          t.reloadT = 0;
        }
        if (next.spawnNow) {
          // The upgraded unit rolls out right away and replaces the old ones.
          this.removeUnitsOf(t.id);
          this.spawnUnits(t, next.unit);
          t.spawnT = next.spawnEvery ?? def.spawnEvery;
        }
        this.events.push({ k: 'upgrade', id: t.id, owner: pid, name: next.name, x: t.x, z: t.z });
        return null;
      }
      case 'sell': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const value = Math.floor(t.spent * (TOWERS[t.type].sellRatio ?? GAME.sellRatio) * (1 + buffOf(this.buffs, t.id).sell) * (t.corrupt ? 1 + GAME.corruptSell : 1)); // EDJ sellback; VOID's corrupted towers sell for more
        p.cash += value;
        this.removeTower(t, 'sell', { value });
        this.sellSacrifice(t);
        return null;
      }
      case 'defuse': {
        // Beholder time bomb: anyone can click it to defuse it.
        const i = this.bombs.findIndex((b) => b.id === m.id);
        if (i < 0) return null;
        const [b] = this.bombs.splice(i, 1);
        this.events.push({ k: 'defused', id: b.id, x: r2(b.x), z: r2(b.z), by: pid });
        return null;
      }
      case 'pop': {
        // VOID's magic missile: a player touched it.
        const i = this.orbs.findIndex((o) => o.id === m.id);
        if (i < 0) return null;
        const [o] = this.orbs.splice(i, 1);
        this.events.push({ k: 'orbPop', id: o.id, x: r2(o.x), z: r2(o.z), by: pid });
        return null;
      }
      case 'target': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        t.targetMode = (t.targetMode + 1) % TARGET_MODES.length;
        return null;
      }
      case 'pick': {
        // Trapper traps / Mercenary Base units: switch one on or off.
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const s = TOWERS[t.type].levels[t.level];
        const opts = pickOptions(s);
        const key = String(m.key);
        if (!opts?.some((o) => o.key === key)) return "That tower can't do that";
        const off = new Set(t.off);
        if (off.has(key)) off.delete(key);
        else if (opts.filter((o) => !off.has(o.key)).length <= 1) return 'At least one has to stay on';
        else off.add(key);
        t.off = [...off];
        // Queues training a unit that was just switched off move on to the next one, keeping their progress.
        for (const q of t.queues ?? []) {
          if (!off.has(String(q.r))) continue;
          const left = q.left;
          this.nextInQueue(t, s, q);
          q.left = Math.min(left, q.left);
        }
        return null;
      }
      case 'choose': {
        // Jester bombs / Biologist plant queues: pick what one slot uses.
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const def = TOWERS[t.type];
        const s = def.levels[t.level];
        const c = choiceOptions(def, s);
        const slot = Number(m.slot) | 0;
        const key = String(m.key);
        if (!c?.free || slot < 0 || slot >= c.slots || !c.options.some((o) => o.key === key)) return "That tower can't do that";
        const now = choicesOf(def, s, t.choice);
        const other = now.indexOf(key);
        if (c.distinct && other >= 0 && other !== slot) now[other] = now[slot]; // swap so two slots never match
        now[slot] = key;
        t.choice = now;
        return null;
      }
      case 'ability': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const s = TOWERS[t.type].levels[t.level];
        const ab = s.abilities?.find((a) => a.key === m.key);
        if (!ab) return "That tower can't do that";
        if (t.silenceT > 0) return 'Poisoned! Its abilities are locked until the poison fades';
        if (t.bleedT > 0) return 'Bleeding! It can\'t use abilities until it stops';
        if (t.curseBy && this.enemies.has(t.curseBy)) return 'Cursed! It can\'t do anything until the enemy that cursed it is gone';
        if (t.corrupt) return 'Corrupted by VOID! It only works for him now. Sell it!';
        if (t.cd[ab.key] > 0) return `${ab.name} is recharging (${Math.ceil(t.cd[ab.key])}s)`;
        const price = abilityCost(t, ab); // rising prices / limited uses (Magic Boost, Volt Points...)
        if (price == null) return `${ab.name} is all used up`;
        if (price && p.cash < price) return `Need $${price.toLocaleString()} for ${ab.name}`;
        if (ab.versus) {
          const why = this.vs ? this.vs.canAttack(this.lane) : `${ab.name} only works in Versus`;
          if (why) return why;
        }
        if (ab.aim && !(Number.isFinite(Number(m.x)) && Number.isFinite(Number(m.z)))) return 'Pick a spot first';
        if (ab.key === 'reposition' || ab.key === 'teleport' || ab.key === 'jump') {
          const x = Number(m.x);
          const z = Number(m.z);
          if (Math.hypot(x - t.x, z - t.z) > ab.reach) return `Too far! ${ab.name} reaches ${ab.reach} studs`;
          const others = [...this.towers.values()].filter((o) => o !== t);
          if (!canPlace(x, z, others, TOWERS[t.type].placement)) return "It can't land there";
        }
        if (ab.mode && choicesOf(TOWERS[t.type], s, t.choice)[0] !== ab.mode) return `${ab.name} only works in ${ab.mode === 'fire' ? 'Fire' : 'Frost'} mode`;
        if ((ab.key === 'thorns' || ab.key === 'iceTurret' || ab.key === 'iceShard' || ab.key === 'targetSelect' || ab.key === 'voltPoint') && Math.hypot(Number(m.x) - t.x, Number(m.z) - t.z) > (ab.reach ?? s.range)) return `Too far! ${ab.name} reaches ${ab.reach ?? s.range} studs`;
        if (ab.key === 'concussive' && Math.hypot(Number(m.x) - t.x, Number(m.z) - t.z) > ab.reach) return `Too far! ${ab.name} reach ${ab.reach} studs`;
        if (ab.key === 'crossbow' && Math.hypot(Number(m.x) - t.x, Number(m.z) - t.z) > ab.reach) return `Too far! ${ab.name} reaches ${ab.reach} studs`;
        if (ab.key === 'chargedThrow' && ![...this.enemies.values()].some((e) => canHit({ hidden: !!s.hidden, flying: true, lead: true }, e))) return 'No zombie to throw at';
        if (ab.key === 'raise' && !this.buildsOf(t.id, 'grave').length) return 'No gravestones to raise yet';
        if (ab.key === 'bounty' && !this.bountyTarget(t, s)) return 'No zombie in range to put a bounty on';
        if (ab.key === 'kritz' && !this.chargeTarget(t, s, ab)) return 'No tower in range to Kritz';
        if (ab.key === 'clone') {
          const why = this.cloneTower(p, ab, m);
          if (why) return why;
        }
        if (ab.key === 'crucifix' && !this.crucifixTarget(t, s)) return 'No zombie in range';
        if (ab.souls && (t.soulN || 0) < ab.souls) return `${ab.name} needs ${ab.souls} souls`;
        if (ab.key === 'soulBeam' && t.choice?.[0] !== 'beam' && !(t.soulN > 0)) return 'No souls to fire the beam with yet';
        if (ab.key === 'meteor' && !this.findTarget(t, s, t.x, t.z, s.range * buffOf(this.buffs, t.id).range)) return 'No zombie in range';
        if (price) p.cash -= price;
        if (ab.costs || ab.costStep || ab.maxUses) (t.uses ??= {})[ab.key] = (t.uses[ab.key] || 0) + 1;
        t.cd[ab.key] = ab.cooldown * (1 - buffOf(this.buffs, t.id).cdCut); // EDJ DJ Rave: shorter cooldowns
        this.useAbility(t, s, ab, m);
        this.events.push({ k: 'ability', id: t.id, owner: pid, name: ab.name, x: t.x, z: t.z });
        return null;
      }
      case 'aim': {
        // Gatling Gun FPS Mode: where the owner is aiming and whether they're holding fire.
        const t = this.towers.get(m.id);
        if (!t || t.owner !== pid || !TOWERS[t.type].fps || !t.manual) return null;
        const yaw = Number(m.yaw);
        if (Number.isFinite(yaw)) t.aimYaw = yaw;
        const pitch = Number(m.pitch);
        if (Number.isFinite(pitch)) t.aimPitch = Math.max(-0.8, Math.min(0.8, pitch));
        const h = Number(m.h);
        if (Number.isFinite(h)) t.aimH = Math.max(0, Math.min(12, h));
        t.fire = !!m.fire;
        t.aimAge = 0;
        const fx = Number(m.x);
        const fz = Number(m.z);
        if (TOWERS[t.type].heli && Number.isFinite(fx) && Number.isFinite(fz)) {
          // Combat Drone Direct Control: where the owner has flown it, kept on its own map.
          const oz = laneOz(laneOf(t.z));
          t.flyX = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, fx));
          t.flyZ = Math.max(BOUNDS.minZ + oz, Math.min(BOUNDS.maxZ + oz, fz));
        }
        return null;
      }
      case 'laser': {
        // Gold Commander Orbital Airstrike: the owner's client sends where its cursor points.
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string' || !t.orb) return null;
        const x = Number(m.x);
        const z = Number(m.z);
        if (Number.isFinite(x) && Number.isFinite(z)) {
          t.orb.tx = x;
          t.orb.tz = z;
        }
        return null;
      }
      case 'follow': {
        // Cryo Helicopter Follow Player: the owner's client sends where they are.
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string' || !TOWERS[t.type].levels[t.level].abilities?.some((a) => a.key === 'follow')) return null;
        const x = Number(m.x);
        const z = Number(m.z);
        if (Number.isFinite(x) && Number.isFinite(z)) {
          t.cx = x;
          t.cz = z;
        }
        return null;
      }
      case 'skip': {
        if (this.wave.state !== 'intermission' && !this.canSkipWave) return null;
        this.skipVotes.add(pid);
        this.wave.votes = this.skipVotes.size;
        this.checkSkip();
        return null;
      }
      case 'konami': // cheat code: infinite cash for the rest of this game
        p.cash = Infinity;
        this.events.push({ k: 'konami', owner: pid });
        return null;
      case 'speed':
        if (SPEEDS.includes(m.v)) this.speed = m.v;
        return null;
      default:
        return null;
    }
  }

  get votesNeeded() {
    return Math.max(1, Math.ceil(this.players.size / 2));
  }

  checkSkip() {
    if (!this.skipVotes.size || this.skipVotes.size < this.votesNeeded) return;
    if (this.wave.state === 'intermission') this.startWave();
    else if (this.canSkipWave) this.skipWave();
  }

  ownedTower(pid, id) {
    const t = this.towers.get(id);
    if (!t) return 'That tower is gone';
    if (t.owner !== pid) return "That's not your tower!";
    return t;
  }

  // ---------------------------------------------------------------- networking

  // ---------------------------------------------------------------- wave 9 hero towers

  /** Lemonade Cat: `lemon.pay` cash per second for every zombie in its range (up to `lemon.cap`), paid every 2s. */
  // ---------------------------------------------------------------- wave 10 towers

  /** Regen, heals over time, second-life cooldown, passive souls and Doctor healing pay (every tick, even when stunned). */
  towerUpkeep(t, def, lv, dt) {
    if (t.hotT > 0) {
      const h = Math.min(dt, t.hotT); // Spiritual Advocate Self Heal / Heal
      t.hotT -= h;
      this.healTower(t, t.hotRate * h);
    }
    if (lv.regen) {
      // Doctor: heals itself after a while without taking damage.
      t.calmT = (t.calmT || 0) + dt;
      if (t.calmT >= lv.regen.delay && t.hp > 0) this.healTower(t, t.maxHp * lv.regen.rate * dt);
    }
    if (t.lifeCd > 0) t.lifeCd = Math.max(0, t.lifeCd - dt);
    if (lv.soul?.regen && this.wave.state === 'wave') this.setSouls(t, lv, (t.soulN || 0) + lv.soul.regen * dt);
    if (lv.healCash) {
      // Doctor: pays out what it earned healing, at most `cap` a second.
      t.payT = (t.payT ?? 1) - dt;
      if (t.payT <= 0) {
        t.payT = 1;
        const v = Math.min(lv.healCash.cap, Math.floor(t.healBank || 0));
        t.healBank = 0;
        const p = this.players.get(t.owner);
        if (p && v > 0) {
          p.cash += v;
          this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
        }
      }
    }
  }

  /** Doctor: healing `amount` health earns it cash (paid out once a second, see towerUpkeep). */
  healPay(m, s, amount) {
    if (s.healCash && amount > 0) m.healBank = (m.healBank || 0) + amount * s.healCash.rate;
  }

  /** Scarecrow: every `scare.every` s, zombies in range it can scare walk backwards for a moment. */
  updateScare(t, def, s, b, dt) {
    const sc = s.scare;
    t.scareT = (t.scareT ?? 0) - dt;
    if (t.scareT > 0) return;
    const r = s.range * b.range;
    const det = this.detects(t, s);
    let any = false;
    for (const e of [...this.enemies.values()]) {
      if (e.remains || e.statusImmune || e.confCd > 0 || !canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r * r) continue;
      if ((sc.maxHp != null && e.maxHp > sc.maxHp) || (e.boss && !sc.bosses)) continue;
      e.confT = sc.time * (e.boss ? sc.bosses : 1);
      e.confCd = e.confT + sc.cd;
      any = true;
      if (sc.damage) this.damage(t, e, sc.damage);
    }
    t.scareT = any ? sc.every : 0.25;
    if (any) this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '👻 Boo!', color: '#ffab40' });
  }

  /** Scarecrow Flock of Crows: flies in a straight line toward the first zombie in range, hitting everything it passes. */
  crowFlock(t, s, ab) {
    const target = this.findTarget(t, s, t.x, t.z, s.range * buffOf(this.buffs, t.id).range);
    const aim = target ? Math.atan2(target.x - t.x, target.z - t.z) : t.yaw;
    t.yaw = aim;
    const tx = t.x + Math.sin(aim) * ab.length;
    const tz = t.z + Math.cos(aim) * ab.length;
    const time = ab.length / ab.speed;
    this.blades.push({ tower: t.id, loop: false, ox: t.x, oz: t.z, tx, tz, t: 0, time, left: Infinity, hits: new Set(), damage: ab.damage, det: SEE_ALL });
    this.events.push({ k: 'knife', t: t.id, x: r2(tx), z: r2(tz), d: r2(time) });
  }

  /** Void Traitor Strike: stands still, then a line of blasts in front of it (harder the farther out). */
  strike(t, s, ab) {
    const target = this.findTarget(t, s, t.x, t.z, ab.gap * (ab.damages.length + 1));
    const aim = target ? Math.atan2(target.x - t.x, target.z - t.z) : t.yaw;
    t.yaw = aim;
    t.parryT = ab.windup;
    const det = this.detects(t, s);
    ab.damages.forEach((damage, i) => {
      const d = ab.gap * (i + 1);
      this.shells.push({ tower: t.id, x: t.x + Math.sin(aim) * d, z: t.z + Math.cos(aim) * d, time: ab.windup + i * 0.12, damage, radius: ab.radius, det });
    });
  }

  /** Ice Apprentice Ice Meteor: crashes down on a zombie in range after `delay` s, freezing the area. */
  iceMeteor(t, s, ab) {
    const e = this.findTarget(t, s, t.x, t.z, s.range * buffOf(this.buffs, t.id).range);
    if (!e) return;
    this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time: ab.delay, damage: ab.damage, radius: ab.radius, freeze: ab.freeze, det: this.detects(t, s), ignoreExplosiveResist: true });
    this.events.push({ k: 'missile', t: t.id, e: e.id, i: 0, d: ab.delay });
  }

  /** Ice Apprentice Blizzard: hits and freezes every zombie around it every `tick` s. */
  updateBlizzard(t, s, dt) {
    const ab = s.abilities.find((a) => a.key === 'blizzard');
    t.blizT = (t.blizT ?? 0) - dt;
    if (t.blizT > 0) return;
    t.blizT = ab.tick;
    this.explode(t, t.x, t.z, { damage: ab.damage, radius: ab.radius, freeze: ab.freeze, det: this.detects(t, s), ignoreExplosiveResist: true });
  }

  /** Spiritual Advocate: souls held (0..max). t.charge shows the meter in the panel. */
  setSouls(t, s, n) {
    if (!s.soul) return;
    t.soulN = Math.max(0, Math.min(s.soul.max, n));
    t.charge = t.soulN / s.soul.max;
  }

  /** Spiritual Advocate: `gain` souls for every `per` damage its projectiles deal. */
  soulGain(t, dmg) {
    const s = TOWERS[t.type].levels[t.level];
    if (!s.soul) return;
    t.soulAcc = (t.soulAcc || 0) + dmg;
    while (t.soulAcc >= s.soul.per) {
      t.soulAcc -= s.soul.per;
      this.setSouls(t, s, (t.soulN || 0) + s.soul.gain);
    }
  }

  /** Spiritual Advocate Beam mode: a laser at one zombie while souls last, then back to Auto. */
  updateSoulBeam(t, s, dt) {
    const ab = s.abilities.find((a) => a.key === 'soulBeam');
    if (!(t.soulN > 0)) {
      t.choice = [];
      return;
    }
    const target = this.findTarget(t, s, t.x, t.z, s.toss?.range ?? s.range);
    if (!target) {
      t.sbT = 0;
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    this.setSouls(t, s, t.soulN - ab.drain * dt);
    t.sbT = (t.sbT ?? 0) - dt;
    if (t.sbT > 0) return;
    t.sbT = ab.tick;
    this.events.push({ k: 'shot', t: t.id, e: target.id });
    this.damage(t, target, ab.damage);
  }

  /** Hunter Collateral: the shot bounces to the closest few zombies near where it hit (normal damage). */
  collateralBounce(t, s, c) {
    const det = this.detects(t, s);
    const r2max = s.collateral.jump * s.collateral.jump;
    const d2 = (e) => (e.x - c.x) ** 2 + (e.z - c.z) ** 2;
    const list = [...this.enemies.values()].filter((e) => e.id !== c.main && canHit(det, e) && d2(e) <= r2max).sort((a, b) => d2(a) - d2(b)).slice(0, s.collateral.jumps);
    for (const e of list) {
      this.events.push({ k: 'shot', t: t.id, e: e.id });
      this.damage(t, e, s.damage);
    }
  }

  /** Slugger baseball: stuns the zombie it hits (bosses are only slowed); a flashbang stuns everything near it. */
  baseball(t, b, e) {
    const one = (z) => {
      if (!this.enemies.has(z.id)) return;
      if (!z.boss) return this.stop({ bossStop: 0 }, z, b.stun, 'stun');
      if (!b.bossSlow || z.statusImmune) return;
      z.thornSlow = Math.max(z.thornT > 0 ? z.thornSlow : 0, b.bossSlow);
      z.thornT = Math.max(z.thornT || 0, b.stun);
    };
    if (!b.flash) return one(e);
    const x = e.x;
    const z0 = e.z;
    this.events.push({ k: 'boom', x: r2(x), z: r2(z0), r: b.flash });
    for (const z of [...this.enemies.values()]) {
      if (!canHit(b.det, z) || (z.x - x) ** 2 + (z.z - z0) ** 2 > b.flash * b.flash) continue;
      if (z !== e) this.damage(t, z, b.damage);
      one(z);
    }
  }

  updateLemon(t, s, b, dt) {
    if (t.holo) return;
    const r = s.range * b.range;
    let n = 0;
    for (const e of this.enemies.values()) {
      if (e.remains || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r * r) continue;
      if (++n >= s.lemon.cap) break;
    }
    if (n) t.lemonAcc = (t.lemonAcc || 0) + n * s.lemon.pay * dt;
    t.lemonT = (t.lemonT || 0) + dt;
    if (t.lemonT < 2 || !(t.lemonAcc >= 1)) return;
    const v = Math.floor(t.lemonAcc);
    t.lemonAcc -= v;
    t.lemonT = 0;
    const owner = this.players.get(t.owner);
    if (owner) owner.cash += v;
    this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
  }

  /** Hotdog Frank / Mako: a melee hit on the target and every zombie within `area` of it. Mako's hit is stronger the longer it charged. */
  areaHit(t, def, s, target) {
    let dmg = s.damage;
    let big = false;
    if (s.charge) {
      const f = Math.min(1, (t.chargeT || 0) / s.charge.time);
      dmg = Math.round((s.damage + (s.charge.max - s.damage) * f) * 100) / 100;
      big = f >= 0.5;
      t.chargeT = 0;
    }
    this.events.push({ k: 'shot', t: t.id, e: target.id, ...(big ? { c: 2 } : {}) });
    const det = this.detects(t, s);
    const hit = [target];
    const r2max = s.area * s.area;
    for (const e of this.enemies.values()) if (e !== target && canHit(det, e) && (e.x - target.x) ** 2 + (e.z - target.z) ** 2 <= r2max) hit.push(e);
    for (const e of hit) {
      if (!this.enemies.has(e.id)) continue;
      if (e !== target) this.events.push({ k: 'slice', e: e.id });
      this.damage(t, e, dmg);
    }
  }

  /** Byte: shocks its target to `slow` for `time` s, or (Paralyze) stops it. */
  byteZap(t, def, s, target) {
    const sh = s.shock;
    this.events.push({ k: 'zap', t: t.id, es: [target.id] });
    if (s.damage) {
      // Golden Byte: real damage, then a shock only if the zombie is one it may shock and isn't already.
      this.damage(t, target, s.damage);
      if (!this.enemies.has(target.id) || target.shockT > 0 || target.stop > 0 || target.statusImmune || target.shockImmune || (sh.maxHp != null && target.maxHp > sh.maxHp)) return;
    }
    if (sh.paralyze) {
      this.stop(def, target, sh.time, 'stun');
      return;
    }
    target.shock = sh.slow;
    target.shockT = target.boss ? sh.time * (def.bossStop ?? 1) : sh.time;
  }

  /** Maitake: every throw heals summons in range, (Lv 4+) frees stunned towers in range, (Lv 5) leaves a poison cloud. */
  flask(t, s, target) {
    const f = s.flask;
    const r2max = s.range * s.range;
    if (f.heal) {
      for (const u of this.units.values()) {
        if (u.def.point || u.hp >= u.maxHp || (u.x - t.x) ** 2 + (u.z - t.z) ** 2 > r2max) continue;
        u.hp = Math.min(u.maxHp, u.hp + f.heal);
      }
    }
    if (f.unstun) for (const o of this.towers.values()) if (o.stunT > 0 && (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max) o.stunT = 0;
    if (f.linger) {
      const po = s.poison;
      const c = { id: this.nextId++, tower: t.id, kind: 'gas', x: target.x, z: target.z, land: 0, radius: 4, left: f.linger, dps: po.damage / po.tick, time: 1.5, targets: 99, hits: new Set(), det: this.detects(t, s) };
      this.traps.set(c.id, c);
    }
  }

  /** Dumpster Child: a damage-over-time effect of its own kind (different kinds stack, the same kind refreshes). */
  applyTaint(t, e, ta) {
    if (e.statusImmune || (ta.kind === 'burn' && e.fireImmune)) return;
    const old = e.taints?.get(ta.kind);
    if (old && old.damage / old.tick > ta.damage / ta.tick) {
      old.left = Math.max(old.left, ta.time);
      return;
    }
    (e.taints ??= new Map()).set(ta.kind, { damage: ta.damage, tick: ta.tick, left: ta.time, next: old?.left > 0 ? old.next : ta.tick, by: t.id });
  }

  /** Nuki Launcher: where a shell lands, a Nuki stays on the path to fight. */
  landNuki(sh) {
    const t = this.towers.get(sh.tower);
    if (!t) return;
    const u = this.spawnUnit(t, sh.nuki, 0, path.project(sh.x, sh.z), path.lastRoute);
    u.lateral = (Math.random() - 0.5) * 2.4;
    this.placeUnit(u);
    this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z) });
  }

  /** Stella: paints a drawing near the path while a zombie is in range (the type she has the fewest of). */
  updateStella(t, s, dt) {
    t.spawnT -= dt;
    if (t.spawnT > 0) return;
    const mine = this.unitsOf(t.id);
    if (mine.length >= s.maxDrawings || !this.anyNear(t.x, t.z, s.range, SEE_ALL)) {
      t.spawnT = 0;
      return;
    }
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return;
    t.spawnT = s.drawEvery;
    let pick = s.drawings[0];
    let fewest = Infinity;
    for (const d of s.drawings) {
      const n = mine.filter((u) => u.def.name === d.name).length;
      if (n <= fewest) {
        fewest = n;
        pick = d; // ties go to the newest drawing
      }
    }
    const spot = t.spots[Math.floor(Math.random() * t.spots.length)];
    const u = this.spawnUnit(t, pick, 0, spot.d, spot.r);
    u.lateral = (Math.random() - 0.5) * 2.4;
    this.placeUnit(u);
    t.yaw = Math.atan2(u.x - t.x, u.z - t.z);
    this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z), paint: 1 });
  }

  /**
   * Crows (Hayes) and bees (Buzzer) fly freely: crows anywhere on the map (the zombie closest to
   * the base), bees only after zombies inside their Buzzer's range (the closest one). Each peck or
   * sting uses one of its `hits`; then it dies. With nothing to chase they circle over their tower.
   */
  updateFree(u, tower, dt) {
    const d = u.def;
    if (d.point || !tower) return; // Volt Points just sit there
    u.cooldown = Math.max(-dt, u.cooldown - dt * u.rate);
    const det = unitDetection(d);
    const leash = d.bee ? TOWERS[tower.type].levels[tower.level].range : 0;
    const ok = (e) => !!e && this.enemies.has(e.id) && !e.remains && canHit(det, e) && (!leash || (e.x - tower.x) ** 2 + (e.z - tower.z) ** 2 <= leash * leash);
    let target = u.lock ? this.enemies.get(u.lock) : null;
    if (!ok(target)) {
      target = null;
      let best = Infinity;
      for (const e of this.enemies.values()) {
        if (!ok(e)) continue;
        const sc = d.crow ? -e.dist : (e.x - u.x) ** 2 + (e.z - u.z) ** 2;
        if (sc < best) {
          best = sc;
          target = e;
        }
      }
      u.lock = target ? target.id : 0;
    }
    let tx;
    let tz;
    if (target) {
      tx = target.x;
      tz = target.z;
    } else {
      u.idleA = (u.idleA ?? Math.random() * TAU) + dt * 1.6;
      tx = tower.x + Math.cos(u.idleA) * 3.5;
      tz = tower.z + Math.sin(u.idleA) * 3.5;
    }
    const dx = tx - u.x;
    const dz = tz - u.z;
    const dist = Math.hypot(dx, dz);
    const speed = target ? d.speed : d.speed * 0.35;
    if (dist > 0.05) {
      const k = Math.min(1, (speed * dt) / dist);
      u.x += dx * k;
      u.z += dz * k;
      u.yaw = Math.atan2(dx, dz);
    }
    u.speed = speed;
    if (!target || dist > d.gun.range) {
      u.cooldown = Math.max(0, u.cooldown);
      return;
    }
    if (u.cooldown > 0) return;
    u.cooldown += d.gun.cooldown;
    this.events.push({ k: 'ushot', u: u.id, e: target.id, i: 0 });
    this.damage(tower, target, d.gun.damage, false, 'none');
    u.left = (u.left ?? d.hits) - 1;
    if (u.left <= 0) this.destroyUnit(u, tower);
  }

  /** Chaos Jester: every `chaos.every` s of wave time, one random thing happens. */
  updateChaos(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    const c = s.chaos;
    t.chaosT = (t.chaosT ?? c.every) - dt;
    if (t.chaosT > 0) return;
    t.chaosT = c.every;
    let roll = Math.random() * Object.values(c.w).reduce((a, b) => a + b, 0);
    let pick = 'unit';
    for (const [k, w] of Object.entries(c.w)) {
      if ((roll -= w) < 0) {
        pick = k;
        break;
      }
    }
    const say = (text, color) => this.events.push({ k: 'chaos', x: t.x, z: t.z, text, color });
    const owner = this.players.get(t.owner);
    const randInt = ([a, b]) => Math.round((a + Math.random() * (b - a)) / 50) * 50;
    if (pick === 'enemy') {
      const types = [...new Set(waveGroups(this.wave.index, this.waves).map((g) => g[0]))].filter((k) => !ENEMIES[k].boss);
      if (types.length) {
        this.spawn(types[Math.floor(Math.random() * types.length)]);
        return say('🃏 An extra zombie!', '#ff8a80');
      }
      pick = 'unit';
    }
    if (pick === 'unit') {
      const u = c.units[Math.floor(Math.random() * c.units.length)];
      this.spawnUnits(t, u);
      return say(`🃏 ${u.name}!`, '#80d8ff');
    }
    if (pick === 'effect') {
      const fx = c.effects[Math.floor(Math.random() * c.effects.length)];
      const m = (c.super ? 2 : 1) * (1 + t.level * 0.5);
      for (const e of [...this.enemies.values()]) {
        if (e.remains || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > s.range * s.range) continue;
        if (fx === 'burn') this.ignite(e, t.id, 8 * m, 4, 0);
        else if (fx === 'poison') this.applyPoison(t, e, { damage: Math.round(3 * m), tick: 0.5, time: 8, slow: 0 });
        else if (fx === 'heal') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.15);
        else if (fx === 'slow') this.applySlime(e, { slow: 0.4, time: 3 * (c.super ? 2 : 1), boss: 0.5 });
        else if (fx === 'freeze') this.stop({ bossStop: 0.3 }, e, 3 * (c.super ? 2 : 1), 'ice');
        else if (fx === 'paralyze') this.stop({ bossStop: 0.3 }, e, 2.5 * (c.super ? 2 : 1), 'stun');
      }
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.range });
      const names = { burn: 'Burn', poison: 'Poison', heal: 'Heal (oops!)', slow: 'Slow', freeze: 'Freeze', paralyze: 'Paralyze' };
      return say(`🃏 ${c.super && fx !== 'heal' ? 'Super ' : ''}${names[fx]}!`, fx === 'heal' ? '#ff8a80' : '#e1bee7');
    }
    if (!owner) return;
    if (pick === 'steal') {
      const v = Math.min(owner.cash === Infinity ? Infinity : Math.max(0, owner.cash), randInt(c.steal));
      if (v !== Infinity) owner.cash -= v;
      return say(`🃏 Stole $${(v === Infinity ? 0 : v).toLocaleString()}!`, '#ff8a80');
    }
    const v = randInt(pick === 'jackpot' ? c.jackpot : c.cash);
    owner.cash += v;
    this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
    say(pick === 'jackpot' ? '🃏 JACKPOT!' : '🃏 Free cash!', '#ffd740');
  }

  snapshot() {
    const w = this.wave;
    return {
      w: [w.state, w.index, Math.round(w.countdown * 10) / 10, w.left, w.votes, this.votesNeeded, this.canSkipWave ? 1 : 0],
      b: this.baseHp,
      m: this.mode,
      mk: this.map,
      sp: this.speed,
      o: this.over,
      // JSON can't hold Infinity (Konami code cash), so it travels as 'inf'.
      p: [...this.players.values()].map((p) => [p.id, p.name, p.cash === Infinity ? 'inf' : p.cash, p.color]),
      t: [...this.towers.values()].map((t) => [
        t.id, t.owner, t.type, t.level, r2(t.x), r2(t.z), r2(t.yaw), t.targetMode, t.kills, t.damageDealt, t.spent,
        r2(t.ang), t.lock, r2(t.charge), r2(t.active), cdSnap(t.cd), (t.smoke > 0 ? 1 : 0) | (t.stunT > 0 ? 2 : 0) | (t.shieldT > 0 ? 4 : 0) | (t.revT > 0 ? 8 : 0) | (this.stealthy(t) ? 16 : 0) | (t.slowT > 0 ? 32 : 0) | ((t.nerf ?? 1) < 1 ? 64 : 0) | (t.weakT > 0 ? 128 : 0) | (t.silenceT > 0 ? 256 : 0) | (t.bleedT > 0 || t.curseBy ? 512 : 0) | (t.corrupt ? 1024 : 0), t.dir, t.track,
        r2(t.radioT),
        // Pursuit / Gatling Gun extras: [ammo, reload left, helicopter dx, dz, heading, patrol zone dx, dz, FPS Mode, cone facing]
        // (positions relative to the tower, so Versus lanes don't have to shift them).
        TOWERS[t.type].levels[t.level].ammo || TOWERS[t.type].heli
          ? [t.ammo, r2(t.reloadT), r2(t.hx - t.x), r2(t.hz - t.z), r2(t.hyaw), r2(t.cx - t.x), r2(t.cz - t.z), t.manual ? 1 : 0, r2(t.face)]
          : 0,
        t.holo ? r2(t.holo) : 0, // Hacker clone: seconds left
        Math.ceil(t.hp), t.maxHp, // tower health
        TOWERS[t.type].rebuilds ? [t.rebuilt, r2(t.repairT)] : 0, // XWM Turret: rebuilds used, seconds left rebuilding
        TOWERS[t.type].levels[t.level].stealth || t.cloakT > 0 ? [r2(t.stealthLeft ?? 0), r2(t.exposedT || 0), r2(t.cloakT || 0)] : 0, // stealth left, revealed for, Ghost Grenade left
        TOWERS[t.type].facing ? r2(t.face) : 0, // Sentry: which way its cone faces
        t.off?.length ? t.off : 0, // Trapper traps / Mercenary Base units switched off
        t.choice?.length ? t.choice : 0, // Jester bombs / Biologist plants / Elementalist element
        TOWERS[t.type].levels[t.level].spot ? [r2(t.lx - t.x), r2(t.lz - t.z)] : 0, // Spotlight Tech: the light (relative)
        t.fwT > 0 ? r2(t.fwT) : 0, // Firework Technician boost left
        r2(t.starT || 0), // Star Cannon: rebooting
        // Shield Tower: [this tower's own shield, the shared pool it gives out], Combat Drone Shield, Revive Pack
        t.shieldHp > 0 || t.pool > 0 ? [Math.ceil(t.shieldHp || 0), Math.ceil(t.pool || 0)] : 0,
        t.invulnT > 0 ? r2(t.invulnT) : 0,
        t.reviveT > 0 ? r2(t.reviveT) : 0,
        // Wave 8: [Market bank, Directed Power left, Electricizer short-range mode, Radar Drone dx, dz]
        t.bank > 0 || t.dpT > 0 || t.near || t.rx != null ? [Math.floor(t.bank || 0), r2(t.dpT || 0), t.near ? 1 : 0, t.rx != null ? r2(t.rx - t.x) : null, t.rz != null ? r2(t.rz - t.z) : null] : 0,
        // Wave 9: [ability uses (paid abilities with rising prices), Chaos Jester price roll, Wizard Magic Boost, Mako charge 0-1]
        t.uses || t.magic || t.chargeT || TOWERS[t.type].levels.some((l) => l.costMax)
          ? [t.uses || 0, r2(t.costRoll ?? 0.5), t.magic || 0, TOWERS[t.type].levels[t.level].charge ? r2((t.chargeT || 0) / TOWERS[t.type].levels[t.level].charge.time) : 0] : 0,
      ]),
      // Traps, plus Necromancer gravestones and Engineer sentries: [..., level, facing, health left (0-1), stunned, thermite radius].
      tr: [...this.traps.values()].map((tr) => [tr.id, tr.tower, tr.kind, r2(tr.x), r2(tr.z), tr.land > 0 ? 0 : 1, tr.lvl ?? 0, r2(tr.yaw ?? 0), tr.maxHp ? r2(tr.hp / tr.maxHp) : 1, tr.stunT > 0 ? 1 : 0, tr.kind === 'thermite' || tr.kind === 'gas' || tr.kind === 'thorns' || tr.kind === 'goo' ? tr.radius : 0]),
      // Units: free ones (crows, bees, Volt Points) also send where they are, [x, z].
      u: [...this.units.values()].map((u) => [u.id, u.tower, u.model, Math.ceil(u.hp), u.maxHp, r2(u.dist), r2(u.lateral), u.alive, r2(u.speed), r2(u.yaw), u.def.free ? [r2(u.x), r2(u.z)] : 0, u.route || 0]),
      e: [...this.enemies.values()].map((e) => [e.id, e.type, e.hp, e.maxHp, r2(e.dist), r2(e.speed), r2(e.lateral), e.st, e.route || 0]),
      // Insane mode: the time dimension, and Beholder time bombs [id, x, z, seconds left].
      ...(this.timeWorld ? { tw: 1 } : {}),
      ...(this.bombs.length ? { tb: this.bombs.map((b) => [b.id, r2(b.x), r2(b.z), r2(b.left)]) } : {}),
      // Void mode: how dark the world is (VOID, VOID Spirit), his marks [id, tower, x, z, left] and magic missiles [id, x, z].
      ...(this.voidLevel ? { vw: this.voidLevel } : {}),
      ...(this.marks.length ? { vm: this.marks.map((k) => [k.id, k.tower, r2(k.x), r2(k.z), r2(k.left)]) } : {}),
      ...(this.orbs.length ? { vo: this.orbs.map((o) => [o.id, r2(o.x), r2(o.z)]) } : {}),
      // Void armor shields left: [enemy id, share of the shield left].
      ...(this.voidArmor ? { va: [...this.enemies.values()].filter((e) => e.vShield > 0).map((e) => [e.id, r2(e.vShield / e.vShieldMax)]) } : {}),
      // Hardcore shields left: [enemy id, share of the shield left], and enemies that can't be targeted.
      ...([...this.enemies.values()].some((e) => e.osh > 0 || e.noTarget) ? { os: [...this.enemies.values()].filter((e) => e.osh > 0 || e.noTarget).map((e) => [e.id, e.osh > 0 ? r2(e.osh / e.oshMax) : 0, e.noTarget ? 1 : 0]) } : {}),
      // Gold Commander Orbital Airstrike beams: [tower, x, z, seconds left, radius].
      ...([...this.towers.values()].some((t) => t.orb) ? { ob: [...this.towers.values()].filter((t) => t.orb).map((t) => [t.id, r2(t.orb.x), r2(t.orb.z), r2(t.orb.left), t.orb.radius]) } : {}),
    };
  }
}
