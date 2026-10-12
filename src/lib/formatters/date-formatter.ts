import { DATE_REGEX, type HayagrivaDate } from '@hayman/hayagriva-schema';

export { DATE_REGEX };

// Matches the year-only variant of DATE_REGEX (allows a sign prefix and 5+
// digit years, unlike the previous exact `\d{4}` check).
const YEAR_ONLY_REGEX = /^[+-~]?\d{4,}$/;

export function dateFormatter(
  date: HayagrivaDate,
  locales?: Intl.LocalesArgument,
) {
  if (typeof date === 'number' || YEAR_ONLY_REGEX.test(date)) return `${date}`;

  // Year and month ("YYYY-MM"). Both parsing and formatting use UTC so a
  // user's timezone cannot shift a calendar date to the previous day/month.
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(date)) {
    const d = calendarDate(date);
    return isNaN(d.getTime())
      ? date
      : new Intl.DateTimeFormat(locales, {
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }).format(d);
  }

  // Full date ("YYYY-MM-DD")
  if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) {
    const d = calendarDate(date);
    return isNaN(d.getTime())
      ? date
      : new Intl.DateTimeFormat(locales, {
          calendar: 'gregory',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        }).format(d);
  }

  // Fallback: return as-is (e.g. signed/BCE years outside typical Date range)
  return `${date}`;
}

// Dates are Gregorian calendar values, not instants. Never allow JS's date
// rollover (February 31 -> March) or its special handling of years 0–99.
function calendarDate(source: string): Date {
  const [year, month, day = 1] = source.split('-').map(Number);
  if (year < 1) return new Date(NaN); // Preserve BCE/year-zero notation verbatim.
  const result = new Date(0);
  result.setUTCFullYear(year, month - 1, day);
  if (
    result.getUTCFullYear() !== year ||
    result.getUTCMonth() !== month - 1 ||
    result.getUTCDate() !== day
  )
    return new Date(NaN);
  return result;
}

/**
 * Stable source representation for sorting, searching and duplicate detection.
 * Display text should use `dateFormatter`; never localize persistence keys.
 */
export function formatEntryDateShort(
  date: HayagrivaDate | undefined | null,
): string {
  if (date === undefined || date === null) return '';
  if (typeof date === 'number') return date.toString();
  return date.split('T')[0];
}
