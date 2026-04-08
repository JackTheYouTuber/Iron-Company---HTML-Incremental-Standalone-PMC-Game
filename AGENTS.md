# AGENTS.md — Iron Company: Handoff Document for AI Agents & Contributors

**Read this first. Append to this file when you make significant changes.**
Do not rewrite the history sections. Add a new dated entry at the bottom under "Session Log".

---

## What This Project Is

**Iron Company** is a browser-based incremental RPG set in a dark fantasy world.
The player starts as a lone mercenary commander in an abandoned fort and builds a
private military company that eventually grows into a sovereign nation-state — powerful
enough to frighten and fight established kingdoms, alliances, and empires.

The endgame goal is PMC Tier 6: **Sovereign Force**. Think Metal Gear Solid's
Outer Heaven / Diamond Dogs arc, translated into medieval fantasy.

The game must be served over HTTP (not opened as a raw file) because it uses
`fetch()` to load JSON data. Use `python -m http.server 8000` in the project folder,
or double-click `server_manager.pyw` (requires Python + tkinter, no console window).

---

## Architecture: The Most Important Thing to Understand

**This project is deliberately data-driven. The rule is: no game content in JS.**

All game content — jobs, recruits, upgrades, nations, milestones, config values —
lives in `data/*.json`. The JS files are interpreters, not content.

### The Engine Pattern (`js/engine.js`)

This is the core. It reads upgrade effects and roster bonuses through two generic accumulators:

```js
getActiveUpgradeEffects()  // → { effectType: [{value, categoryFilter?}, ...], ... }
getActiveRosterEffects()   // → same shape, from each recruit's bonuses[] array

accumulateMult(effects, category)  // multiplies all matching effects together
accumulateAdd(effects, category)   // sums all matching effects
```

`getJobDuration`, `getJobReward`, `getFameReward`, `getJobXp`, `getHpRegenRate`,
`maxRoster`, `getCommanderStatBonus`, `getMagicBonus`, `isFortWarded`, etc.
— all work by calling these two functions. They never name a specific upgrade ID
or class name.

**If you add a new fort upgrade effect type:**
1. Add it to the upgrade's `effects[]` array in `fort_upgrades.json`
2. If the effect type is new (e.g. `moraleBonus`), add a new derived function in
   `engine.js` that calls `accumulateAdd(efx['moraleBonus'])` — no ID checks.
3. Call that function wherever it needs to apply.

**If you add a new recruit bonus type:**
1. Add it to the class's `bonuses[]` array in `recruit_classes.json`
2. Same pattern — the engine picks it up automatically through `getActiveRosterEffects()`.

---

## File Map

