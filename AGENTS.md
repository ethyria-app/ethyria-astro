# CLAUDE.md — Ethyria Astro (ethyria-astro)

> Letzter Stand: 2026-06-28 Session 16 | Branch: `main` | Letzter Commit: `0f319d0` | Hosting: GitHub Pages + Cloudflare → ethyria.at
> Dieses Repo ist die Astro-Migration des alten Vanilla-HTML-Projekts (`Ethyria_LandingPage`).

---

## Produkt

**Ethyria** — KI-gestutzte Traumdeutung App (Android) + Live-Web-Analyse-Tool im Browser.
- Freemium-Modell: 30 Tage Premium gratis, danach Free-Tier mit Credits
- Zielgruppe: Android-Nutzer, Wellness/Self-Care, 16+
- 5 Sprachen: DE (Standard), EN, FR, ES, RU
- Play Store: `com.ethyria.app`

---

## Tech Stack

| Layer | Technologie | Detail |
|---|---|---|
| Framework | Astro 7 (static output) | `output: 'static'`, trailing slash always |
| CSS | TailwindCSS v4 (@tailwindcss/vite) + `public/style.css` | Build: `npm run build` |
| Content | Astro Content Collections (JSON) | `src/content/symbols/` -- 75 JSON-Dateien |
| JS | Vanilla JS (unveraendert aus altem Repo) | Alle Files in `public/assets/` |
| Backend API | Cloudflare Workers | `ethyria-api.omcstolz.workers.dev` |
| Hosting | GitHub Pages | GitHub Actions -> `dist/` -> live |
| CDN / Proxy | Cloudflare (Free) | Security Headers, Edge Cache, Orange Cloud |
| Domain | CNAME -> `ethyria.at` | |
| Analytics | Plausible.io | GDPR-konform |
| Error Tracking | Sentry (EU-Region) | `ingest.de.sentry.io` |
| PWA | `public/sw.js` (Cache-Name: `ethyria-astro-v1`) | Cache-First Assets, Network-First HTML |

**Build-Befehle:**
```bash
npm run dev    # Astro dev server (localhost:4321)
npm run build  # Astro static build -> dist/
```

**Deploy:** `git push origin main` -> GitHub Actions -> Pages live -> CF Cache Purge

---

## Dateistruktur

```
ethyria-astro/
├── astro.config.mjs             # Astro config: static, trailingSlash: always
├── src/
│   ├── content/
│   │   ├── config.ts            # Content Collection Schema
│   │   └── symbols/             # 15 x 5 = 75 JSON-Dateien (de-wasser.json etc.)
│   ├── i18n/
│   │   ├── ui.ts                # Locale-Typ, LOCALES Array, shared UI strings
│   │   └── utils.ts             # useTranslations(), getLangFromUrl(), getLocalizedUrl()
│   ├── layouts/
│   │   ├── BaseLayout.astro     # head, fonts, SW-Registration, scripts, Legal/Consent Shell
│   │   └── SymbolLayout.astro   # Symbol-Detailseiten Layout (extends BaseLayout)
│   ├── components/seo/
│   │   ├── MetaTags.astro
│   │   ├── HreflangTags.astro
│   │   ├── HomeSchema.astro
│   │   └── SymbolSchema.astro
│   └── pages/
│       ├── index.astro                      # DE Homepage /
│       ├── en/index.astro                   # EN /en/
│       ├── fr/index.astro                   # FR /fr/
│       ├── es/index.astro                   # ES /es/
│       ├── ru/index.astro                   # RU /ru/
│       ├── symbols/[slug]/index.astro        # /symbols/wasser/ (DE, dynamic)
│       ├── [lang]/symbols/[slug]/index.astro # /en/symbols/wasser/ etc.
│       ├── traumdeutung-methoden/index.astro  # Pillar (+ en/fr/es/ru/)
│       ├── traumsymbole-guide/index.astro     # Pillar (+ en/fr/es/ru/)
│       ├── luzides-traeumen/index.astro       # Pillar (+ en/fr/es/ru/)
│       ├── impressum/index.astro              # (+ en/fr/es/ru/)
│       ├── datenschutz/index.astro            # (+ en/fr/es/ru/)
│       ├── agb/index.astro
│       ├── about/team/index.astro
│       ├── 404.astro
│       └── offline/index.astro
└── public/
    ├── assets/                  # Alle JS-Dateien (unverändert), Bilder, APK, CSS
    │   ├── faq-accordion.js     # FAQ Toggle -- wird von BaseLayout geladen (KEIN faq.js!)
    │   ├── conversion.js        # Legal Popup + CSP-sichere Events
    │   ├── symbol-popup.js      # Homepage Traumlexikon Popup (15 Symbol-Cards)
    │   ├── consent.js           # DSGVO Consent Banner
    │   ├── ui-animations.js     # Scroll-Reveal (Observer A/B/C)
    │   └── live-analyse.js      # 145KB Analyse-Engine
    ├── symbols/img/             # Symbol-Bilder (WebP, 15 Stueck)
    ├── style.css                # Custom CSS (6700+ Zeilen)
    ├── sw.js                    # Service Worker
    └── manifest.json
```

---

## Content Collections -- Symbol JSON-Schema

Dateinamen: `{lang}-{slug}.json` (z.B. `de-wasser.json`, `en-fallen.json`)

