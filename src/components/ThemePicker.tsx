import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { themeIds, themes } from "../data/themes";
import type { ThemeId } from "../types/theme";

interface ThemePickerProps {
	current: ThemeId;
	onChange: (id: ThemeId) => void;
}

const ThemePicker = ({ current, onChange }: ThemePickerProps) => {
	const [open, setOpen] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	// 点击外部关闭
	useEffect(() => {
		if (!open) return;
		const handleClick = (e: MouseEvent) => {
			if (
				panelRef.current &&
				!panelRef.current.contains(e.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [open]);

	// ESC 关闭
	useEffect(() => {
		if (!open) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [open]);

	const currentTheme = themes[current];

	return (
		<div className="relative">
			{/* 触发按钮 */}
			<button
				ref={buttonRef}
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
				title="切换简历主题"
			>
				<Palette size={16} />
				<span className="hidden sm:inline">{currentTheme.name}</span>
			</button>

			{/* 下拉面板 */}
			{open && (
				<div
					ref={panelRef}
					className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-100 animate-in fade-in slide-in-from-top-1"
					style={{
						animation: "fadeSlideIn 0.15s ease-out",
					}}
				>
					{/* 标题 */}
					<div className="flex items-center gap-2 px-2 pb-3 border-b border-slate-100 mb-3">
						<Palette size={14} className="text-slate-400" />
						<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
							选择主题
						</span>
					</div>

					{/* 主题卡片列表 */}
					<div className="space-y-1.5">
						{themeIds.map((id) => {
							const theme = themes[id];
							const isActive = id === current;
							return (
								<button
									key={id}
									type="button"
									onClick={() => {
										onChange(id);
										setOpen(false);
									}}
									className={`
										w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150
										${
											isActive
												? "bg-slate-100 ring-1 ring-slate-300"
												: "hover:bg-slate-50"
										}
									`}
								>
									{/* 色块预览 */}
									<div className="relative shrink-0 w-9 h-9 rounded-lg overflow-hidden shadow-sm border border-slate-200/60">
										{/* 上半 - 主色 */}
										<div
											className="absolute inset-x-0 top-0 h-1/2"
											style={{ backgroundColor: theme.previewColors[0] }}
										/>
										{/* 下半 - 浅色 */}
										<div
											className="absolute inset-x-0 bottom-0 h-1/2"
											style={{ backgroundColor: theme.previewColors[1] }}
										/>
										{/* 选中勾 */}
										{isActive && (
											<div className="absolute inset-0 flex items-center justify-center bg-black/20">
												<Check size={14} className="text-white drop-shadow" />
											</div>
										)}
									</div>

									{/* 文字 */}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span
												className={`text-sm font-semibold ${isActive ? "text-slate-900" : "text-slate-700"}`}
											>
												{theme.name}
											</span>
											<span className="text-[10px] text-slate-400 font-medium">
												{theme.nameEn}
											</span>
										</div>
										<p className="text-[11px] text-slate-400 leading-snug mt-0.5 truncate">
											{theme.description}
										</p>
									</div>

									{/* 当前指示器 */}
									{isActive && (
										<span className="shrink-0 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
											当前
										</span>
									)}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};

export default ThemePicker;
