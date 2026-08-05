export const DEFAULT_RESUME_FONT_SIZE_PT = 16;
export const DEFAULT_RESUME_SECTION_TITLE_FONT_SIZE_PX = 20;
export const DEFAULT_RESUME_ITEM_TITLE_FONT_SIZE_PX = 16;
export const DEFAULT_RESUME_PAGE_MARGIN_MM = 32;
export const DEFAULT_RESUME_PARAGRAPH_SPACING_PX = 12;
export const DEFAULT_RESUME_FONT_FAMILY = "system";
export const DEFAULT_RESUME_ACCENT_COLOR = "#2563eb";
export const DEFAULT_RESUME_LINE_HEIGHT = 1.5;
export const MIN_RESUME_LINE_HEIGHT = 1;
export const MAX_RESUME_LINE_HEIGHT = 2;
export const RESUME_LINE_HEIGHT_STEP = 0.05;
export const DEFAULT_RESUME_SECTION_SPACING = 21;
const CSS_PX_PER_MM = 96 / 25.4;
export const RESUME_ACCENT_COLOR_PRESETS = [
	"#2563eb",
	"#0891b2",
	"#0f766e",
	"#16a34a",
	"#ca8a04",
	"#ea580c",
	"#dc2626",
	"#be185d",
	"#7c3aed",
	"#334155",
];

const RESUME_ACCENT_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function normalizeResumeAccentColor(
	value: unknown,
	fallback = DEFAULT_RESUME_ACCENT_COLOR,
): string {
	return typeof value === "string" && RESUME_ACCENT_COLOR_PATTERN.test(value)
		? value.toLowerCase()
		: fallback;
}

export function getResumeAccentCssVariables(
	value: unknown,
): Record<string, string> {
	const color = normalizeResumeAccentColor(value);

	return {
		"--resume-accent": color,
		"--resume-accent-hover": `color-mix(in srgb, ${color} 82%, black)`,
		"--resume-accent-soft": `color-mix(in srgb, ${color} 9%, white)`,
		"--resume-accent-soft-border": `color-mix(in srgb, ${color} 24%, white)`,
		"--resume-accent-banner": `color-mix(in srgb, ${color} 32%, #111827)`,
		"--resume-accent-banner-text": `color-mix(in srgb, ${color} 42%, white)`,
	};
}

export type SectionDatePosition = "right" | "below";
export type ProjectLinksPosition = "title" | "below";
export type ProjectLinksDisplay = "label" | "url";
export type ProjectTagPosition = "title" | "below";
export type ProjectTagStyle = "badge" | "text";
export type ResumePhotoPosition = "left" | "right";
export type ResumePhotoSizeRatio = 0.85 | 1 | 1.15;
export type ResumeLinkStyle = "text" | "highlighted" | "blue";
export type EntryRolePosition = "middle" | "title" | "bottom";

export interface ResumeSectionPreferences {
	personal: {
		showPhoto: boolean;
		photoPosition: ResumePhotoPosition;
		photoSizeRatio: ResumePhotoSizeRatio;
		linkStyle: ResumeLinkStyle;
		showLinkLabels: boolean;
	};
	experience: {
		showDates: boolean;
		datePosition: SectionDatePosition;
		showRole: boolean;
		rolePosition: EntryRolePosition;
	};
	projects: {
		showDates: boolean;
		datePosition: SectionDatePosition;
		showRole: boolean;
		rolePosition: EntryRolePosition;
		showTags: boolean;
		tagPosition: ProjectTagPosition;
		tagStyle: ProjectTagStyle;
		linksPosition: ProjectLinksPosition;
		linksDisplay: ProjectLinksDisplay;
		showLinkUnderline: boolean;
		showLinkIcons: boolean;
	};
	education: {
		showDates: boolean;
	};
}

export const DEFAULT_SECTION_PREFERENCES: ResumeSectionPreferences = {
	personal: {
		showPhoto: true,
		photoPosition: "right",
		photoSizeRatio: 1,
		linkStyle: "text",
		showLinkLabels: false,
	},
	experience: {
		showDates: true,
		datePosition: "right",
		showRole: true,
		rolePosition: "middle",
	},
	projects: {
		showDates: true,
		datePosition: "right",
		showRole: true,
		rolePosition: "middle",
		showTags: true,
		tagPosition: "below",
		tagStyle: "badge",
		linksPosition: "below",
		linksDisplay: "label",
		showLinkUnderline: false,
		showLinkIcons: true,
	},
	education: {
		showDates: true,
	},
};

