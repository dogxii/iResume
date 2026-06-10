import {
	Clock3,
	Cloud,
	CloudDownload,
	CloudUpload,
	Copy,
	Database,
	Download,
	FilePlus2,
	Github,
	Link,
	LogOut,
	MoreHorizontal,
	Plus,
	Settings2,
	ShieldCheck,
	Tags,
	Trash2,
	Upload,
} from "lucide-react";
import {
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type FormEvent,
} from "react";
import {
	normalizeResumeTags,
	type ResumeDocument,
} from "../data/resumeLibrary";
import ResumePreview from "./ResumePreview";

interface CreateResumeInput {
	name: string;
	tags: string[];
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
	cloudSync: CloudSyncViewState;
	onCloudConnect: () => void;
	onCloudDisconnect: () => void;
	onCloudGistIdChange: (gistId: string) => void;
	onCloudPush: () => Promise<void>;
	onCloudPull: () => Promise<void>;
}

interface ResumeCardProps {
	document: ResumeDocument;
	canDelete: boolean;
	onOpen: () => void;
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

const inputClass =
	"w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500";

const getGitHubAvatarUrl = (cloudSync: CloudSyncViewState) =>
	cloudSync.avatarUrl ||
	(cloudSync.login ? `https://github.com/${cloudSync.login}.png?size=64` : "");

const BrandMark = () => (
	<div className="flex items-center gap-2 text-xl font-bold">
		<span className="inline-flex items-center justify-center rounded bg-blue-600 px-2 py-1 text-sm font-black leading-none tracking-tight text-white">
			i
		</span>
		<span className="leading-none">Resume</span>
	</div>
);

const inertProps = { inert: true };

const ResumeThumbnail = ({
	document,
	className = "",
	scale = 0.17,
}: {
	document: ResumeDocument;
	className?: string;
	scale?: number;
}) => (
	<div
		{...inertProps}
		aria-hidden="true"
		className={`relative shrink-0 overflow-hidden rounded-md border border-slate-200/80 bg-white ${className}`}
	>
		<div
			className="absolute left-1/2 top-0 w-[210mm]"
			style={{
				marginLeft: "-105mm",
				transform: `scale(${scale})`,
				transformOrigin: "top center",
			}}
		>
			<ResumePreview
				data={document.data}
				themeId={document.appearance.themeId}
				fontSizePt={document.appearance.fontSizePt}
				pageMarginMm={document.appearance.pageMarginMm}
				sectionIcons={document.appearance.sectionIcons}
				sectionPreferences={document.appearance.sectionPreferences}
				minPageCount={1}
			/>
		</div>
	</div>
);

const DocumentMeta = ({ document }: { document: ResumeDocument }) => (
	<>
		<div className="flex items-center gap-2 text-xs text-slate-400">
			<span className="font-mono">v{document.version}</span>
			<span className="h-1 w-1 rounded-full bg-slate-300" />
			<span className="inline-flex items-center gap-1">
				<Clock3 size={13} />
				{formatUpdatedAt(document.updatedAt)}
			</span>
		</div>
		<div className="mt-2 min-h-6">
			{document.tags.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{document.tags.map((tag) => (
						<span
							key={tag}
							className="rounded border border-slate-200/70 bg-slate-50/70 px-1.5 py-0.5 text-[11px] font-medium text-slate-400"
						>
							{tag}
						</span>
					))}
				</div>
			) : (
				<span className="text-xs text-slate-300">未添加标签</span>
			)}
		</div>
	</>
);

const RecentResumePanel = ({
	document,
	onOpen,
}: {
	document: ResumeDocument;
	onOpen: () => void;
}) => (
	<button
		type="button"
		onClick={onOpen}
		className="grid min-h-[268px] rounded-lg border border-slate-200/70 bg-white/55 p-4 text-left transition-colors hover:border-slate-300 hover:bg-white/75 sm:grid-cols-[minmax(0,1fr)_190px] sm:gap-5"
	>
		<div className="flex min-w-0 flex-col justify-between">
			<div>
				<p className="mb-2 text-xs font-semibold text-slate-400">最近修改</p>
				<h2 className="line-clamp-2 text-xl font-bold tracking-tight text-slate-900">
					{document.name}
				</h2>
				<div className="mt-3">
					<DocumentMeta document={document} />
				</div>
			</div>
			<span className="mt-5 inline-flex w-fit rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
				继续编辑
			</span>
		</div>
		<ResumeThumbnail
			document={document}
			className="mx-auto mt-4 h-[252px] w-[178px] sm:mt-0"
			scale={0.225}
		/>
	</button>
);

