// middleware/i18n.js — Language detection and translation middleware.
// Owns: locale detection (IP → Accept-Language → cookie → default), locale injection into res.locals.
// Does NOT own: translation file management, route handling.

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Supported locales and their display metadata
const SUPPORTED_LOCALES = {
  en: { name: 'English',    nativeName: 'English',    flag: '🇺🇸', dir: 'ltr' },
  es: { name: 'Spanish',    nativeName: 'Español',    flag: '🇪🇸', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português',  flag: '🇧🇷', dir: 'ltr' },
  fr: { name: 'French',     nativeName: 'Français',   flag: '🇫🇷', dir: 'ltr' },
  de: { name: 'German',     nativeName: 'Deutsch',    flag: '🇩🇪', dir: 'ltr' },
  ja: { name: 'Japanese',   nativeName: '日本語',      flag: '🇯🇵', dir: 'ltr' },
  ko: { name: 'Korean',     nativeName: '한국어',       flag: '🇰🇷', dir: 'ltr' },
  zh: { name: 'Chinese',    nativeName: '中文',         flag: '🇨🇳', dir: 'ltr' },
  ar: { name: 'Arabic',     nativeName: 'العربية',     flag: '🇸🇦', dir: 'rtl' },
  ru: { name: 'Russian',    nativeName: 'Русский',     flag: '🇷🇺', dir: 'ltr' },
};

// Country code → locale mapping (ISO 3166-1 alpha-2 → BCP 47)
const COUNTRY_LOCALE_MAP = {
  // Spanish-speaking countries
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
  // Portuguese
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
  // French
  FR: 'fr', BE: 'fr', CH: 'fr', CA: 'fr', // Note: CA could be en or fr — fr as default
  // German
  DE: 'de', AT: 'de',
  // Japanese
  JP: 'ja',
  // Korean
  KR: 'ko',
  // Chinese
  CN: 'zh', TW: 'zh', HK: 'zh', SG: 'zh',
  // Arabic
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', MA: 'ar', DZ: 'ar',
  JO: 'ar', KW: 'ar', QA: 'ar', BH: 'ar', OM: 'ar', LB: 'ar', LY: 'ar', TN: 'ar',
  // Russian
  RU: 'ru', KZ: 'ru', BY: 'ru', UA: 'ru',
};

// Cache translations in memory on startup
const translations = {};
const LOCALES_DIR = path.join(__dirname, '../locales');

function loadTranslations() {
  for (const locale of Object.keys(SUPPORTED_LOCALES)) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      translations[locale] = JSON.parse(raw);
    } catch {
      // Missing locale file — fall through to English
      translations[locale] = null;
    }
  }
}
loadTranslations();

// Simple deep-merge of two objects (base ← override)
function deepMerge(base, override) {
  if (!override) return base;
  const result = Object.assign({}, base);
  for (const key of Object.keys(override)) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

// Pre-compute merged translation objects at startup — eliminates deepMerge per request
const _mergedCache = {};
function _getMerged(locale) {
  if (_mergedCache[locale]) return _mergedCache[locale];
  const base = translations['en'] || {};
  _mergedCache[locale] = locale === 'en' ? base : deepMerge(base, translations[locale]);
  return _mergedCache[locale];
}
// Pre-warm all supported locales at module load
for (const loc of Object.keys(SUPPORTED_LOCALES)) _getMerged(loc);

// Nested key accessor: t('nav.home') → translations.nav.home
function buildT(locale) {
  const merged = _getMerged(locale);
  return function t(key) {
    const parts = key.split('.');
    let val = merged;
    for (const part of parts) {
      if (val && typeof val === 'object') val = val[part];
      else return key; // fallback to key string
    }
    return typeof val === 'string' ? val : key;
  };
}

// In-memory geo cache: IP → { locale, expires }
const geoCache = new Map();
const GEO_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Fetch country code from ip-api.com (free, no key required, 45 req/min)
function getCountryFromIP(ip) {
  return new Promise((resolve) => {
    // Skip private/loopback IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return resolve(null);
    }

    const cached = geoCache.get(ip);
    if (cached && cached.expires > Date.now()) return resolve(cached.country);

    const url = `http://ip-api.com/json/${ip}?fields=status,countryCode`;
    const proto = url.startsWith('https') ? https : http;

    const req = proto.get(url, { timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success' && json.countryCode) {
            geoCache.set(ip, { country: json.countryCode, expires: Date.now() + GEO_TTL_MS });
            return resolve(json.countryCode);
          }
        } catch { /* ignore parse errors */ }
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// Parse Accept-Language header → best supported locale
function parseAcceptLanguage(header) {
  if (!header) return null;
  const entries = header.split(',')
    .map(entry => {
      const [lang, q] = entry.trim().split(';q=');
      return { lang: lang.trim().toLowerCase(), q: parseFloat(q || '1') };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of entries) {
    const primary = lang.split('-')[0];
    if (SUPPORTED_LOCALES[lang]) return lang;
    if (SUPPORTED_LOCALES[primary]) return primary;
  }
  return null;
}

// Determine locale synchronously first (cookie → Accept-Language → cached geo → 'en').
// Geo lookup fires in background to populate cache for next request — never blocks render.
function detectLocaleFast(req) {
  // 1. Cookie preference (highest priority — user explicitly chose)
  const cookieLang = req.cookies && req.cookies['ys_lang'];
  if (cookieLang && SUPPORTED_LOCALES[cookieLang]) return cookieLang;

  // 2. URL path prefix (/es/, /ja/, etc.)
  if (req._locale && SUPPORTED_LOCALES[req._locale]) return req._locale;

  // 3. Check geo cache synchronously (no await — cache hit or miss)
  const ip = req.headers['x-forwarded-for']
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.socket.remoteAddress;

  const cached = geoCache.get(ip);
  if (cached && cached.expires > Date.now() && cached.country && COUNTRY_LOCALE_MAP[cached.country]) {
    return COUNTRY_LOCALE_MAP[cached.country];
  }

  // 4. Accept-Language header (synchronous, fast)
  const acceptLang = parseAcceptLanguage(req.headers['accept-language']);
  if (acceptLang) return acceptLang;

  // 5. Fire geo lookup in background to populate cache for next request
  if (ip && !cached) {
    getCountryFromIP(ip).catch(() => {}); // fire-and-forget
  }

  return 'en';
}

// Express middleware — fully synchronous, no await, never blocks on external API
function i18nMiddleware(req, res, next) {
  const locale = detectLocaleFast(req);
  const localeInfo = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES['en'];

  res.locals.locale = locale;
  res.locals.localeDir = localeInfo.dir;
  res.locals.t = buildT(locale);
  res.locals.supportedLocales = SUPPORTED_LOCALES;
  res.locals.currentLocaleInfo = localeInfo;

  next();
}

module.exports = {
  i18nMiddleware,
  SUPPORTED_LOCALES,
  COUNTRY_LOCALE_MAP,
  buildT,
  translations,
};