export const RESUME_FONT_SIZE_OPTIONS = [
	12,
	13,
	14,
	15,
	16,
	17,
	18,
	19,
	20,
] as const;

export type ResumeFontSizePt = (typeof RESUME_FONT_SIZE_OPTIONS)[number];

export const RESUME_SECTION_TITLE_FONT_SIZE_OPTIONS = [
	16,
	17,
	18,
	19,
	20,
	21,
	22,
	23,
	24,
] as const;

export type ResumeSectionTitleFontSizePx =
	(typeof RESUME_SECTION_TITLE_FONT_SIZE_OPTIONS)[number];

export const RESUME_ITEM_TITLE_FONT_SIZE_OPTIONS = [
	14,
	15,
	16,
	17,
	18,
	19,
	20,
] as const;

export type ResumeItemTitleFontSizePx =
	(typeof RESUME_ITEM_TITLE_FONT_SIZE_OPTIONS)[number];

export const RESUME_PAGE_MARGIN_OPTIONS = [
	16,
	20,
	24,
	28,
	32,
	36,
	40,
	48,
	56,
	64,
] as const;

export type ResumePageMarginMm = (typeof RESUME_PAGE_MARGIN_OPTIONS)[number];

export type ResumeLineHeight = number;

export const RESUME_SECTION_SPACING_OPTIONS = [
	8,
	10,
	12,
	14,
	16,
	18,
	20,
	21,
	22,
	24,
	28,
	32,
	36,
	40,
] as const;

export type ResumeSectionSpacing = number;

export const RESUME_PARAGRAPH_SPACING_OPTIONS = [
	4,
	6,
	8,
	10,
	12,
	14,
	16,
	18,
	20,
	24,
] as const;

export type ResumeParagraphSpacingPx =
	(typeof RESUME_PARAGRAPH_SPACING_OPTIONS)[number];

export type ResumeFontFamily =
	| "system"
	| "songti"
	| "yahei"
	| "pingfang"
	| "noto-sans"
	| "noto-serif"
	| "arial"
	| "times";

