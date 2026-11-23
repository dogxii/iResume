// 生成各方向独立的单文件 HTML 原型：node docs/design/prototypes/src/build.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = dirname(fileURLToPath(import.meta.url))
const out = join(src, '..')
const read = (f) => readFileSync(join(src, f), 'utf8')

const directions = [
  {
    file: 'e-canvas.html',
    key: 'E',
    title: '所见即所得',
    css: 'theme-e.css',
    js: 'e.js',
    proto: {},
  },
  {
    file: 'd-clean.html',
    key: 'D',
    title: '简约',
    css: 'theme-d.css',
    proto: {
      themeClass: 'theme-d',
      defaultTheme: 'light',
      defaultDesign: { accent: '#2456d6', template: 'classic' },
      features: { floating: true, createCard: true, pageMode: true },
      copy: {
        brandSub: '',
        greeting: '我的简历',
        lead: '4 份简历 · 自动保存在本地 · 已同步到 GitHub',
        outline: '区块',
      },
    },
  },
  {
    file: 'a-paper.html',
    key: 'A',
    title: '纸墨',
    css: 'theme-a.css',
    proto: {
      themeClass: 'theme-a',
      defaultTheme: 'light',
      defaultDesign: { accent: '#a93f28', template: 'serif' },
      features: {},
      copy: {
        brandSub: '简历书房',
        greeting: '今天，想投哪一份？',
        lead: '每一份简历都是一封自我介绍信。挑一份继续写，或者从一张白纸开始。',
        outline: '目 录',
      },
    },
  },
  {
    file: 'b-studio.html',
    key: 'B',
    title: '工作台',
    css: 'theme-b.css',
    proto: {
      themeClass: 'theme-b',
      defaultTheme: 'dark',
      defaultDesign: { accent: '#6d4fd8', template: 'classic' },
      features: { palette: true, statusbar: true, darkToggle: true },
      copy: {
        brandSub: '',
        greeting: '工作区',
        lead: '4 份简历 · 本地优先 · 已与 GitHub 加密同步。按 ⌘K 随时搜索或执行命令。',
        outline: '大纲',
      },
    },
  },
  {
    file: 'c-guide.html',
    key: 'C',
    title: '向导',
    css: 'theme-c.css',
    proto: {
      themeClass: 'theme-c',
      defaultTheme: 'light',
      defaultDesign: { accent: '#0f766e', template: 'classic' },
      features: { progress: true, coach: true },
      copy: {
        brandSub: '你的求职小帮手',
        greeting: '你好，小明，继续加油！',
        lead: '离一份让 HR 眼前一亮的简历，只差几步。',
        outline: '简历结构',
      },
    },
  },
]

const sharedCss = read('shared.css')

for (const d of directions) {
  const links = directions
    .map((x) => `<a data-pb-link="${x.file}" href="${x.file}" class="${x.key === d.key ? 'is-on' : ''}">${x.key} ${x.title}</a>`)
    .join('')
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>iResume 3.0 原型 · 方案 ${d.key}「${d.title}」</title>
<style>
${sharedCss}
${read(d.css)}
</style>
</head>
<body>
<div class="proto-bar">
  <strong>iResume 3.0 原型</strong>
  <div class="pb-group">${links}</div>
  <div class="pb-group"><button type="button" data-pb-view="home">首页</button><button type="button" data-pb-view="editor">编辑器</button></div>
  <div class="pb-group"><button type="button" data-pb-device="desktop">桌面</button><button type="button" data-pb-device="mobile">手机</button></div>
  <span class="pb-spacer"></span>
  <span>${d.key === 'E' ? '直接点简历上的文字就能改 · 回车新起一条 · 底部 Dock 调样式' : '可点击、可编辑：点简历区块、拖动大纲排序、切「设计」调样式'}</span>
</div>
<div class="stage"><div id="app"></div></div>
<script>window.PROTO = ${JSON.stringify(d.proto)}</script>
<script>
${read(d.js || 'shared.js')}
</script>
</body>
</html>
`
  writeFileSync(join(out, d.file), html)
  console.log('wrote', d.file, `${(html.length / 1024).toFixed(1)} KB`)
}
