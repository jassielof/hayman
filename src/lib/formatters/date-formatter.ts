import { DATE_REGEX, type HayagrivaDate } from '$lib/types/hayagriva';

export { DATE_REGEX };

// Matches the year-only variant of DATE_REGEX (allows a sign prefix and 5+
// digit years, unlike the previous exact `\d{4}` check).
const YEAR_ONLY_REGEX = /^[+-~]?\d{4,}$/;

export function dateFormatter(date: HayagrivaDate) {
  if (typeof date === 'number' || YEAR_ONLY_REGEX.test(date)) return `${date}`;

  // Year and month ("YYYY-MM"). Formatted in UTC to match how the date
  // string was parsed - new Date("2020-12-01") is UTC midnight, and without
  // pinning the formatter to UTC too, users behind UTC (e.g. the Americas)
  // would see it rendered as the previous day/month.
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(date)) {
    const d = new Date(`${date}-01`);
    return isNaN(d.getTime())
      ? date
      : new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'long',
          timeZone: 'UTC'
        }).format(d);
  }

  // Full date ("YYYY-MM-DD")
  if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) {
    const d = new Date(date);
    return isNaN(d.getTime())
      ? date
      : new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        }).format(d);
  }

  // Fallback: return as-is (e.g. signed/BCE years outside typical Date range)
  return `${date}`;
}

/**
 * Formats a date as a compact string for space-constrained UI (list rows),
 * e.g. "2020-12-25" or "2020". Unlike `dateFormatter`, this does not localize.
 */
export function formatEntryDateShort(
  date: HayagrivaDate | undefined | null
): string {
  if (!date) return '';
  if (typeof date === 'number') return date.toString();
  return date.split('T')[0];
}
