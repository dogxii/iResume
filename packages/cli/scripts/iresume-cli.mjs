#!/usr/bin/env node
import { createServer as createHttpServer } from "node:http";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const builtApiPath = path.join(packageRoot, "dist", "api", "cli-api.mjs");
const builtExportDir = path.join(packageRoot, "dist", "render");

const helpText = `
iResume CLI

Usage:
  iresume validate <resume.json> [--document-id id] [--json]
  iresume normalize <resume.json> [--out normalized.json]
  iresume markdown <resume.json> [--out resume.md]
  iresume export <resume.json> --out ./export --format pdf,png
  iresume preview <resume.json> --out ./export

Options:
  --input <file>          Use a named input path instead of the positional path.
  --out <path>            Output file or directory, depending on the command.
  --format <list>         Comma-separated export formats: pdf,png,markdown,json.
  --filename <name>       Base filename for export outputs. Defaults to resume.
  --document-id <id>      Select a document from a library/workspace JSON.
  --report / --no-report  Write export report.json. Enabled for export by default.
  --scale <number>        PNG device scale factor. Defaults to 2.
  --timeout <ms>          Browser render timeout. Defaults to 30000.
`;

const exportFormats = new Set(["pdf", "png", "markdown", "json"]);

const camelCase = (value) =>
	value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

const parseArgs = (argv) => {
	const [rawCommand, ...rest] = argv;
	const command =
		rawCommand === undefined || rawCommand === "--help" || rawCommand === "-h"
			? "help"
			: rawCommand;
	const args = command === "help" && (rawCommand === "--help" || rawCommand === "-h")
		? []
		: rest;
	const options = { _: [] };

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === "--") {
			options._.push(...args.slice(index + 1));
			break;
		}
		if (arg.startsWith("--no-")) {
			options[camelCase(arg.slice(5))] = false;
			continue;
		}
		if (arg.startsWith("--")) {
			const key = camelCase(arg.slice(2));
			const next = args[index + 1];
			if (!next || next.startsWith("--")) {
				options[key] = true;
				continue;
			}
			options[key] = next;
			index += 1;
			continue;
		}
		options._.push(arg);
	}

	return { command, options };
};

const readStringOption = (value) =>
	typeof value === "string" && value.trim() ? value.trim() : undefined;

const resolvePath = (value) => path.resolve(process.cwd(), value);

const getInputPath = (options) => {
	const input = readStringOption(options.input) ?? readStringOption(options._[0]);
	if (!input) throw new Error("Missing resume JSON input path");
	return resolvePath(input);
};

const readJson = async (filePath) => {
	const text = await readFile(filePath, "utf8");
	try {
		return JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`${filePath} is not valid JSON: ${message}`);
	}
};

const writeJson = async (filePath, value) => {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeText = async (filePath, value) => {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, value, "utf8");
};

const parseFormats = (value, fallback) => {
	const raw = readStringOption(value);
	if (!raw) return fallback;

	const formats = raw
		.split(",")
		.map((item) => item.trim().toLowerCase())
		.map((item) => (item === "md" ? "markdown" : item))
		.filter(Boolean);

	for (const format of formats) {
		if (!exportFormats.has(format)) {
			throw new Error(`Unsupported export format: ${format}`);
		}
	}

	return [...new Set(formats)];
};

const sanitizeFileBaseName = (value) => {
	const fallback = "resume";
	const raw = readStringOption(value) ?? fallback;
	const safe = raw
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	return safe || fallback;
};

const serializeForInlineScript = (value) =>
	JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");

const fileExists = async (filePath) => {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
};

const loadApi = async () => {
	if (!(await fileExists(builtApiPath))) {
		throw new Error(
			"iResume CLI 缺少构建产物。请重新安装 iresume-cli，或在仓库中运行 npm run build:cli。",
		);
	}

	return import(pathToFileURL(builtApiPath).href);
};

const contentTypes = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webp": "image/webp",
};

