// Hardcore mode (2026-11-09 user spec): 50 brutal waves cherry-picked from seven wiki pages the user
// gave (Tower Heroes Bleak Barrens Hard, Tower Battles Survival + its Hidden Wave, TDS Fallen and
// Void Core, TDX Ultra Nightmare, Tower Blitz Ranked Up Expert and Silly TD Hard). The last six
// waves are the six games' final bosses: Void (Tower Battles), the Beholder (Silly TD), Demise
// (Tower Heroes), Chronos (Tower Blitz), the Void Reaver + Void Caster (TDS) and the Emperor (TDX).
// Unlocked once every other mode is beaten; pays Gems; up to 6 players.
//
// Enemy keys: th* Tower Heroes, vc* TDS Void Core, tx* TDX, ru* Tower Blitz Ranked Up. Enemies an
// earlier mode already has (Fallen, Silly TD, Tower Battles) are copied into their own hc* keys
// (hcFRusher = a copy of fRusher...), with every enemy they summon, cage or turn into copied too,
// so Hardcore never uses another mode's enemies (see cloneEnemy).
//
// Conversions (the user's choices or the existing modes' rules):
//  - Health is exact (DIFFICULTIES.hardcore.flatHp). Tower Heroes health is the Hard value (x2.1,
//    except the Big Demon Slime and Dark Skeleton, which don't grow). TDX health AND shields are
//    1/10 of the wiki numbers (user's choice), and TDX damage to towers is 1/100 (TDX towers have
//    far more health than these).
//  - "X + Y shield" = `osh`: an extra shield pool that takes hits first (see Sim.damage).
//  - Speed: Tower Heroes, Tower Battles (studs/s), TDS and Tower Blitz x3, TDX x3.6 (capped at 60),
//    Silly TD copies keep Expert's x0.45.
//  - TDS defense % = armor; Tower Blitz defense = flat `defense`; resistances as listed.
//  - Rewards (hR) and base damage (hD) use the Insane curves for every Hardcore enemy.
//  - Ability timings, ranges and stun lengths the wiki didn't give are guesses.

export const hR = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
export const hD = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));

// Enemies copied from earlier modes (source key -> 'hc' + Source). Everything a copied enemy
// summons, cages, splits into or turns into must be in this list too.
const COPIED = [
  // Tower Battles (Void mode's v* enemies are the Tower Battles Survival roster)
  'vLava', 'vPetrified', 'vToxic', 'vLightning', 'vSlime', 'vGoo', 'vMystery2', 'vBoss2', 'vHiddenBoss', 'vBoss3', 'vBoss4',
  'vNecroBoss', 'vFireSpirit', 'vGuardian', 'vFalseVoid', 'vSpawn1', 'vSpawn2', 'vSpawn3', 'vSpawn4',
  // TDS Fallen (Hard mode)
  'fRusher', 'fRusherBroken', 'fPossessed', 'fPossessedGhost', 'fNecrotic', 'fCorrupted', 'fJester', 'fShield', 'fShieldBroken',
  'fHonorGuard', 'fTank', 'fGuardian', 'fSummoner', 'fHero', 'fAngel', 'fKing', 'fGiant', 'fNecro', 'fSkeleton', 'fHazmat',
  'breaker4', 'breaker3', 'breaker2', 'breaker',
  // Silly TD Hard (Expert mode)
  'xCharger', 'xUndercharged', 'xUnderchargedBare', 'xOvercharged', 'xViorb', 'xViodrop', 'xVioGunner', 'xCloaker', 'xCloakerBare',
  'xFlagBot', 'xVioRusher', 'xShieldBot', 'xShieldBotBare', 'xTimeRunner', 'xTimeTitan', 'xTimeCrystal', 'xFragment', 'xTimeShard',
  'xTimeShardBare', 'xDoomelist', 'xDeathAngel', 'xRebirther', 'xScarlet', 'xBeholder', 'xBeholderField',
];
export const hcKey = (src) => `hc${src[0].toUpperCase()}${src.slice(1)}`;

/** Deep-copies `v`, swapping every copied enemy key for its Hardcore copy. */
function remap(v, map) {
  if (typeof v === 'string') return map[v] ?? v;
  if (Array.isArray(v)) return v.map((x) => remap(x, map));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remap(x, map)]));
  return v;
}

// Tweaks to the copies (anything not listed stays as in the earlier mode, except reward / damage).
const COPY_TWEAKS = {
  // The Tower Battles Void is just "Void" here (Void mode calls it the False Void).
  vFalseVoid: { name: 'Void', barName: 'VOID', barSub: 'Tower Battles', bar: true,
    arrive: { title: 'VOID', sub: '"I guess... I\'ll just have to kill you MYSELF!"',
      toast: '🟣 FINAL BOSS 1 of 6: the Tower Battles VOID! His scream and stomps stun ground towers for 7s and crush units. Air and cliff towers are safe.' } },
  xBeholder: { bar: true, barName: 'THE BEHOLDER', barSub: 'Silly TD',
    intro: '👁️ FINAL BOSS 2 of 6: the BEHOLDER, time itself! At low health it pulls you into the Beholder\'s Field (your towers are refunded).' },
  // Beating it in its Field brings everyone back to the real map (towers refunded again).
  xBeholderField: { bar: true, barName: 'THE BEHOLDER', barSub: 'Beholder\'s Field', endShift: true },
  fKing: { bar: true, barName: 'THE FALLEN KING', barSub: 'TDS Fallen',
    intro: '👑 BOSS: THE FALLEN KING! Sword swings and comets stun your towers. He drops $10,000 for every 5% of his health!' },
};

/** Builds the Hardcore copies of earlier modes' enemies into `ENEMIES`. */
function copyEnemies(ENEMIES) {
  const map = Object.fromEntries(COPIED.map((k) => [k, hcKey(k)]));
  for (const src of COPIED) {
    const d = remap(ENEMIES[src], map);
    d.reward = d.reward === 0 ? 0 : hR(d.hp);
    if (d.damage < 1e5) d.damage = d.damage ? hD(d.hp) : 0;
    Object.assign(d, COPY_TWEAKS[src]);
    ENEMIES[map[src]] = d;
  }
}

// Shortcuts for the new enemies below.
const th = 2.1; // Tower Heroes Hard health multiplier
const X = 3.6; // TDX speed multiplier
const tx = (s) => Math.min(60, Math.round(s * X * 10) / 10);

/** A new Hardcore enemy: reward and base damage from its health unless given. */
const E = (name, hp, speed, extra = {}) => ({ name, hp, speed, reward: hR(hp + (extra.osh ?? 0)), damage: hD(hp + (extra.osh ?? 0)), scale: 1, ...extra });

