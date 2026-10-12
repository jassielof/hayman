import { describe, expect, it } from 'vitest';
import { dateFormatter, formatEntryDateShort } from './date-formatter';

describe('readable Hayagriva dates', () => {
  it.each([
    ['en-US', 'July 17, 2019', 'July 2019'],
    ['es-ES', '17 de julio de 2019', 'julio de 2019'],
    ['fr-FR', '17 juillet 2019', 'juillet 2019'],
    ['ja-JP', '2019年7月17日', '2019年7月'],
  ])('uses %s without inventing missing precision', (locale, full, month) => {
    expect(dateFormatter('2019-07-17', locale)).toBe(full);
    expect(dateFormatter('2019-07', locale)).toBe(month);
    expect(dateFormatter('2019', locale)).toBe('2019');
    expect(dateFormatter(2019, locale)).toBe('2019');
  });

  it('uses the runtime locale by default', () => {
    expect(dateFormatter('2019-07-17')).toBe(
      new Intl.DateTimeFormat(undefined, {
        calendar: 'gregory',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date('2019-07-17T00:00:00Z')),
    );
  });

  it('preserves Gregorian years even when the locale defaults to another calendar', () => {
    expect(dateFormatter('2019-07', 'th-TH')).toContain('2019');
  });

  it('does not roll invalid calendar dates forward', () => {
    for (const date of ['2023-02-29', '2019-02-31', '2019-04-31', 'invalid']) {
      expect(dateFormatter(date, 'en-US')).toBe(date);
    }
    expect(dateFormatter('2024-02-29', 'en-US')).toBe('February 29, 2024');
  });

  it('preserves unusual years rather than inventing an era or century', () => {
    for (const date of [
      0,
      -1,
      '0000-01-01',
      '-0001-07',
      '+12000-07',
      '~2019',
    ]) {
      expect(dateFormatter(date, 'en-US')).toBe(String(date));
    }
    expect(dateFormatter('0099-01-01', 'en-US')).toBe('January 1, 99');
  });

  it('keeps source keys independent of display locale and retains year zero', () => {
    expect(formatEntryDateShort('2019-07-17')).toBe('2019-07-17');
    expect(formatEntryDateShort(0)).toBe('0');
    expect(formatEntryDateShort(undefined)).toBe('');
    expect(formatEntryDateShort(null)).toBe('');
  });
});
