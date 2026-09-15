import React from 'react'
import { Text } from 'ink'
import { isLetterVisible } from '../engine/dictation.ts'
import type { DictationType, WordState } from '../engine/types.ts'

export function WordLine({
  state,
  dictation,
  peeking,
}: {
  state: WordState
  dictation: { isOpen: boolean; type: DictationType }
  peeking: boolean
}) {
  const chars = state.displayWord.split('')
  return (
    <Text>
      {chars.map((ch, i) => {
        const visible = isLetterVisible(state, i, dictation, peeking)
        const shown = visible ? (ch === '␣' ? '␣' : ch) : '_'
        const letterState = state.letterStates[i]
        const color = letterState === 'correct' ? 'green' : letterState === 'wrong' ? 'red' : 'white'
        const current = letterState === 'normal' && i === state.inputWord.length && !state.hasWrong
        return (
          <Text key={i}>
            <Text color={color} bold underline={current}>
              {shown}
            </Text>
            {i < chars.length - 1 ? ' ' : ''}
          </Text>
        )
      })}
    </Text>
  )
}
