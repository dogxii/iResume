export const DEFAULT_RESUME_FONT_SIZE_PT = 10.5;
export const DEFAULT_RESUME_PAGE_MARGIN_MM = 12;
export const DEFAULT_RESUME_FONT_FAMILY = "system";

export type SectionDatePosition = "right" | "below";
export type ProjectLinksPosition = "title" | "below";
export type ProjectTagPosition = "title" | "below";
export type SkillContentStyle = "theme" | "text" | "chips";
export type OtherListStyle = "bullets" | "plain";
export type SectionEntryDisplayStyle = "list" | "detail";
export type ResumePhotoPosition = "left" | "right";
export type ResumePhotoSizeRatio = 0.85 | 1 | 1.15;

export interface ResumeSectionPreferences {
	personal: {
		showPhoto: boolean;
		photoPosition: ResumePhotoPosition;
		photoSizeRatio: ResumePhotoSizeRatio;
	};
	skills: {
		showLabels: boolean;
		contentStyle: SkillContentStyle;
	};
	experience: {
		showDates: boolean;
		datePosition: SectionDatePosition;
		showRole: boolean;
	};
	projects: {
		showDates: boolean;
		datePosition: SectionDatePosition;
		showTags: boolean;
		tagPosition: ProjectTagPosition;
		linksPosition: ProjectLinksPosition;
	};
	education: {
		showDates: boolean;
	};
	awards: {
		displayStyle: SectionEntryDisplayStyle;
	};
	campus: {
		displayStyle: SectionEntryDisplayStyle;
	};
	other: {
		listStyle: OtherListStyle;
	};
}

export const DEFAULT_SECTION_PREFERENCES: ResumeSectionPreferences = {
	personal: {
		showPhoto: true,
		photoPosition: "right",
		photoSizeRatio: 1,
	},
	skills: {
		showLabels: true,
		contentStyle: "theme",
	},
	experience: {
		showDates: true,
		datePosition: "right",
		showRole: true,
	},
	projects: {
		showDates: true,
		datePosition: "right",
		showTags: true,
		tagPosition: "below",
		linksPosition: "below",
	},
	education: {
		showDates: true,
	},
	awards: {
		displayStyle: "list",
	},
	campus: {
		displayStyle: "list",
	},
	other: {
		listStyle: "bullets",
	},
};

export const RESUME_FONT_SIZE_OPTIONS = [
	8.5,
	9,
	9.5,
	10,
	10.5,
	11,
	11.5,
	12,
	12.5,
	13,
] as const;

export type ResumeFontSizePt = (typeof RESUME_FONT_SIZE_OPTIONS)[number];

export const RESUME_PAGE_MARGIN_OPTIONS = [8, 10, 12, 14, 16] as const;

export type ResumePageMarginMm = (typeof RESUME_PAGE_MARGIN_OPTIONS)[number];

export type ResumeFontFamily =
	| "system"
	| "songti"
	| "yahei"
	| "kaiti"
	| "heiti"
	| "fangsong"
	| "pingfang"
	| "hiragino"
	| "noto-sans"
	| "noto-serif"
	| "source-han"
	| "liti"
	| "youyuan"
	| "lishu"
	| "arial"
	| "times"
	| "georgia";

