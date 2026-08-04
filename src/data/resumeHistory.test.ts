import { describe, expect, it } from "vitest";
import { createResumeDocument } from "./resumeLibrary";
import {
	addSnapshot,
	createDocumentHistory,
	createSnapshotDiff,
} from "./resumeHistory";

describe("resume history", () => {
	it("captures appearance together with resume content", () => {
		const document = createResumeDocument();
		const history = addSnapshot(
			createDocumentHistory(),
			document,
			"before",
			"1.0.0",
		);

		document.appearance.accentColor = "#ef4444";

		expect(history.snapshots[0].document.appearance.accentColor).not.toBe(
			"#ef4444",
		);
	});

	it("reports appearance changes between snapshots", () => {
		const before = createResumeDocument();
		const after = structuredClone(before);
		after.appearance.accentColor = "#ef4444";

		let history = addSnapshot(
			createDocumentHistory(),
			before,
			"before",
			"1.0.0",
		);
		history = addSnapshot(history, after, "after", "1.0.1");

		const diff = createSnapshotDiff(
			history.snapshots[0],
			history.snapshots[1],
		);

		expect(diff.changes).toContainEqual(
			expect.objectContaining({ scope: "外观", title: "调整主题色" }),
		);
	});
});
