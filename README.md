# dsh-prompt-picker

English | [中文](README.zh.md)

A prompt picker for DeepSeek Harness: one bolt icon in the composer toolbar opens a
multi-select menu of system-prompt injections. Ships with the built-in **Full Throttle**
row (default text below); add and save as many rows as you like, each with its own
injection scope (both / main agent only / sub-agents only). Every row — the built-in
one included — can be edited; saved rows delete one by one or all at once.

> We are a well-funded large-model company. Your token budget is unlimited — do not
> hold back. Completing the task at a high standard always comes first.

With nothing checked, nothing is injected — the system prompt stays untouched.

## Appearance

A single bolt icon: hollow outline while idle, solid fill while ≥1 row is injecting
(theme text color, deliberately neutral).

| Off (hollow) | On (solid) |
| --- | --- |
| ![off](docs/preview-bolt-off.svg) | ![on](docs/preview-bolt-on.svg) |

Menu: checked rows inject; the chip at the end of each row cycles its scope
(all → main → sub); every row carries a pencil (edit it in place), and saved rows
additionally a trash (delete it, after a confirmation). The footer holds two buttons:
"New prompt…" expands a two-level menu (New prompt… / Edit prompt…, the latter lists
every row — the built-in one first — and opens the prefilled dialog), with
**Clear all** beside it removing every saved row after its own confirmation. The
built-in row is generated from config: editable like any row, but never deletable.

<details><summary>Legacy appearance (labeled button with a status dot, 0.1-era screenshots)</summary>

| Off | On |
| --- | --- |
| ![off](docs/preview-en-off.png) | ![on](docs/preview-en-on.png) |

</details>

## Install

1. Open DeepSeek Harness and go to the **Plugins** page in the sidebar.
2. Click **Add plugin** and paste this repository URL:

   ```text
   https://github.com/solopole/dsh-prompt-picker
   ```

3. Click **Install**, then **Enable now**. A tag can be appended to the URL: `#v0.7.0`.

For CLI profiles: `pnpm add -w "git+https://github.com/solopole/dsh-prompt-picker.git#v0.7.0"`.

## Usage

- **Checking a row injects it**: rows are joined in list order, separated by blank
  lines, into the `prompt-picker:prompts` system-prompt section (order 10150, after
  first-party guidance and before the persona suffix). State survives restarts.
- **Scopes** are per row: *both* injects everywhere; *main* only into the main agent;
  *sub* only into sub-agents. The discriminator is the agent's **durable session
  header**, `context.agent.session.header` — the same source
  `delegationDepthOf()` uses in `@deepseek-ai/dsh-subagent`: a session-backed
  child is created with `origin: 'subagent'`, `parentSession` and
  `delegationDepth ≥ 1`, with `AgentOptions.subagentDepth` carrying the same
  depth (the header value is the monotone floor, so a resumed child never counts
  from zero). Teammate sessions are sub-agents too. A readable header with
  `delegationDepth: 0` and no sub-agent origin marks the main agent
  (`why: "header:main"`); only an assembly with no readable header at all
  degrades to the main agent (`why: "default-main:no-header"`). Each assembly
  appends one JSON line to `$DSH_HOME/prompt-picker-debug.log` with `sub` and
  `why` (`origin=…`, `delegationDepth=…`, `header:main`, or
  `default-main:no-header`; auto-resets past 256 KiB).
- **New prompts**: name + text + scope, saved and auto-checked; a rejected save keeps
  the dialog open with the error inline. User rows live in
  `$DSH_HOME/prompt-picker.json`; delete the file to reset (the built-in row is code,
  not data).
- **Edit / delete**: the footer's "Edit prompt…" lists every row (built-in included) and opens the
  shared prefilled dialog (the per-row pencil still edits in place); both paths save
  through the `update` action — only the fields you touch move, and the host applies
  the same validation as adding a row. **The built-in *Full Throttle* row is editable
  too**: the edit persists as a `builtin` override in the state file and survives
  restarts; restoring the generated default (name, text, scope) drops the override key,
  handing the row back to config `instructions`. The trash asks for a second
  confirmation, then removes the row and unchecks it through the `delete` action;
  **Clear all** removes every saved row through the `deleteAll` action (the built-in
  row cannot be deleted and keeps its own checked state; the button is disabled while
  no user row exists). Validation on the host matches adding a
  row: an empty name or an empty text is rejected with `400 rejected`, while a
  scope value outside `both` / `main` / `sub` falls back to `both`
  (exactly what `scopeOf()` does for a new row) — the same fallback every action
  shares, so they stay consistent.
- **Replace the built-in text, config route**: besides editing it in the UI, override
  the row config in the profile's
  `cordis.patch.yml` (advanced, optional):

  ```yaml
  - id: prompt-picker
    config:
      instructions: 'Spare no tokens; settle for nothing below a high standard.'
  ```

## Compatibility

- Only host theme tokens are used for colors, radii and fonts.
- Themes like **PRTS** restyle composer buttons with `!important`; this plugin
  neutralizes that with an id-scoped `!important` so the on state stays neutral —
  state is carried by the bolt's solid/hollow shape.
- Browser and host halves talk over a same-origin RPC (`/_dsh/prompt-picker/rpc`,
  actions `toggle`, `clear`, `add`, `setScope`, `update`, `delete`, `deleteAll`);
  no external network requests, no telemetry, no session-data access.
- Bundled zh/en dictionaries; the plugin-manager title and description are localized.

## Versions

- **0.7.0** — the built-in *Full Throttle* row is editable (pencil, scope chip, footer list); edits persist as a `builtin` override that survives restarts and disappears once the row is back to its generated default; deletion stays rejected.
- **0.6.0** — footer rebuilt as "New prompt… (two-level menu: add / pick a row to edit) + Clear all"; new `deleteAll` action removes every saved row after its own confirmation; "Uncheck all" removed (unchecking stays one click per row, the `clear` RPC action remains for compatibility); the add/edit dialogs merged into one whose save failures surface inline instead of closing it.
- **0.5.1** — state-file writes are serialized through one chain and use unique
  temporary names, so overlapping toggle/update/delete calls can no longer leave
  memory and disk disagreeing; documented the `update` validation contract.
- **0.5.0** — edit and delete saved prompts in place (pencil + trash per row,
  inline edit form, delete confirmation; new host actions `update` and `delete`);
  scope detection now reads the durable session header, so `main`-scoped rows no
  longer leak into sub-agents and teammates.
- **0.4.0** — published as the standalone plugin dsh-prompt-picker; multi-select
  prompts + per-row scopes + solid/hollow bolt icon; same-origin host RPC.
- 0.3.x / 0.1.0 — earlier releases under the previous dsh-full-throttle identity
  (single switch → multi-select picker).