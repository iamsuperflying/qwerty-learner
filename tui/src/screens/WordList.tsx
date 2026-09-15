import React from 'react'
import { Box, Text } from 'ink'
import type { Word } from '../engine/types.ts'

export function WordListView({
  title,
  words,
  currentIndex,
  selected,
}: {
  title: string
  words: Word[]
  currentIndex: number
  selected: number
}) {
  const windowSize = 16
  const start = Math.max(0, Math.min(selected - 6, words.length - windowSize))
  const visible = words.slice(start, start + windowSize)
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>
        {title}
      </Text>
      <Text dimColor>↑↓ 选择 · Enter 跳转 · Esc 返回 · {words.length} 词</Text>
      <Box marginTop={1} flexDirection="column">
        {visible.map((word, i) => {
          const index = start + i
          const active = index === selected
          const here = index === currentIndex
          return (
            <Text key={`${word.name}-${index}`} inverse={active} color={here ? 'green' : undefined}>
              {active ? '▸ ' : '  '}
              {here ? '* ' : '  '}
              {word.name}
              <Text dimColor>
                {'  '}
                {word.trans[0] ?? ''}
              </Text>
            </Text>
          )
        })}
      </Box>
    </Box>
  )
}
