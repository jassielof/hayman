/**
 * Hayagriva Bibliography Format
 * (Community) Schema for Hayagriva YAML bibliography files.
 * @see https://github.com/typst/hayagriva
 * @see https://github.com/typst/hayagriva/blob/main/docs/file-format.md
 */

/**
 * Top level is a mapping of entry keys (citation keys) to entries.
 * Keys should not be empty.
 */
export interface HayagrivaBibliography {
  [key: string]: TopLevelEntry;
}

/**
 * Alias for HayagrivaBibliography.
 * This is the commonly used type name throughout the codebase.
 */
export type Hayagriva = HayagrivaBibliography;

/**
 * A bibliography entry found at the top level of the file.
 * At the top level, the 'type' field is mandatory.
 */
export interface TopLevelEntry extends BibliographyEntry {
  type: EntryType;
}

/**
 * A single bibliography entry with fields describing a work.
 * Used for both top-level entries (via extension) and nested parents.
 */
export interface BibliographyEntry {
  /**
   * The media type of the entry. Determines the structure of references.
   * - REQUIRED at the top level.
   * - OPTIONAL for parent/nested entries.
   * Defaults to 'misc' if not specified.
   */
  type?: EntryType;

  /**
   * The title of this entry.
   */
  title?: FormattableString;

  /**
   * The person or people primarily responsible for the creation of this entry.
   */
  author?: PersonOrList;

  /**
   * The date of publication or creation of this entry.
   * ISO 8601 format (YYYY-MM-DD, YYYY-MM, or YYYY) or integer year.
   */
  date?: HayagrivaDate;

  /**
   * Entry in which the current entry was published, or to which it is strongly associated.
   * Useful when media is published in multiple ways.
   *
   * Supports:
   * - Recursive nesting (parents can have parents).
   * - Single object or Array of objects.
   * - Entries here do NOT require a 'type' field.
   */
  parent?: BibliographyEntry | BibliographyEntry[];

  /**
   * The abstract or summary of the entry.
   */
  abstract?: FormattableString;

  /**
   * The type, class, or subtype of the item (e.g. "Doctoral dissertation").
   * Do not use for topical descriptions (e.g. "adventure").
   */
  genre?: FormattableString;

  /**
   * The person or people responsible for selecting and revising the content of the entry.
   */
  editor?: PersonOrList;

  /**
   * People involved with the entry that do not fit `author` or `editor` roles.
   */
  affiliated?: AffiliatedRole[];

  /**
   * The number of the item in a library, institution, or collection.
   * Use with the `archive` field.
   */
  'call-number'?: FormattableString;

  /**
   * The publisher of the item. Can include name and location.
   */
  publisher?: Publisher;

  /**
   * The location at which the entry is physically located or took place.
   * For the location where an item was published, use the `publisher` field instead.
   */
  location?: FormattableString;

  /**
   * The organization at/for which the entry was produced.
   */
  organization?: FormattableString;

  /**
   * For an entry whose parent has multiple issues, this field identifies to which specific issue the entry belongs.
   * Also used to indicate the episode number for TV series.
   */
  issue?: NumericOrString;

  /**
   * For an entry whose parent has multiple volumes, parts, seasons, etc.
   */
  volume?: NumericOrString;

  /**
   * The total number of volumes, parts, seasons, etc., in the series that contains this entry.
   * Must be a positive integer.
   */
  'volume-total'?: number;

  /**
   * The number of the chapter in the referenced work where this item can be found.
   */
  chapter?: NumericOrString;

  /**
   * The published version of the entry (e.g., "second", "2", "expanded").
   */
  edition?: NumericOrString;

  /**
   * The range of pages within the parent that this entry occupies.
   */
  'page-range'?: NumericOrString;

  /**
   * The total number of pages in the entry.
   * Must be a positive integer.
   */
  'page-total'?: number;

  /**
   * The time range within the parent at which this entry starts and ends.
   * Format: start-end (e.g., "00:12-00:34")
   */
  'time-range'?: string;

  /**
   * The total runtime of the entry.
   * Format: [DD:][HH:]MM:SS[,msms]
   */
  runtime?: string;

  /**
   * The canonical public URL of the entry, which may include an access date.
   */
  url?: UrlValue;

  /**
   * Any serial number, including article numbers, associated with the entry.
   * Specialized fields: doi, isbn, issn, pmid, pmcid, arxiv.
   */
  'serial-number'?: SerialNumber;

  /**
   * The language of the entry as a Unicode Language Identifier (BCP 47).
   * e.g., "en", "en-US", "zh-Hans".
   */
  language?: Language;

  /**
   * The name of the institution/collection where the entry is kept.
   */
  archive?: FormattableString;

  /**
   * The location of the institution/collection where the entry is kept.
   */
  'archive-location'?: FormattableString;

  /**
   * A short markup, decoration, or annotation to the entry.
   */
  note?: FormattableString;
}

