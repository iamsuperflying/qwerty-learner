import { CHAPTER_LENGTH, type ChapterState, type LetterMistakes, type Word } from './types.ts'

export { CHAPTER_LENGTH }

export function shuffle<T>(array: T[]): T[] {
  const result = Array.from(array)
  const lastIndex = result.length - 1
  for (let index = 0; index <= lastIndex; index++) {
    const rand = index + Math.floor(Math.random() * (lastIndex - index + 1))
    const value = result[rand]
    result[rand] = result[index]
    result[index] = value
  }
  return result
}

export function mergeLetterMistake(a: LetterMistakes, b: LetterMistakes): LetterMistakes {
  const out: LetterMistakes = { ...a }
  for (const [key, values] of Object.entries(b)) {
    const i = Number(key)
    out[i] = [...(out[i] ?? []), ...values]
  }
  return out
}

export function setupChapter(words: Word[], shouldShuffle: boolean, initialIndex = 0): ChapterState {
  const list = shouldShuffle ? shuffle(words) : [...words]
  const index = shouldShuffle ? 0 : Math.min(Math.max(0, initialIndex), Math.max(0, list.length - 1))
  return {
    words: list,
    index,
    wordCount: index,
    correctCount: 0,
    wrongCount: 0,
    userInputLogs: list.map((_, index) => ({
      index,
      correctCount: 0,
      wrongCount: 0,
      letterMistakes: {},
    })),
    time: 0,
    accuracy: 0,
    wpm: 0,
    isTyping: false,
    isFinished: false,
    isShowSkip: false,
  }
}

function refreshStats(state: ChapterState, time: number): Pick<ChapterState, 'time' | 'accuracy' | 'wpm'> {
  const inputSum = state.correctCount + state.wrongCount === 0 ? 1 : state.correctCount + state.wrongCount
  return {
    time,
    accuracy: Math.round((state.correctCount / inputSum) * 100),
    wpm: time > 0 ? Math.round((state.wordCount / time) * 60) : 0,
  }
}

export function tickTimer(state: ChapterState, addTime = 1): ChapterState {
  return { ...state, ...refreshStats(state, state.time + addTime) }
}

export function startTyping(state: ChapterState): ChapterState {
  return { ...state, isTyping: true }
}

export function pauseTyping(state: ChapterState): ChapterState {
  return { ...state, isTyping: false }
}

export function reportCorrect(state: ChapterState): ChapterState {
  const logs = state.userInputLogs.map((log, i) =>
    i === state.index ? { ...log, correctCount: log.correctCount + 1 } : log,
  )
  return { ...state, correctCount: state.correctCount + 1, userInputLogs: logs }
}

export function reportWrong(state: ChapterState, mistakes: LetterMistakes, wordWrongCount: number): ChapterState {
  const logs = state.userInputLogs.map((log, i) =>
    i === state.index
      ? {
          ...log,
          wrongCount: log.wrongCount + 1,
          letterMistakes: mergeLetterMistake(log.letterMistakes, mistakes),
        }
      : log,
  )
  return {
    ...state,
    wrongCount: state.wrongCount + 1,
    userInputLogs: logs,
    isShowSkip: wordWrongCount >= 4,
  }
}

export function nextWord(state: ChapterState): ChapterState {
  return {
    ...state,
    index: state.index + 1,
    wordCount: state.wordCount + 1,
    isShowSkip: false,
  }
}

export function loopCurrentWord(state: ChapterState): ChapterState {
  return {
    ...state,
    wordCount: state.wordCount + 1,
    isShowSkip: false,
  }
}

export function skipWord(state: ChapterState): ChapterState {
  const newIndex = state.index + 1
  if (newIndex >= state.words.length) {
    return { ...state, isTyping: false, isFinished: true, isShowSkip: false }
  }
  return { ...state, index: newIndex, isShowSkip: false }
}

export function skipToIndex(state: ChapterState, newIndex: number): ChapterState {
  const clamped = Math.max(0, Math.min(newIndex, state.words.length - 1))
  if (newIndex >= state.words.length) {
    return { ...state, index: clamped, isTyping: false, isFinished: true }
  }
  return { ...state, index: clamped }
}

export function finishChapter(state: ChapterState): ChapterState {
  const next = {
    ...state,
    wordCount: state.wordCount + 1,
    isTyping: false,
    isFinished: true,
    isShowSkip: false,
  }
  return { ...next, ...refreshStats(next, next.time) }
}

export function wordAccuracy(state: ChapterState): number {
  if (state.words.length === 0) return 0
  const wrongWords = state.userInputLogs.filter((log) => log.wrongCount > 0).length
  return Math.floor(((state.words.length - wrongWords) / state.words.length) * 100)
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function chapterCountOf(length: number): number {
  return Math.max(1, Math.ceil(length / CHAPTER_LENGTH))
}
