import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(root, 'node_modules', '@fortawesome', 'fontawesome-free');
const targetRoot = resolve(root, 'vendor', 'fontawesome');

await mkdir(resolve(targetRoot, 'css'), { recursive: true });
await cp(
  resolve(sourceRoot, 'css', 'all.min.css'),
  resolve(targetRoot, 'css', 'all.min.css'),
);
await cp(
  resolve(sourceRoot, 'webfonts'),
  resolve(targetRoot, 'webfonts'),
  { recursive: true },
);
