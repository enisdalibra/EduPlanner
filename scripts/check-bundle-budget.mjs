import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const manifest = JSON.parse(await readFile(path.join(dist, '.vite', 'manifest.json'), 'utf8'));

const limits = {
  initialJavaScript: 750 * 1024,
  lazyChunk: 1600 * 1024,
  precache: 8.5 * 1024 * 1024,
};

const initialFiles = new Set();
function addStaticEntry(entry) {
  if (!entry || initialFiles.has(entry.file)) return;
  initialFiles.add(entry.file);
  for (const importedKey of entry.imports ?? []) addStaticEntry(manifest[importedKey]);
}
addStaticEntry(manifest['index.html']);

async function bytes(files) {
  let total = 0;
  for (const file of files) total += (await stat(path.join(dist, file))).size;
  return total;
}

const initialJavaScript = await bytes([...initialFiles].filter((file) => file.endsWith('.js')));
const JavaScriptFiles = (await readdir(path.join(dist, 'assets')))
  .filter((file) => file.endsWith('.js'))
  .map((file) => `assets/${file}`);
const lazyFiles = JavaScriptFiles.filter((file) => !initialFiles.has(file));
const lazySizes = await Promise.all(lazyFiles.map(async (file) => ({
  file,
  size: (await stat(path.join(dist, file))).size,
})));
const largestLazy = lazySizes.sort((left, right) => right.size - left.size)[0];

function assertLazyOnly(label, entries, minCount) {
  if (entries.length < minCount) {
    throw new Error(`${label} chunks were not emitted separately.`);
  }
  for (const [, entry] of entries) {
    if (initialFiles.has(entry.file)) {
      throw new Error(`${label} code leaked into initial JS: ${entry.file}`);
    }
  }
}

const excelEntries = Object.entries(manifest).filter(([key, entry]) =>
  key.includes('read-excel-file') ||
  key.includes('write-excel-file') ||
  entry.name === 'excel-reader' ||
  entry.name === 'excel-writer'
);
assertLazyOnly('Excel', excelEntries, 2);

const mermaidEntries = Object.entries(manifest).filter(([key, entry]) =>
  key.includes('node_modules/mermaid') ||
  key.includes('node_modules/@mermaid-js') ||
  entry.file.includes('mermaid.core')
);
assertLazyOnly('Mermaid', mermaidEntries, 1);

async function precacheFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '.vite' ? [] : precacheFiles(file);
    if (entry.name === 'sw.js' || /^workbox-.*\.js$/.test(entry.name)) return [];
    return /\.(?:js|css|html|webmanifest|ico|png|svg|woff2)$/.test(entry.name) ? [file] : [];
  }));
  return files.flat();
}
const precache = await bytes((await precacheFiles(dist)).map((file) => path.relative(dist, file)));

const failures = [];
if (initialJavaScript > limits.initialJavaScript) failures.push('initial JavaScript');
if (largestLazy?.size > limits.lazyChunk) failures.push(`lazy chunk ${largestLazy.file}`);
if (precache > limits.precache) failures.push('offline precache');

console.log(`Initial JS: ${(initialJavaScript / 1024).toFixed(1)} / ${(limits.initialJavaScript / 1024).toFixed(0)} KiB`);
console.log(`Largest lazy chunk: ${((largestLazy?.size ?? 0) / 1024).toFixed(1)} / ${(limits.lazyChunk / 1024).toFixed(0)} KiB`);
console.log(`Offline precache: ${(precache / 1024 / 1024).toFixed(2)} / ${(limits.precache / 1024 / 1024).toFixed(2)} MiB`);
if (failures.length) throw new Error(`Bundle budget exceeded: ${failures.join(', ')}`);