const ResumeCard = ({
	document,
	canDelete,
	onOpen,
	onDuplicate,
	onDelete,
}: ResumeCardProps) => (
	<article className="group flex min-h-[332px] flex-col rounded-lg border border-slate-200/70 bg-white/60 p-3 transition-colors hover:border-slate-300 hover:bg-white/80">
		<button
			type="button"
			onClick={onOpen}
			className="flex min-w-0 flex-1 flex-col items-center text-left"
		>
			<ResumeThumbnail document={document} className="h-48 w-[136px]" />

			<div className="mt-4 w-full min-w-0">
				<div className="mb-2 flex items-start justify-between gap-3">
					<h2 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
						{document.name}
					</h2>
					<span className="shrink-0 rounded-full border border-slate-200/70 px-2 py-0.5 font-mono text-[11px] text-slate-400">
						v{document.version}
					</span>
				</div>
				<div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
					<Clock3 size={13} />
					<span>{formatUpdatedAt(document.updatedAt)}</span>
				</div>
			</div>
		</button>

		<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
			<button
				type="button"
				onClick={onOpen}
				className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
			>
				打开编辑
			</button>
			<div className="flex gap-1">
				<button
					type="button"
					onClick={onDuplicate}
					className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
					title="复制"
					aria-label={`复制 ${document.name}`}
				>
					<Copy size={14} />
				</button>
				<button
					type="button"
					onClick={onDelete}
					disabled={!canDelete}
					className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-35"
					title="删除"
					aria-label={`删除 ${document.name}`}
				>
					<Trash2 size={14} />
				</button>
			</div>
		</div>
	</article>
);

const CreateResumeCard = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={onClick}
		className="group flex min-h-[268px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/30 p-5 text-slate-400 transition-colors hover:border-slate-400 hover:bg-white/55 hover:text-slate-600"
	>
		<span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-current bg-white/40">
			<Plus size={22} />
		</span>
		<span className="text-sm font-semibold">新建简历</span>
		<span className="mt-1 text-xs text-slate-300">示例或 JSON</span>
	</button>
);

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

interface UserSettingsModalProps {
	onClose: () => void;
	onExportUserData: () => void;
	onImportUserData: (file: File) => Promise<string | null>;
	cloudSync: CloudSyncViewState;
	onCloudConnect: () => void;
	onCloudDisconnect: () => void;
	onCloudGistIdChange: (gistId: string) => void;
	onCloudPush: () => Promise<void>;
	onCloudPull: () => Promise<void>;
}

type SettingsTab = "sync" | "data" | "workflow";

const settingsTabs: {
	id: SettingsTab;
	label: string;
	icon: typeof Database;
}[] = [
	{ id: "sync", label: "云同步", icon: Cloud },
	{ id: "data", label: "用户数据", icon: Database },
	{ id: "workflow", label: "工作流", icon: Copy },
];

