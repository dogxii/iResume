# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [1.0.0] - 2024-01-XX

### 🎉 首次发布

这是 React Resume Builder 的第一个正式版本！

### ✨ 新功能

- **实时编辑器**：所见即所得的简历编辑体验
- **双栏布局**：左侧编辑，右侧实时预览
- **本地存储**：自动保存到浏览器 LocalStorage，刷新不丢失数据
- **PDF 导出**：优化的打印样式，一键保存为 PDF
- **响应式设计**：适配桌面和移动端设备
- **TypeScript 支持**：完整的类型定义，提供更好的开发体验
- **数据重置**：支持一键恢复默认模版

### 📝 简历内容模块

- 个人信息（姓名、职位、联系方式）
- 技能栈（核心能力、React 生态、工程化、样式与性能）
- 工作经历（支持多段经历，动态添加/删除）
- 项目经历（支持多个项目，附带 Demo 和源码链接）
- 教育背景

### 🎨 设计特性

- 专业的简历排版，符合 ATS（应聘者跟踪系统）标准
- 清晰的视觉层次，使用 Tailwind CSS
- 优化的打印样式，确保 PDF 导出完美
- 可点击的超链接（GitHub、作品集、邮箱等）
- A4 纸张尺寸预览

### 🛠️ 技术栈

- React 19
- TypeScript 5.9
- Vite 7 (Rolldown)
- Tailwind CSS 4
- Lucide React (图标)
- ESLint + TypeScript ESLint

### 📦 项目结构

- 组件化设计（ResumeEditor、ResumePreview）
- 类型安全（完整的 TypeScript 类型定义）
- 代码规范（ESLint、Prettier、EditorConfig）
- CI/CD（GitHub Actions）

### 📚 文档

- README.md - 项目说明和快速开始
- CONTRIBUTING.md - 贡献指南
- DEVELOPMENT.md - 开发文档
- DEPLOYMENT.md - 部署指南
- LICENSE - MIT 开源协议

### 🔧 开发工具

- ESLint 代码检查
- Prettier 代码格式化
- EditorConfig 编辑器配置统一
- GitHub Actions CI/CD

---

## [未来计划]

### 🚀 计划中的功能

- [ ] 多语言支持（中文/英文切换）
- [ ] 多种模版主题选择
- [ ] 导入/导出 JSON 数据
- [ ] 在线分享简历（生成链接）
- [ ] 自定义颜色主题
- [ ] Markdown 格式导出
- [ ] 照片上传功能
- [ ] 技能评级可视化
- [ ] 更多简历布局选项
- [ ] 暗色模式支持

### 🔨 技术改进

- [ ] 添加单元测试（Jest + React Testing Library）
- [ ] 添加 E2E 测试（Playwright）
- [ ] 性能优化（虚拟滚动、防抖保存）
- [ ] 离线支持（Service Worker）
- [ ] 国际化框架集成（i18n）

---

## 版本说明

- **主版本号**：重大变更，可能不向后兼容
- **次版本号**：新功能添加，向后兼容
- **修订号**：Bug 修复和小改进

---

## 如何贡献

如果你有新功能建议或发现 Bug，欢迎：

1. 查看 [Issues](../../issues) 是否已有相关讨论
2. 阅读 [贡献指南](CONTRIBUTING.md)
3. 提交 Pull Request

---

**感谢所有贡献者！** 🙏
