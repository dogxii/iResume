import {
	DEFAULT_RESUME_FONT_SIZE_PT,
	DEFAULT_RESUME_PAGE_MARGIN_MM,
	DEFAULT_RESUME_LINE_HEIGHT,
	DEFAULT_RESUME_ITEM_TITLE_FONT_SIZE_PX,
	DEFAULT_RESUME_PARAGRAPH_SPACING_PX,
	DEFAULT_RESUME_SECTION_SPACING,
	DEFAULT_RESUME_SECTION_TITLE_FONT_SIZE_PX,
	normalizeResumeAccentColor,
	normalizeResumeFontSize,
	normalizeResumeItemTitleFontSize,
	normalizeResumePageMargin,
	normalizeResumeParagraphSpacing,
	normalizeResumeFontFamily,
	normalizeResumeLineHeight,
	normalizeResumeSectionSpacing,
	normalizeResumeSectionPreferences,
	normalizeResumeSectionTitleFontSize,
	type ResumeFontSizePt,
	type ResumeItemTitleFontSizePx,
	type ResumePageMarginMm,
	type ResumeFontFamily,
	type ResumeLineHeight,
	type ResumeParagraphSpacingPx,
	type ResumeSectionPreferences,
	type ResumeSectionSpacing,
	type ResumeSectionTitleFontSizePx,
} from "./resumeStyle";
import { DEFAULT_TEMPLATE_ID, isTemplateId } from "./templateConfigs";
import {
	createSectionIconVisibility,
	isRecord,
	normalizeResumeData,
	normalizeSectionIconVisibility,
} from "./resumeData";
import type { ResumeData, SectionIconVisibility } from "../types/resume";
import type { TemplateId } from "../types/template";

export interface ResumeBackup {
	version: 7;
	data: ResumeData;
	appearance: {
		templateId: TemplateId;
		accentColor: string;
		fontSizePt: ResumeFontSizePt;
		sectionTitleFontSizePx: ResumeSectionTitleFontSizePx;
		itemTitleFontSizePx: ResumeItemTitleFontSizePx;
		pageMarginMm: ResumePageMarginMm;
		fontFamily: ResumeFontFamily;
		lineHeight: ResumeLineHeight;
		sectionSpacing: ResumeSectionSpacing;
		paragraphSpacingPx: ResumeParagraphSpacingPx;
		sectionIcons: SectionIconVisibility;
		sectionPreferences: ResumeSectionPreferences;
	};
}

export interface ImportedResumeBackup {
	data: ResumeData;
	templateId?: TemplateId;
	accentColor?: string;
	fontSizePt?: ResumeFontSizePt;
	sectionTitleFontSizePx?: ResumeSectionTitleFontSizePx;
	itemTitleFontSizePx?: ResumeItemTitleFontSizePx;
	pageMarginMm?: ResumePageMarginMm;
	fontFamily?: ResumeFontFamily;
	lineHeight?: ResumeLineHeight;
	sectionSpacing?: ResumeSectionSpacing;
	paragraphSpacingPx?: ResumeParagraphSpacingPx;
	sectionIcons?: SectionIconVisibility;
	sectionPreferences?: ResumeSectionPreferences;
}

export function createResumeBackup(
	data: ResumeData,
	appearance: ResumeBackup["appearance"],
): ResumeBackup {
	return {
		version: 7,
		data,
		appearance: {
			...appearance,
			accentColor: normalizeResumeAccentColor(appearance.accentColor),
		},
	};
}

export function normalizeResumeBackup(raw: unknown): ImportedResumeBackup {
	if (!isRecord(raw)) {
		throw new Error("Invalid resume backup");
	}

	const rawData = "data" in raw ? raw.data : raw;
	const appearance = isRecord(raw.appearance) ? raw.appearance : {};
	const templateValue = appearance.templateId ?? raw.templateId;
	const accentColorValue = appearance.accentColor ?? raw.accentColor;
	const fontSizeValue = appearance.fontSizePt ?? raw.fontSizePt;
	const sectionTitleFontSizeValue =
		appearance.sectionTitleFontSizePx ?? raw.sectionTitleFontSizePx;
	const itemTitleFontSizeValue =
		appearance.itemTitleFontSizePx ?? raw.itemTitleFontSizePx;
	const pageMarginValue = appearance.pageMarginMm ?? raw.pageMarginMm;
	const fontFamilyValue = appearance.fontFamily ?? raw.fontFamily;
	const lineHeightValue = appearance.lineHeight ?? raw.lineHeight;
	const sectionSpacingValue = appearance.sectionSpacing ?? raw.sectionSpacing;
	const paragraphSpacingValue =
		appearance.paragraphSpacingPx ?? raw.paragraphSpacingPx;
	const sectionIconsValue = appearance.sectionIcons ?? raw.sectionIcons;
	const sectionPreferencesValue =
		appearance.sectionPreferences ?? raw.sectionPreferences;

	const result: ImportedResumeBackup = {
		data: normalizeResumeData(rawData),
	};

	if (typeof templateValue === "string") {
		result.templateId = isTemplateId(templateValue) ? templateValue : DEFAULT_TEMPLATE_ID;
	}

	if (accentColorValue !== undefined) {
		result.accentColor = normalizeResumeAccentColor(accentColorValue);
	}

	if (fontSizeValue !== undefined) {
		result.fontSizePt = normalizeResumeFontSize(
			fontSizeValue ?? DEFAULT_RESUME_FONT_SIZE_PT,
		);
	}

	if (sectionTitleFontSizeValue !== undefined) {
		result.sectionTitleFontSizePx = normalizeResumeSectionTitleFontSize(
			sectionTitleFontSizeValue ??
				DEFAULT_RESUME_SECTION_TITLE_FONT_SIZE_PX,
		);
	}

	if (itemTitleFontSizeValue !== undefined) {
		result.itemTitleFontSizePx = normalizeResumeItemTitleFontSize(
			itemTitleFontSizeValue ?? DEFAULT_RESUME_ITEM_TITLE_FONT_SIZE_PX,
		);
	}

	if (pageMarginValue !== undefined) {
		result.pageMarginMm = normalizeResumePageMargin(
			pageMarginValue ?? DEFAULT_RESUME_PAGE_MARGIN_MM,
		);
	}

	if (fontFamilyValue !== undefined) {
		result.fontFamily = normalizeResumeFontFamily(fontFamilyValue);
	}

	if (lineHeightValue !== undefined) {
		result.lineHeight = normalizeResumeLineHeight(
			lineHeightValue ?? DEFAULT_RESUME_LINE_HEIGHT,
		);
	}

	if (sectionSpacingValue !== undefined) {
		result.sectionSpacing = normalizeResumeSectionSpacing(
			sectionSpacingValue ?? DEFAULT_RESUME_SECTION_SPACING,
		);
	}

	if (paragraphSpacingValue !== undefined) {
		result.paragraphSpacingPx = normalizeResumeParagraphSpacing(
			paragraphSpacingValue ?? DEFAULT_RESUME_PARAGRAPH_SPACING_PX,
		);
	}

	if (sectionIconsValue !== undefined) {
		result.sectionIcons = normalizeSectionIconVisibility(
			sectionIconsValue,
			createSectionIconVisibility(false),
		);
	}

	if (sectionPreferencesValue !== undefined) {
		result.sectionPreferences = normalizeResumeSectionPreferences(
			sectionPreferencesValue,
			undefined,
		);
	}

	return result;
}
