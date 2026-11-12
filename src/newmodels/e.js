import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, glowThing, helmet, setMuzzle, gunMuzzle, wheels, turret, holdLongGun } from '../models.js';

// Wave 8 crosspath towers (set E). Tower makers take (top, bottom): how far each upgrade path
// has gone (see crosstowers.js), so a 4-2 Slinger looks different from a 2-4 one. Characters face +Z.

/** A cape hanging from the shoulders. */
function cape(h, color, long = 2.6) {
  const c = part(h.torso, boxGeo(2.0, long, 0.12), h.M(color), 0, 0.9 - long / 2, -0.58);
  c.rotation.x = 0.08;
  return c;
}

// ---------------------------------------------------------------------------------------------
// Slinger: a kid with a slingshot.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Crossbower: a hooded hunter with a crossbow.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Gunslinger: a wasteland gunner with a shotgun.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Freezer X: a cryo trooper with a freeze-ray and tanks on its back.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Demolitionist: grenade launcher; rockets up the Top path, an airstrike radio down the Bottom.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Cyberblade: a cyber swordsman (single path, level 0-4).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Sniper X: a marksman with a long rifle.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Sharpshooter: a rifleman; Molotovs and burning bullets down the Bottom path.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Market: a market stall that grows into a shop, an agency or a bank.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Vulcan: a mounted minigun with spinning barrels.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Electricizer: a huge electric cannon on a stand.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Trapper X: a trapper with a sack of spikes (it throws, so it swings).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Bugler: a bugle player (snare drum on the Top path, a commander's cape on the Bottom).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Recon Base: a garage with a radar dish.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Elite: an armored plasma trooper.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Businessman: a suit, a briefcase and a pistol.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Mechanic: overalls, a toolbelt and a nailgun.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Surveyor: a drone operator with a controller and an antenna pack.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Lightbeamer: a high-tech beam gunner.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Units: Mercenary, Recon Base units and Surveyor drones.
// ---------------------------------------------------------------------------------------------

/** A small soldier for a squad (humanoid scaled down) with a gun pointing forward. */
function squadMember(look) {
  const h = makeHumanoid({ skin: look.skin ?? 0xc68642, shirt: look.shirt, pants: look.pants ?? 0x263238, arms: look.shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, look.helmet ?? 0x37474f);
  if (look.visor) part(h.head, boxGeo(1.2, 0.3, 0.08), glow(h, look.visor), 0, 0.72, 0.64);
  const gun = holdLongGun(h, look.gun ?? 2.2, M(0x212121));
  if (look.tube) part(gun, boxGeo(0.6, 1.2, 0.6), M(0x4b5320), 0, -0.6, 0);
  return h;
}

function squad(count, look, scale = 0.6) {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = squadMember(look(i));
    h.root.scale.setScalar(scale);
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.4;
  u.tracer = 0xffe082;
  return u;
}

// The Sky-drones and the Bliss of Finality are built with the vehicle kit (airunits.js).

export const UNIT_MODELS_E = {
  gsMerc: (n = 1) => squad(n, () => ({ shirt: 0x6d4c41, helmet: 0x3e2723 })),
  rbOperative: (n = 1) => squad(n, () => ({ shirt: 0x556b2f, helmet: 0x4b5320 })),
  rbOperative2: (n = 1) => squad(n, () => ({ shirt: 0x37474f, helmet: 0x263238, visor: 0x76ff03 })),
  rbPrivate: (n = 1) => squad(n, () => ({ shirt: 0x1b5e20, helmet: 0x212121, visor: 0xffab00 })),
  rbSolemn: (n = 1) => squad(n, (i) => ({ shirt: 0x212121, helmet: 0x111111, visor: [0xff1744, 0x00e5ff, 0xffab00, 0x76ff03][i % 4], gun: i === 1 ? 3.2 : 2.2, tube: i === 3 }), 0.65),
};

// ---------------------------------------------------------------------------------------------
// Mechanic turrets (sentries): `kind` is the turret's model index (see crosstowers.js).
// ---------------------------------------------------------------------------------------------

const TURRET_LOOK = [
  { color: 0x757575, barrels: 1, len: 1.0, light: 0x76ff03 }, // M1
  { color: 0x546e7a, barrels: 1, len: 1.5, light: 0x00e5ff }, // M2
  { color: 0x455a64, barrels: 2, len: 1.6, light: 0xffab00 }, // M3
  { color: 0x263238, barrels: 4, len: 1.8, light: 0xff1744 }, // M4
  { color: 0x5d4037, barrels: 1, len: 1.2, light: 0xff6d00, big: true }, // Detonator
  { color: 0x4a148c, barrels: 1, len: 1.4, light: 0x76ff03, orb: true }, // Plasmator
  { color: 0x1b5e20, barrels: 1, len: 2.6, light: 0xffea00 }, // Hunter
  { color: 0x0277bd, tesla: true, light: 0x80d8ff }, // M1 Tesla
  { color: 0x01579b, tesla: true, light: 0x18ffff, big: true }, // M2 Tesla
];

export function makeMechTurret(kind) {
  const look = TURRET_LOOK[kind] ?? TURRET_LOOK[0];
  const u = makeThing();
  const { M } = u;
  for (const ang of [0, 2.1, 4.2]) {
    const leg = part(u.body, boxGeo(0.2, 1.4, 0.2), M(0x424242), Math.sin(ang) * 0.55, 0.6, Math.cos(ang) * 0.55);
    leg.rotation.set(Math.cos(ang) * 0.4, 0, -Math.sin(ang) * 0.4);
  }
  const t = turret(u, 1.35);
  const big = look.big ? 1.3 : 1;
  if (look.tesla) {
    // Tesla: a coil with a glowing orb on top
    part(t, boxGeo(0.8 * big, 0.5, 0.8 * big), M(look.color), 0, 0, 0);
    for (let i = 0; i < 3; i++) part(t, boxGeo(0.55 * big, 0.12, 0.55 * big), M(0xb87333), 0, 0.35 + i * 0.3, 0);
    part(t, boxGeo(0.6 * big, 0.6 * big, 0.6 * big), glow(u, look.light), 0, 1.4, 0);
    gunMuzzle(u, t, 0, 1.4, 0);
  } else {
    part(t, boxGeo(1.0 * big, 0.7 * big, 1.2 * big), M(look.color), 0, 0.25, 0);
    part(t, boxGeo(0.45, 0.18, 0.08), glow(u, look.light), 0, 0.45 * big, 0.62 * big);
    for (let i = 0; i < look.barrels; i++) {
      const x = look.barrels === 1 ? 0 : -0.18 + (i % 2) * 0.36;
      const y = 0.25 + (look.barrels === 4 ? (i < 2 ? -0.12 : 0.12) : 0);
      part(t, boxGeo(0.16, 0.16, look.len), M(0x212121), x, y, 0.6 * big + look.len / 2);
    }
    if (look.orb) part(t, boxGeo(0.4, 0.4, 0.4), glow(u, look.light), 0, 0.25, 0.6 * big + look.len);
    gunMuzzle(u, t, 0, 0.25, 0.6 * big + look.len);
  }
  u.tracer = look.light;
  u.height = 2.6;
  return u;
}

/** Tower model makers by crosspath form type, taking (top, bottom). */
export const CROSS_MODELS = {
};

/** Plain-level tower models (no crosspathing). */
export const TOWER_MODELS_E = {
};
