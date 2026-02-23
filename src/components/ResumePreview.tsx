import { ExternalLink, Github, Globe, Mail, MapPin, Phone } from "lucide-react";
import React from "react";
import { themes } from "../data/themes";
import type { ResumeData, SectionKey } from "../types/resume";
import type { ThemeId } from "../types/theme";
import { renderMarkdownList } from "../utils/markdown";

interface ResumePreviewProps {
	data: ResumeData;
	themeId?: ThemeId;
}

const ResumePreview = ({ data, themeId = "classic" }: ResumePreviewProps) => {
	const theme = themes[themeId];
	const c = theme.colors;

	// ─── 工具函数 ──────────────────────────────────────
	const renderPlainList = (text: string) => {
		if (!text.trim()) return null;
		return text
			.split("\n")
			.filter((line) => line.trim())
			.map((line, index) => (
				<li key={`${index}-${line.slice(0, 20)}`}>{line}</li>
			));
	};

	// ─── 个人信息字段检测 ──────────────────────────────
	const hasPhone = data.personal.phone.trim();
	const hasEmail = data.personal.email.trim();
	const hasLocation = data.personal.location.trim();
	const hasGithub = data.personal.github.trim();
	const hasWebsite = data.personal.website.trim();
	const hasContactInfo = hasPhone || hasEmail || hasLocation;
	const hasLinks = hasGithub || hasWebsite;

	// ─── 区块可见性 ────────────────────────────────────
	const sectionVisible: Record<SectionKey, boolean> = {
		skills:
			data.skills.length > 0 &&
			data.skills.some((s) => s.label.trim() || s.content.trim()),
		experience: data.experience.length > 0,
		projects: data.projects.length > 0,
		education: data.education.length > 0,
		other: data.other.trim().length > 0,
	};

	const visibleOrder = data.sectionOrder.filter((k) => sectionVisible[k]);

	// ─── 区块标题渲染（5 种风格） ─────────────────────
	const renderSectionHeader = (title: string) => {
		switch (theme.sectionHeaderStyle) {
			case "underline":
				return (
					<h2
						className={`text-lg font-bold ${c.heading} border-b-2 border-slate-100 mb-2 pb-1`}
					>
						{title}
					</h2>
				);

			case "left-border":
				return (
					<h2
						className={`text-lg font-bold ${c.heading} border-l-[3px] ${c.primaryBorder} pl-3 mb-3`}
					>
						{title}
					</h2>
				);

			case "pill":
				return (
					<h2 className="mb-3">
						<span
							className={`inline-block text-sm font-bold ${c.primary} ${c.primaryLight} px-3 py-1 rounded-md`}
						>
							{title}
						</span>
					</h2>
				);

			case "minimal":
				return (
					<h2
						className={`text-[11px] font-bold uppercase tracking-[0.15em] ${c.muted} border-b ${c.divider} mb-2 pb-1.5`}
					>
						{title}
					</h2>
				);

			case "dotted":
				return (
					<h2
						className={`text-base font-bold ${c.heading} border-b border-dotted ${c.divider} mb-2 pb-1`}
					>
						{title}
					</h2>
				);

			default:
				return (
					<h2 className={`text-lg font-bold ${c.heading} mb-2`}>{title}</h2>
				);
		}
	};

	// ─── 联系方式渲染（4 种风格） ─────────────────────
	const renderContactInfo = () => {
		if (!hasContactInfo) return null;

		const items: { icon: React.ReactNode; text: string; href?: string }[] = [];
		if (hasPhone)
			items.push({ icon: <Phone size={13} />, text: data.personal.phone });
		if (hasEmail)
			items.push({
				icon: <Mail size={13} />,
				text: data.personal.email,
				href: `mailto:${data.personal.email}`,
			});
		if (hasLocation)
			items.push({ icon: <MapPin size={13} />, text: data.personal.location });

		switch (theme.contactStyle) {
			case "icons-right":
				return (
					<div className={`text-right text-sm ${c.body} space-y-1`}>
						{items.map((item) => (
							<div
								key={item.text}
								className="flex items-center justify-end gap-2"
							>
								{item.href ? (
									<a
										href={item.href}
										className={`${c.primaryHover} hover:underline`}
									>
										{item.text}
									</a>
								) : (
									<span>{item.text}</span>
								)}
								{theme.showContactIcons && item.icon}
							</div>
						))}
					</div>
				);

			case "inline-dots":
				return (
					<div
						className={`flex flex-wrap items-center gap-x-1.5 text-sm ${c.body}`}
					>
						{items.map((item, i) => (
							<React.Fragment key={item.text}>
								{i > 0 && <span className={`${c.muted} select-none`}>·</span>}
								{item.href ? (
									<a
										href={item.href}
										className={`${c.primaryHover} hover:underline`}
									>
										{item.text}
									</a>
								) : (
									<span>{item.text}</span>
								)}
							</React.Fragment>
						))}
					</div>
				);

			case "inline-bar":
				return (
					<div
						className={`flex flex-wrap items-center gap-x-3 text-sm ${c.body}`}
					>
						{items.map((item, i) => (
							<React.Fragment key={item.text}>
								{i > 0 && <span className={`${c.muted} select-none`}>|</span>}
								<span className="flex items-center gap-1.5">
									{theme.showContactIcons && (
										<span className={c.muted}>{item.icon}</span>
									)}
									{item.href ? (
										<a
											href={item.href}
											className={`${c.primaryHover} hover:underline`}
										>
											{item.text}
										</a>
									) : (
										<span>{item.text}</span>
									)}
								</span>
							</React.Fragment>
						))}
					</div>
				);

			case "centered-icons":
				return (
					<div
						className={`flex flex-wrap justify-center items-center gap-x-5 text-sm ${c.body}`}
					>
						{items.map((item) => (
							<span key={item.text} className="flex items-center gap-1.5">
								{theme.showContactIcons && (
									<span className={c.primary}>{item.icon}</span>
								)}
								{item.href ? (
									<a
										href={item.href}
										className={`${c.primaryHover} hover:underline`}
									>
										{item.text}
									</a>
								) : (
									<span>{item.text}</span>
								)}
							</span>
						))}
					</div>
				);

			default:
				return null;
		}
	};

	// ─── 链接区域渲染 ─────────────────────────────────
	const renderLinks = () => {
		if (!hasLinks) return null;

		const isCentered =
			theme.headerLayout === "centered" ||
			theme.contactStyle === "centered-icons";

		return (
			<div
				className={`flex gap-5 mt-3 text-sm font-medium ${isCentered ? "justify-center" : ""}`}
			>
				{hasGithub && (
					<a
						href={`https://${data.personal.github}`}
						target="_blank"
						rel="noreferrer"
						className={`flex items-center gap-1.5 ${c.body} ${c.primaryHover}`}
					>
						{theme.showLinkIcons && <Github size={14} />}
						{data.personal.github}
					</a>
				)}
				{hasWebsite && (
					<a
						href={`https://${data.personal.website}`}
						target="_blank"
						rel="noreferrer"
						className={`flex items-center gap-1.5 ${c.body} ${c.primaryHover}`}
					>
						{theme.showLinkIcons && <Globe size={14} />}
						{data.personal.website}
					</a>
				)}
			</div>
		);
	};

	// ─── 头部渲染（3 种布局） ─────────────────────────
	const renderHeader = () => {
		const dividerClass =
			theme.headerDivider && (hasContactInfo || hasLinks)
				? `border-b ${c.divider} pb-4 mb-5`
				: "mb-5";

		switch (theme.headerLayout) {
			case "split":
				return (
					<header className={dividerClass}>
						<div
							className={`flex ${hasContactInfo ? "justify-between items-end" : "flex-col"}`}
						>
							<div>
								{data.personal.name.trim() && (
									<h1
										className={`text-3xl font-bold ${c.heading} tracking-tight`}
									>
										{data.personal.name}
									</h1>
								)}
								{data.personal.title.trim() && (
									<p className={`text-lg ${c.primary} font-medium mt-1`}>
										{data.personal.title}
									</p>
								)}
							</div>
							{renderContactInfo()}
						</div>
						{renderLinks()}
					</header>
				);

			case "centered":
				return (
					<header className={`text-center ${dividerClass}`}>
						{data.personal.name.trim() && (
							<h1 className={`text-3xl font-bold ${c.heading} tracking-tight`}>
								{data.personal.name}
							</h1>
						)}
						{data.personal.title.trim() && (
							<p className={`text-base ${c.primary} font-medium mt-1`}>
								{data.personal.title}
							</p>
						)}
						{hasContactInfo && (
							<div className="mt-3">{renderContactInfo()}</div>
						)}
						{renderLinks()}
					</header>
				);

			case "banner":
				return (
					<header className="mb-5 -mx-8 -mt-8 md:-mx-10 md:-mt-10">
						{/* 深色 Banner */}
						<div className="bg-slate-800 text-white px-8 py-6 md:px-10">
							<div className="flex justify-between items-end">
								<div>
									{data.personal.name.trim() && (
										<h1 className="text-3xl font-bold tracking-tight">
											{data.personal.name}
										</h1>
									)}
									{data.personal.title.trim() && (
										<p className="text-amber-400 font-medium mt-1 text-lg">
											{data.personal.title}
										</p>
									)}
								</div>
								{hasContactInfo && (
									<div className="text-right text-sm text-slate-300 space-y-1">
										{hasPhone && (
											<div className="flex items-center justify-end gap-2">
												<span>{data.personal.phone}</span>
												{theme.showContactIcons && <Phone size={13} />}
											</div>
										)}
										{hasEmail && (
											<div className="flex items-center justify-end gap-2">
												<a
													href={`mailto:${data.personal.email}`}
													className="hover:text-amber-300 hover:underline"
												>
													{data.personal.email}
												</a>
												{theme.showContactIcons && <Mail size={13} />}
											</div>
										)}
										{hasLocation && (
											<div className="flex items-center justify-end gap-2">
												<span>{data.personal.location}</span>
												{theme.showContactIcons && <MapPin size={13} />}
											</div>
										)}
									</div>
								)}
							</div>
							{hasLinks && (
								<div className="flex gap-5 mt-3 text-sm font-medium">
									{hasGithub && (
										<a
											href={`https://${data.personal.github}`}
											target="_blank"
											rel="noreferrer"
											className="flex items-center gap-1.5 text-slate-300 hover:text-amber-300"
										>
											{theme.showLinkIcons && <Github size={14} />}
											{data.personal.github}
										</a>
									)}
									{hasWebsite && (
										<a
											href={`https://${data.personal.website}`}
											target="_blank"
											rel="noreferrer"
											className="flex items-center gap-1.5 text-slate-300 hover:text-amber-300"
										>
											{theme.showLinkIcons && <Globe size={14} />}
											{data.personal.website}
										</a>
									)}
								</div>
							)}
						</div>
					</header>
				);

			default:
				return null;
		}
	};

	// ─── 各区块渲染 ───────────────────────────────────

	const renderSkills = () => (
		<section key="skills" className="mb-5">
			{renderSectionHeader(data.sectionTitles.skills)}
			<div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
				{data.skills.map(
					(skill) =>
						(skill.label.trim() || skill.content.trim()) && (
							<React.Fragment key={skill.id}>
								<span className={`font-semibold ${c.heading}`}>
									{skill.label}
								</span>
								<span className={c.body}>{skill.content}</span>
							</React.Fragment>
						),
				)}
			</div>
		</section>
	);

	const renderExperience = () => (
		<section key="experience" className="mb-5">
			{renderSectionHeader(data.sectionTitles.experience)}
			{data.experience.map((exp) => (
				<div key={exp.id} className="mb-4 last:mb-0">
					<div className="flex justify-between items-baseline mb-1">
						<h3 className={`font-bold text-base ${c.heading}`}>
							{exp.company}
						</h3>
						{exp.date.trim() && (
							<span className={`text-sm ${c.muted} shrink-0 ml-4`}>
								{exp.date}
							</span>
						)}
					</div>
					{exp.role.trim() && (
						<div className={`text-sm font-medium ${c.primary} mb-2`}>
							{exp.role}
						</div>
					)}
					{exp.details.trim() && (
						<ul
							className={`list-disc list-outside ml-4 space-y-1.5 text-sm ${c.body}`}
						>
							{renderPlainList(exp.details)}
						</ul>
					)}
				</div>
			))}
		</section>
	);

	const renderProjects = () => (
		<section key="projects" className="mb-5">
			{renderSectionHeader(data.sectionTitles.projects)}
			{data.projects.map((proj) => (
				<div key={proj.id} className="mb-3 last:mb-0">
					<div className="flex justify-between items-center mb-1">
						<div className="flex items-center gap-2">
							<h3 className={`font-bold text-base ${c.heading}`}>
								{proj.name}
							</h3>
							{proj.tags.trim() && (
								<span
									className={`text-xs ${c.tagBg} px-2 py-0.5 rounded ${c.tagText} border ${c.tagBorder}`}
								>
									{proj.tags}
								</span>
							)}
						</div>
						{(proj.link.trim() || proj.source.trim()) && (
							<div className="flex gap-3 text-xs">
								{proj.link.trim() && (
									<a
										href={`https://${proj.link}`}
										className={`flex items-center gap-1 ${c.link} hover:underline`}
									>
										<ExternalLink size={10} /> Demo
									</a>
								)}
								{proj.source.trim() && (
									<a
										href={`https://${proj.source}`}
										className={`flex items-center gap-1 ${c.link} hover:underline`}
									>
										<Github size={10} /> Code
									</a>
								)}
							</div>
						)}
					</div>
					{proj.description.trim() && (
						<ul
							className={`list-disc list-outside ml-4 space-y-1 text-sm ${c.body}`}
						>
							{renderMarkdownList(proj.description)}
						</ul>
					)}
				</div>
			))}
		</section>
	);

	const renderEducation = () => (
		<section key="education" className="mb-5">
			{renderSectionHeader(data.sectionTitles.education)}
			{data.education.map((edu) => (
				<div
					key={edu.id}
					className="flex justify-between text-sm mb-2 last:mb-0"
				>
					<div>
						{edu.degree.trim() && (
							<span className={`font-bold ${c.heading}`}>{edu.degree}</span>
						)}
						{edu.degree.trim() && edu.school.trim() && (
							<span className={`mx-2 ${c.muted} opacity-40`}>|</span>
						)}
						{edu.school.trim() && <span className={c.body}>{edu.school}</span>}
					</div>
					{edu.date.trim() && <span className={c.muted}>{edu.date}</span>}
				</div>
			))}
		</section>
	);

	const renderOther = () => (
		<section key="other" className="mb-5">
			{renderSectionHeader(data.sectionTitles.other)}
			<ul
				className={`list-disc list-outside ml-4 space-y-1.5 text-sm ${c.body}`}
			>
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

	// ─── 主渲染 ───────────────────────────────────────

	return (
		<div
			className={`w-full bg-white shadow-lg print:shadow-none p-8 md:p-10 ${c.body} leading-relaxed text-[10.5pt] min-h-[297mm]`}
		>
			{renderHeader()}

			{visibleOrder.map((key, idx) => {
				const el = sectionRenderers[key]();
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
