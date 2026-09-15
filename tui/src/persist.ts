import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { DictationType, LetterMistakes } from './engine/types.ts'

export type TuiConfig = {
  dictId: string
  chapter: number
  ignoreCase: boolean
  isTransVisible: boolean
  shuffle: boolean
  loopTimes: number
  phonetic: boolean
  dictation: { isOpen: boolean; type: DictationType }
  pronunciation: { isOpen: boolean; type: 'us' | 'uk' }
  forceSystemAbc: boolean
  wordIndex: number
}

export type WordRecord = {
  id: string
  word: string
  dict: string
  chapter: number | null
  timeStamp: number
  wrongCount: number
  timing: number[]
  mistakes: LetterMistakes
}

export type WordRecordsFile = { version: 1; records: WordRecord[] }

export const defaultConfig: TuiConfig = {
  dictId: 'cet4',
  chapter: 0,
  ignoreCase: true,
  isTransVisible: true,
  shuffle: false,
  loopTimes: 1,
  phonetic: true,
  dictation: { isOpen: false, type: 'hideAll' },
  pronunciation: { isOpen: true, type: 'us' },
  forceSystemAbc: false,
  wordIndex: 0,
}

export function dataDir(): string {
  return path.join(os.homedir(), '.qwerty-learner')
}

function configJsonPath() {
  return path.join(dataDir(), 'config.json')
}

function recordsJsonPath() {
  return path.join(dataDir(), 'records.json')
}

