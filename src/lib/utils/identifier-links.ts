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

export async function checkUrlReachable(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return 'Enter a URL first.';

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Only http and https URLs are supported.';
    }

    const response = await fetch(parsed.href, {
      method: 'HEAD',
      mode: 'no-cors',
    });

    if (response.type === 'opaque') {
      return 'Request sent (browser blocked reading the status, but the host responded).';
    }

    if (response.ok) {
      return `Reachable (${response.status}).`;
    }

    return `Responded with status ${response.status}.`;
  } catch {
    return 'Could not reach this URL from the browser.';
  }
}
