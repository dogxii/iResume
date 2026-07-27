import {
	ArrowDown,
	ArrowUp,
	Award,
	BriefcaseBusiness,
	Eye,
	EyeOff,
	FileText,
	FolderGit2,
	GraduationCap,
	GripVertical,
	ImagePlus,
	Plus,
	School,
	Trash2,
	Upload,
	Wrench,
} from "lucide-react";
import {
	useEffect,
	useId,
	useRef,
	useState,
	type ChangeEvent,
	type ReactNode,
} from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DraggableAttributes,
	type DraggableSyntheticListeners,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createResumeItemId } from "../data/resumeData";
import ToggleSwitch from "./ToggleSwitch";
import {
	RESUME_PHOTO_MAX_EDGE_PX,
	RESUME_PHOTO_MAX_FILE_SIZE_BYTES,
	isEmbeddedResumePhotoUrl,
	normalizeResumePhotoSrc,
	resumePhotoFileTypePattern,
} from "../utils/resumePhoto";
import type {
	Education,
	Experience,
	Project,
	ResumeData,
	SectionEntry,
	SectionKey,
	SectionIconVisibility,
	SkillItem,
} from "../types/resume";

export type ResumeEditorPanel = "structure" | "details";

interface InputGroupProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: "text" | "textarea";
	placeholder?: string;
	rows?: number;
}

const inputClass =
	"w-full rounded-md border border-slate-200 bg-white p-2 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500";

const readFileAsCompressedPhoto = (file: File) =>
	new Promise<string>((resolve, reject) => {
		if (!resumePhotoFileTypePattern.test(file.type)) {
			reject(new Error("仅支持 JPG、PNG、WebP 图片"));
			return;
		}

		if (file.size > RESUME_PHOTO_MAX_FILE_SIZE_BYTES) {
			reject(new Error("图片不能超过 5MB"));
			return;
		}

		const reader = new FileReader();
		reader.onerror = () => reject(new Error("无法读取图片"));
		reader.onload = () => {
			const image = new Image();
			image.onerror = () => reject(new Error("无法解析图片"));
			image.onload = () => {
				const sourceWidth = image.naturalWidth;
				const sourceHeight = image.naturalHeight;
				if (!sourceWidth || !sourceHeight) {
					reject(new Error("无法解析图片尺寸"));
					return;
				}

				const scale = Math.min(
					1,
					RESUME_PHOTO_MAX_EDGE_PX / sourceWidth,
					RESUME_PHOTO_MAX_EDGE_PX / sourceHeight,
				);
				const width = Math.max(1, Math.round(sourceWidth * scale));
				const height = Math.max(1, Math.round(sourceHeight * scale));
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext("2d");

				if (!context) {
					reject(new Error("无法处理图片"));
					return;
				}

				context.fillStyle = "#ffffff";
				context.fillRect(0, 0, width, height);
				context.drawImage(image, 0, 0, width, height);
				resolve(canvas.toDataURL("image/jpeg", 0.88));
			};
			image.src = String(reader.result ?? "");
		};
		reader.readAsDataURL(file);
	});

const InputGroup = ({
	label,
	value,
	onChange,
	type = "text",
	placeholder = "",
	rows = 4,
}: InputGroupProps) => {
	const id = useId();
	return (
		<div className="mb-3">
			<label
				htmlFor={id}
				className="mb-1 block text-xs font-medium text-slate-500"
			>
				{label}
			</label>
			{type === "textarea" ? (
				<textarea
					id={id}
					className={`${inputClass} resize-y`}
					rows={rows}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
				/>
			) : (
				<input
					id={id}
					type="text"
					className={inputClass}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
				/>
			)}
		</div>
	);
};

interface ResumeEditorProps {
	data: ResumeData;
	sectionIcons: SectionIconVisibility;
	panel: ResumeEditorPanel;
	activeSection: SectionKey;
	onActiveSectionChange: (section: SectionKey) => void;
	onChange: (data: ResumeData) => void;
	onSectionIconsChange: (sectionIcons: SectionIconVisibility) => void;
}

interface ItemActionsProps {
	index: number;
	total: number;
	onMove: (direction: "up" | "down") => void;
	onRemove: () => void;
	removeConfirmMessage?: string;
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
	skills: <Wrench size={15} />,
	experience: <BriefcaseBusiness size={15} />,
	projects: <FolderGit2 size={15} />,
	education: <GraduationCap size={15} />,
	awards: <Award size={15} />,
	campus: <School size={15} />,
	other: <FileText size={15} />,
};

const panelBlockClass = "border-b border-slate-200 p-4 last:border-b-0";
type SectionEntryTextKey = keyof Omit<SectionEntry, "id">;