function dbPath() {
  return path.join(dataDir(), 'qwerty.db')
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS word_records (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  dict TEXT NOT NULL,
  chapter INTEGER,
  time_stamp INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  timing TEXT NOT NULL,
  mistakes TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_word_records_dict_chapter
  ON word_records(dict, chapter);
CREATE INDEX IF NOT EXISTS idx_word_records_wrong
  ON word_records(dict, word, wrong_count);
`

let db: DatabaseSync | null = null

function getDb(): DatabaseSync {
  if (db) return db
  fs.mkdirSync(dataDir(), { recursive: true })
  const instance = new DatabaseSync(dbPath())
  instance.exec('PRAGMA journal_mode = WAL')
  instance.exec('PRAGMA busy_timeout = 3000')
  instance.exec('PRAGMA foreign_keys = ON')
  instance.exec(SCHEMA)
  instance.prepare("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', '1')").run()
  migrateFromJson(instance)
  db = instance
  process.once('exit', () => {
    try {
      db?.close()
    } catch {
      // ignore
    }
  })
  return instance
}

function normalizeConfig(raw: Partial<TuiConfig> & { autoIme?: boolean }): TuiConfig {
  return {
    ...defaultConfig,
    ...raw,
    dictation: { ...defaultConfig.dictation, ...raw.dictation },
    pronunciation: { ...defaultConfig.pronunciation, ...raw.pronunciation },
    forceSystemAbc: raw.forceSystemAbc ?? false,
    wordIndex: typeof raw.wordIndex === 'number' ? raw.wordIndex : -1,
  }
}

function migrateFromJson(database: DatabaseSync) {
  const configRow = database.prepare('SELECT payload FROM config WHERE id = 1').get() as { payload: string } | undefined
  const countRow = database.prepare('SELECT COUNT(*) AS n FROM word_records').get() as { n: number }

  if (!configRow && fs.existsSync(configJsonPath())) {
    try {
      const raw = JSON.parse(fs.readFileSync(configJsonPath(), 'utf8')) as Partial<TuiConfig>
      const cfg = normalizeConfig(raw)
      database.prepare('INSERT INTO config(id, payload) VALUES (1, ?)').run(JSON.stringify(cfg))
      fs.renameSync(configJsonPath(), `${configJsonPath()}.bak`)
    } catch {
      // keep json; next launch can retry
    }
  }

  if (countRow.n === 0 && fs.existsSync(recordsJsonPath())) {
    try {
      const raw = JSON.parse(fs.readFileSync(recordsJsonPath(), 'utf8')) as WordRecordsFile
      const records = Array.isArray(raw.records) ? raw.records : []
      const insert = database.prepare(
        `INSERT OR REPLACE INTO word_records
          (id, word, dict, chapter, time_stamp, wrong_count, timing, mistakes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      database.exec('BEGIN')
      try {
        for (const record of records) {
          insert.run(
            record.id,
            record.word,
            record.dict,
            record.chapter,
            record.timeStamp,
            record.wrongCount,
            JSON.stringify(record.timing ?? []),
            JSON.stringify(record.mistakes ?? {}),
          )
        }
        database.exec('COMMIT')
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
      fs.renameSync(recordsJsonPath(), `${recordsJsonPath()}.bak`)
    } catch {
      // keep json
    }
  }
}

type WordRow = {
  id: string
  word: string
  dict: string
  chapter: number | null
  time_stamp: number
  wrong_count: number
  timing: string
  mistakes: string
}

function rowToRecord(row: WordRow): WordRecord {
  let timing: number[] = []
  let mistakes: LetterMistakes = {}
  try {
    timing = JSON.parse(row.timing)
  } catch {
    timing = []
  }
  try {
    mistakes = JSON.parse(row.mistakes)
  } catch {
    mistakes = {}
  }
  return {
    id: row.id,
    word: row.word,
    dict: row.dict,
    chapter: row.chapter,
    timeStamp: row.time_stamp,
    wrongCount: row.wrong_count,
    timing,
    mistakes,
  }
}

export function loadConfig(): TuiConfig {
  const row = getDb().prepare('SELECT payload FROM config WHERE id = 1').get() as { payload: string } | undefined
  if (!row) return { ...defaultConfig }
  try {
    return normalizeConfig(JSON.parse(row.payload) as Partial<TuiConfig>)
  } catch {
    return { ...defaultConfig }
  }
}

export function saveConfig(config: TuiConfig) {
  getDb()
    .prepare(
      `INSERT INTO config(id, payload) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
    )
    .run(JSON.stringify(config))
}

export function loadRecords(): WordRecord[] {
  const rows = getDb().prepare('SELECT * FROM word_records ORDER BY time_stamp ASC').all() as WordRow[]
  return rows.map(rowToRecord)
}

export function appendRecord(record: WordRecord) {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO word_records
        (id, word, dict, chapter, time_stamp, wrong_count, timing, mistakes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      record.id,
      record.word,
      record.dict,
      record.chapter,
      record.timeStamp,
      record.wrongCount,
      JSON.stringify(record.timing ?? []),
      JSON.stringify(record.mistakes ?? {}),
    )
}

export function deleteWordRecords(word: string, dict: string) {
  getDb().prepare('DELETE FROM word_records WHERE word = ? AND dict = ?').run(word, dict)
}

export function inferWordIndex(dictId: string, chapter: number, words: { name: string }[]): number {
  const recs = getDb()
    .prepare('SELECT DISTINCT word FROM word_records WHERE dict = ? AND chapter = ?')
    .all(dictId, chapter) as { word: string }[]
  if (recs.length === 0) return 0
  const seen = new Set(recs.map((r) => r.word))
  let i = 0
  while (i < words.length && seen.has(words[i].name)) i += 1
  return i
}

export type ErrorGroup = {
  word: string
  dict: string
  wrongCount: number
  records: WordRecord[]
}

export function groupErrorBook(records: WordRecord[] = loadRecords()): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>()
  for (const record of records) {
    if (record.wrongCount <= 0) continue
    const key = `${record.dict}\0${record.word}`
    let group = groups.get(key)
    if (!group) {
      group = { word: record.word, dict: record.dict, wrongCount: 0, records: [] }
      groups.set(key, group)
    }
    group.records.push(record)
    group.wrongCount += record.wrongCount
  }
  return [...groups.values()].sort((a, b) => b.wrongCount - a.wrongCount)
}
