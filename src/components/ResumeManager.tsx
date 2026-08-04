import {
	ArrowRight,
	Clock3,
	Cloud,
	CloudDownload,
	CloudUpload,
	Copy,
	Database,
	Download,
	FilePlus2,
	Files,
	FolderOpen,
	FolderSync,
	Github,
	HardDriveDownload,
	HardDriveUpload,
	LayoutTemplate,
	Link,
	LogOut,
	Palette,
	Plus,
	Search,
	Settings2,
	Tags,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type ChangeEvent,
	type FormEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from "react";
import {
	createResumeDocument,
	normalizeResumeTags,
	type ResumeDocument,
} from "../data/resumeLibrary";
import {
	DEFAULT_RESUME_ACCENT_COLOR,
	RESUME_ACCENT_COLOR_PRESETS,
	normalizeResumeAccentColor,
} from "../data/resumeStyle";
import { templateConfigs, templateIds } from "../data/templateConfigs";
import type { LocalFolderSyncViewState } from "../data/localFolderSync";
import type { TemplateId } from "../types/template";
import ResumePreview from "./TemplateResumePreview";

interface CreateResumeInput {
	name: string;
	tags: string[];
	templateId?: TemplateId;
	accentColor?: string;
}

interface CreateResumeFromJsonInput extends CreateResumeInput {
	file: File;
}

interface ResumeManagerProps {
	documents: ResumeDocument[];
	onCreate: (input: CreateResumeInput) => void;
	onCreateFromJson: (
		input: CreateResumeFromJsonInput,
	) => Promise<string | null>;
	onOpen: (id: string) => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
	onExportUserData: () => void;
	onImportUserData: (file: File) => Promise<string | null>;
	localFolderSync: LocalFolderSyncViewState;
	onLocalFolderConnect: () => Promise<void>;
	onLocalFolderDisconnect: () => void;
	onLocalFolderPush: () => Promise<void>;
	onLocalFolderPull: () => Promise<void>;
	cloudSync: CloudSyncViewState;
	onCloudConnect: () => void;
	onCloudDisconnect: () => void;
	onCloudGistIdChange: (gistId: string) => void;
	onCloudPush: () => Promise<void>;
	onCloudPull: () => Promise<void>;
	initialView?: ManagerView;
}

interface ResumeCardProps {
	document: ResumeDocument;
	canDelete: boolean;
	onPreview: () => void;
	onEdit: () => void;
	onDuplicate: () => void;
	onDelete: () => void;
}

type CloudSyncStatus = "idle" | "connecting" | "uploading" | "downloading";

interface CloudSyncViewState {
	connected: boolean;
	login?: string;
	avatarUrl?: string;
	gistId: string;
	lastDirection?: "push" | "pull";
	lastSyncedAt?: string;
	message: string | null;
	status: CloudSyncStatus;
	oauthConfigured: boolean;
}

const formatUpdatedAt = (value: string) => {
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return "未知时间";

	return new Intl.DateTimeFormat("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

const formatResumeCardMeta = (document: ResumeDocument) =>
	[
		formatUpdatedAt(document.updatedAt),
		`v${document.version}`,
		document.tags.length > 0 ? document.tags.join("、") : "",
	]
		.filter(Boolean)
		.join(" · ");

const inputClass =
	"w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500";

const getGitHubAvatarUrl = (cloudSync: CloudSyncViewState) =>
	cloudSync.avatarUrl ||
	(cloudSync.login ? `https://github.com/${cloudSync.login}.png?size=64` : "");

const BrandMark = () => (
	<div className="flex items-center gap-2.5 text-lg font-bold">
		<span className="inline-flex items-center justify-center rounded bg-blue-600 px-2 py-1 text-sm font-black leading-none tracking-tight text-white">
			i
		</span>
		<span className="leading-none text-slate-900">Resume</span>
	</div>
);

const inertProps = { inert: true };

const A4_WIDTH_PX = 793.700787;

const ResumeThumbnail = ({
	document,
	className = "",
	templateId,
}: {
	document: ResumeDocument;
	className?: string;
	templateId?: TemplateId;
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.2);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateScale = (width: number) => {
			if (width > 0) setScale(width / A4_WIDTH_PX);
		};
		const observer = new ResizeObserver((entries) => {
			updateScale(entries[0]?.contentRect.width ?? 0);
		});
		observer.observe(container);
		updateScale(container.getBoundingClientRect().width);
		return () => observer.disconnect();
	}, []);

	return (
		<div
			ref={containerRef}
			{...inertProps}
			aria-hidden="true"
			className={`relative aspect-[210/297] shrink-0 overflow-hidden bg-white ${className}`}
		>
			<div
				className="absolute left-0 top-0 w-[210mm] origin-top-left"
				style={{ transform: `scale(${scale})` }}
			>
				<ResumePreview
					data={document.data}
					templateId={templateId ?? document.appearance.templateId}
					accentColor={document.appearance.accentColor}
					fontSizePt={document.appearance.fontSizePt}
					sectionTitleFontSizePx={
						document.appearance.sectionTitleFontSizePx
					}
					itemTitleFontSizePx={document.appearance.itemTitleFontSizePx}
					fontFamily={document.appearance.fontFamily}
					pageMarginMm={document.appearance.pageMarginMm}
					lineHeight={document.appearance.lineHeight}
					sectionSpacing={document.appearance.sectionSpacing}
					paragraphSpacingPx={document.appearance.paragraphSpacingPx}
					sectionIcons={document.appearance.sectionIcons}
					sectionPreferences={document.appearance.sectionPreferences}
					minPageCount={1}
				/>
			</div>
		</div>
	);
};

const A4_HEIGHT_PX = A4_WIDTH_PX * (297 / 210);

const FullResumePreview = ({
	document,
	className = "",
	templateId,
}: {
	document: ResumeDocument;
	className?: string;
	templateId?: TemplateId;
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.7);
	const [height, setHeight] = useState(A4_HEIGHT_PX * 0.7);

	useEffect(() => {
		const container = containerRef.current;
		const preview = previewRef.current;
		if (!container || !preview) return;

		const updateSize = () => {
			const width = container.getBoundingClientRect().width;
			const nextScale = width > 0 ? Math.min(1, width / A4_WIDTH_PX) : 1;
			const nextHeight = Math.max(preview.scrollHeight, A4_HEIGHT_PX);
			setScale(nextScale);
			setHeight(nextHeight * nextScale);
		};

		const observer = new ResizeObserver(updateSize);
		observer.observe(container);
		observer.observe(preview);
		const frame = window.requestAnimationFrame(updateSize);
		window.addEventListener("resize", updateSize);

		return () => {
			observer.disconnect();
			window.cancelAnimationFrame(frame);
			window.removeEventListener("resize", updateSize);
		};
	}, [document, templateId]);

	return (
		<div ref={containerRef} className={`shrink-0 ${className}`}>
			<div className="relative" style={{ height }}>
				<div
					className="absolute left-0 top-0 w-[210mm] origin-top-left"
					style={{ transform: `scale(${scale})` }}
				>
					<ResumePreview
						ref={previewRef}
						data={document.data}
						templateId={templateId ?? document.appearance.templateId}
						accentColor={document.appearance.accentColor}
						fontSizePt={document.appearance.fontSizePt}
						sectionTitleFontSizePx={
							document.appearance.sectionTitleFontSizePx
						}
						itemTitleFontSizePx={document.appearance.itemTitleFontSizePx}
						fontFamily={document.appearance.fontFamily}
						pageMarginMm={document.appearance.pageMarginMm}
						lineHeight={document.appearance.lineHeight}
						sectionSpacing={document.appearance.sectionSpacing}
						paragraphSpacingPx={document.appearance.paragraphSpacingPx}
						sectionIcons={document.appearance.sectionIcons}
						sectionPreferences={document.appearance.sectionPreferences}
						minPageCount={1}
					/>
				</div>
			</div>
		</div>
	);
};

const ResumeCard = ({
	document,
	canDelete,
	onPreview,
	onEdit,
	onDuplicate,
	onDelete,
}: ResumeCardProps) => (
	<article className="group relative aspect-[210/297] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] transition hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/[0.06]">
		<ResumeThumbnail
			document={document}
			className="absolute inset-0 h-full w-full"
		/>
		<button
			type="button"
			onClick={onEdit}
			className="absolute inset-0 z-[1]"
			aria-label={`编辑 ${document.name}`}
		/>
		<div className="pointer-events-none absolute inset-x-0 bottom-9 z-[2] bg-gradient-to-t from-white/95 via-white/85 to-transparent px-3 pb-2 pt-10 text-slate-900">
			<div className="min-w-0">
				<h2 className="truncate text-xs font-bold">{document.name}</h2>
				<p className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-slate-400">
					<Clock3 size={11} className="shrink-0" />
					<span className="truncate">{formatResumeCardMeta(document)}</span>
				</p>
			</div>
		</div>
		<div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[3] flex h-9 items-center justify-end gap-3 border-t border-slate-200/80 bg-white/95 px-3 text-[11px] font-semibold backdrop-blur-sm">
			<button
				type="button"
				onClick={onPreview}
				className="text-slate-500 transition hover:text-slate-900"
			>
				预览
			</button>
			<button
				type="button"
				onClick={onDuplicate}
				className="text-slate-500 transition hover:text-slate-900"
			>
				复制
			</button>
			{canDelete && (
				<button
					type="button"
					onClick={onDelete}
					className="text-slate-300 transition hover:text-red-600"
				>
					删除
				</button>
			)}
		</div>
	</article>
);

const CreateResumeCard = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={onClick}
		className="group relative aspect-[210/297] overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-slate-400 hover:shadow-lg hover:shadow-slate-900/[0.05]"
	>
		<span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
			<span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-slate-300 group-hover:text-slate-700">
				<Plus size={17} />
			</span>
			<span className="text-xs font-semibold text-slate-500 transition group-hover:text-slate-700">
				创建空白简历
			</span>
		</span>
	</button>
);

