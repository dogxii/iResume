import { createSectionIconVisibility } from "./resumeData";
import type { SectionIconVisibility } from "../types/resume";
import type { TemplateColors, TemplateConfig, TemplateId } from "../types/template";

const accentColors: Pick<
	TemplateColors,
	| "primary"
	| "primaryHover"
	| "primaryLight"
	| "primaryBorder"
	| "link"
	| "tagBg"
	| "tagText"
	| "tagBorder"
> = {
	primary: "resume-accent-text",
	primaryHover: "resume-accent-hover",
	primaryLight: "resume-accent-soft-bg",
	primaryBorder: "resume-accent-border",
	link: "resume-accent-text",
	tagBg: "resume-accent-soft-bg",
	tagText: "resume-accent-text",
	tagBorder: "resume-accent-soft-border",
};

const createTemplateColors = (
	colors: Pick<TemplateColors, "heading" | "body" | "muted" | "divider">,
): TemplateColors => ({ ...accentColors, ...colors });

// ─── 经典布局（默认） ─────────────────────────────────
const classic: TemplateConfig = {
	id: "classic",
	name: "经典布局",
	nameEn: "Classic",
	description: "左右分栏与清晰下划线，适合大多数求职场景",
	colors: createTemplateColors({
		heading: "text-slate-900",
		body: "text-slate-700",
		muted: "text-slate-500",
		divider: "border-slate-200",
	}),
	headerLayout: "split",
	sectionHeaderStyle: "underline",
	contactStyle: "icons-right",
	headerDivider: true,
	showLinkIcons: true,
	showContactIcons: true,
};

// ─── 居中极简 ─────────────────────────────────────────
const minimal: TemplateConfig = {
	id: "minimal",
	name: "居中极简",
	nameEn: "Minimal",
	description: "居中页眉与紧凑信息流，让内容本身说话",
	colors: createTemplateColors({
		heading: "text-zinc-900",
		body: "text-zinc-700",
		muted: "text-zinc-400",
		divider: "border-zinc-200",
	}),
	headerLayout: "centered",
	sectionHeaderStyle: "minimal",
	contactStyle: "centered-icons",
	headerDivider: false,
	showLinkIcons: true,
	showContactIcons: true,
	contentDensity: "compact",
	skillLayout: "inline",
	experienceStyle: "compact",
	projectStyle: "compact",
	tagStyle: "plain",
};

// ─── 线框极简 ─────────────────────────────────────────
const outline: TemplateConfig = {
	id: "outline",
	name: "线框分栏",
	nameEn: "Outline",
	description: "线性小图标与双列信息组，层级直观",
	colors: createTemplateColors({
		heading: "text-zinc-900",
		body: "text-zinc-700",
		muted: "text-zinc-500",
		divider: "border-zinc-200",
	}),
	headerLayout: "split",
	sectionHeaderStyle: "minimal",
	contactStyle: "inline-dots",
	headerDivider: true,
	showLinkIcons: false,
	showContactIcons: false,
	contentDensity: "compact",
	skillLayout: "columns",
	experienceStyle: "plain",
	projectStyle: "boxed",
	tagStyle: "outline",
};

// ─── ATS 清晰 ────────────────────────────────────────
const ats: TemplateConfig = {
	id: "ats",
	name: "ATS 单栏",
	nameEn: "ATS",
	description: "单栏高可读，少装饰，适合投递系统与通用岗位",
	colors: createTemplateColors({
		heading: "text-gray-950",
		body: "text-gray-700",
		muted: "text-gray-500",
		divider: "border-gray-300",
	}),
	headerLayout: "split",
	sectionHeaderStyle: "underline",
	contactStyle: "inline-dots",
	headerDivider: true,
	showLinkIcons: false,
	showContactIcons: false,
	contentDensity: "compact",
	skillLayout: "inline",
	experienceStyle: "compact",
	projectStyle: "compact",
	tagStyle: "plain",
};

// ─── 规整单栏 ─────────────────────────────────────────
const structured: TemplateConfig = {
	id: "structured",
	name: "规整单栏",
	nameEn: "Structured",
	description: "灰线网格与菱形条目，紧凑清晰，适合校招与技术岗位",
	colors: createTemplateColors({
		heading: "text-neutral-900",
		body: "text-neutral-800",
		muted: "text-neutral-500",
		divider: "border-neutral-300",
	}),
	headerLayout: "split",
	sectionHeaderStyle: "underline",
	contactStyle: "icons-right",
	headerDivider: false,
	showLinkIcons: false,
	showContactIcons: false,
	contentDensity: "compact",
	skillLayout: "inline",
	experienceStyle: "compact",
	projectStyle: "compact",
	tagStyle: "plain",
};

// ─── 时间线 ─────────────────────────────────────────
const timeline: TemplateConfig = {
	id: "timeline",
	name: "时间线",
	nameEn: "Timeline",
	description: "用细线串联经历，适合经历连续、成长路径清晰的候选人",
	colors: createTemplateColors({
		heading: "text-slate-950",
		body: "text-slate-700",
		muted: "text-slate-500",
		divider: "border-slate-200",
	}),
	headerLayout: "accent",
	sectionHeaderStyle: "left-border",
	contactStyle: "inline-bar",
	headerDivider: false,
	showLinkIcons: true,
	showContactIcons: false,
	contentDensity: "standard",
	skillLayout: "columns",
	experienceStyle: "timeline",
	projectStyle: "timeline",
	tagStyle: "outline",
};

