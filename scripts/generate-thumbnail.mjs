import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const cacheDir = join(__dirname, '.cache');

const EYEBROW = '- Engineering Ethics -';
const TITLE = '技術者倫理を守ろう';
const LEAD = 'あなたの発言/行動は技術者倫理を守っていますか？';
const DOMAIN = 'gijutsusharin.li';

async function loadFonts() {
  const existing = existsSync(cacheDir)
    ? readdirSync(cacheDir).filter(f => /^font-\d+\.woff2$/.test(f)).sort()
    : [];

  if (existing.length > 0) {
    return existing.map(f => ({
      name: 'sans',
      data: readFileSync(join(cacheDir, f)),
      weight: 700,
      style: 'normal',
    }));
  }

  mkdirSync(cacheDir, { recursive: true });

  const chars = [...new Set([...EYEBROW, ...TITLE, ...LEAD, ...DOMAIN])].join('');
  const res = await fetch(
    `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(chars)}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0' } },
  );
  const css = await res.text();

  const urls = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(m => m[1]);
  if (!urls.length) throw new Error(`Google Fonts response contained no font URLs:\n${css}`);

  const fonts = [];
  for (let i = 0; i < urls.length; i++) {
    const data = Buffer.from(await fetch(urls[i]).then(r => r.arrayBuffer()));
    writeFileSync(join(cacheDir, `font-${i}.woff2`), data);
    fonts.push({ name: 'sans', data, weight: 700, style: 'normal' });
  }
  return fonts;
}

function buildElement() {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        backgroundImage:
          'linear-gradient(#e5e7eb 1px, transparent 1px),linear-gradient(90deg,#e5e7eb 1px,transparent 1px)',
        backgroundSize: '60px 60px',
        fontFamily: 'sans',
        padding: '80px 100px',
        gap: '20px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { fontSize: '20px', letterSpacing: '0.18em', color: '#9ca3af' },
            children: EYEBROW,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '84px',
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.15,
              textAlign: 'center',
            },
            children: TITLE,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '24px',
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: 1.6,
            },
            children: LEAD,
          },
        },
        {
          type: 'div',
          props: {
            style: { fontSize: '20px', color: '#9ca3af', marginTop: '12px' },
            children: DOMAIN,
          },
        },
      ],
    },
  };
}

async function main() {
  const fonts = await loadFonts();
  const svg = await satori(buildElement(), { width: 1200, height: 630, fonts });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  writeFileSync(join(root, 'public', 'thumbnail.png'), resvg.render().asPng());
  console.log('✓ public/thumbnail.png');
}

main().catch(e => { console.error(e); process.exit(1); });
