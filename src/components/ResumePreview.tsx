import {
	Award,
	Briefcase,
	Calendar,
	Code,
	ExternalLink,
	Folder,
	Github,
	GraduationCap,
	Mail,
	MapPin,
	MoreHorizontal,
	Phone,
	School,
	UserRound,
} from "lucide-react";
import React, { forwardRef } from "react";
import {
	DEFAULT_RESUME_FONT_SIZE_PT,
	DEFAULT_RESUME_PAGE_MARGIN_MM,
	normalizeResumeSectionPreferences,
	normalizeResumeFontSize,
	normalizeResumePageMargin,
	normalizeResumeFontFamily,
	getResumeFontFamilyCss,
	type ResumeFontSizePt,
	type ResumePageMarginMm,
	type ResumeFontFamily,
	type ResumeLinkStyle,
	type ResumeSectionPreferences,
} from "../data/resumeStyle";
import { themes } from "../data/themes";
import type {
	Education,
	Experience,
	Project,
	ResumeData,
	SectionEntry,
	SectionIconVisibility,
	SectionKey,
	SkillItem,
} from "../types/resume";
import type { ContentDensity, ThemeId } from "../types/theme";
import { parseInline, renderMarkdownList } from "../utils/markdown";
import { normalizeResumePhotoSrc } from "../utils/resumePhoto";
import { normalizeSafeUrl } from "../utils/url";

