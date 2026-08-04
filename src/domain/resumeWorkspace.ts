import {
	createResumeLibrary,
	normalizeResumeLibrary,
	type ResumeLibrary,
} from "../data/resumeLibrary";
import {
	normalizeDocumentHistory,
	type DocumentHistory,
} from "../data/resumeHistory";

export const RESUME_WORKSPACE_VERSION = 2 as const;

export interface ResumeWorkspace {
	version: typeof RESUME_WORKSPACE_VERSION;
	library: ResumeLibrary;
	histories: Record<string, DocumentHistory>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export function createResumeWorkspace(
	library: ResumeLibrary = createResumeLibrary(),
): ResumeWorkspace {
	return {
		version: RESUME_WORKSPACE_VERSION,
		library,
		histories: {},
	};
}

export function normalizeResumeWorkspace(value: unknown): ResumeWorkspace {
	if (!isRecord(value) || value.version !== RESUME_WORKSPACE_VERSION) {
		return createResumeWorkspace();
	}

	const library = normalizeResumeLibrary(value.library);
	const rawHistories = isRecord(value.histories) ? value.histories : {};
	const documentIds = new Set(library.documents.map((document) => document.id));
	const histories = Object.fromEntries(
		Object.entries(rawHistories)
			.filter(([documentId]) => documentIds.has(documentId))
			.map(([documentId, history]) => [
				documentId,
				normalizeDocumentHistory(history),
			]),
	);

	return {
		version: RESUME_WORKSPACE_VERSION,
		library,
		histories,
	};
}
