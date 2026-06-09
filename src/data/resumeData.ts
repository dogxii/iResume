import { initialResumeState } from "./initialData";
import type {
	Education,
	Experience,
	PersonalInfo,
	Project,
	ResumeData,
	SectionEntry,
	SectionKey,
	SectionIconVisibility,
	SectionTitles,
	SectionVisibility,
	SkillItem,
} from "../types/resume";

export const ALL_SECTION_KEYS: SectionKey[] = [
	"skills",
	"experience",
	"projects",
	"education",
	"awards",
	"campus",
	"other",
];

const skillLabelMap: Record<string, string> = {
	core: "核心能力",
	react: "React 生态",
	engineering: "工程化",
	style: "样式 & 性能",
};

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function readId(
	value: unknown,
	fallback: number,
	usedIds: Set<number>,
): number {
	let id = typeof value === "number" && Number.isFinite(value) ? value : fallback;
	while (usedIds.has(id)) id += 1;
	usedIds.add(id);
	return id;
}

function normalizePersonal(value: unknown): PersonalInfo {
	const raw = isRecord(value) ? value : {};
	const defaults = initialResumeState.personal;

	return {
		name: readString(raw.name, defaults.name),
		title: readString(raw.title, defaults.title),
		photoUrl: readString(raw.photoUrl, defaults.photoUrl),
		phone: readString(raw.phone, defaults.phone),
		email: readString(raw.email, defaults.email),
		location: readString(raw.location, defaults.location),
		availability: readString(raw.availability, defaults.availability),
		github: readString(raw.github, defaults.github),
		website: readString(raw.website, defaults.website),
	};
}

function normalizeSectionTitles(value: unknown): SectionTitles {
	const raw = isRecord(value) ? value : {};
	const defaults = initialResumeState.sectionTitles;

	return {
		skills: readString(raw.skills, defaults.skills),
		experience: readString(raw.experience, defaults.experience),
		projects: readString(raw.projects, defaults.projects),
		education: readString(raw.education, defaults.education),
		awards: readString(raw.awards, defaults.awards),
		campus: readString(raw.campus, defaults.campus),
		other: readString(raw.other, defaults.other),
	};
}

function normalizeSectionVisibility(value: unknown): SectionVisibility {
	const raw = isRecord(value) ? value : {};
	const defaults = initialResumeState.sectionVisibility;
	const result = {} as SectionVisibility;

	for (const key of ALL_SECTION_KEYS) {
		result[key] = typeof raw[key] === "boolean" ? raw[key] : defaults[key];
	}

	return result;
}

function normalizeSectionOrder(value: unknown): SectionKey[] {
	if (!Array.isArray(value)) return [...initialResumeState.sectionOrder];

	const seen = new Set<SectionKey>();
	const valid = value.filter((key): key is SectionKey => {
		if (!ALL_SECTION_KEYS.includes(key as SectionKey)) return false;
		if (seen.has(key as SectionKey)) return false;
		seen.add(key as SectionKey);
		return true;
	});
	const missing = ALL_SECTION_KEYS.filter((key) => !seen.has(key));
	return [...valid, ...missing];
}

function normalizeSkills(value: unknown): SkillItem[] {
	if (Array.isArray(value)) {
		const usedIds = new Set<number>();
		return value.map((item, index) => {
			const raw = isRecord(item) ? item : {};
			return {
				id: readId(raw.id, index + 1, usedIds),
				label: readString(raw.label),
				content: readString(raw.content),
			};
		});
	}

	if (isRecord(value)) {
		const usedIds = new Set<number>();
		return Object.entries(value).map(([key, content], index) => ({
			id: readId(index + 1, index + 1, usedIds),
			label: skillLabelMap[key] || key,
			content: readString(content),
		}));
	}

	return initialResumeState.skills.map((item) => ({ ...item }));
}

function normalizeEducation(value: unknown): Education[] {
	const normalizeOne = (
		item: unknown,
		index: number,
		usedIds: Set<number>,
	): Education => {
		const raw = isRecord(item) ? item : {};
		return {
			id: readId(raw.id, index + 1, usedIds),
			school: readString(raw.school),
			degree: readString(raw.degree),
			date: readString(raw.date),
		};
	};

	if (Array.isArray(value)) {
		const usedIds = new Set<number>();
		return value.map((item, index) => normalizeOne(item, index, usedIds));
	}

	if (isRecord(value)) {
		return [normalizeOne(value, 0, new Set<number>())];
	}

	return initialResumeState.education.map((item) => ({ ...item }));
}

function normalizeExperience(value: unknown): Experience[] {
	if (!Array.isArray(value)) {
		return initialResumeState.experience.map((item) => ({ ...item }));
	}

	const usedIds = new Set<number>();
	return value.map((item, index) => {
		const raw = isRecord(item) ? item : {};
		return {
			id: readId(raw.id, index + 1, usedIds),
			company: readString(raw.company),
			role: readString(raw.role),
			date: readString(raw.date),
			details: readString(raw.details),
		};
	});
}

function normalizeProjects(value: unknown): Project[] {
	if (!Array.isArray(value)) {
		return initialResumeState.projects.map((item) => ({ ...item }));
	}

	const usedIds = new Set<number>();
	return value.map((item, index) => {
		const raw = isRecord(item) ? item : {};
		return {
			id: readId(raw.id, index + 1, usedIds),
			name: readString(raw.name),
			date: readString(raw.date),
			tags: readString(raw.tags),
			link: readString(raw.link),
			source: readString(raw.source),
			description: readString(raw.description),
		};
	});
}

function normalizeSectionEntries(
	value: unknown,
	fallback: SectionEntry[],
): SectionEntry[] {
	if (!Array.isArray(value)) {
		return fallback.map((item) => ({ ...item }));
	}

	const usedIds = new Set<number>();
	return value.map((item, index) => {
		const raw = isRecord(item) ? item : {};
		return {
			id: readId(raw.id, index + 1, usedIds),
			title: readString(raw.title),
			subtitle: readString(raw.subtitle),
			date: readString(raw.date),
			details: readString(raw.details),
		};
	});
}

export function normalizeResumeData(raw: unknown): ResumeData {
	const data = isRecord(raw) ? raw : {};

	return {
		personal: normalizePersonal(data.personal),
		sectionTitles: normalizeSectionTitles(data.sectionTitles),
		sectionVisibility: normalizeSectionVisibility(data.sectionVisibility),
		sectionOrder: normalizeSectionOrder(data.sectionOrder),
		skills: normalizeSkills(data.skills),
		experience: normalizeExperience(data.experience),
		projects: normalizeProjects(data.projects),
		education: normalizeEducation(data.education),
		awards: normalizeSectionEntries(data.awards, initialResumeState.awards),
		campus: normalizeSectionEntries(data.campus, initialResumeState.campus),
		other: readString(data.other, initialResumeState.other),
	};
}

let nextClientId = Date.now();

export function createResumeItemId(): number {
	nextClientId += 1;
	return nextClientId;
}

export function createSectionIconVisibility(
	visible: boolean,
): SectionIconVisibility {
	return ALL_SECTION_KEYS.reduce(
		(result, key) => ({ ...result, [key]: visible }),
		{} as SectionIconVisibility,
	);
}

export function normalizeSectionIconVisibility(
	value: unknown,
	fallback: SectionIconVisibility,
): SectionIconVisibility {
	const raw = isRecord(value) ? value : {};

	return ALL_SECTION_KEYS.reduce(
		(result, key) => ({
			...result,
			[key]: typeof raw[key] === "boolean" ? raw[key] : fallback[key],
		}),
		{} as SectionIconVisibility,
	);
}
