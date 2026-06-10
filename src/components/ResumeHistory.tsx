import {
	Bookmark,
	Check,
	Clock,
	GitCommitHorizontal,
	Pencil,
	RefreshCcw,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ResumeData } from "../types/resume";
import {
	addSnapshot,
	computeNextVersion,
	getLatestSnapshotVersion,
	getSnapshotSummary,
	removeSnapshot,
	renameSnapshot,
	type DocumentHistory,
	type HistorySnapshot,
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
	currentData: ResumeData;
	currentVersion: string;
	onChangeHistory: (history: DocumentHistory) => void;
	onRestore: (data: ResumeData) => void;
	onVersionChange: (version: string) => void;
	onClose: () => void;
}

const VersionBumpSelect = ({
	currentVersion,
	latestSnapshotVersion,
	bump,
	onChange,
	onConfirm,
}: {
	currentVersion: string;
	latestSnapshotVersion: string | undefined;
	bump: VersionBump;
	onChange: (bump: VersionBump) => void;
	onConfirm: () => void;
}) => {
	const patchNext = computeNextVersion(currentVersion, latestSnapshotVersion, "patch");
	const minorNext = computeNextVersion(currentVersion, latestSnapshotVersion, "minor");

	return (
		<div className="flex items-center gap-2">
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
			<span className="font-mono text-xs text-slate-500">
				v{currentVersion}
				<span className="text-slate-300"> → </span>
				<span className="font-semibold text-blue-600">
					v{bump === "patch" ? patchNext : minorNext}
				</span>
			</span>
			<button
				type="button"
				onClick={onConfirm}
				className="ml-auto flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-700"
			>
				<Check size={12} />
				确认保存
			</button>
		</div>
	);
};

