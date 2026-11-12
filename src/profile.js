// The player's saved progress: credits, Dimension Shards, Gems (Hardcore), the modes beaten, towers and alternate forms they own,
// which form each tower uses, golden perks they own / have switched on, tower XP (tower levels and
// evolution levels), and their loadout (hotbar). Stored in localStorage, so it is per browser.
import { CONTRACTS } from './lastlaugh.js';
import { BASE_TOWERS, DIFFICULTIES, EVENT_TOWERS, EVOLVED_TOWERS, GAME, HARDCORE_NEEDS, STARTER_TOWERS, TOWERS, TOWER_MAX_LEVEL, goldOf, xpKey, xpToNext } from './config.js';

const KEY = 'td.profile';

// JSON can't hold Infinity (Konami code), so it is saved as 'inf'.
const readCount = (v) => (v === 'inf' ? Infinity : Math.max(0, Math.floor(Number(v) || 0)));
const writeCount = (n) => (n === Infinity ? 'inf' : n);

// Towers that were renamed: old saved key -> new key.
const RENAMED = { bouncer: 'enforcer', riflemanMilitant: 'mercMilitant' };
const renamed = (t) => RENAMED[t] ?? t;
// Towers that used to be their own tower and are now a golden perk: old key -> the tower it's golden for.
const BECAME_GOLD = { goldenZed: 'zed' };

function load() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {}
  data.owned = (data.owned || []).map(renamed);
  data.loadout = (data.loadout || []).map(renamed);
  // Towers that became golden perks (Golden Zed -> golden Zed): owning the old tower gives you the
  // normal tower plus the golden perk, switched on.
  for (const [t, base] of Object.entries(BECAME_GOLD)) {
    if (!data.owned.includes(t)) continue;
    data.owned = data.owned.map((o) => (o === t ? base : o));
    data.loadout = data.loadout.map((o) => (o === t ? base : o));
    data.ownedGold = [...new Set([...(data.ownedGold || []), t])];
    data.goldOn = [...new Set([...(data.goldOn || []), t])];
  }
  const owned = new Set(STARTER_TOWERS);
  // Towers that became alternate forms of a new parent (Tesla -> Paralyzer, Medic -> Doctor...):
  // owning the old tower gives you the new parent and keeps the old one as an owned, equipped form.
  const reparented = {};
  data.ownedForms = data.ownedForms || [];
  data.forms = data.forms || {};
  for (const t of data.owned) {
    const base = TOWERS[t]?.altOf;
    if (!base || !(BASE_TOWERS.includes(base) || EVENT_TOWERS.includes(base))) continue;
    reparented[t] = base;
    owned.add(base);
    if (!data.ownedForms.includes(t)) data.ownedForms.push(t);
    // Keep whichever form was equipped (a Tesla's own Volt form stays Volt).
    if (data.loadout.includes(t) && !data.forms[base]) data.forms[base] = data.forms[t] ?? t;
    delete data.forms[t];
  }
  data.loadout = data.loadout.map((t) => reparented[t] ?? t);
  for (const t of data.owned || []) if (BASE_TOWERS.includes(t) || EVENT_TOWERS.includes(t)) owned.add(t);
  let loadout = (data.loadout || []).filter((t) => owned.has(t));
  loadout = [...new Set(loadout)].slice(0, GAME.loadoutSize);
  if (!loadout.length) loadout = STARTER_TOWERS.slice(0, GAME.loadoutSize);
  const ownedForms = [...new Set((data.ownedForms || []).map(renamed).filter((t) => TOWERS[t]?.altOf))];
  const forms = {};
  // A form follows its alt's current base, so one moved to another base (Militant) stays chosen.
  for (const alt of Object.values(data.forms || {}).map(renamed)) if (ownedForms.includes(alt) || (TOWERS[alt]?.altOf && TOWERS[alt].shards === 0)) forms[TOWERS[alt].altOf] = alt;
  const ownedGold = [...new Set((data.ownedGold || []).filter((t) => TOWERS[t]?.goldOf))];
  const goldOn = (data.goldOn || []).filter((t) => ownedGold.includes(t));
  const xp = {};
  for (const [t, v] of Object.entries(data.xp || {})) if (TOWERS[t]) xp[t] = readCount(v);
  const perks = [...new Set((data.perks || []).filter((k) => typeof k === 'string'))];
  // Modes beaten (Hardcore unlocks once every one in HARDCORE_NEEDS is). Saves from before this was
  // kept: a mode counts as beaten if you own what winning it gives (its tower or upgrade perk).
  let beaten = Array.isArray(data.beaten) ? data.beaten.filter((k) => DIFFICULTIES[k]) : null;
  if (!beaten) beaten = Object.keys(DIFFICULTIES).filter((k) => (DIFFICULTIES[k].unlock && (owned.has(DIFFICULTIES[k].unlock) || ownedForms.includes(DIFFICULTIES[k].unlock))) || (DIFFICULTIES[k].perk && perks.includes(DIFFICULTIES[k].perk)));
  // Contracts (lastlaugh.js): the ones accepted (they change the games they fit) and the ones finished.
  const cl = (v) => (Array.isArray(v) ? [...new Set(v.filter((k) => CONTRACTS[k]))] : []);
  const contracts = { accepted: cl(data.contracts?.accepted), done: cl(data.contracts?.done) };
  return { contracts, credits: readCount(data.credits), shards: readCount(data.shards), gems: readCount(data.gems), owned: [...owned], loadout, ownedForms, forms, ownedGold, goldOn, xp, perks, beaten: [...new Set(beaten)] };
}

