import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

function iconSvg({ size, radius, fontSize }) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#000000"/>
    <text x="50%" y="52%" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">K</text>
  </svg>`
}

const targets = [
  { file: 'icon-192.png', size: 192, radius: 36, fontSize: 104 },
  { file: 'icon-512.png', size: 512, radius: 96, fontSize: 280 },
  // maskable: full-bleed background, glyph kept inside the ~80% safe zone
  { file: 'icon-maskable-512.png', size: 512, radius: 0, fontSize: 200 },
]

for (const t of targets) {
  await sharp(Buffer.from(iconSvg(t)))
    .png()
    .toFile(`public/icons/${t.file}`)
  console.log('wrote', t.file)
}
