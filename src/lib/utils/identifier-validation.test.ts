import { describe, expect, it } from 'vitest';
import { validateIdentifier, validateWebUrl } from './identifier-validation';

describe('identifier validation', () => {
  it('normalizes and validates DOI values locally', () => {
    expect(
      validateIdentifier('doi', 'https://doi.org/10.1000/182'),
    ).toMatchObject({ valid: true, normalized: '10.1000/182' });
    expect(validateIdentifier('doi', 'not-a-doi').valid).toBe(false);
  });

  it('validates ISBN-10 and ISBN-13 checksums', () => {
    expect(validateIdentifier('isbn', '0-306-40615-2').valid).toBe(true);
    expect(validateIdentifier('isbn', '978-3-16-148410-0').valid).toBe(true);
    expect(validateIdentifier('isbn', '978-3-16-148410-1').valid).toBe(false);
  });

  it('validates ISSN and repository identifiers', () => {
    expect(validateIdentifier('issn', '2049-3630').valid).toBe(true);
    expect(validateIdentifier('pmid', '17284678').valid).toBe(true);
    expect(validateIdentifier('pmcid', 'PMC1790863').valid).toBe(true);
    expect(validateIdentifier('arxiv', '2003.13722v2').valid).toBe(true);
  });

  it('accepts only absolute HTTP(S) URLs', () => {
    expect(validateWebUrl('https://example.com/path').valid).toBe(true);
    expect(validateWebUrl('file:///tmp/paper.pdf').valid).toBe(false);
    expect(validateWebUrl('example.com').valid).toBe(false);
  });
});
