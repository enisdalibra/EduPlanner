import fs from 'node:fs';

const katexMinCss = fs.readFileSync('node_modules/katex/dist/katex.min.css', 'utf8');

// Replace multi-format font sources with woff2-only sources pointing to node_modules/katex/dist/fonts
const woff2OnlyCss = katexMinCss.replace(
  /src:url\(fonts\/([^)]+\.woff2)\) format\("woff2"\),url\(fonts\/[^)]+\.woff\) format\("woff"\),url\(fonts\/[^)]+\.ttf\) format\("truetype"\)/g,
  'src:url("../../node_modules/katex/dist/fonts/$1") format("woff2")'
);

fs.writeFileSync('src/assets/katex-custom.css', woff2OnlyCss, 'utf8');
console.log('Contains ttf?', woff2OnlyCss.includes('.ttf'), 'Length:', woff2OnlyCss.length);
