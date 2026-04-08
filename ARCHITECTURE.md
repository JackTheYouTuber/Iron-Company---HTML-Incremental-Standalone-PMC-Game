# Iron Company — Architecture Reference

This document is a deep-dive technical reference for contributors who want to
understand *why* the code is structured the way it is, not just *what* it does.
For a quick how-to, read `AGENTS.md`. For the session history, read `AGENT_HANDOFF.txt`.

---

## Core Design Principle: The Data-Driven Engine

The entire codebase is built around one constraint:

> **Adding content must never require editing a JS file.**

This was achieved by separating *content* (JSON files in `data/`) from
*interpretation* (JS files in `js/`). The JS files are a generic runtime that
reads the JSON and derives all game behaviour from it. There are no hardcoded
upgrade IDs, class names, or category strings anywhere in the JS.

The mechanism that makes this possible is the **effect accumulator** pattern
in `js/engine.js`.

---

## The Engine: How Effects Work

Every fort upgrade in `fort_upgrades.json` has an `effects[]` array:

```json
{
  "id": "iron_infirmary",
  "effects": [
    { "type": "hpRegen", "value": 0.03 },
    { "type": "hpRegenMult", "value": 0.01 }
  ]
}
```

Every recruit class in `recruit_classes.json` has a `bonuses[]` array with the
same shape:

```json
{
  "cls": "Field Medic",
  "bonuses": [
    { "type": "hpRegenBonus", "value": 0.02 }
  ]
}
```

`engine.js` exposes two accumulators:

```js
getActiveUpgradeEffects()  // → { effectType: [{value, categoryFilter?}, ...] }
getActiveRosterEffects()   // → same shape, from current roster members
```

And two reduction functions:

```js
accumulateMult(effects, category)  // multiply (1 + value) for all matching effects
accumulateAdd(effects, category)   // sum value for all matching effects
```

Every derived game quantity is built from these four primitives. For example:

```js
function getJobReward(job) {
    const upfx = getActiveUpgradeEffects();
    const rfx  = getActiveRosterEffects();
    let mult = 1.0;
    mult *= accumulateMult(upfx['rewardMult'], job.category);
    mult *= accumulateMult(rfx['rewardMult'],  job.category);
    return Math.floor(job.rewardBase * mult);
}
```

The function never asks "does the player have upgrade X?" — it asks "what is the
combined `rewardMult` bonus from everything currently active?" The answer comes
entirely from the data.

### Adding a new effect type

1. Add the effect to the relevant JSON entry's `effects[]` or `bonuses[]` array.
2. Add a derived function in `engine.js`:
   ```js
   function getMyNewBonus() {
       const efx = getActiveUpgradeEffects();
       return accumulateAdd(efx['myNewBonus']);
   }
   ```
3. Call `getMyNewBonus()` wherever it applies.
4. Document it in the **Effect Type Reference** in `AGENTS.md`.

No other files need to change.

---

## The Boot Chain

Script load order matters. `index.html` loads scripts in this sequence:

```
loader/boot.js      ← shows loading screen immediately (synchronous)
loader/assets.js    ← injects Google Fonts + favicon into <head>

data.js             ← defines loadAllData() — does NOT run it yet

state.js            ← defines GS object and save/load functions
utils.js            ← defines currency, logging, toast helpers
engine.js           ← defines all derived quantity functions
logic/recruits.js
logic/progression.js
logic/actions.js
logic/nations.js
render/hud.js
render/roster.js
... (all render files)
render/index.js     ← defines renderAll()

charCreation/state.js
charCreation/names.js
charCreation/render.js
charCreation/confirm.js
charCreation/index.js

main.js             ← defines startGame() and the game loop

loader/dom.js       ← defines buildDOM()
loader/init.js      ← DOMContentLoaded → boot → loadAllData → buildDOM → startGame
```

`loader/init.js` must be last. It owns `DOMContentLoaded` and orchestrates
the entire startup sequence. The game does not start until all JSON is loaded
and the full DOM is built.

### Why not ES modules?

ES modules would require either a bundler or careful import ordering with
`type="module"`. The project deliberately avoids both to keep the development
cycle as simple as possible: edit a file, hard-refresh, done. The explicit
script load order in `index.html` serves the same purpose as an import graph.

---

## The Game Loop

`main.js` runs a `requestAnimationFrame` loop:

```js
function gameTick() {
    const dt = (now - lastTick) / 1000;  // seconds since last frame
    dayTimer += dt;
    if (dayTimer >= DAY_DURATION()) {
        // advance day: HP regen, nation threat decay, suppression checks, auto-save
    }
    tickSuppressionEvents(dt);
    // tick active jobs (subtract dt from timeLeft, complete if <= 0)
    renderCurrency();
    renderCommander();
    if (completedAny || suppressionChanged) renderAll();
    else { renderActiveJobs(); renderNationPanel(); }
    requestAnimationFrame(gameTick);
}
```

Key design decisions:

- **Real-time, not turn-based.** Jobs complete after real seconds pass.
  `DAY_DURATION()` is read from `game_config.json` (default 120s = 2 minutes/day).
- **Selective rendering.** `renderAll()` is only called when something meaningful
  changes. Most frames only update the HUD and active job progress bars.
- **`dt`-based timers.** Job time is decremented by actual elapsed seconds per
  frame, not by a fixed tick. This means the game runs correctly regardless of
  frame rate.

---

## State and Saves

