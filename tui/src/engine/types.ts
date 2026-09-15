export const EXPLICIT_SPACE = '␣'
export const CHAPTER_LENGTH = 20
export const WRONG_CLEAR_MS = 300
export const SKIP_AFTER_WRONG = 4
export const VOWELS = ['A', 'E', 'I', 'O', 'U']

export type LetterState = 'normal' | 'correct' | 'wrong'
export type LetterMistakes = Record<number, string[]>
export type DictationType = 'hideAll' | 'hideVowel' | 'hideConsonant' | 'randomHide'

export type Word = {
  name: string
  trans: string[]
  usphone: string
  ukphone: string
  notation?: string
}

export type WordState = {
  displayWord: string
  inputWord: string
  letterStates: LetterState[]
  isFinished: boolean
  hasWrong: boolean
  hasMadeInputWrong: boolean
  wrongCount: number
  startTime: number
  endTime: number | null
  correctCount: number
  letterTimeArray: number[]
  letterMistake: LetterMistakes
  randomLetterVisible: boolean[]
}

export type UserInputLog = {
  index: number
  correctCount: number
  wrongCount: number
  letterMistakes: LetterMistakes
}

export type ChapterState = {
  words: Word[]
  index: number
  wordCount: number
  correctCount: number
  wrongCount: number
  userInputLogs: UserInputLog[]
  time: number
  accuracy: number
  wpm: number
  isTyping: boolean
  isFinished: boolean
  isShowSkip: boolean
}

export type DictMeta = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  url: string
  length: number
  language: string
  languageCategory: string
  chapterCount: number
}

export type ApplyKind = 'ignored' | 'correct' | 'wrong'
