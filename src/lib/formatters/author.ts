import type { Person, PersonOrList } from '@hayman/hayagriva-schema';

/**
 * Formats a single person as a compact display string (family name only,
 * or the raw string if that's all that's available).
 */
export function formatPerson(person: Person): string {
  return typeof person === 'string' ? person : person.name;
}

/**
 * Formats an author/editor field (string, single person, list of people, or
 * absent) as a compact, semicolon-separated display string.
 */
export function formatAuthor(author: PersonOrList | undefined | null): string {
  if (!author) return '';
  if (Array.isArray(author)) {
    return author.map(formatPerson).join('; ');
  }
  return formatPerson(author);
}
