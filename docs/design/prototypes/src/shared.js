/* iResume 3.0 交互原型 —— 三套方案共用的交互逻辑（纯原生 JS，无依赖） */
;(() => {
  const P = window.PROTO
  const F = P.features || {}
  const A4_W = 794
  const A4_H = 1123

  // ---------------------------------------------------------------- icons
  const ICONS = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    grad: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    briefcase:
      '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    folder:
      '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    code: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:
      '<path d="m3 3 18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    chevRight: '<path d="m9 6 6 6-6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    home: '<path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    sliders:
      '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    sparkles:
      '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4"/>',
    upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    clipboard:
      '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    phone:
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    globe:
      '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    github:
      '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.1-1.3-.3-2.5-1-3.5.3-1.2.3-2.4 0-3.5 0 0-1 0-3 1.5-2.6-.5-5.4-.5-8 0C6 2 5 2 5 2c-.3 1.1-.3 2.3 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.4.5-.7 1.1-.8 1.7-.2.6-.2 1.2-.2 1.8v4"/><path d="M9 18c-4.5 2-5-2-7-2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    wand: '<path d="m14 4 6 6L9 21l-6-6z"/><path d="m11 7 6 6"/><path d="M5 2v3M3.5 3.5h3"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    palette:
      '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H17a5 5 0 0 0 5-5C22 6 17.5 2 12 2z"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
    eyeView:
      '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    command:
      '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
  }
  const icon = (name, size = 16) =>
    `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`

  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    )
  const clone = (value) => JSON.parse(JSON.stringify(value))

  // ---------------------------------------------------------------- data
  const SAMPLE = {
    name: '前端工程师 · 社招',
    version: '1.3.0',
    tags: ['前端', '社招', '北京'],
    personal: {
      name: '林小明',
      title: 'Web 前端工程师',
      phone: '138-1234-5678',
      email: 'linxiaoming@email.com',
      location: '北京 · 朝阳',
      website: 'linxiaoming.dev',
      github: 'github.com/linxiaoming',
      availability: '一周内到岗',
    },
    sections: [
      {
        id: 'education',
        kind: 'entries',
        icon: 'grad',
        title: '教育背景',
        visible: true,
        items: [
          {
            title: '南昌大学',
            subtitle: '计算机科学与技术 · 学士',
            date: '2019.09 - 2023.06',
            tags: '',
            details:
              '- GPA 3.7/4.0，专业排名前 10%\n- 主修课程：数据结构、操作系统、计算机网络、软件工程',
          },
        ],
      },
      {
        id: 'experience',
        kind: 'entries',
        icon: 'briefcase',
        title: '工作经历',
        visible: true,
        items: [
          {
            title: '某互联网公司 · 商业化平台部',
            subtitle: '前端工程师',
            date: '2023.07 - 至今',
            tags: '',
            details:
              '- 负责广告投放平台核心模块开发，覆盖创意管理、数据报表与权限体系\n- 主导大表格组件重构，首屏渲染耗时降低 42%，已复用到 6 条业务线\n- 推动团队接入 TypeScript 严格模式和 CI 检查，线上缺陷率下降 30%\n- 参与新人培养，整理前端开发规范与排障手册',
          },
          {
            title: '某互联网产品研发部',
            subtitle: '前端实习生',
            date: '2022.07 - 2022.09',
            tags: '',
            details:
              '- 参与内部运营平台迭代，负责数据列表、表单配置等页面开发与联调\n- 沉淀筛选、表格和异常态处理逻辑，减少重复实现',
          },
        ],
      },
      {
        id: 'projects',
        kind: 'entries',
        icon: 'folder',
        title: '项目经历',
        visible: true,
        items: [
          {
            title: '在线简历编辑器 iResume',
            subtitle: '核心开发者',
            date: '2023.03 - 至今',
            tags: 'React, TypeScript, IndexedDB',
            details:
              '- 实现结构化编辑、实时预览、PDF 导出与多版本管理，GitHub 获得 1.2k Star\n- 设计本地优先的数据层与加密云同步，支持离线编辑',
          },
          {
            title: '校园信息服务平台',
            subtitle: '前端负责人',
            date: '2022.09 - 2023.06',
            tags: 'Vue 3, Vite, Node.js',
            details:
              '- 负责前端架构与核心页面开发，服务全校 2 万名师生\n- 拆分业务组件和请求层，统一错误处理与权限校验',
          },
        ],
      },
      {
        id: 'skills',
        kind: 'text',
        icon: 'code',
        title: '专业技能',
        visible: true,
        text: '- **语言**：TypeScript、JavaScript (ES2023)、HTML5、CSS3\n- **框架**：React 19、Vue 3、Next.js，熟悉 Hooks 与状态管理方案\n- **工程化**：Vite、Webpack、Biome、Vitest、Playwright，熟悉 CI/CD\n- **其他**：Node.js、浏览器渲染原理、Web 性能优化与可访问性',
      },
      {
        id: 'awards',
        kind: 'entries',
        icon: 'award',
        title: '荣誉奖项',
        visible: true,
        items: [
          { title: '中国大学生计算机设计大赛 · 二等奖', subtitle: 'Web 应用开发组', date: '2022.08', tags: '', details: '' },
          { title: '校级一等奖学金', subtitle: '南昌大学', date: '2021.12', tags: '', details: '' },
        ],
      },
      {
        id: 'other',
        kind: 'text',
        icon: 'note',
        title: '自我评价',
        visible: true,
        text: '- 关注用户体验与工程质量，习惯用清晰结构推进需求落地\n- 乐于分享，持续维护技术博客与开源项目',
      },
    ],
  }

  const FIELD_LABELS = {
    education: { title: '学校', subtitle: '专业 / 学位', date: '起止时间', details: '补充说明' },
    experience: { title: '公司 / 组织', subtitle: '职位', date: '起止时间', details: '工作内容' },
    projects: { title: '项目名称', subtitle: '担任角色', date: '起止时间', tags: '技术栈', details: '项目描述' },
    awards: { title: '奖项名称', subtitle: '颁发单位', date: '时间', details: '说明' },
  }

  const TEMPLATES = [
    { id: 'classic', name: '经典', tag: '通用' },
    { id: 'center', name: '居中极简', tag: '设计' },
    { id: 'banner', name: '深色页眉', tag: '技术' },
    { id: 'serif', name: '书卷', tag: '学术' },
  ]
  const ACCENTS = ['#2456d6', '#0f766e', '#a93f28', '#6d4fd8', '#b4235a', '#b45309', '#334155', '#111827']
  const FONTS = [
    { id: 'sans', name: '黑体', css: '"PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif' },
    { id: 'serif', name: '宋体', css: '"Songti SC","STSong","Noto Serif SC","Source Han Serif SC","SimSun",Georgia,serif' },
    { id: 'kai', name: '楷体', css: '"Kaiti SC","STKaiti","KaiTi","Noto Serif SC",serif' },
  ]
  const DEFAULT_DESIGN = {
    template: 'classic',
    accent: '#2456d6',
    font: 'sans',
    fontSize: 14,
    lineHeight: 1.7,
    margin: 48,
    gap: 18,
    showIcons: false,
    ...(P.defaultDesign || {}),
  }

  const HOME_DOCS = [
    { name: '前端工程师 · 社招', version: '1.3.0', updated: '2 小时前', tags: ['前端', '社招'], design: { template: 'classic', accent: '#2456d6' } },
    { name: '前端实习 · 大厂', version: '1.0.4', updated: '3 天前', tags: ['实习'], design: { template: 'center', accent: '#0f766e' } },
    { name: '全栈方向 · 创业公司', version: '0.9.0', updated: '上周', tags: ['全栈', '远程'], design: { template: 'banner', accent: '#6d4fd8' } },
    { name: '研究生复试简历', version: '2.1.0', updated: '10 月 12 日', tags: ['学术'], design: { template: 'serif', accent: '#a93f28' } },
  ]

  // ---------------------------------------------------------------- state
  const realPhone = window.matchMedia('(max-width: 700px)').matches
  const hash = new URLSearchParams(location.hash.slice(1))
  const state = {
    view: hash.get('view') === 'editor' ? 'editor' : 'home',
    device: realPhone || hash.get('device') === 'mobile' ? 'mobile' : 'desktop',
    mode: hash.get('mode') === 'design' ? 'design' : 'content',
    mtab: hash.get('mode') === 'design' ? 'design' : 'edit',
    theme: P.defaultTheme || 'light',
    selected: 'experience',
    expanded: { education: 0, experience: 0, projects: 0, awards: 0 },
    doc: clone(SAMPLE),
    design: clone(DEFAULT_DESIGN),
    zoom: 'fit',
    saved: true,
    exportOpen: false,
    metaOpen: false,
    paletteOpen: false,
    paletteIndex: 0,
    pages: 1,
    overflowRows: 0,
    spareRows: 0,
  }
  const undoStack = []
  const redoStack = []
  let lastSnapshot = JSON.stringify({ doc: state.doc, design: state.design })

  const app = document.getElementById('app')
  const stage = document.querySelector('.stage')
  if (realPhone) document.body.classList.add('real-phone')

  // ---------------------------------------------------------------- helpers
  const section = (id) => state.doc.sections.find((s) => s.id === id)
  const floating = () => Boolean(F.floating) && state.device !== 'mobile'
  const fontCss = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).css

  const inline = (text) =>
    esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const md = (text) => {
    const lines = String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    let html = ''
    let list = []
    const flush = () => {
      if (list.length) html += `<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`
      list = []
    }
    for (const line of lines) {
      if (/^[-*]\s+/.test(line)) list.push(line.replace(/^[-*]\s+/, ''))
      else {
        flush()
        html += `<p>${inline(line)}</p>`
      }
    }
    flush()
    return html
  }

  const bullets = (text) =>
    String(text || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[-*]\s+/.test(l))
      .map((l) => l.replace(/^[-*]\s+/, ''))

  const entryTips = (sectionId, item) => {
    if (!['experience', 'projects'].includes(sectionId)) return []
    const tips = []
    bullets(item.details).forEach((b, i) => {
      if (/^(参与|协助|负责过)/.test(b))
        tips.push({ level: 'info', text: `第 ${i + 1} 条以“${b.slice(0, 2)}”开头，力度偏弱，试试“主导 / 推动 / 设计”。` })
      else if (!/\d/.test(b))
        tips.push({ level: 'warn', text: `第 ${i + 1} 条缺少可量化的结果，例如“效率提升 30%”“覆盖 2 万用户”。` })
    })
    return tips
  }

  const allTips = () =>
    state.doc.sections.flatMap((s) =>
      s.kind === 'entries'
        ? s.items.flatMap((item, index) =>
            entryTips(s.id, item).map((t) => ({ ...t, section: s.id, index, where: `${s.title} · ${item.title || '未命名'}` }))
          )
        : []
    )

  const completeness = () => {
    const p = state.doc.personal
    const filledPersonal = Object.values(p).filter(Boolean).length / Object.keys(p).length
    const visible = state.doc.sections.filter((s) => s.visible)
    const filledSections =
      visible.filter((s) => (s.kind === 'text' ? s.text.trim() : s.items.length)).length / Math.max(1, visible.length)
    const allBullets = state.doc.sections
      .filter((s) => ['experience', 'projects'].includes(s.id))
      .flatMap((s) => s.items.flatMap((i) => bullets(i.details)))
    const quantified = allBullets.filter((b) => /\d/.test(b)).length / Math.max(1, allBullets.length)
    return Math.round(filledPersonal * 35 + filledSections * 35 + quantified * 30)
  }

  const sectionFilled = (s) => (s.kind === 'text' ? Boolean(s.text.trim()) : s.items.length > 0)
  const wordCount = () => {
    const text = JSON.stringify(state.doc.sections) + JSON.stringify(state.doc.personal)
    return (text.match(/[一-龥]|[A-Za-z]+/g) || []).length
  }

  // ---------------------------------------------------------------- resume renderer (产物层，与 App UI 无关)
  function renderResume(doc, design, opts = {}) {
    const p = doc.personal
    const d = design
    const contacts = [
      ['phone', p.phone],
      ['mail', p.email],
      ['pin', p.location],
      ['globe', p.website],
      ['github', p.github],
      ['clock', p.availability],
    ].filter((c) => c[1])
    const style = `--rs-accent:${d.accent};--rs-size:${d.fontSize}px;--rs-lh:${d.lineHeight};--rs-margin:${d.margin}px;--rs-gap:${d.gap}px;--rs-font:${fontCss(d.font).replace(/"/g, "'")}`
    const interactive = opts.interactive
    const wrap = (id, inner, tag = 'section', cls = 'rs-section') =>
      `<${tag} class="${cls}${interactive ? ' is-interactive' : ''}${interactive && opts.selected === id ? ' is-selected' : ''}"${interactive ? ` data-select="${id}"` : ''}>${inner}</${tag}>`

    const header = wrap(
      'personal',
      `<div class="rs-id"><h1>${esc(p.name)}</h1>${p.title ? `<div class="rs-title">${esc(p.title)}</div>` : ''}</div>
       <ul class="rs-contacts">${contacts.map(([i, v]) => `<li>${icon(i, 12)}<span>${esc(v)}</span></li>`).join('')}</ul>`,
      'header',
      'rs-head'
    )

    const body = doc.sections
      .filter((s) => s.visible)
      .map((s) => {
        const title = `<h2 class="rs-h">${d.showIcons ? icon(s.icon, 14) : ''}<span>${esc(s.title)}</span></h2>`
        const content =
          s.kind === 'text'
            ? `<div class="rs-md">${md(s.text)}</div>`
            : s.items
                .map(
                  (it) => `<div class="rs-entry">
                    <div class="rs-entry-head"><strong>${esc(it.title)}</strong>${it.subtitle ? `<span class="rs-sub">${esc(it.subtitle)}</span>` : ''}<span class="rs-date">${esc(it.date)}</span></div>
                    ${it.tags ? `<div class="rs-tags">${it.tags.split(/[,，]/).map((t) => `<span>${esc(t.trim())}</span>`).join('')}</div>` : ''}
                    ${it.details ? `<div class="rs-md">${md(it.details)}</div>` : ''}
                  </div>`
                )
                .join('')
        return wrap(s.id, title + content)
      })
      .join('')

    return `<article class="rs-page tpl-${d.template}" style="${style}"><div class="rs-content">${header}${body}</div></article>`
  }

  // ---------------------------------------------------------------- generic UI pieces
  const btn = (label, attrs = '', cls = 'btn') => `<button type="button" class="${cls}" ${attrs}>${label}</button>`
  const seg = (items, active, attr) =>
    `<div class="seg" role="tablist">${items
      .map(
        ([value, label]) =>
          `<button type="button" role="tab" aria-selected="${value === active}" class="${value === active ? 'is-active' : ''}" ${attr}="${value}">${label}</button>`
      )
      .join('')}</div>`

  const ring = (value, size = 34) => {
    const r = size / 2 - 3
    const c = 2 * Math.PI * r
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bar" stroke-dasharray="${(c * value) / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`
  }

  // ---------------------------------------------------------------- HOME
  function renderHome() {
    const score = completeness()
    const tips = allTips()
    const now = new Date()
    const dateStr = `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${'日一二三四五六'[now.getDay()]}`
    const docCard = (d, i) => {
      const doc = { ...clone(SAMPLE), name: d.name }
      return `<article class="doc-card" data-go="editor" tabindex="0">
        <div class="doc-thumb"><div class="js-scale">${renderResume(doc, { ...DEFAULT_DESIGN, ...d.design })}</div>${i === 0 ? '<span class="doc-badge">最近编辑</span>' : ''}</div>
        <div class="doc-info">
          <h3>${esc(d.name)}</h3>
          <p class="doc-meta"><span>v${d.version}</span><span>1 页</span><span>${d.updated}</span></p>
          <div class="tags">${d.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
        </div>
        <button type="button" class="icon-btn doc-more" data-toast="更多：复制 / 重命名 / 历史版本 / 删除" aria-label="更多">${icon('more')}</button>
      </article>`
    }
    const start = [
      ['file', '空白开始', '从零搭建，自由组合区块', 'data-go="editor"'],
      ['layout', '从模板开始', '11 套排版，用你的内容预览', 'data-toast="打开模板中心"'],
      ['upload', '导入备份', '支持 iResume JSON / 旧版数据', 'data-toast="选择 JSON 文件导入"'],
      ['clipboard', '粘贴已有简历', '粘贴文本或 Markdown，自动拆分区块', 'data-toast="粘贴后智能识别为结构化区块"'],
    ]
    return `<div class="home">
      <nav class="home-nav" aria-label="主导航">
        <div class="brand"><span class="logo">i</span><span class="brand-name">iResume</span>${P.copy.brandSub ? `<span class="brand-sub">${P.copy.brandSub}</span>` : ''}</div>
        <div class="nav-items">
          <a class="nav-item is-active" href="#">${icon('file', 18)}<span>我的简历</span></a>
          <a class="nav-item" href="#" data-toast="模板中心：按风格筛选 + 用你的数据预览">${icon('layout', 18)}<span>模板中心</span></a>
          <a class="nav-item" href="#" data-toast="设置：同步、备份、外观">${icon('sliders', 18)}<span>设置与同步</span></a>
        </div>
        <div class="nav-foot">
          ${F.darkToggle ? `<button type="button" class="icon-btn" data-action="theme" aria-label="切换主题">${icon(state.theme === 'dark' ? 'sun' : 'moon', 18)}</button>` : ''}
          <span class="sync-state">${icon('cloud', 16)}<span>已同步 · 5 分钟前</span></span>
        </div>
      </nav>
      <main class="home-main">
        <div class="home-inner">
          <header class="home-head">
            <div>
              <p class="eyebrow">${dateStr}</p>
              <h1>${P.copy.greeting}</h1>
              <p class="lead">${P.copy.lead}</p>
            </div>
            <div class="home-actions">
              ${
                F.palette
                  ? `<button type="button" class="search-trigger" data-action="palette">${icon('search')}<span>搜索简历或执行命令</span><kbd>⌘K</kbd></button>`
                  : `<label class="search">${icon('search')}<input placeholder="搜索名称或标签" /></label>`
              }
              ${F.createCard ? btn(`${icon('upload', 15)}<span>导入</span>`, 'data-toast="导入：iResume JSON / 粘贴已有简历文本"', 'btn') : ''}
              ${btn(`${icon('plus')}<span>新建简历</span>`, 'data-go="editor"', 'btn btn-primary')}
            </div>
          </header>

          ${
            F.progress
              ? `<section class="progress-card">
            <div class="pc-ring">${ring(score, 76)}<strong>${score}<small>%</small></strong></div>
            <div class="pc-body">
              <h2>“前端工程师 · 社招”已完成 ${score}%</h2>
              <p>再完善 ${tips.length} 处就更有说服力了。HR 平均只看 6 秒，量化结果最抓眼球。</p>
              <ul class="pc-steps">
                ${tips
                  .slice(0, 3)
                  .map((t) => `<li><button type="button" data-goto="${t.section}:${t.index}">${icon('bulb', 15)}<span>${esc(t.where)}：${esc(t.text)}</span>${icon('chevRight', 15)}</button></li>`)
                  .join('')}
              </ul>
            </div>
            ${btn(`继续完善${icon('chevRight')}`, 'data-go="editor"', 'btn btn-primary')}
          </section>`
              : ''
          }

          <section class="home-section">
            <div class="sec-head"><h2>全部简历 <span class="count">${HOME_DOCS.length}</span></h2>${seg(
              [
                ['卡片视图', '卡片'],
                ['列表视图：简历多时一屏看完，可按更新时间 / 标签排序', '列表'],
              ],
              '卡片视图',
              'data-toast'
            )}</div>
            <div class="doc-grid">${F.createCard ? `<button type="button" class="create-card" data-go="editor"><span class="cc-plus">${icon('plus', 20)}</span><strong>新建简历</strong><span>空白开始，或从模板创建</span></button>` : ''}${HOME_DOCS.map(docCard).join('')}</div>
          </section>

          ${F.createCard ? '' : `<section class="home-section">
            <div class="sec-head"><h2>新建一份</h2></div>
            <div class="start-grid">${start
              .map(
                ([ic, t, d, attr]) =>
                  `<button type="button" class="start-tile" ${attr}><span class="st-icon">${icon(ic, 20)}</span><strong>${t}</strong><span>${d}</span></button>`
              )
              .join('')}</div>
          </section>`}

          <section class="home-section">
            <div class="sec-head"><h2>精选模板</h2><div class="chips">${['全部', '通用', '技术', '设计', '学术', 'ATS 友好']
              .map((c, i) => `<button type="button" class="chip-btn ${i === 0 ? 'is-active' : ''}" data-toast="筛选：${c}">${c}</button>`)
              .join('')}</div></div>
            <div class="tpl-strip">${TEMPLATES.map(
              (t) => `<article class="tpl-tile" data-go="editor" tabindex="0">
                <div class="doc-thumb"><div class="js-scale">${renderResume(SAMPLE, { ...DEFAULT_DESIGN, template: t.id, accent: t.id === 'serif' ? '#a93f28' : t.id === 'banner' ? '#6d4fd8' : t.id === 'center' ? '#0f766e' : '#2456d6' })}</div></div>
                <div class="tpl-info"><strong>${t.name}</strong><span class="tag">${t.tag}</span></div>
              </article>`
            ).join('')}</div>
          </section>
        </div>
      </main>
      <nav class="mnav" aria-label="移动端导航">
        <button type="button" class="is-active">${icon('file', 20)}<span>简历</span></button>
        <button type="button" data-toast="模板中心">${icon('layout', 20)}<span>模板</span></button>
        <button type="button" class="mnav-fab" data-go="editor" aria-label="新建">${icon('plus', 22)}</button>
        <button type="button" data-toast="同步状态">${icon('cloud', 20)}<span>同步</span></button>
        <button type="button" data-toast="设置">${icon('sliders', 20)}<span>设置</span></button>
      </nav>
    </div>`
  }

  // ---------------------------------------------------------------- EDITOR
  function renderTopbar() {
    const score = completeness()
    if (floating()) return renderSideHead()
    return `<header class="topbar">
      <div class="tb-left">
        <button type="button" class="icon-btn" data-go="home" aria-label="返回我的简历" title="返回我的简历">${icon('arrowLeft', 18)}</button>
        <div class="doc-meta-wrap">
          <button type="button" class="doc-title" data-action="meta"><span class="dt-name">${esc(state.doc.name)}</span><span class="ver">v${esc(state.doc.version)}</span>${icon('chevDown', 14)}</button>
          <span class="save-state" id="save-state">${saveLabel()}</span>
          ${state.metaOpen ? renderMetaPopover() : ''}
        </div>
      </div>
      <div class="tb-center">${seg(
        [
          ['content', `${icon('pen', 15)}<span>内容</span>`],
          ['design', `${icon('palette', 15)}<span>设计</span>`],
        ],
        state.mode,
        'data-mode'
      )}</div>
      <div class="tb-right">
        ${F.progress ? `<div class="tb-progress" title="简历完成度">${ring(score, 30)}<span>${score}%</span></div>` : ''}
        ${F.palette ? `<button type="button" class="btn btn-ghost kbd-btn" data-action="palette">${icon('command', 15)}<span>命令</span><kbd>⌘K</kbd></button>` : ''}
        <button type="button" class="icon-btn" data-action="undo" aria-label="撤销" title="撤销 ⌘Z" ${undoStack.length ? '' : 'disabled'}>${icon('undo', 18)}</button>
        <button type="button" class="icon-btn" data-action="redo" aria-label="重做" title="重做 ⇧⌘Z" ${redoStack.length ? '' : 'disabled'}>${icon('redo', 18)}</button>
        ${F.darkToggle ? `<button type="button" class="icon-btn" data-action="theme" aria-label="切换主题">${icon(state.theme === 'dark' ? 'sun' : 'moon', 18)}</button>` : ''}
        <div class="menu-wrap">
          <button type="button" class="btn btn-primary" data-action="export">${icon('download', 16)}<span>导出</span>${icon('chevDown', 14)}</button>
          ${
            state.exportOpen
              ? `<div class="menu" role="menu">
              ${[
                ['file', 'PDF 文档', '投递首选，矢量清晰', 'PDF'],
                ['eyeView', 'PNG 图片', '适合发微信 / 预览', 'PNG'],
                ['download', 'JSON 备份', '可再次导入编辑', 'JSON'],
                ['note', 'Markdown', '纯文本，方便粘贴', 'Markdown'],
              ]
                .map(
                  ([ic, t, d, k]) =>
                    `<button type="button" role="menuitem" class="menu-item" data-export="${k}">${icon(ic, 16)}<span><strong>${t}</strong><small>${d}</small></span></button>`
                )
                .join('')}
            </div>`
              : ''
          }
        </div>
      </div>
    </header>`
  }

  function exportMenu() {
    return state.exportOpen
      ? `<div class="menu" role="menu">${[
          ['file', 'PDF 文档', '投递首选，矢量清晰', 'PDF'],
          ['eyeView', 'PNG 图片', '适合发微信 / 预览', 'PNG'],
          ['download', 'JSON 备份', '可再次导入编辑', 'JSON'],
          ['note', 'Markdown', '纯文本，方便粘贴', 'Markdown'],
        ]
          .map(
            ([ic, t, d, k]) =>
              `<button type="button" role="menuitem" class="menu-item" data-export="${k}">${icon(ic, 16)}<span><strong>${t}</strong><small>${d}</small></span></button>`
          )
          .join('')}</div>`
      : ''
  }

  function renderSideHead() {
    return `<header class="topbar side-head">
      <div class="sh-row">
        <button type="button" class="brand-btn" data-go="home" title="返回我的简历"><span class="logo">i</span><span class="brand-name">Resume</span></button>
        <span class="sb-spacer"></span>
        <span class="save-state" id="save-state">${saveLabel()}</span>
      </div>
      <div class="doc-meta-wrap">
        <button type="button" class="doc-title" data-action="meta"><span class="dt-name">${esc(state.doc.name)}</span><span class="ver">v${esc(state.doc.version)}</span>${icon('chevDown', 14)}</button>
        ${state.metaOpen ? renderMetaPopover() : ''}
      </div>
      <div class="sh-row sh-tools">
        <button type="button" class="icon-btn" data-action="undo" aria-label="撤销" title="撤销 ⌘Z" ${undoStack.length ? '' : 'disabled'}>${icon('undo', 17)}</button>
        <button type="button" class="icon-btn" data-action="redo" aria-label="重做" title="重做 ⇧⌘Z" ${redoStack.length ? '' : 'disabled'}>${icon('redo', 17)}</button>
        <button type="button" class="icon-btn" data-toast="版本历史：对比差异 / 回滚" aria-label="版本历史" title="版本历史">${icon('history', 17)}</button>
        <button type="button" class="icon-btn" data-toast="导入：JSON 备份 / 粘贴文本" aria-label="导入" title="导入">${icon('upload', 17)}</button>
        <span class="sb-spacer"></span>
        <div class="menu-wrap">
          <button type="button" class="btn btn-primary" data-action="export">${icon('download', 16)}<span>导出</span>${icon('chevDown', 14)}</button>
          ${exportMenu()}
        </div>
      </div>
    </header>`
  }

  function saveLabel() {
    return state.saved
      ? `${icon('check', 13)}<span>已保存到本地</span>`
      : `<span class="dot-pulse"></span><span>保存中…</span>`
  }

  function renderMetaPopover() {
    return `<div class="popover meta-pop" role="dialog" aria-label="简历信息">
      <label class="field"><span>简历名称</span><input data-bind="meta:name" value="${esc(state.doc.name)}" /></label>
      <div class="field-row">
        <label class="field"><span>版本</span><input data-bind="meta:version" value="${esc(state.doc.version)}" /></label>
        ${btn(`${icon('history', 15)}<span>历史版本</span>`, 'data-toast="打开版本历史（对比 / 回滚）"', 'btn btn-ghost')}
      </div>
      <label class="field"><span>标签</span><input data-bind="meta:tags" value="${esc(state.doc.tags.join('，'))}" placeholder="用逗号分隔" /></label>
    </div>`
  }

  function renderOutline() {
    const items = [
      { id: 'personal', icon: 'user', title: '个人信息', visible: true, fixed: true, count: '', filled: true },
      ...state.doc.sections.map((s) => ({
        id: s.id,
        icon: s.icon,
        title: s.title,
        visible: s.visible,
        count: s.kind === 'entries' ? s.items.length : '',
        filled: sectionFilled(s),
        tips: s.kind === 'entries' ? s.items.flatMap((it) => entryTips(s.id, it)).length : 0,
      })),
    ]
    return `<div class="panel-head"><h3>${P.copy.outline}</h3><span class="ph-sub">拖动调整顺序</span></div>
      <ol class="outline">
        ${items
          .map(
            (it) => `<li class="ol-item${state.selected === it.id ? ' is-active' : ''}${it.visible ? '' : ' is-hidden'}" data-select="${it.id}" ${it.fixed ? '' : `draggable="true" data-drag="${it.id}"`}>
              <span class="ol-grip">${it.fixed ? '' : icon('grip', 14)}</span>
              <span class="ol-icon">${icon(it.icon, 16)}</span>
              <span class="ol-title">${esc(it.title)}</span>
              ${it.tips ? `<span class="ol-tips" title="${it.tips} 条建议">${it.tips}</span>` : ''}
              ${it.count !== '' ? `<span class="ol-count">${it.count}</span>` : ''}
              <span class="ol-done">${it.filled ? icon('check', 12) : ''}</span>
              ${it.fixed ? '' : `<button type="button" class="ol-eye" data-togglevis="${it.id}" aria-label="${it.visible ? '隐藏' : '显示'}区块">${icon(it.visible ? 'eye' : 'eyeOff', 15)}</button>`}
            </li>`
          )
          .join('')}
      </ol>
      <button type="button" class="add-section" data-toast="可添加：校园经历 / 证书 / 语言能力 / 自定义区块">${icon('plus', 15)}<span>添加区块</span></button>
      ${
        F.coach
          ? `<div class="outline-foot"><p>${icon('bulb', 15)}<span>小提示：点击右侧简历上的任意区块，就能直接编辑它。</span></p></div>`
          : ''
      }`
  }

  function renderCanvas() {
    return `<div class="canvas-tools">
        <div class="zoom">
          <button type="button" class="icon-btn" data-zoom="-" aria-label="缩小">${icon('minus', 15)}</button>
          <span class="zoom-val" id="zoom-val">100%</span>
          <button type="button" class="icon-btn" data-zoom="+" aria-label="放大">${icon('plus', 15)}</button>
          <button type="button" class="icon-btn" data-zoom="fit" aria-label="适应宽度" title="适应宽度">${icon('maximize', 15)}</button>
          ${F.pageMode ? `<span class="zoom-sep"></span><button type="button" class="icon-btn is-on" data-toast="连续预览" aria-label="连续预览" title="连续预览">${icon('file', 15)}</button><button type="button" class="icon-btn" data-toast="分页预览：每页独立显示，所见即所得" aria-label="分页预览" title="分页预览">${icon('clipboard', 15)}</button>` : ''}
        </div>
      </div>
      <div class="canvas-scroll" id="canvas-scroll"><div class="sheet-wrap" id="sheet-wrap"><div class="sheet" id="sheet"></div></div></div>
      <div class="fit-chip" id="fit-chip"></div>`
  }

  function field(label, bind, value, opts = {}) {
    const input = opts.textarea
      ? `<textarea data-bind="${bind}" rows="${opts.rows || 5}" placeholder="${esc(opts.placeholder || '')}">${esc(value)}</textarea>`
      : `<input data-bind="${bind}" value="${esc(value)}" placeholder="${esc(opts.placeholder || '')}" />`
    return `<label class="field${opts.wide ? ' wide' : ''}"><span class="f-label">${label}</span>${input}${opts.hint ? `<small class="f-hint">${opts.hint}</small>` : ''}</label>`
  }

  const tipsHtml = (tips, id) =>
    `<div class="tips" ${id ? `id="${id}"` : ''}>${tips
      .map((t) => `<div class="tip tip-${t.level}">${icon(t.level === 'warn' ? 'alert' : 'bulb', 14)}<span>${esc(t.text)}</span></div>`)
      .join('')}</div>`

  function renderInspector() {
    const tabs = floating()
      ? `<div class="insp-tabs">${seg(
          [
            ['content', `${icon('pen', 15)}<span>内容</span>`],
            ['design', `${icon('palette', 15)}<span>设计</span>`],
          ],
          state.mode,
          'data-mode'
        )}</div>`
      : ''
    return tabs + renderInspectorBody()
  }

  function renderInspectorBody() {
    if (state.mode === 'design') return renderDesign()
    if (state.selected === 'personal') {
      const p = state.doc.personal
      return `<div class="panel-head"><span class="ph-icon">${icon('user', 16)}</span><h3>个人信息</h3></div>
        <div class="insp-body">
          <div class="photo-row"><div class="photo">${icon('user', 26)}</div><div><strong>头像</strong><p class="muted">可选。国内岗位常见，外企 / ATS 建议不放</p>${btn(`${icon('upload', 15)}<span>上传照片</span>`, 'data-toast="选择图片，自动裁剪压缩"', 'btn btn-sm')}</div></div>
          <div class="fields">
            ${field('姓名', 'personal:name', p.name)}
            ${field('求职意向', 'personal:title', p.title)}
            ${field('电话', 'personal:phone', p.phone)}
            ${field('邮箱', 'personal:email', p.email)}
            ${field('所在城市', 'personal:location', p.location)}
            ${field('到岗时间', 'personal:availability', p.availability)}
            ${field('个人网站', 'personal:website', p.website)}
            ${field('GitHub', 'personal:github', p.github)}
          </div>
        </div>`
    }
    const s = section(state.selected)
    if (!s) return ''
    const head = `<div class="panel-head"><span class="ph-icon">${icon(s.icon, 16)}</span><input class="title-input" data-bind="title:${s.id}" value="${esc(s.title)}" aria-label="区块标题" />
      <button type="button" class="icon-btn" data-togglevis="${s.id}" aria-label="显示/隐藏">${icon(s.visible ? 'eye' : 'eyeOff', 16)}</button></div>`
    const coach =
      F.coach && ['experience', 'projects'].includes(s.id)
        ? `<div class="coach"><div class="coach-head">${icon('sparkles', 16)}<strong>写作小助手</strong></div><p>好的经历描述 = <b>动作</b> + <b>做了什么</b> + <b>结果数字</b>。<br/>例如：“主导表格组件重构，首屏耗时降低 42%”。</p></div>`
        : ''
    if (s.kind === 'text') {
      return `${head}<div class="insp-body">${coach}${field('内容', `text:${s.id}`, s.text, {
        textarea: true,
        rows: 10,
        wide: true,
        hint: '每行以 “- ” 开头会显示为列表，**文字** 加粗',
      })}</div>`
    }
    const labels = FIELD_LABELS[s.id] || FIELD_LABELS.awards
    const open = state.expanded[s.id] ?? 0
    const cards = s.items
      .map((it, i) => {
        const isOpen = open === i
        const tips = entryTips(s.id, it)
        return `<div class="entry-card${isOpen ? ' is-open' : ''}">
          <button type="button" class="entry-head" data-expand="${s.id}:${i}" aria-expanded="${isOpen}">
            <span class="eh-grip">${icon('grip', 14)}</span>
            <span class="eh-text"><strong data-label="${s.id}:${i}">${esc(it.title || '未命名')}</strong><small>${esc([it.subtitle, it.date].filter(Boolean).join(' · '))}</small></span>
            ${tips.length ? `<span class="eh-tips">${tips.length}</span>` : ''}
            ${icon('chevDown', 16)}
          </button>
          ${
            isOpen
              ? `<div class="entry-body"><div class="fields">
              ${field(labels.title, `entry:${s.id}:${i}:title`, it.title)}
              ${field(labels.subtitle, `entry:${s.id}:${i}:subtitle`, it.subtitle)}
              ${field(labels.date, `entry:${s.id}:${i}:date`, it.date, { placeholder: '2023.07 - 至今' })}
              ${labels.tags ? field(labels.tags, `entry:${s.id}:${i}:tags`, it.tags, { placeholder: '用逗号分隔' }) : ''}
              ${field(labels.details, `entry:${s.id}:${i}:details`, it.details, {
                textarea: true,
                rows: 6,
                wide: true,
                hint: `<span data-count="${s.id}:${i}">${bullets(it.details).length} 条要点 · ${it.details.length} 字</span>`,
              })}
              </div>${tipsHtml(tips, `tips-${s.id}-${i}`)}
              <div class="entry-actions">${btn(`${icon('sparkles', 14)}<span>润色建议</span>`, 'data-toast="AI 润色：给出 3 种改写（规划中）"', 'btn btn-ghost btn-sm')}${btn('删除', `data-remove="${s.id}:${i}"`, 'btn btn-ghost btn-sm btn-danger')}</div>
            </div>`
              : ''
          }
        </div>`
      })
      .join('')
    return `${head}<div class="insp-body">${coach}<div class="entries">${cards}</div>
      <button type="button" class="add-entry" data-add="${s.id}">${icon('plus', 15)}<span>添加一条${esc(s.title.replace(/经历|背景|奖项/, ''))}</span></button></div>`
  }

  function slider(key, label, min, max, step, unit) {
    const v = state.design[key]
    return `<label class="slider-row"><span class="sl-label">${label}</span><input type="range" data-design="${key}" min="${min}" max="${max}" step="${step}" value="${v}" /><output id="out-${key}">${fmtDesign(key, v)}</output></label>`
  }
  const fmtDesign = (key, v) => (key === 'lineHeight' ? Number(v).toFixed(2) : `${v}${key === 'fontSize' ? 'px' : 'px'}`)

  function renderDesign() {
    const d = state.design
    return `<div class="panel-head"><span class="ph-icon">${icon('palette', 16)}</span><h3>设计</h3>${btn('重置', 'data-action="reset-design"', 'btn btn-ghost btn-sm')}</div>
      <div class="insp-body design">
        <section class="group"><h4>模板</h4><div class="tpl-grid">${TEMPLATES.map(
          (t) => `<button type="button" class="tpl-card${d.template === t.id ? ' is-active' : ''}" data-template="${t.id}"><div class="doc-thumb"><div class="js-scale">${renderResume(state.doc, { ...d, template: t.id })}</div></div><span>${t.name}</span></button>`
        ).join('')}</div><button type="button" class="link-btn" data-toast="打开模板中心（11 套）">查看全部 11 套模板 ${icon('chevRight', 14)}</button></section>
        <section class="group"><h4>主题色</h4><div class="swatches">${ACCENTS.map(
          (c) => `<button type="button" class="swatch${d.accent === c ? ' is-active' : ''}" style="--c:${c}" data-accent="${c}" aria-label="${c}"></button>`
        ).join('')}<label class="swatch custom" title="自定义颜色"><input type="color" data-design="accent" value="${d.accent}" />${icon('plus', 14)}</label></div></section>
        <section class="group"><h4>字体</h4>${seg(
          FONTS.map((f) => [f.id, f.name]),
          d.font,
          'data-font'
        )}</section>
        <section class="group"><h4>排版</h4>
          ${slider('fontSize', '字号', 12, 16, 0.5)}
          ${slider('lineHeight', '行高', 1.3, 1.9, 0.05)}
          ${slider('margin', '页边距', 24, 64, 2)}
          ${slider('gap', '区块间距', 6, 28, 1)}
        </section>
        <section class="group"><h4>细节</h4>
          <label class="toggle-row"><span>区块标题图标</span><input type="checkbox" class="toggle" data-design-toggle="showIcons" ${d.showIcons ? 'checked' : ''} /></label>
          <button type="button" class="link-btn" data-toast="每个区块可单独设置：日期位置、标签样式、链接样式…">区块显示偏好 ${icon('chevRight', 14)}</button>
        </section>
      </div>`
  }

  function renderStatus() {
    const tips = allTips()
    return `<span>${icon('file', 13)} 第 1/${state.pages} 页</span>
      <span>${wordCount()} 字</span>
      <button type="button" class="sb-issues" data-goto="${tips[0] ? `${tips[0].section}:${tips[0].index}` : ''}">${icon('alert', 13)} ${tips.length} 条建议</button>
      <span class="sb-spacer"></span>
      <span>${icon('cloud', 13)} 本地 + GitHub 同步</span>
      <span><kbd>⌘K</kbd> 命令</span><span><kbd>Space</kbd> 拖动画布</span>`
  }

  function renderEditor() {
    const fl = floating()
    return `<div class="ed${fl ? ' ed-floating' : ''}">
      ${fl ? '' : renderTopbar()}
      <div class="ed-body">
        <aside class="ed-left panel" aria-label="大纲">${fl ? renderTopbar() : ''}<div id="outline">${renderOutline()}</div></aside>
        <main class="ed-canvas" id="canvas">${renderCanvas()}</main>
        <aside class="ed-right panel" id="inspector" aria-label="检查器">${renderInspector()}</aside>
      </div>
      ${F.statusbar ? `<footer class="statusbar" id="statusbar">${renderStatus()}</footer>` : ''}
      <nav class="mtabs" aria-label="编辑器视图">${[
        ['edit', 'pen', '编辑'],
        ['preview', 'eyeView', '预览'],
        ['design', 'palette', '设计'],
      ]
        .map(([k, ic, t]) => `<button type="button" class="${state.mtab === k ? 'is-active' : ''}" data-mtab="${k}">${icon(ic, 20)}<span>${t}</span></button>`)
        .join('')}</nav>
    </div>`
  }

  // ---------------------------------------------------------------- palette
  function paletteCommands() {
    return [
      ...state.doc.sections.map((s) => ({ group: '跳转', label: `编辑「${s.title}」`, icon: s.icon, run: () => selectSection(s.id, true) })),
      { group: '跳转', label: '编辑「个人信息」', icon: 'user', run: () => selectSection('personal', true) },
      ...TEMPLATES.map((t) => ({ group: '模板', label: `切换模板：${t.name}`, icon: 'layout', run: () => applyDesign({ template: t.id }, true) })),
      { group: '操作', label: '一键压缩到一页', icon: 'wand', run: () => fitOnePage() },
      { group: '操作', label: '导出 PDF', icon: 'download', run: () => toast('正在生成 PDF…（原型演示）') },
      { group: '操作', label: state.mode === 'design' ? '切换到内容模式' : '切换到设计模式', icon: 'palette', run: () => setMode(state.mode === 'design' ? 'content' : 'design') },
      { group: '操作', label: state.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题', icon: 'moon', run: () => toggleTheme() },
      { group: '导航', label: '返回我的简历', icon: 'home', run: () => go('home') },
    ]
  }
  function renderPalette(query = '') {
    const q = query.trim().toLowerCase()
    const list = paletteCommands().filter((c) => !q || c.label.toLowerCase().includes(q))
    state.paletteIndex = Math.min(state.paletteIndex, Math.max(0, list.length - 1))
    let lastGroup = ''
    const rows = list
      .map((c, i) => {
        const g = c.group !== lastGroup ? `<div class="pal-group">${c.group}</div>` : ''
        lastGroup = c.group
        return `${g}<button type="button" class="pal-item${i === state.paletteIndex ? ' is-active' : ''}" data-pal="${i}">${icon(c.icon, 16)}<span>${esc(c.label)}</span>${i === state.paletteIndex ? '<kbd>↵</kbd>' : ''}</button>`
      })
      .join('')
    return { html: rows || '<div class="pal-empty">没有匹配的命令</div>', list }
  }
  function openPalette() {
    state.paletteOpen = true
    state.paletteIndex = 0
    const el = document.createElement('div')
    el.className = 'overlay'
    el.id = 'palette'
    el.innerHTML = `<div class="palette" role="dialog" aria-label="命令面板"><div class="pal-input">${icon('search', 18)}<input id="pal-q" placeholder="输入命令、区块或模板…" autocomplete="off" /><kbd>Esc</kbd></div><div class="pal-list" id="pal-list"></div></div>`
    app.appendChild(el)
    const input = el.querySelector('#pal-q')
    const draw = () => {
      el.querySelector('#pal-list').innerHTML = renderPalette(input.value).html
    }
    draw()
    input.focus()
    input.addEventListener('input', () => {
      state.paletteIndex = 0
      draw()
    })
    input.addEventListener('keydown', (e) => {
      const { list } = renderPalette(input.value)
      if (e.key === 'ArrowDown') {
        state.paletteIndex = (state.paletteIndex + 1) % Math.max(1, list.length)
        draw()
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        state.paletteIndex = (state.paletteIndex - 1 + list.length) % Math.max(1, list.length)
        draw()
        e.preventDefault()
      } else if (e.key === 'Enter' && list[state.paletteIndex]) {
        closePalette()
        list[state.paletteIndex].run()
      }
    })
    el.addEventListener('click', (e) => {
      if (e.target === el) closePalette()
      const item = e.target.closest('[data-pal]')
      if (item) {
        const { list } = renderPalette(input.value)
        closePalette()
        list[Number(item.dataset.pal)]?.run()
      }
    })
  }
  function closePalette() {
    state.paletteOpen = false
    document.getElementById('palette')?.remove()
  }

  // ---------------------------------------------------------------- render + measure
  function render() {
    app.className = `app ${P.themeClass} device-${state.device}`
    app.dataset.theme = state.theme
    app.dataset.mtab = state.mtab
    app.dataset.mode = state.mode
    stage.classList.toggle('is-mobile', state.device === 'mobile')
    app.innerHTML = (state.view === 'home' ? renderHome() : renderEditor()) + '<div class="toast" id="toast" role="status"></div>'
    syncProtoBar()
    requestAnimationFrame(() => {
      scaleThumbs()
      if (state.view === 'editor') updateCanvas()
    })
  }

  function scaleThumbs(root = app) {
    root.querySelectorAll('.js-scale').forEach((el) => {
      const w = el.parentElement.clientWidth
      if (w) el.style.transform = `scale(${w / A4_W})`
    })
  }

  function currentZoom() {
    const scroll = document.getElementById('canvas-scroll')
    if (state.zoom !== 'fit') return state.zoom
    if (!scroll) return 1
    const pad = state.device === 'mobile' ? 24 : 72
    return Math.max(0.3, Math.min(1.15, (scroll.clientWidth - pad) / A4_W))
  }

  function updateCanvas() {
    const sheet = document.getElementById('sheet')
    if (!sheet) return
    sheet.innerHTML = renderResume(state.doc, state.design, { interactive: true, selected: state.selected })
    const page = sheet.querySelector('.rs-page')
    page.style.minHeight = '0px'
    const h = page.scrollHeight
    state.pages = Math.max(1, Math.ceil((h - 1) / A4_H))
    page.style.minHeight = `${state.pages * A4_H}px`
    for (let i = 1; i < state.pages; i++) {
      const line = document.createElement('div')
      line.className = 'page-break'
      line.style.top = `${i * A4_H}px`
      line.innerHTML = `<span>第 ${i} 页结束</span>`
      sheet.appendChild(line)
    }
    const rowH = state.design.fontSize * state.design.lineHeight
    state.overflowRows = h > A4_H ? Math.ceil((h - A4_H) / rowH) : 0
    state.spareRows = h <= A4_H ? Math.floor((A4_H - h) / rowH) : 0
    const z = currentZoom()
    sheet.style.transform = `scale(${z})`
    const wrap = document.getElementById('sheet-wrap')
    wrap.style.width = `${A4_W * z}px`
    wrap.style.height = `${state.pages * A4_H * z}px`
    const zv = document.getElementById('zoom-val')
    if (zv) zv.textContent = `${Math.round(z * 100)}%`
    const chip = document.getElementById('fit-chip')
    if (chip) {
      chip.className = `fit-chip ${state.overflowRows ? 'is-over' : 'is-ok'}`
      chip.innerHTML = state.overflowRows
        ? `${icon('alert', 15)}<span>超出一页 · 多 <b>${state.overflowRows}</b> 行</span><button type="button" class="btn btn-sm btn-primary" data-action="fit">${icon('wand', 14)}<span>压缩到一页</span></button>`
        : `${icon('check', 15)}<span>刚好一页 · 还能写约 <b>${state.spareRows}</b> 行</span>`
    }
    const sb = document.getElementById('statusbar')
    if (sb) sb.innerHTML = renderStatus()
  }

  function refreshOutline() {
    const el = document.getElementById('outline')
    if (el) el.innerHTML = renderOutline()
  }
  function refreshInspector() {
    const el = document.getElementById('inspector')
    if (el) {
      el.innerHTML = renderInspector()
      requestAnimationFrame(() => scaleThumbs(el))
    }
  }
  function refreshTopbar() {
    const tb = app.querySelector('.topbar')
    if (tb) tb.outerHTML = renderTopbar()
  }

  // ---------------------------------------------------------------- state changes
  let saveTimer
  let commitTimer
  function markDirty({ immediate = false } = {}) {
    state.saved = false
    const ss = document.getElementById('save-state')
    if (ss) ss.innerHTML = saveLabel()
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      state.saved = true
      const s2 = document.getElementById('save-state')
      if (s2) s2.innerHTML = saveLabel()
    }, 700)
    clearTimeout(commitTimer)
    const commit = () => {
      const snap = JSON.stringify({ doc: state.doc, design: state.design })
      if (snap === lastSnapshot) return
      undoStack.push(lastSnapshot)
      if (undoStack.length > 100) undoStack.shift()
      redoStack.length = 0
      lastSnapshot = snap
      app.querySelectorAll('[data-action="undo"]').forEach((b) => (b.disabled = false))
      app.querySelectorAll('[data-action="redo"]').forEach((b) => (b.disabled = true))
    }
    if (immediate) commit()
    else commitTimer = setTimeout(commit, 500)
  }

  function restore(snap) {
    const parsed = JSON.parse(snap)
    state.doc = parsed.doc
    state.design = parsed.design
    lastSnapshot = snap
    render()
  }

  function go(view) {
    state.view = view
    state.exportOpen = false
    state.metaOpen = false
    writeHash()
    render()
  }
  function setMode(mode) {
    state.mode = mode
    if (state.device === 'mobile') state.mtab = mode === 'design' ? 'design' : 'edit'
    app.dataset.mode = mode
    app.dataset.mtab = state.mtab
    writeHash()
    refreshTopbar()
    refreshInspector()
    app.querySelectorAll('[data-mtab]').forEach((b) => b.classList.toggle('is-active', b.dataset.mtab === state.mtab))
  }
  function selectSection(id, focus) {
    state.selected = id
    if (state.mode === 'design' && focus) setMode('content')
    if (state.device === 'mobile' && state.mtab !== 'edit') {
      state.mtab = 'edit'
      state.mode = 'content'
      render()
      return
    }
    refreshOutline()
    refreshInspector()
    app.querySelectorAll('.rs-section, .rs-head').forEach((el) => el.classList.toggle('is-selected', el.dataset.select === id))
    if (focus) {
      const target = app.querySelector(`#sheet [data-select="${id}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  function applyDesign(patch, rerenderInspector) {
    Object.assign(state.design, patch)
    markDirty({ immediate: true })
    updateCanvas()
    if (rerenderInspector) refreshInspector()
  }
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark'
    app.dataset.theme = state.theme
    if (state.view === 'editor') refreshTopbar()
    else render()
  }

  function fitOnePage() {
    const d = state.design
    const before = { ...d }
    const steps = [
      () => d.lineHeight > 1.45 && (d.lineHeight = Math.round((d.lineHeight - 0.05) * 100) / 100),
      () => d.gap > 10 && (d.gap -= 2),
      () => d.margin > 32 && (d.margin -= 4),
      () => d.fontSize > 12.5 && (d.fontSize -= 0.5),
    ]
    let guard = 0
    updateCanvas()
    while (state.overflowRows > 0 && guard < 40) {
      const changed = steps.some((s) => s())
      if (!changed) break
      updateCanvas()
      guard++
    }
    markDirty({ immediate: true })
    if (state.mode === 'design') refreshInspector()
    const parts = []
    if (d.lineHeight !== before.lineHeight) parts.push(`行高 ${before.lineHeight}→${d.lineHeight}`)
    if (d.gap !== before.gap) parts.push(`间距 ${before.gap}→${d.gap}`)
    if (d.margin !== before.margin) parts.push(`边距 ${before.margin}→${d.margin}`)
    if (d.fontSize !== before.fontSize) parts.push(`字号 ${before.fontSize}→${d.fontSize}`)
    toast(state.overflowRows ? '已尽力压缩，仍超出一页，建议精简内容' : `已压缩到一页：${parts.join('，') || '无需调整'}　⌘Z 可撤销`)
  }

  let toastTimer
  function toast(text) {
    const el = document.getElementById('toast')
    if (!el) return
    el.textContent = text
    el.classList.add('is-show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2600)
  }

  // ---------------------------------------------------------------- events
  app.addEventListener('click', (e) => {
    const t = e.target.closest(
      '[data-go],[data-mode],[data-select],[data-togglevis],[data-expand],[data-add],[data-remove],[data-template],[data-accent],[data-font],[data-zoom],[data-mtab],[data-export],[data-action],[data-toast],[data-goto]'
    )
    if (!t) {
      if (state.exportOpen || state.metaOpen) {
        if (!e.target.closest('.menu, .popover')) {
          state.exportOpen = false
          state.metaOpen = false
          refreshTopbar()
        }
      }
      return
    }
    const ds = t.dataset
    if (t.tagName === 'A') e.preventDefault()

    if (ds.togglevis) {
      e.stopPropagation()
      const s = section(ds.togglevis)
      s.visible = !s.visible
      markDirty({ immediate: true })
      refreshOutline()
      refreshInspector()
      updateCanvas()
      return
    }
    if (ds.go) return go(ds.go)
    if (ds.mode) return setMode(ds.mode)
    if (ds.goto !== undefined) {
      if (!ds.goto) return
      const [sid, idx] = ds.goto.split(':')
      state.expanded[sid] = Number(idx)
      state.selected = sid
      state.mode = 'content'
      state.mtab = 'edit'
      if (state.view !== 'editor') return go('editor')
      return render()
    }
    if (ds.select) {
      if (state.device === 'mobile' && t.closest('#sheet')) {
        state.mtab = 'edit'
        state.mode = 'content'
        state.selected = ds.select
        return render()
      }
      return selectSection(ds.select, !t.closest('#sheet'))
    }
    if (ds.expand) {
      const [sid, idx] = ds.expand.split(':')
      state.expanded[sid] = state.expanded[sid] === Number(idx) ? -1 : Number(idx)
      return refreshInspector()
    }
    if (ds.add) {
      const s = section(ds.add)
      s.items.push({ title: '', subtitle: '', date: '', tags: '', details: '- ' })
      state.expanded[s.id] = s.items.length - 1
      markDirty({ immediate: true })
      refreshInspector()
      refreshOutline()
      updateCanvas()
      app.querySelector('.entry-card.is-open input')?.focus()
      return
    }
    if (ds.remove) {
      const [sid, idx] = ds.remove.split(':')
      section(sid).items.splice(Number(idx), 1)
      markDirty({ immediate: true })
      refreshInspector()
      refreshOutline()
      updateCanvas()
      return toast('已删除，⌘Z 可撤销')
    }
    if (ds.template) return applyDesign({ template: ds.template }, true)
    if (ds.accent) return applyDesign({ accent: ds.accent }, true)
    if (ds.font) return applyDesign({ font: ds.font }, true)
    if (ds.zoom) {
      const z = currentZoom()
      state.zoom = ds.zoom === 'fit' ? 'fit' : Math.max(0.3, Math.min(2, Math.round((z + (ds.zoom === '+' ? 0.1 : -0.1)) * 10) / 10))
      return updateCanvas()
    }
    if (ds.mtab) {
      state.mtab = ds.mtab
      if (ds.mtab === 'design') state.mode = 'design'
      if (ds.mtab === 'edit') state.mode = 'content'
      writeHash()
      return render()
    }
    if (ds.export) {
      state.exportOpen = false
      refreshTopbar()
      return toast(`正在导出 ${ds.export}…（原型演示）`)
    }
    if (ds.action) {
      switch (ds.action) {
        case 'export':
          state.exportOpen = !state.exportOpen
          state.metaOpen = false
          return refreshTopbar()
        case 'meta':
          state.metaOpen = !state.metaOpen
          state.exportOpen = false
          refreshTopbar()
          app.querySelector('.meta-pop input')?.focus()
          return
        case 'undo':
          if (undoStack.length) {
            redoStack.push(lastSnapshot)
            restore(undoStack.pop())
            toast('已撤销')
          }
          return
        case 'redo':
          if (redoStack.length) {
            undoStack.push(lastSnapshot)
            restore(redoStack.pop())
          }
          return
        case 'fit':
          return fitOnePage()
        case 'palette':
          return openPalette()
        case 'theme':
          return toggleTheme()
        case 'reset-design':
          state.design = clone(DEFAULT_DESIGN)
          markDirty({ immediate: true })
          updateCanvas()
          return refreshInspector()
      }
    }
    if (ds.toast) return toast(ds.toast)
  })

  app.addEventListener('input', (e) => {
    const t = e.target
    if (t.dataset.bind) {
      const parts = t.dataset.bind.split(':')
      const v = t.value
      if (parts[0] === 'personal') state.doc.personal[parts[1]] = v
      else if (parts[0] === 'title') {
        section(parts[1]).title = v
        const ol = app.querySelector(`.ol-item[data-select="${parts[1]}"] .ol-title`)
        if (ol) ol.textContent = v
      } else if (parts[0] === 'text') section(parts[1]).text = v
      else if (parts[0] === 'meta') {
        if (parts[1] === 'tags') state.doc.tags = v.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
        else state.doc[parts[1]] = v
        const n = app.querySelector('.dt-name')
        if (n && parts[1] === 'name') n.textContent = v
        const ver = app.querySelector('.doc-title .ver')
        if (ver && parts[1] === 'version') ver.textContent = `v${v}`
      } else if (parts[0] === 'entry') {
        const [, sid, idx, key] = parts
        const item = section(sid).items[Number(idx)]
        item[key] = v
        const label = app.querySelector(`[data-label="${sid}:${idx}"]`)
        if (label && key === 'title') label.textContent = v || '未命名'
        if (key === 'details') {
          const c = app.querySelector(`[data-count="${sid}:${idx}"]`)
          if (c) c.textContent = `${bullets(v).length} 条要点 · ${v.length} 字`
          const tips = document.getElementById(`tips-${sid}-${idx}`)
          if (tips) tips.outerHTML = tipsHtml(entryTips(sid, item), `tips-${sid}-${idx}`)
        }
      }
      markDirty()
      updateCanvas()
      return
    }
    if (t.dataset.design) {
      const key = t.dataset.design
      state.design[key] = key === 'accent' ? t.value : Number(t.value)
      const out = document.getElementById(`out-${key}`)
      if (out) out.textContent = fmtDesign(key, state.design[key])
      markDirty()
      updateCanvas()
      return
    }
    if (t.dataset.designToggle) {
      state.design[t.dataset.designToggle] = t.checked
      markDirty({ immediate: true })
      updateCanvas()
    }
  })
  app.addEventListener('change', (e) => {
    if (e.target.dataset.design === 'accent') refreshInspector()
  })

  // drag & drop reorder in outline
  let dragId = null
  app.addEventListener('dragstart', (e) => {
    const li = e.target.closest('[data-drag]')
    if (!li) return
    dragId = li.dataset.drag
    li.classList.add('is-dragging')
    e.dataTransfer.effectAllowed = 'move'
  })
  app.addEventListener('dragover', (e) => {
    const li = e.target.closest('[data-drag]')
    if (!li || !dragId) return
    e.preventDefault()
    app.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'))
    li.classList.add('drop-target')
  })
  app.addEventListener('drop', (e) => {
    const li = e.target.closest('[data-drag]')
    if (!li || !dragId) return
    e.preventDefault()
    const list = state.doc.sections
    const from = list.findIndex((s) => s.id === dragId)
    const to = list.findIndex((s) => s.id === li.dataset.drag)
    if (from > -1 && to > -1 && from !== to) {
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      markDirty({ immediate: true })
      updateCanvas()
    }
    dragId = null
    refreshOutline()
  })
  app.addEventListener('dragend', () => {
    dragId = null
    refreshOutline()
  })

  window.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'k' && F.palette) {
      e.preventDefault()
      state.paletteOpen ? closePalette() : openPalette()
    } else if (e.key === 'Escape') {
      if (state.paletteOpen) closePalette()
      if (state.exportOpen || state.metaOpen) {
        state.exportOpen = false
        state.metaOpen = false
        refreshTopbar()
      }
    } else if (mod && e.key.toLowerCase() === 'z' && state.view === 'editor' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) {
      e.preventDefault()
      app.querySelector(`[data-action="${e.shiftKey ? 'redo' : 'undo'}"]`)?.click()
    }
  })

  let resizeTimer
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      scaleThumbs()
      updateCanvas()
    }, 80)
  })

  // ---------------------------------------------------------------- prototype bar (原型控制，不属于设计)
  function writeHash() {
    const params = new URLSearchParams()
    params.set('view', state.view)
    if (state.device === 'mobile' && !realPhone) params.set('device', 'mobile')
    if (state.mode === 'design') params.set('mode', 'design')
    history.replaceState(null, '', `#${params}`)
    document.querySelectorAll('[data-pb-link]').forEach((a) => {
      a.href = `${a.dataset.pbLink}#${params}`
    })
  }
  function syncProtoBar() {
    document.querySelectorAll('[data-pb-view]').forEach((b) => b.classList.toggle('is-on', b.dataset.pbView === state.view))
    document.querySelectorAll('[data-pb-device]').forEach((b) => b.classList.toggle('is-on', b.dataset.pbDevice === state.device))
  }
  document.querySelector('.proto-bar')?.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.pbView) go(b.dataset.pbView)
    if (b.dataset.pbDevice) {
      state.device = b.dataset.pbDevice
      state.zoom = 'fit'
      writeHash()
      render()
    }
  })

  writeHash()
  render()
})()
