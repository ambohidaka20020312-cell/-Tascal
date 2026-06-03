import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#111111" rx="80"/>
  <text x="256" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="260" font-weight="200" fill="white" text-anchor="middle" letter-spacing="20">T</text>
</svg>`

await sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('public/icon-512.png')
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile('public/apple-touch-icon.png')
await sharp(Buffer.from(svg)).resize(32, 32).png().toFile('public/favicon-32.png')
console.log('Icons generated')
