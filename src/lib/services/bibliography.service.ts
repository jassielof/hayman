import { db } from '$lib/db';
import type { Bibliography } from '$lib/types/bibliography';
import {
  hayagrivaBibliographySchema,
  topLevelEntrySchema,
  type Hayagriva,
  type TopLevelEntry
} from '$lib/types/hayagriva';
import { error } from '@sveltejs/kit';
import type { z } from 'zod';

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

function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message
  }));
}

function formatIssues(issues: ValidationIssue[] | null): string {
  return (issues ?? []).map((e) => `${e.path}: ${e.message}`).join('; ');
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

  /**
   * Retrieves a specific bibliography by its ID.
   * @param id - The unique identifier of the bibliography.
   * @returns A promise that resolves to the bibliography if found, undefined otherwise.
   */
  static async get(id: string) {
    const bibliography = await db.bibliographies.get(id);

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
    const result = hayagrivaBibliographySchema.safeParse(data);
    return {
      valid: result.success,
      errors: result.success ? null : toValidationIssues(result.error)
    };
  }

  /**
   * Validates a single entry against the topLevelEntry schema.
   * @param entry - The entry to validate.
   * @returns A validation result with errors if invalid.
   */
  static async validateEntry(entry: TopLevelEntry): Promise<ValidationResult> {
    const result = topLevelEntrySchema.safeParse(entry);
    return {
      valid: result.success,
      errors: result.success ? null : toValidationIssues(result.error)
    };
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

    bibliography.metadata.updatedAt = new Date().toISOString();
    await db.bibliographies.add(JSON.parse(JSON.stringify(bibliography)));
  }

  /**
   * Deletes a bibliography from the database.
   * @param id - The unique identifier of the bibliography to delete.
   * @returns A promise that resolves when the bibliography has been deleted.
   */
  static async delete(id: string) {
    await db.bibliographies.delete(id);
  }

  /**
   * Updates specific fields of an existing bibliography.
   * @param id - The unique identifier of the bibliography to update.
   * @param changes - An object containing the fields to update.
   * @returns A promise that resolves when the bibliography has been updated.
   */
  static async update(id: string, changes: Partial<Bibliography>) {
    await db.bibliographies.update(id, changes);
  }

  static async exists(id: string) {
    return !!(await db.bibliographies.get(id));
  }

  static async updateMetadata(id: string, updated: Bibliography) {
    const newId = updated.metadata.id;

    if (newId == 'new') {
      error(400, {
        message: 'Bibliography ID cannot be "new" as it is reserved'
      });
    }

    if (newId !== id) {
      if (await this.exists(newId)) {
        error(409, { message: 'Bibliography with the new ID already exists' });
      }

      await this.delete(id);
    }

    await this.put(updated);
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

    bibliography.metadata.updatedAt = new Date().toISOString();
    await db.bibliographies.put(JSON.parse(JSON.stringify(bibliography)));
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

    const bibliography = await this.get(bibliographyId);
    if (!bibliography) throw new Error('Bibliography not found');
    if (bibliography.data[newEntryId]) {
      throw new Error('Entry already exists');
    }
    bibliography.data[newEntryId] = newEntryData;
    await this.put(bibliography, true); // Skip validation since we already validated the entry
  }

  /**
   * Deletes an entry from a bibliography.
   * @param bibliographyId - The unique identifier of the bibliography.
   * @param entryId - The unique identifier of the entry to delete.
   * @throws {Error} If the bibliography is not found.
   * @returns A promise that resolves when the entry has been deleted.
   */
  static async deleteEntry(bibliographyId: string, entryId: string) {
    const bibliography = await this.get(bibliographyId);
    delete bibliography.data[entryId];
    await this.put(bibliography);
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
    if (!bibliography) throw new Error('Bibliography not found');
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

    const bibliography = await this.get(bibliographyId);
    if (!bibliography) throw new Error('Bibliography not found');

    const isRename = updatedEntryId !== oldEntryId;
    if (isRename && bibliography.data[updatedEntryId]) {
      throw new Error(
        `Entry "${updatedEntryId}" already exists in this bibliography`
      );
    }

    if (isRename) {
      delete bibliography.data[oldEntryId];
    }

    bibliography.data[updatedEntryId] = updatedEntryData;
    await this.put(bibliography, true); // Skip validation since we already validated the entry
  }
}
