/** Presentation only: never use these strings to open, save or compare files. */
export function normalizeDisplayPath(path: string): string {
  let value = path.replaceAll('\\', '/');
  if (value.toUpperCase().startsWith('//?/UNC/')) value = `//${value.slice(8)}`;
  else if (value.startsWith('//?/')) value = value.slice(4);
  return value;
}

export function displayPath(path: string, homeDirectory?: string): string {
  const value = normalizeDisplayPath(path);
  if (!homeDirectory || value.split('/').includes('..')) return value;
  const home = normalizeDisplayPath(homeDirectory).replace(/\/+$/, '');
  if (!home) return value;
  const windows = /^[a-z]:\//i.test(home) || home.startsWith('//');
  const compared = windows ? value.toLowerCase() : value;
  const comparedHome = windows ? home.toLowerCase() : home;
  if (compared === comparedHome) return '~';
  return compared.startsWith(`${comparedHome}/`)
    ? `~/${value.slice(home.length + 1)}`
    : value;
}
