import type { ThemeConfig, ThemeId } from "../types/theme";

// ─── 经典蓝（默认） ───────────────────────────────────
const classic: ThemeConfig = {
	id: "classic",
	name: "经典蓝",
	nameEn: "Classic",
	description: "清晰专业，蓝色点缀，适合大多数求职场景",
	previewColors: ["#2563eb", "#dbeafe"],
	colors: {
		primary: "text-blue-600",
		primaryHover: "hover:text-blue-700",
		primaryLight: "bg-blue-50",
		primaryBorder: "border-blue-600",
		heading: "text-slate-900",
		body: "text-slate-700",
		muted: "text-slate-500",
		link: "text-blue-600",
		divider: "border-slate-200",
		tagBg: "bg-slate-100",
		tagText: "text-slate-600",
		tagBorder: "border-slate-200",
	},
	headerLayout: "split",
	sectionHeaderStyle: "underline",
	contactStyle: "icons-right",
	skillGrid: true,
	headerDivider: true,
	showLinkIcons: true,
	showContactIcons: true,
};

// ─── 极简黑白 ─────────────────────────────────────────
const minimal: ThemeConfig = {
	id: "minimal",
	name: "极简",
	nameEn: "Minimal",
	description: "纯黑白排版，零色彩干扰，让内容本身说话",
	previewColors: ["#18181b", "#f4f4f5"],
	colors: {
		primary: "text-zinc-900",
		primaryHover: "hover:text-zinc-700",
		primaryLight: "bg-zinc-50",
		primaryBorder: "border-zinc-900",
		heading: "text-zinc-900",
		body: "text-zinc-700",
		muted: "text-zinc-400",
		link: "text-zinc-700",
		divider: "border-zinc-200",
		tagBg: "bg-zinc-100",
		tagText: "text-zinc-600",
		tagBorder: "border-zinc-300",
	},
	headerLayout: "centered",
	sectionHeaderStyle: "minimal",
	contactStyle: "centered-icons",
	skillGrid: true,
	headerDivider: false,
	showLinkIcons: true,
	showContactIcons: true,
};

// ─── 商务精英 ─────────────────────────────────────────
const executive: ThemeConfig = {
	id: "executive",
	name: "商务精英",
	nameEn: "Executive",
	description: "深色头部搭配金色点缀，沉稳权威，适合资深候选人",
	previewColors: ["#1e293b", "#d97706"],
	colors: {
		primary: "text-amber-600",
		primaryHover: "hover:text-amber-700",
		primaryLight: "bg-amber-50",
		primaryBorder: "border-amber-600",
		heading: "text-slate-900",
		body: "text-slate-700",
		muted: "text-slate-500",
		link: "text-amber-700",
		divider: "border-slate-200",
		tagBg: "bg-amber-50",
		tagText: "text-amber-800",
		tagBorder: "border-amber-200",
	},
	headerLayout: "banner",
	sectionHeaderStyle: "left-border",
	contactStyle: "inline-bar",
	skillGrid: true,
	headerDivider: false,
	showLinkIcons: true,
	showContactIcons: true,
};

// ─── 清新 ─────────────────────────────────────────────
const fresh: ThemeConfig = {
	id: "fresh",
	name: "清新",
	nameEn: "Fresh",
	description: "青绿色调，轻盈现代，适合互联网与创意行业",
	previewColors: ["#0d9488", "#ccfbf1"],
	colors: {
		primary: "text-teal-600",
		primaryHover: "hover:text-teal-700",
		primaryLight: "bg-teal-50",
		primaryBorder: "border-teal-600",
		heading: "text-slate-900",
		body: "text-slate-700",
		muted: "text-slate-500",
		link: "text-teal-600",
		divider: "border-teal-100",
		tagBg: "bg-teal-50",
		tagText: "text-teal-700",
		tagBorder: "border-teal-200",
	},
	headerLayout: "centered",
	sectionHeaderStyle: "pill",
	contactStyle: "centered-icons",
	skillGrid: true,
	headerDivider: false,
	showLinkIcons: true,
	showContactIcons: true,
};

// ─── 素雅文墨 ─────────────────────────────────────────
const elegant: ThemeConfig = {
	id: "elegant",
	name: "素雅",
	nameEn: "Elegant",
	description: "温暖灰调搭配精致细节，书卷气质，适合学术与文化行业",
	previewColors: ["#57534e", "#f5f5f4"],
	colors: {
		primary: "text-stone-700",
		primaryHover: "hover:text-stone-800",
		primaryLight: "bg-stone-50",
		primaryBorder: "border-stone-400",
		heading: "text-stone-800",
		body: "text-stone-600",
		muted: "text-stone-400",
		link: "text-stone-700",
		divider: "border-stone-200",
		tagBg: "bg-stone-100",
		tagText: "text-stone-600",
		tagBorder: "border-stone-300",
	},
	headerLayout: "split",
	sectionHeaderStyle: "dotted",
	contactStyle: "icons-right",
	skillGrid: true,
	headerDivider: true,
	showLinkIcons: true,
	showContactIcons: true,
};

// ─── 主题注册表 ───────────────────────────────────────
export const themes: Record<ThemeId, ThemeConfig> = {
	classic,
	minimal,
	executive,
	fresh,
	elegant,
};

// 主题 ID 有序列表（用于 UI 遍历）
export const themeIds: ThemeId[] = [
	"classic",
	"minimal",
	"executive",
	"fresh",
	"elegant",
];

// 默认主题
export const DEFAULT_THEME_ID: ThemeId = "classic";
