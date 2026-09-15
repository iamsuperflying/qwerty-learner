import React from 'react'
import { Box, Text } from 'ink'

export function Help({ extra }: { extra?: string }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>
        tab 窥视  ^J 发音  ^I 英文输入法  ^V 默写  ^T 译文  ^D 词库  ^E 错题  ^O 设置  esc 暂停
      </Text>
      {extra ? <Text color="yellow">{extra}</Text> : null}
    </Box>
  )
}

export function HelpOverlay() {
  const rows = [
    ['任意字母 / 空格', '开始练习或输入'],
    ['Enter', '暂停 / 继续'],
    ['Tab', '默写时窥视单词'],
    ['Ctrl+J', '重播发音'],
    ['Ctrl+I', '强制切到系统 ABC（豆包请用 Shift 切英文）'],
    ['Ctrl+V', '循环默写模式'],
    ['Ctrl+T', '显示/隐藏译文'],
    ['Ctrl+← / Ctrl+→', '上 / 下一词（不计入成绩）'],
    ['Ctrl+S', '错 4 次后跳过'],
    ['Ctrl+D', '词库'],
    ['Ctrl+E', '错题本'],
    ['Ctrl+O', '设置'],
    ['Esc', '暂停；再按退出'],
    ['q', '暂停时退出'],
  ]
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>
        快捷键
      </Text>
      {rows.map(([k, v]) => (
        <Box key={k} gap={2}>
          <Box width={22}>
            <Text color="green">{k}</Text>
          </Box>
          <Text>{v}</Text>
        </Box>
      ))}
      <Text dimColor>按任意键关闭</Text>
    </Box>
  )
}
