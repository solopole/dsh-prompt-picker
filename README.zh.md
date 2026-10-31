# dsh-prompt-picker（提示词选择器）

[English](README.md) | 中文

DeepSeek Harness 的提示词选择器:输入框工具栏一枚闪电图标,点开即多选要注入的系统提示词。
内置「火力全开」一条(默认文本如下),可新增保存任意多条,每条可单独设定注入对象
(全部 / 仅主 agent / 仅子 agent);所有条目(含内置行)均可修改,自建条目可单行删除或一键全清。

> 我们是一家实力雄厚的大模型公司，你的 token 用量预算无限，不要吝惜或有所保留。一切以高标准完成任务为优先。

一条都没勾选时不注入任何内容,系统提示词零改动。

## 外观

图标只有闪电一枚:未勾选 = 空心勾线,勾选 ≥1 条 = 实心填充(跟随主题文字色,刻意中性、不抢主题)。

| 关闭（空心） | 开启（实心） |
| --- | --- |
| ![关闭](docs/preview-bolt-off.svg) | ![开启](docs/preview-bolt-on.svg) |

菜单:勾选行 = 注入;行尾圆片 = 该条作用域(全部 → 主 → 子 循环点击);每条都带铅笔(原地修改),
自建条目另有垃圾桶(删除,需二次确认)。底部一行两个按钮:「新增提示词…」点开为两级
菜单(新增提示词… / 修改提示词…,后者列出包括内置行在内的全部条目、选中即入预填弹窗),
右侧「全清」经二次确认删除全部自建条目(内置行及其勾选状态保留)。内置条目由配置生成、
不可删除,但可以像其他行一样修改。

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

3. 点击 **安装**；完成后选择 **立即启用**。地址后也可以加标签：`#v0.7.0`。

CLI 场景:`pnpm add -w "git+https://github.com/solopole/dsh-prompt-picker.git#v0.7.0"`。

## 使用

- **勾选即注入**:按列表顺序、空行分隔,写入系统提示词的 `prompt-picker:prompts` 段(order 10150,位于官方指引之后、人格后缀之前);重启保持。
- **作用域**:每条独立。「全部」= 主/子都注入;「主」= 仅主 agent;「子」= 仅子代理。判别依据是 agent 的**持久会话头** `context.agent.session.header`——与 `@deepseek-ai/dsh-subagent` 的 `delegationDepthOf()` 取值来源一致:会话级子代理创建时写入 `origin: 'subagent'`、`parentSession`、`delegationDepth ≥ 1`,并以 `AgentOptions.subagentDepth` 携带同一深度(头部数值是单调下限,重启续跑的子代理不会从零重算)。队友(teammate)会话也属于子代理。头部可读且 `delegationDepth: 0`、无 subagent 来源 ⇒ 主 agent(`why: "header:main"`);连头部都取不到时才降级为主 agent(`why: "default-main:no-header"`)。每次组装会向 `$DSH_HOME/prompt-picker-debug.log` 追加一行 JSON,含 `sub` 与 `why`(`origin=…` / `delegationDepth=…` / `header:main` / `default-main:no-header`;超 256 KiB 自动重置)。
- **新增提示词**:名称 + 内容 + 作用域,保存后自动勾选;保存失败时弹窗保持打开并就地显示错误。用户条目存于 `$DSH_HOME/prompt-picker.json`;删除该文件可整体重置(内置「火力全开」由代码提供,不受影响)。
- **修改 / 删除**:底部「新增提示词…」两级菜单里的「修改提示词…」列出全部条目(内置行在内),选中即打开预填弹窗(与新增共用同一表单);每行的铅笔仍是行内就地修改。两条路径都经 `update` 动作保存,只改动你实际改过的字段,校验规则与新增一致。**内置「火力全开」同样可修改**:改动以 `builtin` 覆盖值存入状态文件并跨重启生效;把名称/内容/作用域改回生成默认值时覆盖键自动消失,配置 `instructions` 重新接管。垃圾桶先弹二次确认,确认后经 `delete` 动作删除该行并同时取消勾选;「全清」经 `deleteAll` 动作一次删除全部自建条目(内置行不可删除,其勾选状态保留;列表为空时按钮禁用)。宿主端校验与新增一致:名称或内容为空 → `400 rejected`;作用域取 `both`/`main`/`sub` 之外的值 → 静默回落为 `both`(即 `scopeOf()` 对新增行的既有规则,各动作保持一致)。
- **替换内置条目文本的另一种方式**:除界面内直接修改外,也可在 profile 的 `cordis.patch.yml` 中覆盖该行配置(进阶用法,可选;界面修改过的覆盖值优先于配置):

  ```yaml
  - id: prompt-picker
    config:
      instructions: '预算不设上限，不达高标准不罢休。'
  ```

## 兼容性

- 颜色、圆角、字体只使用宿主主题 token。
- **PRTS** 等主题会用 `!important` 重刷输入框按钮样式;本插件以 id 作用域 `!important` 中和,保证开启态中性不变彩,状态由闪电实心/空心承载。
- 浏览器端与宿主端经同源 RPC(`/_dsh/prompt-picker/rpc`)通信,动作 `toggle` / `clear` / `add` / `setScope` / `update` / `delete` / `deleteAll`;无外部网络请求、无遥测、不读写会话数据。
- 内置中英文字典;插件管理器中显示的标题与描述已本地化。

## 版本

- **0.7.0** — 内置「火力全开」行可修改:铅笔、作用域圆片、底部修改列表全部适用;改动以 `builtin` 覆盖值持久化并跨重启,改回生成默认值即自动清除覆盖键;删除仍被拒绝(行本身是代码)。
- **0.6.0** — 底部改为「新增提示词…(两级菜单:新增 / 选条修改)+ 全清」;新增 `deleteAll` 动作,全清经二次确认删除全部自建条目;移除「全不选」(逐行点击即取消,`clear` RPC 动作保留兼容);新增/修改共用弹窗,保存失败就地显示错误。
- **0.5.1** — 状态文件写入改为单链串行 + 唯一临时名,并发 toggle/update/delete 不再出现内存与磁盘不一致;并在文档中写明 `update` 的校验契约。
- **0.5.0** — 已保存条目可原地修改/删除(每行铅笔 + 垃圾桶、行内表单、二次确认;宿主新增 `update`、`delete` 动作);作用域判别改读持久会话头,`main` 行不再漏进子 agent 与队友。
- **0.4.0** — 更名发布为独立插件 dsh-prompt-picker;多选提示词 + 每条作用域 + 实心/空心闪电图标;宿主端同源 RPC。
- 0.3.x / 0.1.0 — 前身 dsh-full-throttle 时代的版本线(单开关 → 多选选择器)。