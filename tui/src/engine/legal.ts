const bannedKeys = new Set([
  'Enter',
  'Return',
  'Backspace',
  'Delete',
  'Tab',
  'CapsLock',
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'Escape',
  'Fn',
  'FnLock',
  'Hyper',
  'Super',
  'OS',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'UpArrow',
  'DownArrow',
  'LeftArrow',
  'RightArrow',
  'AudioVolumeUp',
  'AudioVolumeDown',
  'AudioVolumeMute',
  'End',
  'PageDown',
  'PageUp',
  'Clear',
  'Home',
])

export function isLegalChar(key: string): boolean {
  if (!key) return false
  if (bannedKeys.has(key)) return false
  return true
}

export function isTypingChar(input: string): boolean {
  if (input === ' ') return true
  return input.length === 1 && input !== '\t' && input !== '\n' && input !== '\r'
}
