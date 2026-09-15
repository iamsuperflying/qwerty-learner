import React from 'react'
import { Box, Text } from 'ink'
import type { ErrorGroup } from '../persist.ts'

export function ErrorBookView({
  groups,
  selected,
}: {
  groups: ErrorGroup[]
  selected: number
}) {
  const windowSize = 16
  const start = Math.max(0, Math.min(selected - 6, groups.length - windowSize))
  const visible = groups.slice(start, start + windowSize)
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>
        错题本
      </Text>
      <Text dimColor>Enter 再练 · d 删除 · Esc 返回 · {groups.length} 词</Text>
      <Box marginTop={1} flexDirection="column">
        {groups.length === 0 ? (
          <Text dimColor>还没有错词。打错的单词会出现在这里。</Text>
        ) : (
          visible.map((g, i) => {
            const index = start + i
            const active = index === selected
            return (
              <Text key={`${g.dict}-${g.word}`} inverse={active} color={active ? 'red' : undefined}>
                {active ? '▸ ' : '  '}
                {g.word}
                <Text dimColor>
                  {'  '}
                  {g.dict} · 错 {g.wrongCount} 次
                </Text>
              </Text>
            )
          })
        )}
      </Box>
    </Box>
  )
}
