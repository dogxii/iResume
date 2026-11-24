import { visibleSections } from '../export/visible'
import { plainText } from '../model/inline'
import type { ResumeDoc } from '../model/types'

/**
 * 岗位描述（JD）关键词提取与匹配。完全在本地运行，不依赖分词库：
 * - 英文 / 技术词：按词法切分，别名归一（js → javascript、k8s → kubernetes…）
 * - 中文要求短语：按标点与「熟悉 / 掌握 / 和 / 的 …」等功能词切开，留下 2–8 字的名词短语
 */

export type KeywordKind = 'tech' | 'phrase'
export type Coverage = 'covered' | 'partial' | 'missing'

export interface Keyword {
  /** 归一化后的比较键 */
  key: string
  /** 展示用原文（首次出现的写法） */
  label: string
  kind: KeywordKind
  weight: number
}

export interface MatchedKeyword extends Keyword {
  coverage: Coverage
}

export interface MatchResult {
  keywords: MatchedKeyword[]
  /** 0–100，按权重计算的覆盖度 */
  score: number
}

const ALIAS: Record<string, string> = {
  js: 'javascript',
  es6: 'javascript',
  ecmascript: 'javascript',
  ts: 'typescript',
  'node.js': 'node',
  nodejs: 'node',
  'react.js': 'react',
  reactjs: 'react',
  'vue.js': 'vue',
  vuejs: 'vue',
  vue2: 'vue',
  vue3: 'vue',
  'next.js': 'next',
  nextjs: 'next',
  'nuxt.js': 'nuxt',
  nuxtjs: 'nuxt',
  'angular.js': 'angular',
  angularjs: 'angular',
  golang: 'go',
  k8s: 'kubernetes',
  postgres: 'postgresql',
  pg: 'postgresql',
  mongo: 'mongodb',
  html5: 'html',
  css3: 'css',
  py: 'python',
  'c/c++': 'c++',
  cpp: 'c++',
  csharp: 'c#',
  'three.js': 'three',
  threejs: 'three',
  'd3.js': 'd3',
  tf: 'tensorflow',
  'ci/cd': 'ci/cd',
  cicd: 'ci/cd',
  llms: 'llm',
  restful: 'rest',
  'react-native': 'react native',
  rn: 'react native',
  'spring-boot': 'spring boot',
  springboot: 'spring boot',
}

const TECH = new Set(
  `react vue angular svelte solid javascript typescript node deno bun python java go rust kotlin swift objective-c ruby php scala
  c c++ c# dart lua perl r matlab sql nosql mysql postgresql sqlite oracle redis mongodb elasticsearch clickhouse kafka rabbitmq
  docker kubernetes linux unix git svn webpack vite rollup esbuild babel graphql rest grpc websocket http tcp html css sass scss
  less tailwind bootstrap antd flutter android ios harmonyos electron tauri spark hadoop flink hive tensorflow pytorch keras
  pandas numpy sklearn aws gcp azure nginx django flask fastapi spring express koa nest next nuxt remix jest vitest playwright
  cypress selenium figma sketch photoshop excel tableau powerbi terraform ansible jenkins prometheus grafana webgl three d3 echarts
  unity unreal llm rag nlp ml ai sre devops agile scrum jira ci/cd microservices serverless wasm webassembly redux mobx pinia
  zustand rxjs jquery sass cuda opencv langchain openai stm32 fpga verilog uniapp taro`.split(
    /\s+/
  )
)

const EN_STOP = new Set(
  `a an and or but nor the of to in on for with by from as at into onto about over under than then that this these those is are
  was were be been being will would can could should must may might shall have has had do does did not no yes we you our your
  they their them he she his her it its i me my us who whom which what when where why how all any each every both few more most
  other some such only own same so too very just also etc eg e.g ie i.e plus bonus preferred prefer required require requirement
  requirements responsibilities responsibility responsible including include includes experience experienced experiences year
  years work working works team teams strong good great excellent solid deep knowledge understanding skills skill ability
  abilities able familiar familiarity proficient proficiency knowledgeable hands-on related relevant degree bachelor bachelors
  master masters phd job role position candidate candidates new using use used least based within across well highly self
  motivated communication written verbal environment fast-paced paced company product products business user users help ensure
  will join looking seeking opportunity opportunities minimum maximum level senior junior mid lead years' qualifications
  qualification nice have-to day days per like via build building develop developing development design designing implement
  implementing maintain maintaining support supporting write writing create creating collaborate collaborating closely`.split(
    /\s+/
  )
)

