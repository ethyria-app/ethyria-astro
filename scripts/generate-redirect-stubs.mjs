/**
 * Generiert HTML-Redirect-Stubs für alle Legacy-URLs in public/
 * Keine Cloudflare-Berechtigungen nötig — läuft auf GitHub Pages.
 */

import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const PUBLIC = 'C:/Users/ostol/Desktop/ethyria-astro/public';
const SITE   = 'https://ethyria.at';

const SYMBOL_SLUGS = [
  'auto-unfall','ex-partner','fallen','fliegen','haus-raeume',
  'hunde-katzen','nackt-sein','pruefung','schlangen','schwangerschaft',
  'spinnen','tod','verfolgt-werden','wasser','zaehne-verlieren',
];
const LANGS = ['en','fr','es','ru'];

function stub(targetPath) {
  const url = `${SITE}${targetPath}`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=${url}">
<link rel="canonical" href="${url}">
<title>Weiterleitung...</title>
</head>
<body>
<p><a href="${url}">Weiterleitung zu ${url}</a></p>
</body>
</html>`;
}

function write(filePath, targetPath) {
  const fullPath = path.join(PUBLIC, filePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, stub(targetPath), 'utf-8');
  console.log(`  ✓ ${filePath} → ${targetPath}`);
}

console.log('\n=== Symbol Hub Sprachversionen ===');
for (const l of LANGS) {
  write(`symbols/${l}/index.html`, `/${l}/symbols/`);
}

console.log('\n=== Symbol Detail .html (DE) ===');
for (const slug of SYMBOL_SLUGS) {
  write(`symbols/${slug}.html`, `/symbols/${slug}/`);
}

console.log('\n=== Symbol Detail .html (EN/FR/ES/RU) ===');
for (const l of LANGS) {
  for (const slug of SYMBOL_SLUGS) {
    write(`symbols/${l}/${slug}.html`, `/${l}/symbols/${slug}/`);
  }
}

console.log('\n=== Pillar Pages ===');
for (const p of ['traumdeutung-methoden','traumsymbole-guide','luzides-traeumen']) {
  write(`${p}.html`, `/${p}/`);
  for (const l of LANGS) {
    write(`${p}.${l}.html`, `/${l}/${p}/`);
  }
}

console.log('\n=== Legal Pages ===');
for (const p of ['impressum','datenschutz']) {
  write(`${p}.html`, `/${p}/`);
  for (const l of LANGS) {
    write(`${p}.${l}.html`, `/${l}/${p}/`);
  }
}
write('agb.html', '/agb/');

console.log('\nFertig!');
