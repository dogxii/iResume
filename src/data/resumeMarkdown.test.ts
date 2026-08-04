import { describe, expect, it } from "vitest";
import { initialResumeState } from "./initialData";
import { createResumeMarkdown } from "./resumeMarkdown";
import type { ResumeData } from "../types/resume";

describe("resume markdown export", () => {
	it("exports visible sections in resume order", () => {
		const data: ResumeData = {
			...initialResumeState,
			sectionOrder: [
				"education",
				"skills",
				"projects",
				"experience",
				"awards",
				"campus",
				"other",
			],
			sectionVisibility: {
				...initialResumeState.sectionVisibility,
				projects: false,
			},
		};

		const markdown = createResumeMarkdown(data);

		expect(markdown).toContain("# 林小明");
		expect(markdown.indexOf("## 教育背景")).toBeLessThan(
			markdown.indexOf("## 专业技能"),
		);
		expect(initialResumeState.sectionTitles.projects).toBe("项目经历");
		expect(markdown).not.toContain("## 项目经验");
		expect(markdown).not.toContain("## 项目经历");
		expect(markdown).toContain("- 熟悉 HTML5、CSS3、JavaScript");
	});

	it("exports custom sections", () => {
		const data: ResumeData = {
			...initialResumeState,
			customSections: [
				{
					id: "custom-1",
					title: "语言能力",
					content: "- 英语 CET-6\n日语 N2",
				},
			],
			sectionTitles: {
				...initialResumeState.sectionTitles,
				"custom-1": "语言能力",
			},
			sectionVisibility: {
				...initialResumeState.sectionVisibility,
				"custom-1": true,
			},
			sectionOrder: ["custom-1", ...initialResumeState.sectionOrder],
		};

		const markdown = createResumeMarkdown(data);

		expect(markdown).toContain("## 语言能力");
		expect(markdown).toContain("- 英语 CET-6");
		expect(markdown).toContain("\n日语 N2");
		expect(markdown).not.toContain("- 日语 N2");
		expect(markdown.indexOf("## 语言能力")).toBeLessThan(
			markdown.indexOf("## 专业技能"),
		);
	});
});
