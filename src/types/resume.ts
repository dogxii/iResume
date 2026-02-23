// 个人信息
export interface PersonalInfo {
	name: string;
	title: string;
	phone: string;
	email: string;
	location: string;
	github: string;
	website: string;
}

// 技能项（动态，可自定义分类名和内容）
export interface SkillItem {
	id: number;
	label: string;
	content: string;
}

// 工作经历
export interface Experience {
	id: number;
	company: string;
	role: string;
	date: string;
	details: string;
}

// 项目经历
export interface Project {
	id: number;
	name: string;
	tags: string;
	link: string;
	source: string;
	description: string;
}

// 教育背景（支持多条）
export interface Education {
	id: number;
	school: string;
	degree: string;
	date: string;
}

// 各区块自定义标题
export interface SectionTitles {
	skills: string;
	experience: string;
	projects: string;
	education: string;
	other: string;
}

// 区块 key 联合类型（用于自定义排序）
export type SectionKey =
	| "skills"
	| "experience"
	| "projects"
	| "education"
	| "other";

// 简历数据
export interface ResumeData {
	personal: PersonalInfo;
	sectionTitles: SectionTitles;
	// 控制各区块在简历中的显示顺序
	sectionOrder: SectionKey[];
	skills: SkillItem[];
	experience: Experience[];
	projects: Project[];
	education: Education[];
	// 每行一条，支持 **粗体** 和 [文字](url) 语法
	other: string;
}
