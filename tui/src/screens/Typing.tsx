import React from 'react'
import { Box, Text } from 'ink'
import { WordLine } from '../components/WordLine.tsx'
import { StatsBar } from '../components/StatsBar.tsx'
import { Help } from '../components/Help.tsx'
import type { ChapterState, DictMeta, Word, WordState } from '../engine/types.ts'
import type { TuiConfig } from '../persist.ts'
import { dictationLabel } from '../engine/dictation.ts'

export function TypingView({
  dict,
  config,
  chapter,
  word,
  current,
  peeking,
  pausedHint,
  imeLabel,
}: {
  dict: DictMeta
  config: TuiConfig
  chapter: ChapterState
  word: WordState
  current: Word | undefined
  peeking: boolean
  pausedHint: boolean
  imeLabel?: string
}) {
  const phone = config.pronunciation.type === 'uk' ? current?.ukphone : current?.usphone
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text>
        <Text color="cyan" bold>
          QWERTY
        </Text>
        <Text dimColor>  </Text>
        <Text color="white">{dict.name}</Text>
        <Text dimColor>
          {'  '}Ch {config.chapter + 1}/{dict.chapterCount}
          {'  '}默写:{dictationLabel(config.dictation)}
          {'  '}
          {config.pronunciation.isOpen ? config.pronunciation.type.toUpperCase() : '静音'}
          {imeLabel ? `  输入:${imeLabel}` : ''}
        </Text>
      </Text>

      <Box marginTop={3} marginBottom={1} flexDirection="column" alignItems="center">
        {current?.notation ? (
          <Text dimColor>{current.notation}</Text>
        ) : null}
        <WordLine state={word} dictation={config.dictation} peeking={peeking} />
        {config.phonetic && phone ? (
          <Text dimColor>/{phone}/</Text>
        ) : null}
        {config.isTransVisible || peeking ? (
          <Text dimColor>{current?.trans.join('；') || ' '}</Text>
        ) : (
          <Text dimColor> </Text>
        )}
      </Box>

      <Box marginTop={2}>
        <StatsBar chapter={chapter} total={chapter.words.length} />
      </Box>

      {pausedHint ? (
        <Box marginTop={1}>
          <Text color="yellow">
            {chapter.index > 0 ? `从第 ${chapter.index + 1} 词继续 · 按任意字母开始` : '按任意字母开始'}
          </Text>
        </Box>
      ) : null}

      <Help extra={chapter.isShowSkip ? 'Ctrl+S 跳过当前词' : undefined} />
    </Box>
  )
}