const LATIN = /\.?[A-Za-z][A-Za-z0-9]*(?:[.\-/][A-Za-z0-9]+)*(?:\+\+|#)?/g
const CJK = /[㐀-鿿]/

/** 归一化一个英文 / 技术词；返回空串表示忽略 */
export function canonical(token: string): string {
  const t = token.toLowerCase()
  return ALIAS[t] ?? t
}

function latinTokens(text: string): { raw: string; key: string }[] {
  // 「Webpack/Vite」这类并列写法拆开；CI/CD、C/C++ 等固定写法保留
  return [...text.matchAll(LATIN)]
    .flatMap((m) =>
      m[0].includes('/') && !ALIAS[m[0].toLowerCase()]
        ? m[0].split('/')
        : [m[0]]
    )
    .filter(Boolean)
    .map((raw) => ({ raw, key: canonical(raw) }))
}

/** 中文功能词与修饰语：在这里断开短语 */
const SPLIT = new RegExp(
  [
    '熟练掌握',
    '熟练使用',
    '熟练运用',
    '熟练',
    '熟悉',
    '掌握',
    '精通',
    '了解',
    '理解',
    '具备',
    '具有',
    '拥有',
    '负责',
    '参与',
    '主导',
    '推动',
    '推进',
    '落地',
    '保障',
    '提升',
    '提高',
    '改进',
    '实现',
    '完成',
    '带领',
    '指导',
    '协助',
    '配合',
    '跟进',
    '使用',
    '运用',
    '能够',
    '善于',
    '擅长',
    '优先考虑',
    '优先',
    '及以上',
    '以上',
    '相关',
    '良好的?',
    '较强的?',
    '较好的?',
    '扎实的?',
    '丰富的?',
    '优秀的?',
    '一定的?',
    '深入',
    '深厚的?',
    '至少',
    '任职要求',
    '任职资格',
    '岗位职责',
    '岗位要求',
    '职位描述',
    '工作职责',
    '工作内容',
    '加分项?',
    '包括但不限于',
    '包括',
    '例如',
    '比如',
    '以及',
    '并且',
    '或者',
    '公司',
    '建设',
    '搭建',
    '经验',
    '工作',
    '进行',
    '通过',
    '不限',
    '学历',
    '基本',
    '基础',
    '主流',
    '常用',
    '方面',
    '领域',
    '技术栈',
    '一门',
    '一种',
    '其中',
    '者',
    '年',
    '及',
    '和',
    '与',
    '或',
    '等',
    '的',
    '并',
    '且',
    '在',
    '关注',
    '抽象',
    '大型',
    '核心',
    '前沿',
  ].join('|'),
  'g'
)

const GENERIC = new Set(
  `能力 精神 意识 开发 设计 业务 项目 系统 技术 经验 要求 职责 岗位 团队 我们 你们 优先 良好 本科 硕士 博士 专业 计算机 学习 沟通
  完成 实现 支持 问题 需求 协助 一定 编写 维护 方案 优化 合作 主动 积极 能力强 统招 全日制 以上学历 相关专业 工程师 同学 候选人 薪资
  福利 地点 时间 产品 核心 原理 责任心 责任心强 抗压能力 学习能力 自驱力 日常 持续 推动 落地 保证 提升 质量 负责人 以上 优先考虑 加分 熟悉 掌握 文档`.split(
    /\s+/
  )
)

function phrases(text: string): string[] {
  const out: string[] = []
  const stripped = text.replace(LATIN, '|')
  for (const clause of stripped.split(/[^㐀-鿿]+/)) {
    for (const part of clause.split(SPLIT)) {
      const p = part.trim().replace(/^[有其对把将从]/, '')
      if (p.length < 2 || p.length > 8 || GENERIC.has(p) || !CJK.test(p))
        continue
      out.push(p)
    }
  }
  return out
}

/** 从 JD 中提取关键词，按重要性排序 */
export function extractKeywords(jd: string, limit = 30): Keyword[] {
  const text = jd.normalize('NFKC')
  const map = new Map<string, Keyword & { first: number }>()
  const add = (
    key: string,
    label: string,
    kind: KeywordKind,
    weight: number
  ) => {
    const hit = map.get(key)
    if (hit) hit.weight += weight
    else map.set(key, { key, label, kind, weight, first: map.size })
  }

  const cjkCount = (text.match(/[㐀-鿿]/g) ?? []).length
  const latin = latinTokens(text)
  const chinese = cjkCount > latin.length
  const counts = new Map<string, number>()
  for (const t of latin) counts.set(t.key, (counts.get(t.key) ?? 0) + 1)
  for (const { raw, key } of latin) {
    if (EN_STOP.has(key)) continue
    if (key.length === 1 && !/^[CR]$/.test(raw)) continue
    const techy =
      TECH.has(key) ||
      /[\d.+#/]/.test(key) ||
      /[A-Z]/.test(raw.slice(1)) ||
      chinese ||
      (counts.get(key) ?? 0) >= 2
    if (techy) add(key, raw, 'tech', TECH.has(key) ? 2 : 1)
  }
  for (const p of phrases(text)) add(p, p, 'phrase', 1)

  // 短语互相包含时只留较短且足够具体（≥4 字）的那个，权重合并
  const list = [...map.values()]
  for (const a of list) {
    if (a.kind !== 'phrase' || !map.has(a.key)) continue
    for (const b of list) {
      if (b === a || b.kind !== 'phrase' || !map.has(b.key)) continue
      if (
        b.key.length >= 4 &&
        a.key.length > b.key.length &&
        a.key.includes(b.key)
      ) {
        b.weight += a.weight
        map.delete(a.key)
        break
      }
    }
  }

  return [...map.values()]
    .sort((a, b) => b.weight - a.weight || a.first - b.first)
    .slice(0, limit)
    .map(({ first: _, ...k }) => k)
}

/** 简历中所有可见文字（用于匹配） */
export function resumeText(doc: ResumeDoc): string {
  const parts = [doc.profile.headline]
  for (const s of visibleSections(doc)) {
    parts.push(s.section.title)
    for (const i of s.items)
      parts.push(i.title, i.subtitle, i.tags, i.text, ...i.bullets)
  }
  return plainText(parts.join('\n')).normalize('NFKC')
}

const bigrams = (s: string) =>
  Array.from({ length: s.length - 1 }, (_, i) => s.slice(i, i + 2))

/** 计算简历对一组关键词的覆盖情况 */
export function matchKeywords(
  doc: ResumeDoc,
  keywords: Keyword[]
): MatchResult {
  const text = resumeText(doc)
  const lower = text.toLowerCase()
  const techSet = new Set(latinTokens(text).map((t) => t.key))
  let total = 0
  let got = 0
  const result = keywords.map((k): MatchedKeyword => {
    let coverage: Coverage = 'missing'
    if (k.kind === 'tech') {
      if (techSet.has(k.key) || (k.key.includes(' ') && lower.includes(k.key)))
        coverage = 'covered'
    } else if (text.includes(k.key)) coverage = 'covered'
    else if (k.key.length >= 3) {
      const grams = bigrams(k.key)
      const hit = grams.filter((g) => text.includes(g)).length
      if (hit / grams.length >= 0.6) coverage = 'partial'
    }
    total += k.weight
    got +=
      coverage === 'covered'
        ? k.weight
        : coverage === 'partial'
          ? k.weight / 2
          : 0
    return { ...k, coverage }
  })
  return {
    keywords: result,
    score: total ? Math.round((got / total) * 100) : 0,
  }
}