const SortableItemWithHandle = ({
	id,
	children,
}: {
	id: string | number;
	children: (dragHandleProps: {
		activatorRef: (node: HTMLElement | null) => void;
		attributes: DraggableAttributes;
		listeners: DraggableSyntheticListeners | undefined;
	}) => ReactNode;
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
		setActivatorNodeRef,
	} = useSortable({ id });
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : undefined,
		zIndex: isDragging ? 50 : undefined,
	};
	return (
		<div ref={setNodeRef} style={style}>
			{children({
				activatorRef: setActivatorNodeRef,
				attributes,
				listeners,
			})}
		</div>
	);
};

const DragHandle = ({
	activatorRef,
	attributes,
	listeners,
}: {
	activatorRef: (node: HTMLElement | null) => void;
	attributes: DraggableAttributes;
	listeners: DraggableSyntheticListeners | undefined;
}) => (
	<button
		type="button"
		ref={activatorRef}
		{...attributes}
		{...listeners}
		className="hidden h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing sm:flex"
		title="拖拽排序"
		aria-label="拖拽排序"
	>
		<GripVertical size={14} />
	</button>
);

const ItemActions = ({
	index,
	total,
	onMove,
	onRemove,
	removeConfirmMessage = "确定要删除这条内容吗？",
}: ItemActionsProps) => (
	<div className="flex gap-0.5">
		<button
			type="button"
			onClick={() => onMove("up")}
			disabled={index === 0}
			className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-25"
			title="上移"
			aria-label="上移"
		>
			<ArrowUp size={14} />
		</button>
		<button
			type="button"
			onClick={() => onMove("down")}
			disabled={index === total - 1}
			className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-25"
			title="下移"
			aria-label="下移"
		>
			<ArrowDown size={14} />
		</button>
		<button
			type="button"
			onClick={() => {
				if (window.confirm(removeConfirmMessage)) onRemove();
			}}
			className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
			title="删除"
			aria-label="删除"
		>
			<Trash2 size={14} />
		</button>
	</div>
);

const PanelBlock = ({
	title,
	action,
	children,
}: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) => (
	<section className={panelBlockClass}>
		<div className="mb-3 flex items-center justify-between gap-2">
			<h2 className="text-sm font-bold text-slate-800">{title}</h2>
			{action}
		</div>
		{children}
	</section>
);

const EmptyState = ({
	text,
	action,
}: {
	text: string;
	action?: ReactNode;
}) => (
	<div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-3 py-6 text-center">
		<p className="text-xs text-slate-400">{text}</p>
		{action && <div className="mt-3 flex justify-center">{action}</div>}
	</div>
);

const AddButton = ({
	title,
	onClick,
}: {
	title: string;
	onClick: () => void;
}) => (
	<button
		type="button"
		onClick={onClick}
		className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
		title={title}
		aria-label={title}
	>
		<Plus size={16} />
	</button>
);

