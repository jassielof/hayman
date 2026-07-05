import { formatAuthor } from '$lib/formatters/author';
import { formatEntryDateShort } from '$lib/formatters/date-formatter';
import { formatFormattableString } from '$lib/formatters/formattable-string';
import type { TopLevelEntry } from '$lib/types/hayagriva';

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 40);
}

function typePrefix(type: string | undefined): string {
  const normalized = (type ?? 'misc').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function yearFromDate(date: TopLevelEntry['date']): string {
  if (!date) return '';
  const short = formatEntryDateShort(date);
  const match = short.match(/\d{4}/);
  return match?.[0] ?? '';
}

/**
 * Generates a Hayagriva entry ID using `{Type}{Author}{Year}{Title}` with README fallbacks.
 */
export function generateEntryId(entry: TopLevelEntry): string {
  const type = typePrefix(entry.type);
  const authorRaw = entry.author ? formatAuthor(entry.author) : '';
  const author = slugify(authorRaw) || 'Unknown';
  const year = yearFromDate(entry.date) || 'nd';
  const titleRaw = formatFormattableString(entry.title);
  const title = slugify(titleRaw) || 'Untitled';

  let id = `${type}${author}${year}${title}`;
  if (!id || id.length < 3) {
    id = `Entry${Date.now()}`;
  }
  return id;
}