const TemplateAccentColorPicker = ({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) => {
	const normalizedValue = normalizeResumeAccentColor(value);
	const isPresetColor = RESUME_ACCENT_COLOR_PRESETS.includes(normalizedValue);

	return (
		<div
			className="flex items-center gap-2"
			aria-label="模板主题色"
			title="模板主题色"
		>
			<span className="hidden text-xs font-medium text-slate-400 sm:inline">
				主题色
			</span>
			<div className="flex items-center gap-1.5">
				{RESUME_ACCENT_COLOR_PRESETS.map((color) => {
					const active = normalizedValue === color;
					return (
						<button
							key={color}
							type="button"
							onClick={() => onChange(color)}
							className={`h-6 w-6 rounded-full border border-black/10 shadow-sm outline-offset-2 transition hover:scale-110 ${
								active ? "outline-2 outline-slate-500" : ""
							}`}
							style={{ backgroundColor: color }}
							title={color}
							aria-label={`选择主题色 ${color}`}
							aria-pressed={active}
						/>
					);
				})}
				<label
					className={`relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border shadow-sm outline-offset-2 transition hover:scale-110 ${
						isPresetColor
							? "border-slate-200 bg-white text-slate-400"
							: "border-black/10 outline-2 outline-slate-500"
					}`}
					style={isPresetColor ? undefined : { backgroundColor: normalizedValue }}
					title="自定义主题色"
					aria-label="自定义主题色"
				>
					{isPresetColor && <Palette size={12} aria-hidden="true" />}
					<input
						type="color"
						value={normalizedValue}
						onChange={(event) =>
							onChange(normalizeResumeAccentColor(event.target.value))
						}
						className="absolute -inset-2 h-10 w-10 cursor-pointer opacity-0"
						aria-label="选择自定义主题色"
					/>
				</label>
			</div>
		</div>
	);
};

interface PreviewDialogProps {
	document: ResumeDocument;
	title: string;
	description: string;
	primaryLabel: string;
	onPrimary: () => void;
	onClose: () => void;
	actions?: ReactNode;
}

const PreviewDialog = ({
	document,
	title,
	description,
	primaryLabel,
	onPrimary,
	onClose,
	actions,
}: PreviewDialogProps) => (
	<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:p-6">
		<div className="grid h-[calc(100dvh-1.5rem)] w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl lg:grid-cols-[260px_minmax(0,1fr)] lg:grid-rows-none">
			<div className="flex min-h-0 flex-col border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0">
						<p className="text-[11px] font-semibold uppercase text-slate-400">
							预览
						</p>
						<h2 className="mt-2 break-words text-xl font-bold text-slate-900">
							{title}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
						aria-label="关闭预览"
					>
						<X size={17} />
					</button>
				</div>
				<p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
				<div className="mt-5 flex flex-wrap gap-2 lg:mt-auto lg:flex-col">
					<button
						type="button"
						onClick={onPrimary}
						className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
					>
						{primaryLabel}
						<ArrowRight size={15} />
					</button>
					{actions}
				</div>
			</div>
			<div className="relative min-h-0 overflow-y-auto bg-slate-100 p-4 sm:p-8">
				<button
					type="button"
					onClick={onClose}
					className="sticky left-full top-0 z-10 mb-[-36px] hidden h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 lg:flex"
					aria-label="关闭预览"
				>
					<X size={17} />
				</button>
				<FullResumePreview
					document={document}
					className="mx-auto w-full max-w-[620px] border border-slate-200 shadow-xl shadow-slate-900/10"
				/>
			</div>
		</div>
	</div>
);

const TemplateCard = ({
	templateId,
	document,
	onPreview,
	onUse,
}: {
	templateId: TemplateId;
	document: ResumeDocument;
	onPreview: () => void;
	onUse: () => void;
}) => {
	const config = templateConfigs[templateId];
	return (
		<article className="group relative aspect-[210/297] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] transition hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/[0.06]">
			<ResumeThumbnail
				document={document}
				templateId={templateId}
				className="absolute inset-0 h-full w-full"
			/>
			<button
				type="button"
				onClick={onPreview}
				className="absolute inset-0 z-[1]"
				aria-label={`预览 ${config.name}`}
			/>
			<div className="pointer-events-none absolute inset-x-0 bottom-9 z-[2] bg-gradient-to-t from-white/95 via-white/85 to-transparent px-3 pb-2 pt-10 text-slate-900">
				<h3 className="truncate text-xs font-bold">{config.name}</h3>
				<p className="mt-1 truncate text-[10px] text-slate-400">
					{config.description}
				</p>
			</div>
			<div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[3] flex h-9 items-center justify-end gap-3 border-t border-slate-200/80 bg-white/95 px-3 text-[11px] font-semibold backdrop-blur-sm">
				<button
					type="button"
					onClick={onPreview}
					className="text-slate-500 transition hover:text-slate-900"
				>
					预览
				</button>
				<button
					type="button"
					onClick={onUse}
					className="text-blue-600 transition hover:text-blue-700"
				>
					使用
				</button>
			</div>
		</article>
	);
};

interface CreateResumeModalProps {
	defaultName: string;
	onClose: () => void;
	onCreate: (input: CreateResumeInput) => void;
	onCreateFromJson: (
		input: CreateResumeFromJsonInput,
	) => Promise<string | null>;
}

const CreateResumeModal = ({
	defaultName,
	onClose,
	onCreate,
	onCreateFromJson,
}: CreateResumeModalProps) => {
	const jsonInputRef = useRef<HTMLInputElement>(null);
	const [name, setName] = useState(defaultName);
	const [nameEdited, setNameEdited] = useState(false);
	const [tagText, setTagText] = useState("");
	const [jsonFile, setJsonFile] = useState<File | null>(null);
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleJsonFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;
		event.target.value = "";
		setJsonError(null);
		setJsonFile(file);
		if (file && !nameEdited) setName("");
	};

	const submit = async (event?: FormEvent<HTMLFormElement>) => {
		event?.preventDefault();
		const tags = normalizeResumeTags(tagText);

		if (!jsonFile) {
			onCreate({
				name: name.trim() || defaultName,
				tags,
			});
			onClose();
			return;
		}

		setSubmitting(true);
		setJsonError(null);
		const error = await onCreateFromJson({
			file: jsonFile,
			name: name.trim(),
			tags,
		});
		setSubmitting(false);
		if (error) {
			setJsonError(error);
			return;
		}
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/15 px-4 py-4 backdrop-blur-[2px]">
			<form
				onSubmit={submit}
				className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/[0.08]"
			>
				<div className="mb-4 flex items-center gap-3">
					<span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500">
						<FilePlus2 size={19} />
					</span>
					<div>
						<h2 className="text-lg font-bold text-slate-900">新建简历</h2>
						<p className="mt-0.5 text-sm text-slate-400">名称与标签</p>
					</div>
				</div>

				<label className="mb-3 block">
					<span className="mb-1 block text-xs font-medium text-slate-500">
						简历名称
					</span>
					<input
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setNameEdited(true);
						}}
						className={inputClass}
						placeholder={jsonFile ? "留空使用 JSON 姓名" : undefined}
						autoFocus
					/>
				</label>

				<label className="block">
					<span className="mb-1 block text-xs font-medium text-slate-500">
						标签
					</span>
					<div className="relative">
						<Tags
							size={14}
							className="pointer-events-none absolute left-3 top-2.5 text-slate-300"
						/>
						<input
							value={tagText}
							onChange={(event) => setTagText(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Escape") onClose();
							}}
							className={`${inputClass} pl-8`}
							placeholder="前端, 社招, 北京"
						/>
					</div>
				</label>

				<input
					ref={jsonInputRef}
					type="file"
					accept=".json,application/json"
					className="hidden"
					onChange={handleJsonFileChange}
				/>
				<div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<span className="text-xs font-medium text-slate-500">
								JSON 文件
							</span>
							<p
								className={`mt-1 truncate text-sm ${
									jsonFile ? "text-slate-700" : "text-slate-300"
								}`}
							>
								{jsonFile ? jsonFile.name : "可选"}
							</p>
						</div>
						<div className="flex shrink-0 gap-2">
							{jsonFile && (
								<button
									type="button"
									onClick={() => {
										setJsonFile(null);
										setJsonError(null);
										if (!nameEdited) setName(defaultName);
									}}
									className="rounded-md px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-white hover:text-slate-700"
								>
									移除
								</button>
							)}
							<button
								type="button"
								onClick={() => jsonInputRef.current?.click()}
								className="inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-white px-2.5 py-2 text-xs font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
							>
								<Upload size={14} />
								选择 JSON
							</button>
						</div>
					</div>
					{jsonError && (
						<p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-500">
							{jsonError}
						</p>
					)}
				</div>

				<div className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						disabled={submitting}
						className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
					>
						取消
					</button>
					<button
						type="submit"
						disabled={submitting}
						className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
					>
						{jsonFile ? "导入并创建" : "创建"}
					</button>
				</div>
			</form>
		</div>
	);
};

