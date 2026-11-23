import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const assets = path.join(root, 'assets');
const store = path.join(root, 'store');
const sourceLogo = path.join(root, 'design', 'logos', 'snowdate-reference-clean-2048.png');

await mkdir(store, { recursive: true });

const logo = await readFile(sourceLogo);
const logoData = logo.toString('base64');

const featureGraphic = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="80" y1="0" x2="944" y2="500" gradientUnits="userSpaceOnUse">
      <stop stop-color="#C8EAFD"/>
      <stop offset=".55" stop-color="#EDF7FB"/>
      <stop offset="1" stop-color="#FFE5EC"/>
    </linearGradient>
    <clipPath id="logoClip"><rect x="78" y="100" width="300" height="300" rx="80"/></clipPath>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <g opacity=".2" fill="none" stroke="#688CA2" stroke-width="2">
    <path d="M-20 416C118 356 197 323 280 232C360 144 453 123 551 72C632 148 714 191 805 208C893 224 964 209 1050 139"/>
    <path d="M-10 460C139 399 231 356 327 263C401 190 486 180 570 133C650 196 725 234 812 247C902 261 980 242 1046 190"/>
  </g>
  <image href="data:image/png;base64,${logoData}" x="78" y="100" width="300" height="300" clip-path="url(#logoClip)"/>
  <text x="430" y="238" fill="#1E293B" font-family="PingFang SC, Noto Sans CJK SC, sans-serif" font-size="108" font-weight="700">雪约</text>
  <text x="436" y="296" fill="#526876" font-family="PingFang SC, Noto Sans CJK SC, sans-serif" font-size="28">滑雪顺路拼车</text>
  <text x="438" y="341" fill="#0C63E7" font-family="PingFang SC, Noto Sans CJK SC, sans-serif" font-size="20">路线、座位、报价，一次说清</text>
</svg>`);

await Promise.all([
  sharp(logo).resize(1024, 1024).png().toFile(path.join(assets, 'icon.png')),
  sharp(logo).resize(512, 512).png().toFile(path.join(store, 'icon-512.png')),
  sharp(logo).resize(1024, 1024).png().toFile(path.join(assets, 'android-icon-foreground.png')),
  sharp(logo).resize(1024, 1024).png().toFile(path.join(assets, 'splash-icon.png')),
  sharp(logo).resize(64, 64).png().toFile(path.join(assets, 'favicon.png')),
  sharp(logo).resize(1024, 1024).png().toFile(path.join(assets, 'logo.png')),
  sharp(featureGraphic)
    .resize(1024, 500)
    .png()
    .toFile(path.join(store, 'feature-graphic-1024x500.png')),
]);

console.log('Selected logo, Android assets, and store assets generated.');
