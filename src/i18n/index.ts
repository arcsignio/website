import { en, type TranslationKey } from './en';
import { zhTW } from './zh-TW';

export type Locale = 'en' | 'zh-TW';

export const defaultLocale: Locale = 'zh-TW';
export const locales: Locale[] = ['zh-TW', 'en'];

const translations: Record<Locale, Record<string, string>> = {
  'en': en as unknown as Record<string, string>,
  'zh-TW': zhTW as unknown as Record<string, string>,
};

export function t(key: TranslationKey, locale: Locale): string {
  return translations[locale]?.[key] ?? translations['en'][key] ?? key;
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, first] = url.pathname.split('/');
  if (first === 'en') return 'en';
  return 'zh-TW';
}

export function getAlternateUrl(url: URL, targetLocale: Locale): string {
  const pathname = url.pathname;
  if (targetLocale === 'zh-TW') {
    // Remove /en prefix
    return pathname.replace(/^\/en/, '') || '/';
  } else {
    // Add /en prefix
    if (pathname.startsWith('/en')) return pathname;
    return '/en' + (pathname === '/' ? '' : pathname);
  }
}
