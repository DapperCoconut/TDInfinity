// Human-readable tower stats shared by the in-game panel and the Loadout & Shop screen.
import { GAME, KNOCK_STUDS, spawnExtras } from './config.js';
const r = (n) => Math.round(n * 100) / 100;

/** Phaser-style levels: damage ramps from `damage` to `maxDamage`. */
export const isBeam = (l) => l.maxDamage != null;

export const isFlame = (l) => l.burn != null;

export const isTrapper = (l) => !!(l.spike || l.mine || l.bear); // bear: El Goblino's only trap

const TAINT_NAMES = { burn: 'Burn', radioactive: 'Radioactive', biohazard: 'Biohazard' };

export function damageText(l) {
  if (l.taint) return `${r(l.taint.damage / l.taint.tick)}/s ${TAINT_NAMES[l.taint.kind]} for ${l.taint.time}s`;
  if (l.shock) return l.damage ? `${l.damage}` : 'None (slows)';
  if (l.lemon || l.chaos || l.drawings) return '—';
  if (l.nearDmg != null) return `${l.damage}–${l.nearDmg}`;
  if (l.charge) return `${l.damage}–${l.charge.max}`;
  if (l.poison && !l.damage) return `${r(l.poison.damage / l.poison.tick)}/s poison for ${l.poison.time}s`;
  if (l.fire && !l.damage) return `${l.fire.dps}/s burn for ${l.fire.time}s`;
  if (l.gas) return `${l.gas.dps}/s gas for ${l.gas.time}s`;
  if (isBeam(l)) return `${l.damage}–${l.maxDamage}`;
  if (isFlame(l)) return l.damage ? `${l.damage} + ${l.burn}/s burn` : `${l.burn}/s burn`;
  if (isTrapper(l)) return l.spike ? `${l.spike.damage} per spike` : l.mine ? `${l.mine.damage} per mine` : `${l.bear.damage} per trap`;
  if (l.pellets) return `${l.damage} × ${l.pellets}`;
  if (l.ignite) return `${l.damage} + ${l.ignite.dps}/s burn`;
  if (l.splash === 0) return `${l.damage}`; // Snowballer: only the zombie it was thrown at
  if (l.splash != null && l.splash === l.damage) return `${l.damage} × ${l.extra + 1} targets`;
  if (l.splash != null) return `${l.damage} hit / ${l.splash} splash`;
  return `${l.damage}`;
}

/** Necromancer, Engineer and Accelerator extras. */
const uniq = (list) => [...new Set(list)];
/** "Skeleton, Sword Skeleton" for a gravestone summon pool. */
export const poolText = (pool) => uniq(pool.map((u) => u.name)).join(', ');
/** Gravestone summary, e.g. "1 per 12 zombies hit, up to 3 (2.5s to raise)". */
export const graveText = (l) => (l.souls ? `1 per ${l.souls} zombies hit, up to ${l.graves}${l.graveLvl > 1 ? `, upgrade to Lv ${l.graveLvl}` : ''} (${l.build}s to raise)` : '');
/** Sentry summary, e.g. "Rifle Sentry, 400 HP: 5 dmg every 1s, range 14". */
export const sentryText = (l) => {
  const st = l.sentry;
  if (!st) return '';
  return `${st.name}, ${st.hp} HP: ${st.gun.damage} dmg every ${st.gun.cooldown}s, range ${st.gun.range}${st.rocket ? ` + ${st.rocket.damage} dmg rockets every ${st.rocket.every}s` : ''}${st.shield ? ', shielded' : ''}`;
};
/** DPS of one sentry. */
export const sentryDps = (st) => st.gun.damage / st.gun.cooldown + (st.rocket ? st.rocket.damage / st.rocket.every : 0);
/** Accelerator: average DPS over a whole charge → fire → cool cycle. */
const accelDps = (l) => {
  const fire = l.overcharge / (l.damage / l.cooldown);
  return l.overcharge / (l.charge + fire + l.cool);
};
/** Hacker: what its hacks do to every zombie it hits. */
export const hackText = (l) => (l.synapses ? `${pctText(l.slow)} slow, +${pctText(l.fraud)} cash (Wire Fraud), holograms with max health^${l.ev}` : '');
/** Hacker: Hologram Tower clone cost and lifetime. */
export const cloneText = (l) => {
  const a = l.abilities?.find((x) => x.key === 'clone');
  return a ? `${pct(a.clone)} of the tower's total cost, lasts ${a.life}s` : '';
};
export const overchargeText = (l) => (l.overcharge ? `${l.charge}s charge-up, fires until ${l.overcharge} damage, ${l.cool}s cooldown` : '');

/** Rough damage per second as a number (for comparing levels). */
/** Damage of one full Executioner axe throw (every hit, ramping up per bounce). */
const axeThrow = (l) => {
  const n = l.axe.bounces + 1;
  return n * l.damage + (l.axe.ramp * n * (n - 1)) / 2;
};

