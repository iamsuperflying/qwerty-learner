import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHAPTER_LENGTH } from '../engine/chapter.ts'
import type { DictMeta, Word } from '../engine/types.ts'
import { firstChapter } from './firstChapter.ts'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export function dictFilePath(url: string): string {
  const rel = url.replace(/^\//, '')
  return path.join(repoRoot, 'public', rel)
}

export function normalizeWord(raw: Record<string, unknown>): Word {
  let trans: string[]
  const value = raw.trans
  if (Array.isArray(value)) {
    trans = value.filter((item) => typeof item === 'string') as string[]
  } else if (value === null || value === undefined || typeof value === 'object') {
    trans = []
  } else {
    trans = [String(value)]
  }
  const usphone = typeof raw.usphone === 'string' ? raw.usphone : typeof raw.pron === 'string' ? raw.pron : ''
  const ukphone = typeof raw.ukphone === 'string' ? raw.ukphone : ''
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    trans,
    usphone,
    ukphone,
    notation: typeof raw.notation === 'string' ? raw.notation : undefined,
  }
}

export function loadDictWords(dict: DictMeta): Word[] {
  const file = dictFilePath(dict.url)
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>[]
  return raw.map(normalizeWord).filter((w) => w.name)
}

export function loadChapterWords(dict: DictMeta, chapter: number): Word[] {
  if (dict.id === 'cet4' && chapter === 0) {
    return firstChapter.map((w) => normalizeWord(w))
  }
  const words = loadDictWords(dict)
  return words.slice(chapter * CHAPTER_LENGTH, (chapter + 1) * CHAPTER_LENGTH)
}

export function lookupWord(dict: DictMeta, name: string): Word | undefined {
  try {
    return loadDictWords(dict).find((w) => w.name === name)
  } catch {
    return undefined
  }
}
