/* iResume 3.0 · 方案 E「所见即所得」原型
   - 去掉表单：直接在简历纸面上点击编辑
   - 设计控制收进底部浮动 Dock
   - 写作建议以「页边批注」出现，对齐到对应经历
*/
;(() => {
  const A4_W = 794
  const A4_H = 1123

  // ------------------------------------------------------------ icons
  const ICONS = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    chevRight: '<path d="m9 6 6 6-6 6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:
      '<path d="m3 3 18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
    sliders:
      '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    spacing: '<path d="M21 3H3M21 21H3M12 7v10M9 10l3-3 3 3M9 14l3 3 3-3"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    eyeView: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    wand: '<path d="m14 4 6 6L9 21l-6-6z"/><path d="m11 7 6 6"/><path d="M5 2v3M3.5 3.5h3"/>',
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4"/>',
    phone:
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    github:
      '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.1-1.3-.3-2.5-1-3.5.3-1.2.3-2.4 0-3.5 0 0-1 0-3 1.5-2.6-.5-5.4-.5-8 0C6 2 5 2 5 2c-.3 1.1-.3 2.3 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.4.5-.7 1.1-.8 1.7-.2.6-.2 1.2-.2 1.8v4"/><path d="M9 18c-4.5 2-5-2-7-2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    cursor: '<path d="m4 4 7 17 2.5-7.5L21 11z"/>',
  }
  const icon = (n, s = 16) =>
    `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const clone = (v) => JSON.parse(JSON.stringify(v))
  const $ = (s, r = document) => r.querySelector(s)

  // ------------------------------------------------------------ data
  const SAMPLE = {
    name: '前端工程师 · 社招',
    version: '1.3.0',
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
        title: '教育背景',
        visible: true,
        items: [
          {
            title: '南昌大学',
            subtitle: '计算机科学与技术 · 学士',
            date: '2019.09 - 2023.06',
            tags: '',
            details: '- GPA 3.7/4.0，专业排名前 10%\n- 主修课程：数据结构、操作系统、计算机网络、软件工程',
          },
        ],
      },
      {
        id: 'experience',
        kind: 'entries',
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
            details: '- 参与内部运营平台迭代，负责数据列表、表单配置等页面开发与联调\n- 沉淀筛选、表格和异常态处理逻辑，减少重复实现',
          },
        ],
      },
      {
        id: 'projects',
        kind: 'entries',
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
            details: '- 负责前端架构与核心页面开发，服务全校 2 万名师生\n- 拆分业务组件和请求层，统一错误处理与权限校验',
          },
        ],
      },
      {
        id: 'skills',
        kind: 'text',
        title: '专业技能',
        visible: true,
        text: '- **语言**：TypeScript、JavaScript (ES2023)、HTML5、CSS3\n- **框架**：React 19、Vue 3、Next.js，熟悉 Hooks 与状态管理方案\n- **工程化**：Vite、Webpack、Biome、Vitest、Playwright，熟悉 CI/CD\n- **其他**：Node.js、浏览器渲染原理、Web 性能优化与可访问性',
      },
      {
        id: 'awards',
        kind: 'entries',
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
        title: '自我评价',
        visible: true,
        text: '- 关注用户体验与工程质量，习惯用清晰结构推进需求落地\n- 乐于分享，持续维护技术博客与开源项目',
      },
    ],
  }
  const PH = {
    name: '你的名字',
    title: '求职意向',
    phone: '电话',
    email: '邮箱',
    location: '所在城市',
    website: '个人网站',
    github: 'GitHub',
    availability: '到岗时间',
  }
  const ITEM_PH = {
    education: { title: '学校', subtitle: '专业 · 学位', date: '起止时间' },
    experience: { title: '公司 / 组织', subtitle: '职位', date: '起止时间' },
    projects: { title: '项目名称', subtitle: '担任角色', date: '起止时间', tags: '技术栈，用逗号分隔' },
    awards: { title: '奖项名称', subtitle: '颁发单位', date: '时间' },
  }
  const CONTACTS = [
    ['phone', 'phone'],
    ['mail', 'email'],
    ['pin', 'location'],
    ['globe', 'website'],
    ['github', 'github'],
    ['clock', 'availability'],
  ]
  const TEMPLATES = [
    { id: 'classic', name: '经典' },
    { id: 'center', name: '居中' },
    { id: 'banner', name: '深色页眉' },
    { id: 'serif', name: '书卷' },
  ]
  const ACCENTS = ['#2456d6', '#0f766e', '#a93f28', '#6d4fd8', '#b4235a', '#b45309', '#334155', '#111827']
  const FONTS = [
    { id: 'sans', name: '黑体', css: "'PingFang SC','Hiragino Sans GB','Noto Sans SC','Microsoft YaHei',system-ui,sans-serif" },
    { id: 'serif', name: '宋体', css: "'Songti SC','STSong','Noto Serif SC','Source Han Serif SC','SimSun',Georgia,serif" },
    { id: 'kai', name: '楷体', css: "'Kaiti SC','STKaiti','KaiTi','Noto Serif SC',serif" },
  ]
  const DEFAULT_DESIGN = {
    template: 'classic',
    accent: '#2456d6',
    font: 'sans',
    fontSize: 14,
    lineHeight: 1.7,
    margin: 48,
    gap: 18,
  }
  const HOME_DOCS = [
    { name: '前端工程师 · 社招', meta: '2 小时前 · v1.3', design: { template: 'classic', accent: '#2456d6' } },
    { name: '前端实习 · 大厂', meta: '3 天前 · v1.0', design: { template: 'center', accent: '#0f766e' } },
    { name: '全栈方向 · 创业公司', meta: '上周 · v0.9', design: { template: 'banner', accent: '#6d4fd8' } },
    { name: '研究生复试简历', meta: '10 月 12 日 · v2.1', design: { template: 'serif', accent: '#a93f28' } },
  ]

  // ------------------------------------------------------------ state
  const realPhone = window.matchMedia('(max-width: 700px)').matches
  const hash = new URLSearchParams(location.hash.slice(1))
  const state = {
    view: hash.get('view') === 'editor' ? 'editor' : 'home',
    device: realPhone || hash.get('device') === 'mobile' ? 'mobile' : 'desktop',
    preview: false,
    doc: clone(SAMPLE),
    design: clone(DEFAULT_DESIGN),
    pop: hash.get('pop') || null,
    menu: null,
    dismissed: new Set(),
    pages: 1,
    overflowRows: 0,
    spareRows: 0,
    zoom: 1,
  }
  const undoStack = []
  const redoStack = []
  let lastSnap = JSON.stringify({ doc: state.doc, design: state.design })

  const app = document.getElementById('app')
  const stage = document.querySelector('.stage')
  if (realPhone) document.body.classList.add('real-phone')

  const section = (id) => state.doc.sections.find((s) => s.id === id)
  const isMobile = () => state.device === 'mobile'
  const fontCss = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).css

  // raw lines keep empties (for editing); view lines drop them
  const rawLines = (t) => (t ? String(t).split('\n').map((l) => l.replace(/^\s*[-*]\s?/, '')) : [])
  const viewLines = (t) => rawLines(t).map((l) => l.trim()).filter(Boolean)
  const joinLines = (arr) => arr.map((l) => `- ${l}`).join('\n')

  function getPath(path) {
    const [k, a, b, c] = path.split('.')
    if (k === 'personal') return state.doc.personal[a]
    if (k === 'sec') return section(a)[b]
    if (k === 'item') return section(a).items[Number(b)][c]
    return ''
  }
  function setPath(path, v) {
    const [k, a, b, c] = path.split('.')
    if (k === 'personal') state.doc.personal[a] = v
    else if (k === 'sec') section(a)[b] = v
    else if (k === 'item') section(a).items[Number(b)][c] = v
  }

  // ------------------------------------------------------------ tips
  function entryTips(sid, item) {
    if (!['experience', 'projects'].includes(sid)) return []
    const tips = []
    viewLines(item.details).forEach((b, i) => {
      if (/^(参与|协助|负责过)/.test(b))
        tips.push({ kind: 'verb', line: i, text: `“${b.slice(0, 2)}”力度偏弱，换成“主导 / 推动 / 设计”更有说服力。` })
      else if (!/\d/.test(b)) tips.push({ kind: 'metric', line: i, text: '这条缺少结果。加一个数字，比如“效率提升 30%”“覆盖 2 万用户”。' })
    })
    return tips
  }
  function allTips() {
    return state.doc.sections
      .filter((s) => s.visible && s.kind === 'entries')
      .flatMap((s) =>
        s.items.flatMap((it, i) =>
          entryTips(s.id, it).map((t) => ({ ...t, sid: s.id, i, key: `${s.id}:${i}:${t.line}:${t.kind}` }))
        )
      )
      .filter((t) => !state.dismissed.has(t.key))
  }

  // ------------------------------------------------------------ resume renderer
  function fld(path, value, ph, E, cls = '') {
    if (!E) return value ? `<span class="${cls}">${esc(value)}</span>` : ''
    return `<span class="ef ${cls}" contenteditable="plaintext-only" spellcheck="false" data-path="${path}" data-ph="${esc(ph)}">${esc(value)}</span>`
  }
  function list(path, text, E, ph = '写一条要点，回车新起一行') {
    if (!E) {
      const ls = viewLines(text)
      return ls.length ? `<ul>${ls.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>` : ''
    }
    const ls = rawLines(text)
    const items = ls.length ? ls : ['']
    return `<ul class="el" data-list="${path}">${items
      .map(
        (l, k) =>
          `<li class="ef" contenteditable="plaintext-only" spellcheck="false" data-line="${k}" data-ph="${esc(ph)}">${inline(l)}</li>`
      )
      .join('')}</ul>`
  }

  function renderResume(doc, d, opts = {}) {
    const E = Boolean(opts.editable)
    const p = doc.personal
    const style = `--rs-accent:${d.accent};--rs-size:${d.fontSize}px;--rs-lh:${d.lineHeight};--rs-margin:${d.margin}px;--rs-gap:${d.gap}px;--rs-font:${fontCss(d.font)}`
    const contacts = CONTACTS.filter(([, k]) => E || p[k])
      .map(([ic, k]) => `<li>${icon(ic, 12)}${fld(`personal.${k}`, p[k], PH[k], E)}</li>`)
      .join('')
    const header = `<header class="rs-head" data-anchor="personal">
      <div class="rs-id"><h1>${fld('personal.name', p.name, PH.name, E)}</h1>${E || p.title ? `<div class="rs-title">${fld('personal.title', p.title, PH.title, E)}</div>` : ''}</div>
      <ul class="rs-contacts">${contacts}</ul></header>`

    const body = doc.sections
      .filter((s) => s.visible)
      .map((s) => {
        const ph = ITEM_PH[s.id] || ITEM_PH.awards
        const tools = E
          ? `<div class="x-sec-tools" contenteditable="false">
              <span class="x-grip" title="在左侧大纲拖动排序">${icon('grip', 14)}</span>
              ${s.kind === 'entries' ? `<button type="button" data-act="add" data-sid="${s.id}" title="添加一条">${icon('plus', 14)}</button>` : ''}
              <button type="button" data-act="hide" data-sid="${s.id}" title="隐藏这个区块">${icon('eyeOff', 14)}</button>
            </div>`
          : ''
        const content =
          s.kind === 'text'
            ? `<div class="rs-md">${list(`sec.${s.id}.text`, s.text, E)}</div>`
            : s.items
                .map((it, i) => {
                  const showDetails = E ? it.details || s.id !== 'awards' : it.details
                  return `<div class="rs-entry" data-anchor="${s.id}:${i}">
                  ${
                    E
                      ? `<div class="x-entry-tools" contenteditable="false">
                      <button type="button" data-act="up" data-sid="${s.id}" data-i="${i}" title="上移" ${i === 0 ? 'disabled' : ''}>${icon('arrowUp', 13)}</button>
                      <button type="button" data-act="down" data-sid="${s.id}" data-i="${i}" title="下移" ${i === s.items.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 13)}</button>
                      <button type="button" data-act="insert" data-sid="${s.id}" data-i="${i}" title="在下方新增">${icon('plus', 13)}</button>
                      <button type="button" data-act="del" data-sid="${s.id}" data-i="${i}" title="删除">${icon('trash', 13)}</button>
                    </div>`
                      : ''
                  }
                  <div class="rs-entry-head"><strong>${fld(`item.${s.id}.${i}.title`, it.title, ph.title, E)}</strong>${E || it.subtitle ? `<span class="rs-sub">${fld(`item.${s.id}.${i}.subtitle`, it.subtitle, ph.subtitle, E)}</span>` : ''}<span class="rs-date">${fld(`item.${s.id}.${i}.date`, it.date, ph.date, E)}</span></div>
                  ${
                    ph.tags && (E || it.tags)
                      ? `<div class="rs-tags">${E ? fld(`item.${s.id}.${i}.tags`, it.tags, ph.tags, E, 'x-tags-edit') : it.tags.split(/[,，]/).map((t) => `<span>${esc(t.trim())}</span>`).join('')}</div>`
                      : ''
                  }
                  ${showDetails ? `<div class="rs-md">${list(`item.${s.id}.${i}.details`, it.details, E)}</div>` : ''}
                </div>`
                })
                .join('')
        return `<section class="rs-section" data-anchor="${s.id}">${tools}<h2 class="rs-h">${fld(`sec.${s.id}.title`, s.title, '区块标题', E)}</h2>${content}</section>`
      })
      .join('')

    return `<article class="rs-page tpl-${d.template}${E ? ' is-editable' : ''}${opts.fluid ? ' is-fluid' : ''}" style="${style}"><div class="rs-content">${header}${body}</div></article>`
  }

  // ------------------------------------------------------------ HOME
  function renderHome() {
    const card = (d) => `<article class="x-card" data-go="editor" tabindex="0">
        <div class="x-thumb"><div class="js-scale">${renderResume({ ...SAMPLE, name: d.name }, { ...DEFAULT_DESIGN, ...d.design })}</div></div>
        <div class="x-card-info"><strong>${esc(d.name)}</strong><span>${d.meta}</span></div>
      </article>`
    return `<div class="x-home">
      <header class="x-nav">
        <div class="x-brand"><span class="x-logo">i</span><span>iResume</span></div>
        <nav class="x-tabs"><a href="#" class="is-on">简历</a><a href="#" data-toast="模板库：11 套排版，按风格筛选">模板</a></nav>
        <div class="x-nav-right">
          <span class="x-sync"><i class="x-dot is-ok"></i>已同步</span>
          <button type="button" class="x-icon" data-toast="设置：同步、备份、偏好" aria-label="设置">${icon('settings', 18)}</button>
          <span class="x-avatar">明</span>
        </div>
      </header>
      <main class="x-home-main">
        <div class="x-home-head">
          <div><h1>简历</h1><p>4 份 · 最近编辑于 2 小时前</p></div>
          <div class="x-home-actions">
            <label class="x-search">${icon('search', 16)}<input placeholder="搜索" /></label>
            <button type="button" class="x-btn is-primary" data-go="editor">${icon('plus', 16)}<span>新建</span></button>
          </div>
        </div>
        <div class="x-grid">
          <button type="button" class="x-new" data-go="editor">
            <span class="x-new-plus">${icon('plus', 22)}</span>
            <strong>空白简历</strong>
            <small>直接在纸面上写</small>
          </button>
          ${HOME_DOCS.map(card).join('')}
        </div>
        <section class="x-tpl-sec">
          <div class="x-sec-head"><h2>从模板开始</h2><a href="#" data-toast="浏览全部 11 套模板">全部 11 套 ${icon('chevRight', 14)}</a></div>
          <div class="x-tpl-row">${TEMPLATES.map(
            (t, i) => `<article class="x-card x-tpl" data-go="editor" tabindex="0">
              <div class="x-thumb"><div class="js-scale">${renderResume(SAMPLE, { ...DEFAULT_DESIGN, template: t.id, accent: ACCENTS[i] })}</div></div>
              <div class="x-card-info"><strong>${t.name}</strong></div></article>`
          ).join('')}</div>
        </section>
        <footer class="x-foot">数据只保存在你的浏览器里 · 可选 GitHub 加密同步 · 开源 MIT</footer>
      </main>
    </div>`
  }

  // ------------------------------------------------------------ EDITOR
  function renderEditor() {
    const m = isMobile()
    return `<div class="x-ed${state.preview ? ' is-preview' : ''}">
      <header class="x-top">
        <div class="x-top-left">
          <button type="button" class="x-icon" data-go="home" aria-label="返回">${icon('arrowLeft', 18)}</button>
          ${m ? '' : '<span class="x-logo is-sm">i</span>'}
          <input class="x-docname" data-meta="name" value="${esc(state.doc.name)}" aria-label="简历名称" />
          <span class="x-saved" id="saved">${icon('check', 13)}<span>已保存</span></span>
        </div>
        <div class="x-top-right">
          ${m ? '' : `<button type="button" class="x-btn is-ghost" data-menu="more" aria-label="更多">${icon('more', 18)}</button>`}
          ${m ? '' : `<button type="button" class="x-btn is-ghost" data-action="preview">${icon('eyeView', 16)}<span>预览</span></button>`}
          <button type="button" class="x-btn is-primary" data-menu="export">${icon('download', 16)}<span>导出</span></button>
          ${renderMenu()}
        </div>
      </header>
      ${m ? `<div class="x-mstatus" id="mstatus"></div>` : ''}
      ${m ? '' : `<nav class="x-outline" id="outline" aria-label="区块">${renderOutline()}</nav>`}
      <main class="x-canvas" id="canvas">
        <div class="x-stage" id="x-stage">
          <div class="sheet-wrap" id="sheet-wrap"><div class="sheet" id="sheet"></div></div>
          <div class="x-notes" id="notes"></div>
        </div>
      </main>
      ${m ? renderMobileBar() : renderDock()}
      <div class="x-pop-layer" id="pop-layer">${renderPop()}</div>
      <button type="button" class="x-exit-preview" data-action="preview">${icon('x', 14)}<span>退出预览</span><kbd>Esc</kbd></button>
    </div>`
  }

  function renderMenu() {
    if (state.menu === 'export')
      return `<div class="x-menu is-right" role="menu">${[
        ['file', 'PDF', '投递首选'],
        ['eyeView', 'PNG 图片', '发微信、做预览'],
        ['download', 'JSON 备份', '可再次导入'],
        ['note', 'Markdown', '纯文本粘贴'],
      ]
        .map(([ic, t, d]) => `<button type="button" class="x-menu-item" data-toast="正在导出 ${t}…（原型演示）">${icon(ic, 16)}<span>${t}</span><small>${d}</small></button>`)
        .join('')}</div>`
    if (state.menu === 'more')
      return `<div class="x-menu is-right is-more" role="menu">
        <label class="x-menu-field"><span>版本</span><input data-meta="version" value="${esc(state.doc.version)}" /></label>
        <div class="x-menu-sep"></div>
        ${[
          ['history', '版本历史', '对比差异 / 回滚'],
          ['copy', '复制一份', '针对不同岗位改写'],
          ['upload', '导入', 'JSON / 粘贴已有简历'],
        ]
          .map(([ic, t, d]) => `<button type="button" class="x-menu-item" data-toast="${t}：${d}">${icon(ic, 16)}<span>${t}</span><small>${d}</small></button>`)
          .join('')}
      </div>`
    return ''
  }

  function renderOutline() {
    const tips = allTips()
    const items = state.doc.sections
      .map((s) => {
        const n = tips.filter((t) => t.sid === s.id).length
        return `<li class="x-ol-item${s.visible ? '' : ' is-hidden'}" draggable="true" data-drag="${s.id}">
          <span class="x-ol-grip">${icon('grip', 13)}</span>
          <button type="button" class="x-ol-name" data-jump="${s.id}">${esc(s.title)}</button>
          ${n ? `<span class="x-ol-dot" title="${n} 条建议"></span>` : ''}
          <button type="button" class="x-ol-eye" data-act="toggle" data-sid="${s.id}" aria-label="${s.visible ? '隐藏' : '显示'}">${icon(s.visible ? 'eye' : 'eyeOff', 14)}</button>
        </li>`
      })
      .join('')
    return `<div class="x-ol-label">区块</div>
      <ul class="x-ol">
        <li class="x-ol-item is-fixed"><span class="x-ol-grip"></span><button type="button" class="x-ol-name" data-jump="personal">个人信息</button></li>
        ${items}
      </ul>
      <button type="button" class="x-ol-add" data-toast="可添加：校园经历 / 证书 / 语言 / 自定义">${icon('plus', 14)}<span>添加区块</span></button>`
  }

  function renderDock() {
    const tips = allTips().length
    const btn = (key, ic, label) =>
      `<button type="button" class="x-dock-btn${state.pop === key ? ' is-on' : ''}" data-pop="${key}">${ic}<span>${label}</span></button>`
    return `<div class="x-dock" id="dock">
      ${btn('template', icon('layout', 16), '模板')}
      ${btn('color', `<i class="x-swatch-dot" style="background:${state.design.accent}"></i>`, '颜色')}
      ${btn('type', icon('type', 16), '字体')}
      ${btn('spacing', icon('spacing', 16), '间距')}
      <span class="x-sep"></span>
      <span class="x-fit" id="fit"></span>
      <span class="x-sep"></span>
      <button type="button" class="x-dock-btn${state.pop === 'notes' ? ' is-on' : ''} x-notes-btn" data-pop="notes">${icon('message', 16)}<span>建议</span>${tips ? `<b>${tips}</b>` : ''}</button>
      <button type="button" class="x-dock-icon" data-action="undo" aria-label="撤销" ${undoStack.length ? '' : 'disabled'}>${icon('undo', 16)}</button>
      <button type="button" class="x-dock-icon" data-action="redo" aria-label="重做" ${redoStack.length ? '' : 'disabled'}>${icon('redo', 16)}</button>
    </div>`
  }

  function renderMobileBar() {
    const b = (key, ic, label, attr = `data-pop="${key}"`) =>
      `<button type="button" class="${state.pop === key ? 'is-on' : ''}" ${attr}>${ic}<span>${label}</span></button>`
    return `<nav class="x-mbar">
      ${b('template', icon('layout', 20), '模板')}
      ${b('color', `<i class="x-swatch-dot is-lg" style="background:${state.design.accent}"></i>`, '颜色')}
      ${b('type', icon('type', 20), '字体')}
      ${b('spacing', icon('spacing', 20), '间距')}
      ${b('preview', icon('eyeView', 20), state.preview ? '编辑' : '预览', 'data-action="preview"')}
    </nav>`
  }

  function slider(key, label, min, max, step) {
    const v = state.design[key]
    return `<label class="x-slider"><span>${label}</span><input type="range" data-design="${key}" min="${min}" max="${max}" step="${step}" value="${v}" /><output id="out-${key}">${fmt(key, v)}</output></label>`
  }
  const fmt = (k, v) => (k === 'lineHeight' ? Number(v).toFixed(2) : `${v}px`)

  function renderPop() {
    const d = state.design
    if (!state.pop) return ''
    let body = ''
    if (state.pop === 'template')
      body = `<div class="x-pop-title">模板</div><div class="x-tpl-pick">${TEMPLATES.map(
        (t) => `<button type="button" class="x-tpl-opt${d.template === t.id ? ' is-on' : ''}" data-template="${t.id}"><div class="x-thumb"><div class="js-scale">${renderResume(state.doc, { ...d, template: t.id })}</div></div><span>${t.name}</span></button>`
      ).join('')}</div><button type="button" class="x-link" data-toast="浏览全部 11 套模板">全部 11 套 ${icon('chevRight', 13)}</button>`
    else if (state.pop === 'color')
      body = `<div class="x-pop-title">主题色</div><div class="x-swatches">${ACCENTS.map(
        (c) => `<button type="button" class="x-swatch${d.accent === c ? ' is-on' : ''}" style="--c:${c}" data-accent="${c}" aria-label="${c}"></button>`
      ).join('')}<label class="x-swatch is-custom" title="自定义">${icon('plus', 14)}<input type="color" data-design="accent" value="${d.accent}" /></label></div>`
    else if (state.pop === 'type')
      body = `<div class="x-pop-title">字体</div><div class="x-seg">${FONTS.map(
        (f) => `<button type="button" class="${d.font === f.id ? 'is-on' : ''}" data-font="${f.id}" style="font-family:${f.css}">${f.name}</button>`
      ).join('')}</div>${slider('fontSize', '字号', 12, 16, 0.5)}`
    else if (state.pop === 'spacing')
      body = `<div class="x-pop-title">间距</div>${slider('lineHeight', '行高', 1.3, 1.9, 0.05)}${slider('gap', '区块间距', 6, 28, 1)}${slider('margin', '页边距', 24, 64, 2)}
        <button type="button" class="x-btn is-soft x-fit-btn" data-action="fit">${icon('wand', 15)}<span>自动调整到一页</span></button>`
    else if (state.pop === 'notes') {
      const tips = allTips()
      body = `<div class="x-pop-title">写作建议 <span>${tips.length}</span></div>${
        tips.length
          ? `<div class="x-tip-list">${tips
              .map(
                (t) => `<div class="x-tip"><button type="button" class="x-tip-main" data-jump="${t.sid}:${t.i}"><small>${esc(section(t.sid).title)} · ${esc(section(t.sid).items[t.i].title || '未命名')}</small><span>${esc(t.text)}</span></button><button type="button" class="x-icon is-sm" data-dismiss="${t.key}" aria-label="忽略">${icon('x', 13)}</button></div>`
              )
              .join('')}</div>`
          : `<p class="x-empty">${icon('check', 16)} 没有待处理的建议，写得不错。</p>`
      }`
    }
    return `<div class="x-pop x-pop-${state.pop}" role="dialog">${body}</div>`
  }

  // ------------------------------------------------------------ sheet / measure / notes
  function renderSheet() {
    const sheet = $('#sheet')
    if (!sheet) return
    const fluid = isMobile() && !state.preview
    sheet.classList.toggle('is-fluid', fluid)
    sheet.innerHTML = renderResume(state.doc, state.design, { editable: !state.preview, fluid })
    measure()
  }

  function measure() {
    const sheet = $('#sheet')
    if (!sheet) return
    const page = sheet.querySelector('.rs-page')
    if (!page) return
    sheet.querySelectorAll('.page-break').forEach((el) => el.remove())
    const fluid = page.classList.contains('is-fluid')
    const wrap = $('#sheet-wrap')
    const canvas = $('#canvas')
    let h
    if (fluid) {
      // 手机编辑：用离屏 A4 估算页数
      const probe = document.createElement('div')
      probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;visibility:hidden'
      probe.innerHTML = renderResume(state.doc, state.design)
      document.body.appendChild(probe)
      h = probe.firstElementChild.scrollHeight
      probe.remove()
      sheet.style.transform = ''
      wrap.style.width = ''
      wrap.style.height = ''
    } else {
      page.style.minHeight = '0px'
      h = page.scrollHeight
    }
    state.pages = Math.max(1, Math.ceil((h - 1) / A4_H))
    const rowH = state.design.fontSize * state.design.lineHeight
    state.overflowRows = h > A4_H ? Math.ceil((h - A4_H) / rowH) : 0
    state.spareRows = h <= A4_H ? Math.floor((A4_H - h) / rowH) : 0
    if (!fluid) {
      page.style.minHeight = `${state.pages * A4_H}px`
      for (let i = 1; i < state.pages; i++) {
        const line = document.createElement('div')
        line.className = 'page-break'
        line.style.top = `${i * A4_H}px`
        line.innerHTML = `<span>第 ${i} 页结束</span>`
        sheet.appendChild(line)
      }
      const cw = canvas.clientWidth
      const z = isMobile()
        ? (cw - 24) / A4_W
        : Math.max(0.55, Math.min(1.08, cw >= 1180 ? (cw - 620) / A4_W : (cw - 96) / A4_W))
      state.zoom = z
      sheet.style.transform = `scale(${z})`
      wrap.style.width = `${A4_W * z}px`
      wrap.style.height = `${state.pages * A4_H * z}px`
    }
    renderFit()
    scheduleNotes()
  }

  function renderFit() {
    const tipsN = allTips().length
    const fit = $('#fit')
    if (fit)
      fit.innerHTML = state.overflowRows
        ? `<span class="x-fit-over">${icon('file', 14)}超出 ${state.overflowRows} 行</span><button type="button" class="x-fit-go" data-action="fit">${icon('wand', 13)}适配</button>`
        : `<span class="x-fit-ok">${icon('check', 14)}${state.pages} 页 · 余 ${state.spareRows} 行</span>`
    const ms = $('#mstatus')
    if (ms)
      ms.innerHTML = `${
        state.overflowRows
          ? `<span class="x-fit-over">超出一页 ${state.overflowRows} 行</span><button type="button" class="x-fit-go" data-action="fit">${icon('wand', 13)}适配</button>`
          : `<span class="x-fit-ok">${icon('check', 13)}刚好一页</span>`
      }<span class="x-sb-spacer"></span><button type="button" class="x-mnotes" data-pop="notes">${icon('message', 14)}建议 ${tipsN}</button>`
  }

  let notesRaf = 0
  function scheduleNotes() {
    cancelAnimationFrame(notesRaf)
    notesRaf = requestAnimationFrame(renderNotes)
  }
  function notesRoom() {
    const canvas = $('#canvas')
    const wrap = $('#sheet-wrap')
    if (!canvas || !wrap || isMobile() || state.preview) return false
    return (canvas.clientWidth - wrap.offsetWidth) / 2 >= 268
  }
  function renderNotes() {
    const rail = $('#notes')
    const dock = $('#dock')
    if (!rail) return
    const room = notesRoom()
    dock?.classList.toggle('has-notes-rail', room)
    if (!room) {
      rail.innerHTML = ''
      return
    }
    const sheet = $('#sheet')
    const wrap = $('#sheet-wrap')
    const base = sheet.getBoundingClientRect().top
    rail.style.left = `${wrap.offsetLeft + wrap.offsetWidth + 28}px`
    const tips = allTips()
    const byEntry = new Map()
    for (const t of tips) {
      const k = `${t.sid}:${t.i}`
      if (!byEntry.has(k)) byEntry.set(k, [])
      byEntry.get(k).push(t)
    }
    rail.innerHTML = [...byEntry.entries()]
      .map(([k, ts]) => {
        const [sid, i] = k.split(':')
        const it = section(sid).items[Number(i)]
        return `<div class="x-note" data-note="${k}">
          <div class="x-note-head"><span class="x-note-avatar">${icon('sparkles', 12)}</span><strong>${esc(it.title || '未命名')}</strong></div>
          ${ts.map((t) => `<div class="x-note-row"><p>${esc(t.text)}</p><button type="button" class="x-icon is-sm" data-dismiss="${t.key}" title="忽略">${icon('check', 13)}</button></div>`).join('')}
        </div>`
      })
      .join('')
    let lastBottom = 0
    rail.querySelectorAll('.x-note').forEach((note) => {
      const anchor = sheet.querySelector(`[data-anchor="${note.dataset.note}"]`)
      if (!anchor) return
      const y = anchor.getBoundingClientRect().top - base
      const top = Math.max(y, lastBottom + 10)
      note.style.top = `${top}px`
      lastBottom = top + note.offsetHeight
    })
  }

  // ------------------------------------------------------------ render root
  function render() {
    app.className = `app x-app device-${state.device}`
    stage.classList.toggle('is-mobile', state.device === 'mobile')
    app.innerHTML = (state.view === 'home' ? renderHome() : renderEditor()) + '<div class="x-toast" id="toast" role="status"></div>'
    syncProtoBar()
    requestAnimationFrame(() => {
      scaleThumbs()
      if (state.view === 'editor') renderSheet()
    })
  }
  function scaleThumbs(root = app) {
    root.querySelectorAll('.js-scale').forEach((el) => {
      const w = el.parentElement.clientWidth
      if (w) el.style.transform = `scale(${w / A4_W})`
    })
  }
  function refreshChrome() {
    const ol = $('#outline')
    if (ol) ol.innerHTML = renderOutline()
    const dock = $('#dock')
    if (dock) {
      const room = dock.classList.contains('has-notes-rail')
      dock.outerHTML = renderDock()
      $('#dock')?.classList.toggle('has-notes-rail', room)
    }
    const bar = $('.x-mbar')
    if (bar) bar.outerHTML = renderMobileBar()
    refreshPop()
    renderFit()
  }
  function refreshPop() {
    const layer = $('#pop-layer')
    if (!layer) return
    layer.innerHTML = renderPop()
    requestAnimationFrame(() => scaleThumbs(layer))
    app.querySelectorAll('[data-pop]').forEach((b) => b.classList.toggle('is-on', b.dataset.pop === state.pop))
  }
  function refreshMenu() {
    const right = $('.x-top-right')
    if (!right) return
    right.querySelector('.x-menu')?.remove()
    right.insertAdjacentHTML('beforeend', renderMenu())
  }

  // ------------------------------------------------------------ history
  let saveTimer
  let commitTimer
  function dirty(immediate = false) {
    const s = $('#saved')
    if (s) s.innerHTML = '<i class="x-dot is-busy"></i><span>保存中</span>'
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const s2 = $('#saved')
      if (s2) s2.innerHTML = `${icon('check', 13)}<span>已保存</span>`
    }, 650)
    clearTimeout(commitTimer)
    const commit = () => {
      const snap = JSON.stringify({ doc: state.doc, design: state.design })
      if (snap === lastSnap) return
      undoStack.push(lastSnap)
      redoStack.length = 0
      lastSnap = snap
      app.querySelectorAll('[data-action="undo"]').forEach((b) => (b.disabled = false))
      app.querySelectorAll('[data-action="redo"]').forEach((b) => (b.disabled = true))
    }
    if (immediate) commit()
    else commitTimer = setTimeout(commit, 500)
  }
  function restore(snap) {
    const s = JSON.parse(snap)
    state.doc = s.doc
    state.design = s.design
    lastSnap = snap
    renderSheet()
    refreshChrome()
  }

  // ------------------------------------------------------------ caret helpers
  function caretOffset(el) {
    const sel = getSelection()
    if (!sel.rangeCount) return 0
    const r = sel.getRangeAt(0)
    const pre = r.cloneRange()
    pre.selectNodeContents(el)
    pre.setEnd(r.startContainer, r.startOffset)
    return pre.toString().length
  }
  function placeCaret(el, offset) {
    el.focus()
    const sel = getSelection()
    const r = document.createRange()
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let rem = offset
    let placed = false
    let n = walker.nextNode()
    while (n) {
      if (rem <= n.length) {
        r.setStart(n, rem)
        placed = true
        break
      }
      rem -= n.length
      n = walker.nextNode()
    }
    if (!placed) {
      r.selectNodeContents(el)
      r.collapse(false)
    } else r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)
  }
  function rerenderList(ul, focusLine, offset) {
    const path = ul.dataset.list
    ul.outerHTML = list(path, getPath(path), true)
    const fresh = $(`#sheet [data-list="${path}"]`)
    const li = fresh?.querySelector(`[data-line="${focusLine}"]`)
    if (li) {
      li.textContent = rawLines(getPath(path))[focusLine] ?? ''
      placeCaret(li, offset)
    }
  }

  // ------------------------------------------------------------ actions
  function go(view) {
    state.view = view
    state.pop = null
    state.menu = null
    state.preview = false
    writeHash()
    render()
  }
  function jump(anchor) {
    const el = $(`#sheet [data-anchor="${anchor}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.remove('x-flash')
    void el.offsetWidth
    el.classList.add('x-flash')
    const first = el.querySelector('.ef')
    if (first && !isMobile()) setTimeout(() => placeCaret(first, (first.textContent || '').length), 350)
  }
  function applyDesign(patch) {
    Object.assign(state.design, patch)
    dirty(true)
    renderSheet()
    refreshChrome()
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
    measure()
    let guard = 0
    while (state.overflowRows > 0 && guard++ < 40) {
      if (!steps.some((s) => s())) break
      renderSheet()
    }
    dirty(true)
    refreshChrome()
    const diff = []
    if (d.lineHeight !== before.lineHeight) diff.push(`行高 ${before.lineHeight} → ${d.lineHeight}`)
    if (d.gap !== before.gap) diff.push(`间距 ${before.gap} → ${d.gap}`)
    if (d.margin !== before.margin) diff.push(`边距 ${before.margin} → ${d.margin}`)
    if (d.fontSize !== before.fontSize) diff.push(`字号 ${before.fontSize} → ${d.fontSize}`)
    toast(state.overflowRows ? '已尽量压缩，仍超出一页，建议精简内容' : `已调整到一页：${diff.join('，') || '无需调整'}　⌘Z 撤销`)
  }
  function togglePreview() {
    state.preview = !state.preview
    state.pop = null
    state.menu = null
    $('.x-ed')?.classList.toggle('is-preview', state.preview)
    refreshMenu()
    refreshChrome()
    renderSheet()
  }
  let toastTimer
  function toast(text) {
    const el = $('#toast')
    if (!el) return
    el.textContent = text
    el.classList.add('is-show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2600)
  }

  // ------------------------------------------------------------ events
  app.addEventListener('mousedown', (e) => {
    // 保持编辑焦点：点工具按钮不抢焦点
    if (e.target.closest('.x-entry-tools, .x-sec-tools')) e.preventDefault()
  })

  app.addEventListener('click', (e) => {
    const t = e.target.closest(
      '[data-go],[data-act],[data-jump],[data-pop],[data-menu],[data-action],[data-template],[data-accent],[data-font],[data-dismiss],[data-toast]'
    )
    // 点外部关闭浮层
    if (!e.target.closest('.x-pop, .x-menu, [data-pop], [data-menu]')) {
      let changed = false
      if (state.pop) {
        state.pop = null
        refreshPop()
        changed = true
      }
      if (state.menu) {
        state.menu = null
        refreshMenu()
        changed = true
      }
      if (changed && !t) return
    }
    if (!t) return
    if (t.tagName === 'A') e.preventDefault()
    const ds = t.dataset

    if (ds.go) return go(ds.go)
    if (ds.jump) {
      if (state.pop === 'notes' && isMobile()) {
        state.pop = null
        refreshPop()
      }
      return jump(ds.jump)
    }
    if (ds.pop) {
      state.pop = state.pop === ds.pop ? null : ds.pop
      state.menu = null
      refreshMenu()
      return refreshPop()
    }
    if (ds.menu) {
      state.menu = state.menu === ds.menu ? null : ds.menu
      state.pop = null
      refreshPop()
      return refreshMenu()
    }
    if (ds.template) return applyDesign({ template: ds.template })
    if (ds.accent) return applyDesign({ accent: ds.accent })
    if (ds.font) return applyDesign({ font: ds.font })
    if (ds.dismiss) {
      state.dismissed.add(ds.dismiss)
      refreshChrome()
      return scheduleNotes()
    }
    if (ds.act) {
      const s = section(ds.sid)
      const i = Number(ds.i)
      const blank = { title: '', subtitle: '', date: '', tags: '', details: '' }
      let focus = null
      switch (ds.act) {
        case 'add':
          s.items.push(blank)
          focus = `${s.id}:${s.items.length - 1}`
          break
        case 'insert':
          s.items.splice(i + 1, 0, blank)
          focus = `${s.id}:${i + 1}`
          break
        case 'up':
          if (i > 0) [s.items[i - 1], s.items[i]] = [s.items[i], s.items[i - 1]]
          break
        case 'down':
          if (i < s.items.length - 1) [s.items[i + 1], s.items[i]] = [s.items[i], s.items[i + 1]]
          break
        case 'del':
          s.items.splice(i, 1)
          toast('已删除，⌘Z 撤销')
          break
        case 'hide':
          s.visible = false
          toast(`已隐藏「${s.title}」，可在左侧大纲恢复`)
          break
        case 'toggle':
          s.visible = !s.visible
          break
      }
      dirty(true)
      renderSheet()
      refreshChrome()
      if (focus) {
        const el = $(`#sheet [data-anchor="${focus}"] .ef`)
        if (el) placeCaret(el, 0)
      }
      return
    }
    if (ds.action) {
      switch (ds.action) {
        case 'undo':
          if (undoStack.length) {
            redoStack.push(lastSnap)
            restore(undoStack.pop())
            toast('已撤销')
          }
          return
        case 'redo':
          if (redoStack.length) {
            undoStack.push(lastSnap)
            restore(redoStack.pop())
          }
          return
        case 'fit':
          return fitOnePage()
        case 'preview':
          return togglePreview()
      }
    }
    if (ds.toast) {
      state.menu = null
      refreshMenu()
      return toast(ds.toast)
    }
  })

  // 纸面编辑
  app.addEventListener('input', (e) => {
    const t = e.target
    if (t.dataset.meta) {
      state.doc[t.dataset.meta] = t.value
      return dirty()
    }
    if (t.dataset.design) {
      const k = t.dataset.design
      state.design[k] = k === 'accent' ? t.value : Number(t.value)
      const out = $(`#out-${k}`)
      if (out) out.textContent = fmt(k, state.design[k])
      dirty()
      renderSheet()
      return
    }
    if (t.dataset.path) {
      setPath(t.dataset.path, t.textContent.replace(/\n/g, ' '))
      if (/^sec\.[^.]+\.title$/.test(t.dataset.path)) {
        const ol = $('#outline')
        if (ol) ol.innerHTML = renderOutline()
      }
      dirty()
      measure()
      return
    }
    const ul = t.closest('[data-list]')
    if (ul && t.dataset.line !== undefined) {
      const path = ul.dataset.list
      const arr = rawLines(getPath(path))
      if (!arr.length) arr.push('')
      arr[Number(t.dataset.line)] = t.textContent
      setPath(path, joinLines(arr))
      dirty()
      measure()
      const ol = $('#outline')
      if (ol) ol.innerHTML = renderOutline()
      const dock = $('#dock')
      if (dock) {
        const b = dock.querySelector('.x-notes-btn b')
        const n = allTips().length
        if (b) b.textContent = n
      }
    }
  })
  app.addEventListener('change', (e) => {
    if (e.target.dataset.design === 'accent') refreshChrome()
  })

  app.addEventListener('focusin', (e) => {
    const li = e.target.closest?.('[data-list] [data-line]')
    if (li) {
      const raw = rawLines(getPath(li.parentElement.dataset.list))[Number(li.dataset.line)] ?? ''
      if (li.textContent !== raw) li.textContent = raw
    }
    const ent = e.target.closest?.('[data-anchor]')
    app.querySelectorAll('.is-focus-within').forEach((el) => el.classList.remove('is-focus-within'))
    if (ent && e.target.classList.contains('ef')) ent.classList.add('is-focus-within')
  })
  app.addEventListener('focusout', (e) => {
    const li = e.target.closest?.('[data-list] [data-line]')
    if (li) {
      const ul = li.parentElement
      const raw = rawLines(getPath(ul.dataset.list))[Number(li.dataset.line)] ?? ''
      if (raw.includes('\n')) return rerenderList(ul, -1, 0)
      li.innerHTML = inline(raw)
    }
    if (e.target.dataset?.path?.endsWith('.tags')) scheduleNotes()
  })

  app.addEventListener('keydown', (e) => {
    const t = e.target
    if (t.dataset?.path && e.key === 'Enter') {
      e.preventDefault()
      return
    }
    const li = t.closest?.('[data-list] [data-line]')
    if (!li || e.isComposing) return
    const ul = li.parentElement
    const path = ul.dataset.list
    const k = Number(li.dataset.line)
    const arr = rawLines(getPath(path))
    if (!arr.length) arr.push('')
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = li.textContent
      const off = caretOffset(li)
      arr[k] = text.slice(0, off)
      arr.splice(k + 1, 0, text.slice(off))
      setPath(path, joinLines(arr))
      dirty(true)
      rerenderList(ul, k + 1, 0)
      measure()
    } else if (e.key === 'Backspace' && caretOffset(li) === 0 && getSelection().isCollapsed && k > 0) {
      e.preventDefault()
      const prevLen = arr[k - 1].length
      arr[k - 1] += li.textContent
      arr.splice(k, 1)
      setPath(path, joinLines(arr))
      dirty(true)
      rerenderList(ul, k - 1, prevLen)
      measure()
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey) {
      const target = ul.querySelector(`[data-line="${k + (e.key === 'ArrowUp' ? -1 : 1)}"]`)
      if (target) {
        e.preventDefault()
        placeCaret(target, Math.min(caretOffset(li), (rawLines(getPath(path))[Number(target.dataset.line)] || '').length))
      }
    }
  })

  // 高亮：悬停批注 ↔ 经历
  app.addEventListener('mouseover', (e) => {
    const note = e.target.closest?.('.x-note')
    app.querySelectorAll('.is-noted').forEach((el) => el.classList.remove('is-noted'))
    if (note) $(`#sheet [data-anchor="${note.dataset.note}"]`)?.classList.add('is-noted')
  })

  // 大纲拖拽排序
  let dragId = null
  app.addEventListener('dragstart', (e) => {
    const li = e.target.closest?.('[data-drag]')
    if (!li) return
    dragId = li.dataset.drag
    li.classList.add('is-dragging')
    e.dataTransfer.effectAllowed = 'move'
  })
  app.addEventListener('dragover', (e) => {
    const li = e.target.closest?.('[data-drag]')
    if (!li || !dragId) return
    e.preventDefault()
    app.querySelectorAll('.is-drop').forEach((el) => el.classList.remove('is-drop'))
    li.classList.add('is-drop')
  })
  app.addEventListener('drop', (e) => {
    const li = e.target.closest?.('[data-drag]')
    if (!li || !dragId) return
    e.preventDefault()
    const arr = state.doc.sections
    const from = arr.findIndex((s) => s.id === dragId)
    const to = arr.findIndex((s) => s.id === li.dataset.drag)
    if (from > -1 && to > -1 && from !== to) {
      arr.splice(to, 0, arr.splice(from, 1)[0])
      dirty(true)
      renderSheet()
    }
    dragId = null
    refreshChrome()
  })
  app.addEventListener('dragend', () => {
    dragId = null
    const ol = $('#outline')
    if (ol) ol.innerHTML = renderOutline()
  })

  window.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey
    if (e.key === 'Escape') {
      if (state.preview) return togglePreview()
      if (state.pop || state.menu) {
        state.pop = null
        state.menu = null
        refreshPop()
        refreshMenu()
      }
    } else if (mod && e.key.toLowerCase() === 'z' && state.view === 'editor') {
      const inEditable = document.activeElement?.isContentEditable || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)
      if (inEditable) {
        // 纸面上的撤销走全局历史，保证结构化数据一致
        e.preventDefault()
        document.activeElement.blur()
      } else e.preventDefault()
      app.querySelector(`[data-action="${e.shiftKey ? 'redo' : 'undo'}"]`)?.click()
    }
  })

  let resizeT
  window.addEventListener('resize', () => {
    clearTimeout(resizeT)
    resizeT = setTimeout(() => {
      scaleThumbs()
      if (state.view === 'editor') measure()
    }, 80)
  })

  // ------------------------------------------------------------ prototype bar
  function writeHash() {
    const p = new URLSearchParams()
    p.set('view', state.view)
    if (state.device === 'mobile' && !realPhone) p.set('device', 'mobile')
    history.replaceState(null, '', `#${p}`)
    document.querySelectorAll('[data-pb-link]').forEach((a) => {
      a.href = `${a.dataset.pbLink}#${p}`
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
      state.preview = false
      state.pop = null
      writeHash()
      render()
    }
  })

  writeHash()
  render()
})()
