# iResume 3.0 · 重写计划

> 状态：执行中 · 负责人：Claude（长期维护）
> 交互方向：方案 E「所见即所得」（[原型](design/prototypes/e-canvas.html)）
> 旧版计划（渐进式重构）已作废，可在 git 历史中查阅。

## 0. 结论

旧代码不再逐步改造，而是**整体重写**。下面这些全部删除：`App.tsx`（2919 行）、`ResumeEditor`（2846 行）、`ResumePreview`（1511 行）、11 个硬编码模板、Tailwind，以及 `resumeStyle` 里四十多个零散的样式参数。

只保留两样东西：

1. **用户数据**：v2 的 IndexedDB 数据和 JSON 备份，通过一次性迁移器导入新格式，旧数据只读、不动。
2. **GitHub 加密同步的协议**：沿用兼容的读写格式，安全问题另行修复。

重写的目标不是「换一套模板」，而是把简历制作的最佳实践直接做进产品里：

- 默认就能写出一份好简历，而不是先给一堆选项；
- 主题可以自由定制，并且能分享；
- 编辑时看到的纸面，就是最终导出的 PDF。

---

## 1. 简历最佳实践 → 产品规则

| 最佳实践 | 在 iResume 3.0 里怎么体现 |
| --- | --- |
| 一页为佳（经验 < 10 年） | 实时显示页数和超出的行数；「适配一页」按行高 → 间距 → 边距 → 字号的顺序逐级压缩，每一步都可以撤销 |
| ATS 可解析（机器筛简历） | 默认主题为单栏，正文是真实文本，不用表格排版，标题用常规写法（工作经历 / Experience）；导出的 PDF 文字可以选中复制；不适合 ATS 的主题（如双栏）会标出提示 |
| 倒序时间，日期格式统一 | 日期按「开始 / 结束」分开存储，由主题统一格式化（`2023.07 – 至今`、`Jul 2023 – Present`）；非标准写法原样保留，同时给出提示 |
| 要点 = 动词开头 + 做了什么 + 结果数字 | 写作批注规则：缺少量化结果、用「参与 / 协助 / 负责」等弱动词开头、要点过长（超过 2 行）、要点过多（超过 6 条）、使用第一人称「我」、句末标点不统一 |
| 联系方式完整、链接可点 | 联系方式做成结构化列表，自动识别类型（邮箱 / 电话 / GitHub / 网站），在 PDF 里是可点击的链接；缺少邮箱或电话时给出提示 |
| 照片视地区而定 | 照片由主题开关控制；当简历语言为英文且显示照片时，给出提示 |
| 每个岗位投一份定制版本 | 可以从一份简历「派生」出新简历（M2）；粘贴 JD 后检查关键词覆盖情况（M2，纯本地计算） |
| 视觉克制 | 主题只提供一个强调色，字号阶梯最多 4 级，避免出现第二种强调色 |

## 2. 新架构

```
src/
  app/            入口、路由（基于 hash，无依赖）、全局样式
  ui/             E 风格的界面组件：Button、IconButton、Popover、Sheet、Menu、Segmented、Slider、Toast、Tooltip
  model/          纯函数、无 React：数据结构定义、默认值、日期解析与格式化、富文本解析、ID 生成
  migrate/        v2 → v3 迁移器（IndexedDB 和 JSON 备份），JSON Resume 的导入 / 导出
  theme/          主题数据结构、预设、规范化、把主题转换成 CSS 变量
  render/         统一的简历渲染器（可编辑 / 只读），resume.css 是唯一的简历样式表
  editor/         编辑器外壳：顶栏、大纲、Dock、主题工作室、页边批注、预览模式
  lint/           写作建议规则（纯函数，每条规则一个文件，带单元测试）
  store/          状态库（基于 useSyncExternalStore）、撤销 / 重做、IndexedDB 存储（防抖 + 跨标签页同步）
  home/           简历库首页
  sync/           GitHub Gist 加密同步（M2）
```

**依赖原则**

- 运行时依赖只保留 `react`、`react-dom`、`lucide-react`。
- 去掉 Tailwind、`@dnd-kit` 和 `html-to-image`：
  - 拖拽排序用原生 HTML5 实现；
  - 导出 PNG 的需求改为导出 PDF。

