// Rendert die zwei festen Bildentwürfe in Originalgröße.
// node scripts/foerderduell-bildprobe.mjs [Ausgabeordner]
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser, ROOT } from '../lib/browser.mjs';

const out = resolve(process.argv[2] || join(ROOT, 'output', 'foerderduell-bildprobe'));
const source = pathToFileURL(join(ROOT, 'docs', 'reference', 'foerderduell-bildprobe.html'));
const formats = [
  { name: 'hoch', width: 1080, height: 1920 },
  { name: 'quer', width: 1920, height: 1080 }
];
await mkdir(out, { recursive: true });
const browser = await launchBrowser({ gpu: false });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', err => errors.push(err));
  const readImage = () => page.locator('canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  for (const { name, width, height } of formats) {
    await page.setViewportSize({ width, height });
    await page.goto(source.href + '?format=' + name);
    if (errors.length) throw errors[0];
    const size = await page.locator('canvas').evaluate(c => [c.width, c.height]);
    if (size[0] !== width || size[1] !== height) throw Error('Unerwartete Bildgröße ' + size);
    const png = await readImage();
    await page.reload();
    if (errors.length) throw errors[0];
    const repeat = await readImage();
    if (png !== repeat) throw Error('Abweichung beim erneuten Zeichnen im Format ' + name);
    const file = join(out, 'foerderduell-' + name + '.png');
    await writeFile(file, Buffer.from(png, 'base64'));
    console.log(width + ' × ' + height, file);
  }
} finally {
  await browser.close();
}