```
iron_company/
│
├── data/                         ← ALL game content lives here
│   ├── game_config.json          ← Every tunable number (day length, XP formula, etc.)
│   ├── jobs.json                 ← All 40 contracts
│   ├── recruit_classes.json      ← All 19 recruit class definitions
│   ├── fort_upgrades.json        ← All 25 fort upgrade definitions
│   ├── milestones.json           ← All 46 milestones
│   ├── nations.json              ← 5 nations with threat thresholds & responses
│   ├── pmc_tiers.json            ← 7 PMC tier definitions (the progression spine)
│   ├── suppression_events.json   ← 8 suppression operation types nations deploy
│   ├── origins.json              ← 10 character creation origins
│   ├── fame_ranks.json           ← 8 fame/renown rank thresholds
│   └── commander_ranks.json      ← Title strings per level
│
├── js/
│   ├── engine.js                 ← Core interpreter. Pure data → derived values.
│   ├── data.js                   ← Async JSON loader. Populates DATA object.
│   ├── state.js                  ← GS (game state) object + save/load system
│   ├── utils.js                  ← Currency, logging, toast, tab switching
│   ├── main.js                   ← Game loop, tick integration, modal helpers
│   ├── charCreation.js           ← Character creation modal logic
│   │
│   ├── loader/                   ← Boot chain (runs before game code)
│   │   ├── boot.js               ← Loading screen & error display
│   │   ├── assets.js             ← Font & favicon injection
│   │   ├── dom.js                ← Builds ALL game HTML into #app
│   │   └── init.js               ← Entry point: boot→data→DOM→startGame()
│   │
│   ├── logic/                    ← Pure game logic, no DOM
│   │   ├── recruits.js           ← Recruit pool generation (weighted by rarityWeight)
│   │   ├── progression.js        ← XP/levelling, fame, milestone evaluation
│   │   ├── actions.js            ← Player actions: startJob, hireRecruit, buyUpgrade
│   │   └── nations.js            ← Nation threat, suppression spawn/tick, PMC tier advancement
│   │
│   └── render/                   ← DOM updates only, no logic
│       ├── hud.js                ← Header currency bar + commander panel
│       ├── roster.js             ← Left panel warband list
│       ├── jobs.js               ← Contracts tab (all categories) + active jobs right panel
│       ├── hire.js               ← Hire tab
│       ├── fort.js               ← Fort tab (grouped by category)
│       ├── company.js            ← Company tab (stats, fame bar, milestones)
│       ├── nations.js            ← Nation threat panel + PMC tier card + fort status
│       ├── saves.js              ← Chronicle (saves) tab
│       └── index.js              ← renderAll() orchestrator
│
├── css/                          ← Styles fragmented to mirror js/ folder structure.
│   ├── index.css                 ← Master entry point. @imports the four index files below.
│   ├── loader/
│   │   ├── base.css              ← @font-face import, :root variables, reset, body, scanline
│   │   ├── layout.css            ← Header, currency bar, game-area grid, panel chrome
│   │   └── index.css
│   ├── render/
│   │   ├── commander.css         ← Commander card, stat grid, hp/xp bars
│   │   ├── hud.css               ← Section labels, tabs, log panel, badges, toast, scrollbars
│   │   ├── jobs.css              ← Job cards, progress bar, danger levels, category headers
│   │   ├── hire.css              ← Recruit and hire cards
│   │   ├── fort.css              ← Upgrade cards and category badge colours
│   │   ├── company.css           ← Company stats, fame bar, milestones, roster, magic bar
│   │   ├── saves.css             ← Save cards, buttons, input row
│   │   └── index.css
│   ├── logic/
│   │   ├── arcane.css            ← Magic tags, lore text, warded badge, arcane job accents
│   │   ├── nations.css           ← Nation cards, threat bars, PMC tier card, suppression
│   │   └── index.css
│   ├── charCreation/
│   │   ├── overlay.css           ← Overlay backdrop, modal shell, buttons, shake animation
│   │   ├── names.css             ← Name input row and random button
│   │   ├── render.css            ← Origin grid, origin cards, stat bars, lore toggle
│   │   ├── confirm.css           ← Stat preview box
│   │   └── index.css
│   └── style.css                 ← Original monolith. Retained as backup, no longer linked.
│
├── index.html                    ← Pure shell: <div id="app"> + script tags only
└── server_manager.pyw            ← Python/tkinter GUI to start/stop the HTTP server
```

---

## The Data Schemas

### `jobs.json` entry
```json
{
  "id": "unique_snake_case",
  "name": "Display Name",
  "desc": "In-world description (prose).",
  "flavour": "Short italicised quote.",
  "category": "one of: scouting|escort|guard|bounty|combat|siege|dungeon|arcane|intelligence|political|territorial|suppression_counter|nation_pressure|proxy_war|nation_war|sovereign_ops",
  "danger": 1,
  "durationBase": 30,
  "rewardBase": 400,
  "xpBase": 50,
  "fameBase": 15,
  "requirements": {
    "minLevel": 1,
    "minRoster": 0,
    "minFame": 0,
    "minStr": 0, "minEnd": 0, "minLead": 0, "minCun": 0,
    "minMagic": 0,
    "minTotalStr": 0, "minTotalCun": 0, "minTotalEnd": 0,
    "minCompanySize": 1,
    "requiresMagicUser": false,
    "requiredClasses": [],
    "forbiddenClasses": [],
    "forbiddenIfActiveJobs": [],
    "requiredUpgrades": [],
    "requiredMilestones": [],
    "maxActiveJobs": 99
  },
  "repeatable": true,
  "failureRisk": 0.10,
  "tooltip": "Human-readable requirements summary.",
  "nationThreatGain": { "nation_id": 25 }
}
```
`nationThreatGain` values can be negative (reduces threat). They are scaled by
`getNationThreatMult()` before applying, so upgrades/recruits that reduce threat
growth affect all jobs automatically.

