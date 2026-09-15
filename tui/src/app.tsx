import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, useApp, useInput, useStdin } from 'ink'
import { HelpOverlay } from './components/Help.tsx'
import { getDictById, getDictionaries } from './dicts/catalog.ts'
import { loadChapterWords, lookupWord } from './dicts/load.ts'
import {
  finishChapter,
  loopCurrentWord,
  nextWord,
  pauseTyping,
  reportCorrect,
  reportWrong,
  setupChapter,
  skipToIndex,
  skipWord,
  startTyping,
  tickTimer,
} from './engine/chapter.ts'
import { nextDictation } from './engine/dictation.ts'
import { isTypingChar } from './engine/legal.ts'
import { applyChar, clearWrongInput, createWordState, timingDiffs } from './engine/match.ts'
import { SKIP_AFTER_WRONG, WRONG_CLEAR_MS, type DictMeta, type Word } from './engine/types.ts'
import {
  appendRecord,
  deleteWordRecords,
  groupErrorBook,
  exportBackup,
  importBackup,
  inferWordIndex,
  loadConfig,
  loadStatsSummary,
  saveChapterRecord,
  saveConfig,
  type TuiConfig,
} from './persist.ts'
import { ErrorBookView } from './screens/ErrorBook.tsx'
import { GalleryView } from './screens/Gallery.tsx'
import { ResultView } from './screens/Result.tsx'
import { SettingsView, settingKeys } from './screens/Settings.tsx'
import { StatsView } from './screens/Stats.tsx'
import { WordListView } from './screens/WordList.tsx'
import { TypingView } from './screens/Typing.tsx'
import { listKeySounds, playSfx, playText, playWord, prefetchWord, stopPlayback } from './speak.ts'
import { getIme, grabEnglish, imeShortName, releaseIme } from './ime.ts'

type Screen = 'typing' | 'gallery' | 'errors' | 'settings' | 'result' | 'stats' | 'words'

function persist(config: TuiConfig) {
  saveConfig(config)
  return config
}

function boot(config: TuiConfig, words?: Word[]) {
  const dict = getDictById(config.dictId)
  let chapterIndex = Math.min(Math.max(0, config.chapter), Math.max(0, dict.chapterCount - 1))
  let list = words ?? loadChapterWords(dict, chapterIndex)
  let wordIndex = words ? 0 : config.wordIndex
  if (!words && wordIndex < 0) {
    wordIndex = inferWordIndex(dict.id, chapterIndex, list)
  }
  if (!words && wordIndex >= list.length && list.length > 0) {
    chapterIndex = Math.min(chapterIndex + 1, dict.chapterCount - 1)
    list = loadChapterWords(dict, chapterIndex)
    wordIndex = 0
  }
  const chapter = setupChapter(list, Boolean(config.shuffle && !words), wordIndex)
  const current = chapter.words[chapter.index]
  return {
    dict,
    chapter,
    word: createWordState(current?.name ?? ''),
    chapterIndex,
    wordIndex: chapter.index,
  }
}

const LOOP_OPTIONS = [1, 3, 5, 8]

