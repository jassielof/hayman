import type {
  BibliographyEntry,
  EntryTypeName,
} from '@hayman/hayagriva-schema';

export type EntryFieldKey =
  | 'author'
  | 'editor'
  | 'affiliated'
  | 'publisher'
  | 'issue'
  | 'volume'
  | 'edition'
  | 'chapter'
  | 'page-range'
  | 'volume-total'
  | 'page-total'
  | 'time-range'
  | 'runtime'
  | 'url'
  | 'serial-number'
  | 'language'
  | 'abstract'
  | 'genre'
  | 'call-number'
  | 'location'
  | 'organization'
  | 'archive'
  | 'archive-location'
  | 'note';

export const ALL_ENTRY_FIELDS: readonly EntryFieldKey[] = [
  'author',
  'editor',
  'affiliated',
  'publisher',
  'issue',
  'volume',
  'edition',
  'chapter',
  'page-range',
  'volume-total',
  'page-total',
  'time-range',
  'runtime',
  'url',
  'serial-number',
  'language',
  'abstract',
  'genre',
  'call-number',
  'location',
  'organization',
  'archive',
  'archive-location',
  'note',
] as const;

export function formatEntryFieldLabel(field: EntryFieldKey): string {
  return field
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeType(type: string | undefined): EntryTypeName {
  return (type?.toLowerCase() ?? 'misc') as EntryTypeName;
}

/** Fields commonly relevant per entry type (progressive disclosure). */
export const DEFAULT_FIELDS_BY_TYPE: Partial<
  Record<EntryTypeName, EntryFieldKey[]>
> = {
  article: [
    'author',
    'editor',
    'publisher',
    'volume',
    'issue',
    'page-range',
    'serial-number',
    'abstract',
    'url',
    'language',
  ],
  chapter: [
    'author',
    'editor',
    'chapter',
    'page-range',
    'publisher',
    'serial-number',
  ],
  entry: ['author', 'chapter', 'page-range', 'publisher'],
  book: [
    'author',
    'editor',
    'publisher',
    'edition',
    'volume',
    'page-total',
    'serial-number',
    'genre',
  ],
  web: ['author', 'url', 'organization'],
  blog: ['author', 'url', 'organization'],
  post: ['author', 'url', 'organization'],
  thread: ['author', 'url'],
  thesis: ['author', 'organization', 'location', 'genre', 'serial-number'],
  report: ['author', 'organization', 'genre', 'serial-number'],
  conference: [
    'author',
    'editor',
    'publisher',
    'volume',
    'page-range',
    'serial-number',
  ],
  proceedings: ['author', 'editor', 'publisher', 'volume', 'page-range'],
  newspaper: ['author', 'publisher', 'page-range', 'serial-number'],
  periodical: ['author', 'publisher', 'volume', 'issue', 'page-range'],
  audio: ['author', 'runtime', 'time-range', 'url', 'serial-number'],
  video: ['author', 'runtime', 'time-range', 'url', 'serial-number'],
  scene: ['author', 'runtime', 'time-range'],
  performance: ['author', 'runtime', 'location', 'organization'],
  artwork: ['author', 'location', 'archive', 'archive-location', 'call-number'],
  exhibition: ['author', 'location', 'archive', 'organization'],
  manuscript: [
    'author',
    'location',
    'archive',
    'archive-location',
    'call-number',
  ],
  patent: ['author', 'serial-number', 'organization'],
  case: ['author', 'serial-number', 'organization'],
  legislation: ['author', 'serial-number', 'organization'],
  repository: ['author', 'url', 'organization'],
  misc: ['author', 'note'],
};

export const DEFAULT_ENTRY_FIELDS: EntryFieldKey[] = [
  'author',
  'publisher',
  'serial-number',
  'note',
];

export function getSuggestedFields(
  type: string | undefined,
  defaultFields: readonly EntryFieldKey[] = DEFAULT_ENTRY_FIELDS,
  fieldsByType: Partial<
    Record<EntryTypeName, readonly EntryFieldKey[]>
  > = DEFAULT_FIELDS_BY_TYPE,
): Set<EntryFieldKey> {
  const normalized = normalizeType(type);
  const fields = fieldsByType[normalized] ?? defaultFields;
  return new Set(fields);
}

export function hasPopulatedValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export function isFieldVisible(
  field: EntryFieldKey,
  type: string | undefined,
  showAllFields: boolean,
  entry?: BibliographyEntry,
  defaultFields?: readonly EntryFieldKey[],
  fieldsByType?: Partial<Record<EntryTypeName, readonly EntryFieldKey[]>>,
): boolean {
  if (showAllFields) return true;
  if (entry && hasPopulatedValue(entry[field])) return true;
  return getSuggestedFields(type, defaultFields, fieldsByType).has(field);
}

export type FormSectionId =
  | 'core'
  | 'parent'
  | 'people'
  | 'publication'
  | 'media'
  | 'identifiers'
  | 'archive'
  | 'notes'
  | 'additional';

export function isSectionRelevant(
  section: FormSectionId,
  type: string | undefined,
  showAllFields: boolean,
  entry?: BibliographyEntry,
  defaultFields?: readonly EntryFieldKey[],
  fieldsByType?: Partial<Record<EntryTypeName, readonly EntryFieldKey[]>>,
): boolean {
  if (showAllFields || section === 'core' || section === 'parent') return true;

  const sectionFields: Record<FormSectionId, EntryFieldKey[]> = {
    core: [],
    parent: [],
    people: ['author', 'editor', 'affiliated'],
    publication: [
      'publisher',
      'issue',
      'volume',
      'edition',
      'chapter',
      'page-range',
      'volume-total',
      'page-total',
      'genre',
      'organization',
      'location',
    ],
    media: ['runtime', 'time-range', 'url'],
    identifiers: ['serial-number', 'language'],
    archive: ['call-number', 'archive', 'archive-location'],
    notes: ['abstract', 'note'],
    additional: [],
  };

  return sectionFields[section].some((field) =>
    isFieldVisible(field, type, false, entry, defaultFields, fieldsByType),
  );
}
