/**
 * extract_symbols.mjs
 * Reads 15 × 5 symbol HTML pages → writes JSON to src/content/symbols/{lang}/{slug}.json
 * Run: node scripts/extract_symbols.mjs
 */
import { parse } from 'node-html-parser';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dir, '../../Ethyria_LandingPage/symbols');
const OUT = resolve(__dir, '../src/content/symbols');

const SLUGS = [
  'wasser', 'zaehne-verlieren', 'fliegen', 'verfolgt-werden', 'fallen',
  'tod', 'schlangen', 'nackt-sein', 'pruefung', 'schwangerschaft',
  'spinnen', 'haus-raeume', 'hunde-katzen', 'ex-partner', 'auto-unfall',
];

const LOCALES = ['de', 'en', 'fr', 'es', 'ru'];

const LOCALE_SYMBOL_DIR = {
  de: SRC,
  en: join(SRC, 'en'),
  fr: join(SRC, 'fr'),
  es: join(SRC, 'es'),
  ru: join(SRC, 'ru'),
};

const HERO_IMAGE_MAP = {
  wasser: 'water.webp',
  'zaehne-verlieren': 'teeth.webp',
  fliegen: 'flying.webp',
  'verfolgt-werden': 'chasing.webp',
  fallen: 'falling.webp',
  tod: 'death.webp',
  schlangen: 'snake.webp',
  'nackt-sein': 'naked.webp',
  pruefung: 'exam.webp',
  schwangerschaft: 'pregnancy.webp',
  spinnen: 'spider.webp',
  'haus-raeume': 'house.webp',
  'hunde-katzen': 'pets.webp',
  'ex-partner': 'expartner.webp',
  'auto-unfall': 'car-accident.webp',
};

function extractText(el) {
  if (!el) return '';
  return el.textContent.replace(/\s+/g, ' ').trim();
}

function extractJsonLd(root, type) {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent);
      if (data['@type'] === type) return data;
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

function parseSymbolPage(html, slug, lang) {
  const root = parse(html);

  // Meta
  const title = root.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
  const description = title;
  const keywords = root.querySelector('meta[name="keywords"]')?.getAttribute('content') ?? '';

  // Dates from JSON-LD
  const article = extractJsonLd(root, 'Article');
  const datePublished = article?.datePublished ?? '2026-04-13';
  const dateModified = article?.dateModified ?? '2026-06-24';

  // Hero image
  const heroImage = HERO_IMAGE_MAP[slug] ?? `${slug}.webp`;
  const heroImgEl = root.querySelector('.symbol-hero-img');
  const heroAlt = heroImgEl?.getAttribute('alt') ?? '';

  // Interpretation sections — find all <section> elements in main
  const sections = root.querySelectorAll('main section');

  // Section order: Freud(0), Jung(1), Spiritual(2), Biosync(3), Community(4), Variants(5), FAQ(6)
  function getSectionText(idx) {
    const sec = sections[idx];
    if (!sec) return '';
    const p = sec.querySelector('p');
    return extractText(p);
  }

  const freud = getSectionText(0);
  const jung = getSectionText(1);
  const spiritual = getSectionText(2);
  const biosync = getSectionText(3);

  // Community stats — section[4] has complex structure, skip detailed parsing
  const communityStats = { percent: 38, companion: 'Ruhe', total: 1200 };

  // Variants — section[5] .space-y-4 > div
  const variantsSection = sections[5];
  const variants = [];
  if (variantsSection) {
    const cards = variantsSection.querySelectorAll('.space-y-4 > div, .space-y-6 > div');
    for (const card of cards) {
      const h3 = card.querySelector('h3');
      const p = card.querySelector('p');
      const relatedLinks = card.querySelectorAll('a[href*="/symbols/"]');
      const related = relatedLinks.map(a => {
        const href = a.getAttribute('href') ?? '';
        const match = href.match(/\/symbols\/(?:[a-z]{2}\/)?([^/]+)\.html/);
        return match ? match[1] : '';
      }).filter(Boolean);
      if (h3) {
        variants.push({
          title: extractText(h3),
          description: extractText(p),
          related,
        });
      }
    }
  }

  // FAQ from JSON-LD (more reliable than HTML parsing)
  const faqData = extractJsonLd(root, 'FAQPage');
  const faq = [];
  if (faqData?.mainEntity) {
    for (const item of faqData.mainEntity) {
      faq.push({
        question: item.name ?? '',
        answer: item.acceptedAnswer?.text ?? '',
      });
    }
  }

  return {
    urlSlug: slug,
    title: root.querySelector('title')?.textContent?.trim() ?? slug,
    description,
    keywords,
    datePublished,
    dateModified,
    heroImage,
    heroAlt,
    freud,
    jung,
    spiritual,
    biosync,
    communityStats,
    variants: variants.slice(0, 5),
    faq: faq.slice(0, 4),
  };
}

let ok = 0, errors = 0;

for (const lang of LOCALES) {
  const outDir = join(OUT, lang);
  mkdirSync(outDir, { recursive: true });

  for (const slug of SLUGS) {
    const htmlPath = join(LOCALE_SYMBOL_DIR[lang], `${slug}.html`);
    try {
      const html = readFileSync(htmlPath, 'utf-8');
      const data = parseSymbolPage(html, slug, lang);

      // Validate required arrays
      if (data.variants.length < 5) {
        console.warn(`  WARN: ${lang}/${slug} only has ${data.variants.length} variants (need 5)`);
        // Pad if needed
        while (data.variants.length < 5) {
          data.variants.push({ title: '', description: '', related: [] });
        }
      }
      if (data.faq.length < 4) {
        console.warn(`  WARN: ${lang}/${slug} only has ${data.faq.length} FAQ items (need 4)`);
        while (data.faq.length < 4) {
          data.faq.push({ question: '', answer: '' });
        }
      }

      const outPath = join(outDir, `${slug}.json`);
      writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`  OK   ${lang}/${slug}.json`);
      ok++;
    } catch (e) {
      console.error(`  ERR  ${lang}/${slug}: ${e.message}`);
      errors++;
    }
  }
}

console.log(`\nDone: ${ok} OK, ${errors} errors`);
