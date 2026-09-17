export type IdentifierKind =
  'doi' | 'isbn' | 'issn' | 'pmid' | 'pmcid' | 'arxiv';

export type IdentifierValidation = {
  valid: boolean;
  message: string;
  normalized: string;
};

function checksum10(value: string): boolean {
  return (
    value.length === 10 &&
    [...value].every((character, index) =>
      index === 9 ? /[\dX]/.test(character) : /\d/.test(character),
    ) &&
    [...value].reduce(
      (sum, character, index) =>
        sum + (character === 'X' ? 10 : Number(character)) * (10 - index),
      0,
    ) %
      11 ===
      0
  );
}

function checksum13(value: string): boolean {
  return (
    /^\d{13}$/.test(value) &&
    [...value].reduce(
      (sum, character, index) =>
        sum + Number(character) * (index % 2 === 0 ? 1 : 3),
      0,
    ) %
      10 ===
      0
  );
}

function checksumIssn(value: string): boolean {
  if (!/^\d{7}[\dX]$/.test(value)) return false;
  return (
    [...value].reduce(
      (sum, character, index) =>
        sum + (character === 'X' ? 10 : Number(character)) * (8 - index),
      0,
    ) %
      11 ===
    0
  );
}

export function validateIdentifier(
  kind: IdentifierKind,
  input: string,
): IdentifierValidation {
  const trimmed = input.trim();
  let normalized = trimmed;
  let valid = false;

  switch (kind) {
    case 'doi':
      normalized = trimmed
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
        .replace(/^doi:\s*/i, '');
      valid = /^10\.\d{4,9}\/\S+$/i.test(normalized);
      break;
    case 'isbn':
      normalized = trimmed.replace(/[^\dX]/gi, '').toUpperCase();
      valid = checksum10(normalized) || checksum13(normalized);
      break;
    case 'issn':
      normalized = trimmed.replace(/[^\dX]/gi, '').toUpperCase();
      valid = checksumIssn(normalized);
      break;
    case 'pmid':
      normalized = trimmed.replace(/^PMID:\s*/i, '');
      valid = /^[1-9]\d*$/.test(normalized);
      break;
    case 'pmcid':
      normalized = `PMC${trimmed.replace(/^PMC/i, '')}`;
      valid = /^PMC[1-9]\d*$/i.test(normalized);
      break;
    case 'arxiv':
      normalized = trimmed.replace(/^arXiv:/i, '').replace(/v\d+$/i, '');
      valid = /^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})$/i.test(
        normalized,
      );
      break;
  }

  return {
    valid,
    normalized,
    message: valid
      ? `${kind.toUpperCase()} has a valid local format.`
      : `${kind.toUpperCase()} does not have a recognized format or checksum.`,
  };
}

export function validateWebUrl(input: string): IdentifierValidation {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const valid = url.protocol === 'http:' || url.protocol === 'https:';
    return {
      valid,
      normalized: url.href,
      message: valid
        ? 'URL has a valid HTTP(S) format.'
        : 'Only HTTP and HTTPS URLs are supported.',
    };
  } catch {
    return {
      valid: false,
      normalized: trimmed,
      message: 'URL is not syntactically valid.',
    };
  }
}