export function dpsValue(l) {
  if (l.taint) return l.taint.damage / l.taint.tick; // Dumpster Child: one effect on one zombie
  if (l.shock) return (l.damage || 0) / l.cooldown; // Byte: none; Golden Byte: its zaps
  if (l.lemon || l.chaos || l.drawings) return 0;
  if (l.poison && !l.damage) return l.poison.damage / l.poison.tick; // Maitake: poison on one zombie
  if (l.fire && !l.damage) return l.fire.dps; // Voca sparkler
  if (l.nearDmg != null) return (l.damage + l.nearDmg) / 2 / l.cooldown; // Wafer: average
  if (l.burstMax) return (l.damage * (l.burst + l.burstMax) / 2) / (l.burstPause + ((l.burst + l.burstMax) / 2) * l.burstGap); // Fracture
  if (l.star) return l.star.max / (l.star.charge + l.star.reboot); // Star Cannon: a full charge every cycle
  if (l.sword) return l.damage / l.cooldown + (l.sword.damage * l.sword.targets) / l.sword.every; // Warlock: beam + a full sword swing
  if (l.axe) return axeThrow(l) / l.cooldown; // Executioner: with enough zombies around
  if (l.bounce) return (l.damage * l.bounce.hits) / l.cooldown; // Archer (Bowmaster): every bounce lands
  if (l.bees) return l.damage / l.cooldown + l.bees.damage / l.bees.tick; // Swarmer: one sting stack
  if (l.gas) return (l.gas.dps * l.gas.time) / l.cooldown; // Toxicnator: one grenade's gas per zombie, per reload
  if (l.overcharge) return accelDps(l);
  if (l.synapses) return (l.damage * l.synapses) / l.cooldown; // every synapse on a different zombie
  if (l.sentry) return l.damage / l.cooldown + l.sentries * sentryDps(l.sentry);
  if (l.stack) return (l.damage * (1 + l.stack.max)) / l.cooldown;
  if (isFlame(l)) return (l.damage || 0) / l.cooldown + l.burn;
  if (isTrapper(l)) return (l.spike ?? l.mine ?? l.bear).damage / l.cooldown;
  if (l.crit) return ((l.crit.every - 1) * l.damage + l.crit.damage) / l.crit.every / l.cooldown; // Warden
  if (l.cash && !l.burst) return (l.damage * l.cash.every) / (l.cash.every * l.cooldown + l.cash.spin); // Cowboy: twirling time
  let dps = (l.damage * (l.burst || 1) * (l.rangs || 1) * (l.pellets || 1) * (l.volley || 1) * (l.throws || 1) * (l.bubble?.n || 1)) / (l.cooldown + (l.aimShot || 0)); // Javelin: aims before every shot
  if (l.ammo) {
    // Pursuit / Gatling Gun: time spent reloading after every magazine, plus the Pursuit's missiles.
    const firing = l.ammo * l.cooldown;
    dps *= firing / (firing + l.reload);
    if (l.missile) dps += (l.missile.count * l.missile.damage) / l.missile.every;
  }
  if (l.missiles) for (const m of l.missiles) dps += (m.count * m.damage) / m.every; // Helicopter
  if (l.rockets) dps += l.rockets.damage / l.rockets.every; // Sentry Minigun
  if (l.focus) dps *= 1 + l.focus.max; // Flayer: fully focused on one zombie
  if (l.toss) dps += l.toss.damage / l.toss.every; // Knifer thrown knives
  // Brawler: a combo is (hits - 1) normal punches plus the finisher, then the combo cooldown.
  if (l.combo) dps = (l.damage * (l.combo.hits - 1) + l.combo.damage) / (l.cooldown * (l.combo.hits - 1) + l.combo.cooldown);
  return dps;
}

export function dpsText(l) {
  if (l.star) return `${r(l.star.min / l.star.reboot)}–${r(dpsValue(l))}`;
  if (l.spot) return `${r(l.damage / l.cooldown)} per zombie in the light`;
  if (l.sword) return `${r(l.damage / l.cooldown)} beam, ${r(l.sword.damage / l.sword.every)} sword per zombie`;
  if (l.bombs && l.damage) return `${r(dpsValue(l))} per zombie (Fire bombs)`;
  if (l.chillDps && l.targets) return `${r((l.damage || 0) / l.cooldown + l.chillDps)} per zombie (up to ${l.targets})`;
  if (l.axe) return `${r(l.damage / l.cooldown)} on one zombie, up to ${r(dpsValue(l))}`;
  if (l.bounce) return `${r(l.damage / l.cooldown)} per zombie, up to ${l.bounce.hits} zombies`;
  if (l.bees) return `${r(l.damage / l.cooldown)} + ${r(l.bees.damage / l.bees.tick)} per sting stack (up to ${l.bees.stacks})`;
  if (l.gas) return `${r(dpsValue(l))} per zombie`;
  if (isBeam(l)) return `${r(l.damage / l.cooldown)}–${r(l.maxDamage / l.cooldown)}`;
  if (isFlame(l)) return l.damage ? `${r(l.damage / l.cooldown)} + ${l.burn} burn, per zombie` : `${l.burn} per zombie`;
  if (l.overcharge) return `${r(dpsValue(l))} (${r(l.damage / l.cooldown)} while firing)`;
  if (l.sentry) return `${r(l.damage / l.cooldown)} (+${r(l.sentries * sentryDps(l.sentry))} from sentries)`;
  if (l.stack) return `${r(l.damage / l.cooldown)}–${r(dpsValue(l))} (stacking)`;
  if (l.bolt) return `${r(dpsValue(l))} per zombie`;
  if (l.poison) return `${r(dpsValue(l))} + ${r(l.poison.damage / l.poison.tick)} poison per zombie`;
  if (l.synapses) return l.damage ? `${r(l.damage / l.cooldown)} per zombie${l.synapses > 1 ? `, ${r(dpsValue(l))} total` : ''}` : '0 (hacks only)';
  return `${r(dpsValue(l))}`;
}

