# iResume 3.0 重构计划：架构 + 设计系统 + 交互体验

> **基线**（2026-11-22，分支 `claude/iresume-refactor-optimize-rwqrqv`）：lint 和 tsc 通过；10 个测试文件、共 20 个用例全部通过；构建成功，主包 482 KB（gzip 后 141 KB）。
>
> **范围**：本次是一次完整迭代，不只是代码重构。信息架构、布局、视觉风格和组件库都可以推倒重来。唯一不能出问题的是**用户数据**和**简历的打印输出**。

---

> ### 2026-11-23 更新：方向已定为 E「所见即所得」，项目改由 Claude 主导和长期维护
>
> 设计稿见 [`docs/design/prototypes/e-canvas.html`](design/prototypes/e-canvas.html)。不再兼容旧的布局和交互，这对架构有以下影响：
>
> - **取消表单式编辑器**。原来约 2800 行的 `ResumeEditor` 不再保留，改为在模板渲染器里输出「可编辑字段」。
>   - 每个模板只写一份渲染代码，通过 `editable` 开关同时服务编辑和打印 / 导出两种场景。
>   - 字段采用 `contenteditable="plaintext-only"` 并绑定数据路径；要点列表单独实现一个 `EditableList`，处理回车、退格和上下方向键。
> - **编辑器外壳只剩四块**：顶栏、文字大纲、底部 Dock（带弹层）、页边批注。原来的左右面板全部取消。
> - **写作建议独立成一个模块** `features/suggestions`：用纯函数规则生成建议，界面上以批注呈现，每条可单独忽略，并支持后续扩展规则。
> - **App UI 的 token 改为黑白单色**，蓝色只用在品牌 i 标；简历产物的 token 仍保持独立。
> - 第四节 D0 阶段视为完成；D1 组件库按 E 的需要裁剪，只做 Button、IconButton、Popover / Sheet、Menu、Slider、Segmented、Toast、Tooltip。
> - **执行顺序**：P0 安全网 → P1 数据层 → 新外壳 + 可编辑模板（P2 / P3 合并）→ 模板迁移 → 性能 → 同步安全。

## 一、现状诊断

### 1. 代码结构

| 文件 | 行数 | 问题 |
| --- | --- | --- |
| `src/App.tsx` | 2919 | 28 个 useState、23 个 useEffect、约 22 处直接读写 localStorage；同步、导出、分页、画布、面板、库管理和全部 JSX 都在这一个文件里 |
| `src/components/ResumeEditor.tsx` | 2846 | 35 个 props、约 15 个内联组件；经历、项目、教育三处编辑器是复制粘贴的；在页面中被渲染两次 |
| `src/components/ResumePreview.tsx` | 1511 | 10 个模板共用一个组件，靠 switch 分支区分，还有 `templateId === 'ats'` 这类硬编码 |
| `src/components/ResumeManager.tsx` | 1485 | 管理页、模板卡片、创建弹窗、设置页全部写在同一个文件 |

- `ResumePreview` 和 `StructuredResumeLayout` 有约 10 组函数几乎逐字相同。
- 13 个外观 handler 写法几乎一样。
- `isRecord` 有 5 份副本，同一个 TemplateId 列表在 3 处分别维护。

### 2. UI 与交互（来自实际截图）

- **没有设计系统**：
  - 直接使用 Tailwind 原生色板，`text-slate-400` 出现了 87 次，灰底灰字很可能达不到 WCAG 对比度要求。
  - 没有任何 Button、Dialog、Menu 基础组件，4 处弹窗都是手写的 `fixed inset-0`，缺少焦点管理。
  - 不支持暗色模式。
- **信息架构混乱**：
  - 左栏同时放了“简历信息”“区块顺序”“布局与样式”三类东西。
  - 右栏先显示“显示设置”，再显示“内容字段”，内容和外观混在一起。
  - 用户想“改内容”还是“调样式”，没有清晰的入口。
- **管理页**：简历卡片上的标题“林小明”压在缩略图文字上，视觉上重叠了。
- **移动端**：
  - 只是把面板上下堆叠，预览很难找到。
  - 桌面端的快捷键提示（“鼠标中键 抓手”）在手机上也会显示。
- **缺少引导**：
  - 没有“当前是否超出一页”的明显提示。
  - 没有写作建议，也没有示例内容提示。
  - 保存状态不可见。

