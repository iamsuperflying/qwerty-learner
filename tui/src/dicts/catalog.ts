import catalogJson from './catalog.json' with { type: 'json' }
import { chapterCountOf } from '../engine/chapter.ts'
import type { DictMeta } from '../engine/types.ts'

type RawDict = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  url: string
  length: number
  language: string
  languageCategory: string
}

const raw = catalogJson as RawDict[]

export function getDictionaries(): DictMeta[] {
  return raw.map((d) => ({
    ...d,
    chapterCount: chapterCountOf(d.length),
  }))
}

export function getDictById(id: string): DictMeta {
  const all = getDictionaries()
  return all.find((d) => d.id === id) ?? all.find((d) => d.id === 'cet4')!
}

export function categoriesOf(dicts: DictMeta[] = getDictionaries()): string[] {
  return [...new Set(dicts.map((d) => d.category))]
}
