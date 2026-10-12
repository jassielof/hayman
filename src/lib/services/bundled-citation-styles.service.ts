import { tauriBackend, type BundledCitationStyle } from './tauri-backend.js';

let catalog: Promise<BundledCitationStyle[]> | undefined;

/** Cache only successful native discovery; a failed request can be retried. */
export function listBundledCitationStyles(): Promise<BundledCitationStyle[]> {
  catalog ??= tauriBackend.listBundledCitationStyles().catch((error) => {
    catalog = undefined;
    throw error;
  });
  return catalog;
}

export function findBundledCitationStyle(
  styles: BundledCitationStyle[],
  name: string,
) {
  return styles.find((style) => style.names.includes(name.trim()));
}

export function filterBundledCitationStyles(
  styles: BundledCitationStyle[],
  query: string,
) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return styles.filter((style) => {
    const searchable = [style.title, ...style.names]
      .join(' ')
      .toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}
