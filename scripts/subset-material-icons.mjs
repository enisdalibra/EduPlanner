import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(projectRoot, 'src');
const sourceFont = path.join(
  projectRoot,
  'node_modules',
  'material-symbols',
  'material-symbols-rounded.woff2',
);
const targetFont = path.join(sourceRoot, 'assets', 'material-symbols-rounded-subset.woff2');

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  }));
  return nested.flat();
}

function collectIconNames(source) {
  const names = new Set();
  const iconPattern = /<Icon\b[\s\S]*?\bname=(?:"([a-z0-9_]+)"|'([a-z0-9_]+)'|\{([^}]+)\})/g;
  const iconFieldPattern = /\bicon:\s*["']([a-z0-9_]+)["']/g;
  const directSymbolPattern = /material-symbols-rounded[^>]*>\s*([a-z0-9_]+)/g;

  for (const match of source.matchAll(iconPattern)) {
    const literal = match[1] ?? match[2];
    if (literal) names.add(literal);
    for (const candidate of (match[3] ?? '').matchAll(/["']([a-z0-9_]+)["']/g)) {
      names.add(candidate[1]);
    }
  }
  for (const match of source.matchAll(iconFieldPattern)) names.add(match[1]);
  for (const match of source.matchAll(directSymbolPattern)) names.add(match[1]);
  return names;
}

const names = new Set();
for (const file of await sourceFiles(sourceRoot)) {
  for (const name of collectIconNames(await readFile(file, 'utf8'))) names.add(name);
}

if (names.size === 0) throw new Error('No Material Symbols usages were found.');

const subset = await subsetFont(
  await readFile(sourceFont),
  [...names].sort().join('\n'),
  {
    targetFormat: 'woff2',
    variationAxes: {
      wght: { min: 300, max: 500, default: 400 },
      GRAD: 0,
      opsz: { min: 20, max: 48, default: 24 },
    },
  },
);

await mkdir(path.dirname(targetFont), { recursive: true });
await writeFile(targetFont, subset);
console.log(`Material Symbols subset: ${names.size} names, ${(subset.length / 1024).toFixed(1)} KiB`);
