/**
 * Hayagriva Bibliography Format
 * (Community) Schema for Hayagriva YAML bibliography files.
 * @see https://github.com/typst/hayagriva
 * @see https://github.com/typst/hayagriva/blob/main/docs/file-format.md
 *
 * This is the single source of truth for both the compile-time types AND the
 * runtime validation used by this app, hand-written to mirror
 * `json-schemas/docs/hayagriva.yaml` (published separately as a standalone
 * JSON Schema for external tooling, e.g. YAML language server `$schema`
 * hints). When the schema changes, this file should be updated to match.
 *
 * Every exported `*Schema` constant is a Zod schema that both validates data
 * at runtime (`schema.safeParse(...)`) and is the source for the matching
 * exported TypeScript type (`z.infer<typeof schema>`), so types and
 * validation can never drift out of sync with each other.
 */

import { z } from 'zod';

/**
 * A calendar date in ISO 8601 format (YYYY-MM-DD, YYYY-MM, or YYYY).
 * Can include a sign prefix for years before 0000 (e.g., -0001 for 2 B.C.E.).
 * Year 1 B.C.E. is represented as 0000.
 */
export const DATE_REGEX =
  /^[+-~]?\d{4,}(-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;

/**
 * A timestamp within media content: [DD:][HH:]MM:SS[,msms] (MM:SS required).
 */
export const TIMESTAMP_REGEX =
  /^(\d+:[0-5]\d|\d{1,2}:[0-5]\d:[0-5]\d|\d{1,2}:\d{1,2}:[0-5]\d:[0-5]\d)(,\d+)?$/;

/**
 * A range of two timestamps separated by a hyphen: start-end.
 */
export const TIMESTAMP_RANGE_REGEX =
  /^(\d+:[0-5]\d|\d{1,2}:[0-5]\d:[0-5]\d|\d{1,2}:\d{1,2}:[0-5]\d:[0-5]\d)(,\d+)?-(\d+:[0-5]\d|\d{1,2}:[0-5]\d:[0-5]\d|\d{1,2}:\d{1,2}:[0-5]\d:[0-5]\d)(,\d+)?$/;

/**
 * A Unicode Language Identifier (BCP 47), e.g. "en", "en-US", "zh-Hans-CN".
 * Format: language[-script][-region]
 */
export const LANGUAGE_REGEX = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/;

/**
 * A string that may run through a text case transformer.
 * Can be a simple string or an object allowing verbatim/short overrides.
 */
export const formattableStringSchema = z.union([
  z.string().min(1),
  z.strictObject({
    /** The main string value. */
    value: z.string().min(1),
    /** If true, disables text case transformations. Preserves casing as it appears in source. */
    verbatim: z.boolean().optional(),
    /** A short form that a citation style can choose to render over the longer form. */
    short: z.string().min(1).optional()
  })
]);
export type FormattableString = z.infer<typeof formattableStringSchema>;

/**
 * A numeric variable: one or more numbers delimited by commas, ampersands, or hyphens.
 * Can express single numbers or ranges.
 */
export const numericOrStringSchema = z.union([z.number(), z.string().min(1)]);
export type NumericOrString = z.infer<typeof numericOrStringSchema>;

/**
 * A calendar date in ISO 8601 format (YYYY-MM-DD, YYYY-MM, or YYYY) or an integer year.
 */
export const hayagrivaDateSchema = z.union([
  z.number().int(),
  z.string().regex(DATE_REGEX)
]);
export type HayagrivaDate = z.infer<typeof hayagrivaDateSchema>;

/**
 * A person with a name and optionally given name, prefix, suffix, and alias.
 * String format: "Last, First" or "Prefix Last, First, Suffix"
 */
export const personSchema = z.union([
  z.string().min(1),
  z.strictObject({
    /** The family/last name of the person (required). */
    name: z.string().min(1),
    /** The given/first name of the person. */
    'given-name': z.string().min(1).optional(),
    /** The prefix of the person's name (e.g., "von", "van der"). */
    prefix: z.string().min(1).optional(),
    /** The suffix of the person's name (e.g., "Jr.", "III"). */
    suffix: z.string().min(1).optional(),
    /** An alternative name or pseudonym for the person. */
    alias: z.string().min(1).optional()
  })
]);
export type Person = z.infer<typeof personSchema>;

/**
 * A single person, or an array of persons.
 * Reused by `author`, `editor`, and `AffiliatedRole.names`.
 */
export const personOrListSchema = z.union([
  personSchema,
  z.array(personSchema).min(1)
]);
export type PersonOrList = z.infer<typeof personOrListSchema>;

/**
 * Publisher information - can be a simple string or an object with name and location.
 */
export const publisherSchema = z.union([
  z.string().min(1),
  z.strictObject({
    /** The name of the publisher. */
    name: z.string().min(1),
    /** The location of the publisher. */
    location: z.string().min(1).optional()
  })
]);
export type Publisher = z.infer<typeof publisherSchema>;

function capitalizeFirst<T extends string>(value: T): Capitalize<T> {
  return (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<T>;
}

/**
 * The canonical, lowercase form of every entry type recognized by Hayagriva.
 * This is the single source of truth for entry type names - other modules
 * (e.g. the entry type formatter/selector) should import `ENTRY_TYPE_NAMES`
 * rather than declaring their own list.
 */
export const ENTRY_TYPE_NAMES = [
  'article',
  'chapter',
  'entry',
  'anthos',
  'report',
  'thesis',
  'web',
  'scene',
  'artwork',
  'patent',
  'case',
  'newspaper',
  'legislation',
  'manuscript',
  'original',
  'post',
  'misc',
  'performance',
  'periodical',
  'proceedings',
  'book',
  'blog',
  'reference',
  'conference',
  'anthology',
  'repository',
  'thread',
  'video',
  'audio',
  'exhibition'
] as const;
export type EntryTypeName = (typeof ENTRY_TYPE_NAMES)[number];

/**
 * The media type of the entry.
 *
 * Typst is case-insensitive for the *first* letter of the type only (the
 * rest of the word must be lowercase), so both `'book'` and `'Book'` are
 * valid, but `'BOOK'` or `'boOk'` are not.
 */
export type EntryType = EntryTypeName | Capitalize<EntryTypeName>;

const ENTRY_TYPE_VALUES = [
  ...ENTRY_TYPE_NAMES,
  ...ENTRY_TYPE_NAMES.map(capitalizeFirst)
] as [EntryType, ...EntryType[]];

export const entryTypeSchema = z.enum(ENTRY_TYPE_VALUES, {
  error: 'Must be a valid Hayagriva entry type (e.g. "book", "article", "web")'
});

/**
 * The role of an affiliated person.
 * Unlike entry types, roles are case-sensitive.
 */
export const ROLE_TYPES = [
  'translator',
  'afterword',
  'foreword',
  'introduction',
  'annotator',
  'commentator',
  'holder',
  'compiler',
  'founder',
  'collaborator',
  'organizer',
  'cast-member',
  'composer',
  'producer',
  'executive-producer',
  'writer',
  'cinematography',
  'director',
  'illustrator',
  'narrator'
] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export const roleTypeSchema = z.enum(ROLE_TYPES, {
  error: 'Must be a valid affiliated role (case-sensitive)'
});

/**
 * List of people involved with the entry in specific roles (not author/editor).
 */
export const affiliatedRoleSchema = z.strictObject({
  role: roleTypeSchema,
  /** The name(s) of the person or people involved in the role. */
  names: personOrListSchema
});
export type AffiliatedRole = z.infer<typeof affiliatedRoleSchema>;

/**
 * Any serial number including article numbers.
 * Can be a simple string/number or an object with well-known schemes.
 */
export const serialNumberSchema = z.union([
  z.string().min(1),
  z.number(),
  z
    .object({
      doi: z.string().min(1).optional(),
      isbn: z.string().min(1).optional(),
      issn: z.string().min(1).optional(),
      pmid: z.string().min(1).optional(),
      pmcid: z.string().min(1).optional(),
      arxiv: z.string().min(1).optional(),
      /** Generic serial number. */
      serial: z.string().min(1).optional()
    })
    .catchall(z.string().min(1))
    .refine((value) => Object.keys(value).length > 0, {
      error: 'At least one serial number field is required'
    })
]);
export type SerialNumber = z.infer<typeof serialNumberSchema>;

/**
 * The canonical public URL of an entry, optionally with an access date.
 */
export const urlValueSchema = z.union([
  z.string().min(1),
  z.strictObject({
    value: z.string().min(1),
    date: hayagrivaDateSchema.optional()
  })
]);
export type UrlValue = z.infer<typeof urlValueSchema>;

/**
 * A Unicode Language Identifier (BCP 47), e.g. "en", "en-US", "zh-Hans-CN".
 */
export const languageSchema = z.string().regex(LANGUAGE_REGEX);
export type Language = z.infer<typeof languageSchema>;

/**
 * A single bibliography entry with fields describing a work.
 * Used for both top-level entries (via `topLevelEntrySchema`) and nested
 * parents. `parent` is recursive: an entry can itself have a parent (or list
 * of parents), which is why `parent` is defined as a getter (lazy
 * evaluation) - this lets Zod (and TypeScript) resolve the self-reference.
 */
export const bibliographyEntrySchema = z.strictObject({
  /**
   * The media type of the entry. Determines the structure of references.
   * - REQUIRED at the top level (see `topLevelEntrySchema`).
   * - OPTIONAL for parent/nested entries.
   * Defaults to 'misc' if not specified.
   */
  type: entryTypeSchema.optional(),
  /** The title of this entry. */
  title: formattableStringSchema.optional(),
  /** The person or people primarily responsible for the creation of this entry. */
  author: personOrListSchema.optional(),
  /** The date of publication or creation of this entry. */
  date: hayagrivaDateSchema.optional(),
  /**
   * Entry in which the current entry was published, or to which it is
   * strongly associated. Supports recursive nesting and a single object or
   * array of objects. Entries here do NOT require a 'type' field.
   */
  get parent() {
    return z
      .union([bibliographyEntrySchema, z.array(bibliographyEntrySchema).min(1)])
      .optional();
  },
  /** The abstract or summary of the entry. */
  abstract: formattableStringSchema.optional(),
  /**
   * The type, class, or subtype of the item (e.g. "Doctoral dissertation").
   * Do not use for topical descriptions (e.g. "adventure").
   */
  genre: formattableStringSchema.optional(),
  /** The person or people responsible for selecting and revising the content of the entry. */
  editor: personOrListSchema.optional(),
  /** People involved with the entry that do not fit `author` or `editor` roles. */
  affiliated: z.array(affiliatedRoleSchema).min(1).optional(),
  /** The number of the item in a library, institution, or collection. Use with `archive`. */
  'call-number': formattableStringSchema.optional(),
  /** The publisher of the item. Can include name and location. */
  publisher: publisherSchema.optional(),
  /**
   * The location at which the entry is physically located or took place.
   * For the location where an item was published, use `publisher` instead.
   */
  location: formattableStringSchema.optional(),
  /** The organization at/for which the entry was produced. */
  organization: formattableStringSchema.optional(),
  /**
   * For an entry whose parent has multiple issues, this identifies which
   * specific issue the entry belongs to. Also used for TV episode numbers.
   */
  issue: numericOrStringSchema.optional(),
  /** For an entry whose parent has multiple volumes, parts, seasons, etc. */
  volume: numericOrStringSchema.optional(),
  /** The total number of volumes, parts, seasons, etc., in the series. Must be a positive integer. */
  'volume-total': z.number().int().positive().optional(),
  /** The number of the chapter in the referenced work where this item can be found. */
  chapter: numericOrStringSchema.optional(),
  /** The published version of the entry (e.g., "second", "2", "expanded"). */
  edition: numericOrStringSchema.optional(),
  /** The range of pages within the parent that this entry occupies. */
  'page-range': numericOrStringSchema.optional(),
  /** The total number of pages in the entry. Must be a positive integer. */
  'page-total': z.number().int().positive().optional(),
  /** The time range within the parent at which this entry starts and ends. Format: start-end. */
  'time-range': z.string().regex(TIMESTAMP_RANGE_REGEX).optional(),
  /** The total runtime of the entry. Format: [DD:][HH:]MM:SS[,msms]. */
  runtime: z.string().regex(TIMESTAMP_REGEX).optional(),
  /** The canonical public URL of the entry, which may include an access date. */
  url: urlValueSchema.optional(),
  /** Any serial number, including article numbers, associated with the entry. */
  'serial-number': serialNumberSchema.optional(),
  /** The language of the entry as a Unicode Language Identifier (BCP 47). */
  language: languageSchema.optional(),
  /** The name of the institution/collection where the entry is kept. */
  archive: formattableStringSchema.optional(),
  /** The location of the institution/collection where the entry is kept. */
  'archive-location': formattableStringSchema.optional(),
  /** A short markup, decoration, or annotation to the entry. */
  note: formattableStringSchema.optional()
});
export type BibliographyEntry = z.infer<typeof bibliographyEntrySchema>;

/**
 * Same shape as `bibliographyEntrySchema`, but `type` is required - used for
 * entries found at the top level of a bibliography.
 */
export const topLevelEntrySchema = bibliographyEntrySchema.extend({
  type: entryTypeSchema
});
export type TopLevelEntry = z.infer<typeof topLevelEntrySchema>;

/**
 * Top level is a mapping of entry keys (citation keys) to entries.
 * Keys should not be empty.
 */
export const hayagrivaBibliographySchema = z.record(
  z.string().min(1),
  topLevelEntrySchema
);
export type HayagrivaBibliography = z.infer<typeof hayagrivaBibliographySchema>;

/**
 * Alias for HayagrivaBibliography.
 * This is the commonly used type name throughout the codebase.
 */
export type Hayagriva = HayagrivaBibliography;

/**
 * Type aliases for common usage patterns.
 */

/** Alias for EntryType. */
export type Type = EntryType;

/** Alias for author/editor field type. */
export type Author = PersonOrList;

/** Alias for affiliated people (array of roles). */
export type AffiliatedPeople = AffiliatedRole[];

/** Alias for URL field type. */
export type URL = UrlValue;
