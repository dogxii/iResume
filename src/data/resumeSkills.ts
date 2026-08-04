import type { SkillItem } from "../types/resume";

interface FormatSkillsAsMarkdownOptions {
	emphasizeLabels?: boolean;
}

const stripListMarker = (line: string) => line.replace(/^[-*]\s+/, "").trim();

const formatLabel = (label: string, emphasizeLabels: boolean) =>
	emphasizeLabels ? `**${label}**` : label;

export const hasSkillContent = (skill: Pick<SkillItem, "label" | "content">) =>
	skill.label.trim() || skill.content.trim();

export const formatSkillsAsMarkdown = (
	skills: SkillItem[],
	{ emphasizeLabels = false }: FormatSkillsAsMarkdownOptions = {},
) =>
	skills
		.flatMap((skill) => {
			const label = skill.label.trim();
			const content = skill.content.trim();
			if (!label && !content) return [];
			if (!label) return [content];

			const displayLabel = formatLabel(label, emphasizeLabels);
			if (!content) return [`- ${displayLabel}`];

			return content
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean)
				.map((line) => `- ${displayLabel}：${stripListMarker(line)}`);
		})
		.filter(Boolean)
		.join("\n");
