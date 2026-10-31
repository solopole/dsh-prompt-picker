# dsh-prompt-picker

English | [中文](README.zh.md)

One bolt icon ⚡ in the composer toolbar: click it and check the system prompts to inject. Multi-select.

| Off (hollow) | On (solid) |
| --- | --- |
| ![off](docs/preview-bolt-off.svg) | ![on](docs/preview-bolt-on.svg) |

## What it does

- **Check = inject**: checked rows go into the system prompt in list order, separated by blank lines; check nothing and nothing is injected
- **Per-row scope**: all / main agent only / sub-agents only (click the chip at the end of a row; teammate sessions count as sub-agents)
- **Manage**: add, edit (the built-in "Full Throttle" row included), delete one by one, or clear every saved row at once
- **Survives restarts**: state lives in `~/.dsh/prompt-picker.json`

## Install

- **Market**: search `dsh-prompt-picker` in the DSH plugin market (dshmarket), one click
- **Manual**: Plugins page → Add plugin → paste `https://github.com/solopole/dsh-prompt-picker`
- **CLI**: `dsh plugin --profile <name> add dsh-prompt-picker`

## Customize the built-in text (optional)

Edit the built-in row right in the menu, or change its generated default in the profile's `cordis.patch.yml`:

```yaml
- id: prompt-picker
  config:
    instructions: 'Your default text'
```
