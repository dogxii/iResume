// 个人信息
export interface PersonalInfo {
  name: string
  title: string
  phone: string
  email: string
  location: string
  github: string
  website: string
}

// 技能栈
export interface Skills {
  core: string
  react: string
  engineering: string
  style: string
}

// 工作经历
export interface Experience {
  id: number
  company: string
  role: string
  date: string
  details: string
}

// 项目经历
export interface Project {
  id: number
  name: string
  tags: string
  link: string
  source: string
  description: string
}

// 教育背景
export interface Education {
  school: string
  degree: string
  date: string
}

// 简历数据
export interface ResumeData {
  personal: PersonalInfo
  skills: Skills
  experience: Experience[]
  projects: Project[]
  education: Education
}
