import { ChevronDown, Type } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
	DEFAULT_RESUME_FONT_FAMILY,
	RESUME_FONT_FAMILY_OPTIONS,
	type ResumeFontFamily,
} from "../data/resumeStyle";
import {
	useAdaptiveMenuPlacement,
	type AdaptiveMenuPlacement,
} from "./useAdaptiveMenuPlacement";

interface FontFamilyControlProps {
	value: ResumeFontFamily;
	onChange: (value: ResumeFontFamily) => void;
	className?: string;
	menuPlacement?: AdaptiveMenuPlacement;
}

const FontFamilyControl = ({
	value,
	onChange,
	className = "",
	menuPlacement = "bottom",
}: FontFamilyControlProps) => {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const current = RESUME_FONT_FAMILY_OPTIONS.find((opt) => opt.value === value);
	const isDefault = value === DEFAULT_RESUME_FONT_FAMILY;
	const placement = useAdaptiveMenuPlacement(containerRef, {
		open,
		preferred: menuPlacement,
		estimatedHeight: RESUME_FONT_FAMILY_OPTIONS.length * 30 + 8,
	});

	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	return (
		<div
			ref={containerRef}
			className={`relative flex h-8 w-36 items-center gap-1 rounded-lg bg-white/60 px-2 text-xs ring-1 ring-slate-200/60 ${className}`}
			title="选择简历字体"
		>
			<Type size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="flex h-6 min-w-0 flex-1 items-center justify-between gap-1 rounded px-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-100/80 hover:text-slate-800"
				aria-expanded={open}
				aria-label="选择字体"
			>
				<span className={`truncate ${isDefault ? "text-slate-400" : ""}`}>
					{current?.label ?? "默认"}
				</span>
				<ChevronDown size={12} className="shrink-0 text-slate-400" />
			</button>
			{open && (
				<div
					className={`absolute left-0 z-40 min-w-full overflow-hidden rounded-lg border border-slate-200/80 bg-white/95 py-1 shadow-xl shadow-slate-900/10 backdrop-blur ${
						placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
					}`}
				>
					{RESUME_FONT_FAMILY_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => {
								onChange(option.value);
								setOpen(false);
							}}
							className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 ${
								option.value === value
									? "font-semibold text-blue-600"
									: "text-slate-600"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default FontFamilyControl;
