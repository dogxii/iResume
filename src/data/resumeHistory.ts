import type { ResumeData } from "../types/resume";

export interface HistorySnapshot {
	id: string;
	label: string;
	version: string;
	createdAt: string;
	data: ResumeData;
}

export interface DocumentHistory {
	snapshots: HistorySnapshot[];
}

const MAX_SNAPSHOTS = 50;
const DEFAULT_VERSION = "1.0.0";

const createSnapshotId = () =>
	`snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createDocumentHistory(): DocumentHistory {
	return { snapshots: [] };
}

export const parseSemver = (
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

export const formatSemver = (semver: [number, number, number]): string =>
	`${semver[0]}.${semver[1]}.${semver[2]}`;

export const compareSemver = (
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

export const incrementMinorVersion = (version: string): string => {
	const semver = parseSemver(version);
	if (!semver) return DEFAULT_VERSION;
	return formatSemver([semver[0], semver[1] + 1, 0]);
};

export const incrementPatchVersion = (version: string): string => {
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
	data: ResumeData,
	label: string,
	version: string,
): DocumentHistory {
	const snapshot: HistorySnapshot = {
		id: createSnapshotId(),
		label,
		version,
		createdAt: new Date().toISOString(),
		data,
	};

	const snapshots = [snapshot, ...history.snapshots].slice(0, MAX_SNAPSHOTS);

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
		.map((item) => ({
			id:
				typeof item.id === "string" && item.id.trim()
					? item.id
					: createSnapshotId(),
			label: typeof item.label === "string" ? item.label.trim() : "未命名快照",
			version:
				typeof item.version === "string" && item.version.trim()
					? item.version.trim()
					: DEFAULT_VERSION,
			createdAt:
				typeof item.createdAt === "string" &&
				Number.isFinite(new Date(item.createdAt).getTime())
					? item.createdAt
					: new Date().toISOString(),
			data:
				typeof item.data === "object" && item.data !== null
					? (item.data as ResumeData)
					: (undefined as unknown as ResumeData),
		}))
		.filter((item) => item.data !== undefined)
		.slice(0, MAX_SNAPSHOTS);

	return { snapshots };
}

export function getSnapshotSummary(data: ResumeData): string {
	const parts: string[] = [];
	if (data.personal.name.trim()) parts.push(data.personal.name.trim());
	const visibleCount = data.sectionOrder.filter(
		(key) => data.sectionVisibility[key],
	).length;
	parts.push(`${visibleCount} 个区块`);
	return parts.join(" · ");
}
