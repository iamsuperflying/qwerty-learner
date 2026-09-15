import { EXPLICIT_SPACE, type ApplyKind, type WordState } from './types.ts'

export function normalizeHeadword(name: string): string {
  return name.replace(/ /g, EXPLICIT_SPACE).replace(/…/g, '..')
}

export function createWordState(name: string, now = Date.now()): WordState {
  const displayWord = normalizeHeadword(name)
  return {
    displayWord,
    inputWord: '',
    letterStates: Array.from({ length: displayWord.length }, () => 'normal'),
    isFinished: false,
    hasWrong: false,
    hasMadeInputWrong: false,
    wrongCount: 0,
    startTime: now,
    endTime: null,
    correctCount: 0,
    letterTimeArray: [],
    letterMistake: {},
    randomLetterVisible: displayWord.split('').map(() => Math.random() > 0.4),
  }
}

export function applyChar(
  state: WordState,
  rawKey: string,
  ignoreCase: boolean,
): { kind: ApplyKind; state: WordState } {
  if (state.hasWrong || state.isFinished) {
    return { kind: 'ignored', state }
  }

  const char = rawKey === ' ' ? EXPLICIT_SPACE : rawKey
  if (char.length !== 1) {
    return { kind: 'ignored', state }
  }

  const inputWord = state.inputWord + char
  const index = inputWord.length - 1
  const correctChar = state.displayWord[index]
  if (correctChar === undefined) {
    return { kind: 'ignored', state }
  }

  const equal = ignoreCase ? char.toLowerCase() === correctChar.toLowerCase() : char === correctChar

  if (equal) {
    const letterStates = [...state.letterStates]
    letterStates[index] = 'correct'
    const isFinished = inputWord.length >= state.displayWord.length
    return {
      kind: 'correct',
      state: {
        ...state,
        inputWord,
        letterStates,
        letterTimeArray: [...state.letterTimeArray, Date.now()],
        correctCount: state.correctCount + 1,
        isFinished,
        endTime: isFinished ? Date.now() : state.endTime,
      },
    }
  }

  const letterStates = [...state.letterStates]
  letterStates[index] = 'wrong'
  const prev = state.letterMistake[index] ?? []
  return {
    kind: 'wrong',
    state: {
      ...state,
      inputWord,
      letterStates,
      hasWrong: true,
      hasMadeInputWrong: true,
      wrongCount: state.wrongCount + 1,
      letterTimeArray: [],
      letterMistake: { ...state.letterMistake, [index]: [...prev, char] },
    },
  }
}

export function clearWrongInput(state: WordState): WordState {
  return {
    ...state,
    inputWord: '',
    letterStates: state.letterStates.map(() => 'normal' as const),
    hasWrong: false,
  }
}

export function timingDiffs(letterTimeArray: number[]): number[] {
  const timing: number[] = []
  for (let i = 1; i < letterTimeArray.length; i++) {
    timing.push(letterTimeArray[i] - letterTimeArray[i - 1])
  }
  return timing
}
