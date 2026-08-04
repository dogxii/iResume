import { describe, expect, it } from "vitest";
import { resolvePreviewStyle } from "./resolvePreviewStyle";

describe("resume preview style", () => {
	it("resolves shared page dimensions and typography variables", () => {
		const resolved = resolvePreviewStyle({
			accentColor: "#ef4444",
			fontSizePt: 12,
			sectionTitleFontSizePx: 21,
			itemTitleFontSizePx: 15,
			fontFamily: "arial",
			pageMarginMm: 16,
			lineHeight: 1.55,
			sectionSpacing: 20,
			paragraphSpacingPx: 10,
			minPageCount: 2,
		});

		expect(resolved.normalizedPageMargin).toBe(16);
		expect(resolved.normalizedSectionSpacing).toBe(20);
		expect(resolved.rootStyle).toMatchObject({
			"--resume-accent": "#ef4444",
			"--resume-page-margin": "16px",
			"--resume-base-font-size": "12px",
			"--resume-section-title-font-size": "21px",
			"--resume-item-title-font-size": "15px",
			"--resume-section-spacing": "20px",
			"--resume-paragraph-spacing": "10px",
			"--resume-line-height": "1.55",
			minHeight: "594mm",
			padding: "16px",
			fontFamily: "Arial, Helvetica, sans-serif",
			lineHeight: "var(--resume-line-height)",
		});
	});
});
