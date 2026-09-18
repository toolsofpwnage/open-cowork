/**
 * Shared helpers for the agent response timeout.
 *
 * A prompt is aborted when the model sends no activity (stream deltas, tool
 * events, ...) for this long. Local LLM servers routinely stall much longer
 * than the 5-minute default — loading a large model into memory, or generating
 * slowly on modest hardware — so the wait is user-configurable, and `0` means
 * "never time out".
 */

/** Sentinel value for "no timeout at all". */
export const RESPONSE_TIMEOUT_UNLIMITED = 0;

/** Default inactivity window: matches the historical hard-coded 5 minutes. */
export const DEFAULT_RESPONSE_TIMEOUT_MS = 5 * 60 * 1000;

/** Shortest configurable wait; below this even fast models get cut off. */
export const MIN_RESPONSE_TIMEOUT_MS = 30 * 1000;

/**
 * Longest configurable wait. setTimeout() overflows its 32-bit delay past
 * ~24.8 days and fires immediately, so stay far below that; anything longer
 * should use RESPONSE_TIMEOUT_UNLIMITED instead.
 */
export const MAX_RESPONSE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/** Values offered in Settings, in the order they are shown. */
export const RESPONSE_TIMEOUT_PRESETS_MS: number[] = [
  2 * 60 * 1000,
  DEFAULT_RESPONSE_TIMEOUT_MS,
  10 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  RESPONSE_TIMEOUT_UNLIMITED,
];

/**
 * Coerce a stored/user-supplied value into a usable timeout.
 *
 * Non-numeric or non-finite input falls back to `fallback`; zero or negative
 * means unlimited; everything else is clamped into the supported range.
 */
export function normalizeResponseTimeoutMs(
  raw: unknown,
  fallback: number = DEFAULT_RESPONSE_TIMEOUT_MS
): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  const rounded = Math.round(raw);
  if (rounded <= 0) {
    return RESPONSE_TIMEOUT_UNLIMITED;
  }
  return Math.min(MAX_RESPONSE_TIMEOUT_MS, Math.max(MIN_RESPONSE_TIMEOUT_MS, rounded));
}

export function isUnlimitedResponseTimeout(value: unknown): boolean {
  return normalizeResponseTimeoutMs(value) === RESPONSE_TIMEOUT_UNLIMITED;
}