### 2.1 数据模型（schema 3）

```ts
ResumeDoc {
  id, schema: 3, name, tags[], createdAt, updatedAt
  locale: 'zh' | 'en'                 // 决定默认的区块标题和日期写法
  profile: { name, headline, photo, contacts: Contact[] }
  sections: Section[]                 // 有序；区块是否显示由 hidden 控制
  theme: Theme                        // 完整的主题对象（来源预设记在 theme.preset）
  dismissed: string[]                 // 已忽略的写作建议 id
}
Section { id, kind, title, hidden, layout: 'entries' | 'rows' | 'text', items: Item[] }
Item    { id, title, subtitle, location, start, end, links[], tags, text, bullets[], hidden }
```

- `kind` 只用来决定写作规则和默认文案，渲染**只看 `layout`**。这样任何自定义区块都能直接复用经历、技能、自我评价三种排版。
- 正文里的行内语法只支持 `**粗体**` 和 `[文字](链接)`，网址会自动变成链接。
- 迁移链 `migrate(raw) → v3`：
  - 每个历史版本对应一个纯函数，配有单元测试；
  - 遇到无法识别的数据时**不再清空**，而是原样存档并提示用户。

### 2.2 主题引擎

每个主题是一个可以序列化成 JSON 的对象，由**版式**和**样式 token** 两部分组成。所有预设只是这个对象的不同取值，用户的任何调整都直接改这个对象，可以「另存为我的主题」，也可以导入 / 导出 `.iresume-theme.json` 文件。

```ts
Theme {
  preset, name
  layout:  'single' | 'aside-left' | 'aside-right' | 'side-headings'
  aside:   SectionKind[]                              // 双栏时放进侧栏的区块
  header:  { align: 'left' | 'center' | 'split', contacts: 'inline' | 'stacked', photo: 'none' | 'circle' | 'rounded' }
  heading: { style: 'rule' | 'underline' | 'bar' | 'band' | 'plain', caps: boolean }
  entry:   { date: 'right' | 'below' | 'gutter', order: 'title-first' | 'org-first' }
  bullet:  '•' | '–' | '▪' | 'none'
  skills:  'rows' | 'inline' | 'tags'
  font:    { body, heading, size(pt), leading, nameScale, headingScale }
  color:   { accent, ink, muted, rule, asideBg, accentOn: { name, headings, links, rules } }
  space:   { margin(mm), section(em), entry(em) }
  page:    'A4' | 'Letter'
  date:    { style: 'dot' | 'slash' | 'dash' | 'month-en' | 'cn', present: string }
}
```

- 渲染器只输出语义化 HTML，所有差异都通过 `data-*` 属性和 CSS 变量表达，**整个系统只有一份 `resume.css`**。
- 首批 8 个预设：清简（默认，适合 ATS）、经典衬线、侧标题、双栏、现代、紧凑、时间线、书卷。
- 「主题工作室」放在 Dock 里，按六组调整：版式 / 标题 / 字体 / 颜色 / 间距 / 细节。

### 2.3 编辑 = 渲染

- 同一个 `<Resume doc editable>` 组件同时负责编辑、预览和打印，所以编辑时看到的和导出的一定完全一致。
- 可编辑字段采用 `contenteditable="plaintext-only"`，并且是非受控的：只有在失去焦点、且内容不一致时才回写 DOM，不会出现光标跳动。
- 要点列表：回车拆成两条，在行首按退格合并到上一条，上下方向键跨条移动。
- **撤销 / 重做**：每份简历一个历史栈；连续输入按 600ms 合并为一步。
- **存储**：使用新的 IndexedDB 库 `iresume-v3`，包含三个 store：`docs`、`snapshots`、`kv`。
  - 写入采用 400ms 防抖，关闭页面前会立即写入；
  - 多个标签页之间通过 `BroadcastChannel` 同步；
  - 首次启动时从 `iresume` v2 库导入数据。
- **导出**：
  - PDF：使用浏览器打印，`@page` 精确匹配纸张尺寸，打印的就是渲染器本身；
  - JSON：iResume 自有格式和 JSON Resume 两种；
  - Markdown 和纯文本（M2）。