### 3. 潜在 bug 与数据风险（优先级最高）

1. **Schema 升级会清空数据**：`normalizeResumeWorkspace` 只要遇到 `version !== 2` 就直接返回默认值，没有迁移链。
2. 每次按键都写一次 IndexedDB，没有防抖（debounce）。
3. 分页测量的依赖里漏了 `sectionIconNames` 和 `sectionIconSizePx`。
4. `readInitialView` 在数据加载（hydrate）完成之前就执行；`isHydrated` 定义了却没有用到。
5. 标签输入框使用 `defaultValue`，撤销后界面不会刷新。
6. normalize 内部用 `Date.now()` 生成 id，同样的输入每次结果不同。
7. `localhost:3000` 这类链接被误判为协议，因此被拒绝。

### 4. 安全（云同步）

- `gistId` 拼进 URL 时没有做转义。
- API 没有 try/catch，`redirectUri` 不校验。
- 断开连接时不会吊销 token。
- **同步密钥 = HMAC(client secret, user.id)**：服务端可以解密所有用户的数据，而且一旦轮换 secret，所有云端数据都会无法解密。

### 5. 性能

- 每次按键都会重渲染：两个 Editor，加上 1 + N 份 Preview。全项目没有 memo，也没有用 `useDeferredValue`。
- 分页测量每次最多触发 3 次。
- 拖动面板时，每次 pointermove 都会重渲染全部预览。
- 管理页的每张卡片都渲染一份完整的实时预览。
- 只用到一个 lucide 图标，就会加载 450 KB 的完整图标库。

---

## 二、核心决策

1. **先定交互方向，再做组件库**。组件库是为页面服务的。如果没想清楚页面长什么样就先做组件，最后往往要返工。因此第一步是做信息架构（IA）和可交互原型。
2. **组件库放在仓库内，不单独发包**。采用“headless 行为层 + 自有样式”的方式（类似 shadcn 的思路，代码归自己所有）：
   - 对话框、菜单、Popover、Tabs、Slider、Tooltip 这类可访问性（a11y）复杂的行为，交给成熟的 headless 库处理，推荐 **Base UI** 或 **Radix**。
   - 视觉部分全部用自定义 token 和 Tailwind v4 的 `@theme` 来写。
   - 用一个 `/dev/ui` 组件画廊页面，代替 Storybook，零额外依赖。
3. **把“应用外壳”和“简历产物”分成两套 token**：
   - App UI 的 token：品牌色、层级、暗色模式等。
   - 简历模板的 token：印刷尺寸、字号、主题色。
   - 两者互不影响。改 App 风格时，不能让打印出来的 PDF 跟着变。
4. **重构 UI 与拆分 App 合并进行**。旧组件不做“先拆分再重写”，而是直接用新组件库重建页面，避免同一块代码返工两次。
5. **数据层和模板渲染走渐进式重构**，靠测试和视觉回归来保证行为不变。

---

## 三、新的信息架构（草案，在 D0 阶段用原型验证）

### 管理页（首页）
- 布局：左侧是最近编辑的简历，右侧是快捷入口。
- 新建简历分 4 种方式：空白、选模板、导入 JSON、从 Markdown 粘贴。
- 简历卡片：缩略图和元信息上下分开，不再重叠。缩略图懒加载。卡片上显示标签、版本号、更新时间和页数。
- 模板中心：支持按风格筛选（技术 / 设计 / 学术 / ATS 友好），可以用自己的真实数据预览模板。

### 编辑器
```
┌────────────────────────────────────────────────────────────────────┐
│ ← 我的简历   林小明·前端 v1.2   已保存 ✓     [内容][设计]  撤销 重做  导出 ▾ │
├───────────┬───────────────────────────────────┬────────────────────┤
│ 大纲      │                                   │ 检查器（随选中变化） │
│ ⠿ 个人信息 │          A4 画布（点击即选中）       │  内容模式：当前区块字段 │
│ ⠿ 教育背景 │                                   │  设计模式：模板/颜色/  │
│ ⠿ 工作经历 │                                   │           字体/间距   │
│ ＋ 添加区块 │      ── 第 1 页结束 ── 超出 3 行 ⚠   │  区块显示偏好（折叠）  │
└───────────┴───────────────────────────────────┴────────────────────┘
```
- **两种模式**：
  - 「内容」模式：只写内容。
  - 「设计」模式：只调样式。
  - 这样把现在混在一起的两类操作分开。
