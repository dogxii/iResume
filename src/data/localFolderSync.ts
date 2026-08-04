import {
	createResumeDocument,
	normalizeResumeDocument,
	type ResumeDocument,
} from "./resumeLibrary";
import {
	readIdbRequestResult,
	waitForIdbTransaction,
} from "./indexedDb";
import {
	createResumeBackup,
	normalizeResumeBackup,
	type ResumeBackup,
} from "./resumeBackup";
import {
	normalizePreviewZoom,
	type PreviewZoom,
} from "./previewZoom";
import {
	normalizePreviewPageMode,
	type PreviewPageMode,
} from "./previewPageMode";
import {
	normalizeDocumentHistory,
	type DocumentHistory,
} from "./resumeHistory";
import { normalizeTemplateIdList } from "./templateConfigs";
import {
	RESUME_WORKSPACE_VERSION,
	normalizeResumeWorkspace,
	type ResumeWorkspace,
} from "../domain/resumeWorkspace";
import type { TemplateId } from "../types/template";

const DATABASE_NAME = "iresume-local-folder-sync";
const DATABASE_VERSION = 1;
const STORE_NAME = "handles";
const DIRECTORY_HANDLE_KEY = "directory";
const WORKSPACE_FILE_NAME = "iresume-workspace.json";
const WORKSPACE_KIND = "iresume.workspace";
const RESUME_KIND = "iresume.resume";

export type LocalFolderSyncStatus =
	| "idle"
	| "selecting"
	| "syncing"
	| "restoring";

export interface LocalFolderSyncViewState {
	connected: boolean;
	directoryName: string;
	lastDirection?: "push" | "pull";
	lastSyncedAt?: string;
	message: string | null;
	status: LocalFolderSyncStatus;
}

export interface LocalFolderSyncSettings {
	directoryName: string;
	lastDirection?: "push" | "pull";
	lastSyncedAt?: string;
}

export interface LocalFolderSyncSnapshot {
	workspace: ResumeWorkspace;
	favoriteTemplateIds: TemplateId[];
	previewZoom: PreviewZoom;
	previewPageMode: PreviewPageMode;
}

export interface LocalFolderSyncReadResult extends LocalFolderSyncSnapshot {
	exportedAt?: string;
	resumeCount: number;
}

interface LocalFolderWorkspaceFile {
	kind: typeof WORKSPACE_KIND;
	version: 1;
	exportedAt: string;
	activeId: string;
	documentOrder: string[];
	favoriteTemplateIds: TemplateId[];
	previewZoom: PreviewZoom;
	previewPageMode: PreviewPageMode;
}

interface LocalFolderResumeFile {
	kind: typeof RESUME_KIND;
	version: 1;
	id: string;
	name: string;
	tags: string[];
	resumeVersion: string;
	createdAt: string;
	updatedAt: string;
	backup: ResumeBackup;
	history?: DocumentHistory;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const openHandleDatabase = () =>
	new Promise<IDBDatabase>((resolve, reject) => {
		const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error("无法打开目录缓存"));
	});

export const pickLocalFolderSyncDirectory = async () => {
	if (
		!("showDirectoryPicker" in window) ||
		typeof window.showDirectoryPicker !== "function"
	) {
		throw new Error(
			"当前页面未开放本地目录选择能力，请确认使用支持 File System Access 的浏览器并通过 HTTPS 或 localhost 打开。",
		);
	}
	return window.showDirectoryPicker({ mode: "readwrite" });
};

export const verifyLocalFolderPermission = async (
	handle: FileSystemDirectoryHandle,
	mode: FileSystemPermissionMode = "readwrite",
) => {
	const descriptor = { mode };
	if (handle.queryPermission) {
		const state = await handle.queryPermission(descriptor);
		if (state === "granted") return true;
	}
	if (!handle.requestPermission) return true;
	return (await handle.requestPermission(descriptor)) === "granted";
};

export async function loadLocalFolderSyncDirectoryHandle() {
	if (typeof window === "undefined" || !window.indexedDB) return null;
	const database = await openHandleDatabase();
	const transaction = database.transaction(STORE_NAME, "readonly");
	const value = await readIdbRequestResult(
		transaction.objectStore(STORE_NAME).get(DIRECTORY_HANDLE_KEY),
	);
	return isDirectoryHandle(value) ? value : null;
}

export async function saveLocalFolderSyncDirectoryHandle(
	handle: FileSystemDirectoryHandle,
) {
	const database = await openHandleDatabase();
	const transaction = database.transaction(STORE_NAME, "readwrite");
	transaction.objectStore(STORE_NAME).put(handle, DIRECTORY_HANDLE_KEY);
	await waitForIdbTransaction(transaction);
}

