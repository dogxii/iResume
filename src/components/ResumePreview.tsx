import {
	Calendar,
	ExternalLink,
	Github,
	Mail,
	MapPin,
	Phone,
	UserRound,
} from "lucide-react";
import React, { forwardRef } from "react";
import {
	DEFAULT_RESUME_PAGE_MARGIN_MM,
	normalizeResumeSectionPreferences,
	type ResumeFontSizePt,
	type ResumeItemTitleFontSizePx,
	type ResumePageMarginMm,
	type ResumeFontFamily,
	type ResumeLineHeight,
	type ResumeLinkStyle,
	type ResumeParagraphSpacingPx,
	type ResumeSectionPreferences,
	type ResumeSectionSpacing,
	type ResumeSectionTitleFontSizePx,
} from "../data/resumeStyle";
import { formatSkillsAsMarkdown, hasSkillContent } from "../data/resumeSkills";
import { isCustomSectionKey } from "../data/resumeData";
import { templateConfigs } from "../data/templateConfigs";
import type {
	Education,
	Experience,
	Project,
	ResumeData,
	ResumeEditableSectionKey,
	SectionEntry,
	SectionIconVisibility,
	SectionKey,
	StandardSectionKey,
} from "../types/resume";
import type { ContentDensity, TemplateId } from "../types/template";
import { renderMarkdownBlocks } from "../utils/markdown";
import { normalizeResumePhotoSrc } from "../utils/resumePhoto";
import { formatUrlForDisplay, normalizeSafeUrl } from "../utils/url";
import { resolvePreviewStyle } from "../templates/resolvePreviewStyle";
import { getResumeSectionIcon } from "./resumeSectionIcons";

export interface ResumePreviewProps {
	data: ResumeData;
	templateId?: TemplateId;
	accentColor?: string;
	fontSizePt?: ResumeFontSizePt;
	sectionTitleFontSizePx?: ResumeSectionTitleFontSizePx;
	itemTitleFontSizePx?: ResumeItemTitleFontSizePx;
	fontFamily?: ResumeFontFamily;
	pageMarginMm?: ResumePageMarginMm;
	lineHeight?: ResumeLineHeight;
	sectionSpacing?: ResumeSectionSpacing;
	paragraphSpacingPx?: ResumeParagraphSpacingPx;
	sectionIcons?: SectionIconVisibility;
	sectionPreferences?: ResumeSectionPreferences;
	minPageCount?: number;
	contentRef?: React.Ref<HTMLDivElement>;
	onSectionClick?: (section: ResumeEditableSectionKey) => void;
}

interface BannerLinkProps {
	href?: string;
	text: string;
	icon?: React.ReactNode;
	accentClass?: string;
	label: string;
	style: ResumeLinkStyle;
	showLabel: boolean;
}

const densityClasses: Record<
	ContentDensity,
	{
		header: string;
		section: string;
		item: string;
		project: string;
		skillRow: string;
		list: string;
	}
> = {
	standard: {
		header: "mb-5",
		section: "mb-5",
		item: "mb-4",
		project: "mb-3",
		skillRow: "mb-2",
		list: "space-y-1.5",
	},
	compact: {
		header: "mb-4",
		section: "mb-4",
		item: "mb-3",
		project: "mb-2.5",
		skillRow: "mb-1.5",
		list: "space-y-1",
	},
	airy: {
		header: "mb-6",
		section: "mb-6",
		item: "mb-5",
		project: "mb-4",
		skillRow: "mb-2.5",
		list: "space-y-2",
	},
};

const hasSectionEntryContent = (item: SectionEntry) =>
	item.title.trim() ||
	item.subtitle.trim() ||
	item.date.trim() ||
	item.details.trim();

const linkAddressClasses: Record<ResumeLinkStyle, string> = {
	text: "",
	highlighted: "border-b-[0.5px] border-[#cbd5e1] font-normal",
	blue: "font-normal text-blue-600 hover:text-blue-700",
};

const bannerLinkAddressClasses: Record<ResumeLinkStyle, string> = {
	text: "",
	highlighted: "border-b-[0.5px] border-[#cbd5e1]",
	blue: "text-sky-300 hover:text-sky-200",
};

