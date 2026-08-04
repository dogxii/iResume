import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { createResumeWorkspace } from "../domain/resumeWorkspace";
import { createResumeWorkspaceRepository } from "./resumeWorkspaceRepository";

describe("resume workspace repository", () => {
	it("persists and clears a workspace in IndexedDB", async () => {
		const repository = createResumeWorkspaceRepository(new IDBFactory());
		const workspace = createResumeWorkspace();
		workspace.library.documents[0].name = "Stored resume";

		await repository.save(workspace);
		const loaded = await repository.load();

		expect(loaded?.library.documents[0].name).toBe("Stored resume");

		await repository.clear();
		expect(await repository.load()).toBeNull();
	});
});
