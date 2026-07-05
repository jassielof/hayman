import type { FormattableString } from '$lib/types/hayagriva';

/**
 * Formats a formattable string as plain display text, preferring the short
 * form when one is provided.
 */
export function formatFormattableString(
  input: FormattableString | undefined | null
): string {
  if (!input) return '';
  if (typeof input === 'string') return input;

  return input.short || input.value || '';
}
