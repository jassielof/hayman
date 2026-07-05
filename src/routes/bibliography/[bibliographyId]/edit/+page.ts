import type { PageLoad } from './$types';
import { BibliographyService } from '$lib/services/bibliography.service';

export const ssr = false;

export const load: PageLoad = async ({ params }) => {
  return {
    oldBibliography: await BibliographyService.getForLoad(params.bibliographyId)
  };
};
