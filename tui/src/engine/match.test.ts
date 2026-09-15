import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyChar, clearWrongInput, createWordState, normalizeHeadword } from './match.ts'
import { isLetterVisible } from './dictation.ts'
import { setupChapter, tickTimer, reportCorrect, nextWord, skipWord, wordAccuracy } from './chapter.ts'

describe('match', () => {
  it('normalizes spaces and ellipsis', () => {
    assert.equal(normalizeHeadword('ice cream'), 'ice␣cream')
    assert.equal(normalizeHeadword('wait…'), 'wait..')
  })

  it('accepts ignore-case letters', () => {
    let { state } = applyChar(createWordState('cancel'), 'C', true)
    assert.equal(state.letterStates[0], 'correct')
    ;({ state } = applyChar(createWordState('cancel'), 'C', false))
    assert.equal(state.letterStates[0], 'wrong')
  })

  it('maps space to explicit space', () => {
    const { kind, state } = applyChar(createWordState('ice cream'), 'i', true)
    assert.equal(kind, 'correct')
    const next = applyChar(applyChar(applyChar(state, 'c', true).state, 'e', true).state, ' ', true)
    assert.equal(next.kind, 'correct')
    assert.equal(next.state.inputWord.endsWith('␣'), true)
  })

  it('clears the whole word after a wrong key but keeps wrongCount', () => {
    const wrong = applyChar(createWordState('ab'), 'x', true)
    assert.equal(wrong.kind, 'wrong')
    assert.equal(wrong.state.wrongCount, 1)
    const cleared = clearWrongInput(wrong.state)
    assert.equal(cleared.inputWord, '')
    assert.equal(cleared.hasWrong, false)
    assert.equal(cleared.wrongCount, 1)
    assert.equal(cleared.letterStates[0], 'normal')
  })

  it('finishes when every letter is correct', () => {
    let state = createWordState('ok')
    state = applyChar(state, 'o', true).state
    const done = applyChar(state, 'k', true)
    assert.equal(done.state.isFinished, true)
  })
})

describe('dictation', () => {
  it('hides all letters until they are correct', () => {
    const state = createWordState('at')
    assert.equal(isLetterVisible(state, 0, { isOpen: true, type: 'hideAll' }, false), false)
    assert.equal(isLetterVisible(state, 0, { isOpen: true, type: 'hideAll' }, true), true)
    const typed = applyChar(state, 'a', true).state
    assert.equal(isLetterVisible(typed, 0, { isOpen: true, type: 'hideAll' }, false), true)
  })

  it('hides vowels only', () => {
    const state = createWordState('at')
    assert.equal(isLetterVisible(state, 0, { isOpen: true, type: 'hideVowel' }, false), false)
    assert.equal(isLetterVisible(state, 1, { isOpen: true, type: 'hideVowel' }, false), true)
  })
})

describe('chapter', () => {
  const words = [
    { name: 'a', trans: ['a'], usphone: '', ukphone: '' },
    { name: 'b', trans: ['b'], usphone: '', ukphone: '' },
  ]

  it('computes live accuracy from keystrokes', () => {
    let s = setupChapter(words, false)
    s = reportCorrect(s)
    s = tickTimer(s, 2)
    assert.equal(s.accuracy, 100)
    assert.equal(s.wpm, 0)
    s = nextWord(s)
    s = tickTimer(s, 0)
    assert.equal(s.wpm, 30)
  })

  it('skip does not increment wordCount', () => {
    let s = setupChapter(words, false)
    s = skipWord(s)
    assert.equal(s.wordCount, 0)
    assert.equal(s.index, 1)
  })

  it('word accuracy counts never-wronged words', () => {
    let s = setupChapter(words, false)
    s = {
      ...s,
      userInputLogs: [
        { index: 0, correctCount: 1, wrongCount: 1, letterMistakes: {} },
        { index: 1, correctCount: 1, wrongCount: 0, letterMistakes: {} },
      ],
    }
    assert.equal(wordAccuracy(s), 50)
  })
})
