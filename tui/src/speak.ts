import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
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

function download(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const file = fs.createWriteStream(dest)
    const req = https.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        file.close()
        fs.rmSync(dest, { force: true })
        resolve(false)
        return
      }
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(true)
      })
    })
    req.on('error', () => {
      file.close()
      fs.rmSync(dest, { force: true })
      resolve(false)
    })
    req.on('timeout', () => {
      req.destroy()
      file.close()
      fs.rmSync(dest, { force: true })
      resolve(false)
    })
  })
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
