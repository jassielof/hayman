export function revealAndFocus(element: HTMLElement) {
  let parent = element.parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
  element.focus();
  element.scrollIntoView?.({ block: 'nearest' });
}

export function focusEntryField(root: HTMLElement, path: string): boolean {
  const candidates = [
    ...root.querySelectorAll<HTMLElement>('[data-entry-field]'),
  ]
    .filter(
      (host) =>
        path === host.dataset.entryField ||
        path.startsWith(`${host.dataset.entryField}.`),
    )
    .sort(
      (a, b) => b.dataset.entryField!.length - a.dataset.entryField!.length,
    );
  let host = candidates[0];
  if (!host) return false;
  const suffix = path
    .slice(host.dataset.entryField!.length)
    .split('.')
    .filter(Boolean);
  if (/^\d+$/.test(suffix[0] ?? '')) {
    host =
      [...host.querySelectorAll<HTMLElement>('[data-person-index]')].find(
        (row) => row.dataset.personIndex === suffix[0],
      ) ?? host;
  }
  const controls = [
    ...host.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input:not([type="hidden"]), select, textarea'),
  ];
  const target =
    controls.find((control) => control.dataset.valueKey === suffix.at(-1)) ??
    controls.find(
      (control) => control.type !== 'checkbox' && !control.disabled,
    ) ??
    controls[0];
  if (!target) return false;
  revealAndFocus(target);
  return true;
}
