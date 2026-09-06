import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TemplateResumePreview from "./components/TemplateResumePreview";
import { resolveResumeForCli, type ResolvedCliResume } from "./cli-api";
import "./index.css";

declare global {
	interface Window {
		__IRESUME_EXPORT_PAYLOAD__?: unknown;
	}
}

const root = document.getElementById("root");

if (!root) {
	throw new Error("Missing export root element");
}

type ExportState =
	| { status: "ready"; resolved: ResolvedCliResume }
	| { status: "error"; message: string };

const resolveExportState = (): ExportState => {
	try {
		const resolved = resolveResumeForCli(window.__IRESUME_EXPORT_PAYLOAD__);
		return { status: "ready", resolved };
	} catch (error) {
		return {
			status: "error",
			message: error instanceof Error ? error.message : "导出数据解析失败",
		};
	}
};

const exportState = resolveExportState();

if (exportState.status === "ready") {
	document.title = `${exportState.resolved.document.name || "resume"} - iResume Export`;
}

export function ExportPreview() {
	if (exportState.status === "ready") {
		const { resolved } = exportState;

		return (
			<main className="iresume-export-page">
				<TemplateResumePreview
					data={resolved.data}
					templateId={resolved.appearance.templateId}
					accentColor={resolved.appearance.accentColor}
					fontSizePt={resolved.appearance.fontSizePt}
					sectionTitleFontSizePx={resolved.appearance.sectionTitleFontSizePx}
					itemTitleFontSizePx={resolved.appearance.itemTitleFontSizePx}
					fontFamily={resolved.appearance.fontFamily}
					pageMarginMm={resolved.appearance.pageMarginMm}
					lineHeight={resolved.appearance.lineHeight}
					sectionSpacing={resolved.appearance.sectionSpacing}
					paragraphSpacingPx={resolved.appearance.paragraphSpacingPx}
					sectionIcons={resolved.appearance.sectionIcons}
					sectionPreferences={resolved.appearance.sectionPreferences}
					minPageCount={1}
				/>
				<div data-export-ready="true" hidden />
			</main>
		);
	}

	return (
		<main className="iresume-export-error" data-export-error={exportState.message}>
			<h1>iResume export failed</h1>
			<p>{exportState.message}</p>
		</main>
	);
}

createRoot(root).render(
	<StrictMode>
		<ExportPreview />
	</StrictMode>,
);
