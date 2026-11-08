// The player's saved progress: credits, Dimension Shards, towers and alternate forms they own,
// which form each tower uses, and their loadout (hotbar). Stored in localStorage, so it is per browser.
import { BASE_TOWERS, GAME, STARTER_TOWERS, TOWERS } from './config.js';

const KEY = 'td.profile';

// JSON can't hold Infinity (Konami code), so it is saved as 'inf'.
const readCount = (v) => (v === 'inf' ? Infinity : Math.max(0, Math.floor(Number(v) || 0)));
const writeCount = (n) => (n === Infinity ? 'inf' : n);

// Towers that were renamed: old saved key -> new key.
const RENAMED = { bouncer: 'enforcer' };
const renamed = (t) => RENAMED[t] ?? t;

function load() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {}
  data.owned = (data.owned || []).map(renamed);
  data.loadout = (data.loadout || []).map(renamed);
  const owned = new Set(STARTER_TOWERS);
  for (const t of data.owned || []) if (BASE_TOWERS.includes(t)) owned.add(t);
  let loadout = (data.loadout || []).filter((t) => owned.has(t));
  loadout = [...new Set(loadout)].slice(0, GAME.loadoutSize);
  if (!loadout.length) loadout = STARTER_TOWERS.slice(0, GAME.loadoutSize);
  const ownedForms = [...new Set((data.ownedForms || []).filter((t) => TOWERS[t]?.altOf))];
  const forms = {};
  for (const [base, alt] of Object.entries(data.forms || {})) if (ownedForms.includes(alt) && TOWERS[alt].altOf === base) forms[base] = alt;
  return { credits: readCount(data.credits), shards: readCount(data.shards), owned: [...owned], loadout, ownedForms, forms };
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
        owned: this.owned,
        loadout: this.loadout,
        ownedForms: this.ownedForms,
        forms: this.forms,
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
    if (def.shards) {
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

  addCredits(n) {
    this.credits += n;
    this.save();
  },

  addShards(n) {
    if (!n) return;
    this.shards += n;
    this.save();
  },

  // ---- alternate forms

  ownsForm(alt) {
    return this.ownedForms.includes(alt);
  },

  /** The type a base tower is placed as: its equipped alternate form, or itself. */
  formOf(base) {
    return this.forms[base] || base;
  },

  /** Buys an alternate form with Dimension Shards (and equips it). Returns an error message or null. */
  buyForm(alt) {
    const def = TOWERS[alt];
    if (!def?.altOf) return 'Unknown form';
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

  /** The loadout as it is played: every tower swapped for its equipped form. */
  battleLoadout() {
    return this.loadout.map((t) => this.formOf(t));
  },
};
