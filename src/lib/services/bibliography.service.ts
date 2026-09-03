import {
  BibliographyDuplicateIdError,
  BibliographyNotFoundError,
  EntryAlreadyExistsError,
  ReservedBibliographyIdError,
} from '$lib/errors/bibliography';
import { formatFormattableString } from '$lib/formatters/formattable-string';
import { notifyMutation } from '$lib/services/mutation-notifications';
import { tauriBackend } from '$lib/services/tauri-backend';
import type { Bibliography } from '$lib/types/bibliography';
import {
  parseAndValidateEntry,
  parseAndValidateHayagriva,
} from '$lib/validators/parse-and-validate';
import type { Hayagriva, TopLevelEntry } from '@hayman/hayagriva-schema';
import { error } from '@sveltejs/kit';

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[] | null;
}

function formatIssues(issues: ValidationIssue[] | null): string {
  return (issues ?? [])
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join('; ');
}

export function formatValidationErrorMessage(value: unknown): string {
  return value instanceof Error
    ? value.message
    : String(value || 'An unexpected error occurred.');
}

async function validateBibliography(data: Hayagriva) {
  const result = parseAndValidateHayagriva(data);
  if (!result.valid)
    throw new Error(`Invalid bibliography: ${formatIssues(result.errors)}`);
}

async function validateTopLevelEntry(entry: TopLevelEntry) {
  const result = parseAndValidateEntry(entry);
  if (!result.valid)
    throw new Error(`Invalid entry: ${formatIssues(result.errors)}`);
}

export class BibliographyService {
  static getAll() {
    return tauriBackend.list();
  }

  static async getOrNull(id: string): Promise<Bibliography | null> {
    try {
      return await tauriBackend.get(id);
    } catch (caught) {
      if (String(caught).includes('was not found')) return null;
      throw caught;
    }
  }

  static async get(id: string) {
    const bibliography = await this.getOrNull(id);
    if (!bibliography) throw new BibliographyNotFoundError(id);
    return bibliography;
  }

  static async getForLoad(id: string) {
    const bibliography = await this.getOrNull(id);
    if (!bibliography) error(404, { message: 'Bibliography not found' });
    return bibliography;
  }

  static async validateHayagriva(data: Hayagriva): Promise<ValidationResult> {
    return parseAndValidateHayagriva(data);
  }

  static async validateEntry(entry: TopLevelEntry): Promise<ValidationResult> {
    return parseAndValidateEntry(entry);
  }

  static async add(bibliography: Bibliography, skipValidation = false) {
    if (!skipValidation) await validateBibliography(bibliography.data);
    const created = await tauriBackend.createManaged(bibliography);
    notifyMutation(
      `Added bibliography “${bibliography.metadata.title}”.`,
      async () => {
        await tauriBackend.delete(created.metadata.id);
      },
    );
  }

  static async delete(id: string) {
    const previous = await this.get(id);
    const deleted = await tauriBackend.delete(id);
    notifyMutation(
      previous.metadata.storageKind === 'linked'
        ? `Unlinked bibliography “${previous.metadata.title}”. The original file was not deleted.`
        : `Deleted bibliography “${previous.metadata.title}”. A recovery snapshot was retained.`,
      deleted.recoveryId
        ? async () => {
            await tauriBackend.restoreRecovery(deleted.recoveryId!);
          }
        : undefined,
    );
  }

  static async exists(id: string) {
    return (await this.getOrNull(id)) !== null;
  }

  static async updateMetadata(id: string, updated: Bibliography) {
    if (updated.metadata.id === 'new') throw new ReservedBibliographyIdError();
    if (updated.metadata.id !== id) {
      if (await this.exists(updated.metadata.id)) {
        throw new BibliographyDuplicateIdError(updated.metadata.id);
      }
      const previous = await this.get(id);
      const saved = await tauriBackend.rename(id, updated);
      notifyMutation(
        `Renamed bibliography to “${updated.metadata.title}”.`,
        async () => {
          await tauriBackend.rename(
            saved.metadata.id,
            previous,
            saved.metadata.contentHash,
          );
        },
      );
      return;
    }
    const previous = await this.get(id);
    const saved = await tauriBackend.save(updated);
    notifyMutation(
      `Updated bibliography “${updated.metadata.title}”.`,
      async () => {
        await tauriBackend.save(previous, saved.metadata.contentHash);
      },
    );
  }

  static async put(bibliography: Bibliography, skipValidation = false) {
    if (!skipValidation) await validateBibliography(bibliography.data);
    const previous = await this.getOrNull(bibliography.metadata.id);
    const saved = previous
      ? await tauriBackend.save(bibliography)
      : await tauriBackend.createManaged(bibliography);
    notifyMutation(
      `${previous ? 'Updated' : 'Added'} bibliography “${bibliography.metadata.title}”.`,
      previous
        ? async () => {
            await tauriBackend.save(previous, saved.metadata.contentHash);
          }
        : async () => {
            await tauriBackend.delete(saved.metadata.id);
          },
    );
  }

  static async saveEntry(
    bibliographyId: string,
    newEntryId: string,
    newEntryData: TopLevelEntry,
    skipValidation = false,
  ) {
    if (!skipValidation) await validateTopLevelEntry(newEntryData);
    const bibliography = await this.get(bibliographyId);
    const previous = structuredClone(bibliography);
    if (bibliography.data[newEntryId])
      throw new EntryAlreadyExistsError(newEntryId);
    bibliography.data[newEntryId] = newEntryData;
    const saved = await tauriBackend.save(bibliography);
    notifyMutation(
      `Added entry “${formatFormattableString(newEntryData.title) || newEntryId}”.`,
      async () => {
        await tauriBackend.save(previous, saved.metadata.contentHash);
      },
    );
  }

  static async deleteEntry(bibliographyId: string, entryId: string) {
    const bibliography = await this.get(bibliographyId);
    const previous = structuredClone(bibliography);
    const deleted = bibliography.data[entryId];
    delete bibliography.data[entryId];
    const saved = await tauriBackend.save(bibliography);
    notifyMutation(
      `Deleted entry “${formatFormattableString(deleted?.title) || entryId}”. A recovery snapshot was retained.`,
      async () => {
        await tauriBackend.save(previous, saved.metadata.contentHash);
      },
    );
  }

  static async getEntry(bibliographyId: string, entryId: string) {
    return (await this.get(bibliographyId)).data[entryId];
  }

  static async updateEntry(
    bibliographyId: string,
    updatedEntryId: string,
    updatedEntryData: TopLevelEntry,
    oldEntryId: string,
    skipValidation = false,
  ) {
    if (!skipValidation) await validateTopLevelEntry(updatedEntryData);
    const bibliography = await this.get(bibliographyId);
    const previous = structuredClone(bibliography);
    const renamed = updatedEntryId !== oldEntryId;
    if (renamed && bibliography.data[updatedEntryId]) {
      throw new EntryAlreadyExistsError(updatedEntryId);
    }
    if (renamed) {
      bibliography.data = Object.fromEntries(
        Object.entries(bibliography.data).map(([key, value]) =>
          key === oldEntryId
            ? [updatedEntryId, updatedEntryData]
            : [key, value],
        ),
      ) as Hayagriva;
    } else {
      bibliography.data[updatedEntryId] = updatedEntryData;
    }
    const saved = await tauriBackend.save(bibliography);
    notifyMutation(
      `Updated entry “${formatFormattableString(updatedEntryData.title) || updatedEntryId}”.`,
      async () => {
        await tauriBackend.save(previous, saved.metadata.contentHash);
      },
    );
  }
}