export default function App() {
  const { exit } = useApp()
  const { isRawModeSupported } = useStdin()
  const [config, setConfig] = useState(loadConfig)
  const initial = useMemo(() => boot(config), [])
  const [dict, setDict] = useState<DictMeta>(initial.dict)
  const [chapter, setChapter] = useState(initial.chapter)
  const [word, setWord] = useState(initial.word)
  const [screen, setScreen] = useState<Screen>('typing')
  const [help, setHelp] = useState(false)
  const [quitConfirm, setQuitConfirm] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const [errorBookMode, setErrorBookMode] = useState(false)
  const [galleryQuery, setGalleryQuery] = useState('')
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [galleryMode, setGalleryMode] = useState<'dicts' | 'chapters'>('dicts')
  const [galleryChapter, setGalleryChapter] = useState(0)
  const [errorIndex, setErrorIndex] = useState(0)
  const [settingIndex, setSettingIndex] = useState(0)
  const [errorTick, setErrorTick] = useState(0)
  const [imeLabel, setImeLabel] = useState('?')
  const [stats, setStats] = useState(() => loadStatsSummary())
  const [listIndex, setListIndex] = useState(0)
  const [settingsMessage, setSettingsMessage] = useState('')
  const exerciseCount = useRef(0)
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionWordsRef = useRef<Word[] | undefined>(undefined)
  const wordRecordIdsRef = useRef<string[]>([])

  const current = chapter.words[chapter.index]
  const errors = useMemo(() => groupErrorBook(), [errorTick, screen])

  useEffect(() => {
    if (config.forceSystemAbc) {
      setImeLabel(imeShortName(grabEnglish()))
      return () => {
        releaseIme()
      }
    }
    setImeLabel(imeShortName(getIme()))
  }, [config.forceSystemAbc])

  useEffect(() => {
    if (config.wordIndex < 0) {
      setConfig((old) => persist({ ...old, chapter: initial.chapterIndex, wordIndex: initial.wordIndex }))
    }
  }, [])

  const updateConfig = useCallback((patch: Partial<TuiConfig> | ((c: TuiConfig) => TuiConfig)) => {
    setConfig((old) => persist(typeof patch === 'function' ? patch(old) : { ...old, ...patch }))
  }, [])

  const loadSession = useCallback((next: TuiConfig, words?: Word[], fromErrorBook = false) => {
    const session = boot(next, words)
    setDict(session.dict)
    setChapter(session.chapter)
    setWord(session.word)
    setErrorBookMode(fromErrorBook)
    exerciseCount.current = 0
    sessionWordsRef.current = words
    wordRecordIdsRef.current = []
    setPeeking(false)
    setScreen('typing')
    if (!fromErrorBook) {
      setConfig(persist({ ...next, chapter: session.chapterIndex, wordIndex: session.wordIndex }))
    }
  }, [])

  useEffect(() => {
    if (!word.hasWrong) return
    const timer = setTimeout(() => setWord((s) => clearWrongInput(s)), WRONG_CLEAR_MS)
    return () => clearTimeout(timer)
  }, [word.hasWrong])

  useEffect(() => {
    if (!chapter.isTyping || chapter.isFinished || screen !== 'typing') return
    const timer = setInterval(() => setChapter((s) => tickTimer(s)), 1000)
    return () => clearInterval(timer)
  }, [chapter.isTyping, chapter.isFinished, screen])

  useEffect(() => {
    if (screen !== 'typing' || !chapter.isTyping || chapter.isFinished) return
    if (word.inputWord.length > 0) return
    if (!config.pronunciation.isOpen || !current?.name) return
    playWord(current.name, config.pronunciation.type)
  }, [screen, chapter.isTyping, chapter.isFinished, chapter.index, word.inputWord.length, current?.name, config.pronunciation.isOpen, config.pronunciation.type])

  useEffect(() => {
    const next = chapter.words[chapter.index + 1]
    if (next && config.pronunciation.isOpen) prefetchWord(next.name, config.pronunciation.type)
  }, [chapter.index, chapter.words, config.pronunciation])

  const finishWord = useCallback(
    (finished, liveChapter) => {
      const item = liveChapter.words[liveChapter.index]
      if (item) {
        const id = crypto.randomUUID()
        appendRecord({
          id,
          word: item.name,
          dict: dict.id,
          chapter: errorBookMode ? -1 : config.chapter,
          timeStamp: Math.floor(Date.now() / 1000),
          wrongCount: finished.wrongCount,
          timing: timingDiffs(finished.letterTimeArray),
          mistakes: finished.letterMistake,
        })
        wordRecordIdsRef.current.push(id)
        setErrorTick((n) => n + 1)
      }
      if (config.keySounds) playSfx('correct', config.keySound)
      const gloss = item?.trans[0]
      if (config.transRead && gloss) {
        setTimeout(() => {
          playText(gloss, 'zh')
        }, 280)
      }
      if (exerciseCount.current + 1 < config.loopTimes) {
        exerciseCount.current += 1
        const next = loopCurrentWord(liveChapter)
        setChapter(next)
        setWord(createWordState(next.words[next.index]?.name ?? ''))
        return
      }
      exerciseCount.current = 0
      if (liveChapter.index < liveChapter.words.length - 1) {
        const next = nextWord(liveChapter)
        setChapter(next)
        setWord(createWordState(next.words[next.index]?.name ?? ''))
        if (!errorBookMode) {
          setConfig((old) => persist({ ...old, wordIndex: next.index }))
        }
        return
      }
      const done = finishChapter(liveChapter)
      saveChapterRecord({
        dict: dict.id,
        chapter: errorBookMode ? -1 : config.chapter,
        timeStamp: Math.floor(Date.now() / 1000),
        time: done.time,
        correctCount: done.correctCount,
        wrongCount: done.wrongCount,
        wordCount: done.wordCount,
        wordNumber: done.words.length,
        correctWordIndexes: done.userInputLogs
          .filter((log) => log.correctCount > 0 && log.wrongCount === 0)
          .map((log) => log.index),
        wordRecordIds: [...wordRecordIdsRef.current],
      })
      setChapter(done)
      setWord(finished)
      setScreen('result')
      if (!errorBookMode) {
        setConfig((old) => persist({ ...old, wordIndex: liveChapter.words.length }))
      }
    },
    [config.chapter, config.loopTimes, config.keySounds, config.keySound, config.transRead, dict.id, errorBookMode],
  )

  const typeChar = useCallback(
    (raw: string) => {
      if (word.hasWrong || chapter.isFinished) return
      let live = chapter
      if (!live.isTyping) {
        live = startTyping(live)
        if (config.pronunciation.isOpen && current?.name) {
          playWord(current.name, config.pronunciation.type)
        }
      }
      const result = applyChar(word, raw, config.ignoreCase)
      if (result.kind === 'ignored') {
        setChapter(live)
        return
      }
      if (result.kind === 'correct') {
        live = reportCorrect(live)
        if (result.state.isFinished) {
          finishWord(result.state, live)
          return
        }
        if (config.keySounds) playSfx('click', config.keySound)
        setWord(result.state)
        setChapter(live)
        return
      }
      if (config.keySounds) playSfx('beep')
      live = reportWrong(live, result.state.letterMistake, result.state.wrongCount)
      setWord(result.state)
      setChapter(live)
    },
    [chapter, config.ignoreCase, config.keySounds, config.keySound, config.pronunciation, current?.name, finishWord, word],
  )

  const filteredDicts = useMemo(() => {
    const q = galleryQuery.trim().toLowerCase()
    const all = getDictionaries()
    if (!q) return all
    return all.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)),
    )
  }, [galleryQuery])

  const selectedGalleryDict = filteredDicts[galleryIndex] ?? null

  const jumpWord = (index: number) => {
    const next = skipToIndex(chapter, index)
    if (next.isFinished) {
      setChapter(next)
      setScreen('result')
      return
    }
    exerciseCount.current = 0
    setChapter(next)
    setWord(createWordState(next.words[next.index]?.name ?? ''))
    if (!errorBookMode) {
      setConfig((old) => persist({ ...old, wordIndex: next.index }))
    }
  }

  const toggleSetting = (dir: 1 | -1) => {
    const key = settingKeys[settingIndex]
    updateConfig((old) => {
      if (key === 'ignoreCase') return { ...old, ignoreCase: !old.ignoreCase }
      if (key === 'dictation') return { ...old, dictation: nextDictation(old.dictation) }
      if (key === 'pronunciation') {
        return { ...old, pronunciation: { ...old.pronunciation, isOpen: !old.pronunciation.isOpen } }
      }
      if (key === 'accent') {
        return { ...old, pronunciation: { ...old.pronunciation, type: old.pronunciation.type === 'us' ? 'uk' : 'us' } }
      }
      if (key === 'shuffle') return { ...old, shuffle: !old.shuffle }
      if (key === 'loopTimes') {
        const i = LOOP_OPTIONS.indexOf(old.loopTimes)
        const next = LOOP_OPTIONS[(i + (dir === 1 ? 1 : LOOP_OPTIONS.length - 1)) % LOOP_OPTIONS.length]
        return { ...old, loopTimes: next }
      }
      if (key === 'phonetic') return { ...old, phonetic: !old.phonetic }
      if (key === 'isTransVisible') return { ...old, isTransVisible: !old.isTransVisible }
      if (key === 'forceSystemAbc') return { ...old, forceSystemAbc: !old.forceSystemAbc }
      if (key === 'keySounds') return { ...old, keySounds: !old.keySounds }
      if (key === 'keySound') {
        const sounds = listKeySounds()
        const i = Math.max(0, sounds.indexOf(old.keySound))
        const next = sounds[(i + (dir === 1 ? 1 : sounds.length - 1)) % sounds.length]
        playSfx('click', next)
        return { ...old, keySound: next }
      }
      if (key === 'transRead') return { ...old, transRead: !old.transRead }
      if (key === 'exportBackup') {
        try {
          const file = exportBackup()
          setSettingsMessage(`已导出 ${file}`)
        } catch (error) {
          setSettingsMessage(`导出失败: ${error instanceof Error ? error.message : String(error)}`)
        }
        return old
      }
      if (key === 'importBackup') {
        try {
          const result = importBackup()
          setSettingsMessage(`已导入 词${result.words} 章${result.chapters}`)
        } catch (error) {
          setSettingsMessage(`导入失败: ${error instanceof Error ? error.message : String(error)}`)
        }
        return old
      }
      return old
    })
  }

  useInput((input, key) => {
    if (help) {
      setHelp(false)
      return
    }
    if (quitConfirm) {
      if (input === 'y' || key.return) {
        stopPlayback()
        releaseIme()
        exit()
      } else {
        setQuitConfirm(false)
      }
      return
    }
    if (key.ctrl && input === 'c') return

    if (screen === 'gallery') {
      if (key.escape) {
        if (galleryMode === 'chapters') setGalleryMode('dicts')
        else setScreen('typing')
        return
      }
      if (galleryMode === 'chapters' && selectedGalleryDict) {
        if (key.upArrow) setGalleryChapter((n) => Math.max(0, n - 1))
        else if (key.downArrow) setGalleryChapter((n) => Math.min(selectedGalleryDict.chapterCount - 1, n + 1))
        else if (key.return) {
          const next = persist({ ...config, dictId: selectedGalleryDict.id, chapter: galleryChapter, wordIndex: 0 })
          setConfig(next)
          loadSession(next)
        }
        return
      }
      if (key.upArrow) setGalleryIndex((n) => Math.max(0, n - 1))
      else if (key.downArrow) setGalleryIndex((n) => Math.min(Math.max(0, filteredDicts.length - 1), n + 1))
      else if (key.return && selectedGalleryDict) {
        setGalleryMode('chapters')
        setGalleryChapter(selectedGalleryDict.id === config.dictId ? config.chapter : 0)
      } else if (key.backspace) setGalleryQuery((q) => q.slice(0, -1))
      else if (!key.ctrl && !key.meta && isTypingChar(input) && input !== ' ') {
        setGalleryQuery((q) => q + input)
        setGalleryIndex(0)
      }
      return
    }

    if (screen === 'errors') {
      if (key.escape) {
        setScreen('typing')
        return
      }
      if (key.upArrow) setErrorIndex((n) => Math.max(0, n - 1))
      else if (key.downArrow) setErrorIndex((n) => Math.min(Math.max(0, errors.length - 1), n + 1))
      else if (input === 'd' && errors[errorIndex]) {
        deleteWordRecords(errors[errorIndex].word, errors[errorIndex].dict)
        setErrorTick((n) => n + 1)
        setErrorIndex((n) => Math.max(0, n - 1))
      } else if (key.return && errors[errorIndex]) {
        const group = errors[errorIndex]
        const source = getDictById(group.dict)
        const found = lookupWord(source, group.word)
        const practiceWord = found ?? { name: group.word, trans: [], usphone: '', ukphone: '' }
        loadSession(config, [practiceWord], true)
      } else if (input === 'r') {
        const forDict = errors.filter((g) => g.dict === dict.id)
        const source = (forDict.length > 0 ? forDict : errors).slice(0, 20)
        if (source.length === 0) return
        const words = source.map((g) => {
          const found = lookupWord(getDictById(g.dict), g.word)
          return found ?? { name: g.word, trans: [], usphone: '', ukphone: '' }
        })
        loadSession(config, words, true)
      }
      return
    }

    if (screen === 'words') {
      if (key.escape) {
        setScreen('typing')
        return
      }
      if (key.upArrow) setListIndex((n) => Math.max(0, n - 1))
      else if (key.downArrow) setListIndex((n) => Math.min(chapter.words.length - 1, n + 1))
      else if (key.return) {
        jumpWord(listIndex)
        setScreen('typing')
      }
      return
    }

    if (screen === 'settings') {
      if (key.escape) {
        setScreen('typing')
        return
      }
      if (key.upArrow) setSettingIndex((n) => Math.max(0, n - 1))
      else if (key.downArrow) setSettingIndex((n) => Math.min(settingKeys.length - 1, n + 1))
      else if (key.return || key.rightArrow || key.leftArrow) toggleSetting(key.leftArrow ? -1 : 1)
      return
    }

    if (screen === 'stats') {
      if (key.escape) setScreen('typing')
      return
    }

    if (screen === 'result') {
      if (key.escape) {
        setScreen('typing')
        setChapter((s) => pauseTyping({ ...s, isFinished: false }))
        return
      }
      if (key.return && !key.shift) {
        if (errorBookMode) {
          loadSession(config)
          return
        }
        const nextChapter = Math.min(config.chapter + 1, dict.chapterCount - 1)
        const next = persist({
          ...config,
          chapter: nextChapter,
          wordIndex: 0,
          dictation: { ...config.dictation, isOpen: false },
        })
        setConfig(next)
        loadSession(next)
        return
      }
      if (input === ' ' || (key.return && key.shift) || input === 'd') {
        if (errorBookMode && sessionWordsRef.current) {
          loadSession(config, sessionWordsRef.current, true)
          return
        }
        const dictationOn = input === 'd' || key.shift
        const next = persist({
          ...config,
          wordIndex: 0,
          dictation: dictationOn ? { isOpen: true, type: 'hideAll' } : config.dictation,
        })
        setConfig(next)
        loadSession(next)
        return
      }
      return
    }

    if (input === '?' && !chapter.isTyping) {
      setHelp(true)
      return
    }
    if (key.escape) {
      if (chapter.isTyping) {
        setChapter((s) => pauseTyping(s))
        return
      }
      setQuitConfirm(true)
      return
    }
    if ((input === 'q' || input === 'Q') && !chapter.isTyping) {
      setQuitConfirm(true)
      return
    }
    if (key.ctrl && input === 'l') {
      setChapter((s) => pauseTyping(s))
      setListIndex(chapter.index)
      setScreen('words')
      return
    }
    if (key.ctrl && input === 'a') {
      setChapter((s) => pauseTyping(s))
      setStats(loadStatsSummary())
      setScreen('stats')
      return
    }
    if (key.ctrl && input === 'm') {
      updateConfig((old) => ({ ...old, keySounds: !old.keySounds }))
      return
    }
    if (key.ctrl && input === 'd') {
      const all = getDictionaries()
      setGalleryQuery('')
      setGalleryIndex(Math.max(0, all.findIndex((item) => item.id === dict.id)))
      setGalleryMode('dicts')
      setChapter((s) => pauseTyping(s))
      setScreen('gallery')
      return
    }
    if (key.ctrl && input === 'e') {
      setErrorIndex(0)
      setChapter((s) => pauseTyping(s))
      setScreen('errors')
      return
    }
    if (key.ctrl && (input === 'o' || input === ',')) {
      setChapter((s) => pauseTyping(s))
      setScreen('settings')
      return
    }
    if (key.ctrl && input === 'j') {
      if (key.shift) {
        const gloss = current?.trans[0]
        if (gloss) playText(gloss, 'zh')
        return
      }
      if (current) playWord(current.name, config.pronunciation.type)
      return
    }
    if (key.ctrl && input === 'i') {
      const info = grabEnglish()
      setImeLabel(imeShortName(info))
      return
    }
    if (key.ctrl && input === 'v') {
      updateConfig((old) => ({ ...old, dictation: nextDictation(old.dictation) }))
      return
    }
    if (key.ctrl && input === 't') {
      updateConfig((old) => ({ ...old, isTransVisible: !old.isTransVisible }))
      return
    }
    if (key.ctrl && input === 's') {
      if (word.wrongCount >= SKIP_AFTER_WRONG || chapter.isShowSkip) {
        const next = skipWord(chapter)
        if (next.isFinished) {
          saveChapterRecord({
            dict: dict.id,
            chapter: errorBookMode ? -1 : config.chapter,
            timeStamp: Math.floor(Date.now() / 1000),
            time: next.time,
            correctCount: next.correctCount,
            wrongCount: next.wrongCount,
            wordCount: next.wordCount,
            wordNumber: next.words.length,
            correctWordIndexes: next.userInputLogs
              .filter((log) => log.correctCount > 0 && log.wrongCount === 0)
              .map((log) => log.index),
            wordRecordIds: [...wordRecordIdsRef.current],
          })
          setChapter(next)
          setScreen('result')
          if (!errorBookMode) {
            setConfig((old) => persist({ ...old, wordIndex: chapter.words.length }))
          }
          return
        }
        exerciseCount.current = 0
        setChapter(next)
        setWord(createWordState(next.words[next.index]?.name ?? ''))
        if (!errorBookMode) {
          setConfig((old) => persist({ ...old, wordIndex: next.index }))
        }
      }
      return
    }
    if (key.ctrl && key.leftArrow) {
      jumpWord(chapter.index - 1)
      return
    }
    if (key.ctrl && key.rightArrow) {
      jumpWord(chapter.index + 1)
      return
    }
    if (key.tab) {
      setPeeking(true)
      if (peekTimer.current) clearTimeout(peekTimer.current)
      peekTimer.current = setTimeout(() => setPeeking(false), 1200)
      return
    }
    if (key.return) {
      setChapter((s) => (s.isTyping ? pauseTyping(s) : startTyping(s)))
      return
    }
    if (!key.ctrl && !key.meta && isTypingChar(input)) {
      typeChar(input)
    }
  }, { isActive: Boolean(isRawModeSupported) })

  return (
    <Box flexDirection="column" padding={1}>
      {help ? (
        <HelpOverlay />
      ) : quitConfirm ? (
        <Box flexDirection="column" alignItems="center" paddingY={2}>
          <Text color="yellow">退出 Qwerty Learner？</Text>
          <Text dimColor>y / Enter 确认 · 其他键取消</Text>
        </Box>
      ) : screen === 'gallery' ? (
        <GalleryView
          query={galleryQuery}
          items={filteredDicts}
          selected={galleryIndex}
          mode={galleryMode}
          dict={selectedGalleryDict}
          chapter={galleryChapter}
        />
      ) : screen === 'errors' ? (
        <ErrorBookView groups={errors} selected={errorIndex} />
      ) : screen === 'settings' ? (
        <SettingsView config={config} selected={settingIndex} message={settingsMessage} />
      ) : screen === 'words' ? (
        <WordListView
          title={errorBookMode ? `复习 · ${dict.name}` : `${dict.name} 第 ${config.chapter + 1} 章`}
          words={chapter.words}
          currentIndex={chapter.index}
          selected={listIndex}
        />
      ) : screen === 'stats' ? (
        <StatsView stats={stats} />
      ) : screen === 'result' ? (
        <ResultView chapter={chapter} reviewing={errorBookMode} />
      ) : (
        <TypingView
          dict={dict}
          config={config}
          chapter={chapter}
          word={word}
          current={current}
          peeking={peeking}
          pausedHint={!chapter.isTyping}
          imeLabel={imeLabel}
          reviewing={errorBookMode}
        />
      )}
    </Box>
  )
}
