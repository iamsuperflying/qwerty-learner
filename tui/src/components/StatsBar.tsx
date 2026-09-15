import React from 'react'
import { Box, Text } from 'ink'
import { formatTime } from '../engine/chapter.ts'
import type { ChapterState } from '../engine/types.ts'

export function StatsBar({ chapter, total }: { chapter: ChapterState; total: number }) {
  const ratio = total === 0 ? 0 : Math.min(1, chapter.index / total)
  const width = 24
  const filled = Math.round(ratio * width)
  const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan">{bar}</Text>
      <Text>
        <Text color="green">{chapter.wpm}</Text>
        <Text dimColor> WPM  </Text>
        <Text color="yellow">{chapter.accuracy}%</Text>
        <Text dimColor>  </Text>
        <Text>{formatTime(chapter.time)}</Text>
        <Text dimColor>  </Text>
        <Text>
          {Math.min(chapter.index + (chapter.isFinished ? 0 : 1), total)}/{total}
        </Text>
      </Text>
    </Box>
  )
}
