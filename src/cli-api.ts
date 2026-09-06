import {
	createResumeBackup,
	normalizeResumeBackup,
	type ResumeBackup,
	type ImportedResumeBackup,
} from "./data/resumeBackup";
import {
	createResumeDocument,
	normalizeResumeDocument,
	normalizeResumeLibrary,
	type ResumeAppearance,
	type ResumeDocument,
} from "./data/resumeLibrary";
import { createResumeMarkdown } from "./data/resumeMarkdown";
import { normalizeResumeWorkspace } from "./domain/resumeWorkspace";
import { isRecord } from "./data/resumeData";
import type { ResumeData } from "./types/resume";

export interface ResolveResumeOptions {
	documentId?: string;
}

export interface ResolvedCliResume {
	document: ResumeDocument;
	data: ResumeData;
	appearance: ResumeAppearance;
	backup: ResumeBackup;
	markdown: string;
	sourceKind: "backup" | "local-resume" | "library" | "workspace";
}

const LOCAL_RESUME_KIND = "iresume.resume";
const LOCAL_WORKSPACE_KIND = "iresume.workspace";

const getImportedAppearance = (
	imported: ImportedResumeBackup,
): Partial<ResumeAppearance> => ({
	templateId: imported.templateId,
	accentColor: imported.accentColor,
	fontSizePt: imported.fontSizePt,
	sectionTitleFontSizePx: imported.sectionTitleFontSizePx,
	itemTitleFontSizePx: imported.itemTitleFontSizePx,
	pageMarginMm: imported.pageMarginMm,
	fontFamily: imported.fontFamily,
	lineHeight: imported.lineHeight,
	sectionSpacing: imported.sectionSpacing,
	paragraphSpacingPx: imported.paragraphSpacingPx,
	sectionIcons: imported.sectionIcons,
	sectionPreferences: imported.sectionPreferences,
});

const createResolvedResume = (
	document: ResumeDocument,
	sourceKind: ResolvedCliResume["sourceKind"],
): ResolvedCliResume => ({
	document,
	data: document.data,
	appearance: document.appearance,
	backup: createResumeBackup(document.data, document.appearance),
	markdown: createResumeMarkdown(document.data),
	sourceKind,
});

const selectDocument = (
	documents: ResumeDocument[],
	activeId: string | undefined,
	documentId: string | undefined,
) => {
	if (documents.length === 0) {
		throw new Error("没有找到可导出的简历");
	}

	if (documentId) {
		const matched = documents.find((document) => document.id === documentId);
		if (!matched) {
			throw new Error(`没有找到 document-id 为 ${documentId} 的简历`);
		}
		return matched;
	}

	return documents.find((document) => document.id === activeId) ?? documents[0];
};

const resolveLocalResumeFile = (raw: Record<string, unknown>) => {
	const imported = normalizeResumeBackup(isRecord(raw.backup) ? raw.backup : raw);
	const document = normalizeResumeDocument(
		{
			id: raw.id,
			name: raw.name,
			tags: raw.tags,
			version: raw.resumeVersion ?? raw.version,
			createdAt: raw.createdAt,
			updatedAt: raw.updatedAt,
			data: imported.data,
			appearance: getImportedAppearance(imported),
		},
		0,
	);

	return createResolvedResume(document, "local-resume");
};

const resolveSingleBackup = (raw: unknown) => {
	const imported = normalizeResumeBackup(raw);
	const document = createResumeDocument({
		data: imported.data,
		appearance: getImportedAppearance(imported),
	});

	return createResolvedResume(document, "backup");
};

export function resolveResumeForCli(
	raw: unknown,
	options: ResolveResumeOptions = {},
): ResolvedCliResume {
	if (isRecord(raw) && raw.kind === LOCAL_RESUME_KIND) {
		return resolveLocalResumeFile(raw);
	}

	if (isRecord(raw) && raw.kind === LOCAL_WORKSPACE_KIND) {
		throw new Error(
			"这是本地同步目录的工作区索引文件，请传入单份简历 JSON，而不是 iresume-workspace.json",
		);
	}

	if (isRecord(raw) && isRecord(raw.workspace)) {
		const workspace = normalizeResumeWorkspace(raw.workspace);
		const document = selectDocument(
			workspace.library.documents,
			workspace.library.activeId,
			options.documentId,
		);
		return createResolvedResume(document, "workspace");
	}

	if (isRecord(raw) && isRecord(raw.library)) {
		const workspace = normalizeResumeWorkspace(
			raw.version === 2
				? raw
				: { version: 2, library: raw.library, histories: {} },
		);
		const document = selectDocument(
			workspace.library.documents,
			workspace.library.activeId,
			options.documentId,
		);
		return createResolvedResume(document, "workspace");
	}

	if (isRecord(raw) && Array.isArray(raw.documents)) {
		const library = normalizeResumeLibrary(raw);
		const document = selectDocument(
			library.documents,
			library.activeId,
			options.documentId,
		);
		return createResolvedResume(document, "library");
	}

	return resolveSingleBackup(raw);
}

export const validateResumeJson = (
	raw: unknown,
	options?: ResolveResumeOptions,
) => {
	const resolved = resolveResumeForCli(raw, options);

	return {
		ok: true,
		sourceKind: resolved.sourceKind,
		document: {
			id: resolved.document.id,
			name: resolved.document.name,
			tags: resolved.document.tags,
			version: resolved.document.version,
			templateId: resolved.appearance.templateId,
		},
	};
};

export const normalizeResumeJson = (
	raw: unknown,
	options?: ResolveResumeOptions,
) => resolveResumeForCli(raw, options).backup;

export const exportResumeMarkdown = (
	raw: unknown,
	options?: ResolveResumeOptions,
) => resolveResumeForCli(raw, options).markdown;
