/**
 * Guards against malformed bibliography object graphs: circular references
 * (common when YAML anchors/aliases are misused) and excessively deep parent
 * chains that would overflow the recursive form/preview components.
 */

/** Maximum allowed parent nesting depth (inclusive of top-level entry). */
export const MAX_PARENT_DEPTH = 32;

export class HayagrivaStructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HayagrivaStructureError';
  }
}

/**
 * Throws if `value` contains any circular reference in its object graph.
 */
export function assertAcyclic(value: unknown): void {
  const seen = new WeakSet<object>();

  function visit(node: unknown): void {
    if (node === null || typeof node !== 'object') return;

    if (seen.has(node)) {
      throw new HayagrivaStructureError(
        'Data contains circular references. YAML anchors/aliases that loop back are not supported — use plain nested parent objects instead.',
      );
    }

    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    for (const child of Object.values(node)) visit(child);
  }

  visit(value);
}

/**
 * Throws if any entry's `parent` chain exceeds `maxDepth` levels.
 * Applies to a full bibliography map or a single entry object.
 */
export function assertParentDepthWithin(
  value: unknown,
  maxDepth: number = MAX_PARENT_DEPTH,
): void {
  if (value === null || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const item of value) checkEntryParentDepth(item, maxDepth);
    return;
  }

  // Bibliography map: keys are entry ids, values are entries.
  const record = value as Record<string, unknown>;
  const values = Object.values(record);
  const looksLikeBibliography =
    values.length > 0 &&
    values.every(
      (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
    ) &&
    values.some((v) => 'type' in (v as object));

  if (looksLikeBibliography) {
    for (const entry of values) checkEntryParentDepth(entry, maxDepth);
    return;
  }

  checkEntryParentDepth(value, maxDepth);
}

function checkEntryParentDepth(
  entry: unknown,
  maxDepth: number,
  depth = 0,
): void {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return;
  }

  const parent = (entry as { parent?: unknown }).parent;
  if (parent === undefined || parent === null) return;

  const parents = Array.isArray(parent) ? parent : [parent];

  for (const p of parents) {
    const nextDepth = depth + 1;
    if (nextDepth > maxDepth) {
      throw new HayagrivaStructureError(
        `Parent nesting exceeds ${maxDepth} levels. Flatten the entry hierarchy or remove some parent entries.`,
      );
    }
    checkEntryParentDepth(p, maxDepth, nextDepth);
  }
}

/**
 * Validates structure before persisting or binding to the UI.
 */
export function assertHayagrivaStructure(value: unknown): void {
  assertAcyclic(value);
  assertParentDepthWithin(value);
}
