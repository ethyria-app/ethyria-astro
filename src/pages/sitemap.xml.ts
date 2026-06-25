import type { APIRoute } from 'astro';

const SITE = 'https://ethyria.at';
const LASTMOD = '2026-06-25';
const LOCALES = ['de', 'en', 'fr', 'es', 'ru'] as const;
type Locale = typeof LOCALES[number];

const SYMBOL_SLUGS = [
  'auto-unfall', 'ex-partner', 'fallen', 'fliegen', 'haus-raeume',
  'hunde-katzen', 'nackt-sein', 'pruefung', 'schlangen', 'schwangerschaft',
  'spinnen', 'tod', 'verfolgt-werden', 'wasser', 'zaehne-verlieren',
];

const PILLARS = [
  'traumdeutung-methoden',
  'traumsymbole-guide',
  'luzides-traeumen',
];

/** Absolute URL for a given locale and canonical path (e.g. /symbols/wasser/) */
function locUrl(lang: Locale, canonicalPath: string): string {
  return lang === 'de' ? `${SITE}${canonicalPath}` : `${SITE}/${lang}${canonicalPath}`;
}

/** Generate xhtml:link alternates for a canonical path (all 5 locales + x-default → DE) */
function alternates(canonicalPath: string): string {
  const lines = [
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${canonicalPath}"/>`,
    ...LOCALES.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${locUrl(l, canonicalPath)}"/>`),
  ];
  return lines.join('\n');
}

/** Single <url> block */
function entry(
  loc: string,
  alts: string,
  priority: string,
  changefreq = 'monthly',
): string {
  return `  <url>
    <loc>${loc}</loc>
${alts}
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/** Single <url> block without hreflang (DE-only pages) */
function entrySimple(loc: string, priority: string, changefreq = 'monthly'): string {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/** Emit one entry per locale for a multilingual URL group */
function group(
  canonicalPath: string,
  priorities: Partial<Record<Locale, string>> & { de: string },
  changefreq = 'monthly',
): string {
  const alts = alternates(canonicalPath);
  return LOCALES
    .filter(l => priorities[l])
    .map(l => entry(locUrl(l, canonicalPath), alts, priorities[l]!, changefreq))
    .join('\n');
}

export const GET: APIRoute = () => {
  const parts: string[] = [];

  // ── Homepages ──────────────────────────────────────────────────────────────
  parts.push(group('/', { de: '1.0', en: '0.9', fr: '0.8', es: '0.8', ru: '0.8' }));

  // ── Pillar pages ───────────────────────────────────────────────────────────
  for (const pillar of PILLARS) {
    parts.push(group(`/${pillar}/`, { de: '0.85', en: '0.8', fr: '0.75', es: '0.75', ru: '0.75' }));
  }

  // ── Symbol hub ────────────────────────────────────────────────────────────
  parts.push(group('/symbols/', { de: '0.9', en: '0.8', fr: '0.8', es: '0.8', ru: '0.8' }, 'weekly'));

  // ── Symbol detail pages ────────────────────────────────────────────────────
  for (const slug of SYMBOL_SLUGS) {
    parts.push(group(`/symbols/${slug}/`, { de: '0.7', en: '0.6', fr: '0.6', es: '0.6', ru: '0.6' }));
  }

  // ── About / Team (DE only) ─────────────────────────────────────────────────
  parts.push(entrySimple(`${SITE}/about/team/`, '0.6'));

  // ── AGB (DE only) ─────────────────────────────────────────────────────────
  parts.push(entrySimple(`${SITE}/agb/`, '0.5'));

  // ── Datenschutz ────────────────────────────────────────────────────────────
  parts.push(group('/datenschutz/', { de: '0.4', en: '0.3', fr: '0.3', es: '0.3', ru: '0.3' }));

  // ── Impressum ──────────────────────────────────────────────────────────────
  parts.push(group('/impressum/', { de: '0.4', en: '0.3', fr: '0.3', es: '0.3', ru: '0.3' }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${parts.join('\n\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