const ResumeHistoryModal = ({
	documentHistory,
	currentData,
	currentVersion,
	onChangeHistory,
	onRestore,
	onVersionChange,
	onClose,
}: ResumeHistoryModalProps) => {
	const [restoringId, setRestoringId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editLabel, setEditLabel] = useState("");
	const [saveLabel, setSaveLabel] = useState("");
	const [saveWithLabel, setSaveWithLabel] = useState(false);
	const [versionBump, setVersionBump] = useState<VersionBump>("patch");
	const editInputRef = useRef<HTMLInputElement>(null);
	const saveInputRef = useRef<HTMLInputElement>(null);

	const isEmpty = documentHistory.snapshots.length === 0;
	const latestSnapshotVersion = useMemo(
		() => getLatestSnapshotVersion(documentHistory),
		[documentHistory],
	);

	const groupedSnapshots = useMemo(() => {
		const groups: {
			label: string;
			snapshots: HistorySnapshot[];
		}[] = [];
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today.getTime() - 86400000);
		const weekAgo = new Date(today.getTime() - 7 * 86400000);

		const buckets: { key: string; label: string; items: HistorySnapshot[] }[] =
			[
				{ key: "today", label: "今天", items: [] },
				{ key: "yesterday", label: "昨天", items: [] },
				{ key: "week", label: "最近七天", items: [] },
				{ key: "older", label: "更早", items: [] },
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
		const label = saveWithLabel && saveLabel.trim() ? saveLabel.trim() : "手动保存";
		const nextVersion = computeNextVersion(
			currentVersion,
			latestSnapshotVersion,
			versionBump,
		);
		onChangeHistory(addSnapshot(documentHistory, currentData, label, nextVersion));
		onVersionChange(nextVersion);
		setSaveLabel("");
		setSaveWithLabel(false);
	}, [documentHistory, currentData, currentVersion, latestSnapshotVersion, versionBump, saveLabel, saveWithLabel, onChangeHistory, onVersionChange]);

	const handleRestore = useCallback(
		(snapshot: HistorySnapshot) => {
			if (restoringId) return;
			setRestoringId(snapshot.id);
			requestAnimationFrame(() => {
				onRestore(snapshot.data);
				setRestoringId(null);
				onClose();
			});
		},
		[restoringId, onRestore, onClose],
	);

	const handleDelete = useCallback(
		(snapshotId: string) => {
			onChangeHistory(removeSnapshot(documentHistory, snapshotId));
			setConfirmDeleteId(null);
		},
		[documentHistory, onChangeHistory],
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
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/20 px-4 py-4 backdrop-blur-[2px]">
			<div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15">
				<div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
					<div className="flex items-center gap-3">
						<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 ring-1 ring-blue-100/50">
							<Clock size={18} />
						</span>
						<div>
							<h2 className="text-base font-bold text-slate-900">历史栈道</h2>
							<p className="text-xs text-slate-400">
								{documentHistory.snapshots.length} 个快照 · 当前 v{currentVersion}
							</p>
						</div>
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

				<div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
					{saveWithLabel ? (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<input
									ref={saveInputRef}
									value={saveLabel}
									onChange={(e) => setSaveLabel(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleSave();
										if (e.key === "Escape") {
											setSaveWithLabel(false);
											setSaveLabel("");
										}
									}}
									placeholder="为快照添加备注..."
									className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
								/>
								<button
									type="button"
									onClick={() => {
										setSaveWithLabel(false);
										setSaveLabel("");
									}}
									className="flex h-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
								>
									<X size={14} />
								</button>
							</div>
							<VersionBumpSelect
								currentVersion={currentVersion}
								latestSnapshotVersion={latestSnapshotVersion}
								bump={versionBump}
								onChange={setVersionBump}
								onConfirm={handleSave}
							/>
						</div>
					) : (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleSave}
									className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700"
								>
									<Bookmark size={13} />
									保存快照
								</button>
								<button
									type="button"
									onClick={() => {
										setSaveWithLabel(true);
										requestAnimationFrame(() => saveInputRef.current?.focus());
									}}
									className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
								>
									<Pencil size={13} />
									备注保存
								</button>
							</div>
							<div className="flex items-center gap-2">
								<div className="inline-flex rounded-full bg-slate-100/70 p-0.5 ring-1 ring-slate-200/60">
									<button
										type="button"
										onClick={() => setVersionBump("patch")}
										className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
											versionBump === "patch"
												? "bg-white text-slate-700 shadow-sm shadow-slate-900/5"
												: "text-slate-400 hover:text-slate-600"
										}`}
										aria-pressed={versionBump === "patch"}
									>
										小版本
									</button>
									<button
										type="button"
										onClick={() => setVersionBump("minor")}
										className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
											versionBump === "minor"
												? "bg-white text-slate-700 shadow-sm shadow-slate-900/5"
												: "text-slate-400 hover:text-slate-600"
										}`}
										aria-pressed={versionBump === "minor"}
									>
										大版本
									</button>
								</div>
								<span className="font-mono text-xs text-slate-500">
									v{currentVersion}
									<span className="text-slate-300"> → </span>
									<span className="font-semibold text-blue-600">
										v{nextVersionPreview}
									</span>
								</span>
							</div>
						</div>
					)}
				</div>

				<div className="max-h-[calc(100dvh-16rem)] overflow-y-auto px-5 py-4">
					{isEmpty ? (
						<div className="flex flex-col items-center py-12 text-center">
							<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200/60">
								<GitCommitHorizontal size={24} className="text-slate-300" />
							</div>
							<p className="text-sm font-medium text-slate-400">
								暂无历史快照
							</p>
							<p className="mt-1 text-xs text-slate-300">
								点击「保存快照」记录当前简历状态
							</p>
						</div>
					) : (
						<div className="space-y-6">
							{groupedSnapshots.map((group) => (
								<div key={group.label}>
									<div className="mb-2.5 flex items-center gap-2">
										<span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
											{group.label}
										</span>
										<span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
											{group.snapshots.length}
										</span>
									</div>

									<div className="relative">
										<div className="absolute bottom-0 left-[15px] top-2 w-px bg-gradient-to-b from-slate-200 via-slate-200/60 to-transparent" />

										<div className="space-y-1">
											{group.snapshots.map((snapshot, index) => {
												const isFirst = index === 0 && group === groupedSnapshots[0];
												const isConfirming = confirmDeleteId === snapshot.id;
												const isEditing = editingId === snapshot.id;
												const isRestoring = restoringId === snapshot.id;

												return (
													<div
														key={snapshot.id}
														className={`group relative flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors ${
															isRestoring
																? "bg-blue-50/60"
																: "hover:bg-slate-50/70"
														}`}
													>
														<div className="relative z-10 mt-0.5 flex shrink-0">
															<div
																className={`flex h-[30px] w-[30px] items-center justify-center rounded-full ring-2 ring-white ${
																	isFirst
																		? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20"
																		: "bg-slate-100 text-slate-400"
																}`}
															>
																<GitCommitHorizontal size={14} />
															</div>
														</div>

														<div className="min-w-0 flex-1">
															{isEditing ? (
																<input
																	ref={editInputRef}
																	value={editLabel}
																	onChange={(e) => setEditLabel(e.target.value)}
																	onBlur={() => handleFinishRename(snapshot.id)}
																	onKeyDown={(e) => {
																		if (e.key === "Enter") handleFinishRename(snapshot.id);
																		if (e.key === "Escape") setEditingId(null);
																	}}
																	className="mb-1 w-full rounded border border-blue-200 bg-white px-2 py-0.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
																/>
															) : (
																<div className="flex items-center gap-2">
																	<p className="truncate text-sm font-medium text-slate-700">
																		{snapshot.label}
																	</p>
																	<span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400">
																		v{snapshot.version}
																	</span>
																</div>
															)}

															<div className="mt-0.5 flex items-center gap-2">
																<span
																	className="text-[11px] text-slate-400"
																	title={formatAbsoluteTime(snapshot.createdAt)}
																>
																	{formatRelativeTime(snapshot.createdAt)}
																</span>
																<span className="text-[11px] text-slate-300">
																	·
																</span>
																<span className="truncate text-[11px] text-slate-400">
																	{getSnapshotSummary(snapshot.data)}
																</span>
															</div>

															<div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
																<button
																	type="button"
																	onClick={() => handleRestore(snapshot)}
																	disabled={isRestoring}
																	className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
																>
																	<RefreshCcw size={11} />
																	{isRestoring ? "恢复中..." : "恢复此版本"}
																</button>
																<button
																	type="button"
																	onClick={() => handleStartRename(snapshot)}
																	className="inline-flex h-6 items-center justify-center rounded px-1.5 text-[11px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
																	title="重命名"
																>
																	<Pencil size={11} />
																</button>
																{isConfirming ? (
																	<span className="inline-flex items-center gap-1">
																		<button
																			type="button"
																			onClick={() => handleDelete(snapshot.id)}
																			className="inline-flex h-6 items-center rounded px-1.5 text-[11px] font-medium text-red-500 transition hover:bg-red-50"
																		>
																			确认删除
																		</button>
																		<button
																			type="button"
																			onClick={() => setConfirmDeleteId(null)}
																			className="inline-flex h-6 items-center rounded px-1.5 text-[11px] text-slate-400 transition hover:bg-slate-100"
																		>
																			取消
																		</button>
																	</span>
																) : (
																	<button
																		type="button"
																		onClick={() => setConfirmDeleteId(snapshot.id)}
																		className="inline-flex h-6 items-center justify-center rounded px-1.5 text-[11px] text-slate-300 transition hover:bg-red-50 hover:text-red-500"
																		title="删除"
																	>
																		<Trash2 size={11} />
																	</button>
																)}
															</div>
														</div>

														{isFirst && !isRestoring && (
															<span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-500 ring-1 ring-blue-100/50">
																最新
															</span>
														)}
													</div>
												);
											})}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
					<p className="text-[11px] text-slate-400">
						保存快照时自动递增版本号。小版本 +0.0.1，大版本 +0.1.0。最多保留 {50} 个快照。
					</p>
				</div>
			</div>
		</div>
	);
};

export default ResumeHistoryModal;
