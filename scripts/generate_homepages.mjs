/**
 * Generates Astro homepage pages from existing HTML files.
 * Strips head/scripts/popups (handled by BaseLayout), fixes asset paths.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { parse } from 'node-html-parser';
import path from 'path';

const OLD_ROOT = 'C:/Users/ostol/Desktop/Ethyria_LandingPage';
const NEW_ROOT = 'C:/Users/ostol/Desktop/ethyria-astro';

const LANGS = [
  { lang: 'de', src: `${OLD_ROOT}/index.html`, dest: `${NEW_ROOT}/src/pages/index.astro` },
  { lang: 'en', src: `${OLD_ROOT}/en/index.html`, dest: `${NEW_ROOT}/src/pages/en/index.astro` },
  { lang: 'fr', src: `${OLD_ROOT}/fr/index.html`, dest: `${NEW_ROOT}/src/pages/fr/index.astro` },
  { lang: 'es', src: `${OLD_ROOT}/es/index.html`, dest: `${NEW_ROOT}/src/pages/es/index.astro` },
  { lang: 'ru', src: `${OLD_ROOT}/ru/index.html`, dest: `${NEW_ROOT}/src/pages/ru/index.astro` },
];

// Scripts already loaded by BaseLayout (to remove from homepage)
const BASE_LAYOUT_SCRIPTS = new Set([
  'nav-mobile.js', 'faq.js', 'conversion.js', 'consent.js', 'analytics.js',
  'ui-animations.js', 'web-vitals.js', 'sentry-init.js',
  'https://browser.sentry-cdn.com/8.50.0/bundle.min.js',
  'https://plausible.io/js/script.outbound-links.js',
  'https://js.sentry-cdn.com/',
]);

// Additional homepage-specific scripts to load (not in BaseLayout)
const HOMEPAGE_SCRIPTS = [
  '/assets/section-nav.js',
  '/assets/slider.js',
  '/assets/download-cta.js',
  '/assets/faq-accordion.js',
  '/assets/symbol-popup.js',
  '/assets/dream-cards.js',
  '/assets/hub-tabs.js',
  '/assets/brief-cards.js',
  '/assets/hub-accordion.js',
  '/assets/vision-expand.js',
  '/assets/roadmap-toggle.js',
];

const META = {
  de: {
    title: 'Traumdeutung & Traumanalyse | Ethyria App',
    description: 'Traumdeutung mit KI: Freud, Jung, Spiritual und mehr. Analysiere deinen Traum kostenlos in Sekunden. Jetzt die App laden.',
    keywords: 'Traumdeutung App, KI Traumdeutung, Traumdeutung kostenlos, Traumtagebuch App, Traumanalyse App kostenlos',
    path: '/',
    analyseConfig: '/assets/analyse-config.de.js',
  },
  en: {
    title: 'Dream Interpretation & AI Dream Analysis | Ethyria App',
    description: 'AI-powered dream interpretation: Freud, Jung, Spiritual and more. Analyze your dream for free in seconds. Download the app now.',
    keywords: 'Dream interpretation app, AI dream analysis, dream journal app, dream analysis free',
    path: '/en/',
    analyseConfig: '/assets/analyse-config.en.js',
  },
  fr: {
    title: 'Interprétation des rêves & Analyse IA | Application Ethyria',
    description: 'Interprétation des rêves par IA : Freud, Jung, Spirituel et plus. Analysez votre rêve gratuitement en quelques secondes.',
    keywords: 'application interprétation rêves, analyse IA des rêves, journal de rêves, analyse de rêves gratuite',
    path: '/fr/',
    analyseConfig: '/assets/analyse-config.fr.js',
  },
  es: {
    title: 'Interpretación de Sueños & Análisis IA | App Ethyria',
    description: 'Interpretación de sueños con IA: Freud, Jung, Espiritual y más. Analiza tu sueño gratis en segundos. Descarga la app ahora.',
    keywords: 'app interpretación sueños, análisis IA sueños, diario de sueños, análisis de sueños gratis',
    path: '/es/',
    analyseConfig: '/assets/analyse-config.es.js',
  },
  ru: {
    title: 'Толкование снов & Анализ снов с ИИ | Приложение Ethyria',
    description: 'Толкование снов с ИИ: Фрейд, Юнг, Духовный и другие. Анализируйте свой сон бесплатно за секунды. Скачайте приложение.',
    keywords: 'приложение для толкования снов, анализ снов с ИИ, дневник снов, бесплатный анализ снов',
    path: '/ru/',
    analyseConfig: '/assets/analyse-config.ru.js',
  },
};

function fixAssetPaths(html, lang) {
  if (lang !== 'de') {
    // For lang versions (one level deep): replace ALL ../ occurrences
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
      // Cross-language links: ../fr/ etc. stay as-is (correct absolute paths for EN users)
      // BUT ../ alone (link to DE root) should become /
      .replaceAll('href="../"', 'href="/"')
      // ../impressum and ../datenschutz (pages in subdir)
      .replaceAll('../impressum', '/impressum')
      .replaceAll('../datenschutz', '/datenschutz');
  } else {
    // DE (root): fix relative paths that should be absolute
    html = html
      .replaceAll('src="assets/', 'src="/assets/')
      .replaceAll('href="assets/', 'href="/assets/')
      .replaceAll('srcset="assets/', 'srcset="/assets/')
      .replaceAll('data-src="assets/', 'data-src="/assets/')
      .replaceAll('data-lazy-script="assets/', 'data-lazy-script="/assets/')
      .replaceAll('src="symbols/', 'src="/symbols/')
      .replaceAll('href="symbols/', 'href="/symbols/')
      .replaceAll('href="traumdeutung-methoden/', 'href="/traumdeutung-methoden/')
      .replaceAll('href="traumsymbole-guide/', 'href="/traumsymbole-guide/')
      .replaceAll('href="luzides-traeumen/', 'href="/luzides-traeumen/')
      .replaceAll('href="impressum', 'href="/impressum')
      .replaceAll('href="datenschutz', 'href="/datenschutz')
      .replaceAll('href="agb', 'href="/agb')
      .replaceAll('href="about/', 'href="/about/')
      .replaceAll('href="index.html"', 'href="/"')
      // Handle srcset with embedded relative paths
      .replaceAll(', assets/', ', /assets/');
  }
  return html;
}

function extractBodyContent(html) {
  // Extract everything inside <body>...</body>
  const bodyStart = html.indexOf('<body');
  const bodyEnd = html.lastIndexOf('</body>');
  if (bodyStart === -1 || bodyEnd === -1) return html;
  // Get content inside body tag (after the opening tag)
  const openEnd = html.indexOf('>', bodyStart) + 1;
  return html.slice(openEnd, bodyEnd);
}

function extractJsonLd(html) {
  // Extract JSON-LD from <head> to append to body (Google supports it anywhere)
  const headEnd = html.indexOf('</head>');
  const head = headEnd !== -1 ? html.slice(0, headEnd) : html;
  const matches = [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (matches.length === 0) return '';
  return matches.map(m => `<script type="application/ld+json">${m[1]}</script>`).join('\n');
}

function removeScriptTags(html, lang) {
  // Remove script tags that are handled by BaseLayout
  // Also remove inline SW registration, inline lang redirect

  // Remove the lang redirect inline script
  html = html.replace(/<script>\s*\(function\(\)\{if\(sessionStorage[\s\S]*?\}\)\(\);\s*<\/script>/g, '');

  // Remove SW registration inline script
  html = html.replace(/<script>\s*if\s*\("serviceWorker"\s*in\s*navigator\)[\s\S]*?<\/script>/g, '');

  // Remove BaseLayout-managed external scripts
  for (const scriptName of BASE_LAYOUT_SCRIPTS) {
    const patterns = [
      // defer src pattern
      new RegExp(`<script[^>]*src="${'[^"]*'.replace(/\//g,'\\/')}${scriptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>\\s*<\\/script>`, 'g'),
    ];
    // Simple string-based removal for common patterns
    const escaped = scriptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`<script[^>]*src="[^"]*${escaped}"[^>]*>\\s*<\\/script>`, 'g'), '');
    html = html.replace(new RegExp(`<script[^>]* src="[^"]*${escaped}"[^>]*>\\s*<\\/script>`, 'g'), '');
  }

  // Remove api-config and analyse-config (will be re-added at end)
  html = html.replace(/<script[^>]*src="[^"]*api-config\.js"[^>]*>\s*<\/script>/g, '');
  html = html.replace(/<script[^>]*src="[^"]*analyse-config\.[a-z]+\.js"[^>]*>\s*<\/script>/g, '');

  // Remove live-analyse.js (will be re-added)
  html = html.replace(/<script[^>]*src="[^"]*live-analyse\.js"[^>]*>\s*<\/script>/g, '');

  // Remove section-nav, slider, download-cta, etc. (will be re-added at bottom)
  const toRemove = ['section-nav', 'slider', 'download-cta', 'faq-accordion', 'symbol-popup',
    'dream-cards', 'hub-tabs', 'brief-cards', 'hub-accordion', 'vision-expand', 'roadmap-toggle'];
  for (const name of toRemove) {
    html = html.replace(new RegExp(`<script[^>]*src="[^"]*${name}\\.js"[^>]*>\\s*<\\/script>`, 'g'), '');
  }

  return html;
}

function removePopupsAndTrailingScripts(html) {
  // Everything from the LEGAL POPUP comment onward is handled by BaseLayout.
  // BaseLayout provides: legalPopup HTML, SW registration, consent.js script.
  // The consent popup (ethyria-consent-popup) is homepage-specific — keep it on homepage pages.
  // Strategy: cut at the <!-- LEGAL POPUP --> or <!-- ====...LEGAL POPUP ==== --> comment.

  const markers = [
    '<!-- ============================================================\n       LEGAL POPUP',
    '<!-- ====\n       LEGAL POPUP',
    '  <!-- ============================================================\n       LEGAL POPUP',
    '\n  <!-- LEGAL POPUP',
  ];

  for (const marker of markers) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      // Keep the consent popup (it's already before legal popup in the HTML)
      // But we still need to remove SW registration and consent.js script tags
      // Those are removed by removeScriptTags(), so just cut here
      html = html.slice(0, idx);
      return html;
    }
  }

  // Fallback: find by ID
  const legalIdx = html.indexOf('<div id="legalPopup"');
  if (legalIdx !== -1) {
    const commentBefore = html.lastIndexOf('<!--', legalIdx);
    html = html.slice(0, commentBefore !== -1 ? commentBefore : legalIdx);
  }

  return html;
}

function moveVisionFilterToFile(html) {
  // Remove the vision gallery filter inline script (moved to /assets/vision-filter.js)
  // Try multiple possible whitespace variations
  const markers = [
    '(function(){\n            var btns=document.querySelectorAll(".vw-filter")',
    '(function(){\n          var btns=document.querySelectorAll(".vw-filter")',
    '(function() {\n            var btns=document.querySelectorAll(".vw-filter")',
    '(function(){\r\n            var btns=document.querySelectorAll(".vw-filter")',
  ];

  for (const marker of markers) {
    const filterScriptStart = html.indexOf(marker);
    if (filterScriptStart !== -1) {
      const scriptTagStart = html.lastIndexOf('<script>', filterScriptStart);
      if (scriptTagStart !== -1) {
        const scriptTagEnd = html.indexOf('</script>', filterScriptStart);
        if (scriptTagEnd !== -1) {
          html = html.slice(0, scriptTagStart) + html.slice(scriptTagEnd + '</script>'.length);
        }
      }
      break;
    }
  }

  return html;
}

function addConsentPopup(html) {
  // Keep the consent popup HTML in the page (consent.js needs it).
  // It was cut off by removePopupsAndTrailingScripts, so we add it back.
  const consentHtml = `
  <!-- DSGVO Consent Popup (Sprachtexte via consent.js) -->
  <div id="ethyria-consent-popup" class="consent-overlay" hidden role="dialog" aria-modal="true" aria-labelledby="consent-popup-title">
    <div class="consent-card">
      <div class="consent-icon" aria-hidden="true">&#128274;</div>
      <h2 id="consent-popup-title" class="consent-title"></h2>
      <p class="consent-body"></p>
      <label class="consent-label">
        <input type="checkbox" class="consent-checkbox" />
        <span class="consent-check-text"></span>
      </label>
      <button class="consent-accept-btn glow-button" disabled></button>
      <button class="consent-close-btn"></button>
    </div>
  </div>`;
  return html + consentHtml;
}

for (const { lang, src, dest } of LANGS) {
  console.log(`Processing ${lang}...`);

  let html = readFileSync(src, 'utf-8');
  const meta = META[lang];

  // Extract JSON-LD from <head> before extracting body
  const jsonLd = extractJsonLd(html);

  // Extract body content
  let body = extractBodyContent(html);

  // Fix asset paths
  body = fixAssetPaths(body, lang);

  // Remove managed scripts
  body = removeScriptTags(body, lang);

  // Remove legal popup + trailing scripts (BaseLayout handles them)
  body = removePopupsAndTrailingScripts(body);

  // Move vision filter script (moved to /assets/vision-filter.js)
  body = moveVisionFilterToFile(body);

  // Add back the consent popup HTML (consent.js needs it)
  body = addConsentPopup(body);

  // Append JSON-LD (Google supports it anywhere in the document)
  if (jsonLd) body = body + '\n' + jsonLd;

  // Clean up excessive whitespace
  body = body.replace(/\n{4,}/g, '\n\n\n');

  // Add homepage-specific scripts at end of body
  const scriptsBlock = [
    `<script is:inline src="/assets/api-config.js"></script>`,
    `<script is:inline src="${meta.analyseConfig}"></script>`,
    ...HOMEPAGE_SCRIPTS.map(s => `<script is:inline src="${s}" defer></script>`),
    `<script is:inline src="/assets/live-analyse.js" defer></script>`,
    `<script is:inline src="/assets/vision-filter.js" defer></script>`,
  ].join('\n');

  // Append scripts to body
  body = body.trim() + '\n' + scriptsBlock;

  // Escape backticks and template literal chars for JS string
  const bodyEscaped = body.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  const astroContent = `---
import BaseLayout from '@/layouts/BaseLayout.astro';
const _body = \`${bodyEscaped}\`;
---

<BaseLayout
  lang="${lang}"
  title="${meta.title.replace(/"/g, '&quot;')}"
  description="${meta.description.replace(/"/g, '&quot;')}"
  keywords="${meta.keywords.replace(/"/g, '&quot;')}"
  path="${meta.path}"
  ogType="website"
  lcpImage="/assets/screenshots_new_1/${lang === 'de' ? 'de' : lang}_1.webp"
>
  <Fragment set:html={_body} />
</BaseLayout>
`;

  // Ensure directory exists
  const dir = path.dirname(dest);
  mkdirSync(dir, { recursive: true });

  writeFileSync(dest, astroContent, 'utf-8');
  console.log(`  → Written ${dest} (${Math.round(astroContent.length / 1024)}KB)`);
}

console.log('\nDone! All 5 homepage Astro files generated.');
