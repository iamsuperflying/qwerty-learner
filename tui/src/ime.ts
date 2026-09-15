import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type ImeInfo = {
  id: string
  name: string
  bundle: string
  mode: string
}

const tuiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const binPath = path.join(tuiRoot, 'bin', 'ime')
const srcPath = path.join(tuiRoot, 'scripts', 'ime.swift')

let snapshot: ImeInfo | null = null
let held = false
let exitHookInstalled = false

function ensureBinary() {
  if (process.platform !== 'darwin') return false
  if (fs.existsSync(binPath)) return true
  if (!fs.existsSync(srcPath)) return false
  fs.mkdirSync(path.dirname(binPath), { recursive: true })
  execFileSync('swiftc', ['-O', '-o', binPath, srcPath, '-framework', 'Carbon'], {
    timeout: 60000,
    stdio: 'ignore',
  })
  return fs.existsSync(binPath)
}

function run(args: string[]): string {
  if (!ensureBinary()) return ''
  try {
    return execFileSync(binPath, args, { timeout: 3000, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function parseCurrent(text: string): ImeInfo | null {
  if (!text) return null
  const info: ImeInfo = { id: '', name: '', bundle: '', mode: '' }
  for (const line of text.split('\n')) {
    const i = line.indexOf('=')
    if (i < 0) continue
    const key = line.slice(0, i)
    const value = line.slice(i + 1)
    if (key === 'id' || key === 'name' || key === 'bundle' || key === 'mode') {
      info[key] = value
    }
  }
  return info.id ? info : null
}

export function getIme(): ImeInfo | null {
  if (process.platform !== 'darwin') return null
  return parseCurrent(run(['current']))
}

export function grabEnglish(): ImeInfo | null {
  if (process.platform !== 'darwin') return null
  if (!held) {
    snapshot = getIme()
    held = true
    installExitHook()
  }
  run(['english'])
  return getIme()
}

export function releaseIme() {
  if (!held) return
  const id = snapshot?.id
  held = false
  if (id) run(['select', id])
  snapshot = null
}

function installExitHook() {
  if (exitHookInstalled) return
  exitHookInstalled = true
  const restore = () => {
    try {
      releaseIme()
    } catch {
      // ignore
    }
  }
  process.on('exit', restore)
  process.on('SIGINT', () => {
    restore()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    restore()
    process.exit(143)
  })
}

export function imeShortName(info: ImeInfo | null): string {
  if (!info) return '?'
  if (info.id.startsWith('com.apple.keylayout.ABC')) return 'ABC'
  if (info.id.startsWith('com.apple.keylayout.US')) return 'US'
  return info.name || info.id.split('.').pop() || '?'
}