const createStaticRenderRuntime = async () => {
	const server = createHttpServer(async (request, response) => {
		const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
		const pathname = decodeURIComponent(requestUrl.pathname);
		const relativePath = pathname === "/" ? "export.html" : pathname.slice(1);
		const filePath = path.resolve(builtExportDir, relativePath);
		const relativeToRoot = path.relative(builtExportDir, filePath);

		if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
			response.writeHead(403);
			response.end("Forbidden");
			return;
		}

		try {
			const body = await readFile(filePath);
			response.writeHead(200, {
				"Content-Type":
					contentTypes[path.extname(filePath)] ??
					"application/octet-stream",
			});
			response.end(body);
		} catch {
			response.writeHead(404);
			response.end("Not found");
		}
	});

	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});

	const address = server.address();
	if (!address || typeof address === "string") {
		throw new Error("Failed to start iResume static render server");
	}

	return {
		origin: `http://127.0.0.1:${address.port}`,
		close: () =>
			new Promise((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			}),
	};
};

const createRenderRuntime = async () => {
	if (!(await fileExists(path.join(builtExportDir, "export.html")))) {
		throw new Error(
			"iResume CLI 缺少导出渲染器。请重新安装 iresume-cli，或在仓库中运行 npm run build:cli。",
		);
	}

	return createStaticRenderRuntime();
};

const getResolveOptions = (options) => ({
	documentId: readStringOption(options.documentId),
});

const withRenderRuntime = async (callback) => {
	const runtime = await createRenderRuntime();
	try {
		return await callback(runtime);
	} finally {
		await runtime.close();
	}
};

const runValidate = async (options) => {
	const inputPath = getInputPath(options);
	const raw = await readJson(inputPath);
	const api = await loadApi();
	const result = api.validateResumeJson(raw, getResolveOptions(options));

	if (options.json) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	console.log(
		`OK ${result.document.name} (${result.document.templateId}, ${result.sourceKind})`,
	);
};

const runNormalize = async (options) => {
	const inputPath = getInputPath(options);
	const raw = await readJson(inputPath);
	const api = await loadApi();
	const backup = api.normalizeResumeJson(raw, getResolveOptions(options));
	const outputPath = readStringOption(options.out);

	if (!outputPath) {
		console.log(JSON.stringify(backup, null, 2));
		return;
	}

	await writeJson(resolvePath(outputPath), backup);
	console.log(`Wrote ${resolvePath(outputPath)}`);
};

const runMarkdown = async (options) => {
	const inputPath = getInputPath(options);
	const raw = await readJson(inputPath);
	const api = await loadApi();
	const markdown = api.exportResumeMarkdown(raw, getResolveOptions(options));
	const outputPath = readStringOption(options.out);

	if (!outputPath) {
		console.log(markdown);
		return;
	}

	await writeText(resolvePath(outputPath), markdown);
	console.log(`Wrote ${resolvePath(outputPath)}`);
};

const waitForFonts = (page) =>
	page.evaluate(async () => {
		if ("fonts" in document) {
			await document.fonts.ready;
		}
	});

const runBrowserExport = async ({
	formats,
	outputs,
	payload,
	scale,
	timeout,
	origin,
}) => {
	let chromium;
	try {
		({ chromium } = await import("playwright"));
	} catch {
		throw new Error(
			"PDF/PNG 导出需要 Playwright。请安装发布后的 iResume 包依赖，或运行 npm install。",
		);
	}

	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage({
			deviceScaleFactor: scale,
			viewport: { width: 794, height: 1123 },
		});
		await page.addInitScript({
			content: `window.__IRESUME_EXPORT_PAYLOAD__ = ${serializeForInlineScript(payload)};`,
		});
		await page.goto(`${origin}/export.html`, {
			timeout,
			waitUntil: "networkidle",
		});

		const exportError = page.locator("[data-export-error]").first();
		if ((await exportError.count()) > 0) {
			const message =
				(await exportError.getAttribute("data-export-error")) ??
				"iResume export page failed";
			throw new Error(message);
		}

		await page.waitForSelector("[data-export-ready='true']", {
			state: "attached",
			timeout,
		});
		await waitForFonts(page);
		const resumeRoot = page.locator(".resume-print-root").first();
		await resumeRoot.waitFor({ state: "visible", timeout });

		if (formats.includes("png")) {
			await page.emulateMedia({ media: "screen" });
			await resumeRoot.screenshot({ path: outputs.png, type: "png" });
		}

		if (formats.includes("pdf")) {
			await page.emulateMedia({ media: "print" });
			await page.pdf({
				path: outputs.pdf,
				format: "A4",
				margin: { top: "0", right: "0", bottom: "0", left: "0" },
				preferCSSPageSize: true,
				printBackground: true,
			});
		}
	} finally {
		await browser.close();
	}
};

