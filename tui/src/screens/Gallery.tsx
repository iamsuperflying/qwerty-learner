import React from 'react'
import { Box, Text } from 'ink'
import type { DictMeta } from '../engine/types.ts'

export function GalleryView({
  query,
  items,
  selected,
  mode,
  dict,
  chapter,
}: {
  query: string
  items: DictMeta[]
  selected: number
  mode: 'dicts' | 'chapters'
  dict: DictMeta | null
  chapter: number
}) {
  if (mode === 'chapters' && dict) {
    const total = dict.chapterCount
    const start = Math.max(0, Math.min(chapter - 8, total - 16))
    const end = Math.min(total, start + 16)
    const rows = []
    for (let i = start; i < end; i++) rows.push(i)
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color="cyan" bold>
          {dict.name} · 选择章节
        </Text>
        <Text dimColor>
          {dict.description} · {dict.length} 词 · ↑↓ Enter Esc
        </Text>
        <Box marginTop={1} flexDirection="column">
          {rows.map((i) => (
            <Text key={i} color={i === chapter ? 'green' : undefined} inverse={i === chapter}>
              {i === chapter ? '▸ ' : '  '}第 {i + 1} 章
            </Text>
          ))}
        </Box>
      </Box>
    )
  }

  const windowSize = 16
  const start = Math.max(0, Math.min(selected - 6, items.length - windowSize))
  const visible = items.slice(start, start + windowSize)
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>
        词库
      </Text>
      <Text>
        <Text dimColor>搜索: </Text>
        <Text>{query || ' '}</Text>
        <Text dimColor>
          {'  '}
          {items.length} 本 · ↑↓ Enter Esc
        </Text>
      </Text>
      <Box marginTop={1} flexDirection="column">
        {visible.length === 0 ? (
          <Text dimColor>没有匹配的词库</Text>
        ) : (
          visible.map((item, i) => {
            const index = start + i
            const active = index === selected
            return (
              <Text key={item.id} inverse={active} color={active ? 'green' : undefined}>
                {active ? '▸ ' : '  '}
                {item.name}
                <Text dimColor>
                  {'  '}
                  {item.category} · {item.length} 词
                </Text>
              </Text>
            )
          })
        )}
      </Box>
    </Box>
  )
}
