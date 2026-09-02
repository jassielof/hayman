import { BibliographyService } from '$lib/services/bibliography.service';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const ssr = false;
export const load: PageLoad = async ({ params }) => {
  try {
    const oldEntry = await BibliographyService.getEntry(
      params.bibliographyId,
      params.entryId,
    );

    if (!oldEntry) {
      throw error(404, 'Entry not found');
    }

    return {
      oldEntry,
    };
  } catch (err) {
    console.log('Error loading entry:', err);
    throw err;
  }
};
