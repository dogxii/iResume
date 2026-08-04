import {
	Award,
	Briefcase,
	Code,
	FileText,
	Folder,
	GraduationCap,
	MoreHorizontal,
	School,
} from "lucide-react";
import type React from "react";
import { isCustomSectionKey } from "../data/resumeData";
import type { SectionKey, StandardSectionKey } from "../types/resume";

const sectionIconNodes: Record<StandardSectionKey, React.ReactNode> = {
	skills: <Code size={13} />,
	experience: <Briefcase size={13} />,
	projects: <Folder size={13} />,
	education: <GraduationCap size={13} />,
	awards: <Award size={13} />,
	campus: <School size={13} />,
	other: <MoreHorizontal size={13} />,
};

const customSectionIconNode = <FileText size={13} />;

export const getResumeSectionIcon = (key: SectionKey) =>
	isCustomSectionKey(key) ? customSectionIconNode : sectionIconNodes[key];
