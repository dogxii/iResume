import { describe, expect, it } from "vitest";
import { resolveResumeForCli, validateResumeJson } from "./cli-api";

describe("iResume CLI API", () => {
	it("resolves a single resume backup", () => {
		const resolved = resolveResumeForCli({
			data: {
				personal: {
					name: "林小明",
				},
			},
			appearance: {
				templateId: "structured",
			},
		});

		expect(resolved.sourceKind).toBe("backup");
		expect(resolved.data.personal.name).toBe("林小明");
		expect(resolved.appearance.templateId).toBe("structured");
		expect(resolved.markdown).toContain("# 林小明");
	});

	it("resolves a local folder resume file", () => {
		const result = validateResumeJson({
			kind: "iresume.resume",
			id: "doc-1",
			name: "前端简历",
			resumeVersion: "2.0.0",
			backup: {
				data: {
					personal: {
						name: "林小明",
					},
				},
				appearance: {
					templateId: "minimal",
				},
			},
		});

		expect(result.sourceKind).toBe("local-resume");
		expect(result.document.id).toBe("doc-1");
		expect(result.document.name).toBe("前端简历");
		expect(result.document.templateId).toBe("minimal");
	});

	it("selects a document from a library", () => {
		const resolved = resolveResumeForCli(
			{
				version: 2,
				activeId: "doc-a",
				documents: [
					{
						id: "doc-a",
						name: "A",
						data: {
							personal: {
								name: "候选人 A",
							},
						},
						appearance: {
							templateId: "classic",
						},
					},
					{
						id: "doc-b",
						name: "B",
						data: {
							personal: {
								name: "候选人 B",
							},
						},
						appearance: {
							templateId: "ats",
						},
					},
				],
			},
			{ documentId: "doc-b" },
		);

		expect(resolved.sourceKind).toBe("library");
		expect(resolved.document.id).toBe("doc-b");
		expect(resolved.data.personal.name).toBe("候选人 B");
		expect(resolved.appearance.templateId).toBe("ats");
	});
});