const PhotoField = ({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) => {
	const id = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState("");
	const trimmedValue = value.trim();
	const photoSrc = normalizeResumePhotoSrc(trimmedValue);
	const usesEmbeddedPhoto = isEmbeddedResumePhotoUrl(trimmedValue);

	const handlePhotoFileChange = async (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		event.currentTarget.value = "";
		if (!file) return;

		setError("");
		try {
			onChange(await readFileAsCompressedPhoto(file));
		} catch (uploadError) {
			setError(uploadError instanceof Error ? uploadError.message : "照片导入失败");
		}
	};

	return (
		<div className="mb-3 rounded-md border border-slate-200 bg-slate-50/70 p-3">
			<div className="flex items-start gap-3">
				<div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-slate-300">
					{photoSrc ? (
						<img
							src={photoSrc}
							alt="简历照片预览"
							className="h-full w-full object-cover"
						/>
					) : (
						<ImagePlus size={22} />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="mb-2 flex items-center justify-between gap-2">
						<label
							htmlFor={id}
							className="text-xs font-medium text-slate-500"
						>
							照片
						</label>
						<div className="flex shrink-0 gap-1">
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
								title="上传照片"
								aria-label="上传照片"
							>
								<Upload size={14} />
							</button>
							{trimmedValue && (
								<button
									type="button"
									onClick={() => {
										setError("");
										onChange("");
									}}
									className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
									title="移除照片"
									aria-label="移除照片"
								>
									<Trash2 size={14} />
								</button>
							)}
						</div>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						className="hidden"
						onChange={handlePhotoFileChange}
					/>
					<input
						id={id}
						type="url"
						className={inputClass}
						value={usesEmbeddedPhoto ? "" : value}
						onChange={(event) => {
							setError("");
							onChange(event.target.value);
						}}
						placeholder={
							usesEmbeddedPhoto
								? "已上传本地照片"
								: "https://example.com/photo.jpg"
						}
					/>
					{error && <p className="mt-2 text-xs text-red-500">{error}</p>}
				</div>
			</div>
		</div>
	);
};

const ResumeEditor = ({
	data,
	sectionIcons,
	panel,
	activeSection,
	onActiveSectionChange,
	onChange,
	onSectionIconsChange,
}: ResumeEditorProps) => {
	const detailsScrollRef = useRef<HTMLDivElement>(null);

	const dndSensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const reorderArray = <T,>(arr: T[], from: number, to: number): T[] => {
		const next = [...arr];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		return next;
	};

	const handleSectionDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = data.sectionOrder.indexOf(active.id as SectionKey);
		const newIndex = data.sectionOrder.indexOf(over.id as SectionKey);
		if (oldIndex === -1 || newIndex === -1) return;
		onChange({ ...data, sectionOrder: reorderArray(data.sectionOrder, oldIndex, newIndex) });
	};

	const handleItemsDragEnd = <T extends { id: number }>(
		items: T[],
		field: keyof Pick<
			ResumeData,
			"skills" | "experience" | "projects" | "education" | "awards" | "campus"
		>,
	) => (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = items.findIndex((i) => i.id === active.id);
		const newIndex = items.findIndex((i) => i.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;
		onChange({ ...data, [field]: reorderArray(items, oldIndex, newIndex) });
	};

	const updatePersonal = (key: keyof ResumeData["personal"], value: string) => {
		onChange({ ...data, personal: { ...data.personal, [key]: value } });
	};

	const updateSectionTitle = (
		key: keyof ResumeData["sectionTitles"],
		value: string,
	) => {
		onChange({
			...data,
			sectionTitles: { ...data.sectionTitles, [key]: value },
		});
	};

	const updateSectionVisibility = (key: SectionKey, visible: boolean) => {
		onChange({
			...data,
			sectionVisibility: { ...data.sectionVisibility, [key]: visible },
		});
	};

	const updateAllSectionIcons = (visible: boolean) => {
		onSectionIconsChange(
			data.sectionOrder.reduce(
				(result, key) => ({ ...result, [key]: visible }),
				{ ...sectionIcons },
			),
		);
	};

	const allSectionIconsVisible = data.sectionOrder.every(
		(key) => sectionIcons[key],
	);

	useEffect(() => {
		if (panel !== "details") return;
		detailsScrollRef.current?.scrollTo({ top: 0 });
	}, [activeSection, panel]);

	const updateSkill = (id: number, key: keyof SkillItem, value: string) => {
		onChange({
			...data,
			skills: data.skills.map((skill) =>
				skill.id === id ? { ...skill, [key]: value } : skill,
			),
		});
	};

	const addSkill = () => {
		onChange({
			...data,
			skills: [
				...data.skills,
				{ id: createResumeItemId(), label: "新分类", content: "" },
			],
		});
	};

	const removeSkill = (id: number) => {
		onChange({ ...data, skills: data.skills.filter((skill) => skill.id !== id) });
	};

	const updateEducation = (id: number, key: keyof Education, value: string) => {
		onChange({
			...data,
			education: data.education.map((education) =>
				education.id === id ? { ...education, [key]: value } : education,
			),
		});
	};

	const addEducation = () => {
		onChange({
			...data,
			education: [
				...data.education,
				{
					id: createResumeItemId(),
					school: "学校名称",
					degree: "学位",
					date: "时间",
				},
			],
		});
	};

	const removeEducation = (id: number) => {
		onChange({
			...data,
			education: data.education.filter((education) => education.id !== id),
		});
	};

	const updateSectionEntry = (
		section: "awards" | "campus",
		id: number,
		key: SectionEntryTextKey,
		value: string,
	) => {
		onChange({
			...data,
			[section]: data[section].map((item) =>
				item.id === id ? { ...item, [key]: value } : item,
			),
		});
	};

	const addSectionEntry = (
		section: "awards" | "campus",
		template: Omit<SectionEntry, "id">,
	) => {
		onChange({
			...data,
			[section]: [...data[section], { ...template, id: createResumeItemId() }],
		});
	};

	const removeSectionEntry = (section: "awards" | "campus", id: number) => {
		onChange({
			...data,
			[section]: data[section].filter((item) => item.id !== id),
		});
	};

	const updateArrayItem = <T extends Experience | Project>(
		section: "experience" | "projects",
		id: number,
		key: keyof T,
		value: string,
	) => {
		onChange({
			...data,
			[section]: data[section].map((item) =>
				item.id === id ? { ...item, [key]: value } : item,
			),
		});
	};

	const addItem = <T extends Experience | Project>(
		section: "experience" | "projects",
		template: Omit<T, "id">,
	) => {
		onChange({
			...data,
			[section]: [...data[section], { ...template, id: createResumeItemId() }],
		});
	};

	const removeItem = (section: "experience" | "projects", id: number) => {
		onChange({
			...data,
			[section]: data[section].filter((item) => item.id !== id),
		});
	};

	const moveItem = <T extends { id: number }>(
		arr: T[],
		index: number,
		direction: "up" | "down",
	): T[] => {
		const next = [...arr];
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= next.length) return next;
		[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
		return next;
	};

	const moveSkillItem = (index: number, direction: "up" | "down") => {
		onChange({ ...data, skills: moveItem(data.skills, index, direction) });
	};

	const moveExperienceItem = (index: number, direction: "up" | "down") => {
		onChange({
			...data,
			experience: moveItem(data.experience, index, direction),
		});
	};

	const moveProjectItem = (index: number, direction: "up" | "down") => {
		onChange({ ...data, projects: moveItem(data.projects, index, direction) });
	};

	const moveEducationItem = (index: number, direction: "up" | "down") => {
		onChange({
			...data,
			education: moveItem(data.education, index, direction),
		});
	};

	const moveSectionEntry = (
		section: "awards" | "campus",
		index: number,
		direction: "up" | "down",
	) => {
		onChange({
			...data,
			[section]: moveItem(data[section], index, direction),
		});
	};

	const moveSectionOrder = (index: number, direction: "up" | "down") => {
		const nextOrder = [...data.sectionOrder];
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= nextOrder.length) return;
		[nextOrder[index], nextOrder[targetIndex]] = [
			nextOrder[targetIndex],
			nextOrder[index],
		];
		onChange({ ...data, sectionOrder: nextOrder });
	};

	const getSectionTitle = (key: SectionKey) =>
		data.sectionTitles[key] || sectionFallbackNames[key];

	const getSectionSummary = (key: SectionKey) => {
		switch (key) {
			case "skills":
				return `${data.skills.length} 个分类`;
			case "experience":
				return `${data.experience.length} 段经历`;
			case "projects":
				return `${data.projects.length} 个项目`;
			case "education":
				return `${data.education.length} 段教育`;
			case "awards":
				return `${data.awards.length} 项奖励`;
			case "campus":
				return `${data.campus.length} 段经历`;
			case "other":
				return data.other.trim() ? "已填写" : "空";
		}
	};

	const renderSectionVisibilityButton = (key: SectionKey) => {
		const visible = data.sectionVisibility[key];
		return (
			<button
				type="button"
				onClick={() => updateSectionVisibility(key, !visible)}
				className={`flex h-8 w-8 shrink-0 items-center justify-center rounded transition ${
					visible
						? "text-slate-400 hover:bg-slate-100 hover:text-blue-500"
						: "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
				}`}
				title={visible ? "隐藏区块" : "显示区块"}
				aria-label={visible ? "隐藏区块" : "显示区块"}
				aria-pressed={visible}
			>
				{visible ? <Eye size={14} /> : <EyeOff size={14} />}
			</button>
		);
	};

	const renderSectionOrderButton = (key: SectionKey, active: boolean) => (
		<button
			type="button"
			onClick={() => onActiveSectionChange(key)}
			className={`flex min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition ${
				active
					? "border-blue-200 bg-blue-50 text-blue-700"
					: data.sectionVisibility[key]
						? "border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white"
						: "border-transparent bg-slate-50/50 text-slate-400 hover:border-slate-200 hover:bg-white"
			}`}
			aria-pressed={active}
		>
			<span
				className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${
					active ? "bg-white text-blue-600" : "bg-white text-slate-400"
				}`}
			>
				{sectionIconNodes[key]}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-semibold">
					{getSectionTitle(key)}
				</span>
				<span className="block text-xs text-slate-400">
					{getSectionSummary(key)}
				</span>
			</span>
		</button>
	);

	const renderPersonalPanel = () => (
		<PanelBlock title="个人信息">
			<div className="grid grid-cols-1 gap-2">
				<InputGroup
					label="姓名"
					value={data.personal.name}
					onChange={(value) => updatePersonal("name", value)}
				/>
				<InputGroup
					label="职位头衔"
					value={data.personal.title}
					onChange={(value) => updatePersonal("title", value)}
				/>
				<PhotoField
					value={data.personal.photoUrl}
					onChange={(value) => updatePersonal("photoUrl", value)}
				/>
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<InputGroup
						label="电话"
						value={data.personal.phone}
						onChange={(value) => updatePersonal("phone", value)}
					/>
					<InputGroup
						label="邮箱"
						value={data.personal.email}
						onChange={(value) => updatePersonal("email", value)}
					/>
				</div>
				<InputGroup
					label="所在地"
					value={data.personal.location}
					onChange={(value) => updatePersonal("location", value)}
					placeholder="例：北京, 中国"
				/>
				<InputGroup
					label="到岗情况"
					value={data.personal.availability}
					onChange={(value) => updatePersonal("availability", value)}
					placeholder="例：4天/周 3个月+"
				/>
				<InputGroup
					label="GitHub"
					value={data.personal.github}
					onChange={(value) => updatePersonal("github", value)}
					placeholder="github.com/yourname"
				/>
				<InputGroup
					label="个人网站"
					value={data.personal.website}
					onChange={(value) => updatePersonal("website", value)}
					placeholder="your-portfolio.com"
				/>
			</div>
		</PanelBlock>
	);

	const renderStructurePanel = () => (
		<div>
			<PanelBlock
				title="区块顺序"
				action={
					<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
						{data.sectionOrder.length}
					</span>
				}
			>
				<div className="hidden sm:block">
					<DndContext
						sensors={dndSensors}
						collisionDetection={closestCenter}
						onDragEnd={handleSectionDragEnd}
					>
						<SortableContext
							items={data.sectionOrder}
							strategy={verticalListSortingStrategy}
						>
							<div className="space-y-1.5">
								{data.sectionOrder.map((key) => {
									const active = key === activeSection;
									return (
										<SortableItemWithHandle key={key} id={key}>
											{(dragHandle) => (
												<div className="group flex items-center gap-1.5">
													<DragHandle {...dragHandle} />
													{renderSectionOrderButton(key, active)}
													{renderSectionVisibilityButton(key)}
												</div>
											)}
										</SortableItemWithHandle>
									);
								})}
							</div>
						</SortableContext>
					</DndContext>
				</div>
				<div className="space-y-1.5 sm:hidden">
					{data.sectionOrder.map((key, index) => {
							const active = key === activeSection;
							return (
								<div key={key} className="group flex items-center gap-1.5">
									{renderSectionOrderButton(key, active)}
									{renderSectionVisibilityButton(key)}
									<div className="flex shrink-0 gap-0.5">
										<button
											type="button"
											onClick={() => moveSectionOrder(index, "up")}
											disabled={index === 0}
											className="flex h-8 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-25"
											title="上移"
											aria-label="上移"
										>
											<ArrowUp size={14} />
										</button>
										<button
											type="button"
											onClick={() => moveSectionOrder(index, "down")}
											disabled={index === data.sectionOrder.length - 1}
											className="flex h-8 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-25"
											title="下移"
											aria-label="下移"
										>
											<ArrowDown size={14} />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				<label className="mt-3 flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
					<span className="flex items-center gap-2">
						<span className="text-slate-400">
							{sectionIconNodes[activeSection]}
						</span>
						<span>标题图标</span>
					</span>
					<ToggleSwitch
						checked={allSectionIconsVisible}
						onChange={updateAllSectionIcons}
						label="标题图标"
					/>
				</label>
			</PanelBlock>
			{renderPersonalPanel()}
		</div>
	);

	const renderSectionSettings = () => (
		<PanelBlock title="区块设置">
			<InputGroup
				label="标题"
				value={data.sectionTitles[activeSection]}
				onChange={(value) => updateSectionTitle(activeSection, value)}
			/>
		</PanelBlock>
	);

	const renderSkillsEditor = () => (
		<PanelBlock
			title={getSectionTitle("skills")}
			action={<AddButton title="添加技能分类" onClick={addSkill} />}
		>
			<DndContext
				sensors={dndSensors}
				collisionDetection={closestCenter}
				onDragEnd={handleItemsDragEnd(data.skills, "skills")}
			>
				<SortableContext
					items={data.skills.map((s) => s.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="space-y-3">
						{data.skills.map((skill, index) => (
							<SortableItemWithHandle key={skill.id} id={skill.id}>
								{(dragHandle) => (
									<div className="group border-t border-slate-100 px-1 py-3 first:border-t-0">
										<div className="mb-2 flex items-center justify-between gap-2">
											<div className="flex min-w-0 items-center gap-1">
												<DragHandle {...dragHandle} />
												<span className="min-w-0 truncate text-xs font-medium text-slate-400">
													{skill.label || `分类 ${index + 1}`}
												</span>
											</div>
											<ItemActions
												index={index}
												total={data.skills.length}
												onMove={(direction) => moveSkillItem(index, direction)}
												onRemove={() => removeSkill(skill.id)}
											/>
										</div>
										<div className="sm:pl-8">
											<InputGroup
												label="分类名称"
												value={skill.label}
												onChange={(value) => updateSkill(skill.id, "label", value)}
												placeholder="例：核心能力"
											/>
											<InputGroup
												type="textarea"
												label="内容"
												value={skill.content}
												onChange={(value) => updateSkill(skill.id, "content", value)}
												placeholder="例：**JavaScript**, TypeScript, React"
												rows={3}
											/>
										</div>
									</div>
								)}
							</SortableItemWithHandle>
						))}
						{data.skills.length === 0 && (
							<EmptyState
								text="暂无技能分类"
								action={<AddButton title="添加技能分类" onClick={addSkill} />}
							/>
						)}
					</div>
				</SortableContext>
			</DndContext>
		</PanelBlock>
	);

	const renderExperienceEditor = () => (
		<PanelBlock
			title={getSectionTitle("experience")}
			action={
				<AddButton
					title="添加工作经历"
					onClick={() =>
						addItem<Experience>("experience", {
							company: "新公司",
							role: "职位",
							date: "时间",
							details: "",
						})
					}
				/>
			}
		>
			<DndContext
				sensors={dndSensors}
				collisionDetection={closestCenter}
				onDragEnd={handleItemsDragEnd(data.experience, "experience")}
			>
				<SortableContext
					items={data.experience.map((e) => e.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="space-y-3">
						{data.experience.map((experience, index) => (
							<SortableItemWithHandle key={experience.id} id={experience.id}>
								{(dragHandle) => (
									<div className="group border-t border-slate-100 px-1 py-3 first:border-t-0">
										<div className="mb-2 flex items-center justify-between gap-2">
											<div className="flex min-w-0 items-center gap-1">
												<DragHandle {...dragHandle} />
												<span className="min-w-0 truncate text-xs font-medium text-slate-400">
													{experience.company || `经历 ${index + 1}`}
												</span>
											</div>
											<ItemActions
												index={index}
												total={data.experience.length}
												onMove={(direction) => moveExperienceItem(index, direction)}
												onRemove={() => removeItem("experience", experience.id)}
											/>
										</div>
										<div className="sm:pl-8">
											<InputGroup
												label="公司"
												value={experience.company}
												onChange={(value) =>
													updateArrayItem<Experience>(
														"experience",
														experience.id,
														"company",
														value,
													)
												}
											/>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												<InputGroup
													label="职位"
													value={experience.role}
													onChange={(value) =>
														updateArrayItem<Experience>(
															"experience",
															experience.id,
															"role",
															value,
														)
													}
												/>
												<InputGroup
													label="时间"
													value={experience.date}
													onChange={(value) =>
														updateArrayItem<Experience>(
															"experience",
															experience.id,
															"date",
															value,
														)
													}
												/>
											</div>
											<InputGroup
												type="textarea"
												label="详情"
												value={experience.details}
												onChange={(value) =>
													updateArrayItem<Experience>(
														"experience",
														experience.id,
														"details",
														value,
													)
												}
												placeholder="每行一条经历亮点"
											/>
										</div>
									</div>
								)}
							</SortableItemWithHandle>
						))}
						{data.experience.length === 0 && (
							<EmptyState
								text="暂无工作经历"
								action={
									<AddButton
										title="添加工作经历"
										onClick={() =>
											addItem<Experience>("experience", {
												company: "新公司",
												role: "职位",
												date: "时间",
												details: "",
											})
										}
									/>
								}
							/>
						)}
					</div>
				</SortableContext>
			</DndContext>
		</PanelBlock>
	);

	const renderProjectsEditor = () => (
		<PanelBlock
			title={getSectionTitle("projects")}
			action={
				<AddButton
					title="添加项目"
					onClick={() =>
						addItem<Project>("projects", {
							name: "新项目",
							date: "",
							tags: "",
							link: "",
							source: "",
							description: "",
						})
					}
				/>
			}
		>
			<DndContext
				sensors={dndSensors}
				collisionDetection={closestCenter}
				onDragEnd={handleItemsDragEnd(data.projects, "projects")}
			>
				<SortableContext
					items={data.projects.map((p) => p.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="space-y-3">
						{data.projects.map((project, index) => (
							<SortableItemWithHandle key={project.id} id={project.id}>
								{(dragHandle) => (
									<div className="group border-t border-slate-100 px-1 py-3 first:border-t-0">
										<div className="mb-2 flex items-center justify-between gap-2">
											<div className="flex min-w-0 items-center gap-1">
												<DragHandle {...dragHandle} />
												<span className="min-w-0 truncate text-xs font-medium text-slate-400">
													{project.name || `项目 ${index + 1}`}
												</span>
											</div>
											<ItemActions
												index={index}
												total={data.projects.length}
												onMove={(direction) => moveProjectItem(index, direction)}
												onRemove={() => removeItem("projects", project.id)}
											/>
										</div>
										<div className="sm:pl-8">
											<InputGroup
												label="项目名"
												value={project.name}
												onChange={(value) =>
													updateArrayItem<Project>("projects", project.id, "name", value)
												}
											/>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
												<InputGroup
													label="技术标签"
													value={project.tags}
													onChange={(value) =>
														updateArrayItem<Project>(
															"projects",
															project.id,
															"tags",
															value,
														)
													}
												/>
												<InputGroup
													label="时间"
													value={project.date}
													onChange={(value) =>
														updateArrayItem<Project>(
															"projects",
															project.id,
															"date",
															value,
														)
													}
													placeholder="例：2024.03"
												/>
											</div>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
												<InputGroup
													label="Demo"
													value={project.link}
													onChange={(value) =>
														updateArrayItem<Project>(
															"projects",
															project.id,
															"link",
															value,
														)
													}
													placeholder="不带 https://"
												/>
												<InputGroup
													label="源码"
													value={project.source}
													onChange={(value) =>
														updateArrayItem<Project>(
															"projects",
															project.id,
															"source",
															value,
														)
													}
													placeholder="不带 https://"
												/>
											</div>
											<InputGroup
												type="textarea"
												label="描述"
												value={project.description}
												onChange={(value) =>
													updateArrayItem<Project>(
														"projects",
														project.id,
														"description",
														value,
													)
												}
												placeholder="每行一条项目亮点"
											/>
										</div>
									</div>
								)}
							</SortableItemWithHandle>
						))}
						{data.projects.length === 0 && (
							<EmptyState
								text="暂无项目经历"
								action={
									<AddButton
										title="添加项目"
										onClick={() =>
											addItem<Project>("projects", {
												name: "新项目",
												date: "",
												tags: "",
												link: "",
												source: "",
												description: "",
											})
										}
									/>
								}
							/>
						)}
					</div>
				</SortableContext>
			</DndContext>
		</PanelBlock>
	);

	const renderEducationEditor = () => (
		<PanelBlock
			title={getSectionTitle("education")}
			action={<AddButton title="添加教育经历" onClick={addEducation} />}
		>
			<DndContext
				sensors={dndSensors}
				collisionDetection={closestCenter}
				onDragEnd={handleItemsDragEnd(data.education, "education")}
			>
				<SortableContext
					items={data.education.map((e) => e.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="space-y-3">
						{data.education.map((education, index) => (
							<SortableItemWithHandle key={education.id} id={education.id}>
								{(dragHandle) => (
									<div className="group border-t border-slate-100 px-1 py-3 first:border-t-0">
										<div className="mb-2 flex items-center justify-between gap-2">
											<div className="flex min-w-0 items-center gap-1">
												<DragHandle {...dragHandle} />
												<span className="min-w-0 truncate text-xs font-medium text-slate-400">
													{education.school || `教育 ${index + 1}`}
												</span>
											</div>
											<ItemActions
												index={index}
												total={data.education.length}
												onMove={(direction) => moveEducationItem(index, direction)}
												onRemove={() => removeEducation(education.id)}
											/>
										</div>
										<div className="sm:pl-8">
											<InputGroup
												label="学校"
												value={education.school}
												onChange={(value) =>
													updateEducation(education.id, "school", value)
												}
											/>
											<InputGroup
												label="学位"
												value={education.degree}
												onChange={(value) =>
													updateEducation(education.id, "degree", value)
												}
											/>
											<InputGroup
												label="时间"
												value={education.date}
												onChange={(value) => updateEducation(education.id, "date", value)}
											/>
										</div>
									</div>
								)}
							</SortableItemWithHandle>
						))}
						{data.education.length === 0 && (
							<EmptyState
								text="暂无教育经历"
								action={<AddButton title="添加教育经历" onClick={addEducation} />}
							/>
						)}
					</div>
				</SortableContext>
			</DndContext>
		</PanelBlock>
	);

	const renderSectionEntryEditor = ({
		section,
		addTitle,
		emptyText,
		titleLabel,
		subtitleLabel,
		titlePlaceholder,
		subtitlePlaceholder,
		addTemplate,
	}: {
		section: "awards" | "campus";
		addTitle: string;
		emptyText: string;
		titleLabel: string;
		subtitleLabel: string;
		titlePlaceholder: string;
		subtitlePlaceholder: string;
		addTemplate: Omit<SectionEntry, "id">;
	}) => {
		const items = data[section];

		return (
			<PanelBlock
				title={getSectionTitle(section)}
				action={
					<AddButton
						title={addTitle}
						onClick={() => addSectionEntry(section, addTemplate)}
					/>
				}
			>
				<DndContext
					sensors={dndSensors}
					collisionDetection={closestCenter}
					onDragEnd={handleItemsDragEnd(items, section)}
				>
					<SortableContext
						items={items.map((item) => item.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="space-y-3">
							{items.map((item, index) => (
								<SortableItemWithHandle key={item.id} id={item.id}>
									{(dragHandle) => (
										<div className="group border-t border-slate-100 px-1 py-3 first:border-t-0">
											<div className="mb-2 flex items-center justify-between gap-2">
												<div className="flex min-w-0 items-center gap-1">
													<DragHandle {...dragHandle} />
													<span className="min-w-0 truncate text-xs font-medium text-slate-400">
														{item.title || `${getSectionTitle(section)} ${index + 1}`}
													</span>
												</div>
												<ItemActions
													index={index}
													total={items.length}
													onMove={(direction) =>
														moveSectionEntry(section, index, direction)
													}
													onRemove={() =>
														removeSectionEntry(section, item.id)
													}
												/>
											</div>
											<div className="sm:pl-8">
												<InputGroup
													label={titleLabel}
													value={item.title}
													onChange={(value) =>
														updateSectionEntry(section, item.id, "title", value)
													}
													placeholder={titlePlaceholder}
												/>
												<div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
													<InputGroup
														label={subtitleLabel}
														value={item.subtitle}
														onChange={(value) =>
															updateSectionEntry(
																section,
																item.id,
																"subtitle",
																value,
															)
														}
														placeholder={subtitlePlaceholder}
													/>
													<InputGroup
														label="时间"
														value={item.date}
														onChange={(value) =>
															updateSectionEntry(section, item.id, "date", value)
														}
														placeholder="例：2024.06"
													/>
												</div>
												<InputGroup
													type="textarea"
													label="详情"
													value={item.details}
													onChange={(value) =>
														updateSectionEntry(section, item.id, "details", value)
													}
													placeholder="每行一条亮点"
												/>
											</div>
										</div>
									)}
								</SortableItemWithHandle>
							))}
							{items.length === 0 && (
								<EmptyState
									text={emptyText}
									action={
										<AddButton
											title={addTitle}
											onClick={() => addSectionEntry(section, addTemplate)}
										/>
									}
								/>
							)}
						</div>
					</SortableContext>
				</DndContext>
			</PanelBlock>
		);
	};

	const renderAwardsEditor = () =>
		renderSectionEntryEditor({
			section: "awards",
			addTitle: "添加奖项",
			emptyText: "暂无获奖经历",
			titleLabel: "奖项",
			subtitleLabel: "颁发方",
			titlePlaceholder: "例：优秀毕业设计",
			subtitlePlaceholder: "例：学校 / 赛事组委会",
			addTemplate: {
				title: "新奖项",
				subtitle: "颁发方",
				date: "时间",
				details: "",
			},
		});

	const renderCampusEditor = () =>
		renderSectionEntryEditor({
			section: "campus",
			addTitle: "添加校园经历",
			emptyText: "暂无校园经历",
			titleLabel: "组织 / 活动",
			subtitleLabel: "角色",
			titlePlaceholder: "例：校学生会 / 创新实验室",
			subtitlePlaceholder: "例：负责人",
			addTemplate: {
				title: "新校园经历",
				subtitle: "角色",
				date: "时间",
				details: "",
			},
		});

	const renderOtherEditor = () => (
		<PanelBlock title={getSectionTitle("other")}>
			<textarea
				className={`${inputClass} min-h-40 resize-y font-mono`}
				value={data.other}
				onChange={(event) => onChange({ ...data, other: event.target.value })}
				placeholder={
					"**开源项目**：维护 [my-project](https://github.com/yourname/project)\n**工具链**：Vercel、Cloudflare Pages"
				}
			/>
			{data.other.trim() === "" && (
				<p className="mt-2 text-xs text-slate-400">
					清空内容后「其他」区块将不在简历中显示
				</p>
			)}
		</PanelBlock>
	);

	const renderActiveSectionEditor = () => {
		switch (activeSection) {
			case "skills":
				return renderSkillsEditor();
			case "experience":
				return renderExperienceEditor();
			case "projects":
				return renderProjectsEditor();
			case "education":
				return renderEducationEditor();
			case "awards":
				return renderAwardsEditor();
			case "campus":
				return renderCampusEditor();
			case "other":
				return renderOtherEditor();
		}
	};

	if (panel === "structure") return renderStructurePanel();

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="shrink-0 border-b border-slate-200 px-4 py-3">
				<div className="flex items-center gap-2">
					<span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600">
						{sectionIconNodes[activeSection]}
					</span>
					<div className="min-w-0 flex-1">
						<h2 className="truncate text-sm font-bold text-slate-800">
							{getSectionTitle(activeSection)}
						</h2>
						<p className="text-xs text-slate-400">
							{getSectionSummary(activeSection)}
						</p>
					</div>
				</div>
			</div>
			<div
				ref={detailsScrollRef}
				className="min-h-0 flex-1 overflow-y-auto custom-scrollbar"
			>
				{renderSectionSettings()}
				{renderActiveSectionEditor()}
			</div>
		</div>
	);
};

export default ResumeEditor;
