// src-tauri/icons/source.svg → src-tauri/icons/app-icon.png (1024²). 이후 `npx tauri icon src-tauri/icons/app-icon.png`.
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'src-tauri/icons/source.svg'), 'utf-8');
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 }, background: 'rgba(0,0,0,0)' }).render().asPng();
const out = join(root, 'src-tauri/icons/app-icon.png');
writeFileSync(out, png);
console.log('wrote', out, png.length, 'bytes');
