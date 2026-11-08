// Human-readable tower stats shared by the in-game panel and the Loadout & Shop screen.
const r = (n) => Math.round(n * 100) / 100;

/** Phaser-style levels: damage ramps from `damage` to `maxDamage`. */
export const isBeam = (l) => l.maxDamage != null;

export const isFlame = (l) => l.burn != null;

export const isTrapper = (l) => !!l.spike;

export function damageText(l) {
  if (isBeam(l)) return `${l.damage}–${l.maxDamage}`;
  if (isFlame(l)) return l.damage ? `${l.damage} + ${l.burn}/s burn` : `${l.burn}/s burn`;
  if (isTrapper(l)) return `${l.spike.damage} per spike`;
  if (l.pellets) return `${l.damage} × ${l.pellets}`;
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
export function dpsValue(l) {
  if (l.overcharge) return accelDps(l);
  if (l.synapses) return (l.damage * l.synapses) / l.cooldown; // every synapse on a different zombie
  if (l.sentry) return l.damage / l.cooldown + l.sentries * sentryDps(l.sentry);
  if (l.stack) return (l.damage * (1 + l.stack.max)) / l.cooldown;
  if (isFlame(l)) return (l.damage || 0) / l.cooldown + l.burn;
  if (isTrapper(l)) return l.spike.damage / l.cooldown;
  if (l.crit) return ((l.crit.every - 1) * l.damage + l.crit.damage) / l.crit.every / l.cooldown; // Warden
  if (l.cash) return (l.damage * l.cash.every) / (l.cash.every * l.cooldown + l.cash.spin); // Cowboy: twirling time
  let dps = (l.damage * (l.burst || 1) * (l.rangs || 1) * (l.pellets || 1) * (l.volley || 1)) / l.cooldown;
  if (l.ammo) {
    // Pursuit / Gatling Gun: time spent reloading after every magazine, plus the Pursuit's missiles.
    const firing = l.ammo * l.cooldown;
    dps *= firing / (firing + l.reload);
    if (l.missile) dps += (l.missile.count * l.missile.damage) / l.missile.every;
  }
  return dps;
}

export function dpsText(l) {
  if (isBeam(l)) return `${r(l.damage / l.cooldown)}–${r(l.maxDamage / l.cooldown)}`;
  if (isFlame(l)) return l.damage ? `${r(l.damage / l.cooldown)} + ${l.burn} burn, per zombie` : `${l.burn} per zombie`;
  if (l.overcharge) return `${r(dpsValue(l))} (${r(l.damage / l.cooldown)} while firing)`;
  if (l.sentry) return `${r(l.damage / l.cooldown)} (+${r(l.sentries * sentryDps(l.sentry))} from sentries)`;
  if (l.stack) return `${r(l.damage / l.cooldown)}–${r(dpsValue(l))} (stacking)`;
  if (l.bolt) return `${r(dpsValue(l))} per zombie`;
  if (l.synapses) return l.damage ? `${r(l.damage / l.cooldown)} per zombie${l.synapses > 1 ? `, ${r(dpsValue(l))} total` : ''}` : '0 (hacks only)';
  return `${r(dpsValue(l))}`;
}

export const trapText = (l) =>
  isTrapper(l)
    ? [
        `${l.maxTraps} traps`,
        `spikes ${l.spike.damage} × ${l.spike.uses} zombies`,
        l.mine && `landmines ${l.mine.damage} blast + ${l.mine.burn}/s burn`,
        l.bear && `bear traps ${l.bear.damage} + ${l.bear.stun}s stun`,
      ]
        .filter(Boolean)
        .join(', ')
    : '';
export const chainText = (l) => (l.chains ? `Chains to ${l.chains} (jump ${l.jump}), ${l.stun}s stun` : '');
export const shieldText = (l) => (l.shields ? `Shields ${l.shields} tower${l.shields > 1 ? 's' : ''}: +${Math.round(l.shieldRate * 100)}% firerate, blocks stuns (${l.recharge}s recharge)` : '');

const pctText = (n) => `${Math.round(n * 1000) / 10}%`;
export const slimeText = (sl) => (sl ? `${pctText(sl.slow)} slow for ${sl.time}s` : '');
export const chillText = (l) => (l.chill ? `Slows up to ${pctText(l.maxSlow)}${l.chillDps ? `, ${l.chillDps}/s chill` : ''}${l.chillFreeze ? `, ${l.chillFreeze}s freeze` : ''}` : '');
export const whirlText = (w) => (w ? `Every ${w.every}rd slash hits all in range for ${w.damage}` : '');
export const critText = (l) => (l.crit ? `${l.crit.damage} dmg every ${ordinal(l.crit.every)} swing` : '');
const ordinal = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
export const fanText = (f) => (f ? `3 knives (${f.damage} dmg, pierce ${f.pierce}) every ${f.every} dmg` : '');

/** Ranger Intelligence Radio, e.g. "+20% range to towers within 20 for 20s each wave". */
export const radioText = (r) => (r ? `+${Math.round(r.boost * 100)}% range to towers within ${r.radius} for ${r.time}s each wave` : '');

/** Cowboy cash shots, e.g. "$30 every 6th shot (1s twirl)". */
export const cashText = (c) => (c ? `$${c.pay} every ${ordinal(c.every)} shot (${c.spin}s twirl)` : '');

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
export const missileText = (m) => (m ? `${m.count} × ${m.damage} dmg every ${m.every}s${m.radius ? `, blast ${m.radius}` : ''}` : '');
export const ammoText = (l) => (l.ammo ? `${l.ammo} shots, ${l.reload}s reload` : '');

/** A level's Sweeper ability (Pulse Trooper), if it has one. */
export const sweeperOf = (l) => l.abilities?.find((a) => a.key === 'sweeper') ?? null;

/** Extra per-level abilities (bombs, missiles, splash, freeze, stun, burn), as one short line. */
export function extrasText(l) {
  return [
    l.ammo && `Ammo ${ammoText(l)}`,
    l.patrol && `Patrol zone ${l.patrol}`,
    l.bomb && `Bombs: ${bombText(l.bomb)}`,
    l.missile && `Missiles: ${missileText(l.missile)}`,
    l.extra && `+${l.extra} more in a cone`,
    l.pellets && `${l.pellets} piercing pellets`,
    l.chains && chainText(l),
    l.hits && `Hits ${l.hits}`,
    l.volley && `${l.volley} missiles`,
    isTrapper(l) && trapText(l),
    l.targets && `Up to ${l.targets} targets`,
    l.pierce && `Hits ${l.pierce}${l.rangs > 1 ? ` × ${l.rangs} boomerangs` : ''}`,
    l.pass && `Pierces ${l.pass} more`,
    l.abilities?.some((a) => a.key === 'flare') && 'Flare Gun',
    l.laser && 'Laser damage',
    l.slime && slimeText(l.slime),
    l.chill && chillText(l),
    l.whirl && 'Whirlwind',
    sweeperOf(l) && `Sweeper lasers ${sweeperOf(l).damage} dmg`,
    l.fan && 'Fan of Knives',
    l.radius && `Blast ${l.radius}`,
    l.cluster && `Cluster bombs ${clusterText(l.cluster)}`,
    l.nuke && 'Nuclear blast',
    l.freeze && `Freeze ${l.freeze}s`,
    l.crit && `Crit ${critText(l)}`,
    l.stun && !l.chains && `Stun ${l.stun}s${l.crit && !l.stunAll ? ' on crits' : ''}`,
    l.riot && `Riot shield (${l.riot.duration}s double damage after a block)`,
    isFlame(l) && `Burns ${l.burnTime}s`,
    l.goons && `Calls ${goonText(l.goons)}`,
    l.cash && `Cash shot ${cashText(l.cash)}`,
    l.rev && `${l.rev}s rev-up`,
    l.radio && `Radio: ${radioText(l.radio)}`,
    l.stack && `Stacking beam up to ×${1 + l.stack.max}`,
    l.souls && `Gravestones ${graveText(l)}`,
    l.raise && `Summons ${poolText(l.raise[l.raise.length - 1])}`,
    l.boom && `Lv ${l.boomLvl} graves explode for ${l.boom.damage}`,
    l.sentry && `${l.sentries} × ${sentryText(l)}`,
    l.overcharge && overchargeText(l),
    l.synapses && `${l.synapses} synapse${l.synapses > 1 ? 's' : ''}: ${hackText(l)}`,
    cloneText(l) && `Clones for ${cloneText(l)}`,
  ]
    .filter(Boolean)
    .join(' + ');
}

/** "Hidden, Flying, Lead" for a detection() result ("None" if it has none). */
export const detectText = (d) => [d.hidden && 'Hidden', d.flying && 'Flying', d.lead && 'Lead'].filter(Boolean).join(', ') || 'None';

/** Crook Boss calls, e.g. "2 Pistol Goons + Tommy Goon every 15s". */
export function goonText(g) {
  if (!g) return '';
  const counts = new Map();
  for (const u of g.units) counts.set(u.name, (counts.get(u.name) || 0) + 1);
  const list = [...counts].map(([name, n]) => (n > 1 ? `${n} ${name}s` : name));
  return `${list.join(' + ')} every ${g.every}s`;
}

export const limitText = (n) => (n === Infinity ? '∞' : `${n}`);

/** One-word attack type for a tower, e.g. "Splash", "Burst", "Melee". */
export function towerKind(def) {
  const l0 = def.levels[0];
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
  return `${g.damage} ${g.radius ? `splash (blast ${g.radius})` : 'dmg'}${g.burst ? ` × ${g.burst} burst` : ''} every ${g.cooldown}s${g.knock ? `, knockback ${g.knock}` : ''}`;
}

export function cannonText(c) {
  if (!c) return '';
  return `${c.damage}${c.splash != null ? ` + ${c.splash} splash` : ' splash'} every ${c.every}s`;
}

/** Rough damage per second of a unit: its gun and cannon, plus its HP spent ramming over one spawn cycle. */
export function unitDps(u, every) {
  const n = u.soldiers || 1;
  let dps = 0;
  if (u.gun) dps += (u.gun.damage * (u.gun.burst || 1) * n) / u.gun.cooldown;
  if (u.cannon) dps += u.cannon.damage / u.cannon.every;
  if (u.ram && every) dps += u.hp / every;
  return r(dps);
}

/** Unit summary like "Jeep, 30 HP" or "3 Soldiers, 4 HP each". */
export function unitName(u) {
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

/** What a support tower does to towers in range, as a short line. */
export function boostText(l) {
  return [
    l.rangeBoost && `+${pct(l.rangeBoost)} range`,
    l.rateBoost && `+${pct(l.rateBoost)} firerate`,
    l.musicBoost && `+${pct(l.musicBoost)} firerate`,
    l.discount && `${pct(l.discount)} off upgrades`,
    l.shields && shieldText(l),
    l.heal && `heals base ${l.heal} HP / wave`,
    l.tracks && trackText(l),
    l.dmgBoost && `+${Math.round(l.dmgBoost * 1000) / 10}% damage`,
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
    b.shield && 'Medic shield',
    b.dmg > 1 && `+${pct(b.dmg - 1)} damage`,
  ]
    .filter(Boolean)
    .join(', ');
}
