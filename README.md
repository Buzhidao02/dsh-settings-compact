# dsh-settings-compact

DeepSeek Harness（DSH）的设置面板左侧导航，分区一多就变成一长条。这个插件把**不常用**的分区收进导航底部的一行折叠条目里，常用的留在外面。

收起时：

```
账号与余额
通用设置
模型
内置插件
插件市场
⋯ 更多 9 项        ← 点一下展开，再点「收起」收回
```

## 做法

设置面板的导航是账本投影，内核没有分组的扩展点，也没有对外的 navigate API。所以这个插件**不动账本，只动投影**：

- 给要收起的按钮打上 `data-dshsc-item`，用一条 CSS 规则 `display:none`；
- 在 `nav` 末尾追加一个开关按钮，点击切换 `html[data-dshsc="on"|"off"]`；
- 点分区走的仍然是原生 `onSelect`，所以高亮、键盘导航、无障碍语义都不受影响。

## 容错

- 保留名单按**显示文本**精确匹配。语言变了、外壳改版了，认不出保留项时（识别到少于 2 个）**整体不动**——宁可原样，也不把设置面板搞乱。
- 自定义规则一个都没认出来时，会先退回内置的默认名单；默认名单也认不出来，才整体不动。
- 当前选中的分区如果本来该被收起，会临时露出来，否则高亮会消失。
- 收起状态存在 `localStorage` 的 `dsh-settings-compact` 键里（默认收起）。

## 配置

默认名单是中文界面的五个分区。换语言、或者你想留的不是那几个，都不用改代码：

**1. 控制台**（推荐先 `list()` 看一眼你界面上到底叫什么）

打开 DevTools，并让设置面板处于打开状态：

```js
__DSHSC__.list()                              // → ["Account & balance", "General settings", ...]
__DSHSC__.setKeep(["Account & balance", "Models", "Plugins", "Marketplace"])
__DSHSC__.setKeepIndex([0, 1, 2, 3, 9])       // 懒得抄文案就按顺序：留下第 0、1、2、3、9 项
__DSHSC__.collapse()                          // 收起
__DSHSC__.expand()                            // 展开
__DSHSC__.reset()                             // 回到默认
```

**2. localStorage**（重启、换浏览器都能带着）

```js
localStorage["dsh-settings-compact:keep"]      = JSON.stringify(["账号与余额", "模型"])
localStorage["dsh-settings-compact:keepIndex"] = JSON.stringify([0, 1, 2])
```

- `:keep` 按显示文本匹配，`:keepIndex` 按导航顺序匹配（从 0 开始）；
- 两条都配时，命中任意一条就保留；只配 `:keepIndex` 时按索引来，不再叠加默认名单；
- 清掉键值（或 `__DSHSC__.reset()`）即回默认。

**3. 改默认值**：`lib/client.js` 里的 `KEEP_LABELS`，文本必须和界面上一字不差。

## 可能会失效

它依赖 DSH 设置面板的 DOM 结构：

```
[data-shortcut-modal="settings"] nav > div > button
```

按钮文字在 `span[class*="navLabel"]` 里。DSH 内核把这块结构换掉、或者换成真正的分组 API，这个插件就需要改，或者直接不再需要它。

## 安装

在 DSH profile 目录（含 `package.json` 与 `dsh.profile.bundles` 的那一层）：

```bash
pnpm add link:/path/to/dsh-settings-compact
```

然后把包名 `dsh-settings-compact` 加进 `dsh.profile.bundles` 数组，重启 DSH。

用 `link:` 而不是 `file:`，是为了改源码后刷新页面就能生效——`file:` 装的是副本，改不动。

卸载：从 `dsh.profile.bundles` 里删掉包名，`pnpm remove dsh-settings-compact`，重启。

## 开关

插件在「内置插件」页里的那个开关可以直接关掉；关掉后九个分区立刻回到原位。

## License

MIT
