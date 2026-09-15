import React from 'react'
import { Box, Text } from 'ink'
import { formatTime } from '../engine/chapter.ts'
import type { ChapterState } from '../engine/types.ts'

function Cell({ value, label }: { value: string | number; label: string }) {
  return (
    <Box flexDirection="column" alignItems="center" marginX={2}>
      <Text bold>{value}</Text>
      <Text dimColor>{label}</Text>
    </Box>
  )
}

export function StatsBar({ chapter, total }: { chapter: ChapterState; total: number }) {
  const progressed = total === 0 ? 0 : Math.min(1, chapter.index / Math.max(total, 1))
  const width = 28
  const filled = Math.round(progressed * width)
  const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
  const inputs = chapter.correctCount + chapter.wrongCount
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan">
        {bar} {Math.min(chapter.index + (chapter.isFinished ? 0 : 1), total)}/{total}
      </Text>
      <Box marginTop={1}>
        <Cell value={formatTime(chapter.time)} label="时间" />
        <Cell value={inputs} label="输入数" />
        <Cell value={chapter.wpm} label="WPM" />
        <Cell value={chapter.correctCount} label="正确数" />
        <Cell value={`${chapter.accuracy}`} label="正确率" />
      </Box>
    </Box>
  )
}
