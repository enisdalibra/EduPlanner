import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const manifest = JSON.parse(await readFile(path.join(dist, '.vite', 'manifest.json'), 'utf8'));

const limits = {
  initialJavaScript: 750 * 1024,
  lazyChunk: 500 * 1024,
  precache: 2.5 * 1024 * 1024,
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

const excelEntries = Object.entries(manifest).filter(([key, entry]) =>
  key.includes('read-excel-file') ||
  key.includes('write-excel-file') ||
  entry.name === 'excel-reader' ||
  entry.name === 'excel-writer'
);
if (excelEntries.length < 2) throw new Error('Excel reader/writer chunks were not emitted separately.');
for (const [, entry] of excelEntries) {
  if (initialFiles.has(entry.file)) throw new Error(`Excel code leaked into initial JS: ${entry.file}`);
}

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

console.log(`Initial JS: ${(initialJavaScript / 1024).toFixed(1)} / 750 KiB`);
console.log(`Largest lazy chunk: ${((largestLazy?.size ?? 0) / 1024).toFixed(1)} / 500 KiB`);
console.log(`Offline precache: ${(precache / 1024 / 1024).toFixed(2)} / 2.50 MiB`);
if (failures.length) throw new Error(`Bundle budget exceeded: ${failures.join(', ')}`);
