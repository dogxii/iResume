import {
	Download,
	Github,
	Hand,
	ImageDown,
	PanelLeftClose,
	PanelLeftOpen,
	PanelRightClose,
	PanelRightOpen,
	Printer,
	RotateCcw,
	SlidersHorizontal,
	Tags,
	TrendingUp,
	Upload,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from "react";
import FontFamilyControl from "./components/FontFamilyControl";
import FontSizeControl from "./components/FontSizeControl";
import PageMarginControl from "./components/PageMarginControl";
import PreviewPageModeControl from "./components/PreviewPageModeControl";
import PreviewZoomControl from "./components/PreviewZoomControl";
import ResumeEditor from "./components/ResumeEditor";
import ResumeDisplayPreferencesEditor from "./components/ResumeDisplayPreferencesEditor";
import ResumeManager from "./components/ResumeManager";
import ResumePreview from "./components/ResumePreview";
import ThemePicker from "./components/ThemePicker";
import {
	createResumeBackup,
	normalizeResumeBackup,
} from "./data/resumeBackup";
import {
	createGitHubSyncGist,
	decryptCloudSyncData,
	encryptCloudSyncData,
	findGitHubSyncGist,
	getGitHubSyncKey,
	readGitHubSyncGist,
	updateGitHubSyncGist,
} from "./data/cloudSync";
import {
	normalizeResumeData,
	normalizeSectionIconVisibility,
} from "./data/resumeData";
import {
	createResumeDocument,
	createResumeLibrary,
	incrementResumePatchVersion,
	normalizeResumeAppearance,
	normalizeResumeLibrary,
	normalizeResumeTags,
	normalizeResumeVersion,
	type ResumeDocument,
	type ResumeLibrary,
} from "./data/resumeLibrary";
import {
	DEFAULT_PREVIEW_ZOOM,
	getAdjacentPreviewZoom,
	normalizePreviewZoom,
	type PreviewZoom,
} from "./data/previewZoom";
import {
	DEFAULT_PREVIEW_PAGE_MODE,
	normalizePreviewPageMode,
	type PreviewPageMode,
} from "./data/previewPageMode";
import {
	DEFAULT_SECTION_PREFERENCES,
	DEFAULT_RESUME_FONT_SIZE_PT,
	DEFAULT_RESUME_PAGE_MARGIN_MM,
	DEFAULT_RESUME_FONT_FAMILY,
	normalizeResumeFontSize,
	normalizeResumePageMargin,
	type ResumeFontSizePt,
	type ResumePageMarginMm,
	type ResumeFontFamily,
	type ResumeSectionPreferences,
} from "./data/resumeStyle";
import {
	DEFAULT_THEME_ID,
	getDefaultSectionIconVisibility,
	isThemeId,
	normalizeThemeIdList,
	themes,
} from "./data/themes";
import type { ResumeData, SectionIconVisibility, SectionKey } from "./types/resume";
import type { ThemeId } from "./types/theme";

const STORAGE_KEY = "resume-data";
const THEME_STORAGE_KEY = "resume-theme";
const FONT_SIZE_STORAGE_KEY = "resume-font-size";
const PAGE_MARGIN_STORAGE_KEY = "resume-page-margin";
const SECTION_ICONS_STORAGE_KEY = "resume-section-icons";
const SECTION_ICONS_UNIFIED_MIGRATION_KEY = "resume-section-icons-unified-v2";
const FAVORITE_THEMES_STORAGE_KEY = "resume-favorite-themes";
const LIBRARY_STORAGE_KEY = "resume-library";
const PREVIEW_ZOOM_STORAGE_KEY = "resume-preview-zoom";
const PREVIEW_PAGE_MODE_STORAGE_KEY = "resume-preview-page-mode";
const APP_VIEW_STORAGE_KEY = "resume-app-view";
const CLOUD_SYNC_AUTH_STORAGE_KEY = "resume-cloud-sync-auth";
const CLOUD_SYNC_SETTINGS_STORAGE_KEY = "resume-cloud-sync-settings";
const CLOUD_SYNC_OAUTH_STATE_STORAGE_KEY = "resume-cloud-sync-oauth-state";
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;
const PREVIEW_PAGE_GAP_MM = 10;

type CloudSyncStatus = "idle" | "connecting" | "uploading" | "downloading";

interface UserDataBackup {
	version: 1;
	exportedAt: string;
	library: ResumeLibrary;
	favoriteThemeIds: ThemeId[];
	previewZoom: PreviewZoom;
	previewPageMode: PreviewPageMode;
}

interface PreviewPageLayout {
	startMm: number;
	bottomBlankMm: number;
}

interface CloudSyncAuth {
	accessToken: string;
	syncKey: string;
	tokenType?: string;
	scope?: string;
	login?: string;
	avatarUrl?: string;
	connectedAt: string;
}

interface CloudSyncSettings {
	gistId: string;
	lastSyncedAt?: string;
	lastDirection?: "push" | "pull";
}

const getPrintablePageHeightMm = (pageMarginMm: ResumePageMarginMm) =>
	A4_HEIGHT_MM - pageMarginMm * 2;

type AppView = "manager" | "editor";

const readInitialView = (library: ResumeLibrary): AppView =>
	localStorage.getItem(APP_VIEW_STORAGE_KEY) === "editor" &&
	library.documents.length > 0
		? "editor"
		: "manager";

const getPrintTitleName = (document: ResumeDocument, data: ResumeData) => {
	const sanitize = (value: string) =>
		value
			.replace(/[\\/:*?"<>|]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();

	return (
		sanitize(document.name) ||
		sanitize(data.personal.name) ||
		"简历"
	);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readFileAsText = (file: File) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (event) => resolve(String(event.target?.result ?? ""));
		reader.onerror = () => reject(new Error("无法读取文件"));
		reader.readAsText(file);
	});

const readCloudSyncAuth = (): CloudSyncAuth | null => {
	const saved = localStorage.getItem(CLOUD_SYNC_AUTH_STORAGE_KEY);
	if (!saved) return null;

	try {
		const value = JSON.parse(saved) as unknown;
		if (!isPlainObject(value) || typeof value.accessToken !== "string") {
			return null;
		}
		if (typeof value.syncKey !== "string") return null;

		return {
			accessToken: value.accessToken,
			syncKey: value.syncKey,
			tokenType:
				typeof value.tokenType === "string" ? value.tokenType : undefined,
			scope: typeof value.scope === "string" ? value.scope : undefined,
			login: typeof value.login === "string" ? value.login : undefined,
			avatarUrl:
				typeof value.avatarUrl === "string" ? value.avatarUrl : undefined,
			connectedAt:
				typeof value.connectedAt === "string"
					? value.connectedAt
					: new Date().toISOString(),
		};
	} catch {
		return null;
	}
};

const readCloudSyncSettings = (): CloudSyncSettings => {
	const saved = localStorage.getItem(CLOUD_SYNC_SETTINGS_STORAGE_KEY);
	if (!saved) return { gistId: "" };

	try {
		const value = JSON.parse(saved) as unknown;
		if (!isPlainObject(value)) return { gistId: "" };

		return {
			gistId: typeof value.gistId === "string" ? value.gistId : "",
			lastSyncedAt:
				typeof value.lastSyncedAt === "string"
					? value.lastSyncedAt
					: undefined,
			lastDirection:
				value.lastDirection === "push" || value.lastDirection === "pull"
					? value.lastDirection
					: undefined,
		};
	} catch {
		return { gistId: "" };
	}
};

const getOAuthRedirectUri = () =>
	`${window.location.origin}${window.location.pathname}`;

const exchangeGitHubOAuthCode = async (
	code: string,
	redirectUri: string,
): Promise<Pick<CloudSyncAuth, "accessToken" | "scope" | "tokenType">> => {
	const response = await fetch("/api/github/oauth", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ code, redirectUri }),
	});
	const payload = (await response.json()) as Record<string, unknown>;

	if (!response.ok || typeof payload.accessToken !== "string") {
		throw new Error(
			typeof payload.message === "string" ? payload.message : "GitHub 登录失败",
		);
	}

	return {
		accessToken: payload.accessToken,
		scope: typeof payload.scope === "string" ? payload.scope : undefined,
		tokenType:
			typeof payload.tokenType === "string" ? payload.tokenType : undefined,
	};
};

