import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#FFFFFF" rx="114"/>
  <path d="M256 80 L390 158 L390 314 L256 392 L122 314 L122 158 Z"
        fill="none" stroke="#111111" stroke-width="28" stroke-linejoin="round"/>
  <path d="M256 130 L356 188 L356 304 L256 362 L156 304 L156 188 Z"
        fill="none" stroke="#111111" stroke-width="22" stroke-linejoin="round"
        transform="rotate(30 256 256)"/>
  <path d="M256 175 L320 211 L320 283 L256 319 L192 283 L192 211 Z"
        fill="none" stroke="#111111" stroke-width="16" stroke-linejoin="round"/>
  <circle cx="256" cy="256" r="24" fill="#4A7C59"/>
</svg>`;

const sizes = [192, 512, 1024];

for (const size of sizes) {
  const svgBuf = Buffer.from(svgContent.replace('width="512" height="512"', `width="${size}" height="${size}"`));
  await sharp(svgBuf)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, `icon-${size}.png`));
  console.log(`Generated icon-${size}.png`);
}

// favicon用に32x32も生成
await sharp(Buffer.from(svgContent))
  .resize(32, 32)
  .png()
  .toFile(join(publicDir, 'favicon.png'));
console.log('Generated favicon.png');
