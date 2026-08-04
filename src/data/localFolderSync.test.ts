import { describe, expect, it } from "vitest";
import { createResumeWorkspace } from "../domain/resumeWorkspace";
import {
	createResumeDocument,
	createResumeLibrary,
} from "./resumeLibrary";
import {
	readLocalFolderSyncSnapshot,
	writeLocalFolderSyncSnapshot,
} from "./localFolderSync";

class FakeFileHandle {
	readonly kind = "file";
	readonly name: string;
	content = "";

	constructor(name: string) {
		this.name = name;
	}

	async getFile() {
		return new File([this.content], this.name, {
			type: "application/json",
		});
	}

	async createWritable() {
		return {
			write: async (data: string) => {
				this.content = data;
			},
			close: async () => {},
		} as unknown as FileSystemWritableFileStream;
	}
}

class FakeDirectoryHandle {
	readonly kind = "directory";
	readonly name: string;
	readonly files = new Map<string, FakeFileHandle>();

	constructor(name: string) {
		this.name = name;
	}

	async getFileHandle(name: string, options?: FileSystemGetFileOptions) {
		const existing = this.files.get(name);
		if (existing) return existing;
		if (!options?.create) throw new Error("File not found");
		const next = new FakeFileHandle(name);
		this.files.set(name, next);
		return next;
	}

	async removeEntry(name: string) {
		this.files.delete(name);
	}

	async queryPermission() {
		return "granted" as PermissionState;
	}

	async *entries(): AsyncIterableIterator<[string, FileSystemHandle]> {
		for (const [name, entry] of this.files.entries()) {
			yield [name, entry as unknown as FileSystemHandle];
		}
	}
}

class FakeValuesOnlyDirectoryHandle {
	readonly kind = "directory";
	readonly name: string;
	readonly files = new Map<string, FakeFileHandle>();

	constructor(name: string) {
		this.name = name;
	}

	async getFileHandle(name: string, options?: FileSystemGetFileOptions) {
		const existing = this.files.get(name);
		if (existing) return existing;
		if (!options?.create) throw new Error("File not found");
		const next = new FakeFileHandle(name);
		this.files.set(name, next);
		return next;
	}

	async removeEntry(name: string) {
		this.files.delete(name);
	}

	async queryPermission() {
		return "granted" as PermissionState;
	}

	async *values(): AsyncIterableIterator<FileSystemHandle> {
		for (const entry of this.files.values()) {
			yield entry as unknown as FileSystemHandle;
		}
	}
}

describe("local folder sync", () => {
	it("writes one JSON per resume and restores the workspace", async () => {
		const first = createResumeDocument({ name: "Frontend Resume" });
		const second = createResumeDocument({ name: "Intern Resume" });
		const workspace = createResumeWorkspace(
			createResumeLibrary([first, second], second.id),
		);
		const directory = new FakeDirectoryHandle(
			"iResume Sync",
		) as unknown as FileSystemDirectoryHandle;

		await writeLocalFolderSyncSnapshot(directory, {
			workspace,
			favoriteTemplateIds: ["classic"],
			previewZoom: 0.75,
			previewPageMode: "paged",
		});

		const fileNames = Array.from(
			(directory as unknown as FakeDirectoryHandle).files.keys(),
		);
		expect(fileNames).toContain("iresume-workspace.json");
		expect(fileNames.filter((name) => name.startsWith("resume-"))).toHaveLength(2);

		const restored = await readLocalFolderSyncSnapshot(directory);
		expect(restored.workspace.library.activeId).toBe(second.id);
		expect(restored.workspace.library.documents.map((doc) => doc.id)).toEqual([
			first.id,
			second.id,
		]);
		expect(restored.favoriteTemplateIds).toEqual(["classic"]);
		expect(restored.previewPageMode).toBe("paged");
	});

	it("reads directories that expose values without entries", async () => {
		const document = createResumeDocument({ name: "Values API Resume" });
		const workspace = createResumeWorkspace(createResumeLibrary([document]));
		const directory = new FakeValuesOnlyDirectoryHandle(
			"iResume Sync",
		) as unknown as FileSystemDirectoryHandle;

		await writeLocalFolderSyncSnapshot(directory, {
			workspace,
			favoriteTemplateIds: [],
			previewZoom: 0.75,
			previewPageMode: "continuous",
		});

		const restored = await readLocalFolderSyncSnapshot(directory);
		expect(restored.workspace.library.documents[0]?.name).toBe(
			"Values API Resume",
		);
		expect(restored.resumeCount).toBe(1);
	});
});