const BannerLink = ({
	href,
	text,
	icon,
	accentClass,
	label,
	style,
	showLabel,
}: BannerLinkProps) => {
	const className = `flex items-center gap-1.5 text-slate-300 hover:opacity-80 ${
		style === "text" ? (accentClass ?? "hover:text-amber-300") : ""
	}`;
	const content = (
		<>
			{icon}
			{showLabel && (
				<strong className="font-semibold text-white">{label}</strong>
			)}
			<span className={bannerLinkAddressClasses[style]}>
				{text}
			</span>
		</>
	);

	return href ? (
		<a href={href} target="_blank" rel="noreferrer" className={className}>
			{content}
		</a>
	) : (
		<span className={className}>{content}</span>
	);
};

const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
	function ResumePreview(
		{
			data,
			templateId = "classic",
			accentColor,
			fontSizePt,
			sectionTitleFontSizePx,
			itemTitleFontSizePx,
			fontFamily,
			pageMarginMm,
			lineHeight,
			sectionSpacing,
			paragraphSpacingPx,
			sectionIcons,
			sectionPreferences: sectionPreferencesInput,
			minPageCount = 1,
			contentRef,
			onSectionClick,
		},
		ref,
	) {
		const template = templateConfigs[templateId];
		const c = template.colors;
		const {
			rootStyle: previewStyle,
			normalizedPageMargin,
			normalizedSectionSpacing,
		} = resolvePreviewStyle({
			accentColor,
			fontSizePt,
			sectionTitleFontSizePx,
			itemTitleFontSizePx,
			fontFamily,
			pageMarginMm,
			lineHeight,
			sectionSpacing,
			paragraphSpacingPx,
			minPageCount,
		});
		const customSectionSpacing = normalizedSectionSpacing;
		const density = template.contentDensity ?? "standard";
		const spacing = densityClasses[density];
		const experienceStyle = template.experienceStyle ?? "plain";
		const projectStyle = template.projectStyle ?? "plain";
		const sectionPreferences = normalizeResumeSectionPreferences(
			sectionPreferencesInput,
		);
		const isAtsTemplate = templateId === "ats";
		const isMinimalTemplate = templateId === "minimal";
		const tagStyle =
			sectionPreferences.projects.tagStyle === "text" ||
			template.tagStyle === "plain"
				? "plain"
				: template.tagStyle === "outline"
					? "outline"
					: "soft";
		const personalLinkStyle = sectionPreferences.personal.linkStyle;
		const showLinkLabels = sectionPreferences.personal.showLinkLabels;
		const styledLinks = personalLinkStyle !== "text";
		const fontClass = template.fontStyle === "serif" ? "font-serif" : "font-sans";
		const roleToneClass = c.body;
		const projectLinkToneClass = isAtsTemplate
			? "text-gray-500 hover:text-gray-700"
			: isMinimalTemplate
				? "text-zinc-500 hover:text-zinc-700"
				: `${c.link} hover:opacity-80`;
		const personalTitleToneClass = isMinimalTemplate ? c.body : c.primary;
		const contactIconToneClass = isMinimalTemplate ? c.muted : c.primary;
		const photoUrl = normalizeResumePhotoSrc(data.personal.photoUrl);
		const photoVisible = Boolean(
			photoUrl && sectionPreferences.personal.showPhoto,
		);
		const photoOnLeft = sectionPreferences.personal.photoPosition === "left";
		const photoSizeRatio = sectionPreferences.personal.photoSizeRatio;

		const hasPhone = data.personal.phone.trim();
		const hasEmail = data.personal.email.trim();
		const hasLocation = data.personal.location.trim();
		const hasAvailability = data.personal.availability.trim();
		const hasGithub = data.personal.github.trim();
		const hasWebsite = data.personal.website.trim();
		const hasContactInfo =
			hasPhone || hasEmail || hasLocation || hasAvailability;
		const hasLinks = hasGithub || hasWebsite;
		const githubHref = normalizeSafeUrl(data.personal.github);
		const websiteHref = normalizeSafeUrl(data.personal.website);

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
					return data.skills.length > 0 && data.skills.some(hasSkillContent);
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
					return data.other.trim().length > 0;
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
			className: `${isLast ? "" : spacing.section} ${
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

		const renderSectionTitle = (key: SectionKey) => {
			const title = getSectionTitle(key);
			if (!sectionIcons?.[key]) return title;

			return (
				<span className="inline-flex items-center gap-1.5">
					<span className={c.muted}>{getResumeSectionIcon(key)}</span>
					{title}
				</span>
			);
		};

		const renderSectionHeader = (key: SectionKey) => {
			const title = renderSectionTitle(key);
			switch (template.sectionHeaderStyle) {
				case "underline":
					return (
						<h2
							className={`resume-section-title text-lg font-bold ${c.heading} border-b-2 border-slate-100 mb-2 pb-1`}
						>
							{title}
						</h2>
					);

				case "left-border":
					return (
						<h2
							className={`resume-section-title text-lg font-bold ${c.heading} border-l-[3px] ${c.primaryBorder} pl-3 mb-3`}
						>
							{title}
						</h2>
					);

				case "pill":
					return (
						<h2 className="mb-3">
							<span
								className={`resume-section-title inline-block text-sm font-bold ${c.primary} ${c.primaryLight} px-3 py-1 rounded-md`}
							>
								{title}
							</span>
						</h2>
					);

				case "minimal":
					return (
						<h2
							className={`resume-section-title text-[11px] font-bold uppercase tracking-[0.15em] ${c.muted} border-b ${c.divider} mb-2 pb-1.5`}
						>
							{title}
						</h2>
					);

				case "dotted":
					return (
						<h2
							className={`resume-section-title text-base font-bold ${c.heading} border-b border-dotted ${c.divider} mb-2 pb-1`}
						>
							{title}
						</h2>
					);

				case "double-line":
					return (
						<div className="mb-3">
							<h2 className={`resume-section-title text-base font-bold ${c.heading} pb-1`}>
								{title}
							</h2>
							<div className="flex flex-col gap-px">
								<div className={`h-[2px] ${c.primaryBorder} border-t-2`} />
								<div className={`h-px ${c.divider} border-t`} />
							</div>
						</div>
					);

				default:
					return (
						<h2 className={`resume-section-title text-lg font-bold ${c.heading} mb-2`}>
							{title}
						</h2>
					);
			}
		};

		const renderDetailBlocks = (text: string) =>
			renderMarkdownBlocks(text, {
				listClassName: `resume-markdown-list list-disc list-outside ml-4 ${spacing.list} ${spacing.skillRow} text-sm ${c.body} last:mb-0`,
				paragraphClassName: `resume-paragraph-block ${spacing.skillRow} text-sm ${c.body} last:mb-0`,
			});

		const renderContactInfo = () => {
			if (!hasContactInfo) return null;

			const items: { icon: React.ReactNode; text: string; href?: string }[] = [];
			if (hasPhone) {
				items.push({ icon: <Phone size={13} />, text: data.personal.phone });
			}
			if (hasEmail) {
				items.push({
					icon: <Mail size={13} />,
					text: data.personal.email,
					href: normalizeSafeUrl(`mailto:${data.personal.email}`),
				});
			}
			if (hasLocation) {
				items.push({
					icon: <MapPin size={13} />,
					text: data.personal.location,
				});
			}
			if (hasAvailability) {
				items.push({
					icon: <Calendar size={13} />,
					text: data.personal.availability,
				});
			}

			switch (template.contactStyle) {
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
									{template.showContactIcons && item.icon}
								</div>
							))}
						</div>
					);

				case "inline-dots":
					return (
						<div
							className={`flex flex-wrap items-center gap-x-1.5 text-sm ${c.body}`}
						>
							{items.map((item, index) => (
								<React.Fragment key={item.text}>
									{index > 0 && (
										<span className={`${c.muted} select-none`}>·</span>
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
								</React.Fragment>
							))}
						</div>
					);

				case "inline-bar":
					return (
						<div
							className={`flex flex-wrap items-center gap-x-3 text-sm ${c.body}`}
						>
							{items.map((item, index) => (
								<React.Fragment key={item.text}>
									{index > 0 && (
										<span className={`${c.muted} select-none`}>|</span>
									)}
									<span className="flex items-center gap-1.5">
										{template.showContactIcons && (
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
									{template.showContactIcons && (
										<span className={contactIconToneClass}>{item.icon}</span>
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

		const renderLinks = () => {
			if (!hasLinks) return null;

			const isCentered =
				template.headerLayout === "centered" ||
				template.contactStyle === "centered-icons";
			const renderLink = (
				text: string,
				href: string | undefined,
				icon: React.ReactNode,
				label: string,
			) => {
				const className =
					personalLinkStyle === "text"
						? `flex items-center gap-1.5 ${c.body} ${c.primaryHover}`
						: `inline-flex max-w-full items-center gap-1.5 ${c.body} ${
								personalLinkStyle === "highlighted" ? "hover:opacity-70" : ""
							}`;
				const content = (
					<>
						{(styledLinks || template.showLinkIcons) && icon}
						{showLinkLabels && (
							<strong className="font-semibold">{label}</strong>
						)}
						<span className={linkAddressClasses[personalLinkStyle]}>
							{text}
						</span>
					</>
				);

				return href ? (
					<a href={href} target="_blank" rel="noreferrer" className={className}>
						{content}
					</a>
				) : (
					<span className={className}>{content}</span>
				);
			};

			return (
				<div
					className={`flex flex-wrap mt-3 text-sm font-medium ${
						styledLinks ? "gap-x-5 gap-y-1.5" : "gap-x-5 gap-y-1"
					} ${
						isCentered ? "justify-center" : ""
					}`}
				>
					{hasGithub &&
						renderLink(
							data.personal.github,
							githubHref,
							<Github size={14} className="shrink-0" />,
							"GitHub",
						)}
					{hasWebsite &&
						renderLink(
							data.personal.website,
							websiteHref,
							<UserRound size={14} className="shrink-0" />,
							"主页",
						)}
				</div>
			);
		};

		const renderBannerLinks = () => {
			if (!hasLinks) return null;

			return (
				<div
					className={`mt-3 flex flex-wrap text-sm font-medium ${
						styledLinks ? "gap-x-5 gap-y-1.5" : "gap-x-5 gap-y-1"
					}`}
				>
					{hasGithub && (
						<BannerLink
							href={githubHref}
							text={data.personal.github}
							icon={(styledLinks || template.showLinkIcons) && <Github size={14} />}
							accentClass={template.bannerAccent}
							label="GitHub"
							style={personalLinkStyle}
							showLabel={showLinkLabels}
						/>
					)}
					{hasWebsite && (
						<BannerLink
							href={websiteHref}
							text={data.personal.website}
							icon={(styledLinks || template.showLinkIcons) && <UserRound size={14} />}
							accentClass={template.bannerAccent}
							label="主页"
							style={personalLinkStyle}
							showLabel={showLinkLabels}
						/>
					)}
				</div>
			);
		};

		const renderProfilePhoto = (
			variant: "default" | "centered" | "banner" = "default",
		) => {
			if (!photoVisible) return null;

			const altText = data.personal.name.trim()
				? `${data.personal.name} 的照片`
				: "简历照片";
			const baseSize = variant === "centered" ? 80 : variant === "banner" ? 76 : 74;
			const photoSize = Math.round(baseSize * photoSizeRatio);
			const className =
				variant === "centered"
					? `mx-auto mb-3 rounded-md border ${c.divider} object-cover`
					: variant === "banner"
						? "rounded-md border-2 border-white/50 object-cover shadow-sm"
						: `rounded-md border ${c.divider} object-cover`;

			return (
				<img
					src={photoUrl}
					alt={altText}
					className={className}
					style={{ height: photoSize, width: photoSize }}
				/>
			);
		};

		const renderHeader = () => {
			const dividerClass =
				template.headerDivider && (hasContactInfo || hasLinks || photoVisible)
					? `border-b ${c.divider} pb-4 ${spacing.header}`
					: spacing.header;
			const emailHref = normalizeSafeUrl(`mailto:${data.personal.email}`);
			const hasHeaderColumns = Boolean(hasContactInfo || photoVisible);
			const hasRightAside = Boolean(
				hasContactInfo || (photoVisible && !photoOnLeft),
			);

			switch (template.headerLayout) {
				case "split":
					return (
						<header {...getPersonalSectionProps(dividerClass)}>
							<div
								className={`flex gap-6 ${
									hasHeaderColumns
										? "items-start justify-between"
										: "flex-col"
								}`}
							>
								{photoOnLeft && renderProfilePhoto()}
								<div className="min-w-0 flex-1">
									{data.personal.name.trim() && (
										<h1
											className={`text-3xl font-bold ${c.heading} tracking-tight`}
										>
											{data.personal.name}
										</h1>
									)}
									{data.personal.title.trim() && (
										<p className={`text-lg ${personalTitleToneClass} font-medium mt-1`}>
											{data.personal.title}
										</p>
									)}
									{template.contactStyle === "icons-right" && renderLinks()}
								</div>
								{hasRightAside && (
									<div className="flex shrink-0 items-start justify-end gap-4">
										{hasContactInfo && <div>{renderContactInfo()}</div>}
										{!photoOnLeft && renderProfilePhoto()}
									</div>
								)}
							</div>
							{template.contactStyle !== "icons-right" && renderLinks()}
						</header>
					);

				case "centered":
					if (photoVisible) {
						return (
							<header {...getPersonalSectionProps(dividerClass)}>
								<div
									className={`flex items-start gap-4 ${
										photoOnLeft ? "" : "flex-row-reverse"
									}`}
								>
									{renderProfilePhoto()}
									<div className="min-w-0 flex-1 text-center">
										{data.personal.name.trim() && (
											<h1
												className={`text-3xl font-bold ${c.heading} tracking-tight`}
											>
												{data.personal.name}
											</h1>
										)}
										{data.personal.title.trim() && (
											<p className={`text-base ${personalTitleToneClass} font-medium mt-1`}>
												{data.personal.title}
											</p>
										)}
										{hasContactInfo && (
											<div className="mt-3">{renderContactInfo()}</div>
										)}
										{renderLinks()}
									</div>
								</div>
							</header>
						);
					}

					return (
						<header {...getPersonalSectionProps(`text-center ${dividerClass}`)}>
							{data.personal.name.trim() && (
								<h1
									className={`text-3xl font-bold ${c.heading} tracking-tight`}
								>
									{data.personal.name}
								</h1>
							)}
							{data.personal.title.trim() && (
								<p className={`text-base ${personalTitleToneClass} font-medium mt-1`}>
									{data.personal.title}
								</p>
							)}
							{hasContactInfo && (
								<div className="mt-3">{renderContactInfo()}</div>
							)}
							{renderLinks()}
						</header>
					);

				case "accent":
					return (
						<header {...getPersonalSectionProps(spacing.header)}>
							<div className={`border-l-4 ${c.primaryBorder} pl-4`}>
								<div className="flex items-start justify-between gap-6">
									{photoOnLeft && renderProfilePhoto()}
									<div className="min-w-0 flex-1">
										{data.personal.name.trim() && (
											<h1
												className={`text-3xl font-bold ${c.heading} tracking-tight`}
											>
												{data.personal.name}
											</h1>
										)}
										{data.personal.title.trim() && (
											<p className={`text-base ${personalTitleToneClass} font-semibold mt-1`}>
												{data.personal.title}
											</p>
										)}
									</div>
									{hasRightAside && (
										<div className="flex shrink-0 items-start justify-end gap-4">
											{hasContactInfo && <div>{renderContactInfo()}</div>}
											{!photoOnLeft && renderProfilePhoto()}
										</div>
									)}
								</div>
							</div>
							{renderLinks()}
						</header>
					);

				case "banner":
					return (
						<header
							{...getPersonalSectionProps(
								`resume-banner-header ${spacing.header}`,
							)}
						>
							<div
								className={`resume-banner-inner ${template.bannerBg ?? "bg-slate-800"} text-white`}
							>
								<div className="flex items-start justify-between gap-6">
									{photoOnLeft && renderProfilePhoto("banner")}
									<div className="min-w-0 flex-1">
										{data.personal.name.trim() && (
											<h1 className="text-3xl font-bold tracking-tight">
												{data.personal.name}
											</h1>
										)}
										{data.personal.title.trim() && (
											<p
												className={`${template.bannerAccent ?? "text-amber-400"} font-medium mt-1 text-lg`}
											>
												{data.personal.title}
											</p>
										)}
										{renderBannerLinks()}
									</div>
									{hasRightAside && (
										<div className="flex shrink-0 items-start justify-end gap-4">
											{hasContactInfo && (
												<div className="space-y-1 text-right text-sm text-slate-300">
													{hasPhone && (
														<div className="flex items-center justify-end gap-2">
															<span>{data.personal.phone}</span>
															{template.showContactIcons && <Phone size={13} />}
														</div>
													)}
													{hasEmail && (
														<div className="flex items-center justify-end gap-2">
															{emailHref ? (
																<a
																	href={emailHref}
																	className={`${template.bannerAccent ?? "text-amber-400"} hover:opacity-80 hover:underline`}
																>
																	{data.personal.email}
																</a>
															) : (
																<span>{data.personal.email}</span>
															)}
															{template.showContactIcons && <Mail size={13} />}
														</div>
													)}
													{hasLocation && (
														<div className="flex items-center justify-end gap-2">
															<span>{data.personal.location}</span>
															{template.showContactIcons && <MapPin size={13} />}
														</div>
													)}
													{hasAvailability && (
														<div className="flex items-center justify-end gap-2">
															<span>{data.personal.availability}</span>
															{template.showContactIcons && <Calendar size={13} />}
														</div>
													)}
												</div>
											)}
											{!photoOnLeft && renderProfilePhoto("banner")}
										</div>
									)}
								</div>
							</div>
						</header>
					);

				default:
					return null;
			}
		};

		const renderSkills = (isLast: boolean) => {
			const visibleSkills = data.skills.filter(hasSkillContent);
			const skillsText = formatSkillsAsMarkdown(visibleSkills);

			return (
				<section key="skills" {...getSectionProps("skills", isLast)}>
					{renderSectionHeader("skills")}
					<div className="text-sm">
						{renderMarkdownBlocks(skillsText, {
							listClassName: `resume-markdown-list list-disc list-outside ml-4 ${spacing.list} text-sm ${c.body} last:mb-0`,
							paragraphClassName: `resume-paragraph-block text-sm ${c.body} last:mb-0`,
						})}
					</div>
				</section>
			);
		};

		const renderExperienceHeader = (exp: Experience, compact = false) => {
			const role = sectionPreferences.experience.showRole
				? exp.role.trim()
				: "";
			const roleInMiddle =
				role && sectionPreferences.experience.rolePosition === "middle";
			const roleOnTitle =
				role && sectionPreferences.experience.rolePosition === "title";
			const roleAtBottom =
				role && sectionPreferences.experience.rolePosition === "bottom";
			const date = sectionPreferences.experience.showDates
				? exp.date.trim()
				: "";
			const dateOnRight =
				date && sectionPreferences.experience.datePosition === "right";
			const dateBelow =
				date && sectionPreferences.experience.datePosition === "below";

			if (compact) {
				return (
					<div className="print-item-header mb-1">
						<div
							className={
								roleInMiddle
									? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-4"
									: "flex items-baseline justify-between gap-4"
							}
						>
							<div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
								<h3 className={`resume-item-title min-w-0 font-bold text-base ${c.heading}`}>
									{exp.company}
								</h3>
								{roleOnTitle && (
									<span className={`text-sm font-medium ${roleToneClass}`}>
										{role}
									</span>
								)}
							</div>
							{roleInMiddle && (
								<span
									className={`justify-self-center text-center text-sm font-medium ${roleToneClass}`}
								>
									{role}
								</span>
							)}
							{dateOnRight && (
								<div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
									<span className={`text-sm ${c.muted}`}>
										{date}
									</span>
								</div>
							)}
						</div>
						{dateBelow && (
							<div className={`mt-1 text-xs ${c.muted}`}>{date}</div>
						)}
						{roleAtBottom && (
							<div className={`mt-1 text-sm font-medium ${roleToneClass}`}>
								{role}
							</div>
						)}
					</div>
				);
			}

			return (
				<div className="print-item-header">
					<div
						className={`mb-1 ${
							roleInMiddle
								? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-4"
								: "flex items-baseline justify-between gap-4"
						}`}
					>
						<div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
							<h3 className={`resume-item-title min-w-0 font-bold text-base ${c.heading}`}>
								{exp.company}
							</h3>
							{roleOnTitle && (
								<span className={`text-sm font-medium ${roleToneClass}`}>
									{role}
								</span>
							)}
						</div>
						{roleInMiddle && (
							<span
								className={`justify-self-center text-center text-sm font-medium ${roleToneClass}`}
							>
								{role}
							</span>
						)}
						{dateOnRight && (
							<div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
								<span className={`text-sm ${c.muted}`}>{date}</span>
							</div>
						)}
					</div>
					{(roleAtBottom || dateBelow) && (
						<div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
							{roleAtBottom && (
								<span className={`font-medium ${roleToneClass}`}>{role}</span>
							)}
							{roleAtBottom && dateBelow && (
								<span className={`${c.muted} opacity-40`}>·</span>
							)}
							{dateBelow && <span className={c.muted}>{date}</span>}
						</div>
					)}
				</div>
			);
		};

		const renderExperienceDetails = (details: string) =>
			details.trim() ? <div>{renderDetailBlocks(details)}</div> : null;

		const renderExperience = (isLast: boolean) => (
			<section key="experience" {...getSectionProps("experience", isLast)}>
				{renderSectionHeader("experience")}
				{data.experience.map((exp) => {
					const compact = experienceStyle === "compact";
					const timeline = experienceStyle === "timeline";

					return (
						<div
							key={exp.id}
							className={`${
								timeline
									? `print-timeline-item relative border-l ${c.divider} pl-4`
									: ""
							} ${spacing.item} last:mb-0`}
						>
							{timeline && (
								<span
									className={`print-timeline-dot absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-white ${c.primaryBorder}`}
								/>
							)}
							{renderExperienceHeader(exp, compact)}
							{renderExperienceDetails(exp.details)}
						</div>
					);
				})}
			</section>
		);

		const renderProjectTag = (tags: string) => {
			const text = tags.trim();
			if (!sectionPreferences.projects.showTags || !text) return null;

			if (tagStyle === "plain") {
				return <span className={`text-xs ${c.muted}`}>{text}</span>;
			}

			const tagClassName =
				tagStyle === "outline"
					? "border-slate-200 bg-white text-slate-600"
					: "border-slate-200 bg-slate-50 text-slate-600";

			return (
				<span
					className={`rounded border px-2 py-0.5 text-xs ${tagClassName}`}
				>
					{text}
				</span>
			);
		};

		const renderProjectLinks = (
			project: Project,
			className = "flex gap-3 text-xs",
		) => {
			const linksDisplay = sectionPreferences.projects.linksDisplay;
			const showUnderline = sectionPreferences.projects.showLinkUnderline;
			const showIcons = sectionPreferences.projects.showLinkIcons;
			const links = [
				{
					key: "demo",
					label: "Demo",
					raw: project.link,
					href: normalizeSafeUrl(project.link),
					icon: <ExternalLink size={10} />,
				},
				{
					key: "source",
					label: "Code",
					raw: project.source,
					href: normalizeSafeUrl(project.source),
					icon: <Github size={10} />,
				},
			].filter(
				(item): item is {
					key: string;
					label: string;
					raw: string;
					href: string;
					icon: React.ReactElement;
				} => Boolean(item.href),
			);

			if (links.length === 0) return null;

			const linkClassName = `inline-flex min-w-0 items-center ${projectLinkToneClass} ${
				showUnderline
					? "border-b border-slate-300 leading-[1.2] hover:border-slate-500"
					: "hover:opacity-75"
			} ${showIcons ? "gap-1" : ""}`;

			return (
				<div className={className}>
					{links.map((link) => (
						<a
							key={link.key}
							href={link.href}
							target="_blank"
							rel="noreferrer"
							className={linkClassName}
						>
							{showIcons && <span className="shrink-0">{link.icon}</span>}
							<span
								className={`min-w-0 ${
									linksDisplay === "label" ? "" : "break-all"
								}`}
							>
								{linksDisplay === "label"
									? link.label
									: formatUrlForDisplay(link.raw, link.href)}
							</span>
						</a>
					))}
				</div>
			);
		};

		const renderProject = (proj: Project) => {
			const boxed = projectStyle === "boxed";
			const compact = projectStyle === "compact";
			const timeline = projectStyle === "timeline";
			const date = sectionPreferences.projects.showDates
				? proj.date.trim()
				: "";
			const role = sectionPreferences.projects.showRole
				? proj.role.trim()
				: "";
			const roleInMiddle =
				role && sectionPreferences.projects.rolePosition === "middle";
			const roleOnTitle =
				role && sectionPreferences.projects.rolePosition === "title";
			const roleAtBottom =
				role && sectionPreferences.projects.rolePosition === "bottom";
			const dateOnRight =
				date && sectionPreferences.projects.datePosition === "right";
			const dateBelow =
				date && sectionPreferences.projects.datePosition === "below";
			const tagOnTitle =
				sectionPreferences.projects.tagPosition === "title"
					? renderProjectTag(proj.tags)
					: null;
			const tagBelow =
				sectionPreferences.projects.tagPosition === "below"
					? renderProjectTag(proj.tags)
					: null;
			const linksOnTitle =
				sectionPreferences.projects.linksPosition === "title"
					? renderProjectLinks(proj, "flex min-w-0 flex-wrap gap-3 text-xs")
					: null;
			const linksBelow =
				sectionPreferences.projects.linksPosition === "below"
					? renderProjectLinks(proj)
					: null;
			const content = (
				<>
					<div className="print-item-header mb-1">
						<div
							className={
								roleInMiddle
									? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-4"
									: "flex items-baseline justify-between gap-4"
							}
						>
							<div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
								<h3 className={`resume-item-title font-bold text-base ${c.heading}`}>
									{proj.name}
								</h3>
								{roleOnTitle && (
									<span className={`text-sm font-medium ${roleToneClass}`}>
										{role}
									</span>
								)}
								{tagOnTitle}
								{linksOnTitle}
							</div>
							{roleInMiddle && (
								<span
									className={`justify-self-center text-center text-sm font-medium ${roleToneClass}`}
								>
									{role}
								</span>
							)}
							{dateOnRight && (
								<div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
									<span className={`text-sm ${c.muted}`}>{date}</span>
								</div>
							)}
						</div>
						{(roleAtBottom || dateBelow || tagBelow || linksBelow) && (
							<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
								{roleAtBottom && (
									<span className={`text-sm font-medium ${roleToneClass}`}>
										{role}
									</span>
								)}
								{dateBelow && (
									<span className={`text-xs ${c.muted}`}>{date}</span>
								)}
								{tagBelow}
								{linksBelow}
							</div>
						)}
					</div>
					{proj.description.trim() && (
						<div>
							{renderMarkdownBlocks(proj.description, {
								listClassName: `resume-markdown-list list-disc list-outside ml-4 ${
									compact ? "space-y-1" : spacing.list
								} ${spacing.skillRow} text-sm ${c.body} last:mb-0`,
								paragraphClassName: `resume-paragraph-block ${spacing.skillRow} text-sm ${c.body} last:mb-0`,
							})}
						</div>
					)}
				</>
			);

			return (
				<div
					key={proj.id}
					className={`${
						timeline
							? `print-timeline-item relative border-l ${c.divider} pl-4`
							: boxed
								? `print-card-item rounded-md border ${c.divider} bg-slate-50/40 px-3 py-2.5`
								: ""
					} ${spacing.project} last:mb-0`}
				>
					{timeline && (
						<span
							className={`print-timeline-dot absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-white ${c.primaryBorder}`}
						/>
					)}
					{content}
				</div>
			);
		};

		const renderProjects = (isLast: boolean) => (
			<section key="projects" {...getSectionProps("projects", isLast)}>
				{renderSectionHeader("projects")}
				{data.projects.map(renderProject)}
			</section>
		);

		const renderEducation = (isLast: boolean) => (
			<section key="education" {...getSectionProps("education", isLast)}>
				{renderSectionHeader("education")}
				{data.education.map((edu: Education) => (
					<div
						key={edu.id}
						className={`print-edu-item flex justify-between gap-4 text-sm ${spacing.skillRow} last:mb-0`}
					>
						<div>
							{edu.degree.trim() && (
								<span className={`font-bold ${c.heading}`}>{edu.degree}</span>
							)}
							{edu.degree.trim() && edu.school.trim() && (
								<span className={`mx-2 ${c.muted} opacity-40`}>|</span>
							)}
							{edu.school.trim() && (
								<span className={c.body}>{edu.school}</span>
							)}
						</div>
						{sectionPreferences.education.showDates && edu.date.trim() && (
							<span className={c.muted}>{edu.date}</span>
						)}
					</div>
				))}
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
						<div key={item.id} className={`${spacing.item} last:mb-0`}>
							<div className="print-item-header mb-1">
								<div className="flex items-baseline justify-between gap-4">
									<div className="min-w-0">
										{item.title.trim() && (
											<h3 className={`resume-item-title font-bold text-base ${c.heading}`}>
												{item.title}
											</h3>
										)}
										{item.subtitle.trim() && (
											<div className={`text-sm font-medium ${c.primary}`}>
												{item.subtitle}
											</div>
										)}
									</div>
									{item.date.trim() && (
										<span className={`shrink-0 text-sm ${c.muted}`}>
											{item.date}
										</span>
									)}
								</div>
							</div>
							{item.details.trim() && (
								<div>{renderDetailBlocks(item.details)}</div>
							)}
						</div>
					))}
				</section>
			);
		};

		const renderAwards = (isLast: boolean) =>
			renderSectionEntries("awards", data.awards, isLast);

		const renderCampus = (isLast: boolean) =>
			renderSectionEntries("campus", data.campus, isLast);

		const renderOther = (isLast: boolean) => (
			<section key="other" {...getSectionProps("other", isLast)}>
				{renderSectionHeader("other")}
				<div>{renderDetailBlocks(data.other)}</div>
			</section>
		);

		const renderCustomSection = (key: SectionKey, isLast: boolean) => {
			if (!isCustomSectionKey(key)) return null;
			const section = getCustomSection(key);
			if (!section) return null;

			return (
				<section key={key} {...getSectionProps(key, isLast)}>
					{renderSectionHeader(key)}
					<div>{renderDetailBlocks(section.content)}</div>
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
			awards: renderAwards,
			campus: renderCampus,
			other: renderOther,
		};

		return (
			<div
				ref={ref}
				className={`resume-content resume-print-root w-full bg-white ${c.body} ${fontClass} leading-relaxed text-[10.5pt]`}
				data-page-margin={
					normalizedPageMargin === DEFAULT_RESUME_PAGE_MARGIN_MM
						? undefined
						: normalizedPageMargin
				}
				style={previewStyle}
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
	},
);

export default ResumePreview;