- **左侧大纲**：拖拽排序、显隐开关、跳转定位。简历的元信息（名称、版本、标签）移到顶栏，点击后弹出 Popover 编辑。
- **一页适配助手**：
  - 实时显示“超出 N 行”。
  - 一键建议压缩方案：收紧行距、缩小页边距、缩小字号。
- **写作引导**：
  - 空区块显示示例和写作建议，例如“动词开头 + 量化结果”。
  - 描述字段显示字数统计。
- **全局操作**：
  - ⌘K 命令面板：跳转区块、切换模板、导出。
  - 快捷键帮助面板，代替常驻的提示条。
- 保存状态和同步状态在顶栏常驻显示。

### 移动端
- 底部 Tab 切换「编辑 / 预览 / 设计」，每个 Tab 都是全屏视图。
- 预览支持双指缩放。
- 隐藏只适用于桌面端的提示。

---

## 四、分阶段计划

### P0 · 安全网（约 1 天）
- [ ] GitHub Actions：lint → tsc → test → build。
- [ ] 为数据层补单测：
  - normalize 系列函数，包括旧格式输入；
  - 版本号递增逻辑；
  - `url.ts` 和 `markdown.tsx`；
  - cloudSync 加解密往返。
- [ ] Playwright 视觉回归：固定一份样例数据，覆盖 11 个模板 ×「连续 / 分页」两种模式，截图作为**简历输出**的基线。这是后续所有阶段的验收标准。
- [ ] 把运行时依赖从 `devDependencies` 挪到 `dependencies`。

### D0 · 设计方向与原型（约 2 天）
- [ ] 出 2–3 套视觉方向，做成可交互的 HTML 原型，内容包括配色、字体、圆角、密度，以及首页和编辑器两张关键页面。
- [ ] 确定方向后，产出设计规范：色彩、字体层级、间距、圆角、阴影、动效时长、暗色模式。
- [ ] 用原型验证第三节的信息架构，尤其是「内容 / 设计」双模式和移动端交互。

### D1 · 设计系统与组件库（约 3–4 天）
```
src/ui/
  tokens.css          // @theme：颜色（语义化：surface / text / border / accent / danger…）、
                      // 字号、间距、圆角、阴影、动效；含 [data-theme=dark]
  primitives/         // Button, IconButton, Input, Textarea(auto-resize), Select, Switch,
                      // SegmentedControl, Slider, NumberStepper, Field(label/hint/error),
                      // Dialog, Sheet(移动端), Popover, DropdownMenu, Tooltip, Tabs,
                      // Toast, Badge, Tag, Kbd, EmptyState, Skeleton
  patterns/           // SortableList, Panel/PanelSection, Toolbar, CommandPalette,
                      // ColorPicker, IconPicker, ResizablePanels
  dev/Gallery.tsx     // /dev/ui 组件画廊（仅开发环境）
```
- 组件约定：
  - 统一 `size` 和 `variant` 属性；
  - 支持 `forwardRef`；
  - 键盘可用，有可见的焦点环；
  - 对比度达到 WCAG AA。
- 加一条 Biome 规则或 grep 检查：业务代码中禁止直接使用 `slate-*` 这类原生色板，只能使用语义 token。

### P1 · 数据层整理（约 2 天，可与 D0/D1 并行）
- [ ] `utils/guards.ts`：统一 `isRecord`、`readString` 等工具函数。
- [ ] `data/storageKeys.ts`：统一前缀为 `iresume:*`，并迁移旧 key。
- [ ] `usePersistentState`：替换所有直接读写 localStorage 的代码。
- [ ] **工作区迁移链**：用 `migrations[v]` 逐版本升级，替代“版本不符就重置”的做法。
- [ ] 把 `UserDataBackup` 移出 App，外观映射合并成一处。统一三个术语：`ResumeExport`、`WorkspaceBackup`、`SyncEnvelope`。
- [ ] 写 IndexedDB 加 300 ms 防抖，并在 `pagehide` 时立即写入（flush）。normalize 改成确定性的（同样输入得到同样结果）。
- [ ] 状态管理改为 **zustand**（约 1 KB）。用 selector 精确订阅，例如编辑某个字段时，不会让大纲和顶栏一起重渲染。

