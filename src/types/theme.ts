// 主题 ID
export type ThemeId = "classic" | "minimal" | "executive" | "fresh" | "elegant";

// 主题颜色配置
export interface ThemeColors {
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

// 主题头部布局
export type HeaderLayout = "split" | "centered" | "banner";

// 区块标题样式
export type SectionHeaderStyle =
	| "underline" // 底部细线
	| "left-border" // 左侧粗线
	| "pill" // 背景色块
	| "minimal" // 极简文字
	| "dotted"; // 点线下划

// 联系方式样式
export type ContactStyle =
	| "icons-right" // 右侧带图标（默认）
	| "inline-dots" // 单行点号分隔
	| "inline-bar" // 单行竖线分隔
	| "centered-icons"; // 居中带图标

// 主题配置
export interface ThemeConfig {
	id: ThemeId;
	name: string;
	nameEn: string;
	description: string;
	// 预览卡片用的渐变/色块
	previewColors: [string, string];
	// 颜色
	colors: ThemeColors;
	// 头部布局
	headerLayout: HeaderLayout;
	// 区块标题样式
	sectionHeaderStyle: SectionHeaderStyle;
	// 联系方式样式
	contactStyle: ContactStyle;
	// 是否在技能区块使用 grid 标签布局
	skillGrid: boolean;
	// 头部是否显示底部分割线
	headerDivider: boolean;
	// 链接区域是否显示图标
	showLinkIcons: boolean;
	// 联系信息是否显示图标
	showContactIcons: boolean;
}
