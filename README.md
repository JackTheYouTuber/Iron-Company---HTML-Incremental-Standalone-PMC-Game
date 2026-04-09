# Iron Company

> *"You are nothing yet. That is an advantage that will not last."*

A browser-based incremental RPG set in a dark modern fantasy world. You start as a lone mercenary commander in an abandoned fort and build a private military company — contracting, hiring, fortifying, and eventually growing powerful enough that established nations fear you.

The endgame is **PMC Tier 6: Sovereign Force**. Think Metal Gear Solid's Outer Heaven / Diamond Dogs, translated into medieval fantasy.

---

## Playing the Game

The game uses `fetch()` to load JSON data files, so it **must be served over HTTP** — you cannot simply open `index.html` directly as a file.

**Easiest way (Windows/macOS/Linux with Python installed):**

```
double-click server_manager.pyw
```

This opens a small GUI that starts a local HTTP server and gives you a clickable URL. No console window, no configuration needed.

**Alternative (any terminal):**

```bash
cd iron_company
python -m http.server 8000
# then open http://localhost:8000
```

---

## Project Structure

```
iron_company/
│
├── data/                   ← ALL game content lives here (edit freely)
│   ├── game_config.json    ← Every tunable number (day length, XP curve, etc.)
│   ├── jobs.json           ← All contracts
│   ├── recruit_classes.json
│   ├── fort_upgrades.json
│   ├── milestones.json
│   ├── nations.json
│   ├── pmc_tiers.json
│   ├── suppression_events.json
│   ├── origins.json
│   ├── fame_ranks.json
│   └── commander_ranks.json
│
├── js/
│   ├── engine.js           ← Core interpreter — reads JSON, never names IDs
│   ├── state.js            ← Game state (GS) + save/load
│   ├── main.js             ← Game loop + modal helpers
│   ├── utils.js            ← Currency, logging, toasts
│   ├── data.js             ← JSON loader
│   ├── loader/             ← Boot chain (runs before game code)
│   ├── logic/              ← Pure game logic, no DOM
│   ├── render/             ← DOM updates, no game logic
│   └── charCreation/       ← Character creation modal
│
├── css/
│   └── style.css
│
├── index.html              ← Shell only — no game markup
├── server_manager.pyw      ← Python/tkinter HTTP server GUI
├── AGENTS.md               ← Architecture guide for AI agents and contributors
├── AGENT_HANDOFF.txt       ← Session-by-session changelog
└── ARCHITECTURE.md         ← Deep-dive technical reference
```

---

## The Cardinal Rule

**Adding content should never require editing a JS file.**

All game content lives in `data/*.json`. The JS is a generic interpreter. If you find yourself writing `if (upgrade.id === 'something')` in a JS file, stop and find the data-driven way.

See `AGENTS.md` for a full explanation of how the engine works and how to extend it.

---

## Contributing

Contributions are welcome. Please read `CONTRIBUTING.md` before opening a pull request.

The short version:
- Content additions (new jobs, recruits, upgrades) go in `data/` — no JS changes needed
- Bug fixes should include a note in the PR about which data or JS file is affected
- New effect types need an entry in both the JSON and `engine.js`, plus a line in the Effect Type Reference in `AGENTS.md`

---

## Tech Stack

- Vanilla HTML, CSS, JavaScript — no framework, no build step, no dependencies
- JSON data files loaded via `fetch()`
- Saves to `localStorage` (named slots)
- `server_manager.pyw` requires Python 3 with `tkinter` (included in most Python distributions)

---

## License

MIT. See `LICENSE`.

## Changelog (abbreviated)

See `AGENT_HANDOFF.txt` for the full session log. Recent highlights:

- **Session 13** — Bug fixes: `nationAtRelation` milestone check now includes the `notice` relation level; dead `renderFortStatus()` removed from `fort.js`; duplicate suppression card element IDs resolved (`rp_` prefix for right-panel); new-game reset now clears all nation/suppression/PMC state; suppression countdown timers now update live every frame.

### Session 14 — UI overhaul, settings, profiles

