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
- 主题分享（链接或文件）
- 英文界面
- PWA 离线
- Playwright 截图回归测试
- 无障碍检查

## 4. 质量线

- `model` / `migrate` / `theme` / `lint` 四层的单元测试覆盖率 ≥ 90%。
- 迁移器用真实的 v2 示例数据做「迁移前后快照」测试。
- 每次提交前 `bun run lint && bun run typecheck && bun run test && bun run build` 全部通过，CI 同样执行这四项。
