/**
 * A virtual, ordered grouping of bibliography files.
 *
 * Membership is Hayman metadata: adding a bibliography to several projects
 * never copies its entries or changes its portable Hayagriva YAML.
 */
export interface BibliographyProject {
  id: string;
  title: string;
  description?: string;
  bibliographyIds: string[];
  createdAt: string;
  updatedAt: string;
}
