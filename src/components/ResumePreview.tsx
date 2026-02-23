import { ExternalLink, Github, Globe, Mail, MapPin, Phone } from "lucide-react";
import React from "react";
import type { ResumeData, SectionKey } from "../types/resume";
import { renderMarkdownList } from "../utils/markdown";

interface ResumePreviewProps {
	data: ResumeData;
}

const ResumePreview = ({ data }: ResumePreviewProps) => {
	// 纯文字列表（工作经历 details）
	const renderPlainList = (text: string) => {
		if (!text.trim()) return null;
		return text
			.split("\n")
			.filter((line) => line.trim())
			.map((line, index) => (
				<li key={`${index}-${line.slice(0, 20)}`}>{line}</li>
			));
	};

	// 判断个人信息各字段是否有内容
	const hasPhone = data.personal.phone.trim();
	const hasEmail = data.personal.email.trim();
	const hasLocation = data.personal.location.trim();
	const hasGithub = data.personal.github.trim();
	const hasWebsite = data.personal.website.trim();
	const hasContactInfo = hasPhone || hasEmail || hasLocation;
	const hasLinks = hasGithub || hasWebsite;

	// 各 section 的可见性判断
	const sectionVisible: Record<SectionKey, boolean> = {
		skills:
			data.skills.length > 0 &&
			data.skills.some((s) => s.label.trim() || s.content.trim()),
		experience: data.experience.length > 0,
		projects: data.projects.length > 0,
		education: data.education.length > 0,
		other: data.other.trim().length > 0,
	};

	// 按顺序找出实际要渲染的 key 列表
	const visibleOrder = data.sectionOrder.filter((k) => sectionVisible[k]);

	// ------- 各区块渲染函数 -------

	const renderSkills = () => (
		<section key="skills" className="mb-5">
			<h2 className="text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-2 pb-1">
				{data.sectionTitles.skills}
			</h2>
			<div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
				{data.skills.map(
					(skill) =>
						(skill.label.trim() || skill.content.trim()) && (
							<React.Fragment key={skill.id}>
								<span className="font-semibold text-slate-700">
									{skill.label}
								</span>
								<span>{skill.content}</span>
							</React.Fragment>
						),
				)}
			</div>
		</section>
	);

	const renderExperience = () => (
		<section key="experience" className="mb-5">
			<h2 className="text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-3 pb-1">
				{data.sectionTitles.experience}
			</h2>
			{data.experience.map((exp) => (
				<div key={exp.id} className="mb-4 last:mb-0">
					<div className="flex justify-between items-baseline mb-1">
						<h3 className="font-bold text-base text-slate-900">
							{exp.company}
						</h3>
						{exp.date.trim() && (
							<span className="text-sm text-slate-500 shrink-0 ml-4">
								{exp.date}
							</span>
						)}
					</div>
					{exp.role.trim() && (
						<div className="text-sm font-medium text-blue-600 mb-2">
							{exp.role}
						</div>
					)}
					{exp.details.trim() && (
						<ul className="list-disc list-outside ml-4 space-y-1.5 text-sm text-slate-700">
							{renderPlainList(exp.details)}
						</ul>
					)}
				</div>
			))}
		</section>
	);

	const renderProjects = () => (
		<section key="projects" className="mb-5">
			<h2 className="text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-3 pb-1">
				{data.sectionTitles.projects}
			</h2>
			{data.projects.map((proj) => (
				<div key={proj.id} className="mb-3 last:mb-0">
					<div className="flex justify-between items-center mb-1">
						<div className="flex items-center gap-2">
							<h3 className="font-bold text-base text-slate-900">
								{proj.name}
							</h3>
							{proj.tags.trim() && (
								<span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
									{proj.tags}
								</span>
							)}
						</div>
						{(proj.link.trim() || proj.source.trim()) && (
							<div className="flex gap-3 text-xs">
								{proj.link.trim() && (
									<a
										href={`https://${proj.link}`}
										className="flex items-center gap-1 text-blue-600 hover:underline"
									>
										<ExternalLink size={10} /> Demo
									</a>
								)}
								{proj.source.trim() && (
									<a
										href={`https://${proj.source}`}
										className="flex items-center gap-1 text-blue-600 hover:underline"
									>
										<Github size={10} /> Code
									</a>
								)}
							</div>
						)}
					</div>
					{proj.description.trim() && (
						<ul className="list-disc list-outside ml-4 space-y-1 text-sm text-slate-700">
							{renderMarkdownList(proj.description)}
						</ul>
					)}
				</div>
			))}
		</section>
	);

	const renderEducation = () => (
		<section key="education" className="mb-5">
			<h2 className="text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-2 pb-1">
				{data.sectionTitles.education}
			</h2>
			{data.education.map((edu) => (
				<div
					key={edu.id}
					className="flex justify-between text-sm mb-2 last:mb-0"
				>
					<div>
						{edu.degree.trim() && (
							<span className="font-bold text-slate-900">{edu.degree}</span>
						)}
						{edu.degree.trim() && edu.school.trim() && (
							<span className="mx-2 text-slate-300">|</span>
						)}
						{edu.school.trim() && <span>{edu.school}</span>}
					</div>
					{edu.date.trim() && (
						<span className="text-slate-500">{edu.date}</span>
					)}
				</div>
			))}
		</section>
	);

	const renderOther = () => (
		<section key="other" className="mb-5">
			<h2 className="text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-2 pb-1">
				{data.sectionTitles.other}
			</h2>
			<ul className="list-disc list-outside ml-4 space-y-1.5 text-sm text-slate-700">
				{renderMarkdownList(data.other)}
			</ul>
		</section>
	);

	const sectionRenderers: Record<SectionKey, () => React.ReactElement> = {
		skills: renderSkills,
		experience: renderExperience,
		projects: renderProjects,
		education: renderEducation,
		other: renderOther,
	};

	return (
		<div className="w-full bg-white shadow-lg print:shadow-none p-8 md:p-10 text-slate-800 leading-relaxed text-[10.5pt] min-h-[297mm]">
			{/* --- 头部信息（始终在最顶部） --- */}
			<header
				className={`${hasContactInfo || hasLinks ? "border-b border-slate-200 pb-4 mb-5" : "mb-5"}`}
			>
				<div
					className={`flex ${hasContactInfo ? "justify-between items-end" : "flex-col"}`}
				>
					<div>
						{data.personal.name.trim() && (
							<h1 className="text-3xl font-bold text-slate-900 tracking-tight">
								{data.personal.name}
							</h1>
						)}
						{data.personal.title.trim() && (
							<p className="text-lg text-blue-600 font-medium mt-1">
								{data.personal.title}
							</p>
						)}
					</div>
					{hasContactInfo && (
						<div className="text-right text-sm text-slate-600 space-y-1">
							{hasPhone && (
								<div className="flex items-center justify-end gap-2">
									<span>{data.personal.phone}</span>
									<Phone size={14} />
								</div>
							)}
							{hasEmail && (
								<div className="flex items-center justify-end gap-2">
									<a
										href={`mailto:${data.personal.email}`}
										className="hover:text-blue-600 hover:underline"
									>
										{data.personal.email}
									</a>
									<Mail size={14} />
								</div>
							)}
							{hasLocation && (
								<div className="flex items-center justify-end gap-2">
									<span>{data.personal.location}</span>
									<MapPin size={14} />
								</div>
							)}
						</div>
					)}
				</div>

				{hasLinks && (
					<div className="flex gap-6 mt-4 text-sm font-medium">
						{hasGithub && (
							<a
								href={`https://${data.personal.github}`}
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600"
							>
								<Github size={14} /> {data.personal.github}
							</a>
						)}
						{hasWebsite && (
							<a
								href={`https://${data.personal.website}`}
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600"
							>
								<Globe size={14} /> {data.personal.website}
							</a>
						)}
					</div>
				)}
			</header>

			{/* --- 动态顺序渲染各区块，最后一个去掉 mb-5 --- */}
			{visibleOrder.map((key, idx) => {
				const el = sectionRenderers[key]();
				// 最后一个可见区块去掉底部外边距
				if (idx === visibleOrder.length - 1) {
					const typedEl = el as React.ReactElement<{ className?: string }>;
					return React.cloneElement(typedEl, {
						className: typedEl.props.className?.replace("mb-5", "").trim(),
					});
				}
				return el;
			})}
		</div>
	);
};

export default ResumePreview;
