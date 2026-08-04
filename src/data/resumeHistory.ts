import { STANDARD_SECTION_KEYS, normalizeResumeData } from "./resumeData";
import {
	normalizeResumeAppearance,
	type ResumeAppearance,
	type ResumeDocument,
} from "./resumeLibrary";
import type { CustomSection, ResumeData, StandardSectionKey } from "../types/resume";

export interface HistorySnapshotDocument {
	data: ResumeData;
	appearance: ResumeAppearance;
}

export interface HistorySnapshot {
	id: string;
	label: string;
	version: string;
	createdAt: string;
	document: HistorySnapshotDocument;
}

export interface DocumentHistory {
	snapshots: HistorySnapshot[];
}

const DEFAULT_VERSION = "1.0.0";
export const DEFAULT_SNAPSHOT_LABEL = "手动保存";
export const MAX_HISTORY_SNAPSHOTS = 50;

export type SnapshotChangeKind = "added" | "removed" | "changed" | "moved";

export interface SnapshotChange {
	kind: SnapshotChangeKind;
	scope: string;
	title: string;
	detail?: string;
	before?: string;
	after?: string;
}

export interface SnapshotDiffStats {
	added: number;
	removed: number;
	changed: number;
}

export interface SnapshotDiff {
	baseVersion?: string;
	targetVersion: string;
	changes: SnapshotChange[];
	stats: SnapshotDiffStats;
}

