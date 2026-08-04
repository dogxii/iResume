import { describe, expect, it } from "vitest";
import { templateIds } from "../data/templateConfigs";
import { getResumeTemplate, resumeTemplates } from "./registry";

describe("resume template registry", () => {
	it("registers every available template", () => {
		expect(Object.keys(resumeTemplates)).toEqual(templateIds);

		for (const id of templateIds) {
			const template = getResumeTemplate(id);
			expect(template.id).toBe(id);
			expect(template.config.id).toBe(id);
			expect(template.Renderer).toBeTypeOf("object");
		}
	});

	it("uses an isolated renderer for the structured template", () => {
		expect(resumeTemplates.structured.Renderer).not.toBe(
			resumeTemplates.classic.Renderer,
		);
	});
});
