import { describe, expect, it } from "vitest";
import { getSkillDisplayRows } from "./resumeSkills";

describe("resume skill display rows", () => {
	it("parses category rows from markdown list lines", () => {
		expect(
			getSkillDisplayRows([
				{
					id: 1,
					label: "",
					content:
						"- 核心语言：熟悉 JavaScript / TypeScript\n- React 开发：熟悉 Hooks",
				},
			]),
		).toEqual([
			{ label: "核心语言", content: "熟悉 JavaScript / TypeScript" },
			{ label: "React 开发", content: "熟悉 Hooks" },
		]);
	});

	it("falls back when uncategorized lines are mixed in", () => {
		expect(
			getSkillDisplayRows([
				{
					id: 1,
					label: "",
					content: "- 核心语言：熟悉 JavaScript\n- 熟悉工程化工具链",
				},
			]),
		).toEqual([]);
	});
});
