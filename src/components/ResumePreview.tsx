import { Github, Globe, Mail, MapPin, Phone, ExternalLink } from 'lucide-react'
import type { ResumeData } from '../types/resume'

interface ResumePreviewProps {
  data: ResumeData
}

const ResumePreview = ({ data }: ResumePreviewProps) => {
  // 辅助函数：将换行符文本转换为列表
  const renderList = (text: string) => {
    if (!text) return null
    return text
      .split('\n')
      .map((line, index) => line.trim() && <li key={index}>{line}</li>)
  }

  return (
    <div className='w-full bg-white shadow-lg print:shadow-none p-8 md:p-10 text-slate-800 leading-relaxed text-[10.5pt] min-h-[297mm]'>
      {/* --- 头部信息 --- */}
      <header className='border-b border-slate-200 pb-4 mb-5'>
        <div className='flex justify-between items-end'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 tracking-tight'>
              {data.personal.name}
            </h1>
            <p className='text-lg text-blue-600 font-medium mt-1'>
              {data.personal.title}
            </p>
          </div>
          <div className='text-right text-sm text-slate-600 space-y-1'>
            <div className='flex items-center justify-end gap-2'>
              <span>{data.personal.phone}</span>
              <Phone size={14} />
            </div>
            <div className='flex items-center justify-end gap-2'>
              <a
                href={`mailto:${data.personal.email}`}
                className='hover:text-blue-600 hover:underline'
              >
                {data.personal.email}
              </a>
              <Mail size={14} />
            </div>
            <div className='flex items-center justify-end gap-2'>
              <span>{data.personal.location}</span>
              <MapPin size={14} />
            </div>
          </div>
        </div>

        <div className='flex gap-6 mt-4 text-sm font-medium'>
          {data.personal.github && (
            <a
              href={`https://${data.personal.github}`}
              target='_blank'
              rel='noreferrer'
              className='flex items-center gap-1.5 text-slate-700 hover:text-blue-600'
            >
              <Github size={14} /> {data.personal.github}
            </a>
          )}
          {data.personal.website && (
            <a
              href={`https://${data.personal.website}`}
              target='_blank'
              rel='noreferrer'
              className='flex items-center gap-1.5 text-slate-700 hover:text-blue-600'
            >
              <Globe size={14} /> {data.personal.website}
            </a>
          )}
        </div>
      </header>

      {/* --- 技术栈 --- */}
      <section className='mb-5'>
        <h2 className='text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-2 pb-1'>
          技术栈
        </h2>
        <div className='grid grid-cols-[100px_1fr] gap-y-2 text-sm'>
          <span className='font-semibold text-slate-700'>核心能力</span>
          <span>{data.skills.core}</span>

          <span className='font-semibold text-slate-700'>React 生态</span>
          <span>{data.skills.react}</span>

          <span className='font-semibold text-slate-700'>工程化</span>
          <span>{data.skills.engineering}</span>

          <span className='font-semibold text-slate-700'>样式 & 性能</span>
          <span>{data.skills.style}</span>
        </div>
      </section>

      {/* --- 工作经历 --- */}
      <section className='mb-5'>
        <h2 className='text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-3 pb-1'>
          工作经历
        </h2>
        {data.experience.map((exp) => (
          <div key={exp.id} className='mb-4'>
            <div className='flex justify-between items-baseline mb-1'>
              <h3 className='font-bold text-base text-slate-900'>
                {exp.company}
              </h3>
              <span className='text-sm text-slate-500'>{exp.date}</span>
            </div>
            <div className='text-sm font-medium text-blue-600 mb-2'>
              {exp.role}
            </div>
            <ul className='list-disc list-outside ml-4 space-y-1.5 text-sm text-slate-700'>
              {renderList(exp.details)}
            </ul>
          </div>
        ))}
      </section>

      {/* --- 代表项目 --- */}
      <section className='mb-5'>
        <h2 className='text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-3 pb-1'>
          代表项目 & 开源贡献
        </h2>
        {data.projects.map((proj) => (
          <div key={proj.id} className='mb-3'>
            <div className='flex justify-between items-center mb-1'>
              <div className='flex items-center gap-2'>
                <h3 className='font-bold text-base text-slate-900'>
                  {proj.name}
                </h3>
                {proj.tags && (
                  <span className='text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200'>
                    {proj.tags}
                  </span>
                )}
              </div>
              <div className='flex gap-3 text-xs'>
                {proj.link && (
                  <a
                    href={`https://${proj.link}`}
                    className='flex items-center gap-1 text-blue-600 hover:underline'
                  >
                    <ExternalLink size={10} /> Demo
                  </a>
                )}
                {proj.source && (
                  <a
                    href={`https://${proj.source}`}
                    className='flex items-center gap-1 text-blue-600 hover:underline'
                  >
                    <Github size={10} /> Code
                  </a>
                )}
              </div>
            </div>
            <ul className='list-disc list-outside ml-4 space-y-1 text-sm text-slate-700'>
              {renderList(proj.description)}
            </ul>
          </div>
        ))}
      </section>

      {/* --- 教育背景 --- */}
      <section>
        <h2 className='text-lg font-bold text-slate-900 border-b-2 border-slate-100 mb-2 pb-1'>
          教育背景
        </h2>
        <div className='flex justify-between text-sm'>
          <div>
            <span className='font-bold text-slate-900'>
              {data.education.degree}
            </span>
            <span className='mx-2 text-slate-300'>|</span>
            <span>{data.education.school}</span>
          </div>
          <span className='text-slate-500'>{data.education.date}</span>
        </div>
      </section>
    </div>
  )
}

export default ResumePreview
