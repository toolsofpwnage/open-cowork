/**
 * @module main/i18n/main-i18n
 *
 * Minimal translator for user-facing strings produced in the main process
 * (agent errors, tool failures, startup dialogs).
 *
 * The renderer owns the language (i18next + its language detector) and pushes
 * the active one over IPC, because the main process has no i18next instance and
 * strings such as thrown `Error` messages cannot carry a key to the UI. Until
 * the renderer reports in — or for a window that never opens, like a startup
 * failure dialog — the OS locale decides.
 *
 * Translations live in the same locale files the renderer uses, so there is one
 * catalog per language rather than a separate main-process copy.
 */
import enTranslations from '../../renderer/i18n/locales/en.json';
import zhTranslations from '../../renderer/i18n/locales/zh.json';

export type MainLanguage = 'en' | 'zh';

export const DEFAULT_MAIN_LANGUAGE: MainLanguage = 'en';

const CATALOGS: Record<MainLanguage, unknown> = {
  en: enTranslations,
  zh: zhTranslations,
};

let currentLanguage: MainLanguage = DEFAULT_MAIN_LANGUAGE;

/**
 * Map anything the renderer or Electron reports ('zh', 'zh-CN', 'en-US', ...)
 * onto a supported language. Unknown locales fall back to English.
 */
export function resolveMainLanguage(raw: unknown): MainLanguage {
  if (typeof raw !== 'string') {
    return DEFAULT_MAIN_LANGUAGE;
  }
  return raw.toLowerCase().startsWith('zh') ? 'zh' : DEFAULT_MAIN_LANGUAGE;
}

export function setMainLanguage(raw: unknown): MainLanguage {
  currentLanguage = resolveMainLanguage(raw);
  return currentLanguage;
}

export function getMainLanguage(): MainLanguage {
  return currentLanguage;
}

function lookup(catalog: unknown, key: string): string | undefined {
  let node: unknown = catalog;
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/**
 * Translate `key` into the active language, falling back to English and then to
 * the key itself, so a missing translation degrades instead of throwing.
 */
export function tMain(
  key: string,
  params?: Record<string, string | number>,
  language: MainLanguage = currentLanguage
): string {
  const template = lookup(CATALOGS[language], key) ?? lookup(CATALOGS.en, key) ?? key;
  return interpolate(template, params);
}