export const profile = {
  ...load(),
  listeners: new Set(),

  save() {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        credits: writeCount(this.credits),
        shards: writeCount(this.shards),
        gems: writeCount(this.gems),
        beaten: this.beaten,
        owned: this.owned,
        loadout: this.loadout,
        ownedForms: this.ownedForms,
        forms: this.forms,
        ownedGold: this.ownedGold,
        goldOn: this.goldOn,
        xp: this.xp,
        perks: this.perks,
        contracts: this.contracts,
      }),
    );
    for (const fn of this.listeners) fn(this);
  },
  onChange(fn) {
    this.listeners.add(fn);
  },

  owns(type) {
    return this.owned.includes(type);
  },

  /** Returns an error message, or null when bought. */
  buy(type) {
    const def = TOWERS[type];
    if (!def || def.altOf) return 'Unknown tower';
    if (this.owns(type)) return `You already own the ${def.name}`;
    if (def.event) return `The ${def.name} is an event tower: it can't be bought`;
    if (def.gems) {
      // Necromancer, Hacker: bought with Gems (only Hardcore pays them).
      if (this.gems < def.gems) return `Need ${def.gems - this.gems} more Gems (earn them in Hardcore)`;
      this.gems -= def.gems;
    } else if (def.shards) {
      if (this.shards < def.shards) return `Need ${def.shards - this.shards} more Dimension Shard${def.shards - this.shards === 1 ? '' : 's'}`;
      this.shards -= def.shards;
    } else {
      if (this.credits < def.price) return `Need ${def.price - this.credits} more credits`;
      this.credits -= def.price;
    }
    this.owned.push(type);
    if (this.loadout.length < GAME.loadoutSize) this.loadout.push(type);
    this.save();
    return null;
  },

  /** Adds an owned tower to the loadout, or removes it if it's already there. */
  toggleLoadout(type) {
    const i = this.loadout.indexOf(type);
    if (i >= 0) {
      if (this.loadout.length === 1) return 'You need at least one tower';
      this.loadout.splice(i, 1);
    } else {
      if (!this.owns(type)) return "You don't own that tower yet";
      if (this.loadout.length >= GAME.loadoutSize) return `Loadout is full (${GAME.loadoutSize} max). Remove one first.`;
      this.loadout.push(type);
    }
    this.save();
    return null;
  },

  /** Konami code: unlocks every event tower. Returns how many were new. */
  unlockEvents() {
    const added = EVENT_TOWERS.filter((t) => !this.owns(t));
    this.owned.push(...added);
    this.save();
    return added.length;
  },

  /** Accepts contract `key`, or drops it if it's already accepted. */
  toggleContract(key) {
    if (!CONTRACTS[key]) return;
    const a = this.contracts.accepted;
    if (a.includes(key)) a.splice(a.indexOf(key), 1);
    else a.push(key);
    this.save();
  },

  /** A contract's goal was reached in a game: it's done (and no longer accepted). True if it was accepted. */
  finishContract(key) {
    const a = this.contracts.accepted;
    if (!a.includes(key)) return false;
    a.splice(a.indexOf(key), 1);
    if (!this.contracts.done.includes(key)) this.contracts.done.push(key);
    this.save();
    return true;
  },

  /** Gives a tower or alternate form for free (mode win rewards). Returns true if it was new. */
  grant(type) {
    if (!TOWERS[type]) return false;
    if (TOWERS[type].altOf) {
      if (this.ownedForms.includes(type)) return false;
      this.ownedForms.push(type);
      if (this.owns(TOWERS[type].altOf)) this.forms[TOWERS[type].altOf] = type; // equip it right away
      this.save();
      return true;
    }
    if (this.owns(type)) return false;
    this.owned.push(type);
    if (this.loadout.length < GAME.loadoutSize) this.loadout.push(type);
    this.save();
    return true;
  },

  /** Upgrade perks won from modes (Insane: 'bliss', Recon Base's Bliss of Finality). */
  hasPerk(key) {
    return this.perks.includes(key);
  },

  /** Gives an upgrade perk. Returns true if it was new. */
  grantPerk(key) {
    if (this.hasPerk(key)) return false;
    this.perks.push(key);
    this.save();
    return true;
  },

  addCredits(n) {
    this.credits += n;
    this.save();
  },

  addShards(n) {
    if (!n) return;
    this.shards += n;
    this.save();
  },

  addGems(n) {
    if (!n) return;
    this.gems += n;
    this.save();
  },

  /** Remembers that mode `key` was beaten. Returns true the first time. */
  markBeaten(key) {
    if (this.beaten.includes(key)) return false;
    this.beaten.push(key);
    this.save();
    return true;
  },

  /** Can mode `key` be played (Hardcore: every mode it needs is beaten)? */
  modeOpen(key) {
    const need = DIFFICULTIES[key]?.needs;
    return !need || need.every((k) => this.beaten.includes(k));
  },

  /** The modes mode `key` still needs beaten (names). */
  modeMissing(key) {
    return (DIFFICULTIES[key]?.needs ?? []).filter((k) => !this.beaten.includes(k)).map((k) => DIFFICULTIES[k].name);
  },

  // ---- alternate forms

  ownsForm(alt) {
    return TOWERS[alt]?.shards === 0 || this.ownedForms.includes(alt); // free forms are unlocked by default
  },

  /** The type a base tower is placed as: its equipped alternate form, or itself. */
  formOf(base) {
    return this.forms[base] || base;
  },

  /** Buys an alternate form with Dimension Shards (and equips it). Returns an error message or null. */
  buyForm(alt) {
    const def = TOWERS[alt];
    if (!def?.altOf) return 'Unknown form';
    if (def.evolved) return `The ${def.name} is unlocked with tower XP`;
    if (def.winReward && !this.ownsForm(alt)) return `The ${def.name} can't be bought: ${def.winReward} to unlock it`;
    if (this.ownsForm(alt)) return `You already own the ${def.name}`;
    if (!this.owns(def.altOf)) return `Unlock the ${TOWERS[def.altOf].name} first`;
    if (this.shards < def.shards) return `Need ${def.shards - this.shards} more Dimension Shard${def.shards - this.shards === 1 ? '' : 's'}`;
    this.shards -= def.shards;
    this.ownedForms.push(alt);
    this.forms[def.altOf] = alt;
    this.save();
    return null;
  },

  /** Picks which form `base` uses (`type` is the base itself or an owned alternate). */
  setForm(base, type) {
    if (type === base) delete this.forms[base];
    else if (this.ownsForm(type) && TOWERS[type].altOf === base) this.forms[base] = type;
    else return "You don't own that form yet";
    this.save();
    return null;
  },

  // ---- golden perks (golden versions of one specific tower or form)

  ownsGold(gold) {
    return this.ownedGold.includes(gold);
  },

  /** Is golden perk `gold` switched on (it replaces its tower / form when that one is used)? */
  usesGold(gold) {
    return this.goldOn.includes(gold);
  },

  /** Owns the tower or form a golden perk is for (needed before buying the perk). */
  ownsGoldBase(gold) {
    const of = TOWERS[gold].goldOf;
    return TOWERS[of].altOf ? this.ownsForm(of) : this.owns(of);
  },

  /** Buys a golden perk with credits (and switches it on). Returns an error message or null. */
  buyGold(gold) {
    const def = TOWERS[gold];
    if (!def?.goldOf) return 'Unknown golden perk';
    if (this.ownsGold(gold)) return `You already own the ${def.name}`;
    if (!this.ownsGoldBase(gold)) return `Unlock the ${TOWERS[def.goldOf].name} first`;
    if (this.credits < def.price) return `Need ${def.price - this.credits} more credits`;
    this.credits -= def.price;
    this.ownedGold.push(gold);
    this.goldOn.push(gold);
    this.save();
    return null;
  },

  /** Switches an owned golden perk on or off. */
  toggleGold(gold) {
    if (!this.ownsGold(gold)) return "You don't own that golden perk yet";
    const i = this.goldOn.indexOf(gold);
    if (i >= 0) this.goldOn.splice(i, 1);
    else this.goldOn.push(gold);
    this.save();
    return null;
  },

  // ---- tower XP: tower levels, and evolution levels of evolved towers

  /** Tower level of `type` (or its evolution level, for an evolved tower): { level, xp, need, max }. */
  levelOf(type) {
    let xp = this.xp[xpKey(type)] || 0;
    let level = 1;
    while (level < TOWER_MAX_LEVEL && xp >= xpToNext(level)) xp -= xpToNext(level++);
    const max = level >= TOWER_MAX_LEVEL;
    return { level, xp: max ? 0 : xp, need: max ? 0 : xpToNext(level), max };
  },

  /** Adds XP: { type: amount }. */
  addXp(gains) {
    let any = false;
    for (const [type, n] of Object.entries(gains)) {
      if (!(n > 0) || !TOWERS[type]) continue;
      const k = xpKey(type);
      this.xp[k] = (this.xp[k] || 0) + Math.round(n);
      any = true;
    }
    if (any) this.save();
  },

  /** Evolution levels of the evolved towers you own: { type: level } (the sim checks upgrades against it). */
  evoLevels() {
    const out = {};
    for (const t of EVOLVED_TOWERS) if (this.ownsForm(t)) out[t] = this.levelOf(t).level;
    for (const k of this.perks) out[`perk:${k}`] = 1; // won upgrade perks ride along (the sim checks next.perk)
    return out;
  },

  /** Can evolution `evo` be unlocked yet (its tower is at the needed level)? */
  evoReady(evo) {
    const def = TOWERS[evo];
    return this.levelOf(def.evoFrom).level >= def.evoLevel;
  },

  /** Unlocks an evolved tower with credits and Dimension Shards (and equips it). Returns an error message or null. */
  buyEvo(evo) {
    const def = TOWERS[evo];
    if (!def?.evolved) return 'Unknown evolution';
    if (this.ownsForm(evo)) return `You already own the ${def.name}`;
    if (!this.owns(def.altOf)) return `Unlock the ${TOWERS[def.altOf].name} first`;
    if (TOWERS[def.evoFrom].altOf && !this.ownsForm(def.evoFrom)) return `Unlock the ${TOWERS[def.evoFrom].name} first`;
    if (!this.evoReady(evo)) return `Get the ${TOWERS[def.evoFrom].name} to Lv ${def.evoLevel} first`;
    if (this.credits < def.price) return `Need ${def.price - this.credits} more credits`;
    if (this.shards < def.shards) return `Need ${def.shards - this.shards} more Dimension Shard${def.shards - this.shards === 1 ? '' : 's'}`;
    this.credits -= def.price;
    this.shards -= def.shards;
    this.ownedForms.push(evo);
    this.forms[def.altOf] = evo;
    this.save();
    return null;
  },

  /**
   * Plays `base` as variant `type`: the default tower, a form, an evolution or a golden perk.
   * Golden perks are switched on; picking a form whose golden perk is on switches that perk off.
   */
  useVariant(base, type) {
    const def = TOWERS[type];
    const form = def.goldOf ?? type;
    const err = this.setForm(base, form);
    if (err) return err;
    if (def.goldOf) {
      if (!this.ownsGold(type)) return "You don't own that golden perk yet";
      if (!this.usesGold(type)) this.goldOn.push(type);
    } else {
      const g = goldOf(type);
      if (g && this.usesGold(g)) this.goldOn.splice(this.goldOn.indexOf(g), 1);
    }
    this.save();
    return null;
  },

  /** The type a base tower is played as: its equipped form, swapped for its golden perk if that is on. */
  playedAs(base) {
    const form = this.formOf(base);
    const gold = goldOf(form);
    return gold && this.usesGold(gold) ? gold : form;
  },

  /** The loadout as it is played: every tower swapped for its equipped form (or that form's golden perk). */
  battleLoadout() {
    return this.loadout.map((t) => this.playedAs(t));
  },
};
