import type { BibliographyMetadata } from '#lib/types/bibliography-metadata.js';
import type { BibliographyProject } from '#lib/types/project.js';

export type BreadcrumbItem = { label: string; href?: string };
export function pageContext(
  pathname: string,
  params: Record<string, string | undefined>,
  data: Record<string, unknown>,
  bibliographies: BibliographyMetadata[],
  projects: BibliographyProject[],
  status = 200,
): { title: string; items: BreadcrumbItem[] } {
  const home = { label: 'Library', href: '/' };
  const staticTitles: Record<string, string> = {
    '/': 'Bibliographies',
    '/settings': 'Settings',
    '/tools': 'Quick tools',
    '/library': 'All references',
    '/bibliography/new': 'New bibliography',
    '/project/new': 'New project',
  };
  const path = pathname.replace(/\/$/, '') || '/';
  let title = staticTitles[path];
  if (status >= 400) title = status === 404 ? 'Not found' : `Error ${status}`;
  if (title)
    return {
      title,
      items: path === '/' ? [{ label: title }] : [home, { label: title }],
    };
  if (params.bibliographyId) {
    const id = params.bibliographyId;
    const loaded = data.bibliographyMetadata as
      BibliographyMetadata | undefined;
    const metadata =
      loaded?.id === id
        ? loaded
        : bibliographies.find((item) => item.id === id);
    const bibliography = metadata?.title?.trim() || id;
    const href = `/bibliography/${encodeURIComponent(id)}`;
    const items: BreadcrumbItem[] = [home, { label: bibliography, href }];
    if (params.entryId) {
      const entry = (data.entry ?? data.oldEntry) as
        { title?: string | { value: string } } | undefined;
      const entryTitle =
        (typeof entry?.title === 'string'
          ? entry.title
          : entry?.title?.value
        )?.trim() || params.entryId;
      title = path.endsWith('/edit') ? `Edit ${entryTitle}` : entryTitle;
      if (path.endsWith('/edit'))
        items.push({
          label: 'Entry',
          href: `${href}/entry/${encodeURIComponent(params.entryId)}`,
        });
      items.push({ label: title });
    } else if (path.endsWith('/entry')) {
      title = 'New entry';
      items.push({ label: title });
    } else if (path.endsWith('/edit')) {
      title = `Edit ${bibliography}`;
      items.push({ label: title });
    } else {
      title = bibliography;
      delete items[1].href;
    }
    return { title, items };
  }
  if (params.projectId) {
    title =
      projects
        .find((project) => project.id === params.projectId)
        ?.title?.trim() || params.projectId;
    return { title, items: [home, { label: title }] };
  }
  return { title: 'Hayman', items: [home, { label: 'Hayman' }] };
}
