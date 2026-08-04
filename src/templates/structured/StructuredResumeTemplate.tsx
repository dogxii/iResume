import { forwardRef } from "react";
import StructuredResumeLayout from "../../components/StructuredResumeLayout";
import type { ResumePreviewProps } from "../../components/ResumePreview";
import { normalizeResumeSectionPreferences } from "../../data/resumeStyle";
import { templateConfigs } from "../../data/templateConfigs";
import { resolvePreviewStyle } from "../resolvePreviewStyle";

const StructuredResumeTemplate = forwardRef<
	HTMLDivElement,
	ResumePreviewProps
>(function StructuredResumeTemplate(
	{
		data,
		accentColor,
		fontSizePt,
		sectionTitleFontSizePx,
		itemTitleFontSizePx,
		fontFamily,
		pageMarginMm,
		lineHeight,
		sectionSpacing,
		paragraphSpacingPx,
		sectionPreferences,
		minPageCount = 1,
		contentRef,
		onSectionClick,
	},
	ref,
) {
	const template = templateConfigs.structured;
	const {
		rootStyle,
		normalizedPageMargin,
		normalizedSectionSpacing,
	} = resolvePreviewStyle({
		accentColor,
		fontSizePt,
		sectionTitleFontSizePx,
		itemTitleFontSizePx,
		fontFamily,
		pageMarginMm,
		lineHeight,
		sectionSpacing,
		paragraphSpacingPx,
		minPageCount,
	});
	const fontClass = template.fontStyle === "serif" ? "font-serif" : "font-sans";

	return (
		<StructuredResumeLayout
			ref={ref}
			data={data}
			sectionPreferences={normalizeResumeSectionPreferences(
				sectionPreferences,
			)}
			contentRef={contentRef}
			onSectionClick={onSectionClick}
			rootStyle={rootStyle}
			fontClass={fontClass}
			pageMarginMm={normalizedPageMargin}
			sectionSpacing={normalizedSectionSpacing}
		/>
	);
});

export default StructuredResumeTemplate;