Felder: `title`, `description`, `keywords`, `datePublished`, `dateModified`, `heroImage`, `heroAlt`, `freud`, `jung`, `spiritual`, `biosync` (alle HTML-Strings via set:html), `communityStats?` (`percent`, `companion`, `total`), `variants[]` (`title`, `description`, `related: string[]`), `faq[]` (`question`, `answer`), `urlSlug`.

---

## Wichtige Astro-Besonderheiten (Lessons Learned)

### Scoped Styles vs. is:global

Astro scopet `<style>` automatisch. Dynamisch per JS eingefugtes HTML bekommt KEINEN Hash.
**Regel:** `<style is:global>` verwenden wenn Styles auf JS-injizierten Content angewendet werden.
Betrifft: `symbol-popup.js` Detail-Content in allen 5 `index.astro` Dateien.

### Script-Loading -- Kein doppeltes Laden

BaseLayout laedt nach `<slot />`: `nav-mobile.js`, `faq-accordion.js`, `conversion.js`, `consent.js`, `analytics.js`, `ui-animations.js`.
- **NIEMALS `faq.js`** -- existiert nicht. Immer `faq-accordion.js`.
- Pages duerfen keine doppelten Script-Tags fuer BaseLayout-Scripts haben (doppelte Event-Listener).

### Legal Popup URL (gefixt 2026-06-26)

`conversion.js` Zeile 261 verwendet sprach-sensitivem URL:
```javascript
var _lang = (document.documentElement.lang || 'de').slice(0, 2);
var _prefix = _lang === 'de' ? '' : '/' + _lang;
fetch(_prefix + '/' + page + '/')  // z.B. /impressum/ oder /en/impressum/
```

### Symbol-Popup

`symbol-popup.js` — zwei URL-Kontexte:
- **Ausserhalb #symbolPopup:** nur `.html` URLs werden interceptiert (Legacy-Kompatibilitaet mit Homepage-Grid-Links)
- **Innerhalb #symbolPopup:** auch saubere Astro-URLs (`/symbols/slug/`, `/en/symbols/slug/`) werden interceptiert → Related-Symbol-Klicks bleiben im Popup
- `_spCleanUrl()` konvertiert `.html` -> saubere URL; saubere URLs passieren unveraendert durch
- `#symbolPopup` existiert NUR in den 5 Homepages — auf anderen Seiten greift `if (!sp) return` Guard

### data-legal-popup Attribut (gefixt 2026-06-28)

Fremdsprachen-Homepages verwenden `data-legal-popup="impressum"` (OHNE Sprachsuffix).
`conversion.js` fuegt den Sprachpfad selbst hinzu: `/en/` + `impressum` + `/` = `/en/impressum/`.
Fehler war: `data-legal-popup="impressum.en"` → fetch `/en/impressum.en/` → 404.

### Pfade

Alle Seiten (auch en/fr/es/ru) verwenden absolute Pfade: `/assets/`, `/fonts/`, `/style.css`. Kein `../`.

---

## Session-Verlauf (Astro-Migration)

| Commit | Datum | Inhalt |
|---|---|---|
| `94c6aaa` | unbekannt | Initiale Astro 7 Migration (114 Seiten) |
| `7c435f4` | unbekannt | Fehlende Bilder, Symbol-Popup saubere URLs |
| `aa31f41` | 2026-06-26 | faq.js->faq-accordion.js, popup is:global, Doppel-Load Fix |
| `61f1d91` | 2026-06-26 | Legal Popup leerer Content: language-aware URL |
| `14760b2` | 2026-06-28 | Quellenangaben, communityStats, Slug-Labels, faq.js SymbolLayout |
| `69c8cc0` | 2026-06-28 | EN Analysis Levels: ?? Platzhalter -> Phosphor Icons |
| `04b1e7a` | 2026-06-28 | Symbol heroImages korrigiert (3 Dateien, 5 Sprachen), Canonical-URL-Fix, Popup-Null-Guard |
| `050830d` | 2026-06-28 | Legal-Pages: grid-7 entfernt (doppelter Abstand fix), Symbol-Hero margin-bottom |
| `63743e1` | 2026-06-28 | Popup: clean Astro-URLs abfangen innerhalb Popup; #related-symbols befullt |
| `0f319d0` | 2026-06-28 | Legal-Popup Fremdsprachen: data-legal-popup Sprachsuffix entfernt |

---

## Bekannte offene Issues

| Issue | Prio |
|---|---|
| Pillar Pages Tiefenanalyse (Quellenangaben, JS, Popup) ausstehend | Mittel |
| Symbol-Popup auf Detail-Seiten: Pillar-Link navigiert statt Popup | Low |

---

## Wichtige Konstanten

```javascript
const API_URL = "https://ethyria-api.omcstolz.workers.dev";
CACHE_VERSION = 'ethyria-astro-v1'  // in public/sw.js -- bei neuen Assets erhoehen!
CONSENT_VERSION = "1.0"             // in assets/consent.js
```

---

## PFLICHT-REGELN

1. **Kein `faq.js`** -- gibt es nicht. Immer `faq-accordion.js`.
2. **Kein `onclick` in HTML** -- CSP-Verstoss. Immer `data-*` + `addEventListener`.
3. **5 Sprachen gleichzeitig** -- Aenderung in DE -> sofort in EN/FR/ES/RU.
4. **`<style is:global>`** wenn Styles auf JS-injizierten Content.
5. **Absolute Pfade** (`/assets/`, `/fonts/`) -- kein `../`.
6. **E-Mail-Links** mit `<!--email_off-->...</email_off-->` wrappen.
7. **Ghost Mode** -- keine Em/En-Dashes in sichtbarem Text.
