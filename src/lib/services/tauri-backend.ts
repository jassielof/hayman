import type { Bibliography } from '$lib/types/bibliography';
import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '$lib/types/app-settings';
import type { BibliographyProject } from '$lib/types/project';
import type { TopLevelEntry } from '@hayman/hayagriva-schema';

export type ImportResult = {
  suggestedId: string;
  suggestedTitle: string;
  data: Bibliography['data'];
  sourcePath: string;
  sourceFormat: string;
};
export type ParsedImport = {
  data: Bibliography['data'];
  sourceFormat: 'yaml' | 'biblatex';
};

export type StorageInfo = {
  appDataDirectory: string;
  managedBibliographiesDirectory: string;
  recoveryDirectory: string;
  databasePath: string;
};

export type RecoveryItem = {
  id: number;
  bibliographyId: string;
  originalPath: string;
  snapshotPath: string;
  createdAt: string;
  reason: string;
  storageKind: 'managed' | 'linked' | '';
};

export type DeleteResult = { recoveryId?: number };
export type RenderedReference = { key: string; text: string };
export type Attachment = {
  id: number;
  bibliographyId: string;
  entryId: string;
  path: string;
  name: string;
  createdAt: string;
  available: boolean;
};
export type TrashItem = {
  id: number;
  bibliographyId: string;
  entryId: string;
  data: TopLevelEntry;
  deletedAt: string;
};
export type HealthReport = {
  databaseOk: boolean;
  bibliographyCount: number;
  attachmentCount: number;
  problems: string[];
};

const changes = new EventTarget();

async function changed<T>(operation: Promise<T>): Promise<T> {
  const result = await operation;
  changes.dispatchEvent(new Event('change'));
  return result;
}

export const tauriBackend = {
  list: () => invoke<Bibliography[]>('list_bibliographies'),
  get: (id: string) => invoke<Bibliography>('get_bibliography', { id }),
  createManaged: (bibliography: Bibliography) =>
    changed(
      invoke<Bibliography>('create_managed_bibliography', { bibliography }),
    ),
  save: (
    bibliography: Bibliography,
    expectedHash = bibliography.metadata.contentHash,
  ) =>
    changed(
      invoke<Bibliography>('save_bibliography', {
        bibliography,
        expectedHash,
      }),
    ),
  rename: (
    oldId: string,
    bibliography: Bibliography,
    expectedHash = bibliography.metadata.contentHash,
  ) =>
    changed(
      invoke<Bibliography>('rename_bibliography', {
        oldId,
        bibliography,
        expectedHash,
      }),
    ),
  delete: (id: string) =>
    changed(invoke<DeleteResult>('delete_bibliography', { id })),
  link: (path: string) =>
    changed(invoke<Bibliography>('link_bibliography', { path })),
  importFile: (path: string) =>
    invoke<ImportResult>('import_bibliography_file', { path }),
  parseImportContent: (content: string, format: 'auto' | 'yaml' | 'biblatex') =>
    invoke<ParsedImport>('parse_import_content', { content, format }),
  insertEntries: (
    bibliographyId: string,
    entries: Bibliography['data'],
    expectedHash: string,
  ) =>
    changed(
      invoke<Bibliography>('insert_entries', {
        bibliographyId,
        entries,
        expectedHash,
      }),
    ),
  storageInfo: () => invoke<StorageInfo>('storage_info'),
  backupCatalogDatabase: (destination: string) =>
    invoke<void>('backup_catalog_database', { destination }),
  checkStorageHealth: () => invoke<HealthReport>('check_storage_health'),
  getSettings: () => invoke<AppSettings | null>('get_settings'),
  setSettings: (settings: AppSettings) =>
    invoke<void>('set_settings', { settings }),
  typstVersion: () => invoke<string>('typst_version'),
  renderTypst: (mainContent: string, inputs: Record<string, string>) =>
    invoke<string>('render_typst', { mainContent, inputs }),
  renderBibliography: (yaml: string, styleName: string, customCsl?: string) =>
    invoke<RenderedReference[]>('render_bibliography', {
      yaml,
      styleName,
      customCsl,
    }),
  listRecovery: () => invoke<RecoveryItem[]>('list_recovery_snapshots'),
  restoreRecovery: (recoveryId: number) =>
    changed(invoke<Bibliography>('restore_recovery_snapshot', { recoveryId })),
  clearRecovery: () => changed(invoke<void>('clear_recovery_snapshots')),
  listAttachments: (bibliographyId: string, entryId: string) =>
    invoke<Attachment[]>('list_attachments', { bibliographyId, entryId }),
  linkAttachment: (bibliographyId: string, entryId: string, path: string) =>
    changed(
      invoke<Attachment>('link_attachment', {
        bibliographyId,
        entryId,
        path,
      }),
    ),
  unlinkAttachment: (attachmentId: number) =>
    changed(invoke<void>('unlink_attachment', { attachmentId })),
  openAttachment: (attachmentId: number) =>
    invoke<void>('open_attachment', { attachmentId }),
  openExternalUrl: (url: string) => invoke<void>('open_external_url', { url }),
  renameEntryMetadata: (
    bibliographyId: string,
    oldEntryId: string,
    newEntryId: string,
  ) =>
    changed(
      invoke<void>('rename_entry_metadata', {
        bibliographyId,
        oldEntryId,
        newEntryId,
      }),
    ),
  deleteEntryMetadata: (
    bibliographyId: string,
    deletedEntries: { entryId: string; data: TopLevelEntry }[],
  ) =>
    changed(
      invoke<number[]>('delete_entry_metadata', {
        bibliographyId,
        deletedEntries,
      }),
    ),
  listEntryTrash: () => invoke<TrashItem[]>('list_entry_trash'),
  discardEntryTrash: (trashIds: number[]) =>
    changed(invoke<void>('discard_entry_trash', { trashIds })),
  listProjects: () => invoke<BibliographyProject[]>('list_projects'),
  saveProject: (project: BibliographyProject) =>
    changed(invoke<BibliographyProject>('save_project', { project })),
  deleteProject: (id: string) =>
    changed(invoke<void>('delete_project', { id })),
  subscribe(listener: () => void) {
    changes.addEventListener('change', listener);
    return () => changes.removeEventListener('change', listener);
  },
};
