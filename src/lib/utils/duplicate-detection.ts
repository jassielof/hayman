import type { Hayagriva, TopLevelEntry } from '@hayman/hayagriva-schema';
import { formatAuthor } from '$lib/formatters/author';
import { formatEntryDateShort } from '$lib/formatters/date-formatter';
import { formatFormattableString } from '$lib/formatters/formattable-string';
import { validateIdentifier } from './identifier-validation';

function normalizedText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function serial(
  entry: TopLevelEntry,
  kind: 'doi' | 'isbn',
): string | undefined {
  const value = entry['serial-number'];
  if (!value || typeof value !== 'object') return undefined;
  const raw = value[kind];
  if (!raw) return undefined;
  const validation = validateIdentifier(kind, String(raw));
  return validation.valid ? validation.normalized.toLowerCase() : undefined;
}

export function duplicateFingerprint(entry: TopLevelEntry): string[] {
  const exact = [serial(entry, 'doi'), serial(entry, 'isbn')]
    .filter(Boolean)
    .map((value) => `identifier:${value}`);
  const title = normalizedText(formatFormattableString(entry.title));
  const author = normalizedText(entry.author ? formatAuthor(entry.author) : '');
  const year = formatEntryDateShort(entry.date).slice(0, 4);
  if (title && (author || year)) exact.push(`work:${title}|${author}|${year}`);
  return exact;
}

export function findDuplicateGroups(entries: Hayagriva): string[][] {
  const fingerprints = new Map<string, Set<string>>();
  for (const [id, entry] of Object.entries(entries)) {
    for (const fingerprint of duplicateFingerprint(entry)) {
      const ids = fingerprints.get(fingerprint) ?? new Set<string>();
      ids.add(id);
      fingerprints.set(fingerprint, ids);
    }
  }

  const groups: Set<string>[] = [];
  for (const ids of fingerprints.values()) {
    if (ids.size < 2) continue;
    const overlapping = groups.filter((group) =>
      [...ids].some((id) => group.has(id)),
    );
    if (overlapping.length === 0) groups.push(new Set(ids));
    else {
      const merged = overlapping[0];
      for (const id of ids) merged.add(id);
      for (const group of overlapping.slice(1)) {
        for (const id of group) merged.add(id);
        groups.splice(groups.indexOf(group), 1);
      }
    }
  }
  return groups.map((group) => [...group].sort());
}
