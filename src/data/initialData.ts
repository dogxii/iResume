import type { ResumeData } from '../types/resume'

export const initialResumeState: ResumeData = {
  personal: {
    name: '你的名字',
    title: '资深前端工程师 (React 专注于性能优化与工程化)',
    phone: '138-0000-0000',
    email: 'yourname@email.com',
    location: '北京, 中国',
    github: 'github.com/yourname',
    website: 'your-portfolio.com',
  },
  skills: {
    core: 'JavaScript (ES6+), TypeScript (Strict Mode), HTML5, CSS3',
    react: 'React 18, Next.js, Zustand, React Query, React Router',
    engineering: 'Vite, Webpack, Jest, CI/CD, Docker',
    style: 'Tailwind CSS, Styled-components, Web Vitals',
  },
  experience: [
    {
      id: 1,
      company: '某某科技有限公司',
      role: '高级前端工程师',
      date: '2021.06 - 至今',
      details:
        '性能重构：主导从 Webpack 到 Vite 的迁移，构建速度提升 80%。\n组件库建设：设计并开发基于 Headless UI 的企业级组件库。\n质量保障：引入 Jest + RTL 单元测试，核心覆盖率 85%+。',
    },
    {
      id: 2,
      company: '某某初创网络公司',
      role: '前端开发工程师',
      date: '2019.03 - 2021.05',
      details:
        '复杂表单引擎：基于 React Hook Form 开发动态表单配置引擎。\n数据可视化：使用 ECharts + WebSocket 实现百万级数据实时大屏。',
    },
  ],
  projects: [
    {
      id: 1,
      name: 'Next.js 电商高性能模版',
      tags: 'Next.js 14, TS, Tailwind',
      link: 'demo.com',
      source: 'github.com',
      description:
        '针对电商高并发与 SEO 需求，采用 ISR 策略。\n严格遵循 WAI-ARIA 标准，Lighthouse 评分 100。',
    },
  ],
  education: {
    school: '某某大学',
    degree: '计算机科学与技术 (本科)',
    date: '2015 - 2019',
  },
}