`GS` (Game State) is a plain JavaScript object defined in `state.js`. It is the
single source of truth for all runtime game state. There is no other state.

Saves are stored in `localStorage` as JSON-serialised copies of `GS`, keyed by
a user-chosen slot name. `loadGame()` does an `Object.assign` merge with safe
defaults for any missing keys — this provides forward compatibility when new
fields are added to GS.

**Important:** IDs in `data/` files are referenced by value in saves
(e.g., `GS.upgrades['iron_infirmary'] = true`). Renaming or removing a JSON ID
after a save exists will silently orphan that save data. Treat all content IDs
as permanent once shipped.

---

## The Nation / Suppression System

Nation threat is a numeric value per nation (`GS.nationThreat[nationId]`).
It increases when jobs with `nationThreatGain` entries are completed, and decays
by a fixed amount per day (`nationThreatDecayPerDay` in `game_config.json`).

The relation level (`indifferent` → `war`) is derived from the threat value
against the nation's `toleranceThresholds` — it is not stored independently
and will always be recalculated correctly from the raw threat number.

Suppression events are spawned by `checkAndSpawnSuppression()` (called once per
game day) when a nation reaches `alarm` or higher. They appear as time-limited
contracts on the Contracts tab. If ignored until expiry, a penalty is applied
via `GS.suppressionPenalties`. Penalties expire after a configurable number of
days and are applied live by `getActivePenaltyMult()` in the engine.

---

## Milestone System

Milestones are evaluated generically by `evaluateMilestoneCheck(check)` in
`js/logic/progression.js`. The `check.type` field dispatches to a `switch`
statement — this is the only place in the logic layer where a string literal
controls behaviour, and it is intentional (adding a new check type is a
one-line addition to the switch plus a JSON entry).

`checkMilestones()` is called after any state-changing event (job completion,
hire, upgrade purchase, PMC tier advance). It is idempotent — already-completed
milestones are gated by `GS.milestones[m.id]`.

---

## Render Layer Contract

The render layer (`js/render/*.js`) has one rule: **read from GS and DATA,
write to the DOM, do nothing else.** Render functions must not:

- Modify GS
- Call logic functions that modify GS
- Make async calls

`renderAll()` (defined in `js/render/index.js`) calls every render function.
It is safe to call at any time — it is purely a DOM sync operation.

---

## CSS Architecture

Styles are split across a `css/` folder that mirrors the `js/` folder
structure exactly. The entry point is `css/index.css`, which is the only
stylesheet linked from `index.html`. It imports four sub-folder `index.css`
barrel files, each of which imports the individual partials within it.

```
css/
├── index.css                  ← master entry point (@imports all four below)
├── loader/
│   ├── base.css               ← @font-face import, :root variables, reset, body, scanline
│   ├── layout.css             ← header, currency bar, game-area grid, panel chrome
│   └── index.css
├── render/
│   ├── commander.css          ← commander card, stat grid, hp/xp bars
│   ├── hud.css                ← section labels, tabs, log panel, badges, toast, scrollbars
│   ├── jobs.css               ← job cards, progress bar, danger levels, category headers
│   ├── hire.css               ← recruit cards and hire cards
│   ├── fort.css               ← upgrade cards and upgrade category badge colours
│   ├── company.css            ← company stats, fame bar, milestones, roster labels, magic bar
│   ├── saves.css              ← save cards, save/load/delete buttons, input row
│   └── index.css
├── logic/
│   ├── arcane.css             ← magic tags, lore text, warded badge, arcane job accents
│   ├── nations.css            ← nation cards, threat bars, PMC tier card, suppression badges
│   └── index.css
└── charCreation/
    ├── overlay.css            ← overlay backdrop, modal shell, header/footer, buttons, shake
    ├── names.css              ← name input row, inline random button, cc-section-label
    ├── render.css             ← origin grid, origin cards, stat bars, lore toggle
    ├── confirm.css            ← stat preview box
    └── index.css
```

CSS custom properties (variables) are defined in `:root` inside
`css/loader/base.css` — all colours, spacing tokens, and font families
reference these variables. To create a new theme, only the `:root` block
needs to change.

The visual theme is retro medieval dark:
- **UnifrakturMaguntia** (Google Fonts) for headings
- **IM Fell English** (Google Fonts) for body text
- Parchment/charcoal colour palette

The Google Fonts `@import` lives in `css/loader/base.css`. Fonts are also
injected at runtime by `js/loader/assets.js` as a redundant fast-path to
avoid a render-blocking `<link>` in `index.html`.

The original `css/style.css` is retained on disk as a reference backup but
is no longer linked from `index.html`.

---

## Known Issues and Sharp Edges

See `AGENTS.md` for the current known issues list. This section documents
*structural* sharp edges rather than bugs.

**Save compatibility:** `loadGame()` merges with `Object.assign` (shallow).
Nested arrays like `suppressionEvents` are replaced wholesale by the save data
— no deep merge occurs. This is correct for the save/load use case but means
corrupt nested data in a save will not be sanitised by the defaults.

**Global function namespace:** All functions are global. This is intentional
(avoids module complexity) but means name collisions are possible. Prefix new
utility functions with a module hint if they might be generic
(e.g., `renderFort_` prefix is safer than just `render_`).

**`requestAnimationFrame` and background tabs:** Browsers throttle rAF in
background tabs. Job timers will effectively pause when the tab is backgrounded.
This is currently treated as a feature (the game doesn't progress while you
can't see it) but is worth noting if idle/offline progression is ever added.