export const trapText = (l) =>
  isTrapper(l)
    ? [
        l.maxTraps && `${l.maxTraps} traps`,
        l.spike && `spikes ${l.spike.damage} × ${l.spike.uses} zombies`,
        l.bear && !l.spike && `traps ${l.bear.damage} dmg + ${l.bear.stun}s stun (bosses too, shorter)`,
        l.mine && !l.mine.life && `landmines ${l.mine.damage} blast + ${l.mine.burn}/s burn`,
        // Mine Layer
        l.mine?.life && `mines ${l.mine.damage} blast (size ${l.mine.radius})${l.mine.burn ? ` + ${l.mine.burn}/s burn` : ''}, last ${l.mine.life}s`,
        l.mine?.thermite && `thermite ${l.mine.thermite.burn}/s burn for ${l.mine.thermite.time}s`,
        l.bear && `bear traps ${l.bear.damage} + ${l.bear.stun}s stun`,
      ]
        .filter(Boolean)
        .join(', ')
    : '';
/** Saboteur poison and Tesla Smite. */
export const poisonText = (po) => (po ? `${po.damage} dmg every ${po.tick}s for ${po.time}s, ${Math.round(po.slow * 1000) / 10}% slow` : '');
export const smiteText = (sm) => (sm ? `${sm.damage} dmg (ignores armor), blast ${sm.radius}, every ${sm.hits} hits` : '');
export const chainText = (l) => (l.chains ? `Chains to ${l.chains} (jump ${l.jump})${l.chainMult != null ? `, jumps do ${pct(l.chainMult)}` : ''}${l.stun ? `, ${l.stun}s stun` : ''}` : '');
export const shieldText = (l) => (l.shields ? `Shields ${l.shields} tower${l.shields > 1 ? 's' : ''}: +${Math.round(l.shieldRate * 100)}% firerate, blocks stuns (${l.recharge}s recharge)` : '');

const pctText = (n) => `${Math.round(n * 1000) / 10}%`;
export const slimeText = (sl) => (sl ? `${pctText(sl.slow)} slow for ${sl.time}s` : '');
export const chillText = (l) => (l.chill
  ? `Slows up to ${pctText(l.maxSlow)}${l.chillDps ? `, ${l.chillDps}/s chill` : ''}${l.chillFreeze ? `, ${l.chillFreeze}s freeze${l.freezeBoss ? ' (bosses too)' : ''}` : ''}`
    + `${l.frostbite ? `, frozen zombies ${pctText(l.frostbite)} slower for good` : ''}${l.frozenVuln ? `, frozen zombies take +${pctText(l.frozenVuln)} damage` : ''}`
  : '');
/** Cryo Ranger's self-firing freeze grenade launcher. */
export const railText = (r) => (r ? `${r.damage} dmg every ${r.every}s, pierces ${r.pass} more` : '');
export const chopText = (c) => (c ? `${c.damage} dmg to up to ${c.targets} zombies within ${c.range} (hidden too), every ${c.every}s` : '');
export const m203Name = (m) => m?.name || 'Cryo M203';
export const m203Text = (m) => (!m ? ''
  : m.patch ? `Fire pool (radius ${m.radius}, ${m.patch.time}s): ${m.patch.burn}/s burn for ${m.patch.burnTime}s, every ${m.every}s`
  : `${m.damage} dmg, ${m.freeze}s freeze, blast ${m.radius}, every ${m.every}s`);
export const comboText = (c) => (c ? `Every ${ordinal(c.hits)} punch does ${c.damage} dmg with ${c.knock} knockback (${c.cooldown}s combo cooldown)` : '');
export const repositionOf = (l) => l.abilities?.find((a) => a.key === 'reposition') ?? null;
export const whirlText = (w) => (w ? `Every ${w.every}rd slash hits all in range for ${w.damage}` : '');
export const critText = (l) => (l.crit ? `${l.crit.damage} dmg every ${ordinal(l.crit.every)} swing` : '');
const ordinal = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
export const fanText = (f) => (f ? `3 knives (${f.damage} dmg, pierce ${f.pierce}) every ${f.every} dmg` : '');

/** Ranger Intelligence Radio, e.g. "+20% range to towers within 20 for 20s each wave". */
export const radioText = (r) => (r ? `+${Math.round(r.boost * 100)}% range to towers within ${r.radius} for ${r.time}s each wave` : '');

/** Cowboy cash shots, e.g. "$30 every 6th shot (1s twirl)". */
export const cashText = (c) => (c ? `$${c.pay} every ${ordinal(c.every)} shot${c.spin ? ` (${c.spin}s twirl)` : ''}` : '');

/** DJ Booth tracks, e.g. "Purple +15% range · Green 10% off upgrades". */
export function trackText(l) {
  if (!l.tracks) return '';
  const t = l.tracks;
  return [
    t.range && `Purple +${pct(t.range)} range`,
    t.discount && `Green ${pct(t.discount)} off upgrades`,
    t.dmg && `Red +${pct(t.dmg)} damage`,
  ]
    .filter(Boolean)
    .join(' · ') + (l.offTrack ? ` (all at once, others at ${pct(l.offTrack)})` : '');
}

/** Classic Mortar cluster bombs, e.g. "4 × 30 dmg (blast 3)". */
export const clusterText = (c) => (c ? `${c.count} × ${c.damage} dmg (blast ${c.radius})` : '');

export const bombText = (b) => (b ? `${b.count} × ${b.damage} dmg every ${b.every}s` : '');
export const missileText = (m) => (m
  ? `${m.count} × ${m.damage.toLocaleString()} dmg every ${m.every}s${m.radius ? `, blast ${m.radius}` : ''}${m.stun ? `, ${m.stun}s stun${m.stunAny ? ' (anything)' : ''}` : ''}`
    + `${m.strongest ? ', strongest zombie' : ''}${m.range ? `, range ${m.range}` : ''}${m.minRange ? ` (not within ${m.minRange})` : ''}${m.minHp ? `, skips zombies under ${m.minHp} HP` : ''}${m.flying ? ', hits flyers' : ''}`
  : '');
