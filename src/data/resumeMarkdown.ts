import type {
	Project,
	ResumeData,
	SectionEntry,
	StandardSectionKey,
	SectionKey,
} from "../types/resume";
import { isCustomSectionKey } from "./resumeData";
import { formatSkillsAsMarkdown } from "./resumeSkills";
import { parseMarkdownBlocks } from "../utils/markdown";

const joinMeta = (...parts: string[]) =>
	parts
		.map((part) => part.trim())
		.filter(Boolean)
		.join(" / ");

const getSectionTitle = (data: ResumeData, key: SectionKey) =>
	isCustomSectionKey(key)
		? data.customSections.find((section) => section.id === key)?.title.trim() ||
			data.sectionTitles[key]?.trim() ||
			"自定义区块"
		: data.sectionTitles[key].trim() || key;

const appendSection = (
	lines: string[],
	title: string,
	content: string[],
) => {
	if (content.length === 0) return;
	lines.push("", `## ${title}`, "", ...content);
};

const renderDetailLines = (details: string) =>
	parseMarkdownBlocks(details).flatMap((block) =>
		block.type === "list"
			? block.items.map((line) => `- ${line}`)
			: [block.text],
	);

const renderProjects = (projects: Project[]) =>
	projects.flatMap((project) => {
		const content: string[] = [];
		const title = project.name.trim();
		if (title) content.push(`### ${title}`);
		const meta = joinMeta(project.date, project.role, project.tags);
		if (meta) content.push(meta);
		if (project.link.trim()) content.push(`- 项目地址：${project.link.trim()}`);
		if (project.source.trim()) content.push(`- 源码地址：${project.source.trim()}`);
		content.push(...renderDetailLines(project.description));
		return content.length > 0 ? [...content, ""] : [];
	});

const renderSectionEntries = (items: SectionEntry[]) =>
	items.flatMap((item) => {
		const content: string[] = [];
		const title = item.title.trim();
		if (title) content.push(`### ${title}`);
		const meta = joinMeta(item.subtitle, item.date);
		if (meta) content.push(meta);
		content.push(...renderDetailLines(item.details));
		return content.length > 0 ? [...content, ""] : [];
	});

const renderSkills = (skills: ResumeData["skills"]) =>
	formatSkillsAsMarkdown(skills, { emphasizeLabels: true })
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);

export function createResumeMarkdown(data: ResumeData): string {
	const lines: string[] = [];
	const { personal } = data;
	const name = personal.name.trim();
	const title = personal.title.trim();

	if (name) lines.push(`# ${name}`);
	if (title) lines.push(title);

	const contact = [
		joinMeta(personal.phone, personal.email),
		joinMeta(personal.location, personal.availability),
		personal.github.trim() ? `GitHub：${personal.github.trim()}` : "",
		personal.website.trim() ? `主页：${personal.website.trim()}` : "",
	].filter(Boolean);

	if (contact.length > 0) lines.push("", ...contact);

	const renderers: Record<StandardSectionKey, () => string[]> = {
		skills: () => renderSkills(data.skills),
		experience: () =>
			data.experience.flatMap((item) => {
				const content: string[] = [];
				const titleLine = joinMeta(item.company, item.role);
				if (titleLine) content.push(`### ${titleLine}`);
				if (item.date.trim()) content.push(item.date.trim());
				content.push(...renderDetailLines(item.details));
				return content.length > 0 ? [...content, ""] : [];
			}),
		projects: () => renderProjects(data.projects),
		education: () =>
			data.education.flatMap((item) => {
				const line = joinMeta(item.school, item.degree, item.date);
				return line ? [`- ${line}`] : [];
			}),
		awards: () => renderSectionEntries(data.awards),
		campus: () => renderSectionEntries(data.campus),
		other: () => renderDetailLines(data.other),
	};

	for (const key of data.sectionOrder) {
		if (!data.sectionVisibility[key]) continue;
		if (isCustomSectionKey(key)) {
			const section = data.customSections.find((item) => item.id === key);
			appendSection(
				lines,
				getSectionTitle(data, key),
				renderDetailLines(section?.content ?? ""),
			);
			continue;
		}
		appendSection(lines, getSectionTitle(data, key), renderers[key]());
	}

	return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
