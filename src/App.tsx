import { useState, useEffect } from 'react'
import { Printer, RotateCcw } from 'lucide-react'
import ResumePreview from './components/ResumePreview'
import ResumeEditor from './components/ResumeEditor'
import { initialResumeState } from './data/initialData'
import type { ResumeData } from './types/resume'

const STORAGE_KEY = 'resume-data'

function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(() => {
    // 初始化时从 localStorage 读取，避免 useEffect 警告
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved) as ResumeData
      } catch (e) {
        console.error('Failed to parse resume data', e)
      }
    }
    return initialResumeState
  })

  // 自动保存：数据变化时写入 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData))
  }, [resumeData])

  const handleReset = () => {
    if (window.confirm('确定要重置所有数据到默认模版吗？')) {
      setResumeData(initialResumeState)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className='min-h-screen bg-slate-100 font-sans text-slate-900'>
      {/* 顶部导航栏 - 打印时隐藏 */}
      <nav className='sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center print:hidden shadow-sm'>
        <div className='font-bold text-xl flex items-center gap-2'>
          <span className='bg-blue-600 text-white px-2 py-1 rounded text-sm'>
            React
          </span>
          简历生成器
        </div>
        <div className='flex gap-3'>
          <button
            onClick={handleReset}
            className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors'
          >
            <RotateCcw size={16} /> 重置
          </button>
          <button
            onClick={handlePrint}
            className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors'
          >
            <Printer size={16} /> 保存 PDF
          </button>
        </div>
      </nav>

      <main className='max-w-[1600px] mx-auto flex flex-col md:flex-row h-[calc(100vh-60px)]'>
        {/* 左侧：编辑器 (可滚动) - 打印时隐藏 */}
        <div className='w-full md:w-[400px] lg:w-[450px] bg-white border-r border-slate-200 overflow-y-auto print:hidden h-full custom-scrollbar'>
          <ResumeEditor data={resumeData} onChange={setResumeData} />
        </div>

        {/* 右侧：预览区域 (灰色背景) */}
        <div className='flex-1 bg-slate-100 overflow-y-auto p-8 flex justify-center print:p-0 print:bg-white print:overflow-visible h-full'>
          {/* A4 纸张容器 */}
          <div className='w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none print:w-full'>
            <ResumePreview data={resumeData} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
