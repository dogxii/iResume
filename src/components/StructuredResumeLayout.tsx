import { Diamond } from "lucide-react";
import React, { forwardRef } from "react";
import { isCustomSectionKey } from "../data/resumeData";
import { formatSkillsAsMarkdown, hasSkillContent } from "../data/resumeSkills";
import { DEFAULT_RESUME_PAGE_MARGIN_MM } from "../data/resumeStyle";
import type {
	ResumeSectionPreferences,
	ResumeSectionSpacing,
} from "../data/resumeStyle";
import type {
	Education,
	Project,
	ResumeData,
	ResumeEditableSectionKey,
	SectionEntry,
	SectionKey,
	StandardSectionKey,
} from "../types/resume";
import { parseInline, parseMarkdownBlocks } from "../utils/markdown";
import { normalizeResumePhotoSrc } from "../utils/resumePhoto";
import { normalizeSafeUrl } from "../utils/url";

interface StructuredResumeLayoutProps {
	data: ResumeData;
	sectionPreferences: ResumeSectionPreferences;
	contentRef?: React.Ref<HTMLDivElement>;
	onSectionClick?: (section: ResumeEditableSectionKey) => void;
	rootStyle: React.CSSProperties;
	fontClass: string;
	pageMarginMm: number;
	sectionSpacing: ResumeSectionSpacing;
}

interface ContactRow {
	label?: string;
	text: string;
	href?: string;
	addressClassName?: string;
}

const hasSectionEntryContent = (item: SectionEntry) =>
	item.title.trim() ||
	item.subtitle.trim() ||
	item.date.trim() ||
	item.details.trim();

const splitEducationDegree = (degree: string) => {
	const normalized = degree.trim();
	const match = normalized.match(/^(.+?)\s*[（(]([^（）()]+)[）)]$/);

	return match
		? { major: match[1].trim(), degree: match[2].trim() }
		: { major: normalized, degree: "" };
};

const StructuredBulletList = ({
	items,
	className = "",
}: {
	items: React.ReactNode[];
	className?: string;
}) => {
	if (items.length === 0) return null;

	return (
		<ul className={`space-y-[0.24em] ${className}`.trim()}>
			{items.map((item, index) => (
				<li
					key={index}
					className="grid grid-cols-[1.2em_minmax(0,1fr)] gap-x-[0.95em] leading-[1.48]"
				>
					<Diamond
						aria-hidden="true"
						strokeWidth={0}
						fill="currentColor"
						className="mt-[0.1em] h-[1.2em] w-[1.2em] text-[#dedede]"
					/>
					<span className="min-w-0">{item}</span>
				</li>
			))}
		</ul>
	);
};

const StructuredMarkdownBlocks = ({
	text,
	className = "",
}: {
	text: string;
	className?: string;
}) => {
	const blocks = parseMarkdownBlocks(text);
	if (blocks.length === 0) return null;

	return (
		<div className={`space-y-[0.24em] ${className}`.trim()}>
			{blocks.map((block, index) =>
				block.type === "list" ? (
					<StructuredBulletList
						key={`list-${index}`}
						className="resume-markdown-list"
						items={block.items.map((line) => parseInline(line))}
					/>
				) : (
					<div
						key={`paragraph-${index}`}
						className="resume-paragraph-block leading-[1.48]"
					>
						{parseInline(block.text)}
					</div>
				),
			)}
		</div>
	);
};

const StructuredResumeLayout = forwardRef<
	HTMLDivElement,
	StructuredResumeLayoutProps
