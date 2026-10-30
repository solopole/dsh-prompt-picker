# dsh-prompt-picker

English | [中文](README.zh.md)

A prompt picker for DeepSeek Harness: one bolt icon in the composer toolbar opens a
multi-select menu of system-prompt injections. Ships with the built-in **Full Throttle**
row (default text below); add and save as many rows as you like, each with its own
injection scope (both / main agent only / sub-agents only).

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
(all → main → sub); footer offers "Uncheck all" and "New prompt…".

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

3. Click **Install**, then **Enable now**. A tag can be appended to the URL: `#v0.4.0`.

For CLI profiles: `pnpm add -w "git+https://github.com/solopole/dsh-prompt-picker.git#v0.4.0"`.

## Usage

- **Checking a row injects it**: rows are joined in list order, separated by blank
  lines, into the `prompt-picker:prompts` system-prompt section (order 10150, after
  first-party guidance and before the persona suffix). State survives restarts.
- **Scopes** are per row: *both* injects everywhere; *main* only into the main agent;
  *sub* only into sub-agents. Sub-agents are detected via `delegationDepth > 0` or
  `origin ∈ {subagent, spawn, teammate}`; each assembly appends one JSON line to
  `$DSH_HOME/prompt-picker-debug.log` for calibration (auto-resets past 256 KiB).
- **New prompts**: name + text + scope, saved and auto-checked. User rows live in
  `$DSH_HOME/prompt-picker.json`; delete the file to reset (the built-in row is code,
  not data).
- **Replace the built-in text**: override the row config in the profile's
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
- Browser and host halves talk over a same-origin RPC (`/_dsh/prompt-picker/rpc`);
  no external network requests, no telemetry, no session-data access.
- Bundled zh/en dictionaries; the plugin-manager title and description are localized.

## Versions

- **0.4.0** — published as the standalone plugin dsh-prompt-picker; multi-select
  prompts + per-row scopes + solid/hollow bolt icon; same-origin host RPC.
- 0.3.x / 0.1.0 — earlier releases under the previous dsh-full-throttle identity
  (single switch → multi-select picker).
