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
  keySounds: boolean
  keySound: string
  transRead: boolean
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
  keySounds: true,
  keySound: 'Default.wav',
  transRead: false,
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
CREATE TABLE IF NOT EXISTS chapter_records (
  id INTEGER PRIMARY KEY,
  dict TEXT NOT NULL,
  chapter INTEGER,
  time_stamp INTEGER NOT NULL,
  time INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  word_number INTEGER NOT NULL,
  correct_word_indexes TEXT NOT NULL,
  word_record_ids TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chapter_dict_chapter
  ON chapter_records(dict, chapter);
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
  instance.prepare("UPDATE meta SET value = '2' WHERE key = 'schema_version'").run()
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
    keySounds: raw.keySounds ?? true,
    keySound: raw.keySound ?? 'Default.wav',
    transRead: raw.transRead ?? false,
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

export type ChapterRecordInput = {
  dict: string
  chapter: number | null
  timeStamp: number
  time: number
  correctCount: number
  wrongCount: number
  wordCount: number
  wordNumber: number
  correctWordIndexes: number[]
  wordRecordIds: string[]
}

export type ChapterRecordRow = ChapterRecordInput & { id: number }

export function saveChapterRecord(input: ChapterRecordInput) {
  getDb()
    .prepare(
      `INSERT INTO chapter_records
        (dict, chapter, time_stamp, time, correct_count, wrong_count, word_count, word_number, correct_word_indexes, word_record_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.dict,
      input.chapter,
      input.timeStamp,
      input.time,
      input.correctCount,
      input.wrongCount,
      input.wordCount,
      input.wordNumber,
      JSON.stringify(input.correctWordIndexes),
      JSON.stringify(input.wordRecordIds),
    )
}

type ChapterRow = {
  id: number
  dict: string
  chapter: number | null
  time_stamp: number
  time: number
  correct_count: number
  wrong_count: number
  word_count: number
  word_number: number
  correct_word_indexes: string
  word_record_ids: string
}

function rowToChapter(row: ChapterRow): ChapterRecordRow {
  let correctWordIndexes: number[] = []
  let wordRecordIds: string[] = []
  try {
    correctWordIndexes = JSON.parse(row.correct_word_indexes)
  } catch {
    correctWordIndexes = []
  }
  try {
    wordRecordIds = JSON.parse(row.word_record_ids)
  } catch {
    wordRecordIds = []
  }
  return {
    id: row.id,
    dict: row.dict,
    chapter: row.chapter,
    timeStamp: row.time_stamp,
    time: row.time,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    wordCount: row.word_count,
    wordNumber: row.word_number,
    correctWordIndexes,
    wordRecordIds,
  }
}

export function loadChapterRecords(limit = 8): ChapterRecordRow[] {
  const rows = getDb()
    .prepare('SELECT * FROM chapter_records ORDER BY time_stamp DESC LIMIT ?')
    .all(limit) as ChapterRow[]
  return rows.map(rowToChapter)
}

export type HeatCell = { date: string; count: number }

export type StatsSummary = {
  wordCount: number
  chapterCount: number
  dayCount: number
  avgWpm: number
  avgAccuracy: number
  heatmap: HeatCell[]
  recent: ChapterRecordRow[]
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function loadStatsSummary(): StatsSummary {
  const database = getDb()
  const wordCount = (database.prepare('SELECT COUNT(*) AS n FROM word_records').get() as { n: number }).n
  const chapterCount = (database.prepare('SELECT COUNT(*) AS n FROM chapter_records').get() as { n: number }).n
  const dayCount = (database.prepare("SELECT COUNT(DISTINCT date(time_stamp, 'unixepoch', 'localtime')) AS n FROM word_records").get() as { n: number }).n
  const avg = database.prepare(
    `SELECT AVG(CASE WHEN time > 0 THEN (word_count * 60.0 / time) END) AS wpm,
            AVG(CASE WHEN correct_count + wrong_count > 0 THEN (correct_count * 100.0 / (correct_count + wrong_count)) END) AS acc
     FROM chapter_records`,
  ).get() as { wpm: number | null; acc: number | null }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 16 * 7)
  start.setDate(start.getDate() - start.getDay())
  const startUnix = Math.floor(start.getTime() / 1000)
  const rows = database
    .prepare(
      `SELECT date(time_stamp, 'unixepoch', 'localtime') AS d, COUNT(*) AS n
       FROM word_records
       WHERE time_stamp >= ?
       GROUP BY d`,
    )
    .all(startUnix) as { d: string; n: number }[]
  const byDay = new Map(rows.map((r) => [r.d, r.n]))
  const heatmap: HeatCell[] = []
  const cursor = new Date(start)
  const end = new Date(today)
  end.setDate(end.getDate() + 1)
  while (cursor < end) {
    const key = ymd(cursor)
    heatmap.push({ date: key, count: byDay.get(key) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  return {
    wordCount,
    chapterCount,
    dayCount,
    avgWpm: Math.round(avg.wpm ?? 0),
    avgAccuracy: Math.round(avg.acc ?? 0),
    heatmap,
    recent: loadChapterRecords(8),
  }
}

export function backupPath() {
  return path.join(dataDir(), 'backup.json')
}

export function exportBackup(): string {
  const file = backupPath()
  const payload = {
    version: 1 as const,
    config: loadConfig(),
    wordRecords: loadRecords(),
    chapterRecords: loadChapterRecords(100000),
  }
  fs.writeFileSync(file, JSON.stringify(payload, null, 2))
  return file
}

export function importBackup(): { words: number; chapters: number; file: string } {
  const file = backupPath()
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    config?: Partial<TuiConfig>
    wordRecords?: WordRecord[]
    chapterRecords?: ChapterRecordRow[]
  }
  const database = getDb()
  let words = 0
  let chapters = 0
  if (Array.isArray(raw.wordRecords)) {
    const insert = database.prepare(
      `INSERT OR IGNORE INTO word_records
        (id, word, dict, chapter, time_stamp, wrong_count, timing, mistakes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    database.exec('BEGIN')
    try {
      for (const record of raw.wordRecords) {
        const result = insert.run(
          record.id,
          record.word,
          record.dict,
          record.chapter,
          record.timeStamp,
          record.wrongCount,
          JSON.stringify(record.timing ?? []),
          JSON.stringify(record.mistakes ?? {}),
        )
        if (result.changes > 0) words += 1
      }
      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }
  if (Array.isArray(raw.chapterRecords)) {
    const insert = database.prepare(
      `INSERT INTO chapter_records
        (dict, chapter, time_stamp, time, correct_count, wrong_count, word_count, word_number, correct_word_indexes, word_record_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    database.exec('BEGIN')
    try {
      for (const row of raw.chapterRecords) {
        insert.run(
          row.dict,
          row.chapter,
          row.timeStamp,
          row.time,
          row.correctCount,
          row.wrongCount,
          row.wordCount,
          row.wordNumber,
          JSON.stringify(row.correctWordIndexes ?? []),
          JSON.stringify(row.wordRecordIds ?? []),
        )
        chapters += 1
      }
      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }
  if (raw.config) {
    saveConfig(normalizeConfig(raw.config))
  }
  return { words, chapters, file }
}