### `recruit_classes.json` entry
```json
{
  "cls": "Class Name",
  "adj": ["list","of","adjectives"],
  "surnames": ["list","of","surnames"],
  "givenNames": ["list","of","given","names"],
  "hireCostMult": 1.0,
  "stats": { "str":[min,max], "end":[min,max], "lead":[min,max], "cun":[min,max] },
  "magic": 0,
  "desc": "One-line flavour summary.",
  "lore": "Longer background sentence.",
  "bonuses": [
    { "type": "rewardMult", "value": 0.10, "categoryFilter": "combat", "desc": "Displayed to player" },
    { "type": "durationMult", "value": -0.10, "desc": "No filter = applies to all categories" }
  ],
  "rarity": "common|uncommon|rare",
  "rarityWeight": 50
}
```
`rarityWeight` is the draw probability weight in the recruit pool.
A class with weight 100 is roughly 10× more likely than a class with weight 10.
Rare classes only appear if an upgrade with `{ "type": "unlockRareRecruits", "value": true }`
is active.

### `fort_upgrades.json` entry
```json
{
  "id": "unique_id",
  "name": "Display Name",
  "desc": "What it does and why.",
  "flavour": "Short atmospheric quote.",
  "cost": 1000,
  "effect": "Player-readable summary of effects.",
  "category": "infrastructure|military|economy|welfare|reputation|arcane",
  "requiresUpgrade": "prerequisite_id_or_null",
  "effects": [
    { "type": "rewardMult",  "value": 0.10 },
    { "type": "rewardMult",  "value": 0.15, "categoryFilter": "arcane" },
    { "type": "durationMult","value": -0.10, "categoryFilter": "scouting" }
  ]
}
```

### Supported `effects[].type` values (engine.js interprets these)

| Type | Behaviour |
|---|---|
| `rosterSlots` | Adds to maximum roster capacity |
| `rewardMult` | Multiplies contract reward (stacks multiplicatively) |
| `durationMult` | Multiplies contract duration (negative = faster) |
| `fameMult` | Multiplies fame reward |
| `xpMult` | Multiplies XP reward |
| `xpReqMult` | Multiplies XP required to level (use negative values) |
| `hpRegen` | Base HP regen rate per day (fraction of maxHp) |
| `hpRegenMult` | Additive bonus to hpRegen rate |
| `hpRegenBonus` | Same as hpRegenMult (for recruit bonuses) |
| `commanderStatBonus` | Flat bonus to all commander stat checks |
| `recruitStatBonus` | Bonus to a specific stat for all generated recruits (`"stat": "cun"`) |
| `magicBonus` | Adds to company magic total |
| `magicMultiplier` | Multiplies all magic bonuses (doubles, etc.) |
| `activeJobCap` | Adds to the global maximum simultaneous contracts |
| `unlockRareRecruits` | `value: true` — allows rare classes into the recruit pool |
| `fortWarded` | `value: true` — used by `isFortWarded()` checks |
| `suppressionResist` | Additive resistance to suppression event penalties |
| `nationThreatMult` | Multiplies threat generated (negative = less threat) |
| `blockadeImmunity` | `value: true` — negates economic blockade suppression penalty |

All types support an optional `categoryFilter` field. If present, the effect only
applies when the job's category matches.

### `milestones.json` entry
```json
{
  "id": "unique_id",
  "label": "Short display name",
  "desc": "What the player must do.",
  "flavour": "Unlocked quote.",
  "check": { "type": "checkType", "value": 5 }
}
```

