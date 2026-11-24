import { describe, expect, it } from 'vitest'
import { createDoc } from '../model/defaults'
import type { ResumeDoc } from '../model/types'
import { extractKeywords, matchKeywords } from './keywords'

const JD = `岗位职责：
1. 负责公司核心产品的前端开发与性能优化；
2. 参与前端工程化建设，推动组件库落地。
任职要求：
1. 3 年以上前端开发经验，熟练掌握 React、TypeScript；
2. 熟悉 Node.js 和 Webpack/Vite；
3. 有 K8s 经验者优先；
4. 良好的沟通能力和团队协作精神。`

describe('extractKeywords', () => {
  const keys = extractKeywords(JD).map((k) => k.key)
  it('提取并归一化技术词', () => {
    expect(keys).toEqual(
      expect.arrayContaining([
        'react',
        'typescript',
        'node',
        'webpack',
        'vite',
        'kubernetes',
      ])
    )
  })
  it('提取中文要求短语，去掉功能词与空泛词', () => {
    expect(keys).toEqual(
      expect.arrayContaining([
        '前端开发',
        '性能优化',
        '前端工程化',
        '组件库',
        '沟通能力',
      ])
    )
    for (const k of ['能力', '经验', '熟悉', '岗位职责', '以上'])
      expect(keys).not.toContain(k)
  })
  it('重复出现的词权重更高', () => {
    const list = extractKeywords(JD)
    const dev = list.find((k) => k.key === '前端开发')
    expect(dev?.weight).toBeGreaterThanOrEqual(2)
  })
  it('英文 JD 只保留像技术词的词', () => {
    const en = extractKeywords(
      'We are looking for a Senior Frontend Engineer with strong experience in React and GraphQL. Experience with AWS and CI/CD is a plus. You will work closely with the design team.'
    ).map((k) => k.key)
    expect(en).toEqual(
      expect.arrayContaining(['react', 'graphql', 'aws', 'ci/cd'])
    )
    for (const k of ['we', 'strong', 'experience', 'closely', 'team'])
      expect(en).not.toContain(k)
  })
  it('空 JD 返回空列表', () => {
    expect(extractKeywords('   ')).toEqual([])
  })
})

describe('matchKeywords', () => {
  const doc: ResumeDoc = createDoc()
  doc.sections = [
    {
      id: 's1',
      kind: 'experience',
      title: '工作经历',
      layout: 'entries',
      items: [
        {
          id: 'i1',
          title: '星图科技',
          subtitle: '前端工程师',
          location: '',
          start: '',
          end: '',
          links: [],
          tags: 'React.js, TS, Vite',
          text: '',
          bullets: [
            '主导首屏**性能优化**，LCP 降低 40%',
            '搭建前端工程体系与组件库',
          ],
        },
      ],
    },
  ]
  const result = matchKeywords(doc, extractKeywords(JD))
  const cov = Object.fromEntries(
    result.keywords.map((k) => [k.key, k.coverage])
  )
  it('别名与 markdown 不影响匹配', () => {
    expect(cov.react).toBe('covered')
    expect(cov.typescript).toBe('covered')
    expect(cov.性能优化).toBe('covered')
    expect(cov.组件库).toBe('covered')
  })
  it('部分命中的短语标为 partial', () => {
    expect(cov.前端工程化).toBe('partial')
  })
  it('缺失的词标为 missing，分数在 0–100 之间', () => {
    expect(cov.kubernetes).toBe('missing')
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThan(100)
  })
  it('隐藏的条目不计入', () => {
    const hidden = structuredClone(doc)
    hidden.sections[0].items[0].hidden = true
    const r = matchKeywords(hidden, extractKeywords(JD))
    expect(r.keywords.find((k) => k.key === 'react')?.coverage).toBe('missing')
  })
})