export const RESUME_FONT_FAMILY_OPTIONS: {
	value: ResumeFontFamily;
	label: string;
	cssValue: string;
}[] = [
	{ value: "system", label: "系统默认", cssValue: "" },
	{ value: "songti", label: "宋体", cssValue: "SimSun, STSong, Songti SC, serif" },
	{ value: "yahei", label: "微软雅黑", cssValue: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif' },
	{ value: "kaiti", label: "楷体", cssValue: "KaiTi, STKaiti, Kaiti SC, serif" },
	{ value: "heiti", label: "黑体", cssValue: "SimHei, STHeiti, Heiti SC, sans-serif" },
	{ value: "fangsong", label: "仿宋", cssValue: "FangSong, STFangsong, STFangsong, serif" },
	{ value: "pingfang", label: "苹方", cssValue: '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif' },
	{ value: "hiragino", label: "冬青黑体", cssValue: '"Hiragino Sans GB", "Microsoft YaHei", "PingFang SC", sans-serif' },
	{ value: "noto-sans", label: "思源黑体", cssValue: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
	{ value: "noto-serif", label: "思源宋体", cssValue: '"Noto Serif SC", "Source Han Serif SC", serif' },
	{ value: "source-han", label: "source-han-sans", cssValue: '"Source Han Sans SC", "Noto Sans SC", sans-serif' },
	{ value: "liti", label: "隶书", cssValue: "LiSu, STLibian, Libian SC, serif" },
	{ value: "youyuan", label: "幼圆", cssValue: "YouYuan, STXihei, sans-serif" },
	{ value: "lishu", label: "隶变", cssValue: '"STLiti", "LiSu", serif' },
	{ value: "arial", label: "Arial", cssValue: "Arial, Helvetica, sans-serif" },
	{ value: "times", label: "Times New Roman", cssValue: '"Times New Roman", Times, serif' },
	{ value: "georgia", label: "Georgia", cssValue: "Georgia, serif" },
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

export function isResumeFontSizePt(value: number): value is ResumeFontSizePt {
	return RESUME_FONT_SIZE_OPTIONS.some((option) => option === value);
}

export function normalizeResumeFontSize(value: unknown): ResumeFontSizePt {
	const numericValue =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: DEFAULT_RESUME_FONT_SIZE_PT;

	return isResumeFontSizePt(numericValue)
		? numericValue
		: DEFAULT_RESUME_FONT_SIZE_PT;
}

export function isResumePageMarginMm(
	value: number,
): value is ResumePageMarginMm {
	return RESUME_PAGE_MARGIN_OPTIONS.some((option) => option === value);
}

export function normalizeResumePageMargin(
	value: unknown,
): ResumePageMarginMm {
	const numericValue =
		typeof value === "string" || typeof value === "number"
			? Number(value)
			: DEFAULT_RESUME_PAGE_MARGIN_MM;

	return isResumePageMarginMm(numericValue)
		? numericValue
		: DEFAULT_RESUME_PAGE_MARGIN_MM;
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

export function normalizeProjectTagPosition(
	value: unknown,
	fallback: ProjectTagPosition = "below",
): ProjectTagPosition {
	return value === "title" || value === "below" ? value : fallback;
}

export function normalizeSkillContentStyle(
	value: unknown,
	fallback: SkillContentStyle = "theme",
): SkillContentStyle {
	return value === "theme" || value === "text" || value === "chips"
		? value
		: fallback;
}

export function normalizeOtherListStyle(
	value: unknown,
	fallback: OtherListStyle = "bullets",
): OtherListStyle {
	return value === "bullets" || value === "plain" ? value : fallback;
}

export function normalizeSectionEntryDisplayStyle(
	value: unknown,
	fallback: SectionEntryDisplayStyle = "list",
): SectionEntryDisplayStyle {
	return value === "list" || value === "detail" ? value : fallback;
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

export function normalizeResumeSectionPreferences(
	value: unknown,
	fallback: ResumeSectionPreferences = DEFAULT_SECTION_PREFERENCES,
	legacy?: {
		projectLinksPosition?: unknown;
		showProjectTags?: unknown;
	},
): ResumeSectionPreferences {
	const raw = isRecord(value) ? value : {};
	const personal = isRecord(raw.personal) ? raw.personal : {};
	const skills = isRecord(raw.skills) ? raw.skills : {};
	const experience = isRecord(raw.experience) ? raw.experience : {};
	const projects = isRecord(raw.projects) ? raw.projects : {};
	const education = isRecord(raw.education) ? raw.education : {};
	const awards = isRecord(raw.awards) ? raw.awards : {};
	const campus = isRecord(raw.campus) ? raw.campus : {};
	const other = isRecord(raw.other) ? raw.other : {};
	const fallbackAwardsStyle =
		fallback.awards?.displayStyle ??
		DEFAULT_SECTION_PREFERENCES.awards.displayStyle;
	const fallbackCampusStyle =
		fallback.campus?.displayStyle ??
		DEFAULT_SECTION_PREFERENCES.campus.displayStyle;
	const fallbackPersonal =
		fallback.personal ?? DEFAULT_SECTION_PREFERENCES.personal;

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
		},
		skills: {
			showLabels: readBoolean(
				skills.showLabels,
				fallback.skills.showLabels,
			),
			contentStyle: normalizeSkillContentStyle(
				skills.contentStyle,
				fallback.skills.contentStyle,
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
		},
		projects: {
			showDates: readBoolean(projects.showDates, fallback.projects.showDates),
			datePosition: normalizeSectionDatePosition(
				projects.datePosition,
				fallback.projects.datePosition,
			),
			showTags: readBoolean(
				projects.showTags ?? legacy?.showProjectTags,
				fallback.projects.showTags,
			),
			tagPosition: normalizeProjectTagPosition(
				projects.tagPosition,
				fallback.projects.tagPosition,
			),
			linksPosition: normalizeProjectLinksPosition(
				projects.linksPosition ?? legacy?.projectLinksPosition,
				fallback.projects.linksPosition,
			),
		},
		education: {
			showDates: readBoolean(education.showDates, fallback.education.showDates),
		},
		awards: {
			displayStyle: normalizeSectionEntryDisplayStyle(
				awards.displayStyle,
				fallbackAwardsStyle,
			),
		},
		campus: {
			displayStyle: normalizeSectionEntryDisplayStyle(
				campus.displayStyle,
				fallbackCampusStyle,
			),
		},
		other: {
			listStyle: normalizeOtherListStyle(
				other.listStyle,
				fallback.other.listStyle,
			),
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