interface ResumeMetaEditorProps {
	document: ResumeDocument;
	onUpdate: (
		meta: Partial<Pick<ResumeDocument, "name" | "tags" | "version">>,
	) => void;
}

const metaInputClass =
	"w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500";

const WorkbenchIconButton = ({
	label,
	children,
	onClick,
	disabled,
	variant = "ghost",
}: {
	label: string;
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
	variant?: "ghost" | "primary";
}) => (
	<button
		type="button"
		onClick={onClick}
		disabled={disabled}
		className={`group relative flex h-9 items-center justify-center rounded-md transition disabled:cursor-wait disabled:opacity-50 ${
			variant === "primary"
				? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
				: "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
		}`}
		title={label}
		aria-label={label}
	>
		{children}
		<span className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-500 opacity-0 shadow-lg shadow-slate-900/10 transition group-hover:opacity-100">
			{label}
		</span>
	</button>
);

const ResumeMetaEditor = ({ document, onUpdate }: ResumeMetaEditorProps) => (
	<div className="border-b border-slate-200 p-4">
		<div className="mb-3 flex items-center justify-between gap-2">
			<h2 className="text-sm font-bold text-slate-800">简历信息</h2>
			<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
				v{document.version}
			</span>
		</div>

		<label className="mb-3 block">
			<span className="mb-1 block text-xs font-medium text-slate-500">
				简历名称
			</span>
			<input
				value={document.name}
				onChange={(event) => onUpdate({ name: event.target.value })}
				className={metaInputClass}
			/>
		</label>

		<div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
			<label className="block">
				<span className="mb-1 block text-xs font-medium text-slate-500">
					版本号
				</span>
				<input
					value={document.version}
					onChange={(event) => onUpdate({ version: event.target.value })}
					className={`${metaInputClass} font-mono tabular-nums`}
				/>
			</label>
			<button
				type="button"
				onClick={() =>
					onUpdate({ version: incrementResumePatchVersion(document.version) })
				}
				className="mt-5 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-blue-600"
				title="版本 +0.0.1"
				aria-label="版本 +0.0.1"
			>
				<TrendingUp size={15} />
			</button>
		</div>

		<label className="block">
			<span className="mb-1 block text-xs font-medium text-slate-500">
				标签
			</span>
			<div className="relative">
				<Tags
					size={14}
					className="pointer-events-none absolute left-2.5 top-2.5 text-slate-300"
				/>
				<input
					key={document.id}
					defaultValue={document.tags.join(", ")}
					onBlur={(event) =>
						onUpdate({ tags: normalizeResumeTags(event.target.value) })
					}
					onKeyDown={(event) => {
						if (event.key === "Enter") event.currentTarget.blur();
					}}
					className={`${metaInputClass} pl-8`}
					placeholder="前端, 社招, 北京"
				/>
			</div>
		</label>
	</div>
);

function readLegacyResumeDocument(): ResumeDocument {
	const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
	const themeId = isThemeId(savedTheme) ? savedTheme : DEFAULT_THEME_ID;
	const fallbackIcons = getDefaultSectionIconVisibility(themeId);
	const savedSectionIcons = localStorage.getItem(SECTION_ICONS_STORAGE_KEY);
	let sectionIcons = fallbackIcons;

	if (savedSectionIcons) {
		try {
			sectionIcons = normalizeSectionIconVisibility(
				JSON.parse(savedSectionIcons),
				fallbackIcons,
			);
		} catch {
			sectionIcons = fallbackIcons;
		}
	}

	let data: ResumeData | undefined;
	const savedData = localStorage.getItem(STORAGE_KEY);
	if (savedData) {
		try {
			data = normalizeResumeData(JSON.parse(savedData));
		} catch (error) {
			console.error("Failed to parse resume data", error);
		}
	}

	return createResumeDocument({
		name: data?.personal.name.trim() || "默认简历",
		data,
		appearance: {
			themeId,
			fontSizePt: normalizeResumeFontSize(
				localStorage.getItem(FONT_SIZE_STORAGE_KEY) ??
					DEFAULT_RESUME_FONT_SIZE_PT,
			),
			pageMarginMm: normalizeResumePageMargin(
				localStorage.getItem(PAGE_MARGIN_STORAGE_KEY) ??
					DEFAULT_RESUME_PAGE_MARGIN_MM,
			),
			sectionIcons,
		},
	});
}

function migrateUnifiedSectionIcons(library: ResumeLibrary): ResumeLibrary {
	if (localStorage.getItem(SECTION_ICONS_UNIFIED_MIGRATION_KEY)) return library;
	localStorage.setItem(SECTION_ICONS_UNIFIED_MIGRATION_KEY, "1");

	return {
		...library,
		documents: library.documents.map((document) => {
			const hasVisibleIcon = Object.values(document.appearance.sectionIcons).some(
				Boolean,
			);
			if (hasVisibleIcon) return document;

			return {
				...document,
				appearance: {
					...document.appearance,
					sectionIcons: getDefaultSectionIconVisibility(
						document.appearance.themeId,
					),
				},
			};
		}),
	};
}

function readInitialLibrary(): ResumeLibrary {
	const legacyDocument = readLegacyResumeDocument();
	const savedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY);
	if (savedLibrary) {
		try {
			return migrateUnifiedSectionIcons(
				normalizeResumeLibrary(JSON.parse(savedLibrary), legacyDocument),
			);
		} catch {
			return migrateUnifiedSectionIcons(
				createResumeLibrary([legacyDocument], legacyDocument.id),
			);
		}
	}

	return migrateUnifiedSectionIcons(
		createResumeLibrary([legacyDocument], legacyDocument.id),
	);
}

