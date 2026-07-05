import { db } from '$lib/db';
import {
  BibliographyDuplicateIdError,
  BibliographyNotFoundError,
  EntryAlreadyExistsError,
  ReservedBibliographyIdError
} from '$lib/errors/bibliography';
import type { Bibliography } from '$lib/types/bibliography';
import { type Hayagriva, type TopLevelEntry } from '$lib/types/hayagriva';
import { assertHayagrivaStructure } from '$lib/validators/structure';
import {
  parseAndValidateEntry,
  parseAndValidateHayagriva
} from '$lib/validators/parse-and-validate';
import { error } from '@sveltejs/kit';

/**
 * A single validation issue, with a dotted path to the offending field
 * (e.g. `"harry.author.0.name"`) so the UI can point users at what to fix.
 */
export interface ValidationIssue {
  path: string;
  message: string;
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[] | null;
}

function formatIssues(issues: ValidationIssue[] | null): string {
  return (issues ?? []).map((e) => `${e.path}: ${e.message}`).join('; ');
}

export function formatValidationErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

/** Strip Svelte proxies and reject cyclic/deep parent graphs before IndexedDB. */
function cloneForStorage(bibliography: Bibliography): Bibliography {
  assertHayagrivaStructure(bibliography.data);
  const clone = JSON.parse(JSON.stringify(bibliography)) as Bibliography;
  clone.metadata.updatedAt = new Date().toISOString();
  return clone;
}

/**
 * Service for managing Hayagriva bibliographies and its entries in IndexedDB.
 */
export class BibliographyService {
  /**
   * Retrieves all bibliographies from the database.
   * @returns A promise that resolves to an array of all bibliographies.
   */
  static async getAll() {
    return await db.bibliographies.toArray();
  }

  static async getOrNull(id: string): Promise<Bibliography | null> {
    return (await db.bibliographies.get(id)) ?? null;
  }

  /**
   * Retrieves a specific bibliography by its ID.
   * @param id - The unique identifier of the bibliography.
   * @throws {BibliographyNotFoundError} When not found (client-side callers).
   * @throws SvelteKit HTTP error when used from loaders via `getForLoad`.
   */
  static async get(id: string) {
    const bibliography = await this.getOrNull(id);

    if (!bibliography) {
      throw new BibliographyNotFoundError(id);
    }

    return bibliography;
  }

  /** For SvelteKit loaders — maps missing bibliography to HTTP 404. */
  static async getForLoad(id: string) {
    const bibliography = await this.getOrNull(id);

    if (!bibliography) {
      error(404, { message: 'Bibliography not found' });
    }

    return bibliography;
  }

  /**
   * Validates a Hayagriva data object against the schema.
   * @param data - The Hayagriva data to validate.
   * @returns A validation result with errors if invalid.
   */
  static async validateHayagriva(data: Hayagriva): Promise<ValidationResult> {
    return parseAndValidateHayagriva(data);
  }

  /**
   * Validates a single entry against the topLevelEntry schema.
   * @param entry - The entry to validate.
   * @returns A validation result with errors if invalid.
   */
  static async validateEntry(entry: TopLevelEntry): Promise<ValidationResult> {
    return parseAndValidateEntry(entry);
  }

  /**
   * Adds a new bibliography to the database.
   * @param bibliography - The bibliography object to add.
   * @param skipValidation - If true, skips schema validation.
   * @throws {Error} If validation fails.
   * @returns A promise that resolves when the bibliography has been added.
   */
  static async add(bibliography: Bibliography, skipValidation = false) {
    if (!skipValidation) {
      const validation = await this.validateHayagriva(bibliography.data);
      if (!validation.valid) {
        console.error('Invalid bibliography data:', validation.errors);
        throw new Error(
          `Invalid bibliography: ${formatIssues(validation.errors)}`
        );
      }
    }

    await db.bibliographies.add(cloneForStorage(bibliography));
  }

  /**
   * Deletes a bibliography from the database.
   * @param id - The unique identifier of the bibliography to delete.
   * @returns A promise that resolves when the bibliography has been deleted.
   */
  static async delete(id: string) {
    await db.bibliographies.delete(id);
  }

  static async exists(id: string) {
    return !!(await db.bibliographies.get(id));
  }

  static async updateMetadata(id: string, updated: Bibliography) {
    const newId = updated.metadata.id;

    if (newId == 'new') {
      throw new ReservedBibliographyIdError();
    }

    await db.transaction('rw', db.bibliographies, async () => {
      if (newId !== id && (await db.bibliographies.get(newId))) {
        throw new BibliographyDuplicateIdError(newId);
      }

      const stored = cloneForStorage(updated);
      await db.bibliographies.put(stored);

      if (newId !== id) {
        await db.bibliographies.delete(id);
      }
    });
  }

