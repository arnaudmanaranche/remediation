import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const svgPath = join(root, 'public', 'og-image.svg')
const pngPath = join(root, 'public', 'og-image.png')

const svg = readFileSync(svgPath, 'utf8')

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
})

const png = resvg.render().asPng()
writeFileSync(pngPath, png)

console.log(`og-image.png written (${png.byteLength} bytes)`)
