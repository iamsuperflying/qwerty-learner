import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const src = fs.readFileSync(path.join(root, 'src/resources/dictionary.ts'), 'utf8')

function pick(block, key) {
  const re = new RegExp(`${key}:\\s*(?:'((?:\\\\'|[^'])*)'|"((?:\\\\"|[^"])*)")`)
  const m = block.match(re)
  return m ? (m[1] ?? m[2] ?? '').replace(/\\'/g, "'") : ''
}

function pickNum(block, key) {
  const m = block.match(new RegExp(`${key}:\\s*(\\d+)`))
  return m ? Number(m[1]) : 0
}

function pickTags(block) {
  const m = block.match(/tags:\s*\[([^\]]*)\]/)
  if (!m) return []
  return [...m[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map((x) => x[1] || x[2])
}

const blocks = src.match(/\n  \{\n    id: [\s\S]*?\n  \},/g) ?? []
const seen = new Set()
const catalog = []

for (const block of blocks) {
  if (block.includes('\n  //') && block.trimStart().startsWith('//')) continue
  const id = pick(block, 'id')
  const url = pick(block, 'url').replace(/^\.\//, '/')
  if (!id || !url || seen.has(id)) {
    if (id) seen.add(id)
    if (id && url && !catalog.find((d) => d.id === id)) {
      // keep first occurrence
    } else {
      if (id) continue
    }
  }
  if (!id || !url) continue
  if (seen.has(id) && catalog.some((d) => d.id === id)) continue
  seen.add(id)
  let normalized = url.startsWith('/') ? url : `/${url}`
  catalog.push({
    id,
    name: pick(block, 'name'),
    description: pick(block, 'description'),
    category: pick(block, 'category'),
    tags: pickTags(block),
    url: normalized,
    length: pickNum(block, 'length'),
    language: pick(block, 'language'),
    languageCategory: pick(block, 'languageCategory'),
  })
}

const outDir = path.join(root, 'tui/src/dicts')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'catalog.json')
fs.writeFileSync(outFile, JSON.stringify(catalog, null, 2) + '\n')
console.log(`wrote ${catalog.length} dictionaries -> ${path.relative(root, outFile)}`)
