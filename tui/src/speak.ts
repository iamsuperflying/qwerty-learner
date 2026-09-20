import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dataDir } from './persist.ts'

let current: ChildProcess | null = null

export function generateWordSoundSrc(word: string, type: 'us' | 'uk'): string {
  const code = type === 'uk' ? 1 : 2
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${code}`
}

function cacheFile(word: string, type: 'us' | 'uk'): string {
  const safe = word.replace(/[^\w.-]+/g, '_')
  return path.join(dataDir(), 'cache', type, `${safe}.mp3`)
}

async function download(url: string, dest: string): Promise<boolean> {
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) return false
    fs.writeFileSync(dest, buf)
    return true
  } catch {
    fs.rmSync(dest, { force: true })
    return false
  }
}

function which(bin: string): boolean {
  const dirs = (process.env.PATH ?? '').split(path.delimiter)
  return dirs.some((dir) => fs.existsSync(path.join(dir, bin)))
}

function stopPlayback() {
  if (current && !current.killed) {
    current.kill()
  }
  current = null
}

function run(cmd: string, args: string[]) {
  stopPlayback()
  current = spawn(cmd, args, { stdio: 'ignore' })
  current.on('exit', () => {
    current = null
  })
}

function playFile(file: string): boolean {
  if (process.platform === 'darwin' && which('afplay')) {
    run('afplay', [file])
    return true
  }
  if (which('ffplay')) {
    run('ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet', file])
    return true
  }
  if (which('mpg123')) {
    run('mpg123', ['-q', file])
    return true
  }
  if (which('mpv')) {
    run('mpv', ['--no-video', '--really-quiet', file])
    return true
  }
  return false
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function playDetached(file: string) {
  if (!fs.existsSync(file)) return
  const spawnSfx = (cmd: string, args: string[]) => {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
  }
  if (process.platform === 'darwin' && which('afplay')) {
    spawnSfx('afplay', [file])
    return
  }
  if (which('ffplay')) {
    spawnSfx('ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet', file])
    return
  }
  if (which('mpg123')) {
    spawnSfx('mpg123', ['-q', file])
    return
  }
  if (which('mpv')) {
    spawnSfx('mpv', ['--no-video', '--really-quiet', file])
  }
}

export function listKeySounds(): string[] {
  const dir = path.join(repoRoot, 'public/sounds/key-sound')
  if (!fs.existsSync(dir)) return ['Default.wav']
  const files = fs.readdirSync(dir).filter((f) => /\.(wav|mp3)$/i.test(f))
  files.sort((a, b) => {
    if (a === 'Default.wav') return -1
    if (b === 'Default.wav') return 1
    return a.localeCompare(b)
  })
  return files.length > 0 ? files : ['Default.wav']
}

export function playSfx(kind: 'click' | 'beep' | 'correct', keyFile = 'Default.wav') {
  const file =
    kind === 'click'
      ? path.join(repoRoot, 'public/sounds/key-sound', keyFile)
      : kind === 'beep'
        ? path.join(repoRoot, 'public/sounds/beep.wav')
        : path.join(repoRoot, 'public/sounds/correct.wav')
  playDetached(file)
}

function cacheKey(text: string) {
  return text.replace(/[^\w一-鿿.-]+/g, '_').slice(0, 80) || 'x'
}

export async function playText(text: string, lang: 'zh' | 'us' | 'uk' = 'zh'): Promise<void> {
  const clip = text.trim().slice(0, 40)
  if (!clip) return
  const url =
    lang === 'zh'
      ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clip)}&le=zh`
      : generateWordSoundSrc(clip, lang)
  const file = path.join(dataDir(), 'cache', lang, `${cacheKey(clip)}.mp3`)
  try {
    if (!fs.existsSync(file)) {
      const ok = await download(url, file)
      if (!ok) return
    }
    playFile(file)
  } catch {
    // ignore
  }
}

function speakTts(word: string, type: 'us' | 'uk') {
  if (process.platform === 'darwin' && which('say')) {
    run('say', ['-v', type === 'uk' ? 'Daniel' : 'Samantha', word])
    return
  }
  if (which('espeak')) {
    run('espeak', [word])
    return
  }
  if (which('spd-say')) {
    run('spd-say', [word])
  }
}

export async function playWord(word: string, type: 'us' | 'uk'): Promise<void> {
  if (!word) return
  const file = cacheFile(word, type)
  try {
    if (!fs.existsSync(file)) {
      const ok = await download(generateWordSoundSrc(word, type), file)
      if (!ok) {
        speakTts(word, type)
        return
      }
    }
    if (!playFile(file)) {
      speakTts(word, type)
    }
  } catch {
    speakTts(word, type)
  }
}

export function prefetchWord(word: string, type: 'us' | 'uk') {
  if (!word) return
  const file = cacheFile(word, type)
  if (fs.existsSync(file)) return
  download(generateWordSoundSrc(word, type), file).catch(() => {})
}

export { stopPlayback }
