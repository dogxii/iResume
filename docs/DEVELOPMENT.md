# 开发文档

本文档面向希望参与项目开发或深入了解项目架构的开发者。

## 📋 目录

- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [核心概念](#核心概念)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [性能优化](#性能优化)
- [常见问题](#常见问题)

## 🏗️ 技术架构

### 技术栈

- **前端框架**: React 19
- **类型系统**: TypeScript 5.9
- **构建工具**: Vite 7 (Rolldown)
- **样式方案**: Tailwind CSS 4
- **图标库**: Lucide React
- **代码检查**: ESLint 9 + TypeScript ESLint

### 架构设计

```
用户界面层 (UI Layer)
    ↓
组件层 (Component Layer)
    ↓
状态管理层 (State Management)
    ↓
数据持久化层 (LocalStorage)
```

## 📂 项目结构

```
resume/
├── .github/                    # GitHub 配置
│   └── workflows/
│       └── ci.yml             # CI/CD 配置
├── docs/                       # 文档
│   └── DEVELOPMENT.md         # 开发文档
├── public/                     # 静态资源
│   └── vite.svg               # Favicon
├── src/
│   ├── components/            # React 组件
│   │   ├── ResumeEditor.tsx  # 编辑器组件
│   │   └── ResumePreview.tsx # 预览组件
│   ├── data/                  # 数据文件
│   │   └── initialData.ts    # 初始化数据
│   ├── types/                 # TypeScript 类型
│   │   └── resume.ts         # 数据类型定义
│   ├── App.tsx               # 主应用
│   ├── main.tsx              # 应用入口
│   └── index.css             # 全局样式
├── .editorconfig              # 编辑器配置
├── .gitignore                 # Git 忽略文件
├── .prettierrc                # Prettier 配置
├── CONTRIBUTING.md            # 贡献指南
├── LICENSE                    # 开源协议
├── README.md                  # 项目说明
├── eslint.config.js           # ESLint 配置
├── index.html                 # HTML 模版
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript 配置
└── vite.config.ts             # Vite 配置
```

## 🧩 核心概念

### 1. 数据结构

所有简历数据都遵循 `ResumeData` 类型定义（见 `src/types/resume.ts`）：

```typescript
interface ResumeData {
  personal: PersonalInfo      // 个人信息
  skills: Skills              // 技能栈
  experience: Experience[]    // 工作经历（数组）
  projects: Project[]         // 项目经历（数组）
  education: Education        // 教育背景
}
```

### 2. 状态管理

采用 React Hooks 进行状态管理：

- **useState**: 管理简历数据
- **useEffect**: 处理 LocalStorage 同步
- **lazy initialization**: 避免重复读取 LocalStorage

```typescript
// 使用惰性初始化避免每次渲染都读取 LocalStorage
const [resumeData, setResumeData] = useState<ResumeData>(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : initialResumeState
})
```

### 3. 数据持久化

使用浏览器 LocalStorage 实现自动保存：

- **存储时机**: 每次 `resumeData` 变化时自动保存
- **读取时机**: 组件初始化时（通过 lazy initialization）
- **存储格式**: JSON 字符串

### 4. 打印样式

通过 CSS `@media print` 实现打印优化：

```css
@media print {
  .print\:hidden {
    display: none !important;
  }
  /* 其他打印专用样式 */
}
```

## 🔧 开发流程

### 环境准备

```bash
# 克隆仓库
git clone https://github.com/yourusername/react-resume-builder.git
cd react-resume-builder

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 开发调试

```bash
# 实时开发（支持热更新）
npm run dev

# 类型检查
npx tsc --noEmit

# 代码检查
npm run lint

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 添加新功能

#### 示例：添加"技能评级"功能

1. **更新类型定义** (`src/types/resume.ts`)

```typescript
export interface Skills {
  core: string
  react: string
  engineering: string
  style: string
  rating?: number  // 新增评级字段
}
```

2. **更新初始数据** (`src/data/initialData.ts`)

```typescript
skills: {
  // ...existing fields
  rating: 5
}
```

3. **更新编辑器** (`src/components/ResumeEditor.tsx`)

```typescript
<InputGroup
  label='技能评级 (1-5)'
  type='number'
  value={data.skills.rating?.toString() || '5'}
  onChange={(v) => updateSkills('rating', parseInt(v))}
/>
```

4. **更新预览** (`src/components/ResumePreview.tsx`)

```typescript
{data.skills.rating && (
  <div>评级: {'⭐'.repeat(data.skills.rating)}</div>
)}
```

## 📏 代码规范

### TypeScript

- ✅ 使用 `interface` 定义对象类型
- ✅ 使用 `type` 定义联合类型或交叉类型
- ✅ 为所有函数参数和返回值添加类型
- ❌ 避免使用 `any`，使用 `unknown` 替代
- ❌ 避免使用类型断言（除非必要）

### React

```typescript
// ✅ 推荐：函数组件 + TypeScript
interface Props {
  data: ResumeData
  onChange: (data: ResumeData) => void
}

const Component = ({ data, onChange }: Props) => {
  return <div>{/* ... */}</div>
}

// ❌ 不推荐：类组件
class Component extends React.Component { }
```

### 样式

```tsx
// ✅ 推荐：使用 Tailwind 工具类
<div className='flex items-center gap-2 p-4 bg-white rounded-lg'>

// ❌ 不推荐：内联样式
<div style={{ display: 'flex', padding: '16px' }}>
```

### 命名规范

```typescript
// 组件名 - PascalCase
const ResumeEditor = () => {}

// 函数/变量 - camelCase
const handleSubmit = () => {}
const userData = {}

// 常量 - UPPER_SNAKE_CASE
const STORAGE_KEY = 'resume-data'

// 类型/接口 - PascalCase
interface ResumeData {}
type UserRole = 'admin' | 'user'
```

## ⚡ 性能优化

### 已实现的优化

1. **Lazy Initialization**
   - 避免每次渲染都读取 LocalStorage
   - 仅在组件挂载时读取一次

2. **Vite + Rolldown**
   - 快速的冷启动和热更新
   - 优化的生产构建

3. **按需渲染**
   - 仅在数据变化时重新渲染

### 可能的优化方向

1. **防抖保存**
   ```typescript
   // 避免频繁写入 LocalStorage
   const debouncedSave = useMemo(
     () => debounce((data) => {
       localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
     }, 500),
     []
   )
   ```

2. **虚拟滚动**
   - 当工作经历/项目过多时使用虚拟列表

3. **代码分割**
   - 使用 React.lazy 分割编辑器和预览组件

## 🐛 常见问题

### Q: 修改代码后页面没有更新？

A: 检查是否启动了开发服务器 (`npm run dev`)，Vite 支持 HMR。

### Q: TypeScript 报错但代码能运行？

A: 运行 `npx tsc --noEmit` 查看详细错误，不要忽略类型错误。

### Q: 如何清除本地缓存的简历数据？

A: 在浏览器控制台执行：
```javascript
localStorage.removeItem('resume-data')
location.reload()
```

### Q: 打印时样式丢失？

A: 确保在 `index.css` 中的 `@media print` 样式已生效，检查是否有冲突的 CSS。

### Q: 如何调试 LocalStorage？

A: 
1. 打开浏览器开发者工具
2. 进入 Application > Local Storage
3. 查看 `resume-data` 键值

## 📚 参考资料

- [React 官方文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Vite 指南](https://vitejs.dev/guide/)
- [MDN Web Docs - LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

## 🤝 获取帮助

如果遇到问题：

1. 查看 [Issues](../../issues) 是否有类似问题
2. 阅读 [CONTRIBUTING.md](../CONTRIBUTING.md)
3. 创建新的 Issue 并详细描述问题

---

Happy Coding! 🚀
