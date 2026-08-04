import { forwardRef } from "react";
import type { ResumePreviewProps } from "./ResumePreview";
import { getResumeTemplate } from "../templates/registry";

const TemplateResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
	function TemplateResumePreview({ templateId = "classic", ...props }, ref) {
		const { Renderer } = getResumeTemplate(templateId);
		return <Renderer ref={ref} {...props} templateId={templateId} />;
	},
);

export default TemplateResumePreview;
