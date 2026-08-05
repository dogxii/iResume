import {
	ChevronDown,
	ClipboardCopy,
	Clock,
	Download,
	FileJson,
	FileText,
	FileUp,
	Github,
	Hand,
	ImageDown,
	PanelLeftClose,
	PanelLeftOpen,
	PanelRightClose,
	PanelRightOpen,
	Printer,
	Redo2,
	Tags,
	TrendingUp,
	Undo2,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type ChangeEvent as ReactChangeEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from "react";
import PreviewPageModeControl from "./components/PreviewPageModeControl";
import PreviewZoomControl from "./components/PreviewZoomControl";
import ResumeEditor from "./components/ResumeEditor";
import ResumeHistoryModal from "./components/ResumeHistory";
import ResumeManager, { type ManagerView } from "./components/ResumeManager";
import ResumePreview from "./components/TemplateResumePreview";
import {
	createResumeBackup,
	normalizeResumeBackup,
	type ImportedResumeBackup,
} from "./data/resumeBackup";
import { createResumeMarkdown } from "./data/resumeMarkdown";
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
	clearLocalFolderSyncDirectoryHandle,
	loadLocalFolderSyncDirectoryHandle,
	pickLocalFolderSyncDirectory,
	readLocalFolderSyncSnapshot,
	saveLocalFolderSyncDirectoryHandle,
	verifyLocalFolderPermission,
	writeLocalFolderSyncSnapshot,
	type LocalFolderSyncSettings,
	type LocalFolderSyncStatus,
} from "./data/localFolderSync";
import {
	addSnapshot,
	computeNextVersion,
	createDocumentHistory,
	DEFAULT_SNAPSHOT_LABEL,
	getLatestSnapshotVersion,
	type DocumentHistory,
} from "./data/resumeHistory";
import {
	createResumeDocument,
	normalizeResumeAppearance,
	normalizeResumeTags,
	normalizeResumeVersion,
	type ResumeAppearance,
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
	normalizeResumeAccentColor,
	resumePageMarginPxToMm,
	type ResumeFontSizePt,
	type ResumeItemTitleFontSizePx,
	type ResumePageMarginMm,
	type ResumeFontFamily,
	type ResumeLineHeight,
	type ResumeParagraphSpacingPx,
	type ResumeSectionPreferences,
	type ResumeSectionSpacing,
	type ResumeSectionTitleFontSizePx,
} from "./data/resumeStyle";
import {
	DEFAULT_TEMPLATE_ID,
	getDefaultSectionIconVisibility,
	normalizeTemplateIdList,
} from "./data/templateConfigs";
import { useResumeWorkspace } from "./store/useResumeWorkspace";
import {
	normalizeResumeWorkspace,
	type ResumeWorkspace,
} from "./domain/resumeWorkspace";
import type {
	ResumeData,
	ResumeEditableSectionKey,
	SectionIconVisibility,
} from "./types/resume";
import type { TemplateId } from "./types/template";

const FAVORITE_TEMPLATES_STORAGE_KEY = "iresume:v2:favorite-templates";
const PREVIEW_ZOOM_STORAGE_KEY = "iresume:v2:preview-zoom";
const PREVIEW_PAGE_MODE_STORAGE_KEY = "resume-preview-page-mode";
const APP_VIEW_STORAGE_KEY = "resume-app-view";
const CLOUD_SYNC_AUTH_STORAGE_KEY = "resume-cloud-sync-auth";
const CLOUD_SYNC_SETTINGS_STORAGE_KEY = "resume-cloud-sync-settings";
const CLOUD_SYNC_OAUTH_STATE_STORAGE_KEY = "resume-cloud-sync-oauth-state";
const LOCAL_FOLDER_SYNC_SETTINGS_STORAGE_KEY =
	"iresume:v2:local-folder-sync-settings";
const EDITOR_LEFT_PANEL_WIDTH_STORAGE_KEY = "iresume:v2:editor-left-panel-width";
const EDITOR_RIGHT_PANEL_WIDTH_STORAGE_KEY =
	"iresume:v2:editor-right-panel-width";
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;
const PREVIEW_PAGE_GAP_MM = 10;
const MAX_PREVIEW_PAGE_BOTTOM_BLANK_RATIO = 0.18;
const CSS_PX_PER_MM = 96 / 25.4;
const MOBILE_PREVIEW_BREAKPOINT_PX = 640;
const MOBILE_PREVIEW_SIDE_PADDING_PX = 32;
const MIN_MOBILE_PREVIEW_ZOOM = 0.1;
const DESKTOP_PREVIEW_BREAKPOINT_PX = 1024;
const MAX_EDITOR_PANEL_WIDTH_PX = 540;
const MIN_EDITOR_PANEL_WIDTH_PX = {
	left: 280,
	right: 300,
} as const;

type CloudSyncStatus = "idle" | "connecting" | "uploading" | "downloading";