const createSnapshotId = () =>
	`snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createDocumentHistory(): DocumentHistory {
	return { snapshots: [] };
}

const parseSemver = (
	version: string,
): [number, number, number] | null => {
	const parts = version.split(".").map((part) => Number(part));
	if (
		parts.length !== 3 ||
		parts.some((part) => !Number.isInteger(part) || part < 0)
	) {
		return null;
	}
	return parts as [number, number, number];
};

const formatSemver = (semver: [number, number, number]): string =>
	`${semver[0]}.${semver[1]}.${semver[2]}`;

const compareSemver = (
	a: string,
	b: string,
): number => {
	const pa = parseSemver(a);
	const pb = parseSemver(b);
	if (!pa && !pb) return 0;
	if (!pa) return -1;
	if (!pb) return 1;
	if (pa[0] !== pb[0]) return pa[0] - pb[0];
	if (pa[1] !== pb[1]) return pa[1] - pb[1];
	return pa[2] - pb[2];
};

const incrementMinorVersion = (version: string): string => {
	const semver = parseSemver(version);
	if (!semver) return DEFAULT_VERSION;
	return formatSemver([semver[0], semver[1] + 1, 0]);
};

const incrementPatchVersion = (version: string): string => {
	const semver = parseSemver(version);
	if (!semver) return DEFAULT_VERSION;
	return formatSemver([semver[0], semver[1], semver[2] + 1]);
};

export type VersionBump = "minor" | "patch";

export const computeNextVersion = (
	currentVersion: string,
	latestSnapshotVersion: string | undefined,
	bump: VersionBump,
): string => {
	const base = latestSnapshotVersion ?? currentVersion;
	const next =
		bump === "minor"
			? incrementMinorVersion(base)
			: incrementPatchVersion(base);

	if (compareSemver(next, currentVersion) <= 0) {
		return bump === "minor"
			? incrementMinorVersion(currentVersion)
			: incrementPatchVersion(currentVersion);
	}

	return next;
};

export function addSnapshot(
	history: DocumentHistory,
	document: ResumeDocument,
	label: string,
	version: string,
): DocumentHistory {
	const snapshot: HistorySnapshot = {
		id: createSnapshotId(),
		label,
		version,
		createdAt: new Date().toISOString(),
		document: structuredClone({
			data: document.data,
			appearance: document.appearance,
		}),
	};

	const snapshots = [snapshot, ...history.snapshots].slice(
		0,
		MAX_HISTORY_SNAPSHOTS,
	);

	return { ...history, snapshots };
}

export function removeSnapshot(
	history: DocumentHistory,
	snapshotId: string,
): DocumentHistory {
	return {
		...history,
		snapshots: history.snapshots.filter((s) => s.id !== snapshotId),
	};
}

export function renameSnapshot(
	history: DocumentHistory,
	snapshotId: string,
	label: string,
): DocumentHistory {
	return {
		...history,
		snapshots: history.snapshots.map((s) =>
			s.id === snapshotId ? { ...s, label } : s,
		),
	};
}

export function getLatestSnapshotVersion(
	history: DocumentHistory,
): string | undefined {
	return history.snapshots[0]?.version;
}

export function normalizeDocumentHistory(value: unknown): DocumentHistory {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return createDocumentHistory();
	}

	const raw = value as Record<string, unknown>;
	if (!Array.isArray(raw.snapshots)) return createDocumentHistory();

	const snapshots: HistorySnapshot[] = raw.snapshots
		.filter(
			(item): item is Record<string, unknown> =>
				typeof item === "object" && item !== null && !Array.isArray(item),
		)
		.filter(
			(item) =>
				typeof item.document === "object" && item.document !== null,
		)
		.map((item) => {
			const document = item.document as Record<string, unknown>;
			return {
				id:
					typeof item.id === "string" && item.id.trim()
						? item.id
						: createSnapshotId(),
				label:
					typeof item.label === "string" && item.label.trim()
						? item.label.trim()
						: DEFAULT_SNAPSHOT_LABEL,
				version:
					typeof item.version === "string" && item.version.trim()
						? item.version.trim()
						: DEFAULT_VERSION,
				createdAt:
					typeof item.createdAt === "string" &&
					Number.isFinite(new Date(item.createdAt).getTime())
						? item.createdAt
						: new Date().toISOString(),
				document: {
					data: normalizeResumeData(document.data),
					appearance: normalizeResumeAppearance(document.appearance),
				},
			};
		})
		.slice(0, MAX_HISTORY_SNAPSHOTS);

	return { snapshots };
}

const SECTION_KEYS = STANDARD_SECTION_KEYS;

const SECTION_LABELS: Record<StandardSectionKey, string> = {
	skills: "专业技能",
	experience: "工作经历",
	projects: "项目经历",
	education: "教育背景",
	awards: "获奖经历",
	campus: "校园经历",
	other: "自我评价",
};

const compactText = (value: string, maxLength = 72): string => {
	const normalized = value.replace(/\s+/g, " ").trim();
	if (!normalized) return "空";
	if (normalized.length <= maxLength) return normalized;
	return `${normalized.slice(0, maxLength - 3)}...`;
};

const textValue = (value: unknown): string => String(value ?? "").trim();

const quoted = (value: string, fallback: string): string => {
	const normalized = compactText(value, 28);
	return normalized === "空" ? fallback : `「${normalized}」`;
};

const createStats = (changes: SnapshotChange[]): SnapshotDiffStats => ({
	added: changes.filter((change) => change.kind === "added").length,
	removed: changes.filter((change) => change.kind === "removed").length,
	changed: changes.filter(
		(change) => change.kind === "changed" || change.kind === "moved",
	).length,
});

const collectChangedFields = <T extends object>(
	before: T,
	after: T,
	fields: readonly { key: keyof T; label: string }[],
): string[] =>
	fields
		.filter(({ key }) => textValue(before[key]) !== textValue(after[key]))
		.map(({ label }) => label);

const pushFieldGroupChange = <T extends object>(
	changes: SnapshotChange[],
	scope: string,
	title: string,
	before: T,
	after: T,
	fields: readonly { key: keyof T; label: string }[],
) => {
	const changedFields = fields.filter(
		({ key }) => textValue(before[key]) !== textValue(after[key]),
	);
	if (changedFields.length === 0) return;

	if (changedFields.length === 1) {
		const [{ key, label }] = changedFields;
		const beforeText = textValue(before[key]);
		const afterText = textValue(after[key]);

		changes.push({
			kind:
				beforeText && !afterText
					? "removed"
					: !beforeText && afterText
						? "added"
						: "changed",
			scope,
			title: `${title}：${label}`,
			before: compactText(beforeText),
			after: compactText(afterText),
		});
		return;
	}

	changes.push({
		kind: "changed",
		scope,
		title,
		detail: changedFields.map(({ label }) => label).join("、"),
	});
};

const pushTextChange = (
	changes: SnapshotChange[],
	scope: string,
	title: string,
	before: string,
	after: string,
) => {
	if (before === after) return;

	changes.push({
		kind: before && !after ? "removed" : !before && after ? "added" : "changed",
		scope,
		title,
		before: compactText(before),
		after: compactText(after),
	});
};

const diffItemCollection = <T extends { id: number }>(
	changes: SnapshotChange[],
	scope: string,
	itemLabel: string,
	beforeItems: T[],
	afterItems: T[],
	getName: (item: T) => string,
	fields: readonly { key: keyof T; label: string }[],
) => {
	const beforeById = new Map(beforeItems.map((item) => [item.id, item]));
	const afterById = new Map(afterItems.map((item) => [item.id, item]));

	for (const beforeItem of beforeItems) {
		if (afterById.has(beforeItem.id)) continue;

		changes.push({
			kind: "removed",
			scope,
			title: `删除${itemLabel}${quoted(getName(beforeItem), ` #${beforeItem.id}`)}`,
		});
	}

	for (const afterItem of afterItems) {
		const beforeItem = beforeById.get(afterItem.id);
		if (!beforeItem) {
			changes.push({
				kind: "added",
				scope,
				title: `新增${itemLabel}${quoted(getName(afterItem), ` #${afterItem.id}`)}`,
			});
			continue;
		}

		const changedFields = collectChangedFields(beforeItem, afterItem, fields);
		if (changedFields.length > 0) {
			changes.push({
				kind: "changed",
				scope,
				title: `更新${itemLabel}${quoted(
					getName(afterItem) || getName(beforeItem),
					` #${afterItem.id}`,
				)}`,
				detail: changedFields.join("、"),
			});
		}
	}

	const afterIds = new Set(afterItems.map((item) => item.id));
	const beforeCommonOrder = beforeItems
		.filter((item) => afterIds.has(item.id))
		.map((item) => item.id)
		.join(",");
	const afterCommonOrder = afterItems
		.filter((item) => beforeById.has(item.id))
		.map((item) => item.id)
		.join(",");

	if (
		beforeCommonOrder &&
		afterCommonOrder &&
		beforeCommonOrder !== afterCommonOrder
	) {
		changes.push({
			kind: "moved",
			scope,
			title: `调整${scope}顺序`,
		});
	}
};

const getCustomSectionTitle = (data: ResumeData, section: CustomSection) =>
	data.sectionTitles[section.id]?.trim() ||
	section.title.trim() ||
	"自定义区块";

const diffCustomSections = (
	changes: SnapshotChange[],
	before: ResumeData,
	after: ResumeData,
) => {
	const beforeById = new Map(
		before.customSections.map((section) => [section.id, section]),
	);
	const afterById = new Map(
		after.customSections.map((section) => [section.id, section]),
	);

	for (const section of before.customSections) {
		if (afterById.has(section.id)) continue;
		changes.push({
			kind: "removed",
			scope: "自定义区块",
			title: `删除${quoted(getCustomSectionTitle(before, section), "自定义区块")}`,
		});
	}

	for (const section of after.customSections) {
		const beforeSection = beforeById.get(section.id);
		if (!beforeSection) {
			changes.push({
				kind: "added",
				scope: "自定义区块",
				title: `新增${quoted(getCustomSectionTitle(after, section), "自定义区块")}`,
			});
			continue;
		}

		const beforeTitle = getCustomSectionTitle(before, beforeSection);
		const afterTitle = getCustomSectionTitle(after, section);
		if (beforeTitle !== afterTitle) {
			changes.push({
				kind: "changed",
				scope: "自定义区块",
				title: "重命名自定义区块",
				before: beforeTitle,
				after: afterTitle,
			});
		}

		if (textValue(beforeSection.content) !== textValue(section.content)) {
			changes.push({
				kind: "changed",
				scope: "自定义区块",
				title: `更新${quoted(afterTitle, "自定义区块")}`,
				before: compactText(beforeSection.content),
				after: compactText(section.content),
			});
		}

		const beforeVisible = before.sectionVisibility[section.id] !== false;
		const afterVisible = after.sectionVisibility[section.id] !== false;
		if (beforeVisible !== afterVisible) {
			changes.push({
				kind: "changed",
				scope: "自定义区块",
				title: `${afterVisible ? "显示" : "隐藏"}${quoted(
					afterTitle,
					"自定义区块",
				)}`,
			});
		}
	}
};

const diffResumeData = (before: ResumeData, after: ResumeData): SnapshotChange[] => {
	const changes: SnapshotChange[] = [];

	pushFieldGroupChange(changes, "个人信息", "更新个人信息", before.personal, after.personal, [
		{ key: "name", label: "姓名" },
		{ key: "title", label: "头衔" },
		{ key: "photoUrl", label: "头像" },
		{ key: "phone", label: "电话" },
		{ key: "email", label: "邮箱" },
		{ key: "location", label: "地点" },
		{ key: "availability", label: "状态" },
		{ key: "github", label: "GitHub" },
		{ key: "website", label: "网站" },
	]);

	pushFieldGroupChange(
		changes,
		"区块标题",
		"重命名区块标题",
		before.sectionTitles,
		after.sectionTitles,
		SECTION_KEYS.map((key) => ({ key, label: SECTION_LABELS[key] })),
	);

	const visibilityChanges = SECTION_KEYS.filter(
		(key) => before.sectionVisibility[key] !== after.sectionVisibility[key],
	).map((key) => `${after.sectionVisibility[key] ? "显示" : "隐藏"}${SECTION_LABELS[key]}`);

	if (visibilityChanges.length > 0) {
		changes.push({
			kind: "changed",
			scope: "区块",
			title: "调整显示区块",
			detail: visibilityChanges.join("、"),
		});
	}

	diffCustomSections(changes, before, after);

	if (before.sectionOrder.join(",") !== after.sectionOrder.join(",")) {
		changes.push({
			kind: "moved",
			scope: "区块",
			title: "调整区块顺序",
		});
	}

	diffItemCollection(
		changes,
		SECTION_LABELS.skills,
		"技能",
		before.skills,
		after.skills,
		(item) => textValue(item.label),
		[
			{ key: "label", label: "分类" },
			{ key: "content", label: "内容" },
		],
	);

	diffItemCollection(
		changes,
		SECTION_LABELS.experience,
		"经历",
		before.experience,
		after.experience,
		(item) => textValue(item.company) || textValue(item.role),
		[
			{ key: "company", label: "公司" },
			{ key: "role", label: "职位" },
			{ key: "date", label: "时间" },
			{ key: "details", label: "描述" },
		],
	);

	diffItemCollection(
		changes,
		SECTION_LABELS.projects,
		"项目",
		before.projects,
		after.projects,
		(item) => textValue(item.name),
		[
			{ key: "name", label: "名称" },
			{ key: "date", label: "时间" },
			{ key: "tags", label: "标签" },
			{ key: "link", label: "链接" },
			{ key: "source", label: "源码" },
			{ key: "description", label: "描述" },
		],
	);

	diffItemCollection(
		changes,
		SECTION_LABELS.education,
		"教育",
		before.education,
		after.education,
		(item) => textValue(item.school) || textValue(item.degree),
		[
			{ key: "school", label: "学校" },
			{ key: "degree", label: "学历" },
			{ key: "date", label: "时间" },
		],
	);

	const sectionEntryFields = [
		{ key: "title", label: "标题" },
		{ key: "subtitle", label: "副标题" },
		{ key: "date", label: "时间" },
		{ key: "details", label: "描述" },
	] as const;

	diffItemCollection(
		changes,
		SECTION_LABELS.awards,
		"条目",
		before.awards,
		after.awards,
		(item) => textValue(item.title) || textValue(item.subtitle),
		sectionEntryFields,
	);

	diffItemCollection(
		changes,
		SECTION_LABELS.campus,
		"条目",
		before.campus,
		after.campus,
		(item) => textValue(item.title) || textValue(item.subtitle),
		sectionEntryFields,
	);

	pushTextChange(
		changes,
		SECTION_LABELS.other,
		"更新自我评价",
		textValue(before.other),
		textValue(after.other),
	);

	return changes;
};

const diffResumeAppearance = (
	before: ResumeAppearance,
	after: ResumeAppearance,
): SnapshotChange[] => {
	const changes: SnapshotChange[] = [];
	const fields: {
		label: string;
		before: string | number;
		after: string | number;
	}[] = [
		{ label: "布局", before: before.templateId, after: after.templateId },
		{ label: "主题色", before: before.accentColor, after: after.accentColor },
		{ label: "字体", before: before.fontFamily, after: after.fontFamily },
		{ label: "字号", before: before.fontSizePt, after: after.fontSizePt },
		{
			label: "模块标题字号",
			before: before.sectionTitleFontSizePx,
			after: after.sectionTitleFontSizePx,
		},
		{
			label: "一级标题字号",
			before: before.itemTitleFontSizePx,
			after: after.itemTitleFontSizePx,
		},
		{ label: "行高", before: before.lineHeight, after: after.lineHeight },
		{
			label: "模块间距",
			before: before.sectionSpacing,
			after: after.sectionSpacing,
		},
		{
			label: "段落间距",
			before: before.paragraphSpacingPx,
			after: after.paragraphSpacingPx,
		},
		{
			label: "页边距",
			before: before.pageMarginMm,
			after: after.pageMarginMm,
		},
	];

	for (const field of fields) {
		if (field.before === field.after) continue;
		changes.push({
			kind: "changed",
			scope: "外观",
			title: `调整${field.label}`,
			before: String(field.before),
			after: String(field.after),
		});
	}

	if (JSON.stringify(before.sectionIcons) !== JSON.stringify(after.sectionIcons)) {
		changes.push({
			kind: "changed",
			scope: "外观",
			title: "调整区块图标",
		});
	}

	if (
		JSON.stringify(before.sectionPreferences) !==
		JSON.stringify(after.sectionPreferences)
	) {
		changes.push({
			kind: "changed",
			scope: "外观",
			title: "调整显示偏好",
		});
	}

	return changes;
};

export function createSnapshotDiff(
	snapshot: HistorySnapshot,
	previousSnapshot?: HistorySnapshot,
): SnapshotDiff {
	const changes = previousSnapshot
		? [
				...diffResumeData(
					previousSnapshot.document.data,
					snapshot.document.data,
				),
				...diffResumeAppearance(
					previousSnapshot.document.appearance,
					snapshot.document.appearance,
				),
			]
		: [];

	return {
		baseVersion: previousSnapshot?.version,
		targetVersion: snapshot.version,
		changes,
		stats: createStats(changes),
	};
}

export function formatSnapshotDiffSummary(diff: SnapshotDiff): string {
	if (!diff.baseVersion) return "首个快照";
	if (diff.changes.length === 0) return "无内容变化";

	const scopes = Array.from(new Set(diff.changes.map((change) => change.scope))).slice(
		0,
		2,
	);
	const suffix = diff.changes.length > 1 ? `${diff.changes.length} 项` : "1 项";
	return `${scopes.join("、")} · ${suffix}`;
}
