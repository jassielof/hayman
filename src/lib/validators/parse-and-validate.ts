import {
  hayagrivaBibliographySchema,
  topLevelEntrySchema,
  type Hayagriva,
  type TopLevelEntry
} from '@hayman/hayagriva-schema';
import { assertHayagrivaStructure } from '@hayman/hayagriva-schema';
import type {
  ValidationIssue,
  ValidationResult
} from '$lib/services/bibliography.service';
import type { z } from 'zod';

function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message
  }));
}

/**
 * Validates Hayagriva structure (acyclic parents, depth) then Zod schema.
 * Use for imports and saves so users see the same errors in both flows.
 */
export function parseAndValidateHayagriva(data: Hayagriva): ValidationResult {
  try {
    assertHayagrivaStructure(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid structure.';
    return { valid: false, errors: [{ path: '(structure)', message }] };
  }

  const result = hayagrivaBibliographySchema.safeParse(data);
  return {
    valid: result.success,
    errors: result.success ? null : toValidationIssues(result.error)
  };
}

export function parseAndValidateEntry(entry: TopLevelEntry): ValidationResult {
  const result = topLevelEntrySchema.safeParse(entry);
  return {
    valid: result.success,
    errors: result.success ? null : toValidationIssues(result.error)
  };
}
