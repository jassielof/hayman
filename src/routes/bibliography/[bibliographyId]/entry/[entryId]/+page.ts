import { hayagrivaService } from '$lib/services/hayagriva.service';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { BibliographyService } from '$lib/services/bibliography.service';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
  try {
    const bibliography = await BibliographyService.getForLoad(
      params.bibliographyId
    );
    const entry = bibliography?.data[params.entryId];

    if (!entry) {
      throw error(404, 'Entry not found');
    }

    const yamlData = hayagrivaService.export(entry) as string;
    const indentedYaml = yamlData
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
    const fullYaml = `${params.entryId}:\n${indentedYaml}`;
    const entryYamlData = fullYaml.split('\n');

    return {
      entry,
      entryYamlData,
      bibliographyData: bibliography.data
    };
  } catch (err) {
    console.error('Error loading entry:', error);
    throw err;
  }
};
