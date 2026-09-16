import React from 'react'
import { Box, Text } from 'ink'
import { WordLine } from '../components/WordLine.tsx'
import { StatsBar } from '../components/StatsBar.tsx'
import type { ChapterState, DictMeta, Word, WordState } from '../engine/types.ts'
import type { TuiConfig } from '../persist.ts'
import { dictationLabel } from '../engine/dictation.ts'

function PauseOverlay({ resume }: { resume: boolean }) {
  return (
    <Box flexDirection="column" alignItems="center" width="100%" marginY={1}>
      <Box
        flexDirection="column"
        alignItems="center"
        borderStyle="round"
        borderColor="cyan"
        paddingX={4}
        paddingY={1}
        minWidth={36}
      >
        <Text color="cyan" bold>
          ◆  Q W E R T Y  ◆
        </Text>
        <Text dimColor>────────────────────</Text>
        <Text color="white" bold>
          {resume ? '按任意键继续' : '按任意键开始'}
        </Text>
        <Text dimColor>{resume ? 'resume session' : 'press any key'}</Text>
        <Text dimColor>
          <Text color="yellow">▸</Text> enter 也可切换开始/暂停 <Text color="yellow">◂</Text>
        </Text>
      </Box>
    </Box>
  )
}

function SideCard({
  word,
  side,
  showTrans,
  hidden,
}: {
  word: Word | undefined
  side: 'prev' | 'next'
  showTrans: boolean
  hidden?: boolean
}) {
  if (!word) {
    return <Box width="40%" height={2} />
  }
  const end = side === 'next'
  const head = hidden ? '____' : word.name
  const gloss = showTrans ? word.trans.join('；') : ''
  return (
    <Box width="40%" flexDirection="column" alignItems={end ? 'flex-end' : 'flex-start'} height={2}>
      <Text dimColor wrap="truncate">
        {end ? `${head} →` : `← ${head}`}
      </Text>
      {showTrans ? (
        <Text dimColor wrap="truncate">
          {gloss}
        </Text>
      ) : (
        <Text> </Text>
      )}
    </Box>
  )
}

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
  const isTyping = !pausedHint
  const phone = config.pronunciation.type === 'uk' ? current?.ukphone : current?.usphone
  const prev = chapter.words[chapter.index - 1]
  const next = chapter.words[chapter.index + 1]
  const hideNext = config.dictation.isOpen && !peeking
  const centerGloss = config.isTransVisible || peeking ? current?.trans.join('；') || '' : ''

  return (
    <Box flexDirection="column" paddingY={1} width="100%">
      <Box justifyContent="center" width="100%">
        <Text dimColor>
          <Text color="cyan">QWERTY</Text>
          {'  '}
          {reviewing ? `复习 · ${dict.name}` : `${dict.name}  Ch ${config.chapter + 1}/${dict.chapterCount}`}
          {'  '}
          默写:{dictationLabel(config.dictation)}
          {'  '}
          {config.pronunciation.isOpen ? (config.pronunciation.type === 'uk' ? '音:英' : '音:美') : '音:关'}
          {imeLabel ? `  键:${imeLabel}` : ''}
        </Text>
      </Box>

      {/* web WordPanel: prev/next only when isTyping */}
      <Box marginTop={1} flexDirection="row" width="100%" justifyContent="space-between" paddingX={2} height={2}>
        {isTyping ? (
          <>
            <SideCard word={prev} side="prev" showTrans={config.isTransVisible} />
            <SideCard word={next} side="next" showTrans={config.isTransVisible} hidden={hideNext} />
          </>
        ) : (
          <>
            <Box width="40%" height={2} />
            <Box width="40%" height={2} />
          </>
        )}
      </Box>

      {/* web overlay: covers the word when paused */}
      <Box marginTop={1} flexDirection="column" alignItems="center" width="100%">
        {isTyping ? (
          <>
            {current?.notation ? <Text dimColor>{current.notation}</Text> : null}
            <Box marginY={1}>
              <WordLine state={word} dictation={config.dictation} peeking={peeking} />
            </Box>
            {config.phonetic && phone ? <Text dimColor>/{phone}/</Text> : null}
            {centerGloss ? (
              <Text dimColor wrap="truncate">
                {centerGloss}
              </Text>
            ) : (
              <Text> </Text>
            )}
          </>
        ) : (
          <PauseOverlay resume={chapter.time > 0} />
        )}
      </Box>

      {/* web: Progress opacity follows isTyping; Speed (五项) always on */}
      <Box marginTop={1} width="100%" alignItems="center">
        <StatsBar chapter={chapter} total={chapter.words.length} showProgress={isTyping} />
      </Box>
      {isTyping && chapter.isShowSkip ? (
        <Box justifyContent="center">
          <Text color="yellow">Ctrl+S 跳过</Text>
        </Box>
      ) : null}
    </Box>
  )
}
