import { Check, LayoutTemplate, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { templateIds } from "../data/templateConfigs";
import { resumeTemplates } from "../templates/registry";
import type { TemplateId } from "../types/template";

interface TemplatePickerProps {
	current: TemplateId;
	favoriteTemplateIds: TemplateId[];
	onChange: (id: TemplateId) => void;
	onToggleFavorite: (id: TemplateId) => void;
}

const TemplatePicker = ({
	current,
	favoriteTemplateIds,
	onChange,
	onToggleFavorite,
}: TemplatePickerProps) => {
	const [open, setOpen] = useState(false);

	// ESC 关闭
	useEffect(() => {
		if (!open) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [open]);

	const currentTemplate = resumeTemplates[current].config;
	const orderedTemplateIds = useMemo(() => {
		const favoriteSet = new Set(favoriteTemplateIds);
		return [
			...favoriteTemplateIds,
			...templateIds.filter((id) => !favoriteSet.has(id)),
		];
	}, [favoriteTemplateIds]);

	return (
		<>
			{/* 触发按钮 */}
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					className="flex h-8 w-fit justify-self-start items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100/80"
					title="切换简历布局"
				>
				<LayoutTemplate size={14} className="text-slate-400" />
				<span className="hidden sm:inline">{currentTemplate.name}</span>
			</button>

			{open &&
				createPortal(
					<div
						className="fixed inset-0 z-[80] bg-slate-900/10 px-3 py-12 backdrop-blur-[1px]"
						onMouseDown={() => setOpen(false)}
					>
						<div
							className="mx-auto flex max-h-[min(680px,calc(100vh-6rem))] w-full max-w-[520px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/15"
							style={{ animation: "fadeSlideIn 0.15s ease-out" }}
							onMouseDown={(event) => event.stopPropagation()}
						>
							<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
								<div className="flex items-center gap-2">
									<LayoutTemplate size={15} className="text-slate-400" />
									<span className="text-sm font-bold text-slate-800">
										选择布局
									</span>
								</div>
								<span className="text-xs text-slate-400">
									{orderedTemplateIds.length} 个
								</span>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
								<div className="grid gap-2 sm:grid-cols-2">
									{orderedTemplateIds.map((id) => {
										const template = resumeTemplates[id].config;
										const isActive = id === current;
										const isFavorite = favoriteTemplateIds.includes(id);
										return (
											<div
												key={id}
												className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${
													isActive
														? "border-blue-200 bg-blue-50/70"
														: "border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50"
												}`}
											>
												<button
													type="button"
													onClick={() => {
														onChange(id);
														setOpen(false);
													}}
													className="flex min-w-0 flex-1 items-center gap-3 text-left"
												>
													<div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/70 bg-slate-50 text-slate-400 shadow-sm">
														<LayoutTemplate size={17} />
														{isActive && (
															<div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white ring-2 ring-white">
																<Check
																	size={10}
																/>
															</div>
														)}
													</div>

													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2">
															<span className="truncate text-sm font-semibold text-slate-800">
																{template.name}
															</span>
															{isActive && (
																<span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
																	当前
																</span>
															)}
														</div>
														<p className="mt-0.5 truncate text-[11px] leading-snug text-slate-400">
															{template.nameEn} · {template.description}
														</p>
													</div>
												</button>

												<button
													type="button"
													onClick={() => onToggleFavorite(id)}
													className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
														isFavorite
															? "text-amber-500 hover:bg-amber-50"
															: "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
													}`}
												title={isFavorite ? "取消收藏布局" : "收藏布局"}
												aria-label={isFavorite ? "取消收藏布局" : "收藏布局"}
												>
													<Star
														size={15}
														fill={isFavorite ? "currentColor" : "none"}
													/>
												</button>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
};

export default TemplatePicker;