>(function StructuredResumeLayout(
	{
		data,
		sectionPreferences,
		contentRef,
		onSectionClick,
		rootStyle,
		fontClass,
		pageMarginMm,
		sectionSpacing,
	},
	ref,
) {
	const customSectionSpacing = sectionSpacing;
	const photoUrl = normalizeResumePhotoSrc(data.personal.photoUrl);
	const photoVisible = Boolean(
		photoUrl && sectionPreferences.personal.showPhoto,
	);
	const photoOnLeft = sectionPreferences.personal.photoPosition === "left";
	const photoSize = Math.round(
		58 * sectionPreferences.personal.photoSizeRatio,
	);
	const linkStyle = sectionPreferences.personal.linkStyle;
	const linkAddressClassName =
		linkStyle === "highlighted"
			? "border-b-[0.5px] border-[#cbd5e1]"
			: linkStyle === "blue"
				? "text-blue-600 hover:text-blue-700"
				: "hover:text-neutral-600";

	const contactRows: ContactRow[] = [];
	if (data.personal.phone.trim()) {
		contactRows.push({
			label: "联系电话",
			text: data.personal.phone,
			href: normalizeSafeUrl(`tel:${data.personal.phone}`),
		});
	}
	if (data.personal.email.trim()) {
		contactRows.push({
			label: "电子邮箱",
			text: data.personal.email,
			href: normalizeSafeUrl(`mailto:${data.personal.email}`),
		});
	}
	if (data.personal.location.trim()) {
		contactRows.push({ label: "现居住地", text: data.personal.location });
	}
	if (data.personal.availability.trim()) {
		contactRows.push({
			label: "到岗情况",
			text: data.personal.availability,
		});
	}
	const profileLinks: ContactRow[] = [];
	if (data.personal.github.trim()) {
		profileLinks.push({
			label: sectionPreferences.personal.showLinkLabels ? "GitHub" : undefined,
			text: data.personal.github,
			href: normalizeSafeUrl(data.personal.github),
			addressClassName: linkAddressClassName,
		});
	}
	if (data.personal.website.trim()) {
		profileLinks.push({
			label: sectionPreferences.personal.showLinkLabels ? "主页" : undefined,
			text: data.personal.website,
			href: normalizeSafeUrl(data.personal.website),
			addressClassName: linkAddressClassName,
		});
	}

	const getCustomSection = (key: SectionKey) =>
		isCustomSectionKey(key)
			? data.customSections.find((section) => section.id === key)
			: undefined;
	const getSectionTitle = (key: SectionKey) => {
		const customSection = getCustomSection(key);
		if (customSection) {
			return (
				data.sectionTitles[key]?.trim() ||
				customSection.title.trim() ||
				"自定义区块"
			);
		}
		if (isCustomSectionKey(key)) {
			return data.sectionTitles[key]?.trim() || "自定义区块";
		}

		return data.sectionTitles[key];
	};
	const isSectionVisible = (key: SectionKey) => {
		if (data.sectionVisibility[key] === false) return false;
		if (isCustomSectionKey(key)) {
			return Boolean(getCustomSection(key)?.content.trim());
		}

		switch (key) {
			case "skills":
				return data.skills.some((skill) => hasSkillContent(skill));
			case "experience":
				return data.experience.length > 0;
			case "projects":
				return data.projects.length > 0;
			case "education":
				return data.education.length > 0;
			case "awards":
				return data.awards.some((item) => hasSectionEntryContent(item));
			case "campus":
				return data.campus.some((item) => hasSectionEntryContent(item));
			case "other":
				return Boolean(data.other.trim());
		}
	};
	const visibleOrder = data.sectionOrder.filter(isSectionVisible);

	const shouldIgnoreSectionClick = (
		event: React.MouseEvent<HTMLElement>,
	) => {
		if (!onSectionClick || event.defaultPrevented || event.button !== 0) {
			return true;
		}
		if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
			return true;
		}
		if (
			event.target instanceof HTMLElement &&
			event.target.closest(
				'a, button, input, textarea, select, [contenteditable="true"]',
			)
		) {
			return true;
		}

		return Boolean(window.getSelection()?.toString().trim());
	};

	const getSectionProps = (
		key: SectionKey,
		isLast: boolean,
	): React.HTMLAttributes<HTMLElement> & {
		"data-preview-section"?: SectionKey;
	} => ({
		className: `${isLast ? "" : "mb-[1.72em]"} ${
			onSectionClick ? "resume-editable-section" : ""
		}`.trim(),
		...(customSectionSpacing && !isLast
			? { style: { marginBottom: "var(--resume-section-spacing)" } }
			: {}),
		...(onSectionClick
			? {
					"data-preview-section": key,
					title: `点击编辑${getSectionTitle(key)}`,
					onClick: (event) => {
						if (shouldIgnoreSectionClick(event)) return;
						onSectionClick(key);
					},
				}
			: {}),
	});

	const getPersonalSectionProps = (
		className: string,
	): React.HTMLAttributes<HTMLElement> & {
		"data-preview-section"?: ResumeEditableSectionKey;
	} => ({
		className: `${className} ${
			onSectionClick ? "resume-editable-section" : ""
		}`.trim(),
		...(onSectionClick
			? {
					"data-preview-section": "personal",
					title: "点击编辑个人信息",
					onClick: (event) => {
						if (shouldIgnoreSectionClick(event)) return;
						onSectionClick("personal");
					},
				}
			: {}),
	});

	const renderSectionHeader = (key: SectionKey) => (
		<h2 className="resume-section-title mb-[0.48em] border-b-[2px] border-neutral-300 pb-[0.08em] text-[1.42em] font-normal leading-[1.25] text-neutral-900">
			{getSectionTitle(key)}
		</h2>
	);

	const renderHeader = () => {
		const photo = photoVisible ? (
			<img
				src={photoUrl}
				alt={
					data.personal.name.trim()
						? `${data.personal.name} 的照片`
						: "简历照片"
				}
				className="shrink-0 object-cover"
				style={{ height: photoSize, width: photoSize }}
			/>
		) : null;

		return (
			<header
				{...getPersonalSectionProps(
					"mb-[2.05em] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-[3.25em]",
				)}
			>
				<div
					className={`flex min-w-0 items-start gap-[1em] ${
						photoOnLeft ? "" : "flex-row-reverse justify-end"
					}`}
				>
					{photo}
					<div className="min-w-0 pt-[0.05em]">
						{data.personal.name.trim() && (
							<h1 className="text-[1.62em] font-medium leading-[1.25] text-neutral-900">
								{data.personal.name}
							</h1>
						)}
						{data.personal.title.trim() && (
							<p className="mt-[0.9em] text-[1.02em] leading-[1.4] text-neutral-800">
								应聘职位：{data.personal.title}
							</p>
						)}
						{profileLinks.length > 0 && (
							<div className="mt-[0.52em] flex flex-wrap items-center gap-x-[1.15em] gap-y-[0.24em] text-[0.94em] leading-[1.35] text-neutral-800">
								{profileLinks.map((item, index) => (
									<span
										key={`${item.label ?? "link"}-${index}-${item.text}`}
										className="inline-flex min-w-0 items-baseline gap-[0.24em]"
									>
										{item.label && (
											<span className="shrink-0 whitespace-nowrap">
												{item.label}：
											</span>
										)}
										<a
											href={item.href}
											target="_blank"
											rel="noreferrer"
											className={`min-w-0 ${item.addressClassName ?? "hover:text-neutral-600"}`}
										>
											{item.text}
										</a>
									</span>
								))}
							</div>
						)}
					</div>
				</div>
				{contactRows.length > 0 && (
					<div className="min-w-[13.5em] max-w-[20em] space-y-[0.18em] text-[0.96em] leading-[1.4] text-neutral-800">
						{contactRows.map((item, index) => (
							<div
								key={`${item.label ?? "link"}-${index}-${item.text}`}
								className="grid grid-cols-[auto_minmax(0,1fr)]"
							>
								{item.label ? (
									<span className="whitespace-nowrap">{item.label}：</span>
								) : (
									<span aria-hidden="true" />
								)}
								{item.href ? (
									<a
										href={item.href}
										target={item.href.startsWith("http") ? "_blank" : undefined}
										rel={item.href.startsWith("http") ? "noreferrer" : undefined}
										className={`min-w-0 ${item.addressClassName ?? "hover:text-neutral-600"}`}
									>
										{item.text}
									</a>
								) : (
									<span className="min-w-0">{item.text}</span>
								)}
							</div>
						))}
					</div>
				)}
			</header>
		);
	};

	const renderSkills = (isLast: boolean) => {
		const visibleSkills = data.skills.filter(hasSkillContent);

		return (
			<section key="skills" {...getSectionProps("skills", isLast)}>
				{renderSectionHeader("skills")}
				<StructuredMarkdownBlocks text={formatSkillsAsMarkdown(visibleSkills)} />
			</section>
		);
	};

	const renderExperience = (isLast: boolean) => (
		<section key="experience" {...getSectionProps("experience", isLast)}>
			{renderSectionHeader("experience")}
			{data.experience.map((item) => {
				const date = sectionPreferences.experience.showDates
					? item.date.trim()
					: "";
				const role = sectionPreferences.experience.showRole
					? item.role.trim()
					: "";
				const roleInMiddle =
					role && sectionPreferences.experience.rolePosition === "middle";
				const roleOnTitle =
					role && sectionPreferences.experience.rolePosition === "title";
				const roleAtBottom =
					role && sectionPreferences.experience.rolePosition === "bottom";

				return (
					<div key={item.id} className="mb-[0.78em] last:mb-0">
						<div className="print-item-header grid grid-cols-[1.05fr_1.65fr_1.15fr] gap-x-[1.25em] px-[0.48em] leading-[1.42] text-neutral-900">
							<span>{date}</span>
							<span className="min-w-0">
								<span className="resume-item-title">{item.company}</span>
								{roleOnTitle && (
									<span className="ml-[0.55em] font-medium text-neutral-700">
										{role}
									</span>
								)}
							</span>
							<span
								className={`min-w-0 ${
									roleInMiddle ? "text-center" : "text-right"
								}`}
							>
								{roleInMiddle ? role : ""}
							</span>
						</div>
						{roleAtBottom && (
							<div className="mt-[0.18em] px-[0.48em] font-medium leading-[1.35] text-neutral-900">
								{role}
							</div>
						)}
						<StructuredMarkdownBlocks
							text={item.details}
							className="mt-[0.2em]"
						/>
					</div>
				);
			})}
		</section>
	);

	const renderProjectLinks = (project: Project) => {
		const links = [
			{ label: "项目", href: normalizeSafeUrl(project.link) },
			{ label: "源码", href: normalizeSafeUrl(project.source) },
		].filter((item): item is { label: string; href: string } => Boolean(item.href));

		if (links.length === 0) return null;

		return (
			<span className="flex flex-wrap justify-end gap-x-[0.65em]">
				{links.map((link) => (
					<a
						key={link.label}
						href={link.href}
						target="_blank"
						rel="noreferrer"
						className="border-b border-neutral-300 leading-[1.2] hover:text-neutral-600"
					>
						{link.label}
					</a>
				))}
			</span>
		);
	};

	const renderProjects = (isLast: boolean) => (
		<section key="projects" {...getSectionProps("projects", isLast)}>
			{renderSectionHeader("projects")}
			{data.projects.map((project) => {
				const showDate = sectionPreferences.projects.showDates;
				const showTags = sectionPreferences.projects.showTags;
				const role = sectionPreferences.projects.showRole
					? project.role.trim()
					: "";
				const roleInMiddle =
					role && sectionPreferences.projects.rolePosition === "middle";
				const roleOnTitle =
					role && sectionPreferences.projects.rolePosition === "title";
				const roleAtBottom =
					role && sectionPreferences.projects.rolePosition === "bottom";
				const links = renderProjectLinks(project);
				const headerClassName = roleInMiddle
					? "grid-cols-[1.05fr_1.7fr_0.95fr_1.12fr_0.72fr]"
					: "grid-cols-[1.05fr_2.1fr_1.35fr_0.72fr]";
				const tags = project.tags.trim();
				const tagNode =
					showTags && tags ? (
						sectionPreferences.projects.tagStyle === "text" ? (
							<span>{tags}</span>
						) : (
							<span className="inline-flex w-fit rounded-sm border border-neutral-300 px-[0.45em] py-[0.02em] text-neutral-700">
								{tags}
							</span>
						)
					) : null;

				return (
					<div key={project.id} className="mb-[0.82em] last:mb-0">
						<div
							className={`print-item-header grid ${headerClassName} gap-x-[1.1em] px-[0.48em] leading-[1.42] text-neutral-900`}
						>
							<span>{showDate ? project.date : ""}</span>
							<span className="min-w-0">
								<span className="resume-item-title">{project.name}</span>
								{roleOnTitle && (
									<span className="ml-[0.55em] font-medium text-neutral-700">
										{role}
									</span>
								)}
							</span>
							{roleInMiddle && (
								<span className="min-w-0 text-center">{role}</span>
							)}
							<span className="min-w-0">{tagNode}</span>
							<span className="min-w-0 text-right">{links}</span>
						</div>
						{roleAtBottom && (
							<div className="mt-[0.18em] px-[0.48em] font-medium leading-[1.35] text-neutral-900">
								{role}
							</div>
						)}
						<StructuredMarkdownBlocks
							text={project.description}
							className="mt-[0.2em]"
						/>
					</div>
				);
			})}
		</section>
	);

	const renderEducation = (isLast: boolean) => (
		<section key="education" {...getSectionProps("education", isLast)}>
			{renderSectionHeader("education")}
			{data.education.map((item: Education) => {
				const degree = splitEducationDegree(item.degree);
				return (
					<div
						key={item.id}
						className="print-edu-item grid grid-cols-[1.2fr_0.95fr_1.55fr_0.72fr] gap-x-[1.1em] px-[0.48em] leading-[1.42] text-neutral-900"
					>
						<span>
							{sectionPreferences.education.showDates ? item.date : ""}
						</span>
						<span className="resume-item-title min-w-0">{item.school}</span>
						<span className="min-w-0">{degree.major}</span>
						<span className="min-w-0 text-right">{degree.degree}</span>
					</div>
				);
			})}
		</section>
	);

	const renderSectionEntries = (
		key: "awards" | "campus",
		items: SectionEntry[],
		isLast: boolean,
	) => {
		const visibleItems = items.filter(hasSectionEntryContent);

		return (
			<section key={key} {...getSectionProps(key, isLast)}>
				{renderSectionHeader(key)}
				{visibleItems.map((item) => (
					<div key={item.id} className="mb-[0.78em] last:mb-0">
						<div className="print-item-header grid grid-cols-[1.1fr_2fr_1.35fr] gap-x-[1.2em] px-[0.48em] leading-[1.42] text-neutral-900">
							<span>{item.date}</span>
							<span className="resume-item-title min-w-0">{item.title}</span>
							<span className="min-w-0 text-right">
								{item.subtitle}
							</span>
						</div>
						<StructuredMarkdownBlocks
							text={item.details}
							className="mt-[0.2em]"
						/>
					</div>
				))}
			</section>
		);
	};

	const renderOther = (isLast: boolean) => {
		return (
			<section key="other" {...getSectionProps("other", isLast)}>
				{renderSectionHeader("other")}
				<StructuredMarkdownBlocks text={data.other} />
			</section>
		);
	};

	const renderCustomSection = (key: SectionKey, isLast: boolean) => {
		if (!isCustomSectionKey(key)) return null;
		const section = getCustomSection(key);
		if (!section) return null;

		return (
			<section key={key} {...getSectionProps(key, isLast)}>
				{renderSectionHeader(key)}
				<StructuredMarkdownBlocks text={section.content} />
			</section>
		);
	};

	const sectionRenderers: Record<
		StandardSectionKey,
		(isLast: boolean) => React.ReactElement
	> = {
		skills: renderSkills,
		experience: renderExperience,
		projects: renderProjects,
		education: renderEducation,
		awards: (isLast) => renderSectionEntries("awards", data.awards, isLast),
		campus: (isLast) => renderSectionEntries("campus", data.campus, isLast),
		other: renderOther,
	};

	return (
		<div
			ref={ref}
			className={`resume-content resume-print-root structured-resume w-full bg-white ${fontClass} text-[10.5pt] leading-[1.48] text-neutral-800`}
			data-page-margin={
				pageMarginMm === DEFAULT_RESUME_PAGE_MARGIN_MM
					? undefined
					: pageMarginMm
			}
			style={rootStyle}
		>
			<div ref={contentRef}>
				{renderHeader()}
				{visibleOrder.map((key, index) =>
					isCustomSectionKey(key)
						? renderCustomSection(key, index === visibleOrder.length - 1)
						: sectionRenderers[key](index === visibleOrder.length - 1),
				)}
			</div>
		</div>
	);
});

export default StructuredResumeLayout;