/** Bubble Blower bubbles and the Bubble Companion. */
export const bubbleText = (b) => (b ? (b.float ? `Floats non-boss zombies for ${b.float}s` : `Pushes non-boss zombies back ${Math.round(b.push * KNOCK_STUDS * 100) / 100} stud${b.push * KNOCK_STUDS === 1 ? '' : 's'}`) + (b.n > 1 ? ` (${b.n} bubbles per shot)` : '') : '');
export const companionText = (c) => (c ? `${c.unit.name} (${c.unit.hp} HP, blocks zombies) every ${c.every}s, up to ${c.unit.max}` : '');
export const ammoText = (l) => (l.ammo ? `${l.ammo} shots, ${l.reload}s reload` : '');

/** A level's Toxic Blast (Toxicnator) and C7 Drone (Ghost) abilities, if it has them. */
const toxicOf = (l) => l.abilities?.find((a) => a.key === 'toxicBlast') ?? null;
const cloakOf = (l) => l.abilities?.find((a) => a.key === 'ghostGrenade') ?? null;
const droneOf = (l) => l.abilities?.find((a) => a.key === 'drone') ?? null;

/** A level's Sweeper ability (Pulse Trooper), if it has one. */
export const fireAspectText = (f) => (!f ? '' : f.every ? `every ${f.every}s its next swing burns ${f.dps}/s for ${f.time}s` : `every swing burns ${f.dps}/s for ${f.time}s`);
export const beesText = (b) => (b ? `${b.damage} dmg every ${b.tick}s for ${b.time}s, up to ${b.stacks} stack${b.stacks > 1 ? 's' : ''}` : '');
export const axeText = (a) => (a ? `${a.bounces} bounce${a.bounces > 1 ? 's' : ''} (up to ${a.targets} zombies), +${a.ramp} dmg per bounce` : '');
export const bleedText = (n, fx) => (n && fx ? `+${n} stacks per hit (max ${fx.max}); each stack ${Math.round(fx.dps * 1e6) / 1e4}% max health/s, bursts for ${pct(fx.burst)} at max (bosses ${pct(fx.bossMult)})` : '');
export const aftershockText = (a) => (a ? `${pct(a.mult)} damage ${a.delay}s after each swing` : '');
export function arrowsText(a) {
  if (!a) return '';
  return [
    a.flame && `Flame (${a.flame.dps}/s for ${a.flame.time}s${a.flame.extra ? `, +${a.flame.extra} bounce${a.flame.extra > 1 ? 's' : ''}` : ''})`,
    a.explosive && `Explosive (${a.explosive.damage} dmg, blast ${a.explosive.radius})`,
    a.shock && `Shock (${a.shock.stun}s stun, ${a.shock.targets} zombies)`,
  ].filter(Boolean).join(', ');
}

/** Penetrator: pierce on the ground, ricochets on a cliff (its `cliff` stats). */
export const penText = (l) => {
  if (!l.pen) return '';
  if (l.pen.ricochet) return `Ricochets ${l.pen.ricochet} times, -${pct(l.pen.falloff)} per zombie`; // stats where it stands on a cliff
  const ground = `Pierces ${l.pen.pierce} zombies, -${pct(l.pen.falloff)} per zombie`;
  const c = l.cliff?.pen;
  return c ? `${ground}; on a cliff: range ${l.cliff.range}, ricochets ${c.ricochet} times, -${pct(c.falloff)} per zombie` : ground;
};
/** Darter fire / shock darts and Penetrator flaming arrows. */
export const procText = (l) => [
  l.fireDart && `${pct(l.fireDart.chance)} of darts burn ${l.fireDart.dps}/s for ${l.fireDart.time}s`,
  l.shockDart && `${pct(l.shockDart.chance)} of darts stun ${l.shockDart.stun}s (bosses too)`,
  l.flameShot && `Every ${l.flameShot.every}rd shot is a flaming arrow: ${r(l.flameShot.dps * l.flameShot.time)} burn over ${l.flameShot.time}s`,
].filter(Boolean).join(', ');

export const sweeperOf = (l) => l.abilities?.find((a) => a.key === 'sweeper') ?? null;