### Supported `check.type` values (`progression.js` evaluates these)

| Type | Value field | Description |
|---|---|---|
| `totalJobsDone` | number | Total contracts completed |
| `rosterLength` | number | Current roster size |
| `rosterFull` | any | Roster at maximum capacity |
| `bronze` | number | Treasury >= value |
| `fame` | number | Total fame >= value |
| `commanderLevel` | number | Commander level >= value |
| `upgradeCount` | number | Number of built upgrades >= value |
| `allUpgrades` | any | All upgrades built |
| `upgradeBuilt` | string (id) | Specific upgrade is built |
| `fortWarded` | any | isFortWarded() is true |
| `rosterHasClass` | string (cls) | Named class is in roster |
| `rosterHasRarity` | string | Any recruit of that rarity in roster |
| `hasRareRecruit` | any | Any rare recruit in roster |
| `hasMagicUser` | any | Roster has member with magic >= threshold |
| `totalMagicStat` | number | Company total magic >= value |
| `completedJobCategory` | string (cat) | At least 1 job of category done |
| `categoryJobsDone` | number + `"category"` | N jobs in specific category |
| `categoryJobsDoneMulti` | number + `"categories":[]` | N jobs total across listed categories |
| `pmcTier` | number | GS.pmcTier >= value |
| `suppressionSurvived` | number | Suppression events resolved >= value |
| `nationAtRelation` | string (relation) | Any nation at that relation or worse |
| `nationThreatReduced` | any | Any nation's threat reduced to 0 |
| `specificJobDone` | string (id) | Named job completed at least once |
| `specificJobDoneCount` | number + `"job"` string | Named job completed N times |
| `totalStr` | number | Company total STR >= value |
| `totalCun` | number | Company total CUN >= value |
| `totalEnd` | number | Company total END >= value |

### `nations.json` entry
```json
{
  "id": "unique_id",
  "name": "Display Name",
  "type": "duchy|kingdom|theocracy|alliance|empire",
  "desc": "Political personality summary.",
  "flag": "emoji",
  "color": "#hex",
  "fearColor": "#hex",
  "toleranceThresholds": {
    "notice": 100, "concern": 300, "alarm": 600, "hostile": 1000, "war": 1800
  },
  "responses": {
    "notice": "Flavour text when threshold crossed.",
    "concern": "...", "alarm": "...", "hostile": "...", "war": "..."
  },
  "suppressionStrength": 3,
  "startRelation": "neutral|indifferent|wary|suspicious",
  "pmcTierNotice": 1,
  "triggersOnArcaneJobs": false
}
```
`pmcTierNotice` is the PMC tier at which this nation first becomes aware of the
company. Below that tier, `applyNationThreatGains()` skips them.

### `suppression_events.json` entry
```json
{
  "id": "unique_id",
  "name": "Event Name",
  "desc": "What the nation is doing to you.",
  "flavour": "Short quote.",
  "category": "suppression",
  "sourceNationTypes": ["all"] or ["kingdom", "empire"],
  "triggersAtRelation": "concern|alarm|hostile|war",
  "danger": 3,
  "durationBase": 40,
  "rewardBase": 500,
  "xpBase": 60,
  "fameBase": 25,
  "requirements": {},
  "effect": { "type": "threatReduction", "nation": "source", "value": 150 },
  "penaltyIfIgnored": { "type": "rewardMult", "value": -0.20, "duration": 7 },
  "flavourResolved": "Text shown when the player resolves it."
}
```
`penaltyIfIgnored.type` can be any engine effect type, plus `commanderHpDrain`,
`rosterLoss`, and `fortDamage` which are handled specially in `logic/nations.js`.

