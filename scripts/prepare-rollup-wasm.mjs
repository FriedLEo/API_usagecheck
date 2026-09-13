import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const target = require.resolve('rollup/dist/native.js')
const marker = "require('@rollup/wasm-node/dist/native.js')"
const source = await readFile(target, 'utf8')
if (!source.includes(marker)) {
  const pattern = /requireWithFriendlyError\(\s*existsSync\(path\.join\(__dirname, localName\)\) \? localName : `@rollup\/rollup-\$\{packageBase\}`\s*\)/
  if (!pattern.test(source)) throw new Error('Unsupported Rollup native loader format')
  await writeFile(target, source.replace(pattern, marker), 'utf8')
  console.log('Enabled Rollup WASM fallback for this Windows policy environment.')
}
