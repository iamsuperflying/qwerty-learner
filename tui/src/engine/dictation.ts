import { VOWELS, type DictationType, type WordState } from './types.ts'

export function isLetterVisible(
  state: WordState,
  index: number,
  dictation: { isOpen: boolean; type: DictationType },
  peeking: boolean,
): boolean {
  if (state.letterStates[index] === 'correct' || peeking) return true
  if (!dictation.isOpen) return true

  if (dictation.type === 'hideAll') return false

  const letter = state.displayWord[index] ?? ''
  if (dictation.type === 'hideVowel') {
    return !VOWELS.includes(letter.toUpperCase())
  }
  if (dictation.type === 'hideConsonant') {
    return VOWELS.includes(letter.toUpperCase())
  }
  if (dictation.type === 'randomHide') {
    return state.randomLetterVisible[index] ?? true
  }
  return true
}

export const DICTATION_CYCLE: Array<{ isOpen: boolean; type: DictationType; label: string }> = [
  { isOpen: false, type: 'hideAll', label: '关' },
  { isOpen: true, type: 'hideAll', label: '全藏' },
  { isOpen: true, type: 'hideVowel', label: '藏元音' },
  { isOpen: true, type: 'hideConsonant', label: '藏辅音' },
  { isOpen: true, type: 'randomHide', label: '随机藏' },
]

export function nextDictation(current: { isOpen: boolean; type: DictationType }) {
  const i = DICTATION_CYCLE.findIndex((d) => d.isOpen === current.isOpen && d.type === current.type)
  return DICTATION_CYCLE[(i + 1) % DICTATION_CYCLE.length]
}

export function dictationLabel(current: { isOpen: boolean; type: DictationType }) {
  return DICTATION_CYCLE.find((d) => d.isOpen === current.isOpen && d.type === current.type)?.label ?? '关'
}
