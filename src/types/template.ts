// 模板 ID
export type TemplateId =
	| "classic"
	| "minimal"
	| "outline"
	| "ats"
	| "structured"
	| "timeline"
	| "focus"
	| "executive"
	| "fresh"
	| "elegant"
	| "rose";

// 模板使用的颜色类配置，强调色由简历外观单独提供
export interface TemplateColors {
	// 主色调（用于强调元素）
	primary: string;
	// 主色调悬停
	primaryHover: string;
	// 主色调浅背景
	primaryLight: string;
	// 主色调边框
	primaryBorder: string;
	// 标题文字色
	heading: string;
	// 正文文字色
	body: string;
	// 次要文字色
	muted: string;
	// 链接色
	link: string;
	// 分割线色
	divider: string;
	// 标签背景
	tagBg: string;
	// 标签文字
	tagText: string;
	// 标签边框
	tagBorder: string;
}

// 模板头部布局
export type HeaderLayout = "split" | "centered" | "banner" | "accent";

// 区块标题样式
export type SectionHeaderStyle =
	| "underline" // 底部细线
	| "left-border" // 左侧粗线
	| "pill" // 背景色块
	| "minimal" // 极简文字
	| "dotted" // 点线下划
	| "double-line"; // 双线装饰

// 联系方式样式
export type ContactStyle =
	| "icons-right" // 右侧带图标（默认）
	| "inline-dots" // 单行点号分隔
	| "inline-bar" // 单行竖线分隔
	| "centered-icons"; // 居中带图标

// 字体风格
export type FontStyle =
	| "sans" // 无衬线（默认）
	| "serif"; // 衬线字体

// 内容密度
export type ContentDensity =
	| "standard" // 默认节奏
	| "compact" // 一页优先
	| "airy"; // 更舒展

// 技能区布局
export type SkillLayout =
	| "rows" // 左 label + 右内容（默认）
	| "inline" // 紧凑行内
	| "columns" // 双列信息组
	| "chips"; // 技能标签

// 经历/项目条目风格
export type EntryStyle =
	| "plain" // 默认
	| "compact" // 信息更密
	| "timeline"; // 左侧时间线

// 项目区风格
export type ProjectStyle =
	| "plain" // 默认
	| "compact" // 一页优先
	| "boxed" // 轻边框强调
	| "timeline"; // 左侧时间线

// 标签风格
export type TagStyle =
	| "soft" // 默认浅底色
	| "outline" // 线框
	| "plain"; // 文字样式

// 模板配置
export interface TemplateConfig {
	id: TemplateId;
	name: string;
	nameEn: string;
	description: string;
	// 颜色
	colors: TemplateColors;
	// 头部布局
	headerLayout: HeaderLayout;
	// 区块标题样式
	sectionHeaderStyle: SectionHeaderStyle;
	// 联系方式样式
	contactStyle: ContactStyle;
	// 头部是否显示底部分割线
	headerDivider: boolean;
	// 链接区域是否显示图标
	showLinkIcons: boolean;
	// 联系信息是否显示图标
	showContactIcons: boolean;
	// 字体风格（可选，默认 sans）
	fontStyle?: FontStyle;
	// 内容密度（可选，默认 standard）
	contentDensity?: ContentDensity;
	// 技能区布局（可选，默认 rows）
	skillLayout?: SkillLayout;
	// 工作经历条目布局（可选，默认 plain）
	experienceStyle?: EntryStyle;
	// 项目条目布局（可选，默认 plain）
	projectStyle?: ProjectStyle;
	// 项目标签样式（可选，默认 soft）
	tagStyle?: TagStyle;
	// banner 布局背景色（Tailwind 类，默认 bg-slate-800）
	bannerBg?: string;
	// banner 布局强调色，用于职位标题文字和链接悬停（Tailwind 类，默认 text-amber-400）
	bannerAccent?: string;
}
