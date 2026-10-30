# dsh-prompt-picker（提示词选择器）

[English](README.md) | 中文

DeepSeek Harness 的提示词选择器:输入框工具栏一枚闪电图标,点开即多选要注入的系统提示词。
内置「火力全开」一条(默认文本如下),可新增保存任意多条,每条可单独设定注入对象
(全部 / 仅主 agent / 仅子 agent)。

> 我们是一家实力雄厚的大模型公司，你的 token 用量预算无限，不要吝惜或有所保留。一切以高标准完成任务为优先。

一条都没勾选时不注入任何内容,系统提示词零改动。

## 外观

图标只有闪电一枚:未勾选 = 空心勾线,勾选 ≥1 条 = 实心填充(跟随主题文字色,刻意中性、不抢主题)。

| 关闭（空心） | 开启（实心） |
| --- | --- |
| ![关闭](docs/preview-bolt-off.svg) | ![开启](docs/preview-bolt-on.svg) |

菜单:勾选行 = 注入;行尾圆片 = 该条作用域(全部 → 主 → 子 循环点击);底部「全不选」「新增提示词…」。

<details><summary>旧版外观（带文字标签与状态圆点，截图为 0.1 时代）</summary>

| 关闭 | 开启 |
| --- | --- |
| ![关闭](docs/preview-en-off.png) | ![开启](docs/preview-en-on.png) |

</details>

## 安装

1. 打开 DeepSeek Harness，进入侧栏的 **插件** 页。
2. 点击 **添加插件**，粘贴本仓库地址：

   ```text
   https://github.com/solopole/dsh-prompt-picker
   ```

3. 点击 **安装**；完成后选择 **立即启用**。地址后也可以加标签：`#v0.4.0`。

CLI 场景:`pnpm add -w "git+https://github.com/solopole/dsh-prompt-picker.git#v0.4.0"`。

## 使用

- **勾选即注入**:按列表顺序、空行分隔,写入系统提示词的 `prompt-picker:prompts` 段(order 10150,位于官方指引之后、人格后缀之前);重启保持。
- **作用域**:每条独立。「全部」= 主/子都注入;「主」= 仅主 agent;「子」= 仅子代理。子代理判定依据 `delegationDepth > 0` 或 `origin ∈ {subagent, spawn, teammate}`;判定过程会向 `$DSH_HOME/prompt-picker-debug.log` 各追加一行 JSON 供校准(超 256 KiB 自动重置)。
- **新增提示词**:名称 + 内容 + 作用域,保存后自动勾选。用户条目存于 `$DSH_HOME/prompt-picker.json`;删除该文件可整体重置(内置「火力全开」由代码提供,不受影响)。
- **替换内置条目文本**:在 profile 的 `cordis.patch.yml` 中覆盖该行配置(进阶用法,可选):

  ```yaml
  - id: prompt-picker
    config:
      instructions: '预算不设上限，不达高标准不罢休。'
  ```

## 兼容性

- 颜色、圆角、字体只使用宿主主题 token。
- **PRTS** 等主题会用 `!important` 重刷输入框按钮样式;本插件以 id 作用域 `!important` 中和,保证开启态中性不变彩,状态由闪电实心/空心承载。
- 浏览器端与宿主端经同源 RPC(`/_dsh/prompt-picker/rpc`)通信;无外部网络请求、无遥测、不读写会话数据。
- 内置中英文字典;插件管理器中显示的标题与描述已本地化。

## 版本

- **0.4.0** — 更名发布为独立插件 dsh-prompt-picker;多选提示词 + 每条作用域 + 实心/空心闪电图标;宿主端同源 RPC。
- 0.3.x / 0.1.0 — 前身 dsh-full-throttle 时代的版本线(单开关 → 多选选择器)。