/**
 * A string that may run through a text case transformer.
 * Can be a simple string or an object allowing verbatim/short overrides.
 */
export type FormattableString =
  | string
  | {
      /**
       * The main string value.
       */
      value: string;
      /**
       * If true, disables text case transformations. Preserves casing as it appears in source.
       */
      verbatim?: boolean;
      /**
       * A short form that a citation style can choose to render over the longer form.
       */
      short?: string;
    };

/**
 * A numeric variable: one or more numbers delimited by commas, ampersands, or hyphens.
 * Can express single numbers or ranges.
 */
export type NumericOrString = number | string;

/**
 * A calendar date in ISO 8601 format (YYYY-MM-DD, YYYY-MM, or YYYY) or an integer year.
 * Can include sign prefix for years before 0000 (e.g., -0001 for 2 B.C.E.).
 * Year 1 B.C.E. is represented as 0000.
 */
export type HayagrivaDate = string | number;

/**
 * A person with a name and optionally given name, prefix, suffix, and alias.
 * String format: "Last, First" or "Prefix Last, First, Suffix"
 */
export type Person =
  | string
  | {
      /** The family/last name of the person (required). */
      name: string;
      /** The given/first name of the person. */
      'given-name'?: string;
      /** The prefix of the person's name (e.g., "von", "van der"). */
      prefix?: string;
      /** The suffix of the person's name (e.g., "Jr.", "III"). */
      suffix?: string;
      /** An alternative name or pseudonym for the person. */
      alias?: string;
    };

/**
 * A single person, or an array of persons.
 * Mirrors the `personOrList` schema definition, reused by `author`, `editor`,
 * and `AffiliatedRole.names`.
 */
export type PersonOrList = Person | Person[];

/**
 * Publisher information - can be a simple string or an object with name and location.
 */
export type Publisher =
  | string
  | {
      /** The name of the publisher. */
      name: string;
      /** The location of the publisher. */
      location?: string;
    };

/**
 * List of people involved with the entry in specific roles (not author/editor).
 */
export interface AffiliatedRole {
  role: RoleType;
  /** The name(s) of the person or people involved in the role. */
  names: PersonOrList;
}

/**
 * Any serial number including article numbers.
 * Can be a simple string/number or an object with well-known schemes.
 */
export type SerialNumber =
  | string
  | number
  | {
      doi?: string;
      isbn?: string;
      issn?: string;
      pmid?: string;
      pmcid?: string;
      arxiv?: string;
      /** Generic serial number. */
      serial?: string;
      /** Allow other custom serial types */
      [key: string]: string | undefined;
    };

/**
 * The canonical, lowercase form of every entry type recognized by Hayagriva.
 * This is the single source of truth for entry type names - other modules
 * (e.g. the entry type formatter/selector) should derive from `EntryType`
 * rather than declaring their own list.
 */
export type EntryTypeName =
  | 'article'
  | 'chapter'
  | 'entry'
  | 'anthos'
  | 'report'
  | 'thesis'
  | 'web'
  | 'scene'
  | 'artwork'
  | 'patent'
  | 'case'
  | 'newspaper'
  | 'legislation'
  | 'manuscript'
  | 'original'
  | 'post'
  | 'misc'
  | 'performance'
  | 'periodical'
  | 'proceedings'
  | 'book'
  | 'blog'
  | 'reference'
  | 'conference'
  | 'anthology'
  | 'repository'
  | 'thread'
  | 'video'
  | 'audio'
  | 'exhibition';

/**
 * The media type of the entry.
 *
 * Typst is case-insensitive for the *first* letter of the type only (the
 * rest of the word must be lowercase), so both `'book'` and `'Book'` are
 * valid, but `'BOOK'` or `'boOk'` are not. This mirrors the schema's
 * `^(?:[Aa]rticle|[Bb]ook|...)$` pattern.
 */
export type EntryType = EntryTypeName | Capitalize<EntryTypeName>;

/**
 * The role of an affiliated person.
 * Unlike `EntryType`, roles are case-sensitive.
 */
export type RoleType =
  | 'translator'
  | 'afterword'
  | 'foreword'
  | 'introduction'
  | 'annotator'
  | 'commentator'
  | 'holder'
  | 'compiler'
  | 'founder'
  | 'collaborator'
  | 'organizer'
  | 'cast-member'
  | 'composer'
  | 'producer'
  | 'executive-producer'
  | 'writer'
  | 'cinematography'
  | 'director'
  | 'illustrator'
  | 'narrator';

/**
 * The canonical public URL of an entry, optionally with an access date.
 */
export type UrlValue = string | { value: string; date?: HayagrivaDate };

/**
 * A Unicode Language Identifier (BCP 47), e.g. "en", "en-US", "zh-Hans-CN".
 * Format: language[-script][-region]
 */
export type Language = string;

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
