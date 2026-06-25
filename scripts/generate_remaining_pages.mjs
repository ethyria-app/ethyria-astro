/**
 * Generates Astro pages from existing HTML files for:
 * - Pillar pages (15: 3 topics × 5 languages)
 * - Legal pages (agb, datenschutz × 5, impressum × 5)
 * - About/Team page
 * - 404 and offline pages
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const OLD = 'C:/Users/ostol/Desktop/Ethyria_LandingPage';
const NEW = 'C:/Users/ostol/Desktop/ethyria-astro';
const LOCALES = ['de', 'en', 'fr', 'es', 'ru'];

// Scripts managed by BaseLayout (to remove)
const BASE_SCRIPTS = new Set([
  'nav-mobile.js', 'faq.js', 'conversion.js', 'consent.js', 'analytics.js',
  'ui-animations.js', 'web-vitals.js', 'sentry-init.js',
  'https://browser.sentry-cdn.com', 'https://plausible.io/js/script',
]);

function extractBody(html) {
  const bodyStart = html.indexOf('<body');
  const bodyEnd = html.lastIndexOf('</body>');
  if (bodyStart === -1 || bodyEnd === -1) return html;
  const openEnd = html.indexOf('>', bodyStart) + 1;
  return html.slice(openEnd, bodyEnd);
}

function fixPaths(html, fromRoot) {
  // fromRoot: number of levels from root (0=root, 1=one subdir like /en/ or /agb/)
  // pillar pages with absolute paths: /assets/ - already absolute, no fix needed
  // sub-pages one level deep (en/traumdeutung-methoden/): need to keep absolute /assets/

  if (fromRoot === 0) {
    // Root files: fix any remaining relative paths
    html = html
      .replaceAll('href="assets/', 'href="/assets/')
      .replaceAll('src="assets/', 'src="/assets/')
      .replaceAll('href="symbols/', 'href="/symbols/')
      .replaceAll('href="traumdeutung-methoden/', 'href="/traumdeutung-methoden/')
      .replaceAll('href="traumsymbole-guide/', 'href="/traumsymbole-guide/')
      .replaceAll('href="luzides-traeumen/', 'href="/luzides-traeumen/');
  } else if (fromRoot === 1) {
    // e.g. /agb/, /about/team/, /en/, etc.
    html = html
      .replaceAll('../assets/', '/assets/')
      .replaceAll('../fonts/', '/fonts/')
      .replaceAll('../style.css', '/style.css')
      .replaceAll('../symbols/', '/symbols/')
      .replaceAll('../traumdeutung-methoden/', '/traumdeutung-methoden/')
      .replaceAll('../traumsymbole-guide/', '/traumsymbole-guide/')
      .replaceAll('../luzides-traeumen/', '/luzides-traeumen/')
      .replaceAll('../about/', '/about/')
      .replaceAll('../agb', '/agb')
      .replaceAll('../impressum', '/impressum')
      .replaceAll('../datenschutz', '/datenschutz')
      .replaceAll('href="../"', 'href="/"');
  } else if (fromRoot === 2) {
    // e.g. /en/traumdeutung-methoden/, /en/symbols/wasser/
    html = html
      .replaceAll('../../assets/', '/assets/')
      .replaceAll('../../fonts/', '/fonts/')
      .replaceAll('../../style.css', '/style.css')
      .replaceAll('../../symbols/', '/symbols/')
      .replaceAll('../../traumdeutung-methoden/', '/traumdeutung-methoden/')
      .replaceAll('../../traumsymbole-guide/', '/traumsymbole-guide/')
      .replaceAll('../../luzides-traeumen/', '/luzides-traeumen/')
      .replaceAll('../../about/', '/about/')
      .replaceAll('../../agb', '/agb')
      .replaceAll('../../impressum', '/impressum')
      .replaceAll('../../datenschutz', '/datenschutz')
      .replaceAll('href="../../"', 'href="/"')
      .replaceAll('href="../"', 'href="/"');
  }

  // Also handle cases where paths use /en/ prefix already (pillar pages in directories)
  // Pillar pages in /traumdeutung-methoden/ already use absolute /assets/ paths

  return html;
}

function removeScripts(html) {
  // Remove SW registration
  html = html.replace(/<script>\s*if\s*\("serviceWorker"\s*in\s*navigator\)[\s\S]*?<\/script>/g, '');
  html = html.replace(/<script>\s*if\s*\('serviceWorker'\s*in\s*navigator\)[\s\S]*?<\/script>/g, '');

  // Remove BaseLayout-managed script srcs
  for (const name of BASE_SCRIPTS) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`<script[^>]*src="[^"]*${escaped}[^"]*"[^>]*>\\s*<\\/script>`, 'g'), '');
  }

  // Remove consent popup (BaseLayout provides shell)
  const consentIdx = html.indexOf('id="ethyria-consent-popup"');
  if (consentIdx !== -1) {
    const divStart = html.lastIndexOf('<div', consentIdx);
    const commentBefore = html.lastIndexOf('<!--', divStart);
    const endDiv = html.indexOf('</div>', consentIdx);
    // Find closing </div> for the outermost consent div
    let depth = 1;
    let pos = html.indexOf('>', consentIdx) + 1;
    while (depth > 0 && pos < html.length) {
      const nextOpen = html.indexOf('<div', pos);
      const nextClose = html.indexOf('</div>', pos);
      if (nextOpen !== -1 && nextOpen < nextClose) { depth++; pos = nextOpen + 1; }
      else if (nextClose !== -1) { depth--; pos = nextClose + 6; }
      else break;
    }
    html = html.slice(0, commentBefore !== -1 ? commentBefore : divStart) + html.slice(pos);
  }

  // Remove legal popup (BaseLayout provides it now)
  const legalIdx = html.indexOf('id="legalPopup"');
  if (legalIdx !== -1) {
    const divStart = html.lastIndexOf('<div', legalIdx);
    const commentBefore = html.lastIndexOf('<!--', divStart);
    // Find end of legal popup (it's simple: 3 divs deep)
    const endMarker = '</div>\n  </div>\n  </div>';
    const endIdx = html.indexOf('</div>\n</div>\n</div>', divStart);
    const simpleEnd = html.indexOf('</div>\n  </div>\n  </div>', divStart);
    const actualEnd = simpleEnd !== -1 ? simpleEnd + '</div>\n  </div>\n  </div>'.length :
                      endIdx !== -1 ? endIdx + '</div>\n</div>\n</div>'.length : -1;
    if (actualEnd !== -1) {
      html = html.slice(0, commentBefore !== -1 ? commentBefore : divStart) + html.slice(actualEnd);
    }
  }

  return html;
}

function extractMeta(html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  const keywordsMatch = html.match(/<meta name="keywords" content="([^"]+)"/);
  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : '',
    keywords: keywordsMatch ? keywordsMatch[1].trim() : '',
  };
}

function generatePage(srcFile, destFile, lang, canonicalPath, extraScripts = []) {
  if (!existsSync(srcFile)) {
    console.log(`  SKIP: ${srcFile} not found`);
    return;
  }

  let html = readFileSync(srcFile, 'utf-8');
  const meta = extractMeta(html);

  // Determine path depth
  const depth = canonicalPath.split('/').filter(Boolean).length - (lang !== 'de' ? 1 : 0);

  let body = extractBody(html);
  body = fixPaths(body, depth);
  body = removeScripts(body);
  body = body.replace(/\n{4,}/g, '\n\n\n');

  // Add extra page-specific scripts
  const scriptsHtml = extraScripts.map(s => `<script is:inline src="${s}" defer></script>`).join('\n');
  if (scriptsHtml) {
    body = body.trim() + '\n' + scriptsHtml;
  }

  // Escape for template literal
  const bodyEscaped = body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  // Escape quotes in meta fields
  const titleEsc = meta.title.replace(/"/g, '&quot;');
  const descEsc = meta.description.replace(/"/g, '&quot;');
  const kwEsc = meta.keywords.replace(/"/g, '&quot;');

  const astroContent = `---
import BaseLayout from '@/layouts/BaseLayout.astro';
const _body = \`${bodyEscaped}\`;
---

<BaseLayout
  lang="${lang}"
  title="${titleEsc}"
  description="${descEsc}"
  keywords="${kwEsc}"
  path="${canonicalPath}"
>
  <Fragment set:html={_body} />
</BaseLayout>
`;

  mkdirSync(path.dirname(destFile), { recursive: true });
  writeFileSync(destFile, astroContent, 'utf-8');
  console.log(`  ✓ ${destFile.replace(NEW, '').replace(/\\/g, '/')} (${Math.round(astroContent.length / 1024)}KB)`);
}

// ═══════════════════════════════════════════════════════════════════
// PILLAR PAGES
// ═══════════════════════════════════════════════════════════════════
const PILLARS = ['traumdeutung-methoden', 'traumsymbole-guide', 'luzides-traeumen'];

console.log('\n=== PILLAR PAGES ===');

for (const pillar of PILLARS) {
  // DE: /traumdeutung-methoden/ (absolute paths in source, fromRoot=1)
  generatePage(
    `${OLD}/${pillar}/index.html`,
    `${NEW}/src/pages/${pillar}/index.astro`,
    'de',
    `/${pillar}/`,
    ['/assets/lang-switcher.js', '/assets/faq-accordion.js']
  );

  // EN/FR/ES/RU
  for (const locale of ['en', 'fr', 'es', 'ru']) {
    const srcDir = `${OLD}/${locale}/${pillar}`;
    const srcFile = `${srcDir}/index.html`;
    generatePage(
      srcFile,
      `${NEW}/src/pages/${locale}/${pillar}/index.astro`,
      locale,
      `/${pillar}/`,
      ['/assets/lang-switcher.js', '/assets/faq-accordion.js']
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// LEGAL PAGES
// ═══════════════════════════════════════════════════════════════════
console.log('\n=== LEGAL PAGES ===');

// AGB (DE only)
generatePage(
  `${OLD}/agb.html`,
  `${NEW}/src/pages/agb/index.astro`,
  'de',
  '/agb/'
);

// Datenschutz
generatePage(`${OLD}/datenschutz.html`, `${NEW}/src/pages/datenschutz/index.astro`, 'de', '/datenschutz/');
for (const locale of ['en', 'fr', 'es', 'ru']) {
  generatePage(
    `${OLD}/datenschutz.${locale}.html`,
    `${NEW}/src/pages/${locale}/datenschutz/index.astro`,
    locale,
    '/datenschutz/'
  );
}

// Impressum
generatePage(`${OLD}/impressum.html`, `${NEW}/src/pages/impressum/index.astro`, 'de', '/impressum/');
for (const locale of ['en', 'fr', 'es', 'ru']) {
  generatePage(
    `${OLD}/impressum.${locale}.html`,
    `${NEW}/src/pages/${locale}/impressum/index.astro`,
    locale,
    '/impressum/'
  );
}

// ═══════════════════════════════════════════════════════════════════
// ABOUT / TEAM
// ═══════════════════════════════════════════════════════════════════
console.log('\n=== ABOUT PAGES ===');
generatePage(
  `${OLD}/about/team/index.html`,
  `${NEW}/src/pages/about/team/index.astro`,
  'de',
  '/about/team/'
);

// ═══════════════════════════════════════════════════════════════════
// 404 + OFFLINE
// ═══════════════════════════════════════════════════════════════════
console.log('\n=== UTILITY PAGES ===');

// 404 - Astro expects src/pages/404.astro
generatePage(
  `${OLD}/404.html`,
  `${NEW}/src/pages/404.astro`,
  'de',
  '/404/'
);

// Offline page
generatePage(
  `${OLD}/offline.html`,
  `${NEW}/src/pages/offline/index.astro`,
  'de',
  '/offline/'
);

console.log('\nDone!');
