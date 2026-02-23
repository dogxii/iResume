import type { ResumeData } from "../types/resume";

export const initialResumeState: ResumeData = {
	personal: {
		name: "林小明",
		title: "高级前端开发工程师",
		phone: "138-1234-5678",
		email: "linxiaoming@email.com",
		location: "广东 深圳",
		github: "github.com/linxiaoming",
		website: "linxiaoming.dev",
	},
	sectionOrder: ["skills", "experience", "projects", "education", "other"],
	sectionTitles: {
		skills: "专业技能",
		experience: "工作经历",
		projects: "项目经验 & 开源贡献",
		education: "教育背景",
		other: "其他补充",
	},
	skills: [
		{
			id: 1,
			label: "核心基础",
			content:
				"扎实的 JavaScript (ES6+) / TypeScript 基础，熟练掌握 HTML5、CSS3 及响应式布局",
		},
		{
			id: 2,
			label: "框架生态",
			content:
				"深入理解 React 18 核心原理，熟练使用 Next.js、Zustand、React Query 等生态工具",
		},
		{
			id: 3,
			label: "前端工程化",
			content:
				"熟练配置 Vite、Webpack，具备脚手架开发能力；熟悉 CI/CD 流程、Docker 及 Nginx 部署",
		},
		{
			id: 4,
			label: "性能与规范",
			content:
				"精通 Web Vitals 性能调优，熟练使用 Lighthouse；推行 ESLint、Prettier、Husky 规范团队代码",
		},
	],
	experience: [
		{
			id: 1,
			company: "某知名互联网科技公司",
			role: "高级前端开发工程师",
			date: "2021.06 - 至今",
			details:
				"架构升级与性能优化：主导核心业务线从 Webpack 到 Vite 的平滑迁移，冷启动速度提升 80%，HMR 响应时间缩短至毫秒级，显著提升团队开发体验。\n基础设施建设：设计并落地基于 Headless UI 的企业级 React 组件库，服务于内部 10+ 个中后台系统，复用率达 70%，提升团队 30% 开发效率。\n质量保障与监控：建立前端监控与异常上报机制，结合 Sentry 降低线上故障排查时间；引入 Jest + RTL 单元测试，核心业务逻辑覆盖率达 85% 以上。",
		},
		{
			id: 2,
			company: "某高成长型创业公司",
			role: "前端开发工程师",
			date: "2018.07 - 2021.05",
			details:
				"低代码表单引擎：负责低代码平台核心模块研发，基于 React Hook Form 与 JSON Schema 实现动态表单渲染引擎，支持 50+ 种复杂控件与联动逻辑。\n复杂数据可视化：主导数据可视化大屏项目，使用 ECharts 与 WebGL 渲染百万级节点数据，通过 Web Worker 与时间分片技术解决主线程阻塞问题，保持 60fps 流畅度。\n跨端开发：使用 Taro 参与开发公司核心业务小程序，实现一套代码多端运行，降低 40% 的维护成本。",
		},
	],
	projects: [
		{
			id: 1,
			name: "企业级全栈后台管理系统 (个人开源)",
			tags: "Next.js 14, TypeScript, Tailwind CSS, Prisma",
			link: "admin-demo.com",
			source: "github.com/linxiaoming/admin",
			description:
				"采用 Next.js App Router 与 Server Actions 重构传统 SPA，首屏加载速度 (FCP) 提升 40%，SEO 表现显著提升。\n集成 RBAC 权限管理与多租户架构，使用 Zustand 进行全局状态管理，封装高阶组件实现细粒度（按钮级）权限控制。\n严格遵循 WAI-ARIA 无障碍标准，Lighthouse 性能、可访问性、最佳实践评分均达到 95+。",
		},
		{
			id: 2,
			name: "轻量级响应式状态管理库",
			tags: "TypeScript, Rollup, Proxy",
			link: "npmjs.com/package/mini-store",
			source: "github.com/linxiaoming/mini-store",
			description:
				"从零实现一个基于 Proxy 的响应式状态管理库，核心代码仅 2KB，支持 React/Vue 多框架无缝接入。\n设计并实现了依赖收集与派发更新机制，避免不必要的组件重渲染，性能优于传统 Context API。\n配置完善的 CI/CD 自动化发布流程，单元测试覆盖率达 95%，在 GitHub 获得 500+ Stars。",
		},
	],
	education: [
		{
			id: 1,
			school: "某某大学",
			degree: "计算机科学与技术 (本科)",
			date: "2014.09 - 2018.06",
		},
	],
	other:
		"**开源贡献**：为 Ant Design、Vite 等知名开源项目提交过多个 PR 并被合并。\n**技术博客**：长期维护个人技术博客，分享前端工程化、性能优化等深度文章，累计阅读量 10w+。\n**英语能力**：CET-6，能流畅阅读英文技术文档并参与英文社区交流。\n**持续学习**：对新技术保持极高热情，目前正在深入学习 Rust 与 WebAssembly 在前端领域的应用。",
};
