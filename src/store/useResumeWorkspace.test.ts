import { describe, expect, it } from "vitest";
import {
	createResumeWorkspaceRuntimeState,
	resumeWorkspaceReducer,
} from "./useResumeWorkspace";

describe("resume workspace undo history", () => {
	it("coalesces consecutive edits from the same field group", () => {
		let state = resumeWorkspaceReducer(createResumeWorkspaceRuntimeState(), {
			type: "hydrate",
			workspace: null,
		});
		const originalName = state.workspace.library.documents[0].name;
		const updateName = (name: string) =>
			(state = resumeWorkspaceReducer(state, {
				type: "set-library",
				groupKey: "resume-1:metadata",
				at: name.length * 100,
				updater: (library) => ({
					...library,
					documents: library.documents.map((document, index) =>
						index === 0 ? { ...document, name } : document,
					),
				}),
			}));

		updateName("N");
		updateName("New name");
		state = resumeWorkspaceReducer(state, { type: "undo" });

		expect(state.workspace.library.documents[0].name).toBe(originalName);
	});

	it("restores an undone edit with redo", () => {
		let state = resumeWorkspaceReducer(createResumeWorkspaceRuntimeState(), {
			type: "hydrate",
			workspace: null,
		});
		state = resumeWorkspaceReducer(state, {
			type: "set-library",
			at: 1,
			updater: (library) => ({ ...library, activeId: "changed" }),
		});
		state = resumeWorkspaceReducer(state, { type: "undo" });
		state = resumeWorkspaceReducer(state, { type: "redo" });

		expect(state.workspace.library.activeId).toBe("changed");
	});
});