export const RESUME_FONT_FAMILY_OPTIONS: {
	value: ResumeFontFamily;
	label: string;
	cssValue: string;
}[] = [
	{ value: "system", label: "系统默认", cssValue: "" },
	{ value: "pingfang", label: "苹方", cssValue: '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif' },
	{ value: "yahei", label: "微软雅黑", cssValue: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif' },
	{ value: "songti", label: "宋体", cssValue: "SimSun, STSong, Songti SC, serif" },
	{ value: "noto-sans", label: "思源黑体", cssValue: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
	{ value: "noto-serif", label: "思源宋体", cssValue: '"Noto Serif SC", "Source Han Serif SC", serif' },
	{ value: "arial", label: "Arial", cssValue: "Arial, Helvetica, sans-serif" },
	{ value: "times", label: "Times New Roman", cssValue: '"Times New Roman", Times, serif' },
];

export function isResumeFontFamily(
	value: unknown,
): value is ResumeFontFamily {
	return (
		typeof value === "string" &&
		RESUME_FONT_FAMILY_OPTIONS.some((opt) => opt.value === value)
	);
}

export function normalizeResumeFontFamily(
	value: unknown,
): ResumeFontFamily {
	return isResumeFontFamily(value) ? value : DEFAULT_RESUME_FONT_FAMILY;
}

export function getResumeFontFamilyCss(value: ResumeFontFamily): string {
	const option = RESUME_FONT_FAMILY_OPTIONS.find((opt) => opt.value === value);
	return option?.cssValue ?? "";
}

const normalizeNumericOption = <T extends number>(
	value: unknown,
	options: readonly T[],
	fallback: T,
): T => {
	const numericValue =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: fallback;
	const roundedValue = Math.round(numericValue);
	const min = options[0];
	const max = options[options.length - 1];
	const clampedValue = Math.min(Math.max(roundedValue, min), max);

	return options.includes(clampedValue as T)
		? (clampedValue as T)
		: fallback;
};

export const resumePageMarginPxToMm = (value: ResumePageMarginMm) =>
	value / CSS_PX_PER_MM;

export function isResumeFontSizePt(value: number): value is ResumeFontSizePt {
	return RESUME_FONT_SIZE_OPTIONS.some((option) => option === value);
}

export function normalizeResumeFontSize(value: unknown): ResumeFontSizePt {
	return normalizeNumericOption(
		value,
		RESUME_FONT_SIZE_OPTIONS,
		DEFAULT_RESUME_FONT_SIZE_PT,
	);
}

export function normalizeResumeSectionTitleFontSize(
	value: unknown,
): ResumeSectionTitleFontSizePx {
	return normalizeNumericOption(
		value,
		RESUME_SECTION_TITLE_FONT_SIZE_OPTIONS,
		DEFAULT_RESUME_SECTION_TITLE_FONT_SIZE_PX,
	);
}

export function normalizeResumeItemTitleFontSize(
	value: unknown,
): ResumeItemTitleFontSizePx {
	return normalizeNumericOption(
		value,
		RESUME_ITEM_TITLE_FONT_SIZE_OPTIONS,
		DEFAULT_RESUME_ITEM_TITLE_FONT_SIZE_PX,
	);
}

export function isResumePageMarginMm(
	value: number,
): value is ResumePageMarginMm {
	return RESUME_PAGE_MARGIN_OPTIONS.some((option) => option === value);
}

export function normalizeResumePageMargin(
	value: unknown,
): ResumePageMarginMm {
	return normalizeNumericOption(
		value,
		RESUME_PAGE_MARGIN_OPTIONS,
		DEFAULT_RESUME_PAGE_MARGIN_MM,
	);
}

export function normalizeResumeLineHeight(value: unknown): ResumeLineHeight {
	const numericValue =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: DEFAULT_RESUME_LINE_HEIGHT;

	if (!Number.isFinite(numericValue)) return DEFAULT_RESUME_LINE_HEIGHT;

	const clampedValue = Math.min(
		Math.max(numericValue, MIN_RESUME_LINE_HEIGHT),
		MAX_RESUME_LINE_HEIGHT,
	);

	return Number(clampedValue.toFixed(2));
}

export function normalizeResumeSectionSpacing(
	value: unknown,
): ResumeSectionSpacing {
	const numericValue =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: DEFAULT_RESUME_SECTION_SPACING;
	const min = RESUME_SECTION_SPACING_OPTIONS[0];
	const max =
		RESUME_SECTION_SPACING_OPTIONS[RESUME_SECTION_SPACING_OPTIONS.length - 1];

	return Number.isFinite(numericValue)
		? Math.min(Math.max(Math.round(numericValue), min), max)
		: DEFAULT_RESUME_SECTION_SPACING;
}

export function normalizeResumeParagraphSpacing(
	value: unknown,
): ResumeParagraphSpacingPx {
	return normalizeNumericOption(
		value,
		RESUME_PARAGRAPH_SPACING_OPTIONS,
		DEFAULT_RESUME_PARAGRAPH_SPACING_PX,
	);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readBoolean = (value: unknown, fallback: boolean) =>
	typeof value === "boolean" ? value : fallback;

export function normalizeSectionDatePosition(
	value: unknown,
	fallback: SectionDatePosition = "right",
): SectionDatePosition {
	return value === "right" || value === "below" ? value : fallback;
}

export function normalizeProjectLinksPosition(
	value: unknown,
	fallback: ProjectLinksPosition = "below",
): ProjectLinksPosition {
	return value === "title" || value === "below" ? value : fallback;
}

export function normalizeProjectLinksDisplay(
	value: unknown,
	fallback: ProjectLinksDisplay = "label",
): ProjectLinksDisplay {
	return value === "label" || value === "url" ? value : fallback;
}

export function normalizeProjectTagPosition(
	value: unknown,
	fallback: ProjectTagPosition = "below",
): ProjectTagPosition {
	return value === "title" || value === "below" ? value : fallback;
}

export function normalizeEntryRolePosition(
	value: unknown,
	fallback: EntryRolePosition = "middle",
): EntryRolePosition {
	if (value === "right") return "title";
	return value === "middle" || value === "title" || value === "bottom"
		? value
		: fallback;
}

export function normalizeProjectTagStyle(
	value: unknown,
	fallback: ProjectTagStyle = "badge",
): ProjectTagStyle {
	return value === "badge" || value === "text" ? value : fallback;
}

export function normalizeResumePhotoPosition(
	value: unknown,
	fallback: ResumePhotoPosition = "right",
): ResumePhotoPosition {
	return value === "left" || value === "right" ? value : fallback;
}

export function normalizeResumePhotoSizeRatio(
	value: unknown,
	fallback: ResumePhotoSizeRatio = 1,
): ResumePhotoSizeRatio {
	const numericValue =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: fallback;

	return numericValue === 0.85 || numericValue === 1 || numericValue === 1.15
		? numericValue
		: fallback;
}

export function normalizeResumeLinkStyle(
	value: unknown,
	fallback: ResumeLinkStyle = "text",
): ResumeLinkStyle {
	return value === "text" || value === "highlighted" || value === "blue"
		? value
		: fallback;
}

export function normalizeResumeSectionPreferences(
	value: unknown,
	fallback: ResumeSectionPreferences = DEFAULT_SECTION_PREFERENCES,
): ResumeSectionPreferences {
	const raw = isRecord(value) ? value : {};
	const personal = isRecord(raw.personal) ? raw.personal : {};
	const experience = isRecord(raw.experience) ? raw.experience : {};
	const projects = isRecord(raw.projects) ? raw.projects : {};
	const education = isRecord(raw.education) ? raw.education : {};
	const fallbackPersonal =
		fallback.personal ?? DEFAULT_SECTION_PREFERENCES.personal;
	const fallbackProjects =
		fallback.projects ?? DEFAULT_SECTION_PREFERENCES.projects;

	return {
		personal: {
			showPhoto: readBoolean(
				personal.showPhoto,
				fallbackPersonal.showPhoto,
			),
			photoPosition: normalizeResumePhotoPosition(
				personal.photoPosition,
				fallbackPersonal.photoPosition,
			),
			photoSizeRatio: normalizeResumePhotoSizeRatio(
				personal.photoSizeRatio,
				fallbackPersonal.photoSizeRatio,
			),
			linkStyle: normalizeResumeLinkStyle(
				personal.linkStyle,
				fallbackPersonal.linkStyle ??
					DEFAULT_SECTION_PREFERENCES.personal.linkStyle,
			),
			showLinkLabels: readBoolean(
				personal.showLinkLabels,
				fallbackPersonal.showLinkLabels ??
					DEFAULT_SECTION_PREFERENCES.personal.showLinkLabels,
			),
		},
		experience: {
			showDates: readBoolean(
				experience.showDates,
				fallback.experience.showDates,
			),
			datePosition: normalizeSectionDatePosition(
				experience.datePosition,
				fallback.experience.datePosition,
			),
			showRole: readBoolean(experience.showRole, fallback.experience.showRole),
			rolePosition: normalizeEntryRolePosition(
				experience.rolePosition,
				fallback.experience.rolePosition,
			),
		},
		projects: {
			showDates: readBoolean(projects.showDates, fallbackProjects.showDates),
			datePosition: normalizeSectionDatePosition(
				projects.datePosition,
				fallbackProjects.datePosition,
			),
			showRole: readBoolean(projects.showRole, fallbackProjects.showRole),
			rolePosition: normalizeEntryRolePosition(
				projects.rolePosition,
				fallbackProjects.rolePosition,
			),
			showTags: readBoolean(projects.showTags, fallbackProjects.showTags),
			tagPosition: normalizeProjectTagPosition(
				projects.tagPosition,
				fallbackProjects.tagPosition,
			),
			tagStyle: normalizeProjectTagStyle(
				projects.tagStyle,
				fallbackProjects.tagStyle,
			),
			linksPosition: normalizeProjectLinksPosition(
				projects.linksPosition,
				fallbackProjects.linksPosition,
			),
			linksDisplay: normalizeProjectLinksDisplay(
				projects.linksDisplay,
				fallbackProjects.linksDisplay,
			),
			showLinkUnderline: readBoolean(
				projects.showLinkUnderline,
				fallbackProjects.showLinkUnderline,
			),
			showLinkIcons: readBoolean(
				projects.showLinkIcons,
				fallbackProjects.showLinkIcons,
			),
		},
		education: {
			showDates: readBoolean(education.showDates, fallback.education.showDates),
		},
	};
}

export function getAdjacentResumeFontSize(
	value: ResumeFontSizePt,
	direction: "smaller" | "larger",
): ResumeFontSizePt {
	const index = RESUME_FONT_SIZE_OPTIONS.indexOf(value);
	const nextIndex = direction === "smaller" ? index - 1 : index + 1;
	const clampedIndex = Math.min(
		Math.max(nextIndex, 0),
		RESUME_FONT_SIZE_OPTIONS.length - 1,
	);

	return RESUME_FONT_SIZE_OPTIONS[clampedIndex];
}

export function getAdjacentResumePageMargin(
	value: ResumePageMarginMm,
	direction: "smaller" | "larger",
): ResumePageMarginMm {
	const index = RESUME_PAGE_MARGIN_OPTIONS.indexOf(value);
	const nextIndex = direction === "smaller" ? index - 1 : index + 1;
	const clampedIndex = Math.min(
		Math.max(nextIndex, 0),
		RESUME_PAGE_MARGIN_OPTIONS.length - 1,
	);

	return RESUME_PAGE_MARGIN_OPTIONS[clampedIndex];
}