## 3. 里程碑

### M1 · 新底座（本轮）
- [x] 方向 E 原型
- [x] `model` / `migrate` / `theme` / `lint` 纯函数层，配齐单元测试
- [x] 统一渲染器与 `resume.css`，8 个预设
- [x] 状态库、撤销 / 重做、IndexedDB 存储、导入 v2 数据
- [x] 编辑器外壳：顶栏、大纲、Dock、主题工作室、页边批注、预览模式、手机适配
- [x] 首页简历库：新建、复制、删除、导入、导出
- [x] 打印 / PDF，导入导出 JSON
- [x] 删除旧代码和 Tailwind；配置 CI（lint、类型检查、测试、构建）

### M2 · 投递效率（执行中）

按依赖顺序分四步，每一步都单独提交，并保证 `bun run check` 全部通过。

**M2.1 导出格式**（`src/export/`，纯函数并配单元测试）
- [ ] Markdown：适合粘贴到招聘网站或邮件正文
- [ ] 纯文本：适合在线申请表里的「粘贴简历」框
- [ ] JSON Resume 的导入与导出（jsonresume.org v1 schema），和其他工具互通
  - 日期统一转换为 `YYYY-MM`
  - 遇到无法对应的字段，放进自定义区块，不丢数据

**M2.2 版本快照**（`src/store/store.ts` · `src/model/diff.ts` · `src/editor/Versions.tsx`）
- [x] 快照存进 `snapshots` 表，每条记录为 `{ id, docId, label, auto, createdAt, doc }`
- [x] 两种快照：
  - 手动：起名保存；
  - 自动：每天第一次编辑前存一份，最多保留 20 份自动快照。
- [x] 恢复前先自动保存当前版本，所以恢复操作本身也能撤回
- [x] 对比：按区块和条目列出新增 / 删除 / 修改，修改的要点给出修改前后的原文
- [x] 迁移 2.x 的 `histories`，导入旧数据时一并转换

**M2.3 定制投递**（`src/match/keywords.ts` · `src/editor/Match.tsx`）
- [x] 派生：从一份简历复制出岗位定制版，记录 `baseId` 和目标岗位
- [x] 岗位匹配：
  - 粘贴 JD 后在本地提取关键词，包括英文技术词和中文要求短语；
  - 显示已覆盖和缺失的关键词；
  - JD 随简历一起保存；
  - 不调用任何网络服务。

**M2.4 GitHub 加密同步（重写并修复安全问题）**
- 旧方案的问题：
  - 同步密钥 = HMAC（服务端 client secret，用户 id）。服务端能解密所有用户的数据，secret 一旦泄露，所有用户的数据都会暴露。
  - `gistId` 没有编码。
- 新方案：端到端加密。
  - 用户设置一个同步口令，在客户端用 PBKDF2-SHA256（60 万次迭代，随机 salt）派生出 AES-GCM 密钥。密钥保存在 IndexedDB 中，且不可导出。
  - 服务端只负责 OAuth 换取 token，**永远接触不到密钥**。
- 数据格式：
  - Gist 文件 `iresume-sync-v3.json`，信封为 `{ format, kdf: { salt, iterations }, iv, data }`。
  - 解密后是 `{ docs, themes, tombstones }`。
- 合并规则：
  - 每份简历以 `updatedAt` 较新的一方为准；删除操作用墓碑记录同步。
  - 本地版本被远端覆盖前，先存一份快照，所以冲突不会丢数据。
- 兼容旧数据：检测到旧格式文件时，通过旧接口 `sync-key` 解密一次，然后用新口令重新加密，旧文件保持不变。
- [x] `src/sync/`：加密、合并、Gist 客户端（`fetch` 可注入），全部配单元测试
- [x] 首页「同步」面板：连接 GitHub、设置口令、立即同步、上次同步时间、断开连接