const NEW = {
  // ------------------------------------------------------------------ Tower Heroes: Bleak Barrens (Hard)
  // model: creature models in src/newmodels/hc.js; hk: the outfit kit for humanoid ones (hcParts).
  thGhost: E('Ghost', 15 * th, 18, { model: 'ghost', h: 3.4, skin: 0xd6d9dc, hidden: true,
    intro: '💀 HARDCORE. 50 waves from seven games. Ghosts are hidden: bring hidden detection!' }),
  thSpider: E('Spider', 17 * th, 18, { model: 'spider', h: 2.4, skin: 0x1c1c1c, intro: '🕷️ Spiders: very fast.' }),
  thRune: E('Rune', 20 * th, 9, { model: 'hcRune', h: 3.2, skin: 0xaa00ff, glyph: 1 }),
  thBigRune: E('Big Rune', 700 * th, 6.9, { model: 'hcRune', h: 3.2, scale: 1.5, skin: 0xaa00ff, glyph: 2 }),
  thAncientRune: E('Ancient Rune', 1800 * th, 7.5, { model: 'hcRune', h: 3.2, scale: 1.8, skin: 0xd500f9, glyph: 3 }),
  // Dark Matter comes disguised as a small enemy and turns into Dark Matter when the disguise dies.
  thDMSpider: E('Spider?', 17 * th, 18, { model: 'spider', h: 2.4, skin: 0x1c1c1c, phase2: 'thDarkMatter',
    intro: '🫥 Some of these little enemies are Dark Matter in disguise! Kill the disguise and a hidden blob comes out.' }),
  thDMGhost: E('Ghost?', 15 * th, 18, { model: 'ghost', h: 3.4, skin: 0xd6d9dc, hidden: true, phase2: 'thDarkMatter' }),
  thDarkMatter: E('Dark Matter', 50 * th, 2.4, { model: 'hcBlob', h: 2, skin: 0x0d1b3a, hidden: true }),
  thBDMReaper: E('Reaper?', 450 * th, 6, { model: 'hcReaper', h: 4, skin: 0x6e6e6e, cloak: 0x6e6e6e, hoodC: 0x151515, eyeC: 0xffffff, hidden: true, phase2: 'thBigDarkMatter' }),
  thBigDarkMatter: E('Big Dark Matter', 700 * th, 2.4, { model: 'hcBlob', h: 2, scale: 1.7, skin: 0x0d1b3a, hidden: true }),
  // Skeleton Rogues swing their sword to dash ahead and stun the towers around them.
  thRogue: E('Skeleton Rogue', 200 * th, 6, { scale: 0.95, skin: 0xf5f0dc, shirt: 0xf5f0dc, pants: 0xf5f0dc, face: 'fallenSkull',
    hk: { skull: 1, horns: 0xeeeeee, scarf: 0x4a148c, dagger: 0x64b5f6 },
    sprint: { every: 7, time: 1, speed: 4, stun: { range: 7, time: 1.5 } },
    intro: '💀 Skeleton Rogues dash forward and stun the towers they pass!' }),
  thBigRogue: E('Big Skeleton Rogue', 1800 * th, 6, { scale: 1.3, skin: 0xf5f0dc, shirt: 0xf5f0dc, pants: 0xf5f0dc, face: 'fallenSkull',
    hk: { skull: 1, horns: 0xeeeeee, scarf: 0x6a1b9a, cape: 0x4a148c, bigSword: 0x9e9e9e },
    sprint: { every: 7, time: 1, speed: 5, stun: { range: 8, time: 2 } } }),
  thEliteRogue: E('Elite Skeleton Rogue', 10000 * th, 6.9, { scale: 1.4, skin: 0x1c1c1c, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'fallenSkull',
    hk: { skull: 1, horns: 0x111111, cape: 0x6a1b9a, armor: 0x263238, eyes: 0xd500f9, flameHead: 0x80d8ff, bigSword: 0xd500f9, swordGlow: 1 },
    sprint: { every: 6, time: 1, speed: 6, stun: { range: 9, time: 2.5 } } }),
  thDarkSkeleton: E('Dark Skeleton', 28000, 2.7, { scale: 2.2, skin: 0x37474f, shirt: 0x37474f, pants: 0x37474f, face: 'fallenSkull', hk: { skull: 1 },
    intro: '🦴 Dark Skeletons: tall, slow and very tough.' }),
  // Seers and Overseers stun towers anywhere on the map.
  thSeer: E('Seer', 700 * th, 13.5, { model: 'hcEye', h: 3.6, skin: 0x111111, iris: 0x9c27b0, veins: 0xaa00ff,
    moves: { first: 2, every: 4, list: [{ key: 'gaze', n: 1, stun: 1.5 }] },
    intro: '👁️ Seers stun one of your towers ANYWHERE on the map every 4 seconds!' }),
  thOverseer: E('Overseer', 1900 * th, 9, { scale: 1.2, skin: 0x111111, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'blank',
    hk: { armor: 0x1c1c1c, trim: 0x9c27b0, bigEye: 0x9c27b0 },
    moves: { first: 2, every: 3, list: [{ key: 'gaze', n: 1, stun: 1.5 }] },
    intro: '👁️ Overseers stun a tower anywhere on the map every 3 seconds.' }),
  thCrackedSentry: E('Void Sentry (Cracked)', 1100 * th, 3, { model: 'hcSentry', h: 3, scale: 1.2, skin: 0x9e9e9e, cracked: 1 }),
  thBigGolem: E('Big Dark Golem', 3000 * th, 3.6, { model: 'hcGolem', h: 5.5, scale: 1.1, skin: 0x1a2238, eyeC: 0xaa00ff }),
  thGiantGolem: E('Giant Dark Golem', 10000 * th, 2.7, { model: 'hcGolem', h: 5.5, scale: 1.6, skin: 0x141a2e, eyeC: 0xd500f9, spiky: 1,
    intro: '🪨 Giant Dark Golems: huge and very tough.' }),
  thWingedReaper: E('Winged Reaper', 2000 * th, 12, { model: 'hcReaper', h: 4, skin: 0x4a148c, cloak: 0x4a148c, hoodC: 0x2a0a3c, eyeC: 0xff80ab, wingC: 0x2a0a3c, hidden: true,
    intro: '🦇 Winged Reapers: fast and hidden.' }),
  thDevilReaper: E('Devil Reaper', 5000 * th, 7.5, { model: 'hcReaper', h: 4, scale: 1.15, skin: 0xb71c1c, cloak: 0x8b1a1a, hoodC: 0x4a0d0d, eyeC: 0xff1744, wingC: 0x4a0d0d, hornC: 0xe0d6c0, hidden: true }),
  thBigReaper: E('Big Reaper', 10000 * th, 6, { model: 'hcReaper', h: 4, scale: 1.5, skin: 0x424242, cloak: 0x424242, hoodC: 0x111111, eyeC: 0xff80ab, hornC: 0xe0d6c0, hidden: true }),
  thDemonSlime: E('Demon Slime', 500 * th, 3.6, { model: 'hcSlime', h: 3, scale: 1.2, skin: 0x111111, eyeC: 0xaa00ff }),
  thBigDemonSlime: E('Big Demon Slime', 25000, 3.45, { model: 'hcSlime', h: 3, scale: 2.4, skin: 0x111111, eyeC: 0xaa00ff, grin: 1 }),
  thSkullGhost: E('Void Skull Ghost', 2000 * th, 4.5, { model: 'hcSkull', h: 3.4, skin: 0x2b2533, eyeC: 0xaa00ff, hidden: true }),
  thBigSkullGhost: E('Big Void Skull Ghost', 5000 * th, 7.5, { model: 'hcSkull', h: 3.4, scale: 1.4, skin: 0x2b2533, eyeC: 0xaa00ff, crystals: 1, hidden: true }),
  // Skeleworms come in segments: each part has to die before the next one starts.
  thWorm1: E('Skeleworm', 1000 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.2, skin: 0xfdd835, seg: 'head', rib: 0xfff59d, phase2: 'thWorm2',
    intro: '🐛 A Skeleworm! It comes in 5 parts: kill one and the next one keeps going.' }),
  thWorm2: E('Skeleworm', 1200 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.2, skin: 0xfdd835, rib: 0xfff59d, phase2: 'thWorm3' }),
  thWorm3: E('Skeleworm', 1400 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.2, skin: 0xfdd835, rib: 0xfff59d, phase2: 'thWorm4' }),
  thWorm4: E('Skeleworm', 1600 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.2, skin: 0xfdd835, rib: 0xfff59d, phase2: 'thWorm5' }),
  thWorm5: E('Skeleworm', 1800 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.2, skin: 0xfdd835, rib: 0xfff59d }),
  thBigWorm1: E('Big Skeleworm', 4000 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.7, skin: 0x6d4c41, seg: 'head', rib: 0xf8bbd0, eyeC: 0xaa00ff, phase2: 'thBigWorm2',
    intro: '🐛 A Big Skeleworm: 6 parts, and a huge amount of health in all!' }),
  thBigWorm2: E('Big Skeleworm', 4200 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.7, skin: 0x6d4c41, rib: 0xf8bbd0, phase2: 'thBigWorm3' }),
  thBigWorm3: E('Big Skeleworm', 4400 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.7, skin: 0x6d4c41, rib: 0xf8bbd0, phase2: 'thBigWorm4' }),
  thBigWorm4: E('Big Skeleworm', 4600 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.7, skin: 0x6d4c41, rib: 0xf8bbd0, phase2: 'thBigWorm5' }),
  thBigWorm5: E('Big Skeleworm', 4800 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.7, skin: 0x6d4c41, rib: 0xf8bbd0, phase2: 'thBigWorm6' }),
  thBigWorm6: E('Big Skeleworm', 5000 * th, 3, { model: 'hcWorm', h: 2.6, scale: 1.7, skin: 0x6d4c41, rib: 0xf8bbd0 }),
  // Wicky: a rare golden mimic (DIFFICULTIES.hardcore.mimic). It never hurts the base.
  thWicky: { name: 'Wicky', model: 'hcCandle', h: 3.4, hp: 2500, speed: 4.8, reward: 2500, damage: 0, scale: 1.1, skin: 0x1a237e, golden: true,
    intro: '🕯️ WICKY, a super rare golden mimic! It can\'t hurt your base, and it pays $5,000 to everyone if you catch it.' },
  // Demise (final boss 3 of 6): the slowest boss, immune to every status effect, and hidden.
  thDemise: { name: 'Demise', h: 5.4, hp: 600000, mpTop: 620000 / 600000, speed: 1.2, reward: 0, damage: 1e6, scale: 3.6,
    skin: 0x0a0a0f, shirt: 0x111118, pants: 0x0a0a0f, face: 'blank', boss: true, statusImmune: true, hidden: true, bar: true, barName: 'DEMISE', barSub: 'Tower Heroes',
    hk: { robe: 0x0d0d12, wings: 0x111118, rune: 0xaa00ff, chains: 0x9c27b0, bigSword: 0x5c5c6e, hood: 0x0a0a0f, eyes: 0xd500f9 },
    moves: { first: 4, every: 6, list: [
      { key: 'callUnits', w: 1, list: ['thSeer'], n: 3, name: 'Demise summons Seers' },
      { key: 'dSword', w: 1, range: 14, stun: 3 },
      { key: 'dSpikes', w: 1, range: 30, stun: 2 },
      { key: 'dMist', w: 1, range: 16 }] },
    intro: '🗡️ FINAL BOSS 3 of 6: DEMISE, true evil of the Barrens! Hidden, immune to everything. Its pink mist DOWNGRADES your towers, and if it reaches the base it\'s over.' },

  // ------------------------------------------------------------------ Tower Battles: the Hidden Wave (Wave 0000000)
  tbIssue: E('Issue', 13500, 15, { scale: 1.05, skin: 0x0d1b4a, shirt: 0x2979ff, pants: 0x1565c0, face: 'blank', hk: { glowShirt: 0x2979ff, sparks: 0x82b1ff },
    intro: '⚠️ <ERROR> Issues, Errors and Viruses from the Tower Battles hidden wave: fast, with lots of health!' }),
  tbError: E('Error', 16900, 15, { scale: 1.05, skin: 0x0a0a0a, shirt: 0xff1744, pants: 0xd50000, face: 'blank', hk: { glowShirt: 0xff1744, sparks: 0xff8a80 } }),
  tbVirus: E('Virus', 16900, 15, { scale: 1.05, skin: 0xc2185b, shirt: 0xff4081, pants: 0xf50057, face: 'blank', hk: { glowShirt: 0xff4081, sparks: 0xff80ab } }),
  tbJ: E('J', 1000, 15, { skin: 0x9ccc65, shirt: 0xf5f5f5, pants: 0xc62828, face: 'zombie', hk: { mask: 0x80cbc4, coat: 0xf5f5f5 } }),
  tbM: E('M', 800, 9.6, { skin: 0x9ccc65, shirt: 0xf5f5f5, pants: 0x1565c0, face: 'zombie', hk: { mask: 0x80cbc4, coat: 0xf5f5f5 } }),
  tbPatientZero: E('Patient Zero', 1250, 9.6, { skin: 0x9e9e9e, shirt: 0x111111, pants: 0x111111, face: 'zombie', hk: { mask: 0x80cbc4, breather: 0x424242 },
    intro: '🧪 Patient Zero: maybe the very first zombie.' }),
  tbJack: E('Expired Jack', 60000, 2.4, { scale: 2.6, skin: 0x5d3a1a, shirt: 0x3e2723, pants: 0x2b1b12, face: 'blank', boss: true, freezeImmune: true,
    hk: { pumpkin: 0xff6d00, cape: 0x1a1a1a, spikes: 0x9e9e9e, axe: 0xe0d6c0 },
    shots: [{ kind: 'pumpkin', range: 40, radius: 3, dmg: 0, every: 12, flight: 1.4, lock: 42 }],
    intro: '🎃 Expired Jack! His flaming pumpkins set towers on fire: every tower it hits can\'t fight for 42 seconds.' }),

  // ------------------------------------------------------------------ TDS: Void Core
  vcOdd: E('Odd', 17, 12, { skin: 0xf5f5f5, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'zombie', hk: { veins: 0x9c27b0 } }),
  vcSwift: E('Swift', 24, 21, { scale: 0.95, skin: 0xf5f5f5, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'zombie', hk: { veins: 0x9c27b0, spikes: 0xaa00ff } }),
  vcHefty: E('Hefty', 75, 7.5, { scale: 1.2, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'zombie', armor: 0.25, hk: { crystals: 0xaa00ff, chains: 0x616161, chestHole: 1 } }),
  vcPhantom: E('Phantom', 100, 13.5, { skin: 0x7b1fa2, shirt: 0x7b1fa2, pants: 0x7b1fa2, face: 'blank', hidden: true, hk: { hood: 0x6a1b9a, ghostTail: 0x7b1fa2 } }),
  vcBalloon: E('Balloon', 50, 18, { skin: 0x9e9e9e, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'zombie', flying: true, hk: { balloon: 0xaa00ff }, phase2: 'vcBalloonPopped',
    intro: '🎈 Balloon zombies fly until their balloon pops, then they walk.' }),
  vcBalloonPopped: E('Balloon', 50, 12, { skin: 0x9e9e9e, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'zombie' }),
  vcMystery: E('Mystery', 260, 15, { skin: 0x9e9e9e, shirt: 0x9e9e9e, pants: 0x8a8a8a, face: 'blank', hk: { mark: 0x111111 },
    cage: ['vcBalloon', 'vcBalloon', 'vcHefty', 'vcHefty', 'vcHefty', 'vcPhantom', 'vcPhantom', 'vcPhantom', 'vcPhantom', 'vcPhantom'] }),
  vcEliteLead: E('Elite Lead', 150, 9, { scale: 1.15, skin: 0x78909c, shirt: 0x78909c, pants: 0x607d8b, face: 'helm', lead: true, stunImmune: true, hk: { armor: 0x78909c }, phase2: 'vcEliteLeadBare',
    intro: '🛡️ Elite Leads: lead armor (you need lead detection) until it falls off.' }),
  vcEliteLeadBare: E('Elite Lead', 650, 15, { scale: 1.15, skin: 0x9e9e9e, shirt: 0x616161, pants: 0x424242, face: 'zombie', hk: { chestHole: 1, gem: 0xaa00ff } }),
  vcBlighted: E('Blighted', 5000, 9, { scale: 1.5, skin: 0x9e9e9e, shirt: 0xff80ab, pants: 0x6a1b9a, face: 'zombie', stunImmune: true, bossFirst: true, hk: { flowers: 0xff4081, gem: 0xff80ab },
    intro: '🌸 Miniboss: the Blighted! It can\'t be stunned.' }),
  vcMandrake: E('Mandrake', 750, 13.5, { model: 'hcBush', h: 3, skin: 0x7b1fa2, stunImmune: true,
    deathSpawn: { fixed: [['vcHefty', 1], ['vcOdd', 2], ['vcSwift', 2]] }, intro: '🌿 Mandrakes burst into a Hefty, 2 Odds and 2 Swifts.' }),
  vcVoidling: E('Voidling', 2800, 18, { skin: 0x6a1b9a, shirt: 0x424242, pants: 0x424242, face: 'blank', hk: { eyes: 0xff4081, crystals: 0xff4081, armor: 0x616161 } }),
  vcElitePhantom: E('Elite Phantom', 3500, 15, { scale: 1.3, skin: 0x6a1b9a, shirt: 0x6a1b9a, pants: 0x6a1b9a, face: 'blank', hidden: true, stunImmune: true, hk: { hood: 0x4a148c, ghostTail: 0x6a1b9a, crystals: 0xd500f9 } }),
  vcVoidReaper: E('Void Reaper', 2750, 9, { model: 'hcReaper', h: 4, scale: 1.2, skin: 0x311b92, cloak: 0x311b92, hoodC: 0x1a0f3a, eyeC: 0xff4081, scythe: 0x9e9e9e, stunImmune: true, freezeImmune: true,
    summon: { type: 'vcMystery', n: 4, every: 20 }, intro: '💀 Void Reapers summon 4 Mysteries every 20 seconds.' }),
  vcFloater: E('Void Floater', 2500, 12, { skin: 0xaa00ff, shirt: 0x4a148c, pants: 0x4a148c, face: 'blank', flying: true, stunImmune: true, hk: { pod: 0xd500f9, robe: 0x4a148c, glowShirt: 0xaa00ff }, phase2: 'vcFloaterBare',
    intro: '🫧 Void Floaters fly until their pod breaks.' }),
  vcFloaterBare: E('Void Floater', 1250, 8.1, { skin: 0xaa00ff, shirt: 0x4a148c, pants: 0x4a148c, face: 'blank', stunImmune: true, hk: { robe: 0x4a148c, glowShirt: 0xaa00ff } }),
  vcEliteRusher: E('Elite Void Rusher', 2500, 36, { scale: 1.2, skin: 0x111111, shirt: 0x4a148c, pants: 0x311b92, face: 'blank', armor: 0.4, hk: { armor: 0x4a148c, trim: 0xffc400, shield: 0x6a1b9a }, phase2: 'vcEliteRusherBare',
    intro: '💨 Elite Void Rushers: VERY fast with 40% defense until their shield breaks.' }),
  vcEliteRusherBare: E('Elite Void Rusher', 5000, 15, { scale: 1.2, skin: 0x111111, shirt: 0x4a148c, pants: 0x311b92, face: 'blank', hk: { armor: 0x4a148c, trim: 0xffc400 } }),
  vcMandragora: E('Mandragora', 12000, 8.55, { scale: 1.6, skin: 0x9e9e9e, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'blank', regen: 0.01, stunImmune: true, freezeImmune: true, hk: { flowers: 0xaa00ff, vines: 0x4a148c, bigEye: 0xff4081 },
    intro: '🌺 Mandragoras heal 2% every 2s and can\'t be stunned or frozen.' }),
  vcEliteMystery: E('Elite Mystery', 4500, 13.5, { scale: 1.2, skin: 0x9e9e9e, shirt: 0x9e9e9e, pants: 0x8a8a8a, face: 'blank', stunImmune: true, hk: { mark: 0xd500f9, bandages: 0xe0d6c0 },
    cage: ['vcVoidling', 'vcVoidling', 'vcVoidling', 'vcFloater', 'vcFloater', 'vcVoidReaper', 'vcVoidReaper', 'vcVoidReaper', 'vcElitePhantom', 'vcElitePhantom'] }),
  vcUnknownSmall: E('Ŭ̷n̸k̵n̶o̷w̵n̷', 9000, 12, { skin: 0x050505, shirt: 0x050505, pants: 0x050505, face: 'blank', stunImmune: true, hk: { swarm: 0x212121 },
    blast: { radius: 15, weak: { amt: 0.19, time: 9 }, units: 20, color: 0x424242 },
    intro: '❔ Unknowns: when one dies, nearby towers deal 19% less damage for 9 seconds.' }),
  vcUnknownBoss: E('Ŭ̷n̸k̵n̶o̷w̵n̷ Boss', 32500, 9, { scale: 1.5, skin: 0x1a0033, shirt: 0x1a0033, pants: 0x1a0033, face: 'blank', stunImmune: true, hk: { swarm: 0x4a148c },
    blast: { radius: 20, weak: { amt: 0.27, time: 4.5 }, color: 0x4a148c }, deathSpawn: { fixed: [['vcUnknownSmall', 1, { nimble: true }]] } }),
  vcSlowKing: E('Slow King', 7000, 8.55, { scale: 1.6, skin: 0xf5f5f5, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'blank', armor: 0.6, stunImmune: true, freezeImmune: true,
    hk: { crown: 0xffc400, robe: 0x6a1b9a, faceHole: 1, bubble: 0xaa00ff }, phase2: 'vcSlowKingBare',
    intro: '👑 Slow Kings: their forcefield gives 60% defense until it breaks.' }),
  vcSlowKingBare: E('Slow King', 14000, 8.55, { scale: 1.6, skin: 0xf5f5f5, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'blank', stunImmune: true, hk: { crown: 0xffc400, robe: 0x6a1b9a, faceHole: 1 } }),
  vcSpeedyKing: E('Speedy King', 3500, 19.5, { skin: 0xf5f5f5, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'blank', stunImmune: true, hk: { crown: 0xcd7f32, cape: 0x6a1b9a, faceHole: 1 },
    deathZone: { radius: 6, speed: 0.5, life: 10, color: 0xd500f9 }, intro: '👑 Speedy Kings leave a circle when they die: enemies in it are 50% faster for 10s.' }),
  vcTitan: E('Void Titan', 40000, 8.1, { scale: 2.4, skin: 0x111111, shirt: 0x4a148c, pants: 0x311b92, face: 'blank', stunImmune: true, bossFirst: true,
    hk: { horns: 0x4a148c, armor: 0x4a148c, glowShirt: 0xaa00ff, hammer: 0x424242 },
    moves: { first: 6, every: 17.5, list: [{ key: 'hammerLine', length: 30, width: 4, stun: 3, unitDmg: 135 }] },
    intro: '🔨 Boss: the Void Titan! Its hammer slams send a line of shockwaves that stun your towers.' }),
  vcCrystalian: E('Crystalian', 40000, 7.8, { model: 'hcCrystalian', h: 5.4, scale: 1.4, skin: 0x111111, boss: true, statusImmune: true, tank: true,
    moves: { first: 5, every: 9, list: [{ key: 'crystalLaser', range: 30, weak: 0.17, time: 22, unitDmg: 250, open: 3 }] },
    intro: '💎 Boss: the CRYSTALIAN! Every hit does just 1 damage... except while it floats up to fire its laser. Hit it THEN!' }),
  vcSoul: E('Soul', 3000, 21, { skin: 0xf5f5f5, shirt: 0xeeeeee, pants: 0xeeeeee, face: 'blank', hidden: true, ghost: true, hk: { ghostTail: 0xeeeeee, robe: 0x6a1b9a } }),
  vcEliteSoul: E('Elite Soul', 25000, 12, { scale: 1.4, skin: 0xf5f5f5, shirt: 0xeeeeee, pants: 0xeeeeee, face: 'blank', hidden: true, ghost: true, stunImmune: true,
    wings: 0xff80ab, hk: { ghostTail: 0xeeeeee, halo: 0xaa00ff } }),
  vcTrickster: E('Void Trickster', 20000, 5.7, { scale: 1.3, skin: 0x6a1b9a, shirt: 0x111111, pants: 0x111111, face: 'blank', stunImmune: true, freezeImmune: true,
    hk: { robe: 0x111111, wizardHat: 0x111111, staff: 0xd500f9, glowShirt: 0xaa00ff },
    summon: [{ type: 'vcPortal', n: 1, every: 18, here: true }, { type: 'vcSpeedyKing', n: 1, every: 30 }],
    intro: '🎩 Void Tricksters shoot out Void Portals that keep spitting out Voidlings. Destroy the portals!' }),
  vcPortal: E('Void Portal', 8000, 0, { model: 'hcPortal', h: 4, scale: 1.2, skin: 0xaa00ff, statusImmune: true,
    summon: { type: 'vcVoidling', n: 8, every: 14, here: true, noCash: true } }),
  vcNightshade: E('Nightshade', 5000, 13.5, { model: 'hcBush', h: 3, scale: 1.3, skin: 0x4a148c, legs: 1, stunImmune: true,
    deathSpawn: { fixed: [['vcEliteMystery', 2], ['vcBlighted', 1], ['vcMandrake', 3, { bloated: true, nimble: true }]] },
    intro: '🌑 Nightshades burst into 2 Elite Mysteries, a Blighted and 3 Mandrakes!' }),
  // Vindicator: TDS gives 150% defense (250% with its shield): the game caps defense, so 70% / 85%.
  vcVindicator: E('Vindicator', 25000, 6.3, { scale: 2.2, skin: 0x111111, shirt: 0x4a148c, pants: 0x311b92, face: 'blank', boss: true, armor: 0.85, stunImmune: true,
    hk: { armor: 0x4a148c, cape: 0x311b92, crystals: 0xd500f9, bubble: 0xaa00ff, hammer: 0x9e9e9e }, phase2: 'vcVindicatorBare',
    moves: { first: 5, every: 12, list: [{ key: 'hammerBounce', range: 30, n: 6, lock: 5, unitDmg: 100 }] },
    intro: '⚖️ Boss: the Vindicator! Huge defense, and its bouncing hammer SCARES towers so they can\'t attack.' }),
  vcVindicatorBare: E('Vindicator', 65000, 6.3, { scale: 2.2, skin: 0x111111, shirt: 0x4a148c, pants: 0x311b92, face: 'blank', boss: true, armor: 0.7, stunImmune: true,
    hk: { armor: 0x4a148c, cape: 0x311b92, crystals: 0xd500f9, hammer: 0x9e9e9e },
    moves: { first: 3, every: 12, list: [{ key: 'hammerBounce', range: 30, n: 6, lock: 5, unitDmg: 100 }] } }),
  // Void Cultist: every 6 s a Healing Beacon that heals enemies within 8 by 1,100 every 0.1 s.
  vcCultist: E('Void Cultist', 20000, 6, { scale: 1.2, skin: 0x111111, shirt: 0x4a148c, pants: 0x311b92, face: 'blank', stunImmune: true, freezeImmune: true,
    hk: { robe: 0x4a148c, hood: 0x311b92, mask: 0xffc400 }, beacon: { every: 6, radius: 8, heal: 11000, life: 6, color: 0xd500f9 },
    intro: '🕯️ Void Cultists drop Healing Beacons that heal everything near them VERY fast. Kill them first!' }),
  vcVoidEye: E('Void Eye', 15000, 0.3, { model: 'hcEye', h: 3.6, scale: 0.9, skin: 0x6a1b9a, iris: 0x111111, flying: true,
    shots: [{ kind: 'vioOrb', range: 22, radius: 1, dmg: 0, stun: 3, every: 4.5, flight: 0.6 }] }),
  vcHeavyVoidling: E('Heavy Voidling', 40000, 19.5, { scale: 1.8, skin: 0x6a1b9a, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'blank', hk: { armless: 1, cape: 0x111111, crystals: 0xff4081, eyes: 0xff4081 },
    mAttacks: [{ slam: { range: 10, stun: 2.5, unitDmg: 150, color: 0xff4081 }, first: 4, every: 12, name: 'Stomp' }],
    intro: '🦶 Heavy Voidlings: fast, very tough, and they stomp towers.' }),
  vcKnight: E('Void Knight', 90000, 7.5, { scale: 2, skin: 0x111111, shirt: 0x4a148c, pants: 0x311b92, face: 'helm', stunImmune: true, freezeImmune: true,
    hk: { armor: 0x4a148c, trim: 0xffc400, spikes: 0xffc400, plume: 0xaa00ff, bigSword: 0xaa00ff, swordGlow: 1 },
    mAttacks: [{ slam: { range: 11, stun: 5, unitDmg: 132, color: 0xaa00ff }, first: 5, every: 12, name: 'Void Knight Sword' }],
    intro: '⚔️ Void Knights swing their swords to stun towers for 5 seconds.' }),
  vcGuardian: E('Void Guardian', 200000, 5.7, { scale: 2.6, skin: 0x111111, shirt: 0x4a148c, pants: 0x3e2723, face: 'visorRed', stunImmune: true, freezeImmune: true, bar: true, barName: 'VOID GUARDIAN', barSub: 'TDS Void Core',
    hk: { armor: 0x4a148c, chains: 0x9e9e9e, horns: 0x111111, cape: 0x5d4037, spear: 0xaa00ff },
    moves: { first: 5, every: 14, list: [{ key: 'spear', length: 24, width: 3.5, stun: 10, unitDmg: 250, shield: 25000 }] },
    intro: '🔱 The Void Guardian! Its spear thrust freezes towers for 10 seconds and gives it a 25,000 shield.' }),
  vcSoulStealer: E('Soul Stealer', 375000, 4.95, { scale: 3, skin: 0x111111, shirt: 0x4a148c, pants: 0x4a148c, face: 'blank', boss: true, statusImmune: true, bar: true, barName: 'SOUL STEALER', barSub: 'TDS Void Core',
    hk: { lockHead: 0xffc400, hood: 0x4a148c, robe: 0x311b92, belts: 0x5d4037 },
    vb: { curseTower: { first: 4, every: 9, range: 50, max: 20, soul: 'vcSoul' }, soulSummon: { first: 12, every: 30, souls: 'vcSoul', n: 3, eye: 'vcVoidEye', hide: 12 } },
    intro: '🔒 BOSS: the SOUL STEALER! It curses your towers one by one: a cursed tower can\'t do anything until the Soul Stealer dies.' }),
  // Void Reaver (final boss 5 of 6) and Void Caster: see Sim.hcPair / voidMove.
  vcReaver: { name: 'Void Reaver', h: 5.4, hp: 1200000, speed: 1.95, reward: 0, damage: 1e6, scale: 4.2, skin: 0x2a0a3c, shirt: 0x111111, pants: 0x1a0f24, face: 'blank',
    boss: true, statusImmune: true, bar: true, barName: 'VOID REAVER', barSub: 'TDS Void Core',
    hk: { armor: 0x111111, trim: 0x6a1b9a, horns: 0x4a148c, spikes: 0xaa00ff, mask: 0x212121, sixEyes: 0xd500f9, broadsword: 0x2a0a3c, gem: 0xaa00ff },
    pair: { caster: 'vcCaster', wrathAt: 0.6, wrathSpeed: 1.25, reviveTime: 12, reviveHp: 420000, deathwishHp: 240000, deathwishSpeed: 13.5 },
    vb: {
      cursedBlade: { first: 6, every: 17.5, length: 40, width: 4, weak: 0.4, time: 8, souls: 6, soul: 'vcSoul' },
      judgement: { first: 20, every: 50, n: 6 },
      gaze: { first: 12, every: 35, n: 3, eye: 'vcVoidEye' },
      rupture: { first: 15, every: 50, wrath: true, range: 20, stun: 5, charge: 5, cancel: 300000, bigStun: 12, unitDmg: 1500 },
    },
    arrive: { title: 'VOID REAVER', sub: 'The Void itself has come to reap.', toast: '⚔️ FINAL BOSS 5 of 6: the VOID REAVER! Cursed Blade weakens towers, Void Judgement curses six of them until he falls. Below 60% the Void Caster joins him.' } },
  vcCaster: { name: 'Void Caster', h: 5.4, hp: 650000, speed: 4.5, reward: 0, damage: 1e6, scale: 3.2, skin: 0x111111, shirt: 0x2a0a3c, pants: 0x1a0f24, face: 'blank',
    boss: true, statusImmune: true, bar: true, barName: 'VOID CASTER', barSub: 'Protected while the Void Reaver stands',
    hk: { hair: 0x6a1b9a, horns: 0x4a148c, vines: 0x2e7d32, halo: 0xd500f9, robe: 0x2a0a3c, flowers: 0xaa00ff, staff: 0xd500f9, book: 0x4a148c, eyes: 0xd500f9 },
    vb: {
      casterShield: { first: 8, every: 45, shield: 40000, heal: 0.02 },
      casterPortal: { first: 20, every: 125, n: 22, time: 16, list: ['vcMandragora', 'vcSlowKing', 'vcBlighted', 'vcUnknownSmall', 'vcEliteRusher'] },
    },
    rageAt: 0.4, rageSpeed: 1 / 1.5, // Rage at 40%: slows from 1.5 to 1
    arrive: { title: 'VOID CASTER', sub: '"You thought he was alone?"', toast: '🔮 The VOID CASTER is here! She can\'t be hurt while the Reaver stands. Bring him down and she has 12 seconds to revive him: hit HER then!' } },

  // ------------------------------------------------------------------ TDX: Ultra Nightmare (health and shields / 10)
  txSoldier: E('X Soldier', 22.5, tx(2.8), { skin: 0x9e9e9e, shirt: 0x616161, pants: 0x424242, face: 'visor', bulletResist: 0.15, explosiveResist: 0.25, hk: { beakHelm: 0x111111, gun: 0x212121 } }),
  txHeavyTitan: E('Heavy Titan', 172.5, tx(2), { scale: 1.4, skin: 0x424242, shirt: 0x111111, pants: 0x212121, face: 'frown', bulletResist: 0.5, laserResist: 0.2, hk: { armor: 0x111111 } }),
  // Zombie Drop Pods land partway down the path, can't be hit while closed, then burst open.
  txPod: E('Zombie Drop Pod', 1, 0, { model: 'hcPod', h: 4, scale: 1.1, skin: 0x111111, reward: 5, damage: 0, placeAt: [0.1, 0.5], pod: { open: 3, list: [['txSoldier', 6], ['txHeavyTitan', 1]] },
    intro: '🛸 Zombie Drop Pods crash down along the path and burst open into soldiers!' }),
  txPodJumper: E('Zombie Drop Pod', 1, 0, { model: 'hcPod', h: 4, scale: 1.1, skin: 0x111111, reward: 5, damage: 0, placeAt: [0.1, 0.5], pod: { open: 3, list: [['txJumper', 9]] } }),
  txPodE02: E('Zombie Drop Pod', 1, 0, { model: 'hcPod', h: 4, scale: 1.3, skin: 0x111111, reward: 5, damage: 0, placeAt: [0.1, 0.5], pod: { open: 3, list: [['txE02', 4], ['txAvatar', 1]] } }),
  txJumper: E('Jumper', 70, tx(5), { osh: 15, skin: 0xd7b98e, shirt: 0x5d4037, pants: 0x3e2723, face: 'visor', iceResist: 0.25, dash: { every: 7, dist: 10 }, hk: { visor: 0x69f0ae, jetpack: 0x424242 },
    intro: '🦘 Jumpers leap ahead with their jetpacks.' }),
  txBuzzard: E('Buzzard', 13, tx(3.5), { skin: 0xd7b98e, shirt: 0x5d4037, pants: 0x3e2723, face: 'zombie', flying: true, hk: { propeller: 0x424242 } }),
  txLurch: E('Lurch 3', 100, tx(1.7), { osh: 125, scale: 1.2, skin: 0xc62828, shirt: 0x111111, pants: 0x111111, face: 'zombie', hk: { armor: 0x111111, metalArm: 0x9e9e9e },
    enrage: { at: 0.6, speed: 8.2 / 1.7, osh: 0.2 }, intro: '💢 Lurch 3s smash their core at 60% health and run VERY fast!' }),
  txNader: E('X-Nader', 450, tx(3), { osh: 700, scale: 1.4, skin: 0x33691e, shirt: 0x2e7d32, pants: 0x1b5e20, face: 'visor', flying: true, hk: { armor: 0x2e7d32, propeller: 0x424242 },
    mAttacks: [{ shot: { range: 30, n: 4, dmg: 3, kind: 'grenade', flight: 0.9, pick: 'random' }, first: 4, every: 10 }],
    blast: { radius: 10, dmg: 5, color: 0xff6d00 } }),
  txChariot: E('Chariot', 220, tx(2.9), { osh: 120, scale: 1.2, skin: 0xc62828, shirt: 0x8d6e63, pants: 0x5d4037, face: 'zombie', hk: { armor: 0x8d6e63 },
    summon: { type: 'txTurret', n: 1, every: 20, here: true }, deathSpawn: { list: ['txTurret'], n: 1 },
    intro: '🛡️ Chariots drop turrets that shoot your strongest tower and slow it down.' }),
  txTurret: E('Chariot Turret', 25, 0, { model: 'hcTurret', h: 2.4, osh: 50, skin: 0x616161,
    mAttacks: [{ shot: { range: 30, n: 1, dmg: 2, kind: 'shell', flight: 0.3, slow: { amt: 0.3, time: 6 } }, first: 2, every: 3 }] }),
  txMultiplier: E('Multiplier 3', 2.5, tx(9), { osh: 17.5, skin: 0xff1744, shirt: 0xff1744, pants: 0xff1744, face: 'blank', iceResist: 1, hk: { xMark: 0xffffff, clear: 0.55 },
    multiply: { radius: 10, max: 5, copies: 1, speed: 1.4, noCash: true }, intro: '❌ Multipliers copy the enemies around them when they die. Kill them away from the crowd!' }),
  txPilot: E('Pilot', 100, tx(20), { osh: 25, skin: 0xffcc80, shirt: 0xff6d00, pants: 0xe65100, face: 'visor', flying: true, hk: { helmet: 0xff6d00 } }),
  txSmasher: E('Revived Smasher', 1100, tx(3.1), { scale: 1.6, skin: 0x9e9e9e, shirt: 0x6d1b1b, pants: 0x4a0d0d, face: 'zombie', hk: { armor: 0x6d1b1b, stitches: 0x8bc34a },
    mAttacks: [{ slam: { range: 10, stun: 3, color: 0xff6d00 }, first: 6, every: 24, name: 'Smash' }] }),
  txBreacher: E('Breacher', 650, tx(7), { osh: 300, scale: 1.25, skin: 0x8d6e63, shirt: 0x616161, pants: 0x424242, face: 'welder', laserResist: 0.5, goldResist: 0.5, hk: { armor: 0x616161, visor: 0xffea00 } }),
  txCharger: E('Titan Charger', 1675, tx(6), { osh: 250, scale: 1.7, skin: 0x6a1b9a, shirt: 0x4a148c, pants: 0x311b92, face: 'frown', laserResist: 0.85, goldResist: 0.8, hk: { veins: 0x1a0033 },
    intro: '🟪 Titan Chargers: very fast, and lasers and gold barely hurt them.' }),
  txBounded: E('Bounded', 2000, tx(2.4), { osh: 125, scale: 1.7, skin: 0x33691e, shirt: 0x2e5d1e, pants: 0x1b3a12, face: 'zombie', hk: { chains: 0x9e9e9e, shards: 0x90a4ae, stitches: 0x111111 },
    enrage: { after: 30, speed: 7.3 / 2.4 }, intro: '⛓️ After 30 seconds a Bounded breaks its chains and charges on all fours!' }),
  txJammer: E('Jammer', 55, tx(3.2), { skin: 0xa5b49c, shirt: 0x546e3a, pants: 0x33402a, face: 'frown', hk: { headset: 0x212121, beakHelm: 0x212121 }, jam: { radius: 15 },
    intro: '📡 Jammers: towers near them can\'t use abilities.' }),
  txHunter: E('Hunter', 7500, tx(2.2), { osh: 6000, scale: 1.4, skin: 0xeceff1, shirt: 0xeceff1, pants: 0x111111, face: 'visorRed', explosiveResist: 0.95, hk: { armor: 0xeceff1 },
    mAttacks: [{ shot: { range: 60, n: 1, dmg: 28, kind: 'shell', flight: 0.5 }, first: 6, every: 12 }],
    intro: '🎯 Hunters shoot your most expensive tower.' }),
  txXTank: E('X-Tank', 5000, tx(2.4), { model: 'hcXTank', h: 3, scale: 1.4, osh: 12500, skin: 0x111111, bulletResist: 0.5, explosiveResist: 0.65,
    mAttacks: [{ shot: { range: 45, n: 1, dmg: 40, kind: 'shell', flight: 1.4, pick: 'random' }, first: 8, every: 20 },
      { shot: { range: 30, n: 1, dmg: 30, kind: 'shell', flight: 0.3 }, first: 4, every: 10 }],
    intro: '🛞 X-Tanks: tons of shield, and big shells at your towers.' }),
  txManiac: E('Maniac', 1500, tx(5.5), { skin: 0x111111, shirt: 0x2e7d32, pants: 0x1b5e20, face: 'blank', bulletResist: 0.65, explosiveResist: 0.9, hk: { armor: 0x2e7d32 } }),
  txThumper: E('Thumper', 350, tx(5.5), { osh: 400, scale: 1.5, skin: 0xb71c1c, shirt: 0x111111, pants: 0x111111, face: 'frown', laserResist: 0.3, goldResist: 0.35, hk: { armor: 0x111111 },
    dash: { every: 6, dist: 14 } }),
  txAerialJug: E('Aerial Juggernaut', 1600, tx(3.2), { osh: 1000, scale: 1.4, skin: 0x6d1b1b, shirt: 0x4a0d0d, pants: 0x3a0a0a, face: 'frown', flying: true, bulletResist: 0.25, hk: { propeller: 0x424242, propeller2: 1, launcher: 0x424242 },
    mAttacks: [{ shot: { range: 30, n: 4, dmg: 5, kind: 'shell', flight: 0.6, pick: 'random' }, first: 3, every: 5 }],
    blast: { radius: 10, dmg: 7.5, color: 0xff6d00 } }),
  txTracker: E('Tracker', 5000, tx(3.4), { osh: 3000, scale: 1.5, skin: 0xc62828, shirt: 0x757575, pants: 0x424242, face: 'frown', hk: { armor: 0x757575, headset: 0x212121 },
    mAttacks: [{ shot: { range: 40, n: 1, dmg: 0, kind: 'vioOrb', flight: 0.2, weak: { amt: 0.6, time: 10, max: 0.6 } }, first: 4, every: 15 }],
    intro: '🔴 Trackers mark a tower with a laser: it deals 60% less damage for a while.' }),
  txNuclear: E('Nuclear Tank', 8000, tx(2.5), { osh: 3500, scale: 1.4, skin: 0xff9800, shirt: 0xc62828, pants: 0x8e0000, face: 'zombie', laserResist: 0.25, goldResist: 0.35, hk: { armor: 0xc62828, nuke: 0x76ff03 },
    blast: { radius: 10, dmg: 50, color: 0x76ff03 }, deathZone: { radius: 6, speed: 0.6, life: 9, color: 0x76ff03 },
    intro: '☢️ Nuclear Tanks blow up when they die, and leave a puddle that makes enemies 60% faster.' }),
  txDispenser: E('Dispenser', 1000, tx(2.5), { osh: 5000, scale: 1.2, skin: 0xc5e1a5, shirt: 0x689f38, pants: 0x33691e, face: 'zombie', hk: { helmet: 0x111111, backpack: 0x29b6f6 },
    dispense: { every: 2, radius: 12, shield: 100, pct: 0.05 }, intro: '🧃 Dispensers keep giving the enemies around them extra shield.' }),
  txE02: E('E-02', 1900, tx(2.8), { osh: 2000, scale: 1.1, skin: 0xb71c1c, shirt: 0x6d1b1b, pants: 0x4a0d0d, face: 'visorRed', bulletResist: 0.65, explosiveResist: 0.9, laserResist: 0.95, goldResist: 0.85,
    charge: { speed: tx(5.2), time: 6 }, hk: { armor: 0x6d1b1b, gun: 0x212121 },
    mAttacks: [{ shot: { range: 18, n: 1, dmg: 15, kind: 'shell', flight: 0.2, weak: { amt: 0.4, time: 4, max: 0.4 } }, first: 3, every: 4 }],
    intro: '🤖 E-02s: tiny Eradicators. Almost everything bounces off their armor.' }),
  txJX: E('J-X', 3500, tx(6.5), { osh: 3000, scale: 1.1, skin: 0xc62828, shirt: 0xc62828, pants: 0x212121, face: 'frown', bulletResist: 0.9, fireImmune: true, laserResist: 0.15, goldResist: 0.35, hk: { knives: 0xe0e0e0 },
    mAttacks: [{ shot: { range: 8, n: 1, dmg: 10, kind: 'shell', flight: 0.1, weak: { amt: 0.8, time: 5, max: 0.8 } }, first: 2, every: 6 }] }),
  txAvatar: E('Avatar-R', 7000, tx(1.75), { osh: 8000, scale: 1.7, skin: 0x757575, shirt: 0x616161, pants: 0x424242, face: 'visorRed', iceResist: 0.15, laserResist: 0.3, goldResist: 0.2, placeAt: [0.2, 0.5],
    hk: { armor: 0x616161, eyes: 0xff6d00, cannon: 0x424242 },
    mAttacks: [{ shot: { range: 40, n: 1, dmg: 40, kind: 'shell', flight: 0.8 }, first: 5, every: 20 }] }),
  txGrumble: E('Grumble', 10000, tx(3.6), { scale: 2.6, skin: 0x7a8a6a, shirt: 0x5d6b50, pants: 0x4a553f, face: 'blank', damage: 1e6, hk: { helmet: 0x757575, eyes: 0xff1744 },
    intro: '💀 GRUMBLE! If it gets into your base, it DESTROYS it. Stop it at all costs!' }),
  txJager: E('Jager', 27500, tx(3), { osh: 17500, scale: 2.2, skin: 0x8e0000, shirt: 0xc62828, pants: 0x111111, face: 'visorRed', boss: true, stunImmune: true, laserResist: 0.25, goldResist: 0.6, placeAt: [0.125, 0.375],
    hk: { armor: 0xc62828, fourArms: 1, cannon: 0x424242 }, dash: { every: 30, dist: 12 },
    mAttacks: [{ shot: { range: 60, n: 1, dmg: 200, kind: 'laser', flight: 0.2 }, first: 10, every: 35, name: 'Blaster Hardware' },
      { flame: { range: 14, arc: 120, dps: 25, time: 5 }, first: 5, every: 25 }],
    intro: '🎯 Miniboss: the JAGER drops onto the path! Its arm lasers melt your most expensive tower.' }),
  txPredator: E('Predator', 3500, tx(2.6), { scale: 1.3, skin: 0x9ccc65, shirt: 0x1565c0, pants: 0x1565c0, face: 'visorRed', hk: { helmet: 0xc62828 },
    mAttacks: [{ shot: { range: 30, n: 1, dmg: 8, kind: 'shell', flight: 0.3, pct: 0.04 }, first: 4, every: 8 }] }),
  txApex: E('Apex Predator', 87500, tx(1.8), { scale: 2.8, skin: 0x111111, shirt: 0x111111, pants: 0xc62828, face: 'visorRed', boss: true, stunImmune: true,
    bulletResist: 0.5, explosiveResist: 0.5, iceResist: 0.25, laserResist: 0.3, goldResist: 0.4, bar: true, barName: 'APEX PREDATOR', barSub: 'TDX Ultra Nightmare',
    hk: { armor: 0xc62828, helmet: 0x757575, launcher: 0x424242 },
    summon: { type: 'txPredator', n: 4, every: 30 },
    mAttacks: [
      { shot: { range: 120, n: 4, dmg: 15, stun: 3, kind: 'missile', flight: 1.2, pick: 'random' }, first: 6, every: 30, name: 'Missile Burst' },
      { slam: { range: 18, stun: 3, color: 0xff1744 }, first: 15, every: 45, name: 'Seismic Slam' },
      { shot: { range: 120, n: 3, dmg: 35, kind: 'laser', flight: 0.3, pick: 'random' }, first: 25, every: 75, name: 'Triple Pulse' },
      { shot: { range: 40, n: 1, dmg: 650, kind: 'laser', flight: 0.4 }, first: 20, every: 35, name: 'Eyes Locked' }],
    blast: { radius: 8, dmg: 300, color: 0xff1744 },
    intro: '🦾 BOSS: the APEX PREDATOR! Missiles, lasers and a seismic slam, and it calls in Predators. Its core blows up when it dies!' }),
  // Emperor (final boss 6 of 6) and the things he summons.
  txAttackDrone: E('Attack Drone', 2000, tx(5), { model: 'hcDrone', h: 2.4, osh: 4000, skin: 0xeceff1, flying: true,
    mAttacks: [{ shot: { range: 30, n: 3, dmg: 6, kind: 'vioOrb', flight: 0.5, pick: 'random' }, first: 3, every: 10 }] }),
  txHealDrone: E('Healing Drone', 800, tx(5), { model: 'hcDrone', h: 2.4, osh: 200, skin: 0x2e5d1e, heal: 1, flying: true, healPulse: { every: 1, radius: 16, hp: 50, over: 1 } }),
  txCloneI: E('Clone MK I', 53526, tx(3), { osh: 10000, scale: 2.4, skin: 0xff1744, shirt: 0xff1744, pants: 0xff1744, face: 'visorRed', boss: true, stunImmune: true, hk: { armor: 0xff1744, clear: 0.55, launcher: 0xff1744 },
    mAttacks: [{ slam: { range: 12, stun: 3, color: 0xff1744 }, first: 5, every: 15, name: 'Spin' }, { shot: { range: 40, n: 6, dmg: 6, kind: 'shell', flight: 0.8, pick: 'random' }, first: 8, every: 12 }] }),
  txCloneII: E('Clone MK II', 47444, tx(3.4), { osh: 10000, scale: 2.4, skin: 0xff1744, shirt: 0xff1744, pants: 0xff1744, face: 'visorRed', boss: true, stunImmune: true, hk: { armor: 0xff1744, clear: 0.55, minigun: 0xff1744 },
    mAttacks: [{ shot: { range: 40, n: 8, dmg: 5, kind: 'shell', flight: 0.8, pick: 'random' }, first: 6, every: 12 }, { flame: { range: 16, arc: 85, dps: 30, time: 3 }, first: 4, every: 14 }] }),
  txEmperor: { name: 'Emperor', h: 5.4, hp: 2500000, mpTop: 2750000 / 2500000, speed: tx(1.4), reward: 0, damage: 1e6, scale: 5, skin: 0xeceff1, shirt: 0xeceff1, pants: 0xbdbdbd, face: 'visorRed',
    boss: true, statusImmune: true, bar: true, barName: 'THE EMPEROR', barSub: 'TDX Ultra Nightmare', recede: { n: 2 },
    hk: { armor: 0xeceff1, trim: 0xff1744, emperorHelm: 0xeceff1, xVisor: 0xff1744, poleaxe: 0xbdbdbd, gem: 0xff1744 },
    vb: {
      finalEradication: { first: 30, every: 60, stun: 7.5 },
      chronoStasis: { first: 45, every: 150, time: 4, slow: 0.9, baseDmg: 36, leap: 12 },
      encore: { first: 70, every: 150, list: [['txAttackDrone', 4], ['txCloneII', 2], ['txCloneI', 1], ['txHealDrone', 2]] },
      divineProtection: { first: 20, every: 90, shield: 100000, max: 300000, units: 5, range: 10, slow: 0.6, time: 8 },
      meteoricSwarm: { first: 55, every: 110, n: 12, dmg: 10, stun: 5, radius: 2.5 },
      corruptingBlast: { first: 80, every: 100, n: 4, units: 3, time: 10 },
      harvest: { first: 12, every: 50, n: 15, dmg: 120, smoke: 8, heal: 531, time: 5 },
      execution: { first: 35, every: 45, range: 25, min: 20000 },
      overdrive: { first: 25, every: 40, dist: 20 },
    },
    arrive: { title: 'THE EMPEROR', sub: 'TDX Ultra Nightmare. The last of them all.', toast: '👑 FINAL BOSS 6 of 6: THE EMPEROR! 2.5 million health. When he reaches your base he warps back to the start: twice. The third time, you lose.' } },

  // ------------------------------------------------------------------ Tower Blitz: Ranked Up Expert
  // Like Insane: defense = flat damage blocked per hit, maxHit = most one hit can do. "+ shield" = osh.
  ruNinja: E('Spored Ninja', 6, 21, { scale: 0.95, skin: 0x1a237e, shirt: 0x111111, pants: 0x111111, face: 'frown', ilook: 'ninja', defense: 2, hk: { clear: 0.7 },
    intro: '🥷 Ranked Up Tower Blitz enemies have Defense: every hit does that much less damage.' }),
  ruOfficer: E('Spored Officer', 18, 7.8, { skin: 0x8e3a3a, shirt: 0x6d1b1b, pants: 0x4a0d0d, face: 'frown', ilook: 'soldier', defense: 4 }),
  ruMetallic: E('Bound Metallic', 190, 6.3, { scale: 1.25, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'visorRed', ilook: 'metallic', glowC: 0x80d8ff, defense: 4, hk: { spikes: 0x212121 } }),
  ruDroid: E('Flying Droid', 20, 16.8, { skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'visor', ilook: 'jetpacker', glowC: 0xff4081, flying: true, defense: 1, freezeImmune: true }),
  ruDroneM5: E('Drone M5', 100, 42, { model: 'crystalCar', h: 2, scale: 0.6, skin: 0x111111, shard: 0xff1744, defense: 12, freezeImmune: true,
    intro: '🏎️ Drone M5s: 12 Defense! Weak hits do nothing at all.' }),
  ruTruck: E('Truck M3', 40, 18, { model: 'iTruck', h: 3.2, skin: 0x37474f, defense: 6, bulletResist: 0.45, deathSpawn: { list: ['ruOfficer'], n: 4 } }),
  ruBerserker: E('Gilded Berserker', 2000, 3.9, { osh: 1000, scale: 2, skin: 0x8d6e00, shirt: 0x5d4a00, pants: 0x3e3000, face: 'blank', ilook: 'berserker', glowC: 0xffea00, boss: true, defense: 3, maxHit: 60,
    moves: { first: 4, every: 2, list: [{ key: 'hammerSmash', once: true, range: 16, stun: 10 }] },
    intro: '🔨 Miniboss: the GILDED BERSERKER! No hit does more than 60 damage to it, and its Hammer Smash stuns a tower.' }),
  ruTeleporter: E('Reformed Teleporter', 150, 21, { skin: 0x80deea, shirt: 0x80deea, pants: 0x80deea, face: 'blank', ilook: 'teleporter', glowC: 0xe0f7fa, defense: 3, hk: { clear: 0.5, gem: 0xe0f7fa },
    deathSpawn: { list: ['ruMetallic', 'ruDroneM5', 'ruDroid', 'ruTruck'], n: 1 } }),
  ruSprinter: E('Sprinter M6', 350, 24.9, { osh: 130, scale: 1.1, skin: 0x9e9e9e, shirt: 0x9e9e9e, pants: 0x757575, face: 'halfMetal', ilook: 'sprinterM5', glowC: 0x40c4ff, defense: 2, hk: { armor: 0x9e9e9e } }),
  ruCommando: E('Commanding Soldier', 225, 24, { skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'blank', ilook: 'eliteSoldier', glowC: 0xff1744, defense: 3 }),
  ruRaygunner: E('Elite Raygunner', 250, 13.5, { osh: 350, skin: 0x616161, shirt: 0x263238, pants: 0x212121, face: 'goggles', ilook: 'raygunnerBare', glowC: 0x40c4ff, maxHit: 200 }),
  ruCorpsman: E('Field Corpsman', 250, 11.4, { skin: 0xfafafa, shirt: 0x424242, pants: 0x424242, face: 'smile', ilook: 'medic', defense: 5, healPulse: { every: 4, radius: 12, hp: 80, over: 1 },
    intro: '⛑️ Field Corpsmen heal the enemies around them.' }),
  ruGargantuan: E('Reforged Gargantuan', 400, 6, { osh: 1000, oshBreakSpeed: 1.6, scale: 1.4, skin: 0xff6d00, shirt: 0x3e2723, pants: 0x3e2723, face: 'visor', ilook: 'shielderBare', glowC: 0xff6d00, defense: 6, fireImmune: true, freezeImmune: true }),
  ruCarrier: E('Overclocked Carrier Tank', 2000, 13.5, { model: 'iCarrier', h: 3, scale: 1.2, osh: 2000, skin: 0x111111, shard: 0xff1744, defense: 6, maxHit: 150, freezeImmune: true, shockImmune: true,
    deathSpawn: { list: ['ruMK13', 'ruRaygunner', 'ruAltTeleporter', 'ruDroneM5', 'ruCommando'], n: 4 } }),
  ruAltTeleporter: E('Altered Teleporter', 480, 48, { skin: 0x111111, shirt: 0x0d1b4a, pants: 0x0d1b4a, face: 'blank', ilook: 'eliteTeleporter', glowC: 0x80d8ff, defense: 4,
    deathSpawn: { list: ['ruCommando', 'ruGargantuan', 'ruSprinter', 'ruRaygunner', 'ruCosmil'], n: 1 } }),
  ruMK13: E('MK13-Device', 2000, 0.3, { model: 'iMK11', h: 3, osh: 3000, skin: 0x1c1c1c, shard: 0xff1744, defense: 4, summon: { type: 'ruCommando', n: [2, 3], every: 6.5, here: true } }),
  ruCosmil: E('Overclocked Cosmil', 500, 18, { osh: 400, scale: 1.15, skin: 0xffea00, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'visorRed', ilook: 'cosmil', glowC: 0xffea00, defense: 30, maxHit: 200, freezeImmune: true, shockImmune: true,
    intro: '🟡 Overclocked Cosmils: 30 Defense! Only big hits work.' }),
  ruEngineer: E('Engineer X', 10000, 8.1, { osh: 6500, scale: 1.35, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'welder', ilook: 'engineer', defense: 6, build: { after: 6, type: 'ruMK13' }, hk: { visor: 0xff1744 },
    intro: '🔧 Engineer X builds an MK13-Device that keeps summoning Commanding Soldiers.' }),
  ruChaotic: E('Chaotic Energy', 500, 60, { osh: 400, skin: 0xff8a80, shirt: 0xff8a80, pants: 0xff8a80, face: 'blank', ilook: 'pureEnergy', glowC: 0xff5252, defense: 6, maxHit: 200, freezeImmune: true, hk: { horns: 0x7c4dff } }),
  ruHellrisen: E('Hellrisen', 1800, 10.8, { osh: 1000, skin: 0x111111, shirt: 0x1c1c1c, pants: 0x111111, face: 'blank', defense: 2, maxHit: 150, fireImmune: true, hk: { hood: 0x1c1c1c, robe: 0x1c1c1c, fourEyes: 0xff1744, fireHands: 0xff3d00 } }),
  ruCysian: E('Cysian Master', 50000, 7.5, { osh: 25000, scale: 2.3, skin: 0x111111, shirt: 0x1c1c1c, pants: 0x111111, face: 'blank', ilook: 'boltmaster', glowC: 0xff3d00, boss: true, defense: 3, freezeImmune: true, shockImmune: true,
    hk: { horns: 0x424242, gem: 0xff1744, veins: 0xff6d00 },
    moves: { first: 5, every: 9, list: [
      { key: 'concLightning', w: 1, range: 20, stun: 3 },
      { key: 'callUnits', w: 1, list: ['ruHellrisen', 'ruGargantuan', 'ruCosmil', 'ruMK13', 'ruRaygunner', 'ruChaotic'], n: 3, name: 'Cysian Summoner' }] },
    intro: '🔥 BOSS: the CYSIAN MASTER! Its Sword Slam stuns the towers around it and it summons Ranked Up units.' }),
  ruLegionship: E('Alien Legionship', 10000, 4.5, { model: 'crystalUfo', h: 4, scale: 2.4, osh: 6500, skin: 0x1a0033, shard: 0xaa00ff, flying: true, defense: 4, freezeImmune: true, shockImmune: true,
    healPulse: { every: 5, radius: 16, pct: 0.2, over: 1.3 }, intro: '🛸 Alien Legionships heal everything around them by 20%, even past full health!' }),
  ruJuggernaut: E('Juggernaut', 10000, 6, { osh: 30000, scale: 1.7, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'visorRed', ilook: 'sentinel', glowC: 0xff1744, defense: 5, maxHit: 500, freezeImmune: true, shockImmune: true,
    hk: { horns: 0x111111, bubble: 0xff1744 }, moves: { first: 4, every: 2, list: [{ key: 'hammerSmash', once: true, range: 16, stun: 8 }] } }),
  ruVessel: E('Unstable Vessel', 8000, 18, { scale: 1.25, skin: 0x76ff03, shirt: 0x33691e, pants: 0x1b5e20, face: 'blank', ilook: 'vessel', glowC: 0x76ff03, freezeImmune: true,
    blast: { radius: 10, stun: 3, color: 0x76ff03 }, deathSpawn: { list: ['ruCommando', 'ruRaygunner', 'ruDroneM5', 'ruAltTeleporter'], n: 3 } }),
  ruVengeful: E('Vengeful', 6000, 22.5, { scale: 1.1, skin: 0x111111, shirt: 0x1c1c1c, pants: 0x111111, face: 'indigo', ilook: 'vengeful', glowC: 0x651fff, deathHaste: { radius: 12, speed: 1, time: 4 } }),
  ruChampion: E('Pure Champion', 35000, 8.25, { osh: 20000, scale: 1.8, skin: 0xfafafa, shirt: 0xf5f5f5, pants: 0xeeeeee, face: 'blank', ilook: 'champion', glowC: 0xffffff, defense: 10, maxHit: 500, freezeImmune: true, shockImmune: true,
    hk: { crystals: 0x80d8ff },
    moves: { first: 4, every: 9, list: [{ key: 'swordThrow', w: 1, range: 35, radius: 1.5, stun: 5, flight: 0.8 }, { key: 'vengefulSlash', w: 1, range: 16, stun: 3 }] },
    intro: '🤍 Pure Champions throw their swords and slash to stun your towers.' }),
  ruElemental: E('Elemental Energy', 1250, 60, { skin: 0xffffff, shirt: 0xffffff, pants: 0xffffff, face: 'blank', ilook: 'ravagerEnergy', glowC: 0x80d8ff, defense: 4, maxHit: 170, freezeImmune: true, hk: { horns: 0x40c4ff },
    intro: '💠 Elemental Energy: insanely fast!' }),
  ruBanished: E('Banished', 2000, 16.5, { osh: 200, skin: 0x1c1c1c, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'blank', ilook: 'spirit', glowC: 0xff1744, flying: true, defense: 2, freezeImmune: true, fireImmune: true, wings: 0xb71c1c }),
  ruDemonic: E('Demonic Summoner', 30000, 9, { osh: 10000, scale: 1.7, skin: 0x111111, shirt: 0x8e0000, pants: 0x4a0d0d, face: 'blank', ilook: 'divine', glowC: 0xff1744, defense: 5, fireImmune: true,
    hk: { hood: 0x8e0000, fourEyes: 0xff1744, horns: 0xff3d00, gem: 0xff1744 },
    summon: [{ type: 'ruBanished', n: [2, 3], every: 9 }, { type: 'ruHellrisen', n: 2, every: 15 }], intro: '😈 Demonic Summoners keep calling Banished and Hellrisen.' }),
  ruEye: E('Eye', 8000, 10.2, { model: 'hcEye', h: 3.6, scale: 0.9, skin: 0xfafafa, iris: 0xd50000, nerve: 1, flying: true, defense: 5, freezeImmune: true }),
  ruTranquil: E('Tranquil', 20000, 8.4, { scale: 1.9, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'blank', ilook: 'tranquil', glowC: 0xd50000, defense: 4, shockImmune: true }),
  ruAbomination: E('Abomination', 8000, 24, { skin: 0x0d0d0d, shirt: 0x0d0d0d, pants: 0x0d0d0d, face: 'blank', defense: 5, freezeImmune: true, hk: { manyEyes: 0x111111 } }),
  ruHardLight: E('Hard Light', 150, 15, { skin: 0xffffff, shirt: 0xffffff, pants: 0xffffff, face: 'blank', ilook: 'hardLight', glowC: 0xffffff, defense: 8000, maxHit: 30,
    intro: '⬜ Hard Light: 8,000 Defense! Only burns, poison and other damage over time (or defense piercing) hurt it.' }),
  ruGrandEye: E('Grand Eye of the Seer', 250000, 4.8, { osh: 50000, model: 'hcEye', h: 3.6, scale: 3.4, skin: 0x111111, iris: 0xd500f9, veins: 0xff4081, spiky: 1, tentacles: 0xaa00ff, boss: true, defense: 40,
    freezeImmune: true, shockImmune: true, bar: true, barName: 'GRAND EYE OF THE SEER', barSub: 'Tower Blitz Ranked Up', relax: { after: 10, defense: 15 },
    summon: { type: 'ruAbomination', n: 1, every: 8 },
    moves: { first: 6, every: 11, list: [
      { key: 'eyeLaser', w: 1, radius: 9, stun: 4, flight: 2.5, defense: 15, maxHit: 500 },
      { key: 'callUnits', w: 1, list: ['ruEye', 'ruEye', 'ruAbomination'], n: 4, name: 'Eyeificate Summon' }] },
    intro: '👁️ BOSS: the GRAND EYE OF THE SEER! 40 Defense at first. Its laser stuns towers, and it keeps making Abominations.' }),
  ruChronos: { name: 'Chronos', h: 5.2, hp: 800000, speed: 3, reward: 0, damage: 1e6, scale: 4.2, skin: 0x111111, shirt: 0xb71c1c, pants: 0x111111, face: 'overlord', ilook: 'overlord', glowC: 0xff1744,
    boss: true, defense: 2, freezeImmune: true, shockImmune: true, ampCap: 350000 / 800000, bar: true, barName: 'CHRONOS', barSub: 'Tower Blitz Ranked Up',
    hk: { extraHeads: 0x111111 },
    taunt: { time: 7, maxHit: 20 },
    backup: { at: 0.25, type: 'ruChronosAmp', n: 2 },
    despair: { speed: 2, defense: 2, maxHit: 600, summon: 'ruChampion', n: 0 },
    moves: { first: 10, every: 8, list: [
      { key: 'thunderstorm', w: 2, n: 7, radius: 3, stun: 3 },
      { key: 'concLightning', w: 2, range: 24, stun: 3.5 },
      { key: 'callUnits', w: 1, list: ['ruEye', 'ruTranquil'], n: 3, name: 'Summoning' },
      { key: 'telekinesis', w: 2, n: 4, radius: 6, stun: 3, dmg: 0, flight: 1.6 }] },
    intro: '⏳ FINAL BOSS 4 of 6: CHRONOS! He laughs off almost everything at first. Once he is badly hurt, two Amplifiers heal him back up: destroy them, and he despairs.' },
  ruChronosAmp: { name: 'Chronos Amplifier', model: 'amplifier', h: 5, hp: 40000, osh: 10000, speed: 0, reward: hR(50000), damage: 0, scale: 2.4, skin: 0x8e0000, shard: 0xff1744,
    defense: 10, freezeImmune: true, shockImmune: true, amp: { speed: 0, heal: 0.012 } },
};

