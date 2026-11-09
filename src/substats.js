// Info panels for the things towers put on the map: the Aviator plane / Pursuit helicopter,
// Engineer sentries, Necromancer gravestones and units (vehicles, squads, skeletons, holograms...).
// Reads plain session state only; Game decides where the range ring goes.
import { ENEMIES, TOWERS, detection, unitDetection } from './config.js';
import { bombText, cannonText, detectText, dpsText, gunText, limitText, missileText, poolText, sentryDps, unitDps, unitExtraText } from './stats.js';

const r1 = (n) => Math.round(n * 10) / 10;

/** Finds the unit definition with `model` somewhere in a tower's level (units, rosters, goons, raise pools). */
const defCache = new Map();
export function findUnitDef(type, level, model) {
  const key = `${type}:${level}:${model}`;
  if (defCache.has(key)) return defCache.get(key);
  const seen = new Set();
  const search = (o, depth) => {
    if (!o || typeof o !== 'object' || seen.has(o) || depth > 6) return null;
    seen.add(o);
    if (o.model === model && o.hp != null) return o;
    for (const v of Object.values(o)) {
      const hit = search(v, depth + 1);
      if (hit) return hit;
    }
    return null;
  };
  const levels = TOWERS[type]?.levels ?? [];
  // The current level first (the unit may have been sent by an earlier level, so then the rest).
  let def = search(levels[level], 0);
  for (let i = levels.length - 1; !def && i >= 0; i--) def = search(levels[i], 0);
  defCache.set(key, def);
  return def;
}

const detRow = (d) => ['Detection', detectText(d)];

/**
 * Panel info for a selected sub-thing: { name, sub, icon (tower type), towerId, rows: [label, value, cls?][],
 * status, range, inner? } or null if it's gone. `buff` is the parent tower's buff.
 */
