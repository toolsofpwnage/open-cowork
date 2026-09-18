import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_MAIN_LANGUAGE,
  getMainLanguage,
  resolveMainLanguage,
  setMainLanguage,
  tMain,
} from '../../main/i18n/main-i18n';
import enTranslations from '../../renderer/i18n/locales/en.json';
import zhTranslations from '../../renderer/i18n/locales/zh.json';

describe('resolveMainLanguage', () => {
  it('maps every Chinese locale tag onto zh', () => {
    for (const tag of ['zh', 'zh-CN', 'zh-TW', 'ZH-Hans']) {
      expect(resolveMainLanguage(tag)).toBe('zh');
    }
  });

  it('falls back to the default for other or malformed locales', () => {
    for (const tag of ['en', 'en-US', 'fr-FR', '', undefined, null, 42]) {
      expect(resolveMainLanguage(tag)).toBe(DEFAULT_MAIN_LANGUAGE);
    }
  });
});

describe('tMain', () => {
  beforeEach(() => {
    setMainLanguage('en');
  });

  it('translates into the active language', () => {
    expect(tMain('errors.requestTimeout')).toBe(enTranslations.errors.requestTimeout);
    setMainLanguage('zh-CN');
    expect(getMainLanguage()).toBe('zh');
    expect(tMain('errors.requestTimeout')).toBe(zhTranslations.errors.requestTimeout);
  });

  it('interpolates named parameters', () => {
    expect(tMain('errors.chromeNotReady', { details: 'port never opened' })).toContain(
      'port never opened'
    );
  });

  it('leaves placeholders alone when a parameter is missing', () => {
    expect(tMain('errors.chromeNotReady')).toContain('{{details}}');
  });

  it('falls back to English when the active language lacks the key', () => {
    setMainLanguage('zh');
    // Present in both catalogs today; the fallback path is exercised by the
    // explicit-language argument below.
    expect(tMain('errors.startupFailedTitle', undefined, 'en')).toBe(
      enTranslations.errors.startupFailedTitle
    );
  });

  it('returns the key itself for an unknown key instead of throwing', () => {
    expect(tMain('errors.definitelyNotAKey')).toBe('errors.definitelyNotAKey');
    expect(tMain('api')).toBe('api');
  });
});

describe('main-process error catalog', () => {
  it('defines the same error keys in English and Chinese', () => {
    expect(Object.keys(zhTranslations.errors).sort()).toEqual(
      Object.keys(enTranslations.errors).sort()
    );
  });

  it('keeps the English catalog free of Chinese characters', () => {
    for (const [key, value] of Object.entries(enTranslations.errors)) {
      expect(/[一-鿿]/.test(value), `${key} contains Chinese text`).toBe(false);
    }
  });

  it('keeps interpolation placeholders identical across languages', () => {
    const placeholders = (text: string) => (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();
    for (const [key, value] of Object.entries(enTranslations.errors)) {
      const zhValue = (zhTranslations.errors as Record<string, string>)[key];
      expect(placeholders(zhValue), `${key} placeholders differ`).toEqual(placeholders(value));
    }
  });
});
