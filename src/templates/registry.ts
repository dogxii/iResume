import type { ForwardRefExoticComponent, RefAttributes } from "react";
import ResumePreview, {
	type ResumePreviewProps,
} from "../components/ResumePreview";
import { templateIds, templateConfigs } from "../data/templateConfigs";
import type { TemplateConfig, TemplateId } from "../types/template";
import StructuredResumeTemplate from "./structured/StructuredResumeTemplate";

export type ResumeTemplateRenderer = ForwardRefExoticComponent<
	ResumePreviewProps & RefAttributes<HTMLDivElement>
>;

export interface ResumeTemplateDefinition {
	id: TemplateId;
	config: TemplateConfig;
	Renderer: ResumeTemplateRenderer;
}

const renderers: Record<TemplateId, ResumeTemplateRenderer> = {
	classic: ResumePreview,
	minimal: ResumePreview,
	outline: ResumePreview,
	ats: ResumePreview,
	structured: StructuredResumeTemplate,
	timeline: ResumePreview,
	focus: ResumePreview,
	executive: ResumePreview,
	fresh: ResumePreview,
	elegant: ResumePreview,
	rose: ResumePreview,
};

export const resumeTemplates = Object.fromEntries(
	templateIds.map((id) => [
		id,
		{ id, config: templateConfigs[id], Renderer: renderers[id] },
	]),
) as Record<TemplateId, ResumeTemplateDefinition>;

export const getResumeTemplate = (id: TemplateId): ResumeTemplateDefinition =>
	resumeTemplates[id];