export function subInfo(st, sel, buff) {
  if (sel.kind === 'plane') {
    const t = st.towers.get(sel.id);
    if (!t) return null;
    const def = TOWERS[t.type];
    const s = def.levels[t.level];
    const range = s.range * (buff?.range ?? 1);
    const rows = [
      ['Damage', `${s.damage}`],
      ['Cooldown', `${s.cooldown}s`],
      ['Gun range', range !== s.range ? `${r1(range)} <small>(${s.range} base)</small>` : `${s.range}`],
      ['DPS', dpsText(s)],
    ];
    if (s.bomb) rows.push(['Bombs', `${bombText(s.bomb)}, blast ${s.bomb.radius}`]);
    if (s.missile) rows.push(['Missiles', `${missileText(s.missile)}${s.missile.range ? `, range ${s.missile.range}` : ''}`]);
    if (s.ammo) rows.push(['Ammo', `${t.ammo ?? s.ammo} / ${s.ammo} (reload ${s.reload}s)`]);
    if (def.orbit) rows.push(['Flight ring', `${def.orbit} wide, one lap every ${s.lap ?? def.lap}s`]);
    if (def.heli) rows.push(['Flies', `at speed ${def.heli.speed}${s.patrol ? `, inside a patrol zone of ${s.patrol}` : ''}`]);
    rows.push(detRow(detection(t.type, t.level)));
    if (s.spy) rows.push(['Spy ring', 'Shares hidden detection inside its ring', 'yes']);
    return {
      name: def.heli ? 'Helicopter' : 'Plane', sub: `Flown by ${def.name} · Lv ${t.level + 1} ${s.name}`,
      icon: t.type, towerId: t.id, owner: t.owner, rows, status: '', range,
    };
  }

  if (sel.kind === 'trap') {
    const tr = st.traps?.get(sel.id);
    const t = tr && st.towers.get(tr.tower);
    if (!tr || !t) return null;
    const def = TOWERS[t.type];
    if (tr.kind === 'sentry') {
      // Mechanic turrets: `lvl` 100+ is the turret kind (its model index) from the Mechanic's cycle.
      const sn = tr.lvl >= 100 ? def.levels[t.level].sentryCycle?.find((x) => x.model === tr.lvl - 100) ?? def.levels[t.level].sentry
        : def.levels[tr.lvl ?? t.level]?.sentry ?? def.levels[t.level].sentry;
      if (!sn) return null;
      const rows = [
        ['Gun', gunText(sn.gun)],
        ['Range', `${sn.gun.range}`],
      ];
      if (sn.rocket) rows.push(['Rockets', `${sn.rocket.damage} dmg every ${sn.rocket.every}s, blast ${sn.rocket.radius}`]);
      rows.push(['DPS', `${r1(sentryDps(sn))}`]);
      rows.push(['Wears out', `Loses ${sn.decay} HP/s`]);
      rows.push(detRow(unitDetection(sn)));
      if (sn.shield) rows.push(['Stuns', "✔ Shielded: can't be stunned", 'yes']);
      // Solo reads the sim's sentry (real HP); multiplayer only gets the share of health left.
      const hp = tr.maxHp ? tr.hp : (tr.hp ?? 1) * sn.hp;
      const stunned = tr.stunT > 0 || tr.stun;
      const status = `❤ ${Math.ceil(hp)}/${sn.hp} · about ${Math.ceil(hp / sn.decay)}s left${stunned ? ' · 💫 Stunned' : ''}`;
      return { name: sn.name, sub: `Built by ${def.name} (Lv ${t.level + 1})`, icon: t.type, towerId: t.id, owner: t.owner, rows, status, range: sn.gun.range };
    }
    if (tr.kind === 'grave') {
      const s = def.levels[t.level];
      const lvl = tr.lvl || 1;
      const pool = s.raise?.[Math.min(lvl, s.raise.length) - 1];
      const boom = s.boomLvl && lvl >= s.boomLvl ? s.boom : null;
      const rows = [['Level', `${lvl}${s.graveLvl > 1 ? ` of ${s.graveLvl}` : ''}`]];
      if (pool) rows.push(['Raise the Dead', `Summons one of: ${poolText(pool)}`]);
      for (const u of new Set(pool ?? [])) {
        const bits = [`${u.hp.toLocaleString()} HP`, u.gun && gunText(u.gun)].filter(Boolean).join(', ');
        rows.push([u.name, bits]);
      }
      if (boom) rows.push(['Explodes', `${boom.damage} dmg, blast ${boom.radius}`, 'yes']);
      return {
        name: 'Gravestone', sub: `Raised by ${def.name} (Lv ${t.level + 1})`, icon: t.type, towerId: t.id, owner: t.owner, rows,
        status: 'Smash it with Raise the Dead', range: boom?.radius ?? 0,
      };
    }
    return null;
  }

  if (sel.kind === 'unit') {
    const u = st.units.get(sel.id);
    if (!u) return null;
    const t = st.towers.get(u.tower);
    const holo = u.model?.startsWith('holo:');
    const def = u.def ?? (holo ? null : t && findUnitDef(t.type, t.level, u.model));
    const rows = [];
    let range = 0;
    let name = def?.name ?? 'Unit';
    if (holo) {
      const e = ENEMIES[u.model.slice(5)];
      name = `Hologram ${e?.name ?? 'Zombie'}`;
      rows.push(['Attack', 'Rams the first zombie it meets (not bosses)']);
      if (e) rows.push(['Speed', `${e.speed}`]);
    } else if (def) {
      if (def.soldiers > 1) rows.push(['Soldiers', `${def.soldiers}, ${def.hp} HP each`]);
      if (def.speed != null) rows.push(['Speed', `${def.speed}`]);
      if (def.gun) {
        rows.push(['Gun', gunText(def.gun)]);
        rows.push(['Range', limitText(def.gun.range)]);
        if (Number.isFinite(def.gun.range)) range = def.gun.range;
      }
      if (def.cannon) rows.push(['Cannon', cannonText(def.cannon)]);
      if (def.cannon?.range && !range) range = def.cannon.range;
      if (def.heal) {
        rows.push(['Heals', unitExtraText(def), 'yes']);
        range ||= def.heal.range;
      }
      if (def.ram) rows.push(['Rams', `Crashes into zombies${def.ramArmor ? ` (takes ${Math.round(def.ramArmor * 100)}% less damage)` : ''}`]);
      if (def.bump) rows.push(['Bumps', `${def.bump} dmg/s to zombies it touches`]);
      if (def.explode) rows.push(['Explodes', `${def.explode.damage} dmg when destroyed`]);
      const dps = unitDps({ ...def, count: 1 });
      if (dps) rows.push(['DPS', `${dps}`]);
      rows.push(detRow(unitDetection(def)));
    }
    const alive = def?.soldiers > 1 ? ` · ${u.alive}/${def.soldiers} standing` : '';
    return {
      name, sub: t ? `Sent by ${TOWERS[t.type].name} (Lv ${t.level + 1})` : 'Its tower is gone',
      icon: t?.type ?? null, towerId: t?.id ?? null, owner: t?.owner, rows,
      status: `❤ ${Math.ceil(u.hp)}/${u.maxHp}${alive}`, range,
    };
  }
  return null;
}