// ─── 重点突出 ───────────────────────────────────────
const focus: TemplateConfig = {
	id: "focus",
	name: "重点突出",
	nameEn: "Focus",
	description: "紧凑但有强调块，适合项目成果和关键能力需要被快速看到",
	colors: createTemplateColors({
		heading: "text-slate-950",
		body: "text-slate-700",
		muted: "text-slate-500",
		divider: "border-slate-200",
	}),
	headerLayout: "accent",
	sectionHeaderStyle: "pill",
	contactStyle: "inline-dots",
	headerDivider: false,
	showLinkIcons: false,
	showContactIcons: false,
	contentDensity: "compact",
	skillLayout: "chips",
	experienceStyle: "plain",
	projectStyle: "boxed",
	tagStyle: "soft",
};

// ─── 深色页眉 ─────────────────────────────────────────
const executive: TemplateConfig = {
	id: "executive",
	name: "深色页眉",
	nameEn: "Executive",
	description: "深色横幅页眉与时间线内容，适合资深候选人",
	colors: createTemplateColors({
		heading: "text-slate-900",
		body: "text-slate-700",
		muted: "text-slate-500",
		divider: "border-slate-200",
	}),
	headerLayout: "banner",
	sectionHeaderStyle: "left-border",
	contactStyle: "inline-bar",
	headerDivider: false,
	showLinkIcons: true,
	showContactIcons: true,
	bannerBg: "resume-accent-banner-bg",
	bannerAccent: "resume-accent-banner-text",
	contentDensity: "standard",
	skillLayout: "columns",
	experienceStyle: "timeline",
	projectStyle: "timeline",
	tagStyle: "outline",
};

// ─── 居中卡片 ─────────────────────────────────────────
const fresh: TemplateConfig = {
	id: "fresh",
	name: "居中卡片",
	nameEn: "Fresh",
	description: "居中页眉、胶囊标题与标签技能，适合创意岗位",
	colors: createTemplateColors({
		heading: "text-slate-900",
		body: "text-slate-700",
		muted: "text-slate-500",
		divider: "border-slate-200",
	}),
	headerLayout: "centered",
	sectionHeaderStyle: "pill",
	contactStyle: "centered-icons",
	headerDivider: false,
	showLinkIcons: true,
	showContactIcons: true,
	contentDensity: "airy",
	skillLayout: "chips",
	experienceStyle: "plain",
	projectStyle: "boxed",
	tagStyle: "soft",
};

// ─── 书卷排版 ─────────────────────────────────────────
const elegant: TemplateConfig = {
	id: "elegant",
	name: "书卷排版",
	nameEn: "Elegant",
	description: "舒展留白、点线标题与时间线经历，适合学术文化岗位",
	colors: createTemplateColors({
		heading: "text-stone-800",
		body: "text-stone-600",
		muted: "text-stone-400",
		divider: "border-stone-200",
	}),
	headerLayout: "split",
	sectionHeaderStyle: "dotted",
	contactStyle: "icons-right",
	headerDivider: true,
	showLinkIcons: true,
	showContactIcons: true,
	contentDensity: "airy",
	skillLayout: "rows",
	experienceStyle: "timeline",
	projectStyle: "plain",
	tagStyle: "plain",
};

// ─── 双线雅致 ─────────────────────────────────────────
const rose: TemplateConfig = {
	id: "rose",
	name: "双线雅致",
	nameEn: "Rose",
	description: "衬线字体与双线标题，适合设计、时尚与文化岗位",
	colors: createTemplateColors({
		heading: "text-slate-900",
		body: "text-slate-700",
		muted: "text-slate-400",
		divider: "border-slate-200",
	}),
	headerLayout: "centered",
	sectionHeaderStyle: "double-line",
	contactStyle: "centered-icons",
	headerDivider: false,
	showLinkIcons: true,
	showContactIcons: true,
	fontStyle: "serif",
	contentDensity: "airy",
	skillLayout: "columns",
	experienceStyle: "plain",
	projectStyle: "plain",
	tagStyle: "soft",
};

// ─── 布局配置注册表 ───────────────────────────────────
export const templateConfigs: Record<TemplateId, TemplateConfig> = {
	classic,
	minimal,
	outline,
	ats,
	structured,
	timeline,
	focus,
	executive,
	fresh,
	elegant,
	rose,
};

// 模板 ID 有序列表（用于 UI 遍历）
export const templateIds: TemplateId[] = [
	"classic",
	"minimal",
	"outline",
	"ats",
	"structured",
	"timeline",
	"focus",
	"executive",
	"fresh",
	"elegant",
	"rose",
];

export const isTemplateId = (value: string | null): value is TemplateId =>
	templateIds.includes(value as TemplateId);

export const normalizeTemplateIdList = (value: unknown): TemplateId[] => {
	if (!Array.isArray(value)) return [];

	const seen = new Set<TemplateId>();
	return value.filter((item): item is TemplateId => {
		if (typeof item !== "string" || !isTemplateId(item) || seen.has(item)) {
			return false;
		}
		seen.add(item);
		return true;
	});
};

export const getDefaultSectionIconVisibility = (): SectionIconVisibility =>
	createSectionIconVisibility(false);

// 默认模板
export const DEFAULT_TEMPLATE_ID: TemplateId = "classic";
