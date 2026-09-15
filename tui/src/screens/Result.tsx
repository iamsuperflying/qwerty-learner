import React from 'react'
import { Box, Text } from 'ink'
import { formatTime, wordAccuracy } from '../engine/chapter.ts'
import type { ChapterState } from '../engine/types.ts'

export function ResultView({ chapter }: { chapter: ChapterState }) {
  const wrong = chapter.userInputLogs.filter((log) => log.wrongCount > 0)
  const wrongWords = wrong
    .map((log) => chapter.words[log.index]?.name)
    .filter(Boolean)
    .slice(0, 12)
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text color="cyan" bold>
        章节完成
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          用时 <Text color="yellow">{formatTime(chapter.time)}</Text>
        </Text>
        <Text>
          速度 <Text color="green">{chapter.wpm} WPM</Text>
        </Text>
        <Text>
          键正确率 <Text color="green">{chapter.accuracy}%</Text>
        </Text>
        <Text>
          词正确率 <Text color="green">{wordAccuracy(chapter)}%</Text>
        </Text>
        <Text dimColor>
          正确 {chapter.correctCount} / 错误 {chapter.wrongCount}
        </Text>
      </Box>
      {wrongWords.length > 0 ? (
        <Box marginTop={1} flexDirection="column" alignItems="center">
          <Text dimColor>错过的词</Text>
          <Text>{wrongWords.join('  ')}</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color="green">全部一次打对</Text>
        </Box>
      )}
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text dimColor>Enter 下一章 · Space 重练 · d 默写本章 · Esc 返回</Text>
      </Box>
    </Box>
  )
}
