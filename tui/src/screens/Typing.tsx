import React from 'react'
import { Box, Text } from 'ink'
import { WordLine } from '../components/WordLine.tsx'
import { StatsBar } from '../components/StatsBar.tsx'
import { Help } from '../components/Help.tsx'
import type { ChapterState, DictMeta, Word, WordState } from '../engine/types.ts'
import type { TuiConfig } from '../persist.ts'
import { dictationLabel } from '../engine/dictation.ts'

/** Pause / cold-start gate only — not the word stage. */
function StartGate({ resume }: { resume: boolean }) {
  const title = resume ? '按任意键继续' : '按任意键开始'
  return (
    <Box flexDirection="column" alignItems="center" marginTop={2} marginBottom={1} width="100%">
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
          {title}
        </Text>
        <Text dimColor>{resume ? 'resume session' : 'press any key'}</Text>
        <Text dimColor>
          <Text color="yellow">▸</Text> enter 也可切换开始/暂停 <Text color="yellow">◂</Text>
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Web PrevAndNextWord: full trans.join('；'), visually one line (line-clamp-1).
 * Do NOT drop senses — only truncate display if the row is too narrow.
 */
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
  const phone = config.pronunciation.type === 'uk' ? current?.ukphone : current?.usphone
  const prev = chapter.words[chapter.index - 1]
  const next = chapter.words[chapter.index + 1]
  const hideNext = config.dictation.isOpen && !peeking
  // current gloss: full text like web Translation
  const centerGloss =
    config.isTransVisible || peeking ? current?.trans.join('；') || '' : ''

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

      {pausedHint ? (
        <StartGate resume={chapter.time > 0} />
      ) : (
        <Box marginTop={2} marginBottom={1} flexDirection="column" width="100%">
          {/* web: prev/next sit in a top row (justify-between), NOT beside the headword */}
          <Box flexDirection="row" width="100%" justifyContent="space-between" paddingX={2} height={2}>
            <SideCard word={prev} side="prev" showTrans={config.isTransVisible} />
            <SideCard word={next} side="next" showTrans={config.isTransVisible} hidden={hideNext} />
          </Box>

          {/* headword stage — own block, centered, like web WordPanel body */}
          <Box marginTop={2} flexDirection="column" alignItems="center" width="100%">
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
          </Box>
        </Box>
      )}

      <Box marginTop={1} width="100%" alignItems="center">
        <StatsBar chapter={chapter} total={chapter.words.length} />
      </Box>

      <Help extra={!pausedHint && chapter.isShowSkip ? 'Ctrl+S 跳过当前词' : undefined} />
    </Box>
  )
}