const UserSettingsModal = ({
	onClose,
	onExportUserData,
	onImportUserData,
	cloudSync,
	onCloudConnect,
	onCloudDisconnect,
	onCloudGistIdChange,
	onCloudPush,
	onCloudPull,
}: UserSettingsModalProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [activeTab, setActiveTab] = useState<SettingsTab>("sync");
	const [message, setMessage] = useState<string | null>(null);
	const [advancedSyncOpen, setAdvancedSyncOpen] = useState(false);
	const cloudBusy = cloudSync.status !== "idle";
	const canUseCloud = cloudSync.connected && !cloudBusy;
	const lastSyncText = cloudSync.lastSyncedAt
		? `${cloudSync.lastDirection === "pull" ? "恢复" : "上传"} · ${formatUpdatedAt(cloudSync.lastSyncedAt)}`
		: "尚未同步";

	const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		const error = await onImportUserData(file);
		setMessage(error ?? "用户数据已导入");
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/15 px-4 py-4 backdrop-blur-[2px]">
			<div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-lg shadow-slate-900/[0.08]">
				<input
					ref={inputRef}
					type="file"
					accept=".json,application/json"
					className="hidden"
					onChange={handleImportFile}
				/>
				<div className="mb-4 flex items-start justify-between gap-4">
					<div className="flex items-center gap-3">
						<span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-slate-500 ring-1 ring-slate-200/80">
							<Settings2 size={18} />
						</span>
						<div>
							<h2 className="text-lg font-bold text-slate-900">设置</h2>
							<p className="mt-0.5 text-sm text-slate-400">
								数据与工作流
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md px-2 py-1 text-sm font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
					>
						关闭
					</button>
				</div>

				<div className="mb-4 flex w-fit rounded-lg border border-slate-200/80 bg-white p-1">
					{settingsTabs.map((tab) => {
						const Icon = tab.icon;
						const active = tab.id === activeTab;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
									active
										? "bg-blue-50 text-blue-600"
										: "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
								}`}
							>
								<Icon size={14} />
								{tab.label}
							</button>
						);
					})}
				</div>

				{activeTab === "sync" && (
					<section className="rounded-lg border border-slate-200/80 bg-white p-4">
						<div className="mb-4 flex items-start justify-between gap-3">
							<div>
								<h3 className="text-sm font-bold text-slate-800">
									GitHub Gist 云同步
								</h3>
								<p className="mt-1 text-xs leading-relaxed text-slate-400">
									登录后自动加密同步。
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

						<div className="rounded-md bg-slate-50 px-3 py-2">
							<span className="text-xs font-medium text-slate-400">
								同步状态
							</span>
							<p className="mt-1 text-sm font-semibold text-slate-700">
								{cloudSync.connected ? "已准备同步" : "连接后可同步"}
							</p>
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
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

						<div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
							<div className="rounded-md bg-slate-50 px-3 py-2">
								<span className="block font-medium text-slate-500">
									最近同步
								</span>
								<span className="mt-1 block">{lastSyncText}</span>
							</div>
							<div className="rounded-md bg-slate-50 px-3 py-2">
								<span className="flex items-center gap-1.5 font-medium text-slate-500">
									<ShieldCheck size={13} />
									加密方式
								</span>
								<span className="mt-1 block">AES-GCM 自动密钥</span>
							</div>
						</div>

						<div className="mt-3">
							<button
								type="button"
								onClick={() => setAdvancedSyncOpen((open) => !open)}
								className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
							>
								{advancedSyncOpen ? "收起高级绑定" : "高级绑定"}
							</button>
							{advancedSyncOpen && (
								<label className="mt-2 block rounded-md border border-slate-200/80 bg-white p-3">
									<span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
										<Link size={13} />
										Gist ID
									</span>
									<input
										value={cloudSync.gistId}
										onChange={(event) =>
											onCloudGistIdChange(event.target.value)
										}
										className={inputClass}
										placeholder="自动查找失败时手动粘贴"
									/>
								</label>
							)}
						</div>

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
				)}

				{activeTab === "data" && (
					<section className="rounded-lg border border-slate-200/80 bg-white p-4">
						<h3 className="text-sm font-bold text-slate-800">用户数据</h3>
						<p className="mt-1 text-xs leading-relaxed text-slate-400">
							包含所有简历、主题收藏与预览设置。
						</p>
						<div className="mt-4 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={onExportUserData}
								className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
							>
								<Download size={15} />
								导出用户数据
							</button>
							<button
								type="button"
								onClick={() => inputRef.current?.click()}
								className="inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50"
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
				)}

				{activeTab === "workflow" && (
					<section className="grid gap-3 rounded-lg border border-slate-200/80 bg-white p-4 sm:grid-cols-2">
						<div className="rounded-md bg-slate-50 p-3">
							<span className="text-xs font-medium text-slate-400">
								新建简历
							</span>
							<p className="mt-1 text-sm font-semibold text-slate-700">
								内置示例
							</p>
						</div>
						<div className="rounded-md bg-slate-50 p-3">
							<span className="text-xs font-medium text-slate-400">
								自定义模板
							</span>
							<p className="mt-1 text-sm font-semibold text-slate-700">
								复制已有简历
							</p>
						</div>
					</section>
				)}
			</div>
		</div>
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
	cloudSync,
	onCloudConnect,
	onCloudDisconnect,
	onCloudGistIdChange,
	onCloudPush,
	onCloudPull,
}: ResumeManagerProps) => {
	const [creating, setCreating] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const defaultName = `新简历 ${documents.length + 1}`;
	const sortedDocuments = useMemo(
		() =>
			[...documents].sort(
				(a, b) =>
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
			),
		[documents],
	);
	const recentDocument = sortedDocuments[0];

	return (
		<div className="min-h-screen bg-slate-100 font-sans text-slate-900">
			<header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-100/90 backdrop-blur">
				<div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
						<BrandMark />
						<div className="flex items-center gap-2">
							<a
								href="https://github.com/dogxii/iResume"
								target="_blank"
							rel="noreferrer"
							aria-label="GitHub 仓库"
							className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
							>
								<Github size={18} />
							</a>
							<button
								type="button"
								onClick={() => setSettingsOpen(true)}
								className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
								title="更多设置"
								aria-label="更多设置"
							>
								<MoreHorizontal size={19} />
							</button>
						</div>
					</div>
				</header>

			<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
				<div className="mb-5">
					<div>
						<p className="mb-1 text-xs font-semibold text-slate-400">
							本地工作台
						</p>
						<h1 className="text-2xl font-bold tracking-tight text-slate-900">
							简历库
						</h1>
					</div>
				</div>

				<div className="mb-8 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
					<CreateResumeCard onClick={() => setCreating(true)} />
					{recentDocument && (
						<RecentResumePanel
							document={recentDocument}
							onOpen={() => onOpen(recentDocument.id)}
						/>
					)}
				</div>

				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-bold text-slate-700">全部简历</h2>
					<span className="text-xs text-slate-400">
						{sortedDocuments.length} 份
					</span>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{sortedDocuments.map((document) => (
						<ResumeCard
							key={document.id}
							document={document}
							canDelete={documents.length > 1}
							onOpen={() => onOpen(document.id)}
							onDuplicate={() => onDuplicate(document.id)}
							onDelete={() => onDelete(document.id)}
						/>
					))}
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

				{settingsOpen && (
					<UserSettingsModal
						onClose={() => setSettingsOpen(false)}
						onExportUserData={onExportUserData}
						onImportUserData={onImportUserData}
						cloudSync={cloudSync}
						onCloudConnect={onCloudConnect}
						onCloudDisconnect={onCloudDisconnect}
						onCloudGistIdChange={onCloudGistIdChange}
						onCloudPush={onCloudPush}
						onCloudPull={onCloudPull}
					/>
				)}
			</div>
		);
	};

export default ResumeManager;
