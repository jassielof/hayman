/**
 * The metadata of the bibliography.
 */
export interface BibliographyMetadata {
  id: string;
  title: string;
  description?: string;
  /**
   * ISO 8601 timestamp of creation.
   * Stored as a string (not a `Date`) since that's what's actually
   * persisted to IndexedDB after the object is stripped of its Svelte
   * `$state` proxy wrapper - keep it honest to avoid a type/runtime mismatch.
   */
  createdAt: string;
  /** ISO 8601 timestamp of the last update. See `createdAt` for why this is a string. */
  updatedAt: string;
}
