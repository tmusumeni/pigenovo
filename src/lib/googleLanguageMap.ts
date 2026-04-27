/**
 * Google Translate Language Code Mapping
 * Maps internal language codes to Google Translate codes
 */

import { Language } from './i18n';

/**
 * Mapping of our internal language codes to Google Translate language codes
 */
export const languageCodeMap: Record<Language | string, string> = {
  // Current languages (PiGenovo)
  en: 'en',                    // English
  fr: 'fr',                    // French
  kin: 'rw',                   // Kinyarwanda (Rwanda)
  sw: 'sw',                    // Swahili
  
  // Additional supported languages (add with Google Translate)
  es: 'es',                    // Spanish
  pt: 'pt',                    // Portuguese
  de: 'de',                    // German
  it: 'it',                    // Italian
  ja: 'ja',                    // Japanese
  zh: 'zh-CN',                 // Chinese (Simplified)
  'zh-TW': 'zh-TW',            // Chinese (Traditional)
  ko: 'ko',                    // Korean
  ru: 'ru',                    // Russian
  ar: 'ar',                    // Arabic
  hi: 'hi',                    // Hindi
  nl: 'nl',                    // Dutch
  pl: 'pl',                    // Polish
  tr: 'tr',                    // Turkish
  vi: 'vi',                    // Vietnamese
  th: 'th',                    // Thai
  id: 'id',                    // Indonesian
  uk: 'uk',                    // Ukrainian
  bg: 'bg',                    // Bulgarian
  cs: 'cs',                    // Czech
  da: 'da',                    // Danish
  fi: 'fi',                    // Finnish
  el: 'el',                    // Greek
  he: 'he',                    // Hebrew
  hu: 'hu',                    // Hungarian
  nb: 'nb',                    // Norwegian
  ro: 'ro',                    // Romanian
  sk: 'sk',                    // Slovak
  sv: 'sv',                    // Swedish
};

/**
 * Get Google Translate language code from internal code
 */
export function getGoogleLanguageCode(language: Language | string): string {
  return languageCodeMap[language] || 'en';
}

/**
 * Get internal language code from Google Translate code
 */
export function getInternalLanguageCode(googleCode: string): Language | string {
  const reverseMap = Object.entries(languageCodeMap).reduce(
    (acc, [key, value]) => {
      acc[value] = key;
      return acc;
    },
    {} as Record<string, string>
  );
  return reverseMap[googleCode] || googleCode;
}

/**
 * Get language name (display name) from code
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    fr: 'Français',
    kin: 'Kinyarwanda',
    sw: 'Kiswahili',
    es: 'Español',
    pt: 'Português',
    de: 'Deutsch',
    it: 'Italiano',
    ja: '日本語',
    'zh-CN': '中文 (简体)',
    'zh-TW': '中文 (繁體)',
    ko: '한국어',
    ru: 'Русский',
    ar: 'العربية',
    hi: 'हिन्दी',
    nl: 'Nederlands',
    pl: 'Polski',
    tr: 'Türkçe',
    vi: 'Tiếng Việt',
    th: 'ไทย',
    id: 'Bahasa Indonesia',
    uk: 'Українська',
    bg: 'Български',
    cs: 'Čeština',
    da: 'Dansk',
    fi: 'Suomi',
    el: 'Ελληνικά',
    he: 'עברית',
    hu: 'Magyar',
    nb: 'Norsk',
    ro: 'Română',
    sk: 'Slovenčina',
    sv: 'Svenska',
  };
  return names[code] || code;
}

// Supported languages list for dropdown
export const supportedLanguages = [
  // Core languages
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'kin', name: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'sw', name: 'Kiswahili', flag: '🌍' },
  
  // Additional languages
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];
