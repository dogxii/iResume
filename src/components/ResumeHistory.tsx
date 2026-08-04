import {
	ArrowRight,
	Bookmark,
	ChevronDown,
	ChevronRight,
	Clock,
	FileDiff,
	Pencil,
	RefreshCcw,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ResumeDocument } from "../data/resumeLibrary";
import {
	addSnapshot,
	computeNextVersion,
	createSnapshotDiff,
	DEFAULT_SNAPSHOT_LABEL,
	formatSnapshotDiffSummary,
	getLatestSnapshotVersion,
	removeSnapshot,
	renameSnapshot,
	type DocumentHistory,
	type HistorySnapshot,
	type HistorySnapshotDocument,
	type SnapshotChange,
	type SnapshotChangeKind,
	type SnapshotDiff,
	type VersionBump,
} from "../data/resumeHistory";

const formatRelativeTime = (dateStr: string) => {
	const date = new Date(dateStr);
	if (!Number.isFinite(date.getTime())) return "未知时间";

	const now = Date.now();
	const diff = now - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (seconds < 60) return "刚刚";
	if (minutes < 60) return `${minutes} 分钟前`;
	if (hours < 24) return `${hours} 小时前`;
	if (days < 7) return `${days} 天前`;

	return new Intl.DateTimeFormat("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};

const formatAbsoluteTime = (dateStr: string) => {
	const date = new Date(dateStr);
	if (!Number.isFinite(date.getTime())) return "";

	return new Intl.DateTimeFormat("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(date);
};

interface ResumeHistoryModalProps {
	documentHistory: DocumentHistory;
	currentDocument: ResumeDocument;
	onChangeHistory: (history: DocumentHistory) => void;
	onRestore: (document: HistorySnapshotDocument, version: string) => void;
	onVersionChange: (version: string) => void;
	onClose: () => void;
}

const VersionBumpSelect = ({
	bump,
	onChange,
}: {
	bump: VersionBump;
	onChange: (bump: VersionBump) => void;
}) => {
	return (
		<div className="inline-flex rounded-full bg-slate-100/70 p-0.5 ring-1 ring-slate-200/60">
			<button
				type="button"
				onClick={() => onChange("patch")}
				className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
					bump === "patch"
						? "bg-white text-slate-700 shadow-sm shadow-slate-900/5"
						: "text-slate-400 hover:text-slate-600"
				}`}
				aria-pressed={bump === "patch"}
			>
				小版本
			</button>
			<button
				type="button"
				onClick={() => onChange("minor")}
				className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
					bump === "minor"
						? "bg-white text-slate-700 shadow-sm shadow-slate-900/5"
						: "text-slate-400 hover:text-slate-600"
				}`}
				aria-pressed={bump === "minor"}
			>
				大版本
			</button>
		</div>
	);
};

const VersionPreview = ({
	currentVersion,
	nextVersion,
}: {
	currentVersion: string;
	nextVersion: string;
}) => (
	<span className="inline-flex items-center gap-1.5 rounded-md bg-white/70 px-2 py-1 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200/60">
		v{currentVersion}
		<ArrowRight size={12} className="text-slate-300" />
		<span className="font-semibold text-blue-600">v{nextVersion}</span>
	</span>
);

const changeMarks: Record<SnapshotChangeKind, { mark: string; className: string }> = {
	added: { mark: "+", className: "text-emerald-600" },
	removed: { mark: "-", className: "text-red-500" },
	changed: { mark: "~", className: "text-blue-500" },
	moved: { mark: "~", className: "text-slate-500" },
};

const DiffStats = ({ diff }: { diff: SnapshotDiff }) => {
	if (!diff.baseVersion) {
		return <span className="text-[11px] text-slate-400">基准</span>;
	}

	if (diff.changes.length === 0) {
		return <span className="text-[11px] text-slate-400">无变化</span>;
	}

	return (
		<span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
			<span className="text-emerald-600">+{diff.stats.added}</span>
			<span className="text-red-500">-{diff.stats.removed}</span>
			<span className="text-blue-500">~{diff.stats.changed}</span>
		</span>
	);
};

const DiffChangeLine = ({ change }: { change: SnapshotChange }) => {
	const tone = changeMarks[change.kind];

	return (
		<div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2">
			<span className={`font-mono text-xs font-semibold ${tone.className}`}>
				{tone.mark}
			</span>
			<div className="min-w-0">
				<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
					<span className="font-medium text-slate-500">{change.scope}</span>
					<span className="min-w-0 text-slate-700">{change.title}</span>
				</div>
				{change.detail && (
					<p className="mt-0.5 text-[11px] leading-5 text-slate-400">
						{change.detail}
					</p>
				)}
				{(change.before || change.after) && (
					<div className="mt-1 space-y-0.5 font-mono text-[11px] leading-5">
						{change.before && (
							<p className="truncate text-red-500/80">- {change.before}</p>
						)}
						{change.after && (
							<p className="truncate text-emerald-600/80">
								+ {change.after}
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

const DiffPanel = ({ diff }: { diff: SnapshotDiff }) => (
	<div className="mt-2 border-l border-slate-200 pl-3">
		<div className="mb-2 flex items-center justify-between gap-3">
			<span className="text-[11px] text-slate-400">
				{diff.baseVersion ? (
					<>
						v{diff.baseVersion}
						<span className="mx-1 text-slate-300">-&gt;</span>
						v{diff.targetVersion}
					</>
				) : (
					"这个快照是比较基准"
				)}
			</span>
			<DiffStats diff={diff} />
		</div>

		{!diff.baseVersion ? (
			<p className="text-xs leading-5 text-slate-400">
				后续快照会和它比较内容变化。
			</p>
		) : diff.changes.length === 0 ? (
			<p className="text-xs leading-5 text-slate-400">
				内容没有变化，只记录了这次保存。
			</p>
		) : (
			<div className="space-y-2">
				{diff.changes.map((change, index) => (
					<DiffChangeLine
						key={`${change.scope}-${change.title}-${index}`}
						change={change}
					/>
				))}
			</div>
		)}
	</div>
);

const ResumeHistoryModal = ({
	documentHistory,
	currentDocument,
	onChangeHistory,
	onRestore,
	onVersionChange,
	onClose,
}: ResumeHistoryModalProps) => {
	const currentVersion = currentDocument.version;
	const [restoringId, setRestoringId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [selectedDiffId, setSelectedDiffId] = useState<string | null>(null);
	const [editLabel, setEditLabel] = useState("");
	const [saveLabel, setSaveLabel] = useState("");
	const [noteInputOpen, setNoteInputOpen] = useState(false);
	const [versionBump, setVersionBump] = useState<VersionBump>("patch");
	const editInputRef = useRef<HTMLInputElement>(null);
	const saveInputRef = useRef<HTMLInputElement>(null);

	const isEmpty = documentHistory.snapshots.length === 0;
	const latestSnapshotVersion = useMemo(
		() => getLatestSnapshotVersion(documentHistory),
		[documentHistory],
	);
	const snapshotDiffs = useMemo(() => {
		const diffs = new Map<string, SnapshotDiff>();
		documentHistory.snapshots.forEach((snapshot, index) => {
			diffs.set(
				snapshot.id,
				createSnapshotDiff(snapshot, documentHistory.snapshots[index + 1]),
			);
		});
		return diffs;
	}, [documentHistory.snapshots]);

	const groupedSnapshots = useMemo(() => {
		const groups: {
			label: string;
			snapshots: HistorySnapshot[];
		}[] = [];
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today.getTime() - 86400000);
		const weekAgo = new Date(today.getTime() - 7 * 86400000);

		const buckets: { label: string; items: HistorySnapshot[] }[] = [
			{ label: "今天", items: [] },
			{ label: "昨天", items: [] },
			{ label: "最近七天", items: [] },
			{ label: "更早", items: [] },
		];

		for (const snapshot of documentHistory.snapshots) {
			const date = new Date(snapshot.createdAt);
			if (date >= today) {
				buckets[0].items.push(snapshot);
			} else if (date >= yesterday) {
				buckets[1].items.push(snapshot);
			} else if (date >= weekAgo) {
				buckets[2].items.push(snapshot);
			} else {
				buckets[3].items.push(snapshot);
			}
		}

		for (const bucket of buckets) {
			if (bucket.items.length > 0) {
				groups.push({ label: bucket.label, snapshots: bucket.items });
			}
		}

		return groups;
	}, [documentHistory.snapshots]);

	const handleSave = useCallback(() => {
		const nextVersion = computeNextVersion(
			currentVersion,
			latestSnapshotVersion,
			versionBump,
		);
		const label =
			noteInputOpen && saveLabel.trim()
				? saveLabel.trim()
				: DEFAULT_SNAPSHOT_LABEL;
		onChangeHistory(
			addSnapshot(documentHistory, currentDocument, label, nextVersion),
		);
		onVersionChange(nextVersion);
		setSaveLabel("");
		setNoteInputOpen(false);
	}, [
		documentHistory,
		currentDocument,
		currentVersion,
		latestSnapshotVersion,
		versionBump,
		saveLabel,
		noteInputOpen,
		onChangeHistory,
		onVersionChange,
	]);

	const handleRestore = useCallback(
		(snapshot: HistorySnapshot) => {
			if (restoringId) return;
			setRestoringId(snapshot.id);
			requestAnimationFrame(() => {
				onRestore(snapshot.document, snapshot.version);
			});
		},
		[restoringId, onRestore],
	);

	const handleDelete = useCallback(
		(snapshotId: string) => {
			onChangeHistory(removeSnapshot(documentHistory, snapshotId));
			if (selectedDiffId === snapshotId) setSelectedDiffId(null);
			setConfirmDeleteId(null);
		},
		[documentHistory, onChangeHistory, selectedDiffId],
	);

	const handleStartRename = useCallback((snapshot: HistorySnapshot) => {
		setEditingId(snapshot.id);
		setEditLabel(snapshot.label);
		requestAnimationFrame(() => {
			editInputRef.current?.focus();
			editInputRef.current?.select();
		});
	}, []);

	const handleFinishRename = useCallback(
		(snapshotId: string) => {
			if (editLabel.trim()) {
				onChangeHistory(renameSnapshot(documentHistory, snapshotId, editLabel.trim()));
			}
			setEditingId(null);
		},
		[documentHistory, editLabel, onChangeHistory],
	);

	const patchPreview = computeNextVersion(currentVersion, latestSnapshotVersion, "patch");
	const minorPreview = computeNextVersion(currentVersion, latestSnapshotVersion, "minor");
	const nextVersionPreview = versionBump === "patch" ? patchPreview : minorPreview;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/20 px-4 py-4 backdrop-blur-[2px]">
			<div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10">
				<div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
					<div>
						<h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
							<Clock size={15} className="text-blue-500" />
							历史栈
						</h2>
						<p className="mt-1 text-xs text-slate-400">
							{documentHistory.snapshots.length} 条记录 · 当前 v{currentVersion}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
						aria-label="关闭"
					>
						<X size={16} />
					</button>
				</div>

				<div className="border-b border-slate-100 px-5 py-3">
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={handleSave}
							className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm shadow-blue-600/10 transition-colors hover:bg-blue-700"
						>
							<Bookmark size={13} />
							保存快照
						</button>
						<VersionBumpSelect bump={versionBump} onChange={setVersionBump} />
						<VersionPreview
							currentVersion={currentVersion}
							nextVersion={nextVersionPreview}
						/>
						{!noteInputOpen && (
							<button
								type="button"
								onClick={() => {
									setNoteInputOpen(true);
									requestAnimationFrame(() => saveInputRef.current?.focus());
								}}
								className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 sm:ml-auto"
							>
								<Pencil size={12} />
								备注
							</button>
						)}
					</div>

					{noteInputOpen && (
						<div className="relative mt-2">
							<input
								ref={saveInputRef}
								value={saveLabel}
								onChange={(e) => setSaveLabel(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleSave();
									if (e.key === "Escape") {
										setNoteInputOpen(false);
										setSaveLabel("");
									}
								}}
								placeholder="备注，留空则保存为手动保存"
								className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 pr-9 text-sm text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
							/>
							<button
								type="button"
								onClick={() => {
									setNoteInputOpen(false);
									setSaveLabel("");
								}}
								className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
								aria-label="取消备注"
							>
								<X size={13} />
							</button>
						</div>
					)}
				</div>

				<div className="custom-scrollbar max-h-[calc(100dvh-13rem)] overflow-y-auto px-4 py-3">
					{isEmpty ? (
						<div className="flex flex-col items-center py-14 text-center">
							<FileDiff size={26} className="mb-3 text-slate-300" />
							<p className="text-sm font-medium text-slate-500">
								暂无历史快照
							</p>
							<p className="mt-1 text-xs text-slate-300">
								保存后可以在这里查看每次变更
							</p>
						</div>
					) : (
						<div className="space-y-5">
							{groupedSnapshots.map((group) => (
								<section key={group.label}>
									<div className="mb-2 pl-8">
										<span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
											{group.label}
										</span>
									</div>

									<div className="relative">
										<div className="absolute bottom-2 left-[15px] top-2 w-px bg-slate-200/80" />

										<div className="space-y-2">
											{group.snapshots.map((snapshot, index) => {
												const isFirst = index === 0 && group === groupedSnapshots[0];
												const isConfirming = confirmDeleteId === snapshot.id;
												const isEditing = editingId === snapshot.id;
												const isRestoring = restoringId === snapshot.id;
												const diff = snapshotDiffs.get(snapshot.id);
												const diffOpen = selectedDiffId === snapshot.id;

												if (!diff) return null;

												return (
													<div
														key={snapshot.id}
														className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3"
													>
														<div className="relative z-10 flex justify-center pt-3">
															<span
																className={`h-2.5 w-2.5 rounded-full ring-4 ring-white ${
																	isFirst ? "bg-blue-500" : "bg-slate-300"
																}`}
															/>
														</div>

														<div
															className={`min-w-0 rounded-md px-2 py-2 transition-colors ${
																isRestoring
																	? "bg-blue-50/60"
																	: "hover:bg-slate-50/80"
															}`}
														>
															<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
																<div className="min-w-0">
																	{isEditing ? (
																		<input
																			ref={editInputRef}
																			value={editLabel}
																			onChange={(e) => setEditLabel(e.target.value)}
																			onBlur={() => handleFinishRename(snapshot.id)}
																			onKeyDown={(e) => {
																				if (e.key === "Enter") {
																					handleFinishRename(snapshot.id);
																				}
																				if (e.key === "Escape") setEditingId(null);
																			}}
																			className="h-8 w-full rounded-md border border-blue-200 bg-white px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
																		/>
																	) : (
																		<div className="flex min-w-0 flex-wrap items-center gap-2">
																			<p className="min-w-0 truncate text-sm font-medium text-slate-800">
																				{snapshot.label}
																			</p>
																			<span className="shrink-0 font-mono text-[11px] text-slate-400">
																				v{snapshot.version}
																			</span>
																		</div>
																	)}

																	<div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
																		<span
																			className="text-[11px] text-slate-400"
																			title={formatAbsoluteTime(snapshot.createdAt)}
																		>
																			{formatRelativeTime(snapshot.createdAt)}
																		</span>
																		<span className="text-[11px] text-slate-300">
																			·
																		</span>
																		<span className="text-[11px] text-slate-400">
																			{diff.baseVersion
																				? `较 v${diff.baseVersion}`
																				: "首个快照"}
																		</span>
																		{diff.baseVersion && (
																			<>
																				<span className="text-[11px] text-slate-300">
																					·
																				</span>
																				<span className="min-w-0 truncate text-[11px] text-slate-400">
																					{formatSnapshotDiffSummary(diff)}
																				</span>
																			</>
																		)}
																		<span className="hidden sm:inline-flex">
																			<DiffStats diff={diff} />
																		</span>
																	</div>
																</div>

																<div className="flex shrink-0 flex-wrap items-center gap-1">
																	<button
																		type="button"
																		onClick={() =>
																			setSelectedDiffId(diffOpen ? null : snapshot.id)
																		}
																		className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
																		aria-expanded={diffOpen}
																	>
																		{diffOpen ? (
																			<ChevronDown size={12} />
																		) : (
																			<ChevronRight size={12} />
																		)}
																		Diff
																	</button>
																	<button
																		type="button"
																		onClick={() => handleRestore(snapshot)}
																		disabled={isRestoring}
																		className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
																	>
																		<RefreshCcw size={11} />
																		{isRestoring ? "恢复中" : "恢复"}
																	</button>
																	<button
																		type="button"
																		onClick={() => handleStartRename(snapshot)}
																		className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
																		title="重命名"
																		aria-label="重命名"
																	>
																		<Pencil size={12} />
																	</button>
																	{isConfirming ? (
																		<span className="inline-flex items-center gap-1 rounded-md bg-red-50 p-0.5">
																			<button
																				type="button"
																				onClick={() => handleDelete(snapshot.id)}
																				className="inline-flex h-6 items-center rounded px-1.5 text-[11px] font-semibold text-red-500 transition hover:bg-red-100"
																			>
																				删除
																			</button>
																			<button
																				type="button"
																				onClick={() => setConfirmDeleteId(null)}
																				className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-white hover:text-slate-600"
																				aria-label="取消删除"
																			>
																				<X size={11} />
																			</button>
																		</span>
																	) : (
																		<button
																			type="button"
																			onClick={() => setConfirmDeleteId(snapshot.id)}
																			className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition hover:bg-red-50 hover:text-red-500"
																			title="删除"
																			aria-label="删除"
																		>
																			<Trash2 size={12} />
																		</button>
																	)}
																</div>
															</div>
															{diffOpen && <DiffPanel diff={diff} />}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								</section>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ResumeHistoryModal;
