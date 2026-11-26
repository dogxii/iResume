import { describe, expect, it } from 'vitest'
import { createDoc, setPersonName } from './defaults'

describe('setPersonName', () => {
  it('未命名的简历跟着姓名改名，清空姓名后恢复默认', () => {
    const doc = createDoc()
    setPersonName(doc, '张三')
    expect(doc.name).toBe('张三的简历')
    setPersonName(doc, '张三丰')
    expect(doc.name).toBe('张三丰的简历')
    setPersonName(doc, '')
    expect(doc.name).toBe('未命名简历')
  })

  it('用户自己起的名称不动', () => {
    const doc = createDoc({ name: '投字节' })
    setPersonName(doc, '张三')
    expect(doc.name).toBe('投字节')
    const sample = createDoc({ sample: true })
    setPersonName(sample, '李四')
    expect(sample.name).toBe('示例简历')
  })

  it('英文简历用英文名称', () => {
    const doc = createDoc({ locale: 'en' })
    setPersonName(doc, 'Jordan Lee')
    expect(doc.name).toBe('Jordan Lee – Resume')
  })
})
