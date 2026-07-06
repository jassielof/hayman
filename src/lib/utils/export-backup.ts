import { hayagrivaService } from '$lib/services/hayagriva.service';
import type { Bibliography } from '$lib/types/bibliography';
import { zipSync } from 'fflate';

export type BackupArchiveFormat = 'zip-yaml' | 'zip-json';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportBibliographiesArchive(
  bibliographies: Bibliography[],
  format: BackupArchiveFormat
) {
  if (bibliographies.length === 0) return;

  const stamp = new Date().toISOString().slice(0, 10);
  const files: Record<string, Uint8Array> = {};
  const encoder = new TextEncoder();

  if (format === 'zip-json') {
    const payload = JSON.stringify(bibliographies, null, 2);
    files['bibliographies.json'] = encoder.encode(payload);
  } else {
    for (const bib of bibliographies) {
      const yaml = hayagrivaService.export(bib.data) as string;
      files[`${bib.metadata.id}.yaml`] = encoder.encode(yaml);
    }
    files['manifest.json'] = encoder.encode(
      JSON.stringify(
        bibliographies.map((bib) => bib.metadata),
        null,
        2
      )
    );
  }

  const zipped = zipSync(files);
  const blob = new Blob([zipped], { type: 'application/zip' });
  const suffix = format === 'zip-json' ? 'json' : 'yaml';
  downloadBlob(blob, `hayagriva-backup-${suffix}-${stamp}.zip`);
}
