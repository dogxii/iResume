import { describe, expect, it } from "vitest";
import { addSnapshot, createDocumentHistory } from "../data/resumeHistory";
import { createResumeDocument, createResumeLibrary } from "../data/resumeLibrary";
import {
	RESUME_WORKSPACE_VERSION,
	createResumeWorkspace,
	normalizeResumeWorkspace,
} from "./resumeWorkspace";

describe("resume workspace", () => {
	it("creates an isolated version 2 workspace", () => {
		const workspace = createResumeWorkspace();

		expect(workspace.version).toBe(RESUME_WORKSPACE_VERSION);
		expect(workspace.library.version).toBe(2);
		expect(workspace.library.documents).toHaveLength(1);
		expect(workspace.histories).toEqual({});
	});

	it("keeps histories only for documents in the library", () => {
		const document = createResumeDocument({ name: "Frontend" });
		const history = addSnapshot(
			createDocumentHistory(),
			document,
			"initial",
			"1.0.0",
		);
		const normalized = normalizeResumeWorkspace({
			version: 2,
			library: createResumeLibrary([document], document.id),
			histories: {
				[document.id]: history,
				missing: history,
			},
		});

		expect(Object.keys(normalized.histories)).toEqual([document.id]);
		expect(normalized.histories[document.id]?.snapshots).toHaveLength(1);
	});

	it("starts fresh when the persisted schema is not version 2", () => {
		const normalized = normalizeResumeWorkspace({ version: 1 });

		expect(normalized.version).toBe(2);
		expect(normalized.library.documents).toHaveLength(1);
	});
});