### P2 · 用新组件库重建应用外壳（约 5 天）
```
src/
  app/          App.tsx（路由：manager / editor / dev）、providers
  stores/       workspaceStore, uiPrefsStore, syncStore
  features/
    manager/    HomePage, ResumeCard, TemplateGallery, CreateResumeDialog, SettingsPage
    editor/     EditorPage, TopBar, Outline, Canvas, Inspector, FitAssistant, CommandPalette
      content/  PersonalForm, ListSectionEditor（schema 驱动）, MarkdownSectionEditor
      design/   TemplatePicker, ColorPanel, TypographyPanel, SpacingPanel, SectionPrefs
    sync/       useCloudSync, useLocalFolderSync, confirmOverwrite
    export/     useResumeExport, download
    canvas/     useCanvasNavigation, usePagination, paginate.ts（纯函数）
```
- [ ] 用 schema 驱动的 `<ListSectionEditor>` 取代 5 套复制粘贴的列表编辑器，预计减少约 600 行。
- [ ] 使用类型安全的 `updateListItem<K extends ListSectionKey>`。
- [ ] 第一节中的 bug 3–5 在重建过程中一并修复。
- [ ] 验收标准：
  - 不保留任何旧组件；
  - 单个文件不超过 400 行；
  - 简历输出的视觉回归零差异。

### P3 · 模板引擎（约 3–4 天，简历输出零差异）
- [ ] 新增 `templates/sectionModel.ts`，抽出各模板公共的可见性、标题、点击定位、条目元信息逻辑。
- [ ] 抽出共享组件：`EntryHeader`、`ProjectLinks`、`SkillRows`、`ContactList`、`NameBlock`。
- [ ] 模板改为 slot 结构，每个模板放在 `templates/<id>/` 下，自行声明 Header、SectionHeader、Entry。新增一个模板只需改动一个目录。
- [ ] 由唯一的 `templateIds as const` 派生出类型、配置和注册表。删除死字段 `skillLayout` 和硬编码判断。
- [ ] 修正单位命名：`pageMarginMm` 改为 `pageMarginPx`，并配合数据迁移。清理 `index.css` 中对 Tailwind 类的覆盖。

### P4 · 性能（约 2 天）
- [ ] 预览加 `memo`，并配合 `useDeferredValue`。
- [ ] 分页只渲染一份 DOM，再用裁剪窗口显示各页。分页测量合并为单次 rAF。
- [ ] 缩略图用 IntersectionObserver 懒加载，并加 `content-visibility`。
- [ ] lucide 图标改为按需动态导入，导出前等待图标加载完成。
- [ ] 改造前后各记录一次：包体积、首屏时间、输入延迟（用 React Profiler）。

### P5 · 云同步安全（约 1–2 天，可在 P1 之后任意时间插入）
- [ ] 校验 `gistId` 并做转义。API 加 try/catch，校验 `redirectUri` 白名单和 Origin。断开连接时吊销 token。
- [ ] 推送前检测冲突，取代目前的“后写入者覆盖”（last-write-wins）。
- [ ] 改造密钥方案（需要你决策）：改用独立的服务端密钥，或由用户口令派生密钥。用 `key` 字段区分版本，v1 只读兼容，写回时升级到 v2。

---

## 五、顺序与里程碑

```
P0 ─► D0 ─► D1 ─► P2 ─► P3 ─► P4
 └──► P1 ───────┘          P5（P1 之后任意时机）
```

| 里程碑 | 内容 | 验收标准 |
| --- | --- | --- |
| M1 | P0 + P1 + D0 | CI 全绿；数据迁移测试通过；设计方向已确定 |
| M2 | D1 | `/dev/ui` 画廊完整；主要组件经过 a11y 自查 |
| M3 | P2 | 新外壳上线，旧组件全部删除，简历输出零差异 → 发布 **3.0 beta** |
| M4 | P3 + P4 + P5 | 模板可插拔；性能指标有改善；安全项全部关闭 → 发布 **3.0** |

## 六、待你决策

1. **视觉方向**：先让我出 2–3 套 HTML 原型给你挑，还是你已经有参考产品或风格倾向？
2. **headless 库**：Base UI 还是 Radix？
3. **状态库**：是否引入 zustand？
4. **云同步加密方案**：是否调整？调整的话会涉及已有云端数据的兼容迁移。
