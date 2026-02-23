import {
	Download,
	FileText,
	Monitor,
	Printer,
	RotateCcw,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ResumeEditor from "./components/ResumeEditor";
import ResumePreview from "./components/ResumePreview";
import { initialResumeState } from "./data/initialData";
import type {
	Education,
	ResumeData,
	SectionKey,
	SkillItem,
} from "./types/resume";

const STORAGE_KEY = "resume-data";

const ALL_SECTION_KEYS: SectionKey[] = [
	"skills",
	"experience",
	"projects",
	"education",
	"other",
];

/**
 * 将旧格式的 localStorage 数据迁移为新格式
 * 旧格式：skills 是对象 { core, react, engineering, style }
 * 新格式：skills 是数组 SkillItem[]
 * 旧格式：education 是单个对象 { school, degree, date }
 * 新格式：education 是数组 Education[]
 * 新增：sectionTitles、sectionOrder
 */
function migrateData(raw: Record<string, unknown>): ResumeData {
	const data = raw as Record<string, unknown>;

	// --- 迁移 skills ---
	let skills: SkillItem[];
	if (Array.isArray(data.skills)) {
		skills = data.skills as SkillItem[];
	} else if (data.skills && typeof data.skills === "object") {
		const oldSkills = data.skills as Record<string, string>;
		const labelMap: Record<string, string> = {
			core: "核心能力",
			react: "React 生态",
			engineering: "工程化",
			style: "样式 & 性能",
		};
		skills = Object.entries(oldSkills).map(([key, value], index) => ({
			id: index + 1,
			label: labelMap[key] || key,
			content: value || "",
		}));
	} else {
		skills = initialResumeState.skills;
	}

	// --- 迁移 education ---
	let education: Education[];
	if (Array.isArray(data.education)) {
		education = data.education as Education[];
	} else if (data.education && typeof data.education === "object") {
		const oldEdu = data.education as {
			school?: string;
			degree?: string;
			date?: string;
		};
		education = [
			{
				id: 1,
				school: oldEdu.school || "",
				degree: oldEdu.degree || "",
				date: oldEdu.date || "",
			},
		];
	} else {
		education = initialResumeState.education;
	}

	// --- 迁移 sectionTitles ---
	const defaultTitles = initialResumeState.sectionTitles;
	let sectionTitles = defaultTitles;
	if (data.sectionTitles && typeof data.sectionTitles === "object") {
		const rawTitles = data.sectionTitles as Record<string, string>;
		sectionTitles = {
			skills: rawTitles.skills || defaultTitles.skills,
			experience: rawTitles.experience || defaultTitles.experience,
			projects: rawTitles.projects || defaultTitles.projects,
			education: rawTitles.education || defaultTitles.education,
			other: rawTitles.other || defaultTitles.other,
		};
	}

	// --- personal: 确保所有字段存在 ---
	const defaultPersonal = initialResumeState.personal;
	const rawPersonal = (data.personal || {}) as Record<string, string>;
	const personal = {
		name: rawPersonal.name ?? defaultPersonal.name,
		title: rawPersonal.title ?? defaultPersonal.title,
		phone: rawPersonal.phone ?? defaultPersonal.phone,
		email: rawPersonal.email ?? defaultPersonal.email,
		location: rawPersonal.location ?? defaultPersonal.location,
		github: rawPersonal.github ?? defaultPersonal.github,
		website: rawPersonal.website ?? defaultPersonal.website,
	};

	// --- experience & projects ---
	const experience = Array.isArray(data.experience)
		? (data.experience as ResumeData["experience"])
		: initialResumeState.experience;

	const projects = Array.isArray(data.projects)
		? (data.projects as ResumeData["projects"])
		: initialResumeState.projects;

	// --- other ---
	const other =
		typeof data.other === "string" ? data.other : initialResumeState.other;

	// --- sectionOrder: 验证并补全缺失的 key ---
	let sectionOrder: SectionKey[];
	if (Array.isArray(data.sectionOrder)) {
		const valid = (data.sectionOrder as unknown[]).filter(
			(k): k is SectionKey => ALL_SECTION_KEYS.includes(k as SectionKey),
		);
		const missing = ALL_SECTION_KEYS.filter((k) => !valid.includes(k));
		sectionOrder = [...valid, ...missing];
	} else {
		sectionOrder = initialResumeState.sectionOrder;
	}

	return {
		personal,
		sectionTitles,
		sectionOrder,
		skills,
		experience,
		projects,
		education,
		other,
	};
}

function App() {
	const importInputRef = useRef<HTMLInputElement>(null);
	const [importError, setImportError] = useState<string | null>(null);

	const [resumeData, setResumeData] = useState<ResumeData>(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				return migrateData(parsed);
			} catch (e) {
				console.error("Failed to parse resume data", e);
			}
		}
		return initialResumeState;
	});

	// 自动保存：数据变化时写入 localStorage
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
	}, [resumeData]);

	// 清除导入错误提示
	useEffect(() => {
		if (!importError) return;
		const timer = setTimeout(() => setImportError(null), 4000);
		return () => clearTimeout(timer);
	}, [importError]);

	const handleReset = () => {
		if (window.confirm("确定要重置所有数据到默认模版吗？")) {
			setResumeData(initialResumeState);
		}
	};

	const handlePrint = useCallback(() => {
		const name = resumeData.personal.name.trim() || "简历";
		const originalTitle = document.title;
		document.title = `${name} - iResume 简历`;

		const restore = () => {
			document.title = originalTitle;
			window.removeEventListener("afterprint", restore);
		};
		window.addEventListener("afterprint", restore);

		window.print();
	}, [resumeData.personal.name]);

	// --- 导出 JSON ---
	const handleExport = () => {
		const json = JSON.stringify(resumeData, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		// 用姓名 + 时间戳命名，方便管理多份简历
		const name = resumeData.personal.name.trim() || "resume";
		const ts = new Date()
			.toISOString()
			.slice(0, 16)
			.replace("T", "_")
			.replace(":", "-");
		const filename = `${name}_${ts}.json`;

		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	// --- 导入 JSON（点击隐藏 input）---
	const handleImportClick = () => {
		setImportError(null);
		importInputRef.current?.click();
	};

	const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		// 重置 input，保证同一文件可以再次选择
		e.target.value = "";
		if (!file) return;

		if (!file.name.endsWith(".json")) {
			setImportError("请选择 .json 文件");
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const parsed = JSON.parse(ev.target?.result as string);
				const migrated = migrateData(parsed);
				setResumeData(migrated);
			} catch {
				setImportError("文件解析失败，请确认是有效的简历 JSON 文件");
			}
		};
		reader.readAsText(file);
	};

	return (
		<div className="min-h-screen bg-slate-100 font-sans text-slate-900">
			{/* ===== 移动端引导页（md 以下显示，md 以上隐藏） ===== */}
			<div className="md:hidden print:hidden flex flex-col items-center justify-center min-h-screen bg-white px-8 py-12 text-center">
				{/* Logo */}
				<div className="flex items-center gap-2 mb-8">
					<span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-2xl font-black tracking-tight leading-none">
						i
					</span>
					<span className="text-2xl font-bold text-slate-900">Resume</span>
				</div>

				{/* 图标 */}
				<div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
					<Monitor size={40} className="text-blue-600" />
				</div>

				{/* 标题 & 说明 */}
				<h1 className="text-xl font-bold text-slate-900 mb-2">
					请在电脑端使用
				</h1>
				<p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-xs">
					iResume 是一款专业的 PDF
					简历生成器，需要在桌面浏览器中使用以获得最佳体验。
				</p>

				{/* 功能亮点 */}
				<div className="w-full max-w-xs space-y-2 mb-10 text-left">
					{[
						"实时预览 A4 简历版面",
						"自由编辑区块内容与顺序",
						"一键导出高质量 PDF",
						"JSON 备份，数据不丢失",
					].map((feat) => (
						<div
							key={feat}
							className="flex items-center gap-2.5 text-sm text-slate-600"
						>
							<div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
							{feat}
						</div>
					))}
				</div>

				{/* 复制链接提示 */}
				<div className="w-full max-w-xs bg-slate-50 border border-slate-200 rounded-xl p-4">
					<div className="flex items-center gap-2 mb-2">
						<FileText size={14} className="text-slate-400" />
						<span className="text-xs font-medium text-slate-500">
							在电脑浏览器中打开
						</span>
					</div>
					<p className="text-xs text-slate-400 break-all select-all font-mono">
						{window.location.href}
					</p>
				</div>
			</div>

			{/* ===== 桌面端完整应用（md 以上显示） ===== */}
			<div className="hidden md:block print:block">
				{/* 顶部导航栏 - 打印时隐藏 */}
				<nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center line print:hidden shadow-sm">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2 font-bold text-xl">
							<span className="inline-flex items-center justify-center bg-blue-600 text-white px-2 py-1 rounded text-sm font-black leading-none tracking-tight">
								i
							</span>
							<span className="leading-none">Resume</span>
						</div>

						<a
							href="https://github.com/dogxii/iResume"
							target="_blank"
							rel="noreferrer"
							className="hidden lg:flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
							</svg>
						</a>
					</div>

					<div className="flex items-center gap-2">
						{/* 导入错误提示 */}
						{importError && (
							<span className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md">
								{importError}
							</span>
						)}

						<button
							type="button"
							onClick={handleReset}
							className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
							title="重置为默认模版"
						>
							<RotateCcw size={16} />
							<span className="hidden sm:inline">重置</span>
						</button>

						{/* 分隔线 */}
						<div className="w-px h-5 bg-slate-200" />

						<button
							type="button"
							onClick={handleImportClick}
							className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
							title="从 JSON 文件导入简历数据"
						>
							<Upload size={16} />
							<span className="hidden sm:inline">导入</span>
						</button>

						<button
							type="button"
							onClick={handleExport}
							className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
							title="导出当前简历数据为 JSON 文件"
						>
							<Download size={16} />
							<span className="hidden sm:inline">导出</span>
						</button>

						{/* 分隔线 */}
						<div className="w-px h-5 bg-slate-200" />

						<button
							type="button"
							onClick={handlePrint}
							className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
						>
							<Printer size={16} />
							<span>保存 PDF</span>
						</button>
					</div>
				</nav>

				{/* 隐藏的文件选择 input */}
				<input
					ref={importInputRef}
					type="file"
					accept=".json,application/json"
					className="hidden print:hidden"
					onChange={handleImportFile}
				/>

				<main className="max-w-[1600px] mx-auto flex flex-col md:flex-row h-[calc(100vh-60px)] print:h-auto print:max-w-none print:block">
					{/* 左侧：编辑器 (可滚动) - 打印时隐藏 */}
					<div className="w-full md:w-[400px] lg:w-[450px] bg-white border-r border-slate-200 overflow-y-auto print:hidden h-full custom-scrollbar">
						<ResumeEditor data={resumeData} onChange={setResumeData} />
					</div>

					{/* 右侧：预览区域 (灰色背景) */}
					<div className="flex-1 bg-slate-100 overflow-y-auto p-8 flex justify-center print:p-0 print:bg-white print:overflow-visible print:h-auto h-full">
						{/* A4 纸张容器 */}
						<div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:w-full print:min-h-0">
							<ResumePreview data={resumeData} />
						</div>
					</div>
				</main>
			</div>
			{/* end desktop wrapper */}
		</div>
	);
}

export default App;