- **Settings tab (⚙)** — Font presets, colour themes, UI density, display toggles, notification preferences
- **Profiles** — Named profiles each carry their own settings; link a profile to a save slot for one-click load
- **Sub-tabs** — Contracts split into Available/Active; Company split into Overview/Nations/Deeds; Fort split into Improvements/Status
- **Collapsible panels** — Stats, Warband, Nation Threat, Fort Works all individually collapsible
- **Header summary** — Live progress pills for active contracts visible without opening any tab
- **Notification bell** — Dispatches drawer collects all significant events; red dot when unread
- **Collapsible log** — Click "Chronicle" header to hide/show the log footer
- **Settings data** — `data/settings.json` (presets), `data/profiles.json` (schema); actual profile data in localStorage

### Session 15 — Log tab, Repeating queue, font fix

- **Log tab** — Chronicle log moved from footer bar into its own "Log" tab; tab button pulses gold on new entries
- **Repeating queue** — Contracts → Active → Repeating: contracts added with 🔁 auto-restart when they complete; pauses if requirements fail
- **Font fix** — All hardcoded `font-family` strings in CSS and JS replaced with `var(--font-ui/display/body)`; font switching in Settings now affects every element

### Session 16 — Client logging ported from grimveil

- **`js/clientLog.js`** — Loaded first in `index.html`; captures all `console.log/warn/error`, uncaught errors, and unhandled rejections; forwards to the server manager via `/api/log` and `/api/debug`
- **Server manager: Game Log tab** — In-game events from Iron Company's `log()` calls, colour-coded by type, exportable
- **Server manager: Client Debug tab** — Full browser console pipe plus debug snapshots; "Request State" button triggers a live game-state + DOM + function inventory snapshot from the browser
- **Server manager: Export All** — One-click bulk export of all four log types (access, game, debug, errors) into timestamped files
- **Error routing** — JS `error`/`warn` entries from the client are automatically routed into the existing Errors & Warnings tab alongside HTTP errors

### Session 17 — Widget system and ScreenEngine

The DOM is now built entirely from data. `data/ui/screens.json` declares every panel, tab, sub-tab, and widget slot. `js/ui/ScreenEngine.js` reads it and constructs the DOM + widget tree at runtime. `js/ui/WidgetRegistry.js` maps type name strings to classes so the engine can instantiate them by name.

**28 widget types** across 11 files cover every UI surface. Each is a self-contained class extending `Widget` with `mount()`, `render()`, `tick(dt)`, and `destroy()`.

**To add a new screen area:** edit `screens.json`. If the widget type exists, you're done. If not, create one file in `js/widgets/`, add a `<script>` tag, and register it — no other JS files need to change.

### Session 18 — Repeat queue fixes + magi-tech lore rewrite

**Repeat queue bugs fixed:**
- Adding a contract to the repeat queue now auto-starts it immediately (no manual click required)
- On completion, the job correctly restarts — the previous bug had `checkJobRequirements` running while the job was still in `GS.activeJobs`, causing a false "already underway" failure that silently removed the job from the queue

**World setting — magi-tech near-modern:** All descriptive text in every JSON file has been rewritten. Magic is mundane (everyone can do minor workings), technology runs on mana, soldiers self-augment as standard, mages are feared for mastery not mere ability. The Iron Company is a PMC in this world. All 40 contracts, 19 recruit classes, 25 fort upgrades, 10 origins, 46 milestones, 5 nations, 8 suppression events, 7 PMC tiers, fame ranks, and commander titles have been rewritten. No mechanical values changed.

### Session 18 — Repeat queue fixes + magi-tech lore rewrite

**Bug fixes:**
- Repeat queue auto-restart now works correctly — the completing job is fully removed from `GS.activeJobs` before `checkJobRequirements` re-runs, so "already underway" no longer falsely blocks the restart
- Adding a contract to the repeat queue now starts it immediately if it isn't already running — the 🔁 button is now start-and-queue, not just queue

**World rewrite — magi-tech near-modern:**
All ten text-bearing data files rewritten. The Iron Company is now a licensed PMC operating in a mana-powered near-modern world: magic is mundane (everyone can do minor workings), technology runs on mana, soldiers self-augment as standard, mages are dangerous for their depth and breadth not mere ability. Medieval vocabulary replaced throughout with PMC/contractor/regulatory language. All mechanics unchanged.