### `pmc_tiers.json` entry
```json
{
  "tier": 2,
  "id": "warband",
  "name": "Iron Warband",
  "desc": "Long description.",
  "flavour": "Short quote.",
  "thresholdFame": 400,
  "thresholdBronze": 25000,
  "thresholdRoster": 5,
  "thresholdJobsDone": 15,
  "nationThreatMult": 0.6,
  "unlocks": ["territorial", "suppression_counter"]
}
```
`unlocks` is the list of job categories that become visible/usable at this tier.
All four thresholds must be met simultaneously to advance.

### `game_config.json` — tunable constants
Edit freely. No JS changes needed.
- `dayDuration` — real seconds per in-game day
- `baseRosterSize` — roster slots before any upgrades
- `recruitPoolBase` / `recruitPoolPerJobsDone` / `recruitPoolMax` — pool size formula
- `xpBaseFormula` — `{ "base": 100, "exponent": 1.6 }`
- `levelUpGains` — stat gains per level: `{ "str":2, "end":1, "lead":1, "cun":1, "hp":15 }`
- `startingStats` — commander base stats before origin bonuses
- `dangerFameDefaults` — fame reward per danger level if `fameBase` not set in job
- `recruitCostRange` — `[min, max]` bronze base cost range
- `suppressionCheckIntervalDays` — how often the game checks if nations should spawn events
- `nationThreatDecayPerDay` — threat points that decay per day automatically
- `suppressionPenaltyDurationDays` — how long ignored suppression penalties last
- `pmcTierCategoryIcons` — emoji overrides for job category icons in the UI

---

## The Nation Threat System

Nations track a numeric `threat` value per nation in `GS.nationThreat[nationId]`.
Each job in `jobs.json` has a `nationThreatGain` map. When a job completes,
`applyNationThreatGains()` in `engine.js` scales the gain by `getNationThreatMult()`
(which reads from upgrade/recruit effects) and applies it.

The threat value is compared against the nation's `toleranceThresholds` to derive
a relation string. When the relation crosses a threshold, the response text logs.

Every in-game day, `decayNationThreat()` reduces all nation threat by
`config.nationThreatDecayPerDay`. This creates natural tension — ignore a nation
long enough and they calm down, but active operations keep them hot.

When a nation reaches `alarm`, `hostile`, or `war` and no suppression event from
them is already active, `checkAndSpawnSuppression()` (called each day tick) will
spawn one. The player sees it in the Contracts tab as a timed red card. Resolving
it reduces the nation's threat. Ignoring it applies a penalty.

---

## The PMC Tier System

`GS.pmcTier` is an integer 0–6. It advances in `checkPmcAdvancement()` whenever
all four thresholds in the next `pmc_tiers.json` entry are met simultaneously.

Tier advancement:
1. Logs a flavour message
2. Makes previously-unaware nations aware (`GS.nationRelations[id]` initialised)
3. Each tier's `unlocks[]` array controls which job categories are visible in the UI
4. Checks milestones

The right panel shows a PMC tier card with progress bars toward the next tier.

---

## The Save System

Saves are stored in `localStorage` under `ironcompany_save_<slotName>`.
An index of all slot names is kept under `ironcompany_saves`.

`listSaves()` returns all saves with a preview object for the load screen.
`saveGame(slotName)` serialises `GS` entirely.
`loadGame(slotName)` deserialises with safe merge defaults for any missing new fields
(important for saves from older versions — always add defaults in the merge).

**If you add a new field to `GS`:** also add a safe default for it in the
`Object.assign(GS, { newField: defaultValue, ...data })` call in `loadGame()`.

---

## Current Content Counts (as of last session)

| File | Count |
|---|---|
| `jobs.json` | 40 contracts |
| `recruit_classes.json` | 19 classes |
| `fort_upgrades.json` | 25 upgrades |
| `milestones.json` | 46 milestones |
| `nations.json` | 5 nations |
| `pmc_tiers.json` | 7 tiers (0–6) |
| `suppression_events.json` | 8 event types |
| `origins.json` | 10 character creation origins |
| `fame_ranks.json` | 8 renown ranks |
| `commander_ranks.json` | 7 title strings |

