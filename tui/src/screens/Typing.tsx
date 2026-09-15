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
  reviewing,
}: {
  dict: DictMeta
  config: TuiConfig
  chapter: ChapterState
  word: WordState
  current: Word | undefined
  peeking: boolean
  pausedHint: boolean
  imeLabel?: string
  reviewing?: boolean
}) {
  const phone = config.pronunciation.type === 'uk' ? current?.ukphone : current?.usphone
  const prev = chapter.words[chapter.index - 1]
  const next = chapter.words[chapter.index + 1]
  const hideNext = config.dictation.isOpen && !peeking
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box justifyContent="center">
        <Text>
          <Text color="cyan" bold>
            QWERTY
          </Text>
          <Text dimColor>  </Text>
          <Text color="white">{reviewing ? `复习 · ${dict.name} · ${chapter.words.length} 词` : dict.name}</Text>
          <Text dimColor>
            {reviewing ? '' : `  Ch ${config.chapter + 1}/${dict.chapterCount}`}
            {'  '}默写:{dictationLabel(config.dictation)}
            {'  '}
            {config.pronunciation.isOpen ? config.pronunciation.type.toUpperCase() : '静音'}
            {imeLabel ? `  输入:${imeLabel}` : ''}
          </Text>
        </Text>
      </Box>

      <Box marginTop={2} flexDirection="row">
        <Box width="22%" flexDirection="column" paddingLeft={1}>
          {prev ? (
            <>
              <Text dimColor>← {prev.name}</Text>
              {config.isTransVisible ? <Text dimColor>{prev.trans[0] ?? ''}</Text> : null}
            </>
          ) : (
            <Text> </Text>
          )}
        </Box>
        <Box width="56%" flexDirection="column" alignItems="center">
          {current?.notation ? <Text dimColor>{current.notation}</Text> : null}
          <WordLine state={word} dictation={config.dictation} peeking={peeking} />
          {config.phonetic && phone ? <Text dimColor>/{phone}/</Text> : null}
          {config.isTransVisible || peeking ? (
            <Text dimColor>{current?.trans.join('；') || ' '}</Text>
          ) : (
            <Text dimColor> </Text>
          )}
        </Box>
        <Box width="22%" flexDirection="column" alignItems="flex-end" paddingRight={1}>
          {next ? (
            <>
              <Text dimColor>
                {hideNext ? '____' : next.name} →
              </Text>
              {config.isTransVisible ? <Text dimColor>{next.trans[0] ?? ''}</Text> : null}
            </>
          ) : (
            <Text> </Text>
          )}
        </Box>
      </Box>

      <Box marginTop={2} justifyContent="center">
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