export async function clearLocalFolderSyncDirectoryHandle() {
	const database = await openHandleDatabase();
	const transaction = database.transaction(STORE_NAME, "readwrite");
	transaction.objectStore(STORE_NAME).delete(DIRECTORY_HANDLE_KEY);
	await waitForIdbTransaction(transaction);
}

export async function writeLocalFolderSyncSnapshot(
	handle: FileSystemDirectoryHandle,
	snapshot: LocalFolderSyncSnapshot,
) {
	await ensureDirectoryPermission(handle, "readwrite");

	const exportedAt = new Date().toISOString();
	const currentFileNames = new Set<string>();

	for (const document of snapshot.workspace.library.documents) {
		const fileName = createResumeFileName(document);
		currentFileNames.add(fileName);
		await writeJsonFile(
			handle,
			fileName,
			createLocalFolderResumeFile(
				document,
				snapshot.workspace.histories[document.id],
			),
		);
	}

	await removeStaleResumeFiles(handle, currentFileNames);
	await writeJsonFile(handle, WORKSPACE_FILE_NAME, {
		kind: WORKSPACE_KIND,
		version: 1,
		exportedAt,
		activeId: snapshot.workspace.library.activeId,
		documentOrder: snapshot.workspace.library.documents.map(
			(document) => document.id,
		),
		favoriteTemplateIds: snapshot.favoriteTemplateIds,
		previewZoom: snapshot.previewZoom,
		previewPageMode: snapshot.previewPageMode,
	} satisfies LocalFolderWorkspaceFile);

	return {
		exportedAt,
		resumeCount: snapshot.workspace.library.documents.length,
	};
}

export async function readLocalFolderSyncSnapshot(
	handle: FileSystemDirectoryHandle,
): Promise<LocalFolderSyncReadResult> {
	await ensureDirectoryPermission(handle, "readwrite");

	const workspaceFile = await readOptionalJsonFile(handle, WORKSPACE_FILE_NAME);
	const metadata = normalizeWorkspaceFile(workspaceFile);
	const entries = await readResumeEntries(handle);
	if (entries.length === 0) {
		throw new Error("同步目录里没有找到单份简历 JSON");
	}

	const order = new Map(
		metadata.documentOrder.map((documentId, index) => [documentId, index]),
	);
	const sortedEntries = [...entries].sort((a, b) => {
		const aOrder = order.get(a.document.id) ?? Number.MAX_SAFE_INTEGER;
		const bOrder = order.get(b.document.id) ?? Number.MAX_SAFE_INTEGER;
		if (aOrder !== bOrder) return aOrder - bOrder;
		return (
			new Date(b.document.updatedAt).getTime() -
			new Date(a.document.updatedAt).getTime()
		);
	});
	const documents = sortedEntries.map((entry) => entry.document);
	const histories = Object.fromEntries(
		sortedEntries.map((entry) => [entry.document.id, entry.history]),
	);

	const workspace = normalizeResumeWorkspace({
		version: RESUME_WORKSPACE_VERSION,
		library: {
			version: 2,
			activeId: metadata.activeId,
			documents,
		},
		histories,
	});

	return {
		workspace,
		favoriteTemplateIds: metadata.favoriteTemplateIds,
		previewZoom: metadata.previewZoom,
		previewPageMode: metadata.previewPageMode,
		exportedAt: metadata.exportedAt,
		resumeCount: documents.length,
	};
}

const ensureDirectoryPermission = async (
	handle: FileSystemDirectoryHandle,
	mode: FileSystemPermissionMode,
) => {
	const granted = await verifyLocalFolderPermission(handle, mode);
	if (!granted) throw new Error("没有本地同步目录的读写权限");
};

const writeJsonFile = async (
	directory: FileSystemDirectoryHandle,
	fileName: string,
	value: unknown,
) => {
	const fileHandle = await directory.getFileHandle(fileName, { create: true });
	const writable = await fileHandle.createWritable();
	await writable.write(JSON.stringify(value, null, 2));
	await writable.close();
};

const readOptionalJsonFile = async (
	directory: FileSystemDirectoryHandle,
	fileName: string,
) => {
	try {
		const fileHandle = await directory.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		return JSON.parse(await file.text()) as unknown;
	} catch {
		return null;
	}
};

const iterateDirectoryFiles = async function* (
	directory: FileSystemDirectoryHandle,
) {
	if (directory.entries) {
		for await (const [fileName, entry] of directory.entries()) {
			yield [fileName, entry] as const;
		}
		return;
	}

	if (directory.values) {
		for await (const entry of directory.values()) {
			yield [entry.name, entry] as const;
		}
		return;
	}

	throw new Error("当前浏览器不支持读取同步目录内容");
};