/** Extra per-level abilities (bombs, missiles, splash, freeze, stun, burn), as one short line. */
export function extrasText(l) {
  return [
    l.ammo && `Ammo ${ammoText(l)}`,
    l.patrol && `Patrol zone ${l.patrol}`,
    l.bomb && `Bombs: ${bombText(l.bomb)}`,
    l.missile && `Missiles: ${missileText(l.missile)}`,
    ...(l.missiles ?? []).map((m) => `${m.name}${m.air ? ' (flying only)' : ''}: ${missileText(m)}`),
    l.heliSpeed && `Flies at speed ${l.heliSpeed}`,
    l.reveal && 'Reveals hidden zombies near it',
    l.cashback && `${pct(l.cashback)} cash back when towers in range are knocked out`,
    l.extra && `+${l.extra} more in a cone`,
    l.pellets && (l.scatter ? `${l.pellets} pellets${l.scatter > 1 ? `, each hits ${l.scatter}` : ''}` : `${l.pellets} piercing pellets`),
    l.poison && `Poison ${poisonText(l.poison)}`,
    l.chains && chainText(l),
    l.voltPoints && 'Volt Points',
    l.charge && `Charges up while idle: up to ${l.charge.max} dmg after ${l.charge.time}s`,
    l.area && `Each hit lands on every zombie within ${l.area} of its target`,
    l.nearDmg != null && (l.meleeRange ? `Full damage within ${l.meleeRange}, less farther out` : 'More damage the closer the zombie'),
    l.slowVuln && `Stunned or slowed zombies in range take +${pct(l.slowVuln)} damage`,
    l.taint && `${TAINT_NAMES[l.taint.kind]} ignores armor and stacks with the other effects; aims at zombies without it`,
    l.shock && (l.shock.paralyze ? `Paralyzes for ${l.shock.time}s` : `Shocks: ${Math.round(l.shock.slow * 100)}% slower for ${l.shock.time}s`) + (l.shock.maxHp != null ? ` (zombies up to ${l.shock.maxHp.toLocaleString()} max health)` : ' (any zombie)'),
    l.flask?.heal && `Heals summons in range ${l.flask.heal} HP per throw`,
    l.flask?.unstun && 'Frees stunned towers in range',
    l.flask?.linger && `Leaves a poison cloud for ${l.flask.linger}s`,
    l.burstMax && `${l.burst}–${l.burstMax} shards per burst`,
    l.nuki && `Nukis: ${l.nuki.hp} HP, ${l.nuki.gun.damage} dmg${l.nuki.gun.burst ? ` × ${l.nuki.gun.burst}` : ''} every ${l.nuki.gun.cooldown}s, range ${l.nuki.gun.range}, stay to fight`,
    l.chaos && `Something random every ${l.chaos.every}s`,
    l.kin?.min && `Group boost: +${pct(l.kin.dmg)} damage per other Bunny once ${l.kin.min + 1} are together (up to +${pct(l.kin.dmgCap)})`,
    l.fire && !l.damage && `Burns ${l.fire.dps}/s for ${l.fire.time}s`,
    l.smite && `Smite ${smiteText(l.smite)}`,
    l.hits && `Hits ${l.hits}`,
    l.volley > 1 && `${l.volley} shots per volley`,
    l.throws > 1 && `${l.throws} firecrackers per throw`,
    penText(l),
    procText(l),
    l.aimShot && `Aims ${l.aimShot}s per shot`,
    isTrapper(l) && trapText(l),
    l.targets && `Up to ${l.targets} targets`,
    l.pierce && `Hits ${l.pierce}${l.rangs > 1 ? ` × ${l.rangs} boomerangs` : ''}`,
    l.pass && `Pierces ${l.pass} more`,
    l.arrow && `Straight arrows pierce ${l.arrow.pierce}`,
    l.toss && `Throws a ${l.toss.damage} dmg knife every ${l.toss.every}s (range ${l.toss.range})${l.toss.injure ? `, Injured: +${pct(l.toss.injure.amount)} Knifer damage taken for ${l.toss.injure.time}s` : ''}`,
    l.focus && `Focus: +${pct(l.focus.per)} per hit on the same zombie, up to +${pct(l.focus.max)}`,
    l.harpoon && `Harpoons slow ${pct(l.harpoon.slow)} for ${l.harpoon.time}s (stacking)`,
    l.stealth && `Stealth ${l.stealthTime ?? GAME.stealthTime}s, then revealed ${l.restealth ?? GAME.restealth}s`,
    cloakOf(l) && `Ghost Grenade: towers within ${cloakOf(l).radius} stealthy for ${cloakOf(l).duration}s`,
    l.gas && `Gas clouds last ${l.gas.cloud}s, gas up to ${l.gas.targets} zombies each (stacking)`,
    toxicOf(l) && `Toxic Blast +${pct(toxicOf(l).vuln)} damage taken for ${toxicOf(l).vulnTime}s${toxicOf(l).bossVuln != null ? ` (bosses +${pct(toxicOf(l).bossVuln)})` : ''}`,
    droneOf(l) && `C7 Drone ${droneOf(l).damage} dmg every ${droneOf(l).every}s for ${droneOf(l).duration}s, reveals hidden within ${droneOf(l).range}`,
    l.abilities?.find((a) => a.key === 'flare')?.name,
    l.abilities?.some((a) => a.key === 'shock') && 'Shock Rounds: +50% damage, 0.3s stuns for 12s',
    l.abilities?.find((a) => a.key === 'sensor') && `Stealth Sensor ${l.abilities.find((a) => a.key === 'sensor').damage} dmg within ${l.abilities.find((a) => a.key === 'sensor').radius}, reveals hidden for good`,
    l.laser && 'Laser damage',
    l.slime && slimeText(l.slime),
    l.chill && chillText(l),
    l.m203 && `${m203Name(l.m203)}: ${m203Text(l.m203)}`,
    l.rail && `Railgun ${railText(l.rail)}`,
    l.chop && `Axe ${chopText(l.chop)}`,
    l.rockets && `Rockets ${l.rockets.damage} dmg every ${l.rockets.every}s`,
    l.minRange && `Blind spot ${l.minRange}`,
    l.stunImmune && "Can't be stunned",
    l.burst > 1 && l.targets && `${l.burst} hits per attack`,
    l.autoAim && 'Aims on its own',
    l.beam && `Ice beam hits ${l.beam} zombies`,
    l.deathBlast && (l.deathBlast.stun ? `Knocked out: freezes towers within ${l.deathBlast.radius} for ${l.deathBlast.stun}s` : `Explodes for ${l.deathBlast.damage} when knocked out`),
    l.oil && `Pumps $${l.oil.pay} every ${l.oil.every}s`,
    l.shield && `${l.shield.shared ? 'Shared' : 'Per-tower'} shield ${l.shield.amount.toLocaleString()} every ${l.shield.every}s (range ${l.aura})`,
    l.towerHeal && l.damage && `Repairs towers ${l.towerHeal} HP/s within ${l.aura}`,
    l.revive && `Revive Pack: knocked-out towers back in ${l.revive.delay}s (every ${l.revive.cooldown}s)`,
    l.handgun && `Handgun ${l.handgun.damage} dmg every ${l.handgun.cooldown}s inside its blind spot`,
    l.airMult && `×${l.airMult} damage to flyers`,
    l.abilities?.some((a) => a.key === 'medDrone') && 'Medic Drone',
    l.abilities?.some((a) => a.key === 'crossbow') && 'Crossbow',
    l.abilities?.some((a) => a.key === 'targetSelect') && !l.autoAim && 'Only fires at the spot you pick',
    l.abilities?.some((a) => a.key === 'iceShard') && 'Ice Shard',
    l.abilities?.some((a) => a.key === 'snowStorm') && 'Snow Storm',
    l.melt && `Melts ${Math.round(l.melt * 100)}% armor`,
    l.whirl && 'Whirlwind',
    l.fireAspect && `Fire Aspect ${fireAspectText(l.fireAspect)}`,
    l.bleed && `Bleed +${l.bleed} stacks per hit`,
    l.bees && `Bee stings ${beesText(l.bees)}`,
    l.axe && `Bouncing axe ${axeText(l.axe)}`,
    l.bounce && `Arrows bounce, ${l.bounce.hits} zombies`,
    l.arrows && `Arrows: ${arrowsText(l.arrows)}`,
    l.iceBreak && `×${l.iceBreak} damage to chilled or frozen zombies`,
    l.aftershock && `Aftershock ${aftershockText(l.aftershock)}`,
    l.combo && `Combo ${comboText(l.combo)}`,
    repositionOf(l) && `Reposition ${repositionOf(l).damage} dmg leap (within ${repositionOf(l).reach})`,
    sweeperOf(l) && `Sweeper lasers ${sweeperOf(l).damage} dmg`,
    l.fan && 'Fan of Knives',
    l.radius && l.splash !== 0 && `Blast ${l.radius}`,
    l.ignite && `Burns ${l.ignite.dps}/s for ${l.ignite.time}s (slows)`,
    l.payday && `Bounty $${l.payday.pay} every ${l.payday.every}s with zombies in range`,
    l.abilities?.some((a) => a.key === 'bounty') && `Bounty ${pct(l.abilities.find((a) => a.key === 'bounty').pct)} of max health (up to $${l.abilities.find((a) => a.key === 'bounty').cap.toLocaleString()})`,
    l.cluster && `Cluster bombs ${clusterText(l.cluster)}`,
    l.nuke && 'Nuclear blast',
    l.freeze && `Freeze ${l.freeze}s${l.freezeMain ? ' (target only)' : ''}`,
    l.frostbite && !l.chill && `thawed zombies ${pctText(l.frostbite)} slower for good`,
    l.crit && `Crit ${critText(l)}`,
    l.stun && !l.chains && `Stun ${l.stun}s${l.crit && !l.stunAll ? ' on crits' : ''}${l.stunTargets ? ` (up to ${l.stunTargets})` : ''}`,
    l.riot && `Riot shield (${l.riot.duration}s double damage after a block)`,
    isFlame(l) && `Burns ${l.burnTime}s`,
    l.goons && `Calls ${goonText(l.goons)}`,
    l.cash && `Cash shot ${cashText(l.cash)}`,
    l.rev && `${l.rev}s rev-up`,
    l.radio && `Radio: ${radioText(l.radio)}`,
    l.stack && `Stacking beam up to ×${1 + l.stack.max}`,
    l.souls && `Gravestones ${graveText(l)}`,
    l.raise && `Summons ${poolText(l.raise[l.raise.length - 1])}`,
    l.boom && (l.boomLvl ? `Lv ${l.boomLvl} graves explode for ${l.boom.damage}` : `Last shot of every burst is a ${l.boom.damage} dmg rocket (blast ${l.boom.radius})`),
    l.sentry && `${l.sentries} × ${sentryText(l)}`,
    l.overcharge && overchargeText(l),
    l.synapses && `${l.synapses} synapse${l.synapses > 1 ? 's' : ''}: ${hackText(l)}`,
    cloneText(l) && `Clones for ${cloneText(l)}`,
    l.bombs && `Bombs: ${Object.keys(l.bombs).map((k) => ({ fire: 'Fire', ice: 'Ice', poison: 'Poison', confuse: 'Confusion' })[k]).join(', ')}${l.slots > 1 ? ` (${l.slots} at once)` : ''}`,
    l.element && `Fire: burns ${l.element.fire.dps}/s for ${l.element.fire.time}s / Frost: ${chillText(l.element.frost)}`,
    l.chillDps && `Slowed zombies take ${l.chillDps}/s`,
    l.knock && `Knockback ${l.knock}`,
    l.bubble && bubbleText(l.bubble),
    l.companion && companionText(l.companion),
    l.abilities?.some((a) => a.key === 'carpetBomb') && 'Carpet Bomb',
    l.abilities?.some((a) => a.key === 'teleport') && 'Teleport',
    l.abilities?.some((a) => a.key === 'jump') && 'Jump',
    l.sword && `Sword ${swordText(l.sword)}`,
    l.spot && `Spotlight radius ${l.spot.radius}${l.spot.reveal ? ', reveals hidden' : ''}${l.spot.confuse ? `, confuses after ${l.spot.confuse.charge.toLocaleString()} dmg` : ''}`,
    l.star && `${starText(l.star)}${l.star.stun ? `, ${l.star.stun}s stun` : ''}${l.star.extra ? `, +${l.star.extra} blasts` : ''}`,
    l.maxHits && `Hits up to ${l.maxHits}`,
  ]
    .filter(Boolean)
    .join(' + ');
}

