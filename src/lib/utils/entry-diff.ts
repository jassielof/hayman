export interface EntryChange {
  path: string;
  before?: string;
  after?: string;
}

function flatten(
  value: unknown,
  path = '',
  result = new Map<string, string>(),
) {
  if (value === undefined) return result;
  if (value === null || typeof value !== 'object') {
    result.set(path, typeof value === 'string' ? value : String(value));
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      flatten(item, `${path}[${index + 1}]`, result),
    );
    if (value.length === 0) result.set(path, '[]');
    return result;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) result.set(path, '{}');
  for (const [key, child] of entries) {
    flatten(child, path ? `${path}.${key}` : key, result);
  }
  return result;
}

export function diffEntry(
  beforeId: string,
  before: unknown,
  afterId: string,
  after: unknown,
): EntryChange[] {
  const oldValues = flatten(before);
  const newValues = flatten(after);
  const paths = new Set([...oldValues.keys(), ...newValues.keys()]);
  const changes: EntryChange[] = [];

  if (beforeId !== afterId) {
    changes.push({ path: 'ID', before: beforeId, after: afterId });
  }

  for (const path of [...paths].sort()) {
    const oldValue = oldValues.get(path);
    const newValue = newValues.get(path);
    if (oldValue !== newValue) {
      changes.push({ path, before: oldValue, after: newValue });
    }
  }
  return changes;
}

export function formatEntryChanges(changes: EntryChange[], limit = 20): string {
  const visible = changes.slice(0, limit).map(({ path, before, after }) => {
    if (before === undefined) return `${path}: added “${after}”`;
    if (after === undefined) return `${path}: removed “${before}”`;
    return `${path}: “${before}” → “${after}”`;
  });
  if (changes.length > limit) {
    visible.push(`…and ${changes.length - limit} more changes`);
  }
  return visible.join('\n');
}
