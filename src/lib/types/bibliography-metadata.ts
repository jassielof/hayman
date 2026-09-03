/**
 * The metadata of the bibliography.
 */
export interface BibliographyMetadata {
  id: string;
  title: string;
  description?: string;
  /**
   * ISO 8601 timestamp of creation.
   * Stored as a string because it crosses the Tauri JSON boundary and is
   * persisted in SQLite metadata.
   */
  createdAt: string;
  /** ISO 8601 timestamp of the last update. See `createdAt` for why this is a string. */
  updatedAt: string;
  /** Desktop storage ownership. Omitted only for legacy browser data. */
  storageKind?: 'managed' | 'linked';
  /** Canonical path selected by the native backend. */
  filePath?: string;
  /** SHA-256 used to reject accidental overwrites after external edits. */
  contentHash?: string;
}