/** "Hidden, Flying, Lead" for a detection() result ("None" if it has none). */
export const detectText = (d) => [d.hidden && 'Hidden', d.flying && (d.ground === false ? 'Flying only' : 'Flying'), d.lead && 'Lead'].filter(Boolean).join(', ') || 'None';

/** Crook Boss calls, e.g. "2 Pistol Goons + Tommy Goon every 15s". */
export function goonText(g) {
  if (!g) return '';
  const counts = new Map();
  for (const u of g.units) counts.set(u.name, (counts.get(u.name) || 0) + 1);
  const list = [...counts].map(([name, n]) => (n > 1 ? `${n} ${name}s` : name));
  return `${list.join(' + ')} every ${g.every}s`;
}

export const limitText = (n) => (n === Infinity ? '∞' : `${n}`);
/** A tower's placement limit for the shop, e.g. "4–7" when it depends on team size. */
export const limitRange = (def) => (def.teamLimit ? `${Math.min(...def.teamLimit)}–${Math.max(...def.teamLimit)} by team size` : limitText(def.limit));

/** One-word attack type for a tower, e.g. "Splash", "Burst", "Melee". */
export function towerKind(def) {
  const l0 = def.levels[0];
  if (def.kindLabel) return def.kindLabel;
  if (def.kind === 'spawner') return 'Spawner';
  if (def.kind === 'support') return 'Support';
  if (def.kind === 'income') return 'Income';
  if (def.orbit || def.heli) return 'Air';
  if (def.fps) return 'Cone';
  if (def.melee) return 'Melee';
  if (def.traps) return 'Traps';
  if (def.pulse) return 'Pulse';
  if (l0.chains) return 'Chain';
  if (l0.pellets) return 'Spread';
  if (l0.burn != null) return 'Burn';
  if (l0.freeze) return 'Freeze';
  if (l0.chill) return 'Chill';
  if (l0.slime) return 'Slow';
  if (l0.bolt) return 'Summoner';
  if (l0.sentry) return 'Builder';
  if (l0.overcharge) return 'Burst beam';
  if (l0.synapses) return 'Hacker';
  if (l0.pierce) return 'Pierce';
  if (l0.gas) return 'Gas';
  if (l0.radius) return 'Splash';
  if (l0.maxDamage != null) return 'Beam';
  if (l0.extra) return 'Spread';
  if (l0.targets) return 'Multi-target';
  return def.levels.some((l) => l.burst) ? 'Burst' : 'Single';
}

