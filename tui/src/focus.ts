import type { Buffer } from 'node:buffer'

const ENABLE = '\x1b[?1004h'
const DISABLE = '\x1b[?1004l'
const FOCUS_OUT = '\x1b[O'

/** Terminal focus in/out (DECSET 1004). onBlur = window.blur. Focus-in does not resume. */
export function watchTerminalFocus(onBlur: () => void): () => void {
  const stdin = process.stdin
  const stdout = process.stdout
  if (!stdin || typeof stdin.on !== 'function') {
    return () => {}
  }

  try {
    stdout.write(ENABLE)
  } catch {
    return () => {}
  }

  let buf = ''
  const onData = (chunk: Buffer | string) => {
    buf += typeof chunk === 'string' ? chunk : chunk.toString('binary')
    if (buf.includes(FOCUS_OUT)) onBlur()
    if (buf.length > 32) buf = buf.slice(-16)
  }

  stdin.on('data', onData)

  const stop = () => {
    stdin.off('data', onData)
    try {
      stdout.write(DISABLE)
    } catch {
      // ignore
    }
  }

  process.once('exit', stop)
  process.once('SIGINT', stop)
  return stop
}
