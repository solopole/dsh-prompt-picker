# dsh-prompt-picker

English | [中文](README.zh.md)

One bolt icon ⚡ in the composer toolbar: click it and check the system prompts to inject. Multi-select.

| Off (hollow) | On (solid) |
| --- | --- |
| ![off](docs/preview-bolt-off.svg) | ![on](docs/preview-bolt-on.svg) |

## What it does

- **Check = inject**: checked rows go into the system prompt in list order, separated by blank lines; check nothing and nothing is injected
- **Per-row scope**: all / main agent only / sub-agents only (click the chip at the end of a row; teammate sessions count as sub-agents)
- **New/Edit**: the footer button expands straight into New prompt / Edit prompt (the latter lists every row and opens the shared dialog); the dialog saves or deletes that row
- **Clear all**: unchecks every row at once (nothing is deleted)
- **Every row deletable**, the built-in one included; an emptied list keeps one blank row and the menu keeps its shape
- **Survives restarts**: state lives in `~/.dsh/prompt-picker.json`
- **Local debug log**: each injection appends one slim JSON line (scope verdict + names) to `~/.dsh/prompt-picker-debug.log`; add `debugContext: true` to the row config for the full context dump. Local only, auto-resets past 256 KiB

## Install

- **Market**: search `dsh-prompt-picker` in the DSH plugin market (dshmarket), one click
- **Manual**: Plugins page → Add plugin → paste `https://github.com/solopole/dsh-prompt-picker`
- **CLI**: `dsh plugin --profile <name> add dsh-prompt-picker`

## Customize the built-in text (optional)

Edit or delete the built-in row right in the dialog, or change its generated default in the profile's `cordis.patch.yml` (to bring a deleted built-in row back, remove `builtinDeleted` from the state file):

```yaml
- id: prompt-picker
  config:
    instructions: 'Your default text'
```
