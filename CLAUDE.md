# TD Infinity

Browser tower defense (three.js + Vite, plain ES modules, no framework, no TypeScript). Deployed to
GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`, so **a push to main goes live**.

## Working fast here

- **Find the spot first, then read only that range.** The tower tables, model builders and the Sim
  are split into files of 10-80 KB (see below); `src/game/events.js` (100 KB, one method) is the
  big one left. `config.js`, `models.js`, `sim/sim.js` and `game.js` are front doors: other files
  import from them and never from the folders behind them.
- **Find things with tokensave** (`.tokensave/` index exists): `tokensave_search` for a name,
  `literal: true` for exact text such as a tower key (`scout: {`, `case 'ability'`),
  `tokensave_context` for "how does X work". Run `tokensave sync` after large edits so line numbers
  stay right.
- **Check with `npm run check`** (about 25 s, no browser) after every change, before saying it works:
  - `build` bundles the game, tools and server: syntax errors, bad imports, missing exports
  - `data` waves name real enemies, modes name real bosses / unlocks / maps, no NaN in the tables
  - `towers` places all ~715 tower types in the real Sim, walks both upgrade paths, fires every ability
  - `modes` plays every mode to its last wave with an unkillable base
  - `models` builds every tower model at every level, every enemy, every summoned unit
  - Narrow it while iterating: `node tools/check.mjs towers scout` (0.2 s), `node tools/check.mjs modes void`,
    `node tools/check.mjs models data` (sections and/or a key filter).
  - It proves nothing crashes. It does not judge looks or balance: use the tools below for those.
- **Looks:** `tools/viewer.html` on the dev server (`npm run dev`); its URL parameters are listed at the
  top of `tools/viewer.js`. Headless screenshots work but are slow (Playwright recipe: memory note
  `visuals-3-vfx-menu`), so take one only when the look is the point of the change.
- **Balance:** `node tools/balance/bench.mjs [tower]` (measured DPS per level), `play.mjs <mode>` (one
  bot game), `sweep.mjs`, `table.mjs` (money per wave). Music: `node tools/music/check.mjs`.

## Where things live

Gameplay data (plain objects, no three.js):

| What | Where |
| --- | --- |
| Global tuning, Versus, cash rules | `GAME`, `VERSUS`, `MP` at the top of `src/config.js` |
| Towers (stats, levels, abilities, units) | One file per group in `src/towers/` (`gunners.js`, `heavy.js`, `spread.js`, `melee.js`, `spawners.js`, `support.js`, `paths.js`, `golden.js`, `event1.js`, `forms4.js`, `event2.js`, `evolved.js`, `wave6.js`, `golden6.js`, `wave7a.js`, `wave7b.js`; each lists its towers at the top). `TOWERS` in `src/config.js` joins them in that order, then the later batches: `src/crosstowers.js` (crosspath forms), `herotowers.js`, `tenthtowers.js`, `goldtowers.js` |
| Units and abilities shared by towers | `src/towers/shared.js` (it also explains how a tower entry is written) |
| Load-time passes over towers | `RANGE_BOOST` and `TOWER_TUNE` in `src/config.js` (they change the numbers after the table is read, so the table is not always what the game uses) |
| Enemies | `ENEMIES` in `src/enemies.js`; Hardcore's in `src/hardcore.js`, Halloween's in `src/halloween.js` |
| Waves | `EASY_WAVES` ... `VOID_WAVES` in `src/waves.js`, `HARDCORE_WAVES`, `HALLOWEEN_WAVES` in their own files. Group = `[enemy, count, gap, delay, health/opts]` |
| Modes | `DIFFICULTIES` in `src/config.js` (its comments explain every field) |
| Maps | `MAPS` in `src/sim/maps.js`; placement rules and props in `src/sim/map.js`; path math in `src/sim/path.js` |

Game logic (no three.js, no DOM; runs in the browser and in Node):

- `src/sim/sim.js`: class `Sim`, the whole simulation. This file keeps `tick(dt)` (the frame),
  `action(pid, m)` (every player command: `place`, `upgrade`, `sell`, `ability`, `skip`...) and
  `snapshot()` (what goes over the network). The rest of Sim's methods are in `src/sim/parts/`, and
  `sim.js` puts them on the class, so `this.anyMethod()` works from every file:
  `waves.js` (waves, spawning, money), `enemy-moves1.js` / `enemy-moves2.js` (what enemies and bosses
  do), `tower-health.js`, `tower-update.js` (`updateTower`), `weapons1.js` ... `weapons4.js` (tower
  weapons), `units.js` (summons), `abilities.js` (`useAbility`), `damage.js` (`damage`, targeting),
  `shared.js` (constants, `ST_*` status names, `computeBuffs`, upgrade costs).
  A tower mechanic is usually a key on a tower level in `TOWERS` plus the Sim code that reads that
  key: search for the key name. A new Sim method goes in the part file that fits (or a new part
  class added to the list at the bottom of `sim.js`).
- `src/sim/versus.js`: PVP lanes, one `Sim` per player.
- `src/hub.js` (rooms + one authoritative Sim), `src/net.js` (PeerJS), `src/session.js` (solo vs net),
  `server/index.js` (optional WebSocket host).

Drawing (three.js):

- `src/models.js`: the `TOWER_MODELS` registry. The older builders it lists are in `src/models/`:
  `kit.js` (`boxGeo`, `part`, `makeHumanoid`), `bits.js` (small shared pieces), `towers01.js` ...
  `towers12.js` (tower builders; each lists its towers at the top), `units.js` (`makeUnit`),
  `enemy.js` (`makeEnemy`) with `enemies-*.js`, `declip.js`. Newer builders are in
  `src/newmodels/a.js` ... `i.js`, `blitzup.js` (hero tower per-level looks), `hc.js` (Hardcore
  enemies), `halloween.js`. Every key in `TOWERS` needs a `TOWER_MODELS` entry (gold and crosspath
  forms get theirs automatically at the bottom of the registry).
- Layers applied over builders: `src/visuals.js` (stances, holds, enemy shapes), `src/weapons.js`,
  `src/rig.js`, `src/anim.js`. Fix a wrong look there before touching the builder.
- Vehicles and other mechanical summons: the kit in `src/vehicles.js`, builders in
  `vehicleunits.js`, `tankunits.js`, `mechunits.js`, `airunits.js`, `botunits.js`, `trainunits.js`,
  `moreunits.js`. This kit's level of detail is the standard for new models.
- `src/views.js` (a view per sim object), `src/effects.js` + `src/particles.js` (VFX), `src/world.js`
  (`buildWorld` and the plain maps) with one file per special map: `nexusworld.js`,
  `crossingworld.js`, `courtworld.js`, `emberworld.js`, `brookworld.js`, `rampartworld.js`,
  `rigworld.js`, `graveworld.js`; shared map pieces (materials, textures, `TREES`) in `worldkit.js`.

Screens and UI: `src/game.js` (class `GameClient`: start / stop, the frame loop; its other methods are
in `src/game/`, put on the class the same way as Sim's: `events.js` has `handleEvents`, one `case` per
sim event, `view.js` the HUD and camera, `input.js` mouse, keys and placing, `towers.js` the selected
tower, abilities and first-person mode), `src/ui.js` (HUD), `src/stats.js` /
`src/substats.js` / `src/text.js` (stat and description text), `src/lobby.js` (menus), `src/loadout.js`
(shop), `src/icons.js` (portraits), `src/profile.js` (saved progress), `src/style.css`, `index.html`.
Sound: `src/audio.js`, music in `src/music/` (`tracks.js` recipes, `compose.js`, `engine.js`).

## Recipes

- **New tower:** entry in the newest batch file (or a group in `src/towers/`) -> any new mechanic in
  `src/sim/parts/` -> a builder registered in `TOWER_MODELS` -> stat lines in `src/stats.js` if it has a new kind of stat ->
  `node tools/check.mjs towers models <key>`.
- **New enemy:** entry in `ENEMIES` (a mode uses its own enemies, never an earlier mode's) -> its look
  (`makeEnemy` in `models/enemy.js` reads the def; special bodies live in `newmodels/hc.js` and
  `newmodels/halloween.js`) -> add it to a wave -> `node tools/check.mjs data modes <mode>`.
- **New mode:** waves + enemies in their own file (like `src/hardcore.js`), an entry in `DIFFICULTIES`,
  a boss track in `src/music/tracks.js`.
- **New map:** an entry in `MAPS` (`src/sim/maps.js`), a map track in `src/music/tracks.js`; a grid-built
  map also gets its own `*world.js` renderer.

## Conventions

- Comments and UI text are written for a young player and reader: short, plain words.
- Numbers the user did not give are guesses. Say which ones were guessed, and record them in the
  memory notes rather than in code comments.
- Stats for mechanics that are not built yet stay in the data as unused fields.
- Descriptions quote numbers by hand: when a number changes, change the text that quotes it.
- Keep requests small and commit after each finished piece of work.