interface UserDataBackup {
	version: 2;
	exportedAt: string;
	workspace: ResumeWorkspace;
	favoriteTemplateIds: TemplateId[];
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

const getPrintablePageHeightMm = (pageMarginPx: ResumePageMarginMm) =>
	A4_HEIGHT_MM - resumePageMarginPxToMm(pageMarginPx) * 2;

const readTimeMs = (value: unknown) => {
	if (typeof value !== "string") return null;
	const time = new Date(value).getTime();
	return Number.isFinite(time) ? time : null;
};

const formatSyncDateTime = (timeMs: number) =>
	new Intl.DateTimeFormat("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(timeMs));

const getImportedResumeAppearance = (
	imported: ImportedResumeBackup,
	fallback?: ResumeAppearance,
): ResumeAppearance => {
	const importedTemplateId = imported.templateId ?? fallback?.templateId ?? DEFAULT_TEMPLATE_ID;

	return normalizeResumeAppearance(
		{
			templateId: importedTemplateId,
			accentColor: imported.accentColor ?? fallback?.accentColor,
			fontSizePt: imported.fontSizePt ?? fallback?.fontSizePt,
			sectionTitleFontSizePx:
				imported.sectionTitleFontSizePx ??
				fallback?.sectionTitleFontSizePx,
			itemTitleFontSizePx:
				imported.itemTitleFontSizePx ?? fallback?.itemTitleFontSizePx,
			pageMarginMm: imported.pageMarginMm ?? fallback?.pageMarginMm,
			fontFamily: imported.fontFamily ?? fallback?.fontFamily,
			lineHeight: imported.lineHeight ?? fallback?.lineHeight,
			sectionSpacing: imported.sectionSpacing ?? fallback?.sectionSpacing,
			paragraphSpacingPx:
				imported.paragraphSpacingPx ?? fallback?.paragraphSpacingPx,
			sectionIcons:
				imported.sectionIcons ?? getDefaultSectionIconVisibility(),
			sectionPreferences:
				imported.sectionPreferences ?? fallback?.sectionPreferences,
		},
		fallback,
	);
};

const getLatestLibraryUpdatedAtMs = (library: ResumeLibrary) =>
	library.documents.reduce<number | null>((latest, document) => {
		const updatedAt = readTimeMs(document.updatedAt);
		if (updatedAt === null) return latest;
		return latest === null ? updatedAt : Math.max(latest, updatedAt);
	}, null);

const getBackupExportedAtMs = (backup: unknown) =>
	isPlainObject(backup) ? readTimeMs(backup.exportedAt) : null;

type AppView = "manager" | "editor";

type EditorPanelSide = "left" | "right";

const getDefaultEditorPanelWidth = (
	side: EditorPanelSide,
	width = typeof window === "undefined" ? 1280 : window.innerWidth,
) => {
	const wide = width >= 1280;
	if (side === "left") return wide ? 320 : 300;
	return wide ? 360 : 330;
};

const normalizeEditorPanelWidth = (
	value: unknown,
	side: EditorPanelSide,
	fallback = getDefaultEditorPanelWidth(side),
) => {
	if (value === null || value === undefined || value === "") return fallback;
	const width = Number(value);
	if (!Number.isFinite(width)) return fallback;
	const minimumWidth = MIN_EDITOR_PANEL_WIDTH_PX[side];
	return Math.min(
		MAX_EDITOR_PANEL_WIDTH_PX,
		Math.max(minimumWidth, width),
	);
};

const readInitialView = (library: ResumeLibrary): AppView =>
	localStorage.getItem(APP_VIEW_STORAGE_KEY) === "editor" &&
	library.documents.length > 0
		? "editor"
		: "manager";

const sanitizeFileNamePart = (value: string) =>
	value
		.replace(/[\\/:*?"<>|]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const getResumeExportFileBaseName = (
	document: ResumeDocument,
	data: ResumeData,
) => {
	const name =
		sanitizeFileNamePart(document.name) ||
		sanitizeFileNamePart(data.personal.name) ||
		"resume";
	const version =
		sanitizeFileNamePart(document.version).replace(/^v+/i, "") || "1.0.0";

	return `${name}-v${version}`;
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

const downloadTextFile = (content: string, type: string, filename: string) => {
	const blob = new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};

const copyTextToClipboard = async (text: string) => {
	if (navigator.clipboard && window.isSecureContext) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "true");
	textarea.style.position = "fixed";
	textarea.style.left = "-9999px";
	document.body.appendChild(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	document.body.removeChild(textarea);
	if (!copied) throw new Error("无法复制文本");
};

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

const readLocalFolderSyncSettings = (): LocalFolderSyncSettings => {
	const saved = localStorage.getItem(LOCAL_FOLDER_SYNC_SETTINGS_STORAGE_KEY);
	if (!saved) return { directoryName: "" };

	try {
		const value = JSON.parse(saved) as unknown;
		if (!isPlainObject(value)) return { directoryName: "" };

		return {
			directoryName:
				typeof value.directoryName === "string" ? value.directoryName : "",
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
		return { directoryName: "" };
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
	onOpenHistory: () => void;
	onBumpVersion: () => void;
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

const ResumeMetaEditor = ({
	document,
	onUpdate,
	onOpenHistory,
	onBumpVersion,
}: ResumeMetaEditorProps) => (
	<div className="border-b border-slate-200 p-4">
		<div className="mb-3">
			<h2 className="text-sm font-bold text-slate-800">简历信息</h2>
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

		<div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
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
				onClick={onBumpVersion}
				className="mt-5 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-blue-600"
				title="版本 +0.0.1"
				aria-label="版本 +0.0.1"
			>
				<TrendingUp size={15} />
			</button>
			<button
				type="button"
				onClick={onOpenHistory}
				className="relative mt-5 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-blue-600"
				title="历史栈"
				aria-label="历史栈"
			>
				<Clock size={15} />
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

function App() {
	const importInputRef = useRef<HTMLInputElement>(null);
	const resumePreviewRef = useRef<HTMLDivElement>(null);
	const resumePreviewInnerRef = useRef<HTMLDivElement>(null);
	const canvasScrollRef = useRef<HTMLDivElement>(null);
	const isPrintingRef = useRef(false);
	const wheelZoomLastAtRef = useRef(0);
	const panStateRef = useRef<{
		pointerId: number;
		source: "middle" | "space";
		startX: number;
		startY: number;
		scrollLeft: number;
		scrollTop: number;
	} | null>(null);
	const editorPanelResizeRef = useRef<{
		side: EditorPanelSide;
		pointerId: number;
		startX: number;
		startWidth: number;
	} | null>(null);
	const canvasShortcutsActiveRef = useRef(false);
	const isCanvasPanReadyRef = useRef(false);
	const isPanningRef = useRef(false);
	const {
		workspace,
		replaceWorkspace,
		library,
		setLibrary,
		updateDocument,
		updateActiveDocument,
		setDocumentHistory,
		undo,
		redo,
		canUndo,
		canRedo,
		storageError,
	} = useResumeWorkspace();
	const [view, setView] = useState<AppView>(() => readInitialView(library));
	const [cloudSyncAuth, setCloudSyncAuth] = useState<CloudSyncAuth | null>(
		readCloudSyncAuth,
	);
	const [cloudSyncSettings, setCloudSyncSettings] =
		useState<CloudSyncSettings>(readCloudSyncSettings);
	const [cloudSyncStatus, setCloudSyncStatus] =
		useState<CloudSyncStatus>("idle");
	const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
	const [localFolderHandle, setLocalFolderHandle] =
		useState<FileSystemDirectoryHandle | null>(null);
	const [localFolderSyncSettings, setLocalFolderSyncSettings] =
		useState<LocalFolderSyncSettings>(readLocalFolderSyncSettings);
	const [localFolderSyncStatus, setLocalFolderSyncStatus] =
		useState<LocalFolderSyncStatus>("idle");
	const [localFolderSyncMessage, setLocalFolderSyncMessage] =
		useState<string | null>(null);
	const [imageExportStatus, setImageExportStatus] = useState<
		"idle" | "exporting" | "error"
	>("idle");
	const [copyTextStatus, setCopyTextStatus] = useState<
		"idle" | "copied" | "error"
	>("idle");
	const [importError, setImportError] = useState<string | null>(null);
	const [exportMenuOpen, setExportMenuOpen] = useState(false);
	const [managerInitialView, setManagerInitialView] =
		useState<ManagerView>("resumes");
	const [previewPageCount, setPreviewPageCount] = useState(1);
	const [previewPageLayouts, setPreviewPageLayouts] = useState<
		PreviewPageLayout[]
	>([{ startMm: 0, bottomBlankMm: 0 }]);
	const [activeSection, setActiveSection] =
		useState<ResumeEditableSectionKey>("personal");
	const [isCanvasPanReady, setIsCanvasPanReady] = useState(false);
	const [isPanning, setIsPanning] = useState(false);
	const [canvasShortcutsActive, setCanvasShortcutsActive] = useState(false);
	const [leftPanelOpen, setLeftPanelOpen] = useState(true);
	const [rightPanelOpen, setRightPanelOpen] = useState(true);
	const [leftPanelWidth, setLeftPanelWidth] = useState(() =>
		normalizeEditorPanelWidth(
			localStorage.getItem(EDITOR_LEFT_PANEL_WIDTH_STORAGE_KEY),
			"left",
			getDefaultEditorPanelWidth("left"),
		),
	);
	const [rightPanelWidth, setRightPanelWidth] = useState(() =>
		normalizeEditorPanelWidth(
			localStorage.getItem(EDITOR_RIGHT_PANEL_WIDTH_STORAGE_KEY),
			"right",
			getDefaultEditorPanelWidth("right"),
		),
	);
	const [historyModalOpen, setHistoryModalOpen] = useState(false);
	const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
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
	const resolvedActiveSection =
		activeSection === "personal" || resumeData.sectionOrder.includes(activeSection)
			? activeSection
			: (resumeData.sectionOrder[0] ?? "personal");
	const documentHistory =
		workspace.histories[activeDocument.id] ?? createDocumentHistory();
	const {
		templateId,
		accentColor,
		fontSizePt,
		sectionTitleFontSizePx,
		itemTitleFontSizePx,
		fontFamily,
		pageMarginMm,
		lineHeight,
		sectionSpacing,
		paragraphSpacingPx,
		sectionIcons,
		sectionPreferences,
	} = activeDocument.appearance;
	const isMobilePreviewViewport =
		viewportWidth < MOBILE_PREVIEW_BREAKPOINT_PX;
	const mobilePreviewFitZoom = Math.max(
		MIN_MOBILE_PREVIEW_ZOOM,
		Math.min(
			1,
			(viewportWidth - MOBILE_PREVIEW_SIDE_PADDING_PX) /
				(A4_WIDTH_MM * CSS_PX_PER_MM),
		),
	);
	const previewRenderZoom = isMobilePreviewViewport
		? Math.min(previewZoom, mobilePreviewFitZoom)
		: previewZoom;

	useEffect(() => {
		const updateViewportWidth = () => {
			setViewportWidth(window.innerWidth);
		};

		updateViewportWidth();
		window.addEventListener("resize", updateViewportWidth);
		return () => window.removeEventListener("resize", updateViewportWidth);
	}, []);

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
		localStorage.setItem(
			LOCAL_FOLDER_SYNC_SETTINGS_STORAGE_KEY,
			JSON.stringify(localFolderSyncSettings),
		);
	}, [localFolderSyncSettings]);

	useEffect(() => {
		localStorage.setItem(
			EDITOR_LEFT_PANEL_WIDTH_STORAGE_KEY,
			String(Math.round(leftPanelWidth)),
		);
	}, [leftPanelWidth]);

	useEffect(() => {
		localStorage.setItem(
			EDITOR_RIGHT_PANEL_WIDTH_STORAGE_KEY,
			String(Math.round(rightPanelWidth)),
		);
	}, [rightPanelWidth]);

	useEffect(() => {
		let canceled = false;
		loadLocalFolderSyncDirectoryHandle()
			.then((handle) => {
				if (canceled || !handle) return;
				setLocalFolderHandle(handle);
				setLocalFolderSyncSettings((current) => ({
					...current,
					directoryName: current.directoryName || handle.name,
				}));
			})
			.catch((error: unknown) => {
				if (canceled) return;
				console.warn("Failed to load local sync directory", error);
			});

		return () => {
			canceled = true;
		};
	}, []);

	useEffect(
		() => () => {
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		},
		[],
	);

	const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<TemplateId[]>(() => {
		const saved = localStorage.getItem(FAVORITE_TEMPLATES_STORAGE_KEY);
		if (!saved) return [];

		try {
			return normalizeTemplateIdList(JSON.parse(saved));
		} catch {
			return [];
		}
	});

	useEffect(() => {
		localStorage.setItem(
			FAVORITE_TEMPLATES_STORAGE_KEY,
			JSON.stringify(favoriteTemplateIds),
		);
	}, [favoriteTemplateIds]);

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

		let canceled = false;
		const connectGitHub = async () => {
			if (!savedState || savedState !== state) {
				if (canceled) return;
				setCloudSyncMessage("GitHub 登录状态校验失败，请重新连接");
				cleanupUrl();
				return;
			}

			sessionStorage.removeItem(CLOUD_SYNC_OAUTH_STATE_STORAGE_KEY);
			if (canceled) return;
			setCloudSyncStatus("connecting");
			setCloudSyncMessage("正在连接 GitHub...");

			try {
				const token = await exchangeGitHubOAuthCode(code, redirectUri);
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
			} catch (error: unknown) {
				if (canceled) return;
				console.error("GitHub OAuth failed", error);
				setCloudSyncMessage(
					error instanceof Error ? error.message : "GitHub 登录失败",
				);
			} finally {
				if (!canceled) {
					setCloudSyncStatus("idle");
					cleanupUrl();
				}
			}
		};

		void connectGitHub();

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
	}, [activeDocument.id, previewRenderZoom, view]);

	useEffect(() => {
		canvasShortcutsActiveRef.current = canvasShortcutsActive;
	}, [canvasShortcutsActive]);

	useEffect(() => {
		isCanvasPanReadyRef.current = isCanvasPanReady;
	}, [isCanvasPanReady]);

	useEffect(() => {
		isPanningRef.current = isPanning;
	}, [isPanning]);

	useEffect(() => {
		if (!exportMenuOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setExportMenuOpen(false);
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [exportMenuOpen]);

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

		const syncCanvasPanReadyClass = (enabled: boolean) => {
			document.documentElement.classList.toggle(
				"resume-canvas-pan-ready",
				enabled,
			);
			document.body.classList.toggle("resume-canvas-pan-ready", enabled);
		};

		const releaseHand = () => {
			panStateRef.current = null;
			isPanningRef.current = false;
			isCanvasPanReadyRef.current = false;
			setIsPanning(false);
			setIsCanvasPanReady(false);
			syncCanvasPanReadyClass(false);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (!canUseCanvasShortcuts(event.target)) return;

			if (isSpaceKey(event)) {
				event.preventDefault();
				event.stopPropagation();
				if (!event.repeat) {
					isCanvasPanReadyRef.current = true;
					setIsCanvasPanReady(true);
					syncCanvasPanReadyClass(true);
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
			if (!isCanvasPanReadyRef.current && !isPanningRef.current) return;
			event.preventDefault();
			event.stopPropagation();
			panStateRef.current = null;
			isPanningRef.current = false;
			isCanvasPanReadyRef.current = false;
			setIsPanning(false);
			setIsCanvasPanReady(false);
			syncCanvasPanReadyClass(false);
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

	const handleToggleFavoriteTemplate = (id: TemplateId) => {
		setFavoriteTemplateIds((current) =>
			current.includes(id)
				? current.filter((item) => item !== id)
				: [id, ...current],
		);
	};

	const createUserDataBackup = useCallback(
		(): UserDataBackup => ({
			version: 2,
			exportedAt: new Date().toISOString(),
			workspace,
			favoriteTemplateIds,
			previewZoom,
			previewPageMode,
		}),
		[favoriteTemplateIds, previewPageMode, previewZoom, workspace],
	);

	const applyUserDataBackup = useCallback((parsed: unknown): string | null => {
		if (
			!isPlainObject(parsed) ||
			parsed.version !== 2 ||
			!isPlainObject(parsed.workspace)
		) {
			return "这不是有效的 iResume 2.0 用户数据备份";
		}

		const nextWorkspace = normalizeResumeWorkspace(parsed.workspace);

		if (isPlainObject(parsed)) {
			if ("favoriteTemplateIds" in parsed) {
				setFavoriteTemplateIds(normalizeTemplateIdList(parsed.favoriteTemplateIds));
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

		replaceWorkspace(nextWorkspace);
		canvasShortcutsActiveRef.current = false;
		setCanvasShortcutsActive(false);
		setExportMenuOpen(false);
		setView("manager");
		return null;
	}, [replaceWorkspace]);

	const handleExportUserData = () => {
		const backup = createUserDataBackup();
		const json = JSON.stringify(backup, null, 2);
		const date = new Date().toISOString().slice(0, 10);
		downloadTextFile(json, "application/json", `iresume-user-data-${date}.json`);
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

	const ensureLocalFolderHandle = async () => {
		const handle = localFolderHandle ?? (await pickLocalFolderSyncDirectory());
		const granted = await verifyLocalFolderPermission(handle, "readwrite");
		if (!granted) throw new Error("没有本地同步目录的读写权限");

		if (handle !== localFolderHandle) {
			setLocalFolderHandle(handle);
			await saveLocalFolderSyncDirectoryHandle(handle);
		}
		setLocalFolderSyncSettings((current) => ({
			...current,
			directoryName: handle.name,
		}));
		return handle;
	};

	const handleLocalFolderConnect = async () => {
		try {
			const handle = await pickLocalFolderSyncDirectory();
			setLocalFolderSyncStatus("selecting");
			setLocalFolderSyncMessage(null);
			const granted = await verifyLocalFolderPermission(handle, "readwrite");
			if (!granted) throw new Error("没有本地同步目录的读写权限");
			await saveLocalFolderSyncDirectoryHandle(handle);
			setLocalFolderHandle(handle);
			setLocalFolderSyncSettings((current) => ({
				...current,
				directoryName: handle.name,
			}));
			setLocalFolderSyncMessage("已选择本地同步目录");
		} catch (error) {
			console.error("Failed to select local sync directory", error);
			setLocalFolderSyncMessage(
				error instanceof Error ? error.message : "选择本地目录失败",
			);
		} finally {
			setLocalFolderSyncStatus("idle");
		}
	};

	const handleLocalFolderDisconnect = async () => {
		try {
			await clearLocalFolderSyncDirectoryHandle();
		} catch (error) {
			console.warn("Failed to clear local sync directory handle", error);
		}
		setLocalFolderHandle(null);
		setLocalFolderSyncSettings({ directoryName: "" });
		setLocalFolderSyncMessage("已移除本地同步目录");
	};

	const handleLocalFolderPush = async () => {
		if (localFolderHandle) {
			setLocalFolderSyncStatus("syncing");
			setLocalFolderSyncMessage("正在同步到本地目录...");
		}

		try {
			const handle = await ensureLocalFolderHandle();
			setLocalFolderSyncStatus("syncing");
			setLocalFolderSyncMessage("正在同步到本地目录...");
			const result = await writeLocalFolderSyncSnapshot(
				handle,
				createUserDataBackup(),
			);
			setLocalFolderSyncSettings({
				directoryName: handle.name,
				lastSyncedAt: result.exportedAt,
				lastDirection: "push",
			});
			setLocalFolderSyncMessage(
				`已同步 ${result.resumeCount} 份简历到本地目录`,
			);
		} catch (error) {
			console.error("Failed to sync local folder", error);
			setLocalFolderSyncMessage(
				error instanceof Error ? error.message : "同步到本地目录失败",
			);
		} finally {
			setLocalFolderSyncStatus("idle");
		}
	};

	const handleLocalFolderPull = async () => {
		if (localFolderHandle) {
			setLocalFolderSyncStatus("restoring");
			setLocalFolderSyncMessage("正在从本地目录读取...");
		}

		try {
			const handle = await ensureLocalFolderHandle();
			setLocalFolderSyncStatus("restoring");
			setLocalFolderSyncMessage("正在从本地目录读取...");
			const result = await readLocalFolderSyncSnapshot(handle);
			const folderExportedAt = result.exportedAt
				? readTimeMs(result.exportedAt)
				: null;
			const localUpdatedAt = getLatestLibraryUpdatedAtMs(library);
			if (
				folderExportedAt !== null &&
				localUpdatedAt !== null &&
				folderExportedAt < localUpdatedAt
			) {
				const confirmed = window.confirm(
					[
						"本地同步目录可能早于当前数据，继续恢复会覆盖当前简历库。",
						"",
						`目录备份：${formatSyncDateTime(folderExportedAt)}`,
						`本地最新：${formatSyncDateTime(localUpdatedAt)}`,
						"",
						"确定要继续从目录恢复吗？",
					].join("\n"),
				);
				if (!confirmed) {
					setLocalFolderSyncMessage("已取消从本地目录恢复");
					return;
				}
			}

			replaceWorkspace(result.workspace);
			setFavoriteTemplateIds(result.favoriteTemplateIds);
			setPreviewZoom(result.previewZoom);
			setPreviewPageMode(result.previewPageMode);
			canvasShortcutsActiveRef.current = false;
			setCanvasShortcutsActive(false);
			setExportMenuOpen(false);
			setView("manager");
			const syncedAt = new Date().toISOString();
			setLocalFolderSyncSettings({
				directoryName: handle.name,
				lastSyncedAt: syncedAt,
				lastDirection: "pull",
			});
			setLocalFolderSyncMessage(
				`已从本地目录恢复 ${result.resumeCount} 份简历`,
			);
		} catch (error) {
			console.error("Failed to restore local folder", error);
			setLocalFolderSyncMessage(
				error instanceof Error ? error.message : "从本地目录恢复失败",
			);
		} finally {
			setLocalFolderSyncStatus("idle");
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
			const cloudExportedAt = getBackupExportedAtMs(parsed);
			const localUpdatedAt = getLatestLibraryUpdatedAtMs(library);
			if (
				cloudExportedAt !== null &&
				localUpdatedAt !== null &&
				cloudExportedAt < localUpdatedAt
			) {
				const confirmed = window.confirm(
					[
						"云端数据可能早于本地数据，继续恢复会覆盖当前本地简历库。",
						"",
						`云端备份：${formatSyncDateTime(cloudExportedAt)}`,
						`本地最新：${formatSyncDateTime(localUpdatedAt)}`,
						"",
						"确定要继续从云端恢复吗？",
					].join("\n"),
				);
				if (!confirmed) {
					setCloudSyncMessage("已取消从云端恢复，本地数据未变更");
					return;
				}
			}

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
		if (imageExportStatus !== "error") return;
		const timer = setTimeout(() => setImageExportStatus("idle"), 4000);
		return () => clearTimeout(timer);
	}, [imageExportStatus]);

	useEffect(() => {
		if (!importError) return;
		const timer = setTimeout(() => setImportError(null), 4000);
		return () => clearTimeout(timer);
	}, [importError]);

	useEffect(() => {
		if (copyTextStatus === "idle") return;
		const timer = setTimeout(() => setCopyTextStatus("idle"), 1800);
		return () => clearTimeout(timer);
	}, [copyTextStatus]);

	const closeEditorChrome = useCallback(() => {
		canvasShortcutsActiveRef.current = false;
		setCanvasShortcutsActive(false);
		setExportMenuOpen(false);
	}, []);

	const openManagerView = useCallback(() => {
		closeEditorChrome();
		setManagerInitialView("resumes");
		setView("manager");
	}, [closeEditorChrome]);

	const startEditorPanelResize =
		(side: EditorPanelSide) =>
		(event: ReactPointerEvent<HTMLButtonElement>) => {
			event.preventDefault();
			editorPanelResizeRef.current = {
				side,
				pointerId: event.pointerId,
				startX: event.clientX,
				startWidth: side === "left" ? leftPanelWidth : rightPanelWidth,
			};
			event.currentTarget.setPointerCapture(event.pointerId);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		};

	const handleEditorPanelResize = (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => {
		const state = editorPanelResizeRef.current;
		if (!state || state.pointerId !== event.pointerId) return;

		const delta =
			state.side === "left"
				? event.clientX - state.startX
				: state.startX - event.clientX;
		const nextWidth = normalizeEditorPanelWidth(
			state.startWidth + delta,
			state.side,
			state.startWidth,
		);

		if (state.side === "left") {
			setLeftPanelWidth(nextWidth);
		} else {
			setRightPanelWidth(nextWidth);
		}
	};

	const stopEditorPanelResize = (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => {
		if (editorPanelResizeRef.current?.pointerId !== event.pointerId) return;
		editorPanelResizeRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
	};

	const handleEditorPanelResizeKeyDown =
		(side: EditorPanelSide) =>
		(event: ReactKeyboardEvent<HTMLButtonElement>) => {
			const delta =
				event.key === "ArrowLeft" ? -8 : event.key === "ArrowRight" ? 8 : 0;
			if (delta === 0) return;
			event.preventDefault();
			const signedDelta = side === "left" ? delta : -delta;
			if (side === "left") {
				setLeftPanelWidth((current) =>
					normalizeEditorPanelWidth(current + signedDelta, "left", current),
				);
			} else {
				setRightPanelWidth((current) =>
					normalizeEditorPanelWidth(current + signedDelta, "right", current),
				);
			}
		};

	const updateDocumentHistory = useCallback(
		(
			nextHistory:
				| DocumentHistory
				| ((current: DocumentHistory) => DocumentHistory),
		) => {
			const currentHistory =
				workspace.histories[activeDocument.id] ?? createDocumentHistory();
			const resolvedHistory =
				typeof nextHistory === "function"
					? nextHistory(currentHistory)
					: nextHistory;

			setDocumentHistory(activeDocument.id, resolvedHistory);
		},
		[activeDocument.id, setDocumentHistory, workspace.histories],
	);

	const handleResumeDataChange = (nextData: ResumeData) => {
		updateActiveDocument(
			(document) => ({ ...document, data: nextData }),
			"content",
		);
	};

	const handleTemplateChange = (nextTemplateId: TemplateId) => {
		updateActiveDocument(
			(document) => {
				const customSectionIcons = Object.fromEntries(
					document.data.customSections.map((section) => [
						section.id,
						document.appearance.sectionIcons[section.id] !== false,
					]),
				);

				return {
					...document,
					appearance: {
						...document.appearance,
						templateId: nextTemplateId,
						sectionIcons: {
							...getDefaultSectionIconVisibility(),
							...customSectionIcons,
						},
					},
				};
			},
			"appearance-template",
		);
	};

	const handleAccentColorChange = (nextAccentColor: string) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: {
					...document.appearance,
					accentColor: normalizeResumeAccentColor(nextAccentColor),
				},
			}),
			"appearance-color",
		);
	};

	const handleFontSizeChange = (nextFontSize: ResumeFontSizePt) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: { ...document.appearance, fontSizePt: nextFontSize },
			}),
			"appearance-font-size",
		);
	};

	const handleSectionTitleFontSizeChange = (
		nextFontSize: ResumeSectionTitleFontSizePx,
	) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: {
					...document.appearance,
					sectionTitleFontSizePx: nextFontSize,
				},
			}),
			"appearance-section-title-font-size",
		);
	};

	const handleItemTitleFontSizeChange = (
		nextFontSize: ResumeItemTitleFontSizePx,
	) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: {
					...document.appearance,
					itemTitleFontSizePx: nextFontSize,
				},
			}),
			"appearance-item-title-font-size",
		);
	};

	const handleFontFamilyChange = (nextFontFamily: ResumeFontFamily) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: { ...document.appearance, fontFamily: nextFontFamily },
			}),
			"appearance-font-family",
		);
	};

	const handlePageMarginChange = (nextPageMargin: ResumePageMarginMm) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: { ...document.appearance, pageMarginMm: nextPageMargin },
			}),
			"appearance-page-margin",
		);
	};

	const handleLineHeightChange = (nextLineHeight: ResumeLineHeight) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: { ...document.appearance, lineHeight: nextLineHeight },
			}),
			"appearance-line-height",
		);
	};

	const handleSectionSpacingChange = (
		nextSectionSpacing: ResumeSectionSpacing,
	) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: {
					...document.appearance,
					sectionSpacing: nextSectionSpacing,
				},
			}),
			"appearance-section-spacing",
		);
	};

	const handleParagraphSpacingChange = (
		nextParagraphSpacing: ResumeParagraphSpacingPx,
	) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: {
					...document.appearance,
					paragraphSpacingPx: nextParagraphSpacing,
				},
			}),
			"appearance-paragraph-spacing",
		);
	};

	const handleSectionPreferencesChange = (
		nextPreferences: ResumeSectionPreferences,
	) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: {
					...document.appearance,
					sectionPreferences: nextPreferences,
				},
			}),
			"appearance-preferences",
		);
	};

	const handleSectionIconsChange = (
		nextSectionIcons: SectionIconVisibility,
	) => {
		updateActiveDocument(
			(document) => ({
				...document,
				appearance: {
					...document.appearance,
					sectionIcons: nextSectionIcons,
				},
			}),
			"appearance-icons",
		);
	};

	const handleCanvasPointerDown = (
		event: ReactPointerEvent<HTMLDivElement>,
	) => {
		event.currentTarget.focus({ preventScroll: true });
		setCanvasShortcutsActive(true);
		canvasShortcutsActiveRef.current = true;
		setExportMenuOpen(false);
		const target = event.target;
		const isInteractiveTarget =
			target instanceof HTMLElement &&
			Boolean(
				target.closest(
					'a, input, textarea, select, button, [role="button"], [contenteditable="true"]',
				),
			);
		const startedWithMiddleButton = event.button === 1 && !isInteractiveTarget;
		const startedWithSpaceKey =
			event.button === 0 && isCanvasPanReadyRef.current;
		if (!startedWithMiddleButton && !startedWithSpaceKey) return;
		const node = canvasScrollRef.current;
		if (!node) return;

		event.preventDefault();
		event.stopPropagation();
		panStateRef.current = {
			pointerId: event.pointerId,
			source: startedWithMiddleButton ? "middle" : "space",
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
		const state = panStateRef.current;
		if (state?.pointerId !== event.pointerId) return;
		panStateRef.current = null;
		isPanningRef.current = false;
		setIsPanning(false);
		if (state.source === "middle") {
			isCanvasPanReadyRef.current = false;
			setIsCanvasPanReady(false);
		}
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const handleCanvasAuxClick = (event: ReactMouseEvent<HTMLDivElement>) => {
		if (event.button !== 1) return;
		event.preventDefault();
		event.stopPropagation();
	};

	const handlePreviewSectionClick = (section: ResumeEditableSectionKey) => {
		if (isPanningRef.current || isCanvasPanReadyRef.current) return;
		setActiveSection(section);
		setRightPanelOpen(true);
		setExportMenuOpen(false);
	};

	const handleCreateResume = (input: {
		name: string;
		tags: string[];
		templateId?: TemplateId;
		accentColor?: string;
	}) => {
		const nextDocument = createResumeDocument({
			name: input.name,
			tags: input.tags,
			appearance:
				input.templateId || input.accentColor
					? {
							templateId: input.templateId,
							accentColor: input.accentColor,
						}
					: undefined,
		});
		setLibrary((current) => ({
			...current,
			activeId: nextDocument.id,
			documents: [nextDocument, ...current.documents],
		}));
		setView("editor");
	};

	const handleCreateResumeFromJson = async (input: {
		name: string;
		tags: string[];
		file: File;
	}): Promise<string | null> => {
		if (!input.file.name.toLowerCase().endsWith(".json")) {
			return "请选择 .json 文件";
		}

		try {
			const text = await readFileAsText(input.file);
			const parsed = JSON.parse(text) as unknown;
			if (isPlainObject(parsed) && "library" in parsed) {
				return "这是用户数据备份，请在设置中导入";
			}

			const imported = normalizeResumeBackup(parsed);
			const nextDocument = createResumeDocument({
				name: input.name,
				tags: input.tags,
				data: imported.data,
				appearance: getImportedResumeAppearance(imported),
			});

			setLibrary((current) => ({
				...current,
				activeId: nextDocument.id,
				documents: [nextDocument, ...current.documents],
			}));
			setView("editor");
			return null;
		} catch (error) {
			console.error("Failed to create resume from JSON", error);
			return "文件解析失败，请确认是有效的单份简历 JSON";
		}
	};

	const handleOpenResume = (id: string) => {
		setLibrary((current) =>
			current.activeId === id ? current : { ...current, activeId: id },
		);
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
		updateDocument(
			id,
			(document) => ({
				...document,
				name:
					meta.name !== undefined ? meta.name.slice(0, 80) : document.name,
				tags:
					meta.tags !== undefined
						? normalizeResumeTags(meta.tags)
						: document.tags,
				version:
					meta.version !== undefined
						? normalizeResumeVersion(meta.version)
						: document.version,
			}),
			"metadata",
		);
	};

	const handleBumpResumeVersion = () => {
		const nextVersion = computeNextVersion(
			activeDocument.version,
			getLatestSnapshotVersion(documentHistory),
			"patch",
		);

		updateDocumentHistory((current) =>
			addSnapshot(current, activeDocument, DEFAULT_SNAPSHOT_LABEL, nextVersion),
		);
		handleUpdateResumeMeta(activeDocument.id, { version: nextVersion });
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
		const innerRect = inner.getBoundingClientRect();
		const contentHeight = innerRect.height;
		const maxBottomBlankPx =
			printablePageHeightPx * MAX_PREVIEW_PAGE_BOTTOM_BLANK_RATIO;
		const avoidBlocks = Array.from(
			inner.querySelectorAll<HTMLElement>(
				[
					"header",
					"section",
					"h2",
					".print-item-header",
					".print-timeline-item",
					".print-card-item",
					".print-edu-item",
					".print-skill-row",
					"li",
				].join(","),
			),
		)
			.map((element) => {
				const rect = element.getBoundingClientRect();
				return {
					isSection: element.tagName === "SECTION",
					top: rect.top - innerRect.top,
					height: rect.height,
				};
			})
			.filter(
				(block) =>
					block.height > 1 &&
					block.height <
						printablePageHeightPx * (block.isSection ? 0.22 : 0.92) &&
					block.top >= 0,
			)
			.sort((a, b) => a.top - b.top);

		const nextLayouts: PreviewPageLayout[] = [];
		let pageStart = 0;
		let guard = 0;
		const maxPages = Math.max(
			20,
			Math.ceil(contentHeight / printablePageHeightPx) + avoidBlocks.length + 1,
		);

		while (pageStart < contentHeight - 1 && guard < maxPages) {
			const idealEnd = pageStart + printablePageHeightPx;
			let crossingBlock: (typeof avoidBlocks)[number] | undefined;
			for (const block of avoidBlocks) {
				const blockBottom = block.top + block.height;
				const bottomBlank = idealEnd - block.top;
				const crossesPageEnd =
					block.top > pageStart + 1 &&
					block.top < idealEnd - 1 &&
					blockBottom > idealEnd + 1;
				if (
					crossesPageEnd &&
					bottomBlank <= maxBottomBlankPx &&
					(!crossingBlock || block.top > crossingBlock.top)
				) {
					crossingBlock = block;
				}
			}
			const pageEnd = crossingBlock ? crossingBlock.top : idealEnd;
			const bottomBlank = Math.max(0, idealEnd - pageEnd);

			nextLayouts.push({
				startMm: pageStart / pxPerMm,
				bottomBlankMm: bottomBlank / pxPerMm,
			});

			const nextStart = crossingBlock ? crossingBlock.top : idealEnd;
			pageStart = nextStart <= pageStart + 1 ? idealEnd : nextStart;
			guard += 1;
		}

		const safeLayouts =
			nextLayouts.length > 0
				? nextLayouts
				: [{ startMm: 0, bottomBlankMm: 0 }];
		const nextPageCount = safeLayouts.length;

		setPreviewPageCount((current) =>
			current === nextPageCount ? current : nextPageCount,
		);
		setPreviewPageLayouts((current) => {
			const same =
				current.length === safeLayouts.length &&
				current.every(
					(item, index) =>
						Math.abs(item.startMm - safeLayouts[index].startMm) < 0.1 &&
						Math.abs(item.bottomBlankMm - safeLayouts[index].bottomBlankMm) <
							0.1,
				);
			return same ? current : safeLayouts;
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
		templateId,
		fontSizePt,
		sectionTitleFontSizePx,
		itemTitleFontSizePx,
		fontFamily,
		pageMarginMm,
		lineHeight,
		sectionSpacing,
		paragraphSpacingPx,
		sectionIcons,
		sectionPreferences,
		view,
	]);

	const handlePrint = useCallback(() => {
		const filename = getResumeExportFileBaseName(activeDocument, resumeData);
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

		document.title = filename;

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

	const handleExportJson = () => {
		const backup = createResumeBackup(resumeData, activeDocument.appearance);
		const json = JSON.stringify(backup, null, 2);
		const filename = `${getResumeExportFileBaseName(
			activeDocument,
			resumeData,
		)}.json`;
		downloadTextFile(json, "application/json", filename);
	};

	const handleExportMarkdown = () => {
		const markdown = createResumeMarkdown(resumeData);
		const filename = `${getResumeExportFileBaseName(
			activeDocument,
			resumeData,
		)}.md`;
		downloadTextFile(markdown, "text/markdown;charset=utf-8", filename);
	};

	const handleCopyMarkdownText = async () => {
		setExportMenuOpen(false);
		try {
			await copyTextToClipboard(createResumeMarkdown(resumeData));
			setCopyTextStatus("copied");
		} catch (error) {
			console.error("Failed to copy resume markdown", error);
			setCopyTextStatus("error");
		}
	};

	const handleImportClick = () => {
		setImportError(null);
		setExportMenuOpen(false);
		importInputRef.current?.click();
	};

	const handleImportFile = async (
		event: ReactChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		if (!file.name.endsWith(".json")) {
			setImportError("请选择 .json 文件");
			return;
		}

		try {
			const text = await readFileAsText(file);
			const parsed = JSON.parse(text) as unknown;
			if (isPlainObject(parsed) && "library" in parsed) {
				setImportError("这是用户数据备份，请在设置中导入");
				return;
			}

			const imported = normalizeResumeBackup(parsed);
			updateActiveDocument((document) => ({
				...document,
				data: imported.data,
				appearance: getImportedResumeAppearance(
					imported,
					document.appearance,
				),
			}));
		} catch (error) {
			console.error("Failed to import resume JSON", error);
			setImportError("文件解析失败，请确认是有效的单份简历 JSON");
		}
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

			const a = document.createElement("a");
			a.href = dataUrl;
			a.download = `${getResumeExportFileBaseName(
				activeDocument,
				resumeData,
			)}.png`;
			a.click();
			setImageExportStatus("idle");
		} catch (error) {
			console.error("Failed to export resume image", error);
			setImageExportStatus("error");
		}
	};

	const previewPageMarginMm = resumePageMarginPxToMm(pageMarginMm);
	const printablePageHeightMm = getPrintablePageHeightMm(pageMarginMm);

	if (view === "manager") {
		return (
			<ResumeManager
				documents={library.documents}
				onCreate={handleCreateResume}
				onCreateFromJson={handleCreateResumeFromJson}
				onOpen={handleOpenResume}
				onDuplicate={handleDuplicateResume}
				onDelete={handleDeleteResume}
				onExportUserData={handleExportUserData}
				onImportUserData={handleImportUserData}
				localFolderSync={{
					connected: Boolean(localFolderHandle),
					directoryName:
						localFolderSyncSettings.directoryName ||
						localFolderHandle?.name ||
						"",
					lastDirection: localFolderSyncSettings.lastDirection,
					lastSyncedAt: localFolderSyncSettings.lastSyncedAt,
					message: localFolderSyncMessage,
					status: localFolderSyncStatus,
				}}
				onLocalFolderConnect={handleLocalFolderConnect}
				onLocalFolderDisconnect={() => void handleLocalFolderDisconnect()}
				onLocalFolderPush={handleLocalFolderPush}
				onLocalFolderPull={handleLocalFolderPull}
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
				initialView={managerInitialView}
			/>
		);
	}

	const canvasPanClass = isPanning
		? "canvas-panning"
		: isCanvasPanReady
			? "canvas-pan-ready"
			: "";
	const isDesktopWorkbenchViewport =
		viewportWidth >= DESKTOP_PREVIEW_BREAKPOINT_PX;
	const defaultLeftPanelWidth = getDefaultEditorPanelWidth("left", viewportWidth);
	const defaultRightPanelWidth = getDefaultEditorPanelWidth(
		"right",
		viewportWidth,
	);
	const workbenchLeftInset =
		leftPanelOpen && isDesktopWorkbenchViewport ? leftPanelWidth + 32 : 56;
	const workbenchRightInset =
		rightPanelOpen && isDesktopWorkbenchViewport ? rightPanelWidth + 32 : 56;
	const canvasLeftInset =
		leftPanelOpen && isDesktopWorkbenchViewport
			? defaultLeftPanelWidth + 32
			: 56;
	const canvasRightInset =
		rightPanelOpen && isDesktopWorkbenchViewport
			? defaultRightPanelWidth + 32
			: 56;
	const toolbarFrameStyle = isDesktopWorkbenchViewport
		? ({
				left: workbenchLeftInset,
				right: workbenchRightInset,
			} satisfies CSSProperties)
		: undefined;
	const canvasInnerStyle = isDesktopWorkbenchViewport
		? ({
				minWidth: `calc(100vw + ${
					(leftPanelOpen ? defaultLeftPanelWidth : 0) +
					(rightPanelOpen ? defaultRightPanelWidth : 0)
				}px)`,
				paddingLeft: canvasLeftInset,
				paddingRight: canvasRightInset,
			} satisfies CSSProperties)
		: undefined;
	const bottomShortcutStyle =
		rightPanelOpen && isDesktopWorkbenchViewport
			? ({ right: rightPanelWidth + 20 } satisfies CSSProperties)
			: undefined;
	const toolbarFrameClass =
		"fixed left-3 right-3 top-3 z-50 flex justify-center pointer-events-none print:hidden";
	const previewCanvasHeightMm =
		previewPageMode === "paged"
			? previewPageCount * A4_HEIGHT_MM +
				Math.max(0, previewPageCount - 1) * PREVIEW_PAGE_GAP_MM
			: previewPageCount * A4_HEIGHT_MM;
	const renderResumePreview = ({
		withRefs = false,
		interactive = true,
	}: {
		withRefs?: boolean;
		interactive?: boolean;
	} = {}) => (
		<ResumePreview
			ref={withRefs ? resumePreviewRef : undefined}
			contentRef={withRefs ? resumePreviewInnerRef : undefined}
			data={resumeData}
			templateId={templateId}
			accentColor={accentColor}
			fontSizePt={fontSizePt}
			sectionTitleFontSizePx={sectionTitleFontSizePx}
			itemTitleFontSizePx={itemTitleFontSizePx}
			fontFamily={fontFamily}
			pageMarginMm={pageMarginMm}
			lineHeight={lineHeight}
			sectionSpacing={sectionSpacing}
			paragraphSpacingPx={paragraphSpacingPx}
			sectionIcons={sectionIcons}
			sectionPreferences={sectionPreferences}
			minPageCount={previewPageCount}
			onSectionClick={interactive ? handlePreviewSectionClick : undefined}
		/>
	);

	return (
		<div className="relative min-h-screen bg-slate-200/60 font-sans text-slate-900 print:h-auto print:min-h-0 print:overflow-visible print:bg-white lg:h-screen lg:overflow-hidden">
			<div
				className={toolbarFrameClass}
				style={toolbarFrameStyle}
				data-workbench-chrome="true"
			>
				<div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-visible rounded-xl border border-slate-200/55 bg-white/72 px-1.5 py-1 shadow-sm shadow-slate-900/5 backdrop-blur">
					{!isMobilePreviewViewport && (
						<PreviewZoomControl
							value={previewZoom}
							onChange={setPreviewZoom}
						/>
					)}
					<PreviewPageModeControl
						value={previewPageMode}
						onChange={setPreviewPageMode}
					/>
				</div>
			</div>

			{leftPanelOpen ? (
				<div
					className="p-3 pt-20 print:hidden lg:pointer-events-none lg:fixed lg:inset-y-4 lg:left-4 lg:z-40 lg:p-0"
					style={
						isDesktopWorkbenchViewport
							? ({ width: leftPanelWidth } satisfies CSSProperties)
							: undefined
					}
					data-workbench-chrome="true"
				>
					<aside className="pointer-events-auto flex overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur lg:h-full">
						<div className="flex min-w-0 flex-1 flex-col">
							<div className="shrink-0 border-b border-slate-200 px-3 py-3">
								<div className="flex items-center justify-between gap-3">
									<button
										type="button"
										onClick={openManagerView}
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

								<div className="relative mt-3">
									<div className="grid grid-cols-[2.25rem_2.25rem_2.25rem_2.25rem_minmax(0,1fr)] gap-1.5">
										<WorkbenchIconButton
											label="撤销"
											onClick={undo}
											disabled={!canUndo}
										>
											<Undo2 size={16} />
										</WorkbenchIconButton>
										<WorkbenchIconButton
											label="重做"
											onClick={redo}
											disabled={!canRedo}
										>
											<Redo2 size={16} />
										</WorkbenchIconButton>
										<WorkbenchIconButton
											label={
												copyTextStatus === "copied"
													? "已复制"
													: copyTextStatus === "error"
														? "复制失败"
														: "复制文本"
											}
											onClick={() => void handleCopyMarkdownText()}
										>
											<ClipboardCopy size={16} />
										</WorkbenchIconButton>
										<WorkbenchIconButton
											label="导入 JSON"
											onClick={handleImportClick}
										>
											<FileUp size={16} />
										</WorkbenchIconButton>
										<WorkbenchIconButton
											label="导出"
											onClick={() => {
												setExportMenuOpen((open) => !open);
											}}
											variant="primary"
										>
											<span className="flex items-center gap-1.5 text-xs font-semibold">
												<Download size={15} />
												导出
												<ChevronDown size={13} />
											</span>
										</WorkbenchIconButton>
									</div>

									{exportMenuOpen && (
										<div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
											<button
												type="button"
												onClick={() => {
													setExportMenuOpen(false);
													handlePrint();
												}}
												className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
											>
												<span className="flex items-center gap-2">
													<Printer size={15} className="text-slate-400" />
													PDF
												</span>
												<span className="text-[11px] text-slate-400">默认</span>
											</button>
											<button
												type="button"
												onClick={() => {
													setExportMenuOpen(false);
													void handleExportImage();
												}}
												disabled={imageExportStatus === "exporting"}
												className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:text-slate-300"
											>
												<ImageDown size={15} className="text-slate-400" />
												{imageExportStatus === "exporting" ? "图片导出中" : "图片"}
											</button>
											<button
												type="button"
												onClick={() => {
													setExportMenuOpen(false);
													handleExportJson();
												}}
												className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
											>
												<FileJson size={15} className="text-slate-400" />
												JSON
											</button>
											<button
												type="button"
												onClick={() => {
													setExportMenuOpen(false);
													handleExportMarkdown();
												}}
												className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
											>
												<FileText size={15} className="text-slate-400" />
												Markdown
											</button>
										</div>
									)}
									<input
										ref={importInputRef}
										type="file"
										accept="application/json,.json"
										className="hidden"
										onChange={(event) => void handleImportFile(event)}
									/>
								</div>

								{storageError && (
									<div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
										本地保存失败：{storageError}
									</div>
								)}
								{imageExportStatus === "error" && (
									<div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-500">
										图片导出失败
									</div>
								)}
								{importError && (
									<div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-500">
										{importError}
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
									onOpenHistory={() => setHistoryModalOpen(true)}
									onBumpVersion={handleBumpResumeVersion}
								/>
								<ResumeEditor
									data={resumeData}
									sectionIcons={sectionIcons}
									sectionPreferences={sectionPreferences}
									templateId={templateId}
									favoriteTemplateIds={favoriteTemplateIds}
									accentColor={accentColor}
									fontSizePt={fontSizePt}
									sectionTitleFontSizePx={sectionTitleFontSizePx}
									itemTitleFontSizePx={itemTitleFontSizePx}
									fontFamily={fontFamily}
									pageMarginMm={pageMarginMm}
									lineHeight={lineHeight}
									sectionSpacing={sectionSpacing}
									paragraphSpacingPx={paragraphSpacingPx}
									panel="structure"
									activeSection={resolvedActiveSection}
									onActiveSectionChange={setActiveSection}
									onChange={handleResumeDataChange}
									onSectionIconsChange={handleSectionIconsChange}
									onSectionPreferencesChange={handleSectionPreferencesChange}
									onTemplateChange={handleTemplateChange}
									onToggleFavoriteTemplate={handleToggleFavoriteTemplate}
									onAccentColorChange={handleAccentColorChange}
									onFontSizeChange={handleFontSizeChange}
									onSectionTitleFontSizeChange={
										handleSectionTitleFontSizeChange
									}
									onItemTitleFontSizeChange={handleItemTitleFontSizeChange}
									onFontFamilyChange={handleFontFamilyChange}
									onPageMarginChange={handlePageMarginChange}
									onLineHeightChange={handleLineHeightChange}
									onSectionSpacingChange={handleSectionSpacingChange}
									onParagraphSpacingChange={handleParagraphSpacingChange}
								/>
							</div>
						</div>
					</aside>
					<button
						type="button"
						onPointerDown={startEditorPanelResize("left")}
						onPointerMove={handleEditorPanelResize}
						onPointerUp={stopEditorPanelResize}
						onPointerCancel={stopEditorPanelResize}
						onLostPointerCapture={stopEditorPanelResize}
						onKeyDown={handleEditorPanelResizeKeyDown("left")}
						className="group pointer-events-auto absolute inset-y-3 -right-1 hidden w-2 cursor-col-resize touch-none lg:block"
						title="拖动调整左侧编辑区宽度"
						aria-label="调整左侧编辑区宽度"
					>
						<span className="absolute inset-y-3 left-1/2 w-px bg-blue-400 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70" />
					</button>
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
				className={`min-h-[70vh] overflow-auto bg-slate-200/60 outline-none print:block print:h-auto print:min-h-0 print:overflow-visible print:bg-white lg:h-screen scrollbar-none ${canvasPanClass}`}
				onPointerDown={handleCanvasPointerDown}
				onPointerMove={handleCanvasPointerMove}
				onPointerUp={stopCanvasPan}
				onPointerCancel={stopCanvasPan}
				onLostPointerCapture={stopCanvasPan}
				onAuxClick={handleCanvasAuxClick}
				>
					<div
						className="resume-canvas-inner min-h-full p-4 pt-20 print:h-auto print:min-h-0 print:p-0 sm:p-5 sm:pt-20 lg:pb-5 lg:pt-20"
						style={canvasInnerStyle}
					>
						<div className="resume-print-source" aria-hidden="true" inert>
							{renderResumePreview({ withRefs: true, interactive: false })}
						</div>
						<div className="resume-screen-preview flex min-h-full justify-center pb-20 print:hidden">
							<div className="mx-auto w-fit">
								<div
									className="resume-preview-scale-shell"
									style={{
										height: `${previewCanvasHeightMm * previewRenderZoom}mm`,
										width: `${A4_WIDTH_MM * previewRenderZoom}mm`,
								}}
								>
									<div
										className="resume-preview-scale relative w-[210mm]"
										style={{
											minHeight: `${previewCanvasHeightMm}mm`,
											transform: `scale(${previewRenderZoom})`,
										transformOrigin: "top left",
									}}
									>
										{previewPageMode === "continuous" ? (
											<div className="relative bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5">
												{renderResumePreview()}
												{Array.from(
													{ length: previewPageCount - 1 },
												(_, index) => (
													<div
														key={index}
														className="pointer-events-none absolute left-0 right-0 z-10 border-t border-dashed border-blue-300/35 print:hidden"
														style={{
															top: `${previewPageMarginMm + (index + 1) * printablePageHeightMm}mm`,
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
											<div
												className="resume-paged-visual flex flex-col"
												style={{ gap: `${PREVIEW_PAGE_GAP_MM}mm` }}
											>
												{previewPageLayouts.map(
													(pageLayout, index) => (
														<div
															key={index}
															className="relative h-[297mm] w-[210mm] overflow-hidden bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
														>
															<div
																className="absolute left-0 top-0 w-[210mm]"
																style={{
																	transform: `translateY(-${pageLayout.startMm}mm)`,
																}}
															>
																{renderResumePreview()}
															</div>
															{index > 0 && (
																<div
																	className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-white"
																	style={{ height: `${previewPageMarginMm}mm` }}
																/>
															)}
															<div
																className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-white"
																style={{
																	height: `${
																		previewPageMarginMm + pageLayout.bottomBlankMm
																	}mm`,
																}}
															/>
														</div>
												),
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			{rightPanelOpen ? (
				<div
					className="p-3 pt-0 print:hidden lg:pointer-events-none lg:fixed lg:inset-y-4 lg:right-4 lg:z-40 lg:p-0"
					style={
						isDesktopWorkbenchViewport
							? ({ width: rightPanelWidth } satisfies CSSProperties)
							: undefined
					}
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
							sectionPreferences={sectionPreferences}
							templateId={templateId}
							favoriteTemplateIds={favoriteTemplateIds}
							accentColor={accentColor}
							fontSizePt={fontSizePt}
							sectionTitleFontSizePx={sectionTitleFontSizePx}
							itemTitleFontSizePx={itemTitleFontSizePx}
							fontFamily={fontFamily}
							pageMarginMm={pageMarginMm}
							lineHeight={lineHeight}
							sectionSpacing={sectionSpacing}
							paragraphSpacingPx={paragraphSpacingPx}
							panel="details"
							activeSection={resolvedActiveSection}
							onActiveSectionChange={setActiveSection}
							onChange={handleResumeDataChange}
							onSectionIconsChange={handleSectionIconsChange}
							onSectionPreferencesChange={handleSectionPreferencesChange}
							onTemplateChange={handleTemplateChange}
							onToggleFavoriteTemplate={handleToggleFavoriteTemplate}
							onAccentColorChange={handleAccentColorChange}
							onFontSizeChange={handleFontSizeChange}
							onSectionTitleFontSizeChange={
								handleSectionTitleFontSizeChange
							}
							onItemTitleFontSizeChange={handleItemTitleFontSizeChange}
							onFontFamilyChange={handleFontFamilyChange}
							onPageMarginChange={handlePageMarginChange}
							onLineHeightChange={handleLineHeightChange}
							onSectionSpacingChange={handleSectionSpacingChange}
							onParagraphSpacingChange={handleParagraphSpacingChange}
						/>
					</aside>
					<button
						type="button"
						onPointerDown={startEditorPanelResize("right")}
						onPointerMove={handleEditorPanelResize}
						onPointerUp={stopEditorPanelResize}
						onPointerCancel={stopEditorPanelResize}
						onLostPointerCapture={stopEditorPanelResize}
						onKeyDown={handleEditorPanelResizeKeyDown("right")}
						className="group pointer-events-auto absolute inset-y-3 -left-1 hidden w-2 cursor-col-resize touch-none lg:block"
						title="拖动调整右侧编辑区宽度"
						aria-label="调整右侧编辑区宽度"
					>
						<span className="absolute inset-y-3 left-1/2 w-px bg-blue-400 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70" />
					</button>
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

			{historyModalOpen && (
				<ResumeHistoryModal
					documentHistory={documentHistory}
					currentDocument={activeDocument}
					onChangeHistory={updateDocumentHistory}
					onRestore={(document, version) => {
						updateActiveDocument((current) => ({
							...current,
							data: document.data,
							appearance: document.appearance,
							version,
						}));
						setHistoryModalOpen(false);
					}}
					onVersionChange={(version) => {
						handleUpdateResumeMeta(activeDocument.id, { version });
					}}
					onClose={() => setHistoryModalOpen(false)}
				/>
			)}

			<div
				className={`fixed bottom-5 right-5 z-50 flex items-center gap-1.5 rounded-full border border-slate-200/50 bg-white/50 px-2 py-1 text-[10px] text-slate-400 shadow-sm backdrop-blur transition hover:opacity-95 print:hidden ${
					canvasShortcutsActive ? "opacity-75" : "opacity-35"
				}`}
				style={bottomShortcutStyle}
				data-workbench-chrome="true"
			>
				<Hand size={12} />
				<span>
					<kbd className="rounded border border-current/20 px-1 font-mono text-[9px]">
						鼠标中键
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
