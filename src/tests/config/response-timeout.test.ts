import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RESPONSE_TIMEOUT_MS,
  MAX_RESPONSE_TIMEOUT_MS,
  MIN_RESPONSE_TIMEOUT_MS,
  RESPONSE_TIMEOUT_PRESETS_MS,
  RESPONSE_TIMEOUT_UNLIMITED,
  isUnlimitedResponseTimeout,
  normalizeResponseTimeoutMs,
} from '../../shared/response-timeout';

describe('normalizeResponseTimeoutMs', () => {
  it('falls back to the default for missing or non-numeric values', () => {
    expect(normalizeResponseTimeoutMs(undefined)).toBe(DEFAULT_RESPONSE_TIMEOUT_MS);
    expect(normalizeResponseTimeoutMs(null)).toBe(DEFAULT_RESPONSE_TIMEOUT_MS);
    expect(normalizeResponseTimeoutMs('600000')).toBe(DEFAULT_RESPONSE_TIMEOUT_MS);
    expect(normalizeResponseTimeoutMs(Number.NaN)).toBe(DEFAULT_RESPONSE_TIMEOUT_MS);
    expect(normalizeResponseTimeoutMs(Number.POSITIVE_INFINITY)).toBe(DEFAULT_RESPONSE_TIMEOUT_MS);
  });

  it('uses the caller-supplied fallback when given', () => {
    expect(normalizeResponseTimeoutMs(undefined, 90_000)).toBe(90_000);
  });

  it('keeps the default at the historical 5 minutes', () => {
    expect(DEFAULT_RESPONSE_TIMEOUT_MS).toBe(5 * 60 * 1000);
  });

  it('treats zero and negative values as unlimited', () => {
    expect(normalizeResponseTimeoutMs(0)).toBe(RESPONSE_TIMEOUT_UNLIMITED);
    expect(normalizeResponseTimeoutMs(-1)).toBe(RESPONSE_TIMEOUT_UNLIMITED);
    expect(isUnlimitedResponseTimeout(0)).toBe(true);
    expect(isUnlimitedResponseTimeout(DEFAULT_RESPONSE_TIMEOUT_MS)).toBe(false);
  });

  it('passes through values inside the supported range', () => {
    expect(normalizeResponseTimeoutMs(600_000)).toBe(600_000);
    expect(normalizeResponseTimeoutMs(MIN_RESPONSE_TIMEOUT_MS)).toBe(MIN_RESPONSE_TIMEOUT_MS);
    expect(normalizeResponseTimeoutMs(MAX_RESPONSE_TIMEOUT_MS)).toBe(MAX_RESPONSE_TIMEOUT_MS);
  });

  it('clamps values outside the supported range', () => {
    expect(normalizeResponseTimeoutMs(1)).toBe(MIN_RESPONSE_TIMEOUT_MS);
    // Never hand setTimeout a delay it would overflow and fire immediately.
    expect(normalizeResponseTimeoutMs(90 * 24 * 60 * 60 * 1000)).toBe(MAX_RESPONSE_TIMEOUT_MS);
    expect(MAX_RESPONSE_TIMEOUT_MS).toBeLessThan(2 ** 31 - 1);
  });

  it('rounds fractional values', () => {
    expect(normalizeResponseTimeoutMs(600_000.4)).toBe(600_000);
  });

  it('offers presets that all survive normalization', () => {
    expect(RESPONSE_TIMEOUT_PRESETS_MS).toContain(DEFAULT_RESPONSE_TIMEOUT_MS);
    expect(RESPONSE_TIMEOUT_PRESETS_MS).toContain(RESPONSE_TIMEOUT_UNLIMITED);
    for (const preset of RESPONSE_TIMEOUT_PRESETS_MS) {
      expect(normalizeResponseTimeoutMs(preset)).toBe(preset);
    }
  });
});