// ---- spawners, income and support towers

const pct = (n) => `${Math.round(n * 100)}%`;

export const isSpawner = (def) => def.kind === 'spawner';
export const isSupport = (def) => def.kind === 'support';
export const isIncome = (def) => def.kind === 'income';
/** Towers that don't shoot on their own (stats tables use their own columns). */
export const isNonAttacker = (def) => !!def.kind;

/** "2 dmg every 0.133s" (+ burst) for a unit's gun. */
export function gunText(g) {
  if (!g) return '';
  if (g.flame) return `${g.damage} fire dmg to every zombie in range every ${g.cooldown}s + ${g.burn}/s burn for ${g.burnTime}s`;
  return `${g.damage} ${g.radius ? `splash (blast ${g.radius})` : g.splash ? `splash (within ${g.splash})` : 'dmg'}${g.burst ? ` × ${g.burst} burst` : ''} every ${g.cooldown}s${g.knock ? `, knockback ${g.knock}` : ''}${g.poison ? `, poison ${g.poison.damage} every ${g.poison.tick}s for ${g.poison.time}s` : ''}${g.chill ? `, slows up to ${pct(g.chill.maxSlow)} and freezes` : ''}${g.confuse ? `, confuses ${g.confuse.time}s` : ''}${g.stun ? `, ${g.stun}s stun (not bosses)` : ''}`;
}

export function cannonText(c) {
  if (!c) return '';
  return `${c.damage}${c.splash != null ? ` + ${c.splash} splash` : ' splash'} every ${c.every}s${c.range ? `, range ${c.range}` : ''}${c.stun ? `, ${c.stun}s stun` : ''}${c.knock ? `, knockback ${c.knock}` : ''}${c.stun || c.knock ? ' (bosses too)' : ''}`;
}

/** A spawner level's units with their spawn intervals: its `unit`, plus `unit2` if it has a second vehicle. */
export const spawnerUnits = (l, def) => (l.drawings ? l.drawings.map((u) => ({ unit: u, every: l.drawEvery })) : l.plants ? l.plants.map((p) => ({ unit: p.unit, every: p.every })) : [{ unit: l.unit, every: l.spawnEvery ?? def.spawnEvery }, ...spawnExtras(l)]);

/** Rough damage per second of a unit: its gun and cannon, plus its HP spent ramming over one spawn cycle. */
export function unitDps(u, every) {
  const n = u.soldiers || 1;
  let dps = 0;
  if (u.gun?.flame) dps += u.gun.damage / u.gun.cooldown + (u.gun.burn || 0); // one spray, on every zombie in range
  else if (u.gun) dps += (u.gun.damage * (u.gun.burst || 1) * n) / u.gun.cooldown;
  if (u.bump) dps += u.bump * n; // Field Barracks: bumping into zombies
  if (u.cannon) dps += u.cannon.damage / u.cannon.every;
  if (u.beam) dps += u.beam.damage / u.beam.every;
  if (u.ram && every) dps += u.hp / (1 - (u.ramArmor || 0)) / every;
  return r(dps * (u.count || 1));
}

