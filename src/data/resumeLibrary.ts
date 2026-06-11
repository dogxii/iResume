import { initialResumeState } from "./initialData";
import {
	createSectionIconVisibility,
	isRecord,
	normalizeResumeData,
	normalizeSectionIconVisibility,
} from "./resumeData";
import {
	DEFAULT_SECTION_PREFERENCES,
	DEFAULT_RESUME_FONT_SIZE_PT,
	DEFAULT_RESUME_PAGE_MARGIN_MM,
	DEFAULT_RESUME_FONT_FAMILY,
	normalizeResumeFontSize,
	normalizeResumePageMargin,
	normalizeResumeFontFamily,
	normalizeResumeSectionPreferences,
	type ResumeFontSizePt,
	type ResumePageMarginMm,
	type ResumeFontFamily,
	type ResumeSectionPreferences,
} from "./resumeStyle";
import {
	DEFAULT_THEME_ID,
	getDefaultSectionIconVisibility,
	isThemeId,
} from "./themes";
import type { ResumeData, SectionIconVisibility } from "../types/resume";
import type { ThemeId } from "../types/theme";

export interface ResumeAppearance {
	themeId: ThemeId;
	fontSizePt: ResumeFontSizePt;
	pageMarginMm: ResumePageMarginMm;
	fontFamily: ResumeFontFamily;
	sectionIcons: SectionIconVisibility;
	sectionPreferences: ResumeSectionPreferences;
}

export interface ResumeDocument {
	id: string;
	name: string;
	tags: string[];
	version: string;
	createdAt: string;
	updatedAt: string;
	data: ResumeData;
	appearance: ResumeAppearance;
}

export interface ResumeLibrary {
	version: 1;
	activeId: string;
	documents: ResumeDocument[];
}

interface CreateResumeDocumentOptions {
	name?: string;
	tags?: string[];
	version?: string;
	data?: ResumeData;
	appearance?: Partial<ResumeAppearance>;
	now?: string;
}

const DEFAULT_RESUME_VERSION = "1.0.0";

const createResumeId = () =>
	`resume-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const readString = (value: unknown, fallback = "") =>
	typeof value === "string" ? value : fallback;

const isValidDateString = (value: unknown): value is string =>
	typeof value === "string" && Number.isFinite(new Date(value).getTime());

export const normalizeResumeTags = (value: unknown): string[] => {
	const values = Array.isArray(value)
		? value
		: typeof value === "string"
			? value.split(/[,，]/)
			: [];
	const seen = new Set<string>();

	return values
		.map((item) => readString(item).trim())
		.filter((item) => {
			if (!item || seen.has(item)) return false;
			seen.add(item);
			return true;
		})
		.slice(0, 8);
};

export const normalizeResumeVersion = (value: unknown): string => {
	const version = readString(value, DEFAULT_RESUME_VERSION).trim();
	return version.length > 0 ? version.slice(0, 24) : DEFAULT_RESUME_VERSION;
};

export function normalizeResumeAppearance(
	value: unknown,
	fallback?: Partial<ResumeAppearance>,
): ResumeAppearance {
	const raw = isRecord(value) ? value : {};
	const fallbackThemeId = fallback?.themeId ?? DEFAULT_THEME_ID;
	const themeId =
		typeof raw.themeId === "string" && isThemeId(raw.themeId)
			? raw.themeId
			: fallbackThemeId;
	const fallbackIcons =
		fallback?.sectionIcons ?? getDefaultSectionIconVisibility(themeId);

	return {
		themeId,
		fontSizePt: normalizeResumeFontSize(
			raw.fontSizePt ?? fallback?.fontSizePt ?? DEFAULT_RESUME_FONT_SIZE_PT,
		),
		pageMarginMm: normalizeResumePageMargin(
			raw.pageMarginMm ??
				fallback?.pageMarginMm ??
				DEFAULT_RESUME_PAGE_MARGIN_MM,
		),
		fontFamily: normalizeResumeFontFamily(
			raw.fontFamily ?? fallback?.fontFamily ?? DEFAULT_RESUME_FONT_FAMILY,
		),
		sectionIcons: normalizeSectionIconVisibility(
			raw.sectionIcons,
			fallbackIcons,
		),
		sectionPreferences: normalizeResumeSectionPreferences(
			raw.sectionPreferences,
			fallback?.sectionPreferences ?? DEFAULT_SECTION_PREFERENCES,
			{
				projectLinksPosition: raw.projectLinksPosition,
				showProjectTags: raw.showProjectTags,
			},
		),
	};
}

export function createResumeDocument(
	options: CreateResumeDocumentOptions = {},
): ResumeDocument {
	const now = options.now ?? new Date().toISOString();
	const baseData = options.data ?? initialResumeState;
	const data = normalizeResumeData(baseData);
	const appearance = normalizeResumeAppearance(options.appearance, {
		themeId: DEFAULT_THEME_ID,
		fontSizePt: DEFAULT_RESUME_FONT_SIZE_PT,
		pageMarginMm: DEFAULT_RESUME_PAGE_MARGIN_MM,
		fontFamily: DEFAULT_RESUME_FONT_FAMILY,
		sectionIcons: createSectionIconVisibility(true),
		sectionPreferences: DEFAULT_SECTION_PREFERENCES,
	});
	const personalName = data.personal.name.trim();

	return {
		id: createResumeId(),
		name: readString(options.name).trim() || personalName || "默认简历",
		tags: normalizeResumeTags(options.tags),
		version: normalizeResumeVersion(options.version),
		createdAt: now,
		updatedAt: now,
		data,
		appearance,
	};
}

export function normalizeResumeDocument(
	value: unknown,
	index: number,
): ResumeDocument {
	if (!isRecord(value)) {
		return createResumeDocument({ name: `简历 ${index + 1}` });
	}

	const now = new Date().toISOString();
	const data = normalizeResumeData(value.data);
	const personalName = data.personal.name.trim();

	return {
		id: readString(value.id).trim() || createResumeId(),
		name:
			readString(value.name).trim() ||
			personalName ||
			(index === 0 ? "默认简历" : `简历 ${index + 1}`),
		tags: normalizeResumeTags(value.tags),
		version: normalizeResumeVersion(value.version),
		createdAt: isValidDateString(value.createdAt) ? value.createdAt : now,
		updatedAt: isValidDateString(value.updatedAt) ? value.updatedAt : now,
		data,
		appearance: normalizeResumeAppearance(value.appearance),
	};
}

export function createResumeLibrary(
	documents: ResumeDocument[] = [createResumeDocument()],
	activeId?: string,
): ResumeLibrary {
	const safeDocuments =
		documents.length > 0 ? documents : [createResumeDocument()];
	const firstDocument = safeDocuments[0];
	const safeActiveId =
		activeId && safeDocuments.some((document) => document.id === activeId)
			? activeId
			: firstDocument.id;

	return {
		version: 1,
		activeId: safeActiveId,
		documents: safeDocuments,
	};
}

export function normalizeResumeLibrary(
	value: unknown,
	fallbackDocument?: ResumeDocument,
): ResumeLibrary {
	if (!isRecord(value) || !Array.isArray(value.documents)) {
		return createResumeLibrary(
			fallbackDocument ? [fallbackDocument] : [createResumeDocument()],
			fallbackDocument?.id,
		);
	}

	const seen = new Set<string>();
	const documents = value.documents.map(normalizeResumeDocument).map((doc) => {
		let id = doc.id;
		while (seen.has(id)) id = createResumeId();
		seen.add(id);
		return { ...doc, id };
	});

	return createResumeLibrary(documents, readString(value.activeId));
}
