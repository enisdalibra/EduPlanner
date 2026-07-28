import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const requiredShellFiles = ['index.html', 'manifest.webmanifest', 'sw.js'];
await Promise.all(requiredShellFiles.map((file) => access(path.join(dist, file))));

const manifest = JSON.parse(await readFile(path.join(dist, '.vite', 'manifest.json'), 'utf8'));
const serviceWorker = await readFile(path.join(dist, 'sw.js'), 'utf8');
const generatedAssets = new Set();

for (const entry of Object.values(manifest)) {
  generatedAssets.add(entry.file);
  for (const file of entry.css ?? []) generatedAssets.add(file);
  for (const file of entry.assets ?? []) generatedAssets.add(file);
}

const precachedAssets = [...generatedAssets].filter((file) =>
  /\.(?:js|css|html|ico|png|svg|woff2)$/.test(file)
);

const missing = ['index.html', 'manifest.webmanifest', ...precachedAssets]
  .filter((file) => !serviceWorker.includes(file.replaceAll('\\', '/')));

if (missing.length) {
  throw new Error(`Offline precache is missing: ${missing.join(', ')}`);
}

const subsetFonts = [...generatedAssets].filter((file) =>
  /material-symbols-rounded-subset.*\.woff2$/.test(file)
);
if (subsetFonts.length !== 1) throw new Error('The subset Material Symbols font is not precached.');

try {
  await access(path.join(dist, 'registerSW.js'));
  throw new Error(
    'Unexpected registerSW.js: service-worker registration must remain controlled by the in-app update prompt.',
  );
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

if (!serviceWorker.includes('SKIP_WAITING')) {
  throw new Error('The service worker does not expose the user-triggered update message.');
}
if (serviceWorker.includes('clientsClaim')) {
  throw new Error('The service worker must not automatically claim active application tabs.');
}

console.log(`Offline smoke test: app shell and ${precachedAssets.length} generated assets are precached.`);
