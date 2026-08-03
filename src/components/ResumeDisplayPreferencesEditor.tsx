import {
	BriefcaseBusiness,
	Calendar,
	ChevronDown,
	Code2,
	FolderGit2,
	GraduationCap,
	Image,
	Award,
	Link2,
	List,
	Maximize2,
	MoveHorizontal,
	School,
	Tags,
	UserRound,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type {
	OtherListStyle,
	ProjectLinksPosition,
	ProjectTagPosition,
	ResumeLinkStyle,
	ResumePhotoPosition,
	ResumePhotoSizeRatio,
	ResumeSectionPreferences,
	SectionDatePosition,
	SectionEntryDisplayStyle,
	SkillContentStyle,
} from "../data/resumeStyle";
import type { SectionKey, SectionTitles } from "../types/resume";
import ToggleSwitch from "./ToggleSwitch";

interface ResumeDisplayPreferencesEditorProps {
	sectionOrder: SectionKey[];
	sectionTitles: SectionTitles;
	preferences: ResumeSectionPreferences;
	onChange: (preferences: ResumeSectionPreferences) => void;
}

interface SegmentedOption<T extends string | number> {
	value: T;
	label: string;
}

const sectionFallbackNames: Record<SectionKey, string> = {
	skills: "专业技能",
	experience: "工作经历",
	projects: "项目经历",
	education: "教育背景",
	awards: "获奖经历",
	campus: "校园经历",
	other: "其他",
};

const sectionIconNodes: Record<SectionKey, ReactNode> = {
	skills: <Code2 size={14} />,
	experience: <BriefcaseBusiness size={14} />,
	projects: <FolderGit2 size={14} />,
	education: <GraduationCap size={14} />,
	awards: <Award size={14} />,
	campus: <School size={14} />,
	other: <List size={14} />,
};

const datePositionOptions: SegmentedOption<SectionDatePosition>[] = [
	{ value: "right", label: "右侧" },
	{ value: "below", label: "下方" },
];

const skillContentOptions: SegmentedOption<SkillContentStyle>[] = [
	{ value: "theme", label: "跟随" },
	{ value: "text", label: "文本" },
	{ value: "chips", label: "轻标签" },
];

const projectLinksOptions: SegmentedOption<ProjectLinksPosition>[] = [
	{ value: "title", label: "标题右侧" },
	{ value: "below", label: "标题下方" },
];

const projectTagOptions: SegmentedOption<ProjectTagPosition>[] = [
	{ value: "title", label: "标题右侧" },
	{ value: "below", label: "标题下方" },
];

const otherListOptions: SegmentedOption<OtherListStyle>[] = [
	{ value: "bullets", label: "项目符号" },
	{ value: "plain", label: "纯文本" },
];

const sectionEntryDisplayOptions: SegmentedOption<SectionEntryDisplayStyle>[] = [
	{ value: "list", label: "列表" },
	{ value: "detail", label: "详情" },
];

const photoPositionOptions: SegmentedOption<ResumePhotoPosition>[] = [
	{ value: "right", label: "右侧" },
	{ value: "left", label: "左侧" },
];

const photoSizeRatioOptions: SegmentedOption<ResumePhotoSizeRatio>[] = [
	{ value: 0.85, label: "85%" },
	{ value: 1, label: "100%" },
	{ value: 1.15, label: "115%" },
];

const linkStyleOptions: SegmentedOption<ResumeLinkStyle>[] = [
	{ value: "text", label: "文本" },
	{ value: "highlighted", label: "标识" },
	{ value: "blue", label: "蓝色" },
];

const SegmentedControl = <T extends string | number>({
	label,
	value,
	options,
	onChange,
	icon,
	disabled = false,
}: {
	label: string;
	value: T;
	options: SegmentedOption<T>[];
	onChange: (value: T) => void;
	icon?: ReactNode;
	disabled?: boolean;
}) => (
	<div
		className={`flex items-center justify-between gap-2 ${
			disabled ? "opacity-40" : ""
		}`}
	>
		<span className="flex items-center gap-1.5 text-xs text-slate-500">
			{icon && <span className="text-slate-300">{icon}</span>}
			{label}
		</span>
		<div className="inline-flex rounded-full bg-slate-100/70 p-0.5 ring-1 ring-slate-200/60">
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					disabled={disabled}
					onClick={() => onChange(option.value)}
					className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed ${
						option.value === value
							? "bg-white text-slate-700 shadow-sm shadow-slate-900/5"
							: "text-slate-400 hover:text-slate-600"
					}`}
					aria-pressed={option.value === value}
				>
					{option.label}
				</button>
			))}
		</div>
	</div>
);

const ToggleControl = ({
	label,
	checked,
	onChange,
	icon,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	icon?: ReactNode;
}) => (
	<label className="flex items-center justify-between gap-2">
		<span className="flex items-center gap-1.5 text-xs text-slate-500">
			{icon && <span className="text-slate-300">{icon}</span>}
			{label}
		</span>
		<ToggleSwitch checked={checked} label={label} onChange={onChange} />
	</label>
);

const PreferenceBlock = ({
	title,
	icon,
	expanded,
	onToggle,
	children,
}: {
	title: string;
	icon: ReactNode;
	expanded: boolean;
	onToggle: () => void;
	children: ReactNode;
}) => (
	<div className="border-t border-slate-100 first:border-t-0">
		<button
			type="button"
			onClick={onToggle}
			className="flex w-full items-center gap-2 rounded-md py-2.5 text-left transition-colors hover:bg-slate-50/70"
			aria-expanded={expanded}
		>
			<span className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-slate-400">
				{icon}
			</span>
			<span className="min-w-0 truncate text-xs font-semibold text-slate-600">
				{title}
			</span>
			<ChevronDown
				size={14}
				className={`ml-auto mr-1 text-slate-300 transition-transform ${
					expanded ? "rotate-180" : ""
				}`}
			/>
		</button>
		{expanded && <div className="space-y-2 pb-3 pl-9 pr-1">{children}</div>}
	</div>
);

const ResumeDisplayPreferencesEditor = ({
	sectionOrder,
	sectionTitles,
	preferences,
	onChange,
}: ResumeDisplayPreferencesEditorProps) => {
	const [personalExpanded, setPersonalExpanded] = useState(false);
	const [expandedSections, setExpandedSections] = useState<
		Partial<Record<SectionKey, boolean>>
	>({});
	const updatePersonal = (
		patch: Partial<ResumeSectionPreferences["personal"]>,
	) => {
		onChange({
			...preferences,
			personal: {
				...preferences.personal,
				...patch,
			},
		});
	};

	const updateSection = <K extends keyof ResumeSectionPreferences>(
		key: K,
		patch: Partial<ResumeSectionPreferences[K]>,
	) => {
		onChange({
			...preferences,
			[key]: {
				...preferences[key],
				...patch,
			},
		});
	};

	const getSectionTitle = (key: SectionKey) =>
		sectionTitles[key] || sectionFallbackNames[key];

	const toggleSection = (key: SectionKey) => {
		setExpandedSections((current) => ({
			...current,
			[key]: !current[key],
		}));
	};

	const renderSectionPreferences = (key: SectionKey) => {
		const expanded = Boolean(expandedSections[key]);
		switch (key) {
			case "skills":
				return (
					<PreferenceBlock
						key={key}
						title={getSectionTitle(key)}
						icon={sectionIconNodes[key]}
						expanded={expanded}
						onToggle={() => toggleSection(key)}
					>
						<ToggleControl
							label="分类名"
							checked={preferences.skills.showLabels}
							onChange={(showLabels) =>
								updateSection("skills", { showLabels })
							}
						/>
						<SegmentedControl
							label="内容"
							value={preferences.skills.contentStyle}
							options={skillContentOptions}
							onChange={(contentStyle) =>
								updateSection("skills", { contentStyle })
							}
							icon={<Tags size={12} />}
						/>
					</PreferenceBlock>
				);
			case "experience":
				return (
					<PreferenceBlock
						key={key}
						title={getSectionTitle(key)}
						icon={sectionIconNodes[key]}
						expanded={expanded}
						onToggle={() => toggleSection(key)}
					>
						<ToggleControl
							label="时间"
							checked={preferences.experience.showDates}
							onChange={(showDates) =>
								updateSection("experience", { showDates })
							}
							icon={<Calendar size={12} />}
						/>
						<SegmentedControl
							label="时间位置"
							value={preferences.experience.datePosition}
							options={datePositionOptions}
							onChange={(datePosition) =>
								updateSection("experience", { datePosition })
							}
							disabled={!preferences.experience.showDates}
						/>
						<ToggleControl
							label="职位"
							checked={preferences.experience.showRole}
							onChange={(showRole) =>
								updateSection("experience", { showRole })
							}
						/>
					</PreferenceBlock>
				);
			case "projects":
				return (
					<PreferenceBlock
						key={key}
						title={getSectionTitle(key)}
						icon={sectionIconNodes[key]}
						expanded={expanded}
						onToggle={() => toggleSection(key)}
					>
						<ToggleControl
							label="时间"
							checked={preferences.projects.showDates}
							onChange={(showDates) =>
								updateSection("projects", { showDates })
							}
							icon={<Calendar size={12} />}
						/>
						<SegmentedControl
							label="时间位置"
							value={preferences.projects.datePosition}
							options={datePositionOptions}
							onChange={(datePosition) =>
								updateSection("projects", { datePosition })
							}
							disabled={!preferences.projects.showDates}
						/>
						<ToggleControl
							label="标签"
							checked={preferences.projects.showTags}
							onChange={(showTags) =>
								updateSection("projects", { showTags })
							}
							icon={<Tags size={12} />}
						/>
						<SegmentedControl
							label="标签位置"
							value={preferences.projects.tagPosition}
							options={projectTagOptions}
							onChange={(tagPosition) =>
								updateSection("projects", { tagPosition })
							}
							icon={<Tags size={12} />}
							disabled={!preferences.projects.showTags}
						/>
						<SegmentedControl
							label="Demo / Code"
							value={preferences.projects.linksPosition}
							options={projectLinksOptions}
							onChange={(linksPosition) =>
								updateSection("projects", { linksPosition })
							}
							icon={<Link2 size={12} />}
						/>
					</PreferenceBlock>
				);
			case "education":
				return (
					<PreferenceBlock
						key={key}
						title={getSectionTitle(key)}
						icon={sectionIconNodes[key]}
						expanded={expanded}
						onToggle={() => toggleSection(key)}
					>
						<ToggleControl
							label="时间"
							checked={preferences.education.showDates}
							onChange={(showDates) =>
								updateSection("education", { showDates })
							}
							icon={<Calendar size={12} />}
						/>
					</PreferenceBlock>
				);
			case "awards":
			case "campus":
				return (
					<PreferenceBlock
						key={key}
						title={getSectionTitle(key)}
						icon={sectionIconNodes[key]}
						expanded={expanded}
						onToggle={() => toggleSection(key)}
					>
						<SegmentedControl
							label="样式"
							value={preferences[key].displayStyle}
							options={sectionEntryDisplayOptions}
							onChange={(displayStyle) =>
								updateSection(key, { displayStyle })
							}
							icon={<List size={12} />}
						/>
					</PreferenceBlock>
				);
			case "other":
				return (
					<PreferenceBlock
						key={key}
						title={getSectionTitle(key)}
						icon={sectionIconNodes[key]}
						expanded={expanded}
						onToggle={() => toggleSection(key)}
					>
						<SegmentedControl
							label="列表"
							value={preferences.other.listStyle}
							options={otherListOptions}
							onChange={(listStyle) => updateSection("other", { listStyle })}
							icon={<List size={12} />}
						/>
					</PreferenceBlock>
				);
		}
	};

	const renderPersonalPreferences = () => (
		<PreferenceBlock
			title="个人信息"
			icon={<UserRound size={14} />}
			expanded={personalExpanded}
			onToggle={() => setPersonalExpanded((expanded) => !expanded)}
		>
			<ToggleControl
				label="头像"
				checked={preferences.personal.showPhoto}
				onChange={(showPhoto) => updatePersonal({ showPhoto })}
				icon={<Image size={12} />}
			/>
			<SegmentedControl
				label="位置"
				value={preferences.personal.photoPosition}
				options={photoPositionOptions}
				onChange={(photoPosition) => updatePersonal({ photoPosition })}
				icon={<MoveHorizontal size={12} />}
				disabled={!preferences.personal.showPhoto}
			/>
			<SegmentedControl
				label="大小"
				value={preferences.personal.photoSizeRatio}
				options={photoSizeRatioOptions}
				onChange={(photoSizeRatio) => updatePersonal({ photoSizeRatio })}
				icon={<Maximize2 size={12} />}
				disabled={!preferences.personal.showPhoto}
			/>
			<SegmentedControl
				label="链接样式"
				value={preferences.personal.linkStyle}
				options={linkStyleOptions}
				onChange={(linkStyle) => updatePersonal({ linkStyle })}
				icon={<Link2 size={12} />}
			/>
			<ToggleControl
				label="显示名称"
				checked={preferences.personal.showLinkLabels}
				onChange={(showLinkLabels) => updatePersonal({ showLinkLabels })}
				icon={<Tags size={12} />}
			/>
		</PreferenceBlock>
	);

	return (
		<section
			className="border-b border-slate-200 p-4 last:border-b-0"
			data-testid="display-preferences-editor"
		>
			<div className="mb-1 flex items-center justify-between gap-2">
				<h2 className="text-sm font-bold text-slate-800">显示偏好</h2>
				<span className="text-[11px] text-slate-400">头像、链接与区块</span>
			</div>
			<div>
				{renderPersonalPreferences()}
				{sectionOrder.map(renderSectionPreferences)}
			</div>
		</section>
	);
};

export default ResumeDisplayPreferencesEditor;
