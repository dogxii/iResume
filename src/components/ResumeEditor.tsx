import { Trash2, Plus } from 'lucide-react'
import type { ResumeData, Experience, Project } from '../types/resume'

interface InputGroupProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'textarea'
  placeholder?: string
}

const InputGroup = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
}: InputGroupProps) => (
  <div className='mb-3'>
    <label className='block text-xs font-medium text-slate-500 mb-1'>
      {label}
    </label>
    {type === 'textarea' ? (
      <textarea
        className='w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        type={type}
        className='w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )}
  </div>
)

interface ResumeEditorProps {
  data: ResumeData
  onChange: (data: ResumeData) => void
}

const ResumeEditor = ({ data, onChange }: ResumeEditorProps) => {
  const updatePersonal = (key: keyof ResumeData['personal'], value: string) => {
    onChange({ ...data, personal: { ...data.personal, [key]: value } })
  }

  const updateSkills = (key: keyof ResumeData['skills'], value: string) => {
    onChange({ ...data, skills: { ...data.skills, [key]: value } })
  }

  const updateEducation = (
    key: keyof ResumeData['education'],
    value: string
  ) => {
    onChange({ ...data, education: { ...data.education, [key]: value } })
  }

  // 处理数组类型的更新 (Experience, Projects)
  const updateArrayItem = <T extends Experience | Project>(
    section: 'experience' | 'projects',
    id: number,
    key: keyof T,
    value: string
  ) => {
    const newSection = data[section].map((item) =>
      item.id === id ? { ...item, [key]: value } : item
    )
    onChange({ ...data, [section]: newSection })
  }

  const addItem = <T extends Experience | Project>(
    section: 'experience' | 'projects',
    template: Omit<T, 'id'>
  ) => {
    onChange({
      ...data,
      [section]: [...data[section], { ...template, id: Date.now() }],
    })
  }

  const removeItem = (section: 'experience' | 'projects', id: number) => {
    onChange({
      ...data,
      [section]: data[section].filter((item) => item.id !== id),
    })
  }

  return (
    <div className='p-6 space-y-8 pb-20'>
      {/* 个人信息 */}
      <section>
        <h3 className='font-bold text-slate-800 mb-4 border-b pb-2'>
          个人信息
        </h3>
        <div className='grid grid-cols-1 gap-2'>
          <InputGroup
            label='姓名'
            value={data.personal.name}
            onChange={(v) => updatePersonal('name', v)}
          />
          <InputGroup
            label='职位头衔'
            value={data.personal.title}
            onChange={(v) => updatePersonal('title', v)}
          />
          <div className='grid grid-cols-2 gap-2'>
            <InputGroup
              label='电话'
              value={data.personal.phone}
              onChange={(v) => updatePersonal('phone', v)}
            />
            <InputGroup
              label='邮箱'
              value={data.personal.email}
              onChange={(v) => updatePersonal('email', v)}
            />
          </div>
          <InputGroup
            label='Github (不带 https://)'
            value={data.personal.github}
            onChange={(v) => updatePersonal('github', v)}
          />
        </div>
      </section>

      {/* 技术栈 */}
      <section>
        <h3 className='font-bold text-slate-800 mb-4 border-b pb-2'>技术栈</h3>
        <InputGroup
          label='核心能力'
          value={data.skills.core}
          onChange={(v) => updateSkills('core', v)}
        />
        <InputGroup
          label='React 生态'
          value={data.skills.react}
          onChange={(v) => updateSkills('react', v)}
        />
        <InputGroup
          label='工程化'
          value={data.skills.engineering}
          onChange={(v) => updateSkills('engineering', v)}
        />
        <InputGroup
          label='样式 & 性能'
          value={data.skills.style}
          onChange={(v) => updateSkills('style', v)}
        />
      </section>

      {/* 工作经历 */}
      <section>
        <div className='flex justify-between items-center mb-4 border-b pb-2'>
          <h3 className='font-bold text-slate-800'>工作经历</h3>
          <button
            onClick={() =>
              addItem<Experience>('experience', {
                company: '新公司',
                role: '职位',
                date: '时间',
                details: '',
              })
            }
            className='text-blue-600 hover:bg-blue-50 p-1 rounded'
          >
            <Plus size={16} />
          </button>
        </div>
        {data.experience.map((exp) => (
          <div
            key={exp.id}
            className='bg-slate-50 p-4 rounded mb-4 relative group'
          >
            <button
              onClick={() => removeItem('experience', exp.id)}
              className='absolute top-2 right-2 text-slate-400 hover:text-red-500'
            >
              <Trash2 size={14} />
            </button>
            <InputGroup
              label='公司'
              value={exp.company}
              onChange={(v) =>
                updateArrayItem<Experience>('experience', exp.id, 'company', v)
              }
            />
            <div className='grid grid-cols-2 gap-2'>
              <InputGroup
                label='职位'
                value={exp.role}
                onChange={(v) =>
                  updateArrayItem<Experience>('experience', exp.id, 'role', v)
                }
              />
              <InputGroup
                label='时间'
                value={exp.date}
                onChange={(v) =>
                  updateArrayItem<Experience>('experience', exp.id, 'date', v)
                }
              />
            </div>
            <InputGroup
              type='textarea'
              label='详情 (每行一点)'
              value={exp.details}
              onChange={(v) =>
                updateArrayItem<Experience>('experience', exp.id, 'details', v)
              }
              placeholder='使用 React 优化了...'
            />
          </div>
        ))}
      </section>

      {/* 项目 */}
      <section>
        <div className='flex justify-between items-center mb-4 border-b pb-2'>
          <h3 className='font-bold text-slate-800'>项目经历</h3>
          <button
            onClick={() =>
              addItem<Project>('projects', {
                name: '新项目',
                tags: '',
                link: '',
                source: '',
                description: '',
              })
            }
            className='text-blue-600 hover:bg-blue-50 p-1 rounded'
          >
            <Plus size={16} />
          </button>
        </div>
        {data.projects.map((proj) => (
          <div key={proj.id} className='bg-slate-50 p-4 rounded mb-4 relative'>
            <button
              onClick={() => removeItem('projects', proj.id)}
              className='absolute top-2 right-2 text-slate-400 hover:text-red-500'
            >
              <Trash2 size={14} />
            </button>
            <InputGroup
              label='项目名'
              value={proj.name}
              onChange={(v) =>
                updateArrayItem<Project>('projects', proj.id, 'name', v)
              }
            />
            <InputGroup
              label='技术标签'
              value={proj.tags}
              onChange={(v) =>
                updateArrayItem<Project>('projects', proj.id, 'tags', v)
              }
            />
            <div className='grid grid-cols-2 gap-2'>
              <InputGroup
                label='Demo 链接'
                value={proj.link}
                onChange={(v) =>
                  updateArrayItem<Project>('projects', proj.id, 'link', v)
                }
              />
              <InputGroup
                label='源码链接'
                value={proj.source}
                onChange={(v) =>
                  updateArrayItem<Project>('projects', proj.id, 'source', v)
                }
              />
            </div>
            <InputGroup
              type='textarea'
              label='描述 (每行一点)'
              value={proj.description}
              onChange={(v) =>
                updateArrayItem<Project>('projects', proj.id, 'description', v)
              }
            />
          </div>
        ))}
      </section>

      {/* 教育 */}
      <section>
        <h3 className='font-bold text-slate-800 mb-4 border-b pb-2'>
          教育背景
        </h3>
        <InputGroup
          label='学校'
          value={data.education.school}
          onChange={(v) => updateEducation('school', v)}
        />
        <InputGroup
          label='学位'
          value={data.education.degree}
          onChange={(v) => updateEducation('degree', v)}
        />
        <InputGroup
          label='时间'
          value={data.education.date}
          onChange={(v) => updateEducation('date', v)}
        />
      </section>
    </div>
  )
}

export default ResumeEditor
