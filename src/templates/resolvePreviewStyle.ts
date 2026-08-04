import type { CSSProperties } from "react";
import {
	getResumeAccentCssVariables,
	getResumeFontFamilyCss,
	normalizeResumeFontFamily,
	normalizeResumeFontSize,
	normalizeResumeItemTitleFontSize,
	normalizeResumeLineHeight,
	normalizeResumePageMargin,
	normalizeResumeParagraphSpacing,
	normalizeResumeSectionSpacing,
	normalizeResumeSectionTitleFontSize,
	type ResumeFontFamily,
	type ResumeFontSizePt,
	type ResumeItemTitleFontSizePx,
	type ResumeLineHeight,
	type ResumePageMarginMm,
	type ResumeParagraphSpacingPx,
	type ResumeSectionSpacing,
	type ResumeSectionTitleFontSizePx,
} from "../data/resumeStyle";

const A4_HEIGHT_MM = 297;

interface ResolvePreviewStyleOptions {
	accentColor?: string;
	fontSizePt?: ResumeFontSizePt;
	sectionTitleFontSizePx?: ResumeSectionTitleFontSizePx;
	itemTitleFontSizePx?: ResumeItemTitleFontSizePx;
	fontFamily?: ResumeFontFamily;
	pageMarginMm?: ResumePageMarginMm;
	lineHeight?: ResumeLineHeight;
	sectionSpacing?: ResumeSectionSpacing;
	paragraphSpacingPx?: ResumeParagraphSpacingPx;
	minPageCount?: number;
}

export function resolvePreviewStyle({
	accentColor,
	fontSizePt,
	sectionTitleFontSizePx,
	itemTitleFontSizePx,
	fontFamily,
	pageMarginMm,
	lineHeight,
	sectionSpacing,
	paragraphSpacingPx,
	minPageCount = 1,
}: ResolvePreviewStyleOptions) {
	const normalizedFontSize = normalizeResumeFontSize(fontSizePt);
	const normalizedSectionTitleFontSize =
		normalizeResumeSectionTitleFontSize(sectionTitleFontSizePx);
	const normalizedItemTitleFontSize =
		normalizeResumeItemTitleFontSize(itemTitleFontSizePx);
	const normalizedPageMargin = normalizeResumePageMargin(pageMarginMm);
	const normalizedFontFamily = normalizeResumeFontFamily(fontFamily);
	const normalizedLineHeight = normalizeResumeLineHeight(lineHeight);
	const normalizedSectionSpacing =
		normalizeResumeSectionSpacing(sectionSpacing);
	const normalizedParagraphSpacing =
		normalizeResumeParagraphSpacing(paragraphSpacingPx);
	const fontFamilyCss = getResumeFontFamilyCss(normalizedFontFamily);
	const minHeightMm = Math.max(1, minPageCount) * A4_HEIGHT_MM;
	const rootStyle = {
		...getResumeAccentCssVariables(accentColor),
		"--resume-page-margin": `${normalizedPageMargin}px`,
		"--resume-base-font-size": `${normalizedFontSize}px`,
		"--resume-section-title-font-size": `${normalizedSectionTitleFontSize}px`,
		"--resume-item-title-font-size": `${normalizedItemTitleFontSize}px`,
		"--resume-paragraph-spacing": `${normalizedParagraphSpacing}px`,
		"--resume-line-height": String(normalizedLineHeight),
		minHeight: `${minHeightMm}mm`,
		padding: `${normalizedPageMargin}px`,
		...(fontFamilyCss ? { fontFamily: fontFamilyCss } : {}),
		lineHeight: "var(--resume-line-height)",
		"--resume-section-spacing": `${normalizedSectionSpacing}px`,
	} as CSSProperties;

	return {
		rootStyle,
		normalizedPageMargin,
		normalizedSectionSpacing,
	};
}
