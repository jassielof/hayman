import type { Hayagriva, TopLevelEntry } from '$lib/types/hayagriva';
import {
  assertHayagrivaStructure,
  HayagrivaStructureError
} from '$lib/validators/structure';
import YAML from 'yaml';

export { HayagrivaStructureError };

/**
 * Service for managing Hayagriva YAML files.
 */
export class HayagrivaService {
  import(content: string): Hayagriva {
    let data: unknown;

    try {
      data = YAML.parse(content, { schema: 'core' });
    } catch {
      throw new HayagrivaStructureError('Invalid YAML syntax.');
    }

    if (data === null || data === undefined) {
      throw new HayagrivaStructureError('YAML parsed to empty content.');
    }

    if (typeof data !== 'object' || Array.isArray(data)) {
      throw new HayagrivaStructureError(
        'Expected a YAML mapping of citation keys to entries.'
      );
    }

    assertHayagrivaStructure(data);

    return data as Hayagriva;
  }

  export(
    content: Hayagriva | TopLevelEntry,
    options: {
      toClipboard?: boolean;
      asFile?: boolean;
      filename?: string;
    } = {}
  ) {
    const data = YAML.stringify(content, {
      schema: 'core'
    });

    if (options.toClipboard) return navigator.clipboard.writeText(data);

    if (options.asFile) {
      const blob = new Blob([data], { type: 'application/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = options.filename ?? 'bibliography.yaml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      return URL.revokeObjectURL(url);
    }

    return data;
  }
}

export const hayagrivaService = new HayagrivaService();
