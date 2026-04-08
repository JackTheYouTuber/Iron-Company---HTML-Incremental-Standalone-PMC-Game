# Contributing to Iron Company

Thank you for your interest in contributing. This document covers the conventions
you need to know before opening a pull request.

---

## Before You Start

Read `AGENTS.md` first — especially the **Cardinal Rule** and **Engine** sections.
The most important thing to understand is that this project is deliberately
data-driven: adding content should never require editing a JS file.

---

## Types of Contribution

### Adding game content (jobs, recruits, upgrades, milestones, etc.)

This is the easiest kind of contribution and requires no JS changes at all.

- **New contracts** → add entries to `data/jobs.json`
- **New recruit classes** → add entries to `data/recruit_classes.json`
- **New fort upgrades** → add entries to `data/fort_upgrades.json`
- **New milestones** → add entries to `data/milestones.json`
- **Tuning numbers** → edit `data/game_config.json`

See `AGENTS.md` for the schema of each file and the full Effect Type Reference.

### Adding a new effect type

1. Add the effect to the relevant JSON file's `effects[]` or `bonuses[]` array.
2. Add a derived function to `js/engine.js` using `accumulateAdd` or `accumulateMult`.
3. Call that function wherever the effect should apply.
4. Add the new type to the **Effect Type Reference** table in `AGENTS.md`.

### Bug fixes

- Include a clear description of the bug and where it was, even if the fix is small.
- If the bug is in game balance (numbers feel wrong), it belongs in a `data/` file.
- If the bug is in logic, it belongs in `js/logic/` or `js/engine.js`.

### New systems / major features

Open an issue first to discuss. Large features that touch multiple files benefit
from a quick design conversation before implementation.

---

## Code Style

This project uses **vanilla JS with no build step**. Keep it that way.

- No frameworks, no transpilation, no npm
- Functions are global (this is intentional — the files are loaded in order via `<script>` tags)
- `const` and `let` only, no `var`
- Single quotes for strings in JS
- Two-space indentation
- Keep render functions free of logic; keep logic functions free of DOM access

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Functions | camelCase | `getJobDuration()` |
| Data file IDs | snake_case | `"id": "iron_infirmary"` |
| Effect types | camelCase string | `"type": "rewardMult"` |
| CSS classes | kebab-case | `.job-card` |
| GS properties | camelCase | `GS.totalJobsDone` |

---

## Data File Conventions

### IDs
All IDs in JSON files must be unique within their file and use `snake_case`.
Once an ID is in a shipped release, treat it as permanent — saves reference them.

### Flavour text
Every content item should have a `flavour` or `desc` field. This is a dark
fantasy game; the writing tone is terse, dry, and slightly ominous. Avoid
purple prose. One well-chosen sentence beats three mediocre ones.

### Numbers and balance
- Job durations are in seconds (real time). `durationBase: 30` = 30 seconds.
- Reward multiplier effects use fractional values: `0.10` = +10%.
- Duration multiplier effects are typically negative: `-0.15` = 15% faster.
- When adding a new contract, check that its `nationThreatGain` values are
  consistent with the existing threat economy (see `nations.json` thresholds).

---

## Pull Request Checklist

- [ ] Content-only changes touch only `data/` files
- [ ] New effect types are documented in `AGENTS.md` Effect Type Reference
- [ ] No hardcoded IDs, upgrade names, or class names in JS files
- [ ] No new external dependencies added
- [ ] `AGENTS.md` Session Log has an entry (or you've noted what changed in the PR)

---

## Reporting Bugs

Open a GitHub issue with:
1. What you expected to happen
2. What actually happened
3. Steps to reproduce (save file state if relevant)
4. Which browser and OS

---

## Questions

If something in the codebase is unclear, the best place to look is `AGENTS.md`
and `AGENT_HANDOFF.txt` — they were written specifically to explain the design
decisions. If those don't answer it, open an issue.
