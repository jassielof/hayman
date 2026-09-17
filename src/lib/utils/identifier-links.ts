export function doiResolverUrl(doi: string) {
  return `https://doi.org/${encodeURIComponent(doi.trim())}`;
}

export function isbnResolverUrl(isbn: string) {
  return `https://www.worldcat.org/isbn/${encodeURIComponent(isbn.trim())}`;
}

export function issnResolverUrl(issn: string) {
  return `https://portal.issn.org/resource/ISSN/${encodeURIComponent(issn.trim())}`;
}

export function pmidResolverUrl(pmid: string) {
  return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid.trim())}/`;
}

export function pmcidResolverUrl(pmcid: string) {
  const id = pmcid.trim().replace(/^PMC/i, '');
  return `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${encodeURIComponent(id)}/`;
}

export function arxivResolverUrl(arxiv: string) {
  return `https://arxiv.org/abs/${encodeURIComponent(arxiv.trim())}`;
}
