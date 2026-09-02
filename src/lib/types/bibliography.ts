import type { BibliographyMetadata } from './bibliography-metadata';
import type { Hayagriva } from '@hayman/hayagriva-schema';

/**
 * Represents a Hayagriva bibliography along with its metadata.
 */
export interface Bibliography {
  metadata: BibliographyMetadata;
  data: Hayagriva;
}
