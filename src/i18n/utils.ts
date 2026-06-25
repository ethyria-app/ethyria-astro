import { ui, LOCALES, type Locale } from './ui';

export function getLangFromUrl(url: URL): Locale {
  const [, first] = url.pathname.split('/');
  if (first && (LOCALES as readonly string[]).includes(first)) {
    return first as Locale;
  }
  return 'de';
}

export function useTranslations(lang: Locale) {
  return function t(key: string): string {
    return (ui[lang] as Record<string, string>)[key] ?? (ui['de'] as Record<string, string>)[key] ?? key;
  };
}

export function getLocalizedUrl(lang: Locale, path: string): string {
  if (lang === 'de') return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `/${lang}${clean}`;
}

export function getAlternateUrls(path: string): Record<Locale, string> {
  const result = {} as Record<Locale, string>;
  for (const locale of LOCALES) {
    result[locale] = `https://ethyria.at${getLocalizedUrl(locale, path)}`;
  }
  return result;
}
