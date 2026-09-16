import React, { useEffect, useState } from 'react'
import { Box, Text, useStdout } from 'ink'
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

export function StatsBar({
  chapter,
  total,
  showProgress,
}: {
  chapter: ChapterState
  total: number
  showProgress: boolean
}) {
  const { stdout } = useStdout()
  const [cols, setCols] = useState(() => stdout?.columns ?? 80)

  useEffect(() => {
    if (!stdout) return
    const onResize = () => setCols(stdout.columns || 80)
    stdout.on('resize', onResize)
    setCols(stdout.columns || 80)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])

  const barWidth = 28
  const progressed = total === 0 ? 0 : Math.min(1, chapter.index / Math.max(total, 1))
  const filled = Math.round(progressed * barWidth)
  const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barWidth - filled))
  const inputs = chapter.correctCount + chapter.wrongCount
  const current = Math.min(chapter.index + (chapter.isFinished ? 0 : 1), total)
  const label = `${current}/${total}`
  const contentWidth = Math.max(barWidth, (cols || 80) - 2)
  const leftPad = Math.max(0, Math.floor((contentWidth - barWidth) / 2))

  return (
    <Box flexDirection="column" width="100%">
      {showProgress ? (
        <Text>
          {' '.repeat(leftPad)}
          <Text color="cyan">{bar}</Text>
          <Text color="cyan"> {label}</Text>
        </Text>
      ) : (
        <Text> </Text>
      )}
      <Box marginTop={1} width="100%" justifyContent="center">
        <Cell value={formatTime(chapter.time)} label="时间" />
        <Cell value={inputs} label="输入数" />
        <Cell value={chapter.wpm} label="WPM" />
        <Cell value={chapter.correctCount} label="正确数" />
        <Cell value={`${chapter.accuracy}`} label="正确率" />
      </Box>
    </Box>
  )
}
