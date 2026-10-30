# Changelog

## 0.5.0

### Added

- Per-row **edit** (pencil → inline form for name / text / scope, saved through the
  new `update` action) and **delete** (trash → second confirmation, then the new
  `delete` action). The built-in row is read-only: it shows neither entry.
- Host RPC actions on `/_dsh/prompt-picker/rpc`:
  - `update` — `{action:'update', id, name?, text?, scope?}`; a partial update.
    Unchanged fields keep their value; validation matches `add` (name trimmed to
    60 characters and non-empty, text non-empty, scope through `scopeOf`);
    the in-memory row is restored if the write fails.
  - `delete` — `{action:'delete', id}`; removes the row and drops its id from
    `selectedIds`, rolling both back if the write fails.
  - Both answer `{ok:true, value:<state>}`, or `400 {ok:false, error:{code:'rejected', message}}`
    for an unknown id, an empty field, or the built-in row.
- `test/edit-delete.test.mjs`: action-level, RPC-contract, restart-reload,
  toggle/update interleaving, scope-routing and zh/en copy-parity coverage.

### Fixed

- **Sub-agent detection.** `classifyAgent` read `delegationDepth` / `origin` off
  the flat assembly context, which never carries them, so every assembly fell
  through to the `default-main` branch. `scope: 'main'` rows therefore leaked
  into sub-agents — including teammates (18/18 assemblies in a real session).
  It now reads the durable session header (`context.agent.session.header`) plus
  `AgentOptions.subagentDepth`, matching `delegationDepthOf()` in
  `@deepseek-ai/dsh-subagent`, and the calibration log distinguishes
  `origin=…`, `delegationDepth=…`, `header:main` and
  `default-main:no-header`.

### Changed

- Version 0.4.0 → 0.5.0. README (both languages) documents the scope
  discriminator, the degradation path and the new row actions.

## 0.4.0

- Published as the standalone plugin `dsh-prompt-picker`: multi-select prompts,
  per-row scopes (both / main / sub), solid-hollow bolt icon, same-origin host RPC.

## 0.3.x

- Earlier releases under the previous `dsh-full-throttle` identity (single switch →
  multi-select picker).
