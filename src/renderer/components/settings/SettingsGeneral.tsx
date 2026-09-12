import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import {
  DEFAULT_RESPONSE_TIMEOUT_MS,
  MAX_RESPONSE_TIMEOUT_MS,
  MIN_RESPONSE_TIMEOUT_MS,
  RESPONSE_TIMEOUT_PRESETS_MS,
  RESPONSE_TIMEOUT_UNLIMITED,
  normalizeResponseTimeoutMs,
} from '../../../shared/response-timeout';

const CUSTOM_TIMEOUT_OPTION = 'custom';

function toMinutes(ms: number): number {
  return Math.max(1, Math.round(ms / 60000));
}

/** Minutes to prefill the custom field with; "unlimited" has no minutes of its own. */
function customMinutesFor(ms: number): string {
  return String(toMinutes(ms || DEFAULT_RESPONSE_TIMEOUT_MS));
}

export function SettingsGeneral() {
  const { i18n, t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const appConfig = useAppStore((s) => s.appConfig);
  const setAppConfig = useAppStore((s) => s.setAppConfig);
  const currentLang = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const [appVer, setAppVer] = useState('');
  useEffect(() => {
    try {
      const v = window.electronAPI?.getVersion?.();
      if (v instanceof Promise) v.then(setAppVer);
      else if (v) setAppVer(v);
    } catch {
      /* ignore */
    }
  }, []);

  const responseTimeoutMs = normalizeResponseTimeoutMs(
    appConfig?.responseTimeoutMs,
    DEFAULT_RESPONSE_TIMEOUT_MS
  );
  const isPresetTimeout = RESPONSE_TIMEOUT_PRESETS_MS.includes(responseTimeoutMs);
  // Sticky even when the saved value happens to match a preset, so picking
  // "Custom" keeps the minutes field open.
  const [customMode, setCustomMode] = useState(!isPresetTimeout);
  // Draft of the custom minutes field, so typing "1" on the way to "15" does
  // not immediately persist a 1-minute timeout.
  const [customMinutes, setCustomMinutes] = useState(() => customMinutesFor(responseTimeoutMs));
  const showCustomTimeout = customMode || !isPresetTimeout;

  useEffect(() => {
    if (!isPresetTimeout) {
      setCustomMode(true);
    }
    setCustomMinutes(customMinutesFor(responseTimeoutMs));
  }, [isPresetTimeout, responseTimeoutMs]);

  const saveResponseTimeout = async (nextMs: number) => {
    const normalized = normalizeResponseTimeoutMs(nextMs, responseTimeoutMs);
    if (normalized === responseTimeoutMs) return;
    const result = await window.electronAPI.config.save({ responseTimeoutMs: normalized });
    if (result?.config) {
      setAppConfig(result.config);
    }
  };

  const handleTimeoutSelect = (value: string) => {
    if (value === CUSTOM_TIMEOUT_OPTION) {
      const prefilled = customMinutesFor(responseTimeoutMs);
      setCustomMinutes(prefilled);
      setCustomMode(true);
      // Commit right away so the effective setting matches what the dropdown
      // now says (relevant when switching away from "Unlimited").
      void saveResponseTimeout(Number(prefilled) * 60000);
      return;
    }
    setCustomMode(false);
    void saveResponseTimeout(Number(value));
  };

  const commitCustomMinutes = () => {
    const minutes = Number(customMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setCustomMinutes(customMinutesFor(responseTimeoutMs));
      return;
    }
    void saveResponseTimeout(minutes * 60000);
  };

  const formatTimeoutOption = (ms: number) => {
    if (ms === RESPONSE_TIMEOUT_UNLIMITED) return t('general.responseTimeoutUnlimited');
    return t('general.responseTimeoutMinutes', { count: toMinutes(ms) });
  };

  const languages = [
    { code: 'en', nativeName: 'English' },
    { code: 'zh', nativeName: '中文' },
  ];

  const themeOptions = [
    { value: 'light' as const, label: t('general.themeLight') },
    { value: 'dark' as const, label: t('general.themeDark') },
    { value: 'system' as const, label: t('general.themeSystem', 'System') },
  ];

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">{t('general.appearance')}</h4>
        <div className="flex gap-2">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSettings({ theme: opt.value })}
              className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                settings.theme === opt.value
                  ? 'border-accent bg-accent/5 text-text-primary'
                  : 'border-border bg-surface hover:border-accent/50 text-text-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">{t('general.language')}</h4>
        <div className="flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                currentLang === lang.code
                  ? 'border-accent bg-accent/5 text-text-primary'
                  : 'border-border bg-surface hover:border-accent/50 text-text-secondary'
              }`}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      </div>

      {/* Response timeout */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-primary">{t('general.responseTimeout')}</h4>
        <select
          id="response-timeout-select"
          value={showCustomTimeout ? CUSTOM_TIMEOUT_OPTION : String(responseTimeoutMs)}
          onChange={(e) => handleTimeoutSelect(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all cursor-pointer"
        >
          {RESPONSE_TIMEOUT_PRESETS_MS.map((ms) => (
            <option key={ms} value={String(ms)}>
              {formatTimeoutOption(ms)}
            </option>
          ))}
          <option value={CUSTOM_TIMEOUT_OPTION}>{t('general.responseTimeoutCustom')}</option>
        </select>
        {showCustomTimeout && (
          <div className="flex items-center gap-2">
            <input
              id="response-timeout-minutes"
              type="number"
              min={Math.ceil(MIN_RESPONSE_TIMEOUT_MS / 60000)}
              max={Math.floor(MAX_RESPONSE_TIMEOUT_MS / 60000)}
              step={1}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onBlur={commitCustomMinutes}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCustomMinutes();
              }}
              className="w-28 px-3 py-2 rounded-lg bg-background border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
            <span className="text-xs text-text-muted">{t('general.responseTimeoutUnit')}</span>
          </div>
        )}
        <p className="text-xs text-text-muted">{t('general.responseTimeoutHint')}</p>
        {responseTimeoutMs === RESPONSE_TIMEOUT_UNLIMITED && (
          <p className="text-xs text-amber-500 dark:text-amber-400">
            {t('general.responseTimeoutUnlimitedHint')}
          </p>
        )}
      </div>

      {/* About */}
      {appVer && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-text-muted">Open Cowork v{appVer}</p>
        </div>
      )}
    </div>
  );
}