### Job categories and counts
```
scouting: 1     escort: 2       guard: 2        bounty: 1
combat: 1       siege: 1        dungeon: 3       arcane: 10
intelligence: 4  political: 3   territorial: 3
suppression_counter: 3          nation_pressure: 1
proxy_war: 1    nation_war: 3   sovereign_ops: 1
```

---

## Things That Are Not Yet Built (Known Gaps)

These systems have data and logic but incomplete or missing UI / game loop integration:

1. **Suppression penalty application** — `commanderHpDrain`, `rosterLoss`, and
   `fortDamage` penalty types are referenced in `suppression_events.json` and
   `logic/nations.js` but their actual effects (HP drain, removing a roster member,
   etc.) are partially stubbed. The penalty storage in `GS.suppressionPenalties`
   is wired but `commanderHpDrain` and `fortDamage` need game-loop handlers.

2. **Active job cap from `maxActiveJobs` per-job vs global cap** — the logic in
   `engine.js::checkJobRequirements` computes `effectiveCap` but the interaction
   between per-job `maxActiveJobs: 1` and the global `activeJobCap` upgrades
   could be better tested for edge cases.

3. **Arcane jobs requiring `triggersOnArcaneJobs`** — `nations.json` has a
   `triggersOnArcaneJobs: true` flag on the Pale Conclave but the game loop
   doesn't yet add extra Conclave threat when arcane jobs complete. Add a check
   in `main.js` job completion block.

4. **Territory system is counting only** — `GS.territoryClaimed` increments when
   territorial jobs complete but there's no visual territory map, income bonus,
   or further mechanical expression. This is the natural next major feature.

5. **`proxy_war` and `shadow_government` categories** — these categories are
   referenced in `pmc_tiers.json` unlocks and some jobs, but are not fully
   implemented as distinct systems. Currently they use standard job mechanics.

6. **The endgame `sovereign_ops` → `establish_iron_charter`** — this is the
   penultimate content milestone. The `sovereignty_approach` milestone gates it.
   There's no win screen or post-charter state yet.

---

## Coding Conventions

- **No game content in JS.** If you find yourself writing `if (upgradeId === 'smithy')`
  or `if (cls === 'Sergeant')` in a logic file, stop and put it in the JSON instead.
- **`engine.js` is the single source of derived values.** Don't compute duration
  multipliers or reward multipliers in render files.
- **Render files only read, never write.** `render/*.js` files call engine functions
  and write DOM. They do not modify `GS`.
- **`logic/*.js` modifies `GS`.** Actions, progression, nations — these are the
  only files that write to game state.
- **Always call `checkMilestones()` after any state change that could satisfy one.**
- **Always call `checkPmcAdvancement()` after total jobs done, fame, or bronze changes.**

---

## How to Add a New Nation

1. Add an entry to `data/nations.json` following the schema above.
2. Add suppression events for it (or reuse existing ones with the right `sourceNationTypes`).
3. Add jobs with `nationThreatGain` entries pointing to its `id`.
4. No JS changes needed.

## How to Add a New Contract Category

1. Add jobs to `jobs.json` with the new `category` string.
2. Add the category to a `pmc_tiers.json` entry's `unlocks[]` array.
3. Add an icon to `game_config.json` under `pmcTierCategoryIcons`.
4. Add a label to `categoryLabel()` in `render/jobs.js` — this is the only JS edit.
5. Optionally add a colour to `categoryBorderColor()` in `render/jobs.js`.

## How to Add a New Effect Type

1. Add it to the `effects[]` array in the relevant `fort_upgrades.json` entries.
2. Add a derived function in `engine.js`:
   ```js
   function getNewThingBonus() {
       const efx = getActiveUpgradeEffects();
       return accumulateAdd(efx['newThingBonus']);
   }
   ```
3. Call `getNewThingBonus()` wherever the effect should apply.
4. No other files need to change.

---

## Session Log

**Session 1 — Initial Build**
- Created the full game from scratch: HTML/CSS/JS single file
- Core loop: contracts, hire, fort upgrades, commander XP/levelling, fame, saves