### M3 · 打磨
- [x] 真实分页预览（逐页显示）：模拟打印分页规则（条目不拆开、标题跟随内容、段落按行切），预览与编辑器分页线共用；已对 8 套预设逐一核对 PDF 分页位置
- [x] 主题分享（链接或文件）：链接只编码与预设不同的字段（通常 < 200 字符），打开后经 normalizeTheme 校验
- [x] 英文界面：界面语言（按浏览器语言自动选择，首页可切换并记住）与简历语言分开——按钮、提示、批注跟随界面语言，纸面上的默认标题、占位文字、「至今 / Present」跟随简历自己的语言；文案与组件放在一起，`defineMessages` 在编译期检查英文是否缺键；英文示例简历同样按最佳实践撰写
- [x] PWA 离线：手写 Service Worker（页面网络优先、哈希资源缓存优先、/api 与跨域不缓存），可安装，离线时同步自动暂停、联网后补同步
- [x] Playwright 回归测试：`bun run e2e` 覆盖编辑、8 套预设的「编辑器 / 预览 / PDF」页数一致、历史版本、岗位匹配、主题链接、加密同步（模拟 GitHub）、离线；CI 执行。`bun run e2e:visual` 是逐预设截图对比，基线与系统字体相关，只在本机生成
- [x] 无障碍检查：axe-core 审查首页、同步面板、编辑器、各面板与预览（serious / critical 为零）；预设颜色与界面次要文字对比度 ≥ 4.5，有单元测试守护

- [x] 编辑器体验走查（1280 笔记本 / 1920 宽屏 / iPhone）：透明顶栏、可折叠大纲（⌘\）、常驻批注列（批注出现时纸面不再缩放）、添加区块菜单定位、回车跳到下一个字段、手机顶栏与贴底标签栏、老用户首页直接进入「我的简历」

### M4 · 3.0 正式版（执行中）

目标：把 3.0 做到可以替换线上 2.x。先补齐「改了什么」「已有简历怎么进来」「新用户怎么上手」三个体验缺口，再完成跨浏览器验证与上线。

#### M4.1 修改标记（diff 模式，默认关闭） ✅
- 为什么：历史版本解决「回到哪一版」，修改标记解决「这次改了哪里」——投递前核对、给别人看改动都需要。
- 形式：**不在纸面上标红绿**（纸面就是 PDF，所见即所得不能破坏）。标记放在纸面外侧的页边，参考代码编辑器的修改标记：
  - 新增 → 绿色细竖条；修改 → 琥珀色细竖条；删除 → 原位置留一个「已删除 N 条」的小标记；
  - 点击竖条弹出这一处的前后对比（词级 diff：删去的划线标红，新增的标绿），可以「撤回这一处」；
  - 顶栏显示「修改 N 处」，带上一处 / 下一处；
  - 永远不会进入打印 / 导出。
- 对比基准（可切换）：本次打开时（默认）· 上次导出 PDF 时 · 任一历史版本。导出 PDF 时自动存一份「导出」快照作为基准。
- 开关：顶栏按钮，默认关闭，按简历记住。
- 验收：条目 / 要点 / 行 / 区块 / 页眉五级 diff 的单元测试；e2e 覆盖开关、计数、撤回一处、导出后基准切换。

#### M4.2 跨浏览器与打印一致性 ✅
- 现状：分页模拟只在 Chromium 上与 PDF 对过。调研结论：
  - Safari 18.2 起支持 `@page` 的 size 与 margin，iOS 上仍有问题；
  - Safari 支持 `break-inside: avoid`，但**不支持** `break-after: avoid`，且 `CSS.supports()` 会误报支持。所以「标题跟随内容」在 Safari / Firefox 上靠不住。
- 做法：
  - 渲染时把「区块标题 + 第一个条目」包进一个 `break-inside: avoid` 的容器，不再依赖 `break-after`；
  - Playwright 增加 Firefox / WebKit 项目，在 CI 跑功能 e2e（编辑、`contenteditable="plaintext-only"`、弹层、同步）；
  - Safari / Firefox 的打印结果整理成手工核对清单（PDF 生成只有 Chromium 能自动化）。