/** Unit summary like "Jeep, 30 HP" or "3 Soldiers, 4 HP each". */
export function unitName(u) {
  if (u.count > 1) return `${u.count} × ${u.name}, ${u.hp.toLocaleString()} HP each`;
  if (u.soldiers > 1 && u.name !== 'Squad') return `${u.soldiers} × ${u.name}, ${u.hp.toLocaleString()} HP each`;
  return u.soldiers > 1 ? `${u.soldiers} Soldiers, ${u.hp} HP each` : `${u.name}, ${u.hp.toLocaleString()} HP`;
}

/** What a unit does besides its gun, e.g. "heals units 75 HP/s within 10". */
export const unitExtraText = (u) => (u.heal ? `Heals units ${u.heal.rate} HP/s within ${u.heal.range}, shields them (-${pct(u.heal.shield)} damage)` : '');

/** A Mercenary Base roster entry, e.g. "Rifleman, 40 HP: 4 dmg × 5 burst every 1.5s, range 13 (every 30s)". */
export function rosterText(r) {
  const u = r.unit;
  const what = u.gun ? `${gunText(u.gun)}, range ${u.gun.range}` : unitExtraText(u);
  return `${unitName(u)}: ${what} (every ${r.every}s)`;
}

/** Firework Technician: what towers in its range get each wave. */
export const fireworkText = (f) => `hidden detection for ${f.time}s each wave, up to ${pct(f.cap)} chance of a ${f.damage} dmg firework (blast ${f.radius}, burns ${f.burn}/s, ignores armor)`;
/** Star Cannon charge and blast, as a short line. */
export const starText = (st) => `${st.min.toLocaleString()}–${st.max.toLocaleString()} dmg (full charge ${st.charge}s, reboot ${st.reboot}s)`;
/** Warlock sword. */
export const swordText = (sw) => `${sw.damage} dmg to up to ${sw.targets} zombies within ${sw.reach}, every ${sw.every}s${sw.bleed ? `, +${sw.bleed} Bleed` : ''}`;
/** Jester bomb types, as a short line each. */
export const bombTypeText = (k, b) =>
  k === 'fire' ? `burns ${b.dps}/s for ${b.time}s, hits lead`
  : k === 'ice' ? `${pct(b.mult)} damage, ${pct(b.maxSlow)} slow for ${b.chillTime}s, blast ${b.radius}${b.melt ? `, melts ${pct(b.melt)} armor` : ''}`
  : k === 'poison' ? `poison ${b.damage} every ${b.tick}s for ${b.time}s`
  : k === 'confuse' ? `no damage, zombies walk backwards ${b.time}s (${b.cd}s before again, not bosses)` : '';

/** What a support tower does to towers in range, as a short line. */
export function boostText(l) {
  return [
    l.rangeBoost && `+${pct(l.rangeBoost)} range`,
    l.rateBoost && `+${pct(l.rateBoost)} firerate`,
    l.musicBoost && `+${pct(l.musicBoost)} firerate`,
    l.musicRange && `+${pct(l.musicRange)} range`,
    l.discount && `${pct(l.discount)} off upgrades`,
    l.sellback && `sell for ${pct(l.sellback)} more`,
    l.cdCut && `${pct(l.cdCut)} shorter ability cooldowns`,
    l.beamHeal && `heals 1 tower ${l.beamHeal} HP/s`,
    l.shields && shieldText(l),
    l.shield && `${l.shield.amount.toLocaleString()} ${l.shield.shared ? 'shared shield' : 'shield per tower'} every ${l.shield.every}s`, // Shield Tower
    l.shield && l.towerHeal && `repairs towers ${l.towerHeal} HP/s`,
    l.heal && `heals base ${l.heal} HP / wave`,
    l.tracks && trackText(l),
    l.dmgBoost && `+${Math.round(l.dmgBoost * 1000) / 10}% damage`,
    l.splashBoost && `+${pct(l.splashBoost)} splash`,
    l.costUp && `upgrades cost ${pct(l.costUp)} more`,
    l.dmgLoss && `-${Math.round(l.dmgLoss * 1000) / 10}% damage`,
    l.rateLoss && `-${pct(l.rateLoss)} firerate`,
    l.firework && fireworkText(l.firework),
  ]
    .filter(Boolean)
    .join(', ');
}

export function abilityText(a) {
  return `${a.name}${a.cost ? ` ($${a.cost.toLocaleString()})` : ''}: ${a.desc}, ${a.cooldown}s cooldown`;
}

/** The boosts a tower is getting right now, e.g. "+25% range, +56% firerate". */
export function buffText(b) {
  if (!b) return '';
  return [
    b.range > 1 && `+${pct(b.range - 1)} range`,
    b.rate > 1 && `+${pct(b.rate - 1)} firerate`,
    b.discount && `${pct(b.discount)} off upgrades`,
    b.costUp && `upgrades ${pct(b.costUp)} pricier`,
    b.splash > 1 && `+${pct(b.splash - 1)} splash`,
    b.sell && `sells for ${pct(b.sell)} more`,
    b.cdCut && `${pct(b.cdCut)} shorter ability cooldowns`,
    b.invuln && 'Uber: invulnerable',
    b.shield && 'Medic shield',
    b.dmg > 1 && `+${pct(b.dmg - 1)} damage`,
  ]
    .filter(Boolean)
    .join(', ');
}