function App() {
	const importInputRef = useRef<HTMLInputElement>(null);
	const resumePreviewRef = useRef<HTMLDivElement>(null);
	const resumePreviewInnerRef = useRef<HTMLDivElement>(null);
	const canvasScrollRef = useRef<HTMLDivElement>(null);
	const isPrintingRef = useRef(false);
	const wheelZoomLastAtRef = useRef(0);
	const panStateRef = useRef<{
		pointerId: number;
		startX: number;
		startY: number;
		scrollLeft: number;
		scrollTop: number;
	} | null>(null);
	const canvasShortcutsActiveRef = useRef(false);
	const isSpacePanningRef = useRef(false);
	const isPanningRef = useRef(false);
	const [library, setLibrary] = useState<ResumeLibrary>(readInitialLibrary);
	const [view, setView] = useState<AppView>(() => readInitialView(library));
	const [cloudSyncAuth, setCloudSyncAuth] = useState<CloudSyncAuth | null>(
		readCloudSyncAuth,
	);
	const [cloudSyncSettings, setCloudSyncSettings] =
		useState<CloudSyncSettings>(readCloudSyncSettings);
	const [cloudSyncStatus, setCloudSyncStatus] =
		useState<CloudSyncStatus>("idle");
	const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const [imageExportStatus, setImageExportStatus] = useState<
		"idle" | "exporting" | "error"
	>("idle");
	const [previewPageCount, setPreviewPageCount] = useState(1);
	const [previewPageLayouts, setPreviewPageLayouts] = useState<
		PreviewPageLayout[]
	>([{ startMm: 0, bottomBlankMm: 0 }]);
	const [activeSection, setActiveSection] = useState<SectionKey>("skills");
	const [isSpacePanning, setIsSpacePanning] = useState(false);
	const [isPanning, setIsPanning] = useState(false);
	const [canvasShortcutsActive, setCanvasShortcutsActive] = useState(false);
	const [leftPanelOpen, setLeftPanelOpen] = useState(true);
	const [rightPanelOpen, setRightPanelOpen] = useState(true);
	const [appearancePanelOpen, setAppearancePanelOpen] = useState(false);
	const [previewZoom, setPreviewZoom] = useState<PreviewZoom>(() =>
		normalizePreviewZoom(
			localStorage.getItem(PREVIEW_ZOOM_STORAGE_KEY) ?? DEFAULT_PREVIEW_ZOOM,
		),
	);
	const [previewPageMode, setPreviewPageMode] = useState<PreviewPageMode>(() =>
		normalizePreviewPageMode(
			localStorage.getItem(PREVIEW_PAGE_MODE_STORAGE_KEY) ??
				DEFAULT_PREVIEW_PAGE_MODE,
		),
	);

	const activeDocument =
		library.documents.find((document) => document.id === library.activeId) ??
		library.documents[0];
	const resumeData = activeDocument.data;
	const {
		themeId,
		fontSizePt,
		fontFamily,
		pageMarginMm,
		sectionIcons,
		sectionPreferences,
	} = activeDocument.appearance;

	useEffect(() => {
		localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
	}, [library]);

	useEffect(() => {
		localStorage.setItem(APP_VIEW_STORAGE_KEY, view);
	}, [view]);

	useEffect(() => {
		if (cloudSyncAuth) {
			localStorage.setItem(
				CLOUD_SYNC_AUTH_STORAGE_KEY,
				JSON.stringify(cloudSyncAuth),
			);
			return;
		}

		localStorage.removeItem(CLOUD_SYNC_AUTH_STORAGE_KEY);
	}, [cloudSyncAuth]);

	useEffect(() => {
		localStorage.setItem(
			CLOUD_SYNC_SETTINGS_STORAGE_KEY,
			JSON.stringify(cloudSyncSettings),
		);
	}, [cloudSyncSettings]);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
		localStorage.setItem(THEME_STORAGE_KEY, themeId);
		localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSizePt));
		localStorage.setItem(PAGE_MARGIN_STORAGE_KEY, String(pageMarginMm));
		localStorage.setItem(SECTION_ICONS_STORAGE_KEY, JSON.stringify(sectionIcons));
	}, [fontSizePt, pageMarginMm, resumeData, sectionIcons, themeId]);

	const [favoriteThemeIds, setFavoriteThemeIds] = useState<ThemeId[]>(() => {
		const saved = localStorage.getItem(FAVORITE_THEMES_STORAGE_KEY);
		if (!saved) return [];

		try {
			return normalizeThemeIdList(JSON.parse(saved));
		} catch {
			return [];
		}
	});

	useEffect(() => {
		localStorage.setItem(
			FAVORITE_THEMES_STORAGE_KEY,
			JSON.stringify(favoriteThemeIds),
		);
	}, [favoriteThemeIds]);

	useEffect(() => {
		localStorage.setItem(PREVIEW_ZOOM_STORAGE_KEY, String(previewZoom));
	}, [previewZoom]);

	useEffect(() => {
		localStorage.setItem(PREVIEW_PAGE_MODE_STORAGE_KEY, previewPageMode);
	}, [previewPageMode]);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		const state = params.get("state");
		if (!code || !state) return;

		const savedState = sessionStorage.getItem(
			CLOUD_SYNC_OAUTH_STATE_STORAGE_KEY,
		);
		const redirectUri = getOAuthRedirectUri();

		const cleanupUrl = () => {
			params.delete("code");
			params.delete("state");
			const nextSearch = params.toString();
			window.history.replaceState(
				null,
				"",
				`${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
			);
		};

		if (!savedState || savedState !== state) {
			setCloudSyncMessage("GitHub 登录状态校验失败，请重新连接");
			cleanupUrl();
			return;
		}

		let canceled = false;
		sessionStorage.removeItem(CLOUD_SYNC_OAUTH_STATE_STORAGE_KEY);
		setCloudSyncStatus("connecting");
		setCloudSyncMessage("正在连接 GitHub...");

		exchangeGitHubOAuthCode(code, redirectUri)
			.then(async (token) => {
				const syncKey = await getGitHubSyncKey(token.accessToken);
				if (canceled) return;
				setCloudSyncAuth({
					...token,
					login: syncKey.login,
					avatarUrl: syncKey.avatarUrl,
					syncKey: syncKey.syncKey,
					connectedAt: new Date().toISOString(),
				});
				setCloudSyncMessage(`已连接 GitHub：${syncKey.login}`);
			})
			.catch((error: unknown) => {
				if (canceled) return;
				console.error("GitHub OAuth failed", error);
				setCloudSyncMessage(
					error instanceof Error ? error.message : "GitHub 登录失败",
				);
			})
			.finally(() => {
				if (canceled) return;
				setCloudSyncStatus("idle");
				cleanupUrl();
			});

		return () => {
			canceled = true;
		};
	}, []);

	useEffect(() => {
		if (view !== "editor") return;

		const frame = requestAnimationFrame(() => {
			const node = canvasScrollRef.current;
			const preview = node?.querySelector(".resume-preview-scale-shell");
			if (!node || !preview) return;

			const targetLeft = window.innerWidth >= 1024 ? 400 : 16;
			const previewLeft = preview.getBoundingClientRect().left;
			node.scrollLeft += previewLeft - targetLeft;
		});

		return () => cancelAnimationFrame(frame);
	}, [activeDocument.id, previewZoom, view]);

	useEffect(() => {
		if (!resumeData.sectionOrder.includes(activeSection)) {
			setActiveSection(resumeData.sectionOrder[0] ?? "skills");
		}
	}, [activeSection, resumeData.sectionOrder]);

	useEffect(() => {
		if (view !== "editor") {
			setCanvasShortcutsActive(false);
			setAppearancePanelOpen(false);
		}
	}, [view]);

	useEffect(() => {
		canvasShortcutsActiveRef.current = canvasShortcutsActive;
	}, [canvasShortcutsActive]);

	useEffect(() => {
		isSpacePanningRef.current = isSpacePanning;
	}, [isSpacePanning]);

	useEffect(() => {
		isPanningRef.current = isPanning;
	}, [isPanning]);

	useEffect(() => {
		if (!appearancePanelOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setAppearancePanelOpen(false);
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [appearancePanelOpen]);

	useEffect(() => {
		if (view !== "editor") return;

		const isInteractiveTarget = (target: EventTarget | null) => {
			if (!(target instanceof HTMLElement)) return false;
			return Boolean(
				target.closest(
					'input, textarea, select, button, [role="button"], [contenteditable="true"]',
				),
			);
		};

		const isWorkbenchChromeTarget = (target: EventTarget | null) => {
			return (
				target instanceof HTMLElement &&
				Boolean(target.closest('[data-workbench-chrome="true"]'))
			);
		};

		const canUseCanvasShortcuts = (target: EventTarget | null) =>
			canvasShortcutsActiveRef.current &&
			!isInteractiveTarget(target) &&
			!isWorkbenchChromeTarget(target);

		const canUseWheelZoom = (target: EventTarget | null) =>
			canvasShortcutsActiveRef.current && !isWorkbenchChromeTarget(target);

		const blurCanvasShortcuts = (event: Event) => {
			if (
				isWorkbenchChromeTarget(event.target) ||
				isInteractiveTarget(event.target)
			) {
				canvasShortcutsActiveRef.current = false;
				setCanvasShortcutsActive(false);
			}
		};

		const isSpaceKey = (event: KeyboardEvent) =>
			event.code === "Space" ||
			event.key === " " ||
			event.key === "Spacebar" ||
			event.key === "Space";

		const syncSpacePanningClass = (enabled: boolean) => {
			document.documentElement.classList.toggle("resume-space-panning", enabled);
			document.body.classList.toggle("resume-space-panning", enabled);
		};

		const releaseHand = () => {
			panStateRef.current = null;
			isPanningRef.current = false;
			isSpacePanningRef.current = false;
			setIsPanning(false);
			setIsSpacePanning(false);
			syncSpacePanningClass(false);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (!canUseCanvasShortcuts(event.target)) return;

			if (isSpaceKey(event)) {
				event.preventDefault();
				event.stopPropagation();
				if (!event.repeat) {
					isSpacePanningRef.current = true;
					setIsSpacePanning(true);
					syncSpacePanningClass(true);
				}
				return;
			}

			if (!(event.metaKey || event.ctrlKey)) return;

			if (event.key === "=" || event.key === "+") {
				event.preventDefault();
				event.stopPropagation();
				setPreviewZoom((current) => getAdjacentPreviewZoom(current, "larger"));
			}

			if (event.key === "-") {
				event.preventDefault();
				event.stopPropagation();
				setPreviewZoom((current) => getAdjacentPreviewZoom(current, "smaller"));
			}

			if (event.key === "0") {
				event.preventDefault();
				event.stopPropagation();
				setPreviewZoom(DEFAULT_PREVIEW_ZOOM);
			}
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (!isSpaceKey(event)) return;
			if (!isSpacePanningRef.current && !isPanningRef.current) return;
			event.preventDefault();
			event.stopPropagation();
			panStateRef.current = null;
			isPanningRef.current = false;
			isSpacePanningRef.current = false;
			setIsPanning(false);
			setIsSpacePanning(false);
			syncSpacePanningClass(false);
		};

		const handleWheel = (event: WheelEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.deltaY === 0) return;
			if (!canUseWheelZoom(event.target)) return;

			event.preventDefault();
			event.stopPropagation();

			const now = window.performance.now();
			if (now - wheelZoomLastAtRef.current < 70) return;
			wheelZoomLastAtRef.current = now;

			setPreviewZoom((current) =>
				getAdjacentPreviewZoom(
					current,
					event.deltaY < 0 ? "larger" : "smaller",
				),
			);
		};

		window.addEventListener("keydown", handleKeyDown, true);
		document.addEventListener("keydown", handleKeyDown, true);
		window.addEventListener("keyup", handleKeyUp, true);
		document.addEventListener("keyup", handleKeyUp, true);
		document.addEventListener("focusin", blurCanvasShortcuts, true);
		document.addEventListener("pointerdown", blurCanvasShortcuts, true);
		window.addEventListener("blur", releaseHand);
		window.addEventListener("wheel", handleWheel, {
			capture: true,
			passive: false,
		});

		return () => {
			window.removeEventListener("keydown", handleKeyDown, true);
			document.removeEventListener("keydown", handleKeyDown, true);
			window.removeEventListener("keyup", handleKeyUp, true);
			document.removeEventListener("keyup", handleKeyUp, true);
			document.removeEventListener("focusin", blurCanvasShortcuts, true);
			document.removeEventListener("pointerdown", blurCanvasShortcuts, true);
			window.removeEventListener("blur", releaseHand);
			window.removeEventListener("wheel", handleWheel, true);
			releaseHand();
		};
	}, [view]);

	const handleToggleFavoriteTheme = (id: ThemeId) => {
		setFavoriteThemeIds((current) =>
			current.includes(id)
				? current.filter((item) => item !== id)
				: [id, ...current],
		);
	};

	const createUserDataBackup = useCallback(
		(): UserDataBackup => ({
			version: 1,
			exportedAt: new Date().toISOString(),
			library,
			favoriteThemeIds,
			previewZoom,
			previewPageMode,
		}),
		[favoriteThemeIds, library, previewPageMode, previewZoom],
	);

	const applyUserDataBackup = useCallback((parsed: unknown): string | null => {
		const rawLibrary =
			isPlainObject(parsed) && "library" in parsed ? parsed.library : parsed;
		if (!isPlainObject(rawLibrary) || !Array.isArray(rawLibrary.documents)) {
			return "未找到有效的简历库数据";
		}

		const nextLibrary = migrateUnifiedSectionIcons(
			normalizeResumeLibrary(rawLibrary, readLegacyResumeDocument()),
		);

		if (isPlainObject(parsed)) {
			if ("favoriteThemeIds" in parsed) {
				setFavoriteThemeIds(normalizeThemeIdList(parsed.favoriteThemeIds));
			}
			if (parsed.previewZoom !== undefined) {
				setPreviewZoom(normalizePreviewZoom(parsed.previewZoom));
			}
			if (parsed.previewPageMode !== undefined) {
				setPreviewPageMode(
					normalizePreviewPageMode(parsed.previewPageMode),
				);
			}
		}

		setLibrary(nextLibrary);
		setView("manager");
		return null;
	}, []);

	const handleExportUserData = () => {
		const backup = createUserDataBackup();
		const json = JSON.stringify(backup, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const date = new Date().toISOString().slice(0, 10);
		const a = document.createElement("a");
		a.href = url;
		a.download = `iresume-user-data-${date}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleImportUserData = async (file: File): Promise<string | null> => {
		if (!file.name.endsWith(".json")) return "请选择 .json 文件";

		try {
			const text = await readFileAsText(file);
			const parsed = JSON.parse(text) as unknown;
			return applyUserDataBackup(parsed);
		} catch (error) {
			console.error("Failed to import user data", error);
			return "导入失败，请检查文件内容";
		}
	};

	const handleCloudConnect = () => {
		const clientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID;
		if (!clientId) {
			setCloudSyncMessage("需要配置 VITE_GITHUB_OAUTH_CLIENT_ID");
			return;
		}

		const state =
			typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		sessionStorage.setItem(CLOUD_SYNC_OAUTH_STATE_STORAGE_KEY, state);

		const url = new URL("https://github.com/login/oauth/authorize");
		url.searchParams.set("client_id", clientId);
		url.searchParams.set("redirect_uri", getOAuthRedirectUri());
		url.searchParams.set("scope", "gist");
		url.searchParams.set("state", state);
		url.searchParams.set("allow_signup", "true");
		window.location.assign(url.toString());
	};

	const handleCloudDisconnect = () => {
		setCloudSyncAuth(null);
		setCloudSyncMessage("已断开 GitHub，本地数据不受影响");
	};

	const handleCloudGistIdChange = (gistId: string) => {
		setCloudSyncSettings((current) => ({ ...current, gistId: gistId.trim() }));
	};

	const handleCloudPush = async () => {
		if (!cloudSyncAuth) {
			setCloudSyncMessage("请先连接 GitHub");
			return;
		}

		setCloudSyncStatus("uploading");
		setCloudSyncMessage("正在加密并上传到 GitHub Gist...");

		try {
			const content = await encryptCloudSyncData(
				createUserDataBackup(),
				cloudSyncAuth.syncKey,
			);
			const gistId = cloudSyncSettings.gistId.trim();
			const result = gistId
				? await updateGitHubSyncGist(
						cloudSyncAuth.accessToken,
						gistId,
						content,
					)
				: await createGitHubSyncGist(cloudSyncAuth.accessToken, content);
			const syncedAt = result.updatedAt ?? new Date().toISOString();

			setCloudSyncSettings({
				gistId: result.gistId,
				lastSyncedAt: syncedAt,
				lastDirection: "push",
			});
			setCloudSyncMessage("已上传到 GitHub Gist");
		} catch (error) {
			console.error("Failed to push cloud sync", error);
			setCloudSyncMessage(
				error instanceof Error ? error.message : "上传到云端失败",
			);
		} finally {
			setCloudSyncStatus("idle");
		}
	};

	const handleCloudPull = async () => {
		if (!cloudSyncAuth) {
			setCloudSyncMessage("请先连接 GitHub");
			return;
		}

		setCloudSyncStatus("downloading");
		setCloudSyncMessage("正在查找 GitHub Gist 同步数据...");

		try {
			const savedGistId = cloudSyncSettings.gistId.trim();
			const syncGist = savedGistId
				? { gistId: savedGistId }
				: await findGitHubSyncGist(cloudSyncAuth.accessToken);

			if (!syncGist) {
				throw new Error("没有找到 iResume 同步 Gist，请先在一台设备上传");
			}

			setCloudSyncMessage("正在读取并解密 GitHub Gist...");
			const content = await readGitHubSyncGist(
				cloudSyncAuth.accessToken,
				syncGist.gistId,
			);
			const parsed = await decryptCloudSyncData(
				content,
				cloudSyncAuth.syncKey,
			);
			const error = applyUserDataBackup(parsed);
			if (error) throw new Error(error);
			const syncedAt = new Date().toISOString();

			setCloudSyncSettings({
				gistId: syncGist.gistId,
				lastSyncedAt: syncedAt,
				lastDirection: "pull",
			});
			setCloudSyncMessage("已从 GitHub Gist 恢复");
		} catch (error) {
			console.error("Failed to pull cloud sync", error);
			setCloudSyncMessage(
				error instanceof Error ? error.message : "从云端恢复失败",
			);
		} finally {
			setCloudSyncStatus("idle");
		}
	};

	useEffect(() => {
		if (!importError) return;
		const timer = setTimeout(() => setImportError(null), 4000);
		return () => clearTimeout(timer);
	}, [importError]);

	useEffect(() => {
		if (imageExportStatus !== "error") return;
		const timer = setTimeout(() => setImageExportStatus("idle"), 4000);
		return () => clearTimeout(timer);
	}, [imageExportStatus]);

	const updateActiveDocument = useCallback(
		(updater: (document: ResumeDocument) => ResumeDocument) => {
			setLibrary((current) => ({
				...current,
				documents: current.documents.map((document) =>
					document.id === current.activeId
						? {
								...updater(document),
								updatedAt: new Date().toISOString(),
							}
						: document,
				),
			}));
		},
		[],
	);

	const handleResumeDataChange = (nextData: ResumeData) => {
		updateActiveDocument((document) => ({ ...document, data: nextData }));
	};

	const handleThemeChange = (nextThemeId: ThemeId) => {
		updateActiveDocument((document) => ({
			...document,
			appearance: {
				...document.appearance,
				themeId: nextThemeId,
				sectionIcons: getDefaultSectionIconVisibility(nextThemeId),
			},
		}));
		setAppearancePanelOpen(false);
	};

	const handleFontSizeChange = (nextFontSize: ResumeFontSizePt) => {
		updateActiveDocument((document) => ({
			...document,
			appearance: { ...document.appearance, fontSizePt: nextFontSize },
		}));
	};

	const handleFontFamilyChange = (nextFontFamily: ResumeFontFamily) => {
		updateActiveDocument((document) => ({
			...document,
			appearance: { ...document.appearance, fontFamily: nextFontFamily },
		}));
	};

	const handlePageMarginChange = (nextPageMargin: ResumePageMarginMm) => {
		updateActiveDocument((document) => ({
			...document,
			appearance: { ...document.appearance, pageMarginMm: nextPageMargin },
		}));
	};

	const handleSectionPreferencesChange = (
		nextPreferences: ResumeSectionPreferences,
	) => {
		updateActiveDocument((document) => ({
			...document,
			appearance: {
				...document.appearance,
				sectionPreferences: nextPreferences,
			},
		}));
	};

	const handleSectionIconsChange = (
		nextSectionIcons: SectionIconVisibility,
	) => {
		updateActiveDocument((document) => ({
			...document,
			appearance: {
				...document.appearance,
				sectionIcons: nextSectionIcons,
			},
		}));
	};

	const handleCanvasPointerDown = (
		event: ReactPointerEvent<HTMLDivElement>,
	) => {
		event.currentTarget.focus({ preventScroll: true });
		setCanvasShortcutsActive(true);
		canvasShortcutsActiveRef.current = true;
		setAppearancePanelOpen(false);
		if (!isSpacePanningRef.current || event.button !== 0) return;
		const node = canvasScrollRef.current;
		if (!node) return;

		event.preventDefault();
		panStateRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			scrollLeft: node.scrollLeft,
			scrollTop: node.scrollTop,
		};
		isPanningRef.current = true;
		setIsPanning(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handleCanvasPointerMove = (
		event: ReactPointerEvent<HTMLDivElement>,
	) => {
		const state = panStateRef.current;
		const node = canvasScrollRef.current;
		if (!state || !node || state.pointerId !== event.pointerId) return;

		event.preventDefault();
		node.scrollLeft = state.scrollLeft - (event.clientX - state.startX);
		node.scrollTop = state.scrollTop - (event.clientY - state.startY);
	};

	const stopCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (panStateRef.current?.pointerId !== event.pointerId) return;
		panStateRef.current = null;
		isPanningRef.current = false;
		setIsPanning(false);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const handlePreviewSectionClick = (section: SectionKey) => {
		if (isPanningRef.current || isSpacePanningRef.current) return;
		setActiveSection(section);
		setRightPanelOpen(true);
		setAppearancePanelOpen(false);
	};

	const handleCreateResume = (input: { name: string; tags: string[] }) => {
		const nextDocument = createResumeDocument({
			name: input.name,
			tags: input.tags,
		});
		setLibrary((current) => ({
			...current,
			activeId: nextDocument.id,
			documents: [nextDocument, ...current.documents],
		}));
		setView("editor");
	};

	const handleOpenResume = (id: string) => {
		setLibrary((current) => ({ ...current, activeId: id }));
		setView("editor");
	};

	const handleDuplicateResume = (id: string) => {
		setLibrary((current) => {
			const source = current.documents.find((document) => document.id === id);
			if (!source) return current;
			const nextDocument = createResumeDocument({
				name: `${source.name} 副本`,
				tags: source.tags,
				version: source.version,
				data: source.data,
				appearance: source.appearance,
			});

			return {
				...current,
				activeId: nextDocument.id,
				documents: [nextDocument, ...current.documents],
			};
		});
	};

	const handleDeleteResume = (id: string) => {
		if (library.documents.length <= 1) return;
		if (!window.confirm("确定要删除这份简历吗？")) return;

		setLibrary((current) => {
			const documents = current.documents.filter((document) => document.id !== id);
			if (documents.length === 0) return current;

			return {
				...current,
				activeId:
					current.activeId === id ? documents[0].id : current.activeId,
				documents,
			};
		});
	};

	const handleUpdateResumeMeta = (
		id: string,
		meta: Partial<Pick<ResumeDocument, "name" | "tags" | "version">>,
	) => {
		setLibrary((current) => ({
			...current,
			documents: current.documents.map((document) =>
				document.id === id
					? {
							...document,
							name:
								meta.name !== undefined
									? meta.name.slice(0, 80)
									: document.name,
							tags:
								meta.tags !== undefined
									? normalizeResumeTags(meta.tags)
									: document.tags,
							version:
								meta.version !== undefined
									? normalizeResumeVersion(meta.version)
									: document.version,
							updatedAt: new Date().toISOString(),
						}
					: document,
			),
		}));
	};

	const measurePreviewPages = useCallback(() => {
		if (isPrintingRef.current) return;
		const preview = resumePreviewRef.current;
		const inner = resumePreviewInnerRef.current;
		if (!preview || !inner) return;

		const previewWidth =
			preview.getBoundingClientRect().width || preview.scrollWidth;
		const pxPerMm = previewWidth / A4_WIDTH_MM;
		const printablePageHeightPx = Math.max(
			1,
			getPrintablePageHeightMm(pageMarginMm) * pxPerMm,
		);
		const contentHeight = inner.getBoundingClientRect().height;
		const nextPageCount = Math.max(
			1,
			Math.ceil(contentHeight / printablePageHeightPx),
		);

		const nextLayouts: PreviewPageLayout[] = Array.from(
			{ length: nextPageCount },
			(_, i) => ({
				startMm: (i * printablePageHeightPx) / pxPerMm,
				bottomBlankMm: 0,
			}),
		);

		setPreviewPageCount((current) =>
			current === nextPageCount ? current : nextPageCount,
		);
		setPreviewPageLayouts((current) => {
			const same =
				current.length === nextLayouts.length &&
				current.every(
					(item, index) =>
						Math.abs(item.startMm - nextLayouts[index].startMm) < 0.1,
				);
			return same ? current : nextLayouts;
		});
	}, [pageMarginMm]);

	useEffect(() => {
		const inner = resumePreviewInnerRef.current;
		if (!inner || view !== "editor") return;

		measurePreviewPages();
		const observer = new ResizeObserver(measurePreviewPages);
		observer.observe(inner);
		window.addEventListener("resize", measurePreviewPages);
		const frame = window.requestAnimationFrame(measurePreviewPages);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measurePreviewPages);
			window.cancelAnimationFrame(frame);
		};
	}, [
		measurePreviewPages,
		resumeData,
		themeId,
		fontSizePt,
		sectionIcons,
		sectionPreferences,
		view,
	]);

	const handleReset = () => {
		if (window.confirm("确定要重置当前简历到默认模版吗？")) {
			updateActiveDocument((document) => ({
				...document,
				data: normalizeResumeData(undefined),
				appearance: {
					themeId: DEFAULT_THEME_ID,
					fontSizePt: DEFAULT_RESUME_FONT_SIZE_PT,
					pageMarginMm: DEFAULT_RESUME_PAGE_MARGIN_MM,
					fontFamily: DEFAULT_RESUME_FONT_FAMILY,
					sectionIcons: getDefaultSectionIconVisibility(DEFAULT_THEME_ID),
					sectionPreferences: DEFAULT_SECTION_PREFERENCES,
				},
			}));
		}
	};

	const handlePrint = useCallback(() => {
		const name = getPrintTitleName(activeDocument, resumeData);
		const originalTitle = document.title;
		const canvasNode = canvasScrollRef.current;
		const savedScroll = canvasNode
			? {
					left: canvasNode.scrollLeft,
					top: canvasNode.scrollTop,
				}
			: null;
		const savedWindowScroll = {
			left: window.scrollX,
			top: window.scrollY,
		};

		document.title = `${name} - iResume 简历`;

		const restoreCanvasScroll = () => {
			const restore = () => {
				const nextCanvasNode = canvasScrollRef.current;
				if (nextCanvasNode && savedScroll) {
					nextCanvasNode.scrollLeft = savedScroll.left;
					nextCanvasNode.scrollTop = savedScroll.top;
				}
				window.scrollTo(savedWindowScroll.left, savedWindowScroll.top);
			};

			requestAnimationFrame(() => {
				restore();
				requestAnimationFrame(restore);
			});
			window.setTimeout(restore, 80);
		};

		const preparePrint = () => {
			isPrintingRef.current = true;
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
		};

		const restore = () => {
			isPrintingRef.current = false;
			document.title = originalTitle;
			restoreCanvasScroll();
			window.removeEventListener("beforeprint", preparePrint);
			window.removeEventListener("afterprint", restore);
		};
		window.addEventListener("beforeprint", preparePrint);
		window.addEventListener("afterprint", restore);

		preparePrint();
		window.print();
	}, [activeDocument, resumeData]);

	const handleExport = () => {
		const backup = createResumeBackup(
			resumeData,
			themeId,
			fontSizePt,
			pageMarginMm,
			fontFamily,
			sectionIcons,
			sectionPreferences,
		);
		const json = JSON.stringify(backup, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const name =
			activeDocument.name.trim() || resumeData.personal.name.trim() || "resume";
		const filename = `${name}_iResume.json`;

		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportImage = async () => {
		const node = resumePreviewRef.current;
		const inner = resumePreviewInnerRef.current;
		if (!node || !inner) return;

		setImageExportStatus("exporting");
		try {
			const { toPng } = await import("html-to-image");
			const styles = window.getComputedStyle(node);
			const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
			const exportHeight = Math.ceil(
				inner.offsetTop + inner.offsetHeight + paddingBottom,
			);
			const exportWidth = Math.ceil(node.offsetWidth);
			const dataUrl = await toPng(node, {
				backgroundColor: "#ffffff",
				cacheBust: true,
				height: exportHeight,
				pixelRatio: 2,
				width: exportWidth,
				style: {
					boxShadow: "none",
					height: `${exportHeight}px`,
					minHeight: "0",
					overflow: "hidden",
					width: `${exportWidth}px`,
				},
			});

			const name =
				activeDocument.name.trim() || resumeData.personal.name.trim() || "resume";
			const a = document.createElement("a");
			a.href = dataUrl;
			a.download = `${name}_iResume.png`;
			a.click();
			setImageExportStatus("idle");
		} catch (error) {
			console.error("Failed to export resume image", error);
			setImageExportStatus("error");
		}
	};

	const handleImportClick = () => {
		setImportError(null);
		importInputRef.current?.click();
	};

	const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		if (!file.name.endsWith(".json")) {
			setImportError("请选择 .json 文件");
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const parsed = JSON.parse(ev.target?.result as string);
				const imported = normalizeResumeBackup(parsed);
				const importedThemeId = imported.themeId ?? themeId;
				updateActiveDocument((document) => ({
					...document,
					data: imported.data,
					appearance: normalizeResumeAppearance(
						{
							themeId: importedThemeId,
							fontSizePt: imported.fontSizePt ?? fontSizePt,
							pageMarginMm: imported.pageMarginMm ?? pageMarginMm,
							fontFamily: imported.fontFamily ?? fontFamily,
							sectionIcons:
								imported.sectionIcons ??
								getDefaultSectionIconVisibility(importedThemeId),
							sectionPreferences:
								imported.sectionPreferences ?? sectionPreferences,
						},
						document.appearance,
					),
				}));
			} catch {
				setImportError("文件解析失败，请确认是有效的简历 JSON 文件");
			}
		};
		reader.readAsText(file);
	};

	const printablePageHeightMm = getPrintablePageHeightMm(pageMarginMm);

	if (view === "manager") {
			return (
				<ResumeManager
					documents={library.documents}
					onCreate={handleCreateResume}
					onOpen={handleOpenResume}
					onDuplicate={handleDuplicateResume}
					onDelete={handleDeleteResume}
					onExportUserData={handleExportUserData}
					onImportUserData={handleImportUserData}
					cloudSync={{
						connected: Boolean(cloudSyncAuth),
						login: cloudSyncAuth?.login,
						avatarUrl: cloudSyncAuth?.avatarUrl,
						gistId: cloudSyncSettings.gistId,
						lastDirection: cloudSyncSettings.lastDirection,
						lastSyncedAt: cloudSyncSettings.lastSyncedAt,
						message: cloudSyncMessage,
						status: cloudSyncStatus,
						oauthConfigured: Boolean(
							import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID,
						),
					}}
					onCloudConnect={handleCloudConnect}
					onCloudDisconnect={handleCloudDisconnect}
					onCloudGistIdChange={handleCloudGistIdChange}
					onCloudPush={handleCloudPush}
					onCloudPull={handleCloudPull}
				/>
			);
		}

	const canvasPanClass = isPanning
		? "canvas-panning"
		: isSpacePanning
			? "canvas-pan-ready"
			: "";
	const toolbarFrameClass = [
		"fixed left-3 right-3 top-3 z-50 flex justify-center pointer-events-none print:hidden",
		leftPanelOpen ? "lg:left-[392px] xl:left-[416px]" : "lg:left-14",
		rightPanelOpen ? "lg:right-[424px] xl:right-[448px]" : "lg:right-14",
	].join(" ");
	const currentThemeName = themes[themeId].name;
	const previewCanvasHeightMm =
		previewPageMode === "paged"
			? previewPageCount * A4_HEIGHT_MM +
				Math.max(0, previewPageCount - 1) * PREVIEW_PAGE_GAP_MM
			: previewPageCount * A4_HEIGHT_MM;

	return (
		<div className="relative min-h-screen bg-slate-100 font-sans text-slate-900 print:h-auto print:min-h-0 print:overflow-visible print:bg-white lg:h-screen lg:overflow-hidden">
			<input
				ref={importInputRef}
				type="file"
				accept=".json,application/json"
				className="hidden print:hidden"
				onChange={handleImportFile}
			/>

				<div className={toolbarFrameClass} data-workbench-chrome="true">
					<div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-visible rounded-xl border border-slate-200/55 bg-white/72 px-1.5 py-1 shadow-sm shadow-slate-900/5 backdrop-blur">
						<div className="relative">
							<button
								type="button"
								onClick={() => setAppearancePanelOpen((open) => !open)}
								className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100/80"
								title="外观设置"
								aria-expanded={appearancePanelOpen}
							>
								<SlidersHorizontal size={14} className="text-slate-400" />
								<span>外观</span>
								<span className="hidden max-w-20 truncate text-slate-400 sm:inline">
									{currentThemeName}
								</span>
							</button>
							{appearancePanelOpen && (
								<div className="absolute left-1/2 top-10 z-20 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-slate-200/80 bg-white/95 p-2 shadow-xl shadow-slate-900/10 backdrop-blur">
									<div className="mb-2 flex items-center justify-between px-2 py-1">
										<span className="text-xs font-bold text-slate-700">
											外观设置
										</span>
										<span className="text-[11px] text-slate-400">
											{fontSizePt}pt · {pageMarginMm}mm
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<ThemePicker
											current={themeId}
											favoriteThemeIds={favoriteThemeIds}
											onChange={handleThemeChange}
											onToggleFavorite={handleToggleFavoriteTheme}
										/>
										<FontFamilyControl
											value={fontFamily}
											onChange={handleFontFamilyChange}
										/>
										<FontSizeControl
											value={fontSizePt}
											onChange={handleFontSizeChange}
										/>
										<PageMarginControl
											value={pageMarginMm}
											onChange={handlePageMarginChange}
										/>
									</div>
								</div>
							)}
							</div>
							<PreviewZoomControl value={previewZoom} onChange={setPreviewZoom} />
							<PreviewPageModeControl
								value={previewPageMode}
								onChange={setPreviewPageMode}
							/>
							<span className="ml-1 shrink-0 rounded-full border border-slate-200/60 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-slate-400 opacity-80 backdrop-blur-sm">
								预计 {previewPageCount} 页
							</span>
					</div>
				</div>

			{leftPanelOpen ? (
				<div
					className="p-3 pt-20 print:hidden lg:pointer-events-none lg:fixed lg:inset-y-4 lg:left-4 lg:z-40 lg:w-[330px] lg:p-0 xl:w-[360px]"
					data-workbench-chrome="true"
				>
					<aside className="pointer-events-auto flex overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur lg:h-full">
						<div className="flex min-w-0 flex-1 flex-col">
							<div className="shrink-0 border-b border-slate-200 px-3 py-3">
								<div className="flex items-center justify-between gap-3">
									<button
										type="button"
										onClick={() => setView("manager")}
										className="flex items-center gap-2 rounded-md text-xl font-bold transition hover:opacity-75"
										title="返回简历库"
										aria-label="返回简历库"
									>
										<span className="inline-flex items-center justify-center rounded bg-blue-600 px-2 py-1 text-sm font-black leading-none tracking-tight text-white">
											i
										</span>
										<span className="leading-none">Resume</span>
									</button>
									<div className="flex items-center gap-1">
										<a
											href="https://github.com/dogxii/iResume"
											target="_blank"
											rel="noreferrer"
											aria-label="GitHub 仓库"
											className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-700"
										>
											<Github size={17} />
										</a>
										<button
											type="button"
											onClick={() => setLeftPanelOpen(false)}
											className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-700 lg:flex"
											title="折叠左侧面板"
											aria-label="折叠左侧面板"
										>
											<PanelLeftClose size={17} />
										</button>
									</div>
								</div>

								<div className="mt-3 grid grid-cols-5 gap-1.5">
									<WorkbenchIconButton label="重置" onClick={handleReset}>
										<RotateCcw size={16} />
									</WorkbenchIconButton>
									<WorkbenchIconButton
										label="导入 JSON"
										onClick={handleImportClick}
									>
										<Upload size={16} />
									</WorkbenchIconButton>
									<WorkbenchIconButton label="导出 JSON" onClick={handleExport}>
										<Download size={16} />
									</WorkbenchIconButton>
									<WorkbenchIconButton
										label={
											imageExportStatus === "exporting"
												? "图片导出中"
												: "导出图片"
										}
										onClick={handleExportImage}
										disabled={imageExportStatus === "exporting"}
									>
										<ImageDown size={16} />
									</WorkbenchIconButton>
									<WorkbenchIconButton
										label="保存 PDF"
										onClick={handlePrint}
										variant="primary"
									>
										<Printer size={16} />
									</WorkbenchIconButton>
								</div>

								{importError && (
									<div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-500">
										{importError}
									</div>
								)}
								{imageExportStatus === "error" && (
									<div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-500">
										图片导出失败
									</div>
								)}
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
								<ResumeMetaEditor
									key={activeDocument.id}
									document={activeDocument}
									onUpdate={(meta) =>
										handleUpdateResumeMeta(activeDocument.id, meta)
									}
								/>
								<ResumeEditor
									data={resumeData}
									sectionIcons={sectionIcons}
									panel="structure"
									activeSection={activeSection}
									onActiveSectionChange={setActiveSection}
									onChange={handleResumeDataChange}
									onSectionIconsChange={handleSectionIconsChange}
								/>
								<ResumeDisplayPreferencesEditor
									sectionOrder={resumeData.sectionOrder}
									sectionTitles={resumeData.sectionTitles}
									preferences={sectionPreferences}
									onChange={handleSectionPreferencesChange}
								/>
							</div>
						</div>
					</aside>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setLeftPanelOpen(true)}
					className="fixed left-3 top-3 z-50 hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 text-slate-500 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:bg-white hover:text-slate-800 print:hidden lg:flex"
					title="展开左侧面板"
					aria-label="展开左侧面板"
					data-workbench-chrome="true"
				>
					<PanelLeftOpen size={17} />
				</button>
			)}

			<main
				ref={canvasScrollRef}
				tabIndex={-1}
				aria-label="简历预览画布"
				className={`min-h-[70vh] overflow-auto bg-slate-100 outline-none print:block print:h-auto print:min-h-0 print:overflow-visible print:bg-white lg:h-screen scrollbar-none ${canvasPanClass}`}
				onPointerDown={handleCanvasPointerDown}
				onPointerMove={handleCanvasPointerMove}
				onPointerUp={stopCanvasPan}
				onPointerCancel={stopCanvasPan}
				onLostPointerCapture={stopCanvasPan}
			>
				<div className="min-h-full p-4 pt-20 print:h-auto print:min-h-0 print:p-0 sm:p-5 sm:pt-20 lg:min-w-[calc(100vw+760px)] lg:px-[360px] lg:pb-5 lg:pt-20 xl:px-[400px]">
					<div className="flex min-h-full justify-center pb-20 print:block print:min-h-0 print:pb-0">
						<div className="mx-auto w-fit">
							<div
								className="resume-preview-scale-shell print:w-auto"
								style={{
									height: `${previewCanvasHeightMm * previewZoom}mm`,
									width: `${A4_WIDTH_MM * previewZoom}mm`,
								}}
							>
								<div
									className="resume-preview-scale relative w-[210mm] print:w-full print:min-h-0 print:bg-white print:shadow-none"
									style={{
										minHeight: `${previewCanvasHeightMm}mm`,
										transform: `scale(${previewZoom})`,
										transformOrigin: "top left",
									}}
								>
									{previewPageMode === "continuous" ? (
										<div className="relative bg-white shadow-2xl print:shadow-none">
											<ResumePreview
												ref={resumePreviewRef}
												contentRef={resumePreviewInnerRef}
												data={resumeData}
												themeId={themeId}
												fontSizePt={fontSizePt}
												fontFamily={fontFamily}
												pageMarginMm={pageMarginMm}
												sectionIcons={sectionIcons}
												sectionPreferences={sectionPreferences}
												minPageCount={previewPageCount}
												onSectionClick={handlePreviewSectionClick}
											/>
											{Array.from(
												{ length: previewPageCount - 1 },
												(_, index) => (
													<div
														key={index}
														className="pointer-events-none absolute left-0 right-0 z-10 border-t border-dashed border-blue-300/35 print:hidden"
														style={{
															top: `${pageMarginMm + (index + 1) * printablePageHeightMm}mm`,
														}}
													>
														<span className="absolute right-3 -top-3 rounded-full border border-blue-100/70 bg-white/70 px-2 py-0.5 text-[10px] font-medium text-blue-400/75 opacity-80 shadow-sm backdrop-blur-sm">
															第 {index + 2} 页
														</span>
													</div>
												),
											)}
										</div>
									) : (
										<>
											<div className="resume-print-source">
												<ResumePreview
													ref={resumePreviewRef}
													contentRef={resumePreviewInnerRef}
													data={resumeData}
													themeId={themeId}
													fontSizePt={fontSizePt}
													fontFamily={fontFamily}
													pageMarginMm={pageMarginMm}
													sectionIcons={sectionIcons}
													sectionPreferences={sectionPreferences}
													minPageCount={previewPageCount}
													onSectionClick={handlePreviewSectionClick}
												/>
											</div>
											<div
												className="resume-paged-visual flex flex-col print:hidden"
												style={{ gap: `${PREVIEW_PAGE_GAP_MM}mm` }}
											>
												{previewPageLayouts.map(
													(pageLayout, index) => (
														<div
															key={index}
															className="relative h-[297mm] w-[210mm] overflow-hidden bg-white shadow-2xl"
														>
															<div
																className="absolute left-0 top-0 w-[210mm]"
																style={{
																	transform: `translateY(-${pageLayout.startMm}mm)`,
																}}
															>
																<ResumePreview
																	data={resumeData}
																	themeId={themeId}
																	fontSizePt={fontSizePt}
																	fontFamily={fontFamily}
																	pageMarginMm={pageMarginMm}
																	sectionIcons={sectionIcons}
																	sectionPreferences={sectionPreferences}
																	minPageCount={previewPageCount}
																	onSectionClick={handlePreviewSectionClick}
																/>
															</div>
															{index > 0 && (
																<div
																	className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-white"
																	style={{ height: `${pageMarginMm}mm` }}
																/>
															)}
															<div
																className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-white"
																style={{
																	height: `${
																		pageMarginMm + pageLayout.bottomBlankMm
																	}mm`,
																}}
															/>
														</div>
													),
												)}
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			{rightPanelOpen ? (
				<div
					className="p-3 pt-0 print:hidden lg:pointer-events-none lg:fixed lg:inset-y-4 lg:right-4 lg:z-40 lg:w-[370px] lg:p-0 xl:w-[400px]"
					data-workbench-chrome="true"
				>
					<aside className="pointer-events-auto relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur lg:h-full">
						<button
							type="button"
							onClick={() => setRightPanelOpen(false)}
							className="absolute right-3 top-3 z-10 hidden h-8 w-8 items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-700 lg:flex"
							title="折叠右侧面板"
							aria-label="折叠右侧面板"
						>
							<PanelRightClose size={17} />
						</button>
						<ResumeEditor
							data={resumeData}
							sectionIcons={sectionIcons}
							panel="details"
							activeSection={activeSection}
							onActiveSectionChange={setActiveSection}
							onChange={handleResumeDataChange}
							onSectionIconsChange={handleSectionIconsChange}
						/>
					</aside>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setRightPanelOpen(true)}
					className="fixed right-3 top-3 z-50 hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 text-slate-500 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:bg-white hover:text-slate-800 print:hidden lg:flex"
					title="展开右侧面板"
					aria-label="展开右侧面板"
					data-workbench-chrome="true"
				>
					<PanelRightOpen size={17} />
				</button>
			)}

			<div
				className={`fixed bottom-5 right-5 z-50 flex items-center gap-1.5 rounded-full border border-slate-200/50 bg-white/50 px-2 py-1 text-[10px] text-slate-400 shadow-sm backdrop-blur transition hover:opacity-95 print:hidden ${
					canvasShortcutsActive ? "opacity-75" : "opacity-35"
				} ${
					rightPanelOpen ? "lg:right-[420px] xl:right-[450px]" : ""
				}`}
				data-workbench-chrome="true"
			>
				<Hand size={12} />
				<span>
					<kbd className="rounded border border-current/20 px-1 font-mono text-[9px]">
						Space
					</kbd>{" "}
					抓手
				</span>
				<span className="hidden sm:inline text-slate-300">·</span>
				<span className="hidden sm:inline">
					<kbd className="rounded border border-current/20 px-1 font-mono text-[9px]">
						⌘/Ctrl
					</kbd>{" "}
					+ 滚轮缩放
				</span>
			</div>
		</div>
	);
}

export default App;