const runExport = async (options, defaultFormats = ["pdf", "png"]) => {
	const inputPath = getInputPath(options);
	const raw = await readJson(inputPath);
	const outDir = resolvePath(readStringOption(options.out) ?? "iresume-export");
	const filename = sanitizeFileBaseName(options.filename);
	const formats = parseFormats(options.format, defaultFormats);
	const scale = Number(readStringOption(options.scale) ?? 2);
	const timeout = Number(readStringOption(options.timeout) ?? 30000);
	const reportEnabled = options.report !== false;
	const requiresBrowser = formats.includes("png") || formats.includes("pdf");
	const outputs = {};

	if (!Number.isFinite(scale) || scale <= 0) {
		throw new Error("--scale must be a positive number");
	}
	if (!Number.isFinite(timeout) || timeout <= 0) {
		throw new Error("--timeout must be a positive number");
	}

	await mkdir(outDir, { recursive: true });

	const report = {
		ok: true,
		command: "export",
		input: inputPath,
		outputDir: outDir,
		formats,
		outputs,
		exportedAt: new Date().toISOString(),
	};

	try {
		const api = await loadApi();
		const resolved = api.resolveResumeForCli(raw, getResolveOptions(options));
		report.sourceKind = resolved.sourceKind;
		report.document = {
			id: resolved.document.id,
			name: resolved.document.name,
			tags: resolved.document.tags,
			version: resolved.document.version,
			templateId: resolved.appearance.templateId,
			accentColor: resolved.appearance.accentColor,
		};

		if (formats.includes("json")) {
			outputs.json = path.join(outDir, `${filename}.json`);
			await writeJson(outputs.json, resolved.backup);
		}

		if (formats.includes("markdown")) {
			outputs.markdown = path.join(outDir, `${filename}.md`);
			await writeText(outputs.markdown, resolved.markdown);
		}

		if (formats.includes("png")) {
			outputs.png = path.join(outDir, `${filename}.png`);
		}
		if (formats.includes("pdf")) {
			outputs.pdf = path.join(outDir, `${filename}.pdf`);
		}

		if (requiresBrowser) {
			await withRenderRuntime(async ({ origin }) => {
				await runBrowserExport({
					formats,
					outputs,
					payload: resolved.backup,
					scale,
					timeout,
					origin,
				});
			});
		}

		if (reportEnabled) {
			outputs.report = path.join(outDir, "report.json");
			await writeJson(outputs.report, report);
		}

		console.log(`Exported ${formats.join(", ")} to ${outDir}`);
	} catch (error) {
		if (reportEnabled) {
			const failedReport = {
				...report,
				ok: false,
				error: error instanceof Error ? error.message : String(error),
			};
			outputs.report = path.join(outDir, "report.json");
			await writeJson(outputs.report, failedReport);
		}
		throw error;
	}
};

const main = async () => {
	const { command, options } = parseArgs(process.argv.slice(2));

	if (command === "help" || options.help) {
		console.log(helpText.trim());
		return;
	}

	switch (command) {
		case "validate":
			await runValidate(options);
			return;
		case "normalize":
			await runNormalize(options);
			return;
		case "markdown":
			await runMarkdown(options);
			return;
		case "preview":
			await runExport(options, ["png"]);
			return;
		case "export":
			await runExport(options);
			return;
		default:
			throw new Error(`Unknown command: ${command}`);
	}
};

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
