<div align="center">
  
# <img src="./public/favicon.svg" width="30" /> iResume

**直接在纸上写简历 · 所见即所得 · 本地优先**

[立即体验](https://resume.dogxi.me) · [报告问题](https://github.com/dogxii/iresume/issues) · [功能建议](https://github.com/dogxii/iresume/issues)

![Version](https://img.shields.io/badge/version-3.0.0--alpha-111113?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-10b981?style=flat-square)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)

</div>

---

## 👀 预览

https://resume.dogxi.me

## 📚 简介

iResume 3 是一次彻底的重写。没有表单，也没有左边填写、右边预览：**直接点简历纸面上的文字就能改**，编辑时看到的纸面就是导出的 PDF。

**核心理念：** 默认就能写出一份好简历。最佳实践直接内置在产品里：一页适配、ATS 友好的版式、统一的日期格式、写作批注。需要个性化时，可以自由定制主题。

## ⚡️ 功能特性

- **所见即所得编辑**：
  - 直接在纸面上输入；
  - 回车新起一条要点，在行首按退格会和上一条合并；
  - 支持 `**粗体**` 和 `[链接](url)`。
- **主题引擎**：
  - 8 套预设：清简、经典、侧标题、双栏、现代、紧凑、时间线、书卷；
  - 版式、标题样式、字体、颜色、间距、日期写法都可以单独调整；
  - 可以把调整好的主题另存，也可以复制分享链接或导出主题文件分享给别人（只含主题，不含简历内容）。
- **一页适配**：实时显示页数和超出的行数，一键按「行高 → 间距 → 边距 → 字号」逐级压缩，可以撤销。
- **写作批注**：像文档评论一样显示在页边，提示缺少量化结果、用弱动词开头、要点过长、日期不规范、经历没有倒序等问题。
- **历史版本**：每天第一次编辑前自动留底，也可以给当前版本命名保存；可以与当前内容逐条对比，一键恢复（恢复本身也能撤回）。
- **修订标记**：顶栏一键打开（默认关闭），在纸面左侧页边用绿 / 琥珀 / 红点标出新增、修改、删除；点开看词级前后对比，可单独撤回。可以对比本次打开时、上次导出 PDF 时或任一历史版本。标记不会进入 PDF。
- **定制投递**：从一份简历派生出针对某个岗位的版本；粘贴 JD 后在本机提取关键词，显示已覆盖、部分匹配和缺失的词。
- **导出**：
  - PDF：通过浏览器打印生成，文字可以选中，可以被 ATS 解析；
  - Markdown、纯文本（复制到网申表单）、[JSON Resume](https://jsonresume.org)；
  - iResume JSON：完整备份内容和主题。
- **端到端加密同步**：
  - 加密后存进你自己 GitHub 账号下的私密 Gist；
  - 密钥由同步口令在本机派生（PBKDF2-SHA256 60 万次 + AES-GCM），GitHub 和 iResume 服务端都无法读取；
  - 多设备按修改时间合并，被覆盖的一方自动存进历史版本。
- **中英双语界面**：按浏览器语言自动选择，可随时切换；界面语言与简历语言互不影响，英文简历自动使用英文区块标题与日期写法。
- **本地优先**：
  - 数据保存在浏览器的 IndexedDB 中；
  - 可以安装成应用（PWA），断网也能打开和编辑；
  - 首次打开时会自动导入 2.x 的数据，旧数据保持原样。

## 🚀 快速开始

线上版本实时更新，打开即可使用：

https://resume.dogxi.me

## 本地运行

```bash
git clone https://github.com/dogxii/iresume.git
cd iresume
bun install
bun run dev
```

访问 [http://localhost:5173](http://localhost:5173)

## 构建

```bash
bun run build
bun run preview
```

## 同步配置（可选）

不做任何配置时，用户可以粘贴一个只勾选 `gist` 权限的 [Personal access token](https://github.com/settings/tokens/new?scopes=gist&description=iResume%20sync) 来连接。

想提供「使用 GitHub 登录」按钮，需要：

1. 创建一个 GitHub OAuth App，回调地址填站点根地址；
2. 前端环境变量 `VITE_GITHUB_OAUTH_CLIENT_ID`；
3. 服务端（Vercel Functions，见 `api/github/oauth.js`）环境变量 `GITHUB_OAUTH_CLIENT_ID`、`GITHUB_OAUTH_CLIENT_SECRET`。

服务端只用于把 OAuth code 换成 token，接触不到同步口令和简历内容。`api/github/sync-key.js` 仅用于一次性导入 2.x 的云端数据。

## 🧭 使用提示

- 导出 PDF 时，在打印对话框里选择「存储为 PDF」，并关闭「页眉和页脚」
- 简历默认只保存在当前浏览器；换设备或清理浏览器数据前，先在首页点击「备份全部」，或开启「同步」
- 快捷键：
  - `⌘/Ctrl + Z` 撤销，`⇧⌘Z` 重做
  - `⌘/Ctrl + P` 导出 PDF
  - 预览模式下按 `Esc` 返回编辑

## 技术栈

React 19 · TypeScript · Vite · IndexedDB · Lucide · Vitest · Biome · Bun（运行时依赖只有 react、react-dom、lucide-react）

开发前请先阅读 [`docs/REFACTOR_PLAN.md`](docs/REFACTOR_PLAN.md)，里面有架构说明和路线图。提交前请运行 `bun run check`。

端到端测试（Playwright，基于生产构建）：

```bash
bunx playwright install chromium   # 首次
bun run e2e                         # 功能 + 无障碍
bun run e2e:browsers                # 同一套功能测试跑 Chromium / Firefox / WebKit
bun run e2e:visual -- --update-snapshots   # 首次生成本机截图基线
bun run e2e:visual                  # 之后对比截图
```

## 💰 赞赏项目

如果觉得这个项目对你有帮助，欢迎请我喝咖啡 ☕️

> 采取自愿原则, 收到的赞赏将用于提高开发者积极性和开发环境。

<div style="display:flex; gap:24px; align-items:center;">
  <img src="https://s2.loli.net/2022/12/29/TtNiqZnwy6ESGjO.jpg" alt="WeChat Pay" width="160" />
  <img src="https://s2.loli.net/2022/12/29/5xk8paK4wGDnAhW.jpg" alt="Alipay" width="160" />
</div>

## 🪪 License

[MIT](LICENSE) © 2026 Dogxi