- 验收：三个浏览器功能 e2e 全绿；8 套预设在 Chromium 上的分页结果不变。
- 实际做法（与原计划不同）：没有改 DOM 结构。把「标题 + 第一个条目」包进容器会破坏侧标题的网格、技能表格的 subgrid 和时间线的 `:last-child`。改为复用编辑器的分页计算：
  - 找出真正会成为孤行的标题——标题在上一页放得下，后面的内容放不下；
  - 导出时对这些区块写 `break-before: page; margin-top: 0`。强制换页在所有引擎都支持。
  - 标题本来就在页尾之外的不强制，否则测量与打印的亚像素差异会多出一页（时间线预设上验证过）；
  - 8 套预设中有 4 套触发了显式换页，Chromium 的 PDF 页数仍然一致；
  - 手工核对清单见 `docs/PRINT_CHECKLIST.md`。

#### M4.3 导入已有简历（PDF / Word / 纯文本） ✅
- 为什么：新用户手里大多已经有一份简历，从零填写是最大的上手门槛。
- 做法（全部在本机完成，不上传）：
  - PDF：按需加载 pdf.js，读取文字及其坐标（`getTextContent`），按坐标还原阅读顺序；
  - Word：按需加载 mammoth，`extractRawText`；
  - 纯文本：直接粘贴；
  - 解析方法参考 OpenResume：文字 → 行 → 用标题词典（中英）和加粗 / 字号识别区块 → 区块内识别条目（日期区间、公司 / 学校、职位）与要点（•、-、数字序号）。识别不了的内容放进一个「待整理」区块，不丢；
  - 导入前给出预览，确认后生成新简历。
- 验收：用 8 套预设自己导出的 PDF 做往返测试（导出 → 导入 → 与原文对比，关键字段命中率 ≥ 90%）；另备 docx 与纯文本样例。
- 体积：解析库只在用户点击导入时加载，不进入首屏包。
- 实际结果：
  - 往返测试：16 份 PDF（8 套预设 × 中英文）的关键字段命中率全部 ≥ 90%，没有一行落进「待整理」；
  - Chromium 上两页的时间线简历导出后再导入，条目与要点一条不少；
  - Firefox / WebKit 上也跑了 PDF 导入，验证 pdf.js worker 能正常加载；
  - 首屏包只增加了导入对话框本身，约 10 KB。
- 顺带发现：日期用的 `tabular-nums` 会让 Chrome 导出的 PDF 里日期变成空白。复制不出来，ATS 也读不到；已去掉。

#### M4.4 上手引导与可发现性 ✅
- 第一次打开编辑器时给 3 条轻提示：直接点文字编辑、悬停条目出现工具、底部 Dock 调排版。可关闭，只出现一次。
- 条目里的空字段（链接、技术栈）在悬停时显示为「+ 链接」这类可点击的提示，而不是灰色占位字。
- 「?」快捷键面板：列出全部快捷键。
- 实际做法：
  - 提示卡片放在右下角，不遮挡纸面，可以跳过；
  - 右下角常驻「?」按钮，快捷键按平台显示 ⌘ 或 Ctrl，面板里可以重新看提示；
  - 新用户的首页在「空白简历」旁边多一张「导入已有简历」卡片；
  - 抽出通用的 `Dialog`（原生 `<dialog>`），导入对话框与快捷键面板共用。

#### M4.5 条目拖拽排序
- 条目工具条加拖动柄，同一区块内拖动排序（沿用大纲里的原生拖放实现）；上下箭头与键盘操作保留。

#### M4.6 AI 改写要点（可选，待确认）
- 与「数据只在本机」的定位有冲突。如果做：用户自带 API Key，默认关闭，每次发送前明确提示会把哪段文字发给谁。
- 需要你确认后再开始。

#### M4.7 上线
- 开 PR 合并到主分支，先发 Vercel 预览环境；用真实的 2.x 数据核对迁移；用真实 GitHub 账号跑一次同步。
- 更新 README 截图，写 3.0 更新说明，打版本标签。

执行顺序：M4.1 → M4.2 → M4.3 → M4.4 → M4.5 → M4.7（M4.6 等确认）。

## 4. 质量线

- `model` / `migrate` / `theme` / `lint` 四层的单元测试覆盖率 ≥ 90%。
- 迁移器用真实的 v2 示例数据做「迁移前后快照」测试。
- 每次提交前 `bun run lint && bun run typecheck && bun run test && bun run build` 全部通过，CI 同样执行这四项，并另起一个任务跑端到端测试。