const readResumeEntries = async (directory: FileSystemDirectoryHandle) => {
	const entries: { document: ResumeDocument; history: DocumentHistory }[] = [];
	let index = 0;

	for await (const [fileName, entry] of iterateDirectoryFiles(directory)) {
		if (
			entry.kind !== "file" ||
			fileName === WORKSPACE_FILE_NAME ||
			!fileName.endsWith(".json")
		) {
			continue;
		}
		try {
			const file = await (entry as FileSystemFileHandle).getFile();
			const parsed = JSON.parse(await file.text()) as unknown;
			const resumeEntry = normalizeResumeFile(parsed, index);
			entries.push(resumeEntry);
			index += 1;
		} catch (error) {
			console.warn(`Skipped invalid resume sync file: ${fileName}`, error);
		}
	}

	return entries;
};

const createLocalFolderResumeFile = (
	document: ResumeDocument,
	history?: DocumentHistory,
): LocalFolderResumeFile => ({
	kind: RESUME_KIND,
	version: 1,
	id: document.id,
	name: document.name,
	tags: document.tags,
	resumeVersion: document.version,
	createdAt: document.createdAt,
	updatedAt: document.updatedAt,
	backup: createResumeBackup(document.data, document.appearance),
	history,
});

const normalizeResumeFile = (value: unknown, index: number) => {
	if (isRecord(value) && value.kind === RESUME_KIND) {
		const rawBackup = isRecord(value.backup) ? value.backup : value;
		const imported = normalizeResumeBackup(rawBackup);
		const document = normalizeResumeDocument(
			{
				id: value.id,
				name: value.name,
				tags: value.tags,
				version: value.resumeVersion,
				createdAt: value.createdAt,
				updatedAt: value.updatedAt,
				data: imported.data,
				appearance: {
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
				},
			},
			index,
		);
		return {
			document,
			history: normalizeDocumentHistory(value.history),
		};
	}

	const imported = normalizeResumeBackup(value);
	const document = createResumeDocument({
		data: imported.data,
		appearance: {
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
		},
	});

	return {
		document,
		history: normalizeDocumentHistory(undefined),
	};
};

const normalizeWorkspaceFile = (value: unknown): LocalFolderWorkspaceFile => {
	const now = new Date().toISOString();
	if (!isRecord(value) || value.kind !== WORKSPACE_KIND) {
		return {
			kind: WORKSPACE_KIND,
			version: 1,
			exportedAt: now,
			activeId: "",
			documentOrder: [],
			favoriteTemplateIds: [],
			previewZoom: normalizePreviewZoom(undefined),
			previewPageMode: normalizePreviewPageMode(undefined),
		};
	}

	return {
		kind: WORKSPACE_KIND,
		version: 1,
		exportedAt:
			typeof value.exportedAt === "string" ? value.exportedAt : now,
		activeId: typeof value.activeId === "string" ? value.activeId : "",
		documentOrder: Array.isArray(value.documentOrder)
			? value.documentOrder.filter(
					(documentId): documentId is string =>
						typeof documentId === "string",
				)
			: [],
		favoriteTemplateIds: normalizeTemplateIdList(value.favoriteTemplateIds),
		previewZoom: normalizePreviewZoom(value.previewZoom),
		previewPageMode: normalizePreviewPageMode(value.previewPageMode),
	};
};

const removeStaleResumeFiles = async (
	directory: FileSystemDirectoryHandle,
	currentFileNames: Set<string>,
) => {
	for await (const [fileName, entry] of iterateDirectoryFiles(directory)) {
		if (
			entry.kind !== "file" ||
			!fileName.endsWith(".json") ||
			currentFileNames.has(fileName)
		) {
			continue;
		}
		const parsed = await readOptionalJsonFile(directory, fileName);
		if (isRecord(parsed) && parsed.kind === RESUME_KIND) {
			await directory.removeEntry(fileName);
		}
	}
};

const createResumeFileName = (document: ResumeDocument) => {
	const name = sanitizeFileNamePart(document.name) || "resume";
	return `resume-${name}-${document.id}.json`;
};

const sanitizeFileNamePart = (value: string) =>
	value
		.replace(/[\\/:*?"<>|]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 64);

const isDirectoryHandle = (
	value: unknown,
): value is FileSystemDirectoryHandle =>
	isRecord(value) &&
	value.kind === "directory" &&
	typeof value.name === "string" &&
	typeof value.getFileHandle === "function";
