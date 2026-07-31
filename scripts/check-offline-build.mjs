import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const requiredShellFiles = ['index.html', 'manifest.webmanifest', 'release.json', 'sw.js'];
await Promise.all(requiredShellFiles.map((file) => access(path.join(dist, file))));

const viteManifest = JSON.parse(await readFile(path.join(dist, '.vite', 'manifest.json'), 'utf8'));
const webManifest = JSON.parse(await readFile(path.join(dist, 'manifest.webmanifest'), 'utf8'));
const indexHtml = await readFile(path.join(dist, 'index.html'), 'utf8');
const serviceWorker = await readFile(path.join(dist, 'sw.js'), 'utf8');
const generatedAssets = new Set();

for (const entry of Object.values(viteManifest)) {
  generatedAssets.add(entry.file);
  for (const file of entry.css ?? []) generatedAssets.add(file);
  for (const file of entry.assets ?? []) generatedAssets.add(file);
}

const precachedAssets = [...generatedAssets].filter((file) =>
  /\.(?:js|css|html|json|ico|png|svg|woff2)$/.test(file)
);

const expectedManifest = {
  id: './',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#F8FAFC',
  theme_color: '#2563EB',
};
for (const [field, expected] of Object.entries(expectedManifest)) {
  if (webManifest[field] !== expected) {
    throw new Error(`Web app manifest ${field} must be ${JSON.stringify(expected)}.`);
  }
}

const requiredManifestIcons = [
  ['icons/eduplanner-icon.svg', 'any', 'image/svg+xml', 'any'],
  ['icons/eduplanner-icon-192.png', '192x192', 'image/png', 'any'],
  ['icons/eduplanner-icon-512.png', '512x512', 'image/png', 'any'],
  ['icons/eduplanner-maskable.svg', 'any', 'image/svg+xml', 'maskable'],
  ['icons/eduplanner-maskable-192.png', '192x192', 'image/png', 'maskable'],
  ['icons/eduplanner-maskable-512.png', '512x512', 'image/png', 'maskable'],
];
for (const [src, sizes, type, purpose] of requiredManifestIcons) {
  if (
    !webManifest.icons?.some(
      (icon) =>
        icon.src === src &&
        icon.sizes === sizes &&
        icon.type === type &&
        icon.purpose === purpose,
    )
  ) {
    throw new Error(`Web app manifest is missing the required icon: ${src}.`);
  }
}

const requiredIconFiles = [
  ...requiredManifestIcons.map(([src]) => src),
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];
await Promise.all(requiredIconFiles.map((file) => access(path.join(dist, file))));

for (const htmlIcon of [
  'icons/eduplanner-icon.svg',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
]) {
  if (!indexHtml.includes(htmlIcon)) {
    throw new Error(`HTML metadata is missing the required icon: ${htmlIcon}.`);
  }
}

const missing = [
  'index.html',
  'manifest.webmanifest',
  'release.json',
  ...requiredIconFiles,
  ...precachedAssets,
]
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
