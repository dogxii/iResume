# React Resume Builder

一个基于 React + TypeScript + Tailwind CSS 的在线简历生成器，支持实时预览、本地存储和一键导出 PDF。

## ✨ 特性

- 📝 **实时编辑**：所见即所得的编辑体验，左侧编辑右侧实时预览
- 💾 **本地存储**：自动保存到浏览器 LocalStorage，刷新不丢失
- 🖨️ **一键导出**：优化的打印样式，直接保存为 PDF
- 🎨 **专业设计**：符合 ATS（应聘者跟踪系统）的简洁排版
- 📱 **响应式布局**：适配桌面和移动端
- 🔒 **隐私安全**：所有数据存储在本地，不上传服务器
- ⚡ **性能优化**：使用 Vite 构建，快速加载
- 🌐 **TypeScript**：完整的类型支持，代码更健壮

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm / yarn / pnpm / bun

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
# 或
bun install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

在浏览器中打开 [http://localhost:5173](http://localhost:5173) 查看效果。

### 构建生产版本

```bash
npm run build
# 或
yarn build
# 或
pnpm build
# 或
bun build
```

构建产物将输出到 `dist` 目录。

### 预览生产版本

```bash
npm run preview
# 或
yarn preview
# 或
pnpm preview
# 或
bun preview
```

## 📖 使用指南

### 编辑简历

1. 在左侧编辑器中填写您的个人信息、技能、工作经历等
2. 右侧会实时显示简历预览效果
3. 所有修改会自动保存到浏览器本地存储

### 导出 PDF

1. 点击右上角的 **"保存 PDF"** 按钮
2. 在打印对话框中：
   - **目标打印机**：选择 "另存为 PDF"
   - **边距**：选择 "无" 或 "最小"
   - **背景图形**：**必须勾选**（否则样式会丢失）
   - **页眉和页脚**：取消勾选
3. 点击保存即可

### 重置数据

点击 **"重置"** 按钮可以恢复到默认模版数据（会弹出确认对话框）。

## 🛠️ 技术栈

- **框架**：React 19
- **语言**：TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS 4
- **图标**：Lucide React
- **代码规范**：ESLint + Prettier

## 📂 项目结构

```
resume/
├── src/
│   ├── components/          # React 组件
│   │   ├── ResumeEditor.tsx   # 简历编辑器
│   │   └── ResumePreview.tsx  # 简历预览
│   ├── data/                # 数据文件
│   │   └── initialData.ts     # 初始化数据
│   ├── types/               # TypeScript 类型定义
│   │   └── resume.ts          # 简历数据类型
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 应用入口
│   └── index.css            # 全局样式（含打印样式）
├── public/                  # 静态资源
├── index.html               # HTML 模版
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 配置
└── README.md                # 项目文档
```

## 🎯 核心设计理念

本项目遵循"面试官视角"的简历最佳实践：

### 内容层面

- ✅ **数据驱动**：用量化指标证明能力（如"性能提升 80%"）
- ✅ **STAR 法则**：情景-任务-行动-结果的结构化描述
- ✅ **技术深度**：突出核心技术栈而非堆砌关键词
- ✅ **可验证性**：提供可点击的链接（GitHub、作品集、Demo）

### 样式层面

- ✅ **一页原则**：控制在 A4 一页内
- ✅ **ATS 友好**：使用标准 HTML 标签，机器可读
- ✅ **视觉层次**：通过字重和颜色区分重要信息
- ✅ **打印优化**：专门的 `@media print` 样式

## 🔧 自定义配置

### 修改初始数据

编辑 `src/data/initialData.ts` 文件，修改默认模版内容。

### 调整样式

- **全局样式**：编辑 `src/index.css`
- **组件样式**：直接修改组件中的 Tailwind 类名
- **打印样式**：在 `src/index.css` 的 `@media print` 部分调整

### 添加新字段

1. 在 `src/types/resume.ts` 中添加新的类型定义
2. 在 `src/data/initialData.ts` 中添加默认值
3. 在 `src/components/ResumeEditor.tsx` 中添加编辑表单
4. 在 `src/components/ResumePreview.tsx` 中添加预览渲染

## 📝 开发指南

### 代码规范

```bash
# 运行 ESLint 检查
npm run lint
```

### 类型检查

```bash
# TypeScript 类型检查
npm run build
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献步骤

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 💡 常见问题

### Q: 为什么打印时样式丢失了？

A: 请确保在打印对话框中勾选了 **"背景图形"** 选项。

### Q: 数据存储在哪里？

A: 所有数据存储在浏览器的 LocalStorage 中，不会上传到任何服务器。清除浏览器数据会导致简历内容丢失，建议定期导出 PDF 备份。

### Q: 支持多语言吗？

A: 当前版本仅支持中文，如需英文版简历，可以直接在编辑器中填写英文内容。

### Q: 如何部署到线上？

A: 运行 `npm run build` 后，将 `dist` 目录部署到任意静态网站托管服务（如 Vercel、Netlify、GitHub Pages）即可。

## 🙏 鸣谢

- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [Lucide Icons](https://lucide.dev/)

## 📧 联系方式

如有问题或建议，欢迎通过 [Issues](../../issues) 联系我们。

---

**⭐ 如果这个项目对你有帮助，请给一个 Star！**
