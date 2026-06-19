# Feature: focus config persisted in the sheet, manual CRUD only

**Status:** New — **needs a brainstorming pass next session** before design is final.
**Type:** Architecture + sync + UI + GAS.

## Intent (user's words)
"All focus mode mapping, goals and custom tasks should be saved in sheet, and CRUD only manually,
not automatically."

The valuable, hard-to-recreate configuration is:
- **Focus cards** (`focusItems`): name, `linkedQuestIds` mappings, and `customQuests`.
- **Custom goals** (blueprint room `customGoals`).

Today this rides inside the auto-synced state blob (debounced background writes), which is exactly
what got tangled in the sync races and data loss. The user wants this config to be **durably stored
in the sheet** and changed **only via explicit user action** (manual Create / Read / Update /
Delete), never silently overwritten by automatic background sync.

## Why
- Protects the user's most important, slowest-to-rebuild data from the auto-sync flapping entirely.
- Makes focus config an intentional, reviewable dataset rather than a side effect of state saves.

## Direction to explore (NOT final — brainstorm first)
- A dedicated sheet, e.g. **`Focus Config`**, holding focus cards + their mappings + custom
  quests + custom goals in a structured (readable) layout, not just an opaque JSON cell.
- **Manual actions** in the UI: e.g. a "Save focus setup" and "Load focus setup" control. Editing a
  focus card / adding a custom quest updates *local* state immediately, but the **sheet** is only
  written on an explicit "Save", and only **read** on explicit "Load" (or first load).
- Keep the sprint/completion state on the existing auto-sync path (now hardened); split focus config
  onto the manual path.

## Open questions (resolve in brainstorming)
1. Exact manual model: explicit Save/Load buttons? Per-card save? A single "sync focus config now"?
2. On app load, does focus config auto-load once (read) but never auto-write? Or fully manual both ways?
3. Sheet schema for `Focus Config` (one row per focus card? per custom quest? JSON per cell?).
4. Conflict handling if the sheet config and local differ at manual load time (overwrite local vs merge).
5. Interaction with the existing `_customGoals` extraction and `LOAD_STATE` focusItems guard
   (`AppContext.js:156`) — likely both get superseded by this manual path.
6. GAS actions needed (e.g. `focus_config_save`, `focus_config_load`).

## Verification (to define after design)
- Edit focus cards offline / across reopens → local edits never lost, sheet only changes on Save.
- Auto-sync of sprint state can never overwrite focus config.
