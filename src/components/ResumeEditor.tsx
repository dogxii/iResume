import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import type {
	Education,
	Experience,
	Project,
	ResumeData,
	SectionKey,
	SkillItem,
} from "../types/resume";

interface InputGroupProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: "text" | "textarea";
	placeholder?: string;
}

const InputGroup = ({
	label,
	value,
	onChange,
	type = "text",
	placeholder = "",
}: InputGroupProps) => {
	const id = useId();
	return (
		<div className="mb-3">
			<label
				htmlFor={id}
				className="block text-xs font-medium text-slate-500 mb-1"
			>
				{label}
			</label>
			{type === "textarea" ? (
				<textarea
					id={id}
					className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
					rows={4}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
				/>
			) : (
				<input
					id={id}
					type="text"
					className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
				/>
			)}
		</div>
	);
};

interface ResumeEditorProps {
	data: ResumeData;
	onChange: (data: ResumeData) => void;
}

const ResumeEditor = ({ data, onChange }: ResumeEditorProps) => {
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

	// --- Skills (dynamic array) ---
	const updateSkill = (id: number, key: keyof SkillItem, value: string) => {
		onChange({
			...data,
			skills: data.skills.map((s) =>
				s.id === id ? { ...s, [key]: value } : s,
			),
		});
	};

	const addSkill = () => {
		onChange({
			...data,
			skills: [
				...data.skills,
				{ id: Date.now(), label: "新分类", content: "" },
			],
		});
	};

	const removeSkill = (id: number) => {
		onChange({ ...data, skills: data.skills.filter((s) => s.id !== id) });
	};

	// --- Education (dynamic array) ---
	const updateEducation = (id: number, key: keyof Education, value: string) => {
		onChange({
			...data,
			education: data.education.map((e) =>
				e.id === id ? { ...e, [key]: value } : e,
			),
		});
	};

	const addEducation = () => {
		onChange({
			...data,
			education: [
				...data.education,
				{ id: Date.now(), school: "学校名称", degree: "学位", date: "时间" },
			],
		});
	};

	const removeEducation = (id: number) => {
		onChange({
			...data,
			education: data.education.filter((e) => e.id !== id),
		});
	};

	// --- Experience & Projects (array operations) ---
	const updateArrayItem = <T extends Experience | Project>(
		section: "experience" | "projects",
		id: number,
		key: keyof T,
		value: string,
	) => {
		const newSection = data[section].map((item) =>
			item.id === id ? { ...item, [key]: value } : item,
		);
		onChange({ ...data, [section]: newSection });
	};

	const addItem = <T extends Experience | Project>(
		section: "experience" | "projects",
		template: Omit<T, "id">,
	) => {
		onChange({
			...data,
			[section]: [...data[section], { ...template, id: Date.now() }],
		});
	};

	const removeItem = (section: "experience" | "projects", id: number) => {
		onChange({
			...data,
			[section]: data[section].filter((item) => item.id !== id),
		});
	};

	// --- Generic move up/down ---
	const moveItem = <T extends { id: number }>(
		arr: T[],
		index: number,
		direction: "up" | "down",
	): T[] => {
		const newArr = [...arr];
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= newArr.length) return newArr;
		[newArr[index], newArr[targetIndex]] = [newArr[targetIndex], newArr[index]];
		return newArr;
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

	// --- Section ordering ---
	const moveSectionOrder = (index: number, direction: "up" | "down") => {
		const newOrder = [...data.sectionOrder];
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= newOrder.length) return;
		[newOrder[index], newOrder[targetIndex]] = [
			newOrder[targetIndex],
			newOrder[index],
		];
		onChange({ ...data, sectionOrder: newOrder });
	};

	// 区块的默认备用名（防止 sectionTitles 被清空时显示空白）
	const sectionFallbackNames: Record<SectionKey, string> = {
		skills: "技术栈",
		experience: "工作经历",
		projects: "项目经历",
		education: "教育背景",
		other: "其他",
	};

	return (
		<div className="p-6 space-y-8 pb-20">
			{/* 个人信息 */}
			<section>
				<h3 className="font-bold text-slate-800 mb-4 border-b pb-2">
					个人信息
				</h3>
				<div className="grid grid-cols-1 gap-2">
					<InputGroup
						label="姓名"
						value={data.personal.name}
						onChange={(v) => updatePersonal("name", v)}
					/>
					<InputGroup
						label="职位头衔"
						value={data.personal.title}
						onChange={(v) => updatePersonal("title", v)}
					/>
					<div className="grid grid-cols-2 gap-2">
						<InputGroup
							label="电话"
							value={data.personal.phone}
							onChange={(v) => updatePersonal("phone", v)}
						/>
						<InputGroup
							label="邮箱"
							value={data.personal.email}
							onChange={(v) => updatePersonal("email", v)}
						/>
					</div>
					<InputGroup
						label="所在地"
						value={data.personal.location}
						onChange={(v) => updatePersonal("location", v)}
						placeholder="例：北京, 中国"
					/>
					<InputGroup
						label="Github (不带 https://)"
						value={data.personal.github}
						onChange={(v) => updatePersonal("github", v)}
						placeholder="例：github.com/yourname"
					/>
					<InputGroup
						label="个人网站 (不带 https://)"
						value={data.personal.website}
						onChange={(v) => updatePersonal("website", v)}
						placeholder="例：your-portfolio.com"
					/>
				</div>
			</section>

			{/* 区块顺序 */}
			<section>
				<h3 className="font-bold text-slate-800 mb-4 border-b pb-2">
					区块顺序
				</h3>
				<p className="text-xs text-slate-400 mb-3">
					点击箭头调整各区块在简历中的上下顺序
				</p>
				<div className="space-y-1.5">
					{data.sectionOrder.map((key, index) => (
						<div
							key={key}
							className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-2"
						>
							<span className="flex-1 text-sm text-slate-700 font-medium">
								{data.sectionTitles[key] || sectionFallbackNames[key]}
							</span>
							<button
								type="button"
								onClick={() => moveSectionOrder(index, "up")}
								disabled={index === 0}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
								title="上移"
							>
								<ArrowUp size={14} />
							</button>
							<button
								type="button"
								onClick={() => moveSectionOrder(index, "down")}
								disabled={index === data.sectionOrder.length - 1}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
								title="下移"
							>
								<ArrowDown size={14} />
							</button>
						</div>
					))}
				</div>
			</section>

			{/* 区块标题自定义 */}
			<section>
				<h3 className="font-bold text-slate-800 mb-4 border-b pb-2">
					区块标题
				</h3>
				<p className="text-xs text-slate-400 mb-3">
					自定义各区块在简历中显示的标题
				</p>
				<div className="grid grid-cols-2 gap-2">
					<InputGroup
						label="技术栈标题"
						value={data.sectionTitles.skills}
						onChange={(v) => updateSectionTitle("skills", v)}
					/>
					<InputGroup
						label="工作经历标题"
						value={data.sectionTitles.experience}
						onChange={(v) => updateSectionTitle("experience", v)}
					/>
					<InputGroup
						label="项目经历标题"
						value={data.sectionTitles.projects}
						onChange={(v) => updateSectionTitle("projects", v)}
					/>
					<InputGroup
						label="教育背景标题"
						value={data.sectionTitles.education}
						onChange={(v) => updateSectionTitle("education", v)}
					/>
					<InputGroup
						label="其他标题"
						value={data.sectionTitles.other}
						onChange={(v) => updateSectionTitle("other", v)}
					/>
				</div>
			</section>

			{/* 技术栈 (动态) */}
			<section>
				<div className="flex justify-between items-center mb-4 border-b pb-2">
					<h3 className="font-bold text-slate-800">
						{data.sectionTitles.skills || "技术栈"}
					</h3>
					<button
						type="button"
						onClick={addSkill}
						className="text-blue-600 hover:bg-blue-50 p-1 rounded"
						title="添加技能分类"
					>
						<Plus size={16} />
					</button>
				</div>
				{data.skills.map((skill, index) => (
					<div
						key={skill.id}
						className="bg-slate-50 p-4 rounded mb-3 relative group"
					>
						<div className="absolute top-2 right-2 flex gap-1">
							<button
								type="button"
								onClick={() => moveSkillItem(index, "up")}
								disabled={index === 0}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
								title="上移"
							>
								<ArrowUp size={14} />
							</button>
							<button
								type="button"
								onClick={() => moveSkillItem(index, "down")}
								disabled={index === data.skills.length - 1}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
								title="下移"
							>
								<ArrowDown size={14} />
							</button>
							<button
								type="button"
								onClick={() => removeSkill(skill.id)}
								className="text-slate-400 hover:text-red-500"
								title="删除"
							>
								<Trash2 size={14} />
							</button>
						</div>
						<InputGroup
							label="分类名称"
							value={skill.label}
							onChange={(v) => updateSkill(skill.id, "label", v)}
							placeholder="例：核心能力"
						/>
						<InputGroup
							label="内容"
							value={skill.content}
							onChange={(v) => updateSkill(skill.id, "content", v)}
							placeholder="例：JavaScript, TypeScript, React"
						/>
					</div>
				))}
				{data.skills.length === 0 && (
					<p className="text-xs text-slate-400 text-center py-4">
						暂无技能分类，点击 + 添加
					</p>
				)}
			</section>

			{/* 工作经历 */}
			<section>
				<div className="flex justify-between items-center mb-4 border-b pb-2">
					<h3 className="font-bold text-slate-800">
						{data.sectionTitles.experience || "工作经历"}
					</h3>
					<button
						type="button"
						onClick={() =>
							addItem<Experience>("experience", {
								company: "新公司",
								role: "职位",
								date: "时间",
								details: "",
							})
						}
						className="text-blue-600 hover:bg-blue-50 p-1 rounded"
						title="添加工作经历"
					>
						<Plus size={16} />
					</button>
				</div>
				{data.experience.map((exp, index) => (
					<div
						key={exp.id}
						className="bg-slate-50 p-4 rounded mb-4 relative group"
					>
						<div className="absolute top-2 right-2 flex gap-1">
							<button
								type="button"
								onClick={() => moveExperienceItem(index, "up")}
								disabled={index === 0}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
								title="上移"
							>
								<ArrowUp size={14} />
							</button>
							<button
								type="button"
								onClick={() => moveExperienceItem(index, "down")}
								disabled={index === data.experience.length - 1}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
								title="下移"
							>
								<ArrowDown size={14} />
							</button>
							<button
								type="button"
								onClick={() => removeItem("experience", exp.id)}
								className="text-slate-400 hover:text-red-500"
								title="删除"
							>
								<Trash2 size={14} />
							</button>
						</div>
						<InputGroup
							label="公司"
							value={exp.company}
							onChange={(v) =>
								updateArrayItem<Experience>("experience", exp.id, "company", v)
							}
						/>
						<div className="grid grid-cols-2 gap-2">
							<InputGroup
								label="职位"
								value={exp.role}
								onChange={(v) =>
									updateArrayItem<Experience>("experience", exp.id, "role", v)
								}
							/>
							<InputGroup
								label="时间"
								value={exp.date}
								onChange={(v) =>
									updateArrayItem<Experience>("experience", exp.id, "date", v)
								}
							/>
						</div>
						<InputGroup
							type="textarea"
							label="详情 (每行一点)"
							value={exp.details}
							onChange={(v) =>
								updateArrayItem<Experience>("experience", exp.id, "details", v)
							}
							placeholder="使用 React 优化了..."
						/>
					</div>
				))}
				{data.experience.length === 0 && (
					<p className="text-xs text-slate-400 text-center py-4">
						暂无工作经历，点击 + 添加
					</p>
				)}
			</section>

			{/* 项目 */}
			<section>
				<div className="flex justify-between items-center mb-4 border-b pb-2">
					<h3 className="font-bold text-slate-800">
						{data.sectionTitles.projects || "项目经历"}
					</h3>
					<button
						type="button"
						onClick={() =>
							addItem<Project>("projects", {
								name: "新项目",
								tags: "",
								link: "",
								source: "",
								description: "",
							})
						}
						className="text-blue-600 hover:bg-blue-50 p-1 rounded"
						title="添加项目"
					>
						<Plus size={16} />
					</button>
				</div>
				{data.projects.map((proj, index) => (
					<div key={proj.id} className="bg-slate-50 p-4 rounded mb-4 relative">
						<div className="absolute top-2 right-2 flex gap-1">
							<button
								type="button"
								onClick={() => moveProjectItem(index, "up")}
								disabled={index === 0}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
								title="上移"
							>
								<ArrowUp size={14} />
							</button>
							<button
								type="button"
								onClick={() => moveProjectItem(index, "down")}
								disabled={index === data.projects.length - 1}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
								title="下移"
							>
								<ArrowDown size={14} />
							</button>
							<button
								type="button"
								onClick={() => removeItem("projects", proj.id)}
								className="text-slate-400 hover:text-red-500"
								title="删除"
							>
								<Trash2 size={14} />
							</button>
						</div>
						<InputGroup
							label="项目名"
							value={proj.name}
							onChange={(v) =>
								updateArrayItem<Project>("projects", proj.id, "name", v)
							}
						/>
						<InputGroup
							label="技术标签"
							value={proj.tags}
							onChange={(v) =>
								updateArrayItem<Project>("projects", proj.id, "tags", v)
							}
						/>
						<div className="grid grid-cols-2 gap-2">
							<InputGroup
								label="Demo 链接"
								value={proj.link}
								onChange={(v) =>
									updateArrayItem<Project>("projects", proj.id, "link", v)
								}
								placeholder="不带 https://"
							/>
							<InputGroup
								label="源码链接"
								value={proj.source}
								onChange={(v) =>
									updateArrayItem<Project>("projects", proj.id, "source", v)
								}
								placeholder="不带 https://"
							/>
						</div>
						<InputGroup
							type="textarea"
							label="描述 (每行一点)"
							value={proj.description}
							onChange={(v) =>
								updateArrayItem<Project>("projects", proj.id, "description", v)
							}
						/>
					</div>
				))}
				{data.projects.length === 0 && (
					<p className="text-xs text-slate-400 text-center py-4">
						暂无项目经历，点击 + 添加
					</p>
				)}
			</section>

			{/* 教育 */}
			<section>
				<div className="flex justify-between items-center mb-4 border-b pb-2">
					<h3 className="font-bold text-slate-800">
						{data.sectionTitles.education || "教育背景"}
					</h3>
					<button
						type="button"
						onClick={addEducation}
						className="text-blue-600 hover:bg-blue-50 p-1 rounded"
						title="添加教育经历"
					>
						<Plus size={16} />
					</button>
				</div>
				{data.education.map((edu, index) => (
					<div
						key={edu.id}
						className="bg-slate-50 p-4 rounded mb-4 relative group"
					>
						<div className="absolute top-2 right-2 flex gap-1">
							<button
								type="button"
								onClick={() => moveEducationItem(index, "up")}
								disabled={index === 0}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
								title="上移"
							>
								<ArrowUp size={14} />
							</button>
							<button
								type="button"
								onClick={() => moveEducationItem(index, "down")}
								disabled={index === data.education.length - 1}
								className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
								title="下移"
							>
								<ArrowDown size={14} />
							</button>
							<button
								type="button"
								onClick={() => removeEducation(edu.id)}
								className="text-slate-400 hover:text-red-500"
								title="删除"
							>
								<Trash2 size={14} />
							</button>
						</div>
						<InputGroup
							label="学校"
							value={edu.school}
							onChange={(v) => updateEducation(edu.id, "school", v)}
						/>
						<InputGroup
							label="学位"
							value={edu.degree}
							onChange={(v) => updateEducation(edu.id, "degree", v)}
						/>
						<InputGroup
							label="时间"
							value={edu.date}
							onChange={(v) => updateEducation(edu.id, "date", v)}
						/>
					</div>
				))}
				{data.education.length === 0 && (
					<p className="text-xs text-slate-400 text-center py-4">
						暂无教育经历，点击 + 添加
					</p>
				)}
			</section>

			{/* 其他 */}
			<section>
				<h3 className="font-bold text-slate-800 mb-4 border-b pb-2">
					{data.sectionTitles.other || "其他"}
				</h3>
				<p className="text-xs text-slate-400 mb-2 leading-relaxed">
					每行一条，支持行内语法：
					<br />
					<code className="bg-slate-100 px-1 rounded text-slate-600">
						**粗体**
					</code>
					{" · "}
					<code className="bg-slate-100 px-1 rounded text-slate-600">
						[链接文字](https://url)
					</code>
					<br />
					行首{" "}
					<code className="bg-slate-100 px-1 rounded text-slate-600">- </code>{" "}
					可选（写不写都会显示为列表）
				</p>
				<textarea
					className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
					rows={6}
					value={data.other}
					onChange={(e) => onChange({ ...data, other: e.target.value })}
					placeholder={
						"**开源项目**：维护 [my-project](https://github.com/yourname/project)，简介\n**工具链**：日常使用 Vercel、Cloudflare Pages 进行项目部署"
					}
				/>
				{data.other.trim() === "" && (
					<p className="text-xs text-slate-400 mt-1">
						清空内容后「其他」区块将不在简历中显示
					</p>
				)}
			</section>
		</div>
	);
};

export default ResumeEditor;