interface ResumePreviewProps {
	data: ResumeData;
	themeId?: ThemeId;
	fontSizePt?: ResumeFontSizePt;
	fontFamily?: ResumeFontFamily;
	pageMarginMm?: ResumePageMarginMm;
	sectionIcons?: SectionIconVisibility;
	sectionPreferences?: ResumeSectionPreferences;
	minPageCount?: number;
	contentRef?: React.Ref<HTMLDivElement>;
	onSectionClick?: (section: SectionKey) => void;
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

const A4_HEIGHT_MM = 297;

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

const sectionIconNodes: Record<SectionKey, React.ReactNode> = {
	skills: <Code size={13} />,
	experience: <Briefcase size={13} />,
	projects: <Folder size={13} />,
	education: <GraduationCap size={13} />,
	awards: <Award size={13} />,
	campus: <School size={13} />,
	other: <MoreHorizontal size={13} />,
};

const splitSkillContent = (content: string) =>
	content
		.split(/[,，、;；|]/)
		.map((item) => item.trim())
		.filter(Boolean);

const hasSkillContent = (skill: SkillItem) =>
	skill.label.trim() || skill.content.trim();

const hasSectionEntryContent = (item: SectionEntry) =>
	item.title.trim() ||
	item.subtitle.trim() ||
	item.date.trim() ||
	item.details.trim();

const getSectionEntryDetailSummary = (details: string) =>
	details
		.split("\n")
		.map((line) =>
			line
				.trim()
				.replace(/^[-*•]\s*/, "")
				.replace(/^\d+[.)、]\s*/, ""),
		)
		.filter(Boolean)
		.join("；");

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
			themeId = "classic",
			fontSizePt,
			fontFamily,
			pageMarginMm,
			sectionIcons,
			sectionPreferences: sectionPreferencesInput,
			minPageCount = 1,
			contentRef,
			onSectionClick,
		},
		ref,
	) {
		const theme = themes[themeId];
		const c = theme.colors;
		const normalizedFontSize = normalizeResumeFontSize(fontSizePt);
		const normalizedPageMargin = normalizeResumePageMargin(pageMarginMm);
		const isDefaultFontSize =
			normalizedFontSize === DEFAULT_RESUME_FONT_SIZE_PT;
		const density = theme.contentDensity ?? "standard";
		const spacing = densityClasses[density];
		const skillLayout = theme.skillLayout ?? "rows";
		const experienceStyle = theme.experienceStyle ?? "plain";
		const projectStyle = theme.projectStyle ?? "plain";
		const tagStyle = theme.tagStyle ?? "soft";
		const sectionPreferences = normalizeResumeSectionPreferences(
			sectionPreferencesInput,
		);
		const personalLinkStyle = sectionPreferences.personal.linkStyle;
		const showLinkLabels = sectionPreferences.personal.showLinkLabels;
		const styledLinks = personalLinkStyle !== "text";
		const minHeightMm = Math.max(1, minPageCount) * A4_HEIGHT_MM;
		const normalizedFontFamily = normalizeResumeFontFamily(fontFamily);
		const fontFamilyCss = getResumeFontFamilyCss(normalizedFontFamily);
		const fontClass = theme.fontStyle === "serif" ? "font-serif" : "font-sans";
		const photoUrl = normalizeResumePhotoSrc(data.personal.photoUrl);
		const photoVisible = Boolean(
			photoUrl && sectionPreferences.personal.showPhoto,
		);
		const photoOnLeft = sectionPreferences.personal.photoPosition === "left";
		const photoSizeRatio = sectionPreferences.personal.photoSizeRatio;

		const previewStyle = {
			"--resume-page-margin": `${normalizedPageMargin}mm`,
			minHeight: `${minHeightMm}mm`,
			padding: `${normalizedPageMargin}mm`,
			...(isDefaultFontSize
				? {}
				: {
						"--resume-font-scale":
							normalizedFontSize / DEFAULT_RESUME_FONT_SIZE_PT,
					}),
			...(fontFamilyCss ? { fontFamily: fontFamilyCss } : {}),
		} as React.CSSProperties;

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

		const sectionVisible: Record<SectionKey, boolean> = {
			skills:
				data.sectionVisibility.skills &&
				data.skills.length > 0 &&
				data.skills.some((skill) => hasSkillContent(skill)),
			experience: data.sectionVisibility.experience && data.experience.length > 0,
			projects: data.sectionVisibility.projects && data.projects.length > 0,
			education: data.sectionVisibility.education && data.education.length > 0,
			awards:
				data.sectionVisibility.awards &&
				data.awards.some((item) => hasSectionEntryContent(item)),
			campus:
				data.sectionVisibility.campus &&
				data.campus.some((item) => hasSectionEntryContent(item)),
			other: data.sectionVisibility.other && data.other.trim().length > 0,
		};

		const visibleOrder = data.sectionOrder.filter((key) => sectionVisible[key]);

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
			...(onSectionClick
				? {
						"data-preview-section": key,
						title: `点击编辑${data.sectionTitles[key]}`,
						onClick: (event) => {
							if (shouldIgnoreSectionClick(event)) return;
							onSectionClick(key);
						},
					}
				: {}),
		});

		const renderSectionTitle = (key: SectionKey) => {
			const title = data.sectionTitles[key];
			if (!sectionIcons?.[key]) return title;

			return (
				<span className="inline-flex items-center gap-1.5">
					<span className={c.muted}>{sectionIconNodes[key]}</span>
					{title}
				</span>
			);
		};

		const renderSectionHeader = (key: SectionKey) => {
			const title = renderSectionTitle(key);
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

				case "double-line":
					return (
						<div className="mb-3">
							<h2 className={`text-base font-bold ${c.heading} pb-1`}>
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
						<h2 className={`text-lg font-bold ${c.heading} mb-2`}>
							{title}
						</h2>
					);
			}
		};

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

		const renderLinks = () => {
			if (!hasLinks) return null;

			const isCentered =
				theme.headerLayout === "centered" ||
				theme.contactStyle === "centered-icons";
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
						{(styledLinks || theme.showLinkIcons) && icon}
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
							icon={(styledLinks || theme.showLinkIcons) && <Github size={14} />}
							accentClass={theme.bannerAccent}
							label="GitHub"
							style={personalLinkStyle}
							showLabel={showLinkLabels}
						/>
					)}
					{hasWebsite && (
						<BannerLink
							href={websiteHref}
							text={data.personal.website}
							icon={(styledLinks || theme.showLinkIcons) && <UserRound size={14} />}
							accentClass={theme.bannerAccent}
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
				theme.headerDivider && (hasContactInfo || hasLinks || photoVisible)
					? `border-b ${c.divider} pb-4 ${spacing.header}`
					: spacing.header;
			const emailHref = normalizeSafeUrl(`mailto:${data.personal.email}`);
			const hasHeaderColumns = Boolean(hasContactInfo || photoVisible);
			const hasRightAside = Boolean(
				hasContactInfo || (photoVisible && !photoOnLeft),
			);

			switch (theme.headerLayout) {
				case "split":
					return (
						<header className={dividerClass}>
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
										<p className={`text-lg ${c.primary} font-medium mt-1`}>
											{data.personal.title}
										</p>
									)}
									{theme.contactStyle === "icons-right" && renderLinks()}
								</div>
								{hasRightAside && (
									<div className="flex shrink-0 items-start justify-end gap-4">
										{hasContactInfo && <div>{renderContactInfo()}</div>}
										{!photoOnLeft && renderProfilePhoto()}
									</div>
								)}
							</div>
							{theme.contactStyle !== "icons-right" && renderLinks()}
						</header>
					);

				case "centered":
					if (photoVisible) {
						return (
							<header className={dividerClass}>
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
											<p className={`text-base ${c.primary} font-medium mt-1`}>
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
						<header className={`text-center ${dividerClass}`}>
							{data.personal.name.trim() && (
								<h1
									className={`text-3xl font-bold ${c.heading} tracking-tight`}
								>
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

				case "accent":
					return (
						<header className={spacing.header}>
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
											<p className={`text-base ${c.primary} font-semibold mt-1`}>
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
						<header className={`resume-banner-header ${spacing.header}`}>
							<div
								className={`resume-banner-inner ${theme.bannerBg ?? "bg-slate-800"} text-white`}
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
												className={`${theme.bannerAccent ?? "text-amber-400"} font-medium mt-1 text-lg`}
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
															{theme.showContactIcons && <Phone size={13} />}
														</div>
													)}
													{hasEmail && (
														<div className="flex items-center justify-end gap-2">
															{emailHref ? (
																<a
																	href={emailHref}
																	className={`${theme.bannerAccent ?? "text-amber-400"} hover:opacity-80 hover:underline`}
																>
																	{data.personal.email}
																</a>
															) : (
																<span>{data.personal.email}</span>
															)}
															{theme.showContactIcons && <Mail size={13} />}
														</div>
													)}
													{hasLocation && (
														<div className="flex items-center justify-end gap-2">
															<span>{data.personal.location}</span>
															{theme.showContactIcons && <MapPin size={13} />}
														</div>
													)}
													{hasAvailability && (
														<div className="flex items-center justify-end gap-2">
															<span>{data.personal.availability}</span>
															{theme.showContactIcons && <Calendar size={13} />}
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

		const renderSkillContent = (skill: SkillItem) => {
			const useChips =
				sectionPreferences.skills.contentStyle === "chips" ||
				(sectionPreferences.skills.contentStyle === "theme" &&
					skillLayout === "chips");

			if (!useChips) return parseInline(skill.content);

			const parts = splitSkillContent(skill.content);
			if (parts.length <= 1) return parseInline(skill.content);

			return (
				<span className="inline-flex flex-wrap gap-x-1.5 gap-y-1 align-top">
					{parts.map((part) => (
						<span
							key={part}
							className={`rounded-sm border border-current/15 bg-transparent px-1.5 py-[1px] text-[11px] leading-5 ${c.tagText}`}
						>
							{parseInline(part)}
						</span>
					))}
				</span>
			);
		};

		const renderSkills = (isLast: boolean) => {
			const visibleSkills = data.skills.filter(hasSkillContent);
			const showSkillLabels = sectionPreferences.skills.showLabels;

			if (!showSkillLabels) {
				return (
					<section key="skills" {...getSectionProps("skills", isLast)}>
						{renderSectionHeader("skills")}
						<div
							className={`text-sm ${
								skillLayout === "columns" ? "grid grid-cols-2 gap-x-5" : ""
							}`}
						>
							{visibleSkills.map((skill) => (
								<div
									key={skill.id}
									className={`print-skill-row min-w-0 ${spacing.skillRow} last:mb-0`}
								>
									<span className={c.body}>{renderSkillContent(skill)}</span>
								</div>
							))}
						</div>
					</section>
				);
			}

			if (skillLayout === "columns") {
				return (
					<section key="skills" {...getSectionProps("skills", isLast)}>
						{renderSectionHeader("skills")}
						<div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
							{visibleSkills.map((skill) => (
								<div key={skill.id} className="print-skill-row min-w-0">
									<div className={`font-semibold ${c.heading}`}>
										{skill.label}
									</div>
									<div className={c.body}>{renderSkillContent(skill)}</div>
								</div>
							))}
						</div>
					</section>
				);
			}

			if (skillLayout === "inline") {
				return (
					<section key="skills" {...getSectionProps("skills", isLast)}>
						{renderSectionHeader("skills")}
						<div className="text-sm">
							{visibleSkills.map((skill) => (
								<div
									key={skill.id}
									className={`print-skill-row flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${spacing.skillRow} last:mb-0`}
								>
									<span className={`font-semibold ${c.heading}`}>
										{skill.label}
									</span>
									<span className={c.body}>{renderSkillContent(skill)}</span>
								</div>
							))}
						</div>
					</section>
				);
			}

			return (
				<section key="skills" {...getSectionProps("skills", isLast)}>
					{renderSectionHeader("skills")}
					<div className="text-sm">
						{visibleSkills.map((skill) => (
							<div
								key={skill.id}
								className={`print-skill-row grid grid-cols-[100px_1fr] gap-y-0 ${spacing.skillRow} last:mb-0`}
							>
								<span className={`font-semibold ${c.heading}`}>
									{skill.label}
								</span>
								<span className={c.body}>{renderSkillContent(skill)}</span>
							</div>
						))}
					</div>
				</section>
			);
		};

		const renderExperienceHeader = (exp: Experience, compact = false) => {
			const role = sectionPreferences.experience.showRole
				? exp.role.trim()
				: "";
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
						<div className="flex justify-between items-baseline gap-4">
							<h3 className={`font-bold text-base ${c.heading}`}>
								{exp.company}
								{role && (
									<span className={`font-medium ${c.primary}`}>
										{" "}
										· {role}
									</span>
								)}
							</h3>
							{dateOnRight && (
								<span className={`text-sm ${c.muted} shrink-0`}>
									{date}
								</span>
							)}
						</div>
						{dateBelow && (
							<div className={`mt-1 text-xs ${c.muted}`}>{date}</div>
						)}
					</div>
				);
			}

			return (
				<div className="print-item-header">
					<div className="flex justify-between items-baseline mb-1 gap-4">
						<h3 className={`font-bold text-base ${c.heading}`}>
							{exp.company}
						</h3>
						{dateOnRight && (
							<span className={`text-sm ${c.muted} shrink-0`}>
								{date}
							</span>
						)}
					</div>
					{(role || dateBelow) && (
						<div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
							{role && (
								<span className={`font-medium ${c.primary}`}>{role}</span>
							)}
							{role && dateBelow && (
								<span className={`${c.muted} opacity-40`}>·</span>
							)}
							{dateBelow && <span className={c.muted}>{date}</span>}
						</div>
					)}
				</div>
			);
		};

		const renderExperienceDetails = (details: string) =>
			details.trim() ? (
				<ul
					className={`list-disc list-outside ml-4 ${spacing.list} text-sm ${c.body}`}
				>
					{renderMarkdownList(details)}
				</ul>
			) : null;

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

			return (
				<span
					className={`text-xs px-2 py-0.5 rounded border ${
						tagStyle === "outline" ? `bg-white ${c.tagText}` : `${c.tagBg} ${c.tagText}`
					} ${c.tagBorder}`}
				>
					{text}
				</span>
			);
		};

		const renderProjectLinks = (
			demoHref: string | undefined,
			sourceHref: string | undefined,
			className = "flex gap-3 text-xs",
		) => {
			if (!demoHref && !sourceHref) return null;

			return (
				<div className={className}>
					{demoHref && (
						<a
							href={demoHref}
							target="_blank"
							rel="noreferrer"
							className={`flex items-center gap-1 ${c.link} hover:underline`}
						>
							<ExternalLink size={10} /> Demo
						</a>
					)}
					{sourceHref && (
						<a
							href={sourceHref}
							target="_blank"
							rel="noreferrer"
							className={`flex items-center gap-1 ${c.link} hover:underline`}
						>
							<Github size={10} /> Code
						</a>
					)}
				</div>
			);
		};

		const renderProject = (proj: Project) => {
			const demoHref = normalizeSafeUrl(proj.link);
			const sourceHref = normalizeSafeUrl(proj.source);
			const boxed = projectStyle === "boxed";
			const compact = projectStyle === "compact";
			const timeline = projectStyle === "timeline";
			const date = sectionPreferences.projects.showDates
				? proj.date.trim()
				: "";
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
					? renderProjectLinks(demoHref, sourceHref, "flex gap-3 text-xs")
					: null;
			const linksBelow =
				sectionPreferences.projects.linksPosition === "below"
					? renderProjectLinks(demoHref, sourceHref)
					: null;
			const content = (
				<>
					<div className="print-item-header mb-1">
						<div className="flex items-baseline justify-between gap-4">
							<div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
								<h3 className={`font-bold text-base ${c.heading}`}>
									{proj.name}
								</h3>
								{tagOnTitle}
								{linksOnTitle}
							</div>
							{dateOnRight && (
								<div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
									<span className={`text-sm ${c.muted}`}>{date}</span>
								</div>
							)}
						</div>
						{(dateBelow || tagBelow || linksBelow) && (
							<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
								{dateBelow && (
									<span className={`text-xs ${c.muted}`}>{date}</span>
								)}
								{tagBelow}
								{linksBelow}
							</div>
						)}
					</div>
					{proj.description.trim() && (
						<ul
							className={`list-disc list-outside ml-4 ${
								compact ? "space-y-1" : spacing.list
							} text-sm ${c.body}`}
						>
							{renderMarkdownList(proj.description)}
						</ul>
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
			const displayStyle = sectionPreferences[key].displayStyle;

			if (displayStyle === "list") {
				return (
					<section key={key} {...getSectionProps(key, isLast)}>
						{renderSectionHeader(key)}
						<ul
							className={`list-disc list-outside ml-4 ${spacing.list} text-sm ${c.body}`}
						>
							{visibleItems.map((item) => {
								const title = item.title.trim();
								const meta = [item.subtitle.trim(), item.date.trim()]
									.filter(Boolean)
									.join(" · ");
								const details = getSectionEntryDetailSummary(item.details);

								return (
									<li key={item.id}>
										{title && (
											<span className={`font-semibold ${c.heading}`}>
												{parseInline(title)}
											</span>
										)}
										{meta && (
											<span className={c.muted}>
												{title ? " · " : ""}
												{parseInline(meta)}
											</span>
										)}
										{details && (
											<span>
												{title || meta ? "：" : ""}
												{parseInline(details)}
											</span>
										)}
									</li>
								);
							})}
						</ul>
					</section>
				);
			}

			return (
				<section key={key} {...getSectionProps(key, isLast)}>
					{renderSectionHeader(key)}
					{visibleItems.map((item) => (
						<div key={item.id} className={`${spacing.item} last:mb-0`}>
							<div className="print-item-header mb-1">
								<div className="flex items-baseline justify-between gap-4">
									<div className="min-w-0">
										{item.title.trim() && (
											<h3 className={`font-bold text-base ${c.heading}`}>
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
								<ul
									className={`list-disc list-outside ml-4 ${spacing.list} text-sm ${c.body}`}
								>
									{renderMarkdownList(item.details)}
								</ul>
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

		const renderOtherLines = () =>
			data.other
				.split("\n")
				.filter((line) => line.trim())
				.map((line, index) => {
					const content = line.replace(/^-\s*/, "");
					return (
						<div
							key={`${index}-${line.slice(0, 20)}`}
							className={`${spacing.skillRow} last:mb-0`}
						>
							{parseInline(content)}
						</div>
					);
				});

		const renderOther = (isLast: boolean) => (
			<section key="other" {...getSectionProps("other", isLast)}>
				{renderSectionHeader("other")}
				{sectionPreferences.other.listStyle === "plain" ? (
					<div className={`text-sm ${c.body}`}>{renderOtherLines()}</div>
				) : (
					<ul
						className={`list-disc list-outside ml-4 ${spacing.list} text-sm ${c.body}`}
					>
						{renderMarkdownList(data.other)}
					</ul>
				)}
			</section>
		);

		const sectionRenderers: Record<
			SectionKey,
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
				data-font-scaled={isDefaultFontSize ? undefined : "true"}
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
						sectionRenderers[key](index === visibleOrder.length - 1),
					)}
				</div>
			</div>
		);
	},
);

export default ResumePreview;
