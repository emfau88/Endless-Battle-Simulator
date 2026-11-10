// Kopiert die Browser-Builds von PixiJS und Matter.js nach vendor/,
// damit index.html auch offline bzw. per file:// funktioniert.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'vendor'), { recursive: true });
const files = [
  ['node_modules/pixi.js/dist/pixi.min.js', 'vendor/pixi.min.js'],
  ['node_modules/matter-js/build/matter.min.js', 'vendor/matter.min.js'],
];
for (const [src, dst] of files) {
  copyFileSync(join(root, src), join(root, dst));
  console.log(`kopiert: ${src} -> ${dst}`);
}
