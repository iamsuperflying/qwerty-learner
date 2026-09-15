import React from 'react'
import { Box, Text } from 'ink'
import { dictationLabel } from '../engine/dictation.ts'
import type { TuiConfig } from '../persist.ts'

export const settingKeys = [
  'ignoreCase',
  'dictation',
  'pronunciation',
  'accent',
  'shuffle',
  'loopTimes',
  'phonetic',
  'isTransVisible',
  'forceSystemAbc',
] as const

function onOff(value: boolean) {
  return value ? '开' : '关'
}

export function SettingsView({ config, selected }: { config: TuiConfig; selected: number }) {
  const rows = [
    ['忽略大小写', onOff(config.ignoreCase)],
    ['默写', dictationLabel(config.dictation)],
    ['发音', onOff(config.pronunciation.isOpen)],
    ['口音', config.pronunciation.type === 'uk' ? '英音' : '美音'],
    ['章节乱序', onOff(config.shuffle)],
    ['单词循环', `${config.loopTimes}`],
    ['音标', onOff(config.phonetic)],
    ['译文', onOff(config.isTransVisible)],
    ['强制系统 ABC', onOff(config.forceSystemAbc)],
  ]
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>
        设置
      </Text>
      <Text dimColor>↑↓ 选择 · ←→ / Enter 切换 · Esc 返回</Text>
      <Box marginTop={1} flexDirection="column">
        {rows.map((row, i) => (
          <Text key={row[0]} inverse={i === selected} color={i === selected ? 'green' : undefined}>
            {i === selected ? '▸ ' : '  '}
            {row[0]}
            <Text dimColor>  </Text>
            {row[1]}
          </Text>
        ))}
      </Box>
    </Box>
  )
}
