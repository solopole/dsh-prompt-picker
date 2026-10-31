# dsh-prompt-picker（提示词选择器）

[English](README.md) | 中文

输入框工具栏的闪电图标 ⚡：点开勾选要注入的系统提示词，可多选。

| 关（空心） | 开（实心） |
| --- | --- |
| ![关](docs/preview-bolt-off.svg) | ![开](docs/preview-bolt-on.svg) |

## 功能

- **勾选即注入**：勾选的提示词按列表顺序、空行分隔写进系统提示词；一条不勾就什么都不注入
- **每条可设作用域**：全部 / 仅主 agent / 仅子 agent（点行尾圆片切换；teammate 会话也算子 agent）
- **管理**：新增、修改（内置「火力全开」行也能改）、单条删除、一键全清自建条目
- **重启不丢**：状态保存在 `~/.dsh/prompt-picker.json`
- **本地调试日志**：每次注入在 `~/.dsh/prompt-picker-debug.log` 记一行极简 JSON（作用域判定与注入名）；需要完整上下文转储时在配置里加 `debugContext: true`。纯本地，超 256KiB 自动清零

## 安装

- **插件市场**：DSH 插件市场（dshmarket）搜 `dsh-prompt-picker`，一键安装
- **手动**：插件页 → 添加插件 → 贴 `https://github.com/solopole/dsh-prompt-picker`
- **CLI**：`dsh plugin --profile <名字> add dsh-prompt-picker`

## 自定义内置文案（可选）

内置「火力全开」可以在菜单里直接改；也可以在 profile 的 `cordis.patch.yml` 里改它的默认值：

```yaml
- id: prompt-picker
  config:
    instructions: '你的默认文案'
```
