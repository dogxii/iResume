# 贡献指南

感谢你对 React Resume Builder 项目的关注！我们欢迎任何形式的贡献。

## 🤝 如何贡献

### 报告 Bug

如果你发现了 Bug，请通过 [GitHub Issues](../../issues) 提交，并包含以下信息：

- 问题的详细描述
- 复现步骤
- 预期行为和实际行为
- 截图（如果适用）
- 浏览器和操作系统信息

### 提出新功能

如果你有新功能的想法：

1. 先在 [GitHub Issues](../../issues) 中搜索是否已有类似建议
2. 如果没有，创建一个新的 Issue，详细描述：
   - 功能的用途和场景
   - 预期的实现方式
   - 可能的替代方案

### 提交代码

1. **Fork 项目**
   ```bash
   # 点击 GitHub 页面右上角的 Fork 按钮
   ```

2. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/react-resume-builder.git
   cd react-resume-builder
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

5. **开发和测试**
   ```bash
   # 启动开发服务器
   npm run dev

   # 运行代码检查
   npm run lint

   # 构建测试
   npm run build
   ```

6. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加了某某功能"
   # 或
   git commit -m "fix: 修复了某某问题"
   ```

   提交信息格式请遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
   - `feat`: 新功能
   - `fix`: Bug 修复
   - `docs`: 文档更新
   - `style`: 代码格式调整（不影响功能）
   - `refactor`: 代码重构
   - `perf`: 性能优化
   - `test`: 测试相关
   - `chore`: 构建/工具链相关

7. **推送到 GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **创建 Pull Request**
   - 在 GitHub 上打开你的 Fork 仓库
   - 点击 "New Pull Request"
   - 填写 PR 描述，说明你做了什么改动
   - 等待 Review

## 📝 代码规范

### TypeScript

- 所有新代码必须使用 TypeScript
- 避免使用 `any` 类型，优先使用具体类型或 `unknown`
- 为组件 Props 定义清晰的接口

### React

- 使用函数组件和 Hooks
- 组件名使用 PascalCase
- 文件名与组件名保持一致

### 样式

- 使用 Tailwind CSS 工具类
- 避免内联样式和 CSS-in-JS
- 保持样式的一致性和可维护性

### 命名规范

- 变量和函数使用 camelCase
- 常量使用 UPPER_SNAKE_CASE
- 类型/接口使用 PascalCase
- 私有变量/函数以下划线开头（可选）

### 文件结构

```
src/
├── components/       # React 组件（每个组件一个文件）
├── data/            # 静态数据和配置
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数（如果需要）
└── hooks/           # 自定义 Hooks（如果需要）
```

## 🧪 测试

目前项目暂未集成自动化测试，但请在提交前手动测试：

- [ ] 编辑功能正常工作
- [ ] 实时预览正确更新
- [ ] LocalStorage 保存和读取正常
- [ ] 打印/导出 PDF 样式正确
- [ ] 响应式布局在不同屏幕尺寸下正常
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 警告

## 🎨 UI/UX 原则

- 保持简洁专业的设计
- 优先考虑可用性而非视觉效果
- 确保 ATS（应聘者跟踪系统）友好
- 打印样式必须完美（这是核心功能）
- 移动端体验良好

## 📄 文档

如果你的改动涉及用户可见的功能：

- 更新 README.md
- 添加必要的注释
- 如果是新功能，考虑添加使用示例

## ❓ 问题和讨论

如果你有任何疑问：

1. 查看 [README.md](README.md) 和现有的 [Issues](../../issues)
2. 在 Issue 中提问
3. 通过 Pull Request 讨论具体的技术细节

## 📜 许可证

通过向本项目提交代码，你同意你的贡献将采用 [MIT License](LICENSE) 开源协议。

---

再次感谢你的贡献！🎉