**Session 2 — Fragmentation**
- Split into `index.html` + `css/style.css` + multiple JS files

**Session 3 — JS fragmentation (logic/, render/ folders)**
- `logic/`: recruits, jobs, progression, actions
- `render/`: hud, roster, jobs, hire, fort, company, saves, index

**Session 4 — Data-driven refactor + loader/ folder**
- All content moved to `data/*.json`
- `js/loader/` folder: boot, assets, dom, init
- `index.html` becomes a pure shell (`<div id="app">` only)
- `js/engine.js` created as pure data interpreter (zero hardcoded IDs)

**Session 5 — Fantasy elements + magic system**
- Added `magic` stat to recruits and company total
- New recruit classes with magic bonuses (declarative `bonuses[]` arrays)
- New fort upgrades with arcane categories
- Expanded jobs with arcane categories
- `data/game_config.json` created — all tunable constants in one file
- `rarityWeight` replaces hardcoded rarity probability logic

**Session 6 — PMC / Nation-State arc**
- `data/nations.json` — 5 nations with escalating threat/response system
- `data/pmc_tiers.json` — 7 tiers from Vagrant to Sovereign Force
- `data/suppression_events.json` — 8 suppression operation types
- 19 new contracts across 8 new categories (intelligence, political, territorial, etc.)
- 7 new recruit classes (Spy, Field Commander, Shadow Operative, etc.)
- 7 new fort upgrades (Intelligence Network, Command Centre, etc.)
- 19 new milestones including PMC tier gates and nation relation checks
- `js/logic/nations.js` — nation threat system, suppression tick, PMC advancement
- `js/render/nations.js` — nation threat panel, PMC tier card, threat bars
- Right panel expanded with PMC tier card and nation threat display

**Session 12 — CSS fragmentation**
- No gameplay changes. No data files or JS files modified.
- `css/style.css` fragmented into `css/` subfolders that mirror the `js/` folder structure exactly.
- `css/loader/`: `base.css` (variables, reset, body, scanline), `layout.css` (header, currency bar, game-area grid, panels), `index.css` barrel.
- `css/render/`: `commander.css`, `hud.css`, `jobs.css`, `hire.css`, `fort.css`, `company.css`, `saves.css`, `index.css` barrel.
- `css/logic/`: `arcane.css` (magic tags, lore text, warded badge), `nations.css` (nation cards, threat bars, PMC tier card, suppression badges), `index.css` barrel.
- `css/charCreation/`: `overlay.css` (modal shell, shake), `names.css` (name input, random button), `render.css` (origin grid, stat bars, lore toggle), `confirm.css` (stat preview), `index.css` barrel.
- `css/index.css` created as master entry point importing all four sub-folder barrels.
- `index.html` updated: `css/style.css` → `css/index.css`.
- `css/style.css` retained on disk as a backup reference but is no longer linked.
- `ARCHITECTURE.md` CSS Architecture section rewritten to document the new structure.
- `AGENTS.md` file map and session log updated.
- `AGENT_HANDOFF.txt` file structure section and changelog updated.

**[YOUR SESSION HERE — add a new entry when you make changes]**
Format: `**Session N — Short Title**` followed by bullet points of what changed.
Include: which data files were modified, which JS files were changed, any new
effect types or milestone check types added, and any known issues introduced.

**Session 11 — Open-source scaffolding + developer documentation**
- No gameplay changes. No data files or JS files modified.
- Added `README.md` — project overview, quickstart, structure summary, tech stack.
- Added `LICENSE` — MIT licence.
- Added `CONTRIBUTING.md` — content-addition workflow, code style conventions,
  naming tables, PR checklist, bug report format.
