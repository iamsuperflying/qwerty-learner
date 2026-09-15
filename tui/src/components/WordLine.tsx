import React from 'react'
import { Text } from 'ink'
import { isLetterVisible } from '../engine/dictation.ts'
import type { DictationType, WordState } from '../engine/types.ts'

/** Match web Letter.tsx: mono letters, normal/correct/wrong colors only. */
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
    <Text bold>
      {chars.map((ch, i) => {
        const visible = isLetterVisible(state, i, dictation, peeking)
        const shown = visible ? (ch === '␣' ? ' ' : ch) : '_'
        const letterState = state.letterStates[i]
        // web: normal gray/white, correct green, wrong red
        const color =
          letterState === 'correct' ? 'green' : letterState === 'wrong' ? 'red' : 'white'
        return (
          <Text key={i} bold color={color}>
            {shown}
            {i < chars.length - 1 ? ' ' : ''}
          </Text>
        )
      })}
    </Text>
  )
}