/** Adds every Hardcore enemy to `ENEMIES` (call once ENEMIES is filled in). */
export function addHardcoreEnemies(ENEMIES) {
  copyEnemies(ENEMIES);
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}

// Wave groups: [type, count, secondsBetween, startDelay, mods?] (mods: { boss, aggro, bloated, nimble, hidden, regen }).
const C = hcKey;
export const HARDCORE_WAVES = [
  // 1-5: a taste of every game.
  { groups: [['thGhost', 6, 1, 0], ['thSpider', 5, 0.9, 3], ['thRune', 6, 1, 6]] },
  { groups: [['vcOdd', 12, 0.6, 0], ['vcSwift', 8, 0.6, 4], ['ruNinja', 10, 0.5, 8]] },
  { groups: [[C('xCharger'), 6, 0.9, 0], ['thRune', 10, 0.7, 2], ['txPod', 2, 6, 5]] },
  { groups: [['vcHefty', 8, 0.9, 0], ['thDMSpider', 5, 1, 3], ['thDMGhost', 5, 1, 6], [C('vLightning'), 8, 0.7, 9]] },
  { groups: [['vcBalloon', 8, 0.8, 0], ['vcPhantom', 8, 0.8, 4], ['ruMetallic', 5, 1.2, 7], ['txBuzzard', 8, 0.6, 10]] },
  // 6-10
  { groups: [['thRogue', 6, 1.4, 0], ['vcMystery', 6, 1.2, 3], ['ruDroid', 8, 0.7, 6], ['txSoldier', 12, 0.4, 9]] },
  { groups: [[C('vToxic'), 8, 0.9, 0], [C('vLava'), 8, 0.9, 3], ['txJumper', 5, 1.2, 6], ['ruTruck', 4, 2, 9]] },
  { groups: [[C('xUndercharged'), 5, 1.2, 0], [C('breaker4'), 4, 1.6, 3], ['thDemonSlime', 4, 1.6, 6], ['vcEliteLead', 4, 1.6, 9], ['ruOfficer', 12, 0.4, 12]] },
  { groups: [['thSeer', 2, 4, 0], [C('fHazmat'), 6, 1.2, 2], [C('vSlime'), 4, 2, 5], ['txJammer', 2, 3, 7], ['ruCorpsman', 3, 2, 9], ['vcMandrake', 3, 2, 12]] },
  { groups: [['ruBerserker', 1, 0, 0], [C('vMystery2'), 10, 0.8, 2], ['ruSprinter', 5, 1, 5], ['thRogue', 6, 1.2, 8], ['txHeavyTitan', 4, 1.5, 11]],
    note: 'Miniboss: the Gilded Berserker!' },
  // 11-15
  { groups: [[C('xViorb'), 1, 0, 0], [C('xOvercharged'), 6, 1, 2], ['thBigRune', 4, 1.5, 4], ['txThumper', 4, 1.5, 7], ['vcVoidling', 2, 3, 10]] },
  { groups: [[C('fRusher'), 5, 1.5, 0], ['txLurch', 4, 1.5, 3], [C('xCloaker'), 5, 1.2, 6], ['vcMandrake', 4, 1.6, 9], ['thSeer', 2, 5, 11]] },
  { groups: [['vcVoidling', 4, 1.6, 0], [C('fPossessed'), 3, 2, 3], ['ruCosmil', 4, 1.5, 6], ['txPodJumper', 2, 6, 8], ['thBigRogue', 2, 3, 11]] },
  { groups: [['thCrackedSentry', 5, 1.6, 0], [C('vBoss2'), 3, 2.5, 3], [C('xVioGunner'), 2, 4, 6], ['txChariot', 2, 4, 8], ['vcElitePhantom', 3, 2, 11], ['ruTeleporter', 6, 1, 13]] },
  { groups: [[C('xDoomelist'), 2, 6, 0, { boss: true }], ['thWorm1', 2, 8, 2], [C('fNecrotic'), 4, 2, 5], ['vcSwift', 20, 0.3, 8], ['txBreacher', 3, 2, 10]],
    note: 'Miniboss: a pair of Doomelists!' },
  // 16-20
  { groups: [['vcVoidReaper', 2, 5, 0], ['thBigRogue', 4, 2, 2], [C('vHiddenBoss'), 4, 1.5, 5], ['ruEngineer', 1, 0, 7], ['txMultiplier', 3, 3, 9], ['vcPhantom', 12, 0.5, 9]] },
  { groups: [[C('xFlagBot'), 2, 4, 0], [C('fCorrupted'), 5, 1.4, 2], ['thWingedReaper', 4, 1.5, 5], ['txBreacher', 4, 1.5, 7], [C('vBoss3'), 3, 2, 10], ['ruCarrier', 1, 0, 12]] },
  { groups: [['vcBlighted', 1, 0, 0], [C('fJester'), 1, 0, 2], ['thOverseer', 2, 4, 3], ['vcFloater', 4, 1.6, 5], ['ruCarrier', 2, 4, 8], [C('fRusher'), 4, 1.5, 11]],
    note: 'Minibosses: the Blighted and the Fallen Jester!' },
  { groups: [[C('vNecroBoss'), 1, 0, 0], ['txCharger', 3, 2, 3], ['vcUnknownSmall', 3, 2.5, 6], ['thBigGolem', 4, 2, 8], ['ruChaotic', 8, 0.6, 11]] },
  { groups: [['vcTitan', 1, 0, 0], [C('fShield'), 1, 0, 3], ['vcEliteRusher', 4, 1.5, 5], ['vcMandragora', 1, 0, 8], [C('fHero'), 4, 1.5, 9], ['thSkullGhost', 4, 1.5, 12]],
    note: 'BOSS: the Void Titan, with the Fallen Shield!' },
  // 21-25
  { groups: [['tbIssue', 5, 1, 0], ['tbError', 5, 1, 4], ['tbVirus', 5, 1, 8], ['txBounded', 2, 4, 3], [C('xTimeRunner'), 3, 3, 10], ['ruLegionship', 1, 0, 12]],
    note: '<ERROR> We\'re going back... at the beginning..' },
  { groups: [['ruCysian', 1, 0, 0], ['vcSlowKing', 3, 3, 2], ['vcSpeedyKing', 5, 1.4, 4], ['thBDMReaper', 8, 0.8, 6], [C('vBoss4'), 2, 4, 9], ['ruSprinter', 10, 0.5, 11]],
    note: 'BOSS: the Cysian Master!' },
  { groups: [['thDevilReaper', 5, 1.4, 0], ['thSkullGhost', 5, 1.2, 3], ['txNader', 3, 2.5, 5], [C('fAngel'), 1, 0, 7, { boss: true }], [C('xShieldBot'), 3, 2.5, 8],
    ['tbJ', 4, 0.8, 10], ['tbM', 5, 0.8, 11], ['tbPatientZero', 2, 2, 13]] },
  { groups: [['thBigWorm1', 1, 0, 0], [C('vBoss4'), 4, 2, 3], ['txNuclear', 3, 3, 5], ['ruJuggernaut', 1, 0, 7], ['vcSoul', 8, 0.8, 9], ['vcCultist', 1, 0, 11], [C('fTank'), 2, 3, 12]] },
  { groups: [[C('xDeathAngel'), 1, 0, 0], [C('fSummoner'), 1, 0, 3], ['vcNightshade', 2, 5, 5], ['thEliteRogue', 2, 4, 8], ['txTracker', 2, 4, 10], ['vcVoidling', 8, 0.8, 12]],
    note: 'BOSS: the Death Angel, with the Fallen Summoner!' },
  // 26-30
  { groups: [[C('xTimeTitan'), 2, 5, 0], [C('xTimeCrystal'), 1, 0, 3], ['txAerialJug', 4, 2, 5], ['vcUnknownBoss', 1, 0, 7], ['ruChampion', 1, 0, 9], ['ruVessel', 3, 2.5, 11], ['thGiantGolem', 2, 4, 13]] },
  { groups: [['txJager', 1, 0, 0], ['txDispenser', 2, 4, 2], ['txE02', 8, 1, 4], ['txJX', 4, 1.6, 8], ['vcEliteSoul', 2, 4, 10], ['txPodE02', 2, 6, 12]],
    note: 'Miniboss: the Jager drops in!' },
  { groups: [['thGiantGolem', 3, 3, 0], ['thBigDemonSlime', 2, 5, 3], ['vcHeavyVoidling', 2, 4, 5], ['ruDemonic', 1, 0, 7], [C('fTank'), 3, 2.5, 9], [C('xVioRusher'), 4, 2, 11]] },
  { groups: [['thDarkSkeleton', 3, 4, 0], [C('vGuardian'), 1, 0, 3], ['vcKnight', 1, 0, 5], ['txXTank', 2, 5, 7], ['ruEye', 10, 0.6, 9], ['ruAbomination', 5, 1, 11], ['txAvatar', 2, 4, 13]] },
  { groups: [['vcCrystalian', 1, 0, 0], [C('fHonorGuard'), 1, 0, 4], ['vcEliteRusher', 6, 1, 6], ['ruHardLight', 6, 1, 8], [C('xTimeShard'), 6, 1, 10], ['thBigSkullGhost', 3, 2, 12]],
    note: 'BOSS: the Crystalian and the Fallen Honor Guard!' },
  // 31-35
  { groups: [['thBigReaper', 4, 2, 0], ['vcTrickster', 1, 0, 3], ['ruTranquil', 4, 2, 5], [C('fGuardian'), 1, 0, 7], ['txGrumble', 1, 0, 10], ['ruElemental', 8, 0.6, 12], ['vcSpeedyKing', 6, 1, 13]] },
  { groups: [['vcVindicator', 1, 0, 0], ['vcSlowKing', 4, 2.5, 3], ['thEliteRogue', 4, 2, 5], ['txHunter', 2, 4, 7], ['vcCultist', 2, 6, 9], [C('xCloaker'), 8, 0.8, 11]],
    note: 'BOSS: the Vindicator!' },
  { groups: [[C('xRebirther'), 1, 0, 0], ['vcKnight', 2, 5, 3], ['thBigWorm1', 1, 0, 5], ['txCharger', 6, 1.2, 7], ['ruChampion', 2, 5, 9], ['vcElitePhantom', 8, 0.8, 11]],
    note: 'BOSS: the Rebirther!' },
  { groups: [['tbJack', 3, 5, 0], [C('vNecroBoss'), 2, 5, 3], [C('vBoss4'), 6, 1.5, 5], ['tbError', 8, 0.8, 8], ['tbVirus', 8, 0.8, 10], ['tbIssue', 8, 0.8, 12]],
    note: 'Three Expired Jacks, straight from the Tower Battles hidden wave!' },
  { groups: [['txApex', 1, 0, 0], ['txE02', 12, 0.8, 3], ['txNuclear', 4, 2, 6], ['txXTank', 2, 5, 9], ['txPodE02', 3, 5, 11], ['txAerialJug', 6, 1.2, 13]],
    note: 'BOSS: the Apex Predator!' },
  // 36-40
  { groups: [['ruGrandEye', 1, 0, 0], ['ruEye', 18, 0.5, 3], ['ruTranquil', 6, 1.5, 6], ['ruAbomination', 10, 0.8, 9], ['ruDemonic', 2, 6, 11]],
    note: 'BOSS: the Grand Eye of the Seer!' },
  { groups: [['vcGuardian', 1, 0, 0], ['vcHeavyVoidling', 4, 2.5, 3], ['vcNightshade', 4, 3, 5], ['thGiantGolem', 4, 2, 8], ['thOverseer', 4, 2, 10], [C('fHero'), 8, 1, 12]],
    note: 'The Void Guardian!' },
  { groups: [['vcSoulStealer', 1, 0, 0], ['vcEliteSoul', 4, 3, 4], ['vcSoul', 16, 0.5, 6], ['vcUnknownBoss', 3, 3, 8], ['vcTrickster', 1, 0, 11], ['vcCultist', 2, 6, 13]],
    note: 'BOSS: the Soul Stealer!' },
  { groups: [['thBigDemonSlime', 4, 3, 0], ['thDarkSkeleton', 4, 3, 2], ['txGrumble', 2, 8, 4], ['ruJuggernaut', 3, 3, 6], ['txJX', 8, 1, 8], [C('xTimeTitan'), 3, 3, 10],
    ['vcKnight', 2, 5, 12], ['ruLegionship', 2, 6, 13]] },
  { groups: [[C('fKing'), 1, 0, 0], [C('fShield'), 1, 0, 2], [C('fRusher'), 8, 1, 4], [C(('fNecrotic')), 3, 3, 6], [C('fTank'), 2, 4, 8], [C('fPossessed'), 6, 1, 10],
    [C('fHero'), 5, 1.2, 12], [C('fAngel'), 3, 3, 14], [C('fSummoner'), 2, 6, 15], [C('fGuardian'), 2, 6, 16]],
    note: 'BOSS: THE FALLEN KING!' },
  // 41-44: everything at once.
  { groups: [['tbIssue', 12, 0.6, 0], ['tbError', 12, 0.6, 4], ['tbVirus', 12, 0.6, 8], [C('vGuardian'), 2, 6, 6], ['vcSlowKing', 6, 1.6, 10], ['txHunter', 3, 4, 12], ['thBigReaper', 6, 1.2, 14]] },
  { groups: [['txApex', 2, 15, 0], ['vcTrickster', 2, 12, 4], ['ruChampion', 3, 4, 6], ['thEliteRogue', 6, 1.5, 8], ['vcEliteRusher', 10, 0.6, 10], ['txPodE02', 4, 4, 12], ['ruVessel', 6, 1.4, 14]],
    note: 'Two Apex Predators!' },
  { groups: [['vcGuardian', 2, 15, 0], ['vcKnight', 4, 4, 3], ['vcHeavyVoidling', 4, 3, 6], ['vcUnknownBoss', 4, 3, 9], ['vcNightshade', 6, 2, 11], ['vcCultist', 2, 8, 12], ['vcEliteSoul', 6, 2, 14]] },
  { groups: [['tbJack', 2, 6, 0], [C('fHonorGuard'), 1, 0, 3], ['ruGrandEye', 1, 0, 5], ['txXTank', 4, 3, 7], ['thBigWorm1', 2, 6, 9], ['ruTranquil', 8, 1, 11], ['thDarkSkeleton', 4, 2, 13],
    [C('xVioRusher'), 8, 0.8, 15], ['vcSpeedyKing', 10, 0.6, 16]],
    note: 'Everything they\'ve got. The final six are next…' },
  // 45-50: the six final bosses, starting with Void, then by health.
  { groups: [[C('vMystery2'), 40, 0.3, 0], [C('vBoss3'), 15, 1, 4], [C('vBoss4'), 10, 1.6, 8], [C('vNecroBoss'), 3, 4, 12], [C('vGuardian'), 2, 4, 14], [C('vFalseVoid'), 1, 0, 18]],
    note: 'FINAL BOSS 1 of 6: VOID (Tower Battles).' },
  { groups: [[C('xTimeRunner'), 6, 2, 0], [C('xTimeTitan'), 4, 3, 3], [C('xTimeCrystal'), 2, 6, 6], [C('xBeholder'), 1, 0, 8]],
    note: 'FINAL BOSS 2 of 6: THE BEHOLDER (Silly TD).' },
  { groups: [['thSeer', 6, 1.5, 0], ['thEliteRogue', 6, 1.5, 3], ['thBigReaper', 6, 1.5, 6], ['thGiantGolem', 4, 2, 9], ['thDemise', 1, 0, 14]],
    note: 'FINAL BOSS 3 of 6: DEMISE (Tower Heroes).' },
  { groups: [['ruChampion', 3, 4, 0], ['ruTranquil', 6, 1.6, 3], ['ruEye', 16, 0.5, 6], ['ruLegionship', 2, 6, 8], ['ruChronos', 1, 0, 12]],
    note: 'FINAL BOSS 4 of 6: CHRONOS (Tower Blitz).' },
  { groups: [['vcEliteSoul', 4, 3, 0], ['vcSlowKing', 6, 1.6, 3], ['vcKnight', 3, 4, 6], ['vcHeavyVoidling', 3, 4, 8], ['vcReaver', 1, 0, 12]],
    note: 'FINAL BOSS 5 of 6: THE VOID REAVER and the VOID CASTER (TDS).' },
  { groups: [['txE02', 20, 0.5, 0], ['txXTank', 3, 4, 4], ['txPodE02', 5, 3, 6], ['txAerialJug', 6, 1.5, 9], ['txEmperor', 1, 0, 14]],
    note: 'FINAL WAVE. FINAL BOSS 6 of 6: THE EMPEROR (TDX). Beat him to beat Hardcore!' },
];
