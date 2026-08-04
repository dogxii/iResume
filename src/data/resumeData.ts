import { initialResumeState } from "./initialData";
import type {
	Education,
	Experience,
	PersonalInfo,
	Project,
	ResumeData,
	SectionEntry,
	CustomSection,
	CustomSectionKey,
	SectionKey,
	SectionIconVisibility,
	SectionTitles,
	SectionVisibility,
	StandardSectionKey,
	SkillItem,
} from "../types/resume";

export const STANDARD_SECTION_KEYS: StandardSectionKey[] = [
	"skills",
	"experience",
	"projects",
	"education",
	"awards",
	"campus",
	"other",
];

export const OPTIONAL_STANDARD_SECTION_KEYS: StandardSectionKey[] = [
	"awards",
	"campus",
];

export const isStandardSectionKey = (value: unknown): value is StandardSectionKey =>
	typeof value === "string" &&
	STANDARD_SECTION_KEYS.includes(value as StandardSectionKey);

export const isCustomSectionKey = (value: unknown): value is CustomSectionKey =>
	typeof value === "string" && /^custom-\d+$/.test(value);

export const isSectionKey = (value: unknown): value is SectionKey =>
	isStandardSectionKey(value) || isCustomSectionKey(value);

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

function normalizeSectionTitles(
	value: unknown,
	customSections: CustomSection[],
): SectionTitles {
	const raw = isRecord(value) ? value : {};
	const defaults = initialResumeState.sectionTitles;

	const titles: SectionTitles = {
		skills: readString(raw.skills, defaults.skills),
		experience: readString(raw.experience, defaults.experience),
		projects: readString(raw.projects, defaults.projects),
		education: readString(raw.education, defaults.education),
		awards: readString(raw.awards, defaults.awards),
		campus: readString(raw.campus, defaults.campus),
		other: readString(raw.other, defaults.other),
	};

	for (const section of customSections) {
		titles[section.id] = readString(raw[section.id], section.title);
	}

	return titles;
}

function normalizeSectionVisibility(
	value: unknown,
	customSections: CustomSection[],
): SectionVisibility {
	const raw = isRecord(value) ? value : {};
	const defaults = initialResumeState.sectionVisibility;
	const result = {} as SectionVisibility;

	for (const key of STANDARD_SECTION_KEYS) {
		result[key] = typeof raw[key] === "boolean" ? raw[key] : defaults[key];
	}

	for (const section of customSections) {
		const rawVisible = raw[section.id];
		result[section.id] = typeof rawVisible === "boolean" ? rawVisible : true;
	}

	return result;
}

function normalizeSectionOrder(
	value: unknown,
	customSections: CustomSection[],
): SectionKey[] {
	if (!Array.isArray(value)) return [...initialResumeState.sectionOrder];

	const customIds = new Set(customSections.map((section) => section.id));
	const seen = new Set<SectionKey>();
	const valid = value.filter((key): key is SectionKey => {
		if (
			!isStandardSectionKey(key) &&
			(!isCustomSectionKey(key) || !customIds.has(key))
		) {
			return false;
		}
		if (seen.has(key as SectionKey)) return false;
		seen.add(key as SectionKey);
		return true;
	});
	const baseOrder =
		valid.length > 0 ? valid : [...initialResumeState.sectionOrder];
	const orderedIds = new Set(baseOrder);
	const missingCustomIds = customSections
		.map((section) => section.id)
		.filter((id) => !orderedIds.has(id));

	return [...baseOrder, ...missingCustomIds];
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
			role: readString(raw.role),
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

function normalizeCustomSections(value: unknown): CustomSection[] {
	if (!Array.isArray(value)) return [];

	const usedIds = new Set<CustomSectionKey>();
	return value
		.map((item, index): CustomSection | null => {
			const raw = isRecord(item) ? item : {};
			let id: CustomSectionKey = isCustomSectionKey(raw.id)
				? raw.id
				: (`custom-${Date.now() + index}` as CustomSectionKey);
			while (usedIds.has(id)) {
				id = (`custom-${Date.now() + index + usedIds.size}` as CustomSectionKey);
			}
			usedIds.add(id);
			const title = readString(raw.title, `自定义区块 ${index + 1}`).trim();
			return {
				id,
				title: title || `自定义区块 ${index + 1}`,
				content: readString(raw.content),
			};
		})
		.filter((item): item is CustomSection => Boolean(item));
}

export function normalizeResumeData(raw: unknown): ResumeData {
	const data = isRecord(raw) ? raw : {};
	const customSections = normalizeCustomSections(data.customSections);

	return {
		personal: normalizePersonal(data.personal),
		sectionTitles: normalizeSectionTitles(data.sectionTitles, customSections),
		sectionVisibility: normalizeSectionVisibility(
			data.sectionVisibility,
			customSections,
		),
		sectionOrder: normalizeSectionOrder(data.sectionOrder, customSections),
		skills: normalizeSkills(data.skills),
		experience: normalizeExperience(data.experience),
		projects: normalizeProjects(data.projects),
		education: normalizeEducation(data.education),
		awards: normalizeSectionEntries(data.awards, initialResumeState.awards),
		campus: normalizeSectionEntries(data.campus, initialResumeState.campus),
		other: readString(data.other, initialResumeState.other),
		customSections,
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
	return STANDARD_SECTION_KEYS.reduce(
		(result, key) => ({ ...result, [key]: visible }),
		{} as SectionIconVisibility,
	);
}

export function normalizeSectionIconVisibility(
	value: unknown,
	fallback: SectionIconVisibility,
): SectionIconVisibility {
	const raw = isRecord(value) ? value : {};

	const normalized = STANDARD_SECTION_KEYS.reduce(
		(result, key) => ({
			...result,
			[key]: typeof raw[key] === "boolean" ? raw[key] : fallback[key],
		}),
		{} as SectionIconVisibility,
	);

	for (const [key, rawValue] of Object.entries(raw)) {
		if (isCustomSectionKey(key) && typeof rawValue === "boolean") {
			normalized[key] = rawValue;
		}
	}

	return normalized;
}
