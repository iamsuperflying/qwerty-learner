# Qwerty Learner TUI

终端里练习单词打字。词库与网页版相同，进度在 `~/.qwerty-learner/qwerty.db`（SQLite）。需要 Node.js 22+。

```sh
npm --prefix tui install
npm run tui
```

## 快捷键

| 键 | 作用 |
|---|---|
| 字母 / 空格 | 开始或输入 |
| Enter | 暂停 / 继续 |
| Tab | 默写窥视 |
| Ctrl+P | 发音 |
| Ctrl+B | 强制切到系统 ABC（豆包请用 Shift 切英文） |
| Ctrl+V | 默写模式 |
| Ctrl+T | 译文 |
| Ctrl+D | 词库 |
| Ctrl+E | 错题本 |
| Ctrl+O | 设置 |
| Ctrl+S | 错 4 次后跳过 |
| Esc / q | 暂停时退出 |

启动时会切到 ABC 英文输入法，退出后还原。设置里可关「练时切英文输入法」。
