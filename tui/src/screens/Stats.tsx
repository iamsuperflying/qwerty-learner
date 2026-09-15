import React from 'react'
import { Box, Text } from 'ink'
import { formatTime } from '../engine/chapter.ts'
import { getDictById } from '../dicts/catalog.ts'
import type { HeatCell, StatsSummary } from '../persist.ts'

function levelChar(count: number): string {
  if (count <= 0) return '·'
  if (count < 4) return '░'
  if (count < 8) return '▒'
  if (count < 12) return '▓'
  return '█'
}

function levelColor(count: number): string | undefined {
  if (count <= 0) return undefined
  return 'green'
}

function heatmapGrid(cells: HeatCell[]) {
  const cols: HeatCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    cols.push(cells.slice(i, i + 7))
  }
  const rows: string[][] = [[], [], [], [], [], [], []]
  const counts: number[][] = [[], [], [], [], [], [], []]
  for (const col of cols) {
    for (let r = 0; r < 7; r++) {
      const cell = col[r]
      rows[r].push(cell ? levelChar(cell.count) : ' ')
      counts[r].push(cell ? cell.count : 0)
    }
  }
  return { rows, counts }
}

export function StatsView({ stats }: { stats: StatsSummary }) {
  const { rows, counts } = heatmapGrid(stats.heatmap)
  const labels = ['日', '一', '二', '三', '四', '五', '六']
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>
        统计
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          词次 <Text color="green">{stats.wordCount}</Text>
          <Text dimColor>  ·  </Text>
          章节 <Text color="green">{stats.chapterCount}</Text>
          <Text dimColor>  ·  </Text>
          天数 <Text color="green">{stats.dayCount}</Text>
        </Text>
        <Text>
          均速 <Text color="yellow">{stats.avgWpm} WPM</Text>
          <Text dimColor>  ·  </Text>
          均正确率 <Text color="yellow">{stats.avgAccuracy}%</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>近几周练习（按词次）</Text>
        {rows.map((row, r) => (
          <Text key={labels[r]}>
            <Text dimColor>{labels[r]} </Text>
            {row.map((ch, c) => (
              <Text key={`${r}-${c}`} color={levelColor(counts[r][c])} dimColor={counts[r][c] <= 0}>
                {ch}
              </Text>
            ))}
          </Text>
        ))}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>最近章节</Text>
        {stats.recent.length === 0 ? (
          <Text dimColor>还没有打完的章节</Text>
        ) : (
          stats.recent.map((row) => {
            const name = getDictById(row.dict).name
            const ch = row.chapter === null || row.chapter < 0 ? '复习' : `Ch ${row.chapter + 1}`
            const wpm = row.time > 0 ? Math.round((row.wordCount / row.time) * 60) : 0
            return (
              <Text key={row.id}>
                {name}
                <Text dimColor>
                  {'  '}
                  {ch} · {wpm} WPM · {formatTime(row.time)}
                </Text>
              </Text>
            )
          })
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Esc 返回</Text>
      </Box>
    </Box>
  )
}
