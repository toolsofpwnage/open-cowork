import type { TFunction } from 'i18next';
import type { ProviderPreset } from '../types';

/**
 * Provider presets carry English text plus an optional translation key, because
 * the preset list is shared with the main process and cannot call `t()` itself.
 * Prefer the translation, fall back to the literal the preset ships with.
 */
export function providerKeyHint(preset: ProviderPreset | undefined, t: TFunction): string {
  if (!preset?.keyHint) {
    return '';
  }
  return preset.keyHintKey
    ? t(preset.keyHintKey, { defaultValue: preset.keyHint })
    : preset.keyHint;
}

export function providerKeyPlaceholder(
  preset: ProviderPreset | undefined,
  t: TFunction,
  fallback: string
): string {
  if (!preset?.keyPlaceholder) {
    return fallback;
  }
  return preset.keyPlaceholderKey
    ? t(preset.keyPlaceholderKey, { defaultValue: preset.keyPlaceholder })
    : preset.keyPlaceholder;
}