- Added `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1 adaptation.
- Added `.gitignore` — OS cruft, editor dirs, Python cache, log exports, dist.
- Added `ARCHITECTURE.md` — deep technical reference covering: the engine
  accumulator pattern and why it exists, the boot chain and script load order,
  the game loop design (real-time, dt-based, selective rendering), state/save
  architecture and ID permanence warning, the nation/suppression system internals,
  the milestone generic dispatch pattern, render layer contract, CSS architecture,
  and known structural sharp edges (shallow save merge, global namespace, rAF
  throttling in background tabs).
- Evaluation findings documented: identified dead file `js/charCreation.js`
  (root-level, no longer loaded by index.html — safe to delete); noted suppression
  `resolved` flag is set but never used as a guard in the tick path; flagged
  Ashwood Empire `war` threshold (6000 threat) may be unreachable in normal play
  given 0.5/day decay rate — verify against job `nationThreatGain` values.

---

**Session 7 — Handoff documentation**
- Created `AGENT_HANDOFF.txt`. No gameplay changes.

**Session 8 — Bug fixes**
- No data files modified. No new content, effect types, or milestone check types.
- `js/engine.js`: Fixed `RELATION_LEVELS` missing `'notice'` entry (escalation was skipping a level). Fixed `getMagicFortBonus()` using `accumulateAdd` instead of `accumulateMult` for `magicMultiplier` (magic-doubling upgrades were broken). Fixed `effectiveCap` formula that made `activeJobCap` upgrades have no effect on per-job-capped contracts.
- `js/logic/progression.js`: Fixed `gainFame()` using `indexOf` on an object reference (could return `-1` for `GS.fameRank`); switched to `findIndex` on threshold value. Fixed misleading comment claiming `levelUpGains` lives in `commander_ranks.json` — it is in `game_config.json`.
- `js/logic/recruits.js`: Fixed recruit `maxHp` hardcoded to 100 while `hp` rolls 80–119; `maxHp` now matches the rolled value.
- `js/logic/nations.js`: Fixed `blockadeImmunity` check firing on *any* `rewardMult` suppression penalty instead of only `economic_blockade` events.

**Session 9 — server_manager.pyw upgrade**
- No data or JS files changed. Pure tooling improvement.
- Replaced subprocess `http.server` with an in-process `HTTPServer` on a daemon thread — eliminates child process overhead and subprocess stdout parsing.
- Added `_NoCacheHandler`: strips `If-Modified-Since`/`If-None-Match` headers and injects `Cache-Control: no-store` on all responses — browsers can no longer receive 304s for stale JSON data.
- Auto-detect: on launch searches for `iron_company/index.html` near script/CWD and pre-fills the directory field.
- Added **Auto** port button: scans 8000–8100 and selects first free port.
- Port/directory fields lock while server is running.
- Structured log display: HTTP entries parsed into TIME / METHOD / STATUS / SIZE / PATH columns with colour-coded status (green 2xx, red 4xx, orange 5xx).
- Added **Assets** checkbox to suppress png/jpg/ico/font noise from the log.
- Added **Served** stat (bytes delivered, formatted B/KB/MB).
- Added horizontal scrollbar to log area.

**Session 10 — Server Manager UI + charCreation fragmentation**
- No game data or logic JS changed.
- `server_manager.pyw` rewritten: three-tab layout (Access Log / Errors & Warnings / Request Inspector). Errors tab auto-captures 4xx/5xx HTTP responses and warning/error lines with plain-English fix hints. Inspector tab shows full breakdown of any clicked log row including status meaning, targeted hints, and the raw log line. Stats bar now shows REQUESTS / ERRORS / WARNINGS / SERVED / UPTIME / URL live. Added Copy URL button. Fonts enlarged for readability.
- `js/charCreation.js` fragmented into `js/charCreation/`: `state.js` (CC object), `names.js` (random name generator), `render.js` (origin cards with stat bars + lore toggle), `confirm.js` (GS write), `index.js` (modal lifecycle, keyboard nav, randomiser). `index.html` updated accordingly.
- `css/style.css`: new char creation styles (stat bars, lore panels, random button, wider modal). Global readability bumps to log entries, notices, stat labels, job/upgrade text.

---

*This document was written by the agent who built sessions 1–6.
If you are an AI agent reading this: follow the conventions, respect the
data-driven architecture, and append your session to the log above.*