interface UserSettingsPageProps {
	onExportUserData: () => void;
	onImportUserData: (file: File) => Promise<string | null>;
	localFolderSync: LocalFolderSyncViewState;
	onLocalFolderConnect: () => Promise<void>;
	onLocalFolderDisconnect: () => void;
	onLocalFolderPush: () => Promise<void>;
	onLocalFolderPull: () => Promise<void>;
	cloudSync: CloudSyncViewState;
	onCloudConnect: () => void;
	onCloudDisconnect: () => void;
	onCloudGistIdChange: (gistId: string) => void;
	onCloudPush: () => Promise<void>;
	onCloudPull: () => Promise<void>;
}

const UserSettingsPage = ({
	onExportUserData,
	onImportUserData,
	localFolderSync,
	onLocalFolderConnect,
	onLocalFolderDisconnect,
	onLocalFolderPush,
	onLocalFolderPull,
	cloudSync,
	onCloudConnect,
	onCloudDisconnect,
	onCloudGistIdChange,
	onCloudPush,
	onCloudPull,
}: UserSettingsPageProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [advancedSyncOpen, setAdvancedSyncOpen] = useState(false);
	const cloudBusy = cloudSync.status !== "idle";
	const canUseCloud = cloudSync.connected && !cloudBusy;
	const localFolderBusy = localFolderSync.status !== "idle";
	const lastSyncText = cloudSync.lastSyncedAt
		? `${cloudSync.lastDirection === "pull" ? "恢复" : "上传"} · ${formatUpdatedAt(cloudSync.lastSyncedAt)}`
		: "尚未同步";
	const localFolderLastSyncText = localFolderSync.lastSyncedAt
		? `${localFolderSync.lastDirection === "pull" ? "恢复" : "同步"} · ${formatUpdatedAt(localFolderSync.lastSyncedAt)}`
		: "尚未同步";

	const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		const error = await onImportUserData(file);
		setMessage(error ?? "用户数据已导入");
	};

	return (
		<>
			<div className="flex items-center gap-3 border-b border-slate-200 pb-5">
				<span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
					<Settings2 size={18} />
				</span>
				<h1 className="text-2xl font-bold text-slate-950">设置</h1>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept=".json,application/json"
				className="hidden"
				onChange={handleImportFile}
			/>

			<div className="grid max-w-5xl gap-4 py-7 lg:grid-cols-[minmax(0,1fr)_280px]">
				<section className="rounded-lg border border-slate-200 bg-white p-4">
					<div className="mb-4 flex items-start justify-between gap-3">
						<div>
							<div className="flex items-center gap-2 text-sm font-bold text-slate-800">
								<Cloud size={16} />
								GitHub Gist 云同步
							</div>
							<p className="mt-2 text-sm font-semibold text-slate-700">
								{cloudSync.connected ? "已准备同步" : "连接后可同步"}
							</p>
						</div>
						{cloudSync.connected ? (
							<div className="flex max-w-36 items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 py-1 pl-1 pr-2 text-blue-600">
								{getGitHubAvatarUrl(cloudSync) ? (
									<img
										src={getGitHubAvatarUrl(cloudSync)}
										alt=""
										className="h-6 w-6 rounded-full bg-white object-cover ring-1 ring-white"
									/>
								) : (
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold">
										{(cloudSync.login || "G").slice(0, 1).toUpperCase()}
									</span>
								)}
								<span className="min-w-0 truncate text-[11px] font-medium">
									{cloudSync.login || "已连接"}
								</span>
							</div>
						) : (
							<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
								未连接
							</span>
						)}
					</div>

					<div className="flex flex-wrap gap-2">
						{cloudSync.connected ? (
							<button
								type="button"
								onClick={onCloudDisconnect}
								className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
							>
								<LogOut size={15} />
								断开 GitHub
							</button>
						) : (
							<button
								type="button"
								onClick={onCloudConnect}
								disabled={!cloudSync.oauthConfigured || cloudBusy}
								className="inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
							>
								<Github size={15} />
								连接 GitHub
							</button>
						)}
						<button
							type="button"
							onClick={() => void onCloudPush()}
							disabled={!canUseCloud}
							className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
						>
							<CloudUpload size={15} />
							上传到云端
						</button>
						<button
							type="button"
							onClick={() => void onCloudPull()}
							disabled={!canUseCloud}
							className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
						>
							<CloudDownload size={15} />
							从云端恢复
						</button>
					</div>

					<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
						<span>最近同步：{lastSyncText}</span>
						<button
							type="button"
							onClick={() => setAdvancedSyncOpen((open) => !open)}
							className="font-medium transition hover:text-slate-600"
						>
							{advancedSyncOpen ? "收起 Gist ID" : "Gist ID"}
						</button>
					</div>

					{advancedSyncOpen && (
						<label className="mt-3 block">
							<span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
								<Link size={13} />
								Gist ID
							</span>
							<input
								value={cloudSync.gistId}
								onChange={(event) => onCloudGistIdChange(event.target.value)}
								className={inputClass}
								placeholder="自动查找失败时手动粘贴"
							/>
						</label>
					)}

					{!cloudSync.oauthConfigured && (
						<p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-600">
							需要配置 VITE_GITHUB_OAUTH_CLIENT_ID 后才能连接 GitHub。
						</p>
					)}
					{cloudSync.message && (
						<p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
							{cloudSync.message}
						</p>
					)}
				</section>

				<section className="rounded-lg border border-slate-200 bg-white p-4 lg:row-start-2">
					<div className="mb-4 flex items-start justify-between gap-3">
						<div>
							<div className="flex items-center gap-2 text-sm font-bold text-slate-800">
								<FolderSync size={16} />
								本地目录同步
							</div>
							<p className="mt-2 truncate text-sm font-semibold text-slate-700">
								{localFolderSync.directoryName || "未选择目录"}
							</p>
						</div>
						<span
							className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
								localFolderSync.connected
									? "bg-emerald-50 text-emerald-600"
									: "bg-slate-100 text-slate-400"
							}`}
						>
							{localFolderSync.connected ? "已选择" : "未选择"}
						</span>
					</div>

					<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => void onLocalFolderConnect()}
								disabled={localFolderBusy}
								className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
							>
							<FolderOpen size={15} />
							选择目录
						</button>
							<button
								type="button"
								onClick={() => void onLocalFolderPush()}
								disabled={localFolderBusy}
								className="inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
							>
							<HardDriveUpload size={15} />
							同步到目录
						</button>
							<button
								type="button"
								onClick={() => void onLocalFolderPull()}
								disabled={localFolderBusy}
								className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
							>
							<HardDriveDownload size={15} />
							从目录恢复
						</button>
						{localFolderSync.connected && (
							<button
								type="button"
								onClick={onLocalFolderDisconnect}
								disabled={localFolderBusy}
								className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
							>
								<LogOut size={15} />
								移除目录
							</button>
						)}
					</div>

					<div className="mt-4 text-xs text-slate-400">
						最近同步：{localFolderLastSyncText}
					</div>

					{localFolderSync.message && (
						<p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
							{localFolderSync.message}
						</p>
					)}
				</section>

				<section className="rounded-lg border border-slate-200 bg-white p-4">
					<div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
						<Database size={16} />
						用户数据
					</div>
					<div className="flex flex-col gap-2">
						<button
							type="button"
							onClick={onExportUserData}
							className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
						>
							<Download size={15} />
							导出用户数据
						</button>
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 text-sm font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
						>
							<Upload size={15} />
							导入用户数据
						</button>
					</div>
					{message && (
						<p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
							{message}
						</p>
					)}
				</section>
			</div>
		</>
	);
};

export type ManagerView = "resumes" | "templates" | "settings";

const MANAGER_SIDEBAR_WIDTH_STORAGE_KEY = "iresume:v2:manager-sidebar-width";
const DEFAULT_MANAGER_SIDEBAR_WIDTH = 192;
const MIN_MANAGER_SIDEBAR_WIDTH = 168;
const MAX_MANAGER_SIDEBAR_WIDTH = 256;

const normalizeManagerSidebarWidth = (value: unknown) => {
	if (value === null || value === undefined || value === "") {
		return DEFAULT_MANAGER_SIDEBAR_WIDTH;
	}
	const width = Number(value);
	if (!Number.isFinite(width)) return DEFAULT_MANAGER_SIDEBAR_WIDTH;
	return Math.min(
		MAX_MANAGER_SIDEBAR_WIDTH,
		Math.max(MIN_MANAGER_SIDEBAR_WIDTH, width),
	);
};

const ResumeManager = ({
	documents,
	onCreate,
	onCreateFromJson,
	onOpen,
	onDuplicate,
	onDelete,
	onExportUserData,
	onImportUserData,
	localFolderSync,
	onLocalFolderConnect,
	onLocalFolderDisconnect,
	onLocalFolderPush,
	onLocalFolderPull,
	cloudSync,
	onCloudConnect,
	onCloudDisconnect,
	onCloudGistIdChange,
	onCloudPush,
	onCloudPull,
	initialView = "resumes",
}: ResumeManagerProps) => {
	const [creating, setCreating] = useState(false);
	const [sidebarWidth, setSidebarWidth] = useState(() =>
		normalizeManagerSidebarWidth(
			localStorage.getItem(MANAGER_SIDEBAR_WIDTH_STORAGE_KEY),
		),
	);
	const sidebarResizeRef = useRef<{
		pointerId: number;
		startX: number;
		startWidth: number;
	} | null>(null);
	const [activeView, setActiveView] = useState<ManagerView>(initialView);
	const [templateAccentColor, setTemplateAccentColor] = useState(
		() => documents[0]?.appearance.accentColor ?? DEFAULT_RESUME_ACCENT_COLOR,
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(
		null,
	);
	const [previewTemplateId, setPreviewTemplateId] =
		useState<TemplateId | null>(null);
	const defaultName = `新简历 ${documents.length + 1}`;
	const sortedDocuments = useMemo(
		() =>
			[...documents].sort(
				(a, b) =>
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
			),
			[documents],
		);
	const previewDocument =
		sortedDocuments.find((document) => document.id === previewDocumentId) ??
		null;
	const filteredDocuments = useMemo(() => {
		const keyword = searchQuery.trim().toLocaleLowerCase("zh-CN");
		if (!keyword) return sortedDocuments;
		return sortedDocuments.filter((document) =>
			[document.name, document.version, ...document.tags]
				.join(" ")
				.toLocaleLowerCase("zh-CN")
				.includes(keyword),
		);
	}, [searchQuery, sortedDocuments]);
	const templatePreviewBase = useMemo(
		() =>
			createResumeDocument({
				name: "模板预览",
				appearance: { accentColor: templateAccentColor },
			}),
		[templateAccentColor],
	);
	const templatePreviewDocument = previewTemplateId
		? {
				...templatePreviewBase,
				name: templateConfigs[previewTemplateId].name,
				appearance: {
					...templatePreviewBase.appearance,
					templateId: previewTemplateId,
					accentColor: templateAccentColor,
				},
			}
		: null;

	const handleUseTemplate = (templateId: TemplateId) => {
		onCreate({
			name: `新${templateConfigs[templateId].name}简历`,
			tags: [],
			templateId,
			accentColor: templateAccentColor,
		});
	};

	useEffect(() => {
		setActiveView(initialView);
	}, [initialView]);

	useEffect(() => {
		localStorage.setItem(
			MANAGER_SIDEBAR_WIDTH_STORAGE_KEY,
			String(Math.round(sidebarWidth)),
		);
	}, [sidebarWidth]);

	useEffect(
		() => () => {
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		},
		[],
	);

	const handleSidebarResizeStart = (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => {
		event.preventDefault();
		sidebarResizeRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startWidth: sidebarWidth,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	};

	const handleSidebarResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
		const state = sidebarResizeRef.current;
		if (!state || state.pointerId !== event.pointerId) return;
		setSidebarWidth(
			normalizeManagerSidebarWidth(
				state.startWidth + event.clientX - state.startX,
			),
		);
	};

	const finishSidebarResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
		if (sidebarResizeRef.current?.pointerId !== event.pointerId) return;
		sidebarResizeRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
	};

	const handleSidebarResizeKeyDown = (
		event: ReactKeyboardEvent<HTMLButtonElement>,
	) => {
		const delta = event.key === "ArrowLeft" ? -8 : event.key === "ArrowRight" ? 8 : 0;
		if (delta === 0) return;
		event.preventDefault();
		setSidebarWidth((current) => normalizeManagerSidebarWidth(current + delta));
	};

	const navItems: {
		id: ManagerView;
		label: string;
		icon: typeof Files;
	}[] = [
		{ id: "resumes", label: "我的简历", icon: Files },
		{ id: "templates", label: "模板中心", icon: LayoutTemplate },
		{ id: "settings", label: "设置", icon: Settings2 },
	];

	const navigation = (
		<nav className="flex gap-1 md:flex-col" aria-label="工作台导航">
			{navItems.map((item) => {
				const Icon = item.icon;
				const active = activeView === item.id;
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => setActiveView(item.id)}
						className={`flex h-10 min-w-0 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition md:w-full ${
							active
								? "bg-blue-50 text-blue-700"
								: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
						}`}
					>
						<Icon size={17} />
						<span>{item.label}</span>
					</button>
				);
			})}
		</nav>
	);

	const managerLayoutStyle = {
		"--manager-sidebar-width": `${sidebarWidth}px`,
	} as CSSProperties;

	return (
		<div
			className="min-h-screen bg-slate-50 font-sans text-slate-900"
			style={managerLayoutStyle}
		>
			<aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--manager-sidebar-width)] flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex">
				<div className="px-2 py-1">
					<BrandMark />
				</div>
				<div className="mt-7">{navigation}</div>
				<div className="mt-auto flex items-center gap-1 border-t border-slate-100 px-1 pt-3">
					<a
						href="https://github.com/dogxii/iResume"
						target="_blank"
						rel="noreferrer"
						className="flex h-9 w-9 items-center justify-center rounded-md text-slate-300 transition hover:bg-slate-50 hover:text-slate-600"
						title="GitHub"
						aria-label="GitHub"
					>
						<Github size={16} />
					</a>
				</div>
				<button
					type="button"
					onPointerDown={handleSidebarResizeStart}
					onPointerMove={handleSidebarResize}
					onPointerUp={finishSidebarResize}
					onPointerCancel={finishSidebarResize}
					onLostPointerCapture={finishSidebarResize}
					onKeyDown={handleSidebarResizeKeyDown}
					className="group absolute inset-y-0 -right-1 w-2 cursor-col-resize touch-none"
					title="拖动调整侧栏宽度"
					aria-label="调整侧栏宽度"
				>
					<span className="absolute inset-y-0 left-1/2 w-px bg-blue-400 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70" />
				</button>
			</aside>

			<header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
				<div className="flex items-center gap-3">
					<BrandMark />
				</div>
				<div className="mt-3 overflow-x-auto">{navigation}</div>
			</header>

			<main className="min-h-screen md:ml-[var(--manager-sidebar-width)]">
				<div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
					{activeView === "resumes" ? (
						<>
							<div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
								<h1 className="text-2xl font-bold text-slate-950">我的简历</h1>
								<label className="relative w-full sm:w-64">
									<Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
									<input
										value={searchQuery}
										onChange={(event) => setSearchQuery(event.target.value)}
										className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
										placeholder="搜索名称或标签"
									/>
								</label>
							</div>

							<section className="pt-7">
								<div className="mb-4">
									<h2 className="text-base font-bold text-slate-900">全部简历</h2>
								</div>
								<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
									<CreateResumeCard onClick={() => setCreating(true)} />
									{filteredDocuments.map((document) => (
										<ResumeCard
											key={document.id}
											document={document}
											canDelete={documents.length > 1}
											onPreview={() => setPreviewDocumentId(document.id)}
											onEdit={() => onOpen(document.id)}
											onDuplicate={() => onDuplicate(document.id)}
											onDelete={() => onDelete(document.id)}
										/>
									))}
								</div>
								{filteredDocuments.length === 0 && searchQuery.trim() && (
									<div className="border-y border-slate-200 py-14 text-center">
										<Search className="mx-auto text-slate-300" size={22} />
										<p className="mt-3 text-sm font-medium text-slate-500">没有找到匹配的简历</p>
									</div>
								)}
							</section>
						</>
					) : activeView === "templates" ? (
						<>
							<div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
								<h1 className="text-2xl font-bold text-slate-950">模板中心</h1>
								<TemplateAccentColorPicker
									value={templateAccentColor}
									onChange={setTemplateAccentColor}
								/>
							</div>

							<div className="grid max-w-6xl grid-cols-2 gap-4 py-6 sm:grid-cols-3 lg:grid-cols-4">
								{templateIds.map((templateId) => (
									<TemplateCard
										key={templateId}
										templateId={templateId}
										document={templatePreviewBase}
										onPreview={() => setPreviewTemplateId(templateId)}
										onUse={() => handleUseTemplate(templateId)}
									/>
								))}
							</div>
						</>
					) : (
						<UserSettingsPage
							onExportUserData={onExportUserData}
							onImportUserData={onImportUserData}
							localFolderSync={localFolderSync}
							onLocalFolderConnect={onLocalFolderConnect}
							onLocalFolderDisconnect={onLocalFolderDisconnect}
							onLocalFolderPush={onLocalFolderPush}
							onLocalFolderPull={onLocalFolderPull}
							cloudSync={cloudSync}
							onCloudConnect={onCloudConnect}
							onCloudDisconnect={onCloudDisconnect}
							onCloudGistIdChange={onCloudGistIdChange}
							onCloudPush={onCloudPush}
							onCloudPull={onCloudPull}
						/>
					)}
				</div>
			</main>

			{creating && (
				<CreateResumeModal
					defaultName={defaultName}
					onClose={() => setCreating(false)}
					onCreate={onCreate}
					onCreateFromJson={onCreateFromJson}
				/>
			)}

			{previewDocument && (
				<PreviewDialog
					document={previewDocument}
					title={previewDocument.name}
					description={`最后更新于 ${formatUpdatedAt(previewDocument.updatedAt)}，当前版本 v${previewDocument.version}。`}
					primaryLabel="进入编辑器"
					onPrimary={() => onOpen(previewDocument.id)}
					onClose={() => setPreviewDocumentId(null)}
					actions={
						<>
							<button
								type="button"
								onClick={() => onDuplicate(previewDocument.id)}
								className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
							>
								<Copy size={15} />
								复制简历
							</button>
							<button
								type="button"
								onClick={() => {
									onDelete(previewDocument.id);
									setPreviewDocumentId(null);
								}}
								disabled={documents.length <= 1}
								className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
							>
								<Trash2 size={15} />
								删除
							</button>
						</>
					}
				/>
			)}

			{previewTemplateId && templatePreviewDocument && (
				<PreviewDialog
					document={templatePreviewDocument}
					title={templateConfigs[previewTemplateId].name}
					description={templateConfigs[previewTemplateId].description}
					primaryLabel="使用此模板"
					onPrimary={() => handleUseTemplate(previewTemplateId)}
					onClose={() => setPreviewTemplateId(null)}
				/>
			)}
		</div>
	);
};

export default ResumeManager;
