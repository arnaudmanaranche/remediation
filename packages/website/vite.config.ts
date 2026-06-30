import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Resvg } from '@resvg/resvg-js'

function ogImagePlugin() {
  return {
    name: 'og-image',
    buildStart() {
      const svg = readFileSync(join(process.cwd(), 'public/og-image.svg'), 'utf8')
      const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
      writeFileSync(join(process.cwd(), 'public/og-image.png'), png)
    },
  }
}

export default defineConfig({
  plugins: [react(), ogImagePlugin()],
})
