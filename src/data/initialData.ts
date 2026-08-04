import type { ResumeData } from "../types/resume";

export const initialResumeState: ResumeData = {
	personal: {
		name: "林小明",
		title: "Web 前端工程师",
		photoUrl: "",
		phone: "138-1234-5678",
		email: "linxiaoming@email.com",
		location: "江西 南昌",
		availability: "5天/周 6个月+",
		github: "github.com/linxiaoming",
		website: "linxiaoming.dev",
	},
	sectionOrder: [
		"education",
		"experience",
		"projects",
		"skills",
		"other",
	],
	sectionVisibility: {
		skills: true,
		experience: true,
		projects: true,
		education: true,
		awards: false,
		campus: false,
		other: true,
	},
	sectionTitles: {
		skills: "专业技能",
		experience: "工作经历",
		projects: "项目经历",
		education: "教育背景",
		awards: "获奖经历",
		campus: "校园经历",
		other: "自我评价",
	},
	skills: [
		{
			id: 1,
			label: "",
			content:
				"- 熟悉 HTML5、CSS3、JavaScript (ES6+) 与 TypeScript，能够独立完成响应式页面开发\n- 熟悉 React、Vue 常用开发模式，了解 Hooks、状态管理、路由和组件化设计\n- 熟悉 HTTP、浏览器渲染、性能优化和前端工程化，日常使用 Vite、Git、ESLint\n- 了解 Node.js、RESTful API 对接和基础后端协作流程，具备问题排查与文档沉淀习惯",
		},
	],
	experience: [
		{
			id: 1,
			company: "某互联网产品研发部",
			role: "前端实习生",
			date: "2022.07 - 2022.09",
			details:
				"- 参与内部运营平台迭代，负责数据列表、表单配置、权限入口等页面开发与联调\n- 基于团队组件规范沉淀筛选、表格和异常态处理逻辑，减少重复实现并提升问题反馈效率",
		},
		{
			id: 2,
			company: "校内创新实践团队",
			role: "前端开发",
			date: "2021.10 - 2022.06",
			details:
				"- 负责活动报名、成员管理和数据看板等模块，完成需求拆解、页面实现和接口对接\n- 维护项目组件与样式规范，协助整理开发文档，降低新成员接入成本",
		},
	],
	projects: [
		{
			id: 1,
			name: "校园信息服务平台",
			role: "前端负责人",
			date: "2022.09 - 2023.06",
			tags: "Vue 3, TypeScript, Vite",
			link: "campus-demo.com",
			source: "github.com/linxiaoming/campus-service",
			description:
				"- 负责前端架构与核心页面开发，实现资讯发布、活动报名、消息通知等主要流程\n- 拆分业务组件和请求层，统一错误处理与权限校验，提升页面复用性和维护效率",
		},
		{
			id: 2,
			name: "在线简历编辑器",
			role: "核心开发者",
			date: "2023.03 - 2023.08",
			tags: "React, Zustand, Tailwind CSS",
			link: "resume-demo.com",
			source: "github.com/linxiaoming/resume-editor",
			description:
				"- 实现结构化简历编辑、实时预览、PDF 导出和 JSON 备份，覆盖简历制作的主要流程\n- 优化预览缩放与打印样式，保证页面在浏览器预览和 PDF 输出中保持一致",
		},
	],
	education: [
		{
			id: 1,
			school: "南昌大学",
			degree: "计算机科学与技术 (学士学位)",
			date: "2019.09 - 2023.06",
		},
	],
	awards: [
		{
			id: 1,
			title: "校级一等奖学金",
			subtitle: "南昌大学",
			date: "2021.12",
			details: "",
		},
	],
	campus: [
		{
			id: 1,
			title: "学生技术协会",
			subtitle: "前端组成员",
			date: "2020.09 - 2022.06",
			details: "- 参与技术分享与项目实践，协助维护社团官网和活动报名页面。",
		},
	],
	other:
		"- 对前端体验和工程质量保持关注，习惯用清晰结构推进需求落地\n- 保持技术学习与复盘，能在团队协作中主动沟通、及时反馈风险",
	customSections: [],
};
