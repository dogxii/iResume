import type { SkillItem } from "../types/resume";

interface FormatSkillsAsMarkdownOptions {
	emphasizeLabels?: boolean;
}

const stripListMarker = (line: string) => line.replace(/^[-*]\s+/, "").trim();
const skillRowPattern = /^(?:\*\*(.+?)\*\*|([^：:]{1,24}))[：:]\s*(.+)$/;

const formatLabel = (label: string, emphasizeLabels: boolean) =>
	emphasizeLabels ? `**${label}**` : label;

export const hasSkillContent = (skill: Pick<SkillItem, "label" | "content">) =>
	skill.label.trim() || skill.content.trim();

export interface SkillDisplayRow {
	label: string;
	content: string;
}

export const getSkillDisplayRows = (skills: SkillItem[]): SkillDisplayRow[] => {
	const rows: SkillDisplayRow[] = [];

	for (const skill of skills) {
		const label = skill.label.trim();
		const content = skill.content.trim();

		const lines = content
			.split("\n")
			.map((line) => stripListMarker(line.trim()))
			.filter(Boolean);

		if (!label && lines.length === 0) continue;

		if (label) {
			rows.push(
				...(lines.length > 0 ? lines : [""]).map((line) => ({
					label,
					content: line,
				})),
			);
			continue;
		}

		for (const line of lines) {
			const match = line.match(skillRowPattern);
			if (!match) return [];
			rows.push({
				label: (match[1] ?? match[2] ?? "").trim(),
				content: match[3].trim(),
			});
		}
	}

	return rows;
};

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

// Keep free-form editor input lossless. Formatting is only appropriate for
// rendering, because it deliberately removes whitespace that can be meaningful
// while a user is typing.
export const getSkillsEditorText = (skills: SkillItem[]) => {
	const [skill] = skills;
	if (skills.length === 1 && skill?.label === "") return skill.content;

	return formatSkillsAsMarkdown(skills);
};
