import type { Bibliography } from '$lib/types/bibliography';
import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '$lib/types/app-settings';

export type ImportResult = {
  suggestedId: string;
  suggestedTitle: string;
  data: Bibliography['data'];
  sourcePath: string;
  sourceFormat: string;
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
  storageInfo: () => invoke<StorageInfo>('storage_info'),
  getSettings: () => invoke<AppSettings | null>('get_settings'),
  setSettings: (settings: AppSettings) =>
    invoke<void>('set_settings', { settings }),
  typstVersion: () => invoke<string>('typst_version'),
  renderTypst: (mainContent: string, inputs: Record<string, string>) =>
    invoke<string>('render_typst', { mainContent, inputs }),
  listRecovery: () => invoke<RecoveryItem[]>('list_recovery_snapshots'),
  restoreRecovery: (recoveryId: number) =>
    changed(invoke<Bibliography>('restore_recovery_snapshot', { recoveryId })),
  subscribe(listener: () => void) {
    changes.addEventListener('change', listener);
    return () => changes.removeEventListener('change', listener);
  },
};
