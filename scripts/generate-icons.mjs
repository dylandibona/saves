/**
 * Generate PWA + iOS PNG icons from public/icon.svg.
 *
 * Run with: node scripts/generate-icons.mjs
 *
 * Outputs:
 *   public/icon-192.png         — Android Chrome PWA
 *   public/icon-512.png         — Android Chrome PWA + maskable
 *   public/apple-touch-icon.png — iOS Add to Home Screen (180×180)
 *   public/favicon-32.png       — browser tab icon
 *
 * Re-run any time icon.svg is edited.
 */

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '..', 'public', 'icon.svg')
const svgBuffer = readFileSync(svgPath)

const targets = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32,  name: 'favicon-32.png' },
]

for (const { size, name } of targets) {
  const out = join(__dirname, '..', 'public', name)
  await sharp(svgBuffer, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log(`✓ ${name}  (${size}×${size})`)
}

console.log('\nDone. Icons written to /public.')