  /**
   * Replaces an existing bibliography or adds a new one if it doesn't exist.
   * @param bibliography - The bibliography object to put.
   * @param skipValidation - If true, skips schema validation.
   * @throws {Error} If validation fails.
   * @returns A promise that resolves when the bibliography has been saved.
   */
  static async put(bibliography: Bibliography, skipValidation = false) {
    if (!skipValidation) {
      const validation = await this.validateHayagriva(bibliography.data);
      if (!validation.valid) {
        console.error('Invalid bibliography data:', validation.errors);
        throw new Error(
          `Invalid bibliography: ${formatIssues(validation.errors)}`
        );
      }
    }

    await db.bibliographies.put(cloneForStorage(bibliography));
  }

  /**
   * Adds a new entry to a bibliography.
   * @param bibliographyId - The unique identifier of the bibliography.
   * @param newEntryId - The unique identifier for the new entry.
   * @param newEntryData - The entry data to add.
   * @param skipValidation - If true, skips schema validation.
   * @throws {Error} If the bibliography is not found, entry already exists, or validation fails.
   * @returns A promise that resolves when the entry has been saved.
   */
  static async saveEntry(
    bibliographyId: string,
    newEntryId: string,
    newEntryData: TopLevelEntry,
    skipValidation = false
  ) {
    if (!skipValidation) {
      const validation = await this.validateEntry(newEntryData);
      if (!validation.valid) {
        console.error('Invalid entry data:', validation.errors);
        throw new Error(`Invalid entry: ${formatIssues(validation.errors)}`);
      }
    }

    await db.transaction('rw', db.bibliographies, async () => {
      const bibliography = await db.bibliographies.get(bibliographyId);
      if (!bibliography) {
        throw new BibliographyNotFoundError(bibliographyId);
      }
      if (bibliography.data[newEntryId]) {
        throw new EntryAlreadyExistsError(newEntryId);
      }
      bibliography.data[newEntryId] = newEntryData;
      await db.bibliographies.put(cloneForStorage(bibliography));
    });
  }

  /**
   * Deletes an entry from a bibliography.
   * @param bibliographyId - The unique identifier of the bibliography.
   * @param entryId - The unique identifier of the entry to delete.
   * @throws {Error} If the bibliography is not found.
   * @returns A promise that resolves when the entry has been deleted.
   */
  static async deleteEntry(bibliographyId: string, entryId: string) {
    await db.transaction('rw', db.bibliographies, async () => {
      const bibliography = await db.bibliographies.get(bibliographyId);
      if (!bibliography) {
        throw new BibliographyNotFoundError(bibliographyId);
      }
      delete bibliography.data[entryId];
      await db.bibliographies.put(cloneForStorage(bibliography));
    });
  }

  /**
   * Retrieves a specific entry from a bibliography.
   * @param bibliographyId - The unique identifier of the bibliography.
   * @param entryId - The unique identifier of the entry to retrieve.
   * @throws {Error} If the bibliography is not found.
   * @returns A promise that resolves to the entry data.
   */
  static async getEntry(bibliographyId: string, entryId: string) {
    const bibliography = await this.get(bibliographyId);
    return bibliography.data[entryId];
  }

  /**
   * Updates an existing entry in a bibliography. If the entry ID changes, the old entry is deleted.
   * @param bibliographyId - The unique identifier of the bibliography.
   * @param updatedEntryId - The new or current unique identifier of the entry.
   * @param updatedEntryData - The updated entry data.
   * @param oldEntryId - The previous unique identifier of the entry (if the ID changed).
   * @param skipValidation - If true, skips schema validation.
   * @throws {Error} If the bibliography is not found, the new ID collides with a
   *   different existing entry, or validation fails.
   * @returns A promise that resolves when the entry has been updated.
   */
  static async updateEntry(
    bibliographyId: string,
    updatedEntryId: string,
    updatedEntryData: TopLevelEntry,
    oldEntryId: string,
    skipValidation = false
  ) {
    if (!skipValidation) {
      const validation = await this.validateEntry(updatedEntryData);
      if (!validation.valid) {
        console.error('Invalid entry data:', validation.errors);
        throw new Error(`Invalid entry: ${formatIssues(validation.errors)}`);
      }
    }

    await db.transaction('rw', db.bibliographies, async () => {
      const bibliography = await db.bibliographies.get(bibliographyId);
      if (!bibliography) {
        throw new BibliographyNotFoundError(bibliographyId);
      }

      const isRename = updatedEntryId !== oldEntryId;
      if (isRename && bibliography.data[updatedEntryId]) {
        throw new EntryAlreadyExistsError(updatedEntryId);
      }

      if (isRename) {
        delete bibliography.data[oldEntryId];
      }

      bibliography.data[updatedEntryId] = updatedEntryData;
      await db.bibliographies.put(cloneForStorage(bibliography));
    });
  }
}
